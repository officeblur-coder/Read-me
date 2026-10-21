# Arhitectura ATLAS CONTROL

## 1. Structura meniului

| Secțiune | Pagini |
|---|---|
| Conducere | Dashboard executiv · Atlas Intelligence |
| Proiecte | Proiecte și contracte · Control financiar · Harta șantierelor · Jurnal de șantier · Atlas Field |
| Operațiuni | Echipe și utilaje · Materiale și stocuri · Producție proprie |
| Platformă | Setări și roluri · Arhitectură |

Fișa de proiect are taburile: Prezentare · Financiar · Progres · Echipe și utilaje · Materiale · Documente și fotografii · Jurnal de șantier.

## 2. Prototipul actual

- **React 18 + TypeScript + Vite + Tailwind CSS**, grafice Recharts, iconițe Lucide, stare Zustand.
- Rulează integral în browser; modificările se păstrează local (localStorage) și pot fi resetate.
- Harta: contururile județelor sunt precalculate la build (`npm run geo`, d3-geo) în căi SVG; în client nu există bibliotecă GIS și nici dependență de servicii de hărți.
- Fotografiile de șantier sunt ilustrații generate procedural, marcate „Imagine demonstrativă”. Fotografiile reale încărcate din Atlas Field se păstrează în sesiune.

```
src/
  domain/      tipuri, calcul financiar, program, permisiuni, alerte, Atlas Intelligence (fără UI)
  data/demo/   date fictive + generator determinist (se înlocuiește cu API)
  data/geo/    contururi județe (generat)
  store/       stare + acțiuni (aprobă, raport zilnic, transfer...) – punctul de conectare la API
  features/    asistent, scenariu demo, solicitări, jurnal
  pages/       un ecran per modul
tests/         teste Vitest pentru motorul financiar și date
```

## 3. Model de calcul

```
Cost efectiv          = Σ facturi furnizori, pontaje, transferuri din depozit
Angajat deschis       = Σ max(0, valoare angajament − facturi legate de angajament)
Rămas estimat (ETC)   = estimarea managerului pentru ce nu este nici facturat, nici comandat
Cost total estimat    = Efectiv + Angajat deschis + ETC
Venit actualizat      = Contract + acte adiționale APROBATE
Profit estimat        = Venit actualizat − Cost total estimat
Marjă estimată (%)    = Profit estimat / Venit actualizat × 100
```

Reguli contra dublei contabilizări:
- o factură legată de un angajament reduce partea deschisă a acelui angajament;
- manopera raportată din șantier devine cost efectiv și se scade din ETC-ul de manoperă;
- transferul din depozit devine cost efectiv de materiale și se scade din ETC-ul de materiale;
- la aprobarea unei solicitări, partea deja inclusă în ETC iese din ETC și devine angajament; doar diferența afectează profitul;
- consumul raportat din șantier modifică doar cantitățile (costul a fost recunoscut la achiziție/transfer).

Praguri (configurabile în Setări): marjă sub 12% → galben, sub 4% → roșu; depășire buget peste 1% → galben, peste 6% → roșu; abatere de la grafic peste 12 puncte → întârziat.

## 4. Arhitectura de producție propusă

```
 Browser (web + PWA Atlas Field, offline)        Integrări (etapa 2+)
        │  HTTPS, OIDC                             ├─ Contabilitate (Saga / WinMentor / SmartBill)
        ▼                                          ├─ e-Factura ANAF
 API aplicație (NestJS sau .NET)  ───────────────┤─ GPS flotă
   ├─ autentificare SSO, sesiuni                   └─ furnizori / ERP
   ├─ autorizare pe roluri + filtru pe proiecte alocate (validare pe server)
   ├─ motorul de calcul (același cod ca src/domain)
   ├─ jurnal de audit (cine a modificat ce și când)
   └─ Atlas Intelligence: LLM cu funcții de interogare ca unelte, limitat de rolul utilizatorului
        │
 PostgreSQL (date tranzacționale)  ·  stocare obiect S3 (documente, fotografii)  ·  coadă de sincronizare
```

- **Securitate:** permisiunile din `src/domain/permissions.ts` devin politici pe server; managerii de proiect și șefii de șantier primesc doar rândurile proiectelor alocate.
- **Atlas Intelligence în producție:** modelul primește aceleași funcții ca motorul demonstrativ (`ask` → unelte de interogare), nu acces direct la baza de date; fiecare cifră din răspuns provine dintr-un apel de unealtă, iar răspunsul indică sursa.
- **Atlas Field:** PWA cu stocare locală și sincronizare la revenirea semnalului; fotografiile se comprimă pe telefon.

## 5. Ce NU este implementat (intenționat)

Nicio integrare externă (contabilitate, GPS, ERP, e-Factura), niciun server, nicio autentificare reală, niciun model AI. Prototipul nu pretinde contrariul: toate aceste zone sunt marcate ca simulare sau planificate.
