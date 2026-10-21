import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Check, X, ArrowRight } from 'lucide-react';
import { useStore, currentUserId } from '../../store/store';
import { usePermission, useRow } from '../../store/derived';
import type { MaterialRequest } from '../../domain/types';
import { requestValue } from '../../domain/portfolio';
import { Badge, Button } from '../../components/ui';
import { fmtDateShort, fmtMoney, fmtNum, fmtPct, fmtRon } from '../../domain/format';
import { REQUEST_STATUS_LABEL, URGENCY_LABEL } from '../../domain/labels';

export function RequestCard({ request: r, showProject = true, showImpact = true }: { request: MaterialRequest; showProject?: boolean; showImpact?: boolean }) {
  const materials = useStore((s) => s.materials);
  const people = useStore((s) => s.people);
  const role = useStore((s) => s.role);
  const approve = useStore((s) => s.approveRequest);
  const reject = useStore((s) => s.rejectRequest);
  const canApprove = usePermission('requests.approve');
  const row = useRow(r.projectId);
  if (!row) return null;

  const value = Math.round(requestValue(r, materials));
  const covered = Math.min(value, r.coveredByEstimate);
  const net = value - covered;
  const marginAfter = row.fin.revenue > 0 ? ((row.fin.profit - net) / row.fin.revenue) * 100 : 0;
  const pending = r.status === 'in_asteptare';

  return (
    <div className={clsx('overflow-hidden rounded-xl border bg-white shadow-card', pending && r.urgency !== 'normala' ? 'border-warn-500/40' : 'border-ink-200/70')}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-ink-900">{r.id.toUpperCase()}</span>
            <Badge tone={r.urgency === 'critica' ? 'risk' : r.urgency === 'ridicata' ? 'warn' : 'neutral'}>Urgență {URGENCY_LABEL[r.urgency].toLowerCase()}</Badge>
            <Badge tone={r.status === 'aprobata' ? 'brand' : r.status === 'respinsa' ? 'risk' : 'dark'}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
          </div>
          <div className="mt-1 text-[12.5px] text-ink-500">
            {people.find((x) => x.id === r.requestedBy)?.name} · {fmtDateShort(r.date)}
            {showProject && <> · <Link to={`/proiecte/${r.projectId}?tab=materiale`} className="font-medium text-ink-700 hover:underline">{row.project.city}: {row.project.name}</Link></>}
          </div>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-700">{r.reason}</p>
        </div>
        <div className="text-right">
          <div className="text-[12px] text-ink-500">Valoare</div>
          <div className="text-[20px] font-semibold tabular-nums text-ink-900">{fmtMoney(value)}</div>
        </div>
      </div>
      <div className="border-t border-ink-100 bg-ink-50/40 px-5 py-3">
        <div className="grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-2">
          {r.items.map((it) => {
            const m = materials.find((x) => x.id === it.materialId)!;
            return (
              <div key={it.materialId} className="flex justify-between gap-3">
                <span className="text-ink-700">{m.name}</span>
                <span className="whitespace-nowrap tabular-nums text-ink-500">{fmtNum(it.qty)} {m.unit} × {fmtNum(m.unitCost, 1)} = <span className="text-ink-800">{fmtRon(it.qty * m.unitCost)}</span></span>
              </div>
            );
          })}
        </div>
      </div>
      {showImpact && (
        <div className="grid gap-3 border-t border-ink-100 px-5 py-3 text-[12.5px] sm:grid-cols-4">
          <div><div className="text-ink-500">Inclus deja în estimarea rămasă</div><div className="font-medium tabular-nums text-ink-900">{fmtMoney(covered)}</div></div>
          <div><div className="text-ink-500">Impact net asupra profitului</div><div className={clsx('font-medium tabular-nums', net > 0 ? 'text-risk-600' : 'text-ink-900')}>{net > 0 ? '−' : ''}{fmtMoney(net)}</div></div>
          {pending ? (
            <div><div className="text-ink-500">Marjă proiect după aprobare</div><div className="font-medium tabular-nums text-ink-900">{fmtPct(row.fin.margin)} <ArrowRight size={11} className="inline text-ink-400" /> {fmtPct(marginAfter)}</div></div>
          ) : (
            <div><div className="text-ink-500">Decizie</div><div className="font-medium text-ink-900">{people.find((x) => x.id === r.decidedBy)?.name ?? '—'}{r.decidedAt && `, ${fmtDateShort(r.decidedAt)}`}</div></div>
          )}
          <div className="flex items-end justify-start gap-2 sm:justify-end">
            {pending && canApprove && (
              <>
                <Button size="sm" variant="ghost" onClick={() => reject(r.id, currentUserId(role))}><X size={14} /> Respinge</Button>
                <Button size="sm" variant="primary" onClick={() => approve(r.id, currentUserId(role))}><Check size={14} /> Aprobă</Button>
              </>
            )}
            {pending && !canApprove && <span className="text-ink-400">Așteaptă aprobarea conducerii</span>}
          </div>
        </div>
      )}
    </div>
  );
}
