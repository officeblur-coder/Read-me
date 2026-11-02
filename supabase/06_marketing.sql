-- =====================================================================
-- Acord pentru oferte pe email (GDPR): bifat explicit de client, cu dată și sursă,
-- dezabonare dintr-un click (link unic), jurnal al acordurilor și listă pentru admin.
-- =====================================================================
alter table public.customers add column if not exists marketing_at timestamptz;
alter table public.customers add column if not exists marketing_source text;
alter table public.customers add column if not exists unsub_token uuid not null default gen_random_uuid();
create unique index if not exists customers_unsub_token_uq on public.customers(unsub_token);

create table if not exists public.marketing_log (
  id          bigint generated always as identity primary key,
  customer_id uuid references public.customers(id) on delete set null,
  email       text,
  action      text not null check (action in ('opt_in','opt_out')),
  source      text,
  at          timestamptz not null default now()
);
alter table public.marketing_log enable row level security;
do $$ begin drop policy if exists "mlog admin" on public.marketing_log; end $$;
create policy "mlog admin" on public.marketing_log for select using (public.is_admin());
grant select on public.marketing_log to authenticated;

-- orice schimbare a acordului se datează (înainte de scriere) și se jurnalizează (după)
create or replace function public.customers_marketing() returns trigger
language plpgsql security definer set search_path = public as $$
declare src text := coalesce(nullif(current_setting('lyra.marketing_source', true), ''), 'cont');
begin
  if tg_op = 'INSERT' then
    if new.marketing_ok then new.marketing_at := coalesce(new.marketing_at, now()); new.marketing_source := coalesce(new.marketing_source, 'inregistrare'); end if;
  elsif new.marketing_ok is distinct from old.marketing_ok then
    if new.marketing_ok then new.marketing_at := now(); new.marketing_source := src; else new.marketing_at := null; end if;
  end if;
  return new;
end $$;
create or replace function public.customers_marketing_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.marketing_ok) or (tg_op = 'UPDATE' and new.marketing_ok is distinct from old.marketing_ok) then
    insert into public.marketing_log(customer_id, email, action, source)
      values (new.id, new.email, case when new.marketing_ok then 'opt_in' else 'opt_out' end,
              case when new.marketing_ok then new.marketing_source else coalesce(nullif(current_setting('lyra.marketing_source', true), ''), 'cont') end);
  end if;
  return null;
end $$;
drop trigger if exists customers_marketing on public.customers;
create trigger customers_marketing before insert or update of marketing_ok on public.customers
  for each row execute function public.customers_marketing();
drop trigger if exists customers_marketing_log on public.customers;
create trigger customers_marketing_log after insert or update of marketing_ok on public.customers
  for each row execute function public.customers_marketing_log();

-- dezabonare fără cont, din linkul din email: lyrasdelivery.ro/dezabonare?t=<token>
create or replace function public.unsubscribe(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.customers;
begin
  select * into c from public.customers where unsub_token = p_token;
  if not found then return jsonb_build_object('ok', false); end if;
  perform set_config('lyra.marketing_source', 'link dezabonare', true);
  update public.customers set marketing_ok = false where id = c.id and marketing_ok;
  return jsonb_build_object('ok', true, 'email', regexp_replace(c.email, '^(.).*(@.*)$', '\1•••\2'));
end $$;
grant execute on function public.unsubscribe(uuid) to anon, authenticated;

-- lista abonaților (doar cei care au bifat), pentru export
create or replace function public.admin_marketing_list() returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.settings;
begin
  if not public.is_admin() then raise exception 'Doar administratorul vede lista.' using errcode = 'P0001'; end if;
  select * into s from public.settings where id = 1;
  return coalesce((select jsonb_agg(jsonb_build_object('email', c.email, 'name', c.name, 'phone', c.phone, 'tier', c.tier,
      'since', c.marketing_at, 'source', c.marketing_source, 'orders', c.orders_count,
      'unsubscribe', s.site_url || '/dezabonare?t=' || c.unsub_token) order by c.marketing_at desc)
    from public.customers c where c.marketing_ok and coalesce(c.email, '') <> ''), '[]');
end $$;
grant execute on function public.admin_marketing_list() to authenticated;
