-- Teste Lyra Rewards. Rulează pe o COPIE a bazei (totul se anulează la final):
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/rewards_test.sql
-- Fiecare verificare eșuată oprește rularea cu un mesaj clar.
begin;
-- testele de mai jos nu depind de ora la care rulează
update public.settings set open_time = '00:00', close_time = '23:59:59' where id = 1;
set local client_min_messages = notice;

-- ---------- utilitare ----------
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;

create function pg_temp.user_(p_email text) returns uuid language plpgsql as $$
declare u uuid := gen_random_uuid();
begin insert into auth.users(id, email) values (u, p_email); return u; end $$;

create function pg_temp.as_(u uuid) returns void language sql as $$ select set_config('request.jwt.claim.sub', coalesce(u::text, ''), true) $$;

-- plasează o comandă ca utilizatorul u (null = vizitator); întoarce rândul comenzii
create function pg_temp.order_(u uuid, p_items jsonb, p_extra jsonb default '{}') returns public.orders language plpgsql as $$
declare r jsonb; o public.orders;
begin
  perform pg_temp.as_(u);
  r := public.place_order(jsonb_build_object('name','Test','phone','0700','mode','ridicare','payment','card','items',p_items) || p_extra);
  select * into o from public.orders where id = (r->>'id')::uuid;
  return o;
end $$;

create function pg_temp.status_(o uuid, st text) returns public.orders language plpgsql as $$
declare r public.orders;
begin update public.orders set status = st where id = o returning * into r; return r; end $$;

create function pg_temp.cust(u uuid) returns public.customers language sql as $$ select * from public.customers where id = u $$;

-- setări cunoscute pentru teste
update public.rewards_settings set enabled = true, tier_names = '{Classic,Select,Signature}', thresholds = '{0,500,1500}',
  rates = '{1,2,4}', max_redeem_pct = 20, voucher_days = 30, expiry_months = 12, expiry_warn_days = 30,
  dessert_ids = '{papanas,cinnamon-rolls}' where id = 1;
update public.settings set accepting_orders = true, min_order = 0 where id = 1;
update public.items set available = true, active = true where id in ('smash','platou-lyra','papanas','cinnamon-rolls','pepsi');

do $$
declare a uuid; b uuid; g uuid; adm uuid; o public.orders; o2 public.orders; c public.customers; n int; v numeric; vid uuid; r jsonb;
begin
  -- ===== 1. Classic: 1 leu = 1 punct, 1 punct = 0,01 lei; ambalajul nu aduce puncte =====
  a := pg_temp.user_('a@test.ro');
  o := pg_temp.order_(a, '[{"id":"smash","qty":4}]');                       -- 100 lei produse + 8 lei ambalaj
  perform pg_temp.ok(o.subtotal = 100 and o.packaging = 8 and o.total = 108, '1. totalul comenzii include ambalajul');
  perform pg_temp.ok(o.reward_base = 100 and o.points_earned = 100 and o.reward_tier = 1, '1. baza de puncte = doar produsele (100)');
  o := pg_temp.status_(o.id, 'prep'); o := pg_temp.status_(o.id, 'done');
  c := pg_temp.cust(a);
  perform pg_temp.ok(c.points = 100 and c.reward_spent = 100 and c.tier = 1, '1. 100 puncte acordate la livrare');
  select vpp into v from public.point_lots where order_id = o.id;
  perform pg_temp.ok(v = 0.01, '1. lotul Classic valorează 0,01 lei/punct');

  -- ===== 2. Fără acordare dublă =====
  perform pg_temp.ok(public.rewards_credit(o) = 0, '2. a doua acordare pentru aceeași comandă nu dă puncte');
  update public.orders set status = 'done' where id = o.id;
  select count(*) into n from public.point_lots where order_id = o.id;
  perform pg_temp.ok(n = 1 and (pg_temp.cust(a)).points = 100, '2. un singur lot per comandă');

  -- ===== 3. Promovare Classic → Select: comanda care trece pragul se calculează la nivelul vechi =====
  o := pg_temp.order_(a, '[{"id":"platou-lyra","qty":2}]');                 -- 580 lei → cumulat 680
  perform pg_temp.ok(o.reward_tier = 1, '3. nivelul de la plasare este Classic');
  o := pg_temp.status_(o.id, 'done');
  c := pg_temp.cust(a);
  perform pg_temp.ok(c.tier = 2, '3. promovat la Select după 500 lei');
  select vpp into v from public.point_lots where order_id = o.id;
  perform pg_temp.ok(v = 0.01, '3. punctele comenzii care a trecut pragul rămân la 0,01 (nu retroactiv)');
  select count(*) into n from public.vouchers where customer_id = a and tier = 2 and status = 'active';
  perform pg_temp.ok(n = 1, '3. un voucher de desert pentru Select');
  perform pg_temp.ok((select count(*) from public.reward_notifications where customer_id = a and kind = 'promotion') = 1, '3. notificare de promovare');
  perform public.rewards_promote(a);
  perform pg_temp.ok((select count(*) from public.vouchers where customer_id = a) = 1, '3. promovarea repetată nu dă alt voucher');
  -- comanda următoare câștigă la 0,02
  o := pg_temp.order_(a, '[{"id":"smash","qty":2}]');
  o := pg_temp.status_(o.id, 'done');
  select vpp into v from public.point_lots where order_id = o.id;
  perform pg_temp.ok(v = 0.02 and o.points_earned = 50, '3. comenzile următoare câștigă la 0,02 lei/punct');

  -- ===== 4. O comandă care trece simultan ambele praguri =====
  b := pg_temp.user_('b@test.ro');
  o := pg_temp.order_(b, '[{"id":"platou-lyra","qty":6}]');                 -- 1740 lei
  o := pg_temp.status_(o.id, 'done');
  c := pg_temp.cust(b);
  perform pg_temp.ok(c.tier = 3, '4. direct la Signature');
  perform pg_temp.ok((select count(*) from public.vouchers where customer_id = b) = 2, '4. două vouchere: Select și Signature');
  perform pg_temp.ok((select vpp from public.point_lots where order_id = o.id) = 0.01 and c.points = 1740, '4. punctele comenzii rămân la 0,01');

  -- ===== 5. Folosirea punctelor: maxim 20% din produse, FIFO, valoarea fiecărui lot =====
  -- client a: loturi 100×0,01 + 580×0,01 + 50×0,02 = 7,80 lei
  c := pg_temp.cust(a);
  perform pg_temp.ok(c.points = 730, '5. sold a = 730 puncte');
  o := pg_temp.order_(a, '[{"id":"smash","qty":2}]', '{"redeem_points": 730}');   -- produse 50 lei → plafon 10 lei
  perform pg_temp.ok(o.points_value = 7.80 and o.points_used = 730, '5. toate punctele (7,80 lei) sub plafonul de 10 lei');
  perform pg_temp.ok(o.reward_base = 42.20 and o.points_earned = 42, '5. punctele nu aduc puncte (baza 42,20)');
  perform pg_temp.ok((pg_temp.cust(a)).points = 0, '5. soldul scade imediat la plasare');
  -- refuz: punctele revin exact
  o := pg_temp.status_(o.id, 'rejected');
  perform pg_temp.ok((pg_temp.cust(a)).points = 730, '6. refuzul returnează punctele');
  perform pg_temp.ok((select sum(remaining * vpp) from public.point_lots where customer_id = a) = 7.80, '6. valoarea loturilor e neschimbată');
  -- plafonul de 20%
  o := pg_temp.order_(a, '[{"id":"smash","qty":1}]', '{"redeem_points": 730}');   -- 25 lei → plafon 5,00 lei
  perform pg_temp.ok(o.points_value = 5.00 and o.points_used = 500, '5. plafon 20%: 500 puncte × 0,01 = 5,00 lei');
  perform pg_temp.ok((select remaining from public.point_lots where customer_id = a order by seq limit 1) = 0, '5. se consumă întâi lotul cel mai vechi');
  -- cerere parțială
  o2 := pg_temp.order_(a, '[{"id":"smash","qty":4}]', '{"redeem_points": 100}');
  perform pg_temp.ok(o2.points_used = 100, '5. clientul alege câte puncte folosește');
  o2 := pg_temp.status_(o2.id, 'rejected'); o := pg_temp.status_(o.id, 'rejected');
  -- comandă închisă nu se mai redeschide
  begin
    perform pg_temp.status_(o.id, 'done');
    perform pg_temp.ok(false, '6. o comandă refuzată nu poate fi livrată');
  exception when others then perform pg_temp.ok(sqlerrm like '%închisă%', '6. comandă refuzată blocată'); end;

  -- ===== 7. Rambursare după livrare =====
  c := pg_temp.cust(a);
  o := pg_temp.order_(a, '[{"id":"smash","qty":8}]', '{"redeem_points": 200}');  -- 200 lei, 200 puncte
  o := pg_temp.status_(o.id, 'done');
  perform pg_temp.ok((pg_temp.cust(a)).reward_spent = c.reward_spent + o.reward_base, '7. progresul crește la livrare');
  o := pg_temp.status_(o.id, 'refunded');
  perform pg_temp.ok((pg_temp.cust(a)).reward_spent = c.reward_spent, '7. rambursarea scade progresul');
  perform pg_temp.ok((pg_temp.cust(a)).points = c.points, '7. punctele câștigate sunt retrase, cele folosite returnate');
  perform pg_temp.ok((pg_temp.cust(a)).tier = 2, '7. nivelul nu scade (fără retrogradare)');
  perform pg_temp.ok(o.refunded_at is not null, '7. data rambursării salvată');

  -- ===== 8. Voucher desert =====
  select id into vid from public.vouchers where customer_id = a and status = 'active';
  begin
    o := pg_temp.order_(a, '[{"id":"smash","qty":1}]', jsonb_build_object('voucher_id', vid, 'voucher_item', 'pepsi'));
    perform pg_temp.ok(false, '8. un produs din afara listei e respins');
  exception when others then perform pg_temp.ok(sqlerrm like '%desert%', '8. doar deserturi din listă'); end;
  o := pg_temp.order_(a, '[{"id":"smash","qty":1}]', jsonb_build_object('voucher_id', vid, 'voucher_item', 'papanas'));
  perform pg_temp.ok(o.subtotal = 25 and o.total = 27 and o.voucher_id = vid, '8. desertul e gratuit și fără ambalaj');
  perform pg_temp.ok((select status from public.vouchers where id = vid) = 'used', '8. voucher marcat folosit');
  begin
    perform pg_temp.order_(a, '[{"id":"smash","qty":1}]', jsonb_build_object('voucher_id', vid, 'voucher_item', 'papanas'));
    perform pg_temp.ok(false, '8. voucherul nu se poate folosi de două ori');
  exception when others then perform pg_temp.ok(sqlerrm like '%valabil%', '8. folosire unică'); end;
  o := pg_temp.status_(o.id, 'rejected');
  perform pg_temp.ok((select status from public.vouchers where id = vid) = 'active', '8. comanda refuzată redă voucherul');
  update public.vouchers set expires_at = now() - interval '1 day' where id = vid;
  begin
    perform pg_temp.order_(a, '[{"id":"smash","qty":1}]', jsonb_build_object('voucher_id', vid, 'voucher_item', 'papanas'));
    perform pg_temp.ok(false, '8. voucher expirat respins');
  exception when others then perform pg_temp.ok(sqlerrm like '%valabil%', '8. voucher expirat respins'); end;
  r := public.rewards_run_daily();
  perform pg_temp.ok((select status from public.vouchers where id = vid) = 'expired', '10. voucherul expirat e marcat la rularea zilnică');

  -- ===== 9. Expirarea punctelor după 12 luni de inactivitate =====
  update public.customers set last_activity_at = now() - interval '11 months 20 days', expiry_warned_at = null where id = b;
  r := public.rewards_run_daily();
  perform pg_temp.ok((select count(*) from public.reward_notifications where customer_id = b and kind = 'expiry') = 1, '9. avertisment înainte de expirare');
  r := public.rewards_run_daily();
  perform pg_temp.ok((select count(*) from public.reward_notifications where customer_id = b and kind = 'expiry') = 1, '9. avertismentul nu se repetă');
  update public.customers set last_activity_at = now() - interval '12 months 1 day' where id = b;
  r := public.rewards_run_daily();
  perform pg_temp.ok((pg_temp.cust(b)).points = 0, '9. punctele expiră după 12 luni');
  perform pg_temp.ok((select points from public.point_ledger where customer_id = b and kind = 'expire') = -1740, '9. expirarea apare în istoric');

  -- ===== 11. Vizitator fără cont → își face cont cu același email =====
  o := pg_temp.order_(null, '[{"id":"platou-lyra","qty":2}]', '{"email":"Guest@Test.ro"}');
  o := pg_temp.status_(o.id, 'done');
  perform pg_temp.ok((select remaining from public.point_lots where order_id = o.id and customer_id is null) = 580, '11. puncte păstrate pe email');
  g := pg_temp.user_('guest@test.ro');
  c := pg_temp.cust(g);
  perform pg_temp.ok(c.points = 580 and c.reward_spent = 580 and c.tier = 2, '11. contul nou preia punctele și nivelul');
  perform pg_temp.ok((select count(*) from public.vouchers where customer_id = g) = 1, '11. și voucherul de Select');

  -- ===== 12. Ajustare manuală din admin, cu jurnal =====
  adm := pg_temp.user_('admin@test.ro');
  insert into public.staff(user_id, name, role) values (adm, 'Admin', 'admin');
  perform pg_temp.as_(adm);
  r := public.admin_rewards_adjust(g, 120, 'Compensație întârziere');
  perform pg_temp.ok((r->>'points')::int = 700, '12. +120 puncte');
  perform pg_temp.ok((select actor from public.point_ledger where customer_id = g and kind = 'adjust') = 'admin@test.ro', '12. jurnalul reține cine a ajustat');
  perform pg_temp.ok((select vpp from public.point_lots where customer_id = g and source = 'adjust') = 0.02, '12. ajustarea are valoarea nivelului actual');
  begin
    perform public.admin_rewards_adjust(g, -5000, 'test');
    perform pg_temp.ok(false, '12. nu se pot scoate mai multe puncte decât are');
  exception when others then perform pg_temp.ok(sqlerrm like '%doar%', '12. sold insuficient respins'); end;
  begin
    perform public.admin_rewards_adjust(g, 10, '');
    perform pg_temp.ok(false, '12. motivul e obligatoriu');
  exception when others then perform pg_temp.ok(sqlerrm like '%Motivul%', '12. motiv obligatoriu'); end;
  perform pg_temp.as_(a);
  begin
    perform public.admin_rewards_adjust(a, 1000, 'hack');
    perform pg_temp.ok(false, '12. clientul nu își poate da puncte');
  exception when others then perform pg_temp.ok(sqlerrm like '%administratorul%', '12. doar adminul ajustează'); end;

  -- ===== 13. Precizie: 4% cashback, valoarea în bani rotunjită în jos =====
  o := pg_temp.order_(b, '[{"id":"pepsi","qty":3}]');                       -- 46,50 lei la Signature
  perform pg_temp.ok(o.reward_tier = 3 and o.points_earned = 46, '13. 46,50 lei → 46 puncte');
  o := pg_temp.status_(o.id, 'done');
  perform pg_temp.ok((select vpp from public.point_lots where order_id = o.id) = 0.04, '13. Signature: 0,04 lei/punct');
  o := pg_temp.order_(b, '[{"id":"smash","qty":1}]', '{"redeem_points": 46}');
  perform pg_temp.ok(o.points_value = 1.84 and o.total = 25 - 1.84 + 2, '13. 46 × 0,04 = 1,84 lei');

  -- ===== 14. Programul oprit: nu se acordă și nu se folosesc puncte =====
  update public.rewards_settings set enabled = false where id = 1;
  o := pg_temp.order_(b, '[{"id":"smash","qty":4}]', '{"redeem_points": 100}');
  perform pg_temp.ok(o.points_used = 0 and o.points_earned = 0, '14. program oprit: fără puncte');
  update public.rewards_settings set enabled = true where id = 1;

  -- ===== 15. API client =====
  perform pg_temp.as_(g);
  r := public.my_rewards();
  perform pg_temp.ok((r->>'tier')::int = 2 and (r->>'points')::int = 700 and jsonb_array_length(r->'lots') = 2, '15. my_rewards întoarce nivel, sold și loturi');
  perform pg_temp.ok((r->>'value')::numeric = 580 * 0.01 + 120 * 0.02, '15. valoarea totală = suma loturilor');
end $$;

rollback;
\echo 'Toate testele Lyra Rewards au trecut.'
