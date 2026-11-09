-- Teste: clientul confirmă sau anulează timpul propus (pe o copie; se anulează). psql -v ON_ERROR_STOP=1 -f supabase/tests/eta_confirm_test.sql
begin;
update public.settings set open_time = '00:00', close_time = '23:59:59', accepting_orders = true, min_order = 0,
  confirm_eta = true, offer_window_min = 5, offer_timeout = 'accept' where id = 1;
delete from public.delivery_zones;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.err(sql text) returns text language plpgsql as $$
begin execute sql; return null; exception when sqlstate 'P0001' then return sqlerrm; end $$;

do $$
declare rec uuid := gen_random_uuid(); cli uuid := gen_random_uuid(); r jsonb; o public.orders; e text; adm uuid := gen_random_uuid();
  o1 uuid; o2 uuid; o3 uuid; o4 uuid; o5 uuid; t1 uuid; t2 uuid; t3 uuid; t4 uuid; t5 uuid; bal int;
begin
  insert into auth.users(id, email) values (rec, 'marco@test.ro'), (adm, 'adm@test.ro');
  insert into public.staff(user_id, name, role) values (rec, 'Marco', 'reception'), (adm, 'Admin', 'admin');
  perform set_config('request.jwt.claim.sub', '', true);
  r := public.place_order('{"name":"A","phone":"0745111222","mode":"livrare","address":"Str. X 1","payment":"cash","items":[{"id":"smash","qty":1}]}'); o1 := (r->>'id')::uuid;
  r := public.place_order('{"name":"B","phone":"0745111222","mode":"ridicare","payment":"cash","items":[{"id":"smash","qty":1}]}'); o2 := (r->>'id')::uuid;
  r := public.place_order('{"name":"C","phone":"0745111222","mode":"ridicare","payment":"cash","items":[{"id":"smash","qty":1}]}'); o3 := (r->>'id')::uuid;
  r := public.place_order('{"name":"D","phone":"0745111222","mode":"ridicare","payment":"cash","items":[{"id":"smash","qty":1}]}'); o4 := (r->>'id')::uuid;
  r := public.place_order('{"name":"E","phone":"0745111222","mode":"ridicare","payment":"cash","items":[{"id":"smash","qty":1}]}'); o5 := (r->>'id')::uuid;
  select token into t1 from public.orders where id = o1; select token into t2 from public.orders where id = o2;
  select token into t3 from public.orders where id = o3; select token into t4 from public.orders where id = o4; select token into t5 from public.orders where id = o5;

  -- clientul nu poate răspunde înainte de propunere; un anonim nu poate propune
  e := pg_temp.err(format('select public.answer_offer(%L, true)', t1));
  perform pg_temp.ok(e like '%nu a propus încă%', 'fără propunere: clientul nu poate răspunde');
  e := pg_temp.err(format('select public.offer_eta(%L, 30)', o1));
  perform pg_temp.ok(e like 'Doar recepția%', 'anonimul nu poate propune timp');

  -- recepția propune 45 de minute: comanda rămâne nouă, clientul vede oferta
  perform set_config('request.jwt.claim.sub', rec::text, true);
  e := pg_temp.err(format('select public.offer_eta(%L, 2)', o1));
  perform pg_temp.ok(e like '%între 5 și 240%', 'timp prea mic: refuzat');
  perform public.offer_eta(o1, 45);
  select * into o from public.orders where id = o1;
  perform pg_temp.ok(o.status = 'new' and o.offer_eta = 45 and o.offered_at is not null and o.accepted_at is null, 'după propunere comanda rămâne nouă, cu 45 min propuse');
  perform set_config('request.jwt.claim.sub', '', true);
  r := public.get_order(t1);
  perform pg_temp.ok((r->>'offer_eta')::int = 45 and (r->>'offer_window')::int = 5 and r->>'status' = 'new', 'clientul vede oferta și fereastra de 5 min');
  perform pg_temp.ok((r->'messages'->-1->>'body') like 'Putem livra comanda în 45 de minute%' or (r->'messages'->-1->>'body') like 'Putem livra comanda în 45 minute%', 'mesaj cu timpul propus');

  -- clientul acceptă: în bucătărie, cronometrul pornește acum, acceptată de Marco
  r := public.answer_offer(t1, true);
  select * into o from public.orders where id = o1;
  perform pg_temp.ok(o.status = 'prep' and o.offer_answer = 'accepted' and o.eta_min = 45 and o.accepted_at is not null, 'clientul acceptă: comanda trece în bucătărie');
  perform pg_temp.ok(o.accepted_by_name = 'Marco' and o.eta_first = 45, 'acceptarea e atribuită lui Marco, timp promis 45');
  e := pg_temp.err(format('select public.answer_offer(%L, false)', t1));
  perform pg_temp.ok(e = 'Ai răspuns deja.', 'după acceptare nu mai poate anula din pagină');

  -- clientul anulează
  perform set_config('request.jwt.claim.sub', rec::text, true);
  perform public.offer_eta(o2, 90);
  perform set_config('request.jwt.claim.sub', '', true);
  perform public.answer_offer(t2, false);
  select * into o from public.orders where id = o2;
  perform pg_temp.ok(o.status = 'rejected' and o.cancelled_by = 'client' and o.rejected_by_name = 'client' and o.reject_reason like 'Anulată de client%', 'clientul anulează: comanda e anulată de client');

  -- recepția schimbă timpul înainte de răspuns; apoi confirmare telefonică
  perform set_config('request.jwt.claim.sub', rec::text, true);
  perform public.offer_eta(o3, 60);
  perform public.offer_eta(o3, 40);
  perform pg_temp.ok((select offer_eta from public.orders where id = o3) = 40, 'timpul propus se poate schimba până la răspuns');
  perform public.confirm_offer_phone(o3);
  select * into o from public.orders where id = o3;
  perform pg_temp.ok(o.status = 'prep' and o.offer_answer = 'phone' and o.eta_min = 40, 'confirmat telefonic: în bucătărie cu 40 min');
  e := pg_temp.err(format('select public.offer_eta(%L, 30)', o3));
  perform pg_temp.ok(e like '%a primit deja răspuns%', 'nu se mai propune după confirmare');

  -- fără răspuns 5 minute: se confirmă automat (și apare corect la client)
  perform public.offer_eta(o4, 30);
  update public.orders set offered_at = now() - interval '6 minutes' where id = o4;
  perform set_config('request.jwt.claim.sub', '', true);
  r := public.get_order(t4);
  perform pg_temp.ok(r->>'status' = 'prep' and r->>'offer_answer' = 'auto_accepted', 'fără răspuns în 5 min: confirmată automat la deschiderea paginii');
  e := pg_temp.err(format('select public.answer_offer(%L, false)', t4));
  perform pg_temp.ok(e like 'Timpul a fost deja confirmat%', 'după confirmarea automată anularea se face la telefon');

  -- setarea „anulează la expirare”
  update public.settings set offer_timeout = 'cancel' where id = 1;
  perform set_config('request.jwt.claim.sub', rec::text, true);
  perform public.offer_eta(o5, 30);
  update public.orders set offered_at = now() - interval '6 minutes' where id = o5;
  perform pg_temp.ok(public.settle_offers() = 1, 'settle_offers închide oferta expirată');
  select * into o from public.orders where id = o5;
  perform pg_temp.ok(o.status = 'rejected' and o.offer_answer = 'auto_cancelled' and o.cancelled_by = 'sistem', 'cu setarea „anulează”: comanda expirată se anulează');

  -- raport: ofertele nu sunt „nepreluate”, anulările clientului se numără
  perform set_config('request.jwt.claim.sub', adm::text, true);
  r := public.admin_report(now() - interval '1 hour', now() + interval '1 minute');
  perform pg_temp.ok((r->'summary'->>'client_cancelled')::int = 2 and (r->'summary'->>'unanswered')::int = 0, 'raport: 2 anulate de client/sistem, 0 nepreluate');
end $$;
rollback;
