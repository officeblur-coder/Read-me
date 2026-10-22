# ContaPilot AI — arhitectură, module, fluxuri și plan de dezvoltare

Document de lucru pentru MVP. Public-țintă: contabili și cabinete de contabilitate din România.
Principiu de bază: **regulile calculează, AI-ul explică**. Nicio cifră afișată ca fapt nu provine din generarea liberă a unui model de limbaj.

---

## 1. Poziționare

ContaPilot nu înlocuiește SAGA, WinMENTOR sau SmartBill. Stă lângă ele:

```
SAGA / WinMENTOR / SmartBill / SPV / bancă
            │  export (XLS, CSV, XML, MT940, PDF)
            ▼
     ContaPilot: import → normalizare → reguli → constatări → propuneri
            │  note aprobate (XML / CSV în formatul programului)
            ▼
SAGA / WinMENTOR / SmartBill (import note)
```

Contabilul rămâne în programul lui pentru evidență. ContaPilot face munca de verificare, potrivire și redactare a notelor, apoi trimite înapoi doar ce a aprobat contabilul.

**Ce NU face**: CRM, portal pentru clienți, mesagerie, facturare către clienți, salarizare, gestiune de stocuri.

---

## 2. Unde se economisesc efectiv ore

Funcțiile de mai jos sunt alese după timpul pe care îl taie dintr-o lună reală de cabinet, nu după cât de „AI” par.

| # | Funcție | Ce înlocuiește | Economie estimată* |
|---|---|---|---|
| 1 | **Coada de priorități pe tot portofoliul** — toate problemele din toate firmele, ordonate după impact în lei × termenul legal (D300 pe 25) | Deschiderea pe rând a fiecărei firme ca să vezi ce e în neregulă | 2–4 h / lună / cabinet |
| 2 | **SPV e-Factura vs. jurnal de cumpărări** — facturile primite în SPV și neînregistrate, plus cele înregistrate dar inexistente în SPV | Comparare manuală XML-uri vs. jurnal | 20–40 min / firmă / lună |
| 3 | **D300 simulat vs. RO e-TVA precompletat** — diferențele explicate pe facturi, înainte de depunere | Reconcilierea după notificarea de conformare ANAF | 30–90 min / firmă cu diferențe |
| 4 | **Reconciliere bancară cu explicarea integrală a diferenței** — sold extras − sold 5121 descompus pe tranzacții | Bifat extrasul cu creionul | 30–60 min / cont / lună |
| 5 | **Detectare dubluri** (serie + număr + CUI + sumă, cu toleranță la diferențe de scriere) | Căutare în jurnal după reimporturi | Evită erori de TVA, nu doar timp |
| 6 | **Memoria de contare per firmă** — fiecare notă aprobată devine regulă (furnizor X → cont 612, TVA 21%) | Contarea repetată a acelorași furnizori lună de lună | 40–60% din timpul de contare după 2–3 luni |
| 7 | **Note din limbaj natural** cu TVA calculat determinist și listă „de verificat” (plafon numerar 5.000 lei, prag mijloc fix 2.500 lei, deducere 50% auto, taxare inversă) | Căutarea tratamentului în Codul fiscal pentru operațiuni rare | 5–15 min / operațiune neobișnuită |
| 8 | **Checklist de închidere generat din profilul firmei** (plătitor TVA, salariați, MF, valută) | Liste în Excel, ținute de mână | 15–30 min / firmă / lună |
| 9 | **Legături între module** — soldul creditor al casei e explicat de o retragere ATM neînregistrată din extras | Investigația manuală a cauzei | Variabil, mare la erori rare |
| 10 | **Raport de verificare la închidere** — reguli rulate, constatări, decizii, cine a aprobat | Dosar de lucru întocmit manual pentru CECCAR / audit | 20 min / firmă / lună |

\* Estimări de lucru pentru validare cu cabinete-pilot. Aplicația măsoară timpul economisit pe tip de operațiune (timp standard per operațiune × operațiuni automatizate), iar valorile se calibrează în beta.

---

## 3. Arhitectura tehnică

### 3.1 Vedere de ansamblu

```
┌──────────────────────────────────────────────────────────────────────┐
│  Web app (Next.js, React, TypeScript)                                │
│  dashboard · audit · reconciliere · generator · Copilot (sertar)     │
└──────────────┬───────────────────────────────────────────────────────┘
               │ HTTPS, sesiune + CSRF, tRPC/REST
┌──────────────▼───────────────────────────────────────────────────────┐
│  API (Node.js / TypeScript, Fastify sau Next route handlers)         │
│  auth · tenanți · import · constatări · aprobări · export · facturare│
└───┬───────────────┬───────────────────┬───────────────────┬──────────┘
    │               │                   │                   │
┌───▼────┐   ┌──────▼──────┐   ┌────────▼────────┐   ┌──────▼──────────┐
│Postgres│   │ Coadă job-uri│   │ Stocare fișiere │   │ Serviciu AI     │
│ + RLS  │   │ (pg-boss /   │   │ S3 compatibil,  │   │ (LLM prin API,  │
│        │   │  BullMQ)     │   │ regiune UE,     │   │  doar unelte    │
│        │   │              │   │ criptare SSE    │   │  read-only)     │
└────────┘   └──────┬───────┘   └─────────────────┘   └─────────────────┘
                    │
     ┌──────────────▼───────────────────────────────────────────┐
     │ Workeri                                                  │
     │  • parsere: XLS/CSV (detectare coloane), MT940, CAMT.053, │
     │    XML e-Factura (UBL/CIUS-RO), SAF-T                     │
     │  • OCR (Faza 2): PDF/imagini → text + structură           │
     │  • motor de reguli (determinist, versionat)               │
     │  • motor de potrivire bancară                             │
     │  • generatoare export: SAGA, WinMENTOR, SmartBill         │
     └──────────────────────────────────────────────────────────┘
```

### 3.2 Alegeri și motive

| Componentă | Alegere | Motiv |
|---|---|---|
| Frontend | Next.js + React + TypeScript, CSS cu tokeni (light/dark) | Un singur limbaj cu backend-ul; SSR pentru încărcare rapidă |
| Tabele | TanStack Table + virtualizare | Balanțe de 2.000+ conturi analitice și jurnale de zeci de mii de rânduri |
| Grafice | SVG propriu sau Visx | Control total asupra stilului; fără aspect de template |
| Backend | TypeScript, Zod pentru validare | Tipuri comune front/back; regulile scrise o singură dată |
| Sume | `NUMERIC(18,2)` în DB, `decimal.js` în cod | Niciodată `float` pentru bani |
| Bază de date | PostgreSQL 16 cu Row-Level Security | Separarea strictă a datelor între cabinete, garantată și la nivel de DB |
| Coadă | pg-boss la început (fără infrastructură în plus), BullMQ/Redis la scară | Importurile și regulile rulează asincron |
| Fișiere | S3 compatibil în UE, criptare la rest, URL-uri semnate cu expirare scurtă | GDPR, documente financiare |
| OCR (F2) | Serviciu cloud de extragere documente cu regiune UE, sau Tesseract + layout model self-hosted | XML-ul din SPV acoperă majoritatea facturilor; OCR doar pentru rest |
| LLM | Model de limbaj prin API, cu DPA, fără antrenare pe datele clienților, procesare în UE unde e disponibilă | Explicații, clasificare text liber, potriviri fuzzy |
| Hosting | Containere într-un cloud cu regiune UE (Frankfurt / București) | Rezidență date în UE |
| Facturare | Stripe Billing (abonamente lunare, TVA, facturi) | Standard pentru SaaS |

### 3.3 Motorul de reguli (inima produsului)

Fiecare regulă este cod TypeScript pur, testat, versionat:

```ts
interface Rule {
  id: 'R-TVA-03';            // stabil, apare în UI și în rapoarte
  version: '1.2.0';          // orice schimbare de logică → versiune nouă
  appliesTo: (profile: CompanyProfile) => boolean;  // ex. doar plătitori de TVA
  run: (ctx: PeriodContext) => Finding[];           // fără I/O, fără AI
}

interface Finding {
  ruleId: string; ruleVersion: string;
  severity: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  calculation: { label: string; value: Decimal }[];  // pașii calculului, afișați ca atare
  sources: SourceRef[];       // balanță/cont, rând jurnal, tranzacție extras, fișier + pagină
  proposedEntry?: JournalLine[];  // nota de corecție, echilibrată obligatoriu
  impact?: { declaration: 'D300' | 'D394' | 'D390' | 'D112'; rows: string[] };
}
```

Familii de reguli pentru MVP (≈ 45 de reguli):

- **Integritate**: balanța echilibrată pe toate cele trei perechi; SF = SI + RD − RC pe fiecare cont; conturi inexistente în planul OMFP 1802/2014; sintetice care cer analitic.
- **Solduri imposibile**: casă (5311) creditoare; 5121 creditor fără descoperit autorizat; 4423 și 4424 simultan; 4426/4427 nereglate la final de lună la plătitorii lunari; clase 6/7 neînchise la final de an.
- **Corelații TVA**: 4427 ≈ venituri taxabile × cota (pe coduri TVA); 4426 vs. jurnal de cumpărări; 4423 = 4427 − 4426 ± regularizări; taxare inversă: 4426 = 4427 pe aceeași bază.
- **Corelații salariale**: CAS 25%, CASS 10%, impozit 10% din (brut − CAS − CASS − deduceri), CAM 2,25%; 421 vs. stat de plată; corelație cu D112.
- **Imobilizări**: amortizare lunară prezentă și egală cu registrul MF; 281x ≤ 21xx pe fiecare activ.
- **Dubluri**: aceeași serie + număr + CUI + sumă; aceeași sumă + furnizor în ±3 zile; plăți duble pe aceeași factură.
- **Terți**: furnizori cu sold debitor, clienți cu sold creditor, solduri vechi > 365 zile.
- **Variații**: abatere față de media pe 6 luni și față de aceeași lună din anul anterior (prag configurabil, implicit ±40%).
- **Numerar**: plafoane Legea 70/2015 pe zi și pe partener.

Parametrii legali (cote TVA, plafoane, praguri) stau în tabelul `legal_parameters` cu `valid_from` / `valid_to`, astfel încât o perioadă se verifică mereu cu legislația în vigoare la acea dată (ex. cota standard 19% până la 31.07.2025, 21% de la 01.08.2025).

### 3.4 Stratul AI — ce are voie și ce nu

| AI face | AI nu face |
|---|---|
| Explică o constatare în limbaj clar, pornind de la calculul regulii | Nu calculează solduri, TVA sau diferențe |
| Clasifică text liber (detalii extras, descriere operațiune) în categorii | Nu scrie direct în baza de date contabilă |
| Propune potriviri fuzzy (nume client scris diferit, plăți grupate) cu scor | Nu aprobă nimic |
| Răspunde în chat folosind unelte read-only (`get_balance`, `get_ledger`, `run_rule`, `compare_periods`) | Nu răspunde din memorie despre datele firmei |
| Redactează explicația unei note propuse | Nu inventează conturi: lista e restrânsă la planul de conturi |

**Garda numerică**: după generarea unui răspuns, un validator extrage toate numerele din text și verifică că fiecare apare în ieșirile uneltelor apelate (sau e derivabil din ele). Dacă nu, răspunsul e respins și regenerat sau afișat cu avertisment. Fiecare răspuns are lista de surse (`ai_citations`).

**Date trimise modelului**: doar ce e necesar întrebării (agregate, rânduri relevante), fără CNP-uri; numele persoanelor fizice sunt pseudonimizate înainte de trimitere și reconstituite în răspuns.

### 3.5 Securitate și GDPR

- Multi-tenancy: fiecare rând are `tenant_id`; RLS în Postgres (`current_setting('app.tenant_id')`), plus filtre în aplicație. Teste automate care încearcă acces încrucișat.
- Roluri: Proprietar cabinet, Contabil, Operator (fără aprobări), Auditor (doar citire). Acces la nivel de firmă client, nu doar de cabinet.
- Criptare: TLS 1.2+; la rest (disc + SSE pe fișiere); câmpuri sensibile (IBAN, CNP din state de plată) criptate la nivel de aplicație.
- Pistă de audit append-only: cine a importat, ce reguli au rulat, cine a aprobat/respins ce, ce s-a exportat.
- 2FA obligatoriu pentru roluri care aprobă; sesiuni revocabile.
- GDPR: ContaPilot este persoană împuternicită (art. 28) pentru cabinet; DPA standard; registru de subîmputerniciți (cloud, LLM, OCR, e-mail); export și ștergere date per firmă; retenție configurabilă, implicit după termenele din Legea contabilității 82/1991 și OMFP 2634/2015 (de confirmat cu un jurist la implementare).
- Backup zilnic criptat, restaurare testată lunar; RPO 24h, RTO 4h pentru MVP.

### 3.6 Model SaaS

| Plan | Pentru | Firme incluse | Preț orientativ / lună |
|---|---|---|---|
| Solo | contabil autorizat | până la 15 | 149 lei + TVA |
| Cabinet | 2–5 utilizatori | până la 60 | 449 lei + TVA |
| Expert | cabinete mari | până la 200 | 1.190 lei + TVA |

Contorizare în `usage_counters` (firme active, pagini OCR, întrebări Copilot). Prețurile sunt ipoteze de validat în beta.

---

## 4. Structura bazei de date

Schema completă: [`../db/schema.sql`](../db/schema.sql). Pe scurt:

```
tenants ─┬─ users (via memberships, cu rol)
         ├─ companies ── company_profiles (plătitor TVA, sistem sursă, perioadă)
         │      ├─ periods (lună, stare: deschisă / în verificare / închisă)
         │      ├─ chart_accounts (planul firmei, mapat la OMFP 1802)
         │      ├─ imports ── source_files (S3, hash SHA-256)
         │      ├─ trial_balances ── trial_balance_lines
         │      ├─ journal_entries ── journal_lines
         │      ├─ invoices (din SPV sau OCR) ── invoice_lines
         │      ├─ bank_accounts ── bank_statements ── bank_transactions
         │      │                         └─ reconciliation_matches ── match_targets
         │      ├─ rule_runs ── findings ── finding_sources
         │      ├─ proposals (note propuse) ── proposal_lines ── approvals
         │      ├─ posting_memory (furnizor/cuvinte → cont, TVA)
         │      └─ ai_conversations ── ai_messages ── ai_citations
         ├─ export_batches ── export_items
         ├─ subscriptions, usage_counters
         └─ audit_log (append-only)
legal_parameters, rules (catalog global, versionat), standard_accounts (OMFP 1802)
```

Decizii importante:

- Datele importate sunt **imuabile**. O corecție nu modifică `journal_lines`; creează o `proposal` care, după aprobare, intră într-un `export_batch` pentru programul sursă. La reimport, se compară noul jurnal cu cel vechi și se marchează notele aplicate.
- `findings` păstrează `rule_version` și un `input_hash`, deci o constatare poate fi reprodusă exact.
- `proposal_lines` are constrângere: suma debit = suma credit per propunere (verificată în trigger).

---

## 5. Modulele MVP

### 5.1 Audit AI pentru balanță

1. Import balanță (XLS/CSV din SAGA, WinMENTOR, SmartBill; detectare automată a coloanelor: cont, denumire, SI D/C, RD, RC, SF D/C, eventual „total sume”).
2. Opțional: jurnalele aferente (vânzări, cumpărări, registru de casă, bancă) pentru reguli care cer detaliu.
3. Normalizare: conturi mapate la planul OMFP; analitice legate de sintetic.
4. Rulare reguli → constatări cu severitate, surse, calcul, impact pe declarații.
5. Copilotul adaugă explicația și, unde e posibil, cauza probabilă și nota de corecție.
6. Contabilul aprobă / respinge / marchează verificat; notele aprobate intră în lotul de export.
7. Comparație cu lunile anterioare (din balanțele importate anterior).

### 5.2 Reconciliere bancară

1. Import extras: MT940, CAMT.053, CSV/PDF de la băncile din România (șabloane per bancă).
2. Potrivire în trei trepte:
   - **exactă** (sumă + nr. factură în detalii + CUI/IBAN partener) → acceptată automat dacă regula e activă;
   - **combinatorie** (o plată = mai multe facturi; plăți parțiale; comisioane scăzute) → propunere cu scor;
   - **fuzzy cu AI** (nume scris diferit, fără referință) → propunere cu scor mai mic, decizia contabilului.
3. Tranzacții recurente recunoscute după cod (comisioane 627, dobânzi 766, retrageri numerar 581).
4. Ecuația soldurilor: sold 5121 + elemente neînregistrate = sold extras; diferența rămasă trebuie să fie zero la închidere.
5. Note generate pentru elementele neînregistrate → export.

### 5.3 Generator de note contabile

1. Contabilul descrie operațiunea în limbaj natural.
2. LLM-ul extrage o structură (tip operațiune, partener, sumă, monedă, „cu/fără TVA”, mod de plată, natura bunului) — **doar extragere, nu conturi și nu sume finale**.
3. Motorul determinist alege conturile (planul OMFP + memoria de contare a firmei), aplică cota TVA în vigoare la data operațiunii, calculează baza și TVA-ul, verifică echilibrul.
4. Reguli de atenționare: plafon numerar, prag mijloc fix, deducere 50% vehicule, taxare inversă (art. 307, 331), servicii intracomunitare (D390), bon fiscal ca factură simplificată.
5. Rezultatul include ipotezele făcute (ex. „suma considerată cu TVA inclus”), declarațiile afectate și ce trebuie verificat.
6. Aprobare → lot de export. Corecțiile contabilului intră în memoria de contare.

---

## 6. Fluxul principal al utilizatorului

```
Dimineața:  Panou → coada de priorități (toate firmele) → clic pe problemă
            → modul cu constatarea deschisă → surse + calcul + explicație
            → Aprobă nota / Respinge cu motiv
Lunar:      Trage fișierele în zona de import (tipul e recunoscut)
            → analiza rulează în fundal → notificare „Atelier Nord: 7 constatări”
Înainte de 25: Panou → „Blocante D300” → rezolvare → D300 simulat fără diferențe
Închidere:  Checklist → toate verificările verzi → raport de verificare (PDF) arhivat
Oricând:    Ctrl K → Copilot → întrebare → răspuns cu cifre și surse
```

Principii UX: rezumatul înaintea detaliului; fiecare alertă arată de unde vine; o singură acțiune primară pe ecran; nimic nu se modifică fără confirmare; totul se poate face din tastatură.

---

## 7. Plan de dezvoltare etapizat

| Fază | Durată | Livrabil | Criteriu de ieșire |
|---|---|---|---|
| **0. Descoperire** | 2 săpt. | 10 interviuri cu contabili; colecție de exporturi reale anonimizate din SAGA, WinMENTOR, SmartBill și 5 bănci; catalogul primelor 45 de reguli validat de un expert contabil | Formatele de import documentate cu fișiere-exemplu |
| **1. Fundație** | 4 săpt. | Auth, tenanți, RLS, roluri, firme, perioade, stocare fișiere, pistă de audit, CI cu teste de izolare | Test automat: niciun acces încrucișat între tenanți |
| **2. Audit balanță** | 5 săpt. | Import balanță + jurnale, motor de reguli v1 (45 reguli), UI constatări, comparații lunare, export note SAGA | Pe 20 de balanțe reale, ≥ 90% din erorile marcate de un expert sunt găsite, < 10% alarme false |
| **3. Reconciliere bancară** | 4 săpt. | Parsere MT940/CAMT/CSV, potrivire exactă + combinatorie, ecuația soldurilor, note | ≥ 80% tranzacții potrivite automat pe extrase reale |
| **4. Generator note + Copilot** | 4 săpt. | Extragere LLM, motor de contare, memorie de contare, chat cu unelte read-only și garda numerică | 0 cifre neverificate în răspunsuri pe setul de test |
| **5. Beta închis** | 6 săpt. | 10 cabinete-pilot, măsurare timp economisit, abonamente Stripe | 7 din 10 cabinete continuă cu plată |
| **6. Faza 2** | trimestrul următor | SPV e-Factura (OAuth ANAF), D300 vs. RO e-TVA, OCR, checklist de închidere, raport de închidere, export WinMENTOR și SmartBill | — |
| **7. Faza 3** | ulterior | SAF-T D406 pre-validare, multi-monedă și reevaluare BNR, API pentru integratori, aplicație mobilă pentru aprobări | — |

Echipă minimă: 2 dezvoltatori full-stack, 1 dezvoltator backend/date (parsere, reguli), 1 designer de produs (part-time), 1 expert contabil consultant (validează regulile și tratamentele fiscale).

---

## 8. Riscuri și cum le tratăm

| Risc | Măsură |
|---|---|
| Formate de export diferite între versiuni SAGA/WinMENTOR | Detectare automată a coloanelor + șabloane salvate per firmă; set de fișiere de test din fiecare versiune |
| Legislația se schimbă des (cote TVA, plafoane) | Parametri legali cu dată de valabilitate; regulile citesc parametrii, nu constante |
| Alarme false care obosesc utilizatorul | Prag de severitate configurabil; „marchează ca normal pentru această firmă” învață excepțiile |
| Încrederea în AI | AI-ul nu produce cifre; fiecare explicație are calculul și sursa alături |
| Răspundere profesională | Aplicația propune, contabilul decide; pista de audit arată cine a aprobat |
| Acces SPV/ANAF | Faza 2, cu autorizare OAuth ANAF; până atunci, import manual de arhive XML |

---

## 9. Demo

Demo-ul interactiv al dashboardului e în [`../demo/contapilot-demo.html`](../demo/contapilot-demo.html). Toate datele sunt fictive. Balanța firmei-exemplu este calculată în browser din solduri inițiale și 37 de înregistrări, deci e echilibrată prin construcție, iar constatările rezultă din aceleași date.
