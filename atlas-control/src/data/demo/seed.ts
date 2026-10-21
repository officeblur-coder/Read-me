// Assembles the complete demo dataset. The store loads this once and on „Resetează datele demo”.
import type { Allocation, MaterialRequest, ProjectMaterial, SiteReport } from '../../domain/types';
import { physicalProgress } from '../../domain/finance';
import { EQUIPMENT, PEOPLE, TEAMS } from './people';
import { MATERIALS, PRODUCTION_ORDERS, PURCHASE_ORDERS, TRANSFERS } from './materials';
import { PROJECTS, SCENARIO_PROJECT_ID } from './projects';
import { buildProjectMaterials, prng } from './generate';

const REQUESTS: MaterialRequest[] = [
  {
    id: 'req-01', projectId: SCENARIO_PROJECT_ID, requestedBy: 'p-06', date: '2026-10-20', urgency: 'ridicata',
    reason: 'Drenaj suplimentar pe latura de est: strat argilos cu apă stagnantă, confirmat de raportul din 20.10. Fără drenaj, stratul de fundație nu poate fi recepționat pe zona afectată (cca. 1.800 m²).',
    items: [{ materialId: 'm-08', qty: 420 }, { materialId: 'm-07', qty: 1_800 }, { materialId: 'm-05', qty: 640 }, { materialId: 'm-09', qty: 6 }],
    category: 'materiale', supplier: 'Hidro Drenaj SRL (fictiv)', coveredByEstimate: 18_000, status: 'in_asteptare',
  },
  {
    id: 'req-02', projectId: 'prj-06', requestedBy: 'p-08', date: '2026-10-20', urgency: 'critica',
    reason: 'Granule EPDM și liant pentru ultimele 2 culoare. Fereastra meteo pentru turnare se închide la începutul lui noiembrie.',
    items: [{ materialId: 'm-17', qty: 2_200 }, { materialId: 'm-18', qty: 600 }],
    category: 'materiale', supplier: 'Track Surfaces SRL (fictiv)', coveredByEstimate: 37_040, status: 'in_asteptare',
  },
  {
    id: 'req-03', projectId: 'prj-15', requestedBy: 'p-08', date: '2026-10-19', urgency: 'ridicata',
    reason: 'Gazon sintetic suplimentar pentru zonele de racord și înlocuirea unei role deteriorate la transport.',
    items: [{ materialId: 'm-01', qty: 180 }, { materialId: 'm-24', qty: 40 }],
    category: 'materiale', supplier: 'Turf Distribution SRL (fictiv)', coveredByEstimate: 6_000, status: 'in_asteptare',
  },
  {
    id: 'req-04', projectId: 'prj-09', requestedBy: 'p-07', date: '2026-10-16', urgency: 'normala',
    reason: 'Plasă de protecție și stâlpi pentru separarea zonei de spectatori, cerută de beneficiar la ședința de șantier.',
    items: [{ materialId: 'm-12', qty: 260 }, { materialId: 'm-11', qty: 18 }],
    category: 'materiale', supplier: 'Net Sport SRL (fictiv)', coveredByEstimate: 0, status: 'in_asteptare',
  },
  {
    id: 'req-05', projectId: 'prj-05', requestedBy: 'p-09', date: '2026-10-06', urgency: 'normala',
    reason: 'Granule EPDM colorate pentru zona de cățărare.',
    items: [{ materialId: 'm-17', qty: 1_200 }],
    category: 'materiale', supplier: 'Track Surfaces SRL (fictiv)', coveredByEstimate: 11_040, status: 'aprobata', decidedBy: 'u-ceo', decidedAt: '2026-10-07',
  },
];

const ALLOCATIONS: Allocation[] = [
  { id: 'al-1', resourceType: 'team', resourceId: 't-2', projectId: 'prj-01', start: '2026-09-28', end: '2026-11-13' },
  { id: 'al-2', resourceType: 'team', resourceId: 't-1', projectId: 'prj-02', start: '2026-09-14', end: '2026-10-16' },
  { id: 'al-3', resourceType: 'team', resourceId: 't-1', projectId: 'prj-01', start: '2026-11-09', end: '2026-12-04' },
  { id: 'al-4', resourceType: 'team', resourceId: 't-3', projectId: 'prj-03', start: '2026-09-21', end: '2026-10-30' },
  { id: 'al-5', resourceType: 'team', resourceId: 't-3', projectId: 'prj-09', start: '2026-11-16', end: '2026-12-18' },
  { id: 'al-6', resourceType: 'team', resourceId: 't-4', projectId: 'prj-18', start: '2026-10-12', end: '2026-11-04' },
  { id: 'al-7', resourceType: 'team', resourceId: 't-4', projectId: 'prj-02', start: '2026-11-05', end: '2026-11-20', note: 'Montaj iluminat nocturnă' },
  { id: 'al-8', resourceType: 'team', resourceId: 't-5', projectId: 'prj-05', start: '2026-09-28', end: '2026-10-30' },
  { id: 'al-9', resourceType: 'team', resourceId: 't-5', projectId: 'prj-10', start: '2026-11-02', end: '2026-11-27' },
  { id: 'al-10', resourceType: 'team', resourceId: 't-6', projectId: 'prj-06', start: '2026-09-07', end: '2026-10-30' },
  { id: 'al-11', resourceType: 'team', resourceId: 't-6', projectId: 'prj-19', start: '2026-11-02', end: '2026-12-18' },
  { id: 'al-12', resourceType: 'equipment', resourceId: 'e-1', projectId: 'prj-01', start: '2026-10-12', end: '2026-10-31' },
  { id: 'al-13', resourceType: 'equipment', resourceId: 'e-1', projectId: 'prj-16', start: '2026-10-28', end: '2026-11-27', note: 'Terasamente la începerea lucrărilor' },
  { id: 'al-14', resourceType: 'equipment', resourceId: 'e-2', projectId: 'prj-07', start: '2026-10-05', end: '2026-11-20' },
  { id: 'al-15', resourceType: 'equipment', resourceId: 'e-6', projectId: 'prj-03', start: '2026-10-19', end: '2026-10-29' },
  { id: 'al-16', resourceType: 'equipment', resourceId: 'e-6', projectId: 'prj-15', start: '2026-11-02', end: '2026-11-09' },
  { id: 'al-17', resourceType: 'equipment', resourceId: 'e-7', projectId: 'prj-06', start: '2026-10-12', end: '2026-10-30' },
  { id: 'al-18', resourceType: 'equipment', resourceId: 'v-1', projectId: 'prj-01', start: '2026-10-05', end: '2026-10-30' },
  { id: 'al-19', resourceType: 'equipment', resourceId: 'v-2', projectId: 'prj-05', start: '2026-10-22', end: '2026-10-24' },
  { id: 'al-20', resourceType: 'equipment', resourceId: 'v-3', projectId: 'prj-02', start: '2026-09-14', end: '2026-11-06' },
  { id: 'al-21', resourceType: 'equipment', resourceId: 'e-4', projectId: 'prj-15', start: '2026-10-26', end: '2026-11-04', note: 'Utilaj programat în service până la 29.10' },
  { id: 'al-22', resourceType: 'equipment', resourceId: 'e-3', projectId: 'prj-11', start: '2026-10-12', end: '2026-11-06' },
  { id: 'al-23', resourceType: 'team', resourceId: 't-1', projectId: 'prj-11', start: '2026-10-19', end: '2026-11-06' },
];

const SCENARIO_REPORTS: SiteReport[] = [
  {
    id: 'rep-s3', projectId: SCENARIO_PROJECT_ID, date: '2026-10-20', authorId: 'p-06', weather: 'Ploaie moderată, 9 °C',
    workers: 6, hours: 42, laborCost: 2_280,
    activities: 'Verificare zonă est după precipitațiile din 18–19.10. Pompare apă din tranșeea de drenaj. Continuare montaj stâlpi împrejmuire pe latura de nord.',
    stageUpdates: [{ stageId: 's6', progress: 70 }],
    materials: [{ materialId: 'm-11', qty: 12 }],
    issues: [
      { severity: 'critica', text: 'Apă stagnantă pe cca. 1.800 m² în zona de est. Stratul argilos nu drenează; drenajul proiectat este insuficient. Necesar drenaj suplimentar (420 m dren + 6 cămine) înainte de stratul de fundație.' },
      { severity: 'minora', text: 'Acces auto îngreunat pe drumul de șantier după ploaie; necesar balast suplimentar (cantitate mică).' },
    ],
    photoIds: [`${SCENARIO_PROJECT_ID}-ph9`, `${SCENARIO_PROJECT_ID}-ph8`],
  },
  {
    id: 'rep-s2', projectId: SCENARIO_PROJECT_ID, date: '2026-10-17', authorId: 'p-06', weather: 'Înnorat, 12 °C',
    workers: 7, hours: 56, laborCost: 3_040,
    activities: 'Compactare strat de fundație teren fotbal, zona vest. Încercări de placă: rezultate conforme (Ev2 ≥ 45 MPa).',
    stageUpdates: [{ stageId: 's4', progress: 85 }],
    materials: [{ materialId: 'm-06', qty: 180 }],
    issues: [],
    photoIds: [`${SCENARIO_PROJECT_ID}-ph7`],
  },
  {
    id: 'rep-s1', projectId: SCENARIO_PROJECT_ID, date: '2026-10-16', authorId: 'p-06', weather: 'Senin, 14 °C',
    workers: 7, hours: 56, laborCost: 3_040,
    activities: 'Așternere și compactare balast stabilizat. Montaj cămine de drenaj pe latura de vest.',
    stageUpdates: [{ stageId: 's3', progress: 82 }],
    materials: [{ materialId: 'm-06', qty: 220 }, { materialId: 'm-08', qty: 60 }],
    issues: [{ severity: 'majora', text: 'Nivel ridicat al apei freatice în zona de est la adâncimea de 0,9 m. De urmărit după precipitații.' }],
    photoIds: [],
  },
];

const GENERIC_ACTIVITIES = [
  'Lucrări conform graficului. Verificare cote cu nivelmentul laser.',
  'Continuare lucrări pe frontul principal. Recepție materiale pe șantier.',
  'Lucrări de finisare și curățenie pe zona finalizată. Ședință de șantier cu dirigintele.',
];

function genericReports(): SiteReport[] {
  const rnd = prng(77);
  const out: SiteReport[] = [];
  for (const p of PROJECTS) {
    if (p.status !== 'executie' || p.id === SCENARIO_PROJECT_ID) continue;
    const current = p.stages.find((s) => s.progress > 0 && s.progress < 100) ?? p.stages[0];
    ['2026-10-20', '2026-10-19', '2026-10-16'].forEach((date, i) => {
      const workers = 3 + Math.floor(rnd() * 4);
      const hours = workers * 8;
      out.push({
        id: `rep-${p.id}-${i}`, projectId: p.id, date, authorId: p.siteManagerId,
        weather: ['Ploaie ușoară, 10 °C', 'Înnorat, 12 °C', 'Senin, 14 °C'][i],
        workers, hours, laborCost: hours * 54,
        activities: `${current.name}: ${GENERIC_ACTIVITIES[i]}`,
        stageUpdates: [{ stageId: current.id, progress: Math.max(0, current.progress - i * 4) }],
        materials: [],
        issues: p.id === 'prj-09' && i === 0
          ? [{ severity: 'majora', text: 'Livrarea structurii metalice amânată de furnizor cu 10 zile; montajul acoperirii se decalează.' }]
          : p.id === 'prj-06' && i === 0
            ? [{ severity: 'majora', text: 'Temperaturi nocturne sub 5 °C anunțate din 2 noiembrie. Turnarea tartanului trebuie finalizată până atunci.' }]
            : [],
        photoIds: i === 0 && p.photos[0] ? [p.photos[0].id] : [],
      });
    });
  }
  return out;
}

function projectMaterials(): ProjectMaterial[] {
  return PROJECTS.flatMap((p) => buildProjectMaterials(p, physicalProgress(p)));
}

export function createSeed() {
  return {
    projects: structuredClone(PROJECTS),
    people: structuredClone(PEOPLE),
    teams: structuredClone(TEAMS),
    equipment: structuredClone(EQUIPMENT),
    allocations: structuredClone(ALLOCATIONS),
    materials: structuredClone(MATERIALS),
    projectMaterials: projectMaterials(),
    requests: structuredClone(REQUESTS),
    purchaseOrders: structuredClone(PURCHASE_ORDERS),
    transfers: structuredClone(TRANSFERS),
    productionOrders: structuredClone(PRODUCTION_ORDERS),
    reports: [...SCENARIO_REPORTS, ...genericReports()].sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export type DemoData = ReturnType<typeof createSeed>;
