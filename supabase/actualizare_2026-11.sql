-- Lyra: actualizare noiembrie 2026 (clientul confirmă timpul de livrare, notificări cu oferte din admin). Nu atinge meniul, comenzile sau clienții.
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
      and coalesce(x.pay_status, 'none') not in ('pending', 'failed')   -- plățile online neterminate nu sunt comenzi
      and x.reject_reason is distinct from 'Plata online nu a fost finalizată'
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
    perform set_config('lyra.offer_close', '1', true);   -- trecerea în bucătărie vine din răspuns, nu din recepție
    update public.orders set status = 'prep', accepted_at = now(), eta_min = o.offer_eta,
           offer_answer = p_answer, offer_answered_at = now()
     where id = p_id returning * into o;
    perform set_config('lyra.offer_close', '', true);
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
    msg := case when p_answer = 'cancelled' and o.pay_status in ('paid', 'refunding') then 'Ai anulat comanda.'
                when p_answer = 'cancelled' then 'Ai anulat comanda. Nu ți-a fost reținută nicio sumă.'
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
           o.points_value, o.delivery_fee, o.packaging, o.sgr, o.total, o.points_earned, o.eta_min, o.created_at,
           o.accepted_at, o.road_at, o.done_at, o.reject_reason, o.rating, o.scheduled_for, o.welcome_value,
           o.offered_at, o.offer_eta, o.offer_answer, o.cancelled_by, o.payment, o.pay_status, s.offer_window_min as offer_window, s.offer_timeout, now() as server_now,
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

-- Siguranță: orice „Acceptă” trimis direct (de exemplu de pe un ecran de recepție cu versiunea veche a site-ului)
-- devine propunere către client cât timp confirmarea e pornită. Precomenzile se acceptă direct, ca înainte.
-- Numele începe cu „orders_a_” ca să ruleze înaintea celorlalte triggere ale comenzii.
create or replace function public.orders_a_offer() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.settings;
begin
  if old.status <> 'new' or new.status <> 'prep' or old.scheduled_for is not null then return new; end if;
  if coalesce(current_setting('lyra.offer_close', true), '') = '1' then return new; end if;
  select * into s from public.settings where id = 1;
  if not s.confirm_eta then return new; end if;
  new.status := 'new'; new.accepted_at := null; new.offer_answer := null; new.offer_answered_at := null;
  new.offer_eta := greatest(5, least(240, coalesce(new.eta_min, old.offer_eta, 30)));
  new.eta_min := new.offer_eta;
  if old.offered_at is not null and old.offer_eta = new.offer_eta then
    new.offered_at := old.offered_at;   -- același timp apăsat din nou: nu repornim numărătoarea și nu repetăm mesajul
    return new;
  end if;
  new.offered_at := now();
  new.accepted_by := coalesce(auth.uid(), old.accepted_by); new.accepted_by_name := coalesce(public.staff_name(), old.accepted_by_name);
  insert into public.order_messages(order_id, body) values (new.id, format(
    'Putem %s comanda în %s minute, la %s. Confirmă timpul sau anulează comanda în %s minute.',
    case when new.mode = 'livrare' then 'livra' else 'pregăti' end, new.offer_eta,
    to_char((now() + make_interval(mins => new.offer_eta)) at time zone s.tz, 'HH24:MI'), s.offer_window_min));
  return new;
end $$;
drop trigger if exists orders_a_offer on public.orders;
create trigger orders_a_offer before update of status on public.orders for each row execute function public.orders_a_offer();

-- mesajul „Comanda a fost acceptată…” trimis de ecranul vechi nu ajunge la client cât timp așteptăm răspunsul lui
create or replace function public.messages_skip_old_accept() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.body like 'Comanda a fost acceptată.%' and exists (select 1 from public.orders where id = new.order_id and status = 'new' and offered_at is not null) then
    return null;
  end if;
  return new;
end $$;
drop trigger if exists messages_skip_old_accept on public.order_messages;
create trigger messages_skip_old_accept before insert on public.order_messages for each row execute function public.messages_skip_old_accept();



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
-- telefoanele livratorilor (15_couriers.sql) nu primesc ofertele
alter table public.push_subs add column if not exists courier_id uuid references auth.users(id) on delete cascade;
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
  select array_agg(id order by id) into ids from public.push_subs where courier_id is null and (not p_test or customer_id = auth.uid());
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
    'subscribers', (select count(*) from public.push_subs where courier_id is null),
    'with_account', (select count(*) from public.push_subs where customer_id is not null),
    'configured', exists (select 1 from public.settings where id = 1 and push_public_key is not null),
    'recent', (select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from
      (select title, body, url, sent_to, test, created_at from public.push_campaigns order by created_at desc limit 10) x))
  end;
$$;
grant execute on function public.admin_push_send(text, text, text, boolean), public.admin_push_overview() to authenticated;

