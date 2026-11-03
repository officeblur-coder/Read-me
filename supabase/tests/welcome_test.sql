-- Teste bonus de bun venit (pe o copie a bazei; totul se anulează). psql -v ON_ERROR_STOP=1 -f supabase/tests/welcome_test.sql
begin;
update public.settings set open_time = '00:00', close_time = '23:59:59', accepting_orders = true, min_order = 0,
  welcome_on = true, welcome_lei = 50, welcome_min = 150 where id = 1;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function pg_temp.place(who uuid, p jsonb) returns public.orders language plpgsql as $$
declare r jsonb; o public.orders;
begin
  perform set_config('request.jwt.claim.sub', coalesce(who::text, ''), true);
  r := public.place_order(jsonb_build_object('name','T','phone','0745 111 222','mode','ridicare','payment','card') || p);
  select * into o from public.orders where id = (r->>'id')::uuid; return o;
end $$;
create function pg_temp.err(who uuid, p jsonb) returns text language plpgsql as $$
begin perform pg_temp.place(who, p); return null; exception when sqlstate 'P0001' then return sqlerrm; end $$;
delete from public.delivery_zones; delete from public.item_discounts;
update public.items set available = true, active = true, price = 40 where id = 'smash';
insert into public.promo_codes(code, percent, label, active) values ('TEST10', 10, '-10% test', true) on conflict (code) do update set percent = 10, category_id = null, active = true;

do $$
declare u uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); c public.customers; o public.orders; e text; pts int;
begin
  insert into auth.users(id, email) values (u, 'nou@test.ro');
  select * into c from public.customers where id = u;
  perform pg_temp.ok(c.welcome_credit = 50 and c.welcome_used_at is null, 'cont nou: 50 lei bonus');

  e := pg_temp.err(u, '{"use_welcome":true,"items":[{"id":"smash","qty":3}]}');
  perform pg_temp.ok(e like 'Bonusul de 50.00 lei se folosește la o comandă de minim 150.00 lei%Mai adaugă 30.00%', 'sub 150 lei: refuzat (' || coalesce(e,'-') || ')');
  e := pg_temp.err(u, '{"use_welcome":true,"code":"TEST10","items":[{"id":"smash","qty":4}]}');
  perform pg_temp.ok(e like '%nu se cumulează%', 'cu cod de reducere: refuzat');

  o := pg_temp.place(u, '{"items":[{"id":"smash","qty":1}]}');
  perform pg_temp.ok(o.welcome_value = 0 and (select welcome_used_at is null from public.customers where id = u), 'comandă fără bonus: bonusul rămâne');

  o := pg_temp.place(u, '{"use_welcome":true,"items":[{"id":"smash","qty":4}]}');
  perform pg_temp.ok(o.welcome_value = 50 and o.total = 160 - 50 + o.packaging, 'comandă 160 lei: −50 lei, tot bonusul odată');
  perform pg_temp.ok(o.reward_base = 110 and o.points_earned = 110, 'punctele se calculează fără cei 50 de lei de bonus');
  perform pg_temp.ok((select welcome_used_at is not null and welcome_order_id = o.id from public.customers where id = u), 'bonus marcat ca folosit');
  e := pg_temp.err(u, '{"use_welcome":true,"items":[{"id":"smash","qty":4}]}');
  perform pg_temp.ok(e like '%deja folosit%', 'a doua oară: refuzat');

  -- alt cont, același telefon
  insert into auth.users(id, email) values (u2, 'alt@test.ro');
  e := pg_temp.err(u2, '{"use_welcome":true,"phone":"+40745111222","items":[{"id":"smash","qty":4}]}');
  perform pg_temp.ok(e like '%acest număr de telefon%', 'același telefon pe alt cont: refuzat');

  -- comanda refuzată: bonusul revine
  update public.orders set status = 'rejected', reject_reason = 'test' where id = o.id;
  perform pg_temp.ok((select welcome_used_at is null from public.customers where id = u), 'comandă refuzată: bonusul revine');
  o := pg_temp.place(u2, '{"use_welcome":true,"phone":"+40745111222","items":[{"id":"smash","qty":4}]}');
  perform pg_temp.ok(o.welcome_value = 50, 'după refuz, telefonul poate folosi din nou bonusul');

  -- fără cont
  e := pg_temp.err(null, '{"use_welcome":true,"phone":"0700000000","items":[{"id":"smash","qty":4}]}');
  perform pg_temp.ok(e like 'Intră în cont%', 'fără cont: refuzat');

  -- bonus oprit din admin: conturile noi nu-l primesc
  update public.settings set welcome_on = false where id = 1;
  insert into auth.users(id, email) values (gen_random_uuid(), 'fara@test.ro');
  perform pg_temp.ok((select welcome_credit = 0 from public.customers where email = 'fara@test.ro'), 'bonus oprit: cont nou fără bonus');
end $$;
-- clientul nu își poate scrie singur bonusul
set local role authenticated;
do $$ begin
  begin update public.customers set welcome_credit = 999; raise exception 'TEST EȘUAT: clientul și-a modificat bonusul';
  exception when insufficient_privilege then raise notice 'ok  clientul nu își poate modifica bonusul'; end;
end $$;
reset role;
rollback;
