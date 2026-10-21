import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Trash2, Info, Check, X } from 'lucide-react';
import { useStore } from '../../store/store';
import { usePermission } from '../../store/derived';
import type { ProjectRow } from '../../domain/portfolio';
import type { CostCategory } from '../../domain/types';
import { CATEGORY_LABEL, COST_CATEGORIES, commitmentOpenAmount } from '../../domain/finance';
import { Card, CardHeader, Button, Badge, Modal, Input, Select, Label, Flash, Table, Th, Td, RiskBadge, Segmented } from '../../components/ui';
import { fmtMoney, fmtPct, fmtDateShort, fmtRon } from '../../domain/format';
import { BudgetBar } from './OverviewTab';

export function FinanceTab({ row }: { row: ProjectRow }) {
  const p = row.project;
  const { fin, risk } = row;
  const canEdit = usePermission('finance.edit');
  const canApprove = usePermission('requests.approve');
  const thresholds = useStore((s) => s.thresholds);
  const setEtc = useStore((s) => s.setEtc);
  const removeCost = useStore((s) => s.removeCost);
  const registerPayment = useStore((s) => s.registerPayment);
  const setChangeOrderStatus = useStore((s) => s.setChangeOrderStatus);
  const [addCostOpen, setAddCostOpen] = useState(false);
  const [coOpen, setCoOpen] = useState(false);
  const [ledger, setLedger] = useState<'efective' | 'angajamente' | 'facturi'>('efective');
  const [catFilter, setCatFilter] = useState<CostCategory | 'all'>('all');

  const costs = [...p.costs].filter((c) => catFilter === 'all' || c.category === catFilter).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      {/* Formula */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <Figure label="Venit contractual actualizat" value={fin.revenue} note={`Contract ${fmtMoney(fin.contractValue)}${fin.approvedChangeOrders ? ` + acte adiționale ${fmtMoney(fin.approvedChangeOrders)}` : ''}, fără TVA`} />
        <Op>−</Op>
        <Figure label="Cost total estimat la finalizare" value={fin.eac} note={<>Efective {fmtMoney(fin.actual)} + angajate {fmtMoney(fin.committedOpen)} + rămase {fmtMoney(fin.etc)}</>} />
        <Op>=</Op>
        <Figure
          label="Profit brut estimat" value={fin.profit} strong tone={risk.level}
          note={<>Marjă <span className="font-semibold">{fmtPct(fin.margin)}</span> · planificat {fmtMoney(fin.plannedProfit)} ({fmtPct(fin.plannedMargin)})</>}
        />
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2"><h3 className="text-[15px] font-semibold text-ink-900">Stare financiară</h3><RiskBadge level={risk.level} /></div>
            <p className="mt-1 text-[13px] text-ink-500">
              {risk.reasons.length ? risk.reasons.join(' · ') : 'Proiectul este în limitele stabilite.'}
            </p>
          </div>
          <div className="rounded-lg bg-ink-50 px-3 py-2 text-[12px] leading-relaxed text-ink-500">
            Praguri: galben sub {thresholds.marginWarnPct}% marjă sau peste {thresholds.overrunWarnPct}% depășire;
            roșu sub {thresholds.marginRiskPct}% sau peste {thresholds.overrunRiskPct}% depășire.
          </div>
        </div>
        <BudgetBar fin={fin} />
      </Card>

      <Card pad={false}>
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <CardHeader className="!mb-0" title="Costuri pe categorii" subtitle="Rămase estimate = ce nu este încă nici facturat, nici comandat. Editabil de managerul de proiect și directorul financiar." />
        </div>
        <Table className="mt-4">
          <thead>
            <tr>
              <Th className="pl-5">Categorie</Th>
              <Th align="right">Buget</Th>
              <Th align="right">Efective</Th>
              <Th align="right">Angajate neincluse</Th>
              <Th align="right">Rămase estimate</Th>
              <Th align="right">Cost estimat (EAC)</Th>
              <Th align="right" className="pr-5">Abatere</Th>
            </tr>
          </thead>
          <tbody>
            {fin.categories.map((c) => (
              <tr key={c.category} className={clsx(c.variance < -1000 && 'bg-risk-50/40')}>
                <Td className="pl-5 font-medium">{CATEGORY_LABEL[c.category]}</Td>
                <Td align="right">{fmtRon(c.budget)}</Td>
                <Td align="right"><Flash value={c.actual}>{fmtRon(c.actual)}</Flash></Td>
                <Td align="right"><Flash value={c.committedOpen}>{fmtRon(c.committedOpen)}</Flash></Td>
                <Td align="right">
                  {canEdit ? (
                    <EtcInput value={c.etc} onCommit={(v) => setEtc(p.id, c.category, v)} />
                  ) : <Flash value={c.etc}>{fmtRon(c.etc)}</Flash>}
                </Td>
                <Td align="right" className="font-medium"><Flash value={c.eac}>{fmtRon(c.eac)}</Flash></Td>
                <Td align="right" className={clsx('pr-5 font-medium', c.variance < -1000 ? 'text-risk-600' : c.variance > 1000 ? 'text-brand-700' : 'text-ink-500')}>
                  {c.variance > 0 ? '+' : ''}{fmtRon(c.variance)}
                </Td>
              </tr>
            ))}
            {fin.changeOrderBudget > 0 && (
              <tr>
                <Td className="pl-5 text-ink-600">Suplimentare buget din acte adiționale</Td>
                <Td align="right">{fmtRon(fin.changeOrderBudget)}</Td><Td /><Td /><Td /><Td />
                <Td align="right" className="pr-5 text-brand-700">+{fmtRon(fin.changeOrderBudget)}</Td>
              </tr>
            )}
            <tr className="bg-ink-50/70 font-semibold">
              <Td className="pl-5">Total</Td>
              <Td align="right">{fmtRon(fin.budget)}</Td>
              <Td align="right">{fmtRon(fin.actual)}</Td>
              <Td align="right">{fmtRon(fin.committedOpen)}</Td>
              <Td align="right">{fmtRon(fin.etc)}</Td>
              <Td align="right"><Flash value={fin.eac}>{fmtRon(fin.eac)}</Flash></Td>
              <Td align="right" className={clsx('pr-5', fin.budget - fin.eac < 0 ? 'text-risk-600' : 'text-brand-700')}>{fin.budget - fin.eac > 0 ? '+' : ''}{fmtRon(fin.budget - fin.eac)}</Td>
            </tr>
          </tbody>
        </Table>
        <div className="flex items-start gap-2 border-t border-ink-100 px-5 py-3 text-[12px] text-ink-500">
          <Info size={14} className="mt-0.5 shrink-0" />
          Fără dublă contabilizare: o factură legată de un angajament reduce partea deschisă a angajamentului; manopera raportată din șantier și transferurile din depozit reduc estimarea rămasă cu aceeași sumă.
        </div>
      </Card>

      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <Segmented value={ledger} onChange={setLedger} options={[{ id: 'efective', label: `Costuri efective (${p.costs.length})` }, { id: 'angajamente', label: `Angajamente (${p.commitments.length})` }, { id: 'facturi', label: `Facturare (${p.invoices.length})` }]} />
          <div className="flex items-center gap-2">
            {ledger === 'efective' && (
              <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value as typeof catFilter)}>
                <option value="all">Toate categoriile</option>
                {COST_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </Select>
            )}
            {canEdit && ledger !== 'facturi' && <Button variant="primary" size="sm" onClick={() => setAddCostOpen(true)}><Plus size={15} /> Adaugă cost</Button>}
          </div>
        </div>
        {ledger === 'efective' && (
          <Table>
            <thead><tr><Th className="pl-5">Data</Th><Th>Descriere</Th><Th>Categorie</Th><Th>Furnizor / sursă</Th><Th align="right">Sumă</Th><Th className="pr-5" /></tr></thead>
            <tbody>
              {costs.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50/50">
                  <Td className="whitespace-nowrap pl-5 text-[13px] text-ink-500">{fmtDateShort(c.date)}</Td>
                  <Td>
                    <div className="text-[13px] text-ink-900">{c.description}</div>
                    {c.commitmentId && <div className="text-[11.5px] text-ink-400">Facturat pe angajament</div>}
                  </Td>
                  <Td><Badge tone="neutral">{CATEGORY_LABEL[c.category]}</Badge></Td>
                  <Td className="text-[13px] text-ink-600">{c.supplier}{c.source === 'raport-santier' && <Badge tone="info" className="ml-2">Atlas Field</Badge>}{c.source === 'consum-stoc' && <Badge tone="info" className="ml-2">Depozit</Badge>}</Td>
                  <Td align="right" className="font-medium">{fmtRon(c.amount)}</Td>
                  <Td className="pr-5 text-right">
                    {canEdit && c.source === 'manual' && <button onClick={() => removeCost(p.id, c.id)} className="rounded p-1 text-ink-300 hover:bg-risk-50 hover:text-risk-600" aria-label="Șterge"><Trash2 size={14} /></button>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {ledger === 'angajamente' && (
          <Table>
            <thead><tr><Th className="pl-5">Data</Th><Th>Angajament</Th><Th>Furnizor</Th><Th align="right">Valoare</Th><Th align="right">Facturat</Th><Th align="right" className="pr-5">Deschis</Th></tr></thead>
            <tbody>
              {p.commitments.map((c) => {
                const open = commitmentOpenAmount(p, c.id);
                return (
                  <tr key={c.id}>
                    <Td className="whitespace-nowrap pl-5 text-[13px] text-ink-500">{fmtDateShort(c.date)}</Td>
                    <Td><div className="text-[13px] text-ink-900">{c.description}</div><div className="text-[11.5px] text-ink-400">{CATEGORY_LABEL[c.category]}</div></Td>
                    <Td className="text-[13px] text-ink-600">{c.supplier}</Td>
                    <Td align="right">{fmtRon(c.amount)}</Td>
                    <Td align="right" className="text-ink-500">{fmtRon(c.amount - open)}</Td>
                    <Td align="right" className="pr-5 font-medium">{fmtRon(open)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {ledger === 'facturi' && (
          <>
            <div className="grid grid-cols-2 gap-4 border-b border-ink-100 px-5 py-4 sm:grid-cols-4">
              <Mini label="Facturat" value={fmtMoney(fin.invoiced)} />
              <Mini label="Încasat" value={fmtMoney(fin.collected)} />
              <Mini label="Creanțe" value={fmtMoney(fin.receivables)} />
              <Mini label="Restante" value={fmtMoney(fin.overdueReceivables)} tone={fin.overdueReceivables > 0 ? 'risk' : undefined} />
            </div>
            <Table>
              <thead><tr><Th className="pl-5">Factură</Th><Th>Emisă</Th><Th>Scadentă</Th><Th align="right">Valoare</Th><Th align="right">Încasat</Th><Th className="pr-5" align="right">Stare</Th></tr></thead>
              <tbody>
                {p.invoices.map((i) => {
                  const overdue = i.paid < i.amount && i.dueDate < useStore.getState().today;
                  return (
                    <tr key={i.id}>
                      <Td className="pl-5 text-[13px] font-medium">{i.number}</Td>
                      <Td className="text-[13px] text-ink-500">{fmtDateShort(i.date)}</Td>
                      <Td className={clsx('text-[13px]', overdue ? 'font-medium text-risk-600' : 'text-ink-500')}>{fmtDateShort(i.dueDate)}</Td>
                      <Td align="right">{fmtRon(i.amount)}</Td>
                      <Td align="right">{fmtRon(i.paid)}</Td>
                      <Td align="right" className="pr-5">
                        {i.paid >= i.amount ? <Badge tone="brand">Încasată</Badge> : (
                          <div className="flex items-center justify-end gap-2">
                            <Badge tone={overdue ? 'risk' : 'neutral'}>{overdue ? 'Restantă' : 'În termen'}</Badge>
                            {canEdit && <Button size="sm" variant="ghost" onClick={() => registerPayment(p.id, i.id)}>Înregistrează încasarea</Button>}
                          </div>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {!p.invoices.length && <div className="p-8 text-center text-[13px] text-ink-500">Nicio factură emisă încă.</div>}
          </>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Acte adiționale"
          subtitle="Un act adițional modifică venitul și bugetul doar după aprobare. Cele propuse nu intră în calcul."
          action={canEdit && <Button size="sm" onClick={() => setCoOpen(true)}><Plus size={15} /> Propune act adițional</Button>}
        />
        {p.changeOrders.length === 0 ? <div className="text-[13px] text-ink-500">Niciun act adițional.</div> : (
          <div className="divide-y divide-ink-100 rounded-lg border border-ink-100">
            {p.changeOrders.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium text-ink-900">{c.title}</div>
                  <div className="text-[12px] text-ink-500">{fmtDateShort(c.date)} · venit +{fmtMoney(c.amount)} · buget de cost +{fmtMoney(c.costBudget)}</div>
                </div>
                <Badge tone={c.status === 'aprobat' ? 'brand' : c.status === 'respins' ? 'risk' : 'warn'}>{c.status === 'propus' ? 'Propus beneficiarului' : c.status === 'aprobat' ? 'Aprobat' : 'Respins'}</Badge>
                {canApprove && c.status === 'propus' && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="primary" onClick={() => setChangeOrderStatus(p.id, c.id, 'aprobat')}><Check size={14} /> Semnat de beneficiar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setChangeOrderStatus(p.id, c.id, 'respins')}><X size={14} /> Respins</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <AddCostModal open={addCostOpen} onClose={() => setAddCostOpen(false)} projectId={p.id} mode={ledger === 'angajamente' ? 'angajament' : 'efectiv'} />
      <ChangeOrderModal open={coOpen} onClose={() => setCoOpen(false)} projectId={p.id} suggested={Math.max(0, Math.round((fin.eac - fin.budget) / 1000) * 1000)} />
    </div>
  );
}

function Figure({ label, value, note, strong, tone }: { label: string; value: number; note: React.ReactNode; strong?: boolean; tone?: 'ok' | 'warn' | 'risk' }) {
  return (
    <div className={clsx('rounded-xl border p-4', strong ? (tone === 'risk' ? 'border-risk-100 bg-risk-50/60' : tone === 'warn' ? 'border-warn-100 bg-warn-50/60' : 'border-brand-100 bg-brand-50/60') : 'border-ink-200/70 bg-white')}>
      <div className="text-[12.5px] text-ink-500">{label}</div>
      <div className={clsx('mt-1 text-[24px] font-semibold tracking-[-0.02em] tabular-nums', value < 0 ? 'text-risk-600' : 'text-ink-900')}><Flash value={Math.round(value)}>{fmtMoney(value)}</Flash></div>
      <div className="mt-1 text-[12px] text-ink-500">{note}</div>
    </div>
  );
}

const Op = ({ children }: { children: React.ReactNode }) => <div className="hidden items-center justify-center text-[22px] font-light text-ink-300 lg:flex">{children}</div>;

const Mini = ({ label, value, tone }: { label: string; value: string; tone?: 'risk' }) => (
  <div><div className="text-[12px] text-ink-500">{label}</div><div className={clsx('text-[16px] font-semibold tabular-nums', tone === 'risk' ? 'text-risk-600' : 'text-ink-900')}>{value}</div></div>
);

function EtcInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const v = Number(draft.replace(/[^\d]/g, ''));
    if (!Number.isNaN(v) && v !== value) onCommit(v);
    setDraft(null);
  };
  return (
    <input
      inputMode="numeric"
      value={draft ?? new Intl.NumberFormat('ro-RO').format(value)}
      onFocus={() => setDraft(String(value))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setDraft(null); }}
      className="h-8 w-32 rounded-md border border-dashed border-ink-300 bg-white px-2 text-right text-sm tabular-nums text-ink-900 hover:border-brand-400 focus:border-solid focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      title="Editează costul estimat rămas"
    />
  );
}

function AddCostModal({ open, onClose, projectId, mode: initialMode }: { open: boolean; onClose: () => void; projectId: string; mode: 'efectiv' | 'angajament' }) {
  const addCost = useStore((s) => s.addCost);
  const addCommitment = useStore((s) => s.addCommitment);
  const setEtc = useStore((s) => s.setEtc);
  const today = useStore((s) => s.today);
  const project = useStore((s) => s.projects.find((p) => p.id === projectId))!;
  const [mode, setMode] = useState(initialMode);
  const [category, setCategory] = useState<CostCategory>('materiale');
  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [amount, setAmount] = useState('');
  const [fromEtc, setFromEtc] = useState(true);
  const [commitmentId, setCommitmentId] = useState('');
  const value = Number(amount.replace(/[^\d]/g, '')) || 0;
  const commitments = project.commitments.filter((c) => c.category === category && commitmentOpenAmount(project, c.id) > 0);

  const save = () => {
    if (!value || !description) return;
    if (mode === 'efectiv') addCost(projectId, { date: today, category, description, supplier: supplier || '—', amount: value, source: 'manual', commitmentId: commitmentId || undefined });
    else addCommitment(projectId, { date: today, category, description, supplier: supplier || '—', amount: value });
    // Dacă suma era deja prevăzută în estimarea rămasă, o mutăm din ETC (altfel ar fi numărată de două ori).
    if (fromEtc && !commitmentId) setEtc(projectId, category, Math.max(0, project.etc[category] - value));
    setDescription(''); setSupplier(''); setAmount(''); setCommitmentId('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Înregistrează cost" footer={<><Button variant="ghost" onClick={onClose}>Renunță</Button><Button variant="primary" onClick={save} disabled={!value || !description}>Salvează</Button></>}>
      <div className="space-y-4">
        <Segmented value={mode} onChange={setMode} options={[{ id: 'efectiv', label: 'Cost efectiv (factură)' }, { id: 'angajament', label: 'Angajament (comandă)' }]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Categorie</Label><Select value={category} onChange={(e) => { setCategory(e.target.value as CostCategory); setCommitmentId(''); }} className="w-full">{COST_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select></div>
          <div><Label hint="lei, fără TVA">Sumă</Label><Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></div>
        </div>
        <div><Label>Descriere</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Transport suplimentar agregate" /></div>
        <div><Label>Furnizor</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Opțional" /></div>
        {mode === 'efectiv' && commitments.length > 0 && (
          <div>
            <Label hint="evită dubla contabilizare">Factură pe un angajament existent?</Label>
            <Select value={commitmentId} onChange={(e) => setCommitmentId(e.target.value)} className="w-full">
              <option value="">Nu, cost nou</option>
              {commitments.map((c) => <option key={c.id} value={c.id}>{c.description} (deschis {fmtMoney(commitmentOpenAmount(project, c.id))})</option>)}
            </Select>
          </div>
        )}
        {!commitmentId && (
          <label className="flex items-start gap-2 text-[13px] text-ink-700">
            <input type="checkbox" checked={fromEtc} onChange={(e) => setFromEtc(e.target.checked)} className="mt-0.5 accent-brand-600" />
            <span>Suma era prevăzută în costul estimat rămas ({fmtMoney(project.etc[category])}) — o scad din estimare. Debifează dacă este un cost suplimentar neprevăzut.</span>
          </label>
        )}
      </div>
    </Modal>
  );
}

function ChangeOrderModal({ open, onClose, projectId, suggested }: { open: boolean; onClose: () => void; projectId: string; suggested: number }) {
  const add = useStore((s) => s.addChangeOrder);
  const today = useStore((s) => s.today);
  const [title, setTitle] = useState('Lucrări suplimentare de drenaj și stabilizare a terenului');
  const [cost, setCost] = useState(String(suggested || 100_000));
  const [markup, setMarkup] = useState('15');
  const costV = Number(cost.replace(/[^\d]/g, '')) || 0;
  const revenue = Math.round(costV * (1 + (Number(markup) || 0) / 100) / 100) * 100;
  return (
    <Modal open={open} onClose={onClose} title="Propune act adițional" footer={<><Button variant="ghost" onClick={onClose}>Renunță</Button><Button variant="primary" disabled={!costV || !title} onClick={() => { add(projectId, { title, amount: revenue, costBudget: costV, status: 'propus', date: today }); onClose(); }}>Trimite spre aprobare</Button></>}>
      <div className="space-y-4">
        <div><Label>Obiect</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label hint="lei">Cost suplimentar estimat</Label><Input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" /></div>
          <div><Label hint="%">Adaos</Label><Input value={markup} onChange={(e) => setMarkup(e.target.value)} inputMode="numeric" /></div>
        </div>
        <div className="rounded-lg bg-ink-50 px-3 py-2.5 text-[13px] text-ink-700">Valoare propusă beneficiarului: <span className="font-semibold">{fmtMoney(revenue)}</span> fără TVA. Intră în venit și buget numai după semnare.</div>
      </div>
    </Modal>
  );
}
