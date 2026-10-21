import { Card, CardHeader, PageHeader, Badge } from '../components/ui';

const LAYERS = [
  { name: 'Client web (React + TypeScript)', items: ['Dashboard executiv, proiecte, financiar, hartă', 'Atlas Field ca PWA instalabilă, cu lucru offline', 'Componente UI comune, grafice, tabele filtrabile'], status: 'demo' },
  { name: 'API aplicație (Node.js / NestJS sau .NET)', items: ['Autentificare SSO / OIDC, sesiuni securizate', 'Autorizare pe roluri + filtrare pe proiectele alocate', 'Validare server a tuturor operațiunilor'], status: 'plan' },
  { name: 'Motor de calcul (domain/)', items: ['EAC, profit, marjă, praguri de risc', 'Reguli „Necesită atenția conducerii”', 'Același cod rulează în client (demo) și pe server'], status: 'demo' },
  { name: 'Date (PostgreSQL + stocare fișiere)', items: ['Proiecte, costuri, angajamente, facturi, stocuri', 'Jurnal de audit pentru fiecare modificare', 'Fotografii și documente în stocare obiect (S3 compatibil)'], status: 'plan' },
  { name: 'Atlas Intelligence', items: ['Demo: interogări deterministe pe date (simulare)', 'Producție: LLM cu funcții de interogare ca unelte', 'Răspunsuri cu sursa datelor, limitate de permisiunile rolului'], status: 'demo' },
  { name: 'Integrări (neimplementate)', items: ['Contabilitate (ex. Saga, WinMentor, SmartBill): facturi și costuri', 'e-Factura ANAF', 'GPS flotă, ERP furnizori'], status: 'plan' },
];

const MENU = [
  ['Conducere', 'Dashboard executiv · Atlas Intelligence'],
  ['Proiecte', 'Proiecte și contracte · Control financiar · Harta șantierelor · Jurnal de șantier · Atlas Field'],
  ['Operațiuni', 'Echipe și utilaje · Materiale și stocuri · Producție proprie'],
  ['Platformă', 'Setări și roluri · Arhitectură'],
];

const MODULES = [
  ['src/domain', 'Tipuri, calcule financiare, programare, permisiuni, alerte, motorul Atlas Intelligence. Fără dependențe de UI.'],
  ['src/data/demo', 'Date demonstrative fictive și generatorul lor determinist. Se înlocuiesc cu API-ul real.'],
  ['src/data/geo', 'Contururile județelor, precalculate la build (fără bibliotecă GIS în client).'],
  ['src/store', 'Starea aplicației și acțiunile (aprobare, raport zilnic, transfer). Punctul unde se conectează API-ul.'],
  ['src/features', 'Componente transversale: asistent, scenariu demo, solicitări, jurnal.'],
  ['src/pages', 'Ecranele aplicației, câte unul pe modul.'],
];

export function ArchitecturePage() {
  return (
    <div>
      <PageHeader eyebrow="Arhitectură" title="Cum este construită platforma" subtitle="Prototipul actual rulează integral în browser, cu date fictive. Structura este pregătită pentru a deveni produs comercial, cu server, bază de date și integrări." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Straturi" subtitle="Ce există în demo și ce este planificat" />
          <div className="space-y-3">
            {LAYERS.map((l) => (
              <div key={l.name} className="rounded-lg border border-ink-100 p-3.5">
                <div className="flex items-center justify-between gap-3"><div className="text-[13.5px] font-semibold text-ink-900">{l.name}</div><Badge tone={l.status === 'demo' ? 'brand' : 'neutral'}>{l.status === 'demo' ? 'În prototip' : 'Planificat'}</Badge></div>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[13px] text-ink-600">{l.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Structura meniului" />
            <dl className="space-y-2.5 text-[13px]">
              {MENU.map(([k, v]) => <div key={k} className="grid grid-cols-[110px_1fr] gap-3"><dt className="font-medium text-ink-900">{k}</dt><dd className="text-ink-600">{v}</dd></div>)}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Organizarea codului" />
            <dl className="space-y-2.5 text-[13px]">
              {MODULES.map(([k, v]) => <div key={k} className="grid grid-cols-[120px_1fr] gap-3"><dt className="font-mono text-[12px] text-brand-700">{k}</dt><dd className="text-ink-600">{v}</dd></div>)}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Regula de calcul" />
            <div className="space-y-1.5 rounded-lg bg-ink-50 p-3.5 font-mono text-[12px] leading-relaxed text-ink-800">
              <div>Cost total estimat = Efective + Angajate deschise + Rămase estimate</div>
              <div>Angajat deschis = Valoare angajament − Facturi legate de el</div>
              <div>Profit estimat = Venit actualizat − Cost total estimat</div>
              <div>Marjă (%) = Profit estimat / Venit actualizat × 100</div>
            </div>
            <p className="mt-2 text-[12.5px] text-ink-500">Venitul actualizat include doar actele adiționale aprobate. Manopera din rapoarte și transferurile din stoc reduc estimarea rămasă, ca să nu fie numărate de două ori.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
