-- =====================================================================
-- Livratori (Istvan, Pipe, Liviu, Zoli), fiecare cu contul lui, cu aplicația pe telefon (lyrasdelivery.ro/curier)
-- • Recepția atribuie comanda unui livrator (oricând, oricâte comenzi, chiar dacă e pe traseu).
-- • Livratorul primește alarmă / notificare până apasă „Confirm”; recepția vede confirmarea.
-- • „Predat clientului” e disponibil tot timpul; după ora promisă, la fiecare 5 minute vine o reamintire
--   cu „Am predat” / „Sunt în întârziere”.
-- • Poziția GPS a livratorului (cât aplicația e deschisă) apare pe harta din recepție.
-- Conturile: Supabase → Authentication → Add user: istvan@, pipe@, liviu@, zoli@lyrasdelivery.ro (fiecare cu parola lui),
-- apoi rulați acest fișier: le adaugă în echipă ca livratori, cu numele lor. Alți livratori se adaugă din admin → Echipa.
-- =====================================================================

-- pornit / oprit din admin → Program (implicit oprit, până la instruirea echipei)
alter table public.settings add column if not exists couriers_on boolean not null default false;

alter table public.orders add column if not exists courier_assigned_at timestamptz;
alter table public.orders add column if not exists courier_ack_at timestamptz;          -- livratorul a confirmat că are comanda
alter table public.orders add column if not exists courier_late_at timestamptz;         -- ultima apăsare „Sunt în întârziere”
alter table public.orders add column if not exists courier_late_count int not null default 0;
alter table public.orders add column if not exists courier_pinged_at timestamptz;       -- ultima notificare trimisă livratorului

-- conturile livratorilor (dacă au fost create în Authentication)
insert into public.staff(user_id, name, role)
select u.id, n.name, 'courier'
  from auth.users u join (values ('istvan@lyrasdelivery.ro', 'Istvan'), ('pipe@lyrasdelivery.ro', 'Pipe'),
                                 ('liviu@lyrasdelivery.ro', 'Liviu'), ('zoli@lyrasdelivery.ro', 'Zoli')) n(email, name)
    on lower(u.email) = n.email
on conflict (user_id) do update set role = 'courier', name = excluded.name;

create or replace function public.is_courier() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and role = 'courier');
$$;
grant execute on function public.is_courier() to authenticated;

-- tura livratorului: „Pornește tura” / „Ieși” în aplicație (ziua e în ora României)
create table if not exists public.courier_shifts (
  courier_id uuid primary key references auth.users(id) on delete cascade,
  day        date not null,
  started_at timestamptz not null default now(),
  ended_at   timestamptz
);
alter table public.courier_shifts enable row level security;   -- fără politici: doar funcțiile de mai jos
create or replace function public.courier_shift_start() returns void
language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'Europe/Bucharest')::date;
begin
  if not public.is_courier() then raise exception 'Doar livratorii.' using errcode = 'P0001'; end if;
  insert into public.courier_shifts(courier_id, day, started_at, ended_at) values (auth.uid(), d, now(), null)
  on conflict (courier_id) do update set started_at = case when courier_shifts.day = d then courier_shifts.started_at else now() end,
    day = d, ended_at = null;
end $$;
create or replace function public.courier_shift_end() returns void
language sql security definer set search_path = public as $$
  update public.courier_shifts set ended_at = now() where courier_id = auth.uid() and ended_at is null;
$$;
grant execute on function public.courier_shift_start(), public.courier_shift_end() to authenticated;

-- lista livratorilor pentru recepție: doar cei care au pornit tura azi (și cei cu comenzi în curs)
create or replace function public.couriers() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_staff() then coalesce(jsonb_agg(jsonb_build_object(
      'id', s.user_id, 'name', coalesce(nullif(s.name, ''), split_part(u.email, '@', 1)),
      'started_at', sh.started_at, 'ended_at', sh.ended_at,
      'on_shift', sh.started_at is not null and sh.ended_at is null) order by s.name), '[]') end
  from public.staff s join auth.users u on u.id = s.user_id
  left join public.courier_shifts sh on sh.courier_id = s.user_id and sh.day = (now() at time zone 'Europe/Bucharest')::date
  where s.role = 'courier'
    and (sh.courier_id is not null
         or exists (select 1 from public.orders o where o.courier_id = s.user_id and o.status in ('prep', 'road')));
$$;
grant execute on function public.couriers() to authenticated;

-- poziția GPS (ultima) a fiecărui livrator
create table if not exists public.courier_locations (
  courier_id uuid primary key references auth.users(id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  accuracy   real,
  heading    real,
  speed      real,
  battery    real,
  updated_at timestamptz not null default now()
);
alter table public.courier_locations enable row level security;
drop policy if exists "courier loc staff read" on public.courier_locations;
create policy "courier loc staff read" on public.courier_locations for select using (public.is_staff());
grant select on public.courier_locations to authenticated;
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'courier_locations') then
    alter publication supabase_realtime add table public.courier_locations;
  end if;
end $$;

create or replace function public.courier_ping(p_lat double precision, p_lng double precision, p_acc real default null,
  p_heading real default null, p_speed real default null, p_battery real default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_courier() then raise exception 'Doar livratorii.' using errcode = 'P0001'; end if;
  insert into public.courier_locations(courier_id, lat, lng, accuracy, heading, speed, battery, updated_at)
  values (auth.uid(), p_lat, p_lng, p_acc, p_heading, p_speed, p_battery, now())
  on conflict (courier_id) do update set lat = excluded.lat, lng = excluded.lng, accuracy = excluded.accuracy,
    heading = excluded.heading, speed = excluded.speed, battery = excluded.battery, updated_at = now();
end $$;
grant execute on function public.courier_ping(double precision, double precision, real, real, real, real) to authenticated;

-- notificare pe telefonul livratorului (Web Push, dacă e configurat; altfel aplicația deschisă sună singură)
alter table public.push_subs add column if not exists courier_id uuid references auth.users(id) on delete cascade;
create or replace function public.push_subscribe_courier(p_sub jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_courier() then raise exception 'Doar livratorii.' using errcode = 'P0001'; end if;
  if coalesce(p_sub->>'endpoint', '') !~ '^https://' then raise exception 'Abonament invalid.' using errcode = 'P0001'; end if;
  insert into public.push_subs(endpoint, p256dh, auth, courier_id)
  values (p_sub->>'endpoint', p_sub#>>'{keys,p256dh}', p_sub#>>'{keys,auth}', auth.uid())
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, courier_id = excluded.courier_id, customer_id = null;
end $$;
grant execute on function public.push_subscribe_courier(jsonb) to authenticated;

-- aplicația Android „Lyra Livrator”: tokenul Firebase al telefonului
create table if not exists public.courier_devices (
  token      text primary key,
  courier_id uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
alter table public.courier_devices enable row level security;   -- fără politici: doar funcțiile de mai jos
create or replace function public.courier_device_register(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_courier() then raise exception 'Doar livratorii.' using errcode = 'P0001'; end if;
  if length(coalesce(p_token, '')) < 20 then raise exception 'Token invalid.' using errcode = 'P0001'; end if;
  insert into public.courier_devices(token, courier_id) values (p_token, auth.uid())
  on conflict (token) do update set courier_id = excluded.courier_id, updated_at = now();
end $$;
grant execute on function public.courier_device_register(text) to authenticated;

-- notificarea către livrator: aplicația Android (Firebase, secretul vault 'fcm_url') și/sau browserul (Web Push)
create or replace function public.courier_push(p_courier uuid, p_title text, p_body text, p_tag text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ids bigint[]; toks jsonb; url text; secret text; sent boolean := false;
begin
  select jsonb_agg(token) into toks from public.courier_devices where courier_id = p_courier;
  if toks is not null then
    begin
      select decrypted_secret into url from vault.decrypted_secrets where name = 'fcm_url' limit 1;
      select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_secret' limit 1;
    exception when others then url := null; end;
    if url is not null and secret is not null then
      perform net.http_post(url := url, body := jsonb_build_object('tokens', toks, 'title', p_title, 'body', p_body, 'tag', p_tag),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret), timeout_milliseconds := 15000);
      sent := true;
    end if;
  end if;
  select array_agg(id) into ids from public.push_subs where courier_id = p_courier;
  if ids is not null then
    begin perform public.push_deliver(ids, p_title, p_body, '/curier', p_tag); sent := true;
    exception when others then null; end;   -- Web Push neconfigurat
  end if;
  return sent;
exception when others then
  return false;   -- fără notificări configurate: aplicația deschisă sună oricum
end $$;
revoke execute on function public.courier_push(uuid, text, text, text) from public, anon, authenticated;

-- ora la care trebuie să ajungă comanda la client
create or replace function public.order_due(o public.orders) returns timestamptz
language sql stable as $$
  select coalesce(o.scheduled_for, o.accepted_at + make_interval(mins => coalesce(o.eta_min, 0)));
$$;

-- recepția atribuie (sau schimbă) livratorul; p_courier null = scoate atribuirea
create or replace function public.courier_assign(p_order uuid, p_courier uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.orders; nm text; s public.settings;
begin
  if not public.is_staff() or public.is_courier() then raise exception 'Doar recepția atribuie livrările.' using errcode = 'P0001'; end if;
  if not coalesce((select couriers_on from public.settings where id = 1), false) and p_courier is not null then
    raise exception 'Livratorii sunt opriți din admin (Program → Livratori).' using errcode = 'P0001'; end if;
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Comanda nu există.' using errcode = 'P0001'; end if;
  if o.mode <> 'livrare' then raise exception 'Comanda #% e cu ridicare.', o.number using errcode = 'P0001'; end if;
  if o.status in ('done', 'rejected', 'refunded') then raise exception 'Comanda #% e închisă.', o.number using errcode = 'P0001'; end if;
  if p_courier is not null then
    select coalesce(nullif(st.name, ''), split_part(u.email, '@', 1)) into nm from public.staff st join auth.users u on u.id = st.user_id
     where st.user_id = p_courier and st.role = 'courier';
    if nm is null then raise exception 'Livratorul nu există.' using errcode = 'P0001'; end if;
  end if;
  if o.courier_id is not distinct from p_courier then return jsonb_build_object('courier', nm); end if;
  update public.orders set courier_id = p_courier, courier_name = nm, courier_assigned_at = case when p_courier is null then null else now() end,
         courier_ack_at = null, courier_pinged_at = case when p_courier is null then null else now() end
   where id = o.id returning * into o;
  if p_courier is not null then
    select * into s from public.settings where id = 1;
    perform public.courier_push(p_courier, format('Comandă nouă #%s · confirmă', o.number),
      format('%s · %s · la client %s', o.address, o.name, coalesce(to_char(public.order_due(o) at time zone s.tz, 'HH24:MI'), 'cât mai curând')), 'cr-' || o.id);
  end if;
  return jsonb_build_object('courier', nm);
end $$;
grant execute on function public.courier_assign(uuid, uuid) to authenticated;

-- livratorul: „Confirm” (am aflat de comandă)
create or replace function public.courier_ack(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set courier_ack_at = coalesce(courier_ack_at, now()) where id = p_order and courier_id = auth.uid();
  if not found then raise exception 'Comanda nu mai e atribuită ție.' using errcode = 'P0001'; end if;
end $$;

-- livratorul: „Predat clientului” (oricând, chiar dacă recepția n-a apăsat încă „Predă curierului”)
create or replace function public.courier_delivered(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order and courier_id = auth.uid() for update;
  if not found then raise exception 'Comanda nu mai e atribuită ție.' using errcode = 'P0001'; end if;
  if o.status = 'done' then return; end if;
  if o.status not in ('prep', 'road') then raise exception 'Comanda #% nu mai e activă.', o.number using errcode = 'P0001'; end if;
  if o.status = 'prep' then update public.orders set status = 'road' where id = o.id; end if;
  update public.orders set status = 'done', courier_ack_at = coalesce(courier_ack_at, now()) where id = o.id;
  insert into public.order_messages(order_id, body) values (o.id, 'Comanda a fost livrată. Poftă bună!');
end $$;

-- livratorul: „Sunt în întârziere” (recepția vede; reamintirea revine peste 5 minute)
create or replace function public.courier_late(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set courier_late_at = now(), courier_late_count = courier_late_count + 1, courier_pinged_at = now(),
         courier_ack_at = coalesce(courier_ack_at, now())
   where id = p_order and courier_id = auth.uid() and status in ('prep', 'road');
  if not found then raise exception 'Comanda nu mai e atribuită ție.' using errcode = 'P0001'; end if;
end $$;
grant execute on function public.courier_ack(uuid), public.courier_delivered(uuid), public.courier_late(uuid) to authenticated;

-- la fiecare minut (pg_cron): notificări repetate cât timp livratorul n-a confirmat; după ora promisă, la 5 minute
create or replace function public.courier_tick() returns int
language plpgsql security definer set search_path = public as $$
declare o public.orders; n int := 0; s public.settings; due timestamptz;
begin
  select * into s from public.settings where id = 1;
  if not s.couriers_on then return 0; end if;   -- oprit din admin: fără notificări către livratori
  for o in select * from public.orders where courier_id is not null and status in ('prep', 'road') loop
    due := public.order_due(o);
    if o.courier_ack_at is null and (o.courier_pinged_at is null or o.courier_pinged_at < now() - interval '55 seconds') then
      perform public.courier_push(o.courier_id, format('Comandă nouă #%s · confirmă', o.number), format('%s · %s', o.address, o.name), 'cr-' || o.id);
      update public.orders set courier_pinged_at = now() where id = o.id; n := n + 1;
    elsif due is not null and due < now() and (o.courier_pinged_at is null or o.courier_pinged_at < now() - interval '295 seconds') then
      perform public.courier_push(o.courier_id, format('#%s trebuia livrată la %s', o.number, to_char(due at time zone s.tz, 'HH24:MI')),
        'Apasă „Am predat” sau „Sunt în întârziere”.', 'cr-late-' || o.id);
      update public.orders set courier_pinged_at = now() where id = o.id; n := n + 1;
    end if;
  end loop;
  return n;
end $$;
do $$ begin
  begin perform cron.unschedule('lyra-couriers'); exception when others then null; end;
  begin perform cron.schedule('lyra-couriers', '* * * * *', 'select public.courier_tick()');
  exception when others then raise notice 'pg_cron indisponibil: alarmele vin doar cu aplicația livratorului deschisă.'; end;
end $$;
