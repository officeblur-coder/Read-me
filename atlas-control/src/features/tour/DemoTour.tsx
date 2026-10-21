// Guided, fully interactive presentation scenario. Each step navigates to the real screen;
// progress is detected from application state (e.g. the request was actually approved).
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Check, ChevronLeft, ChevronRight, X, PlayCircle, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/store';
import { useRow, useTotals } from '../../store/derived';
import { SCENARIO_PROJECT_ID } from '../../data/demo/projects';
import { fmtMoney, fmtPct } from '../../domain/format';
import { askAtlas } from '../intelligence/Chat';

interface Step {
  title: string;
  body: string;
  go?: string;
  action?: () => void;
  actionLabel?: string;
  done?: (ctx: { path: string; search: string; approved: boolean }) => boolean;
}

const P = `/proiecte/${SCENARIO_PROJECT_ID}`;

export function DemoTour() {
  const tour = useStore((s) => s.tour);
  const setTour = useStore((s) => s.setTour);
  const snapshots = useStore((s) => s.snapshots);
  const setSnapshot = useStore((s) => s.setSnapshot);
  const approved = useStore((s) => s.requests.find((r) => r.id === 'req-01')?.status === 'aprobata');
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);
  const totals = useTotals();
  const row = useRow(SCENARIO_PROJECT_ID);
  const navigate = useNavigate();
  const loc = useLocation();

  // Capture "before" figures once, so step 6 can show what changed.
  useEffect(() => {
    if (tour.open && snapshots.profitBefore === undefined && !approved && row) {
      setSnapshot('profitBefore', totals.profit);
      setSnapshot('marginBefore', row.fin.margin);
      setSnapshot('eacBefore', row.fin.eac);
    }
  }, [tour.open, snapshots.profitBefore, approved, row, totals.profit, setSnapshot]);

  if (!tour.open) return null;

  const steps: Step[] = [
    {
      title: 'Situația companiei', go: '/',
      body: 'Directorul deschide dashboard-ul: valoarea contractelor active, facturare, încasări, costuri bugetate față de cele estimate, profit și marjă, toate calculate din fișele proiectelor.',
      done: (c) => c.path === '/',
    },
    {
      title: 'Sistemul evidențiază un risc', go: '/',
      body: 'În „Necesită atenția conducerii”, Ocna Mureș apare cu trei semnale convergente: costul estimat la finalizare depășește bugetul, șeful de șantier a raportat o problemă critică și există o solicitare de materiale nesoluționată. Totul este generat automat din date și praguri.',
    },
    {
      title: 'Sursa costurilor suplimentare', go: `${P}?tab=financiar`,
      body: 'În fișa financiară, tabelul pe categorii arată abaterile: subcontractori și utilaje. Costurile efective includ excavația și stabilizarea stratului argilos din zona de est.',
      done: (c) => c.path === P && c.search.includes('financiar'),
    },
    {
      title: 'Fotografii și raportul din șantier', go: `${P}?tab=jurnal`,
      body: 'Jurnalul de șantier conține raportul din 20 octombrie al șefului de șantier, cu problema critică (apă stagnantă) și fotografiile aferente.',
      done: (c) => c.path === P && c.search.includes('jurnal'),
    },
    {
      title: 'Aprobarea solicitării de materiale', go: `${P}?tab=materiale`,
      body: 'Solicitarea REQ-01 pentru drenaj suplimentar arată valoarea, partea deja inclusă în estimare și impactul net asupra profitului. Apasă „Aprobă” pentru a o aproba.',
      done: (c) => c.approved,
    },
    {
      title: 'Dashboard-ul se actualizează', go: '/',
      body: 'Aprobarea a creat un angajament de cost, a redus estimarea rămasă cu partea deja bugetată și a emis o comandă către furnizor. Indicatorii se recalculează imediat.',
    },
    {
      title: 'Întrebare către Atlas Intelligence',
      body: 'Directorul întreabă ce alte proiecte prezintă riscuri.',
      action: () => askAtlas('Ce alte proiecte prezintă riscuri?'), actionLabel: 'Întreabă acum',
    },
    {
      title: 'Răspuns fundamentat pe date',
      body: 'Răspunsul listează proiectele din zonele roșie și galbenă, cu motivele calculate (marjă, depășire, întârziere) și link către fiecare fișă. Nicio cifră nu este generată în afara datelor din platformă.',
    },
  ];

  const i = Math.min(tour.step, steps.length - 1);
  const step = steps[i];
  const ctx = { path: loc.pathname, search: loc.search, approved };
  const go = (n: number) => {
    const s = steps[n];
    setTour({ step: n });
    if (role === 'site' || role === 'production' || role === 'pm') setRole('ceo');
    if (s.go) navigate(s.go);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[45] sm:left-auto sm:right-6 sm:w-[380px] lg:bottom-6">
      <div className="animate-fade-up overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop">
        <div className="flex items-center justify-between bg-brand-950 px-4 py-3 text-white">
          <div className="flex items-center gap-2 text-[13px] font-medium"><PlayCircle size={16} className="text-lime-400" /> Scenariu demo · conducere</div>
          <button onClick={() => setTour({ open: false })} className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Închide"><X size={16} /></button>
        </div>
        <div className="flex gap-1 px-4 pt-3">
          {steps.map((_, n) => (
            <button key={n} onClick={() => go(n)} className={clsx('h-1.5 flex-1 rounded-full transition-colors', n < i ? 'bg-brand-500' : n === i ? 'bg-lime-500' : 'bg-ink-100')} aria-label={`Pasul ${n + 1}`} />
          ))}
        </div>
        <div className="px-4 pb-4 pt-3">
          <div className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">Pasul {i + 1} din {steps.length}</div>
          <div className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-ink-900">
            {step.title}
            {step.done?.(ctx) && <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white"><Check size={12} strokeWidth={3} /></span>}
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{step.body}</p>

          {i === 5 && snapshots.profitBefore !== undefined && row && (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-ink-50 p-3 text-[12px]">
              <div>
                <div className="text-ink-500">Profit portofoliu</div>
                <div className="font-medium tabular-nums text-ink-900">{fmtMoney(snapshots.profitBefore)} <ArrowRight size={11} className="inline text-ink-400" /> {fmtMoney(totals.profit)}</div>
              </div>
              <div>
                <div className="text-ink-500">Marjă Ocna Mureș</div>
                <div className="font-medium tabular-nums text-ink-900">{fmtPct(snapshots.marginBefore)} <ArrowRight size={11} className="inline text-ink-400" /> {fmtPct(row.fin.margin)}</div>
              </div>
              {!approved && <div className="col-span-2 text-warn-700">Solicitarea nu a fost încă aprobată (pasul 5).</div>}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button disabled={i === 0} onClick={() => go(i - 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50 disabled:opacity-40" aria-label="Înapoi"><ChevronLeft size={16} /></button>
            {step.go && !step.done?.(ctx) && loc.pathname + loc.search !== step.go && (
              <button onClick={() => navigate(step.go!)} className="h-9 flex-1 rounded-lg border border-brand-600 px-3 text-[13px] font-medium text-brand-700 hover:bg-brand-50">Deschide ecranul</button>
            )}
            {step.action && (
              <button onClick={step.action} className="h-9 flex-1 rounded-lg border border-brand-600 px-3 text-[13px] font-medium text-brand-700 hover:bg-brand-50">{step.actionLabel}</button>
            )}
            {i < steps.length - 1 ? (
              <button onClick={() => go(i + 1)} className="ml-auto inline-flex h-9 items-center gap-1 rounded-lg bg-brand-600 px-3.5 text-[13px] font-medium text-white hover:bg-brand-700">Următorul <ChevronRight size={15} /></button>
            ) : (
              <button onClick={() => setTour({ open: false, step: 0 })} className="ml-auto h-9 rounded-lg bg-ink-900 px-3.5 text-[13px] font-medium text-white">Încheie</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
