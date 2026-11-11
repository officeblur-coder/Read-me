-- =====================================================================
-- Card cadou Lyra (card fizic): 100 / 150 / 200 / 250 / 500 lei
-- Se livrează odată cu comanda sau se ridică din restaurant, ca orice produs.
-- Produsul are kind = 'gift': fără reduceri de livrare / ridicare, coduri promo, ambalaj, SGR sau puncte,
-- și nu contează la comanda minimă sau la livrarea gratuită (place_order în 01_schema.sql).
-- =====================================================================

alter table public.settings drop column if exists gift_months;

-- curățare: varianta cu cod unic pe email nu mai e folosită
drop trigger if exists orders_gift_cards on public.orders;
drop function if exists public.orders_gift_cards();
drop function if exists public.send_gift_email(uuid);
drop function if exists public.order_gift_cards(uuid);
drop function if exists public.admin_gift_cards(text);
drop function if exists public.admin_gift_use(text, text);
drop function if exists public.admin_gift_resend(uuid, text);
drop function if exists public.gift_code();
drop table if exists public.gift_cards;

-- categoria și produsul (se pot edita din admin ca orice produs; prețul vine din variante)
insert into public.categories(id, name_ro, name_hu, sort, active) values ('voucher', 'Card cadou', 'Ajándékkártya', -10, true)
  on conflict (id) do nothing;
insert into public.items(id, category_id, name_ro, name_hu, desc_ro, price, image, variants, packaging, sgr, kind, active, available, sort, tags, allergens)
values ('card-cadou', 'voucher', 'Card cadou Lyra', 'Lyra ajándékkártya',
  'Cel mai gustos cadou: o masă la Restaurant Lyra. Alegi valoarea, iar cardul cadou ți-l aducem odată cu comanda sau îl ridici din restaurant.',
  100, 'card-cadou.jpg',
  '[{"l":"100 lei","p":100,"g":""},{"l":"150 lei","p":150,"g":""},{"l":"200 lei","p":200,"g":""},{"l":"250 lei","p":250,"g":""},{"l":"500 lei","p":500,"g":""}]'::jsonb,
  0, 0, 'gift', true, true, -10, '{}', '{}')
on conflict (id) do update set kind = 'gift', packaging = 0, sgr = 0;
-- textul vechi (cu emailul) se schimbă doar dacă n-a fost editat din admin
update public.items set desc_ro = 'Cel mai gustos cadou: o masă la Restaurant Lyra. Alegi valoarea, iar cardul cadou ți-l aducem odată cu comanda sau îl ridici din restaurant.'
 where id = 'card-cadou' and desc_ro like '%ajunge pe email%';
