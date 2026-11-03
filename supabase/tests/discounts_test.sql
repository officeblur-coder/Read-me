-- Teste reduceri pe produse (pe o copie a bazei; totul se anulează). psql -v ON_ERROR_STOP=1 -f supabase/tests/discounts_test.sql
begin;
update public.settings set open_time = '00:00', close_time = '23:59:59', accepting_orders = true, min_order = 0 where id = 1;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.place(p jsonb) returns public.orders language plpgsql as $$
declare r jsonb; o public.orders;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  r := public.place_order(jsonb_build_object('name','T','phone','07','mode','ridicare','payment','card') || p);
  select * into o from public.orders where id = (r->>'id')::uuid; return o;
end $$;
delete from public.delivery_zones; delete from public.item_discounts;
update public.items set available = true, active = true, price = 40 where id = 'smash';
insert into public.promo_codes(code, percent, label, active) values ('TEST10', 10, '-10% test', true) on conflict (code) do update set percent = 10, category_id = null, active = true;

do $$
declare o public.orders; v public.items; extra text;
begin
  o := pg_temp.place('{"items":[{"id":"smash","qty":2}]}');
  perform pg_temp.ok(o.subtotal = 80, 'fără reducere: preț întreg');

  insert into public.item_discounts(name, percent, item_ids) values ('Burgeri -25%', 25, '{smash}');
  o := pg_temp.place('{"items":[{"id":"smash","qty":2}]}');
  perform pg_temp.ok(o.subtotal = 60 and (o.items->0->>'old_unit')::numeric = 40 and (o.items->0->>'disc_pct')::numeric = 25, '-25%: 2 × 30 lei, prețul vechi salvat pe linie');

  insert into public.item_discounts(name, percent, item_ids) values ('Mai mic', 10, '{smash}');
  o := pg_temp.place('{"items":[{"id":"smash","qty":1}]}');
  perform pg_temp.ok(o.subtotal = 30, 'două reduceri: se aplică cea mai mare');

  update public.item_discounts set active = false;
  o := pg_temp.place('{"items":[{"id":"smash","qty":1}]}');
  perform pg_temp.ok(o.subtotal = 40, 'reducere oprită: preț întreg');

  update public.item_discounts set active = true, ends_at = now() - interval '1 minute' where name = 'Burgeri -25%';
  update public.item_discounts set active = false where name = 'Mai mic';
  o := pg_temp.place('{"items":[{"id":"smash","qty":1}]}');
  perform pg_temp.ok(o.subtotal = 40, 'reducere expirată: preț întreg');
  update public.item_discounts set ends_at = null, starts_at = now() + interval '1 day' where name = 'Burgeri -25%';
  o := pg_temp.place('{"items":[{"id":"smash","qty":1}]}');
  perform pg_temp.ok(o.subtotal = 40, 'reducere care începe mâine: preț întreg azi');
  update public.item_discounts set starts_at = null where name = 'Burgeri -25%';

  -- extra nu primește reducere
  select x into extra from public.items i, unnest(array['cartofi','cartofi-prajiti','sos']) x where i.id = x and i.active limit 1;
  if extra is not null then
    update public.items set available = true where id = extra;
    o := pg_temp.place(jsonb_build_object('items', jsonb_build_array(jsonb_build_object('id','smash','qty',1,'extras',jsonb_build_array(extra)))));
    perform pg_temp.ok(o.subtotal = 30 + (select price from public.items where id = extra), 'extra la preț întreg, doar produsul redus');
  end if;

  -- variante: fiecare porție redusă
  select * into v from public.items where variants is not null and jsonb_array_length(variants) > 1 and active limit 1;
  update public.items set available = true where id = v.id;
  insert into public.item_discounts(name, percent, item_ids) values ('Var', 50, array[v.id]);
  o := pg_temp.place(jsonb_build_object('items', jsonb_build_array(jsonb_build_object('id', v.id, 'qty', 1, 'vi', 1))));
  perform pg_temp.ok(o.subtotal = round((v.variants->1->>'p')::numeric * 0.5, 2), 'variantă: porția a doua la -50%');

  -- codul nu se cumulează cu reducerea
  o := pg_temp.place(jsonb_build_object('code','TEST10','items', jsonb_build_array(jsonb_build_object('id','smash','qty',1), jsonb_build_object('id', v.id, 'qty', 1))));
  perform pg_temp.ok(o.discount = 0, 'cod pe produse deja reduse: fără reducere în plus');
  delete from public.item_discounts where name = 'Var';
  o := pg_temp.place(jsonb_build_object('code','TEST10','items', jsonb_build_array(jsonb_build_object('id','smash','qty',1), jsonb_build_object('id', v.id, 'qty', 1))));
  perform pg_temp.ok(o.discount = round((v.variants->0->>'p')::numeric * 0.10, 2), 'codul se aplică doar produsului fără reducere');

  -- doar adminul scrie
end $$;
-- doar adminul scrie (RLS)
set local role anon;
do $$ begin
  begin insert into public.item_discounts(percent, item_ids) values (50, '{smash}'); raise exception 'TEST EȘUAT: anonimii au creat o reducere';
  exception when insufficient_privilege then raise notice 'ok  anonimii nu pot crea reduceri'; end;
end $$;
reset role;
rollback;
