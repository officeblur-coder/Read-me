-- Teste registrul de platouri (pe o copie a bazei; totul se anulează). psql -v ON_ERROR_STOP=1 -f supabase/tests/platouri_test.sql
begin;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.as_user(id text) returns void language sql as $$ select set_config('request.jwt.claim.sub', id, true) $$;
create function pg_temp.err(sql text) returns text language plpgsql as $$
begin execute sql; return null; exception when sqlstate 'P0001' then return sqlerrm; end $$;

insert into auth.users(id, email) values
  ('00000000-0000-4000-8000-0000000000e1', 'platouri@lyrasdelivery.ro'),
  ('00000000-0000-4000-8000-0000000000e2', 'simona@lyrasdelivery.ro'),
  ('00000000-0000-4000-8000-0000000000e3', 'client@t.ro'),
  ('00000000-0000-4000-8000-0000000000e4', 'rx@t.ro');
insert into public.staff(user_id, name, role) values ('00000000-0000-4000-8000-0000000000e4', 'Rx', 'reception');
-- conturile se leagă singure la rularea scriptului
insert into public.platter_users(user_id, name, role)
select u.id, n.name, n.role from auth.users u join (values ('platouri@lyrasdelivery.ro', 'Recepție platouri', 'editor'), ('simona@lyrasdelivery.ro', 'Simona', 'checker')) n(email, name, role)
  on lower(u.email) = n.email on conflict (user_id) do nothing;
delete from vault.decrypted_secrets where name = 'resend_api_key';
insert into vault.decrypted_secrets values ('resend_api_key', 're_test');

do $$
declare r jsonb; pid uuid; tok uuid; e text;
begin
  -- acces
  perform pg_temp.as_user('00000000-0000-4000-8000-0000000000e3');
  perform pg_temp.ok(public.platter_list() is null, 'clientul obișnuit nu vede registrul');
  perform pg_temp.ok(not public.is_staff(), 'contul de platouri nu e personal de recepție');
  perform pg_temp.as_user('00000000-0000-4000-8000-0000000000e1');
  perform pg_temp.ok(not public.is_staff(), 'contul platouri nu are acces la recepție');
  perform pg_temp.ok(public.platter_me()->>'role' = 'editor', 'contul platouri introduce');

  -- introducere
  r := public.platter_save(jsonb_build_object('name', 'Ana Pop', 'phone', '0745 111 222', 'address', 'Str. Lungă 3', 'email', 'Ana@T.ro',
        'dispatcher', 'Maria', 'delivery_date', ((now() at time zone 'Europe/Bucharest')::date + 1)::text, 'delivery_time', '12:00',
        'lines', jsonb_build_array(jsonb_build_object('name', 'Platou rece', 'qty', 2, 'price', 250), jsonb_build_object('name', 'Platou cald', 'qty', 1, 'price', 180.5),
                                   jsonb_build_object('name', '', 'qty', 1, 'price', 1))));
  pid := (r->>'id')::uuid;
  perform pg_temp.ok((r->>'total')::numeric = 680.5 and (r->>'qty')::int = 3 and r->>'email' = 'ana@t.ro' and r->>'created_by' = 'Recepție platouri', 'totalul și bucățile se calculează din rânduri');
  perform pg_temp.ok(not (r ? 'token'), 'tokenul de plată nu ajunge în registru');
  e := pg_temp.err($q$select public.platter_save('{"name":"X","phone":"07","delivery_date":"2026-12-20","lines":[]}')$q$);
  perform pg_temp.ok(e like 'Adaugă cel puțin un produs%', 'fără produse: refuzat');
  e := pg_temp.err($q$select public.platter_save('{"name":"X","phone":"07","lines":[{"name":"A","qty":1,"price":1}]}')$q$);
  perform pg_temp.ok(e like 'Alege data livrării%', 'fără data livrării: refuzat');

  -- Simona: vede și verifică, nu introduce
  perform pg_temp.as_user('00000000-0000-4000-8000-0000000000e2');
  perform pg_temp.ok(jsonb_array_length(public.platter_list()->'orders') = 1, 'Simona vede registrul');
  e := pg_temp.err(format($q$select public.platter_save('{"id":"%s","name":"X","phone":"07","delivery_date":"2026-12-20","lines":[{"name":"A","qty":1,"price":1}]}')$q$, pid));
  perform pg_temp.ok(e like 'Doar recepția%', 'Simona nu modifică');
  perform pg_temp.ok(pg_temp.err(format('select public.platter_send_pay(%L)', pid)) like 'Doar recepția%', 'Simona nu trimite plata');
  perform public.platter_verify(pid, true);
  perform pg_temp.ok((select verified_by = 'Simona' and verified_at is not null from public.platter_orders where platter_orders.id = pid), 'Simona bifează verificat');

  -- cererea de plată pe email
  perform pg_temp.as_user('00000000-0000-4000-8000-0000000000e4');   -- și recepția obișnuită poate introduce
  r := public.platter_send_pay(pid);
  perform pg_temp.ok(r->>'email' = 'ana@t.ro' and (select pay_status = 'sent' and pay_sent_count = 1 from public.platter_orders where platter_orders.id = pid), 'cererea de plată trimisă, status „trimis”');
  tok := (select token from public.platter_orders where platter_orders.id = pid);
  perform pg_temp.ok((select convert_from(body, 'utf8') like '%/platouri/plata/' || tok || '%' and convert_from(body, 'utf8') like '%680.50 lei%'
                      from net.http_request_queue where url = 'https://api.resend.com/emails' order by id desc limit 1), 'emailul are linkul de plată și suma integrală');
  perform pg_temp.ok((public.platter_public(tok))->>'total' = '680.50' and not (public.platter_public(tok) ? 'phone'), 'pagina de plată arată suma, fără date personale');

  perform pg_temp.ok((select count(*) = 4 and bool_or(name like 'Platou Festiv%' and price = 255) from public.platter_products where active), 'cele 4 produse de sărbători, Platoul Festiv 255 lei');
  perform pg_temp.ok(public.platter_wine('[{"name":"Platou Festiv Signature Lyra (1,8 kg)","qty":3},{"name":"Ciorbă de burtă","qty":2}]') = 3, 'o sticlă de vin la fiecare Platou Festiv');
  -- schimbarea produselor după verificare cere verificare din nou
  r := public.platter_save(jsonb_build_object('id', pid, 'name', 'Ana Pop', 'phone', '0745 111 222', 'email', 'ana@t.ro', 'delivery_date', ((now() at time zone 'Europe/Bucharest')::date + 1)::text,
        'lines', jsonb_build_array(jsonb_build_object('name', 'Platou rece', 'qty', 3, 'price', 250))));
  perform pg_temp.ok((r->>'total')::numeric = 750 and r->>'verified_at' is null, 'modificat după verificare: verificarea se anulează');

  -- plata confirmată de Stripe (funcția Edge)
  perform public.platter_mark_paid(pid, 'cs_1', 'pi_1');
  perform pg_temp.ok((select pay_status = 'paid' and paid_at is not null from public.platter_orders where platter_orders.id = pid), 'plata confirmată apare în registru');
  e := pg_temp.err(format($q$select public.platter_save('{"id":"%s","name":"Ana","phone":"07","delivery_date":"2026-12-20","lines":[{"name":"A","qty":1,"price":1}]}')$q$, pid));
  perform pg_temp.ok(e like 'Comanda e deja plătită%', 'plătită: suma nu se mai schimbă');
  perform pg_temp.ok(pg_temp.err(format('select public.platter_send_pay(%L)', pid)) like '%deja plătită%', 'plătită: nu se mai trimite cerere');
  perform pg_temp.ok(pg_temp.err(format('select public.platter_cancel(%L, true)', pid)) like '%plătită%', 'plătită: nu se anulează de aici');
  perform pg_temp.as_user('00000000-0000-4000-8000-0000000000e3');
  perform pg_temp.ok(pg_temp.err(format('select public.platter_verify(%L, false)', pid)) like 'Fără acces%', 'clientul nu atinge registrul');
end $$;
rollback;
\echo 'Toate testele pentru registrul de platouri au trecut.'
