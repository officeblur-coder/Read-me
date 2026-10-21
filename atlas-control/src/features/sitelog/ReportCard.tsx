import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { CloudSun, Users, Clock, AlertOctagon, AlertTriangle, Info, Package } from 'lucide-react';
import { useStore } from '../../store/store';
import type { SiteReport } from '../../domain/types';
import { SitePhoto } from '../../components/SitePhoto';
import { PhotoViewer } from '../../components/PhotoViewer';
import { fmtDate, fmtNum, fmtRon } from '../../domain/format';

export function ReportCard({ report: r, showProject }: { report: SiteReport; showProject?: boolean }) {
  const people = useStore((s) => s.people);
  const projects = useStore((s) => s.projects);
  const materials = useStore((s) => s.materials);
  const [viewer, setViewer] = useState<number | null>(null);
  const project = projects.find((p) => p.id === r.projectId);
  const photos = (project?.photos ?? []).filter((ph) => r.photoIds.includes(ph.id));
  const stageName = (id: string) => project?.stages.find((s) => s.id === id)?.name ?? id;
  const critical = r.issues.some((i) => i.severity === 'critica');

  return (
    <article className={clsx('rounded-xl border bg-white shadow-card', critical ? 'border-risk-100' : 'border-ink-200/70')}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
        <div>
          <div className="text-[14px] font-semibold text-ink-900">Raport zilnic, {fmtDate(r.date)}</div>
          <div className="text-[12.5px] text-ink-500">
            {people.find((p) => p.id === r.authorId)?.name}
            {showProject && project && <> · <Link to={`/proiecte/${project.id}?tab=jurnal`} className="font-medium text-ink-700 hover:underline">{project.city}: {project.name}</Link></>}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-[12.5px] text-ink-500">
          <span className="inline-flex items-center gap-1.5"><CloudSun size={14} />{r.weather}</span>
          <span className="inline-flex items-center gap-1.5"><Users size={14} />{r.workers} oameni</span>
          <span className="inline-flex items-center gap-1.5"><Clock size={14} />{r.hours} ore · {fmtRon(r.laborCost)}</span>
        </div>
      </header>
      <div className="space-y-3 px-5 py-4">
        <p className="text-[13.5px] leading-relaxed text-ink-800">{r.activities}</p>
        {r.stageUpdates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {r.stageUpdates.map((u) => (
              <span key={u.stageId} className="rounded-md bg-brand-50 px-2 py-1 text-[12px] text-brand-700">{stageName(u.stageId)}: {u.progress}%</span>
            ))}
          </div>
        )}
        {r.materials.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-600">
            <Package size={14} className="text-ink-400" />
            {r.materials.map((m) => {
              const mat = materials.find((x) => x.id === m.materialId);
              return <span key={m.materialId} className="rounded-md bg-ink-50 px-2 py-1">{mat?.name}: {fmtNum(m.qty)} {mat?.unit}</span>;
            })}
          </div>
        )}
        {r.issues.map((i, k) => {
          const Icon = i.severity === 'critica' ? AlertOctagon : i.severity === 'majora' ? AlertTriangle : Info;
          return (
            <div key={k} className={clsx('flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-[13px]', i.severity === 'critica' ? 'bg-risk-50 text-risk-700' : i.severity === 'majora' ? 'bg-warn-50 text-warn-700' : 'bg-ink-50 text-ink-600')}>
              <Icon size={16} className="mt-0.5 shrink-0" />
              <div><span className="font-semibold">{i.severity === 'critica' ? 'Problemă critică' : i.severity === 'majora' ? 'Problemă majoră' : 'Observație'}:</span> {i.text}</div>
            </div>
          );
        })}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((ph, i) => (
              <button key={ph.id} onClick={() => setViewer(i)} className="group overflow-hidden rounded-lg text-left">
                <SitePhoto stage={ph.stage} seed={ph.seed} dataUrl={ph.dataUrl} className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.03]" />
                <div className="mt-1 truncate text-[11.5px] text-ink-500">{ph.caption}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <PhotoViewer photos={photos} index={viewer} onClose={() => setViewer(null)} onIndex={setViewer} />
    </article>
  );
}
