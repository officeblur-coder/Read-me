import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useStore } from '../store/store';
import { usePermission } from '../store/derived';
import { Card, PageHeader, Tabs, Table, Th, Td, Badge, Button, Modal, Label, Input, Select, Progress, DemoTag } from '../components/ui';
import { RequestCard } from '../features/requests/RequestCard';
import { fmtDateShort, fmtNum, fmtRon, fmtMoney, normalize } from '../domain/format';

type Tab = 'stocuri' | 'necesar' | 'solicitari' | 'comenzi' | 'transferuri';

export function MaterialsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'stocuri';
  const requests = useStore((s) => s.requests);
  const pos = useStore((s) => s.purchaseOrders);
  const transfers = useStore((s) => s.transfers);
  const materials = useStore((s) => s.materials);
  const stockValue = materials.reduce((a, m) => a + m.stock * m.unitCost, 0);
  const below = materials.filter((m) => m.stock < m.minStock).length;
  const pending = requests.filter((r) => r.status === 'in_asteptare').length;
  const canFinance = usePermission('finance.view');

  return (
    <div>
      <PageHeader
        eyebrow="Materiale și stocuri"
        title="Gestiune materiale, aprovizionare și consum"
        subtitle={`Depozit central Târgu Mureș: valoare stoc ${fmtMoney(stockValue)}, ${below} articole sub stocul minim.`}
        actions={<DemoTag />}
      />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
        tabs={[
          { id: 'stocuri', label: 'Catalog și stocuri', count: materials.length },
          { id: 'necesar', label: 'Necesar pe proiecte' },
          { id: 'solicitari', label: 'Solicitări din șantier', count: pending || undefined },
          { id: 'comenzi', label: 'Comenzi furnizori', count: pos.filter((p) => p.status !== 'receptionata').length },
          { id: 'transferuri', label: 'Transferuri', count: transfers.length },
        ]}
      />
      {tab === 'stocuri' && <Stock />}
      {tab === 'necesar' && <Needs />}
      {tab === 'solicitari' && (
        <div className="space-y-3">
          {[...requests].sort((a, b) => (a.status === 'in_asteptare' ? -1 : 1) - (b.status === 'in_asteptare' ? -1 : 1) || b.date.localeCompare(a.date)).map((r) => <RequestCard key={r.id} request={r} showImpact={canFinance} />)}
        </div>
      )}
      {tab === 'comenzi' && <Orders />}
      {tab === 'transferuri' && <Transfers />}
    </div>
  );
}

function Stock() {
  const materials = useStore((s) => s.materials);
  const pms = useStore((s) => s.projectMaterials);
  const [q, setQ] = useState('');
  const list = materials.filter((m) => !q || normalize(`${m.name} ${m.code} ${m.category}`).includes(normalize(q)));
  return (
    <Card pad={false}>
      <div className="p-3"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută material" className="max-w-sm" /></div>
      <Table>
        <thead><tr><Th className="pl-5">Material</Th><Th>Categorie</Th><Th align="right">Stoc</Th><Th align="right">Rezervat proiecte</Th><Th align="right">Disponibil</Th><Th>Nivel</Th><Th align="right">Cost unitar</Th><Th align="right" className="pr-5">Valoare stoc</Th></tr></thead>
        <tbody>
          {list.map((m) => {
            const reserved = pms.filter((p) => p.materialId === m.id).reduce((a, p) => a + p.reserved, 0);
            const free = m.stock - reserved;
            const lvl = m.minStock ? (m.stock / (m.minStock * 2)) * 100 : 100;
            return (
              <tr key={m.id}>
                <Td className="pl-5"><div className="font-medium">{m.name}</div><div className="text-[12px] text-ink-500">{m.code} · {m.ownProduction ? 'Producție proprie' : m.supplier}</div></Td>
                <Td className="text-[13px] text-ink-600">{m.category}</Td>
                <Td align="right">{fmtNum(m.stock)} {m.unit}</Td>
                <Td align="right" className="text-ink-500">{fmtNum(reserved)}</Td>
                <Td align="right" className={clsx('font-medium', free < 0 && 'text-risk-600')}>{fmtNum(free)}</Td>
                <Td className="w-28"><Progress value={lvl} tone={m.stock < m.minStock ? 'risk' : lvl < 70 ? 'warn' : 'brand'} /></Td>
                <Td align="right">{fmtRon(m.unitCost)}</Td>
                <Td align="right" className="pr-5">{fmtRon(m.stock * m.unitCost)}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}

function Needs() {
  const pms = useStore((s) => s.projectMaterials);
  const materials = useStore((s) => s.materials);
  const projects = useStore((s) => s.projects).filter((p) => p.status === 'executie' || p.status === 'pregatire');
  const reserve = useStore((s) => s.reserveStock);
  const transfer = useStore((s) => s.transferToSite);
  const canEdit = usePermission('materials.edit');
  const [projectId, setProjectId] = useState(projects[0]?.id);
  const [action, setAction] = useState<{ kind: 'reserve' | 'transfer'; materialId: string; max: number } | null>(null);
  const [qty, setQty] = useState('');
  const list = pms.filter((p) => p.projectId === projectId);
  const project = projects.find((p) => p.id === projectId);

  return (
    <Card pad={false}>
      <div className="flex flex-wrap items-center gap-3 p-3">
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.city} – {p.name}</option>)}
        </Select>
        {project && <Link to={`/proiecte/${project.id}?tab=materiale`} className="text-[13px] font-medium text-brand-700 hover:underline">Fișa proiectului</Link>}
      </div>
      <Table>
        <thead><tr><Th className="pl-5">Material</Th><Th align="right">Necesar</Th><Th align="right">Rezervat</Th><Th align="right">Transferat</Th><Th align="right">Consumat</Th><Th align="right">De asigurat</Th><Th align="right">Stoc depozit</Th><Th className="pr-5" /></tr></thead>
        <tbody>
          {list.map((pm) => {
            const m = materials.find((x) => x.id === pm.materialId)!;
            const rest = Math.max(0, pm.planned - pm.transferred - pm.reserved);
            return (
              <tr key={pm.materialId}>
                <Td className="pl-5 font-medium">{m.name}</Td>
                <Td align="right">{fmtNum(pm.planned)} {m.unit}</Td>
                <Td align="right">{fmtNum(pm.reserved)}</Td>
                <Td align="right">{fmtNum(pm.transferred)}</Td>
                <Td align="right">{fmtNum(pm.consumed)}</Td>
                <Td align="right" className={clsx('font-medium', rest > m.stock && 'text-risk-600')}>{fmtNum(rest)}</Td>
                <Td align="right" className={m.stock < m.minStock ? 'text-warn-700' : ''}>{fmtNum(m.stock)}</Td>
                <Td className="pr-5 text-right">
                  {canEdit && (
                    <div className="flex justify-end gap-1.5">
                      {rest > 0 && m.stock > 0 && <Button size="sm" variant="ghost" onClick={() => { setAction({ kind: 'reserve', materialId: m.id, max: Math.min(rest, m.stock) }); setQty(String(Math.min(rest, m.stock))); }}>Rezervă</Button>}
                      {(pm.reserved > 0 || (rest > 0 && m.stock > 0)) && <Button size="sm" onClick={() => { const max = Math.min(m.stock, pm.reserved || rest); setAction({ kind: 'transfer', materialId: m.id, max }); setQty(String(max)); }}>Transferă</Button>}
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <div className="border-t border-ink-100 px-5 py-3 text-[12px] text-ink-500">Transferul din depozit înregistrează costul materialului pe proiect și reduce cu aceeași sumă costul estimat rămas, deci profitul estimat nu se dublează.</div>
      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={action?.kind === 'reserve' ? 'Rezervă stoc pentru proiect' : 'Transfer din depozit pe șantier'}
        footer={<><Button variant="ghost" onClick={() => setAction(null)}>Renunță</Button><Button variant="primary" onClick={() => { const v = Math.min(action!.max, Number(qty) || 0); if (v > 0 && projectId) { if (action!.kind === 'reserve') reserve(projectId, action!.materialId, v); else transfer(projectId, action!.materialId, v); } setAction(null); }}>Confirmă</Button></>}
      >
        {action && (() => {
          const m = materials.find((x) => x.id === action.materialId)!;
          return (
            <div className="space-y-3">
              <div className="text-[13.5px] font-medium text-ink-900">{m.name}</div>
              <div><Label hint={`maxim ${fmtNum(action.max)} ${m.unit}`}>Cantitate</Label><Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" /></div>
              <div className="rounded-lg bg-ink-50 px-3 py-2 text-[13px] text-ink-600">Valoare: <span className="font-medium text-ink-900">{fmtRon((Number(qty) || 0) * m.unitCost)}</span></div>
            </div>
          );
        })()}
      </Modal>
    </Card>
  );
}

function Orders() {
  const pos = useStore((s) => s.purchaseOrders);
  const materials = useStore((s) => s.materials);
  const projects = useStore((s) => s.projects);
  const receive = useStore((s) => s.receivePurchaseOrder);
  const canEdit = usePermission('materials.edit');
  return (
    <Card pad={false}>
      <Table>
        <thead><tr><Th className="pl-5">Comandă</Th><Th>Furnizor</Th><Th>Destinație</Th><Th>Articole</Th><Th align="right">Valoare</Th><Th>Livrare</Th><Th align="right" className="pr-5">Stare</Th></tr></thead>
        <tbody>
          {pos.map((o) => {
            const value = o.items.reduce((a, it) => a + it.qty * (materials.find((m) => m.id === it.materialId)?.unitCost ?? 0), 0);
            const proj = projects.find((p) => p.id === o.projectId);
            return (
              <tr key={o.id}>
                <Td className="pl-5"><div className="font-medium">{o.number}</div><div className="text-[12px] text-ink-500">{fmtDateShort(o.date)}</div></Td>
                <Td className="text-[13px] text-ink-600">{o.supplier}</Td>
                <Td className="text-[13px]">{proj ? <Link to={`/proiecte/${proj.id}?tab=materiale`} className="hover:underline">Șantier {proj.city}</Link> : 'Depozit central'}</Td>
                <Td className="text-[12.5px] text-ink-600">{o.items.map((it) => `${materials.find((m) => m.id === it.materialId)?.name} (${fmtNum(it.qty)})`).join(', ')}</Td>
                <Td align="right">{fmtRon(value)}</Td>
                <Td className="text-[13px] text-ink-600">{fmtDateShort(o.expected)}</Td>
                <Td align="right" className="pr-5">
                  {o.status === 'receptionata' ? <Badge tone="brand">Recepționată</Badge> : (
                    <div className="flex items-center justify-end gap-2">
                      <Badge tone="neutral">{o.status === 'emisa' ? 'Emisă' : 'Confirmată'}</Badge>
                      {canEdit && <Button size="sm" onClick={() => receive(o.id)}>Recepționează</Button>}
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <div className="border-t border-ink-100 px-5 py-3 text-[12px] text-ink-500">Comenzile directe pe șantier sunt deja angajamente pe proiect; recepția lor actualizează cantitatea aflată pe șantier, fără cost nou.</div>
    </Card>
  );
}

function Transfers() {
  const transfers = useStore((s) => s.transfers);
  const materials = useStore((s) => s.materials);
  const projects = useStore((s) => s.projects);
  return (
    <Card pad={false}>
      <Table>
        <thead><tr><Th className="pl-5">Aviz</Th><Th>Data</Th><Th>Șantier</Th><Th>Articole</Th><Th align="right" className="pr-5">Stare</Th></tr></thead>
        <tbody>
          {transfers.map((t) => (
            <tr key={t.id}>
              <Td className="pl-5 font-medium">{t.number}</Td>
              <Td className="text-[13px] text-ink-600">{fmtDateShort(t.date)}</Td>
              <Td className="text-[13px]">{projects.find((p) => p.id === t.projectId)?.city}</Td>
              <Td className="text-[12.5px] text-ink-600">{t.items.map((it) => { const m = materials.find((x) => x.id === it.materialId); return `${m?.name} (${fmtNum(it.qty)} ${m?.unit})`; }).join(', ')}</Td>
              <Td align="right" className="pr-5"><Badge tone={t.status === 'livrat' ? 'brand' : t.status === 'in_tranzit' ? 'info' : 'neutral'}>{t.status === 'livrat' ? 'Livrat' : t.status === 'in_tranzit' ? 'În tranzit' : 'Pregătit'}</Badge></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
