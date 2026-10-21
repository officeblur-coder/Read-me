// "Proiect nou": four-step form that creates a complete project record. Stages, cost budget split
// and material needs start from the templates for the project type and stay editable afterwards.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useStore } from '../../store/store';
import type { CostCategory, Project, ProjectType } from '../../domain/types';
import { CATEGORY_LABEL, COST_CATEGORIES } from '../../domain/finance';
import { TYPE_LABEL } from '../../domain/labels';
import { fmtMoney, fmtPct, fmtRon } from '../../domain/format';
import { addDays, daysBetween } from '../../domain/dates';
import { COUNTIES } from '../../data/geo/romania';
import { unproject } from '../../components/RomaniaMap';
import { buildProjectMaterials, buildStages, COST_SPLIT } from '../../data/demo/generate';
import { Button, Input, Label, Modal, Select } from '../../components/ui';

const STEPS = ['Date generale', 'Contract și echipă', 'Buget de execuție', 'Verificare'];
const CLIENT_KINDS: Project['clientKind'][] = ['Autoritate publică', 'Unitate de învățământ', 'Club sportiv', 'Privat'];
const num = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0;

export function NewProjectWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const projects = useStore((s) => s.projects);
  const people = useStore((s) => s.people);
  const teams = useStore((s) => s.teams);
  const today = useStore((s) => s.today);
  const addProject = useStore((s) => s.addProject);
  const role = useStore((s) => s.role);
  const navigate = useNavigate();
  const managers = people.filter((p) => p.role === 'pm');
  const siteManagers = people.filter((p) => p.role === 'site');
  const counties = useMemo(() => [...COUNTIES].sort((a, b) => a.name.localeCompare(b.name, 'ro')), []);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType>('multisport');
  const [client, setClient] = useState('');
  const [clientKind, setClientKind] = useState<Project['clientKind']>('Autoritate publică');
  const [county, setCounty] = useState('Mureș');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [surface, setSurface] = useState('');
  const [contract, setContract] = useState('');
  const [start, setStart] = useState(addDays(today, 14));
  const [due, setDue] = useState(addDays(today, 104));
  const [status, setStatus] = useState<'pregatire' | 'executie'>('pregatire');
  const [managerId, setManagerId] = useState(role === 'pm' ? 'p-02' : managers[0]?.id ?? '');
  const [siteManagerId, setSiteManagerId] = useState(siteManagers[0]?.id ?? '');
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [targetMargin, setTargetMargin] = useState('18');
  const [budget, setBudget] = useState<Record<CostCategory, string> | null>(null);

  const contractValue = num(contract);
  const autoBudget = (margin: number) =>
    Object.fromEntries(COST_CATEGORIES.map((c) => [c, String(Math.round((contractValue * (1 - margin / 100) * COST_SPLIT[type][c]) / 100) * 100)])) as Record<CostCategory, string>;
  const budgetValues = budget ?? autoBudget(Number(targetMargin) || 0);
  const budgetTotal = COST_CATEGORIES.reduce((a, c) => a + num(budgetValues[c]), 0);
  const plannedProfit = contractValue - budgetTotal;

  const errors: string[][] = [
    [!name.trim() && 'denumirea', !client.trim() && 'beneficiarul', !city.trim() && 'localitatea'].filter(Boolean) as string[],
    [!contractValue && 'valoarea contractului', due <= start && 'un termen după data începerii', !managerId && 'responsabilul'].filter(Boolean) as string[],
    [budgetTotal <= 0 && 'bugetul'].filter(Boolean) as string[],
    [],
  ];
  const canNext = errors[step].length === 0;

  const reset = () => {
    setStep(0); setName(''); setClient(''); setCity(''); setAddress(''); setSurface(''); setContract('');
    setTeamIds([]); setBudget(null); setTargetMargin('18');
  };

  const create = () => {
    const shape = COUNTIES.find((c) => c.name === county)!;
    const [lng, lat] = unproject(shape.cx, shape.cy);
    const n = projects.filter((p) => p.code.startsWith('AS-26-')).map((p) => +p.code.slice(6)).reduce((a, b) => Math.max(a, b), 0) + 1;
    const id = `prj-${Date.now().toString(36)}`;
    const budgetRec = Object.fromEntries(COST_CATEGORIES.map((c) => [c, num(budgetValues[c])])) as Record<CostCategory, number>;
    const project: Project = {
      id, code: `AS-26-${String(n).padStart(3, '0')}`, name: name.trim(), type, client: client.trim(), clientKind,
      county, city: city.trim(), address: address.trim() || '—', lat: +lat.toFixed(3), lng: +lng.toFixed(3),
      contractValue, startDate: start, dueDate: due, status, managerId, siteManagerId, teamIds,
      stages: buildStages(type, 0, start, due),
      budget: budgetRec,
      etc: { ...budgetRec }, // nimic cheltuit sau comandat încă: tot bugetul este cost rămas estimat
      costs: [], commitments: [], invoices: [], changeOrders: [], photos: [],
      documents: [{ id: `${id}-d1`, name: `Contract de execuție lucrări AS-26-${String(n).padStart(3, '0')}.pdf`, kind: 'Contract', date: today, sizeKb: 0 }],
      notes: '', surface: surface.trim() || '—',
    };
    addProject(project, buildProjectMaterials(project, 0));
    reset();
    onClose();
    navigate(`/proiecte/${id}`);
  };

  const footer = (
    <>
      {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Înapoi</Button>}
      <div className="flex-1" />
      {!canNext && <span className="self-center text-[12px] text-ink-500">Completează {errors[step].join(', ')}</span>}
      {step < 3
        ? <Button variant="primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuă</Button>
        : <Button variant="primary" onClick={create}><Check size={15} /> Creează proiectul</Button>}
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Proiect nou" width="max-w-2xl" footer={footer}>
      <ol className="mb-5 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <div className={clsx('h-1 rounded-full', i <= step ? 'bg-brand-600' : 'bg-ink-100')} />
            <div className={clsx('mt-1.5 text-[11.5px]', i === step ? 'font-medium text-ink-900' : 'text-ink-400')}>{s}</div>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Denumire proiect</Label><Input id="np-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Teren multisport cu gazon sintetic" /></div>
          <div><Label>Tip proiect</Label><Select id="np-type" className="w-full" value={type} onChange={(e) => { setType(e.target.value as ProjectType); setBudget(null); }}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></div>
          <div><Label>Tip beneficiar</Label><Select id="np-ckind" className="w-full" value={clientKind} onChange={(e) => setClientKind(e.target.value as Project['clientKind'])}>{CLIENT_KINDS.map((k) => <option key={k}>{k}</option>)}</Select></div>
          <div className="sm:col-span-2"><Label>Beneficiar</Label><Input id="np-client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Ex.: Primăria Comunei …" /></div>
          <div><Label>Județ</Label><Select id="np-county" className="w-full" value={county} onChange={(e) => setCounty(e.target.value)}>{counties.map((c) => <option key={c.name}>{c.name}</option>)}</Select></div>
          <div><Label>Localitate</Label><Input id="np-city" value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Adresă</Label><Input id="np-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Opțional" /></div>
          <div className="sm:col-span-2"><Label hint="dimensiuni, suprafață, dotări">Obiectul lucrării</Label><Input id="np-surface" value={surface} onChange={(e) => setSurface(e.target.value)} placeholder="Ex.: Gazon multisport 40 mm, 800 m², împrejmuire 4 m" /></div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label hint="lei, fără TVA">Valoare contract</Label><Input id="np-contract" inputMode="numeric" value={contract} onChange={(e) => { setContract(e.target.value); setBudget(null); }} placeholder="0" /></div>
          <div><Label>Data începerii</Label><Input id="np-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label hint={due > start ? `${daysBetween(start, due)} zile` : undefined}>Termen contractual</Label><Input id="np-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          <div><Label>Status</Label><Select id="np-status" className="w-full" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="pregatire">În pregătire</option><option value="executie">În execuție</option></Select></div>
          <div><Label>Responsabil proiect</Label><Select id="np-pm" className="w-full" value={managerId} onChange={(e) => setManagerId(e.target.value)}>{managers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
          <div className="sm:col-span-2"><Label>Șef de șantier</Label><Select id="np-site" className="w-full" value={siteManagerId} onChange={(e) => setSiteManagerId(e.target.value)}>{siteManagers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
          <div className="sm:col-span-2">
            <Label hint="planificarea pe perioade se face în Echipe și utilaje">Echipe propuse</Label>
            <div className="flex flex-wrap gap-2">
              {teams.map((t) => {
                const on = teamIds.includes(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => setTeamIds(on ? teamIds.filter((x) => x !== t.id) : [...teamIds, t.id])}
                    className={clsx('rounded-lg border px-3 py-1.5 text-[13px]', on ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50')}>
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40"><Label hint="%">Marjă țintă</Label><Input id="np-margin" inputMode="numeric" value={targetMargin} onChange={(e) => { setTargetMargin(e.target.value); setBudget(null); }} /></div>
            <p className="flex-1 text-[12.5px] text-ink-500">Bugetul se împarte pe categorii după structura tipică a unui proiect de tip „{TYPE_LABEL[type].toLowerCase()}”. Poți ajusta fiecare categorie.</p>
          </div>
          <div className="divide-y divide-ink-100 rounded-lg border border-ink-100">
            {COST_CATEGORIES.map((c) => (
              <div key={c} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-[13px] text-ink-700">{CATEGORY_LABEL[c]}</span>
                <div className="w-40 shrink-0">
                  <Input id={`np-b-${c}`} inputMode="numeric" className="text-right tabular-nums" value={budgetValues[c]}
                    onChange={(e) => setBudget({ ...budgetValues, [c]: e.target.value })} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-ink-50 p-3 text-[13px]">
            <div><div className="text-ink-500">Buget de execuție</div><div className="font-semibold tabular-nums">{fmtRon(budgetTotal)}</div></div>
            <div><div className="text-ink-500">Profit planificat</div><div className={clsx('font-semibold tabular-nums', plannedProfit < 0 && 'text-risk-600')}>{fmtRon(plannedProfit)}</div></div>
            <div><div className="text-ink-500">Marjă planificată</div><div className="font-semibold tabular-nums">{contractValue ? fmtPct((plannedProfit / contractValue) * 100) : '—'}</div></div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 text-[13px]">
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {[
              ['Proiect', `${name} (${TYPE_LABEL[type]})`],
              ['Beneficiar', `${client} · ${clientKind}`],
              ['Amplasament', `${city}, jud. ${county}`],
              ['Valoare contract', fmtMoney(contractValue)],
              ['Perioadă', `${start} → ${due}`],
              ['Responsabil', people.find((p) => p.id === managerId)?.name ?? '—'],
              ['Buget de execuție', fmtMoney(budgetTotal)],
              ['Marjă planificată', contractValue ? fmtPct((plannedProfit / contractValue) * 100) : '—'],
            ].map(([k, v]) => <div key={k}><dt className="text-ink-500">{k}</dt><dd className="font-medium text-ink-900">{v}</dd></div>)}
          </dl>
          <div className="rounded-lg border border-ink-100 p-3 text-[12.5px] leading-relaxed text-ink-600">
            Se generează automat: etapele de execuție pentru tipul de proiect, cu termene repartizate între data începerii și termen;
            necesarul de materiale estimat după valoarea contractului; poziția pe hartă la nivel de județ.
            Toate se pot corecta în fișa proiectului. Proiectul apare imediat în dashboard, hartă și Atlas Intelligence.
          </div>
        </div>
      )}
    </Modal>
  );
}
