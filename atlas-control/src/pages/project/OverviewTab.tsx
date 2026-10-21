import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/store';
import { usePermission } from '../../store/derived';
import type { ProjectRow } from '../../domain/portfolio';
import { Card, CardHeader, KV, Progress, Flash } from '../../components/ui';
import { SitePhoto } from '../../components/SitePhoto';
import { RomaniaMap } from '../../components/RomaniaMap';
import { fmtDate, fmtDateShort, fmtMoney, fmtPct } from '../../domain/format';

export function OverviewTab({ row }: { row: ProjectRow }) {
  const p = row.project;
  const { fin, sched, risk } = row;
  const people = useStore((s) => s.people);
  const teams = useStore((s) => s.teams);
  const reports = useStore((s) => s.reports);
  const canFinance = usePermission('finance.view');
  const name = (id: string) => people.find((x) => x.id === id)?.name ?? '—';
  const lastReport = reports.find((r) => r.projectId === p.id);
  const photo = p.photos[0];

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        {risk.reasons.length > 0 && p.status !== 'finalizat' && (
          <div className={clsx('flex items-start gap-3 rounded-xl border px-4 py-3', risk.level === 'risk' ? 'border-risk-100 bg-risk-50' : 'border-warn-100 bg-warn-50')}>
            <AlertTriangle size={18} className={clsx('mt-0.5 shrink-0', risk.level === 'risk' ? 'text-risk-600' : 'text-warn-600')} />
            <div className="text-[13px]">
              <div className={clsx('font-semibold', risk.level === 'risk' ? 'text-risk-700' : 'text-warn-700')}>{risk.level === 'risk' ? 'Proiect în zona roșie' : 'Proiect cu risc'}</div>
              <div className="mt-0.5 text-ink-700">{risk.reasons.join(' · ')}</div>
              {canFinance && <Link to="?tab=financiar" className="mt-1 inline-flex items-center gap-1 font-medium text-ink-900 hover:underline">Analizează sursa costurilor <ArrowRight size={13} /></Link>}
            </div>
          </div>
        )}

        <Card>
          <CardHeader title="Fișa proiectului" />
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <KV label="Beneficiar">{p.client}</KV>
            <KV label="Tip beneficiar">{p.clientKind}</KV>
            <KV label="Adresă">{p.address}, {p.city}, jud. {p.county}</KV>
            <KV label="Valoare contract (fără TVA)">{fmtMoney(p.contractValue)}</KV>
            <KV label="Data începerii">{fmtDate(p.startDate)}</KV>
            <KV label="Termen contractual">{fmtDate(p.dueDate)}</KV>
            <KV label="Responsabil proiect">{name(p.managerId)}</KV>
            <KV label="Șef de șantier">{name(p.siteManagerId)}</KV>
            <KV label="Echipe alocate">{p.teamIds.map((t) => teams.find((x) => x.id === t)?.name).join(', ') || '—'}</KV>
            <KV label="Suprafață / obiect" className="sm:col-span-2 lg:col-span-3">{p.surface}</KV>
          </div>
        </Card>

        {canFinance && (
          <Card>
            <CardHeader title="Situație financiară" subtitle="Cost total estimat = efective + angajate neincluse în efective + rămase estimate" action={<Link to="?tab=financiar" className="text-[13px] font-medium text-brand-700 hover:underline">Detalii</Link>} />
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
              <KV label="Buget aprobat">{fmtMoney(fin.budget)}</KV>
              <KV label="Costuri reale (efective)"><Flash value={fin.actual}>{fmtMoney(fin.actual)}</Flash></KV>
              <KV label="Costuri angajate"><Flash value={fin.committedOpen}>{fmtMoney(fin.committedOpen)}</Flash></KV>
              <KV label="Rămase estimate"><Flash value={fin.etc}>{fmtMoney(fin.etc)}</Flash></KV>
              <KV label="Cost estimat la finalizare"><Flash value={fin.eac}>{fmtMoney(fin.eac)}</Flash></KV>
              <KV label="Venit actualizat">{fmtMoney(fin.revenue)}</KV>
              <KV label="Profit estimat la final"><span className={fin.profit < 0 ? 'text-risk-600' : ''}><Flash value={fin.profit}>{fmtMoney(fin.profit)}</Flash></span></KV>
              <KV label="Marjă estimată"><span className={fin.margin < 12 ? 'text-risk-600' : ''}>{fmtPct(fin.margin)}</span> <span className="text-[12px] font-normal text-ink-400">plan {fmtPct(fin.plannedMargin)}</span></KV>
            </div>
            <BudgetBar fin={fin} />
          </Card>
        )}

        <Card>
          <CardHeader title="Stadiu fizic de execuție" action={<Link to="?tab=progres" className="text-[13px] font-medium text-brand-700 hover:underline">Etape</Link>} />
          <div className="flex items-end justify-between">
            <div className="text-[28px] font-semibold tabular-nums text-ink-900">{fmtPct(sched.progress)}</div>
            <div className="text-right text-[12.5px] text-ink-500">Planificat la azi: {fmtPct(sched.plannedProgress)}<br />Finalizare estimată: <span className={clsx('font-medium', sched.delayDays > 0 ? 'text-warn-700' : 'text-ink-800')}>{fmtDate(sched.forecastEnd)}</span></div>
          </div>
          <Progress value={sched.progress} marker={sched.plannedProgress} height={10} className="mt-3" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {p.stages.map((s) => (
              <div key={s.id} className="flex items-center gap-3 text-[13px]">
                {s.progress >= 100 ? <CheckCircle2 size={15} className="shrink-0 text-brand-600" /> : <span className="h-[15px] w-[15px] shrink-0 rounded-full border-2 border-ink-200" />}
                <span className="flex-1 truncate text-ink-700">{s.name}</span>
                <span className="tabular-nums text-ink-500">{s.progress}%</span>
              </div>
            ))}
          </div>
        </Card>

        {p.notes && (
          <Card>
            <CardHeader title="Observații" />
            <p className="text-[13.5px] leading-relaxed text-ink-700">{p.notes}</p>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card pad={false} className="overflow-hidden">
          {photo ? <SitePhoto stage={photo.stage} seed={photo.seed} dataUrl={photo.dataUrl} className="aspect-[16/10] w-full" /> : <div className="grid aspect-[16/10] place-items-center bg-ink-100 text-[13px] text-ink-400">Nicio fotografie încă</div>}
          {photo && <div className="px-4 py-3 text-[12.5px] text-ink-600"><span className="font-medium text-ink-900">{fmtDateShort(photo.date)}</span> · {photo.caption}</div>}
        </Card>
        {lastReport && (
          <Card>
            <CardHeader title="Ultimul raport de șantier" subtitle={`${fmtDate(lastReport.date)} · ${name(lastReport.authorId)}`} action={<Link to="?tab=jurnal" className="text-[13px] font-medium text-brand-700 hover:underline">Jurnal</Link>} />
            <p className="text-[13px] leading-relaxed text-ink-700">{lastReport.activities}</p>
            {lastReport.issues.map((i, k) => (
              <div key={k} className={clsx('mt-2 rounded-lg px-3 py-2 text-[12.5px]', i.severity === 'critica' ? 'bg-risk-50 text-risk-700' : i.severity === 'majora' ? 'bg-warn-50 text-warn-700' : 'bg-ink-50 text-ink-600')}>{i.text}</div>
            ))}
          </Card>
        )}
        <Card>
          <CardHeader title="Amplasament" subtitle={`${p.lat.toFixed(3)}° N, ${p.lng.toFixed(3)}° E`} />
          <RomaniaMap rows={[row]} compact highlightCounty={p.county} selectedId={p.id} />
        </Card>
      </div>
    </div>
  );
}

export function BudgetBar({ fin }: { fin: ProjectRow['fin'] }) {
  const max = Math.max(fin.eac, fin.budget, fin.revenue) * 1.02;
  const w = (v: number) => `${(v / max) * 100}%`;
  return (
    <div className="mt-5">
      <div className="relative h-7 w-full overflow-hidden rounded-md bg-ink-50">
        <div className="absolute inset-y-0 left-0 flex h-full" style={{ width: w(fin.eac) }}>
          <div className="h-full bg-brand-700 transition-all duration-700" style={{ width: `${(fin.actual / fin.eac) * 100}%` }} title="Efective" />
          <div className="h-full border-l-2 border-white bg-brand-400 transition-all duration-700" style={{ width: `${(fin.committedOpen / fin.eac) * 100}%` }} title="Angajate" />
          <div className="h-full border-l-2 border-white bg-[repeating-linear-gradient(135deg,#c9e0d0_0_4px,#e6f0e9_4px_8px)] transition-all duration-700" style={{ width: `${(fin.etc / fin.eac) * 100}%` }} title="Rămase estimate" />
        </div>
        <div className="absolute inset-y-0 w-0.5 bg-ink-900" style={{ left: w(fin.budget) }} title="Buget" />
        <div className="absolute inset-y-0 w-0.5 bg-lime-600" style={{ left: w(fin.revenue) }} title="Venit" />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-700" />Efective</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-400" />Angajate</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[repeating-linear-gradient(135deg,#c9e0d0_0_3px,#e6f0e9_3px_6px)]" />Rămase estimate</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 bg-ink-900" />Buget</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 bg-lime-600" />Venit actualizat</span>
      </div>
    </div>
  );
}
