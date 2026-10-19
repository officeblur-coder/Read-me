# AUTOFLOW

Platformă SaaS pentru gestiunea parcurilor auto — BLUR Advertising.

Analiza completă (arhitectură, bază de date, meniuri, fluxuri, integrări OLX/Autovit, riscuri, plan): [`docs/ARHITECTURA.md`](docs/ARHITECTURA.md).

## Starea versiunii 0.1 (Etapa 1, parțial)

| Modul | Stare |
|---|---|
| Înregistrare dealer, autentificare, sesiuni în DB, rate limiting la login | Implementat, testat |
| Roluri Owner / Manager / Agent / Operator, permisiuni verificate pe server | Implementat, testat |
| Izolare multi-tenant: filtre în aplicație + Row-Level Security PostgreSQL | Implementat, testat |
| Gestiune autoturisme: fișă completă, dotări, status + istoric, căutare, filtre | Implementat, testat |
| Fotografii: upload multiplu, drag-and-drop, reordonare, principală, compresie WebP, eliminare EXIF/GPS | Implementat (stocare locală) |
| Calcul cost total, profit brut estimat/realizat, preț minim protejat | Implementat, testat |
| Dashboard cu KPI și grafice calculate din baza de date | Implementat, testat |
| Setări companie, gestiune utilizatori | Implementat |
| Jurnal de audit (append-only) | Implementat |
| CRM, anunțuri, AI, website, contracte, Stripe, Super Admin | **Neimplementat** — vezi planul pe etape |
| Integrări OLX / Autovit / Meta | **Neimplementate și netestate** — necesită autorizare de la platforme |

Aplicația nu conține date demo. Meniurile pentru modulele viitoare sunt afișate ca „În curând” și nu duc la pagini simulate.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL 16 · Drizzle ORM · Zod · bcrypt · sharp · Recharts · Vitest

## Pornire locală

Cerințe: Node.js 20+, PostgreSQL 16.

```bash
# 1. Roluri și baze de date (o singură dată, ca superuser PostgreSQL)
sudo -u postgres psql -f db/setup-local.sql

# 2. Configurație
cp .env.example .env

# 3. Dependențe și migrații
npm install
npm run db:migrate

# 4. Pornire
npm run dev            # http://localhost:3000
```

Primul cont se creează din pagina `/register` (devine proprietarul parcului auto).

## Teste

```bash
npm test     # rulează pe baza autoflow_test, cu rolul aplicației (RLS activ)
npm run lint # verificare TypeScript
```

Testele acoperă: calcule financiare și parsarea sumelor, matricea de permisiuni și tranzițiile de status, autentificarea, redactarea câmpurilor financiare per rol, protecția la scriere a costurilor, validări, fluxul complet de vânzare, agregările din dashboard și izolarea multi-tenant (inclusiv SQL direct fără filtru, care este blocat de RLS).

## Securitate — rezumat

- Aplicația se conectează cu rolul `autoflow_app`, fără `BYPASSRLS`; tabelele au `FORCE ROW LEVEL SECURITY`.
- `dealer_id` provine doar din sesiunea validată pe server; fiecare tranzacție setează `app.dealer_id`.
- Token de sesiune aleator (256 biți) în cookie `httpOnly`; în DB se stochează doar hash-ul SHA-256.
- Câmpurile financiare sunt eliminate din răspuns pe server pentru rolurile neautorizate și ignorate la scriere.
- Fotografiile se servesc doar prin sesiune autentificată a dealerului proprietar.
- Jurnalul de audit nu poate fi modificat sau șters de aplicație (doar `INSERT`/`SELECT`).

## Structură

```
db/migrations/      schema SQL + politici RLS + drepturi
scripts/migrate.ts  rulare migrații
src/lib/            logică pură: permisiuni, statusuri, finanțe, nomenclatoare, formatare
src/server/         auth, db (withTenant), vehicles, media, dashboard, company, audit
src/app/            pagini și server actions
src/components/     UI: sidebar, grafice, componente de bază
tests/              teste unitare și de integrare
```
