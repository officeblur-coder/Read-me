import clsx from 'clsx';
import { CheckCircle2, Circle } from 'lucide-react';
import { useStore, currentUserId } from '../../store/store';
import { usePermission } from '../../store/derived';
import type { ProjectRow } from '../../domain/portfolio';
import { Card, CardHeader, Button, KV, Progress } from '../../components/ui';
import { fmtDate, fmtDateShort, fmtPct } from '../../domain/format';
import { daysBetween } from '../../domain/dates';

export function ProgressTab({ row }: { row: ProjectRow }) {
  const p = row.project;
  const { sched } = row;
  const canEdit = usePermission('projects.edit');
  const role = useStore((s) => s.role);
  const today = useStore((s) => s.today);
  const setStageProgress = useStore((s) => s.setStageProgress);
  const confirmStage = useStore((s) => s.confirmStage);

  const total = Math.max(1, daysBetween(p.startDate, p.dueDate));
  const pos = (d: string) => `${Math.max(0, Math.min(100, (daysBetween(p.startDate, d) / total) * 100))}%`;
  let prevEnd = p.startDate;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><KV label="Progres fizic realizat"><span className="text-[22px] font-semibold tabular-nums">{fmtPct(sched.progress)}</span></KV></Card>
        <Card><KV label="Progres planificat la azi"><span className="text-[22px] font-semibold tabular-nums">{fmtPct(sched.plannedProgress)}</span></KV></Card>
        <Card><KV label="Abatere față de plan"><span className={clsx('text-[22px] font-semibold tabular-nums', sched.gap > 0 ? 'text-warn-700' : 'text-brand-700')}>{sched.gap > 0 ? '−' : '+'}{Math.abs(sched.gap).toFixed(1).replace('.', ',')} pp</span></KV></Card>
        <Card><KV label="Finalizare estimată"><span className={clsx('text-[22px] font-semibold', sched.delayDays > 0 && 'text-warn-700')}>{fmtDateShort(sched.forecastEnd)}</span><span className="ml-2 text-[12px] font-normal text-ink-500">termen {fmtDateShort(p.dueDate)}</span></KV></Card>
      </div>

      <Card>
        <CardHeader title="Grafic de execuție pe etape" subtitle="Bara arată fereastra planificată a fiecărei etape; umplerea arată progresul raportat. Linia verticală marchează data curentă." />
        <div className="relative">
          <div className="absolute inset-y-0 z-10 w-px bg-risk-500/70" style={{ left: `calc(220px + (100% - 220px) * ${parseFloat(pos(today)) / 100})` }}>
            <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap rounded bg-risk-500 px-1.5 text-[10px] font-medium text-white">Azi</span>
          </div>
          <div className="space-y-2.5 pt-5">
            {p.stages.map((s) => {
              const start = prevEnd;
              prevEnd = s.plannedEnd;
              const left = parseFloat(pos(start));
              const width = Math.max(2, parseFloat(pos(s.plannedEnd)) - left);
              const late = s.progress < 100 && s.plannedEnd < today;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-[208px] shrink-0 truncate text-[13px] text-ink-700" title={s.name}>{s.name}</div>
                  <div className="relative h-6 flex-1 rounded bg-ink-50">
                    <div className={clsx('absolute inset-y-0 overflow-hidden rounded', late ? 'bg-warn-100' : 'bg-brand-100')} style={{ left: `${left}%`, width: `${width}%` }}>
                      <div className={clsx('h-full transition-[width] duration-700', late ? 'bg-warn-500' : 'bg-brand-600')} style={{ width: `${s.progress}%` }} />
                    </div>
                  </div>
                  <div className="w-10 shrink-0 text-right text-[12px] tabular-nums text-ink-600">{s.progress}%</div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between pl-[220px] text-[11px] text-ink-400"><span>{fmtDate(p.startDate)}</span><span>{fmtDate(p.dueDate)}</span></div>
        </div>
      </Card>

      <Card pad={false}>
        <div className="px-5 pt-5"><CardHeader title="Etape și confirmări" subtitle="Progresul se actualizează din rapoartele Atlas Field. Managerul de proiect poate corecta și confirma etapele." /></div>
        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {p.stages.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              {s.progress >= 100 ? <CheckCircle2 size={18} className="text-brand-600" /> : <Circle size={18} className="text-ink-300" />}
              <div className="min-w-[200px] flex-1">
                <div className="text-[13.5px] font-medium text-ink-900">{s.name}</div>
                <div className="text-[12px] text-ink-500">Pondere {s.weight}% · termen etapă {fmtDateShort(s.plannedEnd)}{s.confirmedAt && <> · confirmată {fmtDateShort(s.confirmedAt)}</>}</div>
              </div>
              <div className="flex w-full items-center gap-3 sm:w-72">
                {canEdit && s.progress < 100 ? (
                  <input type="range" min={0} max={100} step={5} value={s.progress} onChange={(e) => setStageProgress(p.id, s.id, +e.target.value)} className="flex-1 accent-brand-600" aria-label={`Progres ${s.name}`} />
                ) : <Progress value={s.progress} className="flex-1" />}
                <span className="w-10 text-right text-[12.5px] tabular-nums text-ink-700">{s.progress}%</span>
              </div>
              {canEdit && s.progress < 100 && (
                <Button size="sm" onClick={() => confirmStage(p.id, s.id, currentUserId(role))}>Confirmă finalizarea</Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
