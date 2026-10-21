import { useStore } from '../../store/store';
import { usePermission } from '../../store/derived';
import type { ProjectRow } from '../../domain/portfolio';
import { Card, CardHeader, Badge, Table, Th, Td, Progress } from '../../components/ui';
import { RequestCard } from '../../features/requests/RequestCard';
import { fmtDateShort, fmtNum } from '../../domain/format';
import { PRODUCTION_STATUS_LABEL } from '../../domain/labels';

export function MaterialsTab({ row }: { row: ProjectRow }) {
  const p = row.project;
  const requests = useStore((s) => s.requests).filter((r) => r.projectId === p.id);
  const pms = useStore((s) => s.projectMaterials).filter((x) => x.projectId === p.id);
  const materials = useStore((s) => s.materials);
  const production = useStore((s) => s.productionOrders).filter((o) => o.projectId === p.id);
  const pos = useStore((s) => s.purchaseOrders).filter((o) => o.projectId === p.id);
  const canFinance = usePermission('finance.view');

  return (
    <div className="space-y-6">
      {requests.length > 0 && (
        <div>
          <h3 className="mb-3 text-[15px] font-semibold text-ink-900">Solicitări de materiale din șantier</h3>
          <div className="space-y-3">
            {requests.sort((a, b) => (a.status === 'in_asteptare' ? -1 : 1) - (b.status === 'in_asteptare' ? -1 : 1)).map((r) => <RequestCard key={r.id} request={r} showProject={false} showImpact={canFinance} />)}
          </div>
        </div>
      )}

      <Card pad={false}>
        <div className="px-5 pt-5"><CardHeader title="Necesar și mișcări de materiale" subtitle="Consumul raportat din Atlas Field actualizează coloana „Consumat”; costul a fost recunoscut la achiziție sau la transferul din depozit." /></div>
        <Table>
          <thead><tr><Th className="pl-5">Material</Th><Th align="right">Necesar</Th><Th align="right">Rezervat</Th><Th align="right">Pe șantier</Th><Th align="right">Consumat</Th><Th>Acoperire</Th><Th align="right" className="pr-5">Rest de asigurat</Th></tr></thead>
          <tbody>
            {pms.map((pm) => {
              const m = materials.find((x) => x.id === pm.materialId)!;
              const rest = Math.max(0, pm.planned - pm.transferred - pm.reserved);
              const cover = pm.planned ? ((pm.transferred + pm.reserved) / pm.planned) * 100 : 100;
              return (
                <tr key={pm.materialId}>
                  <Td className="pl-5"><div className="font-medium text-ink-900">{m.name}</div><div className="text-[12px] text-ink-500">{m.code}{m.ownProduction && ' · producție proprie'}</div></Td>
                  <Td align="right">{fmtNum(pm.planned)} {m.unit}</Td>
                  <Td align="right">{fmtNum(pm.reserved)}</Td>
                  <Td align="right">{fmtNum(pm.transferred)}</Td>
                  <Td align="right" className={pm.consumed > pm.transferred ? 'font-medium text-risk-600' : ''}>{fmtNum(pm.consumed)}</Td>
                  <Td className="w-32"><Progress value={cover} tone={cover < 60 && p.status === 'executie' ? 'warn' : 'brand'} /></Td>
                  <Td align="right" className="pr-5 font-medium">{rest > 0 ? `${fmtNum(rest)} ${m.unit}` : '—'}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Comenzi către furnizori" />
          {pos.length ? (
            <ul className="divide-y divide-ink-100">
              {pos.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                  <div><div className="font-medium text-ink-900">{o.number}</div><div className="text-ink-500">{o.supplier} · livrare {fmtDateShort(o.expected)}</div></div>
                  <Badge tone={o.status === 'receptionata' ? 'brand' : 'neutral'}>{o.status === 'emisa' ? 'Emisă' : o.status === 'confirmata' ? 'Confirmată' : 'Recepționată'}</Badge>
                </li>
              ))}
            </ul>
          ) : <div className="text-[13px] text-ink-500">Nicio comandă dedicată.</div>}
        </Card>
        <Card>
          <CardHeader title="Producție proprie pentru proiect" />
          {production.length ? (
            <ul className="divide-y divide-ink-100">
              {production.map((o) => (
                <li key={o.id} className="py-2.5 text-[13px]">
                  <div className="flex items-center justify-between gap-3"><span className="font-medium text-ink-900">{o.qty} × {o.product}</span><Badge tone={o.status === 'livrat' || o.status === 'finalizat' ? 'brand' : 'neutral'}>{PRODUCTION_STATUS_LABEL[o.status]}</Badge></div>
                  <div className="mt-1.5 flex items-center gap-2"><Progress value={o.progress} className="flex-1" /><span className="text-[12px] text-ink-500">termen {fmtDateShort(o.due)}</span></div>
                </li>
              ))}
            </ul>
          ) : <div className="text-[13px] text-ink-500">Niciun ordin de producție.</div>}
        </Card>
      </div>
    </div>
  );
}
