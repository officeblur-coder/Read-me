import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { AlertTriangle, Plus, Trash2, Wrench } from 'lucide-react';
import { useStore } from '../store/store';
import { usePermission } from '../store/derived';
import { Card, CardHeader, PageHeader, Tabs, Table, Th, Td, Badge, Button, Modal, Label, Select, Input, DemoTag } from '../components/ui';
import { findAllocationConflicts, resourceName } from '../domain/portfolio';
import type { Allocation } from '../domain/types';
import { addDays, daysBetween, overlaps, weekStart } from '../domain/dates';
import { fmtDateShort, fmtMoney } from '../domain/format';

type Tab = 'planificare' | 'echipe' | 'angajati' | 'utilaje';
const PALETTE = ['#178650', '#3d7bb5', '#7a5aa6', '#b5643d', '#2f8f8a', '#8a7a2f', '#a64d6d', '#4d6aa6', '#5d8a3a', '#9a5a2a'];

export function ResourcesPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'planificare';
  const teams = useStore((s) => s.teams);
  const equipment = useStore((s) => s.equipment);
  const allocations = useStore((s) => s.allocations);
  const projects = useStore((s) => s.projects);
  const conflicts = findAllocationConflicts(allocations, equipment, teams, (id) => projects.find((p) => p.id === id)?.city ?? id);

  return (
    <div>
      <PageHeader eyebrow="Echipe și utilaje" title="Planificarea resurselor" subtitle="Alocarea echipelor, utilajelor și vehiculelor pe proiecte, cu avertizare automată la suprapuneri." actions={<DemoTag />} />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
        tabs={[
          { id: 'planificare', label: 'Calendar de planificare', count: conflicts.length || undefined },
          { id: 'echipe', label: 'Echipe', count: teams.length },
          { id: 'angajati', label: 'Angajați' },
          { id: 'utilaje', label: 'Utilaje și vehicule', count: equipment.length },
        ]}
      />
      {tab === 'planificare' && <Planner />}
      {tab === 'echipe' && <TeamsList />}
      {tab === 'angajati' && <People />}
      {tab === 'utilaje' && <EquipmentList />}
    </div>
  );
}

function Planner() {
  const today = useStore((s) => s.today);
  const teams = useStore((s) => s.teams);
  const equipment = useStore((s) => s.equipment);
  const allocations = useStore((s) => s.allocations);
  const projects = useStore((s) => s.projects);
  const removeAllocation = useStore((s) => s.removeAllocation);
  const canEdit = usePermission('resources.edit');
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);

  const start = addDays(weekStart(today), -7 + offset * 7);
  const weeks = 10;
  const end = addDays(start, weeks * 7 - 1);
  const span = weeks * 7;
  const pct = (d: string) => (Math.max(0, Math.min(span, daysBetween(start, d))) / span) * 100;
  const city = (id: string) => projects.find((p) => p.id === id)?.city ?? id;
  const color = (projectId: string) => PALETTE[projects.findIndex((p) => p.id === projectId) % PALETTE.length];
  const conflicts = findAllocationConflicts(allocations, equipment, teams, city);
  const conflictIds = new Set(conflicts.flatMap((c) => [c.a.id, c.b?.id].filter(Boolean) as string[]));

  const resources: { type: Allocation['resourceType']; id: string; name: string; sub: string; service?: string }[] = [
    ...teams.map((t) => ({ type: 'team' as const, id: t.id, name: t.name, sub: t.specialty })),
    ...equipment.map((e) => ({ type: 'equipment' as const, id: e.id, name: e.name, sub: e.plate ?? (e.kind === 'utilaj' ? 'Utilaj' : 'Vehicul'), service: e.status === 'service' ? e.serviceUntil : undefined })),
  ];

  return (
    <div className="space-y-4">
      {conflicts.length > 0 && (
        <Card className="border-warn-100 bg-warn-50/60">
          <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-warn-700"><AlertTriangle size={16} /> {conflicts.length} suprapuneri de resurse</div>
          <ul className="space-y-1 text-[13px] text-ink-700">
            {conflicts.map((c, i) => <li key={i}><span className="font-medium">{c.label}:</span> {c.detail}</li>)}
          </ul>
        </Card>
      )}
      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-ink-900">Calendar {fmtDateShort(start)} – {fmtDateShort(end)}</h3>
            <p className="text-[13px] text-ink-500">Barele cu contur roșu sunt în conflict. Culoarea identifică proiectul.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOffset(offset - 4)}>← 4 săpt.</Button>
            <Button size="sm" variant="ghost" onClick={() => setOffset(0)}>Azi</Button>
            <Button size="sm" variant="ghost" onClick={() => setOffset(offset + 4)}>4 săpt. →</Button>
            {canEdit && <Button size="sm" variant="primary" onClick={() => setOpen(true)}><Plus size={15} /> Alocă resursă</Button>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="flex border-y border-ink-100 bg-ink-50/50 text-[11.5px] text-ink-500">
              <div className="w-[230px] shrink-0 px-5 py-2 font-medium">Resursă</div>
              <div className="relative flex flex-1">
                {Array.from({ length: weeks }, (_, i) => (
                  <div key={i} className="flex-1 border-l border-ink-100 px-2 py-2">{fmtDateShort(addDays(start, i * 7))}</div>
                ))}
              </div>
            </div>
            {resources.map((r, idx) => {
              const allocs = allocations.filter((a) => a.resourceType === r.type && a.resourceId === r.id && overlaps(a.start, a.end, start, end));
              return (
                <div key={r.id} className={clsx('flex border-b border-ink-100', idx === teams.length && 'border-t-4 border-t-ink-50')}>
                  <div className="w-[230px] shrink-0 px-5 py-2.5">
                    <div className="truncate text-[13px] font-medium text-ink-900">{r.name}</div>
                    <div className="truncate text-[11.5px] text-ink-500">{r.sub}</div>
                  </div>
                  <div className="relative flex-1">
                    {Array.from({ length: weeks }, (_, i) => <div key={i} className="absolute inset-y-0 border-l border-ink-100" style={{ left: `${(i / weeks) * 100}%` }} />)}
                    <div className="absolute inset-y-0 z-[1] w-px bg-risk-500/70" style={{ left: `${pct(today)}%` }} />
                    {r.service && (
                      <div className="absolute inset-y-2 flex items-center gap-1 rounded bg-[repeating-linear-gradient(135deg,#ebeeec_0_5px,#d9ddda_5px_10px)] px-2 text-[11px] font-medium text-ink-600" style={{ left: `${pct(start)}%`, width: `${pct(addDays(r.service, 1)) - pct(start)}%` }}>
                        <Wrench size={11} /> Service
                      </div>
                    )}
                    {allocs.map((a) => (
                      <div
                        key={a.id}
                        title={`${city(a.projectId)}: ${fmtDateShort(a.start)} – ${fmtDateShort(a.end)}${a.note ? ` · ${a.note}` : ''}`}
                        className={clsx('group absolute top-2 bottom-2 flex items-center overflow-hidden rounded px-2 text-[11.5px] font-medium text-white', conflictIds.has(a.id) && 'ring-2 ring-risk-500 ring-offset-1')}
                        style={{ left: `${pct(a.start)}%`, width: `max(${pct(addDays(a.end, 1)) - pct(a.start)}%, 18px)`, background: color(a.projectId), opacity: 0.92 }}
                      >
                        <span className="truncate">{city(a.projectId)}</span>
                        {canEdit && <button onClick={() => removeAllocation(a.id)} className="ml-auto hidden rounded p-0.5 hover:bg-black/20 group-hover:block" aria-label="Șterge alocarea"><Trash2 size={11} /></button>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
      <AllocationModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function AllocationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const teams = useStore((s) => s.teams);
  const equipment = useStore((s) => s.equipment);
  const projects = useStore((s) => s.projects).filter((p) => p.status === 'executie' || p.status === 'pregatire');
  const allocations = useStore((s) => s.allocations);
  const today = useStore((s) => s.today);
  const add = useStore((s) => s.addAllocation);
  const [type, setType] = useState<Allocation['resourceType']>('team');
  const [resourceId, setResourceId] = useState('t-3');
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [start, setStart] = useState(addDays(today, 6));
  const [end, setEnd] = useState(addDays(today, 20));

  const draft: Allocation = { id: 'draft', resourceType: type, resourceId, projectId, start, end };
  const conflicts = useMemo(
    () => findAllocationConflicts([...allocations, draft], equipment, teams, (id) => projects.find((p) => p.id === id)?.city ?? id).filter((c) => c.a.id === 'draft' || c.b?.id === 'draft'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allocations, type, resourceId, projectId, start, end],
  );
  const options = type === 'team' ? teams.map((t) => ({ id: t.id, name: t.name })) : equipment.map((e) => ({ id: e.id, name: resourceName('equipment', e.id, teams, equipment) }));

  return (
    <Modal open={open} onClose={onClose} title="Alocă resursă pe proiect" footer={<><Button variant="ghost" onClick={onClose}>Renunță</Button><Button variant="primary" disabled={!projectId || end < start} onClick={() => { add({ resourceType: type, resourceId, projectId, start, end }); onClose(); }}>{conflicts.length ? 'Alocă oricum' : 'Alocă'}</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Tip resursă</Label><Select className="w-full" value={type} onChange={(e) => { const t = e.target.value as Allocation['resourceType']; setType(t); setResourceId(t === 'team' ? teams[0].id : equipment[0].id); }}><option value="team">Echipă</option><option value="equipment">Utilaj / vehicul</option></Select></div>
          <div><Label>Resursă</Label><Select className="w-full" value={resourceId} onChange={(e) => setResourceId(e.target.value)}>{options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></div>
        </div>
        <div><Label>Proiect</Label><Select className="w-full" value={projectId} onChange={(e) => setProjectId(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.city} – {p.name}</option>)}</Select></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>De la</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label>Până la</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>
        {conflicts.length > 0 ? (
          <div className="rounded-lg border border-warn-100 bg-warn-50 px-3 py-2.5 text-[13px] text-warn-700">
            <div className="mb-1 flex items-center gap-1.5 font-semibold"><AlertTriangle size={14} /> Suprapunere detectată</div>
            {conflicts.map((c, i) => <div key={i}>{c.detail}</div>)}
          </div>
        ) : <div className="rounded-lg bg-brand-50 px-3 py-2.5 text-[13px] text-brand-700">Resursa este liberă în perioada aleasă.</div>}
      </div>
    </Modal>
  );
}

function TeamsList() {
  const teams = useStore((s) => s.teams);
  const people = useStore((s) => s.people);
  const allocations = useStore((s) => s.allocations);
  const projects = useStore((s) => s.projects);
  const today = useStore((s) => s.today);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {teams.map((t) => {
        const now = allocations.filter((a) => a.resourceType === 'team' && a.resourceId === t.id && a.start <= today && a.end >= today);
        const next = allocations.filter((a) => a.resourceType === 'team' && a.resourceId === t.id && a.start > today).sort((a, b) => a.start.localeCompare(b.start))[0];
        const lead = people.find((p) => p.id === t.leadId);
        return (
          <Card key={t.id}>
            <CardHeader title={t.name} subtitle={t.specialty} action={<Badge tone={now.length ? 'brand' : 'neutral'}>{now.length ? 'Pe șantier' : 'Disponibilă'}</Badge>} />
            <div className="space-y-1.5 text-[13px]">
              <div className="flex justify-between"><span className="text-ink-500">Șef echipă</span><span className="font-medium">{lead?.name}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Componență</span><span className="font-medium">{t.memberIds.length} persoane</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Cost zilnic</span><span className="font-medium">{fmtMoney(t.dailyCost)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-ink-500">Acum</span><span className="text-right font-medium">{now.map((a) => `${projects.find((p) => p.id === a.projectId)?.city} (până la ${fmtDateShort(a.end)})`).join(', ') || '—'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-ink-500">Următorul</span><span className="text-right font-medium">{next ? `${projects.find((p) => p.id === next.projectId)?.city}, din ${fmtDateShort(next.start)}` : '—'}</span></div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function People() {
  const people = useStore((s) => s.people).filter((p) => p.hourlyCost > 0);
  const teams = useStore((s) => s.teams);
  return (
    <Card pad={false}>
      <Table>
        <thead><tr><Th className="pl-5">Nume</Th><Th>Funcție</Th><Th>Echipă</Th><Th align="right">Cost orar firmă</Th><Th className="pr-5">Telefon</Th></tr></thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id}>
              <Td className="pl-5 font-medium">{p.name}</Td>
              <Td className="text-ink-600">{p.position}</Td>
              <Td className="text-ink-600">{teams.find((t) => t.id === p.teamId)?.name ?? '—'}</Td>
              <Td align="right">{fmtMoney(p.hourlyCost)}</Td>
              <Td className="pr-5 text-ink-500">{p.phone}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="border-t border-ink-100 px-5 py-3 text-[12px] text-ink-400">Persoane fictive. Costurile orare sunt orientative și includ contribuțiile angajatorului.</div>
    </Card>
  );
}

function EquipmentList() {
  const equipment = useStore((s) => s.equipment);
  const allocations = useStore((s) => s.allocations);
  const projects = useStore((s) => s.projects);
  const today = useStore((s) => s.today);
  return (
    <Card pad={false}>
      <Table>
        <thead><tr><Th className="pl-5">Utilaj / vehicul</Th><Th>Tip</Th><Th>Stare</Th><Th>Alocare curentă</Th><Th align="right" className="pr-5">Cost zilnic</Th></tr></thead>
        <tbody>
          {equipment.map((e) => {
            const now = allocations.find((a) => a.resourceType === 'equipment' && a.resourceId === e.id && a.start <= today && a.end >= today);
            return (
              <tr key={e.id}>
                <Td className="pl-5"><div className="font-medium">{e.name}</div>{e.plate && <div className="text-[12px] text-ink-500">{e.plate}</div>}</Td>
                <Td><Badge tone="neutral">{e.kind === 'utilaj' ? 'Utilaj' : 'Vehicul'}</Badge></Td>
                <Td>{e.status === 'service' ? <Badge tone="warn">Service până la {fmtDateShort(e.serviceUntil!)}</Badge> : now ? <Badge tone="brand">Alocat</Badge> : <Badge tone="info">Disponibil</Badge>}</Td>
                <Td className="text-[13px] text-ink-600">{now ? <Link className="hover:underline" to={`/proiecte/${now.projectId}?tab=echipe`}>{projects.find((p) => p.id === now.projectId)?.city}, până la {fmtDateShort(now.end)}</Link> : '—'}</Td>
                <Td align="right" className="pr-5">{fmtMoney(e.dailyCost)}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <div className="border-t border-ink-100 px-5 py-3 text-[12px] text-ink-400">Fără integrare GPS: starea și alocarea provin din planificare, nu din localizarea vehiculelor.</div>
    </Card>
  );
}
