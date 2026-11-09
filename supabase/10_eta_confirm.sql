-- =====================================================================
-- Clientul confirmă timpul de livrare
-- Recepția propune timpul („Propune · 45 min”). Comanda rămâne „new” până când clientul apasă
-- „Accept timpul” (devine „prep”, bucătăria începe) sau „Anulez comanda” (devine „rejected”, anulată de client).
-- Dacă clientul nu răspunde în offer_window_min minute, comanda se confirmă singură (sau se anulează, după setare).
-- Precomenzile (ora aleasă de client) nu trec prin acest pas.
-- =====================================================================

alter table public.settings add column if not exists confirm_eta boolean not null default true;
alter table public.settings add column if not exists offer_window_min int not null default 5 check (offer_window_min between 1 and 30);
alter table public.settings add column if not exists offer_timeout text not null default 'accept' check (offer_timeout in ('accept', 'cancel'));

alter table public.orders add column if not exists offered_at timestamptz;          -- când a propus recepția timpul
alter table public.orders add column if not exists offer_eta int;                   -- minutele propuse
alter table public.orders add column if not exists offer_answer text check (offer_answer in ('accepted', 'cancelled', 'auto_accepted', 'auto_cancelled', 'phone'));
alter table public.orders add column if not exists offer_answered_at timestamptz;
alter table public.orders add column if not exists cancelled_by text;               -- 'client' când clientul a anulat

-- recepția propune timpul (sau îl schimbă cât timp clientul n-a răspuns)
create or replace function public.offer_eta(p_id uuid, p_eta int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.orders; s public.settings;
begin
  if not public.is_staff() then raise exception 'Doar recepția propune timpul.' using errcode = 'P0001'; end if;
  if p_eta is null or p_eta < 5 or p_eta > 240 then raise exception 'Timpul trebuie să fie între 5 și 240 de minute.' using errcode = 'P0001'; end if;
  select * into s from public.settings where id = 1;
  select * into o from public.orders where id = p_id for update;
  if not found then raise exception 'Comanda nu există.' using errcode = 'P0001'; end if;
  if o.status <> 'new' then raise exception 'Comanda #% a primit deja răspuns.', o.number using errcode = 'P0001'; end if;
  update public.orders set offered_at = now(), offer_eta = p_eta, eta_min = p_eta, offer_answer = null, offer_answered_at = null,
         accepted_by = auth.uid(), accepted_by_name = public.staff_name()
   where id = p_id returning * into o;
  insert into public.order_messages(order_id, body) values (o.id, format(
    'Putem %s comanda în %s minute, la %s. Confirmă timpul sau anulează comanda în %s minute.',
    case when o.mode = 'livrare' then 'livra' else 'pregăti' end, p_eta,
    to_char((now() + make_interval(mins => p_eta)) at time zone s.tz, 'HH24:MI'), s.offer_window_min));
  return jsonb_build_object('offered_at', o.offered_at, 'offer_eta', o.offer_eta);
end $$;

-- intern: închide oferta unei comenzi (răspunsul clientului, telefon sau expirare)
create or replace function public.close_offer(p_id uuid, p_answer text) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders; s public.settings; msg text;
begin
  select * into s from public.settings where id = 1;
  select * into o from public.orders where id = p_id for update;
  if o.status <> 'new' or o.offered_at is null then return o; end if;
  if p_answer in ('accepted', 'auto_accepted', 'phone') then
    update public.orders set status = 'prep', accepted_at = now(), eta_min = o.offer_eta,
           offer_answer = p_answer, offer_answered_at = now()
     where id = p_id returning * into o;
    msg := format('%s Comanda e în bucătărie, %s la %s.',
      case p_answer when 'accepted' then 'Mulțumim, ai confirmat timpul.' when 'phone' then 'Timpul a fost confirmat telefonic.'
                    else 'Timpul a fost confirmat automat.' end,
      case when o.mode = 'livrare' then 'sosește' else 'e gata de ridicare' end,
      to_char((now() + make_interval(mins => o.offer_eta)) at time zone s.tz, 'HH24:MI'));
  else
    update public.orders set status = 'rejected', offer_answer = p_answer, offer_answered_at = now(),
           cancelled_by = case when p_answer = 'cancelled' then 'client' else 'sistem' end,
           rejected_by_name = case when p_answer = 'cancelled' then 'client' else 'sistem' end,
           reject_reason = case when p_answer = 'cancelled' then 'Anulată de client: timpul de livrare nu convine'
                                else 'Anulată: clientul nu a confirmat timpul' end
     where id = p_id returning * into o;
    msg := case when p_answer = 'cancelled' then 'Ai anulat comanda. Nu ți-a fost reținută nicio sumă.'
                else 'Comanda a fost anulată pentru că timpul nu a fost confirmat.' end;
  end if;
  insert into public.order_messages(order_id, body) values (o.id, msg);
  return o;
end $$;
revoke execute on function public.close_offer(uuid, text) from public, anon, authenticated;

-- ofertele fără răspuns în timpul stabilit se închid după setarea offer_timeout
create or replace function public.settle_offers() returns int
language plpgsql security definer set search_path = public as $$
declare s public.settings; r record; n int := 0;
begin
  select * into s from public.settings where id = 1;
  for r in select id from public.orders
            where status = 'new' and offered_at is not null and offered_at < now() - make_interval(mins => s.offer_window_min)
  loop
    perform public.close_offer(r.id, case when s.offer_timeout = 'cancel' then 'auto_cancelled' else 'auto_accepted' end);
    n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.settle_offers() to authenticated;

-- răspunsul clientului, din pagina comenzii (linkul secret)
create or replace function public.answer_offer(p_token uuid, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  perform public.settle_offers();
  select * into o from public.orders where token = p_token;
  if not found then raise exception 'Comanda nu a fost găsită.' using errcode = 'P0001'; end if;
  if o.status <> 'new' or o.offered_at is null then
    raise exception '%', case
      when o.offer_answer in ('auto_accepted', 'phone') then 'Timpul a fost deja confirmat. Pentru anulare, sună-ne.'
      when o.offer_answer = 'auto_cancelled' then 'Comanda a fost deja anulată.'
      when o.offered_at is null then 'Restaurantul nu a propus încă un timp.'
      else 'Ai răspuns deja.' end using errcode = 'P0001';
  end if;
  o := public.close_offer(o.id, case when p_accept then 'accepted' else 'cancelled' end);
  return jsonb_build_object('status', o.status);
end $$;
grant execute on function public.offer_eta(uuid, int) to authenticated;
grant execute on function public.answer_offer(uuid, boolean) to anon, authenticated;

-- recepția: clientul a confirmat la telefon
create or replace function public.confirm_offer_phone(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Doar recepția.' using errcode = 'P0001'; end if;
  perform public.close_offer(p_id, 'phone');
end $$;
grant execute on function public.confirm_offer_phone(uuid) to authenticated;

-- urmărirea comenzii: include oferta de timp și închide oferta expirată înainte de afișare
drop function if exists public.get_order(uuid);
create function public.get_order(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare oid uuid; s public.settings;
begin
  select o.id into oid from public.orders o where o.token = p_token;
  if oid is null then return null; end if;
  select * into s from public.settings where id = 1;
  if exists (select 1 from public.orders where id = oid and status = 'new' and offered_at < now() - make_interval(mins => s.offer_window_min)) then
    perform public.close_offer(oid, case when s.offer_timeout = 'cancel' then 'auto_cancelled' else 'auto_accepted' end);
  end if;
  return (select to_jsonb(x) from (
    select o.number, o.status, o.mode, o.address, o.items, o.subtotal, o.discount, o.discount_label,
           o.points_value, o.delivery_fee, o.packaging, o.total, o.points_earned, o.eta_min, o.created_at,
           o.accepted_at, o.road_at, o.done_at, o.reject_reason, o.rating, o.scheduled_for, o.welcome_value,
           o.offered_at, o.offer_eta, o.offer_answer, o.cancelled_by, s.offer_window_min as offer_window, s.offer_timeout, now() as server_now,
           coalesce((select jsonb_agg(jsonb_build_object('body', m.body, 'at', m.created_at) order by m.created_at)
                     from public.order_messages m where m.order_id = o.id), '[]') as messages
    from public.orders o where o.id = oid
  ) x);
end $$;
grant execute on function public.get_order(uuid) to anon, authenticated;

-- rulează la fiecare minut (pg_cron), ca ofertele să se închidă și când nimeni nu are pagina deschisă
do $$ begin
  begin create extension if not exists pg_cron; exception when others then null; end;
  begin perform cron.unschedule('lyra-offers'); exception when others then null; end;
  begin perform cron.schedule('lyra-offers', '* * * * *', 'select public.settle_offers()');
  exception when others then raise notice 'pg_cron indisponibil: ofertele se închid când recepția sau clientul au pagina deschisă.'; end;
end $$;
