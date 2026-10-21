// Atlas Field — mobile interface for site managers. On desktop it is shown inside a device frame,
// on phones it fills the screen. Every submission goes through the same store actions as the
// central platform, so the dashboard updates immediately.
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  ChevronLeft, ClipboardList, PackagePlus, CheckSquare, Camera, MapPin, Plus, Minus, Trash2, Send, CheckCircle2,
  AlertOctagon, AlertTriangle, Info, ImagePlus, Signal, Wifi, BatteryFull,
} from 'lucide-react';
import { useStore } from '../store/store';
import { useRows, useRole } from '../store/derived';
import type { Issue, PhotoStage, SitePhoto as Photo } from '../domain/types';
import { SitePhoto } from '../components/SitePhoto';
import { fmtDate, fmtNum, fmtPct, fmtRon } from '../domain/format';
import { physicalProgress } from '../domain/finance';

type Screen = 'sites' | 'home' | 'report' | 'request' | 'stages' | 'done';

export function FieldPage() {
  const role = useRole();
  const people = useStore((s) => s.people);
  const siteManagers = people.filter((p) => p.role === 'site');
  const [managerId, setManagerId] = useState(role.id === 'site' ? role.userId : 'p-06');
  const me = people.find((p) => p.id === managerId)!;

  return (
    <div className="px-0 pb-10 sm:px-6 sm:pt-6 lg:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-col items-start gap-10 lg:flex-row">
        <div className="hidden max-w-sm flex-1 pt-6 lg:block">
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-600">Atlas Field</div>
          <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-0.02em] text-ink-900">Aplicația șefului de șantier</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-600">Interfață pentru telefon: raport zilnic, fotografii, ore lucrate, consumuri, probleme tehnice, solicitări de materiale și confirmarea etapelor.</p>
          <div className="mt-6 space-y-3 text-[13px] text-ink-600">
            <Flow n={1} title="Raportul zilnic">actualizează progresul etapelor și progresul fizic al proiectului.</Flow>
            <Flow n={2} title="Orele lucrate">devin cost efectiv de manoperă și se scad din costul estimat rămas.</Flow>
            <Flow n={3} title="Consumurile">actualizează gestiunea materialelor pe proiect.</Flow>
            <Flow n={4} title="Problemele critice">apar în „Necesită atenția conducerii”.</Flow>
            <Flow n={5} title="Solicitările">ajung la aprobare, cu impactul asupra profitului calculat.</Flow>
          </div>
          {role.id !== 'site' && (
            <div className="mt-6 rounded-xl border border-ink-200 bg-white p-4">
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Simulează ca șef de șantier</label>
              <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="h-9 w-full rounded-lg border border-ink-200 px-2 text-sm">
                {siteManagers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <p className="mt-6 text-[12px] text-ink-400">Simulare: în producție, Atlas Field rulează ca aplicație web instalabilă (PWA) cu lucru offline și sincronizare. Nu se colectează locația GPS.</p>
        </div>
        <div className="w-full lg:w-auto">
          <PhoneFrame>
            <FieldApp key={managerId} managerId={managerId} name={me.name} />
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
}

function Flow({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-[12px] font-semibold text-brand-700">{n}</span>
      <div><span className="font-medium text-ink-900">{title}</span> {children}</div>
    </div>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full sm:w-[390px] sm:rounded-[44px] sm:border-[10px] sm:border-ink-900 sm:bg-ink-900 sm:shadow-pop">
      <div className="relative flex h-[calc(100dvh-64px)] flex-col overflow-hidden bg-[#f4f5f2] sm:h-[780px] sm:rounded-[34px]">
        <div className="hidden h-9 shrink-0 items-center justify-between bg-brand-950 px-6 text-[12px] font-semibold text-white sm:flex">
          <span>08:42</span>
          <span className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-ink-900" />
          <span className="flex items-center gap-1"><Signal size={13} /><Wifi size={13} /><BatteryFull size={15} /></span>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldApp({ managerId, name }: { managerId: string; name: string }) {
  const rows = useRows();
  const mySites = rows.filter((r) => r.project.siteManagerId === managerId && r.project.status !== 'finalizat');
  const [screen, setScreen] = useState<Screen>('sites');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; lines: string[] } | null>(null);
  const site = mySites.find((r) => r.project.id === siteId);

  const back = () => setScreen(screen === 'home' ? 'sites' : 'home');

  return (
    <>
      <div className="shrink-0 bg-brand-950 px-4 pb-4 pt-3 text-white">
        <div className="flex items-center gap-2">
          {screen !== 'sites' && screen !== 'done' && <button onClick={back} className="-ml-1 rounded p-1 text-white/80 hover:bg-white/10" aria-label="Înapoi"><ChevronLeft size={20} /></button>}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-lime-400">Atlas Field</div>
            <div className="truncate text-[15px] font-semibold">
              {screen === 'sites' ? `Bună dimineața, ${name.split(' ')[0]}` : screen === 'report' ? 'Raport zilnic' : screen === 'request' ? 'Solicitare materiale' : screen === 'stages' ? 'Confirmare etape' : site?.project.city}
            </div>
          </div>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/70">Demo</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {screen === 'sites' && (
          <div className="space-y-3 p-4">
            <div className="text-[12.5px] text-ink-500">Șantierele tale ({mySites.length})</div>
            {mySites.map((r) => (
              <button key={r.project.id} onClick={() => { setSiteId(r.project.id); setScreen('home'); }} className="w-full overflow-hidden rounded-2xl bg-white text-left shadow-card active:scale-[0.99]">
                {r.project.photos[0] && <SitePhoto stage={r.project.photos[0].stage} seed={r.project.photos[0].seed} dataUrl={r.project.photos[0].dataUrl} className="h-24 w-full" label={false} />}
                <div className="p-3.5">
                  <div className="text-[15px] font-semibold text-ink-900">{r.project.city}</div>
                  <div className="truncate text-[12.5px] text-ink-500">{r.project.name}</div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-ink-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${r.sched.progress}%` }} /></div>
                    <span className="text-[12px] font-medium tabular-nums text-ink-700">{Math.round(r.sched.progress)}%</span>
                  </div>
                </div>
              </button>
            ))}
            {!mySites.length && <div className="rounded-xl bg-white p-6 text-center text-[13px] text-ink-500">Niciun șantier activ alocat.</div>}
          </div>
        )}
        {screen === 'home' && site && (
          <div className="space-y-4 p-4">
            <div className="rounded-2xl bg-white p-4 shadow-card">
              <div className="flex items-center gap-1.5 text-[12px] text-ink-500"><MapPin size={12} />{site.project.address}, {site.project.city}</div>
              <div className="mt-1 text-[15px] font-semibold text-ink-900">{site.project.name}</div>
              <div className="mt-3 flex items-end justify-between">
                <div><div className="text-[11.5px] text-ink-500">Progres fizic</div><div className="text-[24px] font-semibold tabular-nums">{fmtPct(site.sched.progress)}</div></div>
                <div className="text-right text-[11.5px] text-ink-500">Termen<br /><span className="text-[13px] font-medium text-ink-900">{fmtDate(site.project.dueDate)}</span></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Tile icon={ClipboardList} label="Raport zilnic" sub="Progres, ore, consum" onClick={() => setScreen('report')} primary />
              <Tile icon={PackagePlus} label="Solicită materiale" sub="Către aprovizionare" onClick={() => setScreen('request')} />
              <Tile icon={CheckSquare} label="Confirmă etape" sub={`${site.project.stages.filter((s) => s.progress >= 100).length}/${site.project.stages.length} finalizate`} onClick={() => setScreen('stages')} />
              <Tile icon={Camera} label="Fotografii" sub={`${site.project.photos.length} în proiect`} onClick={() => setScreen('report')} />
            </div>
          </div>
        )}
        {screen === 'report' && site && (
          <ReportForm projectId={site.project.id} managerId={managerId} onDone={(r) => { setResult(r); setScreen('done'); }} />
        )}
        {screen === 'request' && site && (
          <RequestForm projectId={site.project.id} managerId={managerId} onDone={(r) => { setResult(r); setScreen('done'); }} />
        )}
        {screen === 'stages' && site && <StagesScreen projectId={site.project.id} managerId={managerId} />}
        {screen === 'done' && result && (
          <div className="flex flex-col items-center p-6 pt-12 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-50"><CheckCircle2 size={34} className="text-brand-600" /></span>
            <div className="mt-4 text-[18px] font-semibold text-ink-900">{result.title}</div>
            <ul className="mt-4 w-full space-y-2 text-left">
              {result.lines.map((l) => <li key={l} className="rounded-xl bg-white px-3.5 py-2.5 text-[13px] text-ink-700 shadow-card">{l}</li>)}
            </ul>
            <button onClick={() => setScreen('home')} className="mt-6 h-11 w-full rounded-xl bg-brand-600 text-[14px] font-semibold text-white">Înapoi la șantier</button>
            <Link to={`/proiecte/${siteId}?tab=jurnal`} className="mt-3 text-[13px] font-medium text-brand-700">Vezi în platforma centrală</Link>
          </div>
        )}
      </div>
    </>
  );
}

function Tile({ icon: Icon, label, sub, onClick, primary }: { icon: typeof Camera; label: string; sub: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} className={clsx('flex flex-col items-start rounded-2xl p-4 text-left shadow-card active:scale-[0.98]', primary ? 'bg-brand-600 text-white' : 'bg-white')}>
      <Icon size={22} className={primary ? 'text-lime-300' : 'text-brand-600'} />
      <div className={clsx('mt-3 text-[14px] font-semibold', primary ? 'text-white' : 'text-ink-900')}>{label}</div>
      <div className={clsx('text-[11.5px]', primary ? 'text-white/70' : 'text-ink-500')}>{sub}</div>
    </button>
  );
}

const Section = ({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) => (
  <div className="rounded-2xl bg-white p-4 shadow-card">
    <div className="mb-3 flex items-baseline justify-between"><div className="text-[13.5px] font-semibold text-ink-900">{title}</div>{hint && <div className="text-[11px] text-ink-400">{hint}</div>}</div>
    {children}
  </div>
);

function Stepper({ value, onChange, step = 1, min = 0 }: { value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(min, value - step))} className="grid h-9 w-9 place-items-center rounded-lg bg-ink-100 text-ink-700" aria-label="Scade"><Minus size={16} /></button>
      <input value={value} onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))} inputMode="numeric" className="h-9 w-16 rounded-lg border border-ink-200 text-center text-[14px] font-medium tabular-nums" />
      <button onClick={() => onChange(value + step)} className="grid h-9 w-9 place-items-center rounded-lg bg-ink-100 text-ink-700" aria-label="Crește"><Plus size={16} /></button>
    </div>
  );
}

const PHOTO_STAGES: { id: PhotoStage; label: string }[] = [
  { id: 'excavatie', label: 'Terasamente' }, { id: 'drenaj', label: 'Drenaj' }, { id: 'fundatie', label: 'Fundație' },
  { id: 'imprejmuire', label: 'Împrejmuire' }, { id: 'suprafata', label: 'Suprafață' }, { id: 'apa', label: 'Problemă apă' }, { id: 'joaca', label: 'Echipamente' },
];

function ReportForm({ projectId, managerId, onDone }: { projectId: string; managerId: string; onDone: (r: { title: string; lines: string[] }) => void }) {
  const project = useStore((s) => s.projects.find((p) => p.id === projectId))!;
  const pms = useStore((s) => s.projectMaterials).filter((x) => x.projectId === projectId && x.transferred > 0);
  const materials = useStore((s) => s.materials);
  const teams = useStore((s) => s.teams);
  const today = useStore((s) => s.today);
  const submit = useStore((s) => s.submitReport);
  const team = teams.find((t) => t.leadId === managerId) ?? teams.find((t) => project.teamIds.includes(t.id));
  const rate = team ? team.dailyCost / (team.memberIds.length * 8) : 54;

  const [weather, setWeather] = useState('Senin, 12 °C');
  const [workers, setWorkers] = useState(team?.memberIds.length ?? 5);
  const [hours, setHours] = useState((team?.memberIds.length ?? 5) * 8);
  const [activities, setActivities] = useState('');
  const active = project.stages.filter((s) => s.progress < 100);
  const [stages, setStages] = useState<Record<string, number>>(Object.fromEntries(active.slice(0, 3).map((s) => [s.id, s.progress])));
  const [used, setUsed] = useState<Record<string, number>>({});
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueText, setIssueText] = useState('');
  const [issueSev, setIssueSev] = useState<Issue['severity']>('majora');
  const [photos, setPhotos] = useState<Omit<Photo, 'id'>[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const before = physicalProgress(project);
  const after = useMemo(() => physicalProgress({ ...project, stages: project.stages.map((s) => (stages[s.id] !== undefined ? { ...s, progress: Math.max(s.progress, stages[s.id]) } : s)) }), [project, stages]);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 4)) {
      const dataUrl = await compress(f);
      setPhotos((p) => [...p, { date: today, stage: 'fundatie', seed: Date.now() % 1000, caption: activities.slice(0, 60) || 'Fotografie din șantier', dataUrl }]);
    }
  };

  const send = () => {
    const stageUpdates = Object.entries(stages).map(([stageId, progress]) => ({ stageId, progress }));
    const mats = Object.entries(used).filter(([, q]) => q > 0).map(([materialId, qty]) => ({ materialId, qty }));
    submit({
      projectId, date: today, authorId: managerId, weather, workers, hours,
      activities: activities || 'Lucrări conform graficului.', stageUpdates, materials: mats, issues,
    }, photos.map((p) => ({ ...p, caption: p.caption === 'Fotografie din șantier' && activities ? activities.slice(0, 60) : p.caption })), rate);
    onDone({
      title: 'Raport trimis conducerii',
      lines: [
        `Progres fizic: ${fmtPct(before)} → ${fmtPct(after)}`,
        `Manoperă înregistrată: ${hours} ore = ${fmtRon(hours * rate)} (scăzută din estimarea rămasă)`,
        ...(mats.length ? [`Consum actualizat pentru ${mats.length} materiale`] : []),
        ...(issues.length ? [`${issues.length} probleme raportate${issues.some((i) => i.severity === 'critica') ? ', inclusiv una critică — apare în dashboard' : ''}`] : []),
        ...(photos.length ? [`${photos.length} fotografii atașate`] : []),
      ],
    });
  };

  return (
    <div className="space-y-3 p-4">
      <Section title="Condiții" hint={fmtDate(today)}>
        <div className="grid grid-cols-3 gap-2">
          {['Senin, 12 °C', 'Înnorat, 10 °C', 'Ploaie, 8 °C'].map((w) => (
            <button key={w} onClick={() => setWeather(w)} className={clsx('rounded-lg border px-2 py-2 text-[12px]', weather === w ? 'border-brand-600 bg-brand-50 font-medium text-brand-700' : 'border-ink-200 text-ink-600')}>{w.split(',')[0]}</button>
          ))}
        </div>
      </Section>
      <Section title="Echipă și ore lucrate" hint={team?.name}>
        <div className="flex items-center justify-between py-1 text-[13px] text-ink-700">Oameni pe șantier <Stepper value={workers} onChange={(v) => { setWorkers(v); setHours(v * 8); }} /></div>
        <div className="mt-2 flex items-center justify-between py-1 text-[13px] text-ink-700">Ore totale <Stepper value={hours} onChange={setHours} step={4} /></div>
        <div className="mt-2 text-[11.5px] text-ink-400">Cost manoperă estimat: {fmtRon(hours * rate)}</div>
      </Section>
      <Section title="Progres pe etape" hint={`${fmtPct(before)} → ${fmtPct(after)}`}>
        <div className="space-y-3">
          {active.map((s) => (
            <div key={s.id}>
              <div className="flex justify-between text-[12.5px]"><span className="text-ink-700">{s.name}</span><span className="font-medium tabular-nums">{stages[s.id] ?? s.progress}%</span></div>
              <input type="range" min={s.progress} max={100} step={5} value={stages[s.id] ?? s.progress} onChange={(e) => setStages({ ...stages, [s.id]: +e.target.value })} className="w-full accent-brand-600" />
            </div>
          ))}
        </div>
      </Section>
      <Section title="Activități desfășurate">
        <textarea value={activities} onChange={(e) => setActivities(e.target.value)} rows={3} placeholder="Ex.: Montaj drenaj pe latura de est, 120 m" className="w-full rounded-lg border border-ink-200 p-2.5 text-[13.5px] focus:border-brand-500 focus:outline-none" />
      </Section>
      {pms.length > 0 && (
        <Section title="Materiale consumate" hint="din cele aflate pe șantier">
          <div className="space-y-2">
            {pms.slice(0, 6).map((pm) => {
              const m = materials.find((x) => x.id === pm.materialId)!;
              const avail = Math.max(0, pm.transferred - pm.consumed);
              return (
                <div key={pm.materialId} className="flex items-center justify-between gap-2">
                  <div className="min-w-0"><div className="truncate text-[12.5px] text-ink-800">{m.name}</div><div className="text-[11px] text-ink-400">disponibil {fmtNum(avail)} {m.unit}</div></div>
                  <Stepper value={used[pm.materialId] ?? 0} onChange={(v) => setUsed({ ...used, [pm.materialId]: v })} step={m.unit === 'buc' ? 1 : 10} />
                </div>
              );
            })}
          </div>
        </Section>
      )}
      <Section title="Probleme tehnice">
        {issues.map((i, k) => (
          <div key={k} className="mb-2 flex items-start gap-2 rounded-lg bg-ink-50 px-2.5 py-2 text-[12.5px]">
            {i.severity === 'critica' ? <AlertOctagon size={14} className="mt-0.5 shrink-0 text-risk-600" /> : i.severity === 'majora' ? <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn-600" /> : <Info size={14} className="mt-0.5 shrink-0 text-ink-400" />}
            <span className="flex-1">{i.text}</span>
            <button onClick={() => setIssues(issues.filter((_, j) => j !== k))} aria-label="Șterge"><Trash2 size={14} className="text-ink-400" /></button>
          </div>
        ))}
        <div className="mb-2 grid grid-cols-3 gap-1.5">
          {(['minora', 'majora', 'critica'] as const).map((s) => (
            <button key={s} onClick={() => setIssueSev(s)} className={clsx('rounded-lg border py-1.5 text-[12px]', issueSev === s ? (s === 'critica' ? 'border-risk-500 bg-risk-50 text-risk-700' : s === 'majora' ? 'border-warn-500 bg-warn-50 text-warn-700' : 'border-ink-400 bg-ink-50 text-ink-700') : 'border-ink-200 text-ink-500')}>{s === 'minora' ? 'Minoră' : s === 'majora' ? 'Majoră' : 'Critică'}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={issueText} onChange={(e) => setIssueText(e.target.value)} placeholder="Descrie problema" className="h-9 flex-1 rounded-lg border border-ink-200 px-2.5 text-[13px]" />
          <button onClick={() => { if (issueText.trim()) { setIssues([...issues, { severity: issueSev, text: issueText.trim() }]); setIssueText(''); } }} className="h-9 rounded-lg bg-ink-900 px-3 text-[13px] font-medium text-white">Adaugă</button>
        </div>
      </Section>
      <Section title="Fotografii" hint={`${photos.length} atașate`}>
        {photos.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2">
            {photos.map((p, k) => (
              <div key={k} className="relative">
                <SitePhoto stage={p.stage} seed={p.seed} dataUrl={p.dataUrl} className="aspect-square rounded-lg" label={false} />
                <button onClick={() => setPhotos(photos.filter((_, j) => j !== k))} className="absolute right-1 top-1 rounded bg-black/50 p-0.5 text-white" aria-label="Șterge"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <button onClick={() => fileRef.current?.click()} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ink-300 text-[13px] font-medium text-ink-700"><Camera size={16} /> Fotografiază / încarcă</button>
        <div className="mt-2 text-[11.5px] text-ink-400">Sau adaugă o imagine demonstrativă:</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PHOTO_STAGES.map((s) => (
            <button key={s.id} onClick={() => setPhotos([...photos, { date: today, stage: s.id, seed: Math.floor(Math.random() * 900) + 100, caption: activities.slice(0, 60) || s.label }])} className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-[11.5px] text-ink-700"><ImagePlus size={12} />{s.label}</button>
          ))}
        </div>
      </Section>
      <button onClick={send} className="sticky bottom-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[15px] font-semibold text-white shadow-pop active:bg-brand-700"><Send size={17} /> Trimite raportul</button>
    </div>
  );
}

function RequestForm({ projectId, managerId, onDone }: { projectId: string; managerId: string; onDone: (r: { title: string; lines: string[] }) => void }) {
  const materials = useStore((s) => s.materials);
  const create = useStore((s) => s.createRequest);
  const today = useStore((s) => s.today);
  const [items, setItems] = useState<{ materialId: string; qty: number }[]>([{ materialId: 'm-05', qty: 40 }]);
  const [urgency, setUrgency] = useState<'normala' | 'ridicata' | 'critica'>('ridicata');
  const [reason, setReason] = useState('');
  const value = items.reduce((a, it) => a + it.qty * (materials.find((m) => m.id === it.materialId)?.unitCost ?? 0), 0);

  return (
    <div className="space-y-3 p-4">
      <Section title="Materiale">
        <div className="space-y-3">
          {items.map((it, k) => {
            const m = materials.find((x) => x.id === it.materialId)!;
            return (
              <div key={k} className="rounded-lg border border-ink-100 p-2.5">
                <select value={it.materialId} onChange={(e) => setItems(items.map((x, j) => (j === k ? { ...x, materialId: e.target.value } : x)))} className="h-9 w-full rounded-lg border border-ink-200 px-2 text-[13px]">
                  {materials.map((mm) => <option key={mm.id} value={mm.id}>{mm.name} ({mm.unit})</option>)}
                </select>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[12px] text-ink-500">Stoc depozit: {fmtNum(m.stock)} {m.unit}</span>
                  <Stepper value={it.qty} onChange={(v) => setItems(items.map((x, j) => (j === k ? { ...x, qty: v } : x)))} step={m.unit === 'buc' ? 1 : 10} />
                </div>
              </div>
            );
          })}
          <button onClick={() => setItems([...items, { materialId: 'm-07', qty: 100 }])} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-300 text-[13px] text-ink-700"><Plus size={14} /> Adaugă material</button>
        </div>
      </Section>
      <Section title="Urgență">
        <div className="grid grid-cols-3 gap-1.5">
          {(['normala', 'ridicata', 'critica'] as const).map((u) => (
            <button key={u} onClick={() => setUrgency(u)} className={clsx('rounded-lg border py-2 text-[12.5px]', urgency === u ? 'border-brand-600 bg-brand-50 font-medium text-brand-700' : 'border-ink-200 text-ink-600')}>{u === 'normala' ? 'Normală' : u === 'ridicata' ? 'Ridicată' : 'Critică'}</button>
          ))}
        </div>
      </Section>
      <Section title="Motiv">
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="De ce este nevoie de materiale?" className="w-full rounded-lg border border-ink-200 p-2.5 text-[13.5px] focus:border-brand-500 focus:outline-none" />
      </Section>
      <div className="rounded-xl bg-white px-4 py-3 text-[13px] text-ink-600 shadow-card">Valoare estimată: <span className="font-semibold text-ink-900">{fmtRon(value)}</span></div>
      <button
        disabled={!reason.trim() || !items.length}
        onClick={() => {
          create({ projectId, requestedBy: managerId, date: today, urgency, reason, items, category: 'materiale', supplier: materials.find((m) => m.id === items[0].materialId)?.supplier ?? '—', coveredByEstimate: 0 });
          onDone({ title: 'Solicitare trimisă', lines: [`Valoare estimată ${fmtRon(value)}`, 'A ajuns în lista de aprobări a conducerii și în jurnalul de șantier', 'Vei fi notificat la aprobare (simulare)'] });
        }}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[15px] font-semibold text-white disabled:bg-ink-300"
      ><Send size={17} /> Trimite solicitarea</button>
    </div>
  );
}

function StagesScreen({ projectId, managerId }: { projectId: string; managerId: string }) {
  const project = useStore((s) => s.projects.find((p) => p.id === projectId))!;
  const confirm = useStore((s) => s.confirmStage);
  return (
    <div className="space-y-2.5 p-4">
      {project.stages.map((s) => (
        <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card">
          {s.progress >= 100 ? <CheckCircle2 size={22} className="shrink-0 text-brand-600" /> : <span className="h-[22px] w-[22px] shrink-0 rounded-full border-2 border-ink-200" />}
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-medium text-ink-900">{s.name}</div>
            <div className="text-[11.5px] text-ink-500">{s.progress >= 100 ? `Confirmată ${s.confirmedAt ? fmtDate(s.confirmedAt) : ''}` : `${s.progress}% realizat`}</div>
          </div>
          {s.progress < 100 && s.progress >= 50 && (
            <button onClick={() => confirm(projectId, s.id, managerId)} className="h-9 rounded-lg bg-brand-600 px-3 text-[12.5px] font-semibold text-white">Confirmă</button>
          )}
        </div>
      ))}
      <p className="px-1 pt-1 text-[11.5px] text-ink-400">Confirmarea este disponibilă pentru etapele realizate în proporție de cel puțin 50%.</p>
    </div>
  );
}

async function compress(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}
