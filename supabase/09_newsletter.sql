-- =====================================================================
-- Newsletter: emailuri către clienții care au acceptat ofertele (customers.marketing_ok).
-- Admin scrie campania (blocuri, mesaj simplu sau HTML propriu); site-ul pregătește HTML-ul final,
-- iar baza de date îl personalizează pentru fiecare client ({{prenume}}, {{nume}}, {{email}}, {{dezabonare}}),
-- adaugă linkul de dezabonare și îl trimite prin Resend, în loturi, fără să depășească limita zilnică.
-- Clickurile pe linkuri trec prin lyrasdelivery.ro/l (se numără, apoi duc la adresa reală).
-- =====================================================================
alter table public.settings add column if not exists newsletter_daily_limit int not null default 100 check (newsletter_daily_limit >= 0);
alter table public.settings add column if not exists newsletter_batch int not null default 50 check (newsletter_batch between 1 and 100);

create table if not exists public.email_campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default 'Campanie',
  subject      text not null default '',
  preheader    text,
  mode         text not null default 'blocks' check (mode in ('blocks', 'text', 'html')),
  content      jsonb not null default '{}',     -- ce a construit adminul (blocuri / text / html), pentru editare
  html         text,                            -- HTML-ul final (cu {{variabile}}), făcut de site
  text_body    text,                            -- varianta text
  links        text[] not null default '{}',    -- linkurile din email, în ordinea k din lyrasdelivery.ro/l?s=…&k=…
  audience     text not null default 'all' check (audience in ('all', 'ordered', 'never_ordered', 'tier2', 'tier3', 'inactive')),
  status       text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at timestamptz,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create table if not exists public.email_sends (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  email       text not null,
  name        text,
  status      text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  error       text,
  batch_id    bigint,
  sent_at     timestamptz,
  unique (campaign_id, email)
);
create index if not exists email_sends_queue_idx on public.email_sends(campaign_id, status);
create index if not exists email_sends_sent_idx on public.email_sends(sent_at) where status = 'sent';
create table if not exists public.email_batches (
  id          bigint generated always as identity primary key,
  campaign_id uuid references public.email_campaigns(id) on delete cascade,
  request_id  bigint,
  size        int not null,
  status      text not null default 'pending' check (status in ('pending', 'ok', 'failed')),
  error       text,
  created_at  timestamptz not null default now()
);
create table if not exists public.email_clicks (
  send_id uuid not null references public.email_sends(id) on delete cascade,
  k       int not null,
  clicks  int not null default 1,
  first_at timestamptz not null default now(),
  primary key (send_id, k)
);

alter table public.email_campaigns enable row level security;
alter table public.email_sends     enable row level security;
alter table public.email_batches   enable row level security;
alter table public.email_clicks    enable row level security;
do $$ begin
  drop policy if exists "campaigns admin" on public.email_campaigns;
  drop policy if exists "sends admin" on public.email_sends;
  drop policy if exists "batches admin" on public.email_batches;
  drop policy if exists "clicks admin" on public.email_clicks;
end $$;
create policy "campaigns admin" on public.email_campaigns for all using (public.is_admin()) with check (public.is_admin());
create policy "sends admin"     on public.email_sends for select using (public.is_admin());
create policy "batches admin"   on public.email_batches for select using (public.is_admin());
create policy "clicks admin"    on public.email_clicks for select using (public.is_admin());
grant select, insert, update, delete on public.email_campaigns to authenticated;
grant select on public.email_sends, public.email_batches, public.email_clicks to authenticated;
revoke insert, update, delete on public.email_sends, public.email_batches, public.email_clicks from anon, authenticated;

-- cine primește campania (doar abonații, cu email, o dată pe adresă)
create or replace function public.newsletter_recipients(p_audience text)
returns table (customer_id uuid, email text, name text)
language sql stable security definer set search_path = public as $$
  select distinct on (lower(c.email)) c.id, lower(c.email), c.name
  from public.customers c
  where c.marketing_ok and coalesce(c.email, '') like '%_@_%'
    and case p_audience
      when 'ordered'       then c.orders_count > 0
      when 'never_ordered' then c.orders_count = 0
      when 'tier2'         then c.tier >= 2
      when 'tier3'         then c.tier >= 3
      when 'inactive'      then c.orders_count > 0 and coalesce(c.last_activity_at, c.created_at) < now() - interval '30 days'
      else true end
  order by lower(c.email), c.created_at;
$$;
revoke execute on function public.newsletter_recipients(text) from public, anon, authenticated;

create or replace function public.newsletter_audience(p_audience text) returns int
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Doar administratorul.' using errcode = 'P0001'; end if;
  return (select count(*) from public.newsletter_recipients(p_audience));
end $$;
grant execute on function public.newsletter_audience(text) to authenticated;

-- emailul unui destinatar: variabile, linkuri urmărite, subsol cu dezabonare (obligatoriu)
create or replace function public.newsletter_render(c public.email_campaigns, p_send uuid, p_email text, p_name text, p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.settings; h text; t text; first text; unsub text; i int;
begin
  select * into s from public.settings where id = 1;
  first := coalesce(nullif(split_part(trim(coalesce(p_name, '')), ' ', 1), ''), 'prietene');
  unsub := s.site_url || '/dezabonare?t=' || coalesce(p_token::text, '');
  h := coalesce(c.html, ''); t := coalesce(c.text_body, '');
  -- linkurile: fiecare href cunoscut trece prin /l, ca să numărăm clickurile
  if p_send is not null then
    for i in 1 .. coalesce(array_length(c.links, 1), 0) loop
      h := replace(h, 'href="' || c.links[i] || '"', 'href="' || s.site_url || '/l?s=' || p_send || '&k=' || i || '"');
    end loop;
  end if;
  if position('{{dezabonare}}' in h) = 0 then
    h := regexp_replace(h, '</body>', '', 'i') || format($f$<div style="text-align:center;padding:18px 16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8a7a6b">Primești acest email pentru că ai acceptat ofertele Lyra's Delivery.<br><a href="%s" style="color:#c9b6a5">Dezabonează-te</a> · <a href="%s" style="color:#c9b6a5">lyrasdelivery.ro</a></div></body>$f$, unsub, s.site_url);
  end if;
  h := replace(replace(replace(replace(h, '{{prenume}}', first), '{{nume}}', coalesce(nullif(trim(p_name), ''), first)), '{{email}}', p_email), '{{dezabonare}}', unsub);
  t := replace(replace(replace(replace(t, '{{prenume}}', first), '{{nume}}', coalesce(nullif(trim(p_name), ''), first)), '{{email}}', p_email), '{{dezabonare}}', unsub);
  if t <> '' and position(unsub in t) = 0 then t := t || E'\n\n—\nDezabonare: ' || unsub; end if;
  return jsonb_strip_nulls(jsonb_build_object('from', s.email_from, 'to', jsonb_build_array(p_email),
    'reply_to', coalesce(s.email_reply_to, 'comenzi@lyrasdelivery.ro'),
    'subject', replace(replace(c.subject, '{{prenume}}', first), '{{nume}}', coalesce(nullif(trim(p_name), ''), first)),
    'html', h, 'text', nullif(t, ''),
    'headers', jsonb_build_object('List-Unsubscribe', '<' || unsub || '>')));
end $$;
revoke execute on function public.newsletter_render(public.email_campaigns, uuid, text, text, uuid) from public, anon, authenticated;

create or replace function public.newsletter_key() returns text
language plpgsql stable security definer set search_path = public as $$
declare key text;
begin
  begin select decrypted_secret into key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  exception when others then key := null; end;
  return key;
end $$;
revoke execute on function public.newsletter_key() from public, anon, authenticated;

-- email de test, trimis pe loc (nu se numără în campanie)
create or replace function public.newsletter_test(p_campaign uuid, p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare c public.email_campaigns; key text := public.newsletter_key(); body jsonb;
begin
  if not public.is_admin() then raise exception 'Doar administratorul.' using errcode = 'P0001'; end if;
  if coalesce(p_email, '') not like '%_@_%' then raise exception 'Scrie o adresă de email validă.' using errcode = 'P0001'; end if;
  select * into c from public.email_campaigns where id = p_campaign;
  if not found or coalesce(c.html, '') = '' then raise exception 'Salvează campania înainte de test.' using errcode = 'P0001'; end if;
  if key is null then raise exception 'Lipsește cheia Resend (resend_api_key în Vault).' using errcode = 'P0001'; end if;
  body := public.newsletter_render(c, null, lower(trim(p_email)), 'Ana Test', null);
  body := jsonb_set(body, '{subject}', to_jsonb('[TEST] ' || (body->>'subject')));
  perform net.http_post(url := 'https://api.resend.com/emails', body := body,
    headers := jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'));
  return 'ok';
end $$;
grant execute on function public.newsletter_test(uuid, text) to authenticated;

-- pornește trimiterea (acum sau la o oră); destinatarii se fixează la pornire
create or replace function public.newsletter_send(p_campaign uuid, p_at timestamptz default null) returns int
language plpgsql security definer set search_path = public as $$
declare c public.email_campaigns; n int;
begin
  if not public.is_admin() then raise exception 'Doar administratorul.' using errcode = 'P0001'; end if;
  select * into c from public.email_campaigns where id = p_campaign for update;
  if not found then raise exception 'Campania nu există.' using errcode = 'P0001'; end if;
  if c.status not in ('draft', 'scheduled') then raise exception 'Campania a fost deja trimisă.' using errcode = 'P0001'; end if;
  if coalesce(trim(c.subject), '') = '' or coalesce(c.html, '') = '' then raise exception 'Completează subiectul și conținutul.' using errcode = 'P0001'; end if;
  if public.newsletter_key() is null then raise exception 'Lipsește cheia Resend (resend_api_key în Vault).' using errcode = 'P0001'; end if;
  if p_at is not null and p_at > now() + interval '1 minute' then
    update public.email_campaigns set status = 'scheduled', scheduled_at = p_at, updated_at = now() where id = c.id;
    return (select count(*) from public.newsletter_recipients(c.audience));
  end if;
  insert into public.email_sends(campaign_id, customer_id, email, name)
    select c.id, r.customer_id, r.email, r.name from public.newsletter_recipients(c.audience) r on conflict do nothing;
  get diagnostics n = row_count;
  update public.email_campaigns set status = 'sending', started_at = now(), scheduled_at = coalesce(scheduled_at, now()), updated_at = now() where id = c.id;
  return n;
end $$;
grant execute on function public.newsletter_send(uuid, timestamptz) to authenticated;

create or replace function public.newsletter_cancel(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Doar administratorul.' using errcode = 'P0001'; end if;
  update public.email_sends set status = 'cancelled' where campaign_id = p_campaign and status = 'queued';
  update public.email_campaigns set status = case when status = 'scheduled' then 'draft' else 'cancelled' end,
    finished_at = case when status = 'sending' then now() end, updated_at = now()
    where id = p_campaign and status in ('scheduled', 'sending');
end $$;
grant execute on function public.newsletter_cancel(uuid) to authenticated;

-- rulează la fiecare minut (pg_cron): pornește campaniile programate, trimite lotul următor, citește răspunsurile Resend
create or replace function public.newsletter_tick() returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.settings; key text; c public.email_campaigns; b record; resp record; room int; ids uuid[]; arr jsonb; req bigint; bid bigint; sent_now int := 0; r record;
begin
  select * into s from public.settings where id = 1;
  -- 1) răspunsurile loturilor trimise (pg_net le pune în net._http_response)
  for b in select * from public.email_batches where status = 'pending' loop
    begin
      execute 'select status_code, content::text as content from net._http_response where id = $1' into resp using b.request_id;
    exception when others then resp := null; end;
    if resp is not null and resp.status_code between 200 and 299 then
      update public.email_batches set status = 'ok' where id = b.id;
      update public.email_sends set status = 'sent', sent_at = now() where batch_id = b.id and status = 'sending';
    elsif resp is not null and resp.status_code is not null then
      update public.email_batches set status = 'failed', error = left(resp.content, 500) where id = b.id;
      update public.email_sends set status = 'failed', error = left(resp.content, 300) where batch_id = b.id and status = 'sending';
    elsif b.created_at < now() - interval '15 minutes' then
      -- fără răspuns: le considerăm trimise (Resend nu a refuzat), dar notăm
      update public.email_batches set status = 'ok', error = 'fără răspuns de la Resend' where id = b.id;
      update public.email_sends set status = 'sent', sent_at = now() where batch_id = b.id and status = 'sending';
    end if;
  end loop;

  -- 2) campaniile programate ajunse la oră
  for c in select * from public.email_campaigns where status = 'scheduled' and scheduled_at <= now() loop
    insert into public.email_sends(campaign_id, customer_id, email, name)
      select c.id, x.customer_id, x.email, x.name from public.newsletter_recipients(c.audience) x on conflict do nothing;
    update public.email_campaigns set status = 'sending', started_at = now(), updated_at = now() where id = c.id;
  end loop;

  -- 3) lotul următor, în limita zilnică (planul gratuit Resend: 100 de emailuri pe zi)
  key := public.newsletter_key();
  room := greatest(0, s.newsletter_daily_limit - (select count(*) from public.email_sends where status in ('sent', 'sending') and sent_at > now() - interval '24 hours'
                                                   or (status = 'sending' and sent_at is null)));
  if key is not null and room > 0 then
    for c in select * from public.email_campaigns where status = 'sending' order by started_at loop
      exit when room <= 0;
      select array_agg(id) into ids from (select id from public.email_sends where campaign_id = c.id and status = 'queued' order by email limit least(room, s.newsletter_batch)) q;
      continue when ids is null;
      arr := '[]';
      for r in select e.id, e.email, e.name, cu.unsub_token, coalesce(cu.marketing_ok, true) as ok
               from public.email_sends e left join public.customers cu on cu.id = e.customer_id where e.id = any(ids) loop
        if not r.ok then   -- s-a dezabonat între timp
          update public.email_sends set status = 'cancelled', error = 'dezabonat' where id = r.id; continue;
        end if;
        arr := arr || jsonb_build_array(public.newsletter_render(c, r.id, r.email, r.name, r.unsub_token));
      end loop;
      if jsonb_array_length(arr) > 0 then
        insert into public.email_batches(campaign_id, size) values (c.id, jsonb_array_length(arr)) returning id into bid;
        req := net.http_post(url := 'https://api.resend.com/emails/batch', body := arr,
          headers := jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'), timeout_milliseconds := 20000);
        update public.email_batches set request_id = req where id = bid;
        update public.email_sends set status = 'sending', batch_id = bid, sent_at = now() where id = any(ids) and status = 'queued';
        room := room - jsonb_array_length(arr); sent_now := sent_now + jsonb_array_length(arr);
      end if;
    end loop;
  end if;

  -- 4) campaniile terminate
  update public.email_campaigns cc set status = 'sent', finished_at = now(), updated_at = now()
    where cc.status = 'sending' and not exists (select 1 from public.email_sends e where e.campaign_id = cc.id and e.status in ('queued', 'sending'));
  return jsonb_build_object('sent', sent_now, 'room', room);
end $$;
revoke execute on function public.newsletter_tick() from public, anon, authenticated;

-- adminul poate împinge manual coada (butonul „Trimite acum” o pornește imediat, nu după un minut)
create or replace function public.newsletter_run() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Doar administratorul.' using errcode = 'P0001'; end if;
  return public.newsletter_tick();
end $$;
grant execute on function public.newsletter_run() to authenticated;

-- click pe un link din email: îl numărăm și întoarcem adresa reală (doar linkuri din campanie, nu orice adresă)
create or replace function public.newsletter_click(p_send uuid, p_k int) returns text
language plpgsql security definer set search_path = public as $$
declare url text;
begin
  select c.links[p_k] into url from public.email_sends e join public.email_campaigns c on c.id = e.campaign_id where e.id = p_send;
  if url is null then return null; end if;
  insert into public.email_clicks(send_id, k) values (p_send, p_k)
    on conflict (send_id, k) do update set clicks = email_clicks.clicks + 1;
  return url;
end $$;
grant execute on function public.newsletter_click(uuid, int) to anon, authenticated;

-- lista campaniilor cu statistici
create or replace function public.admin_newsletters() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.settings;
begin
  if not public.is_admin() then raise exception 'Doar administratorul.' using errcode = 'P0001'; end if;
  select * into s from public.settings where id = 1;
  return jsonb_build_object(
    'subscribers', (select count(*) from public.newsletter_recipients('all')),
    'daily_limit', s.newsletter_daily_limit,
    'sent_24h', (select count(*) from public.email_sends where status = 'sent' and sent_at > now() - interval '24 hours'),
    'has_key', public.newsletter_key() is not null,
    'campaigns', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select c.id, c.name, c.subject, c.mode, c.audience, c.status, c.scheduled_at, c.started_at, c.finished_at, c.created_at, c.updated_at,
        count(e.id) as total,
        count(e.id) filter (where e.status = 'sent') as sent,
        count(e.id) filter (where e.status = 'failed') as failed,
        count(e.id) filter (where e.status in ('queued', 'sending')) as queued,
        (select count(distinct k.send_id) from public.email_clicks k join public.email_sends e2 on e2.id = k.send_id where e2.campaign_id = c.id) as clickers,
        (select coalesce(sum(k.clicks), 0) from public.email_clicks k join public.email_sends e2 on e2.id = k.send_id where e2.campaign_id = c.id) as clicks,
        (select count(*) from public.marketing_log m join public.email_sends e3 on e3.customer_id = m.customer_id and e3.campaign_id = c.id
          where m.action = 'opt_out' and m.at >= coalesce(c.started_at, c.created_at) and m.at < coalesce(c.started_at, c.created_at) + interval '14 days') as unsubscribed,
        (select max(left(e4.error, 200)) from public.email_sends e4 where e4.campaign_id = c.id and e4.status = 'failed') as last_error
      from public.email_campaigns c left join public.email_sends e on e.campaign_id = c.id
      group by c.id) x), '[]'));
end $$;
grant execute on function public.admin_newsletters() to authenticated;

-- linkurile cele mai apăsate dintr-o campanie
create or replace function public.admin_newsletter_links(p_campaign uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Doar administratorul.' using errcode = 'P0001'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('url', c.links[k.k], 'people', count(distinct k.send_id), 'clicks', sum(k.clicks)) order by sum(k.clicks) desc)
    from public.email_clicks k join public.email_sends e on e.id = k.send_id join public.email_campaigns c on c.id = e.campaign_id
    where e.campaign_id = p_campaign group by c.links[k.k]), '[]');
end $$;
grant execute on function public.admin_newsletter_links(uuid) to authenticated;

do $$ begin
  begin create extension if not exists pg_cron; exception when others then null; end;
  begin perform cron.unschedule('lyra-newsletter'); exception when others then null; end;
  begin perform cron.schedule('lyra-newsletter', '* * * * *', 'select public.newsletter_tick()');
  exception when others then raise notice 'pg_cron indisponibil: newsletterul se trimite doar din butonul din admin.'; end;
end $$;
