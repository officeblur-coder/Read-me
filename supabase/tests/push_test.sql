-- Teste notificări cu oferte (pe o copie; se anulează). Necesită pg_net (net.http_request_queue). psql -v ON_ERROR_STOP=1 -f supabase/tests/push_test.sql
begin;
delete from vault.decrypted_secrets where name in ('push_url', 'push_secret');
delete from public.push_subs;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.err(sql text) returns text language plpgsql as $$
begin execute sql; return null; exception when sqlstate 'P0001' then return sqlerrm; end $$;
create function pg_temp.sent() returns jsonb language sql as $$
  select coalesce(jsonb_agg(convert_from(body, 'utf8')::jsonb order by id), '[]') from net.http_request_queue where url like '%/functions/v1/push';
$$;

do $$
declare adm uuid := gen_random_uuid(); cli uuid := gen_random_uuid(); rec uuid := gen_random_uuid(); r jsonb; e text; i int;
begin
  insert into auth.users(id, email) values (adm, 'admin@push.ro'), (cli, 'ana@push.ro'), (rec, 'marco@push.ro');
  insert into public.staff(user_id, name, role) values (adm, 'Admin', 'admin'), (rec, 'Marco', 'reception');

  -- abonări: vizitator fără cont, client cu cont, adminul pe telefonul lui
  perform set_config('request.jwt.claim.sub', '', true);
  e := pg_temp.err($q$select public.push_subscribe_offers('{"endpoint":"http://x","keys":{"p256dh":"k","auth":"a"}}')$q$);
  perform pg_temp.ok(e = 'Abonament invalid.', 'abonament invalid: refuzat');
  perform public.push_subscribe_offers('{"endpoint":"https://fcm.googleapis.com/v1","keys":{"p256dh":"k1","auth":"a1"}}');
  perform set_config('request.jwt.claim.sub', cli::text, true);
  perform public.push_subscribe_offers('{"endpoint":"https://fcm.googleapis.com/c1","keys":{"p256dh":"k2","auth":"a2"}}');
  perform public.push_subscribe_offers('{"endpoint":"https://fcm.googleapis.com/c1","keys":{"p256dh":"k2","auth":"a2"}}');
  perform set_config('request.jwt.claim.sub', adm::text, true);
  perform public.push_subscribe_offers('{"endpoint":"https://web.push.apple.com/adm","keys":{"p256dh":"k3","auth":"a3"}}');
  perform pg_temp.ok((select count(*) from public.push_subs) = 3 and (select customer_id from public.push_subs where endpoint like '%/c1') = cli, '3 telefoane abonate, fără dubluri, legate de cont');

  -- doar adminul trimite; fără configurare: mesaj clar
  perform set_config('request.jwt.claim.sub', rec::text, true);
  e := pg_temp.err($q$select public.admin_push_send('Ofertă', 'Text', '/')$q$);
  perform pg_temp.ok(e like 'Doar administratorul%', 'recepția nu poate trimite');
  perform set_config('request.jwt.claim.sub', adm::text, true);
  e := pg_temp.err($q$select public.admin_push_send('Ofertă', 'Text', '/')$q$);
  perform pg_temp.ok(e like 'Notificările nu sunt configurate%', 'fără push_url/push_secret: explică ce lipsește');
  insert into vault.decrypted_secrets(name, decrypted_secret) values ('push_url', 'https://x.supabase.co/functions/v1/push'), ('push_secret', 's3cret');
  e := pg_temp.err($q$select public.admin_push_send('', 'Text', '/')$q$);
  perform pg_temp.ok(e like 'Scrie titlul%', 'titlu gol: refuzat');
  e := pg_temp.err($q$select public.admin_push_send('Ofertă', 'Text', 'https://alt-site.ro')$q$);
  perform pg_temp.ok(e like 'Linkul trebuie%', 'link spre alt site: refuzat');

  -- test: doar pe telefonul adminului
  r := public.admin_push_send('Test', 'Doar pentru mine', '/', true);
  perform pg_temp.ok((r->>'sent_to')::int = 1 and jsonb_array_length(pg_temp.sent()->-1->'subs') = 1
    and pg_temp.sent()->-1->'subs'->0->>'endpoint' = 'https://web.push.apple.com/adm', 'testul ajunge doar pe telefonul adminului');

  -- către toți
  r := public.admin_push_send('Smash Week -20%', 'Burgerii smash au 20% reducere până duminică.', '/?p=smash');
  perform pg_temp.ok((r->>'sent_to')::int = 3, 'notificarea pleacă spre toți cei 3');
  r := pg_temp.sent()->-1;
  perform pg_temp.ok(r->>'title' = 'Smash Week -20%' and r->>'url' = '/?p=smash&s=push', 'titlu și link cu sursa push');
  perform pg_temp.ok((select headers->>'x-push-secret' from net.http_request_queue order by id desc limit 1) = 's3cret', 'cererea poartă secretul');
  perform pg_temp.ok((public.admin_push_overview()->>'subscribers')::int = 3 and jsonb_array_length(public.admin_push_overview()->'recent') = 2, 'istoric: 2 trimiteri');

  -- 1200 de abonați: 3 loturi
  insert into public.push_subs(endpoint, p256dh, auth) select 'https://fcm.googleapis.com/m' || g, 'k', 'a' from generate_series(1, 1197) g;
  i := jsonb_array_length(pg_temp.sent());
  r := public.admin_push_send('Mulți', 'Text', '/');
  perform pg_temp.ok((r->>'sent_to')::int = 1200 and jsonb_array_length(pg_temp.sent()) = i + 3, '1200 de telefoane: 3 cereri de câte maxim 500');

  -- dezabonare
  perform public.push_unsubscribe('https://fcm.googleapis.com/c1');
  perform pg_temp.ok(not exists (select 1 from public.push_subs where endpoint = 'https://fcm.googleapis.com/c1'), 'dezabonare');

  -- comenzile nu mai trimit notificări
  i := jsonb_array_length(pg_temp.sent());
  update public.settings set open_time = '00:00', close_time = '23:59:59', accepting_orders = true, min_order = 0 where id = 1;
  delete from public.delivery_zones;
  perform set_config('request.jwt.claim.sub', '', true);
  perform public.place_order('{"name":"A","phone":"0745111222","mode":"ridicare","payment":"cash","items":[{"id":"smash","qty":1}]}');
  perform pg_temp.ok(jsonb_array_length(pg_temp.sent()) = i, 'comanda nouă nu trimite notificări');
end $$;
rollback;
