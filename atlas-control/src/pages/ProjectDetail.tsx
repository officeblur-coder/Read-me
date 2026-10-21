import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, MapPin, CalendarDays, UserRound, Sparkles } from 'lucide-react';
import { useStore } from '../store/store';
import { usePermission, useRow } from '../store/derived';
import { Badge, RiskBadge, Tabs, DemoTag, Button } from '../components/ui';
import { STATUS_LABEL, TYPE_LABEL } from '../domain/labels';
import { fmtDate } from '../domain/format';
import { OverviewTab } from './project/OverviewTab';
import { FinanceTab } from './project/FinanceTab';
import { ProgressTab } from './project/ProgressTab';
import { TeamsTab } from './project/TeamsTab';
import { MaterialsTab } from './project/MaterialsTab';
import { DocumentsTab } from './project/DocumentsTab';
import { JournalTab } from './project/JournalTab';
import { askAtlas } from '../features/intelligence/Chat';

type TabId = 'prezentare' | 'financiar' | 'progres' | 'echipe' | 'materiale' | 'documente' | 'jurnal';

export function ProjectDetailPage() {
  const { id } = useParams();
  const row = useRow(id);
  const [params, setParams] = useSearchParams();
  const people = useStore((s) => s.people);
  const requests = useStore((s) => s.requests);
  const reports = useStore((s) => s.reports);
  const canFinance = usePermission('finance.view');
  const canAsk = usePermission('intelligence.use');

  if (!row) {
    return <div className="py-20 text-center text-ink-500">Proiectul nu a fost găsit. <Link to="/proiecte" className="text-brand-700 underline">Înapoi la proiecte</Link></div>;
  }
  const p = row.project;
  const tab = (params.get('tab') as TabId) || 'prezentare';
  const pending = requests.filter((r) => r.projectId === p.id && r.status === 'in_asteptare').length;
  const reportCount = reports.filter((r) => r.projectId === p.id).length;

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'prezentare', label: 'Prezentare' },
    ...(canFinance ? [{ id: 'financiar' as const, label: 'Financiar' }] : []),
    { id: 'progres', label: 'Progres' },
    { id: 'echipe', label: 'Echipe și utilaje' },
    { id: 'materiale', label: 'Materiale', count: pending || undefined },
    { id: 'documente', label: 'Documente și fotografii', count: p.documents.length + p.photos.length },
    { id: 'jurnal', label: 'Jurnal de șantier', count: reportCount },
  ];
  const current = tabs.some((t) => t.id === tab) ? tab : 'prezentare';
  const manager = people.find((x) => x.id === p.managerId);

  return (
    <div>
      <Link to="/proiecte" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"><ChevronLeft size={15} /> Proiecte</Link>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold tracking-[0.04em] text-ink-500">{p.code}</span>
            <Badge tone="neutral">{TYPE_LABEL[p.type]}</Badge>
            <Badge tone={p.status === 'executie' ? 'brand' : 'neutral'}>{STATUS_LABEL[p.status]}</Badge>
            {p.status !== 'finalizat' && <RiskBadge level={row.risk.level} />}
            <DemoTag />
          </div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink-900 sm:text-[26px]">{p.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-500">
            <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{p.city}, jud. {p.county}</span>
            <span>{p.client}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />{fmtDate(p.startDate)} – {fmtDate(p.dueDate)}</span>
            <span className="inline-flex items-center gap-1.5"><UserRound size={14} />{manager?.name}</span>
          </div>
        </div>
        {canAsk && (
          <Button onClick={() => askAtlas(`Care este situația proiectului din ${p.city}?`)}><Sparkles size={15} className="text-brand-600" /> Rezumat Atlas Intelligence</Button>
        )}
      </div>

      <Tabs tabs={tabs} value={current} onChange={(t) => setParams({ tab: t }, { replace: true })} className="mb-6" />

      {current === 'prezentare' && <OverviewTab row={row} />}
      {current === 'financiar' && <FinanceTab row={row} />}
      {current === 'progres' && <ProgressTab row={row} />}
      {current === 'echipe' && <TeamsTab row={row} />}
      {current === 'materiale' && <MaterialsTab row={row} />}
      {current === 'documente' && <DocumentsTab row={row} />}
      {current === 'jurnal' && <JournalTab row={row} />}
    </div>
  );
}
