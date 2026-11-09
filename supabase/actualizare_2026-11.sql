-- Lyra: actualizare noiembrie 2026 (clientul confirmă timpul, notificări, invită un prieten). Nu atinge meniul, comenzile sau clienții.
-- Supabase → SQL Editor → New query → lipiți tot fișierul → Run. Se poate rula de mai multe ori.

-- =====================================================================
-- Rapoarte pentru admin: cine a deschis recepția și cât timp, când s-a oprit
-- preluarea comenzilor, comenzi ratate, timp de acceptare, timp promis vs. livrare reală.
-- =====================================================================
create table if not exists public.console_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  name         text,
  started_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),   -- consola trimite un semnal la fiecare minut
  ended_at     timestamptz,                           -- „Ieși”; altfel se folosește last_seen_at
  device       text
);
create index if not exists console_sessions_started_idx on public.console_sessions(started_at desc);

create table if not exists public.staff_events (
  id      bigint generated always as identity primary key,
  user_id uuid,
  name    text,
  kind    text not null,          -- console_open, console_close, accepting_on, accepting_off
  detail  text,
  at      timestamptz not null default now()
);
create index if not exists staff_events_at_idx on public.staff_events(at desc);

alter table public.orders add column if not exists accepted_by uuid;
alter table public.orders add column if not exists accepted_by_name text;
alter table public.orders add column if not exists rejected_by_name text;
alter table public.orders add column if not exists eta_first int;     -- timpul promis la acceptare (eta_min se poate schimba ulterior)

alter table public.console_sessions enable row level security;
alter table public.staff_events     enable row level security;
do $$ begin
  drop policy if exists "sessions admin" on public.console_sessions;
  drop policy if exists "events admin" on public.staff_events;
end $$;
create policy "sessions admin" on public.console_sessions for select using (public.is_admin());
create policy "events admin"   on public.staff_events for select using (public.is_admin());
grant select on public.console_sessions, public.staff_events to authenticated;

create or replace function public.staff_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(s.name, ''), split_part(u.email, '@', 1))
  from auth.users u left join public.staff s on s.user_id = u.id where u.id = auth.uid();
$$;

-- cine a acceptat / refuzat și timpul promis inițial
create or replace function public.orders_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'new' and new.status = 'prep' then
    new.accepted_by := coalesce(new.accepted_by, auth.uid());
    new.accepted_by_name := coalesce(new.accepted_by_name, public.staff_name());
    new.eta_first := coalesce(old.eta_first, new.eta_min);
  end if;
  if new.status = 'rejected' and old.status <> 'rejected' then
    new.rejected_by_name := coalesce(public.staff_name(), new.rejected_by_name, 'sistem');
  end if;
  return new;
end $$;
drop trigger if exists orders_audit on public.orders;
create trigger orders_audit before update of status on public.orders for each row execute function public.orders_audit();

-- oprirea / pornirea preluării comenzilor online
create or replace function public.settings_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.accepting_orders is distinct from old.accepting_orders then
    insert into public.staff_events(user_id, name, kind) values (auth.uid(), coalesce(public.staff_name(), 'sistem'),
      case when new.accepting_orders then 'accepting_on' else 'accepting_off' end);
  end if;
  return new;
end $$;
drop trigger if exists settings_audit on public.settings;
create trigger settings_audit after update of accepting_orders on public.settings for each row execute function public.settings_audit();

-- consola de recepție: deschidere, semnal, închidere
create or replace function public.console_open(p_device text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if not public.is_staff() then raise exception 'Acces interzis.' using errcode = 'P0001'; end if;
  insert into public.console_sessions(user_id, name, device) values (auth.uid(), public.staff_name(), left(p_device, 120)) returning id into sid;
  insert into public.staff_events(user_id, name, kind) values (auth.uid(), public.staff_name(), 'console_open');
  return sid;
end $$;
create or replace function public.console_ping(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.console_sessions set last_seen_at = now() where id = p_id and user_id = auth.uid() and ended_at is null;
$$;
create or replace function public.console_close(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.console_sessions set ended_at = now(), last_seen_at = now() where id = p_id and user_id = auth.uid() and ended_at is null;
  if found then insert into public.staff_events(user_id, name, kind) values (auth.uid(), public.staff_name(), 'console_close'); end if;
end $$;
grant execute on function public.console_open(text), public.console_ping(uuid), public.console_close(uuid) to authenticated;

-- raportul pentru o perioadă
create or replace function public.admin_report(p_from timestamptz, p_to timestamptz, p_slow_min int default 5) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Doar administratorul vede rapoartele.' using errcode = 'P0001'; end if;
  with o as (
    select x.*,
      case when coalesce(x.offered_at, x.accepted_at) >= x.created_at then extract(epoch from (coalesce(x.offered_at, x.accepted_at) - x.created_at)) / 60.0 end as accept_min,   -- până la răspunsul recepției
      case when x.status = 'done' and x.done_at >= x.accepted_at then extract(epoch from (x.done_at - x.accepted_at)) / 60.0 end as actual_min,
      coalesce(x.eta_first, x.eta_min) as promised_min,
      (x.status = 'new' and x.offered_at is null and x.created_at < now() - interval '10 minutes'
        and (x.scheduled_for is null or x.scheduled_for < now() + interval '30 minutes')) as unanswered   -- o precomandă e ratată abia aproape de ora ei
    from public.orders x where x.created_at >= p_from and x.created_at < p_to
  )
  select jsonb_build_object(
    'summary', (select jsonb_build_object(
        'orders', count(*),
        'done', count(*) filter (where status = 'done'),
        'rejected', count(*) filter (where status = 'rejected'),
        'refunded', count(*) filter (where status = 'refunded'),
        'unanswered', count(*) filter (where unanswered),
        'slow_accept', count(*) filter (where accept_min > p_slow_min),
        'missed', count(*) filter (where status = 'rejected' or unanswered),
        'client_cancelled', count(*) filter (where status = 'rejected' and cancelled_by is not null),
        'revenue', coalesce(sum(total) filter (where status = 'done'), 0),
        'lost_revenue', coalesce(sum(total) filter (where status = 'rejected' or unanswered), 0),
        'avg_accept_min', round(avg(accept_min)::numeric, 1),
        'avg_promised_min', round(avg(promised_min) filter (where status = 'done')::numeric, 1),
        'avg_actual_min', round(avg(actual_min) filter (where status = 'done')::numeric, 1),
        'on_time', count(*) filter (where status = 'done' and actual_min <= promised_min + 5),
        'late', count(*) filter (where status = 'done' and actual_min > promised_min + 5),
        'avg_late_min', round(avg(actual_min - promised_min) filter (where status = 'done' and actual_min > promised_min + 5)::numeric, 1))
      from o),
    'orders', coalesce((select jsonb_agg(jsonb_build_object(
        'number', number, 'created_at', created_at, 'name', name, 'mode', mode, 'zone', zone_name, 'total', total,
        'status', case when unanswered then 'unanswered' else status end, 'reject_reason', reject_reason,
        'accepted_by', accepted_by_name, 'rejected_by', rejected_by_name, 'courier', courier_name,
        'accept_min', round(accept_min::numeric, 1), 'promised_min', promised_min, 'final_eta', eta_min,
        'actual_min', round(actual_min::numeric, 1), 'rating', rating) order by created_at desc) from o), '[]'),
    'staff', coalesce((select jsonb_agg(t order by t.accepted desc) from (
        select accepted_by_name as name, count(*) as accepted, round(avg(accept_min)::numeric, 1) as avg_accept_min
        from o where accepted_by_name is not null group by accepted_by_name) t), '[]'),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object(
        'name', s.name, 'started_at', s.started_at, 'ended_at', coalesce(s.ended_at, s.last_seen_at),
        'open', s.ended_at is null and s.last_seen_at > now() - interval '3 minutes',
        'lost', s.ended_at is null and s.last_seen_at <= now() - interval '3 minutes',
        'device', s.device,
        'minutes', round(extract(epoch from (coalesce(s.ended_at, s.last_seen_at) - s.started_at)) / 60.0)) order by s.started_at desc)
      from public.console_sessions s where s.started_at < p_to and coalesce(s.ended_at, s.last_seen_at) >= p_from), '[]'),
    'events', coalesce((select jsonb_agg(jsonb_build_object('name', e.name, 'kind', e.kind, 'at', e.at) order by e.at desc)
      from public.staff_events e where e.at >= p_from and e.at < p_to), '[]')
  ) into r;
  return r;
end $$;
grant execute on function public.admin_report(timestamptz, timestamptz, int) to authenticated;


-- =====================================================================
-- Clientul confirmă timpul de livrare
-- Recepția propune timpul („Propune · 45 min”). Comanda rămâne „new” până când clientul apasă
-- „Accept timpul” (devine „prep”, bucătăria începe) sau „Anulez comanda” (devine „rejected”, anulată de client).
-- Dacă clientul nu răspunde în offer_window_min minute, comanda se confirmă singură (sau se anulează, după setare).
-- Precomenzile (ora aleasă de client) nu trec prin acest pas.
-- =====================================================================

alter table public.settings add column if not exists confirm_eta boolean not null default true;
alter table public.settings add column if not exists offer_window_min int not null default 5 check (offer_window_min between 1 and 30);
alter table public.settings add column if not exists offer_timeout text not null default 'accept' check (offer_timeout in ('accept', 'cancel'));

alter table public.orders add column if not exists offered_at timestamptz;          -- când a propus recepția timpul
alter table public.orders add column if not exists offer_eta int;                   -- minutele propuse
alter table public.orders add column if not exists offer_answer text check (offer_answer in ('accepted', 'cancelled', 'auto_accepted', 'auto_cancelled', 'phone'));
alter table public.orders add column if not exists offer_answered_at timestamptz;
alter table public.orders add column if not exists cancelled_by text;               -- 'client' când clientul a anulat

-- recepția propune timpul (sau îl schimbă cât timp clientul n-a răspuns)
create or replace function public.offer_eta(p_id uuid, p_eta int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.orders; s public.settings;
begin
  if not public.is_staff() then raise exception 'Doar recepția propune timpul.' using errcode = 'P0001'; end if;
  if p_eta is null or p_eta < 5 or p_eta > 240 then raise exception 'Timpul trebuie să fie între 5 și 240 de minute.' using errcode = 'P0001'; end if;
  select * into s from public.settings where id = 1;
  select * into o from public.orders where id = p_id for update;
  if not found then raise exception 'Comanda nu există.' using errcode = 'P0001'; end if;
  if o.status <> 'new' then raise exception 'Comanda #% a primit deja răspuns.', o.number using errcode = 'P0001'; end if;
  update public.orders set offered_at = now(), offer_eta = p_eta, eta_min = p_eta, offer_answer = null, offer_answered_at = null,
         accepted_by = auth.uid(), accepted_by_name = public.staff_name()
   where id = p_id returning * into o;
  insert into public.order_messages(order_id, body) values (o.id, format(
    'Putem %s comanda în %s minute, la %s. Confirmă timpul sau anulează comanda în %s minute.',
    case when o.mode = 'livrare' then 'livra' else 'pregăti' end, p_eta,
    to_char((now() + make_interval(mins => p_eta)) at time zone s.tz, 'HH24:MI'), s.offer_window_min));
  return jsonb_build_object('offered_at', o.offered_at, 'offer_eta', o.offer_eta);
end $$;

-- intern: închide oferta unei comenzi (răspunsul clientului, telefon sau expirare)
create or replace function public.close_offer(p_id uuid, p_answer text) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders; s public.settings; msg text;
begin
  select * into s from public.settings where id = 1;
  select * into o from public.orders where id = p_id for update;
  if o.status <> 'new' or o.offered_at is null then return o; end if;
  if p_answer in ('accepted', 'auto_accepted', 'phone') then
    update public.orders set status = 'prep', accepted_at = now(), eta_min = o.offer_eta,
           offer_answer = p_answer, offer_answered_at = now()
     where id = p_id returning * into o;
    msg := format('%s Comanda e în bucătărie, %s la %s.',
      case p_answer when 'accepted' then 'Mulțumim, ai confirmat timpul.' when 'phone' then 'Timpul a fost confirmat telefonic.'
                    else 'Timpul a fost confirmat automat.' end,
      case when o.mode = 'livrare' then 'sosește' else 'e gata de ridicare' end,
      to_char((now() + make_interval(mins => o.offer_eta)) at time zone s.tz, 'HH24:MI'));
  else
    update public.orders set status = 'rejected', offer_answer = p_answer, offer_answered_at = now(),
           cancelled_by = case when p_answer = 'cancelled' then 'client' else 'sistem' end,
           rejected_by_name = case when p_answer = 'cancelled' then 'client' else 'sistem' end,
           reject_reason = case when p_answer = 'cancelled' then 'Anulată de client: timpul de livrare nu convine'
                                else 'Anulată: clientul nu a confirmat timpul' end
     where id = p_id returning * into o;
    msg := case when p_answer = 'cancelled' then 'Ai anulat comanda. Nu ți-a fost reținută nicio sumă.'
                else 'Comanda a fost anulată pentru că timpul nu a fost confirmat.' end;
  end if;
  insert into public.order_messages(order_id, body) values (o.id, msg);
  return o;
end $$;
revoke execute on function public.close_offer(uuid, text) from public, anon, authenticated;

-- ofertele fără răspuns în timpul stabilit se închid după setarea offer_timeout
create or replace function public.settle_offers() returns int
language plpgsql security definer set search_path = public as $$
declare s public.settings; r record; n int := 0;
begin
  select * into s from public.settings where id = 1;
  for r in select id from public.orders
            where status = 'new' and offered_at is not null and offered_at < now() - make_interval(mins => s.offer_window_min)
  loop
    perform public.close_offer(r.id, case when s.offer_timeout = 'cancel' then 'auto_cancelled' else 'auto_accepted' end);
    n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.settle_offers() to authenticated;

-- răspunsul clientului, din pagina comenzii (linkul secret)
create or replace function public.answer_offer(p_token uuid, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  perform public.settle_offers();
  select * into o from public.orders where token = p_token;
  if not found then raise exception 'Comanda nu a fost găsită.' using errcode = 'P0001'; end if;
  if o.status <> 'new' or o.offered_at is null then
    raise exception '%', case
      when o.offer_answer in ('auto_accepted', 'phone') then 'Timpul a fost deja confirmat. Pentru anulare, sună-ne.'
      when o.offer_answer = 'auto_cancelled' then 'Comanda a fost deja anulată.'
      when o.offered_at is null then 'Restaurantul nu a propus încă un timp.'
      else 'Ai răspuns deja.' end using errcode = 'P0001';
  end if;
  o := public.close_offer(o.id, case when p_accept then 'accepted' else 'cancelled' end);
  return jsonb_build_object('status', o.status);
end $$;
grant execute on function public.offer_eta(uuid, int) to authenticated;
grant execute on function public.answer_offer(uuid, boolean) to anon, authenticated;

-- recepția: clientul a confirmat la telefon
create or replace function public.confirm_offer_phone(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Doar recepția.' using errcode = 'P0001'; end if;
  perform public.close_offer(p_id, 'phone');
end $$;
grant execute on function public.confirm_offer_phone(uuid) to authenticated;

-- urmărirea comenzii: include oferta de timp și închide oferta expirată înainte de afișare
drop function if exists public.get_order(uuid);
create function public.get_order(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare oid uuid; s public.settings;
begin
  select o.id into oid from public.orders o where o.token = p_token;
  if oid is null then return null; end if;
  select * into s from public.settings where id = 1;
  if exists (select 1 from public.orders where id = oid and status = 'new' and offered_at < now() - make_interval(mins => s.offer_window_min)) then
    perform public.close_offer(oid, case when s.offer_timeout = 'cancel' then 'auto_cancelled' else 'auto_accepted' end);
  end if;
  return (select to_jsonb(x) from (
    select o.number, o.status, o.mode, o.address, o.items, o.subtotal, o.discount, o.discount_label,
           o.points_value, o.delivery_fee, o.packaging, o.total, o.points_earned, o.eta_min, o.created_at,
           o.accepted_at, o.road_at, o.done_at, o.reject_reason, o.rating, o.scheduled_for, o.welcome_value,
           o.offered_at, o.offer_eta, o.offer_answer, o.cancelled_by, s.offer_window_min as offer_window, s.offer_timeout, now() as server_now,
           coalesce((select jsonb_agg(jsonb_build_object('body', m.body, 'at', m.created_at) order by m.created_at)
                     from public.order_messages m where m.order_id = o.id), '[]') as messages
    from public.orders o where o.id = oid
  ) x);
end $$;
grant execute on function public.get_order(uuid) to anon, authenticated;

-- rulează la fiecare minut (pg_cron), ca ofertele să se închidă și când nimeni nu are pagina deschisă
do $$ begin
  begin create extension if not exists pg_cron; exception when others then null; end;
  begin perform cron.unschedule('lyra-offers'); exception when others then null; end;
  begin perform cron.schedule('lyra-offers', '* * * * *', 'select public.settle_offers()');
  exception when others then raise notice 'pg_cron indisponibil: ofertele se închid când recepția sau clientul au pagina deschisă.'; end;
end $$;


-- =====================================================================
-- Notificări pe telefon (Web Push)
-- Clientul: „Restaurantul propune 40 min”, „Curierul e pe drum”, „Comanda e gata”…, chiar cu browserul închis.
-- Recepția: comandă nouă, client care a anulat.
-- Trimiterea o face funcția Edge `push` (supabase/functions/push), apelată prin pg_net.
-- Configurare (o singură dată): vezi supabase/functions/push/README.md
--   select vault.create_secret('https://<proiect>.supabase.co/functions/v1/push', 'push_url');
--   select vault.create_secret('<un șir lung, aleator>', 'push_secret');
--   update public.settings set push_public_key = '<cheia VAPID publică>';
-- Fără configurare, site-ul arată notificări doar cât pagina e deschisă (fără server).
-- =====================================================================

alter table public.settings add column if not exists push_public_key text;   -- cheia VAPID publică (nu e secretă)

create table if not exists public.push_subs (
  id          bigint generated always as identity primary key,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  order_id    uuid references public.orders(id) on delete cascade,   -- abonamentul unui client pentru o comandă
  staff_user  uuid,                                                   -- sau al unui membru al recepției
  created_at  timestamptz not null default now(),
  check ((order_id is null) <> (staff_user is null))
);
create index if not exists push_subs_order_idx on public.push_subs(order_id);
alter table public.push_subs enable row level security;   -- fără politici: doar funcțiile de mai jos ating tabela

-- abonare client, pe baza linkului secret al comenzii
create or replace function public.push_subscribe(p_token uuid, p_sub jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare oid uuid;
begin
  select id into oid from public.orders where token = p_token;
  if oid is null then raise exception 'Comanda nu a fost găsită.' using errcode = 'P0001'; end if;
  if coalesce(p_sub->>'endpoint', '') !~ '^https://' or p_sub#>>'{keys,p256dh}' is null or p_sub#>>'{keys,auth}' is null then
    raise exception 'Abonament invalid.' using errcode = 'P0001';
  end if;
  insert into public.push_subs(endpoint, p256dh, auth, order_id)
  values (p_sub->>'endpoint', p_sub#>>'{keys,p256dh}', p_sub#>>'{keys,auth}', oid)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, order_id = excluded.order_id, staff_user = null, created_at = now();
end $$;

-- abonare recepție (toate comenzile noi)
create or replace function public.push_subscribe_staff(p_sub jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Doar echipa.' using errcode = 'P0001'; end if;
  if coalesce(p_sub->>'endpoint', '') !~ '^https://' then raise exception 'Abonament invalid.' using errcode = 'P0001'; end if;
  insert into public.push_subs(endpoint, p256dh, auth, staff_user)
  values (p_sub->>'endpoint', p_sub#>>'{keys,p256dh}', p_sub#>>'{keys,auth}', auth.uid())
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, staff_user = excluded.staff_user, order_id = null, created_at = now();
end $$;

create or replace function public.push_unsubscribe(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint;
$$;
grant execute on function public.push_subscribe(uuid, jsonb), public.push_unsubscribe(text) to anon, authenticated;
grant execute on function public.push_subscribe_staff(jsonb) to authenticated;

-- trimite o notificare către abonații unei comenzi (p_order) sau ai recepției (p_order null)
create or replace function public.push_send(p_order uuid, p_title text, p_body text, p_url text, p_tag text default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare url text; secret text; subs jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]') into subs
    from public.push_subs where (p_order is not null and order_id = p_order) or (p_order is null and staff_user is not null);
  if jsonb_array_length(subs) = 0 then return false; end if;
  begin
    select decrypted_secret into url from vault.decrypted_secrets where name = 'push_url' limit 1;
    select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_secret' limit 1;
  exception when others then url := null; end;
  if url is null or secret is null then return false; end if;
  perform net.http_post(url := url,
    body := jsonb_build_object('subs', subs, 'title', p_title, 'body', p_body, 'url', p_url, 'tag', coalesce(p_tag, p_url)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret));
  return true;
exception when others then
  raise warning 'Notificarea nu a putut fi trimisă: %', sqlerrm;
  return false;
end $$;
revoke execute on function public.push_send(uuid, text, text, text, text) from public, anon, authenticated;

-- ce se trimite la fiecare schimbare a comenzii
create or replace function public.orders_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.settings; link text; pick boolean; at text;
begin
  select * into s from public.settings where id = 1;
  link := '/comanda/' || new.token;
  pick := new.mode = 'ridicare';
  if tg_op = 'INSERT' then
    perform public.push_send(null, format('Comandă nouă #%s', new.number),
      format('%s · %s · %s lei%s', new.name, new.mode, to_char(new.total, 'FM999990.00'),
             case when new.scheduled_for is not null then ' · precomandă ' || to_char(new.scheduled_for at time zone s.tz, 'DD.MM HH24:MI') else '' end),
      '/receptie', 'new-' || new.id);
    return new;
  end if;
  -- recepția a propus timpul
  if new.status = 'new' and new.offered_at is distinct from old.offered_at and new.offered_at is not null then
    at := to_char((new.offered_at + make_interval(mins => new.offer_eta)) at time zone s.tz, 'HH24:MI');
    perform public.push_send(new.id, format('Restaurantul propune %s minute', new.offer_eta),
      format('Comanda #%s %s la ~%s. Apasă ca să confirmi sau să anulezi.', new.number, case when pick then 'e gata' else 'ajunge' end, at), link, 'order-' || new.id);
  end if;
  if new.status is distinct from old.status then
    at := to_char((coalesce(new.accepted_at, now()) + make_interval(mins => coalesce(new.eta_min, 0))) at time zone s.tz, 'HH24:MI');
    if new.status = 'prep' and coalesce(new.offer_answer, '') <> 'accepted' then
      perform public.push_send(new.id, format('Comanda #%s a fost acceptată', new.number),
        case when new.scheduled_for is not null then format('Programată %s.', to_char(new.scheduled_for at time zone s.tz, 'DD.MM la HH24:MI'))
             else format('Se gătește acum. %s la ~%s.', case when pick then 'Gata de ridicare' else 'Sosește' end, at) end, link, 'order-' || new.id);
    elsif new.status = 'road' then
      perform public.push_send(new.id, case when pick then 'Comanda ta e gata!' else 'Curierul e pe drum' end,
        case when pick then format('Comanda #%s te așteaptă la restaurant.', new.number)
             else format('Comanda #%s pleacă spre tine%s.', new.number, coalesce(' cu ' || nullif(new.courier_name, ''), '')) end, link, 'order-' || new.id);
    elsif new.status = 'done' then
      perform public.push_send(new.id, 'Poftă bună!', format('Cum a fost comanda #%s? Apasă și dă o notă.', new.number), link, 'order-' || new.id);
    elsif new.status = 'rejected' and new.cancelled_by is null then
      perform public.push_send(new.id, format('Comanda #%s nu a putut fi preluată', new.number),
        coalesce(new.reject_reason || '. ', '') || 'Nu ți-a fost reținută nicio sumă.', link, 'order-' || new.id);
    elsif new.status = 'rejected' and new.cancelled_by = 'client' and old.offered_at is not null then
      perform public.push_send(null, format('#%s anulată de client', new.number), format('%s · timpul propus nu i-a convenit.', new.name), '/receptie', 'cancel-' || new.id);
    end if;
  elsif new.status in ('prep', 'road') and new.eta_min is distinct from old.eta_min and old.eta_min is not null then
    at := to_char((new.accepted_at + make_interval(mins => new.eta_min)) at time zone s.tz, 'HH24:MI');
    perform public.push_send(new.id, format('Ora nouă pentru comanda #%s', new.number), format('%s la ~%s.', case when pick then 'Gata de ridicare' else 'Sosește' end, at), link, 'order-' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists orders_push on public.orders;
create trigger orders_push after insert or update on public.orders for each row execute function public.orders_push();

-- abonamentele clienților se șterg după 2 zile (comanda s-a încheiat de mult)
create or replace function public.push_cleanup() returns void
language sql security definer set search_path = public as $$
  delete from public.push_subs where order_id is not null and created_at < now() - interval '2 days';
$$;
do $$ begin
  begin perform cron.unschedule('lyra-push-cleanup'); exception when others then null; end;
  begin perform cron.schedule('lyra-push-cleanup', '17 4 * * *', 'select public.push_cleanup()');
  exception when others then null; end;
end $$;


-- =====================================================================
-- Recomandă un prieten
-- Fiecare client cu cont are un cod (link lyrasdelivery.ro/r/COD). Prietenul își face cont din link.
-- Când prima lui comandă (de minim referral_min lei) e livrată, amândoi primesc referral_lei lei în puncte
-- Lyra Rewards (1 punct = 0,01 lei la acest lot). Punctele se folosesc ca restul (max. 20% din comandă).
-- =====================================================================

alter table public.settings add column if not exists referral_on boolean not null default true;
alter table public.settings add column if not exists referral_lei numeric(8,2) not null default 20 check (referral_lei >= 0);
alter table public.settings add column if not exists referral_min numeric(8,2) not null default 60 check (referral_min >= 0);

alter table public.customers add column if not exists ref_code text unique;
alter table public.customers add column if not exists referred_by uuid references public.customers(id) on delete set null;
alter table public.customers add column if not exists referred_at timestamptz;
alter table public.customers add column if not exists referral_paid_at timestamptz;   -- bonusul pentru această recomandare a fost dat

-- punctele din recomandare au sursa / tipul lor
alter table public.point_lots drop constraint if exists point_lots_source_check;
alter table public.point_lots add constraint point_lots_source_check check (source in ('order','adjust','migration','referral'));
alter table public.point_ledger drop constraint if exists point_ledger_kind_check;
alter table public.point_ledger add constraint point_ledger_kind_check check (kind in ('earn','redeem','redeem_return','reverse','expire','adjust','migration','referral'));

-- cod scurt, ușor de dictat: primele litere din prenume + 4 cifre (ex. ANA4821); fără litere confuzabile
create or replace function public.referral_code(p_cust uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c public.customers; base text; code text; i int := 0;
begin
  select * into c from public.customers where id = p_cust for update;
  if c.ref_code is not null then return c.ref_code; end if;
  base := upper(left(regexp_replace(translate(coalesce(nullif(split_part(trim(c.name), ' ', 1), ''), split_part(c.email, '@', 1), 'LYRA'),
          'ăâîșşțţĂÂÎȘŞȚŢ', 'aaisstAAISSTT'), '[^A-Za-z]', '', 'g'), 5));
  if length(base) < 2 then base := 'LYRA'; end if;
  loop
    code := base || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.customers where ref_code = code);
    i := i + 1; if i > 20 then base := base || 'X'; end if;
  end loop;
  update public.customers set ref_code = code where id = p_cust;
  return code;
end $$;
revoke execute on function public.referral_code(uuid) from public, anon, authenticated;

-- pagina „Invită un prieten” din cont
create or replace function public.my_referral() returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.settings; me uuid := auth.uid(); code text; ref public.customers;
begin
  if me is null or not exists (select 1 from public.customers where id = me) then raise exception 'Intră în cont.' using errcode = 'P0001'; end if;
  select * into s from public.settings where id = 1;
  code := public.referral_code(me);
  select r.* into ref from public.customers c join public.customers r on r.id = c.referred_by where c.id = me;
  return jsonb_build_object(
    'on', s.referral_on, 'lei', s.referral_lei, 'min', s.referral_min, 'code', code,
    'link', rtrim(s.site_url, '/') || '/r/' || code,
    'invited', (select count(*) from public.customers where referred_by = me),
    'rewarded', (select count(*) from public.customers where referred_by = me and referral_paid_at is not null),
    'earned', (select coalesce(sum(value), 0) from public.point_ledger where customer_id = me and kind = 'referral'),
    'referred_by', case when ref.id is null then null else split_part(trim(coalesce(ref.name, 'un prieten')), ' ', 1) end,
    'my_bonus_paid', (select referral_paid_at is not null from public.customers where id = me));
end $$;
grant execute on function public.my_referral() to authenticated;

-- cine invită (pentru mesajul de pe site, înainte de cont): doar prenumele
create or replace function public.referral_info(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', split_part(trim(coalesce(c.name, 'Un prieten')), ' ', 1), 'lei', s.referral_lei, 'min', s.referral_min)
  from public.customers c, public.settings s where s.id = 1 and s.referral_on and c.ref_code = upper(trim(p_code));
$$;
grant execute on function public.referral_info(text) to anon, authenticated;

-- prietenul (cont nou, fără comenzi) se leagă de cel care l-a invitat
create or replace function public.claim_referral(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.customers; r public.customers; s public.settings;
begin
  select * into s from public.settings where id = 1;
  if not s.referral_on then raise exception 'Recomandările nu sunt active acum.' using errcode = 'P0001'; end if;
  select * into me from public.customers where id = auth.uid() for update;
  if not found then raise exception 'Intră în cont.' using errcode = 'P0001'; end if;
  select * into r from public.customers where ref_code = upper(trim(p_code));
  if not found then raise exception 'Codul de invitație nu există.' using errcode = 'P0001'; end if;
  if r.id = me.id then raise exception 'Nu te poți invita singur.' using errcode = 'P0001'; end if;
  if me.referred_by is not null then
    if me.referred_by = r.id then return jsonb_build_object('name', split_part(trim(coalesce(r.name, 'un prieten')), ' ', 1), 'already', true); end if;
    raise exception 'Contul tău e deja legat de o invitație.' using errcode = 'P0001';
  end if;
  if r.referred_by = me.id then raise exception 'Te-a invitat deja această persoană.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.orders where customer_id = me.id and status not in ('rejected')) or me.created_at < now() - interval '30 days' then
    raise exception 'Invitațiile sunt pentru conturile noi, înainte de prima comandă.' using errcode = 'P0001';
  end if;
  update public.customers set referred_by = r.id, referred_at = now() where id = me.id;
  return jsonb_build_object('name', split_part(trim(coalesce(r.name, 'un prieten')), ' ', 1), 'lei', s.referral_lei, 'min', s.referral_min);
end $$;
grant execute on function public.claim_referral(text) to authenticated;

-- intern: puncte de recomandare (lot cu valoare fixă: 1 punct = 0,01 lei)
create or replace function public.referral_credit(p_cust uuid, p_lei numeric, p_order public.orders, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare pts int := round(p_lei * 100); t smallint;
begin
  if pts <= 0 then return; end if;
  select tier into t from public.customers where id = p_cust;
  insert into public.point_lots(customer_id, order_id, source, points, remaining, vpp, tier) values (p_cust, null, 'referral', pts, pts, 0.01, coalesce(t, 1));
  insert into public.point_ledger(customer_id, order_id, order_no, kind, points, value, tier, note, actor)
    values (p_cust, p_order.id, p_order.number, 'referral', pts, round(pts * 0.01, 2), t, p_note, 'sistem');
  update public.customers set last_activity_at = now() where id = p_cust;
  perform public.rewards_sync(p_cust);
  perform public.rewards_notify(p_cust, 'referral', format('+%s lei de la Lyra', to_char(p_lei, 'FM999990.##')), p_note);
end $$;
revoke execute on function public.referral_credit(uuid, numeric, public.orders, text) from public, anon, authenticated;

-- prima comandă livrată a prietenului: bonus pentru amândoi
create or replace function public.orders_referral() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.settings; friend public.customers; inviter public.customers; fname text; iname text;
begin
  if new.status <> 'done' or old.status = 'done' or new.customer_id is null then return new; end if;
  select * into s from public.settings where id = 1;
  if not s.referral_on or s.referral_lei <= 0 then return new; end if;
  select * into friend from public.customers where id = new.customer_id for update;
  if friend.referred_by is null or friend.referral_paid_at is not null then return new; end if;
  if new.subtotal < s.referral_min then return new; end if;
  select * into inviter from public.customers where id = friend.referred_by;
  if not found then return new; end if;
  -- același telefon ca al celui care invită: nu e un prieten nou
  if regexp_replace(coalesce(inviter.phone, ''), '\D', '', 'g') <> '' and regexp_replace(coalesce(inviter.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(new.phone, ''), '\D', '', 'g') then return new; end if;
  update public.customers set referral_paid_at = now() where id = friend.id;
  fname := split_part(trim(coalesce(friend.name, new.name, 'prietenul tău')), ' ', 1);
  iname := split_part(trim(coalesce(inviter.name, 'prietenul tău')), ' ', 1);
  perform public.referral_credit(inviter.id, s.referral_lei, new, format('%s a comandat prima dată din invitația ta. Mulțumim!', fname));
  perform public.referral_credit(friend.id, s.referral_lei, new, format('Bonus pentru prima comandă din invitația lui %s.', iname));
  return new;
end $$;
drop trigger if exists orders_referral on public.orders;
create trigger orders_referral after update of status on public.orders for each row execute function public.orders_referral();

-- admin: setări
create or replace function public.admin_referral_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then jsonb_build_object(
    'invited', (select count(*) from public.customers where referred_by is not null),
    'rewarded', (select count(*) from public.customers where referral_paid_at is not null),
    'cost', (select coalesce(sum(value), 0) from public.point_ledger where kind = 'referral'),
    'top', (select coalesce(jsonb_agg(x), '[]') from (
        select coalesce(r.name, r.email) as name, count(*) as invited, count(c.referral_paid_at) as rewarded
        from public.customers c join public.customers r on r.id = c.referred_by group by r.id, r.name, r.email order by count(c.referral_paid_at) desc, count(*) desc limit 10) x))
  end;
$$;
grant execute on function public.admin_referral_stats() to authenticated;

