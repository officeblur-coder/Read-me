-- Teste produse de sărbători în aplicație (pe o copie a bazei; totul se anulează)
begin;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.err(p jsonb) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform public.place_order(jsonb_build_object('name','Ana','phone','0745','mode','ridicare','payment','online','email','a@t.ro') || p);
  return null;
exception when sqlstate 'P0001' then return sqlerrm;
end $$;
create function pg_temp.place(p jsonb) returns public.orders language plpgsql as $$
declare r jsonb; o public.orders;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  r := public.place_order(jsonb_build_object('name','Ana','phone','0745','mode','ridicare','payment','online','email','a@t.ro') || p);
  select * into o from public.orders where id = (r->>'id')::uuid; return o;
end $$;
create function pg_temp.at(days int, hhmm text) returns text language sql as $$
  select ((((now() at time zone 'Europe/Bucharest')::date + days) + hhmm::time) at time zone 'Europe/Bucharest')::text $$;
update public.settings set accepting_orders = true, min_order = 0, open_days = '{1,2,3,4,5,6,7}', open_time = '11:00', close_time = '21:30',
  preorder_on = true, preorder_from = '12:00', preorder_until = '21:00', preorder_days = 2, online_pay_on = true,
  holiday_from = (now() at time zone 'Europe/Bucharest')::date + 2, holiday_until = (now() at time zone 'Europe/Bucharest')::date + 30, holiday_days = '{}', holiday_deadlines = null, holiday_fullday = '{}' where id = 1;
delete from public.item_discounts;
insert into public.item_discounts(name, percent, all_items, mode) values ('Ridicare', 15, true, 'ridicare'), ('Livrare', 10, true, 'livrare');
delete from public.delivery_zones;

do $$
declare o public.orders; e text; p public.platter_orders;
begin
  perform pg_temp.ok((select count(*) = 4 from public.items where category_id = 'sarbatori' and kind = 'holiday' and active), 'cele 4 produse de sărbători în meniu');
  perform pg_temp.ok((select welcome_on from public.settings where id = 1) = false, 'bonusul de 50 lei la cont nou e oprit');
  e := pg_temp.err('{"items":[{"id":"platou-festiv","qty":1}]}');
  perform pg_temp.ok(e like 'Produsele de sărbători se comandă cu precomandă%', 'fără precomandă: refuzat');
  e := pg_temp.err(jsonb_build_object('items', '[{"id":"platou-festiv","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(1, '13:00')));
  perform pg_temp.ok(e like '%începând cu%' or e like '%minimum 24 de ore%', 'înainte de prima zi / sub 24 de ore: refuzat (' || coalesce(e, 'acceptat') || ')');
  e := pg_temp.err(jsonb_build_object('items', '[{"id":"platou-festiv","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(40, '13:00')));
  perform pg_temp.ok(e like '%până pe%', 'după ultima zi: refuzat');
  e := pg_temp.err(jsonb_build_object('items', '[{"id":"platou-festiv","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(5, '13:00'), 'payment', 'cash'));
  perform pg_temp.ok(e like 'Precomenzile se plătesc online%', 'plata exclusiv online');
  e := pg_temp.err(jsonb_build_object('items', '[{"id":"platou-festiv","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(5, '13:00'), 'use_welcome', true));
  perform pg_temp.ok(e like 'Bonusul de bun venit nu mai este disponibil%', 'bonusul de bun venit nu se mai poate folosi');

  -- zilele de pauză (aici: ziua de peste 12 zile scoasă din listă)
  update public.settings set holiday_days = array(select d::date from generate_series((now() at time zone 'Europe/Bucharest')::date + 2, (now() at time zone 'Europe/Bucharest')::date + 30, interval '1 day') d
    where d::date <> (now() at time zone 'Europe/Bucharest')::date + 12), holiday_days_label = 'test' where id = 1;
  e := pg_temp.err(jsonb_build_object('items', '[{"id":"platou-festiv","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(12, '13:00')));
  perform pg_temp.ok(e like 'În ziua aleasă nu livrăm produse de sărbători%', 'zi de pauză: refuzată');
  -- termen de comandă (ca la Crăciun: livrare în ziua X doar dacă azi ≤ termen)
  update public.settings set holiday_days = '{}', holiday_deadlines = jsonb_build_object(
    ((now() at time zone 'Europe/Bucharest')::date + 14)::text, ((now() at time zone 'Europe/Bucharest')::date - 1)::text,
    ((now() at time zone 'Europe/Bucharest')::date + 15)::text, ((now() at time zone 'Europe/Bucharest')::date)::text) where id = 1;
  e := pg_temp.err(jsonb_build_object('items', '[{"id":"platou-festiv","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(14, '13:00')));
  perform pg_temp.ok(e like 'Comenzile pentru % se primesc până pe %', 'după termen (ca 23 dec. pentru 24 dec.): refuzat');
  perform pg_temp.ok(pg_temp.err(jsonb_build_object('items', '[{"id":"platou-festiv","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(15, '13:00'))) is null, 'în ultima zi de termen (ca 22 dec. pentru 24 dec.): acceptat');
  update public.settings set holiday_deadlines = null where id = 1;
  -- comandă bună: peste 10 zile, ridicare (−15%), 2 platouri + ciorbă
  o := pg_temp.place(jsonb_build_object('items', '[{"id":"platou-festiv","qty":2},{"id":"ciorba-burta-sarbatori","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(10, '13:00')));
  perform pg_temp.ok(o.pay_status = 'pending' and o.payment = 'online', 'precomanda așteaptă plata online');
  perform pg_temp.ok((select (l->>'unit')::numeric from jsonb_array_elements(o.items) l where l->>'id' = 'platou-festiv') = 255, 'fără reducere: Platoul Festiv rămâne 255 lei și la ridicare');
  perform pg_temp.ok((select (l->>'qty')::int = 2 and (l->>'unit')::numeric = 0 from jsonb_array_elements(o.items) l where l->>'id' = 'vin-casa'), 'două sticle de vin din partea casei, gratuit');
  perform pg_temp.ok(o.total = 255 * 2 + 100 and o.packaging = 0, 'totalul la preț întreg (prețurile includ ambalajul)');
  perform pg_temp.ok(not exists (select 1 from public.platter_orders where order_id = o.id), 'neplătită: nu e încă în registru');

  -- plata confirmată de Stripe → apare în registru
  perform public.pay_mark_paid(o.id, 'cs_1', 'pi_1');
  select * into p from public.platter_orders where order_id = o.id;
  perform pg_temp.ok(p.id is not null and p.pay_status = 'paid' and p.pay_method = 'online' and p.order_no = o.number and p.dispatcher = 'Comandă online', 'plătită: apare singură în registru');
  perform pg_temp.ok(p.total = o.total and p.qty = 3 and public.platter_wine(p.lines) = 2 and p.delivery_time = '13:00–14:00'
    and p.delivery_date = (now() at time zone 'Europe/Bucharest')::date + 10 and p.address = 'Ridicare din restaurant', 'registrul: produse, vin, data și intervalul livrării');
  perform public.pay_mark_paid(o.id, 'cs_1', 'pi_1');
  perform pg_temp.ok((select count(*) from public.platter_orders where order_id = o.id) = 1, 'o singură dată în registru');
  -- refuzată în recepție → anulată în registru
  update public.orders set status = 'rejected' where id = o.id;
  perform pg_temp.ok((select cancelled from public.platter_orders where order_id = o.id), 'refuzată: apare anulată în registru');
  -- codurile promoționale nu se aplică produselor de sărbători
  insert into public.promo_codes(code, percent, label, active) values ('CRACIUN10', 10, 'Cod test', true) on conflict do nothing;
  o := pg_temp.place(jsonb_build_object('items', '[{"id":"vinete-sarbatori","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(7, '13:00'), 'code', 'CRACIUN10', 'mode', 'livrare', 'address', 'Str. Test 1'));
  perform pg_temp.ok(coalesce(o.discount, 0) = 0 and (select (l->>'unit')::numeric from jsonb_array_elements(o.items) l where l->>'id' = 'vinete-sarbatori') = 40, 'livrare + cod promo: tot preț întreg (40 lei)');
  -- nu se amestecă produse de sărbători cu altele
  e := pg_temp.err(jsonb_build_object('items', '[{"id":"platou-festiv","qty":1},{"id":"smash","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(5, '13:00')));
  perform pg_temp.ok(e like 'Produsele de sărbători se comandă separat%', 'sărbători + alt produs în aceeași comandă: refuzat');
  -- zi „pe parcursul zilei” (ca 24 / 31 decembrie): fără oră
  update public.settings set holiday_fullday = array[(now() at time zone 'Europe/Bucharest')::date + 6] where id = 1;
  e := pg_temp.err(jsonb_build_object('items', '[{"id":"platou-festiv","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(6, '13:00')));
  perform pg_temp.ok(e like 'Pe % livrăm pe parcursul zilei%', 'ziua de Crăciun/Revelion: nu se alege ora');
  o := pg_temp.place(jsonb_build_object('items', '[{"id":"ciolan-varza","qty":2}]'::jsonb, 'scheduled_for', pg_temp.at(6, '10:00')));
  perform pg_temp.ok(public.is_fullday(o.scheduled_for), 'comanda „pe parcursul zilei” e acceptată');
  perform pg_temp.ok(public.order_due(o) = (((now() at time zone 'Europe/Bucharest')::date + 6 + time '21:30') at time zone 'Europe/Bucharest'), 'livrarea e datorată până la închidere (fără alarme de la 11:00)');
  perform public.pay_mark_paid(o.id, 'cs_3', 'pi_3');
  perform pg_temp.ok((select delivery_time from public.platter_orders where order_id = o.id) = 'pe parcursul zilei', 'în registru: „pe parcursul zilei”');
  -- comenzile obișnuite nu intră în registru
  o := pg_temp.place(jsonb_build_object('items', '[{"id":"smash","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(1, '14:00')));
  perform public.pay_mark_paid(o.id, 'cs_2', 'pi_2');
  perform pg_temp.ok(not exists (select 1 from public.platter_orders where order_id = o.id), 'comenzile obișnuite nu intră în registru');
end $$;
rollback;
