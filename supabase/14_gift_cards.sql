-- =====================================================================
-- Voucher cadou (card cadou Lyra): 100 / 150 / 200 / 250 / 500 lei
-- Produsul are kind = 'gift' (fără reduceri, ambalaj, SGR, puncte). Emailul e obligatoriu la comandă.
-- Când comanda devine „finalizată” (plătită), se emite câte un cod pentru fiecare voucher și se trimite pe email.
-- Dacă o comandă finalizată e rambursată, voucherele nefolosite se anulează.
-- Se folosește la Restaurant Lyra: recepția / adminul caută codul și îl marchează folosit (admin → Vouchere).
-- =====================================================================

create table if not exists public.gift_cards (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  value       numeric(10,2) not null check (value > 0),
  order_id    uuid references public.orders(id) on delete set null,
  order_no    bigint,
  email       text not null,
  buyer_name  text,
  status      text not null default 'issued' check (status in ('issued', 'used', 'cancelled')),
  issued_at   timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '12 months',
  used_at     timestamptz,
  used_by     text,
  emailed_at  timestamptz,
  note        text
);
create index if not exists gift_cards_order_idx on public.gift_cards(order_id);
alter table public.gift_cards enable row level security;   -- fără politici: doar funcțiile de mai jos
alter table public.settings add column if not exists gift_months int not null default 12 check (gift_months between 1 and 60);

-- categoria și produsul (se pot edita din admin ca orice produs; prețul vine din variante)
insert into public.categories(id, name_ro, name_hu, sort, active) values ('voucher', 'Card cadou', 'Ajándékkártya', -10, true)
  on conflict (id) do nothing;
insert into public.items(id, category_id, name_ro, name_hu, desc_ro, price, image, variants, packaging, sgr, kind, active, available, sort, tags, allergens)
values ('card-cadou', 'voucher', 'Card cadou Lyra', 'Lyra ajándékkártya',
  'Cel mai gustos cadou: o masă la Restaurant Lyra. Alegi valoarea, iar voucherul cu codul unic ajunge pe email, gata de dăruit.',
  100, 'card-cadou.jpg',
  '[{"l":"100 lei","p":100,"g":""},{"l":"150 lei","p":150,"g":""},{"l":"200 lei","p":200,"g":""},{"l":"250 lei","p":250,"g":""},{"l":"500 lei","p":500,"g":""}]'::jsonb,
  0, 0, 'gift', true, true, -10, '{}', '{}')
on conflict (id) do update set kind = 'gift', packaging = 0, sgr = 0;

-- cod ușor de citit la telefon: LYRA-XXXX-XXXX (fără 0/O, 1/I)
create or replace function public.gift_code() returns text
language plpgsql set search_path = public as $$
declare a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text;
begin
  loop
    c := 'LYRA-';
    for i in 1..8 loop
      c := c || substr(a, 1 + floor(random() * length(a))::int, 1);
      if i = 4 then c := c || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.gift_cards where code = c);
  end loop;
  return c;
end $$;

-- emailul cu voucherul (Resend; fără cheie în Vault nu trimite, codul rămâne în admin și pe pagina comenzii)
create or replace function public.send_gift_email(p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare g public.gift_cards; s public.settings; key text; html text; first text;
begin
  select * into g from public.gift_cards where id = p_id;
  if not found or g.status <> 'issued' then return false; end if;
  select * into s from public.settings where id = 1;
  begin select decrypted_secret into key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  exception when others then key := null; end;
  if key is null then return false; end if;
  first := split_part(trim(coalesce(g.buyer_name, '')), ' ', 1);
  html := format($h$<!doctype html><html><body style="margin:0;background:#0f1a12;font-family:Georgia,'Times New Roman',serif">
<table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f1a12;padding:28px 12px"><tr><td align="center">
<table width="100%%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#163020;border-radius:24px;overflow:hidden;color:#f6ecd4">
<tr><td><img src="%1$s/img/card-cadou.jpg" width="560" alt="Card cadou Restaurant Lyra" style="display:block;width:100%%;height:auto;border:0"></td></tr>
<tr><td align="center" style="padding:26px 28px 6px">
  <div style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:#d9b45a">Special pentru tine</div>
  <h1 style="margin:10px 0 0;font-size:30px;font-weight:normal">%2$s</h1>
</td></tr>
<tr><td align="center" style="padding:18px 28px">
  <table cellpadding="0" cellspacing="0" style="background:#f6ecd4;border-radius:18px;border:2px dashed #d9b45a"><tr><td align="center" style="padding:20px 30px;color:#163020">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase">Card cadou</div>
    <div style="font-size:46px;line-height:1.1;margin-top:4px">%3$s lei</div>
    <div style="font-family:'Courier New',monospace;font-size:26px;font-weight:bold;letter-spacing:3px;margin-top:10px">%4$s</div>
  </td></tr></table>
</td></tr>
<tr><td align="center" style="padding:0 34px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#e9dcbc">
  Prezintă acest cod la Restaurant Lyra (Acățari, DN 13) sau spune-l când comanzi telefonic.<br>
  Valabil până la <b>%5$s</b>. Se folosește o singură dată.
</td></tr>
<tr><td align="center" style="padding:16px 28px 30px">
  <a href="%1$s" style="display:inline-block;background:#d9b45a;color:#163020;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:bold;padding:13px 26px;border-radius:999px">lyrasdelivery.ro</a>
</td></tr>
</table>
<p style="color:#8aa08f;font-family:Arial,Helvetica,sans-serif;font-size:12px;margin:16px 0 0">Comanda #%6$s · Lyra's Delivery · Restaurant Lyra, tradiții din 1999</p>
</td></tr></table></body></html>$h$,
    rtrim(s.site_url, '/'), case when first <> '' then 'Mulțumim, ' || first || '!' else 'Cardul tău cadou' end,
    to_char(g.value, 'FM99990'), g.code, to_char(g.expires_at at time zone s.tz, 'DD.MM.YYYY'), coalesce(g.order_no::text, '-'));
  perform net.http_post(url := 'https://api.resend.com/emails',
    body := jsonb_build_object('from', s.email_from, 'to', jsonb_build_array(g.email), 'reply_to', coalesce(s.email_reply_to, 'comenzi@lyrasdelivery.ro'),
      'subject', format('Cardul tău cadou Lyra de %s lei: %s', to_char(g.value, 'FM99990'), g.code), 'html', html),
    headers := jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'));
  update public.gift_cards set emailed_at = now() where id = g.id;
  return true;
exception when others then
  raise warning 'Emailul cu voucherul nu a putut fi trimis: %', sqlerrm;
  return false;
end $$;
revoke execute on function public.send_gift_email(uuid) from public, anon, authenticated;

-- comanda finalizată: se emit voucherele; comanda rambursată: se anulează cele nefolosite
create or replace function public.orders_gift_cards() returns trigger
language plpgsql security definer set search_path = public as $$
declare l jsonb; i int; gid uuid; s public.settings;
begin
  if new.status = 'done' and old.status <> 'done' and not exists (select 1 from public.gift_cards where order_id = new.id) then
    select * into s from public.settings where id = 1;
    for l in select * from jsonb_array_elements(new.items) where value->>'giftcard' = 'true' loop
      for i in 1..greatest(coalesce((l->>'qty')::int, 1), 1) loop
        insert into public.gift_cards(code, value, order_id, order_no, email, buyer_name, expires_at)
        values (public.gift_code(), (l->>'unit')::numeric, new.id, new.number, coalesce(new.email, ''), new.name, now() + make_interval(months => s.gift_months))
        returning id into gid;
        if coalesce(new.email, '') <> '' then perform public.send_gift_email(gid); end if;
      end loop;
    end loop;
  elsif new.status = 'refunded' and old.status = 'done' then
    update public.gift_cards set status = 'cancelled', note = 'Comanda a fost rambursată' where order_id = new.id and status = 'issued';
  end if;
  return new;
end $$;
drop trigger if exists orders_gift_cards on public.orders;
create trigger orders_gift_cards after update of status on public.orders for each row execute function public.orders_gift_cards();

-- pagina comenzii: codurile apar după finalizare (linkul comenzii e secret)
create or replace function public.order_gift_cards(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', g.code, 'value', g.value, 'expires_at', g.expires_at, 'status', g.status, 'emailed', g.emailed_at is not null) order by g.issued_at), '[]')
  from public.gift_cards g join public.orders o on o.id = g.order_id where o.token = p_token;
$$;
grant execute on function public.order_gift_cards(uuid) to anon, authenticated;

-- admin / recepție: listă, căutare, folosire, retrimitere
create or replace function public.admin_gift_cards(p_q text default '') returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_staff() then coalesce(jsonb_agg(to_jsonb(g) order by g.issued_at desc), '[]') end
  from (select * from public.gift_cards
        where coalesce(p_q, '') = '' or code ilike '%' || trim(p_q) || '%' or email ilike '%' || trim(p_q) || '%' or order_no::text = trim(p_q)
        order by issued_at desc limit 200) g;
$$;
create or replace function public.admin_gift_use(p_code text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.gift_cards;
begin
  if not public.is_staff() then raise exception 'Doar echipa.' using errcode = 'P0001'; end if;
  select * into g from public.gift_cards where code = upper(trim(p_code)) for update;
  if not found then raise exception 'Codul % nu există.', upper(trim(p_code)) using errcode = 'P0001'; end if;
  if g.status = 'used' then raise exception 'Voucherul a fost deja folosit pe %.', to_char(g.used_at at time zone 'Europe/Bucharest', 'DD.MM.YYYY HH24:MI') using errcode = 'P0001'; end if;
  if g.status = 'cancelled' then raise exception 'Voucherul este anulat.' using errcode = 'P0001'; end if;
  if g.expires_at < now() then raise exception 'Voucherul a expirat pe %.', to_char(g.expires_at at time zone 'Europe/Bucharest', 'DD.MM.YYYY') using errcode = 'P0001'; end if;
  update public.gift_cards set status = 'used', used_at = now(), used_by = public.staff_name(), note = nullif(trim(coalesce(p_note, '')), '')
   where id = g.id returning * into g;
  return to_jsonb(g);
end $$;
create or replace function public.admin_gift_resend(p_id uuid, p_email text default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Doar echipa.' using errcode = 'P0001'; end if;
  if coalesce(trim(p_email), '') <> '' then update public.gift_cards set email = trim(p_email) where id = p_id; end if;
  if not public.send_gift_email(p_id) then raise exception 'Emailul nu a putut fi trimis (verifică cheia Resend și starea voucherului).' using errcode = 'P0001'; end if;
  return true;
end $$;
grant execute on function public.admin_gift_cards(text), public.admin_gift_use(text, text), public.admin_gift_resend(uuid, text) to authenticated;
