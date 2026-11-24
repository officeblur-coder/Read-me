-- Teste pornire / oprire automată după program (pe o copie a bazei; totul se anulează)
begin;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
do $$
declare loc time := (now() at time zone 'Europe/Bucharest')::time;
begin
  -- program care include ora curentă: pornește singur
  update public.settings set open_days = '{1,2,3,4,5,6,7}', open_time = (loc - interval '1 hour')::time, close_time = (loc + interval '1 hour')::time,
    accepting_orders = false, auto_open = true, auto_state = null where id = 1;
  if loc between '01:05' and '22:55' then
    perform pg_temp.ok(public.auto_open_tick(), 'în program: ora e în program');
    perform pg_temp.ok((select accepting_orders from public.settings where id = 1), 'în program: comenzile online pornesc singure');
    -- recepția oprește de mână: rămâne oprit până la următoarea schimbare din program
    update public.settings set accepting_orders = false where id = 1;
    perform public.auto_open_tick();
    perform pg_temp.ok(not (select accepting_orders from public.settings where id = 1), 'oprit de mână în program: nu repornește singur');
    -- s-a terminat programul: se oprește
    update public.settings set accepting_orders = true, close_time = (loc - interval '10 minutes')::time where id = 1;
    perform public.auto_open_tick();
    perform pg_temp.ok(not (select accepting_orders from public.settings where id = 1), 'după închidere: comenzile online se opresc singure');
  end if;
  -- fără pornire automată: nu se atinge nimic
  update public.settings set auto_open = false, accepting_orders = true, auto_state = null where id = 1;
  perform pg_temp.ok(public.auto_open_tick() is null, 'pornirea automată oprită din admin');
  perform pg_temp.ok((select accepting_orders from public.settings where id = 1), 'pornirea automată oprită din admin: nu schimbă nimic');
end $$;
rollback;
