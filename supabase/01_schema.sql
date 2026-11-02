-- =====================================================================
-- Lyra Comenzi — schema bazei de date (Supabase / Postgres)
-- Rulare: Supabase → SQL Editor → lipiți tot fișierul setup.sql → Run.
-- Se poate rula de mai multe ori: nu șterge comenzi sau clienți.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Meniu ----------
create table if not exists public.categories (
  id        text primary key,
  name_ro   text not null,
  name_hu   text,
  note_ro   text,
  note_hu   text,
  sort      int  not null default 0,
  active    boolean not null default true
);

create table if not exists public.items (
  id          text primary key,
  category_id text not null references public.categories(id) on update cascade,
  num         int,
  name_ro     text not null,
  name_hu     text,
  desc_ro     text,
  desc_hu     text,
  price       numeric(10,2) not null check (price >= 0),
  grams       text,
  allergens   text[] not null default '{}',
  meat        text,
  hot         boolean not null default false,
  tags        text[] not null default '{}',
  wine        text,
  image       text,
  variants    jsonb,                       -- [{ "l": "Porție medie", "lh": "...", "p": 22, "g": "200 gr" }]
  available   boolean not null default true, -- false = „Epuizat azi”
  active      boolean not null default true, -- false = ascuns din meniu
  sort        int not null default 0,
  updated_at  timestamptz not null default now()
);
create index if not exists items_category_idx on public.items(category_id, sort);
-- ambalaj pentru livrare, lei pe bucată (adăugat la fiecare porție comandată)
alter table public.items add column if not exists packaging numeric(6,2) not null default 2 check (packaging >= 0);

-- ---------- Setări restaurant (un singur rând) ----------
create table if not exists public.settings (
  id                  int primary key default 1 check (id = 1),
  accepting_orders    boolean not null default true,
  delivery_fee        numeric(10,2) not null default 10,
  free_delivery_over  numeric(10,2) not null default 100,
  min_order           numeric(10,2) not null default 0,
  points_per_leu      numeric not null default 1,
  stars_for_gift      int not null default 6,
  gift_item_id        text default 'papanas'
);
insert into public.settings(id) values (1) on conflict do nothing;
alter table public.settings add column if not exists site_url text not null default 'https://lyrasdelivery.ro';
-- domeniul propriu: linkurile din emailuri duc pe lyrasdelivery.ro
update public.settings set site_url = 'https://lyrasdelivery.ro' where site_url like '%lyrago.netlify.app%';
alter table public.settings add column if not exists email_from text not null default 'Lyra''s Delivery <onboarding@resend.dev>';
update public.settings set email_from = 'Lyra''s Delivery <onboarding@resend.dev>' where email_from = 'Lyra <onboarding@resend.dev>';
-- răspunsurile clienților la emailurile automate ajung aici
alter table public.settings add column if not exists email_reply_to text default 'comenzi@lyrasdelivery.ro';
-- adresa restaurantului pe domeniul propriu: trimitere și răspunsuri
update public.settings set email_reply_to = 'comenzi@lyrasdelivery.ro' where email_reply_to is null or email_reply_to = 'restaurant_lyra@yahoo.com';
update public.settings set email_from = 'Lyra''s Delivery <comenzi@lyrasdelivery.ro>' where email_from like '%onboarding@resend.dev%';
alter table public.settings add column if not exists review_url text not null default 'https://g.page/r/Cb92kT0SuXLSEAE/review';

-- ---------- Promoții și coduri ----------
create table if not exists public.promos (
  id         uuid primary key default gen_random_uuid(),
  kicker     text,
  title      text not null,
  body       text,
  item_id    text references public.items(id) on delete set null,
  extras     text[] not null default '{}',
  price      numeric(10,2),
  code       text,
  image      text,
  active     boolean not null default true,
  popup      boolean not null default false,
  pushed_at  timestamptz,
  created_at timestamptz not null default now()
);

alter table public.promos add column if not exists starts_at timestamptz;
alter table public.promos add column if not exists ends_at timestamptz;

-- Bannere pe prima pagină (coperte mari)
create table if not exists public.banners (
  id          uuid primary key default gen_random_uuid(),
  chip        text,
  title       text,
  body        text,
  cta         text,
  image       text,
  category_id text references public.categories(id) on delete set null,
  active      boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.promo_codes (
  code        text primary key,
  percent     int not null check (percent between 1 and 100),
  category_id text references public.categories(id),
  label       text not null,
  active      boolean not null default true
);

-- ---------- Echipa (recepție / admin) ----------
create table if not exists public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name    text,
  role    text not null default 'reception' check (role in ('reception','admin'))
);

-- ---------- Clienți (Lyra Club) ----------
create table if not exists public.customers (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  name          text,
  phone         text,
  addresses     jsonb not null default '[]',
  allergies     text[] not null default '{}',
  points        int not null default 0 check (points >= 0),
  lifetime      int not null default 0,
  stars         int not null default 0,
  free_gift     boolean not null default false,
  orders_count  int not null default 0,
  spent         numeric(12,2) not null default 0,
  marketing_ok  boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Puncte strânse de clienți fără cont (după email); se mută în cont când își fac cont
create table if not exists public.pending_points (
  email      text primary key,
  points     int not null default 0,
  lifetime   int not null default 0,
  orders     int not null default 0,
  spent      numeric(12,2) not null default 0,
  stars      int not null default 0,
  free_gift  boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------- Comenzi ----------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  number         bigint generated always as identity (start with 1001) unique,
  token          uuid not null default gen_random_uuid() unique, -- link de urmărire pentru client
  customer_id    uuid references public.customers(id) on delete set null,
  name           text not null,
  phone          text not null,
  email          text,
  address        text,
  mode           text not null check (mode in ('livrare','ridicare')),
  payment        text not null check (payment in ('card','cash','online')),
  note           text,
  items          jsonb not null,             -- copie a liniilor cu prețurile din momentul comenzii
  allergies      text[] not null default '{}',
  subtotal       numeric(10,2) not null,
  discount       numeric(10,2) not null default 0,
  discount_label text,
  points_used    int not null default 0,
  points_value   numeric(10,2) not null default 0,
  delivery_fee   numeric(10,2) not null default 0,
  total          numeric(10,2) not null,
  points_earned  int not null default 0,
  source         text,                        -- fb, qr, google...
  status         text not null default 'new' check (status in ('new','prep','road','done','rejected')),
  reject_reason  text,
  eta_min        int,
  created_at     timestamptz not null default now(),
  accepted_at    timestamptz,
  road_at        timestamptz,
  done_at        timestamptz,
  rating         int check (rating between 1 and 5),
  credited       boolean not null default false
);
alter table public.orders add column if not exists packaging numeric(10,2) not null default 0;
create index if not exists orders_status_idx on public.orders(status, created_at desc);
create index if not exists orders_customer_idx on public.orders(customer_id, created_at desc);

create table if not exists public.order_messages (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists order_messages_order_idx on public.order_messages(order_id, created_at);

-- =====================================================================
-- Funcții
-- =====================================================================

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

create or replace function public.tier_mult(p_lifetime int) returns numeric
language sql immutable as $$
  select case when p_lifetime >= 1500 then 1.10 when p_lifetime >= 500 then 1.05 else 1.00 end;
$$;

-- Clientul se creează automat la prima logare (email).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.customers(id, email, last_activity_at) values (new.id, new.email, now()) on conflict (id) do nothing;
  -- Lyra Rewards: preia punctele și progresul strânse fără cont (după email)
  perform public.rewards_attach_guest(new.id, new.email);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Plasare comandă. Prețurile se calculează AICI, din meniu, nu se acceptă de la browser.
-- p: { name, phone, email, address, mode, payment, note, code, source,
--      redeem_points (Lyra Rewards; use_points=true înseamnă „maximul permis”), voucher_id, voucher_item,
--      items: [ { id, qty, vi, extras: [id], note } ] }
create or replace function public.place_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s        public.settings;
  cust     public.customers;
  line     jsonb;
  it       public.items;
  ex       public.items;
  ex_id    text;
  qty      int;
  vi       int;
  unit     numeric;
  vlabel   text;
  grams    text;
  lines    jsonb := '[]';
  ex_arr   jsonb;
  sub      numeric := 0;
  disc     numeric := 0;
  disc_lbl text;
  pc       public.promo_codes;
  fee      numeric := 0;
  pts_val  numeric := 0;
  total    numeric;
  earn     int;
  v_mode   text := coalesce(p->>'mode','livrare');
  o        public.orders;
  allg     text[] := '{}';
  pr       public.promos;
  is_promo boolean;
  pack     numeric := 0;  -- ambalaj, nu intră la reduceri
  lpack    numeric;
  cfg      record;          -- rewards_settings (tabelul e creat în 03_rewards.sql)
  want     int;
  pts_used int := 0;
  alloc    jsonb := '[]';
  plan     record;
  vo_id    uuid;
  vo_ok    boolean;
  vitem    public.items;
  rbase    numeric;
  rtier    smallint := 1;
  a        jsonb;
  zn       record;          -- delivery_zones (04_delivery_zones.sql)
  v_lat    numeric := nullif(p->>'lat','')::numeric;
  v_lng    numeric := nullif(p->>'lng','')::numeric;
  has_zones boolean;
  zone_nm  text;
begin
  select * into s from public.settings where id = 1;
  select * into cfg from public.rewards_settings where id = 1;
  if not s.accepting_orders then raise exception 'Restaurantul nu preia comenzi acum.' using errcode = 'P0001'; end if;
  if coalesce(trim(p->>'name'),'') = '' or coalesce(trim(p->>'phone'),'') = '' then
    raise exception 'Completează numele și telefonul.' using errcode = 'P0001'; end if;
  if v_mode = 'livrare' and coalesce(trim(p->>'address'),'') = '' then
    raise exception 'Completează adresa de livrare.' using errcode = 'P0001'; end if;
  if jsonb_array_length(coalesce(p->'items','[]')) = 0 then
    raise exception 'Coșul e gol.' using errcode = 'P0001'; end if;

  if auth.uid() is not null then
    select * into cust from public.customers where id = auth.uid() for update;
    if found then allg := cust.allergies; end if;
  end if;

  for line in select * from jsonb_array_elements(p->'items') loop
    select * into it from public.items where id = line->>'id' and active;
    if not found then raise exception 'Produsul % nu mai există în meniu.', line->>'id' using errcode = 'P0001'; end if;
    if not it.available then raise exception '% este epuizat azi.', it.name_ro using errcode = 'P0001'; end if;
    qty := least(greatest(coalesce((line->>'qty')::int, 1), 1), 50);
    vi := null; vlabel := null; grams := it.grams; unit := it.price; lpack := it.packaging;
    if it.variants is not null and jsonb_array_length(it.variants) > 0 then
      vi := least(greatest(coalesce((line->>'vi')::int, 0), 0), jsonb_array_length(it.variants) - 1);
      unit   := (it.variants->vi->>'p')::numeric;
      vlabel := it.variants->vi->>'l';
      grams  := it.variants->vi->>'g';
    end if;
    ex_arr := '[]';
    is_promo := false;
    if coalesce(line->>'promo','') <> '' then
      select * into pr from public.promos
        where id::text = line->>'promo' and active and item_id = it.id and price is not null
          and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now());
      is_promo := found;
    end if;
    if is_promo then
      unit := pr.price;
      for ex_id in select unnest(pr.extras) loop
        select * into ex from public.items where id = ex_id;
        if found then ex_arr := ex_arr || jsonb_build_object('id', ex.id, 'name', ex.name_ro, 'price', 0); lpack := lpack + ex.packaging; end if;
      end loop;
    else
      for ex_id in select jsonb_array_elements_text(coalesce(line->'extras','[]')) loop
        select * into ex from public.items where id = ex_id and active and available;
        if found then
          unit := unit + ex.price; lpack := lpack + ex.packaging;
          ex_arr := ex_arr || jsonb_build_object('id', ex.id, 'name', ex.name_ro, 'price', ex.price);
        end if;
      end loop;
    end if;
    sub := sub + unit * qty;
    pack := pack + lpack * qty;
    lines := lines || jsonb_build_object(
      'id', it.id, 'name', it.name_ro, 'qty', qty, 'unit', unit, 'variant', vlabel, 'vi', vi,
      'grams', grams, 'hot', it.hot, 'allergens', to_jsonb(it.allergens), 'category', it.category_id,
      'extras', ex_arr, 'note', left(coalesce(line->>'note',''), 200), 'pack', lpack,
      'promo', case when is_promo then pr.title end);
  end loop;

  if sub < s.min_order then raise exception 'Comanda minimă este % lei.', s.min_order using errcode = 'P0001'; end if;

  -- cod promoțional
  if coalesce(p->>'code','') <> '' then
    select * into pc from public.promo_codes where code = upper(p->>'code') and active;
    if found then
      if pc.category_id is null then disc := round(sub * pc.percent / 100.0, 2);
      else
        select round(coalesce(sum((l->>'unit')::numeric * (l->>'qty')::int), 0) * pc.percent / 100.0, 2) into disc
          from jsonb_array_elements(lines) l where l->>'category' = pc.category_id and l->>'promo' is null;
      end if;
      disc_lbl := pc.label;
    end if;
  end if;

  -- Lyra Rewards: desert cadou din voucher (nu se plătește, nu are ambalaj)
  if coalesce(p->>'voucher_id','') <> '' then
    if cust.id is null then raise exception 'Intră în cont ca să folosești voucherul.' using errcode = 'P0001'; end if;
    select id, status = 'active' and expires_at > now() into vo_id, vo_ok
      from public.vouchers where id = (p->>'voucher_id')::uuid and customer_id = cust.id for update;
    if vo_id is null or not vo_ok then
      raise exception 'Voucherul nu mai este valabil.' using errcode = 'P0001'; end if;
    select * into vitem from public.items where id = p->>'voucher_item' and active and available and id = any(cfg.dessert_ids);
    if not found then raise exception 'Alege un desert din lista voucherului.' using errcode = 'P0001'; end if;
    lines := lines || jsonb_build_object('id', vitem.id, 'name', vitem.name_ro, 'qty', 1, 'unit', 0, 'gift', true, 'voucher', vo_id,
      'grams', vitem.grams, 'allergens', to_jsonb(vitem.allergens), 'category', vitem.category_id, 'extras', '[]'::jsonb, 'note', '', 'pack', 0);
  end if;

  -- livrare: zona de pe hartă (dacă există zone desenate), altfel taxa generală din setări
  if v_mode = 'livrare' then
    select exists (select 1 from public.delivery_zones where active) into has_zones;
    if has_zones then
      if v_lat is null or v_lng is null then
        raise exception 'Alege adresa pe hartă ca să știm unde livrăm.' using errcode = 'P0001'; end if;
      select * into zn from public.zone_for(v_lat, v_lng);
      if zn.id is null then
        raise exception 'Din păcate nu livrăm încă la această adresă. Poți alege ridicarea din restaurant.' using errcode = 'P0001'; end if;
      if sub < zn.min_order then
        raise exception 'Comanda minimă pentru zona % este % lei.', zn.name, zn.min_order using errcode = 'P0001'; end if;
      if zn.free_over is null or sub < zn.free_over then fee := zn.fee; end if;
      zone_nm := zn.name;
    elsif sub < s.free_delivery_over then
      fee := s.delivery_fee;
    end if;
  end if;

  -- Lyra Rewards: puncte folosite, cel mult max_redeem_pct% din produse (după codul de reducere), FIFO pe loturi
  if cust.id is not null and coalesce(cfg.enabled, false) then
    rtier := cust.tier;
    want := coalesce((p->>'redeem_points')::int, case when coalesce((p->>'use_points')::boolean, false) then 2147483647 else 0 end);
    if want > 0 then
      select * into plan from public.rewards_plan(cust.id, want, floor((sub - disc) * cfg.max_redeem_pct) / 100);
      pts_used := plan.points; pts_val := plan.value; alloc := plan.alloc;
    end if;
  end if;
  rbase := greatest(sub - disc - pts_val, 0);   -- doar produsele plătite cu bani aduc puncte
  earn  := case when coalesce(cfg.enabled, false) then floor(rbase)::int else 0 end;

  total := greatest(sub - disc - pts_val + fee, 0) + pack;

  insert into public.orders(customer_id, name, phone, email, address, mode, payment, note, items, allergies,
    subtotal, discount, discount_label, points_used, points_value, delivery_fee, packaging, total, points_earned, source,
    reward_tier, reward_base, voucher_id, lat, lng, zone_name)
  values (cust.id, left(trim(p->>'name'),80), left(trim(p->>'phone'),30), coalesce(nullif(trim(p->>'email'),''), cust.email),
    case when v_mode = 'livrare' then left(trim(p->>'address'),200) else 'Ridicare din restaurant' end,
    v_mode, coalesce(p->>'payment','card'), left(p->>'note',300), lines, allg,
    sub, disc, disc_lbl, pts_used, pts_val, fee, pack, total, earn, left(p->>'source',30),
    rtier, rbase, vo_id, case when v_mode = 'livrare' then v_lat end, case when v_mode = 'livrare' then v_lng end, zone_nm)
  returning * into o;

  -- consumă loturile planificate (rândul clientului e blocat, deci nu se pot folosi de două ori)
  for a in select * from jsonb_array_elements(alloc) loop
    update public.point_lots set remaining = remaining - (a->>'points')::int
      where id = (a->>'lot')::uuid and remaining >= (a->>'points')::int and expired_at is null;
    if not found then raise exception 'Punctele s-au schimbat între timp. Reîncearcă.' using errcode = 'P0001'; end if;
    insert into public.order_redemptions(order_id, lot_id, points, value) values (o.id, (a->>'lot')::uuid, (a->>'points')::int, (a->>'value')::numeric);
  end loop;
  if pts_used > 0 then
    insert into public.point_ledger(customer_id, order_id, order_no, kind, points, value, tier, note)
      values (cust.id, o.id, o.number, 'redeem', -pts_used, -pts_val, cust.tier, 'Folosite la comanda #' || o.number);
    update public.customers set last_activity_at = now() where id = cust.id;
    perform public.rewards_sync(cust.id);
  end if;
  if vo_id is not null then
    update public.vouchers set status = 'used', used_order_id = o.id, used_at = now(), item_id = vitem.id, value = vitem.price where id = vo_id;
  end if;

  return jsonb_build_object('id', o.id, 'number', o.number, 'token', o.token, 'total', o.total);
end $$;

-- Verificare cod promoțional înainte de trimitere (nu expune lista de coduri).
create or replace function public.check_code(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', code, 'percent', percent, 'category_id', category_id, 'label', label)
  from public.promo_codes where code = upper(trim(p_code)) and active;
$$;

-- Urmărirea comenzii de către client, pe baza linkului secret.
create or replace function public.get_order(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(x) from (
    select o.number, o.status, o.mode, o.address, o.items, o.subtotal, o.discount, o.discount_label,
           o.points_value, o.delivery_fee, o.packaging, o.total, o.points_earned, o.eta_min, o.created_at,
           o.accepted_at, o.road_at, o.done_at, o.reject_reason, o.rating,
           coalesce((select jsonb_agg(jsonb_build_object('body', m.body, 'at', m.created_at) order by m.created_at)
                     from public.order_messages m where m.order_id = o.id), '[]') as messages
    from public.orders o where o.token = p_token
  ) x;
$$;

create or replace function public.rate_order(p_token uuid, p_rating int) returns void
language sql security definer set search_path = public as $$
  update public.orders set rating = least(greatest(p_rating,1),5) where token = p_token and status = 'done';
$$;

-- Lyra Rewards: punctele se acordă o singură dată, când comanda devine „livrată” (finalizată și achitată).
-- Refuz/anulare: se returnează punctele și voucherul folosite. Rambursare după livrare: se retrag punctele câștigate.
create or replace function public.on_order_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'prep' and old.status = 'new' and new.accepted_at is null then new.accepted_at := now(); end if;
  if new.status = 'road' and new.road_at is null then new.road_at := now(); end if;
  if new.status = 'done' and new.done_at is null then new.done_at := now(); end if;
  if new.status = old.status then return new; end if;
  if old.status in ('rejected','refunded') then
    raise exception 'Comanda #% este închisă (%).', old.number, old.status using errcode = 'P0001';
  end if;
  if new.status = 'rejected' or (new.status = 'refunded' and old.status <> 'done') then
    perform public.rewards_release(old);
  elsif new.status = 'refunded' and old.status = 'done' then
    new.refunded_at := now();
    if old.credited then perform public.rewards_reverse(old); else perform public.rewards_release(old); end if;
  elsif new.status = 'done' and not old.credited then
    new.points_earned := public.rewards_credit(new);
    new.credited := true;
  end if;
  return new;
end $$;
drop trigger if exists orders_status on public.orders;
create trigger orders_status before update of status on public.orders
  for each row execute function public.on_order_status();

-- =====================================================================
-- Securitate (Row Level Security)
-- =====================================================================
alter table public.categories     enable row level security;
alter table public.items          enable row level security;
alter table public.settings       enable row level security;
alter table public.promos         enable row level security;
alter table public.promo_codes    enable row level security;
alter table public.banners        enable row level security;
alter table public.staff          enable row level security;
alter table public.customers      enable row level security;
alter table public.orders         enable row level security;
alter table public.order_messages enable row level security;
alter table public.pending_points enable row level security;

do $$ begin
  -- curățăm politicile vechi, ca fișierul să poată fi rulat din nou
  perform 1;
  execute (select coalesce(string_agg(format('drop policy if exists %I on %I.%I;', policyname, schemaname, tablename), ' '), '')
           from pg_policies where schemaname = 'public');
end $$;

-- meniul, setările și promoțiile active sunt publice; doar echipa le modifică
create policy "menu public read"  on public.categories for select using (true);
create policy "menu staff write"  on public.categories for all using (public.is_staff()) with check (public.is_staff());
create policy "items public read" on public.items for select using (true);
create policy "items staff write" on public.items for all using (public.is_staff()) with check (public.is_staff());
create policy "settings read"     on public.settings for select using (true);
create policy "settings write"    on public.settings for update using (public.is_staff()) with check (public.is_staff());
create policy "promos read"       on public.promos for select using (active or public.is_staff());
create policy "promos write"      on public.promos for all using (public.is_staff()) with check (public.is_staff());
create policy "codes staff"       on public.promo_codes for all using (public.is_staff()) with check (public.is_staff());
create policy "banners read"      on public.banners for select using (active or public.is_staff());
create policy "banners write"     on public.banners for all using (public.is_staff()) with check (public.is_staff());

-- echipa își vede propriul rând (ca aplicația să știe că e recepție)
create policy "staff self"        on public.staff for select using (user_id = auth.uid());

-- clientul își vede și își editează doar contul lui; echipa vede toți clienții
create policy "customer self read"   on public.customers for select using (id = auth.uid() or public.is_staff());
create policy "customer self update" on public.customers for update using (id = auth.uid()) with check (id = auth.uid());
create policy "customer staff update" on public.customers for update using (public.is_staff()) with check (public.is_staff());

-- comenzi: clientul își vede comenzile; echipa le vede și le actualizează. Inserarea doar prin place_order().
create policy "orders own read"    on public.orders for select using (customer_id = auth.uid() or public.is_staff());
create policy "orders staff update" on public.orders for update using (public.is_staff()) with check (public.is_staff());
create policy "messages read"      on public.order_messages for select using (
  public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy "messages staff add" on public.order_messages for insert with check (public.is_staff());

-- drepturi pe coloane: clientul NU își poate modifica punctele, stelele sau cadoul
revoke update on public.customers from anon, authenticated;
grant  update (name, phone, addresses, allergies, marketing_ok) on public.customers to authenticated;
grant  select on public.categories, public.items, public.settings, public.promos, public.banners to anon, authenticated;
grant  select, insert, update, delete on public.categories, public.items, public.promos, public.promo_codes, public.banners to authenticated;
grant  update on public.settings, public.orders to authenticated;
grant  select on public.staff, public.customers, public.orders, public.order_messages to authenticated;
grant  insert on public.order_messages to authenticated;
grant  execute on function public.place_order(jsonb), public.get_order(uuid), public.rate_order(uuid,int), public.check_code(text) to anon, authenticated;

-- actualizări în timp real pentru recepție
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.orders; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.order_messages; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.items; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.promos; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.banners; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.settings; exception when duplicate_object then null; end;
  end if;
end $$;

-- =====================================================================
-- Poze meniu (Supabase Storage): oricine le vede, doar echipa le încarcă
-- =====================================================================
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('menu', 'menu', true)
      on conflict (id) do update set public = true;
    drop policy if exists "menu images public read" on storage.objects;
    drop policy if exists "menu images staff insert" on storage.objects;
    drop policy if exists "menu images staff update" on storage.objects;
    drop policy if exists "menu images staff delete" on storage.objects;
    create policy "menu images public read"  on storage.objects for select using (bucket_id = 'menu');
    create policy "menu images staff insert" on storage.objects for insert to authenticated with check (bucket_id = 'menu' and public.is_staff());
    create policy "menu images staff update" on storage.objects for update to authenticated using (bucket_id = 'menu' and public.is_staff());
    create policy "menu images staff delete" on storage.objects for delete to authenticated using (bucket_id = 'menu' and public.is_staff());
  end if;
end $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to authenticated;

-- =====================================================================
-- Curieri: rol nou în echipă + cine a preluat livrarea
-- =====================================================================
alter table public.staff drop constraint if exists staff_role_check;
alter table public.staff add constraint staff_role_check check (role in ('reception','admin','courier'));
alter table public.orders add column if not exists courier_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists courier_name text;

-- Admin: lista echipei și adăugarea unui cont existent (după email) cu un rol
create or replace function public.list_staff() returns table(user_id uuid, email text, name text, role text)
language sql stable security definer set search_path = public as $$
  select s.user_id, u.email::text, s.name, s.role from public.staff s join auth.users u on u.id = s.user_id
  where public.is_admin() order by s.role, u.email;
$$;

create or replace function public.admin_set_staff(p_email text, p_role text, p_name text default null) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'Doar administratorul poate modifica echipa.' using errcode = 'P0001'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'Nu există cont cu emailul %. Creează-l întâi în Supabase → Authentication → Add user.', p_email using errcode = 'P0001'; end if;
  if p_role = 'none' then
    if uid = auth.uid() then raise exception 'Nu îți poți scoate propriul acces.' using errcode = 'P0001'; end if;
    delete from public.staff where user_id = uid; return 'removed';
  end if;
  if p_role not in ('reception','admin','courier') then raise exception 'Rol necunoscut.' using errcode = 'P0001'; end if;
  insert into public.staff(user_id, name, role) values (uid, nullif(trim(p_name),''), p_role)
    on conflict (user_id) do update set role = excluded.role, name = coalesce(excluded.name, public.staff.name);
  return 'ok';
end $$;
grant execute on function public.list_staff(), public.admin_set_staff(text,text,text) to authenticated;


-- =====================================================================
-- Email de mulțumire după livrare (Resend). Cheia stă în Supabase Vault:
--   select vault.create_secret('re_...cheia ta...', 'resend_api_key');
-- Fără cheie, nu se trimite nimic și comenzile merg normal.
-- =====================================================================
do $$ begin
  begin create extension if not exists pg_net; exception when others then null; end;
end $$;

create or replace function public.send_thanks_email(o public.orders) returns void
language plpgsql security definer set search_path = public as $$
declare
  s public.settings; cfg record; key text; pts int; vpp numeric; has_acc boolean := false;
  bal_pts int := 0; bal_val numeric := 0; tier int := 1; spent numeric := 0; nxt text := '';
  first text; html text; lines text := ''; l jsonb;
begin
  if coalesce(o.email,'') = '' then return; end if;
  select * into s from public.settings where id = 1;
  select * into cfg from public.rewards_settings where id = 1;
  begin
    select decrypted_secret into key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  exception when others then key := null; end;
  if key is null then return; end if;

  pts := coalesce(o.points_earned, 0);
  select pl.vpp into vpp from public.point_lots pl where pl.order_id = o.id and pl.source = 'order';
  select c.tier, c.reward_spent, c.points,
         (select coalesce(floor(sum(remaining * l2.vpp) * 100) / 100, 0) from public.point_lots l2 where l2.customer_id = c.id and l2.remaining > 0 and l2.expired_at is null)
    into tier, spent, bal_pts, bal_val
    from public.customers c where c.id = o.customer_id or lower(c.email) = lower(o.email) limit 1;
  if found then has_acc := true;
  else
    select coalesce(sum(remaining), 0), coalesce(floor(sum(remaining * l3.vpp) * 100) / 100, 0) into bal_pts, bal_val
      from public.point_lots l3 where l3.customer_id is null and lower(l3.email) = lower(o.email) and l3.remaining > 0 and l3.expired_at is null;
  end if;
  if has_acc and tier < 3 and cfg.thresholds[tier + 1] > spent then
    nxt := format('Mai ai %s lei până la Lyra %s (%s%% cashback + desert cadou).',
      to_char(ceil(cfg.thresholds[tier + 1] - spent), 'FM999990'), cfg.tier_names[tier + 1], to_char(cfg.rates[tier + 1], 'FM990.##'));
  end if;
  first := split_part(trim(o.name), ' ', 1);
  for l in select * from jsonb_array_elements(o.items) loop
    lines := lines || format('<tr><td style="padding:4px 0;color:#fbf3ea">%s× %s</td><td align="right" style="padding:4px 0;color:#bba897">%s</td></tr>',
      l->>'qty', l->>'name', case when (l->>'unit')::numeric = 0 then 'cadou' else to_char((l->>'unit')::numeric * (l->>'qty')::int, 'FM999990.00') || ' lei' end);
  end loop;

  html := format($h$<!doctype html><html><body style="margin:0;background:#0b0806;font-family:Arial,Helvetica,sans-serif">
<table width="100%%" cellpadding="0" cellspacing="0" style="background:#0b0806;padding:24px 12px"><tr><td align="center">
<table width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#16110d;border-radius:24px;overflow:hidden;color:#fbf3ea">
<tr><td align="center" style="padding:28px 24px 4px"><div style="font-size:28px;font-weight:800;letter-spacing:2px">LYRA’S</div>
<div style="font-size:11px;font-weight:700;letter-spacing:6px;color:#ff7a1a">DELIVERY</div></td></tr>
<tr><td style="padding:14px 28px 0;text-align:center">
  <h1 style="margin:0;font-size:28px;line-height:1.1">Mulțumim, %2$s!</h1>
  <p style="margin:10px 0 0;color:#bba897;font-size:15px">Comanda ta #%3$s a ajuns. Poftă bună de la toată echipa Lyra's Delivery!</p>
</td></tr>
<tr><td style="padding:22px 28px 0">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#ff9a3c,#ff7a1a);background-color:#ff7a1a;border-radius:20px">
  <tr><td style="padding:22px 24px;color:#ffffff">
    <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;opacity:.9">Lyra Rewards · Lyra %4$s</div>
    <div style="font-size:40px;font-weight:bold;line-height:1.1;margin-top:6px">+%5$s puncte</div>
    <div style="font-size:15px;margin-top:6px">valorează %6$s lei la comenzile următoare</div>
    <div style="font-size:14px;margin-top:10px">Sold: <b>%7$s puncte = %8$s lei</b></div>
    <div style="font-size:13px;margin-top:8px;opacity:.95">%9$s</div>
  </td></tr></table>
</td></tr>
<tr><td style="padding:20px 28px 0"><table width="100%%" style="font-size:14px">%10$s
  <tr><td style="padding-top:8px;border-top:1px dashed #3a2d24;font-weight:bold">Total</td><td align="right" style="padding-top:8px;border-top:1px dashed #3a2d24;font-weight:bold">%11$s lei</td></tr></table></td></tr>
<tr><td align="center" style="padding:24px 28px 8px">
  <a href="%1$s/cont" style="display:inline-block;background:#ff7a1a;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px">%12$s</a>
</td></tr>
<tr><td align="center" style="padding:6px 28px 28px">
  <a href="%13$s" style="color:#ffb24a;font-size:14px">Ți-a plăcut? Lasă-ne o recenzie pe Google ★★★★★</a>
</td></tr>
</table>
<p style="color:#86756a;font-size:12px;margin:16px 0 0">Lyra's Delivery · lyrasdelivery.ro</p>
</td></tr></table></body></html>$h$,
    s.site_url, coalesce(nullif(first,''),'dragă client'), o.number,
    cfg.tier_names[greatest(1, least(3, coalesce(o.reward_tier, tier)))], pts,
    replace(to_char(round(pts * coalesce(vpp, 0.01), 2), 'FM999990.00'), '.', ','), bal_pts, replace(to_char(bal_val, 'FM999990.00'), '.', ','),
    case when has_acc then nxt else 'Fă-ți cont cu acest email și păstrezi punctele, urci de nivel și primești deserturi cadou.' end,
    lines, to_char(o.total,'FM999990.00'),
    case when has_acc then 'Vezi Lyra Rewards' else 'Fă-ți cont și păstrează punctele' end, s.review_url);

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    body := jsonb_build_object('from', s.email_from, 'to', jsonb_build_array(o.email), 'reply_to', coalesce(s.email_reply_to, 'comenzi@lyrasdelivery.ro'),
      'subject', case when pts > 0 then format('Mulțumim! Ai primit %s puncte Lyra Rewards', pts) else 'Mulțumim pentru comandă!' end, 'html', html),
    headers := jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'));
exception when others then
  raise warning 'Emailul de mulțumire nu a putut fi trimis: %', sqlerrm;
end $$;

create or replace function public.on_order_done_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and old.status <> 'done' then perform public.send_thanks_email(new); end if;
  return new;
end $$;
drop trigger if exists orders_done_email on public.orders;
create trigger orders_done_email after update of status on public.orders
  for each row execute function public.on_order_done_email();
revoke execute on function public.send_thanks_email(public.orders) from public, anon, authenticated;
