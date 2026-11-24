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
  holiday_from = (now() at time zone 'Europe/Bucharest')::date + 2, holiday_until = (now() at time zone 'Europe/Bucharest')::date + 30 where id = 1;
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

  -- comandă bună: peste 10 zile, ridicare (−15%), 2 platouri + ciorbă
  o := pg_temp.place(jsonb_build_object('items', '[{"id":"platou-festiv","qty":2},{"id":"ciorba-burta-sarbatori","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(10, '13:00')));
  perform pg_temp.ok(o.pay_status = 'pending' and o.payment = 'online', 'precomanda așteaptă plata online');
  perform pg_temp.ok((select (l->>'unit')::numeric from jsonb_array_elements(o.items) l where l->>'id' = 'platou-festiv') = 216.75, 'reducerea de ridicare −15%: 255 → 216,75');
  perform pg_temp.ok((select (l->>'qty')::int = 2 and (l->>'unit')::numeric = 0 from jsonb_array_elements(o.items) l where l->>'id' = 'vin-casa'), 'două sticle de vin din partea casei, gratuit');
  perform pg_temp.ok(o.total = 216.75 * 2 + 85 and o.packaging = 0, 'totalul (prețurile includ ambalajul)');
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
  -- comenzile obișnuite nu intră în registru
  o := pg_temp.place(jsonb_build_object('items', '[{"id":"smash","qty":1}]'::jsonb, 'scheduled_for', pg_temp.at(1, '14:00')));
  perform public.pay_mark_paid(o.id, 'cs_2', 'pi_2');
  perform pg_temp.ok(not exists (select 1 from public.platter_orders where order_id = o.id), 'comenzile obișnuite nu intră în registru');
end $$;
rollback;
