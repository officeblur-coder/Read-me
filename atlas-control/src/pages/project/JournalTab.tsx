import { useStore } from '../../store/store';
import type { ProjectRow } from '../../domain/portfolio';
import { Empty } from '../../components/ui';
import { ReportCard } from '../../features/sitelog/ReportCard';

export function JournalTab({ row }: { row: ProjectRow }) {
  const reports = useStore((s) => s.reports).filter((r) => r.projectId === row.project.id);
  if (!reports.length) return <Empty title="Niciun raport de șantier">Rapoartele zilnice trimise din Atlas Field apar aici.</Empty>;
  return (
    <div className="space-y-4">
      {reports.map((r) => <ReportCard key={r.id} report={r} />)}
    </div>
  );
}
