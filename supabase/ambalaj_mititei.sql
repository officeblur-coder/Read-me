-- Ambalaj și mititei (noiembrie 2026). Rulează în Supabase → SQL Editor. Nu atinge restul meniului.
begin;
update public.items set packaging = 2;
update public.items set packaging = 7 where id in ('borzas', 'ciorba-pita-ciolan', 'ciorba-pita', 'pastrav');
update public.items set packaging = 10 where id in ('platou-lyra', 'platou-pui');
update public.items set name_ro = 'Mititei cu muștar · 4 bucăți', name_hu = 'Miccs mustárral · 4 darab',
  desc_ro = '4 mititei, cu muștar', desc_hu = '4 miccs, mustárral', price = 34, grams = '4 bucăți/280/80 gr',
  variants = null, updated_at = now()
where id = 'mititei';
commit;
select id, name_ro, price, packaging from public.items
where id in ('mititei', 'borzas', 'ciorba-pita-ciolan', 'ciorba-pita', 'pastrav', 'platou-lyra', 'platou-pui') order by packaging, id;
