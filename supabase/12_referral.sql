-- =====================================================================
-- Recomandă un prieten
-- Fiecare client cu cont are un cod (link lyrasdelivery.ro/r/COD). Prietenul își face cont din link.
-- Când prima lui comandă (de minim referral_min lei) e livrată, amândoi primesc referral_lei lei în puncte
-- Lyra Rewards (1 punct = 0,01 lei la acest lot). Punctele se folosesc ca restul (max. 20% din comandă).
-- =====================================================================

alter table public.settings add column if not exists referral_on boolean not null default true;
alter table public.settings add column if not exists referral_lei numeric(8,2) not null default 20 check (referral_lei >= 0);
alter table public.settings add column if not exists referral_min numeric(8,2) not null default 60 check (referral_min >= 0);

alter table public.customers add column if not exists ref_code text unique;
alter table public.customers add column if not exists referred_by uuid references public.customers(id) on delete set null;
alter table public.customers add column if not exists referred_at timestamptz;
alter table public.customers add column if not exists referral_paid_at timestamptz;   -- bonusul pentru această recomandare a fost dat

-- punctele din recomandare au sursa / tipul lor
alter table public.point_lots drop constraint if exists point_lots_source_check;
alter table public.point_lots add constraint point_lots_source_check check (source in ('order','adjust','migration','referral'));
alter table public.point_ledger drop constraint if exists point_ledger_kind_check;
alter table public.point_ledger add constraint point_ledger_kind_check check (kind in ('earn','redeem','redeem_return','reverse','expire','adjust','migration','referral'));

-- cod scurt, ușor de dictat: primele litere din prenume + 4 cifre (ex. ANA4821); fără litere confuzabile
create or replace function public.referral_code(p_cust uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c public.customers; base text; code text; i int := 0;
begin
  select * into c from public.customers where id = p_cust for update;
  if c.ref_code is not null then return c.ref_code; end if;
  base := upper(left(regexp_replace(translate(coalesce(nullif(split_part(trim(c.name), ' ', 1), ''), split_part(c.email, '@', 1), 'LYRA'),
          'ăâîșşțţĂÂÎȘŞȚŢ', 'aaisstAAISSTT'), '[^A-Za-z]', '', 'g'), 5));
  if length(base) < 2 then base := 'LYRA'; end if;
  loop
    code := base || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.customers where ref_code = code);
    i := i + 1; if i > 20 then base := base || 'X'; end if;
  end loop;
  update public.customers set ref_code = code where id = p_cust;
  return code;
end $$;
revoke execute on function public.referral_code(uuid) from public, anon, authenticated;

-- pagina „Invită un prieten” din cont
create or replace function public.my_referral() returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.settings; me uuid := auth.uid(); code text; ref public.customers;
begin
  if me is null or not exists (select 1 from public.customers where id = me) then raise exception 'Intră în cont.' using errcode = 'P0001'; end if;
  select * into s from public.settings where id = 1;
  code := public.referral_code(me);
  select r.* into ref from public.customers c join public.customers r on r.id = c.referred_by where c.id = me;
  return jsonb_build_object(
    'on', s.referral_on, 'lei', s.referral_lei, 'min', s.referral_min, 'code', code,
    'link', rtrim(s.site_url, '/') || '/r/' || code,
    'invited', (select count(*) from public.customers where referred_by = me),
    'rewarded', (select count(*) from public.customers where referred_by = me and referral_paid_at is not null),
    'earned', (select coalesce(sum(value), 0) from public.point_ledger where customer_id = me and kind = 'referral'),
    'referred_by', case when ref.id is null then null else split_part(trim(coalesce(ref.name, 'un prieten')), ' ', 1) end,
    'my_bonus_paid', (select referral_paid_at is not null from public.customers where id = me));
end $$;
grant execute on function public.my_referral() to authenticated;

-- cine invită (pentru mesajul de pe site, înainte de cont): doar prenumele
create or replace function public.referral_info(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', split_part(trim(coalesce(c.name, 'Un prieten')), ' ', 1), 'lei', s.referral_lei, 'min', s.referral_min)
  from public.customers c, public.settings s where s.id = 1 and s.referral_on and c.ref_code = upper(trim(p_code));
$$;
grant execute on function public.referral_info(text) to anon, authenticated;

-- prietenul (cont nou, fără comenzi) se leagă de cel care l-a invitat
create or replace function public.claim_referral(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.customers; r public.customers; s public.settings;
begin
  select * into s from public.settings where id = 1;
  if not s.referral_on then raise exception 'Recomandările nu sunt active acum.' using errcode = 'P0001'; end if;
  select * into me from public.customers where id = auth.uid() for update;
  if not found then raise exception 'Intră în cont.' using errcode = 'P0001'; end if;
  select * into r from public.customers where ref_code = upper(trim(p_code));
  if not found then raise exception 'Codul de invitație nu există.' using errcode = 'P0001'; end if;
  if r.id = me.id then raise exception 'Nu te poți invita singur.' using errcode = 'P0001'; end if;
  if me.referred_by is not null then
    if me.referred_by = r.id then return jsonb_build_object('name', split_part(trim(coalesce(r.name, 'un prieten')), ' ', 1), 'already', true); end if;
    raise exception 'Contul tău e deja legat de o invitație.' using errcode = 'P0001';
  end if;
  if r.referred_by = me.id then raise exception 'Te-a invitat deja această persoană.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.orders where customer_id = me.id and status not in ('rejected')) or me.created_at < now() - interval '30 days' then
    raise exception 'Invitațiile sunt pentru conturile noi, înainte de prima comandă.' using errcode = 'P0001';
  end if;
  update public.customers set referred_by = r.id, referred_at = now() where id = me.id;
  return jsonb_build_object('name', split_part(trim(coalesce(r.name, 'un prieten')), ' ', 1), 'lei', s.referral_lei, 'min', s.referral_min);
end $$;
grant execute on function public.claim_referral(text) to authenticated;

-- intern: puncte de recomandare (lot cu valoare fixă: 1 punct = 0,01 lei)
create or replace function public.referral_credit(p_cust uuid, p_lei numeric, p_order public.orders, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare pts int := round(p_lei * 100); t smallint;
begin
  if pts <= 0 then return; end if;
  select tier into t from public.customers where id = p_cust;
  insert into public.point_lots(customer_id, order_id, source, points, remaining, vpp, tier) values (p_cust, null, 'referral', pts, pts, 0.01, coalesce(t, 1));
  insert into public.point_ledger(customer_id, order_id, order_no, kind, points, value, tier, note, actor)
    values (p_cust, p_order.id, p_order.number, 'referral', pts, round(pts * 0.01, 2), t, p_note, 'sistem');
  update public.customers set last_activity_at = now() where id = p_cust;
  perform public.rewards_sync(p_cust);
  perform public.rewards_notify(p_cust, 'referral', format('+%s lei de la Lyra', to_char(p_lei, 'FM999990.##')), p_note);
end $$;
revoke execute on function public.referral_credit(uuid, numeric, public.orders, text) from public, anon, authenticated;

-- prima comandă livrată a prietenului: bonus pentru amândoi
create or replace function public.orders_referral() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.settings; friend public.customers; inviter public.customers; fname text; iname text;
begin
  if new.status <> 'done' or old.status = 'done' or new.customer_id is null then return new; end if;
  select * into s from public.settings where id = 1;
  if not s.referral_on or s.referral_lei <= 0 then return new; end if;
  select * into friend from public.customers where id = new.customer_id for update;
  if friend.referred_by is null or friend.referral_paid_at is not null then return new; end if;
  if new.subtotal < s.referral_min then return new; end if;
  select * into inviter from public.customers where id = friend.referred_by;
  if not found then return new; end if;
  -- același telefon ca al celui care invită: nu e un prieten nou
  if regexp_replace(coalesce(inviter.phone, ''), '\D', '', 'g') <> '' and regexp_replace(coalesce(inviter.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(new.phone, ''), '\D', '', 'g') then return new; end if;
  update public.customers set referral_paid_at = now() where id = friend.id;
  fname := split_part(trim(coalesce(friend.name, new.name, 'prietenul tău')), ' ', 1);
  iname := split_part(trim(coalesce(inviter.name, 'prietenul tău')), ' ', 1);
  perform public.referral_credit(inviter.id, s.referral_lei, new, format('%s a comandat prima dată din invitația ta. Mulțumim!', fname));
  perform public.referral_credit(friend.id, s.referral_lei, new, format('Bonus pentru prima comandă din invitația lui %s.', iname));
  return new;
end $$;
drop trigger if exists orders_referral on public.orders;
create trigger orders_referral after update of status on public.orders for each row execute function public.orders_referral();

-- admin: setări
create or replace function public.admin_referral_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then jsonb_build_object(
    'invited', (select count(*) from public.customers where referred_by is not null),
    'rewarded', (select count(*) from public.customers where referral_paid_at is not null),
    'cost', (select coalesce(sum(value), 0) from public.point_ledger where kind = 'referral'),
    'top', (select coalesce(jsonb_agg(x), '[]') from (
        select coalesce(r.name, r.email) as name, count(*) as invited, count(c.referral_paid_at) as rewarded
        from public.customers c join public.customers r on r.id = c.referred_by group by r.id, r.name, r.email order by count(c.referral_paid_at) desc, count(*) desc limit 10) x))
  end;
$$;
grant execute on function public.admin_referral_stats() to authenticated;
