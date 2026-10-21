// Financial and schedule engine. Pure functions over domain types, unit-tested in finance.test.ts.
//
// Cost model (no double counting):
//   Efective (actual)        = Σ cost entries (facturi primite, pontaje, consumuri din stoc)
//   Angajate deschise (open) = Σ max(0, angajament − efective legate de acel angajament)
//   Rămase estimate (ETC)    = estimare a managerului pentru ce nu e nici facturat, nici comandat
//   Cost total estimat (EAC) = Efective + Angajate deschise + ETC
//   Profit estimat           = Venit contractual actualizat − EAC
//   Marjă estimată           = Profit estimat / Venit contractual actualizat × 100
import type { CostCategory, Project, RiskLevel, Thresholds, ISODate } from './types';
import { daysBetween, addDays } from './dates';

export const COST_CATEGORIES: CostCategory[] = ['materiale', 'manopera', 'utilaje', 'transport', 'subcontractori', 'alte'];

export const CATEGORY_LABEL: Record<CostCategory, string> = {
  materiale: 'Materiale',
  manopera: 'Manoperă',
  utilaje: 'Utilaje',
  transport: 'Transport și logistică',
  subcontractori: 'Subcontractori',
  alte: 'Alte costuri directe',
};

export interface CategoryFinancials {
  category: CostCategory;
  budget: number;
  actual: number;
  committedOpen: number;
  etc: number;
  eac: number;
  variance: number; // buget − EAC (negativ = depășire)
}

export interface ProjectFinancials {
  contractValue: number;
  approvedChangeOrders: number;
  pendingChangeOrders: number;
  revenue: number; // venit contractual actualizat
  budget: number; // buget de execuție, inclusiv suplimentări din acte adiționale aprobate
  changeOrderBudget: number;
  actual: number;
  committedOpen: number;
  etc: number;
  eac: number;
  profit: number;
  margin: number; // %
  plannedProfit: number;
  plannedMargin: number;
  overrunPct: number; // (EAC − buget) / buget × 100
  invoiced: number;
  collected: number;
  receivables: number;
  overdueReceivables: number;
  categories: CategoryFinancials[];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function commitmentOpenAmount(p: Project, commitmentId: string): number {
  const c = p.commitments.find((x) => x.id === commitmentId);
  if (!c) return 0;
  const invoiced = sum(p.costs.filter((e) => e.commitmentId === commitmentId).map((e) => e.amount));
  return Math.max(0, c.amount - invoiced);
}

export function computeFinancials(p: Project, today: ISODate): ProjectFinancials {
  const categories = COST_CATEGORIES.map<CategoryFinancials>((category) => {
    const actual = sum(p.costs.filter((e) => e.category === category).map((e) => e.amount));
    const committedOpen = sum(
      p.commitments.filter((c) => c.category === category).map((c) => commitmentOpenAmount(p, c.id)),
    );
    const etc = Math.max(0, p.etc[category] ?? 0);
    const eac = actual + committedOpen + etc;
    const budget = p.budget[category] ?? 0;
    return { category, budget, actual, committedOpen, etc, eac, variance: budget - eac };
  });

  const approvedChangeOrders = sum(p.changeOrders.filter((c) => c.status === 'aprobat').map((c) => c.amount));
  const pendingChangeOrders = sum(p.changeOrders.filter((c) => c.status === 'propus').map((c) => c.amount));
  const revenue = p.contractValue + approvedChangeOrders;
  const changeOrderBudget = sum(p.changeOrders.filter((c) => c.status === 'aprobat').map((c) => c.costBudget));
  const budget = sum(categories.map((c) => c.budget)) + changeOrderBudget;
  const actual = sum(categories.map((c) => c.actual));
  const committedOpen = sum(categories.map((c) => c.committedOpen));
  const etc = sum(categories.map((c) => c.etc));
  const eac = actual + committedOpen + etc;
  const profit = revenue - eac;
  const invoiced = sum(p.invoices.map((i) => i.amount));
  const collected = sum(p.invoices.map((i) => i.paid));
  const overdueReceivables = sum(
    p.invoices.filter((i) => i.dueDate < today).map((i) => Math.max(0, i.amount - i.paid)),
  );

  return {
    contractValue: p.contractValue,
    approvedChangeOrders,
    pendingChangeOrders,
    revenue,
    budget,
    changeOrderBudget,
    actual,
    committedOpen,
    etc,
    eac,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    plannedProfit: revenue - budget,
    plannedMargin: revenue > 0 ? ((revenue - budget) / revenue) * 100 : 0,
    overrunPct: budget > 0 ? ((eac - budget) / budget) * 100 : 0,
    invoiced,
    collected,
    receivables: invoiced - collected,
    overdueReceivables,
    categories,
  };
}

export function physicalProgress(p: Project): number {
  const totalWeight = sum(p.stages.map((s) => s.weight)) || 1;
  return sum(p.stages.map((s) => s.weight * s.progress)) / totalWeight;
}

export interface ScheduleInfo {
  progress: number;
  plannedProgress: number;
  gap: number; // planificat − realizat, puncte procentuale
  daysLeft: number;
  forecastEnd: ISODate;
  delayDays: number;
  delayed: boolean;
}

export function computeSchedule(p: Project, today: ISODate, t: Thresholds): ScheduleInfo {
  const progress = physicalProgress(p);
  const total = Math.max(1, daysBetween(p.startDate, p.dueDate));
  const elapsed = Math.min(Math.max(0, daysBetween(p.startDate, today)), total);
  const done = p.status === 'finalizat' || p.status === 'receptie';
  const plannedProgress = p.status === 'pregatire' && today < p.startDate ? 0 : (elapsed / total) * 100;
  const gap = done ? 0 : plannedProgress - progress;
  let forecastEnd = p.dueDate;
  if (!done && progress > 3 && today > p.startDate) {
    const rate = progress / Math.max(1, daysBetween(p.startDate, today)); // %/zi
    forecastEnd = addDays(today, Math.ceil((100 - progress) / Math.max(rate, 0.05)));
  }
  const delayDays = done ? 0 : Math.max(0, daysBetween(p.dueDate, forecastEnd), daysBetween(p.dueDate, today));
  const delayed = !done && p.status !== 'pregatire' && (gap > t.scheduleGapPct || today > p.dueDate);
  return {
    progress,
    plannedProgress,
    gap,
    daysLeft: daysBetween(today, p.dueDate),
    forecastEnd,
    delayDays,
    delayed,
  };
}

export interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
}

export function assessRisk(f: ProjectFinancials, s: ScheduleInfo, t: Thresholds): RiskAssessment {
  const reasons: string[] = [];
  let level: RiskLevel = 'ok';
  const raise = (l: RiskLevel) => {
    if (l === 'risk' || (l === 'warn' && level === 'ok')) level = l;
  };

  if (f.profit < 0) {
    raise('risk');
    reasons.push('Pierdere estimată la finalizare');
  } else if (f.margin < t.marginRiskPct) {
    raise('risk');
    reasons.push(`Marjă estimată sub ${t.marginRiskPct}%`);
  } else if (f.margin < t.marginWarnPct) {
    raise('warn');
    reasons.push(`Marjă estimată sub ${t.marginWarnPct}%`);
  }

  if (f.overrunPct > t.overrunRiskPct) {
    raise('risk');
    reasons.push(`Depășire buget de execuție cu ${f.overrunPct.toFixed(1).replace('.', ',')}%`);
  } else if (f.overrunPct > t.overrunWarnPct) {
    raise('warn');
    reasons.push(`Risc de depășire a bugetului (${f.overrunPct.toFixed(1).replace('.', ',')}%)`);
  }

  if (s.delayed) {
    raise('warn');
    reasons.push(s.delayDays > 0 ? `Întârziere estimată ${s.delayDays} zile` : 'Progres sub planificare');
  }
  return { level, reasons };
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  marginWarnPct: 12,
  marginRiskPct: 4,
  overrunWarnPct: 1,
  overrunRiskPct: 6,
  scheduleGapPct: 12,
};
