# Baza de date Lyra (Supabase)

- `setup.sql` — fișierul unic de instalare: schema + meniul complet. Se lipește în Supabase → SQL Editor → Run.
  Se poate rula din nou fără să șteargă comenzi, clienți sau modificări de meniu.
- `01_schema.sql` — tabele, funcții (`place_order`, `get_order`, `rate_order`), puncte Lyra Club, securitate (RLS).
- `02_seed_menu.sql` — meniul (115 preparate, 21 categorii), generat din `lyra/data/menu.js`
  cu `node scripts/build-seed.mjs`.

Reguli de bază:
- Prețurile se calculează în baza de date la plasarea comenzii, nu în browser.
- Clienții anonimi pot doar citi meniul, plasa comenzi și urmări comanda lor prin linkul secret.
- Clientul logat nu își poate modifica punctele, stelele sau cadoul.
- Doar membrii din tabela `staff` văd și actualizează comenzile.
