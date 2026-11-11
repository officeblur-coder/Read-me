-- =====================================================================
-- Reduceri procentuale pe produse (din admin): ex. -20% la burgeri, cu perioadă opțională.
-- Pe site apar prețul vechi tăiat, prețul nou și eticheta de reducere; comanda se calculează cu prețul redus.
-- Când un produs e în mai multe reduceri active, se aplică cea mai mare.
-- =====================================================================
create table if not exists public.item_discounts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Reducere',
  percent    numeric(5,2) not null check (percent > 0 and percent <= 90),
  item_ids   text[] not null default '{}',
  active     boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- pentru cine: toată lumea, doar livrare sau doar ridicare; all_items = la tot meniul (și produsele adăugate mai târziu)
alter table public.item_discounts add column if not exists mode text not null default 'all' check (mode in ('all', 'livrare', 'ridicare'));
alter table public.item_discounts add column if not exists all_items boolean not null default false;
alter table public.item_discounts enable row level security;
do $$ begin
  drop policy if exists "discounts public read" on public.item_discounts;
  drop policy if exists "discounts admin write" on public.item_discounts;
end $$;
create policy "discounts public read" on public.item_discounts for select using (true);
create policy "discounts admin write" on public.item_discounts for all using (public.is_admin()) with check (public.is_admin());
grant select on public.item_discounts to anon, authenticated;
grant insert, update, delete on public.item_discounts to authenticated;

-- reducerea activă acum pentru un produs, la livrare sau ridicare (0 = fără reducere)
drop function if exists public.item_discount_pct(text);
create or replace function public.item_discount_pct(p_item text, p_mode text default null) returns numeric
language sql stable set search_path = public as $$
  select coalesce(max(percent), 0) from public.item_discounts
  where active and (all_items or p_item = any(item_ids)) and (mode = 'all' or mode = p_mode)
    and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now());
$$;
grant execute on function public.item_discount_pct(text, text) to anon, authenticated;

-- realtime: site-ul se actualizează când admin pornește sau oprește o reducere
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'item_discounts') then
    alter publication supabase_realtime add table public.item_discounts;
  end if;
end $$;
