-- =====================================================================
-- Statistici de vizite, fără Google și fără cookie-uri de reclamă: fiecare vizită primește un id aleator
-- (doar pe durata sesiunii din browser), iar site-ul trimite pașii importanți: vizită, produs deschis,
-- adăugat în coș, căutare, pasul „Livrare și plată”, comandă trimisă. Fără nume, telefon sau email.
-- =====================================================================
create table if not exists public.site_events (
  id      bigint generated always as identity primary key,
  sid     uuid not null,                 -- sesiunea de navigare (aleatoare, nu identifică persoana)
  kind    text not null check (kind in ('visit','view_item','add_cart','search','checkout','order','account','signup')),
  detail  text,                          -- produsul, termenul căutat, numărul comenzii
  source  text,                          -- de unde a venit: facebook, instagram, google, qr, direct…
  device  text,                          -- telefon / calculator
  at      timestamptz not null default now()
);
create index if not exists site_events_at_idx on public.site_events(at desc);
create index if not exists site_events_sid_idx on public.site_events(sid, at);
-- fiecare pas se numără o singură dată pe sesiune (și o dată pe produs / căutare)
create unique index if not exists site_events_once on public.site_events(sid, kind, coalesce(detail, ''));
alter table public.site_events enable row level security;
do $$ begin drop policy if exists "events admin read" on public.site_events; end $$;
create policy "events admin read" on public.site_events for select using (public.is_admin());
revoke insert, update, delete on public.site_events from anon, authenticated;
grant select on public.site_events to authenticated;

-- scrierea se face doar prin această funcție (limitată ca lungime și număr)
create or replace function public.track(p_sid uuid, p_kind text, p_detail text default null, p_source text default null, p_device text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_sid is null or p_kind not in ('visit','view_item','add_cart','search','checkout','order','account','signup') then return; end if;
  if (select count(*) from public.site_events where sid = p_sid) >= 300 then return; end if;
  insert into public.site_events(sid, kind, detail, source, device)
    values (p_sid, p_kind, nullif(left(trim(p_detail), 80), ''), left(lower(p_source), 30), left(p_device, 12))
    on conflict do nothing;
end $$;
grant execute on function public.track(uuid, text, text, text, text) to anon, authenticated;

-- raportul pentru admin: pâlnia, pe zile, surse, dispozitive, produse, căutări, coșuri abandonate, ultimele vizite
create or replace function public.admin_traffic(p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; tz text := coalesce((select tz from public.settings where id = 1), 'Europe/Bucharest');
begin
  if not public.is_admin() then raise exception 'Doar administratorul vede statisticile.' using errcode = 'P0001'; end if;
  with e as (select * from public.site_events where at >= p_from and at < p_to),
  s as (  -- o linie pe sesiune
    select sid, min(at) as started, max(at) as last_at,
      (array_agg(source order by at) filter (where source is not null))[1] as source,
      (array_agg(device order by at) filter (where device is not null))[1] as device,
      bool_or(kind = 'add_cart') as cart, bool_or(kind = 'checkout') as checkout, bool_or(kind = 'order') as ordered,
      count(*) filter (where kind = 'view_item') as views
    from e group by sid)
  select jsonb_build_object(
    'funnel', (select jsonb_build_object('visits', count(*), 'cart', count(*) filter (where cart), 'checkout', count(*) filter (where checkout),
        'orders', count(*) filter (where ordered), 'viewed', count(*) filter (where views > 0)) from s),
    'signups', (select count(*) from public.customers where created_at >= p_from and created_at < p_to),
    'real_orders', (select count(*) from public.orders where created_at >= p_from and created_at < p_to),
    'days', coalesce((select jsonb_agg(d order by d.day) from (
        select to_char(started at time zone tz, 'YYYY-MM-DD') as day, count(*) as visits, count(*) filter (where cart) as cart,
          count(*) filter (where checkout) as checkout, count(*) filter (where ordered) as orders
        from s group by 1) d), '[]'),
    'sources', coalesce((select jsonb_agg(x order by x.visits desc) from (
        select coalesce(source, 'direct') as source, count(*) as visits, count(*) filter (where cart) as cart, count(*) filter (where ordered) as orders
        from s group by 1) x), '[]'),
    'devices', coalesce((select jsonb_agg(x order by x.visits desc) from (
        select coalesce(device, '?') as device, count(*) as visits, count(*) filter (where ordered) as orders from s group by 1) x), '[]'),
    'items', coalesce((select jsonb_agg(x order by x.views desc, x.carts desc) from (
        select e.detail as id, coalesce(i.name_ro, e.detail) as name,
          count(*) filter (where kind = 'view_item') as views, count(*) filter (where kind = 'add_cart') as carts
        from e left join public.items i on i.id = e.detail where kind in ('view_item', 'add_cart') and e.detail is not null
        group by e.detail, i.name_ro order by 3 desc, 4 desc limit 30) x), '[]'),
    'searches', coalesce((select jsonb_agg(x order by x.n desc) from (
        select lower(detail) as term, count(*) as n from e where kind = 'search' and detail is not null group by 1 order by 2 desc limit 20) x), '[]'),
    'abandoned', (select count(*) from s where cart and not ordered),
    'sessions', coalesce((select jsonb_agg(x order by x.started desc) from (
        select s.sid, s.started, s.last_at, s.source, s.device, s.ordered, s.cart, s.checkout,
          (select jsonb_agg(jsonb_build_object('kind', e2.kind, 'detail', coalesce(i.name_ro, e2.detail), 'at', e2.at) order by e2.at)
             from public.site_events e2 left join public.items i on i.id = e2.detail and e2.kind in ('view_item', 'add_cart')
             where e2.sid = s.sid) as steps
        from s order by s.started desc limit 60) x), '[]')
  ) into r;
  return r;
end $$;
grant execute on function public.admin_traffic(timestamptz, timestamptz) to authenticated;
