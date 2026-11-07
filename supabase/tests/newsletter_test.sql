-- Teste newsletter (pe o copie a bazei; totul se anulează). psql -v ON_ERROR_STOP=1 -f supabase/tests/newsletter_test.sql
-- Local, net.http_post scrie în net.log; răspunsurile Resend le simulăm în net._http_response.
begin;
create table if not exists net._http_response (id bigint primary key, status_code int, content text, created timestamptz default now());
delete from vault.decrypted_secrets where name = 'resend_api_key';
insert into vault.decrypted_secrets(name, decrypted_secret) values ('resend_api_key', 're_test');
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
update public.settings set newsletter_daily_limit = 100, newsletter_batch = 50 where id = 1;
delete from public.email_campaigns;

do $$
declare adm uuid := gen_random_uuid(); a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); d uuid := gen_random_uuid();
  cid uuid; n int; bdy jsonb; lg int; req bigint; s1 uuid; url text; r jsonb;
begin
  insert into auth.users(id, email) values (adm, 'adm@t.ro'), (a, 'ana@t.ro'), (b, 'bogdan@t.ro'), (c, 'cristi@t.ro'), (d, 'dana@t.ro');
  insert into public.staff(user_id, name, role) values (adm, 'Admin', 'admin');
  update public.customers set marketing_ok = false;
  update public.customers set marketing_ok = true, name = 'Ana Pop', orders_count = 2 where id = a;
  update public.customers set marketing_ok = true, name = null where id = b;
  update public.customers set marketing_ok = true, name = 'Dana', email = 'ANA@t.ro', orders_count = 1 where id = d;   -- aceeași adresă cu Ana: o singură dată
  perform set_config('request.jwt.claim.sub', adm::text, true);

  perform pg_temp.ok(public.newsletter_audience('all') = 2, 'audiență: doar abonații, o dată pe adresă');
  perform pg_temp.ok(public.newsletter_audience('ordered') = 1 and public.newsletter_audience('never_ordered') = 1, 'filtre: au comandat / n-au comandat');

  insert into public.email_campaigns(name, subject, mode, html, text_body, links)
    values ('Test', 'Salut {{prenume}}!', 'blocks', '<html><body><h1>Bună, {{prenume}}</h1><a href="https://lyrasdelivery.ro/?p=smash">Comandă</a></body></html>',
            'Bună, {{prenume}}', array['https://lyrasdelivery.ro/?p=smash'])
    returning id into cid;

  -- test: email imediat, cu [TEST] și fără link urmărit
  select count(*) into lg from net.log;
  perform public.newsletter_test(cid, 'eu@t.ro');
  select l.body into bdy from net.log l order by id desc limit 1;
  perform pg_temp.ok((select count(*) from net.log) = lg + 1 and bdy->>'subject' = '[TEST] Salut Ana!' and bdy->'to'->>0 = 'eu@t.ro', 'email de test trimis pe loc');

  n := public.newsletter_send(cid);
  perform pg_temp.ok(n = 2 and (select status from public.email_campaigns where id = cid) = 'sending', 'trimitere pornită: 2 destinatari');
  perform public.newsletter_tick();
  select l.body, l.id into bdy, req from net.log l order by id desc limit 1;
  perform pg_temp.ok(jsonb_typeof(bdy) = 'array' and jsonb_array_length(bdy) = 2, 'un lot Resend cu 2 emailuri');
  perform pg_temp.ok(exists (select 1 from jsonb_array_elements(bdy) x where x->>'subject' = 'Salut Ana!' and x->>'html' like '%Bună, Ana%'), 'personalizat: prenumele Anei');
  perform pg_temp.ok(exists (select 1 from jsonb_array_elements(bdy) x where x->>'subject' = 'Salut prietene!'), 'fără nume: „prietene”');
  perform pg_temp.ok((select bool_and(x->>'html' like '%/dezabonare?t=%' and x->>'html' like '%/l?s=%&k=1%' and x->'headers'->>'List-Unsubscribe' like '<%dezabonare%') from jsonb_array_elements(bdy) x), 'subsol cu dezabonare, link urmărit, antet List-Unsubscribe');
  perform pg_temp.ok((select count(*) from public.email_sends where campaign_id = cid and status = 'sending') = 2, 'destinatari marcați „în trimitere”');

  -- Resend răspunde 200
  insert into net._http_response(id, status_code, content) values (req, 200, '{"data":[]}');
  perform public.newsletter_tick();
  perform pg_temp.ok((select count(*) from public.email_sends where campaign_id = cid and status = 'sent') = 2 and (select status from public.email_campaigns where id = cid) = 'sent', 'după răspuns: trimise, campanie încheiată');

  -- click
  select id into s1 from public.email_sends where campaign_id = cid order by email limit 1;
  perform set_config('request.jwt.claim.sub', '', true);
  url := public.newsletter_click(s1, 1); url := public.newsletter_click(s1, 1);
  perform pg_temp.ok(url = 'https://lyrasdelivery.ro/?p=smash' and (select clicks from public.email_clicks where send_id = s1 and k = 1) = 2, 'click numărat, duce la adresa reală');
  perform pg_temp.ok(public.newsletter_click(s1, 9) is null, 'link necunoscut: nicio redirecționare');
  perform set_config('request.jwt.claim.sub', adm::text, true);
  r := public.admin_newsletters();
  perform pg_temp.ok((r->'campaigns'->0->>'sent')::int = 2 and (r->'campaigns'->0->>'clickers')::int = 1 and (r->'campaigns'->0->>'clicks')::int = 2, 'statistici: 2 trimise, 1 om a dat click (2 clickuri)');

  -- limita zilnică: 3 pe zi, 2 deja folosite → doar 1 trimis
  update public.settings set newsletter_daily_limit = 3 where id = 1;
  update public.customers set marketing_ok = true where id = c;
  insert into public.email_campaigns(name, subject, html) values ('Doi', 'Al doilea', '<p>x</p>') returning id into cid;
  perform public.newsletter_send(cid);
  perform public.newsletter_tick();
  perform pg_temp.ok((select count(*) from public.email_sends where campaign_id = cid and status = 'sending') = 1
    and (select count(*) from public.email_sends where campaign_id = cid and status = 'queued') = 2, 'limita zilnică: restul rămân la coadă');

  -- dezabonat între timp: nu mai primește
  update public.settings set newsletter_daily_limit = 100 where id = 1;
  update public.customers set marketing_ok = false where id = c;
  perform public.newsletter_tick();
  perform pg_temp.ok((select status from public.email_sends where campaign_id = cid and email = 'cristi@t.ro') in ('cancelled', 'sending', 'sent')
    and not exists (select 1 from public.email_sends where campaign_id = cid and email = 'cristi@t.ro' and status = 'queued'), 'dezabonatul nu rămâne la coadă');

  -- programare + anulare
  insert into public.email_campaigns(name, subject, html) values ('Trei', 'Programat', '<p>x</p>') returning id into cid;
  perform public.newsletter_send(cid, now() + interval '1 day');
  perform pg_temp.ok((select status from public.email_campaigns where id = cid) = 'scheduled' and not exists (select 1 from public.email_sends where campaign_id = cid), 'programat: încă fără destinatari');
  perform public.newsletter_cancel(cid);
  perform pg_temp.ok((select status from public.email_campaigns where id = cid) = 'draft', 'programare anulată: înapoi la ciornă');

  -- Resend refuză un lot
  insert into public.email_campaigns(name, subject, html) values ('Patru', 'Eroare', '<p>x</p>') returning id into cid;
  perform public.newsletter_send(cid); perform public.newsletter_tick();
  select id into req from net.log order by id desc limit 1;
  insert into net._http_response(id, status_code, content) values (req, 403, '{"message":"domain not verified"}');
  perform public.newsletter_tick();
  perform pg_temp.ok((select count(*) from public.email_sends where campaign_id = cid and status = 'failed') >= 1
    and (select last_error from jsonb_to_recordset((public.admin_newsletters())->'campaigns') as x(id uuid, last_error text) where id = cid) like '%domain not verified%', 'lot refuzat: eșuate, cu motivul afișat');
end $$;
-- doar adminul vede și trimite
set local role anon;
do $$ begin
  begin perform public.newsletter_audience('all'); raise exception 'TEST EȘUAT: anonimul vede audiența';
  exception when sqlstate 'P0001' or insufficient_privilege then raise notice 'ok  anonimul nu vede audiența'; end;
  begin perform public.newsletter_tick(); raise exception 'TEST EȘUAT: anonimul rulează coada';
  exception when insufficient_privilege then raise notice 'ok  anonimul nu poate porni trimiterea'; end;
end $$;
reset role;
rollback;
