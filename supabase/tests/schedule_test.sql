-- Teste program și precomenzi (pe o copie a bazei; totul se anulează). psql -v ON_ERROR_STOP=1 -f supabase/tests/schedule_test.sql
begin;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.err(p jsonb) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform public.place_order(jsonb_build_object('name','T','phone','07','mode','ridicare','payment','card','items','[{"id":"smash","qty":1}]'::jsonb) || p);
  return null;
exception when sqlstate 'P0001' then return sqlerrm;
end $$;
-- ora locală (România) de mâine / azi, ca timestamptz
create function pg_temp.at(days int, hhmm text) returns text language sql as $$
  select ((((now() at time zone 'Europe/Bucharest')::date + days) + hhmm::time) at time zone 'Europe/Bucharest')::text $$;
update public.items set available = true, active = true where id = 'smash';
delete from public.delivery_zones;
update public.settings set accepting_orders = true, min_order = 0, open_days = '{1,2,3,4,5,6,7}', preorder_on = true,
  preorder_from = '12:00', preorder_days = 2, preorder_lead_min = 45 where id = 1;

do $$
declare e text;
begin
  -- închis acum (program care exclude ora curentă)
  update public.settings set open_time = ((now() at time zone 'Europe/Bucharest')::time + interval '2 hours')::time,
    close_time = ((now() at time zone 'Europe/Bucharest')::time + interval '3 hours')::time where id = 1;
  if (now() at time zone 'Europe/Bucharest')::time < '20:30' then
    e := pg_temp.err('{}');
    perform pg_temp.ok(e like 'Acum suntem închiși%', 'închis: comanda „cât mai curând” e refuzată (' || coalesce(e,'acceptată') || ')');
  end if;
  -- deschis non-stop
  update public.settings set open_time = '00:00', close_time = '23:59:59' where id = 1;
  perform pg_temp.ok(pg_temp.err('{}') is null, 'deschis: comanda „cât mai curând” trece');
  update public.settings set accepting_orders = false where id = 1;
  perform pg_temp.ok(pg_temp.err('{}') like 'Restaurantul nu preia%', 'recepția a oprit preluarea: „cât mai curând” refuzat');
  perform pg_temp.ok(pg_temp.err(jsonb_build_object('scheduled_for', pg_temp.at(1, '13:30'))) is null, 'recepția oprită: precomanda pentru mâine trece');

  update public.settings set open_time = '11:00', close_time = '22:00', accepting_orders = true where id = 1;
  perform pg_temp.ok(pg_temp.err(jsonb_build_object('scheduled_for', pg_temp.at(1, '12:00'))) is null, 'mâine la 12:00 e permis');
  update public.settings set preorder_until = '21:45' where id = 1;
  perform pg_temp.ok(pg_temp.err(jsonb_build_object('scheduled_for', pg_temp.at(1, '21:45'))) is null, 'mâine la 21:45 e permis (ultima oră)');
  perform pg_temp.ok(pg_temp.err(jsonb_build_object('scheduled_for', pg_temp.at(1, '22:00'))) like 'Poți programa între 12:00 și 21:45%', 'mâine la 22:00 refuzat (după 21:45)');
  perform pg_temp.ok(pg_temp.err(jsonb_build_object('scheduled_for', pg_temp.at(1, '11:30'))) like 'Poți programa între 12:00 și 21:45%', 'mâine la 11:30 refuzat (înainte de 12)');
  perform pg_temp.ok(pg_temp.err(jsonb_build_object('scheduled_for', pg_temp.at(1, '22:15'))) like 'Poți programa între%', 'mâine la 22:15 refuzat');
  perform pg_temp.ok(pg_temp.err(jsonb_build_object('scheduled_for', pg_temp.at(3, '13:00'))) like 'Poți programa cel mult%', 'peste 3 zile refuzat');
  perform pg_temp.ok(pg_temp.err(jsonb_build_object('scheduled_for', (now() + interval '10 minutes')::text)) like 'Alege o oră%', 'prea curând refuzat');
  update public.settings set open_days = array_remove('{1,2,3,4,5,6,7}'::int[], extract(isodow from (now() at time zone 'Europe/Bucharest')::date + 1)::int) where id = 1;
  perform pg_temp.ok(pg_temp.err(jsonb_build_object('scheduled_for', pg_temp.at(1, '13:00'))) like 'În ziua aleasă%', 'zi liberă refuzată');
  update public.settings set open_days = '{1,2,3,4,5,6,7}', preorder_on = false where id = 1;
  perform pg_temp.ok(pg_temp.err(jsonb_build_object('scheduled_for', pg_temp.at(1, '13:00'))) like 'Precomenzile nu%', 'precomenzi oprite');
  update public.settings set preorder_on = true where id = 1;
  perform pg_temp.ok((select scheduled_for = pg_temp.at(1, '12:00')::timestamptz from public.orders where scheduled_for is not null order by created_at desc, scheduled_for limit 1)
    or exists (select 1 from public.orders where scheduled_for = pg_temp.at(1, '12:00')::timestamptz), 'ora aleasă e salvată pe comandă');
  -- raport: precomanda de mâine nu e „ratată”
  update public.orders set created_at = now() - interval '2 hours' where scheduled_for is not null;
  insert into auth.users(id, email) values ('00000000-0000-4000-8000-0000000000ad', 'admin@t.ro');
  insert into public.staff(user_id, name, role) values ('00000000-0000-4000-8000-0000000000ad', 'Admin', 'admin');
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000ad', true);
  update public.orders set status = 'done' where scheduled_for is null and status = 'new';
  perform pg_temp.ok(((public.admin_report(now() - interval '1 day', now() + interval '1 day'))->'summary'->>'unanswered')::int = 0, 'precomanda neacceptată încă nu apare ca ratată');
end $$;
rollback;
