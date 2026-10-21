import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { useStore } from '../store/store';
import { usePermission, useVisibleRows } from '../store/derived';
import { Card, PageHeader, Select, RiskBadge, Progress, KV, Badge, DemoTag } from '../components/ui';
import { RomaniaMap, MapLegend } from '../components/RomaniaMap';
import { SitePhoto } from '../components/SitePhoto';
import { fmtMoney, fmtPct, fmtDateShort } from '../domain/format';
import { STATUS_LABEL, TYPE_LABEL } from '../domain/labels';

export function MapPage() {
  const rows = useVisibleRows();
  const people = useStore((s) => s.people);
  const teams = useStore((s) => s.teams);
  const canFinance = usePermission('finance.view');
  const [county, setCounty] = useState('all');
  const [manager, setManager] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('active');
  const [selected, setSelected] = useState<string | undefined>('prj-01');

  const filtered = useMemo(() => rows.filter((r) => {
    const p = r.project;
    if (status === 'active' && p.status === 'finalizat') return false;
    if (status !== 'all' && status !== 'active' && p.status !== status) return false;
    if (county !== 'all' && p.county !== county) return false;
    if (manager !== 'all' && p.managerId !== manager) return false;
    if (type !== 'all' && p.type !== type) return false;
    return true;
  }), [rows, county, manager, type, status]);

  const sel = filtered.find((r) => r.project.id === selected) ?? filtered[0];
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? '—';
  const counties = [...new Set(rows.map((r) => r.project.county))].sort((a, b) => a.localeCompare(b, 'ro'));

  return (
    <div>
      <PageHeader
        eyebrow="Harta națională a șantierelor"
        title={`${filtered.length} proiecte în ${new Set(filtered.map((r) => r.project.county)).size} județe`}
        subtitle="Selectează un punct pentru detalii. Pozițiile sunt orientative, la nivel de localitate; nu există localizare GPS a echipelor."
        actions={<DemoTag />}
      />
      <Card pad={false} className="mb-4">
        <div className="flex flex-wrap gap-2 p-3">
          <Select value={county} onChange={(e) => setCounty(e.target.value)}><option value="all">Toate județele</option>{counties.map((c) => <option key={c}>{c}</option>)}</Select>
          <Select value={manager} onChange={(e) => setManager(e.target.value)}><option value="all">Toți responsabilii</option>{[...new Set(rows.map((r) => r.project.managerId))].map((m) => <option key={m} value={m}>{name(m)}</option>)}</Select>
          <Select value={type} onChange={(e) => setType(e.target.value)}><option value="all">Toate tipurile</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Nefinalizate</option><option value="all">Toate</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <RomaniaMap rows={filtered} selectedId={sel?.project.id} onSelect={setSelected} highlightCounty={county !== 'all' ? county : sel?.project.county} />
          <div className="mt-3"><MapLegend /></div>
        </Card>

        {sel ? (
          <Card pad={false} className="overflow-hidden">
            {sel.project.photos[0] ? (
              <SitePhoto stage={sel.project.photos[0].stage} seed={sel.project.photos[0].seed} dataUrl={sel.project.photos[0].dataUrl} className="aspect-[16/9] w-full" />
            ) : <div className="grid aspect-[16/9] place-items-center bg-ink-100 text-[13px] text-ink-400">Lucrări neîncepute</div>}
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2"><Badge tone="neutral">{TYPE_LABEL[sel.project.type]}</Badge><Badge tone="neutral">{STATUS_LABEL[sel.project.status]}</Badge>{sel.project.status !== 'finalizat' && <RiskBadge level={sel.risk.level} />}</div>
              <h3 className="mt-2 text-[17px] font-semibold text-ink-900">{sel.project.name}</h3>
              <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-500"><MapPin size={13} />{sel.project.city}, jud. {sel.project.county}</div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <KV label="Beneficiar" className="col-span-2">{sel.project.client}</KV>
                <KV label="Valoare contract">{fmtMoney(sel.fin.revenue)}</KV>
                <KV label="Termen">{fmtDateShort(sel.project.dueDate)}</KV>
                <KV label="Responsabil">{name(sel.project.managerId)}</KV>
                <KV label="Echipă">{sel.project.teamIds.map((t) => teams.find((x) => x.id === t)?.name).join(', ') || '—'}</KV>
                {canFinance && <KV label="Profit estimat">{fmtMoney(sel.fin.profit)}</KV>}
                {canFinance && <KV label="Marjă estimată">{fmtPct(sel.fin.margin)}</KV>}
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-ink-500">Progres fizic</span><span className="font-medium tabular-nums">{fmtPct(sel.sched.progress)}</span></div>
                <Progress value={sel.sched.progress} marker={sel.project.status === 'executie' ? sel.sched.plannedProgress : undefined} />
              </div>
              {sel.project.photos.length > 1 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {sel.project.photos.slice(1, 4).map((ph) => <SitePhoto key={ph.id} stage={ph.stage} seed={ph.seed} dataUrl={ph.dataUrl} className="aspect-square rounded-md" label={false} />)}
                </div>
              )}
              <Link to={`/proiecte/${sel.project.id}`} className="mt-5 flex items-center justify-center gap-1.5 rounded-lg bg-ink-900 py-2.5 text-[13px] font-medium text-white hover:bg-ink-800">Deschide fișa proiectului <ArrowRight size={14} /></Link>
            </div>
          </Card>
        ) : <Card><div className="text-[13px] text-ink-500">Niciun proiect pentru filtrele alese.</div></Card>}
      </div>
    </div>
  );
}
