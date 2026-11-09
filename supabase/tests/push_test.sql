-- Teste notificări (pe o copie; se anulează). Necesită pg_net (net.http_request_queue). psql -v ON_ERROR_STOP=1 -f supabase/tests/push_test.sql
begin;
update public.settings set open_time = '00:00', close_time = '23:59:59', accepting_orders = true, min_order = 0, confirm_eta = true, offer_window_min = 5 where id = 1;
delete from public.delivery_zones;
delete from vault.decrypted_secrets where name in ('push_url', 'push_secret');
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.err(sql text) returns text language plpgsql as $$
begin execute sql; return null; exception when sqlstate 'P0001' then return sqlerrm; end $$;
create function pg_temp.sent() returns jsonb language sql as $$
  select coalesce(jsonb_agg(convert_from(body, 'utf8')::jsonb order by id), '[]') from net.http_request_queue where url like '%/functions/v1/push';
$$;

do $$
declare rec uuid := gen_random_uuid(); r jsonb; o1 uuid; t1 uuid; n0 int; e text; sub jsonb;
begin
  insert into auth.users(id, email) values (rec, 'marco@push.ro');
  insert into public.staff(user_id, name, role) values (rec, 'Marco', 'reception');
  perform set_config('request.jwt.claim.sub', '', true);
  -- fără configurare nu se trimite nimic și comanda merge normal
  r := public.place_order('{"name":"Ana","phone":"0745111222","mode":"livrare","address":"Str. X 1","payment":"cash","items":[{"id":"smash","qty":1}]}');
  perform pg_temp.ok(jsonb_array_length(pg_temp.sent()) = 0, 'fără push_url/push_secret: nicio trimitere, comanda se plasează');

  insert into vault.decrypted_secrets(name, decrypted_secret) values ('push_url', 'https://x.supabase.co/functions/v1/push'), ('push_secret', 's3cret');
  -- abonamente
  e := pg_temp.err(format('select public.push_subscribe(%L, %L)', gen_random_uuid(), '{"endpoint":"https://fcm.googleapis.com/a","keys":{"p256dh":"k","auth":"a"}}'));
  perform pg_temp.ok(e like 'Comanda nu a fost găsită%', 'abonare cu link greșit: refuzată');
  e := pg_temp.err(format('select public.push_subscribe_staff(%L)', '{"endpoint":"https://fcm.googleapis.com/s","keys":{"p256dh":"k","auth":"a"}}'));
  perform pg_temp.ok(e like 'Doar echipa%', 'anonimul nu se poate abona ca recepție');
  perform set_config('request.jwt.claim.sub', rec::text, true);
  perform public.push_subscribe_staff('{"endpoint":"https://fcm.googleapis.com/staff1","keys":{"p256dh":"ks","auth":"as"}}');
  perform set_config('request.jwt.claim.sub', '', true);

  -- comandă nouă: recepția e anunțată
  n0 := jsonb_array_length(pg_temp.sent());
  r := public.place_order('{"name":"Bogdan","phone":"0745111222","mode":"livrare","address":"Str. Y 2","payment":"cash","items":[{"id":"smash","qty":1}]}');
  o1 := (r->>'id')::uuid; select token into t1 from public.orders where id = o1;
  r := pg_temp.sent()->-1;
  perform pg_temp.ok(jsonb_array_length(pg_temp.sent()) = n0 + 1 and r->>'title' like 'Comandă nouă #%' and r->>'body' like 'Bogdan · livrare%'
    and r->'subs'->0->>'endpoint' = 'https://fcm.googleapis.com/staff1', 'comandă nouă: notificare la recepție');
  perform pg_temp.ok((select headers->>'x-push-secret' from net.http_request_queue order by id desc limit 1) = 's3cret', 'cererea poartă secretul');

  -- clientul se abonează; recepția propune timpul
  sub := '{"endpoint":"https://fcm.googleapis.com/client1","keys":{"p256dh":"kc","auth":"ac"}}';
  perform public.push_subscribe(t1, sub);
  perform public.push_subscribe(t1, sub);   -- de două ori: un singur abonament
  perform pg_temp.ok((select count(*) from public.push_subs where order_id = o1) = 1, 'abonarea repetată nu dublează');
  perform set_config('request.jwt.claim.sub', rec::text, true);
  perform public.offer_eta(o1, 40);
  r := pg_temp.sent()->-1;
  perform pg_temp.ok(r->>'title' = 'Restaurantul propune 40 minute' and r->>'url' = '/comanda/' || t1 and r->'subs'->0->>'endpoint' = 'https://fcm.googleapis.com/client1'
    and jsonb_array_length(r->'subs') = 1, 'oferta de timp ajunge doar la client');

  -- clientul acceptă: fără notificare dublă („a fost acceptată”); pe drum: notificare
  perform set_config('request.jwt.claim.sub', '', true);
  n0 := jsonb_array_length(pg_temp.sent());
  perform public.answer_offer(t1, true);
  perform pg_temp.ok(jsonb_array_length(pg_temp.sent()) = n0, 'clientul a acceptat singur: nu primește încă o notificare');
  perform set_config('request.jwt.claim.sub', rec::text, true);
  update public.orders set eta_min = 50 where id = o1;
  perform pg_temp.ok((pg_temp.sent()->-1->>'title') like 'Ora nouă pentru comanda%', 'amânarea anunță clientul');
  update public.orders set status = 'road', courier_name = 'Vlad' where id = o1;
  r := pg_temp.sent()->-1;
  perform pg_temp.ok(r->>'title' = 'Curierul e pe drum' and r->>'body' like '%cu Vlad%', 'pe drum: notificare cu numele curierului');
  update public.orders set status = 'done' where id = o1;
  perform pg_temp.ok((pg_temp.sent()->-1->>'title') = 'Poftă bună!', 'livrată: cerere de notă');
  n0 := jsonb_array_length(pg_temp.sent());
  update public.orders set rating = 5 where id = o1;
  perform pg_temp.ok(jsonb_array_length(pg_temp.sent()) = n0, 'alte modificări nu trimit nimic');

  -- anulare de către client: recepția e anunțată
  perform set_config('request.jwt.claim.sub', '', true);
  r := public.place_order('{"name":"Carmen","phone":"0745111222","mode":"ridicare","payment":"cash","items":[{"id":"smash","qty":1}]}');
  o1 := (r->>'id')::uuid; select token into t1 from public.orders where id = o1;
  perform set_config('request.jwt.claim.sub', rec::text, true);
  perform public.offer_eta(o1, 90);
  perform set_config('request.jwt.claim.sub', '', true);
  perform public.answer_offer(t1, false);
  r := pg_temp.sent()->-1;
  perform pg_temp.ok(r->>'title' like '#% anulată de client' and r->'subs'->0->>'endpoint' = 'https://fcm.googleapis.com/staff1', 'anularea clientului: notificare la recepție');

  perform public.push_unsubscribe('https://fcm.googleapis.com/staff1');
  perform pg_temp.ok(not exists (select 1 from public.push_subs where staff_user is not null), 'dezabonare');
end $$;
rollback;
