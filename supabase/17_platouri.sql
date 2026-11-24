-- =====================================================================
-- Registru platouri de sărbători (lyrasdelivery.ro/platouri)
--  * separat de meniul online: comenzile se introduc de recepție, nu de clienți
--  * două feluri de acces: „editor” (introduce, trimite cererea de plată) și „verificare” (Simona: vede, bifează „verificat”, printează)
--  * plata integrală cu cardul, printr-un link trimis pe email (Stripe Checkout, funcțiile Edge pay + stripe-webhook)
--  * conturile NU sunt în tabela staff, ca să nu primească acces la recepție
-- Conturile: Supabase → Authentication → Add user: platouri@lyrasdelivery.ro și simona@lyrasdelivery.ro (vezi mai jos)
-- =====================================================================

create table if not exists public.platter_users (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  name     text not null,
  role     text not null check (role in ('editor', 'checker'))
);
alter table public.platter_users enable row level security;   -- fără politici: doar funcțiile de mai jos

-- conturile, dacă au fost create în Authentication (rularea din nou le adaugă pe cele create între timp)
insert into public.platter_users(user_id, name, role)
select u.id, n.name, n.role
  from auth.users u join (values ('platouri@lyrasdelivery.ro', 'Recepție platouri', 'editor'),
                                 ('simona@lyrasdelivery.ro', 'Simona', 'checker')) n(email, name, role)
    on lower(u.email) = n.email
on conflict (user_id) do update set role = excluded.role, name = excluded.name;

-- produsele care intră în registru (numele și prețul se aleg la introducere; se pot scrie și altele de mână)
create table if not exists public.platter_products (
  id      bigint generated always as identity primary key,
  name    text not null unique,
  price   numeric(10,2) not null check (price >= 0),
  active  boolean not null default true,
  sort    int not null default 0
);
alter table public.platter_products enable row level security;

create sequence if not exists public.platter_number_seq start 1;
create table if not exists public.platter_orders (
  id              uuid primary key default gen_random_uuid(),
  number          int not null default nextval('public.platter_number_seq') unique,
  name            text not null,
  phone           text not null,
  address         text not null default '',
  email           text,
  lines           jsonb not null default '[]',          -- [{name, qty, price}]
  qty             int not null default 0,               -- total bucăți
  total           numeric(10,2) not null default 0 check (total >= 0),
  dispatcher      text not null default '',
  order_date      date not null default (now() at time zone 'Europe/Bucharest')::date,
  delivery_date   date not null,
  delivery_time   text not null default '',
  note            text not null default '',
  token           uuid not null default gen_random_uuid() unique,   -- linkul de plată din email
  pay_status      text not null default 'none' check (pay_status in ('none', 'sent', 'paid')),
  pay_sent_at     timestamptz,
  pay_sent_count  int not null default 0,
  paid_at         timestamptz,
  stripe_session  text,
  stripe_payment  text,
  verified_at     timestamptz,
  verified_by     text,
  cancelled       boolean not null default false,
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.platter_orders enable row level security;   -- fără politici: doar funcțiile de mai jos
-- modul de plată: online (link pe email), cash la recepție, tichete de vacanță; la cash / tichete recepția bifează „achitat”
alter table public.platter_orders add column if not exists pay_method text not null default 'online';
alter table public.platter_orders drop constraint if exists platter_orders_pay_method_check;
alter table public.platter_orders add constraint platter_orders_pay_method_check check (pay_method in ('online', 'cash', 'tichete'));
alter table public.platter_orders add column if not exists paid_by text;
create index if not exists platter_orders_delivery on public.platter_orders(delivery_date);

-- cine sunt: 'editor' | 'checker' | null (administratorul și recepția sunt „editor”)
create or replace function public.platter_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from public.platter_users where user_id = auth.uid()),
    (select 'editor' from public.staff where user_id = auth.uid() and role in ('admin', 'reception')));
$$;
create or replace function public.platter_me() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.platter_role() is null then null else jsonb_build_object('role', public.platter_role(),
    'name', coalesce((select name from public.platter_users where user_id = auth.uid()), (select name from public.staff where user_id = auth.uid()),
                     (select split_part(email, '@', 1) from auth.users where id = auth.uid()))) end;
$$;
grant execute on function public.platter_role(), public.platter_me() to authenticated;

create or replace function public.platter_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.platter_role() is null then null else jsonb_build_object(
    'orders', (select coalesce(jsonb_agg(to_jsonb(p) - 'token' - 'stripe_session' - 'stripe_payment' order by p.delivery_date, p.delivery_time, p.number), '[]')
                 from public.platter_orders p),
    'products', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'price', price) order by sort, name), '[]')
                 from public.platter_products where active)) end;
$$;
grant execute on function public.platter_list() to authenticated;

-- adaugă / modifică o comandă (editor). Totalul se calculează aici din rânduri.
create or replace function public.platter_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.platter_orders; old public.platter_orders; l jsonb; ln jsonb := '[]'; q int := 0; t numeric := 0; lq int; lp numeric;
        who text := (public.platter_me())->>'name'; pm text := coalesce(nullif(p->>'pay_method', ''), 'online');
begin
  if public.platter_role() is distinct from 'editor' then raise exception 'Doar recepția introduce comenzi de platouri.' using errcode = 'P0001'; end if;
  if coalesce(trim(p->>'name'), '') = '' or coalesce(trim(p->>'phone'), '') = '' then raise exception 'Completează numele și telefonul.' using errcode = 'P0001'; end if;
  if nullif(p->>'delivery_date', '') is null then raise exception 'Alege data livrării.' using errcode = 'P0001'; end if;
  if coalesce(trim(p->>'email'), '') <> '' and trim(p->>'email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Emailul nu pare corect.' using errcode = 'P0001'; end if;
  for l in select * from jsonb_array_elements(coalesce(p->'lines', '[]')) loop
    if coalesce(trim(l->>'name'), '') = '' then continue; end if;
    lq := coalesce(nullif(l->>'qty', '')::int, 0); lp := coalesce(nullif(l->>'price', '')::numeric, 0);
    if lq <= 0 or lq > 1000 then raise exception 'Numărul de bucăți la „%” trebuie să fie între 1 și 1000.', l->>'name' using errcode = 'P0001'; end if;
    if lp < 0 then raise exception 'Prețul la „%” nu poate fi negativ.', l->>'name' using errcode = 'P0001'; end if;
    ln := ln || jsonb_build_object('name', trim(l->>'name'), 'qty', lq, 'price', round(lp, 2));
    q := q + lq; t := t + lq * round(lp, 2);
  end loop;
  if jsonb_array_length(ln) = 0 then raise exception 'Adaugă cel puțin un produs.' using errcode = 'P0001'; end if;
  if pm not in ('online', 'cash', 'tichete') then raise exception 'Alege modul de plată.' using errcode = 'P0001'; end if;

  if nullif(p->>'id', '') is null then
    insert into public.platter_orders(name, phone, address, email, lines, qty, total, dispatcher, order_date, delivery_date, delivery_time, note, created_by, pay_method)
    values (trim(p->>'name'), trim(p->>'phone'), coalesce(trim(p->>'address'), ''), nullif(lower(trim(p->>'email')), ''), ln, q, t,
            coalesce(trim(p->>'dispatcher'), ''), coalesce(nullif(p->>'order_date', '')::date, (now() at time zone 'Europe/Bucharest')::date),
            (p->>'delivery_date')::date, coalesce(trim(p->>'delivery_time'), ''), coalesce(trim(p->>'note'), ''), who, pm)
    returning * into r;
  else
    select * into old from public.platter_orders where id = (p->>'id')::uuid for update;
    if not found then raise exception 'Comanda nu mai există.' using errcode = 'P0001'; end if;
    if old.pay_status = 'paid' and t <> old.total then
      raise exception 'Comanda e deja plătită (% lei): produsele și prețul nu se mai pot schimba.', to_char(old.total, 'FM999990.00') using errcode = 'P0001'; end if;
    if old.pay_status = 'paid' and pm <> old.pay_method then
      raise exception 'Comanda e deja achitată: modul de plată nu se mai schimbă.' using errcode = 'P0001'; end if;
    update public.platter_orders set name = trim(p->>'name'), phone = trim(p->>'phone'), address = coalesce(trim(p->>'address'), ''), pay_method = pm,
      email = nullif(lower(trim(p->>'email')), ''), lines = ln, qty = q, total = t, dispatcher = coalesce(trim(p->>'dispatcher'), ''),
      order_date = coalesce(nullif(p->>'order_date', '')::date, old.order_date), delivery_date = (p->>'delivery_date')::date,
      delivery_time = coalesce(trim(p->>'delivery_time'), ''), note = coalesce(trim(p->>'note'), ''), updated_at = now(),
      -- o modificare după verificare cere o nouă verificare
      verified_at = case when old.lines is distinct from ln or old.delivery_date is distinct from (p->>'delivery_date')::date then null else old.verified_at end,
      verified_by = case when old.lines is distinct from ln or old.delivery_date is distinct from (p->>'delivery_date')::date then null else old.verified_by end
    where id = old.id returning * into r;
  end if;
  return to_jsonb(r) - 'token' - 'stripe_session' - 'stripe_payment';
end $$;

-- anulează / reactivează (editor); o comandă plătită nu se anulează de aici (rambursarea se face din Stripe)
create or replace function public.platter_cancel(p_id uuid, p_cancel boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.platter_role() is distinct from 'editor' then raise exception 'Doar recepția anulează comenzi.' using errcode = 'P0001'; end if;
  if p_cancel and exists (select 1 from public.platter_orders where id = p_id and pay_status = 'paid' and pay_method = 'online') then
    raise exception 'Comanda e plătită. Fă întâi rambursarea din Stripe, apoi o poți anula.' using errcode = 'P0001'; end if;
  if p_cancel and exists (select 1 from public.platter_orders where id = p_id and pay_status = 'paid') then
    raise exception 'Comanda e bifată „achitat”. Dă banii înapoi și debifează întâi „achitat”, apoi o poți anula.' using errcode = 'P0001'; end if;
  update public.platter_orders set cancelled = p_cancel, updated_at = now() where id = p_id;
end $$;

-- Simona (sau oricine are acces) bifează / debifează „verificat”
create or replace function public.platter_verify(p_id uuid, p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.platter_role() is null then raise exception 'Fără acces.' using errcode = 'P0001'; end if;
  update public.platter_orders set verified_at = case when p_ok then now() end,
    verified_by = case when p_ok then (public.platter_me())->>'name' end where id = p_id;
end $$;
grant execute on function public.platter_save(jsonb), public.platter_cancel(uuid, boolean), public.platter_verify(uuid, boolean) to authenticated;

-- câte sticle de vin din partea casei: una la fiecare Platou Festiv
create or replace function public.platter_wine(p_lines jsonb) returns int language sql immutable as $$
  select coalesce(sum((l->>'qty')::int), 0)::int from jsonb_array_elements(coalesce(p_lines, '[]')) l where l->>'name' ilike 'platou festiv%';
$$;

-- trimite clientului emailul cu linkul de plată (suma integrală)
create or replace function public.platter_send_pay(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.platter_orders; s public.settings; key text; html text; rows text := ''; l jsonb; link text;
begin
  if public.platter_role() is distinct from 'editor' then raise exception 'Doar recepția trimite cererea de plată.' using errcode = 'P0001'; end if;
  select * into o from public.platter_orders where id = p_id;
  if not found then raise exception 'Comanda nu mai există.' using errcode = 'P0001'; end if;
  if o.cancelled then raise exception 'Comanda e anulată.' using errcode = 'P0001'; end if;
  if o.pay_status = 'paid' then raise exception 'Comanda e deja plătită.' using errcode = 'P0001'; end if;
  if o.pay_method <> 'online' then raise exception 'Comanda e cu plata % la recepție. Schimbă modul de plată în „online” ca să trimiți linkul.', case when o.pay_method = 'cash' then 'cash' else 'cu tichete de vacanță' end using errcode = 'P0001'; end if;
  if o.email is null then raise exception 'Completează emailul clientului.' using errcode = 'P0001'; end if;
  if o.total <= 0 then raise exception 'Totalul trebuie să fie mai mare de 0.' using errcode = 'P0001'; end if;
  select * into s from public.settings where id = 1;
  begin
    select decrypted_secret into key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  exception when others then key := null; end;
  if key is null then raise exception 'Emailurile nu sunt configurate (lipsește resend_api_key).' using errcode = 'P0001'; end if;
  link := rtrim(s.site_url, '/') || '/platouri/plata/' || o.token;
  for l in select * from jsonb_array_elements(o.lines) loop
    rows := rows || format('<tr><td style="padding:6px 0;color:#f3e9df">%s× %s</td><td align="right" style="padding:6px 0;color:#f3e9df">%s lei</td></tr>',
      l->>'qty', replace(replace(l->>'name', '<', '&lt;'), '>', '&gt;'), to_char((l->>'qty')::int * (l->>'price')::numeric, 'FM999990.00'));
  end loop;
  -- vinul din partea casei: o sticlă la fiecare Platou Festiv
  if public.platter_wine(o.lines) > 0 then
    rows := rows || format('<tr><td style="padding:6px 0;color:#ffb24a">+ %s× sticlă de vin din partea casei</td><td align="right" style="padding:6px 0;color:#ffb24a">cadou</td></tr>', public.platter_wine(o.lines));
  end if;
  html := format($h$<!doctype html><html><body style="margin:0;background:#120d0a;font-family:Arial,Helvetica,sans-serif">
<table width="100%%" cellpadding="0" cellspacing="0" style="background:#120d0a;padding:24px 12px"><tr><td align="center">
<table width="100%%" style="max-width:520px;background:#1d1511;border-radius:18px;color:#f3e9df" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 28px 8px"><div style="font-size:22px;font-weight:bold;color:#ffb24a">Lyra's Delivery</div>
<h1 style="font-size:22px;margin:14px 0 6px;color:#ffffff">Comanda de platouri #%1$s</h1>
<p style="margin:0;color:#c9b8aa;font-size:15px">Bună, %2$s! Mai jos ai comanda ta. Livrare: <b style="color:#ffffff">%3$s</b>.</p></td></tr>
<tr><td style="padding:16px 28px 0"><table width="100%%" style="font-size:14px">%4$s
<tr><td style="padding-top:10px;border-top:1px dashed #3a2d24;font-weight:bold;color:#ffffff">Total de plată</td><td align="right" style="padding-top:10px;border-top:1px dashed #3a2d24;font-weight:bold;color:#ffffff">%5$s lei</td></tr></table></td></tr>
<tr><td align="center" style="padding:26px 28px 10px"><a href="%6$s" style="display:inline-block;background:#ff7a1a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:17px;padding:15px 30px;border-radius:999px">Plătește %5$s lei cu cardul</a></td></tr>
<tr><td align="center" style="padding:0 28px 26px;color:#86756a;font-size:12px">Plata se face integral, pe pagina securizată Stripe. Dacă butonul nu merge, deschide: <br><a href="%6$s" style="color:#ffb24a">%6$s</a></td></tr>
</table><p style="color:#86756a;font-size:12px;margin:16px 0 0">Lyra's Delivery · lyrasdelivery.ro</p></td></tr></table></body></html>$h$,
    o.number, replace(replace(split_part(o.name, ' ', 1), '<', ''), '>', ''),
    to_char(o.delivery_date, 'DD.MM.YYYY') || case when o.delivery_time <> '' then ', ora ' || o.delivery_time else '' end,
    rows, to_char(o.total, 'FM999990.00'), link);
  perform net.http_post(url := 'https://api.resend.com/emails',
    body := jsonb_build_object('from', s.email_from, 'to', jsonb_build_array(o.email), 'reply_to', coalesce(s.email_reply_to, 'comenzi@lyrasdelivery.ro'),
      'subject', format('Plata comenzii de platouri #%s · %s lei', o.number, to_char(o.total, 'FM999990.00')), 'html', html),
    headers := jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'));
  update public.platter_orders set pay_status = 'sent', pay_sent_at = now(), pay_sent_count = pay_sent_count + 1 where id = o.id;
  return jsonb_build_object('email', o.email);
end $$;
grant execute on function public.platter_send_pay(uuid) to authenticated;

-- pagina de plată a clientului (fără cont): doar ce scrie și în email
create or replace function public.platter_public(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('number', number, 'name', split_part(name, ' ', 1), 'lines', lines, 'total', total,
    'delivery_date', delivery_date, 'delivery_time', delivery_time, 'pay_status', pay_status, 'cancelled', cancelled, 'paid_at', paid_at)
  from public.platter_orders where token = p_token;
$$;
grant execute on function public.platter_public(uuid) to anon, authenticated;

-- apelate doar de funcțiile Edge (cheia service_role)
create or replace function public.platter_pay_info(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', p.id, 'number', p.number, 'total', p.total, 'email', p.email, 'pay_status', p.pay_status,
    'cancelled', p.cancelled, 'site_url', s.site_url, 'stripe_session', p.stripe_session)
  from public.platter_orders p, public.settings s where s.id = 1 and p.token = p_token;
$$;
create or replace function public.platter_set_session(p_id uuid, p_session text) returns void
language sql security definer set search_path = public as $$
  update public.platter_orders set stripe_session = p_session where id = p_id and pay_status <> 'paid';
$$;
create or replace function public.platter_mark_paid(p_id uuid, p_session text, p_payment text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.platter_orders set pay_status = 'paid', paid_at = now(), stripe_session = coalesce(p_session, stripe_session), stripe_payment = p_payment
   where id = p_id and pay_status <> 'paid';
  return found;
end $$;
revoke execute on function public.platter_pay_info(uuid), public.platter_set_session(uuid, text), public.platter_mark_paid(uuid, text, text) from public, anon, authenticated;
grant execute on function public.platter_pay_info(uuid), public.platter_set_session(uuid, text), public.platter_mark_paid(uuid, text, text) to service_role;

-- produsele de sărbători (afișul „Crăciun & Revelion de la Lyra”); prețurile includ ambalajul
-- Crăciun: comenzi 2–22 dec., livrare 24 dec. · Revelion: comenzi 2–29 dec., livrare 31 dec.
-- Platoul Festiv: disponibil din 2 dec., precomandă cu minimum 24 de ore; + o sticlă de vin din partea casei la fiecare platou
insert into public.platter_products(name, price, sort) values
  ('Platou Festiv Signature Lyra (1,8 kg)', 255, 1),
  ('Ciolan cu varză călită (500/200/100 g)', 72, 2),
  ('Vinete cu maioneză (500 g · 4–5 persoane)', 40, 3),
  ('Ciorbă de burtă (400 g burtă / 1200 g ciorbă · 4–5 persoane)', 100, 4)
on conflict (name) do update set price = excluded.price, sort = excluded.sort, active = true;
-- denumirile vechi nu mai apar la introducere (comenzile deja salvate rămân neschimbate)
update public.platter_products set active = false where name in ('Vinete cu maioneză (500 g)', 'Ciorbă de burtă (120 g / 300 ml)');

-- cash / tichete de vacanță: recepția bifează „achitat” când primește banii (sau debifează dacă a greșit)
create or replace function public.platter_mark_manual(p_id uuid, p_paid boolean) returns void
language plpgsql security definer set search_path = public as $$
declare o public.platter_orders;
begin
  if public.platter_role() is distinct from 'editor' then raise exception 'Doar recepția bifează plata.' using errcode = 'P0001'; end if;
  select * into o from public.platter_orders where id = p_id for update;
  if not found then raise exception 'Comanda nu mai există.' using errcode = 'P0001'; end if;
  if o.pay_method = 'online' then raise exception 'Plata online se confirmă singură, după plata cu cardul.' using errcode = 'P0001'; end if;
  if o.cancelled then raise exception 'Comanda e anulată.' using errcode = 'P0001'; end if;
  update public.platter_orders set pay_status = case when p_paid then 'paid' else 'none' end,
    paid_at = case when p_paid then now() end, paid_by = case when p_paid then (public.platter_me())->>'name' end where id = o.id;
end $$;
grant execute on function public.platter_mark_manual(uuid, boolean) to authenticated;
