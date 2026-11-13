-- =====================================================================
-- Plata online cu cardul (Stripe Checkout)
-- Clientul alege „Card online”, comanda se salvează cu pay_status = 'pending' și NU apare la recepție.
-- Funcția Edge `pay` deschide pagina de plată Stripe; webhook-ul `stripe-webhook` marchează comanda plătită,
-- iar abia atunci recepția o vede (și primește notificarea). Plata neterminată în 30 de minute anulează comanda.
-- Comanda plătită și apoi refuzată / anulată se rambursează automat pe card.
-- Configurare: supabase/functions/pay/README.md. Până atunci opțiunea nu apare pe site (online_pay_on = false).
-- =====================================================================

alter table public.settings add column if not exists online_pay_on boolean not null default false;

alter table public.orders add column if not exists pay_status text not null default 'none'
  check (pay_status in ('none', 'pending', 'paid', 'failed', 'refunding', 'refunded'));
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists stripe_session text;
alter table public.orders add column if not exists stripe_payment text;      -- payment_intent
alter table public.orders add column if not exists stripe_refund text;
create index if not exists orders_pay_pending_idx on public.orders(created_at) where pay_status = 'pending';

-- la plasare: „online” doar când plata e pornită; comanda așteaptă plata
create or replace function public.orders_pay_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.scheduled_for is not null and new.payment is distinct from 'online' then
    raise exception 'Precomenzile se plătesc online, cu cardul.' using errcode = 'P0001';
  end if;
  if new.payment = 'online' then
    if not coalesce((select online_pay_on from public.settings where id = 1), false) then
      raise exception 'Plata online nu este disponibilă acum. Alege plata la livrare.' using errcode = 'P0001';
    end if;
    new.pay_status := 'pending';
  else
    new.pay_status := 'none';
  end if;
  return new;
end $$;
drop trigger if exists orders_pay_insert on public.orders;
create trigger orders_pay_insert before insert on public.orders for each row execute function public.orders_pay_insert();

-- recepția nu vede comenzile neplătite (nici prin citire directă)
drop policy if exists "orders own read" on public.orders;
create policy "orders own read" on public.orders for select
  using (customer_id = auth.uid() or (public.is_staff() and pay_status not in ('pending', 'failed')));

-- apelate doar de funcțiile Edge (cheia service_role)
create or replace function public.pay_order_info(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', o.id, 'number', o.number, 'total', o.total, 'email', o.email, 'pay_status', o.pay_status,
    'payment', o.payment, 'status', o.status, 'created_at', o.created_at, 'site_url', s.site_url, 'stripe_session', o.stripe_session)
  from public.orders o, public.settings s where s.id = 1 and o.token = p_token;
$$;
create or replace function public.pay_set_session(p_order uuid, p_session text) returns void
language sql security definer set search_path = public as $$
  update public.orders set stripe_session = p_session where id = p_order and pay_status = 'pending';
$$;
create or replace function public.pay_mark_paid(p_order uuid, p_session text, p_payment text) returns boolean
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  update public.orders set pay_status = 'paid', paid_at = now(), stripe_session = coalesce(p_session, stripe_session), stripe_payment = p_payment
   where id = p_order and pay_status in ('pending', 'failed') returning * into o;
  if not found then return false; end if;
  -- plata a venit după ce comanda expirase: o rambursăm imediat
  if o.status = 'rejected' then
    update public.orders set pay_status = 'refunding' where id = o.id;
    perform public.pay_request_refund(o.id);
  else
    insert into public.order_messages(order_id, body) values (o.id, 'Plata cu cardul a fost primită. Mulțumim!');
  end if;
  return true;
end $$;
create or replace function public.pay_mark_failed(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set pay_status = 'failed', status = 'rejected', cancelled_by = 'sistem', rejected_by_name = 'sistem',
         reject_reason = 'Plata online nu a fost finalizată'
   where id = p_order and pay_status = 'pending' and status = 'new';
end $$;
create or replace function public.pay_mark_refunded(p_order uuid, p_refund text) returns void
language sql security definer set search_path = public as $$
  update public.orders set pay_status = 'refunded', stripe_refund = p_refund where id = p_order and pay_status in ('paid', 'refunding');
$$;
revoke execute on function public.pay_order_info(uuid), public.pay_set_session(uuid, text), public.pay_mark_paid(uuid, text, text),
  public.pay_mark_failed(uuid), public.pay_mark_refunded(uuid, text) from public, anon, authenticated;
grant execute on function public.pay_order_info(uuid), public.pay_set_session(uuid, text), public.pay_mark_paid(uuid, text, text),
  public.pay_mark_failed(uuid), public.pay_mark_refunded(uuid, text) to service_role;

-- cere funcției `pay` rambursarea (pg_net); secretele: vault 'pay_url', 'push_secret' (același secret ca la notificări)
create or replace function public.pay_request_refund(p_order uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare url text; secret text;
begin
  begin
    select decrypted_secret into url from vault.decrypted_secrets where name = 'pay_url' limit 1;
    select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_secret' limit 1;
  exception when others then url := null; end;
  if url is null or secret is null then
    raise warning 'Rambursarea comenzii % trebuie făcută manual din Stripe (lipsește pay_url / push_secret).', p_order;
    return false;
  end if;
  perform net.http_post(url := url, body := jsonb_build_object('action', 'refund', 'order_id', p_order),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-pay-secret', secret));
  return true;
end $$;
revoke execute on function public.pay_request_refund(uuid) from public, anon, authenticated;

-- comanda plătită devine refuzată / anulată / rambursată din admin: banii se întorc pe card
create or replace function public.orders_pay_refund() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pay_status = 'paid' and new.status in ('rejected', 'refunded') and old.status is distinct from new.status then
    update public.orders set pay_status = 'refunding' where id = new.id;
    perform public.pay_request_refund(new.id);
    insert into public.order_messages(order_id, body) values (new.id, 'Plata cu cardul îți va fi returnată automat (de obicei în 3–5 zile lucrătoare).');
  end if;
  return new;
end $$;
drop trigger if exists orders_pay_refund on public.orders;
create trigger orders_pay_refund after update of status on public.orders for each row execute function public.orders_pay_refund();

-- plățile neterminate în 30 de minute anulează comanda (punctele și bonusul revin clientului)
create or replace function public.expire_unpaid() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from public.orders where pay_status = 'pending' and status = 'new' and created_at < now() - interval '30 minutes' loop
    perform public.pay_mark_failed(r.id); n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.expire_unpaid() to authenticated;
do $$ begin
  begin perform cron.unschedule('lyra-unpaid'); exception when others then null; end;
  begin perform cron.schedule('lyra-unpaid', '*/5 * * * *', 'select public.expire_unpaid()');
  exception when others then null; end;
end $$;
