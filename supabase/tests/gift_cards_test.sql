-- Teste voucher cadou (pe o copie; se anulează). Necesită pg_net (net.http_request_queue). psql -v ON_ERROR_STOP=1 -f supabase/tests/gift_cards_test.sql
begin;
update public.settings set open_time = '00:00', close_time = '23:59:59', accepting_orders = true, min_order = 50, free_delivery_over = 100, delivery_fee = 10, confirm_eta = false where id = 1;
delete from public.delivery_zones; delete from public.item_discounts; delete from public.promos;
delete from vault.decrypted_secrets where name = 'resend_api_key';
insert into vault.decrypted_secrets(name, decrypted_secret) values ('resend_api_key', 're_test');
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
declare o public.orders; e text; rec uuid := gen_random_uuid(); r jsonb; n0 int; t uuid; c text;
begin
  insert into auth.users(id, email) values (rec, 'marco@gift.ro');
  insert into public.staff(user_id, name, role) values (rec, 'Marco', 'reception');
  perform pg_temp.ok((select kind from public.items where id = 'card-cadou') = 'gift' and (select jsonb_array_length(variants) from public.items where id = 'card-cadou') = 5, 'produsul Card cadou există, cu 5 valori');

  e := pg_temp.err('{"mode":"ridicare","items":[{"id":"card-cadou","vi":2}]}');
  perform pg_temp.ok(e like 'Adaugă adresa ta de email%', 'fără email: refuzat');
  e := pg_temp.err('{"mode":"ridicare","email":"nu-e-email","items":[{"id":"card-cadou","vi":2}]}');
  perform pg_temp.ok(e like 'Adaugă adresa ta de email%', 'email invalid: refuzat');

  -- doar voucher, cu livrare aleasă: fără adresă, fără taxă, fără comandă minimă, fără reduceri
  o := pg_temp.place('{"mode":"livrare","email":"ana@test.ro","code":"TOT20","items":[{"id":"card-cadou","vi":2,"qty":1}]}');
  perform pg_temp.ok(o.subtotal = 200 and o.discount = 0 and o.delivery_fee = 0 and o.packaging = 0 and o.sgr = 0 and o.total = 200, 'voucher 200 lei: fără reducere, cod, livrare, ambalaj (total ' || o.total || ')');
  perform pg_temp.ok(o.points_earned = 0 and o.address like 'Voucher cadou%', 'fără puncte; adresa: voucher pe email');

  -- voucher + mâncare la ridicare: doar mâncarea are -15%; voucherul nu ajută la livrare gratuită
  o := pg_temp.place('{"mode":"ridicare","email":"ana@test.ro","items":[{"id":"smash","qty":2},{"id":"card-cadou","vi":0}]}');
  perform pg_temp.ok(o.subtotal = 68 + 100, 'ridicare: burgeri -15%, voucher 100 întreg (' || o.subtotal || ')');
  o := pg_temp.place('{"mode":"livrare","email":"ana@test.ro","address":"Str. X 1","items":[{"id":"smash","qty":2},{"id":"card-cadou","vi":4}]}');
  perform pg_temp.ok(o.subtotal = 72 + 500 and o.delivery_fee = 10, 'livrare: 72 lei mâncare + 500 voucher → taxa de livrare rămâne (sub 100 lei mâncare)');
  e := pg_temp.err('{"mode":"livrare","email":"ana@test.ro","items":[{"id":"smash","qty":2},{"id":"card-cadou","vi":0}]}');
  perform pg_temp.ok(e like 'Completează adresa%', 'cu mâncare la livrare: adresa e obligatorie');
  e := pg_temp.err('{"mode":"ridicare","email":"ana@test.ro","items":[{"id":"smash","qty":1},{"id":"card-cadou","vi":0}]}');
  perform pg_temp.ok(e like 'Comanda minimă%', 'comanda minimă se calculează fără voucher');

  -- emiterea: la finalizare, câte un cod pe bucată, cu email
  o := pg_temp.place('{"mode":"ridicare","email":"ana@test.ro","items":[{"id":"card-cadou","vi":1,"qty":2}]}');
  select token into t from public.orders where id = o.id;
  perform set_config('request.jwt.claim.sub', rec::text, true);
  update public.orders set status = 'prep', eta_min = 5 where id = o.id;
  perform pg_temp.ok(jsonb_array_length(public.order_gift_cards(t)) = 0, 'înainte de finalizare: niciun cod');
  n0 := (select count(*) from net.http_request_queue where url like '%resend%' and convert_from(body, 'utf8') like '%Cardul tău cadou%');
  update public.orders set status = 'done' where id = o.id;
  r := public.order_gift_cards(t);
  perform pg_temp.ok(jsonb_array_length(r) = 2 and (r->0->>'value')::numeric = 150 and r->0->>'code' ~ '^LYRA-[A-Z2-9]{4}-[A-Z2-9]{4}$', '2 vouchere de 150 lei: ' || (r->0->>'code'));
  perform pg_temp.ok((select count(*) from net.http_request_queue where url like '%resend%' and convert_from(body, 'utf8')::jsonb->>'subject' like 'Cardul tău cadou Lyra de 150 lei%') = n0 + 2, 'două emailuri cu voucher trimise');
  update public.orders set rating = 5 where id = o.id;
  perform pg_temp.ok(jsonb_array_length(public.order_gift_cards(t)) = 2, 'nu se emit de două ori');

  -- folosire la restaurant
  c := r->0->>'code';
  r := public.admin_gift_use(lower(c), 'masă 4');
  perform pg_temp.ok(r->>'status' = 'used' and r->>'used_by' = 'Marco', 'recepția marchează voucherul folosit');
  begin perform public.admin_gift_use(c); e := null; exception when sqlstate 'P0001' then e := sqlerrm; end;
  perform pg_temp.ok(e like 'Voucherul a fost deja folosit%', 'a doua folosire: refuzată');
  perform pg_temp.ok(jsonb_array_length(public.admin_gift_cards(o.number::text)) = 2, 'căutare după numărul comenzii');

  -- rambursare: voucherele nefolosite se anulează
  update public.orders set status = 'refunded' where id = o.id;
  perform pg_temp.ok((select count(*) from public.gift_cards where order_id = o.id and status = 'cancelled') = 1
    and (select count(*) from public.gift_cards where order_id = o.id and status = 'used') = 1, 'rambursată: cel nefolosit se anulează, cel folosit rămâne');
  perform set_config('request.jwt.claim.sub', '', true);
  perform pg_temp.ok(public.admin_gift_cards('') is null, 'anonimul nu vede voucherele');
end $$;
rollback;
