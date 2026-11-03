-- Teste statistici vizite (pe o copie a bazei; totul se anulează). psql -v ON_ERROR_STOP=1 -f supabase/tests/analytics_test.sql
begin;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
delete from public.site_events;
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); adm uuid := gen_random_uuid(); r jsonb;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  -- A: vine din Facebook, se uită, pune în coș, comandă
  perform public.track(a, 'visit', null, 'facebook', 'telefon');
  perform public.track(a, 'visit', null, 'facebook', 'telefon');          -- dublură: nu se numără
  perform public.track(a, 'view_item', 'smash'); perform public.track(a, 'view_item', 'smash');
  perform public.track(a, 'add_cart', 'smash'); perform public.track(a, 'checkout'); perform public.track(a, 'order', '1050');
  -- B: Google, caută, pune în coș, abandonează la plată
  perform public.track(b, 'visit', null, 'google', 'calculator');
  perform public.track(b, 'search', 'ciolan'); perform public.track(b, 'add_cart', 'smash'); perform public.track(b, 'checkout');
  -- C: intră și pleacă
  perform public.track(c, 'visit', null, null, 'telefon');
  perform public.track(c, 'hack', 'x');                                       -- tip necunoscut: ignorat
  perform pg_temp.ok((select count(*) from public.site_events) = 10, 'evenimente salvate o singură dată pe sesiune');

  insert into auth.users(id, email) values (adm, 'adm@t.ro'); insert into public.staff(user_id, name, role) values (adm, 'Admin', 'admin');
  perform set_config('request.jwt.claim.sub', adm::text, true);
  r := public.admin_traffic(now() - interval '1 hour', now() + interval '1 hour');
  perform pg_temp.ok((r->'funnel'->>'visits')::int = 3 and (r->'funnel'->>'cart')::int = 2 and (r->'funnel'->>'checkout')::int = 2 and (r->'funnel'->>'orders')::int = 1, 'pâlnia: 3 vizite → 2 coș → 2 plată → 1 comandă');
  perform pg_temp.ok((r->>'abandoned')::int = 1, 'un coș abandonat');
  perform pg_temp.ok(exists (select 1 from jsonb_array_elements(r->'sources') x where x->>'source' = 'facebook' and (x->>'orders')::int = 1), 'sursa facebook cu o comandă');
  perform pg_temp.ok(exists (select 1 from jsonb_array_elements(r->'sources') x where x->>'source' = 'direct'), 'vizita fără sursă apare ca direct');
  perform pg_temp.ok((r->'items'->0->>'id') = 'smash' and (r->'items'->0->>'views')::int = 1 and (r->'items'->0->>'carts')::int = 2, 'produsul: 1 vizualizare, 2 adăugări în coș');
  perform pg_temp.ok((r->'searches'->0->>'term') = 'ciolan', 'căutarea apare');
  perform pg_temp.ok(jsonb_array_length(r->'sessions') = 3 and jsonb_array_length(r->'sessions'->0->'steps') >= 1, 'ultimele vizite cu pașii lor');

  perform set_config('request.jwt.claim.sub', '', true);
  begin perform public.admin_traffic(now() - interval '1 hour', now()); perform pg_temp.ok(false, 'anonimii nu văd raportul');
  exception when sqlstate 'P0001' then perform pg_temp.ok(true, 'anonimii nu văd raportul'); end;
end $$;
set local role anon;
do $$ begin
  begin insert into public.site_events(sid, kind) values (gen_random_uuid(), 'visit'); raise exception 'TEST EȘUAT: insert direct permis';
  exception when insufficient_privilege then raise notice 'ok  scriere directă blocată (doar prin track)'; end;
  perform 1 from public.site_events limit 1;
  raise notice 'ok  anonimii nu citesc evenimentele (0 rânduri vizibile)';
end $$;
reset role;
rollback;
