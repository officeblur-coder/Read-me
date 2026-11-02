-- Teste zone de livrare (pe o copie a bazei; totul se anulează). psql -v ON_ERROR_STOP=1 -f supabase/tests/zones_test.sql
begin;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.place(p jsonb) returns public.orders language plpgsql as $$
declare r jsonb; o public.orders;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  r := public.place_order(jsonb_build_object('name','T','phone','07','mode','livrare','address','Str. Test 1','payment','card') || p);
  select * into o from public.orders where id = (r->>'id')::uuid; return o;
end $$;
update public.settings set accepting_orders = true, min_order = 0, delivery_fee = 10, free_delivery_over = 100 where id = 1;
update public.items set available = true, active = true where id = 'smash';
delete from public.delivery_zones;

do $$
declare o public.orders;
begin
  -- fără zone: comportamentul vechi
  o := pg_temp.place('{"items":[{"id":"smash","qty":1}]}');
  perform pg_temp.ok(o.delivery_fee = 10 and o.zone_name is null, 'fără zone: taxa generală');

  -- „Oraș” (mic) în interiorul „Împrejurimi” (mare)
  insert into public.delivery_zones(name, polygon, fee, min_order, free_over) values
    ('Împrejurimi', '[[46.40,24.45],[46.62,24.45],[46.62,24.75],[46.40,24.75]]', 20, 80, 200),
    ('Oraș', '[[46.52,24.52],[46.57,24.52],[46.57,24.60],[46.52,24.60]]', 8, 40, 120);
  o := pg_temp.place('{"lat":46.545,"lng":24.56,"items":[{"id":"smash","qty":2}]}');
  perform pg_temp.ok(o.zone_name = 'Oraș' and o.delivery_fee = 8, 'zonele suprapuse: câștigă cea mai mică');
  o := pg_temp.place('{"lat":46.48,"lng":24.63,"items":[{"id":"smash","qty":4}]}');
  perform pg_temp.ok(o.zone_name = 'Împrejurimi' and o.delivery_fee = 20 and o.lat = 46.48, 'împrejurimi: taxa zonei și coordonatele salvate');
  o := pg_temp.place('{"lat":46.48,"lng":24.63,"items":[{"id":"smash","qty":8}]}');
  perform pg_temp.ok(o.delivery_fee = 0, 'livrare gratuită peste pragul zonei');
  begin
    perform pg_temp.place('{"lat":46.48,"lng":24.63,"items":[{"id":"smash","qty":1}]}');
    perform pg_temp.ok(false, 'comanda minimă a zonei');
  exception when others then perform pg_temp.ok(sqlerrm like '%minimă%Împrejurimi%', 'comanda minimă a zonei'); end;
  begin
    perform pg_temp.place('{"lat":47.10,"lng":24.50,"items":[{"id":"smash","qty":4}]}');
    perform pg_temp.ok(false, 'în afara zonelor');
  exception when others then perform pg_temp.ok(sqlerrm like '%nu livrăm%', 'adresă în afara zonelor respinsă'); end;
  begin
    perform pg_temp.place('{"items":[{"id":"smash","qty":4}]}');
    perform pg_temp.ok(false, 'fără pin');
  exception when others then perform pg_temp.ok(sqlerrm like '%hartă%', 'livrare fără punct pe hartă respinsă'); end;
  o := pg_temp.place('{"mode":"ridicare","items":[{"id":"smash","qty":1}]}');
  perform pg_temp.ok(o.delivery_fee = 0 and o.zone_name is null, 'ridicarea nu cere zonă');
  update public.delivery_zones set active = false where name = 'Oraș';
  o := pg_temp.place('{"lat":46.545,"lng":24.56,"items":[{"id":"smash","qty":4}]}');
  perform pg_temp.ok(o.zone_name = 'Împrejurimi', 'zona dezactivată nu mai contează');
end $$;
rollback;
\echo 'Toate testele pentru zonele de livrare au trecut.'
