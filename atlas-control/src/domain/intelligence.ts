// Atlas Intelligence — demonstrative engine (SIMULARE).
// No language model is called. Questions are matched to intents by keywords and each answer is
// computed from the current application data. If no intent matches, the engine says so instead
// of guessing. In production this module becomes the tool layer an LLM calls (see ARHITECTURA.md).
import type { Allocation, Equipment, Material, MaterialRequest, Person, ProjectMaterial, SiteReport, Team, ISODate } from './types';
import { type ProjectRow, isActive, requestValue, computeTotals } from './portfolio';
import { fmtMoney, fmtPct, fmtDateShort, normalize, fmtMonthLong } from './format';
import { addDays, overlaps, weekStart, monthKey } from './dates';
import { URGENCY_LABEL, STATUS_LABEL } from './labels';
import { CATEGORY_LABEL } from './finance';

export interface AnswerItem {
  text: string;
  detail?: string;
  link?: string;
  tone?: 'ok' | 'warn' | 'risk' | 'neutral';
  value?: string;
}

export interface Answer {
  intent: string;
  title: string;
  summary: string;
  items: AnswerItem[];
  basis: string; // ce date au fost folosite
  followUps: string[];
}

export interface KnowledgeBase {
  rows: ProjectRow[];
  requests: MaterialRequest[];
  materials: Material[];
  projectMaterials: ProjectMaterial[];
  allocations: Allocation[];
  teams: Team[];
  equipment: Equipment[];
  people: Person[];
  reports: SiteReport[];
  today: ISODate;
}

export const SUGGESTED_QUESTIONS = [
  'Care sunt cele mai profitabile proiecte?',
  'Ce șantiere au depășit bugetul?',
  'Unde avem întârzieri?',
  'Ce echipe devin disponibile săptămâna viitoare?',
  'Ce proiecte au nevoie urgentă de materiale?',
  'Care este profitul estimat pentru luna aceasta?',
  'Ce probleme necesită aprobarea conducerii?',
  'Ce alte proiecte prezintă riscuri?',
];

type Handler = (kb: KnowledgeBase, q: string) => Answer;

const INTENTS: { id: string; test: (q: string) => boolean; run: Handler }[] = [
  { id: 'aprobari', test: (q) => /aprob|decizi|semnat|validar/.test(q), run: approvals },
  { id: 'echipe', test: (q) => /echip/.test(q) && /disponib|liber|saptamana|urmato/.test(q), run: teamsAvailable },
  { id: 'utilaje', test: (q) => /utilaj|vehicul|masin/.test(q), run: equipmentAvailable },
  { id: 'materiale', test: (q) => /material|stoc|aprovizion/.test(q), run: urgentMaterials },
  { id: 'profit-luna', test: (q) => /profit|castig|rezultat/.test(q) && /luna|lunar|octombrie|lunii/.test(q), run: profitThisMonth },
  { id: 'profitabile', test: (q) => /profitabil|cel mai mare profit|cea mai mare marja|marje mari|castig/.test(q), run: mostProfitable },
  { id: 'buget', test: (q) => /buget|depas|cost/.test(q), run: overBudget },
  { id: 'intarzieri', test: (q) => /intarzi|termen|intarzier|grafic/.test(q), run: delays },
  { id: 'incasari', test: (q) => /incas|creant|restan|factur|platit|plata/.test(q), run: receivables },
  { id: 'riscuri', test: (q) => /risc|problem|pericol|atentie|ingrijor/.test(q), run: risks },
  { id: 'rezumat', test: (q) => /rezumat|situatia|portofoliu|companie|general|overview/.test(q), run: summary },
];

export function ask(kb: KnowledgeBase, question: string): Answer {
  const q = normalize(question);
  const project = matchProject(kb, q);
  if (project && !/proiecte|santiere|toate/.test(q)) return projectStatus(kb, project);
  const intent = INTENTS.find((i) => i.test(q));
  if (intent) return intent.run(kb, q);
  return {
    intent: 'necunoscut',
    title: 'Nu am date pentru această întrebare',
    summary: 'Motorul demonstrativ răspunde doar pe baza datelor din platformă și nu formulează estimări în afara lor. Încearcă una dintre întrebările de mai jos sau numele unui proiect ori al unei localități.',
    items: [],
    basis: 'Nicio interogare executată.',
    followUps: SUGGESTED_QUESTIONS.slice(0, 4),
  };
}

const active = (kb: KnowledgeBase) => kb.rows.filter((r) => isActive(r.project));
const label = (r: ProjectRow) => `${r.project.name}, ${r.project.city}`;
const link = (r: ProjectRow, tab = 'financiar') => `/proiecte/${r.project.id}?tab=${tab}`;
const person = (kb: KnowledgeBase, id: string) => kb.people.find((p) => p.id === id)?.name ?? '—';
const basisRows = (n: number, kb: KnowledgeBase) => `${n} proiecte analizate, date la ${fmtDateShort(kb.today)}. Calcul: profit estimat = venit actualizat − (efective + angajate deschise + rămase estimate).`;

function matchProject(kb: KnowledgeBase, q: string) {
  for (const r of kb.rows) {
    const city = normalize(r.project.city);
    if (city.length > 3 && q.includes(city)) return r;
    if (q.includes(normalize(r.project.code))) return r;
  }
  return undefined;
}

function mostProfitable(kb: KnowledgeBase): Answer {
  const rows = active(kb).filter((r) => r.project.status !== 'pregatire').sort((a, b) => b.fin.profit - a.fin.profit);
  const byMargin = [...rows].sort((a, b) => b.fin.margin - a.fin.margin)[0];
  const top = rows.slice(0, 5);
  return {
    intent: 'profitabile',
    title: 'Cele mai profitabile proiecte active',
    summary: `Ordonate după profitul brut estimat la finalizare. Primele ${top.length} proiecte însumează ${fmtMoney(top.reduce((a, r) => a + r.fin.profit, 0))} profit estimat. Cea mai bună marjă o are ${label(byMargin)} (${fmtPct(byMargin.fin.margin)}).`,
    items: top.map((r) => ({
      text: label(r), link: link(r), tone: r.risk.level,
      value: fmtMoney(r.fin.profit), detail: `Marjă ${fmtPct(r.fin.margin)} · contract ${fmtMoney(r.fin.revenue)}`,
    })),
    basis: basisRows(rows.length, kb) + ' Proiectele în pregătire sunt excluse.',
    followUps: ['Ce șantiere au depășit bugetul?', 'Care este profitul estimat pentru luna aceasta?'],
  };
}

function overBudget(kb: KnowledgeBase): Answer {
  const rows = active(kb).filter((r) => r.fin.overrunPct > 0.5).sort((a, b) => b.fin.overrunPct - a.fin.overrunPct);
  if (!rows.length) {
    return { intent: 'buget', title: 'Niciun proiect activ nu depășește bugetul', summary: 'Costul total estimat la finalizare se încadrează în bugetul de execuție pentru toate proiectele active.', items: [], basis: basisRows(active(kb).length, kb), followUps: ['Unde avem întârzieri?'] };
  }
  const extra = rows.reduce((a, r) => a + (r.fin.eac - r.fin.budget), 0);
  return {
    intent: 'buget',
    title: `${rows.length} ${rows.length === 1 ? 'proiect depășește' : 'proiecte depășesc'} bugetul de execuție`,
    summary: `Depășirea cumulată estimată la finalizare este ${fmtMoney(extra)}. Pentru fiecare proiect este indicată categoria de cost cu cea mai mare abatere.`,
    items: rows.map((r) => {
      const worst = [...r.fin.categories].sort((a, b) => a.variance - b.variance)[0];
      return {
        text: label(r), link: link(r), tone: r.risk.level, value: `+${fmtPct(r.fin.overrunPct)}`,
        detail: `${fmtMoney(r.fin.eac - r.fin.budget)} peste buget · sursa principală: ${CATEGORY_LABEL[worst.category].toLowerCase()} (${fmtMoney(-worst.variance)}) · marjă ${fmtPct(r.fin.margin)}`,
      };
    }),
    basis: basisRows(active(kb).length, kb),
    followUps: ['Ce probleme necesită aprobarea conducerii?', 'Ce alte proiecte prezintă riscuri?'],
  };
}

function delays(kb: KnowledgeBase): Answer {
  const rows = active(kb).filter((r) => r.sched.delayed).sort((a, b) => b.sched.gap - a.sched.gap);
  return {
    intent: 'intarzieri',
    title: rows.length ? `Întârzieri pe ${rows.length} ${rows.length === 1 ? 'șantier' : 'șantiere'}` : 'Nu există întârzieri semnificative',
    summary: rows.length
      ? 'Un proiect este marcat întârziat când progresul fizic raportat rămâne sub progresul planificat cu mai mult decât pragul configurat sau când termenul a fost depășit.'
      : 'Toate proiectele active au progresul fizic în limita pragului configurat.',
    items: rows.map((r) => ({
      text: label(r), link: link(r, 'progres'), tone: r.sched.daysLeft < 14 ? 'risk' : 'warn',
      value: `${Math.round(r.sched.gap)} pp`,
      detail: `Realizat ${fmtPct(r.sched.progress)} din ${fmtPct(r.sched.plannedProgress)} planificat · termen ${fmtDateShort(r.project.dueDate)} (${r.sched.daysLeft} zile)${r.sched.delayDays ? ` · finalizare estimată ${fmtDateShort(r.sched.forecastEnd)}` : ''} · ${person(kb, r.project.managerId)}`,
    })),
    basis: `${active(kb).length} proiecte active; progres fizic = suma ponderată a etapelor raportate din șantier.`,
    followUps: ['Ce echipe devin disponibile săptămâna viitoare?', 'Ce proiecte au nevoie urgentă de materiale?'],
  };
}

function teamsAvailable(kb: KnowledgeBase): Answer {
  const ws = addDays(weekStart(kb.today), 7);
  const we = addDays(ws, 6);
  const items: AnswerItem[] = kb.teams.map((t) => {
    const allocs = kb.allocations.filter((a) => a.resourceType === 'team' && a.resourceId === t.id && overlaps(a.start, a.end, ws, we));
    const city = (a: Allocation) => kb.rows.find((r) => r.project.id === a.projectId)?.project.city ?? '';
    if (!allocs.length) return { text: t.name, tone: 'ok' as const, value: 'Liberă', detail: `Disponibilă toată săptămâna · ${t.specialty}` };
    const ending = allocs.filter((a) => a.end < we);
    const continuing = allocs.filter((a) => a.end >= we);
    if (!continuing.length) {
      const freeFrom = addDays(ending.map((a) => a.end).sort().reverse()[0], 1);
      const next = kb.allocations.filter((a) => a.resourceType === 'team' && a.resourceId === t.id && a.start > freeFrom).sort((a, b) => a.start.localeCompare(b.start))[0];
      return { text: t.name, tone: 'ok' as const, value: `din ${fmtDateShort(freeFrom)}`, detail: `Încheie lucrările la ${ending.map(city).join(', ')}${next ? ` · următoarea alocare: ${city(next)}, de la ${fmtDateShort(next.start)}` : ' · nicio alocare ulterioară'}` };
    }
    return { text: t.name, tone: 'neutral' as const, value: 'Ocupată', detail: `Alocată la ${continuing.map((a) => `${city(a)} (până la ${fmtDateShort(a.end)})`).join(', ')}` };
  });
  const free = items.filter((i) => i.tone === 'ok');
  return {
    intent: 'echipe',
    title: `Disponibilitate echipe, ${fmtDateShort(ws)} – ${fmtDateShort(we)}`,
    summary: free.length ? `${free.length} din ${kb.teams.length} echipe au capacitate liberă în săptămâna viitoare.` : 'Toate echipele sunt alocate integral săptămâna viitoare.',
    items: [...items].sort((a, b) => (a.tone === 'ok' ? -1 : 1) - (b.tone === 'ok' ? -1 : 1)),
    basis: `${kb.allocations.filter((a) => a.resourceType === 'team').length} alocări de echipe din modulul de planificare.`,
    followUps: ['Unde avem întârzieri?', 'Ce utilaje sunt disponibile?'],
  };
}

function equipmentAvailable(kb: KnowledgeBase): Answer {
  const ws = kb.today, we = addDays(kb.today, 13);
  const items = kb.equipment.map<AnswerItem>((e) => {
    if (e.status === 'service') return { text: e.name, tone: 'warn', value: 'Service', detail: `În service până la ${fmtDateShort(e.serviceUntil!)}` };
    const al = kb.allocations.filter((a) => a.resourceType === 'equipment' && a.resourceId === e.id && overlaps(a.start, a.end, ws, we));
    if (!al.length) return { text: `${e.name}${e.plate ? ` (${e.plate})` : ''}`, tone: 'ok', value: 'Disponibil', detail: 'Fără alocări în următoarele 14 zile' };
    return { text: `${e.name}${e.plate ? ` (${e.plate})` : ''}`, tone: 'neutral', value: 'Alocat', detail: al.map((a) => `${kb.rows.find((r) => r.project.id === a.projectId)?.project.city} până la ${fmtDateShort(a.end)}`).join(', ') };
  });
  return {
    intent: 'utilaje', title: 'Disponibilitate utilaje și vehicule (14 zile)',
    summary: `${items.filter((i) => i.tone === 'ok').length} din ${items.length} utilaje și vehicule sunt libere în următoarele două săptămâni.`,
    items: items.sort((a) => (a.tone === 'ok' ? -1 : 1)), basis: 'Alocări din modulul Echipe și utilaje.', followUps: ['Ce echipe devin disponibile săptămâna viitoare?'],
  };
}

function urgentMaterials(kb: KnowledgeBase): Answer {
  const pending = kb.requests.filter((r) => r.status === 'in_asteptare');
  const rank = { critica: 0, ridicata: 1, normala: 2 };
  const items: AnswerItem[] = pending.sort((a, b) => rank[a.urgency] - rank[b.urgency]).map((r) => {
    const row = kb.rows.find((x) => x.project.id === r.projectId)!;
    return {
      text: `${label(row)}`, link: link(row, 'materiale'), tone: r.urgency === 'critica' ? 'risk' : r.urgency === 'ridicata' ? 'warn' : 'neutral',
      value: fmtMoney(requestValue(r, kb.materials)),
      detail: `Urgență ${URGENCY_LABEL[r.urgency].toLowerCase()} · ${r.items.map((it) => kb.materials.find((m) => m.id === it.materialId)?.name).join(', ')}`,
    };
  });
  // Lipsuri de stoc pentru necesarul proiectelor active
  const shortages = kb.materials.map((m) => {
    const open = kb.projectMaterials.filter((pm) => pm.materialId === m.id && kb.rows.find((r) => r.project.id === pm.projectId && r.project.status === 'executie'))
      .reduce((a, pm) => a + Math.max(0, pm.planned - pm.transferred - pm.reserved), 0);
    return { m, open, gap: open - m.stock };
  }).filter((x) => x.gap > 0 && x.m.stock < x.m.minStock);
  for (const s of shortages.slice(0, 3)) {
    items.push({ text: `Stoc insuficient: ${s.m.name}`, link: '/materiale', tone: 'warn', value: `−${Math.round(s.gap)} ${s.m.unit}`, detail: `Stoc ${s.m.stock} ${s.m.unit}, necesar netransferat ${Math.round(s.open)} ${s.m.unit} pe proiecte în execuție` });
  }
  return {
    intent: 'materiale',
    title: pending.length ? `${pending.length} solicitări de materiale așteaptă decizie` : 'Nu există solicitări de materiale în așteptare',
    summary: pending.length ? 'Solicitările vin din Atlas Field, de la șefii de șantier, și sunt ordonate după urgență. Sunt incluse și materialele cu stoc sub necesar.' : 'Toate solicitările au fost procesate.',
    items,
    basis: `${kb.requests.length} solicitări, ${kb.materials.length} articole de catalog, necesar pe proiecte din modulul Materiale.`,
    followUps: ['Ce probleme necesită aprobarea conducerii?'],
  };
}

function profitThisMonth(kb: KnowledgeBase): Answer {
  const mk = monthKey(kb.today);
  const ending = kb.rows.filter((r) => monthKey(r.project.dueDate) === mk);
  const invoiced = kb.rows.reduce((a, r) => a + r.project.invoices.filter((i) => monthKey(i.date) === mk).reduce((x, i) => x + i.amount, 0), 0);
  const costs = kb.rows.reduce((a, r) => a + r.project.costs.filter((c) => monthKey(c.date) === mk).reduce((x, c) => x + c.amount, 0), 0);
  const profitEnding = ending.reduce((a, r) => a + r.fin.profit, 0);
  return {
    intent: 'profit-luna',
    title: `Profit estimat, ${fmtMonthLong(mk)}`,
    summary: `Profitul „pe lună” depinde de definiție, așa că răspunsul folosește două măsuri calculate din date. (1) Proiectele cu termen de finalizare în ${fmtMonthLong(mk)} au un profit brut estimat de ${fmtMoney(profitEnding)}. (2) Pe documentele înregistrate până azi în această lună: facturat ${fmtMoney(invoiced)}, costuri efective ${fmtMoney(costs)}, diferență ${fmtMoney(invoiced - costs)}. Măsura (2) nu este un profit contabil: facturarea și costurile nu sunt sincronizate pe aceleași lucrări.`,
    items: ending.map((r) => ({ text: label(r), link: link(r), tone: r.risk.level, value: fmtMoney(r.fin.profit), detail: `Termen ${fmtDateShort(r.project.dueDate)} · marjă ${fmtPct(r.fin.margin)} · progres ${fmtPct(r.sched.progress)}` })),
    basis: `Facturi și costuri cu dată în ${fmtMonthLong(mk)}; ${ending.length} proiecte cu termen în lună. Fără integrare contabilă: cifrele provin doar din platformă.`,
    followUps: ['Care sunt cele mai profitabile proiecte?', 'Ce încasări avem restante?'],
  };
}

function approvals(kb: KnowledgeBase): Answer {
  const items: AnswerItem[] = [];
  for (const r of kb.requests.filter((x) => x.status === 'in_asteptare')) {
    const row = kb.rows.find((x) => x.project.id === r.projectId)!;
    const v = requestValue(r, kb.materials);
    const net = v - Math.min(v, r.coveredByEstimate);
    items.push({
      text: `Solicitare materiale ${r.id.toUpperCase()} – ${row.project.city}`, link: link(row, 'materiale'),
      tone: r.urgency === 'critica' ? 'risk' : 'warn', value: fmtMoney(v),
      detail: `Urgență ${URGENCY_LABEL[r.urgency].toLowerCase()} · impact net asupra profitului ${net > 0 ? `−${fmtMoney(net)}` : 'zero (inclus deja în estimare)'}`,
    });
  }
  for (const row of kb.rows) {
    for (const co of row.project.changeOrders.filter((c) => c.status === 'propus')) {
      items.push({ text: `Act adițional propus – ${row.project.city}`, link: link(row), tone: 'warn', value: `+${fmtMoney(co.amount)}`, detail: co.title });
    }
  }
  for (const row of active(kb).filter((r) => r.risk.level === 'risk')) {
    items.push({ text: `Proiect în zona roșie – ${label(row)}`, link: link(row), tone: 'risk', value: fmtPct(row.fin.margin), detail: row.risk.reasons.join(' · ') });
  }
  return {
    intent: 'aprobari',
    title: items.length ? `${items.length} subiecte necesită decizia conducerii` : 'Nu există subiecte în așteptarea conducerii',
    summary: 'Includ solicitările de materiale în așteptare, actele adiționale propuse și proiectele care au depășit pragurile roșii configurate.',
    items,
    basis: `${kb.requests.length} solicitări, praguri de risc din Setări.`,
    followUps: ['Ce alte proiecte prezintă riscuri?', 'Ce șantiere au depășit bugetul?'],
  };
}

function risks(kb: KnowledgeBase): Answer {
  const rows = active(kb).filter((r) => r.risk.level !== 'ok').sort((a, b) => (a.risk.level === 'risk' ? -1 : 1) - (b.risk.level === 'risk' ? -1 : 1) || a.fin.margin - b.fin.margin);
  const critical = kb.reports.filter((rep) => rep.issues.some((i) => i.severity !== 'minora') && rep.date >= addDays(kb.today, -7));
  const red = rows.filter((r) => r.risk.level === 'risk').length;
  return {
    intent: 'riscuri',
    title: `${rows.length} proiecte active prezintă riscuri`,
    summary: `${red} în zona roșie și ${rows.length - red} în zona galbenă, conform pragurilor configurate. Pentru fiecare sunt listate motivele calculate.${critical.length ? ` În ultimele 7 zile, șefii de șantier au raportat ${critical.length} probleme majore sau critice.` : ''}`,
    items: rows.map((r) => ({ text: label(r), link: link(r), tone: r.risk.level, value: fmtPct(r.fin.margin), detail: r.risk.reasons.join(' · ') })),
    basis: basisRows(active(kb).length, kb),
    followUps: ['Ce probleme necesită aprobarea conducerii?', 'Unde avem întârzieri?'],
  };
}

function receivables(kb: KnowledgeBase): Answer {
  const rows = kb.rows.filter((r) => r.fin.receivables > 0).sort((a, b) => b.fin.overdueReceivables - a.fin.overdueReceivables || b.fin.receivables - a.fin.receivables);
  const total = rows.reduce((a, r) => a + r.fin.receivables, 0);
  const overdue = rows.reduce((a, r) => a + r.fin.overdueReceivables, 0);
  return {
    intent: 'incasari', title: 'Creanțe și încasări',
    summary: `Creanțe totale ${fmtMoney(total)}, din care restante ${fmtMoney(overdue)}.`,
    items: rows.slice(0, 8).map((r) => ({ text: `${r.project.client}`, link: link(r), tone: r.fin.overdueReceivables > 0 ? 'risk' : 'neutral', value: fmtMoney(r.fin.receivables), detail: `${r.project.city} · restant ${fmtMoney(r.fin.overdueReceivables)}` })),
    basis: 'Facturi emise înregistrate în platformă (termen de plată 30 de zile).',
    followUps: ['Care este profitul estimat pentru luna aceasta?'],
  };
}

function summary(kb: KnowledgeBase): Answer {
  const t = computeTotals(kb.rows);
  return {
    intent: 'rezumat', title: 'Situația portofoliului',
    summary: `${t.activeCount} proiecte active cu valoare contractuală ${fmtMoney(t.activeContracts)}. Profit brut estimat ${fmtMoney(t.profit)} (marjă ${fmtPct(t.margin)}), față de ${fmtMoney(t.plannedProfit)} planificat. ${t.riskCounts.risk} proiecte în zona roșie, ${t.riskCounts.warn} în zona galbenă, ${t.delayed} întârziate. Creanțe restante ${fmtMoney(t.overdue)}.`,
    items: [], basis: basisRows(t.activeCount, kb), followUps: SUGGESTED_QUESTIONS.slice(0, 3),
  };
}

function projectStatus(kb: KnowledgeBase, r: ProjectRow): Answer {
  const last = kb.reports.find((rep) => rep.projectId === r.project.id);
  return {
    intent: 'proiect', title: label(r),
    summary: `${STATUS_LABEL[r.project.status]} · progres fizic ${fmtPct(r.sched.progress)} (planificat ${fmtPct(r.sched.plannedProgress)}). Venit actualizat ${fmtMoney(r.fin.revenue)}, cost estimat la finalizare ${fmtMoney(r.fin.eac)}, profit estimat ${fmtMoney(r.fin.profit)} (marjă ${fmtPct(r.fin.margin)}).${r.risk.reasons.length ? ` Atenție: ${r.risk.reasons.join('; ')}.` : ' Proiectul este în limitele stabilite.'}`,
    items: [
      { text: 'Fișa financiară', link: link(r), value: fmtMoney(r.fin.profit), tone: r.risk.level, detail: `Efective ${fmtMoney(r.fin.actual)} · angajate ${fmtMoney(r.fin.committedOpen)} · rămase ${fmtMoney(r.fin.etc)}` },
      ...(last ? [{ text: `Ultimul raport de șantier, ${fmtDateShort(last.date)}`, link: link(r, 'jurnal'), tone: (last.issues.some((i) => i.severity === 'critica') ? 'risk' : 'neutral') as AnswerItem['tone'], detail: last.activities }] : []),
    ],
    basis: `Fișa proiectului ${r.project.code}.`,
    followUps: ['Ce alte proiecte prezintă riscuri?'],
  };
}
