import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Download, Printer } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../store/store';
import { useTotals, useVisibleRows } from '../store/derived';
import { Card, CardHeader, PageHeader, Button, Table, Th, Td, RiskBadge, Segmented, Flash, riskColor } from '../components/ui';
import { axisProps, GRID } from '../components/charts';
import { fmtMoney, fmtPct, fmtRon } from '../domain/format';
import { CATEGORY_LABEL, COST_CATEGORIES } from '../domain/finance';
import { isActive } from '../domain/portfolio';
import { STATUS_LABEL } from '../domain/labels';

type Scope = 'active' | 'all' | 'finalizat';

export function FinancePage() {
  const rows = useVisibleRows();
  const totals = useTotals();
  const thresholds = useStore((s) => s.thresholds);
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>('active');

  const list = useMemo(() => rows.filter((r) => scope === 'all' ? true : scope === 'active' ? isActive(r.project) : r.project.status === 'finalizat')
    .sort((a, b) => a.fin.margin - b.fin.margin), [rows, scope]);

  const sum = (f: (r: (typeof list)[number]) => number) => list.reduce((a, r) => a + f(r), 0);
  const catTotals = COST_CATEGORIES.map((c) => ({
    category: c,
    budget: list.reduce((a, r) => a + r.fin.categories.find((x) => x.category === c)!.budget, 0),
    eac: list.reduce((a, r) => a + r.fin.categories.find((x) => x.category === c)!.eac, 0),
  }));
  const marginData = [...list].sort((a, b) => b.fin.margin - a.fin.margin).map((r) => ({ name: r.project.city, margin: +r.fin.margin.toFixed(1), level: r.risk.level, id: r.project.id }));

  const exportCsv = () => {
    const head = ['Cod', 'Proiect', 'Localitate', 'Judet', 'Status', 'Venit actualizat', 'Buget', 'Efective', 'Angajate', 'Ramase', 'Cost estimat', 'Profit estimat', 'Marja %', 'Facturat', 'Incasat', 'Restant', 'Stare'];
    const lines = list.map((r) => [r.project.code, r.project.name, r.project.city, r.project.county, STATUS_LABEL[r.project.status], r.fin.revenue, r.fin.budget, r.fin.actual, r.fin.committedOpen, r.fin.etc, r.fin.eac, r.fin.profit, r.fin.margin.toFixed(2), r.fin.invoiced, r.fin.collected, r.fin.overdueReceivables, r.risk.level]
      .map((v) => typeof v === 'number' ? Math.round(v as number).toString() : `"${String(v).replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `atlas-control-profitabilitate-${useStore.getState().today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Control financiar"
        title="Profitabilitate și costuri pe portofoliu"
        subtitle="Cost total estimat = costuri efective + costuri angajate neincluse în efective + costuri estimate până la finalizare. Profit = venit actualizat − cost total estimat."
        actions={
          <>
            <Segmented value={scope} onChange={setScope} options={[{ id: 'active', label: 'Active' }, { id: 'finalizat', label: 'Finalizate' }, { id: 'all', label: 'Toate' }]} />
            <Button onClick={exportCsv}><Download size={15} /> Export CSV</Button>
            <Button variant="ghost" onClick={() => window.print()} className="no-print"><Printer size={15} /> Tipărește</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {[
          ['Venit actualizat', sum((r) => r.fin.revenue)],
          ['Buget de execuție', sum((r) => r.fin.budget)],
          ['Costuri efective', sum((r) => r.fin.actual)],
          ['Angajate neincluse', sum((r) => r.fin.committedOpen)],
          ['Rămase estimate', sum((r) => r.fin.etc)],
          ['Profit estimat', sum((r) => r.fin.profit)],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-ink-200/70 bg-white px-4 py-3 shadow-card">
            <div className="text-[12px] text-ink-500">{l}</div>
            <div className="mt-1 text-[18px] font-semibold tabular-nums text-ink-900"><Flash value={Math.round(v as number)}>{fmtMoney(v as number)}</Flash></div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Marjă estimată pe proiect" subtitle={`Linii de prag: galben ${thresholds.marginWarnPct}%, roșu ${thresholds.marginRiskPct}%. Culoarea barei = starea calculată a proiectului.`} />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marginData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} onClick={(e) => { const id = (e?.activePayload?.[0]?.payload as { id?: string } | undefined)?.id; if (id) navigate(`/proiecte/${id}?tab=financiar`); }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="name" {...axisProps} interval={0} angle={-35} textAnchor="end" height={78} tick={{ ...axisProps.tick, fontSize: 10.5 }} />
                <YAxis {...axisProps} tickFormatter={(v) => `${v}%`} />
                <Tooltip cursor={{ fill: 'rgba(15,21,18,0.04)' }} formatter={(v: number) => [fmtPct(v), 'Marjă estimată']} contentStyle={{ borderRadius: 8, border: '1px solid #d9ddda', fontSize: 12 }} />
                <ReferenceLine y={thresholds.marginWarnPct} stroke="#d69a0b" strokeDasharray="4 4" />
                <ReferenceLine y={thresholds.marginRiskPct} stroke="#d0402b" strokeDasharray="4 4" />
                <Bar dataKey="margin" radius={[4, 4, 0, 0]} maxBarSize={26} className="cursor-pointer" isAnimationActive={false}>
                  {marginData.map((d) => <Cell key={d.id} fill={riskColor(d.level)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Buget vs cost estimat pe categorii" subtitle="Toate proiectele din selecție" />
          <div className="space-y-3.5">
            {catTotals.map((c) => {
              const diff = c.eac - c.budget;
              const max = Math.max(...catTotals.map((x) => Math.max(x.budget, x.eac)));
              return (
                <div key={c.category}>
                  <div className="mb-1 flex justify-between text-[12.5px]">
                    <span className="font-medium text-ink-800">{CATEGORY_LABEL[c.category]}</span>
                    <span className={clsx('tabular-nums', diff > 0 ? 'text-risk-600' : 'text-ink-500')}>{diff > 0 ? '+' : ''}{fmtMoney(diff)}</span>
                  </div>
                  <div className="relative h-2.5 rounded-full bg-ink-100">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-[#3d7bb5] transition-[width] duration-700" style={{ width: `${(c.eac / max) * 100}%` }} />
                    <div className="absolute -inset-y-1 w-0.5 bg-ink-900" style={{ left: `${(c.budget / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="flex gap-4 pt-1 text-[11.5px] text-ink-500"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#3d7bb5]" />Cost estimat</span><span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 bg-ink-900" />Buget</span></div>
          </div>
        </Card>
      </div>

      <Card pad={false} className="mt-6">
        <div className="px-5 pt-5"><CardHeader title="Tabel de profitabilitate" subtitle="Ordonat după marjă crescătoare: proiectele cu probleme apar primele. Click pe un rând pentru fișa financiară." /></div>
        <Table>
          <thead>
            <tr>
              <Th className="pl-5">Proiect</Th>
              <Th align="right">Venit actualizat</Th>
              <Th align="right">Buget</Th>
              <Th align="right">Efective</Th>
              <Th align="right">Angajate</Th>
              <Th align="right">Rămase</Th>
              <Th align="right">Cost estimat</Th>
              <Th align="right">Profit estimat</Th>
              <Th align="right">Marjă</Th>
              <Th align="right">Restanțe</Th>
              <Th align="right" className="pr-5">Stare</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.project.id} onClick={() => navigate(`/proiecte/${r.project.id}?tab=financiar`)} className="cursor-pointer hover:bg-ink-50/70">
                <Td className="pl-5"><div className="font-medium text-ink-900">{r.project.city}</div><div className="max-w-[220px] truncate text-[12px] text-ink-500">{r.project.code} · {r.project.name}</div></Td>
                <Td align="right">{fmtRon(r.fin.revenue)}</Td>
                <Td align="right">{fmtRon(r.fin.budget)}</Td>
                <Td align="right">{fmtRon(r.fin.actual)}</Td>
                <Td align="right">{fmtRon(r.fin.committedOpen)}</Td>
                <Td align="right">{fmtRon(r.fin.etc)}</Td>
                <Td align="right" className={clsx('font-medium', r.fin.eac > r.fin.budget && 'text-risk-600')}><Flash value={Math.round(r.fin.eac)}>{fmtRon(r.fin.eac)}</Flash></Td>
                <Td align="right" className="font-medium"><Flash value={Math.round(r.fin.profit)}>{fmtRon(r.fin.profit)}</Flash></Td>
                <Td align="right" className={clsx('font-medium', r.fin.margin < thresholds.marginWarnPct && 'text-risk-600')}>{fmtPct(r.fin.margin)}</Td>
                <Td align="right" className={r.fin.overdueReceivables > 0 ? 'text-risk-600' : 'text-ink-400'}>{r.fin.overdueReceivables > 0 ? fmtRon(r.fin.overdueReceivables) : '—'}</Td>
                <Td align="right" className="pr-5"><RiskBadge level={r.risk.level} /></Td>
              </tr>
            ))}
            <tr className="bg-ink-50/70 font-semibold">
              <Td className="pl-5">Total ({list.length})</Td>
              <Td align="right">{fmtRon(sum((r) => r.fin.revenue))}</Td>
              <Td align="right">{fmtRon(sum((r) => r.fin.budget))}</Td>
              <Td align="right">{fmtRon(sum((r) => r.fin.actual))}</Td>
              <Td align="right">{fmtRon(sum((r) => r.fin.committedOpen))}</Td>
              <Td align="right">{fmtRon(sum((r) => r.fin.etc))}</Td>
              <Td align="right">{fmtRon(sum((r) => r.fin.eac))}</Td>
              <Td align="right">{fmtRon(sum((r) => r.fin.profit))}</Td>
              <Td align="right">{fmtPct(sum((r) => r.fin.revenue) ? (sum((r) => r.fin.profit) / sum((r) => r.fin.revenue)) * 100 : 0)}</Td>
              <Td align="right">{fmtRon(sum((r) => r.fin.overdueReceivables))}</Td>
              <Td className="pr-5" />
            </tr>
          </tbody>
        </Table>
      </Card>
      <p className="mt-3 text-[12px] text-ink-400">Portofoliu total (toate proiectele active): profit estimat {fmtMoney(totals.profit)}, marjă {fmtPct(totals.margin)}. Datele financiare nu sunt sincronizate cu un program de contabilitate; integrarea este prevăzută în arhitectură.</p>
    </div>
  );
}
