-- Teste rapoarte (pe o copie; se anulează). psql -v ON_ERROR_STOP=1 -f supabase/tests/reports_test.sql
begin;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
update public.settings set accepting_orders = true, min_order = 0 where id = 1;
delete from public.delivery_zones;
do $$
declare adm uuid := gen_random_uuid(); rec uuid := gen_random_uuid(); sid uuid; o1 uuid; o2 uuid; o3 uuid; r jsonb; t0 timestamptz := now() - interval '1 hour';
begin
  insert into auth.users(id, email) values (adm, 'admin@r.ro'), (rec, 'marco@lyrasdelivery.ro');
  insert into public.staff(user_id, name, role) values (adm, 'Admin', 'admin'), (rec, 'Marco', 'reception');
  perform set_config('request.jwt.claim.sub', rec::text, true);
  sid := public.console_open('test');
  perform public.console_ping(sid);
  update public.settings set accepting_orders = false where id = 1;
  update public.settings set accepting_orders = true where id = 1;
  perform set_config('request.jwt.claim.sub', '', true);
  o1 := (public.place_order('{"name":"A","phone":"1","mode":"ridicare","payment":"card","items":[{"id":"smash","qty":1}]}')->>'id')::uuid;
  o2 := (public.place_order('{"name":"B","phone":"1","mode":"ridicare","payment":"card","items":[{"id":"smash","qty":1}]}')->>'id')::uuid;
  o3 := (public.place_order('{"name":"C","phone":"1","mode":"ridicare","payment":"card","items":[{"id":"smash","qty":1}]}')->>'id')::uuid;
  update public.orders set created_at = now() - interval '50 minutes' where id in (o1, o2, o3);
  perform set_config('request.jwt.claim.sub', rec::text, true);
  update public.orders set status = 'prep', eta_min = 30, accepted_at = created_at + interval '7 minutes' where id = o1;
  update public.orders set eta_min = 40 where id = o1;
  update public.orders set status = 'done', done_at = accepted_at + interval '41 minutes' where id = o1;
  update public.orders set status = 'rejected', reject_reason = 'Epuizat' where id = o2;
  perform public.console_close(sid);
  perform pg_temp.ok((select accepted_by_name from public.orders where id = o1) = 'Marco', 'acceptat de Marco');
  perform pg_temp.ok((select eta_first from public.orders where id = o1) = 30, 'timpul promis inițial rămâne 30 după amânare');
  perform pg_temp.ok((select rejected_by_name from public.orders where id = o2) = 'Marco', 'refuzat de Marco');
  perform set_config('request.jwt.claim.sub', adm::text, true);
  r := public.admin_report(t0, now() + interval '1 minute');
  perform pg_temp.ok((r->'summary'->>'orders')::int = 3 and (r->'summary'->>'rejected')::int = 1 and (r->'summary'->>'unanswered')::int = 1, 'raport: 3 comenzi, 1 refuzată, 1 nepreluată');
  perform pg_temp.ok((r->'summary'->>'missed')::int = 2 and (r->'summary'->>'slow_accept')::int = 1, 'ratate = refuzate + nepreluate; 1 acceptată după 5 min');
  perform pg_temp.ok((r->'summary'->>'late')::int = 1 and (r->'summary'->>'avg_actual_min')::numeric = 41, 'livrare 41 min față de 30 promise = întârziată');
  perform pg_temp.ok(jsonb_array_length(r->'sessions') = 1 and (r->'sessions'->0->>'name') = 'Marco', 'sesiunea consolei apare');
  perform pg_temp.ok((select count(*) from jsonb_array_elements(r->'events') e where e->>'kind' in ('accepting_off','accepting_on')) = 2, 'oprirea/pornirea preluării apare');
  perform set_config('request.jwt.claim.sub', rec::text, true);
  begin perform public.admin_report(t0, now()); perform pg_temp.ok(false, 'recepția nu vede raportul');
  exception when others then perform pg_temp.ok(sqlerrm like '%administratorul%', 'doar adminul vede raportul'); end;
end $$;
rollback;
\echo 'Toate testele pentru rapoarte au trecut.'
