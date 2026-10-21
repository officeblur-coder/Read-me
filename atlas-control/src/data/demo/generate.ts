// Deterministic generator that turns compact project specs into coherent demo records:
// stages, budgets, cost entries linked to commitments, invoices, photos and documents.
// Everything derives from the spec, so financial indicators stay internally consistent.
import type {
  CostCategory, CostEntry, Commitment, Invoice, PhotoStage, Project, ProjectDocument, ProjectMaterial,
  ProjectType, SitePhoto, Stage, ISODate,
} from '../../domain/types';
import { COST_CATEGORIES } from '../../domain/finance';
import { addDays, daysBetween } from '../../domain/dates';
import { DEMO_TODAY } from './constants';

export function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (v: number, step = 10) => Math.round(v / step) * step;

const STAGE_TEMPLATES: Record<'teren' | 'baza' | 'joaca' | 'atletism', [string, number][]> = {
  teren: [
    ['Organizare de șantier', 5], ['Decopertare și terasamente', 15], ['Drenaj și strat de fundație', 20],
    ['Împrejmuire și iluminat', 15], ['Montaj suprafață sportivă', 30], ['Dotări și marcaje', 10], ['Recepție la terminarea lucrărilor', 5],
  ],
  baza: [
    ['Organizare de șantier', 4], ['Terasamente generale', 12], ['Drenaj și rețele', 14], ['Fundații și structuri', 16],
    ['Suprafețe sportive', 24], ['Împrejmuiri, iluminat, tribune', 18], ['Dotări și finisaje', 8], ['Recepție la terminarea lucrărilor', 4],
  ],
  joaca: [
    ['Organizare de șantier', 5], ['Pregătire teren', 15], ['Fundații echipamente', 15], ['Producție echipamente (atelier)', 20],
    ['Montaj echipamente', 20], ['Suprafață cauciucată EPDM', 20], ['Recepție la terminarea lucrărilor', 5],
  ],
  atletism: [
    ['Organizare de șantier', 4], ['Terasamente', 14], ['Drenaj perimetral', 14], ['Fundație asfaltică', 22],
    ['Covor tartan', 30], ['Marcaje și dotări', 12], ['Recepție la terminarea lucrărilor', 4],
  ],
};

const templateFor = (t: ProjectType) =>
  t === 'baza' ? STAGE_TEMPLATES.baza : t === 'joaca' ? STAGE_TEMPLATES.joaca : t === 'atletism' ? STAGE_TEMPLATES.atletism : STAGE_TEMPLATES.teren;

export const COST_SPLIT: Record<ProjectType, Record<CostCategory, number>> = {
  fotbal: { materiale: 0.47, manopera: 0.16, utilaje: 0.1, transport: 0.05, subcontractori: 0.18, alte: 0.04 },
  minifotbal: { materiale: 0.5, manopera: 0.18, utilaje: 0.09, transport: 0.06, subcontractori: 0.13, alte: 0.04 },
  multisport: { materiale: 0.48, manopera: 0.19, utilaje: 0.08, transport: 0.06, subcontractori: 0.15, alte: 0.04 },
  baza: { materiale: 0.44, manopera: 0.15, utilaje: 0.1, transport: 0.05, subcontractori: 0.22, alte: 0.04 },
  joaca: { materiale: 0.56, manopera: 0.2, utilaje: 0.05, transport: 0.06, subcontractori: 0.09, alte: 0.04 },
  tenis: { materiale: 0.46, manopera: 0.2, utilaje: 0.09, transport: 0.06, subcontractori: 0.15, alte: 0.04 },
  atletism: { materiale: 0.5, manopera: 0.15, utilaje: 0.12, transport: 0.05, subcontractori: 0.14, alte: 0.04 },
  padel: { materiale: 0.58, manopera: 0.16, utilaje: 0.05, transport: 0.06, subcontractori: 0.11, alte: 0.04 },
  baschet: { materiale: 0.55, manopera: 0.18, utilaje: 0.06, transport: 0.06, subcontractori: 0.11, alte: 0.04 },
};

const SUPPLIERS: Record<CostCategory, string[]> = {
  materiale: ['Turf Distribution SRL (fictiv)', 'Cariera Nord SRL (fictiv)', 'Hidro Drenaj SRL (fictiv)', 'Track Surfaces SRL (fictiv)'],
  manopera: ['Pontaj intern'],
  utilaje: ['Parc utilaje propriu', 'Rent Utilaje Centru SRL (fictiv)'],
  transport: ['Logistică proprie', 'Trans Cargo Mureș SRL (fictiv)'],
  subcontractori: ['Terra Excav SRL (fictiv)', 'Electro Lumina Instal SRL (fictiv)', 'Topo Cad Expert SRL (fictiv)'],
  alte: ['Diverși furnizori'],
};

const DESCRIPTIONS: Record<CostCategory, string[]> = {
  materiale: ['Agregate pentru fundație', 'Geotextil și elemente drenaj', 'Gazon sintetic, livrare parțială', 'Granule și nisip de umplutură', 'Elemente împrejmuire'],
  manopera: ['Manoperă echipe proprii'],
  utilaje: ['Ore utilaje terasamente', 'Închiriere cilindru compactor', 'Utilaje montaj'],
  transport: ['Transport agregate', 'Transport materiale de la depozit', 'Deplasare echipe'],
  subcontractori: ['Lucrări terasamente', 'Instalație electrică și iluminat', 'Ridicări topografice'],
  alte: ['Organizare de șantier, utilități', 'Asigurări și garanții', 'Taxe și avize'],
};

export interface ProjectSpec {
  id: string;
  code: string;
  name: string;
  type: ProjectType;
  client: string;
  clientKind: Project['clientKind'];
  county: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  contractValue: number;
  startDate: ISODate;
  dueDate: ISODate;
  status: Project['status'];
  managerId: string;
  siteManagerId: string;
  teamIds: string[];
  progress: number;
  plannedMargin: number; // 0.18 = 18%
  cpf: number; // factor de performanță cost (1 = conform bugetului)
  invoicedRatio?: number; // din valoarea executată
  overdueInvoices?: number; // câte facturi (cele mai vechi neîncasate) sunt restante
  surface: string;
  notes?: string;
  seed: number;
}

function buildStages(type: ProjectType, progress: number, start: ISODate, due: ISODate): Stage[] {
  const tpl = templateFor(type);
  const total = daysBetween(start, due);
  let left = progress;
  let cum = 0;
  return tpl.map(([name, weight], i) => {
    const p = Math.max(0, Math.min(100, (left / weight) * 100));
    left -= (p / 100) * weight;
    cum += weight;
    return {
      id: `s${i + 1}`,
      name,
      weight,
      progress: Math.round(p),
      plannedEnd: addDays(start, Math.round((cum / 100) * total)),
      confirmedAt: p >= 100 ? addDays(start, Math.round((cum / 100) * total) - 2) : undefined,
    };
  });
}

/** Front-loaded consumption: materials are bought ahead of physical progress. */
const earnedFactor = (cat: CostCategory, p: number) =>
  cat === 'materiale' ? Math.min(1, p * 1.12) : cat === 'alte' ? Math.min(1, 0.25 + p * 0.75) : p;

export function buildProject(spec: ProjectSpec): Project {
  const rnd = prng(spec.seed);
  const P = spec.progress / 100;
  const done = spec.status === 'finalizat' || spec.status === 'receptie';
  const lastCostDate = done ? spec.dueDate : DEMO_TODAY < spec.dueDate ? addDays(DEMO_TODAY, -1) : spec.dueDate;
  const split = COST_SPLIT[spec.type];
  const budgetTotal = spec.contractValue * (1 - spec.plannedMargin);

  const budget = {} as Record<CostCategory, number>;
  const etc = {} as Record<CostCategory, number>;
  const costs: CostEntry[] = [];
  const commitments: Commitment[] = [];
  let n = 0;

  for (const cat of COST_CATEGORIES) {
    const b = round(budgetTotal * split[cat], 100);
    budget[cat] = b;
    // Per-category jitter around project cost factor, so overruns have a visible source.
    const catCpf = spec.cpf === 1 ? 1 + (rnd() - 0.5) * 0.03 : 1 + (spec.cpf - 1) * (cat === 'materiale' || cat === 'subcontractori' ? 1.5 : 0.6);
    const eacCat = b * catCpf;
    let earned = done ? eacCat : eacCat * earnedFactor(cat, P);
    if (spec.status === 'pregatire') earned = cat === 'alte' ? b * 0.12 : 0;
    const invoicedShare = done ? 1 : 0.9;
    const actualTotal = round(earned * invoicedShare);
    let openTotal = round(earned - actualTotal);
    let forward = 0;
    if (!done && (cat === 'materiale' || cat === 'subcontractori')) {
      forward = round(eacCat * (spec.status === 'pregatire' ? 0.35 : 0.18) * (1 - P), 100);
    }
    if (cat === 'manopera' || cat === 'transport' || cat === 'alte') openTotal = 0;
    const hasCommitment = cat === 'materiale' || cat === 'subcontractori' || cat === 'utilaje';

    // Split actuals across months between start and last cost date.
    const span = Math.max(1, daysBetween(spec.startDate, lastCostDate));
    const parts = actualTotal > 0 ? Math.max(1, Math.min(6, Math.round(span / 30))) : 0;
    let commitmentId: string | undefined;
    if (hasCommitment && actualTotal + openTotal + forward > 0) {
      commitmentId = `${spec.id}-c${++n}`;
      commitments.push({
        id: commitmentId,
        date: spec.startDate,
        category: cat,
        description: cat === 'materiale' ? 'Comandă-cadru materiale proiect' : cat === 'subcontractori' ? 'Contract de subcontractare' : 'Contract închiriere utilaje',
        supplier: SUPPLIERS[cat][Math.floor(rnd() * SUPPLIERS[cat].length)],
        amount: actualTotal + openTotal + forward,
      });
    }
    const weights = Array.from({ length: parts }, () => 0.6 + rnd());
    const wsum = weights.reduce((a, c) => a + c, 0);
    let allocated = 0;
    weights.forEach((w, i) => {
      const amount = i === parts - 1 ? actualTotal - allocated : round((actualTotal * w) / wsum);
      allocated += amount;
      const date = addDays(spec.startDate, Math.round(((i + 1) / parts) * span) - Math.floor(rnd() * 6));
      costs.push({
        id: `${spec.id}-k${++n}`,
        date: date > lastCostDate ? lastCostDate : date,
        category: cat,
        description: cat === 'manopera' ? `Manoperă echipe proprii, ${monthName(date)}` : DESCRIPTIONS[cat][i % DESCRIPTIONS[cat].length],
        supplier: SUPPLIERS[cat][i % SUPPLIERS[cat].length],
        amount,
        commitmentId,
        source: cat === 'manopera' ? 'raport-santier' : 'import',
      });
    });
    etc[cat] = done ? 0 : Math.max(0, round(eacCat - actualTotal - openTotal - forward, 100));
  }

  // Invoices (situații de lucrări), lunar, termen de plată 30 zile.
  const invoices: Invoice[] = [];
  const executed = spec.contractValue * P * (spec.invoicedRatio ?? (done ? 1 : 0.88));
  const months = Math.max(0, Math.floor(daysBetween(spec.startDate, done ? spec.dueDate : DEMO_TODAY) / 30));
  const invCount = Math.min(months, 7);
  let unpaidLeft = spec.overdueInvoices ?? 0;
  for (let i = 0; i < invCount; i++) {
    const date = addDays(spec.startDate, 30 * (i + 1) + 3);
    if (date > DEMO_TODAY) break;
    const amount = round(executed / invCount, 100);
    const dueDate = addDays(date, 30);
    let paid = dueDate < DEMO_TODAY ? amount : 0;
    if (paid > 0 && unpaidLeft > 0) {
      paid = 0;
      unpaidLeft--;
    }
    invoices.push({ id: `${spec.id}-f${i + 1}`, number: `AS-${date.slice(0, 4)}-${String(200 + spec.seed * 3 + i).padStart(4, '0')}`, date, dueDate, amount, paid });
  }

  const stages = buildStages(spec.type, spec.progress, spec.startDate, spec.dueDate);

  return {
    id: spec.id,
    code: spec.code,
    name: spec.name,
    type: spec.type,
    client: spec.client,
    clientKind: spec.clientKind,
    county: spec.county,
    city: spec.city,
    address: spec.address,
    lat: spec.lat,
    lng: spec.lng,
    contractValue: spec.contractValue,
    startDate: spec.startDate,
    dueDate: spec.dueDate,
    status: spec.status,
    managerId: spec.managerId,
    siteManagerId: spec.siteManagerId,
    teamIds: spec.teamIds,
    stages,
    budget,
    etc,
    costs,
    commitments,
    invoices,
    changeOrders: [],
    documents: buildDocuments(spec),
    photos: buildPhotos(spec, stages),
    notes: spec.notes ?? '',
    surface: spec.surface,
  };
}

function monthName(d: ISODate) {
  return ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'][+d.slice(5, 7) - 1];
}

function buildDocuments(spec: ProjectSpec): ProjectDocument[] {
  const docs: ProjectDocument[] = [
    { id: `${spec.id}-d1`, name: `Contract de execuție lucrări ${spec.code}.pdf`, kind: 'Contract', date: addDays(spec.startDate, -21), sizeKb: 1_840 },
    { id: `${spec.id}-d2`, name: 'Proiect tehnic și detalii de execuție.pdf', kind: 'Proiect tehnic', date: addDays(spec.startDate, -40), sizeKb: 24_300 },
    { id: `${spec.id}-d3`, name: 'Deviz general și liste de cantități.xlsx', kind: 'Deviz', date: addDays(spec.startDate, -35), sizeKb: 612 },
    { id: `${spec.id}-d4`, name: 'Autorizație de construire.pdf', kind: 'Autorizație', date: addDays(spec.startDate, -14), sizeKb: 920 },
    { id: `${spec.id}-d5`, name: 'Proces-verbal de predare a amplasamentului.pdf', kind: 'Proces-verbal', date: spec.startDate, sizeKb: 340 },
    { id: `${spec.id}-d6`, name: 'Fișe tehnice materiale și agremente.pdf', kind: 'Fișă tehnică', date: addDays(spec.startDate, 7), sizeKb: 8_150 },
  ];
  if (spec.status === 'finalizat' || spec.status === 'receptie') {
    docs.push({ id: `${spec.id}-d7`, name: 'Proces-verbal de recepție la terminarea lucrărilor.pdf', kind: 'Proces-verbal', date: spec.dueDate, sizeKb: 510 });
  }
  return docs;
}

const PHOTO_SEQ: Record<string, PhotoStage[]> = {
  teren: ['decopertare', 'excavatie', 'drenaj', 'fundatie', 'imprejmuire', 'suprafata', 'finalizat'],
  joaca: ['decopertare', 'fundatie', 'joaca', 'joaca', 'finalizat'],
};

function buildPhotos(spec: ProjectSpec, stages: Stage[]): SitePhoto[] {
  if (spec.status === 'pregatire') return [];
  const seq = spec.type === 'joaca' ? PHOTO_SEQ.joaca : PHOTO_SEQ.teren;
  const reached = Math.max(1, Math.round((spec.progress / 100) * seq.length));
  const out: SitePhoto[] = [];
  for (let i = 0; i < reached; i++) {
    const stage = seq[Math.min(i, seq.length - 1)];
    const st = stages[Math.min(stages.length - 1, Math.floor((i / seq.length) * stages.length))];
    const date = st.plannedEnd < DEMO_TODAY ? st.plannedEnd : addDays(DEMO_TODAY, -1 - i);
    out.push({ id: `${spec.id}-ph${i + 1}`, date, stage, seed: spec.seed * 10 + i, caption: `${st.name}` });
  }
  return out.reverse();
}

export const MATERIAL_TEMPLATES: Record<ProjectType, [string, number][]> = {
  // [materialId, cantitate la 1 mil. lei valoare contract]
  fotbal: [['m-01', 1_150], ['m-03', 7], ['m-04', 14], ['m-05', 160], ['m-06', 240], ['m-07', 700], ['m-08', 90], ['m-10', 40], ['m-11', 44], ['m-22', 260], ['m-23', 4]],
  minifotbal: [['m-01', 1_650], ['m-03', 10], ['m-04', 20], ['m-05', 220], ['m-07', 1_600], ['m-10', 110], ['m-11', 120], ['m-12', 900], ['m-13', 4], ['m-22', 500]],
  multisport: [['m-02', 1_700], ['m-04', 22], ['m-05', 240], ['m-07', 1_700], ['m-10', 110], ['m-11', 120], ['m-13', 3], ['m-14', 3], ['m-22', 520]],
  baza: [['m-01', 1_100], ['m-03', 6], ['m-05', 140], ['m-06', 200], ['m-07', 650], ['m-08', 80], ['m-10', 50], ['m-11', 55], ['m-23', 3], ['m-22', 240]],
  joaca: [['m-19', 1], ['m-20', 3], ['m-21', 2], ['m-17', 5_200], ['m-18', 900], ['m-05', 120]],
  tenis: [['m-02', 1_400], ['m-04', 40], ['m-05', 260], ['m-10', 120], ['m-11', 130], ['m-15', 4]],
  atletism: [['m-16', 1_250], ['m-17', 2_400], ['m-18', 1_100], ['m-05', 180], ['m-06', 260], ['m-08', 140]],
  padel: [['m-02', 900], ['m-04', 35], ['m-11', 60], ['m-23', 10]],
  baschet: [['m-14', 7], ['m-24', 400], ['m-05', 200]],
};

export function buildProjectMaterials(p: Project, progress: number): ProjectMaterial[] {
  const scale = p.contractValue / 1_000_000;
  const P = progress / 100;
  const done = p.status === 'finalizat' || p.status === 'receptie';
  return MATERIAL_TEMPLATES[p.type].map(([materialId, perM]) => {
    const planned = Math.max(1, Math.round(perM * scale));
    if (done) return { projectId: p.id, materialId, planned, reserved: 0, transferred: planned, consumed: planned };
    if (p.status === 'pregatire') return { projectId: p.id, materialId, planned, reserved: 0, transferred: 0, consumed: 0 };
    const transferred = Math.min(planned, Math.round(planned * Math.min(1, P * 1.15)));
    const consumed = Math.min(transferred, Math.round(planned * P * 0.95));
    const reserved = Math.max(0, Math.min(planned - transferred, Math.round(planned * 0.15)));
    return { projectId: p.id, materialId, planned, reserved, transferred, consumed };
  });
}
