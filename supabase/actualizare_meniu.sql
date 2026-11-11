-- Lyra: schema + actualizarea meniului. Supabase → SQL Editor → New query → lipiți tot → Run.

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
-- garanția SGR (sticle, doze, PET): se adaugă la total, nu intră la reduceri
alter table public.items add column if not exists sgr numeric(6,2) not null default 0 check (sgr >= 0);

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

-- program de lucru și precomenzi (ora României): comenzi „cât mai curând” doar în program,
-- precomenzi oricând, pentru o oră aleasă între preorder_from și închidere, în următoarele preorder_days zile
alter table public.settings add column if not exists open_time time not null default '11:00';
alter table public.settings add column if not exists close_time time not null default '22:00';
alter table public.settings add column if not exists open_days int[] not null default '{1,2,3,4,5,6,7}';   -- 1 = luni … 7 = duminică
alter table public.settings add column if not exists preorder_on boolean not null default true;
alter table public.settings add column if not exists preorder_from time not null default '12:00';
alter table public.settings add column if not exists preorder_days int not null default 2;
alter table public.settings add column if not exists preorder_lead_min int not null default 45;
alter table public.settings add column if not exists preorder_until time not null default '21:45';   -- ultima oră pentru precomenzi
alter table public.settings add column if not exists tz text not null default 'Europe/Bucharest';

create or replace function public.is_open_at(p_at timestamptz) returns boolean
language sql stable set search_path = public as $$
  select extract(isodow from (p_at at time zone s.tz))::int = any(s.open_days)
     and (p_at at time zone s.tz)::time >= s.open_time and (p_at at time zone s.tz)::time < s.close_time
  from public.settings s where s.id = 1;
$$;
-- null = ora aleasă e bună; altfel motivul, pe înțelesul clientului
create or replace function public.preorder_error(p_at timestamptz) returns text
language plpgsql stable set search_path = public as $$
declare s public.settings; l timestamp; t0 time;
begin
  select * into s from public.settings where id = 1;
  if not s.preorder_on then return 'Precomenzile nu sunt disponibile acum.'; end if;
  l := p_at at time zone s.tz; t0 := greatest(s.preorder_from, s.open_time);
  if p_at < now() + make_interval(mins => s.preorder_lead_min) then
    return format('Alege o oră la cel puțin %s de minute de acum.', s.preorder_lead_min); end if;
  if l::date > (now() at time zone s.tz)::date + s.preorder_days then
    return format('Poți programa cel mult cu %s zile înainte.', s.preorder_days); end if;
  if not (extract(isodow from l)::int = any(s.open_days)) then return 'În ziua aleasă restaurantul este închis.'; end if;
  if l::time < t0 or l::time > least(s.close_time, s.preorder_until) then
    return format('Poți programa între %s și %s.', to_char(t0, 'HH24:MI'), to_char(least(s.close_time, s.preorder_until), 'HH24:MI')); end if;
  return null;
end $$;
grant execute on function public.is_open_at(timestamptz), public.preorder_error(timestamptz) to anon, authenticated;

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
alter table public.orders add column if not exists sgr numeric(10,2) not null default 0;
create index if not exists orders_status_idx on public.orders(status, created_at desc);
-- precomandă: ora la care clientul vrea comanda (null = cât mai curând)
alter table public.orders add column if not exists scheduled_for timestamptz;
-- bonusul de bun venit folosit la comandă (lei)
alter table public.orders add column if not exists welcome_value numeric(8,2) not null default 0;
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
-- Bonus de bun venit: la crearea contului clientul primește welcome_lei, folosiți dintr-o dată la prima comandă
-- cu produse de minim welcome_min lei. Nu sunt puncte Lyra Rewards: nu urcă nivelul și nu expiră odată cu punctele.
alter table public.settings add column if not exists welcome_on boolean not null default true;
alter table public.settings add column if not exists welcome_lei numeric(8,2) not null default 50 check (welcome_lei >= 0);
alter table public.settings add column if not exists welcome_min numeric(8,2) not null default 150 check (welcome_min >= 0);
alter table public.customers add column if not exists welcome_credit numeric(8,2) not null default 0;
alter table public.customers add column if not exists welcome_used_at timestamptz;
alter table public.customers add column if not exists welcome_order_id uuid;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- acordul pentru oferte bifat la înregistrare vine în metadatele contului
  insert into public.customers(id, email, last_activity_at, marketing_ok, marketing_source, welcome_credit)
  values (new.id, new.email, now(),
    coalesce((to_jsonb(new)->'raw_user_meta_data'->>'marketing_ok')::boolean, false),
    case when (to_jsonb(new)->'raw_user_meta_data'->>'marketing_ok')::boolean then 'inregistrare' end,
    coalesce((select welcome_lei from public.settings where id = 1 and welcome_on), 0))
  on conflict (id) do nothing;
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
  sgr      numeric := 0;  -- garanție SGR, nu intră la reduceri
  lsgr     numeric;
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
  v_sched  timestamptz := nullif(p->>'scheduled_for','')::timestamptz;
  v_err    text;
  dpct     numeric := 0;
  old_unit numeric;
  welc     numeric := 0;
begin
  select * into s from public.settings where id = 1;
  select * into cfg from public.rewards_settings where id = 1;
  if v_sched is null then
    if not public.is_open_at(now()) then
      raise exception 'Acum suntem închiși (program %–%). Poți programa comanda pentru mai târziu.',
        to_char(s.open_time, 'HH24:MI'), to_char(s.close_time, 'HH24:MI') using errcode = 'P0001'; end if;
    if not s.accepting_orders then
      raise exception 'Restaurantul nu preia comenzi acum. Poți programa comanda pentru mai târziu.' using errcode = 'P0001'; end if;
  else
    v_err := public.preorder_error(v_sched);
    if v_err is not null then raise exception '%', v_err using errcode = 'P0001'; end if;
  end if;
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
    vi := null; vlabel := null; grams := it.grams; unit := it.price; lpack := it.packaging; lsgr := it.sgr;
    if it.variants is not null and jsonb_array_length(it.variants) > 0 then
      vi := least(greatest(coalesce((line->>'vi')::int, 0), 0), jsonb_array_length(it.variants) - 1);
      unit   := (it.variants->vi->>'p')::numeric;
      vlabel := it.variants->vi->>'l';
      grams  := it.variants->vi->>'g';
    end if;
    ex_arr := '[]';
    is_promo := false; dpct := 0; old_unit := null;
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
        if found then ex_arr := ex_arr || jsonb_build_object('id', ex.id, 'name', ex.name_ro, 'price', 0); lpack := lpack + ex.packaging; lsgr := lsgr + ex.sgr; end if;
      end loop;
    else
      -- reducere procentuală din admin (07_discounts.sql), după livrare / ridicare: doar pe prețul produsului, nu pe extra
      dpct := public.item_discount_pct(it.id, v_mode);
      if dpct > 0 then old_unit := unit; unit := round(unit * (100 - dpct) / 100.0, 2); end if;
      for ex_id in select jsonb_array_elements_text(coalesce(line->'extras','[]')) loop
        select * into ex from public.items where id = ex_id and active and available;
        if found then
          unit := unit + ex.price; lpack := lpack + ex.packaging; lsgr := lsgr + ex.sgr;
          ex_arr := ex_arr || jsonb_build_object('id', ex.id, 'name', ex.name_ro, 'price', ex.price);
        end if;
      end loop;
    end if;
    sub := sub + unit * qty;
    pack := pack + lpack * qty;
    sgr := sgr + lsgr * qty;
    lines := lines || jsonb_build_object(
      'id', it.id, 'name', it.name_ro, 'qty', qty, 'unit', unit, 'variant', vlabel, 'vi', vi,
      'grams', grams, 'hot', it.hot, 'allergens', to_jsonb(it.allergens), 'category', it.category_id,
      'extras', ex_arr, 'note', left(coalesce(line->>'note',''), 200), 'pack', lpack, 'sgr', lsgr,
      'promo', case when is_promo then pr.title end,
      'disc_pct', case when dpct > 0 then dpct end, 'old_unit', old_unit);
  end loop;

  if sub < s.min_order then raise exception 'Comanda minimă este % lei.', s.min_order using errcode = 'P0001'; end if;

  -- cod promoțional
  if coalesce(p->>'code','') <> '' then
    select * into pc from public.promo_codes where code = upper(p->>'code') and active;
    if found then
      -- codul nu se cumulează cu reducerile pe produse: se aplică doar produselor fără reducere
      if pc.category_id is null then
        select round(coalesce(sum((l->>'unit')::numeric * (l->>'qty')::int), 0) * pc.percent / 100.0, 2) into disc
          from jsonb_array_elements(lines) l where l->>'disc_pct' is null;
      else
        select round(coalesce(sum((l->>'unit')::numeric * (l->>'qty')::int), 0) * pc.percent / 100.0, 2) into disc
          from jsonb_array_elements(lines) l where l->>'category' = pc.category_id and l->>'promo' is null and l->>'disc_pct' is null;
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
  -- bonus de bun venit: tot odată, o singură dată, doar la produse de minim welcome_min lei, fără cod de reducere
  if coalesce((p->>'use_welcome')::boolean, false) then
    if cust.id is null then raise exception 'Intră în cont ca să folosești bonusul de bun venit.' using errcode = 'P0001'; end if;
    if coalesce(cust.welcome_credit, 0) <= 0 or cust.welcome_used_at is not null then
      raise exception 'Bonusul de bun venit a fost deja folosit.' using errcode = 'P0001'; end if;
    if disc > 0 then raise exception 'Bonusul de bun venit nu se cumulează cu un cod de reducere.' using errcode = 'P0001'; end if;
    if sub < s.welcome_min then
      raise exception 'Bonusul de % lei se folosește la o comandă de minim % lei (produse). Mai adaugă % lei.',
        trim(to_char(cust.welcome_credit, 'FM999990.00')), trim(to_char(s.welcome_min, 'FM999990.00')), trim(to_char(s.welcome_min - sub, 'FM999990.00')) using errcode = 'P0001'; end if;
    -- un bonus pe număr de telefon, ca să nu se ia de mai multe ori cu emailuri diferite
    if exists (select 1 from public.orders x where x.welcome_value > 0 and x.status not in ('rejected', 'refunded')
               and right(regexp_replace(x.phone, '\D', '', 'g'), 9) = right(regexp_replace(p->>'phone', '\D', '', 'g'), 9)) then
      raise exception 'Bonusul de bun venit a fost deja folosit pentru acest număr de telefon.' using errcode = 'P0001'; end if;
    welc := least(cust.welcome_credit, greatest(sub - disc - pts_val, 0));
  end if;
  rbase := greatest(sub - disc - pts_val - welc, 0);   -- doar produsele plătite cu bani aduc puncte (bonusul nu)
  earn  := case when coalesce(cfg.enabled, false) then floor(rbase)::int else 0 end;

  total := greatest(sub - disc - pts_val - welc + fee, 0) + pack + sgr;

  insert into public.orders(customer_id, name, phone, email, address, mode, payment, note, items, allergies,
    subtotal, discount, discount_label, points_used, points_value, delivery_fee, packaging, sgr, total, points_earned, source,
    reward_tier, reward_base, voucher_id, lat, lng, zone_name, scheduled_for, welcome_value)
  values (cust.id, left(trim(p->>'name'),80), left(trim(p->>'phone'),30), coalesce(nullif(trim(p->>'email'),''), cust.email),
    case when v_mode = 'livrare' then left(trim(p->>'address'),200) else 'Ridicare din restaurant' end,
    v_mode, coalesce(p->>'payment','card'), left(p->>'note',300), lines, allg,
    sub, disc, disc_lbl, pts_used, pts_val, fee, pack, sgr, total, earn, left(p->>'source',30),
    rtier, rbase, vo_id, case when v_mode = 'livrare' then v_lat end, case when v_mode = 'livrare' then v_lng end, zone_nm, v_sched, welc)
  returning * into o;
  if welc > 0 then
    update public.customers set welcome_used_at = now(), welcome_order_id = o.id where id = cust.id;
  end if;

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
           o.accepted_at, o.road_at, o.done_at, o.reject_reason, o.rating, o.scheduled_for, o.welcome_value,
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
  -- comanda anulată: bonusul de bun venit revine clientului
  if new.status in ('rejected', 'refunded') and coalesce(old.welcome_value, 0) > 0 then
    update public.customers set welcome_used_at = null, welcome_order_id = null where welcome_order_id = old.id;
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


-- =====================================================================
-- LYRA REWARDS — fidelizare pe 3 niveluri (Classic / Select / Signature)
--
-- Principii:
--  * 1 leu plătit pe produse = 1 punct. Punctul valorează rate%/100 lei, după nivelul
--    clientului la momentul comenzii (Classic 1%, Select 2%, Signature 4%).
--  * Fiecare comandă livrată creează un LOT de puncte cu valoarea în lei blocată
--    (point_lots.vpp). Promovarea nu crește retroactiv valoarea loturilor vechi.
--  * Folosirea punctelor consumă loturile în ordinea vechimii (FIFO); fiecare consum
--    e înregistrat în order_redemptions, ca să poată fi returnat exact la anulare.
--  * Toate mișcările sunt în point_ledger (jurnal de audit, inclusiv ajustările din admin).
--  * Protecție la dublare: orders.credited + index unic pe lotul comenzii;
--    vouchers unic pe (client, nivel) → promovarea și voucherul se dau o singură dată.
--  * Banii sunt numeric (fără float); valoarea folosită e rotunjită în jos la bani.
-- =====================================================================

-- ---------- setări (un singur rând, editabil din admin) ----------
create table if not exists public.rewards_settings (
  id               int primary key default 1 check (id = 1),
  enabled          boolean not null default true,
  program_name     text not null default 'Lyra Rewards',
  tier_names       text[] not null default '{Classic,Select,Signature}',
  thresholds       numeric(12,2)[] not null default '{0,500,1500}',   -- lei cheltuiți cumulat
  rates            numeric(5,2)[] not null default '{1,2,4}',         -- cashback % (1 punct = rate/100 lei)
  max_redeem_pct   numeric(5,2) not null default 20,                  -- % din valoarea produselor
  voucher_days     int not null default 30,
  expiry_months    int not null default 12,                           -- inactivitate
  expiry_warn_days int not null default 30,
  voucher_warn_days int not null default 5,
  near_tier_lei    numeric(10,2) not null default 150,               -- „mai ai X lei până la…”
  dessert_ids      text[] not null default '{papanas,lapte-pasare,cinnamon-rolls,panna-cotta,clatite,somloi}',
  migrated         boolean not null default false,
  updated_at       timestamptz not null default now()
);
insert into public.rewards_settings(id) values (1) on conflict do nothing;

-- ---------- coloane noi ----------
alter table public.customers add column if not exists tier smallint not null default 1;
alter table public.customers add column if not exists reward_spent numeric(12,2) not null default 0;  -- progres spre nivel
alter table public.customers add column if not exists last_activity_at timestamptz;
alter table public.customers add column if not exists expiry_warned_at timestamptz;
alter table public.customers add column if not exists near_notified_tier smallint not null default 1;

alter table public.orders add column if not exists reward_tier smallint;            -- nivelul la plasare
alter table public.orders add column if not exists reward_base numeric(10,2);      -- suma care aduce puncte
alter table public.orders add column if not exists voucher_id uuid;
alter table public.orders add column if not exists refunded_at timestamptz;
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('new','prep','road','done','rejected','refunded'));

-- ---------- loturi de puncte ----------
create table if not exists public.point_lots (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  email       text,                                   -- pentru clienții fără cont
  order_id    uuid references public.orders(id) on delete set null,
  source      text not null check (source in ('order','adjust','migration')),
  points      int not null check (points > 0),
  remaining   int not null check (remaining >= 0),
  vpp         numeric(8,4) not null check (vpp >= 0),  -- valoarea unui punct, în lei
  tier        smallint not null default 1,
  created_at  timestamptz not null default now(),
  expired_at  timestamptz,
  check (remaining <= points),
  check (customer_id is not null or email is not null)
);
alter table public.point_lots add column if not exists seq bigint generated always as identity;  -- ordinea FIFO
create unique index if not exists point_lots_order_uq on public.point_lots(order_id) where source = 'order';
create index if not exists point_lots_cust_idx on public.point_lots(customer_id, created_at) where remaining > 0;
create index if not exists point_lots_email_idx on public.point_lots(lower(email)) where customer_id is null;

create table if not exists public.point_ledger (
  id          bigint generated always as identity primary key,
  customer_id uuid references public.customers(id) on delete cascade,
  email       text,
  order_id    uuid references public.orders(id) on delete set null,
  order_no    bigint,
  kind        text not null check (kind in ('earn','redeem','redeem_return','reverse','expire','adjust','migration')),
  points      int not null,                 -- + intră, − ies
  value       numeric(10,2) not null,       -- echivalentul în lei (cu semn)
  tier        smallint,
  note        text,
  actor       text,                         -- cine a făcut ajustarea
  created_at  timestamptz not null default now()
);
create index if not exists point_ledger_cust_idx on public.point_ledger(customer_id, created_at desc);

create table if not exists public.order_redemptions (
  order_id  uuid not null references public.orders(id) on delete cascade,
  lot_id    uuid not null references public.point_lots(id) on delete cascade,
  points    int not null check (points > 0),
  value     numeric(10,4) not null,
  returned  boolean not null default false,
  primary key (order_id, lot_id)
);

create table if not exists public.vouchers (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  tier          smallint not null,                 -- nivelul la care a fost câștigat
  kind          text not null default 'dessert',
  status        text not null default 'active' check (status in ('active','used','expired','cancelled')),
  item_id       text,                              -- desertul ales la folosire
  value         numeric(10,2),                     -- prețul desertului (pentru costul programului)
  expires_at    timestamptz not null,
  used_order_id uuid references public.orders(id) on delete set null,
  used_at       timestamptz,
  warned_at     timestamptz,
  created_at    timestamptz not null default now(),
  unique (customer_id, tier, kind)
);

create table if not exists public.reward_notifications (
  id          bigint generated always as identity primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  kind        text not null,              -- earn, near, promotion, voucher, expiry, voucher_expiry, adjust
  title       text not null,
  body        text not null,
  data        jsonb not null default '{}',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists reward_notif_idx on public.reward_notifications(customer_id, created_at desc);

-- ---------- securitate ----------
alter table public.rewards_settings     enable row level security;
alter table public.point_lots           enable row level security;
alter table public.point_ledger         enable row level security;
alter table public.order_redemptions    enable row level security;
alter table public.vouchers             enable row level security;
alter table public.reward_notifications enable row level security;
do $$ begin
  drop policy if exists "rewards settings read" on public.rewards_settings;
  drop policy if exists "lots own"     on public.point_lots;
  drop policy if exists "ledger own"   on public.point_ledger;
  drop policy if exists "vouchers own" on public.vouchers;
  drop policy if exists "notif own"    on public.reward_notifications;
  drop policy if exists "redemptions staff" on public.order_redemptions;
end $$;
create policy "rewards settings read" on public.rewards_settings for select using (true);
create policy "lots own"     on public.point_lots for select using (customer_id = auth.uid() or public.is_staff());
create policy "ledger own"   on public.point_ledger for select using (customer_id = auth.uid() or public.is_staff());
create policy "vouchers own" on public.vouchers for select using (customer_id = auth.uid() or public.is_staff());
create policy "notif own"    on public.reward_notifications for select using (customer_id = auth.uid() or public.is_staff());
create policy "redemptions staff" on public.order_redemptions for select using (public.is_staff());
grant select on public.rewards_settings to anon, authenticated;
grant select on public.point_lots, public.point_ledger, public.vouchers, public.reward_notifications, public.order_redemptions to authenticated;
-- clienții nu își pot modifica singuri nivelul sau progresul
revoke update on public.customers from anon, authenticated;
grant  update (name, phone, addresses, allergies, marketing_ok) on public.customers to authenticated;

-- =====================================================================
-- Calcule
-- =====================================================================
create or replace function public.rewards_cfg() returns public.rewards_settings
language sql stable security definer set search_path = public as $$
  select * from public.rewards_settings where id = 1;
$$;

-- nivelul (1..3) pentru o sumă cheltuită cumulat
create or replace function public.rewards_tier_for(p_spent numeric) returns smallint
language sql stable security definer set search_path = public as $$
  select (case when p_spent >= c.thresholds[3] then 3 when p_spent >= c.thresholds[2] then 2 else 1 end)::smallint
  from public.rewards_settings c where c.id = 1;
$$;

-- valoarea unui punct (lei) pentru un nivel
create or replace function public.rewards_vpp(p_tier smallint) returns numeric
language sql stable security definer set search_path = public as $$
  select round(c.rates[greatest(1, least(3, p_tier))] / 100.0, 4) from public.rewards_settings c where c.id = 1;
$$;

-- reîmprospătează punctele disponibile (cache în customers.points)
create or replace function public.rewards_sync(p_cust uuid) returns void
language sql security definer set search_path = public as $$
  update public.customers c set points = coalesce((select sum(remaining) from public.point_lots l
    where l.customer_id = c.id and l.expired_at is null), 0) where c.id = p_cust;
$$;

-- Planul de folosire a punctelor: FIFO pe loturi, fără să depășească plafonul în lei.
-- Întoarce: points, value (rotunjit în jos la bani), alloc [{lot, points, value}]
create or replace function public.rewards_plan(p_cust uuid, p_want int, p_cap numeric,
  out points int, out value numeric, out alloc jsonb)
language plpgsql stable security definer set search_path = public as $$
declare l record; k int; acc numeric := 0;
begin
  points := 0; value := 0; alloc := '[]';
  if p_cust is null or coalesce(p_want, 0) <= 0 or coalesce(p_cap, 0) <= 0 then return; end if;
  for l in select id, remaining, vpp from public.point_lots
           where customer_id = p_cust and remaining > 0 and expired_at is null
           order by seq loop
    exit when points >= p_want;
    k := least(l.remaining, p_want - points);
    if l.vpp > 0 then k := least(k, floor((p_cap - acc) / l.vpp)::int); end if;
    exit when k <= 0;
    points := points + k; acc := acc + k * l.vpp;
    alloc := alloc || jsonb_build_object('lot', l.id, 'points', k, 'value', k * l.vpp);
  end loop;
  value := floor(acc * 100) / 100;
end $$;

-- Mesaj în aplicație (și opțional email)
create or replace function public.rewards_notify(p_cust uuid, p_kind text, p_title text, p_body text, p_data jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.reward_notifications(customer_id, kind, title, body, data) values (p_cust, p_kind, p_title, p_body, coalesce(p_data,'{}'));
$$;

-- Email simplu, în stilul Lyra (Resend). Fără cheie în Vault: nu trimite nimic.
create or replace function public.rewards_email(p_to text, p_subject text, p_title text, p_body text, p_cta text default null)
returns void language plpgsql security definer set search_path = public as $$
declare s public.settings; key text; html text;
begin
  if coalesce(p_to,'') = '' then return; end if;
  select * into s from public.settings where id = 1;
  begin select decrypted_secret into key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  exception when others then key := null; end;
  if key is null then return; end if;
  html := format($h$<!doctype html><html><body style="margin:0;background:#0b0806;font-family:Arial,Helvetica,sans-serif">
<table width="100%%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center">
<table width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#16110d;border-radius:22px;color:#fbf3ea">
<tr><td align="center" style="padding:30px 24px 6px"><div style="font-size:28px;font-weight:800;letter-spacing:2px">LYRA’S</div>
<div style="font-size:11px;font-weight:700;letter-spacing:6px;color:#ff7a1a">DELIVERY</div></td></tr>
<tr><td style="padding:18px 30px 0;text-align:center"><div style="font-size:12px;letter-spacing:3px;color:#ffb24a">LYRA REWARDS</div>
<h1 style="margin:10px 0 0;font-size:26px;line-height:1.2">%1$s</h1>
<p style="margin:14px 0 0;color:#bba897;font-size:15px;line-height:1.55">%2$s</p></td></tr>
<tr><td align="center" style="padding:24px 30px 32px"><a href="%3$s/cont" style="display:inline-block;background:#ff7a1a;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:999px">%4$s</a></td></tr>
</table><p style="color:#86756a;font-size:12px;margin:16px 0 0">Lyra's Delivery · lyrasdelivery.ro</p></td></tr></table></body></html>$h$,
    p_title, p_body, s.site_url, coalesce(p_cta, 'Vezi Lyra Rewards'));
  perform net.http_post(url := 'https://api.resend.com/emails',
    body := jsonb_build_object('from', s.email_from, 'to', jsonb_build_array(p_to),
      'reply_to', coalesce(s.email_reply_to, 'comenzi@lyrasdelivery.ro'), 'subject', p_subject, 'html', html),
    headers := jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'));
exception when others then raise warning 'Email Lyra Rewards netrimis: %', sqlerrm;
end $$;

-- Promovare: urcă nivelul după progres; un voucher de desert pentru fiecare nivel nou (o singură dată).
create or replace function public.rewards_promote(p_cust uuid) returns smallint
language plpgsql security definer set search_path = public as $$
declare cfg public.rewards_settings := public.rewards_cfg(); c public.customers; t int; nt smallint; vid uuid;
begin
  select * into c from public.customers where id = p_cust for update;
  if not found then return null; end if;
  nt := public.rewards_tier_for(c.reward_spent);
  if nt <= c.tier then return c.tier; end if;
  for t in c.tier + 1 .. nt loop
    insert into public.vouchers(customer_id, tier, expires_at)
      values (p_cust, t, now() + make_interval(days => cfg.voucher_days))
      on conflict (customer_id, tier, kind) do nothing returning id into vid;
    if vid is not null then
      perform public.rewards_notify(p_cust, 'voucher', 'Ai primit un desert cadou 🍰',
        format('Alege-ți desertul preferat la următoarea comandă. Voucherul e valabil %s zile.', cfg.voucher_days),
        jsonb_build_object('voucher', vid, 'tier', t));
    end if;
    vid := null;
  end loop;
  update public.customers set tier = nt where id = p_cust;
  perform public.rewards_notify(p_cust, 'promotion', format('Bun venit în Lyra %s!', cfg.tier_names[nt]),
    format('De acum fiecare punct valorează %s lei (%s%% cashback la comenzile următoare). Te așteaptă și un desert cadou.',
      to_char(public.rewards_vpp(nt), 'FM0.00'), to_char(cfg.rates[nt], 'FM990.##')),
    jsonb_build_object('tier', nt, 'from', c.tier));
  perform public.rewards_email(c.email, format('Felicitări! Ai urcat la Lyra %s', cfg.tier_names[nt]),
    format('Bun venit în Lyra %s!', cfg.tier_names[nt]),
    format('De acum primești %s%% cashback în puncte la fiecare comandă și te așteaptă un <b>desert cadou</b>, valabil %s zile. Îl alegi direct în coș, la următoarea comandă.',
      to_char(cfg.rates[nt], 'FM990.##'), cfg.voucher_days), 'Alege desertul cadou');
  return nt;
end $$;

-- Acordarea punctelor pentru o comandă livrată (apelată din trigger-ul de status).
-- Întoarce punctele acordate.
create or replace function public.rewards_credit(o public.orders) returns int
language plpgsql security definer set search_path = public as $$
declare
  cfg public.rewards_settings := public.rewards_cfg();
  base numeric; pts int; cid uuid; c public.customers; t smallint; v numeric; lot uuid; nxt numeric; nt smallint;
begin
  if not cfg.enabled then return 0; end if;
  base := greatest(coalesce(o.reward_base, o.subtotal - o.discount - o.points_value), 0);
  pts  := floor(base)::int;
  cid  := o.customer_id;
  if cid is null and coalesce(o.email,'') <> '' then
    select id into cid from public.customers where lower(email) = lower(o.email) limit 1;
  end if;

  if cid is null then
    -- client fără cont: puncte Classic pe email, se mută în cont la înscriere
    if coalesce(o.email,'') = '' then return 0; end if;
    if pts > 0 then
      insert into public.point_lots(email, order_id, source, points, remaining, vpp, tier)
        values (lower(o.email), o.id, 'order', pts, pts, public.rewards_vpp(1::smallint), 1)
        on conflict do nothing returning id into lot;
      if lot is null then return 0; end if;
      insert into public.point_ledger(email, order_id, order_no, kind, points, value, tier, note)
        values (lower(o.email), o.id, o.number, 'earn', pts, round(pts * public.rewards_vpp(1::smallint), 2), 1, 'Comanda #' || o.number);
    end if;
    insert into public.pending_points as pp (email, orders, spent) values (lower(o.email), 1, base)
      on conflict (email) do update set orders = pp.orders + 1, spent = pp.spent + excluded.spent, updated_at = now();
    return pts;
  end if;

  select * into c from public.customers where id = cid for update;
  t := coalesce(o.reward_tier, c.tier);                 -- nivelul de la plasare: nu retroactiv
  v := public.rewards_vpp(t);
  if pts > 0 then
    insert into public.point_lots(customer_id, order_id, source, points, remaining, vpp, tier)
      values (cid, o.id, 'order', pts, pts, v, t) on conflict do nothing returning id into lot;
    if lot is null then return 0; end if;                -- deja acordat
    insert into public.point_ledger(customer_id, order_id, order_no, kind, points, value, tier, note)
      values (cid, o.id, o.number, 'earn', pts, round(pts * v, 2), t, 'Comanda #' || o.number);
  end if;
  update public.customers set reward_spent = reward_spent + base, orders_count = orders_count + 1,
    spent = spent + o.total, last_activity_at = now(), expiry_warned_at = null where id = cid;
  perform public.rewards_sync(cid);
  if pts > 0 then
    perform public.rewards_notify(cid, 'earn', format('+%s puncte', pts),
      format('Pentru comanda #%s. Valorează %s lei la comenzile următoare.', o.number, to_char(round(pts * v, 2), 'FM999990.00')),
      jsonb_build_object('order', o.number, 'points', pts));
  end if;
  nt := public.rewards_promote(cid);
  -- aproape de nivelul următor (o singură dată pe nivel)
  select * into c from public.customers where id = cid;
  if nt < 3 then
    nxt := cfg.thresholds[nt + 1] - c.reward_spent;
    if nxt > 0 and nxt <= cfg.near_tier_lei and c.near_notified_tier <= nt then
      perform public.rewards_notify(cid, 'near', format('Mai ai doar %s lei până la Lyra %s!', to_char(ceil(nxt), 'FM999990'), cfg.tier_names[nt + 1]),
        format('Deblochezi %s%% cashback și un desert cadou.', to_char(cfg.rates[nt + 1], 'FM990.##')), jsonb_build_object('tier', nt + 1));
      update public.customers set near_notified_tier = nt + 1 where id = cid;
    end if;
  end if;
  return pts;
end $$;

-- Returnează punctele și voucherul folosite de o comandă (anulare / refuz / rambursare).
create or replace function public.rewards_release(o public.orders) returns void
language plpgsql security definer set search_path = public as $$
declare r record; cid uuid;
begin
  for r in select * from public.order_redemptions where order_id = o.id and not returned for update loop
    update public.point_lots set remaining = remaining + r.points where id = r.lot_id returning customer_id into cid;
    update public.order_redemptions set returned = true where order_id = r.order_id and lot_id = r.lot_id;
    insert into public.point_ledger(customer_id, order_id, order_no, kind, points, value, note)
      values (cid, o.id, o.number, 'redeem_return', r.points, round(r.value, 2), 'Returnate: comanda #' || o.number || ' anulată');
  end loop;
  if cid is not null then perform public.rewards_sync(cid); end if;
  if o.voucher_id is not null then
    update public.vouchers set status = case when expires_at > now() then 'active' else 'expired' end,
      used_order_id = null, used_at = null, item_id = null
    where id = o.voucher_id and status = 'used' and used_order_id = o.id;
  end if;
end $$;

-- Rambursare după livrare: retrage punctele câștigate și progresul; nivelul rămâne (fără retrogradare).
create or replace function public.rewards_reverse(o public.orders) returns void
language plpgsql security definer set search_path = public as $$
declare l public.point_lots; need int; take int; r record; lost numeric := 0; base numeric; cid uuid;
begin
  select * into l from public.point_lots where order_id = o.id and source = 'order' for update;
  if found and l.expired_at is null then
    cid := l.customer_id;
    take := least(l.remaining, l.points);
    update public.point_lots set remaining = remaining - take where id = l.id;
    lost := take * l.vpp; need := l.points - take;
    -- punctele din comanda rambursată au fost deja folosite: se retrag din alte loturi (cât există)
    if need > 0 and cid is not null then
      for r in select id, remaining, vpp from public.point_lots where customer_id = cid and remaining > 0 and expired_at is null
               order by seq for update loop
        exit when need <= 0;
        take := least(r.remaining, need);
        update public.point_lots set remaining = remaining - take where id = r.id;
        need := need - take; lost := lost + take * r.vpp;
      end loop;
    end if;
    insert into public.point_ledger(customer_id, email, order_id, order_no, kind, points, value, tier, note)
      values (l.customer_id, l.email, o.id, o.number, 'reverse', -(l.points - need), -round(lost, 2), l.tier,
        'Comanda #' || o.number || ' rambursată' || case when need > 0 then format(' (%s puncte deja folosite)', need) else '' end);
  end if;
  base := greatest(coalesce(o.reward_base, o.subtotal - o.discount - o.points_value), 0);
  cid := coalesce(cid, o.customer_id);
  if cid is not null then
    update public.customers set reward_spent = greatest(reward_spent - base, 0), orders_count = greatest(orders_count - 1, 0),
      spent = greatest(spent - o.total, 0) where id = cid;
    perform public.rewards_sync(cid);
  elsif coalesce(o.email,'') <> '' then
    update public.pending_points set spent = greatest(spent - base, 0), orders = greatest(orders - 1, 0) where email = lower(o.email);
  end if;
  perform public.rewards_release(o);
end $$;

-- Clientul nou preia punctele și progresul strânse ca vizitator (după email).
create or replace function public.rewards_attach_guest(p_cust uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare pp public.pending_points;
begin
  update public.point_lots set customer_id = p_cust where customer_id is null and lower(email) = lower(p_email);
  update public.point_ledger set customer_id = p_cust where customer_id is null and lower(email) = lower(p_email);
  delete from public.pending_points where email = lower(p_email) returning * into pp;
  if pp.email is not null then
    update public.customers set reward_spent = reward_spent + pp.spent, orders_count = orders_count + pp.orders,
      spent = spent + pp.spent, last_activity_at = coalesce(last_activity_at, now()) where id = p_cust;
  end if;
  perform public.rewards_sync(p_cust);
  perform public.rewards_promote(p_cust);
end $$;

-- Expirări și avertismente (rulat zilnic de pg_cron; se poate rula și manual)
create or replace function public.rewards_run_daily() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  cfg public.rewards_settings := public.rewards_cfg(); c record; v record; lots_val numeric; lots_pts int;
  n_warn int := 0; n_exp int := 0; n_vwarn int := 0; n_vexp int := 0; deadline timestamptz;
begin
  -- vouchere expirate
  for v in update public.vouchers set status = 'expired' where status = 'active' and expires_at <= now() returning * loop
    n_vexp := n_vexp + 1;
  end loop;
  -- vouchere care expiră curând
  for v in select vo.*, cu.email from public.vouchers vo join public.customers cu on cu.id = vo.customer_id
           where vo.status = 'active' and vo.warned_at is null and vo.expires_at <= now() + make_interval(days => cfg.voucher_warn_days) loop
    perform public.rewards_notify(v.customer_id, 'voucher_expiry', 'Desertul cadou expiră curând',
      format('Voucherul tău expiră pe %s. Folosește-l la următoarea comandă.', to_char(v.expires_at, 'DD.MM.YYYY')), jsonb_build_object('voucher', v.id));
    perform public.rewards_email(v.email, 'Desertul tău cadou expiră curând', 'Nu uita de desertul cadou 🍰',
      format('Voucherul pentru desertul gratuit expiră pe <b>%s</b>. Îl alegi direct în coș.', to_char(v.expires_at, 'DD.MM.YYYY')), 'Comandă acum');
    update public.vouchers set warned_at = now() where id = v.id;
    n_vwarn := n_vwarn + 1;
  end loop;
  -- puncte care expiră din cauza inactivității
  for c in select * from public.customers where points > 0 and last_activity_at is not null loop
    deadline := c.last_activity_at + make_interval(months => cfg.expiry_months);
    if deadline <= now() then
      select coalesce(sum(remaining), 0), coalesce(sum(remaining * vpp), 0) into lots_pts, lots_val
        from public.point_lots where customer_id = c.id and remaining > 0 and expired_at is null;
      update public.point_lots set remaining = 0, expired_at = now() where customer_id = c.id and remaining > 0 and expired_at is null;
      if lots_pts > 0 then
        insert into public.point_ledger(customer_id, kind, points, value, note)
          values (c.id, 'expire', -lots_pts, -round(lots_val, 2), format('Expirate după %s luni fără comenzi', cfg.expiry_months));
        perform public.rewards_notify(c.id, 'expiry', 'Punctele au expirat', format('%s puncte au expirat după %s luni fără comenzi.', lots_pts, cfg.expiry_months));
      end if;
      perform public.rewards_sync(c.id);
      n_exp := n_exp + 1;
    elsif deadline <= now() + make_interval(days => cfg.expiry_warn_days) and (c.expiry_warned_at is null or c.expiry_warned_at < c.last_activity_at) then
      perform public.rewards_notify(c.id, 'expiry', 'Punctele tale expiră curând',
        format('Ai %s puncte care expiră pe %s. O comandă le păstrează încă %s luni.', c.points, to_char(deadline, 'DD.MM.YYYY'), cfg.expiry_months));
      perform public.rewards_email(c.email, 'Punctele Lyra Rewards expiră curând', 'Punctele tale expiră curând',
        format('Ai <b>%s puncte</b> care expiră pe <b>%s</b>. Orice comandă le păstrează încă %s luni.', c.points, to_char(deadline, 'DD.MM.YYYY'), cfg.expiry_months), 'Comandă acum');
      update public.customers set expiry_warned_at = now() where id = c.id;
      n_warn := n_warn + 1;
    end if;
  end loop;
  -- vizitatori fără cont: loturile vechi expiră după aceeași perioadă de inactivitate
  update public.point_lots l set remaining = 0, expired_at = now()
  where l.customer_id is null and l.remaining > 0 and l.expired_at is null
    and (select max(created_at) from public.point_lots x where x.customer_id is null and lower(x.email) = lower(l.email))
        <= now() - make_interval(months => cfg.expiry_months);
  return jsonb_build_object('points_warned', n_warn, 'points_expired', n_exp, 'vouchers_warned', n_vwarn, 'vouchers_expired', n_vexp);
end $$;
revoke execute on function public.rewards_run_daily() from public, anon, authenticated;

do $$ begin
  begin create extension if not exists pg_cron; exception when others then null; end;
  begin
    perform cron.unschedule('lyra-rewards-daily');
  exception when others then null; end;
  begin
    perform cron.schedule('lyra-rewards-daily', '15 4 * * *', 'select public.rewards_run_daily()');
  exception when others then raise notice 'pg_cron indisponibil: rulează zilnic select public.rewards_run_daily();'; end;
end $$;

-- =====================================================================
-- API pentru client
-- =====================================================================
create or replace function public.my_rewards() returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.customers; cfg public.rewards_settings := public.rewards_cfg();
begin
  select * into c from public.customers where id = auth.uid();
  if not found then return null; end if;
  update public.vouchers set status = 'expired' where customer_id = c.id and status = 'active' and expires_at <= now();
  return jsonb_build_object(
    'tier', c.tier, 'spent', c.reward_spent, 'points', c.points,
    'value', (select coalesce(floor(sum(remaining * vpp) * 100) / 100, 0) from public.point_lots where customer_id = c.id and remaining > 0 and expired_at is null),
    'last_activity_at', c.last_activity_at,
    'expires_at', case when c.points > 0 and c.last_activity_at is not null then c.last_activity_at + make_interval(months => cfg.expiry_months) end,
    'lots', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'remaining', remaining, 'vpp', vpp, 'tier', tier, 'created_at', created_at) order by seq)
             from public.point_lots where customer_id = c.id and remaining > 0 and expired_at is null), '[]'),
    'ledger', coalesce((select jsonb_agg(x order by x.created_at desc) from (select kind, points, value, tier, note, order_no, created_at
             from public.point_ledger where customer_id = c.id order by created_at desc limit 60) x), '[]'),
    'vouchers', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'tier', tier, 'status', status, 'item_id', item_id, 'expires_at', expires_at, 'used_at', used_at) order by created_at desc)
             from public.vouchers where customer_id = c.id), '[]'),
    'notifications', coalesce((select jsonb_agg(x order by x.created_at desc) from (select id, kind, title, body, data, read_at, created_at
             from public.reward_notifications where customer_id = c.id order by created_at desc limit 30) x), '[]'));
end $$;

create or replace function public.rewards_mark_read() returns void
language sql security definer set search_path = public as $$
  update public.reward_notifications set read_at = now() where customer_id = auth.uid() and read_at is null;
$$;
grant execute on function public.my_rewards(), public.rewards_mark_read() to authenticated;

-- =====================================================================
-- API pentru administrator
-- =====================================================================
create or replace function public.admin_rewards_save(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare th numeric[]; rt numeric[]; nm text[];
begin
  if not public.is_admin() then raise exception 'Doar administratorul poate modifica programul.' using errcode = 'P0001'; end if;
  nm := array(select jsonb_array_elements_text(p->'tier_names'));
  th := array(select (x)::numeric from jsonb_array_elements_text(p->'thresholds') x);
  rt := array(select (x)::numeric from jsonb_array_elements_text(p->'rates') x);
  if array_length(nm,1) <> 3 or array_length(th,1) <> 3 or array_length(rt,1) <> 3 then raise exception 'Sunt necesare exact 3 niveluri.' using errcode = 'P0001'; end if;
  if exists (select 1 from unnest(nm) n where coalesce(trim(n),'') = '') then raise exception 'Fiecare nivel are nevoie de un nume.' using errcode = 'P0001'; end if;
  if not (th[1] = 0 and th[2] > 0 and th[3] > th[2]) then raise exception 'Pragurile trebuie să crească: 0 < Select < Signature.' using errcode = 'P0001'; end if;
  if exists (select 1 from unnest(rt) r where r < 0 or r > 50) then raise exception 'Cashback între 0 și 50%%.' using errcode = 'P0001'; end if;
  if (p->>'max_redeem_pct')::numeric not between 0 and 100 then raise exception 'Limita de folosire e între 0 și 100%%.' using errcode = 'P0001'; end if;
  if (p->>'voucher_days')::int < 1 or (p->>'expiry_months')::int < 1 then raise exception 'Valabilitățile trebuie să fie pozitive.' using errcode = 'P0001'; end if;
  update public.rewards_settings set
    enabled = coalesce((p->>'enabled')::boolean, enabled), program_name = coalesce(nullif(trim(p->>'program_name'),''), program_name),
    tier_names = nm, thresholds = th, rates = rt,
    max_redeem_pct = (p->>'max_redeem_pct')::numeric, voucher_days = (p->>'voucher_days')::int,
    expiry_months = (p->>'expiry_months')::int, near_tier_lei = coalesce((p->>'near_tier_lei')::numeric, near_tier_lei),
    dessert_ids = array(select jsonb_array_elements_text(coalesce(p->'dessert_ids','[]'))), updated_at = now()
  where id = 1;
end $$;

create or replace function public.admin_rewards_adjust(p_customer uuid, p_points int, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.customers; who text; v numeric; need int; take int; r record; val numeric := 0;
begin
  if not public.is_admin() then raise exception 'Doar administratorul poate ajusta punctele.' using errcode = 'P0001'; end if;
  if coalesce(p_points, 0) = 0 then raise exception 'Scrie numărul de puncte (+ sau −).' using errcode = 'P0001'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Motivul ajustării este obligatoriu.' using errcode = 'P0001'; end if;
  select * into c from public.customers where id = p_customer for update;
  if not found then raise exception 'Clientul nu există.' using errcode = 'P0001'; end if;
  select email into who from auth.users where id = auth.uid();
  if p_points > 0 then
    v := public.rewards_vpp(c.tier);
    insert into public.point_lots(customer_id, source, points, remaining, vpp, tier) values (c.id, 'adjust', p_points, p_points, v, c.tier);
    val := p_points * v;
    update public.customers set last_activity_at = now() where id = c.id;
    perform public.rewards_notify(c.id, 'adjust', format('+%s puncte de la Lyra', p_points), trim(p_reason));
  else
    need := -p_points;
    if need > c.points then raise exception 'Clientul are doar % puncte.', c.points using errcode = 'P0001'; end if;
    for r in select id, remaining, vpp from public.point_lots where customer_id = c.id and remaining > 0 and expired_at is null order by seq for update loop
      exit when need <= 0;
      take := least(r.remaining, need);
      update public.point_lots set remaining = remaining - take where id = r.id;
      need := need - take; val := val - take * r.vpp;
    end loop;
  end if;
  insert into public.point_ledger(customer_id, kind, points, value, tier, note, actor)
    values (c.id, 'adjust', p_points, round(val, 2), c.tier, trim(p_reason), coalesce(who, 'admin'));
  perform public.rewards_sync(c.id);
  return jsonb_build_object('points', (select points from public.customers where id = c.id));
end $$;

create or replace function public.admin_rewards_overview() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Acces interzis.' using errcode = 'P0001'; end if;
  return jsonb_build_object(
    'tiers', (select coalesce(jsonb_object_agg(tier, n), '{}') from (select tier, count(*) n from public.customers group by tier) t),
    'customers', (select count(*) from public.customers),
    'issued_points', (select coalesce(sum(points), 0) from public.point_ledger where kind in ('earn','adjust','migration') and points > 0),
    'issued_value', (select coalesce(sum(value), 0) from public.point_ledger where kind in ('earn','adjust','migration') and points > 0),
    'used_points', (select coalesce(-sum(points), 0) from public.point_ledger where kind = 'redeem') - (select coalesce(sum(points), 0) from public.point_ledger where kind = 'redeem_return'),
    'used_value', (select coalesce(sum(points_value), 0) from public.orders where points_value > 0 and status not in ('rejected','refunded')),
    'expired_points', (select coalesce(-sum(points), 0) from public.point_ledger where kind = 'expire'),
    'outstanding_points', (select coalesce(sum(remaining), 0) from public.point_lots where expired_at is null),
    'outstanding_value', (select coalesce(round(sum(remaining * vpp), 2), 0) from public.point_lots where expired_at is null),
    'vouchers_issued', (select count(*) from public.vouchers),
    'vouchers_used', (select count(*) from public.vouchers where status = 'used'),
    'vouchers_active', (select count(*) from public.vouchers where status = 'active' and expires_at > now()),
    'vouchers_value', (select coalesce(sum(value), 0) from public.vouchers where status = 'used'),
    'discount_cost', (select coalesce(sum(points_value), 0) from public.orders where points_value > 0 and status not in ('rejected','refunded'))
                     + (select coalesce(sum(value), 0) from public.vouchers where status = 'used'));
end $$;

create or replace function public.admin_rewards_customers(p_q text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Acces interzis.' using errcode = 'P0001'; end if;
  return coalesce((select jsonb_agg(x) from (
    select c.id, c.email, c.name, c.phone, c.tier, c.reward_spent as spent, c.points, c.orders_count, c.last_activity_at, c.marketing_ok, c.created_at,
      (select coalesce(round(sum(remaining * vpp), 2), 0) from public.point_lots l where l.customer_id = c.id and l.remaining > 0 and l.expired_at is null) as value,
      (select count(*) from public.vouchers v where v.customer_id = c.id and v.status = 'active' and v.expires_at > now()) as vouchers
    from public.customers c
    where coalesce(p_q,'') = '' or c.email ilike '%' || p_q || '%' or c.name ilike '%' || p_q || '%' or c.phone ilike '%' || p_q || '%'
    order by c.reward_spent desc limit 300) x), '[]');
end $$;

create or replace function public.admin_rewards_ledger(p_customer uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Acces interzis.' using errcode = 'P0001'; end if;
  return coalesce((select jsonb_agg(x order by x.created_at desc) from (
    select kind, points, value, tier, note, actor, order_no, created_at from public.point_ledger where customer_id = p_customer order by created_at desc limit 200) x), '[]');
end $$;
grant execute on function public.admin_rewards_save(jsonb), public.admin_rewards_adjust(uuid,int,text),
  public.admin_rewards_overview(), public.admin_rewards_customers(text), public.admin_rewards_ledger(uuid) to authenticated;
revoke execute on function public.rewards_credit(public.orders), public.rewards_release(public.orders), public.rewards_reverse(public.orders),
  public.rewards_promote(uuid), public.rewards_attach_guest(uuid,text), public.rewards_notify(uuid,text,text,text,jsonb),
  public.rewards_email(text,text,text,text,text), public.rewards_sync(uuid) from public, anon, authenticated;
revoke execute on function public.rewards_plan(uuid,int,numeric) from public, anon, authenticated;

-- =====================================================================
-- Migrare o singură dată din vechiul Lyra Club (Bronz/Argint/Aur, 100 puncte = 10 lei)
-- Punctele vechi trec la valoarea Classic (0,01 lei/punct); nivelul se calculează din cheltuieli.
-- =====================================================================
do $$
declare c record; p record;
begin
  if (select migrated from public.rewards_settings where id = 1) then return; end if;
  for c in select * from public.customers loop
    update public.customers set reward_spent = c.spent, tier = public.rewards_tier_for(c.spent),
      near_notified_tier = public.rewards_tier_for(c.spent), last_activity_at = coalesce(c.last_activity_at, now()) where id = c.id;
    if c.points > 0 then
      insert into public.point_lots(customer_id, source, points, remaining, vpp, tier) values (c.id, 'migration', c.points, c.points, 0.01, 1);
      insert into public.point_ledger(customer_id, kind, points, value, note) values (c.id, 'migration', c.points, round(c.points * 0.01, 2), 'Puncte Lyra Club păstrate (0,01 lei/punct)');
    end if;
    perform public.rewards_sync(c.id);
  end loop;
  for p in select * from public.pending_points where points > 0 loop
    insert into public.point_lots(email, source, points, remaining, vpp, tier) values (p.email, 'migration', p.points, p.points, 0.01, 1);
    insert into public.point_ledger(email, kind, points, value, note) values (p.email, 'migration', p.points, round(p.points * 0.01, 2), 'Puncte Lyra Club păstrate (0,01 lei/punct)');
    update public.pending_points set points = 0 where email = p.email;
  end loop;
  update public.rewards_settings set migrated = true where id = 1;
end $$;

-- corecție: punctele preluate din Lyra Club valorează ca Classic (0,01 lei/punct), nu 0,10
update public.point_lots set vpp = 0.01 where source = 'migration' and vpp <> 0.01;
update public.point_ledger set value = round(points * 0.01, 2), note = 'Puncte Lyra Club păstrate (0,01 lei/punct)'
  where kind = 'migration' and note like '%0,10%';


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
-- Acord pentru oferte pe email (GDPR): bifat explicit de client, cu dată și sursă,
-- dezabonare dintr-un click (link unic), jurnal al acordurilor și listă pentru admin.
-- =====================================================================
alter table public.customers add column if not exists marketing_at timestamptz;
alter table public.customers add column if not exists marketing_source text;
alter table public.customers add column if not exists unsub_token uuid not null default gen_random_uuid();
create unique index if not exists customers_unsub_token_uq on public.customers(unsub_token);

create table if not exists public.marketing_log (
  id          bigint generated always as identity primary key,
  customer_id uuid references public.customers(id) on delete set null,
  email       text,
  action      text not null check (action in ('opt_in','opt_out')),
  source      text,
  at          timestamptz not null default now()
);
alter table public.marketing_log enable row level security;
do $$ begin drop policy if exists "mlog admin" on public.marketing_log; end $$;
create policy "mlog admin" on public.marketing_log for select using (public.is_admin());
grant select on public.marketing_log to authenticated;

-- orice schimbare a acordului se datează (înainte de scriere) și se jurnalizează (după)
create or replace function public.customers_marketing() returns trigger
language plpgsql security definer set search_path = public as $$
declare src text := coalesce(nullif(current_setting('lyra.marketing_source', true), ''), 'cont');
begin
  if tg_op = 'INSERT' then
    if new.marketing_ok then new.marketing_at := coalesce(new.marketing_at, now()); new.marketing_source := coalesce(new.marketing_source, 'inregistrare'); end if;
  elsif new.marketing_ok is distinct from old.marketing_ok then
    if new.marketing_ok then new.marketing_at := now(); new.marketing_source := src; else new.marketing_at := null; end if;
  end if;
  return new;
end $$;
create or replace function public.customers_marketing_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.marketing_ok) or (tg_op = 'UPDATE' and new.marketing_ok is distinct from old.marketing_ok) then
    insert into public.marketing_log(customer_id, email, action, source)
      values (new.id, new.email, case when new.marketing_ok then 'opt_in' else 'opt_out' end,
              case when new.marketing_ok then new.marketing_source else coalesce(nullif(current_setting('lyra.marketing_source', true), ''), 'cont') end);
  end if;
  return null;
end $$;
drop trigger if exists customers_marketing on public.customers;
create trigger customers_marketing before insert or update of marketing_ok on public.customers
  for each row execute function public.customers_marketing();
drop trigger if exists customers_marketing_log on public.customers;
create trigger customers_marketing_log after insert or update of marketing_ok on public.customers
  for each row execute function public.customers_marketing_log();

-- dezabonare fără cont, din linkul din email: lyrasdelivery.ro/dezabonare?t=<token>
create or replace function public.unsubscribe(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.customers;
begin
  select * into c from public.customers where unsub_token = p_token;
  if not found then return jsonb_build_object('ok', false); end if;
  perform set_config('lyra.marketing_source', 'link dezabonare', true);
  update public.customers set marketing_ok = false where id = c.id and marketing_ok;
  return jsonb_build_object('ok', true, 'email', regexp_replace(c.email, '^(.).*(@.*)$', '\1•••\2'));
end $$;
grant execute on function public.unsubscribe(uuid) to anon, authenticated;

-- lista abonaților (doar cei care au bifat), pentru export
create or replace function public.admin_marketing_list() returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.settings;
begin
  if not public.is_admin() then raise exception 'Doar administratorul vede lista.' using errcode = 'P0001'; end if;
  select * into s from public.settings where id = 1;
  return coalesce((select jsonb_agg(jsonb_build_object('email', c.email, 'name', c.name, 'phone', c.phone, 'tier', c.tier,
      'since', c.marketing_at, 'source', c.marketing_source, 'orders', c.orders_count,
      'unsubscribe', s.site_url || '/dezabonare?t=' || c.unsub_token) order by c.marketing_at desc)
    from public.customers c where c.marketing_ok and coalesce(c.email, '') <> ''), '[]');
end $$;
grant execute on function public.admin_marketing_list() to authenticated;


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


-- =====================================================================
-- Plata online cu cardul (Stripe Checkout)
-- Clientul alege „Card online”, comanda se salvează cu pay_status = 'pending' și NU apare la recepție.
-- Funcția Edge `pay` deschide pagina de plată Stripe; webhook-ul `stripe-webhook` marchează comanda plătită,
-- iar abia atunci recepția o vede (și primește notificarea). Plata neterminată în 30 de minute anulează comanda.
-- Comanda plătită și apoi refuzată / anulată se rambursează automat pe card.
-- Configurare: supabase/functions/pay/README.md. Până atunci opțiunea nu apare pe site (online_pay_on = false).
-- =====================================================================

alter table public.settings add column if not exists online_pay_on boolean not null default false;

alter table public.orders add column if not exists pay_status text not null default 'none'
  check (pay_status in ('none', 'pending', 'paid', 'failed', 'refunding', 'refunded'));
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists stripe_session text;
alter table public.orders add column if not exists stripe_payment text;      -- payment_intent
alter table public.orders add column if not exists stripe_refund text;
create index if not exists orders_pay_pending_idx on public.orders(created_at) where pay_status = 'pending';

-- la plasare: „online” doar când plata e pornită; comanda așteaptă plata
create or replace function public.orders_pay_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.payment = 'online' then
    if not coalesce((select online_pay_on from public.settings where id = 1), false) then
      raise exception 'Plata online nu este disponibilă acum. Alege plata la livrare.' using errcode = 'P0001';
    end if;
    new.pay_status := 'pending';
  else
    new.pay_status := 'none';
  end if;
  return new;
end $$;
drop trigger if exists orders_pay_insert on public.orders;
create trigger orders_pay_insert before insert on public.orders for each row execute function public.orders_pay_insert();

-- recepția nu vede comenzile neplătite (nici prin citire directă)
drop policy if exists "orders own read" on public.orders;
create policy "orders own read" on public.orders for select
  using (customer_id = auth.uid() or (public.is_staff() and pay_status not in ('pending', 'failed')));

-- apelate doar de funcțiile Edge (cheia service_role)
create or replace function public.pay_order_info(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', o.id, 'number', o.number, 'total', o.total, 'email', o.email, 'pay_status', o.pay_status,
    'payment', o.payment, 'status', o.status, 'created_at', o.created_at, 'site_url', s.site_url, 'stripe_session', o.stripe_session)
  from public.orders o, public.settings s where s.id = 1 and o.token = p_token;
$$;
create or replace function public.pay_set_session(p_order uuid, p_session text) returns void
language sql security definer set search_path = public as $$
  update public.orders set stripe_session = p_session where id = p_order and pay_status = 'pending';
$$;
create or replace function public.pay_mark_paid(p_order uuid, p_session text, p_payment text) returns boolean
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  update public.orders set pay_status = 'paid', paid_at = now(), stripe_session = coalesce(p_session, stripe_session), stripe_payment = p_payment
   where id = p_order and pay_status in ('pending', 'failed') returning * into o;
  if not found then return false; end if;
  -- plata a venit după ce comanda expirase: o rambursăm imediat
  if o.status = 'rejected' then
    update public.orders set pay_status = 'refunding' where id = o.id;
    perform public.pay_request_refund(o.id);
  else
    insert into public.order_messages(order_id, body) values (o.id, 'Plata cu cardul a fost primită. Mulțumim!');
  end if;
  return true;
end $$;
create or replace function public.pay_mark_failed(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set pay_status = 'failed', status = 'rejected', cancelled_by = 'sistem', rejected_by_name = 'sistem',
         reject_reason = 'Plata online nu a fost finalizată'
   where id = p_order and pay_status = 'pending' and status = 'new';
end $$;
create or replace function public.pay_mark_refunded(p_order uuid, p_refund text) returns void
language sql security definer set search_path = public as $$
  update public.orders set pay_status = 'refunded', stripe_refund = p_refund where id = p_order and pay_status in ('paid', 'refunding');
$$;
revoke execute on function public.pay_order_info(uuid), public.pay_set_session(uuid, text), public.pay_mark_paid(uuid, text, text),
  public.pay_mark_failed(uuid), public.pay_mark_refunded(uuid, text) from public, anon, authenticated;
grant execute on function public.pay_order_info(uuid), public.pay_set_session(uuid, text), public.pay_mark_paid(uuid, text, text),
  public.pay_mark_failed(uuid), public.pay_mark_refunded(uuid, text) to service_role;

-- cere funcției `pay` rambursarea (pg_net); secretele: vault 'pay_url', 'push_secret' (același secret ca la notificări)
create or replace function public.pay_request_refund(p_order uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare url text; secret text;
begin
  begin
    select decrypted_secret into url from vault.decrypted_secrets where name = 'pay_url' limit 1;
    select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_secret' limit 1;
  exception when others then url := null; end;
  if url is null or secret is null then
    raise warning 'Rambursarea comenzii % trebuie făcută manual din Stripe (lipsește pay_url / push_secret).', p_order;
    return false;
  end if;
  perform net.http_post(url := url, body := jsonb_build_object('action', 'refund', 'order_id', p_order),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-pay-secret', secret));
  return true;
end $$;
revoke execute on function public.pay_request_refund(uuid) from public, anon, authenticated;

-- comanda plătită devine refuzată / anulată / rambursată din admin: banii se întorc pe card
create or replace function public.orders_pay_refund() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pay_status = 'paid' and new.status in ('rejected', 'refunded') and old.status is distinct from new.status then
    update public.orders set pay_status = 'refunding' where id = new.id;
    perform public.pay_request_refund(new.id);
    insert into public.order_messages(order_id, body) values (new.id, 'Plata cu cardul îți va fi returnată automat (de obicei în 3–5 zile lucrătoare).');
  end if;
  return new;
end $$;
drop trigger if exists orders_pay_refund on public.orders;
create trigger orders_pay_refund after update of status on public.orders for each row execute function public.orders_pay_refund();

-- plățile neterminate în 30 de minute anulează comanda (punctele și bonusul revin clientului)
create or replace function public.expire_unpaid() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from public.orders where pay_status = 'pending' and status = 'new' and created_at < now() - interval '30 minutes' loop
    perform public.pay_mark_failed(r.id); n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.expire_unpaid() to authenticated;
do $$ begin
  begin perform cron.unschedule('lyra-unpaid'); exception when others then null; end;
  begin perform cron.schedule('lyra-unpaid', '*/5 * * * *', 'select public.expire_unpaid()');
  exception when others then null; end;
end $$;


-- Actualizare meniu (generat din lyra/data/menu.js). ATENȚIE: suprascrie prețurile, textele și pozele din admin.
begin;
insert into public.categories(id,name_ro,name_hu,note_ro,note_hu,sort) values
  ('antreuri','Antreuri','Előételek',null,null,10),
  ('dejun','Mic dejun','Reggeli','Spanacul cu ochiuri se servește între 08:00–22:00','A spenótfőzelék 08:00–22:00 között kapható',20),
  ('nou','Noutăți','Új fogás',null,null,30),
  ('platouri','Platouri','Tálak','Pentru 2–3 persoane','2–3 személyre',40),
  ('specialitati','Specialitățile restaurantului','Az étterem specialitásai','Din BBQ Pit Box Smoker-ul Lyra, gătite lent','A Lyra BBQ Pit Box Smokerből, lassan főzve',50),
  ('smash','Smash Burgers','Smash burgerek','Nou: burgeri smash by Lyra','Új: smash burgerek by Lyra',60),
  ('burger','Lyra''s Burger','Lyra''s Burger','Preparate la foc pe cărbune · chiflă artizanală, producție proprie','Faszénen készítve · saját készítésű kézműves zsemle',70),
  ('supe','Supe, ciorbe','Levesek','Între orele 10:00–21:00','10 és 21 óra között',80),
  ('porc','Preparate din porc','Sertéshús ételek',null,null,90),
  ('ardeal','Bucătăria transilvăneană','Erdélyi konyha',null,null,100),
  ('pui','Preparate din pui','Csirke ételek',null,null,110),
  ('peste','Preparate din pește','Halételek',null,null,120),
  ('paste','Paste','Tészták',null,null,130),
  ('salate','Salate','Saláták',null,null,140),
  ('vegetariene','Preparate vegetariene','Vegetáriánus ételek',null,null,150),
  ('post','Preparate de post','Böjti ételek',null,null,160),
  ('kids','Lyra Kids','Lyra Kids',null,null,170),
  ('garnituri','Garnituri','Köretek',null,null,180),
  ('muraturi','Salate & murături','Saláták, savanyúságok',null,null,190),
  ('sosuri','Sosuri','Szószok',null,null,200),
  ('desert','Desert','Desszert',null,null,210),
  ('limonade','Limonade & fresh','Limonádék, frissek',null,null,220),
  ('racoritoare','Răcoritoare','Üdítők',null,null,230),
  ('cocktail','Cocktailuri','Koktélok','Doar pentru persoane peste 18 ani. Curierul poate cere actul de identitate.','Csak 18 év felettieknek. A futár személyi igazolványt kérhet.',240),
  ('vin','Vinuri','Borok','Doar pentru persoane peste 18 ani. Curierul poate cere actul de identitate.','Csak 18 év felettieknek. A futár személyi igazolványt kérhet.',250),
  ('bere','Bere & cidru','Sör, cider','Doar pentru persoane peste 18 ani. Curierul poate cere actul de identitate.','Csak 18 év felettieknek. A futár személyi igazolványt kérhet.',260)
on conflict (id) do update set name_ro = excluded.name_ro, name_hu = excluded.name_hu, note_ro = excluded.note_ro, note_hu = excluded.note_hu, sort = excluded.sort, active = true;
insert into public.items(id,category_id,num,name_ro,name_hu,desc_ro,desc_hu,price,grams,allergens,meat,hot,tags,wine,image,variants,packaging,active,sort) values
  ('duo-vinete','antreuri',1,'Duo de vinete și zacuscă cu focaccia home made','Padlizsánkrém és zakuszka házi készítésű focacciával','Vinete cu maioneză și zacuscă de fasole, cu focaccia făcută în casă','Padlizsánkrém és zakuszka, házi focacciával',36,'100/100/30/100 gr',array['gluten','ou']::text[],null,false,array['veg','home']::text[],'Fetească Regală Pivnița Savu','duo-vinete.jpg',null,2,true,10),
  ('pita-carbune','antreuri',2,'Pită prăjită la cuptor pe cărbune','Sütőben sült pirított kenyér szénen','Cu slană și brânză de burduf, ceapă','Szalonnával és juhtúróval, hagymával',27,'100/100/50/30 gr',array['gluten','lactoza']::text[],'porc',true,array['coal']::text[],null,'pita-carbune.jpg',null,2,true,20),
  ('gustare','antreuri',3,'Gustare țărănească','Paraszti falatok','Cârnați uscați, jumări, brânză de burduf, slănină, ceapă, roșii, castraveți','Száraz kolbász, tepertő, juhtúró, szalonna, hagyma, paradicsom, uborka',39,'40/40/60/40/60/60 gr',array['lactoza','gluten']::text[],'porc',false,array[]::text[],null,'gustare.jpg',null,2,true,30),
  ('focaccia-untura','antreuri',4,'Focaccia cu untură, ceapă și ardei iute','Focaccia zsírral, hagymával és csípős paprikával','Focaccia făcută în casă, untură, ceapă, ardei iute','Házi focaccia, zsír, hagyma, csípős paprika',25,'100 gr',array['gluten']::text[],null,false,array['home']::text[],null,'focaccia-untura.jpg',null,2,true,40),
  ('platou-branzeturi','antreuri',5,'Platou brânzeturi','Sajttál','Brânză maturată cu busuioc, brânză maturată cu trufe, Floare de Colț (Camembert), brânză maturată Apuseni, brânză dură tip parmezan','Érlelt sajt bazsalikommal, érlelt sajt szarvasgombával, Floare de Colț (camembert), érlelt Apuseni sajt, parmezán jellegű kemény sajt',42,'25/25/25/25 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,'platou-branzeturi.jpg',null,2,true,50),
  ('iaurt-oua-posate','antreuri',6,'Iaurt cu ouă poșate','Joghurt posírozott tojással','Iaurt, mărar, ulei cu chili, focaccia, ouă, usturoi copt','Joghurt, kapor, chilis olaj, focaccia, tojás, sült fokhagyma',38,'250/60 gr',array['gluten','ou','lactoza']::text[],null,false,array['new','veg']::text[],null,'iaurt-oua-posate.jpg',null,2,true,60),
  ('bruschete','dejun',7,'Bruschete țărănești','Paraszti bruschetta','Cu ou ochi, cartofi prăjiți și telemea, brânză de burduf, slănină, ceapă','Tükörtojással, sült burgonyával és juhtúróval',45,'100/30/150 gr',array['gluten','ou']::text[],'porc',true,array[]::text[],null,'bruschete.jpg',null,2,true,70),
  ('english','dejun',8,'Mic dejun englezesc','Angol reggeli','Cârnăciori cu cașcaval, ochiuri, guanciale, fasole în sos tomat, focaccia făcută în casă','Kolbászkák sajttal, tükörtojás, guanciale, babos paradicsomszósz, focaccia',47,'50/100/100/100/50 gr',array['gluten','ou']::text[],'porc',true,array[]::text[],null,'english.jpg',null,2,true,80),
  ('omleta','dejun',9,'Omletă cu șuncă și cașcaval','Sonkával és sajttal rántotta','Ouă, șuncă, cașcaval','Tojás, sonka, sajt',35,'300 gr',array['lactoza','ou']::text[],null,true,array[]::text[],null,'omleta.jpg',null,2,true,90),
  ('spanac','dejun',10,'Spanac cu ochiuri','Spenótfőzelék tükörtojással','Ouă, spanac, usturoi, cremă de gătit vegetală','Tojás, spenót, fokhagyma, növényi főzőkrém',38,'200/100 gr',array['ou']::text[],null,true,array['veg']::text[],null,'spanac.jpg',null,2,true,100),
  ('oua-posate','dejun',11,'Ouă poșate cu salată','Posírozott tojás salátával','Mix salată, cremă de avocado, conopidă, rodie, sparanghel, dressing miere','Salátamix, avokádókrém, karfiol, gránátalma, spárga, mézes öntet',43,'300 gr',array['lactoza','ou']::text[],null,false,array['veg']::text[],null,'oua-posate.jpg',null,2,true,110),
  ('paine-ou','dejun',12,'Pâine cu ou','Bundás kenyér','Servită cu iaurt','Joghurttal',35,'300 gr',array['lactoza','ou']::text[],null,false,array['veg']::text[],null,'paine-ou.jpg',null,2,true,120),
  ('antricot','nou',13,'Antricot de vită la grătar','Grillezett marha hátszín (entrecôte)','Alături de cartofi copți în coajă și rozmarin','Héjában sült burgonyával és rozmaringgal',145,'200/250 gr',array['lactoza']::text[],'vita',true,array['garn']::text[],null,'antricot.jpg',null,2,true,130),
  ('muschi','nou',14,'Mușchi de vită cu sos de piper','Marhabélszín borsmártással','Piper murat, frișcă de gătit și piure de cartofi','Savanyított borssal, főzőtejszínnel és burgonyapürével',165,'160/150/100 gr',array['lactoza']::text[],'vita',false,array['garn']::text[],null,'muschi.jpg',null,2,true,140),
  ('tocanita','nou',15,'Tocăniță de vițel cu găluște','Borjúpörkölt galuskával','Pulpă de vită Black Angus, legume, paste','Black Angus marhapecsenye, zöldségek, tészta',66,'250/150 gr',array['gluten','ou','telina']::text[],'vita',true,array['angus']::text[],null,'tocanita.jpg',null,2,true,150),
  ('platou-lyra','platouri',18,'Platou à la Lyra · 2–3 persoane','Vegyes tál Lyra módra · 2–3 személyre','Ceafă de porc, cârnați de porc, costițe de porc, pulpă de porc, slănină, ciolan, piure de cartofi, cartofi în coajă cu parmezan, murături asortate, sos usturoi, sosul casei','Sertésnyak, sertéskolbász, sertésoldalas, sertéscomb, szalonna, csülök, burgonyapüré, héjas burgonya parmezánnal, vegyes savanyúság, fokhagymás szósz, házi szósz',290,'160/150/160/250/240/250/240/100/200/90/90 gr',array['ou','mustar','lactoza']::text[],'porc',true,array['share']::text[],null,'platou-lyra.jpg',null,10,true,160),
  ('platou-pui','platouri',19,'Platou de pui asortat · 2–3 persoane','Szárnyas vegyes tál · 2–3 személyre','Aripioare de pui, crispy de pui, cordon bleu, șnițel Palermo, rondele de ceapă, cartofi copți în coajă, crochete din mozzarella, sosul casei, usturoi, murătură asortată','Csirkeszárnyak, csirkegrill, cordon bleu, Palermo szelet, hagymakarikák, héjában sült krumpli, mozzarella krokettek, házi szósz, fokhagyma, vegyes savanyúság',270,'600/500/90/60/90 gr',array['gluten','ou','telina','lactoza']::text[],'pui',true,array['share']::text[],null,'platou-pui.jpg',null,10,true,170),
  ('ciolan-varza','specialitati',16,'Ciolan fraged pe pat de varză roșie călită','Puha csülök vöröskáposzta ágyon','Ciolan, varză, frișcă de gătit','Csülök, káposzta, főzőtejszín',85,'600/250/100 gr',array['lactoza','seminte']::text[],'porc',false,array[]::text[],null,'ciolan-varza.jpg',null,2,true,180),
  ('iahnie-ciolan','specialitati',17,'Iahnie de fasole cu ciolan afumat','Babfőzelék füstölt csülökkel','Și ardei iute','És csípős paprikával',69,'350/200 gr',array['gluten']::text[],'porc',true,array[]::text[],null,'iahnie-ciolan.jpg',null,2,true,190),
  ('sarmale','specialitati',20,'Sarmale cu ciolan și mămăliguță prăjită','Töltött káposzta füstölt csülökkel és pirított puliszkával','Sarmale, ciolan de porc, ardei iute, smântână','Töltött káposzta, sertéscsülök, csípős paprika, tejföl',60,'400/100/90/45 gr',array['lactoza']::text[],'porc',true,array['casa']::text[],null,'sarmale.jpg',null,2,true,200),
  ('fasii-carnuri','specialitati',21,'Fâșii de cărnuri mixte ușor picante','Vegyes húscsíkok krumplival','Piept de pui, mușchi de porc, înăbușite în legume (ceapă, usturoi, ardei gras, ciuperci), cartofi de casă copți în coajă și prăjiți cu ceapă și slănină','Csirke, sertés, zöldséges ágyban párolva (hagyma, fokhagyma, paprika, gomba), majd szalonnás, hagymás burgonyával tálalva',63,'100/100/100/250 gr',array['soia']::text[],'porc',true,array['garn','spicy']::text[],null,'fasii-carnuri.jpg',null,2,true,210),
  ('costite','specialitati',22,'Costițe Lyra fragede afumate cu sos BBQ','Lyra omlós, füstölt sertésoldalas BBQ szósszal','Cu cartofi copți cu usturoi','Fokhagymás sült burgonyával',79,'300/150/100/40 gr',array['gluten']::text[],'porc',true,array['garn','casa','smoker']::text[],null,'costite.jpg',null,2,true,220),
  ('ceafa-afumata','specialitati',23,'Felie de ceafă afumată','Füstölt tarjaszeletek','Gătită lent la temperatură joasă pentru păstrarea frăgezimii, cu piure de cartofi și sos brun','Alacsony hőmérsékleten, lassan főzve a porhanyósság megőrzéséért; krumplipüré, barna szósz',57,'180/150/50 gr',array['telina','ou','lactoza']::text[],'porc',true,array['garn','casa','smoker']::text[],null,'ceafa-afumata.jpg',null,2,true,230),
  ('pulled-pork','specialitati',24,'Pulled pork în cartof copt','Pulled pork sült krumpliban','În cartof copt cu cașcaval și salată coleslaw, porumb; spată de porc gătită la foc lent în stil BBQ','Sült krumpli sajttal és coleslaw saláta, kukorica; lassú tűzön főtt sertés BBQ stílusban',47,'300/100 gr',array['telina','ou','lactoza']::text[],'porc',true,array['smoker']::text[],null,'pulled-pork.jpg',null,2,true,240),
  ('pulpa-smoker','specialitati',25,'Pulpă Pork Smoker cu piure de cartofi','Smokerben füstölt sertéscomb burgonyapürével','Servită cu varză murată de casă; pulpă de porc gătită la foc lent în stil BBQ, piper, guanciale','Házi savanyú káposztával; lassan sült sertéscomb BBQ stílusban, bors, guanciale',59,'200/150 gr',array['lactoza']::text[],'porc',true,array['garn','smoker']::text[],null,'pulpa-smoker.jpg',null,2,true,250),
  ('double-smash','smash',32,'Double Smash','Double Smash','2 × 60 g carne de vită, castraveți murați, brânză cheddar, sos burger, ceapă, unt, salată iceberg','2 × 60 g marhahús, csemegeuborka, cheddar, burger szósz, hagyma, vaj, jégsaláta',35,'2 × 60 g vită',array['gluten','lactoza']::text[],'vita',false,array['new']::text[],null,'double-smash.jpg',null,2,true,260),
  ('spicy-smash','smash',33,'Spicy Smash','Spicy Smash','2 × 60 g carne de vită, castraveți murați, brânză cheddar, sos Vifon, jalapeño, unt, ceapă, salată iceberg','2 × 60 g marhahús, csemegeuborka, cheddar, Vifon szósz, jalapeño, vaj, hagyma, jégsaláta',35,'2 × 60 g vită',array['gluten','lactoza']::text[],'vita',false,array['new','spicy']::text[],null,'spicy-smash.jpg',null,2,true,270),
  ('smash','smash',34,'Smash Burger','Smash Burger','1 × 60 g carne de vită, brânză cheddar, castraveți murați, sos burger, ceapă, unt, salată iceberg','1 × 60 g marhahús, cheddar, csemegeuborka, burger szósz, hagyma, vaj, jégsaláta',25,'1 × 60 g vită',array['gluten','lactoza']::text[],'vita',false,array['new']::text[],null,'smash.jpg',null,2,true,280),
  ('chicken-burger','burger',26,'Meniu Chicken Burger','Chicken Burger menü','Chiflă, dulceață de ceapă, salată iceberg, chiftea din pui 80%, slănină de porc 20%, brânză cheddar, sos burger, cartofi prăjiți și sosul casei, parmezan',null,56,'80 chiflă, 120 chiftea, 90 ingrediente, 150 cartofi, 40 sos gr',array['gluten','lactoza']::text[],'pui',false,array[]::text[],null,'chicken-burger.jpg',null,2,true,290),
  ('ozn-pulled','burger',27,'Meniu OZN Pulled Pork','OZN Pulled Pork menü','Chiflă, spată de porc, cașcaval, salată coleslaw, sos BBQ, cartofi prăjiți și sosul casei, parmezan',null,49.5,'80 chiflă, 120 pulled porc, 120 ingrediente, 150 cartofi, 40 sos gr',array['mustar','gluten','lactoza']::text[],'porc',false,array[]::text[],null,'ozn-pulled.jpg',null,2,true,300),
  ('crispy-burger','burger',28,'Meniu Crispy Burger','Crispy Burger menü','Crispy de pui de casă, cașcaval, salată, sos burger, cartofi prăjiți și sosul casei, parmezan',null,48.5,'80 chiflă, 100 crispy, 90 ingrediente, 150 cartofi, 40 sos gr',array['gluten','lactoza']::text[],'pui',false,array[]::text[],null,'crispy-burger.jpg',null,2,true,310),
  ('eleven-burger','burger',29,'Meniu Eleven Burger','Eleven Burger menü','Chiflă, dulceață de ceapă, salată iceberg, chiftea din vită Black Angus, brânză cheddar, bacon, sos burger, cartofi prăjiți și sosul casei, parmezan',null,64.5,'80 chiflă, 100 chiftea, 90 ingrediente, 150 cartofi, 40 sos gr',array['gluten','lactoza']::text[],'vita',false,array['angus']::text[],null,'eleven-burger.jpg',null,2,true,320),
  ('burger-ozn','burger',30,'Burger OZN','OZN Burger','Chiftea Black Angus, salată iceberg, roșii, ceapă, sos burger, parmezan, cartofi, sos brânzeturi',null,60,'80/100/70/150/100 gr',array['gluten','lactoza']::text[],'vita',false,array['angus']::text[],null,'burger-ozn.jpg',null,2,true,330),
  ('veggie-ozn','burger',31,'Meniu Veggie Burger OZN','Veggie OZN Burger menü','Chiflă, brânză cheddar, salată iceberg, ceapă caramelizată, legume, chiftea veggie, ciuperci, cartofi prăjiți și sosul casei, parmezan',null,64,'80 chiflă, 100 chiftea veggie, 90 ingrediente, 150 cartofi, 40 sos gr',array['mustar','gluten','lactoza']::text[],null,false,array['veg']::text[],'Sauvignon Blanc Pivnița Savu','veggie-ozn.jpg',null,2,true,340),
  ('supa-crema','supe',37,'Supă cremă de legume','Zöldségkrémleves','Crutoane de pâine, morcovi, țelină, mazăre, cartofi, roșii, varză, cremă de gătit','Zsemlekockákkal, sárgarépa, zeller, zöldborsó, krumpli, paradicsom, káposzta',29,'400/30 gr',array['mustar','gluten','lactoza']::text[],null,false,array['veg']::text[],'Sauvignon Blanc Pivnița Savu','supa-crema.jpg','[{"l":"Porție întreagă","lh":"Egész adag","p":29,"g":"400/30 gr"},{"l":"Porție medie","lh":"Közepes adag","p":22,"g":"200/15 gr"}]'::jsonb,2,true,350),
  ('ciorba-legume-supe','supe',38,'Ciorbă de legume','Zöldségleves','Cu morcovi, țelină, mazăre, cartofi, roșii, varză','Sárgarépa, zeller, borsó, burgonya, paradicsom, káposzta',29,'400 gr',array['telina']::text[],null,false,array['veg']::text[],null,'ciorba-legume-supe.jpg','[{"l":"Porție întreagă","lh":"Egész adag","p":29,"g":"400 gr"},{"l":"Porție medie","lh":"Közepes adag","p":22,"g":"200 gr"}]'::jsonb,2,true,360),
  ('supa-pui','supe',39,'Supă de pui cu tăiței','Tyúkhúsleves','Carne de pui, paste (fidea cu ou), morcov','Csirke, laska (tojásos metélt), sárgarépa',29,'350/50 gr',array['gluten','telina','ou']::text[],'pui',false,array[]::text[],null,'supa-pui.jpg','[{"l":"Porție întreagă","lh":"Egész adag","p":29,"g":"350/50 gr"},{"l":"Porție medie","lh":"Közepes adag","p":18,"g":"175/25 gr"}]'::jsonb,2,true,370),
  ('ciorba-vita','supe',40,'Ciorbă de legume și carne de vită','Zöldségleves marhahússal','Carne de vită, morcovi, țelină, mazăre, cartofi, roșii, varză, conopidă','Marhahús, sárgarépa, zeller, borsó, burgonya, paradicsom, káposzta, karfiol',34,'350/50 gr',array['telina']::text[],'vita',false,array[]::text[],null,'ciorba-vita.jpg','[{"l":"Porție întreagă","lh":"Egész adag","p":34,"g":"350/50 gr"},{"l":"Porție medie","lh":"Közepes adag","p":23,"g":"175/25 gr"}]'::jsonb,2,true,380),
  ('ciorba-fasole-ciolan','supe',42,'Ciorbă de fasole cu ciolan afumat','Bableves füstölt csülökkel','Cu ciolan de porc afumat','Füstölt sertéscsülökkel',32,'350/50 gr',array['lactoza','telina']::text[],'porc',false,array[]::text[],null,'ciorba-fasole-ciolan.jpg','[{"l":"Porție întreagă","lh":"Egész adag","p":32,"g":"350/50 gr"},{"l":"Porție medie","lh":"Közepes adag","p":23,"g":"175/25 gr"}]'::jsonb,2,true,390),
  ('supa-salata','supe',43,'Supă de salată verde cu mămăliguță','Zöldsalátaleves puliszkával','Brânză de burduf, slănină, smântână, franjuri de omletă','Juhtúró, szalonna, tejszín, omlettcsíkok',54,'400/300/70/30 gr',array['gluten','lactoza']::text[],'porc',false,array['casa']::text[],null,'supa-salata.jpg',null,2,true,400),
  ('ciorba-pita-ciolan','supe',44,'Ciorbă de fasole în pită prăjită','Bableves pirított kenyércipóban','Cu ciolan de porc afumat și ceapă roșie','Sertéscsülökkel, piros hagymával',39.5,'350/60/50 gr',array['gluten','lactoza','telina']::text[],'porc',false,array[]::text[],null,'ciorba-pita-ciolan.jpg',null,7,true,410),
  ('gulas','supe',45,'Supă gulaș','Gulyásleves','Cu carne de vită, cartofi, găluște și ardei iute','Marhahússal, burgonyával, galuskával és csípős paprikával',39,'300/70 gr',array['lactoza','ou']::text[],'vita',false,array['spicy']::text[],null,'gulas.jpg',null,2,true,420),
  ('burta','supe',46,'Ciorbă de burtă','Pacalleves','Ou, burtă, lezon, supă de oase · rețetă proprie','Tojás, pacal, habarcs, csontleves · saját recept',34,'300/120 gr',array['ou','lactoza']::text[],'vita',false,array['casa']::text[],null,'burta.jpg',null,2,true,430),
  ('lascute','supe',47,'Ciorbă de lășcuțe cu ciolan','Csipetkés leves csülökkel','Legume, lășcuțe, smântână, ou, ciolan, tarhon și ardei iute','Zöldségekkel, laskatésztával, tejföllel, tojással, füstölt csülökkel, tárkonnyal és csípős paprikával',27,'400 ml/50 gr',array['ou','lactoza']::text[],'porc',false,array[]::text[],null,'lascute.jpg',null,2,true,440),
  ('ciolan-lyra','porc',48,'Ciolan à la Lyra cu cartofi petală și cașcaval','Csülök Lyra módra','Servit pe pat de cartofi cu cașcaval, sos de hrean cu usturoi, cremă de gătit, smântână','Sajtos burgonyaágyon tálalva, fokhagymás tormamártással, főzőtejszínnel és tejföllel',55,'180/110/50 gr',array['gluten','mustar','soia','ou','lactoza','telina']::text[],'porc',true,array['garn','casa']::text[],null,'ciolan-lyra.jpg',null,2,true,450),
  ('ceafa-tiganeasca','porc',49,'Ceafă țigănească fragedă și cartofi Lyra','Omlós cigánypecsenye tarja és Lyra burgonya','Ceafă de porc, mujdeiul casei, boia, slănină prăjită, cartofi cu usturoi și cașcaval','Sertéstarja házi fokhagymamártással, pirospaprikával, sült szalonnával, fokhagymás-sajtos burgonyával',68,'170/250/45/75 gr',array['lactoza']::text[],'porc',true,array['coal','garn']::text[],null,'ceafa-tiganeasca.jpg',null,2,true,460),
  ('carne-garnita','porc',50,'Carne la garniță','Omlós sertéshúsdarabok','Prăjită lent în untură, usturoi, gust autentic de odinioară: ceafă de porc, ciolan de porc, cârnați de porc, usturoi, untură condimentată, mămăliguță prăjită, ochi, telemea','Lassan, zsírban és fokhagymával sütve, a régi idők igazi íze: sertésnyak, sertéscsülök, sertéskolbász, fokhagyma, fűszeres zsír, sült puliszka, tükörtojás, túró',63,'220/150/50 gr',array['gluten','mustar']::text[],'porc',true,array['casa']::text[],null,'carne-garnita.jpg',null,2,true,470),
  ('mititei','porc',51,'Mititei cu muștar · 4 bucăți','Miccs mustárral · 4 darab','4 mititei, cu muștar','4 miccs, mustárral',34,'4 bucăți/280/80 gr',array['gluten','mustar']::text[],'porc',false,array[]::text[],null,'mititei.jpg',null,2,true,480),
  ('mix-grill','porc',52,'Mix grill Lyra','Mix grill Lyra','2 mititei, 1 ceafă de porc, cartofi prăjiți cu usturoi și cașcaval','2 miccs, 1 szelet sertéstarja, hasábburgonya fokhagymával és sajttal',49,'350 gr',array['gluten','mustar']::text[],'porc',false,array['garn']::text[],null,'mix-grill.jpg',null,2,true,490),
  ('snitel-lyra','porc',55,'Șnițel Lyra din cotlet','Lyra karaj szelet','Cotlet de porc, sos ciuperci, cașcaval, cheddar, șuncă, smântână vegetală, ou','Sertéstarja, gombás szósz, cheddar, sajt, sonka, növényi tejszín',57,'350 gr',array['lactoza','ciuperci','ou']::text[],'porc',true,array[]::text[],'Chardonnay Barrique Pivnița Savu','snitel-lyra.jpg',null,2,true,500),
  ('fasole-batuta','ardeal',53,'Fasole bătută cu cârnați de casă','Tört bab házi kolbásszal','Prăjiți în untură și ceapă călită','Zsírban sütve, pirított hagymával',59,'250/150 gr',array['gluten','soia','lactoza']::text[],'porc',true,array[]::text[],null,'fasole-batuta.jpg',null,2,true,510),
  ('papricas','ardeal',54,'Papricaș de pui cu mămăliguță prăjită','Csirkepaprikás puliszkával','Pulpă de pui, ceapă, ardei, cremă vegetală pentru gătit','Csirkecomb, hagyma, paprika, főzéshez növényi krém',45,'300/130 gr',array['gluten','ou','telina']::text[],'pui',true,array[]::text[],null,'papricas.jpg',null,2,true,520),
  ('ficatei','ardeal',56,'Ficăței la tigaie rumeniți cu dulceață de ceapă','Serpenyőben pirított csirkemáj hagymalekvárral',null,null,47,'250/130 gr',array['gluten']::text[],'pui',true,array[]::text[],null,'ficatei.jpg',null,2,true,530),
  ('piept-lyra','pui',58,'Piept de pui à la Lyra','Csirkemell Lyra módra','Piept de pui la grătar, ciuperci, șuncă de pui, cașcaval cheddar, cremă de gătit','Csirkemell, gomba, sonka, sajt, cheddar sajt, főzőkrém',39,'80/100/40/40 gr',array['gluten','mustar','soia','lactoza','telina']::text[],'pui',true,array['nogarn']::text[],'Fetească Regală Pivnița Savu','piept-lyra.jpg',null,2,true,540),
  ('borzas','pui',59,'Borzaș','Borzás','Piept de pui, cartofi răzuiți, ou, usturoi, smântână, sos de usturoi','Csirkemell, reszelt burgonya, tojás, fokhagyma, tejföl, fokhagymás szósz',49,'300 gr',array['ou','lactoza','telina']::text[],'pui',false,array[]::text[],'Fetească Regală Pivnița Savu','borzas.jpg','[{"l":"Porție întreagă","lh":"Egész adag","p":49,"g":"300 gr"},{"l":"Porție medie","lh":"Közepes adag","p":32,"g":"200 gr"}]'::jsonb,7,true,550),
  ('cordon-bleu','pui',60,'Cordon bleu cu cartofi à la Lyra','Cordon bleu burgonyával à la Lyra','Șuncă de pui, cașcaval, cartofi cu usturoi, ou','Sajt, sonka, fokhagymás burgonya és sajt',49,'150/250 gr',array['ou','soia','mustar','gluten','lactoza','telina']::text[],'pui',true,array['garn']::text[],'Fetească Regală Pivnița Savu','cordon-bleu.jpg',null,2,true,560),
  ('salata-pui','pui',61,'Salată cu piept de pui','Csirkemell saláta','Mix salată, sparanghel, conopidă crocantă, rodie, cremă de avocado, dressing miere, piept de pui','Salátakeverék, spárga, ropogós karfiol, gránátalma, avokádókrém, mézes öntet, csirkemell',52,'150/80/30 gr',array['soia','ou','seminte']::text[],'pui',false,array[]::text[],'Fetească Regală Pivnița Savu','salata-pui.jpg',null,2,true,570),
  ('crispy-pui','pui',62,'Crispy de pui cu cartofi prăjiți','Ropogós csirke sült burgonyával','Piept de pui, fulgi de porumb, sos de usturoi, parmezan, iaurt','Csirkemell, kukoricapehely, fokhagymás szósz, parmezán',42,'300/150/90 gr',array['gluten','lactoza']::text[],'pui',false,array['casa','garn']::text[],'Chardonnay Barrique Pivnița Savu','crispy-pui.jpg',null,2,true,580),
  ('piept-carbune','pui',63,'Piept de pui la foc de cărbune','Csirkemell faszénen sütve','Piept de pui gătit în cuptorul pe cărbune','Faszenes kemencében sült csirkemell',36,'100/200 gr',array['mustar','telina']::text[],'pui',true,array['coal','nogarn']::text[],'Fetească Regală Pivnița Savu','piept-carbune.jpg',null,2,true,590),
  ('piept-vienez','pui',64,'Piept de pui vienez','Bécsi szelet csirkemellből','Piept de pui, făină, ou, pesmet panko','Csirkemell, tojás, prézli',39,'230 gr',array['gluten','lactoza']::text[],'pui',false,array['nogarn']::text[],null,'piept-vienez.jpg',null,2,true,600),
  ('piept-palermo','pui',65,'Piept de pui Palermo','Palermói csirkemell','Piept de pui, ouă, cașcaval','Csirkemell, tojás, sajt',46,'300 gr',array['gluten','mustar','ou','lactoza','telina']::text[],'pui',false,array['nogarn']::text[],null,'piept-palermo.jpg',null,2,true,610),
  ('pastrav','peste',66,'Păstrăv proaspăt din Munții Călimani','Friss pisztráng a Kelemen-havasokból','Gătit la foc de cărbune, simplu, pentru a păstra gustul autentic de munte, cu mămăliguță prăjită și mujdeiul casei','Faszénen sütve, egyszerűen, a hegyek hamisítatlan ízéért, pirított puliszkával és házi fokhagymamártással',65,'190/150/45 gr',array['mustar','peste']::text[],'peste',true,array['coal','garn']::text[],null,'pastrav.jpg',null,7,true,620),
  ('biban','peste',67,'File de biban pane','Rántott süllőfilé','Cu cartofi petale și sosul casei','Sziromburgonyával és házi szósszal',63,'120/250/100 gr',array['gluten','peste']::text[],'peste',false,array['garn']::text[],null,'biban.jpg',null,2,true,630),
  ('carbonara','paste',68,'Penne Carbonara','Carbonara penne','Guanciale, ou, parmezan, cremă de gătit','Guanciale, tojás, főzőtejszín, parmezán',46,'250/50/50/30 gr',array['gluten','ou','telina']::text[],'porc',false,array[]::text[],null,'carbonara.jpg',null,2,true,640),
  ('bolognese','paste',69,'Penne Bolognese','Bolognai penne','Carne de vită tocată, legume, parmezan','Darált marhahús, zöldség, parmezán',46,'250/120/30 gr',array['gluten','ou','telina']::text[],'vita',false,array[]::text[],null,'bolognese.jpg',null,2,true,650),
  ('halloumi','salate',70,'Salată Halloumi','Halloumi saláta','Mix salată, sparanghel, conopidă crocantă, rodie, cremă de avocado, dressing miere, halloumi','Salátakeverék, spárga, ropogós karfiol, gránátalma, avokádókrém, mézes öntet, halloumi',47,'400 gr',array['ou','telina','lactoza']::text[],null,false,array['veg']::text[],null,'halloumi.jpg',null,2,true,660),
  ('camembert','salate',71,'Camembert pane cu gem de afine și salată de sezon','Rántott camembert áfonyalekvárral és salátával','Mix salată, sparanghel, conopidă crocantă, rodie, cremă de avocado, dressing miere, camembert','Salátakeverék, spárga, ropogós karfiol, gránátalma, avokádókrém, mézes öntet, camembert',62,'170/100/50 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,'camembert.jpg',null,2,true,670),
  ('snitel-vegetal','vegetariene',72,'Șnițel vegetal Lyra','Lyra vegetáriánus szelet','Șnițel veggie, sos ciuperci, cheddar, cașcaval, smântână vegetală','Vegetáriánus rántott szelet, gombás szósz, cheddar sajt, trappista sajt, növényi tejszín',53,'250 gr',array['lactoza']::text[],null,true,array['veg']::text[],null,'snitel-vegetal.jpg',null,2,true,680),
  ('papricas-ciuperci','vegetariene',73,'Papricaș de ciuperci','Gombapaprikás sült puliszkával','Cu mămăligă prăjită, ceapă, ardei, pastă de tomate, ciuperci, hribi, cremă de gătit','Hagyma, paprika, paradicsompüré, gomba, vargánya, főzőtejszín',42,'250/100 gr',array['gluten','soia','lactoza']::text[],null,false,array['veg']::text[],null,'papricas-ciuperci.jpg',null,2,true,690),
  ('mamaliguta-branza','vegetariene',74,'Mămăliguță cu brânză','Puliszka sajttal','Cu smântână și ceapă condimentată','Tejföllel és fűszerezett hagymával',35,'300/150/100 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,'mamaliguta-branza.jpg',null,2,true,700),
  ('veggie-burger-veg','vegetariene',75,'Veggie Burger OZN','Veggie OZN Burger','Chiflă, cheddar, salată iceberg, ceapă caramelizată, legume, ciuperci, chiftea veggie, cartofi prăjiți, sos cașcaval','Zsemle, cheddar, jégsaláta, karamellizált hagyma, zöldségek, vega fasírt, sült krumpli',64,'300/150 gr',array['gluten','lactoza']::text[],null,true,array['veg']::text[],null,'veggie-burger-veg.jpg',null,2,true,710),
  ('cartofi-taranesti-veg','vegetariene',76,'Cartofi țărănești','Parasztburgonya','Cartofi, ceapă, boia, condimente','Burgonya, hagyma, pirospaprika, fűszerek',15,'180 gr',array['lactoza','gluten']::text[],null,false,array['veg']::text[],null,'cartofi-taranesti-veg.jpg',null,2,true,720),
  ('cascaval-pane','vegetariene',77,'Cașcaval pane','Rántott sajt','Cașcaval, ou, pesmet','Sajt, tojás, prézli',31,'120 gr',array['telina']::text[],null,false,array['veg','nogarn']::text[],'Fetească Regală Pivnița Savu','cascaval-pane.jpg',null,2,true,730),
  ('ciorba-legume','post',78,'Ciorbă de legume','Zöldségleves',null,null,29,'400 gr',array['telina']::text[],null,false,array['post']::text[],null,'ciorba-legume.jpg',null,2,true,740),
  ('ciorba-fasole','post',79,'Ciorbă de fasole','Bableves',null,null,29,'400 gr',array[]::text[],null,false,array['post']::text[],null,'ciorba-fasole.jpg',null,2,true,750),
  ('ciorba-pita','post',80,'Ciorbă de fasole în pită prăjită','Bableves pirított kenyércipóban',null,null,37,'270/400/50 gr',array['gluten']::text[],null,false,array['post']::text[],null,'ciorba-pita.jpg',null,7,true,760),
  ('iahnie-soia','post',81,'Iahnie de fasole cu șnițel soia','Babpörkölt szójaszelettel',null,null,52,'250/130 gr',array['lactoza']::text[],null,false,array['post']::text[],null,'iahnie-soia.jpg',null,2,true,770),
  ('kids-supa-pui','kids',82,'Supă de pui cu tăiței','Tyúkhúsleves','Porție pentru copii','Gyerekadag',16,'280 ml/20 gr',array['ou','telina','gluten']::text[],'pui',false,array[]::text[],null,'kids-supa-pui.jpg',null,2,true,780),
  ('kids-supa-crema','kids',83,'Supă cremă de legume','Zöldségkrémleves','Cu cremă de gătit și crutoane','Főzőtejszínnel és krutonnal',16,'250 ml/15 gr',array['telina','gluten','soia']::text[],null,false,array['veg']::text[],null,'kids-supa-crema.jpg',null,2,true,790),
  ('kids-dino','kids',84,'Dino de pui','Csirke dínók','Cu cartofi prăjiți și sos de usturoi','Hasábburgonyával és fokhagymás szósszal',33,'75/100/45 gr',array['mustar','gluten']::text[],'pui',false,array[]::text[],null,'kids-dino.jpg',null,2,true,800),
  ('kids-crispy','kids',85,'Crispy de pui','Ropogós csirke','Cu cartofi prăjiți și sos de usturoi','Hasábburgonyával és fokhagymás szósszal',33,'150/100/45 gr',array['mustar','gluten']::text[],'pui',false,array[]::text[],null,'kids-crispy.jpg',null,2,true,810),
  ('kids-carbonara','kids',86,'Penne Carbonara cu șuncă de pui','Carbonara penne csirkesonkával','Porție pentru copii','Gyerekadag',29,'150/50/100/30 gr',array['ou','mustar','gluten']::text[],'pui',false,array[]::text[],null,'kids-carbonara.jpg',null,2,true,820),
  ('cartofi-coaja','garnituri',80,'Cartofi copți în coajă','Héjában sült burgonya',null,null,15.5,'250 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,'cartofi-coaja.jpg',null,2,false,830),
  ('special-fries','garnituri',87,'Special Fries','Special Fries','Cartofi pai MasterCrunch, brânză cheddar, bacon crocant, sos burger, chives (arpagic verde)','Hasábburgonya, cheddar, ropogós bacon, burger szósz, metélőhagyma',21,'200 gr',array['lactoza']::text[],'porc',false,array[]::text[],null,'special-fries.jpg',null,2,true,840),
  ('cartofi-lyra','garnituri',88,'Cartofi Lyra','Burgonya Lyra módra','Din cartofi copți la cuptor și prăjiți, sos de usturoi, cașcaval','Sütőben sült és olajban sült burgonyából, fokhagymaszósszal, sajttal',16,'250 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,null,null,2,true,850),
  ('cartofi-taranesti','garnituri',89,'Cartofi țărănești','Parasztos burgonya','Cartofi, ceapă, boia, condimente','Burgonya, hagyma, pirospaprika, fűszerek',15,'200 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,'cartofi-taranesti.jpg',null,2,true,860),
  ('legume-tigaie','garnituri',90,'Legume la tigaie','Serpenyős zöldségek','Ceapă, mix ardei, ciuperci, ulei de măsline','Hagyma, paprikamix, gomba, olívaolaj',22,'200 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,'legume-tigaie.jpg',null,2,true,870),
  ('risotto','garnituri',91,'Risotto cu parmezan','Parmezános rizottó','Orez, parmezan, unt, vin','Rizs, parmezán, vaj, bor',22,'200 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,null,null,2,true,880),
  ('piure','garnituri',92,'Piure de cartofi','Burgonyapüré',null,null,14,'150 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,null,null,2,true,890),
  ('cartofi','garnituri',93,'Cartofi prăjiți','Hasábburgonya','Cartofi MasterCrunch cu coajă: extra crocanți la exterior, pufoși la interior','Héjas MasterCrunch burgonya: kívül ropogós, belül puha',15,'150 gr',array[]::text[],null,false,array['veg']::text[],null,'cartofi.jpg',null,2,true,900),
  ('mamaliguta','garnituri',94,'Mămăliguță prăjită','Sült puliszka',null,null,12,'150 gr',array['gluten']::text[],null,false,array['veg']::text[],null,null,null,2,true,910),
  ('pita-coapta','garnituri',95,'Pită coaptă','Sült kenyér',null,null,4.5,'50 gr',array['gluten']::text[],null,false,array['veg']::text[],null,null,null,2,true,920),
  ('focaccia','garnituri',96,'Focaccia home made','Focaccia home made','Aluat bine hidratat, uns cu ulei de măsline extravirgin și rozmarin','Jól hidratált tészta, extraszűz olívaolajjal és rozmaringgal megkenve',7.5,'2 buc/70 gr',array['gluten']::text[],null,false,array['veg','home']::text[],null,'focaccia.jpg',null,2,true,930),
  ('varza-murata','muraturi',97,'Varză murată','Savanyúkáposzta','Rețetă tradițională · de sezon','Hagyományos recept · idényjellegű',15,'130 gr',array[]::text[],null,false,array['post']::text[],null,'varza-murata.jpg',null,2,true,940),
  ('muraturi','muraturi',98,'Murături asortate','Vegyes savanyúság','Varză murată, castraveți, gogoșari · rețetă tradițională','Savanyúkáposzta, uborka, paprika',16,'130 gr',array[]::text[],null,false,array['post']::text[],null,'muraturi.jpg',null,2,true,950),
  ('sfecla','muraturi',99,'Salată de sfeclă roșie','Céklasaláta','Rețetă tradițională','Hagyományos recept',16,'130 gr',array[]::text[],null,false,array['post']::text[],null,'sfecla.jpg',null,2,true,960),
  ('ardei-copti','muraturi',100,'Ardei copți','Sült paprika',null,null,15,'130 gr',array[]::text[],null,false,array['post']::text[],null,'ardei-copti.jpg',null,2,true,970),
  ('salata-varza','muraturi',101,'Salată de varză','Káposztasaláta',null,null,13,'130 gr',array[]::text[],null,false,array['post']::text[],null,'salata-varza.jpg',null,2,true,980),
  ('salata-asortata','muraturi',102,'Salată asortată','Vegyes saláta',null,null,15,'130 gr',array[]::text[],null,false,array['post']::text[],null,'salata-asortata.jpg',null,2,true,990),
  ('ardei-iute','muraturi',103,'Ardei iute murat sau proaspăt','Ecetes csípős paprika vagy friss',null,null,4.5,'1 buc',array[]::text[],null,false,array['post']::text[],null,'ardei-iute.jpg','[{"l":"Murat","lh":"Ecetes","p":4.5,"g":"1 buc"},{"l":"Proaspăt","lh":"Friss","p":4.5,"g":"1 buc"}]'::jsonb,2,true,1000),
  ('ceapa','muraturi',104,'Ceapă roșie','Vöröshagyma',null,null,5,'50 gr',array[]::text[],null,false,array['post']::text[],null,'ceapa.jpg',null,2,true,1010),
  ('sos-usturoi','sosuri',105,'Sos de usturoi','Fokhagymás szósz','Rețeta casei: usturoi, iaurt, lămâie','Házi recept: fokhagyma, joghurt, citrom',10,'90 gr',array['lactoza']::text[],null,false,array[]::text[],null,null,null,2,true,1020),
  ('mujdei','sosuri',106,'Mujdeiul casei','Házi mujdei','Rețeta casei: usturoi, boia, ulei, sare, zeamă de lămâie','Házi recept: fokhagyma, paprika, olaj, só, citromlé',10,'90 gr',array[]::text[],null,false,array['post']::text[],null,null,null,2,true,1030),
  ('sosul-casei','sosuri',107,'Sosul casei','A ház szósza','Usturoi, boia, maioneză, ou','Fokhagyma, paprika, majonéz, tojás',10,'90 gr',array['ou','lactoza']::text[],null,false,array[]::text[],null,null,null,2,true,1040),
  ('smantana','sosuri',108,'Smântână','Tejföl',null,null,5,'45 gr',array['lactoza']::text[],null,false,array[]::text[],null,null,null,2,true,1050),
  ('ketchup','sosuri',109,'Ketchup','Ketchup',null,null,7,'90 gr',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1060),
  ('mustar','sosuri',110,'Muștar','Mustár',null,null,7,'90 gr',array['mustar']::text[],null,false,array[]::text[],null,null,null,2,true,1070),
  ('maioneza','sosuri',111,'Maioneză','Majonéz',null,null,7,'90 gr',array['lactoza','ou']::text[],null,false,array[]::text[],null,null,null,2,true,1080),
  ('sos-iaurt','sosuri',112,'Sos de iaurt cu usturoi copt','Joghurtos szósz sült fokhagymával',null,null,10,'90 gr',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1090),
  ('tarta-mere','desert',105,'Tartă cu mere','Almás pite','Semințe de pin, scorțișoară, mere, zahăr, ouă, unt, lapte, stafide','Fenyőmag, fahéj, alma, cukor, tojás, vaj, tej, mazsola',29,'180 gr',array['lactoza']::text[],null,false,array[]::text[],null,'tarta-mere.jpg',null,2,false,1100),
  ('melba','desert',107,'Melba · mix de înghețată','Melba · vegyes fagylalt','Vanilie, ciocolată și fructe de pădure, cu cremă de ciocolată albă belgiană cu mascarpone și topping','Vanília, csokoládé és erdei gyümölcs fagylalt, belga fehér csokoládékrém mascarponéval és toppinggal',32,'180 gr',array['ou','lactoza']::text[],null,false,array[]::text[],null,'melba.jpg',null,2,false,1110),
  ('papanas','desert',113,'Papanaș','Túrógombóc','Rumenit, cu smântână și dulceață de afine. Brânză de vaci, telemea, făină, gem de afine, smântână, zahăr pudră, ou','Aranybarnára sütve, tejföllel és áfonyalekvárral. Túró, telemea, liszt, áfonyalekvár, tejföl, porcukor, tojás',33,'120/70/70 gr',array['gluten','ou','lactoza']::text[],null,false,array['home']::text[],null,'papanas.jpg',null,2,true,1120),
  ('lapte-pasare','desert',114,'Lapte de pasăre','Madártej','După rețeta clasică de acasă: cremă fină de vanilie, albușuri bătute, zahăr','A klasszikus házi recept szerint: finom vaníliakrém, felvert tojásfehérje, cukor',29,'130/30 gr',array['gluten','ou','telina']::text[],null,false,array['home']::text[],null,'lapte-pasare.jpg',null,2,true,1130),
  ('cinnamon-rolls','desert',115,'Cinnamon Rolls','Fahéjas csiga','Ou, unt, lapte, sos de vanilie și scorțișoară','Tojás, vaj, tej, vaníliaszósz és fahéj',29,'150/80 gr',array['gluten','ou','lactoza']::text[],null,false,array['new','home']::text[],null,'cinnamon-rolls.jpg',null,2,true,1140),
  ('panna-cotta','desert',116,'Panna cotta','Panna cotta','Smântână pentru frișcă, esență de vanilie, zahăr, gelatină, gem de zmeură, păstăi de vanilie','Habtejszín, vanília aroma, cukor, zselatin, málnalekvár',29,'150 gr',array['ou','lactoza']::text[],null,false,array[]::text[],null,'panna-cotta.jpg',null,2,true,1150),
  ('clatite','desert',117,'Clătite fermecate cu Nutella','Varázslatos palacsinta Nutellával','Cremă de ciocolată albă belgiană cu mascarpone, Nutella, zahăr pudră și topping','Belga fehér csokoládékrém mascarponéval, Nutella, porcukor és topping',28,'130/70 gr',array['ou','lactoza']::text[],null,false,array['home']::text[],null,'clatite.jpg',null,2,true,1160),
  ('somloi','desert',118,'Găluște Șomloi','Somlói galuska','După o rețetă de casă unică, cu ciocolată belgiană: blat de vanilie și ciocolată însiropat, sos de vanilie, ciocolată, stafide, cremă de ciocolată albă belgiană cu mascarpone, topping caramel','Egyedi házi recept alapján, belga csokoládéval: vaníliás és csokoládés piskóta, vaníliás szósz, csokoládé, mazsola, belga fehér csokoládékrém mascarponéval',29,'350 gr',array['ou','lactoza']::text[],null,false,array['home']::text[],null,'somloi.jpg',null,2,true,1170),
  ('limonada','limonade',null,'Limonadă','Limonádé','Mentă, lămâie','Menta, citrom',27,'400 ml',array[]::text[],null,false,array[]::text[],null,'limonada.jpg',null,2,true,1180),
  ('limonada-soc','limonade',null,'Limonadă cu soc','Bodzás limonádé','Cu sirop de soc, mentă, lămâie','Bodzaszörppel, mentával, citrommal',29,'400 ml',array[]::text[],null,false,array[]::text[],null,'limonada-soc.jpg',null,2,true,1190),
  ('limonada-ghimbir','limonade',null,'Limonadă cu ghimbir și sirop de agave','Gyömbéres limonádé agávésziruppal','Ghimbir, mentă, lămâie, apă minerală','Gyömbér, menta, citrom, ásványvíz',29,'400 ml',array[]::text[],null,false,array[]::text[],null,'limonada-ghimbir.jpg',null,2,true,1200),
  ('limonada-capsuni','limonade',null,'Limonadă cu sirop de căpșuni','Epres limonádé','Sirop de căpșuni presat la rece, mentă, lămâie, apă minerală','Hidegen préselt eperszirup, menta, citrom, ásványvíz',29,'400 ml',array[]::text[],null,false,array[]::text[],null,'limonada-capsuni.jpg',null,2,true,1210),
  ('apple-pie','limonade',null,'Apple Pie','Apple Pie','Suc de mere cu scorțișoară, sirop de alune, zeamă de lămâie','Almalé fahéjjal, mogyorószirup, citromlé',30,'400 ml',array[]::text[],null,false,array[]::text[],null,'apple-pie.jpg','[{"l":"Rece","lh":"Hideg","p":30,"g":"400 ml"},{"l":"Cald","lh":"Meleg","p":30,"g":"400 ml"}]'::jsonb,2,true,1220),
  ('fresh-portocale','limonade',null,'Fresh de portocale','Friss narancslé',null,null,27,'400 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1230),
  ('suc-mere','limonade',null,'Suc de mere 100%','100% almalé','Fără zahăr adăugat','Hozzáadott cukor nélkül',20,'300 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1240),
  ('socata','limonade',null,'Socată artizanală','Kézműves bodzaszörp','100% natural, din floare de soc și lămâie, fermentate cu ajutorul drojdiei','100% természetes, bodzavirágból és citromból, élesztővel erjesztve',23,'330 ml',array[]::text[],null,false,array[]::text[],null,'socata.jpg',null,2,true,1250),
  ('kombucha','limonade',null,'Kombucha 0%','Kombucha 0%','Băutură fermentată, ușor acidulată, din ceai îndulcit','Erjesztett, enyhén szénsavas ital édesített teából',21,'330 ml',array[]::text[],null,false,array[]::text[],null,'kombucha.jpg','[{"l":"Ghimbir","lh":"Gyömbér","p":21,"g":"330 ml"},{"l":"Rodie","lh":"Gránátalma","p":21,"g":"330 ml"},{"l":"Mentă","lh":"Menta","p":21,"g":"330 ml"},{"l":"Miere","lh":"Méz","p":21,"g":"330 ml"}]'::jsonb,2,true,1260),
  ('zeama-varza','limonade',null,'Zeamă de varză','Káposztalé','Tradițională, din fermentarea naturală a verzei albe. Servită rece','Hagyományos, fehér káposzta természetes erjesztéséből. Hidegen',10,'330 ml',array[]::text[],null,false,array[]::text[],null,'zeama-varza.jpg',null,2,true,1270),
  ('bere-ghimbir','limonade',null,'Bere de ghimbir 0%','Gyömbérsör 0%',null,null,23,'375 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1280),
  ('pepsi','racoritoare',null,'Pepsi','Pepsi',null,null,15.5,'250 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1290),
  ('pepsi-twist','racoritoare',null,'Pepsi Twist','Pepsi Twist',null,null,15.5,'250 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1300),
  ('pepsi-max','racoritoare',null,'Pepsi Max','Pepsi Max',null,null,15.5,'250 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1310),
  ('mirinda','racoritoare',null,'Mirinda portocale','Mirinda portocale',null,null,15.5,'250 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1320),
  ('7up','racoritoare',null,'7UP','7UP',null,null,15.5,'255 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1330),
  ('apa-tonica','racoritoare',null,'Apă tonică Evervess','Apă tonică Evervess',null,null,15.5,'250 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1340),
  ('prigat','racoritoare',null,'Prigat','Prigat',null,null,15.5,'250 ml',array[]::text[],null,false,array[]::text[],null,null,'[{"l":"Căpșuni cu banane","lh":"Eper-banán","p":15.5,"g":"250 ml"},{"l":"Portocale","lh":"Narancs","p":15.5,"g":"250 ml"}]'::jsonb,2,true,1350),
  ('aqua-carpatica','racoritoare',null,'Aqua Carpatica','Aqua Carpatica',null,null,15.5,'330 ml',array[]::text[],null,false,array[]::text[],null,null,'[{"l":"Plată","lh":"Szénsavmentes","p":15.5,"g":"330 ml"},{"l":"Minerală","lh":"Szénsavas","p":15.5,"g":"330 ml"}]'::jsonb,2,true,1360),
  ('apa-mathild','racoritoare',null,'Apă Mathild','Apă Mathild','Izvor montan din arie protejată, sodică, bicarbonatată','Védett területről származó hegyi forrásvíz',12,'330 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1370),
  ('red-bull','racoritoare',null,'Red Bull','Red Bull',null,null,15,'250 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1380),
  ('hell','racoritoare',null,'Hell','Hell',null,null,11,'250 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1390),
  ('limoncello-spritz','cocktail',null,'Limoncello Spritz','Limoncello Spritz','Lichior limoncello, prosecco, apă minerală, lămâie','Limoncello likőr, prosecco, ásványvíz, citrom',36,'300 ml',array[]::text[],null,false,array['alc']::text[],null,'limoncello-spritz.jpg',null,2,true,1400),
  ('cuba-libre','cocktail',null,'Cuba Libre','Cuba Libre','Rom Captain Morgan, Pepsi, lime, zahăr brun','Captain Morgan rum, Pepsi, lime, barna cukor',36,'300 ml',array[]::text[],null,false,array['alc']::text[],null,'cuba-libre.jpg',null,2,true,1410),
  ('hugo','cocktail',null,'Hugo','Hugo','Prosecco, sirop de soc, apă minerală, lime, mentă','Prosecco, bodzaszirup, ásványvíz, lime, menta',38,'300 ml',array[]::text[],null,false,array['alc']::text[],null,'hugo.jpg',null,2,true,1420),
  ('campari-orange','cocktail',null,'Campari Orange','Campari Orange','Campari, Prigat portocale','Campari, narancs Prigat',36,'300 ml',array[]::text[],null,false,array['alc']::text[],null,'campari-orange.jpg',null,2,true,1430),
  ('gin-tonic','cocktail',null,'Gin Tonic','Gin Tonic','Gin Wembley, apă tonică, lămâie','Wembley gin, tonik, citrom',36,'300 ml',array[]::text[],null,false,array['alc']::text[],null,'gin-tonic.jpg',null,2,true,1440),
  ('aperol-spritz','cocktail',null,'Aperol Spritz','Aperol Spritz','Aperol, prosecco, apă minerală, portocale','Aperol, prosecco, ásványvíz, narancs',36,'300 ml',array[]::text[],null,false,array['alc']::text[],null,'aperol-spritz.jpg',null,2,true,1450),
  ('virgin-mojito','cocktail',null,'Virgin Mojito','Virgin Mojito','7UP, lime, mentă, gheață. Fără alcool','7UP, lime, menta, jég. Alkoholmentes',33,'300 ml',array[]::text[],null,false,array[]::text[],null,'virgin-mojito.jpg',null,2,true,1460),
  ('savu-feteasca-regala','vin',null,'Fetească Regală · Pivnița Savu','Fetească Regală · Pivnița Savu','Alb demisec 11,8% · DOC-CMD Aiud/Ciumbrud','Félszáraz fehér 11,8% · DOC-CMD Aiud/Ciumbrud',130,'700 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1470),
  ('savu-sauvignon','vin',null,'Sauvignon Blanc · Pivnița Savu','Sauvignon Blanc · Pivnița Savu','Alb sec 12,6% · DOC-CMD Aiud/Ciumbrud','Száraz fehér 12,6% · DOC-CMD Aiud/Ciumbrud',130,'700 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1480),
  ('savu-riesling','vin',null,'Riesling Italian · Pivnița Savu','Riesling Italian · Pivnița Savu','Alb sec 12,1% · DOC-CMD Aiud/Ciumbrud','Száraz fehér 12,1% · DOC-CMD Aiud/Ciumbrud',130,'700 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1490),
  ('savu-traminer','vin',null,'Traminer Rosé · Pivnița Savu','Traminer Rosé · Pivnița Savu','Alb sec 13,4% · DOC-CMD Aiud/Ciumbrud','Száraz fehér 13,4% · DOC-CMD Aiud/Ciumbrud',130,'700 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1500),
  ('savu-chardonnay','vin',null,'Chardonnay Barique · Pivnița Savu','Chardonnay Barique · Pivnița Savu','Alb sec 13,35% · DOC-CMD Aiud/Ciumbrud','Száraz fehér 13,35% · DOC-CMD Aiud/Ciumbrud',130,'700 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1510),
  ('savu-not-noir','vin',null,'Not Noir · Pivnița Savu','Not Noir · Pivnița Savu','Roșu sec Pinot Noir 11,5%','Száraz vörös Pinot Noir 11,5%',150,'700 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1520),
  ('savu-muscat','vin',null,'Muscat Ottonel · Pivnița Savu','Muscat Ottonel · Pivnița Savu','Alb sec 12,5% · DOC-CMD Aiud/Ciumbrud','Száraz fehér 12,5% · DOC-CMD Aiud/Ciumbrud',150,'700 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1530),
  ('savu-apuseniu','vin',null,'Apuseniu Fetească Regală · Pivnița Savu','Apuseniu Fetească Regală · Pivnița Savu','Alb demisec 12,5% · DOC-CMD Aiud/Ciumbrud','Félszáraz fehér 12,5% · DOC-CMD Aiud/Ciumbrud',175,'700 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1540),
  ('savu-pinot-rose','vin',null,'Pinot Noir Rosé Duchess of Transylvania · Pivnița Savu','Pinot Noir Rosé Duchess of Transylvania · Pivnița Savu','Rosé sec 13% · 2023/2024 · DOC-CMD Aiud/Ciumbrud','Száraz rosé 13% · 2023/2024 · DOC-CMD Aiud/Ciumbrud',175,'700 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1550),
  ('pirovano-montepulciano','vin',null,'Montepulciano d''Abruzzo · Pirovano','Montepulciano d''Abruzzo · Pirovano','Roșu sec 12,5%','Száraz vörös 12,5%',105,'700 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1560),
  ('pirovano-primitivo','vin',null,'Primitivo di Manduria · Pirovano','Primitivo di Manduria · Pirovano','Roșu sec 14,5%','Száraz vörös 14,5%',150,'700 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1570),
  ('carpathia-chardonnay','vin',null,'Chardonnay · Domeniile Sâmburești Carpathia','Chardonnay · Domeniile Sâmburești Carpathia','Alb sec 14%','Száraz fehér 14%',137,'750 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1580),
  ('carpathia-rose','vin',null,'Rosé Cabernet Sauvignon & Merlot · Domeniile Sâmburești Carpathia','Rosé Cabernet Sauvignon & Merlot · Domeniile Sâmburești Carpathia','Rosé sec 12,5%, cupaj','Száraz rosé 12,5%, házasítás',137,'750 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1590),
  ('carpathia-feteasca-neagra','vin',null,'Fetească Neagră · Domeniile Sâmburești Carpathia','Fetească Neagră · Domeniile Sâmburești Carpathia','Roșu sec 14,5%','Száraz vörös 14,5%',137,'750 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1600),
  ('pirovano-prosecco','vin',null,'Prosecco · Pirovano','Prosecco · Pirovano','Spumant 12,5%','Pezsgő 12,5%',100,'750 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1610),
  ('prosecco-mic','vin',null,'Prosecco','Prosecco','Spumant 10%','Pezsgő 10%',32,'200 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1620),
  ('vin-fiert','vin',null,'Vin fiert cu scorțișoară','Vin fiert cu scorțișoară','Servit cald','Melegen',36,'200 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1630),
  ('strongbow','bere',null,'Strongbow','Strongbow cider','Cidru 4,5%','Cider 4,5%',22,'330 ml',array[]::text[],null,false,array['alc']::text[],null,null,'[{"l":"Mere","lh":"Alma","p":22,"g":"330 ml"},{"l":"Fructe de pădure","lh":"Erdei gyümölcs","p":22,"g":"330 ml"}]'::jsonb,2,true,1640),
  ('silva-dark','bere',null,'Silva Strong Dark Lager','Silva Strong Dark Lager','7%','7%',22,'500 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1650),
  ('azuga','bere',null,'Azuga nefiltrată','Azuga szűretlen','5,3%','5,3%',25,'500 ml',array[]::text[],null,false,array['alc']::text[],null,null,null,2,true,1660),
  ('heineken','bere',null,'Heineken','Heineken','5%','5%',16,'330 ml',array[]::text[],null,false,array['alc']::text[],null,null,'[{"l":"330 ml","lh":"330 ml","p":16,"g":"330 ml"},{"l":"400 ml","lh":"400 ml","p":19,"g":"400 ml"}]'::jsonb,2,true,1670),
  ('moretti','bere',null,'Birra Moretti','Birra Moretti','4,6%','4,6%',15,'330 ml',array[]::text[],null,false,array['alc']::text[],null,'moretti.jpg','[{"l":"330 ml","lh":"330 ml","p":15,"g":"330 ml"},{"l":"500 ml","lh":"500 ml","p":16,"g":"500 ml"}]'::jsonb,2,true,1680),
  ('ciuc','bere',null,'Ciuc Premium Lager','Ciuc Premium Lager','5%','5%',15,'330 ml',array[]::text[],null,false,array['alc']::text[],null,null,'[{"l":"330 ml","lh":"330 ml","p":15,"g":"330 ml"},{"l":"500 ml","lh":"500 ml","p":16,"g":"500 ml"}]'::jsonb,2,true,1690),
  ('noah-poet','bere',null,'Noah Poet','Noah Poet','Bere artizanală din Târgu Mureș','Kézműves sör Marosvásárhelyről',29,'330 ml',array[]::text[],null,false,array['alc']::text[],null,'noah-poet.jpg',null,2,true,1700),
  ('heineken-0','bere',null,'Heineken 0%','Heineken 0%','Fără alcool','Alkoholmentes',19,'330 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1710),
  ('ciuc-radler-0','bere',null,'Ciuc Radler 0%','Ciuc Radler 0%','Fără alcool','Alkoholmentes',17,'330 ml',array[]::text[],null,false,array[]::text[],null,null,'[{"l":"Lămâie și lime","lh":"Citrom és lime","p":17,"g":"330 ml"},{"l":"Zmeură și lămâie","lh":"Málna és citrom","p":17,"g":"330 ml"}]'::jsonb,2,true,1720),
  ('moretti-0','bere',null,'Birra Moretti 0%','Birra Moretti 0%','Fără alcool','Alkoholmentes',15,'330 ml',array[]::text[],null,false,array[]::text[],null,null,null,2,true,1730)
on conflict (id) do update set category_id = excluded.category_id, num = excluded.num, name_ro = excluded.name_ro, name_hu = excluded.name_hu, desc_ro = excluded.desc_ro, desc_hu = excluded.desc_hu, price = excluded.price, grams = excluded.grams, allergens = excluded.allergens, meat = excluded.meat, hot = excluded.hot, tags = excluded.tags, wine = excluded.wine, image = excluded.image, variants = excluded.variants, packaging = excluded.packaging, active = excluded.active, sort = excluded.sort, updated_at = now();
commit;
