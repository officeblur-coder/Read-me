-- Teste plata online (pe o copie; se anulează). Necesită pg_net (net.http_request_queue). psql -v ON_ERROR_STOP=1 -f supabase/tests/online_pay_test.sql
begin;
update public.settings set open_time = '00:00', close_time = '23:59:59', accepting_orders = true, min_order = 0, online_pay_on = false, confirm_eta = true where id = 1;
delete from public.delivery_zones;
delete from vault.decrypted_secrets where name in ('push_url', 'push_secret', 'pay_url');
insert into vault.decrypted_secrets(name, decrypted_secret) values ('push_url', 'https://x.supabase.co/functions/v1/push'), ('push_secret', 's3cret'), ('pay_url', 'https://x.supabase.co/functions/v1/pay');
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.err(sql text) returns text language plpgsql as $$
begin execute sql; return null; exception when sqlstate 'P0001' then return sqlerrm; end $$;
create function pg_temp.calls(u text) returns jsonb language sql as $$
  select coalesce(jsonb_agg(convert_from(body, 'utf8')::jsonb order by id), '[]') from net.http_request_queue where url like '%/functions/v1/' || u;
$$;

do $$
declare rec uuid := gen_random_uuid(); r jsonb; o public.orders; oid uuid; t uuid; e text; n0 int; seen int;
begin
  insert into auth.users(id, email) values (rec, 'marco@pay.ro');
  insert into public.staff(user_id, name, role) values (rec, 'Marco', 'reception');
  perform public.push_subscribe_staff('{"endpoint":"https://fcm.googleapis.com/x","keys":{"p256dh":"k","auth":"a"}}') from (select set_config('request.jwt.claim.sub', rec::text, true)) z;
  perform set_config('request.jwt.claim.sub', '', true);

  e := pg_temp.err($q$select public.place_order('{"name":"A","phone":"0745111222","mode":"ridicare","payment":"online","items":[{"id":"smash","qty":1}]}')$q$);
  perform pg_temp.ok(e like 'Plata online nu este disponibilă%', 'plata online oprită: refuzată');
  r := public.place_order('{"name":"Cash","phone":"0745111222","mode":"ridicare","payment":"cash","items":[{"id":"smash","qty":1}]}');
  perform pg_temp.ok((select pay_status from public.orders where id = (r->>'id')::uuid) = 'none', 'numerar: fără plată online');

  update public.settings set online_pay_on = true where id = 1;
  n0 := jsonb_array_length(pg_temp.calls('push'));
  r := public.place_order('{"name":"Ana","phone":"0745111222","mode":"ridicare","payment":"online","items":[{"id":"smash","qty":1}]}');
  oid := (r->>'id')::uuid; select token into t from public.orders where id = oid;
  perform pg_temp.ok((select pay_status from public.orders where id = oid) = 'pending', 'card online: așteaptă plata');
  perform pg_temp.ok(jsonb_array_length(pg_temp.calls('push')) = n0, 'recepția nu e anunțată înainte de plată');
  perform set_config('request.jwt.claim.sub', rec::text, true);
  set local role authenticated;
  select count(*) into seen from public.orders where id = oid;
  reset role;
  perform pg_temp.ok(seen = 0, 'recepția nu vede comanda neplătită');
  perform pg_temp.ok((public.pay_order_info(t)->>'total')::numeric > 0, 'funcția de plată citește totalul din bază');

  -- plata reușește (webhook)
  perform pg_temp.ok(public.pay_mark_paid(oid, 'cs_1', 'pi_1'), 'webhook: plătită');
  perform pg_temp.ok(not public.pay_mark_paid(oid, 'cs_1', 'pi_1'), 'webhook repetat: ignorat');
  set local role authenticated;
  select count(*) into seen from public.orders where id = oid;
  reset role;
  perform pg_temp.ok(seen = 1, 'după plată recepția vede comanda');
  perform pg_temp.ok((pg_temp.calls('push')->-1->>'body') like '%plătită online%', 'recepția e anunțată: comandă plătită online');
  perform set_config('request.jwt.claim.sub', '', true);
  perform pg_temp.ok(public.get_order(t)->>'pay_status' = 'paid', 'clientul vede plata primită');

  -- recepția propune timp, clientul anulează: rambursare automată
  perform set_config('request.jwt.claim.sub', rec::text, true);
  perform public.offer_eta(oid, 60);
  perform set_config('request.jwt.claim.sub', '', true);
  perform public.answer_offer(t, false);
  select * into o from public.orders where id = oid;
  r := pg_temp.calls('pay')->-1;
  perform pg_temp.ok(o.pay_status = 'refunding' and r->>'action' = 'refund' and (r->>'order_id')::uuid = oid, 'anulată după plată: se cere rambursarea');
  perform pg_temp.ok((select headers->>'x-pay-secret' from net.http_request_queue where url like '%/pay' order by id desc limit 1) = 's3cret', 'cererea de rambursare e semnată');
  perform public.pay_mark_refunded(oid, 're_1');
  perform pg_temp.ok((select pay_status from public.orders where id = oid) = 'refunded', 'rambursare confirmată');

  -- plata neterminată în 30 de minute: comanda se anulează, punctele revin
  r := public.place_order('{"name":"Bob","phone":"0745111222","mode":"ridicare","payment":"online","items":[{"id":"smash","qty":1}]}');
  oid := (r->>'id')::uuid;
  update public.orders set created_at = now() - interval '31 minutes' where id = oid;
  perform pg_temp.ok(public.expire_unpaid() = 1, 'expire_unpaid găsește plata neterminată');
  select * into o from public.orders where id = oid;
  perform pg_temp.ok(o.status = 'rejected' and o.pay_status = 'failed' and o.reject_reason like 'Plata online%', 'neplătită: anulată');
  -- plata vine totuși după expirare: rambursare imediată
  n0 := jsonb_array_length(pg_temp.calls('pay'));
  perform public.pay_mark_paid(oid, 'cs_2', 'pi_2');
  perform pg_temp.ok((select pay_status from public.orders where id = oid) = 'refunding' and jsonb_array_length(pg_temp.calls('pay')) = n0 + 1, 'plată întârziată: rambursată imediat');

  -- raport: plățile neterminate nu apar
  insert into public.staff(user_id, name, role) select rec, 'Marco', 'admin' on conflict (user_id) do update set role = 'admin';
  perform set_config('request.jwt.claim.sub', rec::text, true);
  r := public.admin_report(now() - interval '2 hours', now() + interval '1 minute');
  perform pg_temp.ok((r->'summary'->>'orders')::int = 2, 'raport: doar comenzile reale (numerar + plătita)');
end $$;
rollback;
