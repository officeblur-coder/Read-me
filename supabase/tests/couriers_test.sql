-- Teste livratori (pe o copie; se anulează). Necesită pg_net (net.http_request_queue). psql -v ON_ERROR_STOP=1 -f supabase/tests/couriers_test.sql
begin;
update public.settings set open_time = '00:00', close_time = '23:59:59', accepting_orders = true, min_order = 0, confirm_eta = false, couriers_on = false where id = 1;
delete from public.delivery_zones; delete from public.item_discounts;
delete from vault.decrypted_secrets where name in ('push_url', 'push_secret');
insert into vault.decrypted_secrets(name, decrypted_secret) values ('push_url', 'https://x.supabase.co/functions/v1/push'), ('push_secret', 's3');
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.err(sql text) returns text language plpgsql as $$
begin execute sql; return null; exception when sqlstate 'P0001' then return sqlerrm; end $$;
create function pg_temp.as_(u uuid) returns void language sql as $$ select set_config('request.jwt.claim.sub', coalesce(u::text, ''), true) $$;
create function pg_temp.pushes(c text) returns int language sql as $$
  select count(*)::int from net.http_request_queue where url like '%/functions/v1/push' and convert_from(body, 'utf8') like '%' || c || '%' $$;

do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); rec uuid := gen_random_uuid(); cli uuid := gen_random_uuid();
  r jsonb; o1 uuid; o2 uuid; o3 uuid; e text; o public.orders; n0 int;
begin
  insert into auth.users(id, email) values (a, 'istvan@lyrasdelivery.ro'), (b, 'pipe@lyrasdelivery.ro'), (rec, 'marco@c.ro'), (cli, 'client@c.ro');
  insert into public.staff(user_id, name, role) values (rec, 'Marco', 'reception');
  -- rândurile din 15_couriers.sql pentru conturile livratorilor
  insert into public.staff(user_id, name, role)
  select u.id, n.name, 'courier'
    from auth.users u join (values ('istvan@lyrasdelivery.ro', 'Istvan'), ('pipe@lyrasdelivery.ro', 'Pipe'),
                                   ('liviu@lyrasdelivery.ro', 'Liviu'), ('zoli@lyrasdelivery.ro', 'Zoli')) n(email, name) on lower(u.email) = n.email
  on conflict (user_id) do update set role = 'courier', name = excluded.name;
  perform pg_temp.as_(rec);
  perform pg_temp.ok(jsonb_array_length(public.couriers()) = 0, 'nimeni n-a pornit tura: recepția nu vede livratori');
  perform pg_temp.as_(a); perform public.courier_shift_start();
  perform pg_temp.as_(b); perform public.courier_shift_start();
  perform pg_temp.as_(rec);
  r := public.couriers();
  perform pg_temp.ok(jsonb_array_length(r) = 2 and r->0->>'name' = 'Istvan' and r->1->>'name' = 'Pipe' and (r->0->>'on_shift')::boolean, 'după „Pornește tura”: recepția îi vede (Istvan, Pipe)');
  -- tura de ieri nu contează
  update public.courier_shifts set day = day - 1 where courier_id = b;
  perform pg_temp.ok(jsonb_array_length(public.couriers()) = 1, 'tura de ieri: livratorul nu mai apare azi');
  perform pg_temp.as_(b); perform public.courier_shift_start(); perform pg_temp.as_(rec);
  perform pg_temp.as_(a); perform public.push_subscribe_courier('{"endpoint":"https://fcm.googleapis.com/a","keys":{"p256dh":"k","auth":"x"}}');
  perform pg_temp.as_(cli);
  perform public.push_subscribe_offers('{"endpoint":"https://fcm.googleapis.com/client","keys":{"p256dh":"k","auth":"x"}}');

  perform pg_temp.as_(null);
  o1 := (public.place_order('{"name":"Ana","phone":"0745111222","mode":"livrare","address":"Str. A 1","payment":"cash","items":[{"id":"smash","qty":1}]}')->>'id')::uuid;
  o2 := (public.place_order('{"name":"Bob","phone":"0745111223","mode":"livrare","address":"Str. B 2","payment":"card","items":[{"id":"smash","qty":1}]}')->>'id')::uuid;
  o3 := (public.place_order('{"name":"Cris","phone":"0745111224","mode":"ridicare","payment":"card","items":[{"id":"smash","qty":1}]}')->>'id')::uuid;
  perform pg_temp.as_(rec);
  update public.orders set status = 'prep', eta_min = 30 where id in (o1, o2, o3);

  -- atribuire: doar recepția; nu la ridicare
  perform pg_temp.as_(a);
  e := pg_temp.err(format('select public.courier_assign(%L, %L)', o1, a));
  perform pg_temp.ok(e like 'Doar recepția%', 'livratorul nu își atribuie singur');
  perform pg_temp.as_(rec);
  e := pg_temp.err(format('select public.courier_assign(%L, %L)', o1, a));
  perform pg_temp.ok(e like 'Livratorii sunt opriți%', 'oprit din admin: atribuirea e refuzată');
  update public.settings set couriers_on = true where id = 1;
  e := pg_temp.err(format('select public.courier_assign(%L, %L)', o3, a));
  perform pg_temp.ok(e like '%ridicare%', 'comanda cu ridicare nu se atribuie');
  n0 := pg_temp.pushes('Comandă nouă');
  perform public.courier_assign(o1, a);
  perform public.courier_assign(o2, a);   -- două comenzi aceluiași livrator
  select * into o from public.orders where id = o1;
  perform pg_temp.ok(o.courier_name = 'Istvan' and o.courier_assigned_at is not null and o.courier_ack_at is null, 'atribuită lui Istvan, neconfirmată');
  perform pg_temp.ok(pg_temp.pushes('Comandă nouă') = n0 + 2 and pg_temp.pushes('fcm.googleapis.com/a') >= 2, 'livratorul primește notificare la fiecare atribuire');

  -- reamintire cât timp nu confirmă (cron)
  update public.orders set courier_pinged_at = now() - interval '2 minutes' where id = o1;
  n0 := pg_temp.pushes('Comandă nouă #');
  perform public.courier_tick();
  perform pg_temp.ok(pg_temp.pushes('Comandă nouă #') = n0 + 1, 'fără confirmare: notificarea se repetă');
  -- confirmare
  perform pg_temp.as_(b);
  e := pg_temp.err(format('select public.courier_ack(%L)', o1));
  perform pg_temp.ok(e like 'Comanda nu mai e atribuită%', 'alt livrator nu poate confirma');
  perform pg_temp.as_(a);
  perform public.courier_ack(o1);
  perform pg_temp.ok((select courier_ack_at from public.orders where id = o1) is not null, 'Istvan a confirmat; recepția vede ora confirmării');

  -- reatribuire către B: confirmarea se resetează
  perform pg_temp.as_(rec);
  perform public.courier_assign(o2, b);
  perform pg_temp.ok((select courier_name from public.orders where id = o2) = 'Pipe' and (select courier_ack_at from public.orders where id = o2) is null, 'reatribuită lui Pipe');

  -- întârziere: după ora promisă, reamintire la 5 minute
  update public.orders set accepted_at = now() - interval '40 minutes', courier_pinged_at = now() - interval '6 minutes' where id = o1;
  n0 := pg_temp.pushes('trebuia livrată');
  perform public.courier_tick();
  perform pg_temp.ok(pg_temp.pushes('trebuia livrată') = n0 + 1, 'după ora promisă: reamintire');
  perform public.courier_tick();
  perform pg_temp.ok(pg_temp.pushes('trebuia livrată') = n0 + 1, 'nu mai des de 5 minute');
  update public.settings set couriers_on = false where id = 1;
  update public.orders set courier_pinged_at = now() - interval '6 minutes' where id = o1;
  perform pg_temp.ok(public.courier_tick() = 0, 'oprit din admin: fără reamintiri');
  update public.settings set couriers_on = true where id = 1;
  perform pg_temp.as_(a);
  perform public.courier_late(o1);
  perform pg_temp.ok((select courier_late_count from public.orders where id = o1) = 1, '„Sunt în întârziere” apare la recepție');

  -- predat clientului (chiar dacă recepția n-a apăsat „Predă curierului”)
  perform public.courier_delivered(o1);
  select * into o from public.orders where id = o1;
  perform pg_temp.ok(o.status = 'done' and o.road_at is not null and o.done_at is not null, 'predat: comanda e livrată');

  -- aplicația Android: tokenul Firebase; notificarea pleacă și pe Firebase
  insert into vault.decrypted_secrets(name, decrypted_secret) values ('fcm_url', 'https://x.supabase.co/functions/v1/fcm');
  perform pg_temp.as_(b);
  perform public.courier_device_register('fcm-token-telefon-B-0123456789');
  perform pg_temp.as_(rec);
  perform public.courier_assign(o2, a);
  perform public.courier_assign(o2, b);
  perform pg_temp.ok((select count(*) from net.http_request_queue where url like '%/functions/v1/fcm' and convert_from(body, 'utf8') like '%fcm-token-telefon-B%') = 1,
    'atribuirea către B trimite notificare Firebase pe telefonul lui');
  perform pg_temp.as_(cli);
  e := pg_temp.err('select public.courier_device_register(''fcm-token-client-0123456789'')');
  perform pg_temp.ok(e like 'Doar livratorii%', 'clientul nu își poate înregistra telefonul ca livrator');
  perform pg_temp.as_(a);

  -- „Ieși”: rămâne în listă azi, marcat ieșit
  perform pg_temp.as_(b); perform public.courier_shift_end(); perform pg_temp.as_(rec);
  r := public.couriers();
  perform pg_temp.ok(exists (select 1 from jsonb_array_elements(r) x where x->>'name' = 'Pipe' and not (x->>'on_shift')::boolean and x->>'ended_at' is not null), 'Pipe a ieșit: apare ca ieșit');
  perform pg_temp.as_(a);

  -- GPS
  perform public.courier_ping(46.54, 24.56, 12, 90, 8, 0.8);
  perform public.courier_ping(46.55, 24.57, 10);
  perform pg_temp.ok((select lat from public.courier_locations where courier_id = a) = 46.55, 'poziția GPS se actualizează');
  perform pg_temp.as_(cli);
  e := pg_temp.err('select public.courier_ping(1, 1)');
  perform pg_temp.ok(e like 'Doar livratorii%', 'clientul nu poate trimite poziție');

  -- ofertele nu ajung pe telefoanele livratorilor
  update public.staff set role = 'admin' where user_id = rec;
  perform pg_temp.as_(rec);
  r := public.admin_push_send('Ofertă', 'Text', '/');
  perform pg_temp.ok((r->>'sent_to')::int = 1, 'oferta merge doar la client, nu la livrator');
end $$;
rollback;
