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

Fișiere adăugate (intră automat în `setup.sql` / `actualizare_schema.sql` prin `node scripts/build-seed.mjs`):
- `10_eta_confirm.sql` — recepția propune timpul, clientul îl acceptă sau anulează comanda (fără răspuns: confirmare/anulare automată).
- `11_push.sql` — notificări pe telefon (Web Push) prin funcția Edge `functions/push`. Configurare: `functions/push/README.md`.
- `12_referral.sql` — „Invită un prieten”: link personal, câte 20 lei în puncte pentru amândoi după prima comandă livrată.
- `actualizare_2026-11.sql` — doar schimbările de mai sus (plus rapoartele), pentru baza care rulează deja.

Teste: fiecare fișier din `tests/` rulează pe o copie a bazei și se anulează la final (`psql -v ON_ERROR_STOP=1 -f supabase/tests/<fișier>.sql`).
