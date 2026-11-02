-- =====================================================================
-- Zone de livrare desenate pe hartă (admin → Zone livrare)
--  * fiecare zonă: poligon [[lat,lng],…], taxă, comandă minimă, livrare gratuită peste X lei
--  * o adresă din mai multe zone suprapuse primește zona cea mai mică (de ex. „Oraș” în „Împrejurimi”)
--  * fără nicio zonă activă, livrarea merge ca înainte (taxa din setări, fără verificare pe hartă)
-- =====================================================================
create table if not exists public.delivery_zones (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#ff7a1a',
  polygon    jsonb not null,                        -- [[lat,lng], …] minim 3 puncte
  fee        numeric(10,2) not null default 0 check (fee >= 0),
  min_order  numeric(10,2) not null default 0 check (min_order >= 0),
  free_over  numeric(10,2) check (free_over >= 0),  -- null = taxa se plătește mereu
  eta_extra  int not null default 0,                -- minute în plus față de timpul obișnuit (informativ)
  active     boolean not null default true,
  sort       int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.orders add column if not exists lat numeric(9,6);
alter table public.orders add column if not exists lng numeric(9,6);
alter table public.orders add column if not exists zone_name text;

alter table public.delivery_zones enable row level security;
do $$ begin
  drop policy if exists "zones read" on public.delivery_zones;
  drop policy if exists "zones admin" on public.delivery_zones;
end $$;
create policy "zones read"  on public.delivery_zones for select using (active or public.is_staff());
create policy "zones admin" on public.delivery_zones for all using (public.is_admin()) with check (public.is_admin());
grant select on public.delivery_zones to anon, authenticated;
grant insert, update, delete on public.delivery_zones to authenticated;

-- punct în poligon (ray casting), coordonate [lat,lng]
create or replace function public.point_in_zone(p_lat numeric, p_lng numeric, p_poly jsonb) returns boolean
language plpgsql immutable as $$
declare n int := jsonb_array_length(p_poly); i int; j int; yi numeric; xi numeric; yj numeric; xj numeric; inside boolean := false;
begin
  if n < 3 then return false; end if;
  j := n - 1;
  for i in 0 .. n - 1 loop
    yi := (p_poly->i->>0)::numeric; xi := (p_poly->i->>1)::numeric;
    yj := (p_poly->j->>0)::numeric; xj := (p_poly->j->>1)::numeric;
    if ((yi > p_lat) <> (yj > p_lat)) and (p_lng < (xj - xi) * (p_lat - yi) / nullif(yj - yi, 0) + xi) then
      inside := not inside;
    end if;
    j := i;
  end loop;
  return inside;
end $$;

-- aria aproximativă (pentru alegerea zonei celei mai mici)
create or replace function public.zone_area(p_poly jsonb) returns numeric
language sql immutable as $$
  select abs(sum(((p_poly->i->>1)::numeric * (p_poly->((i + 1) % jsonb_array_length(p_poly))->>0)::numeric)
               - ((p_poly->((i + 1) % jsonb_array_length(p_poly))->>1)::numeric * (p_poly->i->>0)::numeric))) / 2
  from generate_series(0, jsonb_array_length(p_poly) - 1) i;
$$;

-- zona pentru un punct (null dacă e în afara tuturor)
create or replace function public.zone_for(p_lat numeric, p_lng numeric) returns public.delivery_zones
language sql stable security definer set search_path = public as $$
  select * from public.delivery_zones
  where active and p_lat is not null and p_lng is not null and public.point_in_zone(p_lat, p_lng, polygon)
  order by public.zone_area(polygon), sort limit 1;
$$;
grant execute on function public.point_in_zone(numeric,numeric,jsonb), public.zone_area(jsonb) to anon, authenticated;
