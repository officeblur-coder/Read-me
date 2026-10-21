// Portfolio-level aggregation and the „Necesită atenția conducerii” rules.
import type { ISODate, MaterialRequest, Material, Project, ProjectMaterial, SiteReport, Thresholds, Allocation, Equipment, Team } from './types';
import { assessRisk, computeFinancials, computeSchedule, type ProjectFinancials, type RiskAssessment, type ScheduleInfo } from './finance';
import { fmtMoney, fmtPct } from './format';
import { overlaps } from './dates';
import { fmtDateShort } from './format';

export interface ProjectRow {
  project: Project;
  fin: ProjectFinancials;
  sched: ScheduleInfo;
  risk: RiskAssessment;
}

export function computeRows(projects: Project[], today: ISODate, t: Thresholds): ProjectRow[] {
  return projects.map((project) => {
    const fin = computeFinancials(project, today);
    const sched = computeSchedule(project, today, t);
    return { project, fin, sched, risk: assessRisk(fin, sched, t) };
  });
}

export const isActive = (p: Project) => p.status === 'executie' || p.status === 'pregatire' || p.status === 'receptie';

export interface PortfolioTotals {
  activeContracts: number;
  activeCount: number;
  revenue: number;
  invoiced: number;
  collected: number;
  receivables: number;
  overdue: number;
  budget: number;
  actual: number;
  committedOpen: number;
  eac: number;
  profit: number;
  margin: number;
  plannedProfit: number;
  delayed: number;
  overBudget: number;
  riskCounts: Record<'ok' | 'warn' | 'risk', number>;
}

export function computeTotals(rows: ProjectRow[]): PortfolioTotals {
  const active = rows.filter((r) => isActive(r.project));
  const s = (f: (r: ProjectRow) => number, rs = active) => rs.reduce((a, r) => a + f(r), 0);
  const revenue = s((r) => r.fin.revenue);
  const profit = s((r) => r.fin.profit);
  return {
    activeContracts: s((r) => r.fin.revenue),
    activeCount: active.length,
    revenue,
    invoiced: s((r) => r.fin.invoiced, rows),
    collected: s((r) => r.fin.collected, rows),
    receivables: s((r) => r.fin.receivables, rows),
    overdue: s((r) => r.fin.overdueReceivables, rows),
    budget: s((r) => r.fin.budget),
    actual: s((r) => r.fin.actual),
    committedOpen: s((r) => r.fin.committedOpen),
    eac: s((r) => r.fin.eac),
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    plannedProfit: s((r) => r.fin.plannedProfit),
    delayed: active.filter((r) => r.sched.delayed).length,
    overBudget: active.filter((r) => r.fin.overrunPct > 0.5).length,
    riskCounts: {
      ok: active.filter((r) => r.risk.level === 'ok').length,
      warn: active.filter((r) => r.risk.level === 'warn').length,
      risk: active.filter((r) => r.risk.level === 'risk').length,
    },
  };
}

export interface Alert {
  id: string;
  severity: 'risk' | 'warn';
  title: string;
  detail: string;
  projectId?: string;
  link: string;
  kind: 'financiar' | 'termen' | 'aprobare' | 'incasari' | 'santier' | 'resurse' | 'stoc';
  impact?: number;
}

interface AlertInput {
  rows: ProjectRow[];
  requests: MaterialRequest[];
  materials: Material[];
  projectMaterials: ProjectMaterial[];
  reports: SiteReport[];
  allocations: Allocation[];
  equipment: Equipment[];
  teams: Team[];
  today: ISODate;
}

export function requestValue(r: MaterialRequest, materials: Material[]) {
  return r.items.reduce((a, it) => a + it.qty * (materials.find((m) => m.id === it.materialId)?.unitCost ?? 0), 0);
}

/** Rule-based alerts. Every alert cites the data it comes from; nothing is invented. */
export function computeAlerts(i: AlertInput): Alert[] {
  const out: Alert[] = [];
  const byId = new Map(i.rows.map((r) => [r.project.id, r]));

  for (const r of i.rows) {
    if (!isActive(r.project)) continue;
    const p = r.project;
    const label = `${p.name}, ${p.city}`;
    if (r.risk.level !== 'ok' && (r.fin.overrunPct > 1 || r.fin.margin < 12)) {
      const top = [...r.fin.categories].sort((a, b) => a.variance - b.variance)[0];
      out.push({
        id: `fin-${p.id}`, severity: r.risk.level === 'risk' ? 'risk' : 'warn', kind: 'financiar', projectId: p.id,
        title: r.fin.profit < 0 ? `Pierdere estimată: ${label}` : `Risc de depășire a bugetului: ${label}`,
        detail: `Cost estimat la finalizare ${fmtMoney(r.fin.eac)} față de buget ${fmtMoney(r.fin.budget)} (${r.fin.overrunPct >= 0 ? '+' : ''}${fmtPct(r.fin.overrunPct)}). Marjă estimată ${fmtPct(r.fin.margin)}.${top && top.variance < 0 ? ` Sursa principală: ${top.category === 'subcontractori' ? 'subcontractori' : top.category} (${fmtMoney(-top.variance)} peste buget).` : ''}`,
        link: `/proiecte/${p.id}?tab=financiar`, impact: Math.max(0, r.fin.eac - r.fin.budget),
      });
    }
    if (r.sched.delayed) {
      out.push({
        id: `sch-${p.id}`, severity: r.sched.daysLeft < 14 ? 'risk' : 'warn', kind: 'termen', projectId: p.id,
        title: `Întârziere: ${label}`,
        detail: `Progres fizic ${fmtPct(r.sched.progress)} față de ${fmtPct(r.sched.plannedProgress)} planificat. Termen contractual în ${r.sched.daysLeft} zile${r.sched.delayDays > 0 ? `, finalizare estimată cu ${r.sched.delayDays} zile peste termen` : ''}.`,
        link: `/proiecte/${p.id}?tab=progres`,
      });
    }
    if (r.fin.overdueReceivables > 0) {
      out.push({
        id: `inc-${p.id}`, severity: r.fin.overdueReceivables > 500_000 ? 'risk' : 'warn', kind: 'incasari', projectId: p.id,
        title: `Creanțe restante: ${p.client}`,
        detail: `${fmtMoney(r.fin.overdueReceivables)} facturate și neîncasate după scadență (${label}).`,
        link: `/proiecte/${p.id}?tab=financiar`, impact: r.fin.overdueReceivables,
      });
    }
  }

  for (const req of i.requests.filter((x) => x.status === 'in_asteptare')) {
    const r = byId.get(req.projectId);
    if (!r) continue;
    const value = requestValue(req, i.materials);
    out.push({
      id: `req-${req.id}`, severity: req.urgency === 'critica' ? 'risk' : 'warn', kind: 'aprobare', projectId: req.projectId,
      title: `Solicitare materiale în așteptare: ${r.project.city}`,
      detail: `${fmtMoney(value)}, urgență ${req.urgency === 'critica' ? 'critică' : req.urgency === 'ridicata' ? 'ridicată' : 'normală'}. ${value - Math.min(value, req.coveredByEstimate) > 0 ? `Impact net asupra profitului: −${fmtMoney(value - Math.min(value, req.coveredByEstimate))}.` : 'Fără impact asupra profitului: valoarea este inclusă în estimare.'}`,
      link: `/proiecte/${req.projectId}?tab=materiale`, impact: value - req.coveredByEstimate,
    });
  }

  const recentCritical = i.reports.filter((rep) => rep.issues.some((x) => x.severity === 'critica'));
  for (const rep of recentCritical.slice(0, 3)) {
    const r = byId.get(rep.projectId);
    if (!r) continue;
    out.push({
      id: `iss-${rep.id}`, severity: 'risk', kind: 'santier', projectId: rep.projectId,
      title: `Problemă tehnică critică raportată: ${r.project.city}`,
      detail: rep.issues.find((x) => x.severity === 'critica')!.text,
      link: `/proiecte/${rep.projectId}?tab=jurnal`,
    });
  }

  // Conflicte de resurse
  const projectCity = (id: string) => byId.get(id)?.project.city ?? id;
  const conflicts = findAllocationConflicts(i.allocations, i.equipment, i.teams, projectCity);
  for (const c of conflicts.slice(0, 4)) {
    out.push({
      id: `res-${c.a.id}-${c.b?.id ?? c.kind}`, severity: 'warn', kind: 'resurse',
      title: c.kind === "service" ? `Utilaj în service planificat: ${c.label}` : `Suprapunere resurse: ${c.label}`,
      detail: c.detail,
      link: '/resurse?tab=planificare',
    });
  }

  // Stocuri sub minim cu necesar deschis
  for (const m of i.materials) {
    if (m.stock >= m.minStock) continue;
    const open = i.projectMaterials.filter((pm) => pm.materialId === m.id).reduce((a, pm) => a + Math.max(0, pm.planned - pm.transferred - pm.reserved), 0);
    if (open <= 0) continue;
    out.push({
      id: `stk-${m.id}`, severity: 'warn', kind: 'stoc',
      title: `Stoc sub minim: ${m.name}`,
      detail: `Stoc ${m.stock} ${m.unit} (minim ${m.minStock}); necesar netransferat pe proiecte: ${Math.round(open)} ${m.unit}.`,
      link: '/materiale',
    });
  }

  const rank = { risk: 0, warn: 1 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || (b.impact ?? 0) - (a.impact ?? 0));
}

export interface Conflict {
  a: Allocation;
  b?: Allocation;
  kind: 'suprapunere' | 'service';
  label: string;
  detail: string;
}

export function resourceName(type: Allocation['resourceType'], id: string, teams: Team[], equipment: Equipment[]) {
  if (type === 'team') return teams.find((t) => t.id === id)?.name ?? id;
  const e = equipment.find((q) => q.id === id);
  return e ? `${e.name}${e.plate ? ` (${e.plate})` : ''}` : id;
}

export function findAllocationConflicts(
  allocations: Allocation[], equipment: Equipment[], teams: Team[], projectLabel: (id: string) => string,
): Conflict[] {
  const out: Conflict[] = [];
  for (let x = 0; x < allocations.length; x++) {
    for (let y = x + 1; y < allocations.length; y++) {
      const a = allocations[x], b = allocations[y];
      if (a.resourceType !== b.resourceType || a.resourceId !== b.resourceId || a.projectId === b.projectId) continue;
      if (!overlaps(a.start, a.end, b.start, b.end)) continue;
      const from = a.start > b.start ? a.start : b.start;
      const to = a.end < b.end ? a.end : b.end;
      out.push({
        a, b, kind: 'suprapunere',
        label: resourceName(a.resourceType, a.resourceId, teams, equipment),
        detail: `Alocat simultan la ${projectLabel(a.projectId)} și ${projectLabel(b.projectId)}, ${fmtDateShort(from)} – ${fmtDateShort(to)}.`,
      });
    }
  }
  for (const a of allocations) {
    if (a.resourceType !== 'equipment') continue;
    const e = equipment.find((q) => q.id === a.resourceId);
    if (e?.status === 'service' && e.serviceUntil && a.start <= e.serviceUntil) {
      out.push({
        a, kind: 'service',
        label: resourceName('equipment', a.resourceId, teams, equipment),
        detail: `Programat la ${projectLabel(a.projectId)} din ${fmtDateShort(a.start)}, dar se află în service până la ${fmtDateShort(e.serviceUntil)}.`,
      });
    }
  }
  return out;
}
