# ATLAS CONTROL – Project Intelligence & Profitability Platform

Prototip interactiv pentru Atlas Sport: centrul de comandă care răspunde în orice moment la întrebarea
**„Cât profit ne aduce fiecare proiect și ce probleme trebuie rezolvate astăzi?”**

> Toate datele sunt **fictive** (proiecte, beneficiari, valori, persoane, furnizori). Localitățile sunt reale doar
> pentru plasarea pe hartă. Nu există integrări active cu contabilitatea, GPS sau ERP.

## Pornire

```bash
cd atlas-control
npm install
npm run dev        # http://localhost:5173
npm test           # teste pentru motorul financiar, date demo și Atlas Intelligence
npm run build      # build static în dist/ (se poate găzdui oriunde, rutare cu hash)
```

## Ce conține

| Modul | Ce face |
|---|---|
| Dashboard executiv | Contracte active, profit și marjă estimate, facturare/încasări/creanțe, buget vs EAC, întârzieri, echipe și utilaje, „Necesită atenția conducerii”, hartă, filtre pe perioade |
| Proiecte și contracte | Buton **Proiect nou** (formular în 4 pași), portofoliu filtrabil (județ, tip, status, responsabil, stare), fișă completă cu taburi: prezentare, financiar, progres, echipe, materiale, documente și fotografii, jurnal de șantier |
| Control financiar | EAC = efective + angajate deschise + rămase estimate, fără dublă contabilizare; costuri editabile, angajamente, facturi, acte adiționale, praguri verde/galben/roșu, export CSV |
| Harta șantierelor | Harta României pe județe, puncte colorate după starea financiară, filtre, panou de detaliu cu fotografii |
| Atlas Field | Interfață mobilă pentru șeful de șantier: raport zilnic, ore, consumuri, probleme, fotografii (inclusiv din camera telefonului), solicitări de materiale, confirmare etape |
| Echipe și utilaje | Calendar de planificare pe 10 săptămâni, detectare suprapuneri și conflicte cu service-ul |
| Materiale și stocuri | Catalog, stocuri, necesar pe proiect, rezervări, transferuri, comenzi către furnizori, solicitări |
| Producție proprie | Ordine de producție (porți, coșuri, locuri de joacă, împrejmuiri) cu cost estimat de fabricație |
| Atlas Intelligence | Asistent care răspunde din date (motor demonstrativ, marcat ca simulare) |
| Setări și roluri | Praguri configurabile, matrice de permisiuni, resetare date demo |

Selectorul de roluri (dreapta sus) permite testarea interfeței ca Administrator, Director general, Director
financiar, Manager de proiect, Șef de șantier sau Responsabil producție.

## Introducerea unui proiect nou

**Proiecte și contracte → Proiect nou** (rolurile Administrator, Director general, Manager de proiect):

1. **Date generale** – denumire, tip, beneficiar, județ, localitate, adresă, obiectul lucrării.
2. **Contract și echipă** – valoare fără TVA, data începerii, termen, status, responsabil, șef de șantier, echipe.
3. **Buget de execuție** – se propune din marja țintă și structura tipică de costuri a tipului de proiect; fiecare categorie se poate ajusta.
4. **Verificare** – rezumat, apoi crearea proiectului.

Se generează automat etapele de execuție, necesarul estimat de materiale și poziția pe hartă (centrul județului).
Bugetul inițial devine „cost rămas estimat”, deci profitul estimat pornește egal cu cel planificat. Proiectul apare
imediat în dashboard, hartă, control financiar și Atlas Intelligence; costurile, angajamentele și facturile se adaugă din fișa lui.

## Scenariul demo

Butonul **Scenariu demo** pornește prezentarea ghidată de ~10 minute descrisă în
[`docs/SCENARIU-DEMO.md`](docs/SCENARIU-DEMO.md). Pașii sunt reali: aprobarea solicitării modifică datele și
indicatorii se recalculează.

## Arhitectură

Vezi [`docs/ARHITECTURA.md`](docs/ARHITECTURA.md).
