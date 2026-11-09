-- Teste „Recomandă un prieten” (pe o copie; se anulează). psql -v ON_ERROR_STOP=1 -f supabase/tests/referral_test.sql
begin;
update public.settings set open_time = '00:00', close_time = '23:59:59', accepting_orders = true, min_order = 0,
  referral_on = true, referral_lei = 20, referral_min = 60, welcome_on = false where id = 1;
delete from public.delivery_zones; delete from public.item_discounts;
update public.items set available = true, active = true, price = 40 where id = 'smash';
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.err(sql text) returns text language plpgsql as $$
begin execute sql; return null; exception when sqlstate 'P0001' then return sqlerrm; end $$;
create function pg_temp.as_(u uuid) returns void language sql as $$ select set_config('request.jwt.claim.sub', coalesce(u::text, ''), true) $$;

do $$
declare ana uuid := gen_random_uuid(); bob uuid := gen_random_uuid(); cris uuid := gen_random_uuid(); old uuid := gen_random_uuid(); rec uuid := gen_random_uuid();
  r jsonb; code text; e text; o uuid; p0 int;
begin
  insert into auth.users(id, email) values (ana, 'ana@t.ro'), (bob, 'bob@t.ro'), (cris, 'cris@t.ro'), (old, 'old@t.ro'), (rec, 'rec@t.ro');
  insert into public.staff(user_id, name, role) values (rec, 'Marco', 'reception');
  update public.customers set name = 'Ana-Maria Ștefan', phone = '0745 000 111' where id = ana;
  update public.customers set name = 'Bogdan Pop' where id = bob;
  update public.customers set created_at = now() - interval '60 days' where id = old;

  perform pg_temp.as_(ana);
  r := public.my_referral(); code := r->>'code';
  perform pg_temp.ok(code ~ '^ANAMA\d{4}$' and r->>'link' like '%/r/' || code and (r->>'lei')::numeric = 20, 'cod din prenume: ' || code);
  perform pg_temp.ok(public.my_referral()->>'code' = code, 'codul rămâne același');
  perform pg_temp.ok(public.referral_info(lower(code))->>'name' = 'Ana-Maria', 'pe site apare doar prenumele celui care invită');

  e := pg_temp.err(format('select public.claim_referral(%L)', code));
  perform pg_temp.ok(e = 'Nu te poți invita singur.', 'nu te poți invita singur');
  perform pg_temp.as_(old);
  e := pg_temp.err(format('select public.claim_referral(%L)', code));
  perform pg_temp.ok(e like 'Invitațiile sunt pentru conturile noi%', 'cont vechi: refuzat');
  perform pg_temp.as_(bob);
  e := pg_temp.err('select public.claim_referral(''NUEXISTA1'')');
  perform pg_temp.ok(e = 'Codul de invitație nu există.', 'cod greșit');
  r := public.claim_referral(code);
  perform pg_temp.ok(r->>'name' = 'Ana-Maria', 'Bogdan e legat de Ana');
  perform pg_temp.ok((public.claim_referral(code)->>'already')::boolean, 'a doua oară: fără eroare');
  perform pg_temp.ok(public.my_referral()->>'referred_by' = 'Ana-Maria', 'Bogdan vede cine l-a invitat');
  perform pg_temp.as_(ana);
  e := pg_temp.err(format('select public.claim_referral(%L)', public.referral_code(bob)));
  perform pg_temp.ok(e is not null, 'invitație inversă: refuzată');

  -- prima comandă sub minim: fără bonus
  perform pg_temp.as_(bob);
  r := public.place_order('{"name":"Bogdan","phone":"0745222333","mode":"ridicare","payment":"cash","items":[{"id":"smash","qty":1}]}'); o := (r->>'id')::uuid;
  perform pg_temp.as_(rec);
  update public.orders set status = 'prep', eta_min = 20 where id = o;
  update public.orders set status = 'done' where id = o;
  perform pg_temp.ok((select referral_paid_at from public.customers where id = bob) is null, 'comandă de 40 lei (sub 60): fără bonus');

  -- comanda de 80 lei: amândoi primesc 20 lei (2000 puncte), o singură dată
  select points into p0 from public.customers where id = ana;
  perform pg_temp.as_(bob);
  r := public.place_order('{"name":"Bogdan","phone":"0745222333","mode":"ridicare","payment":"cash","items":[{"id":"smash","qty":2}]}'); o := (r->>'id')::uuid;
  perform pg_temp.as_(rec);
  update public.orders set status = 'prep', eta_min = 20 where id = o;
  perform pg_temp.ok((select referral_paid_at from public.customers where id = bob) is null, 'în bucătărie: încă fără bonus');
  update public.orders set status = 'done' where id = o;
  perform pg_temp.ok((select points from public.customers where id = ana) = p0 + 2000, 'Ana primește 2000 puncte (20 lei)');
  perform pg_temp.ok((select sum(remaining * vpp) from public.point_lots where customer_id = bob and source = 'referral') = 20, 'Bogdan primește 20 lei în puncte');
  perform pg_temp.ok((select count(*) from public.reward_notifications where kind = 'referral' and customer_id in (ana, bob)) = 2, 'amândoi sunt anunțați în cont');
  perform pg_temp.as_(bob);
  r := public.place_order('{"name":"Bogdan","phone":"0745222333","mode":"ridicare","payment":"cash","items":[{"id":"smash","qty":3}]}'); o := (r->>'id')::uuid;
  perform pg_temp.as_(rec);
  update public.orders set status = 'prep', eta_min = 20 where id = o;
  update public.orders set status = 'done' where id = o;
  perform pg_temp.ok((select count(*) from public.point_ledger where kind = 'referral') = 2, 'bonusul se dă o singură dată');
  perform pg_temp.as_(ana);
  r := public.my_referral();
  perform pg_temp.ok((r->>'invited')::int = 1 and (r->>'rewarded')::int = 1 and (r->>'earned')::numeric = 20, 'Ana vede: 1 invitat, 1 recompensat, 20 lei');

  -- același telefon ca al celui care invită: fără bonus
  perform pg_temp.as_(cris);
  perform public.claim_referral(code);
  r := public.place_order('{"name":"Cris","phone":"0745000111","mode":"ridicare","payment":"cash","items":[{"id":"smash","qty":2}]}'); o := (r->>'id')::uuid;
  perform pg_temp.as_(rec);
  update public.orders set status = 'prep', eta_min = 20 where id = o;
  update public.orders set status = 'done' where id = o;
  perform pg_temp.ok((select count(*) from public.point_ledger where kind = 'referral') = 2, 'același telefon cu cel care invită: fără bonus');
end $$;
rollback;
