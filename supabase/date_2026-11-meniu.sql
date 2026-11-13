-- =====================================================================
-- Schimbări de date în meniu (noiembrie 2026), rulate o dată pe baza care merge deja.
-- Se pot rula de mai multe ori fără efecte în plus.
-- =====================================================================

-- 1) Reduceri: se oprește -25% la burgerii clasici; -10% la tot meniul doar la livrare; -15% la tot meniul la ridicare
update public.item_discounts set active = false, updated_at = now()
 where active and percent = 25 and name ilike '%burger%';
update public.item_discounts set mode = 'livrare', all_items = true, name = '10% la tot meniul · livrare', updated_at = now()
 where percent = 10 and name ilike '%10%%' and mode = 'all';
insert into public.item_discounts(name, percent, item_ids, active, mode, all_items)
select '15% la tot meniul · ridicare', 15, '{}', true, 'ridicare', true
 where not exists (select 1 from public.item_discounts where mode = 'ridicare' and all_items);

-- bannerul „25% reducere la burgerii clasici” nu mai apare pe site
update public.banners set active = false where image like '%banner-1793693620247%';

-- 2) Ambalaj și SGR
-- sosuri: fără ambalaj
update public.items set packaging = 0 where category_id = 'sosuri';
-- răcoritoare, bere și vin: fără ambalaj, garanție SGR 0,50 lei
update public.items set packaging = 0, sgr = 0.50 where category_id in ('racoritoare', 'bere', 'vin');
-- cocktailuri, limonade și fresh: ambalaj băuturi 2 lei, fără SGR
update public.items set packaging = 2, sgr = 0 where category_id in ('cocktail', 'limonade');

-- 3) Precomenzi: 12:00–21:00, pe intervale de o oră
update public.settings set preorder_from = '12:00', preorder_until = '21:00' where id = 1;   -- precomenzi 12–21, intervale de o oră
