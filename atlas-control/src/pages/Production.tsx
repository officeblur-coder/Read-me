import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronRight, Plus } from 'lucide-react';
import { useStore } from '../store/store';
import { usePermission } from '../store/derived';
import { Card, PageHeader, Button, Progress, Modal, Label, Input, Select, DemoTag } from '../components/ui';
import { PRODUCTION_STATUS_LABEL } from '../domain/labels';
import { fmtDateShort, fmtMoney, fmtRon } from '../domain/format';
import type { ProductionOrder } from '../domain/types';

const COLUMNS: ProductionOrder['status'][] = ['planificat', 'in_lucru', 'control_calitate', 'finalizat', 'livrat'];

export function ProductionPage() {
  const orders = useStore((s) => s.productionOrders);
  const projects = useStore((s) => s.projects);
  const advance = useStore((s) => s.advanceProduction);
  const today = useStore((s) => s.today);
  const canEdit = usePermission('production.edit');
  const [open, setOpen] = useState(false);
  const total = (o: ProductionOrder) => (o.unitCost.materiale + o.unitCost.manopera + o.unitCost.regie) * o.qty;
  const wip = orders.filter((o) => o.status !== 'livrat' && o.status !== 'finalizat');

  return (
    <div>
      <PageHeader
        eyebrow="Producție proprie"
        title="Ordine de producție"
        subtitle={`Echipamente sportive, locuri de joacă și structuri metalice fabricate intern. ${wip.length} ordine active, cost estimat ${fmtMoney(wip.reduce((a, o) => a + total(o), 0))}.`}
        actions={<><DemoTag />{canEdit && <Button variant="primary" onClick={() => setOpen(true)}><Plus size={15} /> Ordin nou</Button>}</>}
      />
      <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="grid min-w-[1100px] grid-cols-5 gap-4">
          {COLUMNS.map((c) => {
            const list = orders.filter((o) => o.status === c);
            return (
              <div key={c} className="rounded-xl bg-ink-100/60 p-2.5">
                <div className="mb-2 flex items-center justify-between px-1.5 text-[12.5px] font-semibold text-ink-700">{PRODUCTION_STATUS_LABEL[c]}<span className="rounded bg-white px-1.5 text-[11px] text-ink-500">{list.length}</span></div>
                <div className="space-y-2.5">
                  {list.map((o) => {
                    const project = projects.find((p) => p.id === o.projectId);
                    const late = o.due < today && c !== 'finalizat' && c !== 'livrat';
                    return (
                      <Card key={o.id} className="!p-3.5">
                        <div className="truncate text-[11.5px] text-ink-500"><span className="font-medium text-ink-700">{o.number}</span> · {o.family}</div>
                        <div className="mt-1.5 text-[13.5px] font-semibold leading-snug text-ink-900">{o.qty} × {o.product}</div>
                        {project ? <Link to={`/proiecte/${project.id}?tab=materiale`} className="mt-0.5 block text-[12px] text-brand-700 hover:underline">Pentru {project.city}</Link> : <div className="mt-0.5 text-[12px] text-ink-500">Pentru stoc</div>}
                        <div className="mt-2.5 flex items-center gap-2"><Progress value={o.progress} className="flex-1" /><span className="text-[11.5px] tabular-nums text-ink-500">{o.progress}%</span></div>
                        <div className="mt-2.5 grid grid-cols-3 gap-1 text-[11px] text-ink-500">
                          <div>Materiale<div className="font-medium text-ink-800">{fmtRon(o.unitCost.materiale * o.qty)}</div></div>
                          <div>Manoperă<div className="font-medium text-ink-800">{fmtRon(o.unitCost.manopera * o.qty)}</div></div>
                          <div>Regie<div className="font-medium text-ink-800">{fmtRon(o.unitCost.regie * o.qty)}</div></div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between border-t border-ink-100 pt-2.5 text-[12px]">
                          <span className={clsx(late ? 'font-medium text-risk-600' : 'text-ink-500')}>Termen {fmtDateShort(o.due)}</span>
                          {canEdit && c !== 'livrat' && (
                            <button onClick={() => advance(o.id)} className="inline-flex items-center gap-0.5 font-medium text-brand-700 hover:underline">{PRODUCTION_STATUS_LABEL[COLUMNS[COLUMNS.indexOf(c) + 1]]}<ChevronRight size={13} /></button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-4 text-[12px] text-ink-400">Costul estimat de fabricație = materiale + manoperă atelier + regie de producție, pe unitate × cantitate. Valorile sunt orientative și fictive.</p>
      <NewOrder open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

const TEMPLATES = [
  { product: 'Poartă minifotbal aluminiu 3×2 m', family: 'Echipamente sportive' as const, unitCost: { materiale: 2_900, manopera: 1_150, regie: 520 } },
  { product: 'Panou baschet cu stâlp și coș', family: 'Echipamente sportive' as const, unitCost: { materiale: 4_100, manopera: 1_650, regie: 760 } },
  { product: 'Leagăn dublu cu cuib', family: 'Locuri de joacă' as const, unitCost: { materiale: 3_350, manopera: 1_480, regie: 640 } },
  { product: 'Ansamblu de joacă multifuncțional „Cetate”', family: 'Locuri de joacă' as const, unitCost: { materiale: 24_800, manopera: 9_600, regie: 3_900 } },
  { product: 'Panou împrejmuire bordurat 2,5×2,03 m', family: 'Structuri metalice' as const, unitCost: { materiale: 118, manopera: 46, regie: 21 } },
];

function NewOrder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const projects = useStore((s) => s.projects).filter((p) => p.status === 'executie' || p.status === 'pregatire');
  const add = useStore((s) => s.addProductionOrder);
  const today = useStore((s) => s.today);
  const [t, setT] = useState(0);
  const [qty, setQty] = useState('2');
  const [projectId, setProjectId] = useState('');
  const [due, setDue] = useState('2026-11-13');
  const tpl = TEMPLATES[t];
  const q = Number(qty) || 0;
  return (
    <Modal open={open} onClose={onClose} title="Ordin de producție nou" footer={<><Button variant="ghost" onClick={onClose}>Renunță</Button><Button variant="primary" disabled={!q} onClick={() => { add({ product: tpl.product, family: tpl.family, qty: q, projectId: projectId || undefined, start: today, due, unitCost: tpl.unitCost }); onClose(); }}>Lansează</Button></>}>
      <div className="space-y-4">
        <div><Label>Produs</Label><Select className="w-full" value={t} onChange={(e) => setT(+e.target.value)}>{TEMPLATES.map((x, i) => <option key={x.product} value={i}>{x.product}</option>)}</Select></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Cantitate</Label><Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" /></div>
          <div><Label>Termen</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        </div>
        <div><Label>Destinație</Label><Select className="w-full" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">Stoc</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.city} – {p.name}</option>)}</Select></div>
        <div className="rounded-lg bg-ink-50 px-3 py-2.5 text-[13px] text-ink-600">Cost estimat de fabricație: <span className="font-semibold text-ink-900">{fmtRon((tpl.unitCost.materiale + tpl.unitCost.manopera + tpl.unitCost.regie) * q)}</span></div>
      </div>
    </Modal>
  );
}
