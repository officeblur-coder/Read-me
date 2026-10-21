import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Search, LayoutGrid, Rows3 } from 'lucide-react';
import { useStore } from '../store/store';
import { usePermission, useVisibleRows } from '../store/derived';
import { Card, PageHeader, Input, Select, RiskBadge, Progress, Badge, Table, Th, Td, Segmented, DemoTag } from '../components/ui';
import { SitePhoto } from '../components/SitePhoto';
import { fmtMoney, fmtPct, fmtDateShort, normalize } from '../domain/format';
import { STATUS_LABEL, TYPE_LABEL } from '../domain/labels';
import type { ProjectStatus, ProjectType, RiskLevel } from '../domain/types';

type SortKey = 'name' | 'value' | 'progress' | 'margin' | 'due';

export function ProjectsPage() {
  const rows = useVisibleRows();
  const people = useStore((s) => s.people);
  const canFinance = usePermission('finance.view');
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ProjectStatus | 'all' | 'active'>('active');
  const [type, setType] = useState<ProjectType | 'all'>('all');
  const [county, setCounty] = useState('all');
  const [manager, setManager] = useState('all');
  const [risk, setRisk] = useState<RiskLevel | 'all'>('all');
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'value', dir: -1 });

  const counties = [...new Set(rows.map((r) => r.project.county))].sort((a, b) => a.localeCompare(b, 'ro'));
  const managers = [...new Set(rows.map((r) => r.project.managerId))];
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? '—';

  const filtered = useMemo(() => {
    const nq = normalize(q);
    const out = rows.filter((r) => {
      const p = r.project;
      if (status === 'active' && !(p.status === 'executie' || p.status === 'pregatire' || p.status === 'receptie')) return false;
      if (status !== 'all' && status !== 'active' && p.status !== status) return false;
      if (type !== 'all' && p.type !== type) return false;
      if (county !== 'all' && p.county !== county) return false;
      if (manager !== 'all' && p.managerId !== manager) return false;
      if (risk !== 'all' && r.risk.level !== risk) return false;
      if (nq && !normalize(`${p.name} ${p.city} ${p.client} ${p.code} ${p.county}`).includes(nq)) return false;
      return true;
    });
    const val = (r: (typeof out)[number]) =>
      sort.key === 'name' ? r.project.city : sort.key === 'value' ? r.fin.revenue : sort.key === 'progress' ? r.sched.progress : sort.key === 'margin' ? r.fin.margin : r.project.dueDate;
    return out.sort((a, b) => {
      const x = val(a), y = val(b);
      return (typeof x === 'string' ? x.localeCompare(y as string, 'ro') : x - (y as number)) * sort.dir;
    });
  }, [rows, q, status, type, county, manager, risk, sort]);

  const th = (key: SortKey, label: string, align: 'left' | 'right' = 'left') => (
    <Th align={align} active={sort.key === key} onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))}>
      {label}{sort.key === key && (sort.dir === 1 ? ' ↑' : ' ↓')}
    </Th>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Proiecte și contracte"
        title="Portofoliu de proiecte"
        subtitle={`${filtered.length} din ${rows.length} proiecte afișate. Valoare totală ${fmtMoney(filtered.reduce((a, r) => a + r.fin.revenue, 0))}.`}
        actions={<><DemoTag /><Segmented value={view} onChange={setView} options={[{ id: 'table', label: 'Tabel' }, { id: 'cards', label: 'Carduri' }]} /></>}
      />

      <Card className="mb-4" pad={false}>
        <div className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută după denumire, localitate, beneficiar, cod" className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="active">Active</option>
            <option value="all">Toate statusurile</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="all">Toate tipurile</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select value={county} onChange={(e) => setCounty(e.target.value)}>
            <option value="all">Toate județele</option>
            {counties.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={manager} onChange={(e) => setManager(e.target.value)}>
            <option value="all">Toți responsabilii</option>
            {managers.map((m) => <option key={m} value={m}>{name(m)}</option>)}
          </Select>
          <Select value={risk} onChange={(e) => setRisk(e.target.value as typeof risk)}>
            <option value="all">Orice stare</option>
            <option value="ok">În limite</option>
            <option value="warn">Risc</option>
            <option value="risk">Depășire</option>
          </Select>
        </div>
      </Card>

      {view === 'table' ? (
        <Card pad={false}>
          <Table>
            <thead>
              <tr>
                <Th className="pl-5">Cod</Th>
                {th('name', 'Proiect')}
                <Th>Beneficiar</Th>
                {th('value', 'Valoare contract', 'right')}
                {th('progress', 'Progres')}
                {canFinance && th('margin', 'Marjă est.', 'right')}
                {th('due', 'Termen')}
                <Th>Responsabil</Th>
                <Th align="right" className="pr-5">Stare</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.project.id} onClick={() => navigate(`/proiecte/${r.project.id}`)} className="cursor-pointer transition-colors hover:bg-ink-50/70">
                  <Td className="pl-5 text-[12px] font-medium text-ink-500">{r.project.code}</Td>
                  <Td>
                    <div className="font-medium text-ink-900">{r.project.name}</div>
                    <div className="text-[12px] text-ink-500">{r.project.city}, jud. {r.project.county} · {TYPE_LABEL[r.project.type]}</div>
                  </Td>
                  <Td className="max-w-[200px] truncate text-[13px] text-ink-600">{r.project.client}</Td>
                  <Td align="right" className="font-medium">{fmtMoney(r.fin.revenue)}</Td>
                  <Td className="w-36">
                    <div className="flex items-center gap-2"><Progress value={r.sched.progress} marker={r.project.status === 'executie' ? r.sched.plannedProgress : undefined} className="w-16" /><span className="text-[12px] tabular-nums text-ink-600">{Math.round(r.sched.progress)}%</span></div>
                  </Td>
                  {canFinance && <Td align="right" className={clsx(r.fin.margin < 12 && 'text-risk-600')}>{fmtPct(r.fin.margin)}</Td>}
                  <Td className={clsx('whitespace-nowrap text-[13px]', r.sched.delayed ? 'font-medium text-warn-700' : 'text-ink-600')}>{fmtDateShort(r.project.dueDate)}</Td>
                  <Td className="whitespace-nowrap text-[13px] text-ink-600">{name(r.project.managerId)}</Td>
                  <Td align="right" className="pr-5">
                    <div className="flex items-center justify-end gap-2">
                      <Badge tone="neutral">{STATUS_LABEL[r.project.status]}</Badge>
                      {r.project.status !== 'finalizat' && <RiskBadge level={r.risk.level} />}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!filtered.length && <div className="p-10 text-center text-sm text-ink-500">Niciun proiect nu corespunde filtrelor.</div>}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const ph = r.project.photos[0];
            return (
              <button key={r.project.id} onClick={() => navigate(`/proiecte/${r.project.id}`)} className="group overflow-hidden rounded-xl border border-ink-200/70 bg-white text-left shadow-card transition-shadow hover:shadow-pop">
                <div className="relative aspect-[16/8]">
                  {ph ? <SitePhoto stage={ph.stage} seed={ph.seed} dataUrl={ph.dataUrl} className="h-full w-full" label={false} /> : <div className="grid h-full place-items-center bg-ink-100 text-[12px] text-ink-400">Lucrări neîncepute</div>}
                  <div className="absolute left-3 top-3 flex gap-1.5"><Badge tone="dark">{STATUS_LABEL[r.project.status]}</Badge></div>
                  {r.project.status !== 'finalizat' && <div className="absolute right-3 top-3"><RiskBadge level={r.risk.level} /></div>}
                </div>
                <div className="p-4">
                  <div className="text-[12px] text-ink-500">{r.project.code} · {TYPE_LABEL[r.project.type]}</div>
                  <div className="mt-0.5 font-semibold text-ink-900">{r.project.city}</div>
                  <div className="truncate text-[13px] text-ink-600">{r.project.name}</div>
                  <div className="mt-3 flex items-center gap-2"><Progress value={r.sched.progress} className="flex-1" /><span className="text-[12px] tabular-nums text-ink-600">{Math.round(r.sched.progress)}%</span></div>
                  <div className="mt-3 flex justify-between text-[12.5px]">
                    <span className="text-ink-500">Contract <span className="font-medium text-ink-900">{fmtMoney(r.fin.revenue)}</span></span>
                    {canFinance && <span className="text-ink-500">Marjă <span className={clsx('font-medium', r.fin.margin < 12 ? 'text-risk-600' : 'text-ink-900')}>{fmtPct(r.fin.margin)}</span></span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-400">
        <Rows3 size={13} /> Linia neagră din bara de progres indică progresul planificat la data curentă. <LayoutGrid size={13} className="ml-2" /> Fotografiile sunt imagini demonstrative.
      </div>
    </div>
  );
}
