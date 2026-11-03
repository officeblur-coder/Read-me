-- Teste acord oferte (pe o copie; se anulează). psql -v ON_ERROR_STOP=1 -f supabase/tests/marketing_test.sql
begin;
-- testele de mai jos nu depind de ora la care rulează
update public.settings set open_time = '00:00', close_time = '23:59:59' where id = 1;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'TEST EȘUAT: %', msg; end if; raise notice 'ok  %', msg; end $$;
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); adm uuid := gen_random_uuid(); r jsonb; tok uuid;
begin
  -- metadatele se trimit la înregistrare (Supabase: raw_user_meta_data); fără coloană, nu se bifează nimic
  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'raw_user_meta_data') then
    execute 'insert into auth.users(id, email, raw_user_meta_data) values ($1, $2, $3)' using a, 'da@test.ro', '{"marketing_ok": true}'::jsonb;
    perform pg_temp.ok((select marketing_ok and marketing_at is not null and marketing_source = 'inregistrare' from public.customers where id = a), 'bifat la înregistrare: abonat, cu dată și sursă');
  else
    insert into auth.users(id, email) values (a, 'da@test.ro');
    update public.customers set marketing_ok = true where id = a;
  end if;
  insert into auth.users(id, email) values (b, 'nu@test.ro');
  perform pg_temp.ok((select not marketing_ok from public.customers where id = b), 'nebifat: nu e abonat');
  insert into auth.users(id, email) values (adm, 'adm@test.ro'); insert into public.staff(user_id, name, role) values (adm, 'Adm', 'admin');
  perform set_config('request.jwt.claim.sub', adm::text, true);
  r := public.admin_marketing_list();
  perform pg_temp.ok(jsonb_array_length(r) = 1 and r->0->>'email' = 'da@test.ro', 'lista conține doar abonații');
  perform pg_temp.ok((r->0->>'unsubscribe') like '%/dezabonare?t=%', 'fiecare abonat are link de dezabonare');
  select unsub_token into tok from public.customers where id = a;
  perform set_config('request.jwt.claim.sub', '', true);
  r := public.unsubscribe(tok);
  perform pg_temp.ok((r->>'ok')::boolean and (select not marketing_ok and marketing_at is null from public.customers where id = a), 'dezabonare dintr-un click, fără cont');
  perform pg_temp.ok((select count(*) from public.marketing_log where customer_id = a) = 2, 'jurnal: abonare + dezabonare');
  perform pg_temp.ok(not (public.unsubscribe(gen_random_uuid())->>'ok')::boolean, 'link greșit nu face nimic');
  perform set_config('request.jwt.claim.sub', adm::text, true);
  perform pg_temp.ok(jsonb_array_length(public.admin_marketing_list()) = 0, 'dezabonatul dispare din listă');
  perform set_config('request.jwt.claim.sub', b::text, true);
  begin perform public.admin_marketing_list(); perform pg_temp.ok(false, 'clientul nu vede lista');
  exception when others then perform pg_temp.ok(sqlerrm like '%administratorul%', 'doar adminul vede lista'); end;
end $$;
rollback;
\echo 'Toate testele pentru acordul de oferte au trecut.'
