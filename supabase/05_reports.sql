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
