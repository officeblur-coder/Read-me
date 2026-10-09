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
