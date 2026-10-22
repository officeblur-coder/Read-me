# ContaPilot AI

Asistent pentru contabili din România: verifică balanța, reconciliază extrasele și redactează note contabile. Regulile calculează, AI-ul explică, contabilul aprobă.

| Fișier | Conținut |
|---|---|
| [`demo/contapilot-demo.html`](demo/contapilot-demo.html) | Demo interactiv: panou de lucru, audit balanță, reconciliere bancară, generator de note, Copilot (Ctrl K), temă light/dark |
| [`docs/ARHITECTURA.md`](docs/ARHITECTURA.md) | Arhitectură, motor de reguli, rolul AI, securitate/GDPR, module, fluxuri, plan pe faze, riscuri |
| [`db/schema.sql`](db/schema.sql) | Schema PostgreSQL 16 cu Row-Level Security per cabinet (testată cu `psql`) |

## Demo

Deschide `demo/contapilot-demo.html` în browser. Toate datele sunt fictive.

- Balanța firmei-exemplu (Atelier Nord Mobilier SRL, septembrie 2026) se calculează în browser din solduri inițiale și 37 de înregistrări. Constatările rezultă din aceleași date: casă cu sold creditor, TVA colectată lipsă, factură dublă, amortizare lipsă.
- Reconcilierea bancară explică integral diferența dintre extras și contul 5121.
- Generatorul de note folosește reguli deterministe (cote 21%/11%, plafon numerar 5.000 lei, prag mijloc fix 2.500 lei, deducere TVA 50% la vehicule cu folosință mixtă, taxare inversă). În produs, un LLM extrage doar structura textului; conturile și sumele vin din reguli.
- Copilotul răspunde la 5 întrebări-tip cu cifre calculate și surse. În produs, răspunsurile vin din unelte read-only pe datele importate.

Ce nu face demo-ul: nu salvează nimic, nu încarcă efectiv fișierele (zona de import doar recunoaște tipul după nume), nu apelează niciun serviciu extern.
