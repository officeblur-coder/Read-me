import { useRef, useState } from 'react';
import { FileText, FileSpreadsheet, Upload, Eye } from 'lucide-react';
import { useStore } from '../../store/store';
import { usePermission } from '../../store/derived';
import type { ProjectRow } from '../../domain/portfolio';
import type { ProjectDocument } from '../../domain/types';
import { Card, CardHeader, Badge, Button, Modal } from '../../components/ui';
import { SitePhoto } from '../../components/SitePhoto';
import { PhotoViewer } from '../../components/PhotoViewer';
import { fmtDateShort, fmtNum } from '../../domain/format';

export function DocumentsTab({ row }: { row: ProjectRow }) {
  const p = row.project;
  const canEditProject = usePermission('projects.edit');
  const canEditFinance = usePermission('finance.edit');
  const canEdit = canEditProject || canEditFinance;
  const addDocument = useStore((s) => s.addDocument);
  const updateProject = useStore((s) => s.updateProject);
  const today = useStore((s) => s.today);
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [preview, setPreview] = useState<ProjectDocument | null>(null);
  const [notes, setNotes] = useState(p.notes);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      addDocument(p.id, { name: f.name, kind: 'Altele', date: today, sizeKb: Math.max(1, Math.round(f.size / 1024)) });
    }
  };

  return (
    <div className="space-y-6">
      <Card pad={false}>
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <CardHeader className="!mb-3" title="Documente" subtitle="În demo se înregistrează doar metadatele fișierului; stocarea efectivă este prevăzută în arhitectura de producție." />
          {canEdit && (
            <>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
              <Button size="sm" onClick={() => fileRef.current?.click()}><Upload size={15} /> Încarcă document</Button>
            </>
          )}
        </div>
        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {p.documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-5 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-500">{d.name.endsWith('.xlsx') ? <FileSpreadsheet size={17} /> : <FileText size={17} />}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-ink-900">{d.name}</div>
                <div className="text-[12px] text-ink-500">{fmtDateShort(d.date)} · {fmtNum(d.sizeKb)} KB</div>
              </div>
              <Badge tone="neutral" className="hidden sm:inline-flex">{d.kind}</Badge>
              <button onClick={() => setPreview(d)} className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-800" aria-label="Previzualizare"><Eye size={16} /></button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Fotografii din șantier" subtitle={`${p.photos.length} fotografii, cele mai recente primele. Imaginile generate sunt demonstrative; fotografiile trimise din Atlas Field apar aici.`} />
        {p.photos.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {p.photos.map((ph, i) => (
              <button key={ph.id} onClick={() => setViewer(i)} className="group overflow-hidden rounded-lg border border-ink-200/70 text-left">
                <SitePhoto stage={ph.stage} seed={ph.seed} dataUrl={ph.dataUrl} className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.03]" label={false} />
                <div className="px-2.5 py-2">
                  <div className="text-[12px] font-medium text-ink-900">{fmtDateShort(ph.date)}</div>
                  <div className="truncate text-[11.5px] text-ink-500">{ph.caption}</div>
                </div>
              </button>
            ))}
          </div>
        ) : <div className="text-[13px] text-ink-500">Nicio fotografie.</div>}
      </Card>

      <Card>
        <CardHeader title="Observații" action={canEdit && notes !== p.notes && <Button size="sm" variant="primary" onClick={() => updateProject(p.id, { notes })}>Salvează</Button>} />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          readOnly={!canEdit}
          rows={4}
          placeholder="Observații despre proiect"
          className="w-full rounded-lg border border-ink-200 p-3 text-[13.5px] leading-relaxed text-ink-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </Card>

      <PhotoViewer photos={p.photos} index={viewer} onClose={() => setViewer(null)} onIndex={setViewer} />
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name}>
        <div className="grid h-48 place-items-center rounded-lg border border-dashed border-ink-200 bg-ink-50 text-center text-[13px] text-ink-500">
          <div><FileText className="mx-auto mb-2 text-ink-300" size={28} />Previzualizarea nu este disponibilă în demonstrație.<br />Documentul nu există fizic; este un exemplu de înregistrare.</div>
        </div>
      </Modal>
    </div>
  );
}
