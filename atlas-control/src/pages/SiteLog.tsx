import { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { useVisibleRows } from '../store/derived';
import { PageHeader, Select, Segmented, Card, Empty } from '../components/ui';
import { ReportCard } from '../features/sitelog/ReportCard';
import { RequestCard } from '../features/requests/RequestCard';
import { usePermission } from '../store/derived';

export function SiteLogPage() {
  const reports = useStore((s) => s.reports);
  const requests = useStore((s) => s.requests);
  const rows = useVisibleRows();
  const canFinance = usePermission('finance.view');
  const [project, setProject] = useState('all');
  const [filter, setFilter] = useState<'all' | 'issues'>('all');
  const visibleIds = new Set(rows.map((r) => r.project.id));

  const list = useMemo(() => reports.filter((r) => visibleIds.has(r.projectId) && (project === 'all' || r.projectId === project) && (filter === 'all' || r.issues.some((i) => i.severity !== 'minora'))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reports, project, filter, rows]);
  const pending = requests.filter((r) => r.status === 'in_asteptare' && visibleIds.has(r.projectId) && (project === 'all' || r.projectId === project));

  return (
    <div>
      <PageHeader
        eyebrow="Jurnal de șantier"
        title="Rapoarte zilnice din teren"
        subtitle="Toate rapoartele trimise din Atlas Field: activități, ore, consumuri, probleme tehnice și fotografii."
        actions={
          <>
            <Segmented value={filter} onChange={setFilter} options={[{ id: 'all', label: 'Toate' }, { id: 'issues', label: 'Cu probleme' }]} />
            <Select value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="all">Toate șantierele</option>
              {rows.filter((r) => reports.some((x) => x.projectId === r.project.id)).map((r) => <option key={r.project.id} value={r.project.id}>{r.project.city} – {r.project.name}</option>)}
            </Select>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {list.length ? list.map((r) => <ReportCard key={r.id} report={r} showProject />) : <Empty title="Niciun raport pentru filtrele alese" />}
        </div>
        <div>
          <Card pad={false} className="sticky top-20">
            <div className="border-b border-ink-100 px-5 py-4">
              <h3 className="text-[15px] font-semibold text-ink-900">Solicitări în așteptare</h3>
              <p className="text-[13px] text-ink-500">{pending.length} solicitări de materiale din șantiere</p>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
              {pending.length ? pending.map((r) => <RequestCard key={r.id} request={r} showImpact={canFinance} />) : <div className="p-4 text-center text-[13px] text-ink-500">Nicio solicitare în așteptare.</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
