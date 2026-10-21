import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle, ArrowUpRight, CalendarClock, CircleDollarSign, HardHat, Truck, Wallet, TrendingUp,
  ClipboardCheck, Construction, PackageSearch, Users, ChevronRight,
} from 'lucide-react';
import { useStore } from '../store/store';
import { useAlerts, useRows, useTotals, usePermission } from '../store/derived';
import { Card, CardHeader, PageHeader, Segmented, RiskBadge, Progress, useAnimatedNumber, Flash, Badge } from '../components/ui';
import { RomaniaMap, MapLegend } from '../components/RomaniaMap';
import { axisProps, ChartTooltip, GRID, Legend, SERIES_A, SERIES_B, shortMoney } from '../components/charts';
import { fmtMoney, fmtPct, fmtMonth, fmtDateShort } from '../domain/format';
import { addMonths, monthKey } from '../domain/dates';
import { isActive, type Alert } from '../domain/portfolio';

type Period = '3' | '6' | '12' | 'ytd';

export function DashboardPage() {
  const rows = useRows();
  const totals = useTotals();
  const alerts = useAlerts();
  const today = useStore((s) => s.today);
  const allocations = useStore((s) => s.allocations);
  const teams = useStore((s) => s.teams);
  const equipment = useStore((s) => s.equipment);
  const activity = useStore((s) => s.activity);
  const canFinance = usePermission('finance.view');
  const [period, setPeriod] = useState<Period>('6');
  const navigate = useNavigate();

  const months = useMemo(() => {
    const n = period === 'ytd' ? +today.slice(5, 7) : +period;
    const first = addMonths(today.slice(0, 7) + '-01', -(n - 1));
    return Array.from({ length: n }, (_, i) => monthKey(addMonths(first, i)));
  }, [period, today]);

  const trend = useMemo(() => months.map((m) => {
    let invoiced = 0, costs = 0;
    for (const r of rows) {
      for (const i of r.project.invoices) if (monthKey(i.date) === m) invoiced += i.amount;
      for (const c of r.project.costs) if (monthKey(c.date) === m) costs += c.amount;
    }
    return { month: m, invoiced, costs };
  }), [rows, months]);

  const periodInvoiced = trend.reduce((a, t) => a + t.invoiced, 0);
  const periodCosts = trend.reduce((a, t) => a + t.costs, 0);

  const activeTeams = teams.filter((t) => allocations.some((a) => a.resourceType === 'team' && a.resourceId === t.id && a.start <= today && a.end >= today)).length;
  const freeEquipment = equipment.filter((e) => e.status === 'operational' && !allocations.some((a) => a.resourceType === 'equipment' && a.resourceId === e.id && a.start <= today && a.end >= today)).length;

  const activeRows = rows.filter((r) => isActive(r.project));
  const budgetVsEac = [...activeRows].filter((r) => r.project.status !== 'pregatire').sort((a, b) => b.fin.revenue - a.fin.revenue).slice(0, 9).map((r) => ({
    name: r.project.city, budget: r.fin.budget, eac: r.fin.eac, id: r.project.id,
  }));

  const groups = useMemo(() => groupAlerts(alerts, rows), [alerts, rows]);
  const profit = useAnimatedNumber(totals.profit);
  const margin = useAnimatedNumber(totals.margin);

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard executiv"
        title="Cât profit ne aduce fiecare proiect și ce rezolvăm astăzi"
        subtitle="Indicatorii sunt calculați în timp real din fișele proiectelor, rapoartele de șantier și solicitările aprobate."
        actions={
          <Segmented<Period>
            value={period}
            onChange={setPeriod}
            options={[{ id: '3', label: '3 luni' }, { id: '6', label: '6 luni' }, { id: '12', label: '12 luni' }, { id: 'ytd', label: 'An curent' }]}
          />
        }
      />

      {/* KPI principali */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={CircleDollarSign} label="Valoarea contractelor active" value={fmtMoney(totals.activeContracts)} sub={`${totals.activeCount} proiecte active · fără TVA`} />
        {canFinance && (
          <Kpi
            icon={TrendingUp} label="Profit brut estimat la finalizare" accent
            value={<Flash value={Math.round(totals.profit)}>{fmtMoney(profit)}</Flash>}
            sub={<>Planificat {fmtMoney(totals.plannedProfit)} · <span className={totals.profit < totals.plannedProfit ? 'text-risk-600' : 'text-brand-700'}>{totals.profit - totals.plannedProfit >= 0 ? '+' : ''}{fmtMoney(totals.profit - totals.plannedProfit)}</span></>}
          />
        )}
        {canFinance && (
          <Kpi
            icon={Wallet} label="Marjă brută estimată"
            value={<Flash value={totals.margin.toFixed(1)}>{fmtPct(margin)}</Flash>}
            sub={<span className="flex items-center gap-2"><span className="flex gap-1">{(['ok', 'warn', 'risk'] as const).map((l) => <Badge key={l} tone={l === 'ok' ? 'brand' : l} className="!px-1.5">{totals.riskCounts[l]}</Badge>)}</span> proiecte în limite / risc / depășire</span>}
          />
        )}
        {canFinance && (
          <Kpi
            icon={ClipboardCheck} label={`Facturat în perioadă`}
            value={fmtMoney(periodInvoiced)}
            sub={<>Încasat total {fmtMoney(totals.collected)} · creanțe {fmtMoney(totals.receivables)}</>}
          />
        )}
      </div>

      {/* KPI secundari */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {canFinance && <MiniKpi label="Costuri bugetate vs estimate" value={`${fmtMoney(totals.budget)}`} sub={<Flash value={Math.round(totals.eac)}>EAC {fmtMoney(totals.eac)}</Flash>} tone={totals.eac > totals.budget ? 'warn' : undefined} />}
        {canFinance && <MiniKpi label="Creanțe restante" value={fmtMoney(totals.overdue)} sub="după scadență" tone={totals.overdue > 0 ? 'risk' : undefined} />}
        <MiniKpi label="Proiecte întârziate" value={String(totals.delayed)} sub={`din ${totals.activeCount} active`} tone={totals.delayed ? 'warn' : undefined} icon={CalendarClock} />
        <MiniKpi label="Peste buget" value={String(totals.overBudget)} sub="EAC peste bugetul de execuție" tone={totals.overBudget ? 'risk' : undefined} icon={AlertTriangle} />
        <MiniKpi label="Echipe active azi" value={`${activeTeams} / ${teams.length}`} sub="alocate pe șantiere" icon={HardHat} />
        <MiniKpi label="Utilaje disponibile" value={`${freeEquipment} / ${equipment.length}`} sub="nealocate, funcționale" icon={Truck} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3" pad={false}>
          <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
            <div>
              <h3 className="text-[15px] font-semibold text-ink-900">Necesită atenția conducerii</h3>
              <p className="mt-0.5 text-[13px] text-ink-500">Generat automat din praguri, rapoarte de șantier, solicitări și planificare.</p>
            </div>
            <Badge tone={alerts.some((a) => a.severity === 'risk') ? 'risk' : 'warn'}>{alerts.length} semnale în {groups.length} subiecte</Badge>
          </div>
          <GroupedAlerts groups={groups.slice(0, 7)} onOpen={(l) => navigate(l)} />
          {groups.length > 7 && <div className="border-t border-ink-100 px-5 py-2.5 text-[12.5px] text-ink-500">și încă {groups.length - 7} subiecte cu prioritate mai mică</div>}
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Șantiere active" subtitle="Culoarea indică starea financiară" action={<Link to="/harta" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline">Hartă <ArrowUpRight size={14} /></Link>} />
          <RomaniaMap rows={activeRows} compact onSelect={(id) => navigate(`/proiecte/${id}`)} />
          <div className="mt-3"><MapLegend /></div>
        </Card>
      </div>

      {canFinance && (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Facturare și costuri efective pe lună" subtitle={`Perioada selectată: facturat ${fmtMoney(periodInvoiced)}, costuri ${fmtMoney(periodCosts)}`} action={<Legend items={[{ label: 'Facturat', color: SERIES_A }, { label: 'Costuri efective', color: SERIES_B }]} />} />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} barGap={2} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} {...axisProps} />
                  <YAxis tickFormatter={shortMoney} width={52} {...axisProps} />
                  <Tooltip cursor={{ fill: 'rgba(15,21,18,0.04)' }} content={<ChartTooltip labelFormat={(l) => fmtMonth(l)} />} />
                  <Bar dataKey="invoiced" name="Facturat" fill={SERIES_A} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="costs" name="Costuri efective" fill={SERIES_B} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <CardHeader title="Buget de execuție vs cost estimat la finalizare" subtitle="Cele mai mari 9 proiecte în execuție" action={<Legend items={[{ label: 'Buget', color: SERIES_A }, { label: 'Cost estimat (EAC)', color: SERIES_B }]} />} />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetVsEac} barGap={2} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} onClick={(e) => { const id = (e?.activePayload?.[0]?.payload as { id?: string } | undefined)?.id; if (id) navigate(`/proiecte/${id}?tab=financiar`); }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="name" {...axisProps} interval={0} angle={-30} textAnchor="end" height={54} tick={{ ...axisProps.tick, fontSize: 10.5 }} />
                  <YAxis tickFormatter={shortMoney} width={52} {...axisProps} />
                  <Tooltip cursor={{ fill: 'rgba(15,21,18,0.04)' }} content={<ChartTooltip />} />
                  <Bar dataKey="budget" name="Buget" fill={SERIES_A} radius={[4, 4, 0, 0]} maxBarSize={18} className="cursor-pointer" />
                  <Bar dataKey="eac" name="Cost estimat" fill={SERIES_B} radius={[4, 4, 0, 0]} maxBarSize={18} className="cursor-pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" pad={false}>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h3 className="text-[15px] font-semibold text-ink-900">Profitabilitate pe proiecte active</h3>
              <p className="mt-0.5 text-[13px] text-ink-500">Ordonate după profitul estimat</p>
            </div>
            <Link to={canFinance ? '/financiar' : '/proiecte'} className="text-[13px] font-medium text-brand-700 hover:underline">Toate</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-y border-ink-100 bg-ink-50/50 text-[12px] text-ink-500">
                  <th className="px-5 py-2 text-left font-medium">Proiect</th>
                  <th className="px-3 py-2 text-left font-medium">Progres</th>
                  {canFinance && <th className="px-3 py-2 text-right font-medium">Profit estimat</th>}
                  {canFinance && <th className="px-3 py-2 text-right font-medium">Marjă</th>}
                  <th className="px-5 py-2 text-right font-medium">Stare</th>
                </tr>
              </thead>
              <tbody>
                {[...activeRows].sort((a, b) => b.fin.profit - a.fin.profit).map((r) => (
                  <tr key={r.project.id} onClick={() => navigate(`/proiecte/${r.project.id}`)} className="cursor-pointer border-b border-ink-100 transition-colors last:border-0 hover:bg-ink-50/70">
                    <td className="px-5 py-2.5">
                      <div className="font-medium text-ink-900">{r.project.city}</div>
                      <div className="max-w-[260px] truncate text-[12px] text-ink-500">{r.project.name}</div>
                    </td>
                    <td className="w-40 px-3 py-2.5">
                      <div className="flex items-center gap-2"><Progress value={r.sched.progress} marker={r.sched.plannedProgress} className="w-20" /><span className="text-[12px] tabular-nums text-ink-600">{Math.round(r.sched.progress)}%</span></div>
                    </td>
                    {canFinance && <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums"><Flash value={Math.round(r.fin.profit)}>{fmtMoney(r.fin.profit)}</Flash></td>}
                    {canFinance && <td className={clsx('px-3 py-2.5 text-right tabular-nums', r.fin.margin < 12 ? 'text-risk-600' : 'text-ink-700')}>{fmtPct(r.fin.margin)}</td>}
                    <td className="px-5 py-2.5 text-right"><RiskBadge level={r.risk.level} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Activitate recentă" subtitle="Din Atlas Field și din platformă" />
          <ol className="relative space-y-4 border-l border-ink-100 pl-4">
            {activity.slice(0, 8).map((a) => (
              <li key={a.id} className="relative">
                <span className={clsx('absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white', a.tone === 'negative' ? 'bg-risk-500' : a.tone === 'positive' ? 'bg-brand-500' : 'bg-ink-300')} />
                <div className="text-[13px] leading-snug text-ink-700"><span className="font-medium text-ink-900">{a.actor}</span> {a.text}</div>
                <div className="mt-0.5 text-[11.5px] text-ink-400">{fmtDateShort(a.date)}{a.projectId && <> · <Link to={`/proiecte/${a.projectId}`} className="hover:text-brand-700 hover:underline">deschide proiectul</Link></>}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, accent }: { icon: typeof Wallet; label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: boolean }) {
  return (
    <Card className={clsx('relative overflow-hidden', accent && '!border-brand-800 !bg-brand-950 text-white')}>
      {accent && <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-lime-500/10" />}
      <div className={clsx('flex items-center gap-2 text-[13px]', accent ? 'text-white/70' : 'text-ink-500')}>
        <Icon size={16} strokeWidth={1.8} className={accent ? 'text-lime-400' : 'text-brand-600'} /> {label}
      </div>
      <div className={clsx('mt-3 text-[26px] font-semibold tracking-[-0.02em] tabular-nums', accent ? 'text-white' : 'text-ink-900')}>{value}</div>
      {sub && <div className={clsx('mt-1.5 text-[12.5px]', accent ? 'text-white/60 [&_.text-brand-700]:text-lime-400 [&_.text-risk-600]:text-[#ff9b8a]' : 'text-ink-500')}>{sub}</div>}
    </Card>
  );
}

function MiniKpi({ label, value, sub, tone, icon: Icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'warn' | 'risk'; icon?: typeof Wallet }) {
  return (
    <div className="rounded-xl border border-ink-200/70 bg-white px-4 py-3 shadow-card">
      <div className="flex items-center gap-1.5 text-[12px] text-ink-500">{Icon && <Icon size={13} />}{label}</div>
      <div className={clsx('mt-1 text-[18px] font-semibold tabular-nums tracking-[-0.01em]', tone === 'risk' ? 'text-risk-600' : tone === 'warn' ? 'text-warn-700' : 'text-ink-900')}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-[11.5px] text-ink-400">{sub}</div>}
    </div>
  );
}

const KIND_ICON = { financiar: CircleDollarSign, termen: CalendarClock, aprobare: ClipboardCheck, incasari: Wallet, santier: Construction, resurse: Users, stoc: PackageSearch } as const;
const KIND_LABEL = { financiar: 'Financiar', termen: 'Termen', aprobare: 'Aprobare', incasari: 'Încasări', santier: 'Șantier', resurse: 'Resurse', stoc: 'Stoc' } as const;

export function AlertList({ alerts, onOpen }: { alerts: Alert[]; onOpen: (a: Alert) => void }) {
  if (!alerts.length) return <div className="px-5 py-8 text-center text-sm text-ink-500">Nu există subiecte care să necesite atenție.</div>;
  return (
    <ul className="divide-y divide-ink-100">
      {alerts.map((a) => {
        const Icon = KIND_ICON[a.kind];
        return (
          <li key={a.id}>
            <button onClick={() => onOpen(a)} className="group flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-ink-50/70">
              <span className={clsx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg', a.severity === 'risk' ? 'bg-risk-50 text-risk-600' : 'bg-warn-50 text-warn-600')}>
                <Icon size={16} strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-medium text-ink-900">{a.title}</span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-400">{KIND_LABEL[a.kind]}</span>
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-500">{a.detail}</span>
              </span>
              <ChevronRight size={16} className="mt-2 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface AlertGroup { key: string; title: string; subtitle?: string; severity: 'risk' | 'warn'; alerts: Alert[]; link: string; score: number }

/** One row per project: several signals on the same site (cost, site issue, pending request) rank it higher. */
function groupAlerts(alerts: Alert[], rows: ReturnType<typeof useRows>): AlertGroup[] {
  const map = new Map<string, AlertGroup>();
  for (const a of alerts) {
    const key = a.projectId ?? a.id;
    const row = rows.find((r) => r.project.id === a.projectId);
    const g = map.get(key) ?? {
      key, alerts: [], severity: 'warn' as const, score: 0, link: a.link,
      title: row ? `${row.project.city}: ${row.project.name}` : a.title,
      subtitle: row ? row.project.client : undefined,
    };
    g.alerts.push(a);
    if (a.severity === 'risk') g.severity = 'risk';
    if (a.kind === 'financiar') g.link = a.link;
    g.score += (a.severity === 'risk' ? 3 : 1) + (a.kind === 'financiar' ? 3 : 0) + (a.impact ?? 0) / 1_000_000;
    map.set(key, g);
  }
  const groups = [...map.values()];
  // A project with several converging signals is escalated even if each one alone is "warn".
  for (const g of groups) if (g.alerts.length >= 3) g.severity = 'risk';
  return groups.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'risk' ? -1 : 1) || b.score - a.score);
}

function GroupedAlerts({ groups, onOpen }: { groups: AlertGroup[]; onOpen: (link: string) => void }) {
  if (!groups.length) return <div className="px-5 py-8 text-center text-sm text-ink-500">Nu există subiecte care să necesite atenție.</div>;
  return (
    <ul className="divide-y divide-ink-100">
      {groups.map((g) => {
        const Icon = KIND_ICON[g.alerts[0].kind];
        return (
          <li key={g.key}>
            <button onClick={() => onOpen(g.link)} className="group flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-ink-50/70">
              <span className={clsx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg', g.severity === 'risk' ? 'bg-risk-50 text-risk-600' : 'bg-warn-50 text-warn-600')}>
                <Icon size={16} strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-ink-900">{g.alerts.length === 1 ? g.alerts[0].title : g.title}</span>
                {g.alerts.length === 1 ? (
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-500">{g.alerts[0].detail}</span>
                ) : (
                  <span className="mt-1 block space-y-1">
                    {g.alerts.map((a) => (
                      <span key={a.id} className="flex gap-2 text-[12.5px] leading-snug text-ink-500">
                        <span className={clsx('mt-[3px] shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.06em]', a.severity === 'risk' ? 'text-risk-600' : 'text-warn-700')}>{KIND_LABEL[a.kind]}</span>
                        <span>{a.detail}</span>
                      </span>
                    ))}
                  </span>
                )}
              </span>
              <ChevronRight size={16} className="mt-2 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
