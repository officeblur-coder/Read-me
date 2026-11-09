-- =====================================================================
-- Notificări pe telefon (Web Push)
-- Clientul: „Restaurantul propune 40 min”, „Curierul e pe drum”, „Comanda e gata”…, chiar cu browserul închis.
-- Recepția: comandă nouă, client care a anulat.
-- Trimiterea o face funcția Edge `push` (supabase/functions/push), apelată prin pg_net.
-- Configurare (o singură dată): vezi supabase/functions/push/README.md
--   select vault.create_secret('https://<proiect>.supabase.co/functions/v1/push', 'push_url');
--   select vault.create_secret('<un șir lung, aleator>', 'push_secret');
--   update public.settings set push_public_key = '<cheia VAPID publică>';
-- Fără configurare, site-ul arată notificări doar cât pagina e deschisă (fără server).
-- =====================================================================

alter table public.settings add column if not exists push_public_key text;   -- cheia VAPID publică (nu e secretă)

create table if not exists public.push_subs (
  id          bigint generated always as identity primary key,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  order_id    uuid references public.orders(id) on delete cascade,   -- abonamentul unui client pentru o comandă
  staff_user  uuid,                                                   -- sau al unui membru al recepției
  created_at  timestamptz not null default now(),
  check ((order_id is null) <> (staff_user is null))
);
create index if not exists push_subs_order_idx on public.push_subs(order_id);
alter table public.push_subs enable row level security;   -- fără politici: doar funcțiile de mai jos ating tabela

-- abonare client, pe baza linkului secret al comenzii
create or replace function public.push_subscribe(p_token uuid, p_sub jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare oid uuid;
begin
  select id into oid from public.orders where token = p_token;
  if oid is null then raise exception 'Comanda nu a fost găsită.' using errcode = 'P0001'; end if;
  if coalesce(p_sub->>'endpoint', '') !~ '^https://' or p_sub#>>'{keys,p256dh}' is null or p_sub#>>'{keys,auth}' is null then
    raise exception 'Abonament invalid.' using errcode = 'P0001';
  end if;
  insert into public.push_subs(endpoint, p256dh, auth, order_id)
  values (p_sub->>'endpoint', p_sub#>>'{keys,p256dh}', p_sub#>>'{keys,auth}', oid)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, order_id = excluded.order_id, staff_user = null, created_at = now();
end $$;

-- abonare recepție (toate comenzile noi)
create or replace function public.push_subscribe_staff(p_sub jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Doar echipa.' using errcode = 'P0001'; end if;
  if coalesce(p_sub->>'endpoint', '') !~ '^https://' then raise exception 'Abonament invalid.' using errcode = 'P0001'; end if;
  insert into public.push_subs(endpoint, p256dh, auth, staff_user)
  values (p_sub->>'endpoint', p_sub#>>'{keys,p256dh}', p_sub#>>'{keys,auth}', auth.uid())
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, staff_user = excluded.staff_user, order_id = null, created_at = now();
end $$;

create or replace function public.push_unsubscribe(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint;
$$;
grant execute on function public.push_subscribe(uuid, jsonb), public.push_unsubscribe(text) to anon, authenticated;
grant execute on function public.push_subscribe_staff(jsonb) to authenticated;

-- trimite o notificare către abonații unei comenzi (p_order) sau ai recepției (p_order null)
create or replace function public.push_send(p_order uuid, p_title text, p_body text, p_url text, p_tag text default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare url text; secret text; subs jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]') into subs
    from public.push_subs where (p_order is not null and order_id = p_order) or (p_order is null and staff_user is not null);
  if jsonb_array_length(subs) = 0 then return false; end if;
  begin
    select decrypted_secret into url from vault.decrypted_secrets where name = 'push_url' limit 1;
    select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_secret' limit 1;
  exception when others then url := null; end;
  if url is null or secret is null then return false; end if;
  perform net.http_post(url := url,
    body := jsonb_build_object('subs', subs, 'title', p_title, 'body', p_body, 'url', p_url, 'tag', coalesce(p_tag, p_url)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret));
  return true;
exception when others then
  raise warning 'Notificarea nu a putut fi trimisă: %', sqlerrm;
  return false;
end $$;
revoke execute on function public.push_send(uuid, text, text, text, text) from public, anon, authenticated;

-- ce se trimite la fiecare schimbare a comenzii
create or replace function public.orders_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.settings; link text; pick boolean; at text;
begin
  select * into s from public.settings where id = 1;
  link := '/comanda/' || new.token;
  pick := new.mode = 'ridicare';
  if tg_op = 'INSERT' then
    perform public.push_send(null, format('Comandă nouă #%s', new.number),
      format('%s · %s · %s lei%s', new.name, new.mode, to_char(new.total, 'FM999990.00'),
             case when new.scheduled_for is not null then ' · precomandă ' || to_char(new.scheduled_for at time zone s.tz, 'DD.MM HH24:MI') else '' end),
      '/receptie', 'new-' || new.id);
    return new;
  end if;
  -- recepția a propus timpul
  if new.status = 'new' and new.offered_at is distinct from old.offered_at and new.offered_at is not null then
    at := to_char((new.offered_at + make_interval(mins => new.offer_eta)) at time zone s.tz, 'HH24:MI');
    perform public.push_send(new.id, format('Restaurantul propune %s minute', new.offer_eta),
      format('Comanda #%s %s la ~%s. Apasă ca să confirmi sau să anulezi.', new.number, case when pick then 'e gata' else 'ajunge' end, at), link, 'order-' || new.id);
  end if;
  if new.status is distinct from old.status then
    at := to_char((coalesce(new.accepted_at, now()) + make_interval(mins => coalesce(new.eta_min, 0))) at time zone s.tz, 'HH24:MI');
    if new.status = 'prep' and coalesce(new.offer_answer, '') <> 'accepted' then
      perform public.push_send(new.id, format('Comanda #%s a fost acceptată', new.number),
        case when new.scheduled_for is not null then format('Programată %s.', to_char(new.scheduled_for at time zone s.tz, 'DD.MM la HH24:MI'))
             else format('Se gătește acum. %s la ~%s.', case when pick then 'Gata de ridicare' else 'Sosește' end, at) end, link, 'order-' || new.id);
    elsif new.status = 'road' then
      perform public.push_send(new.id, case when pick then 'Comanda ta e gata!' else 'Curierul e pe drum' end,
        case when pick then format('Comanda #%s te așteaptă la restaurant.', new.number)
             else format('Comanda #%s pleacă spre tine%s.', new.number, coalesce(' cu ' || nullif(new.courier_name, ''), '')) end, link, 'order-' || new.id);
    elsif new.status = 'done' then
      perform public.push_send(new.id, 'Poftă bună!', format('Cum a fost comanda #%s? Apasă și dă o notă.', new.number), link, 'order-' || new.id);
    elsif new.status = 'rejected' and new.cancelled_by is null then
      perform public.push_send(new.id, format('Comanda #%s nu a putut fi preluată', new.number),
        coalesce(new.reject_reason || '. ', '') || 'Nu ți-a fost reținută nicio sumă.', link, 'order-' || new.id);
    elsif new.status = 'rejected' and new.cancelled_by = 'client' and old.offered_at is not null then
      perform public.push_send(null, format('#%s anulată de client', new.number), format('%s · timpul propus nu i-a convenit.', new.name), '/receptie', 'cancel-' || new.id);
    end if;
  elsif new.status in ('prep', 'road') and new.eta_min is distinct from old.eta_min and old.eta_min is not null then
    at := to_char((new.accepted_at + make_interval(mins => new.eta_min)) at time zone s.tz, 'HH24:MI');
    perform public.push_send(new.id, format('Ora nouă pentru comanda #%s', new.number), format('%s la ~%s.', case when pick then 'Gata de ridicare' else 'Sosește' end, at), link, 'order-' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists orders_push on public.orders;
create trigger orders_push after insert or update on public.orders for each row execute function public.orders_push();

-- abonamentele clienților se șterg după 2 zile (comanda s-a încheiat de mult)
create or replace function public.push_cleanup() returns void
language sql security definer set search_path = public as $$
  delete from public.push_subs where order_id is not null and created_at < now() - interval '2 days';
$$;
do $$ begin
  begin perform cron.unschedule('lyra-push-cleanup'); exception when others then null; end;
  begin perform cron.schedule('lyra-push-cleanup', '17 4 * * *', 'select public.push_cleanup()');
  exception when others then null; end;
end $$;
