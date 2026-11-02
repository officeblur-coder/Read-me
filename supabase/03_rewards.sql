-- =====================================================================
-- LYRA REWARDS — fidelizare pe 3 niveluri (Classic / Select / Signature)
--
-- Principii:
--  * 1 leu plătit pe produse = 1 punct. Punctul valorează rate%/100 lei, după nivelul
--    clientului la momentul comenzii (Classic 1%, Select 2%, Signature 4%).
--  * Fiecare comandă livrată creează un LOT de puncte cu valoarea în lei blocată
--    (point_lots.vpp). Promovarea nu crește retroactiv valoarea loturilor vechi.
--  * Folosirea punctelor consumă loturile în ordinea vechimii (FIFO); fiecare consum
--    e înregistrat în order_redemptions, ca să poată fi returnat exact la anulare.
--  * Toate mișcările sunt în point_ledger (jurnal de audit, inclusiv ajustările din admin).
--  * Protecție la dublare: orders.credited + index unic pe lotul comenzii;
--    vouchers unic pe (client, nivel) → promovarea și voucherul se dau o singură dată.
--  * Banii sunt numeric (fără float); valoarea folosită e rotunjită în jos la bani.
-- =====================================================================

-- ---------- setări (un singur rând, editabil din admin) ----------
create table if not exists public.rewards_settings (
  id               int primary key default 1 check (id = 1),
  enabled          boolean not null default true,
  program_name     text not null default 'Lyra Rewards',
  tier_names       text[] not null default '{Classic,Select,Signature}',
  thresholds       numeric(12,2)[] not null default '{0,500,1500}',   -- lei cheltuiți cumulat
  rates            numeric(5,2)[] not null default '{1,2,4}',         -- cashback % (1 punct = rate/100 lei)
  max_redeem_pct   numeric(5,2) not null default 20,                  -- % din valoarea produselor
  voucher_days     int not null default 30,
  expiry_months    int not null default 12,                           -- inactivitate
  expiry_warn_days int not null default 30,
  voucher_warn_days int not null default 5,
  near_tier_lei    numeric(10,2) not null default 150,               -- „mai ai X lei până la…”
  dessert_ids      text[] not null default '{papanas,lapte-pasare,cinnamon-rolls,panna-cotta,clatite,somloi}',
  migrated         boolean not null default false,
  updated_at       timestamptz not null default now()
);
insert into public.rewards_settings(id) values (1) on conflict do nothing;

-- ---------- coloane noi ----------
alter table public.customers add column if not exists tier smallint not null default 1;
alter table public.customers add column if not exists reward_spent numeric(12,2) not null default 0;  -- progres spre nivel
alter table public.customers add column if not exists last_activity_at timestamptz;
alter table public.customers add column if not exists expiry_warned_at timestamptz;
alter table public.customers add column if not exists near_notified_tier smallint not null default 1;

alter table public.orders add column if not exists reward_tier smallint;            -- nivelul la plasare
alter table public.orders add column if not exists reward_base numeric(10,2);      -- suma care aduce puncte
alter table public.orders add column if not exists voucher_id uuid;
alter table public.orders add column if not exists refunded_at timestamptz;
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('new','prep','road','done','rejected','refunded'));

-- ---------- loturi de puncte ----------
create table if not exists public.point_lots (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  email       text,                                   -- pentru clienții fără cont
  order_id    uuid references public.orders(id) on delete set null,
  source      text not null check (source in ('order','adjust','migration')),
  points      int not null check (points > 0),
  remaining   int not null check (remaining >= 0),
  vpp         numeric(8,4) not null check (vpp >= 0),  -- valoarea unui punct, în lei
  tier        smallint not null default 1,
  created_at  timestamptz not null default now(),
  expired_at  timestamptz,
  check (remaining <= points),
  check (customer_id is not null or email is not null)
);
alter table public.point_lots add column if not exists seq bigint generated always as identity;  -- ordinea FIFO
create unique index if not exists point_lots_order_uq on public.point_lots(order_id) where source = 'order';
create index if not exists point_lots_cust_idx on public.point_lots(customer_id, created_at) where remaining > 0;
create index if not exists point_lots_email_idx on public.point_lots(lower(email)) where customer_id is null;

create table if not exists public.point_ledger (
  id          bigint generated always as identity primary key,
  customer_id uuid references public.customers(id) on delete cascade,
  email       text,
  order_id    uuid references public.orders(id) on delete set null,
  order_no    bigint,
  kind        text not null check (kind in ('earn','redeem','redeem_return','reverse','expire','adjust','migration')),
  points      int not null,                 -- + intră, − ies
  value       numeric(10,2) not null,       -- echivalentul în lei (cu semn)
  tier        smallint,
  note        text,
  actor       text,                         -- cine a făcut ajustarea
  created_at  timestamptz not null default now()
);
create index if not exists point_ledger_cust_idx on public.point_ledger(customer_id, created_at desc);

create table if not exists public.order_redemptions (
  order_id  uuid not null references public.orders(id) on delete cascade,
  lot_id    uuid not null references public.point_lots(id) on delete cascade,
  points    int not null check (points > 0),
  value     numeric(10,4) not null,
  returned  boolean not null default false,
  primary key (order_id, lot_id)
);

create table if not exists public.vouchers (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  tier          smallint not null,                 -- nivelul la care a fost câștigat
  kind          text not null default 'dessert',
  status        text not null default 'active' check (status in ('active','used','expired','cancelled')),
  item_id       text,                              -- desertul ales la folosire
  value         numeric(10,2),                     -- prețul desertului (pentru costul programului)
  expires_at    timestamptz not null,
  used_order_id uuid references public.orders(id) on delete set null,
  used_at       timestamptz,
  warned_at     timestamptz,
  created_at    timestamptz not null default now(),
  unique (customer_id, tier, kind)
);

create table if not exists public.reward_notifications (
  id          bigint generated always as identity primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  kind        text not null,              -- earn, near, promotion, voucher, expiry, voucher_expiry, adjust
  title       text not null,
  body        text not null,
  data        jsonb not null default '{}',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists reward_notif_idx on public.reward_notifications(customer_id, created_at desc);

-- ---------- securitate ----------
alter table public.rewards_settings     enable row level security;
alter table public.point_lots           enable row level security;
alter table public.point_ledger         enable row level security;
alter table public.order_redemptions    enable row level security;
alter table public.vouchers             enable row level security;
alter table public.reward_notifications enable row level security;
do $$ begin
  drop policy if exists "rewards settings read" on public.rewards_settings;
  drop policy if exists "lots own"     on public.point_lots;
  drop policy if exists "ledger own"   on public.point_ledger;
  drop policy if exists "vouchers own" on public.vouchers;
  drop policy if exists "notif own"    on public.reward_notifications;
  drop policy if exists "redemptions staff" on public.order_redemptions;
end $$;
create policy "rewards settings read" on public.rewards_settings for select using (true);
create policy "lots own"     on public.point_lots for select using (customer_id = auth.uid() or public.is_staff());
create policy "ledger own"   on public.point_ledger for select using (customer_id = auth.uid() or public.is_staff());
create policy "vouchers own" on public.vouchers for select using (customer_id = auth.uid() or public.is_staff());
create policy "notif own"    on public.reward_notifications for select using (customer_id = auth.uid() or public.is_staff());
create policy "redemptions staff" on public.order_redemptions for select using (public.is_staff());
grant select on public.rewards_settings to anon, authenticated;
grant select on public.point_lots, public.point_ledger, public.vouchers, public.reward_notifications, public.order_redemptions to authenticated;
-- clienții nu își pot modifica singuri nivelul sau progresul
revoke update on public.customers from anon, authenticated;
grant  update (name, phone, addresses, allergies, marketing_ok) on public.customers to authenticated;

-- =====================================================================
-- Calcule
-- =====================================================================
create or replace function public.rewards_cfg() returns public.rewards_settings
language sql stable security definer set search_path = public as $$
  select * from public.rewards_settings where id = 1;
$$;

-- nivelul (1..3) pentru o sumă cheltuită cumulat
create or replace function public.rewards_tier_for(p_spent numeric) returns smallint
language sql stable security definer set search_path = public as $$
  select (case when p_spent >= c.thresholds[3] then 3 when p_spent >= c.thresholds[2] then 2 else 1 end)::smallint
  from public.rewards_settings c where c.id = 1;
$$;

-- valoarea unui punct (lei) pentru un nivel
create or replace function public.rewards_vpp(p_tier smallint) returns numeric
language sql stable security definer set search_path = public as $$
  select round(c.rates[greatest(1, least(3, p_tier))] / 100.0, 4) from public.rewards_settings c where c.id = 1;
$$;

-- reîmprospătează punctele disponibile (cache în customers.points)
create or replace function public.rewards_sync(p_cust uuid) returns void
language sql security definer set search_path = public as $$
  update public.customers c set points = coalesce((select sum(remaining) from public.point_lots l
    where l.customer_id = c.id and l.expired_at is null), 0) where c.id = p_cust;
$$;

-- Planul de folosire a punctelor: FIFO pe loturi, fără să depășească plafonul în lei.
-- Întoarce: points, value (rotunjit în jos la bani), alloc [{lot, points, value}]
create or replace function public.rewards_plan(p_cust uuid, p_want int, p_cap numeric,
  out points int, out value numeric, out alloc jsonb)
language plpgsql stable security definer set search_path = public as $$
declare l record; k int; acc numeric := 0;
begin
  points := 0; value := 0; alloc := '[]';
  if p_cust is null or coalesce(p_want, 0) <= 0 or coalesce(p_cap, 0) <= 0 then return; end if;
  for l in select id, remaining, vpp from public.point_lots
           where customer_id = p_cust and remaining > 0 and expired_at is null
           order by seq loop
    exit when points >= p_want;
    k := least(l.remaining, p_want - points);
    if l.vpp > 0 then k := least(k, floor((p_cap - acc) / l.vpp)::int); end if;
    exit when k <= 0;
    points := points + k; acc := acc + k * l.vpp;
    alloc := alloc || jsonb_build_object('lot', l.id, 'points', k, 'value', k * l.vpp);
  end loop;
  value := floor(acc * 100) / 100;
end $$;

-- Mesaj în aplicație (și opțional email)
create or replace function public.rewards_notify(p_cust uuid, p_kind text, p_title text, p_body text, p_data jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.reward_notifications(customer_id, kind, title, body, data) values (p_cust, p_kind, p_title, p_body, coalesce(p_data,'{}'));
$$;

-- Email simplu, în stilul Lyra (Resend). Fără cheie în Vault: nu trimite nimic.
create or replace function public.rewards_email(p_to text, p_subject text, p_title text, p_body text, p_cta text default null)
returns void language plpgsql security definer set search_path = public as $$
declare s public.settings; key text; html text;
begin
  if coalesce(p_to,'') = '' then return; end if;
  select * into s from public.settings where id = 1;
  begin select decrypted_secret into key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  exception when others then key := null; end;
  if key is null then return; end if;
  html := format($h$<!doctype html><html><body style="margin:0;background:#0b0806;font-family:Arial,Helvetica,sans-serif">
<table width="100%%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center">
<table width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#16110d;border-radius:22px;color:#fbf3ea">
<tr><td align="center" style="padding:30px 24px 6px"><div style="font-size:28px;font-weight:800;letter-spacing:2px">LYRA’S</div>
<div style="font-size:11px;font-weight:700;letter-spacing:6px;color:#ff7a1a">DELIVERY</div></td></tr>
<tr><td style="padding:18px 30px 0;text-align:center"><div style="font-size:12px;letter-spacing:3px;color:#ffb24a">LYRA REWARDS</div>
<h1 style="margin:10px 0 0;font-size:26px;line-height:1.2">%1$s</h1>
<p style="margin:14px 0 0;color:#bba897;font-size:15px;line-height:1.55">%2$s</p></td></tr>
<tr><td align="center" style="padding:24px 30px 32px"><a href="%3$s/cont" style="display:inline-block;background:#ff7a1a;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:999px">%4$s</a></td></tr>
</table><p style="color:#86756a;font-size:12px;margin:16px 0 0">Lyra's Delivery · lyrasdelivery.ro</p></td></tr></table></body></html>$h$,
    p_title, p_body, s.site_url, coalesce(p_cta, 'Vezi Lyra Rewards'));
  perform net.http_post(url := 'https://api.resend.com/emails',
    body := jsonb_build_object('from', s.email_from, 'to', jsonb_build_array(p_to),
      'reply_to', coalesce(s.email_reply_to, 'comenzi@lyrasdelivery.ro'), 'subject', p_subject, 'html', html),
    headers := jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'));
exception when others then raise warning 'Email Lyra Rewards netrimis: %', sqlerrm;
end $$;

-- Promovare: urcă nivelul după progres; un voucher de desert pentru fiecare nivel nou (o singură dată).
create or replace function public.rewards_promote(p_cust uuid) returns smallint
language plpgsql security definer set search_path = public as $$
declare cfg public.rewards_settings := public.rewards_cfg(); c public.customers; t int; nt smallint; vid uuid;
begin
  select * into c from public.customers where id = p_cust for update;
  if not found then return null; end if;
  nt := public.rewards_tier_for(c.reward_spent);
  if nt <= c.tier then return c.tier; end if;
  for t in c.tier + 1 .. nt loop
    insert into public.vouchers(customer_id, tier, expires_at)
      values (p_cust, t, now() + make_interval(days => cfg.voucher_days))
      on conflict (customer_id, tier, kind) do nothing returning id into vid;
    if vid is not null then
      perform public.rewards_notify(p_cust, 'voucher', 'Ai primit un desert cadou 🍰',
        format('Alege-ți desertul preferat la următoarea comandă. Voucherul e valabil %s zile.', cfg.voucher_days),
        jsonb_build_object('voucher', vid, 'tier', t));
    end if;
    vid := null;
  end loop;
  update public.customers set tier = nt where id = p_cust;
  perform public.rewards_notify(p_cust, 'promotion', format('Bun venit în Lyra %s!', cfg.tier_names[nt]),
    format('De acum fiecare punct valorează %s lei (%s%% cashback la comenzile următoare). Te așteaptă și un desert cadou.',
      to_char(public.rewards_vpp(nt), 'FM0.00'), to_char(cfg.rates[nt], 'FM990.##')),
    jsonb_build_object('tier', nt, 'from', c.tier));
  perform public.rewards_email(c.email, format('Felicitări! Ai urcat la Lyra %s', cfg.tier_names[nt]),
    format('Bun venit în Lyra %s!', cfg.tier_names[nt]),
    format('De acum primești %s%% cashback în puncte la fiecare comandă și te așteaptă un <b>desert cadou</b>, valabil %s zile. Îl alegi direct în coș, la următoarea comandă.',
      to_char(cfg.rates[nt], 'FM990.##'), cfg.voucher_days), 'Alege desertul cadou');
  return nt;
end $$;

-- Acordarea punctelor pentru o comandă livrată (apelată din trigger-ul de status).
-- Întoarce punctele acordate.
create or replace function public.rewards_credit(o public.orders) returns int
language plpgsql security definer set search_path = public as $$
declare
  cfg public.rewards_settings := public.rewards_cfg();
  base numeric; pts int; cid uuid; c public.customers; t smallint; v numeric; lot uuid; nxt numeric; nt smallint;
begin
  if not cfg.enabled then return 0; end if;
  base := greatest(coalesce(o.reward_base, o.subtotal - o.discount - o.points_value), 0);
  pts  := floor(base)::int;
  cid  := o.customer_id;
  if cid is null and coalesce(o.email,'') <> '' then
    select id into cid from public.customers where lower(email) = lower(o.email) limit 1;
  end if;

  if cid is null then
    -- client fără cont: puncte Classic pe email, se mută în cont la înscriere
    if coalesce(o.email,'') = '' then return 0; end if;
    if pts > 0 then
      insert into public.point_lots(email, order_id, source, points, remaining, vpp, tier)
        values (lower(o.email), o.id, 'order', pts, pts, public.rewards_vpp(1::smallint), 1)
        on conflict do nothing returning id into lot;
      if lot is null then return 0; end if;
      insert into public.point_ledger(email, order_id, order_no, kind, points, value, tier, note)
        values (lower(o.email), o.id, o.number, 'earn', pts, round(pts * public.rewards_vpp(1::smallint), 2), 1, 'Comanda #' || o.number);
    end if;
    insert into public.pending_points as pp (email, orders, spent) values (lower(o.email), 1, base)
      on conflict (email) do update set orders = pp.orders + 1, spent = pp.spent + excluded.spent, updated_at = now();
    return pts;
  end if;

  select * into c from public.customers where id = cid for update;
  t := coalesce(o.reward_tier, c.tier);                 -- nivelul de la plasare: nu retroactiv
  v := public.rewards_vpp(t);
  if pts > 0 then
    insert into public.point_lots(customer_id, order_id, source, points, remaining, vpp, tier)
      values (cid, o.id, 'order', pts, pts, v, t) on conflict do nothing returning id into lot;
    if lot is null then return 0; end if;                -- deja acordat
    insert into public.point_ledger(customer_id, order_id, order_no, kind, points, value, tier, note)
      values (cid, o.id, o.number, 'earn', pts, round(pts * v, 2), t, 'Comanda #' || o.number);
  end if;
  update public.customers set reward_spent = reward_spent + base, orders_count = orders_count + 1,
    spent = spent + o.total, last_activity_at = now(), expiry_warned_at = null where id = cid;
  perform public.rewards_sync(cid);
  if pts > 0 then
    perform public.rewards_notify(cid, 'earn', format('+%s puncte', pts),
      format('Pentru comanda #%s. Valorează %s lei la comenzile următoare.', o.number, to_char(round(pts * v, 2), 'FM999990.00')),
      jsonb_build_object('order', o.number, 'points', pts));
  end if;
  nt := public.rewards_promote(cid);
  -- aproape de nivelul următor (o singură dată pe nivel)
  select * into c from public.customers where id = cid;
  if nt < 3 then
    nxt := cfg.thresholds[nt + 1] - c.reward_spent;
    if nxt > 0 and nxt <= cfg.near_tier_lei and c.near_notified_tier <= nt then
      perform public.rewards_notify(cid, 'near', format('Mai ai doar %s lei până la Lyra %s!', to_char(ceil(nxt), 'FM999990'), cfg.tier_names[nt + 1]),
        format('Deblochezi %s%% cashback și un desert cadou.', to_char(cfg.rates[nt + 1], 'FM990.##')), jsonb_build_object('tier', nt + 1));
      update public.customers set near_notified_tier = nt + 1 where id = cid;
    end if;
  end if;
  return pts;
end $$;

-- Returnează punctele și voucherul folosite de o comandă (anulare / refuz / rambursare).
create or replace function public.rewards_release(o public.orders) returns void
language plpgsql security definer set search_path = public as $$
declare r record; cid uuid;
begin
  for r in select * from public.order_redemptions where order_id = o.id and not returned for update loop
    update public.point_lots set remaining = remaining + r.points where id = r.lot_id returning customer_id into cid;
    update public.order_redemptions set returned = true where order_id = r.order_id and lot_id = r.lot_id;
    insert into public.point_ledger(customer_id, order_id, order_no, kind, points, value, note)
      values (cid, o.id, o.number, 'redeem_return', r.points, round(r.value, 2), 'Returnate: comanda #' || o.number || ' anulată');
  end loop;
  if cid is not null then perform public.rewards_sync(cid); end if;
  if o.voucher_id is not null then
    update public.vouchers set status = case when expires_at > now() then 'active' else 'expired' end,
      used_order_id = null, used_at = null, item_id = null
    where id = o.voucher_id and status = 'used' and used_order_id = o.id;
  end if;
end $$;

-- Rambursare după livrare: retrage punctele câștigate și progresul; nivelul rămâne (fără retrogradare).
create or replace function public.rewards_reverse(o public.orders) returns void
language plpgsql security definer set search_path = public as $$
declare l public.point_lots; need int; take int; r record; lost numeric := 0; base numeric; cid uuid;
begin
  select * into l from public.point_lots where order_id = o.id and source = 'order' for update;
  if found and l.expired_at is null then
    cid := l.customer_id;
    take := least(l.remaining, l.points);
    update public.point_lots set remaining = remaining - take where id = l.id;
    lost := take * l.vpp; need := l.points - take;
    -- punctele din comanda rambursată au fost deja folosite: se retrag din alte loturi (cât există)
    if need > 0 and cid is not null then
      for r in select id, remaining, vpp from public.point_lots where customer_id = cid and remaining > 0 and expired_at is null
               order by seq for update loop
        exit when need <= 0;
        take := least(r.remaining, need);
        update public.point_lots set remaining = remaining - take where id = r.id;
        need := need - take; lost := lost + take * r.vpp;
      end loop;
    end if;
    insert into public.point_ledger(customer_id, email, order_id, order_no, kind, points, value, tier, note)
      values (l.customer_id, l.email, o.id, o.number, 'reverse', -(l.points - need), -round(lost, 2), l.tier,
        'Comanda #' || o.number || ' rambursată' || case when need > 0 then format(' (%s puncte deja folosite)', need) else '' end);
  end if;
  base := greatest(coalesce(o.reward_base, o.subtotal - o.discount - o.points_value), 0);
  cid := coalesce(cid, o.customer_id);
  if cid is not null then
    update public.customers set reward_spent = greatest(reward_spent - base, 0), orders_count = greatest(orders_count - 1, 0),
      spent = greatest(spent - o.total, 0) where id = cid;
    perform public.rewards_sync(cid);
  elsif coalesce(o.email,'') <> '' then
    update public.pending_points set spent = greatest(spent - base, 0), orders = greatest(orders - 1, 0) where email = lower(o.email);
  end if;
  perform public.rewards_release(o);
end $$;

-- Clientul nou preia punctele și progresul strânse ca vizitator (după email).
create or replace function public.rewards_attach_guest(p_cust uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare pp public.pending_points;
begin
  update public.point_lots set customer_id = p_cust where customer_id is null and lower(email) = lower(p_email);
  update public.point_ledger set customer_id = p_cust where customer_id is null and lower(email) = lower(p_email);
  delete from public.pending_points where email = lower(p_email) returning * into pp;
  if pp.email is not null then
    update public.customers set reward_spent = reward_spent + pp.spent, orders_count = orders_count + pp.orders,
      spent = spent + pp.spent, last_activity_at = coalesce(last_activity_at, now()) where id = p_cust;
  end if;
  perform public.rewards_sync(p_cust);
  perform public.rewards_promote(p_cust);
end $$;

-- Expirări și avertismente (rulat zilnic de pg_cron; se poate rula și manual)
create or replace function public.rewards_run_daily() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  cfg public.rewards_settings := public.rewards_cfg(); c record; v record; lots_val numeric; lots_pts int;
  n_warn int := 0; n_exp int := 0; n_vwarn int := 0; n_vexp int := 0; deadline timestamptz;
begin
  -- vouchere expirate
  for v in update public.vouchers set status = 'expired' where status = 'active' and expires_at <= now() returning * loop
    n_vexp := n_vexp + 1;
  end loop;
  -- vouchere care expiră curând
  for v in select vo.*, cu.email from public.vouchers vo join public.customers cu on cu.id = vo.customer_id
           where vo.status = 'active' and vo.warned_at is null and vo.expires_at <= now() + make_interval(days => cfg.voucher_warn_days) loop
    perform public.rewards_notify(v.customer_id, 'voucher_expiry', 'Desertul cadou expiră curând',
      format('Voucherul tău expiră pe %s. Folosește-l la următoarea comandă.', to_char(v.expires_at, 'DD.MM.YYYY')), jsonb_build_object('voucher', v.id));
    perform public.rewards_email(v.email, 'Desertul tău cadou expiră curând', 'Nu uita de desertul cadou 🍰',
      format('Voucherul pentru desertul gratuit expiră pe <b>%s</b>. Îl alegi direct în coș.', to_char(v.expires_at, 'DD.MM.YYYY')), 'Comandă acum');
    update public.vouchers set warned_at = now() where id = v.id;
    n_vwarn := n_vwarn + 1;
  end loop;
  -- puncte care expiră din cauza inactivității
  for c in select * from public.customers where points > 0 and last_activity_at is not null loop
    deadline := c.last_activity_at + make_interval(months => cfg.expiry_months);
    if deadline <= now() then
      select coalesce(sum(remaining), 0), coalesce(sum(remaining * vpp), 0) into lots_pts, lots_val
        from public.point_lots where customer_id = c.id and remaining > 0 and expired_at is null;
      update public.point_lots set remaining = 0, expired_at = now() where customer_id = c.id and remaining > 0 and expired_at is null;
      if lots_pts > 0 then
        insert into public.point_ledger(customer_id, kind, points, value, note)
          values (c.id, 'expire', -lots_pts, -round(lots_val, 2), format('Expirate după %s luni fără comenzi', cfg.expiry_months));
        perform public.rewards_notify(c.id, 'expiry', 'Punctele au expirat', format('%s puncte au expirat după %s luni fără comenzi.', lots_pts, cfg.expiry_months));
      end if;
      perform public.rewards_sync(c.id);
      n_exp := n_exp + 1;
    elsif deadline <= now() + make_interval(days => cfg.expiry_warn_days) and (c.expiry_warned_at is null or c.expiry_warned_at < c.last_activity_at) then
      perform public.rewards_notify(c.id, 'expiry', 'Punctele tale expiră curând',
        format('Ai %s puncte care expiră pe %s. O comandă le păstrează încă %s luni.', c.points, to_char(deadline, 'DD.MM.YYYY'), cfg.expiry_months));
      perform public.rewards_email(c.email, 'Punctele Lyra Rewards expiră curând', 'Punctele tale expiră curând',
        format('Ai <b>%s puncte</b> care expiră pe <b>%s</b>. Orice comandă le păstrează încă %s luni.', c.points, to_char(deadline, 'DD.MM.YYYY'), cfg.expiry_months), 'Comandă acum');
      update public.customers set expiry_warned_at = now() where id = c.id;
      n_warn := n_warn + 1;
    end if;
  end loop;
  -- vizitatori fără cont: loturile vechi expiră după aceeași perioadă de inactivitate
  update public.point_lots l set remaining = 0, expired_at = now()
  where l.customer_id is null and l.remaining > 0 and l.expired_at is null
    and (select max(created_at) from public.point_lots x where x.customer_id is null and lower(x.email) = lower(l.email))
        <= now() - make_interval(months => cfg.expiry_months);
  return jsonb_build_object('points_warned', n_warn, 'points_expired', n_exp, 'vouchers_warned', n_vwarn, 'vouchers_expired', n_vexp);
end $$;
revoke execute on function public.rewards_run_daily() from public, anon, authenticated;

do $$ begin
  begin create extension if not exists pg_cron; exception when others then null; end;
  begin
    perform cron.unschedule('lyra-rewards-daily');
  exception when others then null; end;
  begin
    perform cron.schedule('lyra-rewards-daily', '15 4 * * *', 'select public.rewards_run_daily()');
  exception when others then raise notice 'pg_cron indisponibil: rulează zilnic select public.rewards_run_daily();'; end;
end $$;

-- =====================================================================
-- API pentru client
-- =====================================================================
create or replace function public.my_rewards() returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.customers; cfg public.rewards_settings := public.rewards_cfg();
begin
  select * into c from public.customers where id = auth.uid();
  if not found then return null; end if;
  update public.vouchers set status = 'expired' where customer_id = c.id and status = 'active' and expires_at <= now();
  return jsonb_build_object(
    'tier', c.tier, 'spent', c.reward_spent, 'points', c.points,
    'value', (select coalesce(floor(sum(remaining * vpp) * 100) / 100, 0) from public.point_lots where customer_id = c.id and remaining > 0 and expired_at is null),
    'last_activity_at', c.last_activity_at,
    'expires_at', case when c.points > 0 and c.last_activity_at is not null then c.last_activity_at + make_interval(months => cfg.expiry_months) end,
    'lots', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'remaining', remaining, 'vpp', vpp, 'tier', tier, 'created_at', created_at) order by seq)
             from public.point_lots where customer_id = c.id and remaining > 0 and expired_at is null), '[]'),
    'ledger', coalesce((select jsonb_agg(x order by x.created_at desc) from (select kind, points, value, tier, note, order_no, created_at
             from public.point_ledger where customer_id = c.id order by created_at desc limit 60) x), '[]'),
    'vouchers', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'tier', tier, 'status', status, 'item_id', item_id, 'expires_at', expires_at, 'used_at', used_at) order by created_at desc)
             from public.vouchers where customer_id = c.id), '[]'),
    'notifications', coalesce((select jsonb_agg(x order by x.created_at desc) from (select id, kind, title, body, data, read_at, created_at
             from public.reward_notifications where customer_id = c.id order by created_at desc limit 30) x), '[]'));
end $$;

create or replace function public.rewards_mark_read() returns void
language sql security definer set search_path = public as $$
  update public.reward_notifications set read_at = now() where customer_id = auth.uid() and read_at is null;
$$;
grant execute on function public.my_rewards(), public.rewards_mark_read() to authenticated;

-- =====================================================================
-- API pentru administrator
-- =====================================================================
create or replace function public.admin_rewards_save(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare th numeric[]; rt numeric[]; nm text[];
begin
  if not public.is_admin() then raise exception 'Doar administratorul poate modifica programul.' using errcode = 'P0001'; end if;
  nm := array(select jsonb_array_elements_text(p->'tier_names'));
  th := array(select (x)::numeric from jsonb_array_elements_text(p->'thresholds') x);
  rt := array(select (x)::numeric from jsonb_array_elements_text(p->'rates') x);
  if array_length(nm,1) <> 3 or array_length(th,1) <> 3 or array_length(rt,1) <> 3 then raise exception 'Sunt necesare exact 3 niveluri.' using errcode = 'P0001'; end if;
  if exists (select 1 from unnest(nm) n where coalesce(trim(n),'') = '') then raise exception 'Fiecare nivel are nevoie de un nume.' using errcode = 'P0001'; end if;
  if not (th[1] = 0 and th[2] > 0 and th[3] > th[2]) then raise exception 'Pragurile trebuie să crească: 0 < Select < Signature.' using errcode = 'P0001'; end if;
  if exists (select 1 from unnest(rt) r where r < 0 or r > 50) then raise exception 'Cashback între 0 și 50%%.' using errcode = 'P0001'; end if;
  if (p->>'max_redeem_pct')::numeric not between 0 and 100 then raise exception 'Limita de folosire e între 0 și 100%%.' using errcode = 'P0001'; end if;
  if (p->>'voucher_days')::int < 1 or (p->>'expiry_months')::int < 1 then raise exception 'Valabilitățile trebuie să fie pozitive.' using errcode = 'P0001'; end if;
  update public.rewards_settings set
    enabled = coalesce((p->>'enabled')::boolean, enabled), program_name = coalesce(nullif(trim(p->>'program_name'),''), program_name),
    tier_names = nm, thresholds = th, rates = rt,
    max_redeem_pct = (p->>'max_redeem_pct')::numeric, voucher_days = (p->>'voucher_days')::int,
    expiry_months = (p->>'expiry_months')::int, near_tier_lei = coalesce((p->>'near_tier_lei')::numeric, near_tier_lei),
    dessert_ids = array(select jsonb_array_elements_text(coalesce(p->'dessert_ids','[]'))), updated_at = now()
  where id = 1;
end $$;

create or replace function public.admin_rewards_adjust(p_customer uuid, p_points int, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.customers; who text; v numeric; need int; take int; r record; val numeric := 0;
begin
  if not public.is_admin() then raise exception 'Doar administratorul poate ajusta punctele.' using errcode = 'P0001'; end if;
  if coalesce(p_points, 0) = 0 then raise exception 'Scrie numărul de puncte (+ sau −).' using errcode = 'P0001'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Motivul ajustării este obligatoriu.' using errcode = 'P0001'; end if;
  select * into c from public.customers where id = p_customer for update;
  if not found then raise exception 'Clientul nu există.' using errcode = 'P0001'; end if;
  select email into who from auth.users where id = auth.uid();
  if p_points > 0 then
    v := public.rewards_vpp(c.tier);
    insert into public.point_lots(customer_id, source, points, remaining, vpp, tier) values (c.id, 'adjust', p_points, p_points, v, c.tier);
    val := p_points * v;
    update public.customers set last_activity_at = now() where id = c.id;
    perform public.rewards_notify(c.id, 'adjust', format('+%s puncte de la Lyra', p_points), trim(p_reason));
  else
    need := -p_points;
    if need > c.points then raise exception 'Clientul are doar % puncte.', c.points using errcode = 'P0001'; end if;
    for r in select id, remaining, vpp from public.point_lots where customer_id = c.id and remaining > 0 and expired_at is null order by seq for update loop
      exit when need <= 0;
      take := least(r.remaining, need);
      update public.point_lots set remaining = remaining - take where id = r.id;
      need := need - take; val := val - take * r.vpp;
    end loop;
  end if;
  insert into public.point_ledger(customer_id, kind, points, value, tier, note, actor)
    values (c.id, 'adjust', p_points, round(val, 2), c.tier, trim(p_reason), coalesce(who, 'admin'));
  perform public.rewards_sync(c.id);
  return jsonb_build_object('points', (select points from public.customers where id = c.id));
end $$;

create or replace function public.admin_rewards_overview() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Acces interzis.' using errcode = 'P0001'; end if;
  return jsonb_build_object(
    'tiers', (select coalesce(jsonb_object_agg(tier, n), '{}') from (select tier, count(*) n from public.customers group by tier) t),
    'customers', (select count(*) from public.customers),
    'issued_points', (select coalesce(sum(points), 0) from public.point_ledger where kind in ('earn','adjust','migration') and points > 0),
    'issued_value', (select coalesce(sum(value), 0) from public.point_ledger where kind in ('earn','adjust','migration') and points > 0),
    'used_points', (select coalesce(-sum(points), 0) from public.point_ledger where kind = 'redeem') - (select coalesce(sum(points), 0) from public.point_ledger where kind = 'redeem_return'),
    'used_value', (select coalesce(sum(points_value), 0) from public.orders where points_value > 0 and status not in ('rejected','refunded')),
    'expired_points', (select coalesce(-sum(points), 0) from public.point_ledger where kind = 'expire'),
    'outstanding_points', (select coalesce(sum(remaining), 0) from public.point_lots where expired_at is null),
    'outstanding_value', (select coalesce(round(sum(remaining * vpp), 2), 0) from public.point_lots where expired_at is null),
    'vouchers_issued', (select count(*) from public.vouchers),
    'vouchers_used', (select count(*) from public.vouchers where status = 'used'),
    'vouchers_active', (select count(*) from public.vouchers where status = 'active' and expires_at > now()),
    'vouchers_value', (select coalesce(sum(value), 0) from public.vouchers where status = 'used'),
    'discount_cost', (select coalesce(sum(points_value), 0) from public.orders where points_value > 0 and status not in ('rejected','refunded'))
                     + (select coalesce(sum(value), 0) from public.vouchers where status = 'used'));
end $$;

create or replace function public.admin_rewards_customers(p_q text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Acces interzis.' using errcode = 'P0001'; end if;
  return coalesce((select jsonb_agg(x) from (
    select c.id, c.email, c.name, c.phone, c.tier, c.reward_spent as spent, c.points, c.orders_count, c.last_activity_at, c.marketing_ok, c.created_at,
      (select coalesce(round(sum(remaining * vpp), 2), 0) from public.point_lots l where l.customer_id = c.id and l.remaining > 0 and l.expired_at is null) as value,
      (select count(*) from public.vouchers v where v.customer_id = c.id and v.status = 'active' and v.expires_at > now()) as vouchers
    from public.customers c
    where coalesce(p_q,'') = '' or c.email ilike '%' || p_q || '%' or c.name ilike '%' || p_q || '%' or c.phone ilike '%' || p_q || '%'
    order by c.reward_spent desc limit 300) x), '[]');
end $$;

create or replace function public.admin_rewards_ledger(p_customer uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Acces interzis.' using errcode = 'P0001'; end if;
  return coalesce((select jsonb_agg(x order by x.created_at desc) from (
    select kind, points, value, tier, note, actor, order_no, created_at from public.point_ledger where customer_id = p_customer order by created_at desc limit 200) x), '[]');
end $$;
grant execute on function public.admin_rewards_save(jsonb), public.admin_rewards_adjust(uuid,int,text),
  public.admin_rewards_overview(), public.admin_rewards_customers(text), public.admin_rewards_ledger(uuid) to authenticated;
revoke execute on function public.rewards_credit(public.orders), public.rewards_release(public.orders), public.rewards_reverse(public.orders),
  public.rewards_promote(uuid), public.rewards_attach_guest(uuid,text), public.rewards_notify(uuid,text,text,text,jsonb),
  public.rewards_email(text,text,text,text,text), public.rewards_sync(uuid) from public, anon, authenticated;
revoke execute on function public.rewards_plan(uuid,int,numeric) from public, anon, authenticated;

-- =====================================================================
-- Migrare o singură dată din vechiul Lyra Club (Bronz/Argint/Aur, 100 puncte = 10 lei)
-- Punctele vechi trec la valoarea Classic (0,01 lei/punct); nivelul se calculează din cheltuieli.
-- =====================================================================
do $$
declare c record; p record;
begin
  if (select migrated from public.rewards_settings where id = 1) then return; end if;
  for c in select * from public.customers loop
    update public.customers set reward_spent = c.spent, tier = public.rewards_tier_for(c.spent),
      near_notified_tier = public.rewards_tier_for(c.spent), last_activity_at = coalesce(c.last_activity_at, now()) where id = c.id;
    if c.points > 0 then
      insert into public.point_lots(customer_id, source, points, remaining, vpp, tier) values (c.id, 'migration', c.points, c.points, 0.01, 1);
      insert into public.point_ledger(customer_id, kind, points, value, note) values (c.id, 'migration', c.points, round(c.points * 0.01, 2), 'Puncte Lyra Club păstrate (0,01 lei/punct)');
    end if;
    perform public.rewards_sync(c.id);
  end loop;
  for p in select * from public.pending_points where points > 0 loop
    insert into public.point_lots(email, source, points, remaining, vpp, tier) values (p.email, 'migration', p.points, p.points, 0.01, 1);
    insert into public.point_ledger(email, kind, points, value, note) values (p.email, 'migration', p.points, round(p.points * 0.01, 2), 'Puncte Lyra Club păstrate (0,01 lei/punct)');
    update public.pending_points set points = 0 where email = p.email;
  end loop;
  update public.rewards_settings set migrated = true where id = 1;
end $$;

-- corecție: punctele preluate din Lyra Club valorează ca Classic (0,01 lei/punct), nu 0,10
update public.point_lots set vpp = 0.01 where source = 'migration' and vpp <> 0.01;
update public.point_ledger set value = round(points * 0.01, 2), note = 'Puncte Lyra Club păstrate (0,01 lei/punct)'
  where kind = 'migration' and note like '%0,10%';
