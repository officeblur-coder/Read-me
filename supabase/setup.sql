-- Lyra Comenzi: fișier unic de instalare. Supabase → SQL Editor → New query → lipiți tot → Run.

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
  insert into public.customers(id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Plasare comandă. Prețurile se calculează AICI, din meniu, nu se acceptă de la browser.
-- p: { name, phone, email, address, mode, payment, note, code, use_points, source,
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
begin
  select * into s from public.settings where id = 1;
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
    vi := null; vlabel := null; grams := it.grams; unit := it.price;
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
        if found then ex_arr := ex_arr || jsonb_build_object('id', ex.id, 'name', ex.name_ro, 'price', 0); end if;
      end loop;
    else
      for ex_id in select jsonb_array_elements_text(coalesce(line->'extras','[]')) loop
        select * into ex from public.items where id = ex_id and active and available;
        if found then
          unit := unit + ex.price;
          ex_arr := ex_arr || jsonb_build_object('id', ex.id, 'name', ex.name_ro, 'price', ex.price);
        end if;
      end loop;
    end if;
    sub := sub + unit * qty;
    lines := lines || jsonb_build_object(
      'id', it.id, 'name', it.name_ro, 'qty', qty, 'unit', unit, 'variant', vlabel, 'vi', vi,
      'grams', grams, 'hot', it.hot, 'allergens', to_jsonb(it.allergens), 'category', it.category_id,
      'extras', ex_arr, 'note', left(coalesce(line->>'note',''), 200),
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

  -- cadou Lyra Club (a 6-a stea)
  if cust.id is not null and cust.free_gift and s.gift_item_id is not null then
    select * into it from public.items where id = s.gift_item_id;
    if found then
      lines := lines || jsonb_build_object('id', it.id, 'name', it.name_ro, 'qty', 1, 'unit', 0, 'gift', true,
        'grams', it.grams, 'allergens', to_jsonb(it.allergens), 'category', it.category_id, 'extras', '[]'::jsonb, 'note', '');
      update public.customers set free_gift = false where id = cust.id;
    end if;
  end if;

  -- livrare
  if v_mode = 'livrare' and sub < s.free_delivery_over and not (cust.id is not null and cust.lifetime >= 1500) then
    fee := s.delivery_fee;
  end if;

  -- puncte: 100 puncte = 10 lei, maxim 50% din comandă
  if cust.id is not null and coalesce((p->>'use_points')::boolean, false) then
    pts_val := least(floor(cust.points / 100.0) * 10, floor((sub - disc) * 0.5 / 10) * 10);
    if pts_val > 0 then update public.customers set points = points - (pts_val * 10)::int where id = cust.id; end if;
  end if;

  total := greatest(sub - disc - pts_val + fee, 0);
  earn  := floor(total * s.points_per_leu * public.tier_mult(coalesce(cust.lifetime, 0)));

  insert into public.orders(customer_id, name, phone, email, address, mode, payment, note, items, allergies,
    subtotal, discount, discount_label, points_used, points_value, delivery_fee, total, points_earned, source)
  values (cust.id, left(trim(p->>'name'),80), left(trim(p->>'phone'),30), coalesce(nullif(trim(p->>'email'),''), cust.email),
    case when v_mode = 'livrare' then left(trim(p->>'address'),200) else 'Ridicare din restaurant' end,
    v_mode, coalesce(p->>'payment','card'), left(p->>'note',300), lines, allg,
    sub, disc, disc_lbl, (pts_val*10)::int, pts_val, fee, total, earn, left(p->>'source',30))
  returning * into o;

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
           o.points_value, o.delivery_fee, o.total, o.points_earned, o.eta_min, o.created_at,
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

-- Puncte, stele și cadou se acordă o singură dată, când comanda devine „livrată”.
create or replace function public.on_order_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.settings;
begin
  if new.status = 'prep' and old.status = 'new' and new.accepted_at is null then new.accepted_at := now(); end if;
  if new.status = 'road' and new.road_at is null then new.road_at := now(); end if;
  if new.status = 'done' and new.done_at is null then new.done_at := now(); end if;
  if new.status = 'rejected' and old.status <> 'rejected' and old.points_used > 0 and old.customer_id is not null then
    update public.customers set points = points + old.points_used where id = old.customer_id;
  end if;
  if new.status = 'done' and not old.credited and new.customer_id is not null then
    select * into s from public.settings where id = 1;
    update public.customers c set
      points = c.points + new.points_earned,
      lifetime = c.lifetime + new.points_earned,
      orders_count = c.orders_count + 1,
      spent = c.spent + new.total,
      stars = case when c.stars + 1 >= s.stars_for_gift then 0 else c.stars + 1 end,
      free_gift = c.free_gift or (c.stars + 1 >= s.stars_for_gift)
    where c.id = new.customer_id;
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


-- Meniul Lyra (generat automat din lyra/data/menu.js). Nu suprascrie modificările făcute în admin.
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
  ('desert','Desert','Desszert',null,null,210)
on conflict (id) do nothing;
insert into public.items(id,category_id,num,name_ro,name_hu,desc_ro,desc_hu,price,grams,allergens,meat,hot,tags,wine,image,variants,sort) values
  ('duo-vinete','antreuri',1,'Duo de vinete și zacuscă cu focaccia home made','Padlizsánkrém és zakuszka házi készítésű focacciával','Salată de vinete și zacuscă, servite cu focaccia făcută în casă','Padlizsánkrém és zakuszka, házi focacciával',36,'100/100/30/100 gr',array['gluten','ou']::text[],null,false,array['veg','home']::text[],'Fetească Regală Pivnița Savu','duo-vinete.jpg',null,10),
  ('pita-carbune','antreuri',2,'Pită prăjită la cuptor pe cărbune','Sütőben sült pirított kenyér szénen','Cu slană și brânză de burduf, ceapă','Szalonnával és juhtúróval, hagymával',27,'100/100/50/30 gr',array['gluten','lactoza']::text[],'porc',true,array['coal']::text[],null,'pita-carbune.jpg',null,20),
  ('gustare','antreuri',3,'Gustare țărănească','Paraszti falatok','Cârnați uscați, jumări, brânză de burduf, slănină, ceapă, roșii, castraveți','Száraz kolbász, tepertő, juhtúró, szalonna, hagyma, paradicsom, uborka',39,'40/40/60/40/60/60 gr',array['lactoza','gluten']::text[],'porc',false,array[]::text[],null,'gustare.jpg',null,30),
  ('focaccia-untura','antreuri',4,'Focaccia cu untură, ceapă și gem de ardei iute','Focaccia zsírral, hagymával és erőspaprika-krémmel','Focaccia făcută în casă, untură, ceapă, gem de ardei iute','Házi focaccia, zsír, hagyma, erőspaprika-krém',25,'100 gr',array['gluten']::text[],null,false,array['home']::text[],null,'focaccia-untura.jpg',null,40),
  ('platou-branzeturi','antreuri',5,'Platou brânzeturi','Sajttál','Brânză maturată cu busuioc, brânză maturată cu trufe, Floare de Colț (Camembert), brânză maturată Apuseni, brânză dură tip parmezan','Érlelt sajt bazsalikommal, érlelt sajt szarvasgombával, Floare de Colț (camembert), érlelt Apuseni sajt, parmezán jellegű kemény sajt',42,'25/25/25/25 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,'platou-branzeturi.jpg',null,50),
  ('bruschete','dejun',6,'Bruschete țărănești','Paraszti bruschetta','Cu ou ochi, cartofi prăjiți și telemea, brânză de burduf, slănină, ceapă','Tükörtojással, sült burgonyával és juhtúróval',45,'100/30/150 gr',array['gluten','ou']::text[],'porc',true,array[]::text[],null,'bruschete.jpg',null,60),
  ('english','dejun',7,'Mic dejun englezesc','Angol reggeli','Cârnăciori cu cașcaval, ochiuri, guanciale, fasole în sos tomat, focaccia făcută în casă','Kolbászkák sajttal, tükörtojás, guanciale, babos paradicsomszósz, focaccia',47,'50/100/100/100/50 gr',array['gluten','ou']::text[],'porc',true,array[]::text[],null,'english.jpg',null,70),
  ('omleta','dejun',8,'Omletă cu șuncă și cașcaval','Sonkával és sajttal rántotta','Ouă, șuncă, cașcaval','Tojás, sonka, sajt',35,'300 gr',array['lactoza','ou']::text[],null,true,array[]::text[],null,'omleta.jpg',null,80),
  ('spanac','dejun',9,'Spanac cu ochiuri','Spenótfőzelék tükörtojással','Ouă, spanac, usturoi, cremă de gătit vegetală','Tojás, spenót, fokhagyma, növényi főzőkrém',38,'200/100 gr',array['ou']::text[],null,true,array['veg']::text[],null,'spanac.jpg',null,90),
  ('oua-posate','dejun',10,'Ouă poșate cu salată','Posírozott tojás salátával','Mix salată, cremă de avocado, conopidă, rodie, sparanghel, dressing miere','Salátamix, avokádókrém, karfiol, gránátalma, spárga, mézes öntet',43,'300 gr',array['lactoza','ou']::text[],null,false,array['veg']::text[],null,'oua-posate.jpg',null,100),
  ('paine-ou','dejun',8,'Pâine cu ou','Bundás kenyér',null,null,35,'300 gr',array['lactoza','ou']::text[],null,false,array['veg']::text[],null,'paine-ou.jpg',null,110),
  ('antricot','nou',11,'Antricot de vită la grătar','Grillezett marha hátszín (entrecôte)','Alături de cartofi copți în coajă și rozmarin','Héjában sült burgonyával és rozmaringgal',145,'200/250 gr',array['lactoza']::text[],'vita',true,array['garn']::text[],null,'antricot.jpg',null,120),
  ('muschi','nou',12,'Mușchi de vită cu sos de piper','Marhabélszín borsmártással','Piper murat, frișcă de gătit și piure de cartofi','Savanyított borssal, főzőtejszínnel és burgonyapürével',165,'160/150/100 gr',array['lactoza']::text[],'vita',false,array['garn']::text[],null,'muschi.jpg',null,130),
  ('tocanita','nou',13,'Tocăniță de vițel cu găluște','Borjúpörkölt galuskával','Pulpă de vită Black Angus, legume, paste','Black Angus marhapecsenye, zöldségek, tészta',66,'250/150 gr',array['gluten','ou','telina']::text[],'vita',true,array['angus']::text[],null,'tocanita.jpg',null,140),
  ('platou-lyra','platouri',17,'Platou à la Lyra · 2–3 persoane','Vegyes tál Lyra módra · 2–3 személyre','Ceafă de porc, cârnați de porc, costițe de porc, pulpă de porc, slănină, ciolan, piure de cartofi, cartofi în coajă cu parmezan, murături asortate, sos usturoi, sosul casei','Sertésnyak, sertéskolbász, sertésoldalas, sertéscomb, szalonna, csülök, burgonyapüré, héjas burgonya parmezánnal, vegyes savanyúság, fokhagymás szósz, házi szósz',290,'160/150/160/250/240/250/240/100/200/90/90 gr',array['ou','mustar','lactoza']::text[],'porc',true,array['share']::text[],null,'platou-lyra.jpg',null,150),
  ('platou-pui','platouri',18,'Platou de pui asortat · 2–3 persoane','Szárnyas vegyes tál · 2–3 személyre','Aripioare de pui, crispy de pui, cordon bleu, șnițel Palermo, rondele de ceapă, cartofi copți în coajă, crochete din mozzarella, sosul casei, usturoi, murătură asortată','Csirkeszárnyak, csirkegrill, cordon bleu, Palermo szelet, hagymakarikák, héjában sült krumpli, mozzarella krokettek, házi szósz, fokhagyma, vegyes savanyúság',270,'600/500/90/60/90 gr',array['gluten','ou','telina','lactoza']::text[],'pui',true,array['share']::text[],null,'platou-pui.jpg',null,160),
  ('ciolan-varza','specialitati',15,'Ciolan fraged pe pat de varză roșie călită','Puha csülök vöröskáposzta ágyon','Ciolan, varză, frișcă de gătit','Csülök, káposzta, főzőtejszín',85,'600/250/100 gr',array['lactoza','seminte']::text[],'porc',false,array[]::text[],null,'ciolan-varza.jpg',null,170),
  ('iahnie-ciolan','specialitati',16,'Iahnie de fasole cu ciolan afumat','Babfőzelék füstölt csülökkel','Și ardei iute','És csípős paprikával',69,'350/200 gr',array['gluten']::text[],'porc',true,array[]::text[],null,'iahnie-ciolan.jpg',null,180),
  ('sarmale','specialitati',19,'Sarmale cu ciolan și mămăliguță prăjită','Töltött káposzta füstölt csülökkel és pirított puliszkával','Sarmale, ciolan de porc, ardei iute, smântână','Töltött káposzta, sertéscsülök, csípős paprika, tejföl',60,'400/100/90/45 gr',array['lactoza']::text[],'porc',true,array['casa']::text[],null,'sarmale.jpg',null,190),
  ('fasii-carnuri','specialitati',20,'Fâșii de cărnuri mixte ușor picante','Vegyes húscsíkok krumplival','Piept de pui, mușchi de porc, înăbușite în legume (ceapă, usturoi, ardei gras, ciuperci), cartofi de casă copți în coajă și prăjiți cu ceapă și slănină','Csirke, sertés, zöldséges ágyban párolva (hagyma, fokhagyma, paprika, gomba), majd szalonnás, hagymás burgonyával tálalva',63,'100/100/100/250 gr',array['soia']::text[],'porc',true,array['garn','spicy']::text[],null,'fasii-carnuri.jpg',null,200),
  ('costite','specialitati',21,'Costițe Lyra fragede afumate cu sos BBQ','Lyra omlós, füstölt sertésoldalas BBQ szósszal','Cu cartofi copți cu usturoi','Fokhagymás sült burgonyával',79,'300/150/100/40 gr',array['gluten']::text[],'porc',true,array['garn','casa','smoker']::text[],null,'costite.jpg',null,210),
  ('ceafa-afumata','specialitati',22,'Felie de ceafă afumată','Füstölt tarjaszeletek','Gătită lent la temperatură joasă pentru păstrarea frăgezimii, cu piure de cartofi și sos brun','Alacsony hőmérsékleten, lassan főzve a porhanyósság megőrzéséért; krumplipüré, barna szósz',57,'180/150/50 gr',array['telina','ou','lactoza']::text[],'porc',true,array['garn','casa','smoker']::text[],null,'ceafa-afumata.jpg',null,220),
  ('pulled-pork','specialitati',23,'Pulled pork în cartof copt','Pulled pork sült krumpliban','În cartof copt cu cașcaval și salată coleslaw, porumb; spată de porc gătită la foc lent în stil BBQ','Sült krumpli sajttal és coleslaw saláta, kukorica; lassú tűzön főtt sertés BBQ stílusban',47,'300/100 gr',array['telina','ou','lactoza']::text[],'porc',true,array['smoker']::text[],null,'pulled-pork.jpg',null,230),
  ('pulpa-smoker','specialitati',24,'Pulpă Pork Smoker cu piure de cartofi','Smokerben füstölt sertéscomb burgonyapürével','Servită cu varză murată de casă; pulpă de porc gătită la foc lent în stil BBQ, piper, guanciale','Házi savanyú káposztával; lassan sült sertéscomb BBQ stílusban, bors, guanciale',59,'200/150 gr',array['lactoza']::text[],'porc',true,array['garn','smoker']::text[],null,'pulpa-smoker.jpg',null,240),
  ('double-smash','smash',null,'Double Smash','Double Smash','2 × 60 g carne de vită, castraveți murați, brânză cheddar, sos burger, ceapă, unt, salată iceberg','2 × 60 g marhahús, csemegeuborka, cheddar, burger szósz, hagyma, vaj, jégsaláta',35,'2 × 60 g vită',array['gluten','lactoza']::text[],'vita',false,array['new']::text[],null,'double-smash.jpg',null,250),
  ('spicy-smash','smash',null,'Spicy Smash','Spicy Smash','2 × 60 g carne de vită, castraveți murați, brânză cheddar, sos Vifon, jalapeño, unt, ceapă, salată iceberg','2 × 60 g marhahús, csemegeuborka, cheddar, Vifon szósz, jalapeño, vaj, hagyma, jégsaláta',35,'2 × 60 g vită',array['gluten','lactoza']::text[],'vita',false,array['new','spicy']::text[],null,'spicy-smash.jpg',null,260),
  ('smash','smash',null,'Smash Burger','Smash Burger','1 × 60 g carne de vită, brânză cheddar, castraveți murați, sos burger, ceapă, unt, salată iceberg','1 × 60 g marhahús, cheddar, csemegeuborka, burger szósz, hagyma, vaj, jégsaláta',25,'1 × 60 g vită',array['gluten','lactoza']::text[],'vita',false,array['new']::text[],null,'smash.jpg',null,270),
  ('special-fries','smash',null,'Special Fries','Special Fries','Cartofi pai, brânză cheddar, bacon crocant, sos burger, chives (arpagic verde)','Hasábburgonya, cheddar, ropogós bacon, burger szósz, metélőhagyma',21,'200 gr',array['lactoza']::text[],'porc',false,array[]::text[],null,'special-fries.jpg',null,280),
  ('chicken-burger','burger',25,'Meniu Chicken Burger','Chicken Burger menü','Chiflă, dulceață de ceapă, salată iceberg, chiftea din pui 80%, slănină de porc 20%, brânză cheddar, sos burger, cartofi prăjiți și sosul casei, parmezan',null,56,'80 chiflă, 120 chiftea, 90 ingrediente, 150 cartofi, 40 sos gr',array['gluten','lactoza']::text[],'pui',false,array[]::text[],null,'chicken-burger.jpg',null,290),
  ('ozn-pulled','burger',26,'Meniu OZN Pulled Pork','OZN Pulled Pork menü','Chiflă, spată de porc, cașcaval, salată coleslaw, sos BBQ, cartofi prăjiți și sosul casei, parmezan',null,49.5,'80 chiflă, 120 pulled porc, 120 ingrediente, 150 cartofi, 40 sos gr',array['mustar','gluten','lactoza']::text[],'porc',false,array[]::text[],null,'ozn-pulled.jpg',null,300),
  ('crispy-burger','burger',27,'Meniu Crispy Burger','Crispy Burger menü','Crispy de pui de casă, cașcaval, salată, sos burger, cartofi prăjiți și sosul casei, parmezan',null,48.5,'80 chiflă, 100 crispy, 90 ingrediente, 150 cartofi, 40 sos gr',array['gluten','lactoza']::text[],'pui',false,array[]::text[],null,'crispy-burger.jpg',null,310),
  ('eleven-burger','burger',28,'Meniu Eleven Burger','Eleven Burger menü','Chiflă, dulceață de ceapă, salată iceberg, chiftea din vită Black Angus, brânză cheddar, bacon, sos burger, cartofi prăjiți și sosul casei, parmezan',null,64.5,'80 chiflă, 100 chiftea, 90 ingrediente, 150 cartofi, 40 sos gr',array['gluten','lactoza']::text[],'vita',false,array['angus']::text[],null,'eleven-burger.jpg',null,320),
  ('burger-ozn','burger',29,'Burger OZN','OZN Burger','Chiftea Black Angus, salată iceberg, roșii, ceapă, sos burger, parmezan, cartofi, sos brânzeturi',null,60,'80/100/70/150/100 gr',array['gluten','lactoza']::text[],'vita',false,array['angus']::text[],null,'burger-ozn.jpg',null,330),
  ('veggie-ozn','burger',30,'Meniu Veggie Burger OZN','Veggie OZN Burger menü','Chiflă, brânză cheddar, salată iceberg, ceapă caramelizată, legume, chiftea veggie, ciuperci, cartofi prăjiți și sosul casei, parmezan',null,64,'80 chiflă, 100 chiftea veggie, 90 ingrediente, 150 cartofi, 40 sos gr',array['mustar','gluten','lactoza']::text[],null,false,array['veg']::text[],'Sauvignon Blanc Pivnița Savu','veggie-ozn.jpg',null,340),
  ('supa-crema','supe',31,'Supă cremă de legume','Zöldségkrémleves','Crutoane de pâine, morcovi, țelină, mazăre, cartofi, roșii, varză, cremă de gătit','Zsemlekockákkal, sárgarépa, zeller, zöldborsó, krumpli, paradicsom, káposzta',29,'400/30 gr',array['mustar','gluten','lactoza']::text[],null,false,array['veg']::text[],'Sauvignon Blanc Pivnița Savu','supa-crema.jpg','[{"l":"Porție întreagă","lh":"Egész adag","p":29,"g":"400/30 gr"},{"l":"Porție medie","lh":"Közepes adag","p":22,"g":"200/15 gr"}]'::jsonb,350),
  ('ciorba-legume-supe','supe',32,'Ciorbă de legume','Zöldségleves','Cu morcovi, țelină, mazăre, cartofi, roșii, varză','Sárgarépa, zeller, borsó, burgonya, paradicsom, káposzta',29,'400 gr',array['telina']::text[],null,false,array['veg']::text[],null,'ciorba-legume2.jpg','[{"l":"Porție întreagă","lh":"Egész adag","p":29,"g":"400 gr"},{"l":"Porție medie","lh":"Közepes adag","p":22,"g":"200 gr"}]'::jsonb,360),
  ('supa-pui','supe',33,'Supă de pui cu tăiței','Tyúkhúsleves','Carne de pui, paste (fidea cu ou), morcov','Csirke, laska (tojásos metélt), sárgarépa',29,'350/50 gr',array['gluten','telina','ou']::text[],'pui',false,array[]::text[],null,'supa-pui.jpg','[{"l":"Porție întreagă","lh":"Egész adag","p":29,"g":"350/50 gr"},{"l":"Porție medie","lh":"Közepes adag","p":18,"g":"175/25 gr"}]'::jsonb,370),
  ('ciorba-vita','supe',34,'Ciorbă de legume și carne de vită','Zöldségleves marhahússal','Carne de vită, morcovi, țelină, mazăre, cartofi, roșii, varză, conopidă','Marhahús, sárgarépa, zeller, borsó, burgonya, paradicsom, káposzta, karfiol',34,'350/50 gr',array['telina']::text[],'vita',false,array[]::text[],null,'ciorba-vita.jpg','[{"l":"Porție întreagă","lh":"Egész adag","p":34,"g":"350/50 gr"},{"l":"Porție medie","lh":"Közepes adag","p":23,"g":"175/25 gr"}]'::jsonb,380),
  ('ciorba-fasole-ciolan','supe',35,'Ciorbă de fasole cu ciolan afumat','Bableves füstölt csülökkel','Cu ciolan de porc afumat','Füstölt sertéscsülökkel',32,'350/50 gr',array['lactoza','telina']::text[],'porc',false,array[]::text[],null,'ciorba-fasole-ciolan.jpg','[{"l":"Porție întreagă","lh":"Egész adag","p":32,"g":"350/50 gr"},{"l":"Porție medie","lh":"Közepes adag","p":23,"g":"175/25 gr"}]'::jsonb,390),
  ('supa-salata','supe',36,'Supă de salată verde cu mămăliguță','Zöldsalátaleves puliszkával','Brânză de burduf, slănină, smântână, franjuri de omletă','Juhtúró, szalonna, tejszín, omlettcsíkok',54,'400/300/70/30 gr',array['gluten','lactoza']::text[],'porc',false,array['casa']::text[],null,'supa-salata.jpg',null,400),
  ('ciorba-pita-ciolan','supe',37,'Ciorbă de fasole în pită prăjită','Bableves pirított kenyércipóban','Cu ciolan de porc afumat și ceapă roșie','Sertéscsülökkel, piros hagymával',39.5,'350/60/50 gr',array['gluten','lactoza','telina']::text[],'porc',false,array[]::text[],null,'fasole-pita2.jpg',null,410),
  ('gulas','supe',38,'Supă gulaș','Gulyásleves','Cu carne de vită, cartofi, găluște și ardei iute','Marhahússal, burgonyával, galuskával és csípős paprikával',39,'300/70 gr',array['lactoza','ou']::text[],'vita',false,array['spicy']::text[],null,'gulas.jpg',null,420),
  ('burta','supe',39,'Ciorbă de burtă','Pacalleves','Ou, burtă, lezon, supă de oase · rețetă proprie','Tojás, pacal, habarcs, csontleves · saját recept',34,'300/120 gr',array['ou','lactoza']::text[],'vita',false,array['casa']::text[],null,'burta.jpg',null,430),
  ('lascute','supe',40,'Ciorbă de lășcuțe cu ciolan','Csipetkés leves csülökkel','Legume, lășcuțe, smântână, ou, ciolan, tarhon și ardei iute','Zöldségekkel, laskatésztával, tejföllel, tojással, füstölt csülökkel, tárkonnyal és csípős paprikával',27,'400 ml/50 gr',array['ou','lactoza']::text[],'porc',false,array[]::text[],null,'lascute.jpg',null,440),
  ('ciolan-lyra','porc',41,'Ciolan à la Lyra cu cartofi petală și cașcaval','Csülök Lyra módra','Servit pe pat de cartofi cu cașcaval, sos de hrean cu usturoi, cremă de gătit, smântână','Sajtos burgonyaágyon tálalva, fokhagymás tormamártással, főzőtejszínnel és tejföllel',55,'180/110/50 gr',array['gluten','mustar','soia','ou','lactoza','telina']::text[],'porc',true,array['garn','casa']::text[],null,'ciolan-lyra.jpg',null,450),
  ('ceafa-tiganeasca','porc',42,'Ceafă țigănească fragedă și cartofi Lyra','Omlós cigánypecsenye tarja és Lyra burgonya','Ceafă de porc, mujdeiul casei, boia, slănină prăjită, cartofi cu usturoi și cașcaval','Sertéstarja házi fokhagymamártással, pirospaprikával, sült szalonnával, fokhagymás-sajtos burgonyával',68,'170/250/45/75 gr',array['lactoza']::text[],'porc',true,array['coal','garn']::text[],null,'ceafa-tiganeasca.jpg',null,460),
  ('carne-garnita','porc',43,'Carne la garniță','Omlós sertéshúsdarabok','Prăjită lent în untură, usturoi, gust autentic de odinioară: ceafă de porc, ciolan de porc, cârnați de porc, usturoi, untură condimentată, mămăliguță prăjită, ochi, telemea','Lassan, zsírban és fokhagymával sütve, a régi idők igazi íze: sertésnyak, sertéscsülök, sertéskolbász, fokhagyma, fűszeres zsír, sült puliszka, tükörtojás, túró',63,'220/150/50 gr',array['gluten','mustar']::text[],'porc',true,array['casa']::text[],null,'carne-garnita.jpg',null,470),
  ('mititei','porc',44,'Mititei cu muștar · bucata','Miccs mustárral · darab','Preț pe bucată, cu muștar','Darabár, mustárral',9.5,'1 buc / 70/20 gr',array['gluten','mustar']::text[],'porc',false,array[]::text[],null,'mititei.jpg',null,480),
  ('mix-grill','porc',45,'Mix grill Lyra','Mix grill Lyra','2 mititei, 1 ceafă de porc, cartofi prăjiți cu usturoi și cașcaval','2 miccs, 1 szelet sertéstarja, hasábburgonya fokhagymával és sajttal',49,'350 gr',array['gluten','mustar']::text[],'porc',false,array['garn']::text[],null,'mix-grill.jpg',null,490),
  ('snitel-lyra','porc',48,'Șnițel Lyra din cotlet','Lyra karaj szelet','Cotlet de porc, sos ciuperci, cașcaval, cheddar, șuncă, smântână vegetală, ou','Sertéstarja, gombás szósz, cheddar, sajt, sonka, növényi tejszín',57,'350 gr',array['lactoza','ciuperci','ou']::text[],'porc',true,array[]::text[],'Chardonnay Barrique Pivnița Savu','snitel-lyra.jpg',null,500),
  ('fasole-batuta','ardeal',46,'Fasole bătută cu cârnați de casă','Tört bab házi kolbásszal','Prăjiți în untură și ceapă călită','Zsírban sütve, pirított hagymával',59,'250/150 gr',array['gluten','soia','lactoza']::text[],'porc',true,array[]::text[],null,'fasole-batuta.jpg',null,510),
  ('papricas','ardeal',47,'Papricaș de pui cu mămăliguță prăjită','Csirkepaprikás puliszkával','Pulpă de pui, ceapă, ardei, cremă vegetală pentru gătit','Csirkecomb, hagyma, paprika, főzéshez növényi krém',45,'300/130 gr',array['gluten','ou','telina']::text[],'pui',true,array[]::text[],null,'papricas.jpg',null,520),
  ('ficatei','ardeal',49,'Ficăței la tigaie rumeniți cu dulceață de ceapă','Serpenyőben pirított csirkemáj hagymalekvárral',null,null,47,'250/130 gr',array['gluten']::text[],'pui',true,array[]::text[],null,'ficatei.jpg',null,530),
  ('piept-lyra','pui',50,'Piept de pui à la Lyra','Csirkemell Lyra módra','Piept de pui la grătar, ciuperci, șuncă de pui, cașcaval cheddar, cremă de gătit','Csirkemell, gomba, sonka, sajt, cheddar sajt, főzőkrém',39,'80/100/40/40 gr',array['gluten','mustar','soia','lactoza','telina']::text[],'pui',true,array['nogarn']::text[],'Fetească Regală Pivnița Savu','piept-lyra.jpg',null,540),
  ('borzas','pui',51,'Borzaș','Borzás','Piept de pui, cartofi răzuiți, ou, usturoi, smântână, sos de usturoi','Csirkemell, reszelt burgonya, tojás, fokhagyma, tejföl, fokhagymás szósz',49,'300 gr',array['ou','lactoza','telina']::text[],'pui',false,array[]::text[],'Fetească Regală Pivnița Savu','borzas.jpg','[{"l":"Porție întreagă","lh":"Egész adag","p":49,"g":"300 gr"},{"l":"Porție medie","lh":"Közepes adag","p":32,"g":"200 gr"}]'::jsonb,550),
  ('cordon-bleu','pui',52,'Cordon bleu cu cartofi à la Lyra','Cordon bleu burgonyával à la Lyra','Șuncă de pui, cașcaval, cartofi cu usturoi, ou','Sajt, sonka, fokhagymás burgonya és sajt',49,'150/250 gr',array['ou','soia','mustar','gluten','lactoza','telina']::text[],'pui',true,array['garn']::text[],'Fetească Regală Pivnița Savu','cordon-bleu.jpg',null,560),
  ('salata-pui','pui',53,'Salată cu piept de pui','Csirkemell saláta','Mix salată, sparanghel, conopidă crocantă, rodie, cremă de avocado, dressing miere, piept de pui','Salátakeverék, spárga, ropogós karfiol, gránátalma, avokádókrém, mézes öntet, csirkemell',52,'150/80/30 gr',array['soia','ou','seminte']::text[],'pui',false,array[]::text[],'Fetească Regală Pivnița Savu','salata-pui.jpg',null,570),
  ('crispy-pui','pui',54,'Crispy de pui cu cartofi prăjiți','Ropogós csirke sült burgonyával','Piept de pui, fulgi de porumb, sos de usturoi, parmezan, iaurt','Csirkemell, kukoricapehely, fokhagymás szósz, parmezán',42,'300/150/90 gr',array['gluten','lactoza']::text[],'pui',false,array['casa','garn']::text[],'Chardonnay Barrique Pivnița Savu','crispy-pui.jpg',null,580),
  ('piept-carbune','pui',55,'Piept de pui la foc de cărbune','Csirkemell faszénen sütve','Piept de pui gătit în cuptorul pe cărbune','Faszenes kemencében sült csirkemell',36,'100/200 gr',array['mustar','telina']::text[],'pui',true,array['coal','nogarn']::text[],'Fetească Regală Pivnița Savu','piept-carbune.jpg',null,590),
  ('piept-vienez','pui',56,'Piept de pui vienez','Bécsi szelet csirkemellből','Piept de pui, făină, ou, pesmet panko','Csirkemell, tojás, prézli',39,'230 gr',array['gluten','lactoza']::text[],'pui',false,array['nogarn']::text[],null,'piept-vienez.jpg',null,600),
  ('piept-palermo','pui',57,'Piept de pui Palermo','Palermói csirkemell','Piept de pui, ouă, cașcaval','Csirkemell, tojás, sajt',46,'300 gr',array['gluten','mustar','ou','lactoza','telina']::text[],'pui',false,array['nogarn']::text[],null,'piept-palermo.jpg',null,610),
  ('pastrav','peste',58,'Păstrăv proaspăt din Munții Călimani','Friss pisztráng a Kelemen-havasokból','Gătit la foc de cărbune, simplu, pentru a păstra gustul autentic de munte, cu mămăliguță prăjită și mujdeiul casei','Faszénen sütve, egyszerűen, a hegyek hamisítatlan ízéért, pirított puliszkával és házi fokhagymamártással',65,'190/150/45 gr',array['mustar','peste']::text[],'peste',true,array['coal','garn']::text[],null,'pastrav.jpg',null,620),
  ('biban','peste',59,'File de biban pane','Rántott süllőfilé','Cu cartofi petale și sosul casei','Sziromburgonyával és házi szósszal',63,'120/250/100 gr',array['gluten','peste']::text[],'peste',false,array['garn']::text[],null,'biban.jpg',null,630),
  ('carbonara','paste',60,'Penne Carbonara','Carbonara penne','Guanciale, ou, parmezan, cremă de gătit','Guanciale, tojás, főzőtejszín, parmezán',46,'250/50/50/30 gr',array['gluten','ou','telina']::text[],'porc',false,array[]::text[],null,'carbonara.jpg',null,640),
  ('bolognese','paste',61,'Penne Bolognese','Bolognai penne','Carne de vită tocată, legume, parmezan','Darált marhahús, zöldség, parmezán',46,'250/120/30 gr',array['gluten','ou','telina']::text[],'vita',false,array[]::text[],null,'bolognese.jpg',null,650),
  ('halloumi','salate',62,'Salată Halloumi','Halloumi saláta','Mix salată, sparanghel, conopidă crocantă, rodie, cremă de avocado, dressing miere, halloumi','Salátakeverék, spárga, ropogós karfiol, gránátalma, avokádókrém, mézes öntet, halloumi',47,'400 gr',array['ou','telina','lactoza']::text[],null,false,array['veg']::text[],null,'halloumi.jpg',null,660),
  ('camembert','salate',63,'Camembert pane cu gem de afine și salată de sezon','Rántott camembert áfonyalekvárral és salátával','Mix salată, sparanghel, conopidă crocantă, rodie, cremă de avocado, dressing miere, camembert','Salátakeverék, spárga, ropogós karfiol, gránátalma, avokádókrém, mézes öntet, camembert',62,'170/100/50 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,'camembert.jpg',null,670),
  ('snitel-vegetal','vegetariene',64,'Șnițel vegetal Lyra','Lyra vegetáriánus szelet','Șnițel veggie, sos ciuperci, cheddar, cașcaval, smântână vegetală','Vegetáriánus rántott szelet, gombás szósz, cheddar sajt, trappista sajt, növényi tejszín',53,'250 gr',array['lactoza']::text[],null,true,array['veg']::text[],null,'snitel-vegetal.jpg',null,680),
  ('papricas-ciuperci','vegetariene',65,'Papricaș de ciuperci','Gombapaprikás sült puliszkával','Cu mămăligă prăjită, ceapă, ardei, pastă de tomate, ciuperci, hribi, cremă de gătit','Hagyma, paprika, paradicsompüré, gomba, vargánya, főzőtejszín',42,'250/100 gr',array['gluten','soia','lactoza']::text[],null,false,array['veg']::text[],null,'papricas-ciuperci.jpg',null,690),
  ('mamaliguta-branza','vegetariene',66,'Mămăliguță cu brânză','Puliszka sajttal','Cu smântână și ceapă condimentată','Tejföllel és fűszerezett hagymával',35,'300/150/100 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,'mamaliguta-branza.jpg',null,700),
  ('veggie-burger-veg','vegetariene',67,'Veggie Burger OZN','Veggie OZN Burger','Chiflă, cheddar, salată iceberg, ceapă caramelizată, legume, ciuperci, chiftea veggie, cartofi prăjiți, sos cașcaval','Zsemle, cheddar, jégsaláta, karamellizált hagyma, zöldségek, vega fasírt, sült krumpli',64,'300/150 gr',array['gluten','lactoza']::text[],null,true,array['veg']::text[],null,'veggie-ozn2.jpg',null,710),
  ('cartofi-taranesti-veg','vegetariene',68,'Cartofi țărănești','Parasztburgonya','Cartofi, ceapă, boia, condimente','Burgonya, hagyma, pirospaprika, fűszerek',15,'180 gr',array['lactoza','gluten']::text[],null,false,array['veg']::text[],null,'cartofi-taranesti.jpg',null,720),
  ('cascaval-pane','vegetariene',69,'Cașcaval pane','Rántott sajt','Cașcaval, ou, pesmet','Sajt, tojás, prézli',31,'120 gr',array['telina']::text[],null,false,array['veg','nogarn']::text[],'Fetească Regală Pivnița Savu','cascaval-pane.jpg',null,730),
  ('ciorba-legume','post',71,'Ciorbă de legume','Zöldségleves',null,null,29,'400 gr',array['telina']::text[],null,false,array['post']::text[],null,'ciorba-legume.jpg',null,740),
  ('ciorba-fasole','post',72,'Ciorbă de fasole','Bableves',null,null,29,'400 gr',array[]::text[],null,false,array['post']::text[],null,'ciorba-fasole.jpg',null,750),
  ('ciorba-pita','post',73,'Ciorbă de fasole în pită prăjită','Bableves pirított kenyércipóban',null,null,37,'270/400/50 gr',array['gluten']::text[],null,false,array['post']::text[],null,'ciorba-pita.jpg',null,760),
  ('iahnie-soia','post',74,'Iahnie de fasole cu șnițel soia','Babpörkölt szójaszelettel',null,null,52,'250/130 gr',array['lactoza']::text[],null,false,array['post']::text[],null,'iahnie-soia.jpg',null,770),
  ('kids-supa-pui','kids',75,'Supă de pui cu tăiței','Tyúkhúsleves','Porție pentru copii','Gyerekadag',16,'280 ml/20 gr',array['ou','telina','gluten']::text[],'pui',false,array[]::text[],null,'kids-supa-pui.jpg',null,780),
  ('kids-supa-crema','kids',76,'Supă cremă de legume','Zöldségkrémleves','Cu cremă de gătit și crutoane','Főzőtejszínnel és krutonnal',16,'250 ml/15 gr',array['telina','gluten','soia']::text[],null,false,array['veg']::text[],null,'kids-supa-crema.jpg',null,790),
  ('kids-dino','kids',77,'Dino de pui','Csirke dínók','Cu cartofi prăjiți și sos de usturoi','Hasábburgonyával és fokhagymás szósszal',33,'75/100/45 gr',array['mustar','gluten']::text[],'pui',false,array[]::text[],null,'kids-dino.jpg',null,800),
  ('kids-crispy','kids',78,'Crispy de pui','Ropogós csirke','Cu cartofi prăjiți și sos de usturoi','Hasábburgonyával és fokhagymás szósszal',33,'150/100/45 gr',array['mustar','gluten']::text[],'pui',false,array[]::text[],null,'kids-crispy.jpg',null,810),
  ('kids-carbonara','kids',79,'Penne Carbonara cu șuncă de pui','Carbonara penne csirkesonkával','Porție pentru copii','Gyerekadag',29,'150/50/100/30 gr',array['ou','mustar','gluten']::text[],'pui',false,array[]::text[],null,'kids-carbonara.jpg',null,820),
  ('cartofi-coaja','garnituri',80,'Cartofi copți în coajă','Héjában sült burgonya',null,null,15.5,'250 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,'cartofi-coaja.jpg',null,830),
  ('cartofi-lyra','garnituri',80,'Cartofi Lyra','Burgonya Lyra módra','Din cartofi copți la cuptor și prăjiți, sos de usturoi, cașcaval','Sütőben sült és olajban sült burgonyából, fokhagymaszósszal, sajttal',16,'250 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,null,null,840),
  ('cartofi-taranesti','garnituri',81,'Cartofi țărănești','Parasztos burgonya','Cartofi, ceapă, boia, condimente','Burgonya, hagyma, pirospaprika, fűszerek',15,'200 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,'cartofi-taranesti.jpg',null,850),
  ('legume-tigaie','garnituri',82,'Legume la tigaie','Serpenyős zöldségek','Ceapă, mix ardei, ciuperci, ulei de măsline','Hagyma, paprikamix, gomba, olívaolaj',22,'200 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,null,null,860),
  ('risotto','garnituri',82,'Risotto cu parmezan','Parmezános rizottó','Orez, parmezan, unt, vin','Rizs, parmezán, vaj, bor',22,'200 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,null,null,870),
  ('piure','garnituri',83,'Piure de cartofi','Burgonyapüré',null,null,14,'150 gr',array['lactoza']::text[],null,false,array['veg']::text[],null,null,null,880),
  ('cartofi','garnituri',84,'Cartofi prăjiți','Hasábburgonya',null,null,15,'150 gr',array[]::text[],null,false,array['veg']::text[],null,'cartofi.jpg',null,890),
  ('mamaliguta','garnituri',85,'Mămăliguță prăjită','Sült puliszka',null,null,12,'150 gr',array['gluten']::text[],null,false,array['veg']::text[],null,null,null,900),
  ('pita-coapta','garnituri',86,'Pită coaptă','Sült kenyér',null,null,4.5,'50 gr',array['gluten']::text[],null,false,array['veg']::text[],null,null,null,910),
  ('focaccia','garnituri',87,'Focaccia home made','Focaccia home made','Aluat bine hidratat, uns cu ulei de măsline extravirgin și rozmarin','Jól hidratált tészta, extraszűz olívaolajjal és rozmaringgal megkenve',7.5,'2 buc / 70 gr',array['gluten']::text[],null,false,array['veg','home']::text[],null,'focaccia.jpg',null,920),
  ('varza-murata','muraturi',88,'Varză murată','Savanyúkáposzta','Rețetă tradițională · de sezon','Hagyományos recept · idényjellegű',15,'130 gr',array[]::text[],null,false,array['post']::text[],null,'varza-murata.jpg',null,930),
  ('muraturi','muraturi',89,'Murături asortate','Vegyes savanyúság','Varză murată, castraveți, gogoșari · rețetă tradițională','Savanyúkáposzta, uborka, paprika',16,'130 gr',array[]::text[],null,false,array['post']::text[],null,'muraturi.jpg',null,940),
  ('sfecla','muraturi',90,'Salată de sfeclă roșie','Céklasaláta','Rețetă tradițională','Hagyományos recept',16,'130 gr',array[]::text[],null,false,array['post']::text[],null,'sfecla.jpg',null,950),
  ('ardei-copti','muraturi',91,'Ardei copți','Sült paprika',null,null,15,'130 gr',array[]::text[],null,false,array['post']::text[],null,'ardei-copti.jpg',null,960),
  ('salata-varza','muraturi',92,'Salată de varză','Káposztasaláta',null,null,13,'130 gr',array[]::text[],null,false,array['post']::text[],null,'salata-varza.jpg',null,970),
  ('salata-asortata','muraturi',93,'Salată asortată','Vegyes saláta',null,null,15,'130 gr',array[]::text[],null,false,array['post']::text[],null,'salata-asortata.jpg',null,980),
  ('ardei-iute','muraturi',94,'Ardei iute murat sau proaspăt','Ecetes csípős paprika vagy friss',null,null,4.5,'1 buc',array[]::text[],null,false,array['post']::text[],null,'ardei-iute.jpg','[{"l":"Murat","lh":"Ecetes","p":4.5,"g":"1 buc"},{"l":"Proaspăt","lh":"Friss","p":4.5,"g":"1 buc"}]'::jsonb,990),
  ('ceapa','muraturi',95,'Ceapă roșie','Vöröshagyma',null,null,5,'50 gr',array[]::text[],null,false,array['post']::text[],null,'ceapa.jpg',null,1000),
  ('sos-usturoi','sosuri',96,'Sos de usturoi','Fokhagymás szósz','Rețeta casei: usturoi, iaurt, lămâie','Házi recept: fokhagyma, joghurt, citrom',10,'90 gr',array['lactoza']::text[],null,false,array[]::text[],null,null,null,1010),
  ('mujdei','sosuri',97,'Mujdeiul casei','Házi mujdei','Rețeta casei: usturoi, boia, ulei, sare, zeamă de lămâie','Házi recept: fokhagyma, paprika, olaj, só, citromlé',10,'90 gr',array[]::text[],null,false,array['post']::text[],null,null,null,1020),
  ('sosul-casei','sosuri',98,'Sosul casei','A ház szósza','Usturoi, boia, maioneză, ou','Fokhagyma, paprika, majonéz, tojás',10,'90 gr',array['ou','lactoza']::text[],null,false,array[]::text[],null,null,null,1030),
  ('smantana','sosuri',99,'Smântână','Tejföl',null,null,5,'45 gr',array['lactoza']::text[],null,false,array[]::text[],null,null,null,1040),
  ('ketchup','sosuri',100,'Ketchup','Ketchup',null,null,7,'90 gr',array[]::text[],null,false,array[]::text[],null,null,null,1050),
  ('mustar','sosuri',101,'Muștar','Mustár',null,null,7,'90 gr',array['mustar']::text[],null,false,array[]::text[],null,null,null,1060),
  ('maioneza','sosuri',102,'Maioneză','Majonéz',null,null,7,'90 gr',array['lactoza','ou']::text[],null,false,array[]::text[],null,null,null,1070),
  ('sos-iaurt','sosuri',103,'Sos de iaurt cu usturoi copt','Joghurtos szósz sült fokhagymával',null,null,10,'90 gr',array[]::text[],null,false,array[]::text[],null,null,null,1080),
  ('papanas','desert',104,'Papanaș','Túrógombóc','Rumenit, cu smântână și dulceață de afine. Brânză de vaci, telemea, făină, gem de afine, smântână, zahăr pudră, ou','Aranybarnára sütve, tejföllel és áfonyalekvárral. Túró, telemea, liszt, áfonyalekvár, tejföl, porcukor, tojás',33,'120/70/70 gr',array['gluten','ou','lactoza']::text[],null,false,array['home']::text[],null,'papanas.jpg',null,1090),
  ('lapte-pasare','desert',105,'Lapte de pasăre','Madártej','După rețeta clasică de acasă: cremă fină de vanilie, albușuri bătute, zahăr','A klasszikus házi recept szerint: finom vaníliakrém, felvert tojásfehérje, cukor',29,'130/30 gr',array['gluten','ou','telina']::text[],null,false,array['home']::text[],null,'lapte-pasare.jpg',null,1100),
  ('tarta-mere','desert',105,'Tartă cu mere','Almás pite','Semințe de pin, scorțișoară, mere, zahăr, ouă, unt, lapte, stafide','Fenyőmag, fahéj, alma, cukor, tojás, vaj, tej, mazsola',29,'180 gr',array['lactoza']::text[],null,false,array[]::text[],null,'tarta-mere.jpg',null,1110),
  ('panna-cotta','desert',106,'Panna cotta','Panna cotta','Smântână pentru frișcă, esență de vanilie, zahăr, gelatină, gem de zmeură, păstăi de vanilie','Habtejszín, vanília aroma, cukor, zselatin, málnalekvár',29,'150 gr',array['ou','lactoza']::text[],null,false,array[]::text[],null,'panna-cotta.jpg',null,1120),
  ('melba','desert',107,'Melba · mix de înghețată','Melba · vegyes fagylalt','Vanilie, ciocolată și fructe de pădure, cu cremă de ciocolată albă belgiană cu mascarpone și topping','Vanília, csokoládé és erdei gyümölcs fagylalt, belga fehér csokoládékrém mascarponéval és toppinggal',32,'180 gr',array['ou','lactoza']::text[],null,false,array[]::text[],null,'melba.jpg',null,1130),
  ('clatite','desert',108,'Clătite fermecate cu Nutella','Varázslatos palacsinta Nutellával','Cremă de ciocolată albă belgiană cu mascarpone, Nutella, zahăr pudră și topping','Belga fehér csokoládékrém mascarponéval, Nutella, porcukor és topping',28,'130/70 gr',array['ou','lactoza']::text[],null,false,array['home']::text[],null,'clatite.jpg',null,1140),
  ('somloi','desert',109,'Găluște Șomloi','Somlói galuska','După o rețetă de casă unică, cu ciocolată belgiană: blat de vanilie și ciocolată însiropat, sos de vanilie, ciocolată, stafide, cremă de ciocolată albă belgiană cu mascarpone, topping caramel','Egyedi házi recept alapján, belga csokoládéval: vaníliás és csokoládés piskóta, vaníliás szósz, csokoládé, mazsola, belga fehér csokoládékrém mascarponéval',29,'350 gr',array['ou','lactoza']::text[],null,false,array['home']::text[],null,'somloi.jpg',null,1150)
on conflict (id) do nothing;
insert into public.promo_codes(code,percent,category_id,label) values
  ('LYRA10',10,null,'-10% la toată comanda'),
  ('PRANZ15',15,'burger','-15% la Lyra''s Burger')
on conflict (code) do nothing;
insert into public.promos(kicker,title,body,item_id,extras,price,image,active,popup)
select 'Nou la Lyra','Double Smash + cartofi','Două chiftele smash din vită, cheddar topit și cartofi prăjiți. Preț de lansare.','double-smash',array['cartofi'],42,'double-smash.jpg',true,true
where not exists (select 1 from public.promos);
insert into public.banners(chip,title,body,cta,image,category_id,sort)
select * from (values
  ('Nou · Smash Burgers', null, 'Chiftele smash din vită, cheddar topit, chiflă artizanală. De la 25 lei.', 'Comandă acum', 'double-smash.jpg', 'smash', 10),
  ('BBQ Pit Box Smoker', 'Afumat lent, ore întregi', null, 'Specialitățile casei', 'pitbox.jpg', 'specialitati', 20)
) v where not exists (select 1 from public.banners);
commit;
