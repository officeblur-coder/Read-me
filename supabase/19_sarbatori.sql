-- =====================================================================
-- Sărbători în aplicație (decembrie): Platou Festiv, ciolan, vinete, ciorbă de burtă
--  * produse kind = 'holiday': doar cu precomandă de minimum 24 de ore, din 3 decembrie până la 31 decembrie,
--    plata exclusiv online (13_online_pay.sql), aceleași reduceri ca restul meniului (−10% livrare, −15% ridicare)
--  * la fiecare Platou Festiv: o sticlă de vin din partea casei (place_order, 01_schema.sql)
--  * comanda plătită apare singură în registrul de platouri (17_platouri.sql)
-- Plus: fără bonusul de 50 lei la cont nou; la urcarea în nivel Lyra Rewards: puncte bonus + desert cadou
-- =====================================================================

alter table public.items drop constraint if exists items_kind_check;
alter table public.items add constraint items_kind_check check (kind in ('dish', 'gift', 'holiday'));

alter table public.settings add column if not exists holiday_from date not null default '2026-12-03';    -- prima zi de livrare
alter table public.settings add column if not exists holiday_until date not null default '2026-12-29';   -- ultima zi de livrare
alter table public.settings add column if not exists holiday_lead_hours int not null default 24;         -- precomandă minimă
-- zilele în care se pot livra produsele de sărbători: 3–22 decembrie, pauză, apoi 27, 28, 29 decembrie
alter table public.settings add column if not exists holiday_days date[] not null default
  '{2026-12-03,2026-12-04,2026-12-05,2026-12-06,2026-12-07,2026-12-08,2026-12-09,2026-12-10,2026-12-11,2026-12-12,2026-12-13,2026-12-14,2026-12-15,2026-12-16,2026-12-17,2026-12-18,2026-12-19,2026-12-20,2026-12-21,2026-12-22,2026-12-27,2026-12-28,2026-12-29}'::date[];
alter table public.settings add column if not exists holiday_days_label text not null default '3–22 decembrie și 27–29 decembrie';
update public.settings set holiday_until = '2026-12-29' where id = 1 and holiday_until = '2026-12-31';   -- ultima zi din listă

-- null = ziua și ora alese sunt bune pentru produsele de sărbători; altfel motivul
create or replace function public.holiday_error(p_at timestamptz) returns text
language plpgsql stable set search_path = public as $$
declare s public.settings; l timestamp; t0 time; t1 time;
begin
  select * into s from public.settings where id = 1;
  l := p_at at time zone s.tz;
  t0 := greatest(s.preorder_from, s.open_time); t1 := least(s.close_time, s.preorder_until);
  if p_at < now() + make_interval(hours => s.holiday_lead_hours) then
    return format('Produsele de sărbători se comandă cu minimum %s de ore înainte.', s.holiday_lead_hours); end if;
  if l::date < s.holiday_from then
    return format('Produsele de sărbători se livrează începând cu %s.', to_char(s.holiday_from, 'DD.MM.YYYY')); end if;
  if l::date > s.holiday_until then
    return format('Produsele de sărbători se livrează până pe %s.', to_char(s.holiday_until, 'DD.MM.YYYY')); end if;
  if s.holiday_days is not null and cardinality(s.holiday_days) > 0 and not (l::date = any(s.holiday_days)) then
    return format('În ziua aleasă nu livrăm produse de sărbători. Zile disponibile: %s.', s.holiday_days_label); end if;
  if not (extract(isodow from l)::int = any(s.open_days)) then return 'În ziua aleasă restaurantul este închis.'; end if;
  if extract(minute from l) <> 0 or extract(second from l) <> 0 or l::time < t0 or l::time + interval '1 hour' > t1 then
    return format('Poți programa între %s și %s, pe intervale de o oră.', to_char(t0, 'HH24:MI'), to_char(t1, 'HH24:MI')); end if;
  return null;
end $$;
grant execute on function public.holiday_error(timestamptz) to anon, authenticated;

-- categoria și produsele (se pot edita apoi din admin ca orice produs); prețurile includ ambalajul
insert into public.categories(id, name_ro, name_hu, sort, active) values ('sarbatori', 'Sărbători', 'Ünnepek', -20, true)
  on conflict (id) do nothing;
insert into public.items(id, category_id, name_ro, name_hu, desc_ro, price, grams, image, packaging, sgr, kind, active, available, sort, tags, allergens) values
  ('platou-festiv', 'sarbatori', 'Platou Festiv Signature Lyra', 'Lyra ünnepi tál',
   '8 specialități: coșulețe gourmet cu cârnați de Mangalița, chifteluțe Lyra, mini Camembert cu afine, ruladă de pui cu baby spanac, terină rustică de porc cu merișoare, terină de brânzeturi nobile, creveți gourmet cu sos Lyra, mini șnițele în crustă de semințe. 🍷 + o sticlă de vin din partea casei la fiecare platou.',
   255, '1,8 kg', 'sarbatori-platou.jpg', 0, 0, 'holiday', true, true, 1, '{}', '{gluten,ou,lactoza}'),
  ('ciolan-varza', 'sarbatori', 'Ciolan cu varză călită', 'Csülök párolt káposztával',
   'Ciolan copt încet, cu varză roșie călită și sos. Bucate de sărbători, livrate de Lyra.', 72, '500 / 200 / 100 g', 'sarbatori-ciolan.jpg', 0, 0, 'holiday', true, true, 2, '{}', '{}'),
  ('vinete-sarbatori', 'sarbatori', 'Vinete cu maioneză', 'Padlizsánkrém majonézzel',
   'Salată de vinete coapte cu maioneză, pentru 4–5 persoane.', 40, '500 g · 4–5 persoane', 'sarbatori-vinete.jpg', 0, 0, 'holiday', true, true, 3, '{}', '{ou}'),
  ('ciorba-burta-sarbatori', 'sarbatori', 'Ciorbă de burtă', 'Pacalleves',
   'Ciorbă de burtă ca la mama acasă, pentru 4–5 persoane.', 100, '400 g burtă / 1200 g ciorbă · 4–5 persoane', 'sarbatori-ciorba.jpg', 0, 0, 'holiday', true, true, 4, '{}', '{lactoza,ou}')
on conflict (id) do update set kind = 'holiday', category_id = 'sarbatori', packaging = 0, sgr = 0;

-- fără bonusul de 50 lei la cont nou (și bonusurile nefolosite se închid)
update public.settings set welcome_on = false where id = 1;
update public.customers set welcome_credit = 0 where welcome_used_at is null and welcome_credit > 0;

-- Lyra Rewards: la urcarea în nivel, pe lângă cashback-ul nou și desertul cadou, puncte bonus (în lei)
-- implicit: Classic 0, Select 50 lei, Signature 150 lei
alter table public.rewards_settings add column if not exists tier_bonus_lei numeric(10,2)[] not null default '{0,50,150}';

create or replace function public.rewards_promote(p_cust uuid) returns smallint
language plpgsql security definer set search_path = public as $$
declare cfg public.rewards_settings := public.rewards_cfg(); c public.customers; t int; nt smallint; vid uuid; b numeric; v numeric; pts int; got numeric := 0; bnote text;
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
    -- punctele bonus ale nivelului (o singură dată pe nivel)
    b := coalesce(cfg.tier_bonus_lei[t], 0);
    bnote := format('Bonus nivel Lyra %s: %s lei în puncte', cfg.tier_names[t], to_char(b, 'FM999990'));
    if b > 0 and not exists (select 1 from public.point_ledger where customer_id = p_cust and kind = 'adjust' and point_ledger.note like format('Bonus nivel Lyra %s:%%', cfg.tier_names[t])) then
      v := public.rewards_vpp(t::smallint);
      pts := ceil(b / v)::int;
      insert into public.point_lots(customer_id, source, points, remaining, vpp, tier) values (p_cust, 'adjust', pts, pts, v, t);
      insert into public.point_ledger(customer_id, kind, points, value, tier, note, actor) values (p_cust, 'adjust', pts, round(pts * v, 2), t, bnote, 'nivel');
      got := got + b;
    end if;
  end loop;
  update public.customers set tier = nt where id = p_cust;
  if got > 0 then perform public.rewards_sync(p_cust); end if;
  perform public.rewards_notify(p_cust, 'promotion', format('Bun venit în Lyra %s!', cfg.tier_names[nt]),
    format('De acum ai %s%% cashback la fiecare comandă%s și te așteaptă un desert cadou.',
      to_char(cfg.rates[nt], 'FM990.##'), case when got > 0 then format(', ai primit %s lei în puncte', to_char(got, 'FM999990')) else '' end),
    jsonb_build_object('tier', nt, 'from', c.tier, 'bonus_lei', got));
  perform public.rewards_email(c.email, format('Felicitări! Ai urcat la Lyra %s', cfg.tier_names[nt]),
    format('Bun venit în Lyra %s!', cfg.tier_names[nt]),
    format('De acum primești <b>%s%% cashback</b> în puncte la fiecare comandă%s și te așteaptă un <b>desert cadou</b>, valabil %s zile. Le folosești direct în coș, la următoarea comandă.',
      to_char(cfg.rates[nt], 'FM990.##'), case when got > 0 then format(', ai primit <b>%s lei în puncte</b>', to_char(got, 'FM999990')) else '' end, cfg.voucher_days),
    'Vezi Lyra Rewards');
  return nt;
end $$;

-- ---------- comenzile de sărbători din aplicație → registrul de platouri ----------
alter table public.platter_orders add column if not exists order_id uuid unique references public.orders(id) on delete set null;
alter table public.platter_orders add column if not exists order_no int;

create or replace function public.orders_to_platters() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.settings; ln jsonb := '[]'; l jsonb; q int := 0; tz text;
begin
  -- doar comenzile cu produse de sărbători
  if not exists (select 1 from jsonb_array_elements(new.items) x join public.items i on i.id = x->>'id' where i.kind = 'holiday') then return new; end if;
  -- plata confirmată: intră în registru (o singură dată)
  if new.pay_status = 'paid' and (tg_op = 'INSERT' or old.pay_status is distinct from 'paid')
     and not exists (select 1 from public.platter_orders where order_id = new.id) then
    select * into s from public.settings where id = 1; tz := coalesce(s.tz, 'Europe/Bucharest');
    for l in select * from jsonb_array_elements(new.items) loop
      if coalesce((l->>'wine')::boolean, false) then continue; end if;   -- vinul se afișează singur în registru
      ln := ln || jsonb_build_object('name', l->>'name' || coalesce(' · ' || nullif(l->>'variant', ''), ''), 'qty', (l->>'qty')::int, 'price', (l->>'unit')::numeric);
      q := q + (l->>'qty')::int;
    end loop;
    insert into public.platter_orders(name, phone, address, email, lines, qty, total, dispatcher, order_date, delivery_date, delivery_time, note,
      pay_method, pay_status, paid_at, created_by, order_id, order_no, stripe_session, stripe_payment)
    values (new.name, new.phone, case when new.mode = 'livrare' then new.address else 'Ridicare din restaurant' end, new.email, ln, q, new.total,
      'Comandă online', (new.created_at at time zone tz)::date,
      coalesce((new.scheduled_for at time zone tz)::date, (now() at time zone tz)::date),
      coalesce(to_char(new.scheduled_for at time zone tz, 'HH24:MI') || '–' || to_char((new.scheduled_for + interval '1 hour') at time zone tz, 'HH24:MI'), ''),
      trim(both ' ·' from concat_ws(' · ', case when new.mode = 'ridicare' then 'RIDICARE' else 'LIVRARE' end, nullif(new.note, ''),
        case when coalesce(new.discount, 0) > 0 then new.discount_label end)),
      'online', 'paid', coalesce(new.paid_at, now()), 'Aplicație', new.id, new.number, new.stripe_session, new.stripe_payment);
  end if;
  -- comanda refuzată / rambursată: apare anulată în registru
  if tg_op = 'UPDATE' and new.status in ('rejected', 'refunded') and old.status is distinct from new.status then
    update public.platter_orders set cancelled = true, updated_at = now(),
      note = trim(both ' ·' from concat_ws(' · ', note, case when new.status = 'refunded' then 'rambursată' else 'refuzată în recepție' end))
    where order_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists orders_to_platters on public.orders;
create trigger orders_to_platters after insert or update of pay_status, status on public.orders for each row execute function public.orders_to_platters();
