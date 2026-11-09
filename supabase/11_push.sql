-- =====================================================================
-- Notificări cu oferte pe telefon (Web Push), trimise din admin → Newsletter
-- Le primesc doar cei care au acceptat: „Vreau oferte prin notificări” (din cont sau din aplicația de pe ecran).
-- Trimiterea o face funcția Edge `push` (supabase/functions/push), apelată prin pg_net.
-- Configurare o singură dată: supabase/functions/push/README.md
-- =====================================================================

alter table public.settings add column if not exists push_public_key text;   -- cheia VAPID publică (nu e secretă)

create table if not exists public.push_subs (
  id          bigint generated always as identity primary key,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
alter table public.push_subs add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.push_subs enable row level security;   -- fără politici: doar funcțiile de mai jos ating tabela

-- curățare după versiunea de test (notificări pe comenzi, „Invită un prieten”): nu mai sunt folosite
alter table public.push_subs drop constraint if exists push_subs_check;
do $$ begin
  execute 'delete from public.push_subs where order_id is not null or staff_user is not null';
exception when undefined_column then null; end $$;
drop trigger if exists orders_push on public.orders;
drop function if exists public.orders_push();
drop function if exists public.push_subscribe(uuid, jsonb);
drop function if exists public.push_subscribe_staff(jsonb);
drop function if exists public.push_send(uuid, text, text, text, text);
drop function if exists public.push_cleanup();
drop trigger if exists orders_referral on public.orders;
drop function if exists public.orders_referral();
drop function if exists public.referral_credit(uuid, numeric, public.orders, text);
drop function if exists public.claim_referral(text);
drop function if exists public.referral_info(text);
drop function if exists public.my_referral();
drop function if exists public.referral_code(uuid);
drop function if exists public.admin_referral_stats();
do $$ begin
  begin perform cron.unschedule('lyra-push-cleanup'); exception when others then null; end;
end $$;

create table if not exists public.push_campaigns (
  id         bigint generated always as identity primary key,
  title      text not null,
  body       text not null,
  url        text not null default '/',
  sent_to    int not null default 0,
  test       boolean not null default false,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.push_campaigns enable row level security;

-- abonare: telefonul acceptă oferte prin notificări (cu sau fără cont)
create or replace function public.push_subscribe_offers(p_sub jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := (select id from public.customers where id = auth.uid());
begin
  if coalesce(p_sub->>'endpoint', '') !~ '^https://' or p_sub#>>'{keys,p256dh}' is null or p_sub#>>'{keys,auth}' is null then
    raise exception 'Abonament invalid.' using errcode = 'P0001';
  end if;
  insert into public.push_subs(endpoint, p256dh, auth, customer_id)
  values (p_sub->>'endpoint', p_sub#>>'{keys,p256dh}', p_sub#>>'{keys,auth}', cid)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, customer_id = coalesce(excluded.customer_id, push_subs.customer_id);
end $$;

create or replace function public.push_unsubscribe(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint;
$$;
grant execute on function public.push_subscribe_offers(jsonb), public.push_unsubscribe(text) to anon, authenticated;

-- intern: trimite către o listă de abonamente, în loturi de 500 (o cerere pg_net pe lot)
create or replace function public.push_deliver(p_ids bigint[], p_title text, p_body text, p_url text, p_tag text) returns int
language plpgsql security definer set search_path = public as $$
declare url text; secret text; subs jsonb; n int := 0; i int := 0; total int := coalesce(array_length(p_ids, 1), 0);
begin
  begin
    select decrypted_secret into url from vault.decrypted_secrets where name = 'push_url' limit 1;
    select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_secret' limit 1;
  exception when others then url := null; end;
  if url is null or secret is null then
    raise exception 'Notificările nu sunt configurate încă (lipsesc push_url / push_secret). Pașii: supabase/functions/push/README.md' using errcode = 'P0001';
  end if;
  while i < total loop
    select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)) into subs
      from public.push_subs where id = any(p_ids[i + 1 : i + 500]);
    if subs is not null then
      perform net.http_post(url := url,
        body := jsonb_build_object('subs', subs, 'title', p_title, 'body', p_body, 'url', p_url, 'tag', p_tag),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
        timeout_milliseconds := 30000);
      n := n + jsonb_array_length(subs);
    end if;
    i := i + 500;
  end loop;
  return n;
end $$;
revoke execute on function public.push_deliver(bigint[], text, text, text, text) from public, anon, authenticated;

-- admin: trimite notificarea tuturor (sau doar pe telefoanele proprii, ca test)
create or replace function public.admin_push_send(p_title text, p_body text, p_url text default '/', p_test boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ids bigint[]; n int; who text; link text := coalesce(nullif(trim(p_url), ''), '/');
begin
  if not public.is_admin() then raise exception 'Doar administratorul trimite notificări.' using errcode = 'P0001'; end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then raise exception 'Scrie titlul și textul notificării.' using errcode = 'P0001'; end if;
  if length(p_title) > 60 or length(p_body) > 180 then raise exception 'Titlul are maxim 60 de caractere, textul maxim 180.' using errcode = 'P0001'; end if;
  if link !~ '^/' then raise exception 'Linkul trebuie să fie o pagină de pe site (începe cu /).' using errcode = 'P0001'; end if;
  link := link || case when link like '%?%' then '&' else '?' end || 's=push';   -- apare în Vizite cu sursa „push”
  select array_agg(id order by id) into ids from public.push_subs where not p_test or customer_id = auth.uid();
  if ids is null then
    raise exception '%', case when p_test then 'Pe telefonul tău nu sunt pornite notificările. Intră în cont pe telefon și pornește „Vreau oferte prin notificări”.'
      else 'Nimeni nu are încă notificările pornite.' end using errcode = 'P0001';
  end if;
  n := public.push_deliver(ids, trim(p_title), trim(p_body), link, 'oferta-' || extract(epoch from now())::bigint);
  select email into who from auth.users where id = auth.uid();
  insert into public.push_campaigns(title, body, url, sent_to, test, created_by) values (trim(p_title), trim(p_body), link, n, p_test, who);
  return jsonb_build_object('sent_to', n);
end $$;

create or replace function public.admin_push_overview() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then jsonb_build_object(
    'subscribers', (select count(*) from public.push_subs),
    'with_account', (select count(*) from public.push_subs where customer_id is not null),
    'configured', exists (select 1 from public.settings where id = 1 and push_public_key is not null),
    'recent', (select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from
      (select title, body, url, sent_to, test, created_at from public.push_campaigns order by created_at desc limit 10) x))
  end;
$$;
grant execute on function public.admin_push_send(text, text, text, boolean), public.admin_push_overview() to authenticated;
