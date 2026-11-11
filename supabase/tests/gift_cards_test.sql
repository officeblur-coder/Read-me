-- Teste card cadou fizic (pe o copie; se anulează). psql -v ON_ERROR_STOP=1 -f supabase/tests/gift_cards_test.sql
begin;
update public.settings set open_time = '00:00', close_time = '23:59:59', accepting_orders = true, min_order = 50, free_delivery_over = 100, delivery_fee = 10, confirm_eta = false where id = 1;
delete from public.delivery_zones; delete from public.item_discounts; delete from public.promos;
insert into public.item_discounts(name, percent, item_ids, active, mode, all_items) values ('15% ridicare', 15, '{}', true, 'ridicare', true), ('10% livrare', 10, '{}', true, 'livrare', true);
insert into public.promo_codes(code, percent, label, active) values ('TOT20', 20, '-20%', true) on conflict (code) do update set percent = 20, category_id = null, active = true;
update public.items set available = true, active = true, price = 40, variants = null where id = 'smash';
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.err(p jsonb) returns text language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', '', true);
  perform public.place_order(jsonb_build_object('name','Ana Pop','phone','0745111222','payment','card') || p); return null;
exception when sqlstate 'P0001' then return sqlerrm; end $$;
create function pg_temp.place(p jsonb) returns public.orders language plpgsql as $$
declare r jsonb; o public.orders;
begin perform set_config('request.jwt.claim.sub', '', true);
  r := public.place_order(jsonb_build_object('name','Ana Pop','phone','0745111222','payment','card') || p);
  select * into o from public.orders where id = (r->>'id')::uuid; return o; end $$;

do $$
declare o public.orders; e text;
begin
  perform pg_temp.ok((select kind from public.items where id = 'card-cadou') = 'gift' and (select jsonb_array_length(variants) from public.items where id = 'card-cadou') = 5, 'produsul Card cadou există, cu 5 valori');
  perform pg_temp.ok(to_regclass('public.gift_cards') is null, 'fără coduri / tabel de vouchere');

  -- fără email: se poate comanda (card fizic)
  o := pg_temp.place('{"mode":"ridicare","code":"TOT20","items":[{"id":"card-cadou","vi":2,"qty":1}]}');
  perform pg_temp.ok(o.subtotal = 200 and o.discount = 0 and o.packaging = 0 and o.sgr = 0 and o.total = 200 and o.points_earned = 0, 'ridicare: card 200 lei fără reducere, cod, ambalaj, puncte (total ' || o.total || ')');
  -- doar card cadou la livrare: se livrează (adresă obligatorie, taxa de livrare), fără comandă minimă
  e := pg_temp.err('{"mode":"livrare","items":[{"id":"card-cadou","vi":0}]}');
  perform pg_temp.ok(e like 'Completează adresa%', 'livrare: adresa e obligatorie și pentru cardul cadou');
  o := pg_temp.place('{"mode":"livrare","address":"Str. X 1","items":[{"id":"card-cadou","vi":0}]}');
  perform pg_temp.ok(o.subtotal = 100 and o.delivery_fee = 10 and o.total = 110, 'livrare: card 100 lei + taxa de livrare 10 lei');
  -- cu mâncare: doar mâncarea are reducere; cardul nu contează la livrarea gratuită și la comanda minimă
  o := pg_temp.place('{"mode":"livrare","address":"Str. X 1","items":[{"id":"smash","qty":2},{"id":"card-cadou","vi":4}]}');
  perform pg_temp.ok(o.subtotal = 72 + 500 and o.delivery_fee = 10, 'livrare: 72 lei mâncare (-10%) + 500 card, taxa rămâne');
  o := pg_temp.place('{"mode":"ridicare","items":[{"id":"smash","qty":2},{"id":"card-cadou","vi":0}]}');
  perform pg_temp.ok(o.subtotal = 68 + 100, 'ridicare: burgeri -15%, card 100 întreg');
  e := pg_temp.err('{"mode":"ridicare","items":[{"id":"smash","qty":1},{"id":"card-cadou","vi":0}]}');
  perform pg_temp.ok(e like 'Comanda minimă%', 'comanda minimă se calculează fără cardul cadou');
  perform pg_temp.ok((o.items->1->>'giftcard')::boolean and o.items->1->>'variant' = '100 lei', 'pe bon: Card cadou · 100 lei');
end $$;
rollback;
