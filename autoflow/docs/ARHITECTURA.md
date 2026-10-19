# AUTOFLOW — Analiză de arhitectură și produs

Document de lucru, BLUR Advertising. Versiunea 0.1 (Etapa 1 — MVP în construcție).

Legendă stare: **[REAL]** implementat și testat în acest repository · **[PLANIFICAT]** proiectat, neimplementat · **[DEPENDENT]** necesită autorizare/contract extern.

---

## 1. Arhitectura recomandată

### 1.1 Stack

| Strat | Alegere | De ce |
|---|---|---|
| Frontend + BFF | **Next.js 15 (App Router) + TypeScript** | Server Components pentru citiri rapide, Server Actions pentru mutații, un singur deploy pentru panoul dealerului, Super Admin și website-urile publice. |
| UI | **Tailwind CSS 4** + componente proprii, icoane Lucide | Control complet asupra designului (fără look generic de kit), dark mode prin variabile CSS. |
| Bază de date | **PostgreSQL 16** | Tranzacții, JSONB pentru dotări/metadate, **Row-Level Security** pentru izolare multi-tenant. |
| Acces date | **Drizzle ORM** + `node-postgres` | SQL explicit, tipuri TypeScript, migrații SQL lizibile (inclusiv politici RLS), fără binare native. |
| Validare | **Zod** | Aceeași schemă pe server și în formulare. |
| Autentificare | Sesiuni proprii în DB (cookie `httpOnly`, `SameSite=Lax`, `Secure` în producție), parole **bcrypt** | Revocare imediată a sesiunilor, suspendarea unui dealer taie accesul instant. Ulterior: 2FA TOTP, SSO opțional. |
| Fișiere | Interfață `StorageDriver`: local (dezvoltare) → **S3-compatibil** (Cloudflare R2 / AWS S3) în producție, livrare prin CDN | Fotografiile nu trec prin DB; doar metadatele. |
| Imagini | **sharp** — conversie WebP, redimensionare 2000px + thumbnail 480px, eliminare EXIF/GPS | Compresie automată și protecția datelor (EXIF poate conține locația). |
| Joburi asincrone | **pg-boss** (cozi în PostgreSQL) [PLANIFICAT] | Publicări pe canale, retry, notificări, rapoarte — fără infrastructură suplimentară la început. |
| AI | Claude API (Anthropic) prin modul server-side cu limită per plan [PLANIFICAT] | Generare anunțuri ancorată strict în fișa mașinii. |
| Plăți | **Stripe Billing** + webhook-uri [PLANIFICAT] | Abonamente recurente, facturi, dunning. |
| Email | Postmark / Amazon SES [PLANIFICAT] | Tranzacțional (confirmări, notificări). |
| Hosting | Container Docker pe un furnizor UE (ex. Hetzner, AWS eu-central-1) + PostgreSQL gestionat cu PITR | Date în UE (GDPR), backup automat. |
| Observabilitate | Sentry (erori), loguri structurate, uptime monitor [PLANIFICAT] | |

### 1.2 Diagrama logică

```
 Browser (panou dealer)   Browser (website public dealer)   Super Admin
          │                         │                           │
          ▼                         ▼                           ▼
 ┌──────────────────────── Next.js (Node) ─────────────────────────────┐
 │ middleware: rută → host (domeniu personalizat) → tenant             │
 │ Server Actions / Route Handlers                                     │
 │   └─ requireSession() → requirePermission() → withTenant(dealerId)  │
 │ Module: auth · vehicles · media · crm · listings · ai · billing ... │
 └──────────────┬───────────────────────┬───────────────────┬──────────┘
                │                       │                   │
         PostgreSQL (RLS)        Storage S3 + CDN      Cozi (pg-boss)
                                                            │
                                    Conectori canale: Website · Meta · OLX · Autovit
```

### 1.3 Izolare multi-tenant — trei straturi

1. **Aplicație**: orice operație trece prin `withTenant(dealerId, fn)`; `dealerId` provine **exclusiv din sesiunea de pe server**, niciodată din formular sau URL. Toate interogările filtrează explicit pe `dealer_id`.
2. **Bază de date (RLS)**: tabelele de business au `ENABLE + FORCE ROW LEVEL SECURITY` cu politica `dealer_id = current_setting('app.dealer_id')`. Aplicația se conectează cu rolul `autoflow_app` (fără `BYPASSRLS`, nu e proprietarul tabelelor). Dacă un programator uită filtrul, baza de date tot nu returnează rândurile altui dealer.
3. **Teste automate**: test de integrare care creează doi dealeri și verifică faptul că dealerul B nu poate citi/modifica/șterge datele lui A nici prin aplicație, nici prin SQL brut fără filtru. **[REAL]**

Tabelele `users` și `sessions` sunt la nivel de platformă (fără RLS), deoarece autentificarea are loc înainte de cunoașterea dealerului; accesul la ele trece exclusiv prin modulul `auth`. Întărire planificată: funcții `SECURITY DEFINER` pentru căutarea la login și RLS și pe `users`.

Super Admin folosește un rol separat, cu acces doar la tabele agregate/platformă și jurnal de audit pentru orice acces la datele unui dealer („break-glass”, cu motiv obligatoriu).

### 1.4 Structura codului

```
autoflow/
  db/migrations/        SQL versionat (schemă + RLS + roluri)
  src/app/(auth)/       login, înregistrare dealer
  src/app/(app)/        panoul dealerului (layout cu sidebar)
  src/server/           logică server: auth, permissions, tenant, module
  src/lib/              utilitare pure: finanțe, formatare, i18n
  src/components/       UI
  tests/                unit + integrare (Vitest, PostgreSQL real)
```

---

## 2. Structura bazei de date

Convenții: chei `uuid`, `created_at/updated_at timestamptz`, sume în **eurocenți (`bigint`)** — nu `float`; `currency` pe dealer (EUR implicit, RON posibil). Toate tabelele de business au `dealer_id` + RLS.

### Platformă
- **dealers** — id, name, slug, legal_name, cui, reg_com, address, city, county, phone, email, website, logo_path, brand_color, locale, currency, status (`active|suspended|trial|cancelled`), plan_id, trial_ends_at.
- **locations** — puncte de lucru: dealer_id, name, address, phone, is_default.
- **users** — email unic global, password_hash, full_name, phone, locale, is_super_admin, last_login_at, disabled_at.
- **memberships** — user_id, dealer_id, role (`owner|manager|sales|operator`), location_id opțional. Un utilizator poate lucra pentru mai mulți dealeri.
- **sessions** — id (hash token), user_id, active_dealer_id, expires_at, ip, user_agent.
- **audit_log** — dealer_id, actor_user_id, action, entity, entity_id, metadata JSONB, ip, created_at. Append-only.
- **plans** [PLANIFICAT] — code, name, price_cents, max_active_vehicles, max_users, max_locations, ai_monthly_quota, features JSONB.
- **subscriptions** [PLANIFICAT] — dealer_id, stripe_customer_id, stripe_subscription_id, status, current_period_end.
- **usage_counters** [PLANIFICAT] — dealer_id, period, ai_generations, …

### Inventar
- **vehicles** — dealer_id, location_id, stock_number (ID intern secvențial per dealer, ex. `AF-00042`), make, model, generation, year, vin, plate_number, mileage_km, engine, engine_cc, power_hp, power_kw, fuel, transmission, drivetrain, emission_standard, body_type, color, doors, seats, owners_count, origin, first_registration, equipment JSONB (coduri), notes, status, status_changed_at, acquired_at, listed_at, sold_at, sold_by_user_id, buyer_contact_id.
  - Financiar (același rând, protejat la nivel de câmpuri prin permisiuni): purchase_price, transport_cost, repair_cost, preparation_cost, other_costs, list_price, min_price, sale_price.
  - Calculate (nu stocate): cost total, profit brut estimat, profit brut realizat, zile în stoc.
  - Constrângeri: VIN unic per dealer, `(dealer_id, stock_number)` unic.
- **vehicle_expenses** [PLANIFICAT, Etapa 2] — cheltuieli detaliate cu dată și document; atunci câmpurile agregate devin sume calculate.
- **vehicle_media** — dealer_id, vehicle_id, kind (`image|video`), storage_key, thumb_key, width, height, size_bytes, position, is_primary.
- **vehicle_status_history** — dealer_id, vehicle_id, from_status, to_status, user_id, created_at (sursă pentru „durata până la vânzare”).

### CRM [Etapa 1, următorul pas]
- **contacts** — nume, telefon, email, consent_marketing, consent_at, source.
- **leads** — contact_id, vehicle_id, stage (`new|contacted|interested|test_drive|negotiation|reservation|won|lost`), budget, payment_method, assigned_user_id, next_contact_at, lost_reason, position (Kanban).
- **lead_activities** — tip (apel, email, notă, schimbare etapă), text, user_id.

### Vânzări, publicare, documente [Etapele 2–3]
- **listings** (vehicle × canal) — channel, status (`not_connected|ready|in_progress|published|error|needs_action`), external_id, external_url, last_synced_at, last_error, payload_hash.
- **listing_events** — istoric publicări/erori.
- **listing_texts** — vehicle_id, channel, locale, title, body, generated_by_ai, edited_by.
- **channel_connections** — dealer_id, channel, status, credențiale **criptate** (KMS / AES-GCM cu cheie din secret manager), expires_at.
- **appointments**, **reservations** (avans, expiră la), **documents**, **document_templates**, **document_sequences** (numerotare per tip/an), **finance_offers**.

---

## 3. Structura meniului

**Panou dealer (sidebar)**
1. Dashboard
2. Autoturisme — Stoc · Adaugă autoturism · Rotație lentă
3. Clienți (CRM) — Pipeline (Kanban) · Listă clienți · De contactat azi
4. Programări — Calendar · Test drive · Rezervări
5. Anunțuri — Publicări · Generator AI · Canale conectate · Erori sincronizare
6. Documente — Generate · Șabloane
7. Finanțare — Simulator · Oferte finanțatori
8. Rapoarte — Stoc · Vânzări · Marje · Agenți · Rotație
9. Website — Aspect · Pagini · Domeniu · SEO
10. Setări — Companie · Puncte de lucru · Utilizatori și roluri · Notificări · Abonament · Date și GDPR

**Super Admin (aplicație separată, `/admin`)** — Dealeri · Abonamente și venituri (MRR) · Planuri și limite · Utilizare (utilizatori, mașini, AI) · Integrări · Erori · Jurnal audit.

## 4. Lista paginilor

| Rută | Pagină | Etapă |
|---|---|---|
| `/login`, `/register` | Autentificare, înregistrare dealer (creează dealer + Owner) | 1 [REAL] |
| `/dashboard` | KPI, grafice, mașini recente, stoc vechi | 1 [REAL] |
| `/vehicles` | Listă cu căutare, filtre, sortare, paginare | 1 [REAL] |
| `/vehicles/new` | Fișă nouă | 1 [REAL] |
| `/vehicles/[id]` | Detalii: date, dotări, galerie, financiar, istoric status | 1 [REAL] |
| `/vehicles/[id]/edit` | Editare fișă | 1 [REAL] |
| `/settings/company` | Date companie | 1 [REAL] |
| `/settings/users` | Utilizatori și roluri | 1 [REAL] (listare, adăugare cu parolă inițială, schimbare rol, eliminare; invitații email [PLANIFICAT]) |
| `/crm`, `/crm/[id]` | Pipeline Kanban, fișă client | 1 [PLANIFICAT] |
| `/listings/*` | Publicare, AI, canale | 2 |
| `/calendar`, `/reservations` | Programări, rezervări | 3 |
| `/documents/*`, `/finance`, `/reports/*` | Documente, finanțare, rapoarte | 3 |
| `/website/*` + site public `{slug}.autoflow.ro` / domeniu propriu | Website dealer | 2 |
| `/admin/*` | Super Admin | 4 |

## 5. Fluxul de adăugare și vânzare a unei mașini

1. **Achiziție** — agentul/operatorul creează fișa (minim: marcă, model, an, combustibil, transmisie). Sistemul atribuie `stock_number`. Status: **În pregătire**. Se completează costurile de achiziție și transport.
2. **Pregătire** — se adaugă costuri reparații/pregătire, fotografii (compresie automată, reordonare, imagine principală), dotări.
3. **Listare** — se setează prețul de listare și prețul minim (vizibil Owner/Manager/Agent, ascuns Operatorului). Validare: fără preț de listare nu se poate trece în **Disponibil** (impus pe server); lipsa fotografiilor este semnalată ca avertisment. La trecere se setează `listed_at`.
4. **Interes** — lead în CRM legat de mașină; test drive programat.
5. **Rezervare** — status **Rezervat**, avans și dată de expirare; notificare la expirare.
6. **Vânzare** — status **Vândut** cere prețul final; se setează `sold_at`, `sold_by`. Profitul brut realizat = preț final − cost total. Avertizare dacă prețul final < preț minim (doar Owner/Manager pot confirma).
7. **După vânzare** — anunțurile se retrag automat unde canalul permite; website-ul marchează „Vândut” sau ascunde mașina; documentele (contract, PV) se generează din șabloane.
8. **Retras** — mașina scoasă din vânzare fără tranzacție.

Fiecare schimbare de status intră în `vehicle_status_history` și `audit_log`.

## 6. Fluxul de publicare a anunțurilor

```
Fișă completă → Verificare completitudine per canal (câmpuri obligatorii, nr. poze)
  → Generare texte AI (opțional) → Editare/aprobare umană
  → Selectare canale + fotografii → Previzualizare
  → Job în coadă per canal (status: În curs)
      → succes: Publicat (external_id, URL)
      → eroare tranzitorie: retry exponențial
      → eroare de validare / token expirat: Eroare / Necesită intervenție
  → Evenimente ulterioare (preț schimbat, vândut) → job de sincronizare/retragere
```

Fiecare conector implementează aceeași interfață: `validate(vehicle)`, `publish()`, `update()`, `unpublish()`, `fetchStatus()`, cu `capabilities` declarate (ex. „poate actualiza preț”, „poate retrage”). UI-ul afișează doar acțiunile pe care canalul le suportă realmente.

## 7. Strategia OLX / Autovit și dependențele de autorizare

- **Website propriu** — control total; publicarea este internă, fără dependențe. Primul canal livrat.
- **Facebook Page / Instagram Business** — Meta Graph API. Necesită: aplicație Meta, verificare business, **App Review** pentru permisiuni de publicare (`pages_manage_posts`, `instagram_content_publish`), conectare OAuth per dealer. Instagram cere cont Business/Creator legat de o pagină. Facebook Marketplace pentru vehicule funcționează prin programe de parteneriat/feed-uri de catalog, nu prin postare liberă — de verificat eligibilitatea pentru România.
- **OLX România și Autovit** (ambele OLX Group) — există API-uri pentru parteneri (OLX Partner API cu OAuth2; Autovit are API pentru dealeri/integratori de stoc). Accesul **nu este public**: necesită cerere de parteneriat, acord comercial, credențiale client și, de regulă, ca dealerul să aibă cont profesional/abonament activ pe platformă. Taxonomiile (mărci, modele, dotări, categorii) trebuie mapate pe dicționarele lor.
- **Ce construim până la autorizare**: modelul de date `listings`, interfața de conector, maparea câmpurilor, validarea completitudinii și un conector „feed export” (XML/CSV) dacă platforma acceptă import prin feed. Canalele neautorizate apar ca **Neconectat**; nu simulăm publicări.
- **Acțiuni comerciale necesare (BLUR Advertising)**: contact cu departamentele de parteneriate OLX/Autovit, crearea aplicației Meta și programarea App Review, termeni contractuali pentru utilizarea API în numele dealerilor.
- **Interzis**: scraping, automatizare de browser, folosirea credențialelor de login ale dealerului pe platformele terțe.

## 8. Funcționalități în MVP (Etapa 1)

| Funcționalitate | Stare |
|---|---|
| Înregistrare dealer + Owner, autentificare, deconectare, sesiuni în DB | [REAL] |
| Roluri Owner/Manager/Agent/Operator, verificare permisiuni pe server | [REAL] |
| Izolare multi-tenant prin aplicație + RLS PostgreSQL + teste | [REAL] |
| Dashboard cu KPI și grafice calculate din date reale | [REAL] |
| Gestiune autoturisme: fișă completă, dotări, status, istoric | [REAL] |
| Fotografii: upload multiplu, drag-and-drop, reordonare, principală, compresie WebP | [REAL] (stocare locală; driver S3 [PLANIFICAT]) |
| Calcul cost total, marjă estimată/realizată, preț minim protejat | [REAL] |
| Setări companie | [REAL] |
| Audit log pentru acțiuni sensibile | [REAL] |
| Rate limiting la autentificare | [REAL] (în memorie, pentru o instanță; Redis/DB [PLANIFICAT]) |
| CRM Kanban | [PLANIFICAT] — următorul pas din Etapa 1 |
| Video upload | [PLANIFICAT] — necesită transcodare (cost) |
| Limbi HU/EN | [PLANIFICAT] — interfața este în română; etichetele nomenclatoarelor (combustibil, dotări, statusuri, roluri) sunt centralizate în `src/lib` pentru traducere |

## 9. Riscuri tehnice și costuri operaționale

**Riscuri**
| Risc | Impact | Atenuare |
|---|---|---|
| Acces API OLX/Autovit refuzat sau întârziat | Mare — e argument de vânzare | Comunicare onestă în ofertă („când accesul este autorizat”), website + Meta ca valoare imediată, feed export. |
| Scurgere de date între dealeri | Critic | RLS + filtre aplicație + teste automate + review la fiecare tabel nou. |
| AI inventează dotări | Juridic/comercial | Prompt bazat exclusiv pe câmpurile fișei, validare post-generare (ex. mențiuni de dotări absente), editare umană obligatorie. |
| Costuri stocare/trafic imagini | Mediu | WebP, thumbnails, CDN, R2 (fără cost de egress). |
| Șabloane contracte neconforme | Juridic | Șabloanele sunt furnizate „de revizuit”, aprobare juridică per dealer, disclaimer. |
| Simulator de finanțare perceput ca ofertă fermă | Juridic (protecția consumatorului) | Marcare „estimativ”, DAE afișată doar dacă e furnizată de finanțator. |
| GDPR (date clienți, telefoane) | Juridic | DPA cu dealerii (AUTOFLOW = persoană împuternicită), retenție configurabilă, export/ștergere, loguri de acces. |
| Dependență de un singur furnizor cloud | Mediu | Containere standard, PostgreSQL standard, storage S3-compatibil. |

**Costuri operaționale lunare estimate (lansare, ~20–50 dealeri)** — orientativ, de validat cu ofertele actuale:
- Server aplicație (2–4 vCPU): 20–60 €
- PostgreSQL gestionat cu backup/PITR: 30–80 €
- Stocare imagini + CDN (R2): 5–30 €
- Email tranzacțional: 0–15 €
- AI (generare texte): ~0,01–0,05 € / generare → 10–100 € în funcție de cote
- Monitorizare erori/uptime: 0–30 €
- Stripe: ~1,5% + 0,25 € per tranzacție UE (comision pe abonament)
- **Total infrastructură: ~80–300 €/lună**, fără costuri de dezvoltare, suport, juridic, contabilitate și eventuale taxe de parteneriat OLX/Autovit.

## 10. Planul de implementare

**Etapa 1 — MVP (în curs)**
1. ✅ Schelet Next.js + Tailwind + PostgreSQL + migrații + RLS.
2. ✅ Autentificare, sesiuni, înregistrare dealer, rate limiting.
3. ✅ Roluri și permisiuni pe server + audit log.
4. ✅ Modul autoturisme (CRUD, dotări, status, istoric, financiar).
5. ✅ Fotografii (upload, compresie, ordine, principală).
6. ✅ Dashboard cu KPI și grafice reale.
7. ✅ Setări companie, gestiune utilizatori (adăugare, rol, eliminare).
8. ⏭ CRM: contacte, lead-uri, Kanban, activități, „de contactat azi”.
9. ⏭ Invitații utilizatori prin email, resetare parolă (necesită furnizor email).
10. ⏭ Driver S3 pentru fotografii, CI (lint + teste), deploy staging.

**Etapa 2 — Publicare**: generator AI (cu cote), website public multi-tenant + domenii personalizate (TLS automat), conector Meta, arhitectura conectorilor OLX/Autovit + feed export, cozi și monitorizare sincronizare.

**Etapa 3 — Vânzări**: calendar și test drive, rezervări cu avans și expirare, șabloane documente + PDF + numerotare, simulator finanțare, rapoarte cu export Excel/PDF.

**Etapa 4 — Comercializare**: Super Admin, Stripe Billing (webhook-uri, facturi, dunning), limite per plan aplicate pe server, onboarding, automatizări și notificări, backup testat prin restaurare, pentest, documentație juridică (Termeni, DPA, Politică confidențialitate).
