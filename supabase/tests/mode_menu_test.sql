-- Teste: reduceri după livrare / ridicare, ambalaj, SGR (pe o copie; se anulează). psql -v ON_ERROR_STOP=1 -f supabase/tests/mode_menu_test.sql
begin;
update public.settings set open_time = '00:00', close_time = '23:59:59', accepting_orders = true, min_order = 0, free_delivery_over = 0, delivery_fee = 0 where id = 1;
delete from public.delivery_zones; delete from public.item_discounts; delete from public.promos;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.place(p jsonb) returns public.orders language plpgsql as $$
declare r jsonb; o public.orders;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  r := public.place_order(jsonb_build_object('name','T','phone','0745111222','address','Str. X 1','payment','card') || p);
  select * into o from public.orders where id = (r->>'id')::uuid; return o;
end $$;
update public.items set available = true, active = true, price = 40, variants = null where id = 'smash';
update public.items set available = true, active = true, price = 10, variants = null where id in (select id from public.items where category_id = 'racoritoare' limit 1);
update public.items set available = true, active = true, price = 20, variants = null where id in (select id from public.items where category_id = 'cocktail' limit 1);
update public.items set available = true, active = true, price = 5, variants = null where id in (select id from public.items where category_id = 'sosuri' limit 1);

-- situația din producție înainte de actualizare
insert into public.item_discounts(name, percent, item_ids, active) values
  ('Reducere Burgeri Clasici', 25, '{smash}', true),
  ('10% reducere la tot meniul', 10, (select array_agg(id) from public.items where id <> 'smash'), true);
insert into public.banners(image, active, sort) values ('https://x/storage/v1/object/public/menu/banner-1793693620247.jpg', true, 99);
\i supabase/date_2026-11-meniu.sql
\i supabase/date_2026-11-meniu.sql

do $$
declare o public.orders; s text; c text; sa text; n int;
begin
  select id into s from public.items where category_id = 'racoritoare' and active and price = 10 limit 1;
  select id into c from public.items where category_id = 'cocktail' and active and price = 20 limit 1;
  select id into sa from public.items where category_id = 'sosuri' and active and price = 5 limit 1;
  perform pg_temp.ok((select count(*) from public.item_discounts where active) = 2, 'datele: -25% oprit, rămân 2 reduceri (rulat de două ori)');
  perform pg_temp.ok(not (select active from public.banners where image like '%1793693620247%'), 'bannerul cu 25% e ascuns');
  perform pg_temp.ok(public.item_discount_pct('smash', 'livrare') = 10 and public.item_discount_pct('smash', 'ridicare') = 15, 'smash: 10% livrare, 15% ridicare');
  perform pg_temp.ok(public.item_discount_pct('smash') = 0, 'fără mod ales: nicio reducere de mod');

  -- livrare: 2 burgeri, 1 răcoritoare, 1 cocktail, 1 sos
  o := pg_temp.place(jsonb_build_object('mode', 'livrare', 'items', jsonb_build_array(
    jsonb_build_object('id','smash','qty',2), jsonb_build_object('id',s,'qty',1), jsonb_build_object('id',c,'qty',1), jsonb_build_object('id',sa,'qty',1))));
  perform pg_temp.ok(o.subtotal = 72 + 9 + 18 + 4.5, 'livrare: toate produsele -10% (subtotal ' || o.subtotal || ')');
  perform pg_temp.ok(o.packaging = 2*2 + 0 + 2 + 0, 'ambalaj: burgeri 2 lei/buc, cocktail 2 lei, răcoritoare și sos 0 (' || o.packaging || ')');
  perform pg_temp.ok(o.sgr = 0.5, 'SGR: 0,50 lei la răcoritoare (' || o.sgr || ')');
  perform pg_temp.ok(o.total = o.subtotal + o.packaging + o.sgr, 'total = produse + ambalaj + SGR (' || o.total || ')');
  perform pg_temp.ok((o.items->0->>'disc_pct')::numeric = 10 and (o.items->0->>'old_unit')::numeric = 40, 'linia arată prețul vechi și reducerea');

  -- ridicare: 15%
  o := pg_temp.place(jsonb_build_object('mode', 'ridicare', 'items', jsonb_build_array(jsonb_build_object('id','smash','qty',2), jsonb_build_object('id',s,'qty',2))));
  perform pg_temp.ok(o.subtotal = 68 + 17 and o.sgr = 1 and o.packaging = 4 and o.total = 85 + 1 + 4, 'ridicare: -15%, SGR 2×0,50, ambalaj 4 (total ' || o.total || ')');

  -- produs nou adăugat după reducere: tot are -15% la ridicare (all_items)
  insert into public.items(id, category_id, name_ro, price, active, available) values ('test-nou', 'desert', 'Desert nou', 30, true, true);
  o := pg_temp.place('{"mode":"ridicare","items":[{"id":"test-nou","qty":1}]}');
  perform pg_temp.ok(o.subtotal = 25.5, 'produs nou: -15% automat la ridicare');
end $$;
rollback;
