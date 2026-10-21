// DATE DEMONSTRATIVE FICTIVE. Localitățile sunt reale doar pentru plasarea pe hartă;
// beneficiarii, valorile, costurile și termenele sunt inventate și nu reflectă contracte Atlas Sport.
import type { CostEntry, Commitment, Project, SitePhoto } from '../../domain/types';
import { buildProject, type ProjectSpec } from './generate';

const SPECS: ProjectSpec[] = [
  {
    id: 'prj-02', code: 'AS-26-014', name: 'Teren de fotbal 105×68 m, gazon sintetic', type: 'fotbal',
    client: 'Primăria Municipiului Câmpia Turzii', clientKind: 'Autoritate publică', county: 'Cluj', city: 'Câmpia Turzii',
    address: 'Str. Stadionului nr. 4', lat: 46.548, lng: 23.88, contractValue: 5_940_000, startDate: '2026-04-06', dueDate: '2026-11-30',
    status: 'executie', managerId: 'p-01', siteManagerId: 'p-05', teamIds: ['t-1', 't-4'], progress: 81, plannedMargin: 0.19, cpf: 1,
    surface: 'Gazon sintetic 60 mm, 7.140 m², iluminat 200 lx', seed: 2,
  },
  {
    id: 'prj-03', code: 'AS-26-031', name: 'Teren minifotbal 40×20 m – Școala Gimnazială nr. 2', type: 'minifotbal',
    client: 'Școala Gimnazială nr. 2 Reghin', clientKind: 'Unitate de învățământ', county: 'Mureș', city: 'Reghin',
    address: 'Str. Mihai Viteazu nr. 18', lat: 46.775, lng: 24.708, contractValue: 486_000, startDate: '2026-08-18', dueDate: '2026-10-31',
    status: 'executie', managerId: 'p-03', siteManagerId: 'p-07', teamIds: ['t-3'], progress: 91, plannedMargin: 0.21, cpf: 0.98,
    surface: 'Gazon sintetic 60 mm, 800 m², împrejmuire 4 m', seed: 3,
  },
  {
    id: 'prj-04', code: 'AS-26-006', name: 'Teren multisport și loc de joacă', type: 'multisport',
    client: 'Primăria Comunei Sâncraiu de Mureș', clientKind: 'Autoritate publică', county: 'Mureș', city: 'Sâncraiu de Mureș',
    address: 'Str. Principală nr. 120', lat: 46.555, lng: 24.52, contractValue: 742_000, startDate: '2026-03-02', dueDate: '2026-06-20',
    status: 'finalizat', managerId: 'p-03', siteManagerId: 'p-07', teamIds: ['t-3'], progress: 100, plannedMargin: 0.2, cpf: 0.97,
    surface: 'Gazon multisport 40 mm, 968 m²', seed: 4,
  },
  {
    id: 'prj-05', code: 'AS-26-027', name: 'Parc de joacă tematic – Parcul Central', type: 'joaca',
    client: 'Primăria Municipiului Mediaș', clientKind: 'Autoritate publică', county: 'Sibiu', city: 'Mediaș',
    address: 'Parcul Central, Str. Gării', lat: 46.164, lng: 24.351, contractValue: 1_180_000, startDate: '2026-07-20', dueDate: '2026-11-15',
    status: 'executie', managerId: 'p-04', siteManagerId: 'p-09', teamIds: ['t-5'], progress: 72, plannedMargin: 0.24, cpf: 1,
    surface: 'Echipamente producție proprie, EPDM 620 m²', seed: 5,
  },
  {
    id: 'prj-06', code: 'AS-26-019', name: 'Pistă de atletism 400 m, 6 culoare', type: 'atletism',
    client: 'Liceul cu Program Sportiv Bacău', clientKind: 'Unitate de învățământ', county: 'Bacău', city: 'Bacău',
    address: 'Str. Pictor Aman nr. 9', lat: 46.567, lng: 26.914, contractValue: 3_720_000, startDate: '2026-05-11', dueDate: '2026-10-30',
    status: 'executie', managerId: 'p-01', siteManagerId: 'p-08', teamIds: ['t-6'], progress: 72, plannedMargin: 0.17, cpf: 1,
    surface: 'Tartan SBR+EPDM 13 mm, 4.850 m²', overdueInvoices: 1, seed: 6,
    notes: 'Turnarea covorului tartan este condiționată de temperaturi peste 10 °C. Fereastra meteo se închide la începutul lui noiembrie.',
  },
  {
    id: 'prj-07', code: 'AS-26-009', name: 'Bază sportivă comunală', type: 'baza',
    client: 'Primăria Comunei Florești', clientKind: 'Autoritate publică', county: 'Cluj', city: 'Florești',
    address: 'Str. Avram Iancu nr. 2', lat: 46.746, lng: 23.488, contractValue: 6_850_000, startDate: '2026-03-16', dueDate: '2027-03-31',
    status: 'executie', managerId: 'p-02', siteManagerId: 'p-05', teamIds: ['t-2', 't-4'], progress: 52, plannedMargin: 0.2, cpf: 0.99,
    surface: 'Teren fotbal 90×60 m, teren multisport, vestiare modulare', seed: 7,
  },
  {
    id: 'prj-08', code: 'AS-26-004', name: 'Două terenuri de tenis cu suprafață sintetică', type: 'tenis',
    client: 'Club Sportiv Tenis Brașov (fictiv)', clientKind: 'Club sportiv', county: 'Brașov', city: 'Brașov',
    address: 'Str. Lungă nr. 210', lat: 45.652, lng: 25.611, contractValue: 690_000, startDate: '2026-04-13', dueDate: '2026-06-30',
    status: 'finalizat', managerId: 'p-04', siteManagerId: 'p-07', teamIds: ['t-3'], progress: 100, plannedMargin: 0.22, cpf: 0.96,
    surface: 'Gazon sintetic cu nisip, 2 × 648 m²', seed: 8,
  },
  {
    id: 'prj-09', code: 'AS-26-024', name: 'Teren multisport acoperit cu structură metalică', type: 'multisport',
    client: 'Liceul Tehnologic Odorheiu Secuiesc', clientKind: 'Unitate de învățământ', county: 'Harghita', city: 'Odorheiu Secuiesc',
    address: 'Str. Rákóczi nr. 5', lat: 46.305, lng: 25.297, contractValue: 2_140_000, startDate: '2026-07-01', dueDate: '2026-12-20',
    status: 'executie', managerId: 'p-03', siteManagerId: 'p-07', teamIds: ['t-3', 't-4'], progress: 39, plannedMargin: 0.16, cpf: 1.12,
    surface: 'Multisport 44×24 m, structură metalică acoperită', overdueInvoices: 1, seed: 9,
    notes: 'Furnizorul structurii metalice a revizuit prețul oțelului (+14%). Negociere în curs.',
  },
  {
    id: 'prj-10', code: 'AS-26-036', name: 'Loc de joacă incluziv – cartier Tudor Vladimirescu', type: 'joaca',
    client: 'Primăria Municipiului Iași', clientKind: 'Autoritate publică', county: 'Iași', city: 'Iași',
    address: 'Bd. Tudor Vladimirescu', lat: 47.155, lng: 27.605, contractValue: 865_000, startDate: '2026-09-01', dueDate: '2026-11-28',
    status: 'executie', managerId: 'p-04', siteManagerId: 'p-09', teamIds: ['t-5'], progress: 52, plannedMargin: 0.23, cpf: 1,
    surface: 'Echipamente incluzive, EPDM 480 m²', seed: 10,
  },
  {
    id: 'prj-11', code: 'AS-26-038', name: 'Două terenuri de padel', type: 'padel',
    client: 'Padel Nord Investiții SRL (fictiv)', clientKind: 'Privat', county: 'Ilfov', city: 'Otopeni',
    address: 'Str. Zborului nr. 31', lat: 44.551, lng: 26.075, contractValue: 612_000, startDate: '2026-09-15', dueDate: '2026-11-20',
    status: 'executie', managerId: 'p-01', siteManagerId: 'p-05', teamIds: ['t-1'], progress: 50, plannedMargin: 0.21, cpf: 1,
    surface: '2 terenuri panoramice 20×10 m', seed: 11,
  },
  {
    id: 'prj-12', code: 'AS-26-003', name: 'Bază sportivă școlară', type: 'baza',
    client: 'Colegiul Național Bănățean (fictiv)', clientKind: 'Unitate de învățământ', county: 'Timiș', city: 'Timișoara',
    address: 'Bd. Liviu Rebreanu nr. 42', lat: 45.753, lng: 21.226, contractValue: 3_280_000, startDate: '2026-02-02', dueDate: '2026-09-30',
    status: 'receptie', managerId: 'p-02', siteManagerId: 'p-06', teamIds: [], progress: 100, plannedMargin: 0.18, cpf: 1.005,
    surface: 'Teren fotbal 60×40, multisport, pistă 200 m', overdueInvoices: 2, seed: 12,
    notes: 'Recepție la terminarea lucrărilor programată; ultimele două situații de lucrări sunt neîncasate.',
  },
  {
    id: 'prj-13', code: 'AS-26-011', name: 'Teren minifotbal cu împrejmuire', type: 'minifotbal',
    client: 'Primăria Comunei Moieciu', clientKind: 'Autoritate publică', county: 'Brașov', city: 'Moieciu de Jos',
    address: 'DN73 nr. 14', lat: 45.484, lng: 25.334, contractValue: 455_000, startDate: '2026-04-20', dueDate: '2026-07-15',
    status: 'finalizat', managerId: 'p-03', siteManagerId: 'p-07', teamIds: ['t-3'], progress: 100, plannedMargin: 0.2, cpf: 1.04,
    surface: 'Gazon sintetic 60 mm, 800 m²', seed: 13,
  },
  {
    id: 'prj-14', code: 'AS-26-013', name: 'Teren de baschet din dale modulare – Parcul Municipal', type: 'baschet',
    client: 'Primăria Municipiului Craiova', clientKind: 'Autoritate publică', county: 'Dolj', city: 'Craiova',
    address: 'Parcul Municipal, Str. Ștefan cel Mare', lat: 44.319, lng: 23.796, contractValue: 298_000, startDate: '2026-05-04', dueDate: '2026-06-26',
    status: 'finalizat', managerId: 'p-04', siteManagerId: 'p-09', teamIds: ['t-5'], progress: 100, plannedMargin: 0.23, cpf: 0.95,
    surface: 'Dale modulare PP, 420 m²', seed: 14,
  },
  {
    id: 'prj-15', code: 'AS-26-029', name: 'Teren de fotbal 60×40 m, gazon sintetic', type: 'minifotbal',
    client: 'Clubul Sportiv Municipal Constanța (fictiv)', clientKind: 'Club sportiv', county: 'Constanța', city: 'Constanța',
    address: 'Str. Soveja nr. 64', lat: 44.181, lng: 28.634, contractValue: 1_240_000, startDate: '2026-08-03', dueDate: '2026-11-10',
    status: 'executie', managerId: 'p-01', siteManagerId: 'p-08', teamIds: ['t-1'], progress: 62, plannedMargin: 0.18, cpf: 1.02,
    surface: 'Gazon sintetic 60 mm, 2.400 m²', seed: 15,
  },
  {
    id: 'prj-16', code: 'AS-26-041', name: 'Complex sportiv – teren de fotbal și tribună 500 locuri', type: 'baza',
    client: 'Primăria Municipiului Suceava', clientKind: 'Autoritate publică', county: 'Suceava', city: 'Suceava',
    address: 'Str. Universității nr. 1A', lat: 47.651, lng: 26.255, contractValue: 8_950_000, startDate: '2026-11-09', dueDate: '2027-08-31',
    status: 'pregatire', managerId: 'p-02', siteManagerId: 'p-06', teamIds: ['t-2'], progress: 0, plannedMargin: 0.17, cpf: 1,
    surface: 'Fotbal 105×68 m, tribună 500 locuri, nocturnă 500 lx', seed: 16,
  },
  {
    id: 'prj-17', code: 'AS-26-022', name: 'Parc fitness și loc de joacă', type: 'joaca',
    client: 'Primăria Comunei Sâncraiu de Mureș', clientKind: 'Autoritate publică', county: 'Mureș', city: 'Dumbrăvioara',
    address: 'Str. Școlii nr. 3', lat: 46.633, lng: 24.633, contractValue: 418_000, startDate: '2026-06-08', dueDate: '2026-08-28',
    status: 'finalizat', managerId: 'p-04', siteManagerId: 'p-09', teamIds: ['t-5'], progress: 100, plannedMargin: 0.25, cpf: 0.98,
    surface: '8 aparate fitness, loc de joacă 240 m²', seed: 17,
  },
  {
    id: 'prj-18', code: 'AS-26-037', name: 'Teren multisport – Școala Gimnazială', type: 'multisport',
    client: 'Școala Gimnazială nr. 5 Satu Mare (fictiv)', clientKind: 'Unitate de învățământ', county: 'Satu Mare', city: 'Satu Mare',
    address: 'Str. Careiului nr. 22', lat: 47.792, lng: 22.885, contractValue: 395_000, startDate: '2026-09-22', dueDate: '2026-11-05',
    status: 'executie', managerId: 'p-03', siteManagerId: 'p-07', teamIds: ['t-4'], progress: 56, plannedMargin: 0.2, cpf: 1,
    surface: 'Gazon multisport 40 mm, 800 m²', seed: 18,
  },
  {
    id: 'prj-19', code: 'AS-26-040', name: 'Teren multisport și pistă de alergare 150 m', type: 'multisport',
    client: 'Primăria Sectorului 3 (fictiv)', clientKind: 'Autoritate publică', county: 'București', city: 'București',
    address: 'Str. Lucrețiu Pătrășcanu', lat: 44.418, lng: 26.161, contractValue: 1_690_000, startDate: '2026-10-05', dueDate: '2027-01-29',
    status: 'executie', managerId: 'p-01', siteManagerId: 'p-06', teamIds: ['t-6'], progress: 9, plannedMargin: 0.19, cpf: 1,
    surface: 'Multisport 30×18 m, pistă tartan 150 m', seed: 19,
  },
];

// ——— Proiectul din scenariul demo, construit manual pentru a arăta sursa costurilor suplimentare ———
const S = 'prj-01';
const scenarioBase = buildProject({
  id: S, code: 'AS-26-017', name: 'Bază sportivă multifuncțională', type: 'baza',
  client: 'Primăria Orașului Ocna Mureș', clientKind: 'Autoritate publică', county: 'Alba', city: 'Ocna Mureș',
  address: 'Str. Sportului nr. 7', lat: 46.39, lng: 23.856, contractValue: 4_860_000, startDate: '2026-06-15', dueDate: '2026-12-15',
  status: 'executie', managerId: 'p-02', siteManagerId: 'p-06', teamIds: ['t-2', 't-1'], progress: 58, plannedMargin: 0.18, cpf: 1,
  surface: 'Fotbal 90×55 m, multisport 40×20 m, pistă 250 m, iluminat', seed: 1,
  notes: 'Pe latura de est a amplasamentului s-a întâlnit un strat argilos cu apă stagnantă, neidentificat în studiul geotehnic. Au fost necesare excavații suplimentare și stabilizare.',
});

const c = (id: string, date: string, category: Commitment['category'], description: string, supplier: string, amount: number): Commitment =>
  ({ id: `${S}-${id}`, date, category, description, supplier, amount });
const k = (id: string, date: string, category: CostEntry['category'], description: string, supplier: string, amount: number, commitment?: string): CostEntry =>
  ({ id: `${S}-${id}`, date, category, description, supplier, amount, commitmentId: commitment ? `${S}-${commitment}` : undefined, source: category === 'manopera' ? 'raport-santier' : 'import' });

const scenarioCommitments: Commitment[] = [
  c('c1', '2026-06-10', 'materiale', 'Comandă agregate și materiale fundație', 'Cariera Nord SRL (fictiv)', 612_000),
  c('c2', '2026-09-29', 'materiale', 'Comandă gazon sintetic 60 mm + marcaje (CF-2026-0412)', 'Turf Distribution SRL (fictiv)', 434_000),
  c('c3', '2026-06-12', 'materiale', 'Elemente împrejmuire și iluminat', 'Lumen Pro SRL (fictiv)', 348_000),
  c('c4', '2026-06-08', 'subcontractori', 'Contract terasamente generale', 'Terra Excav SRL (fictiv)', 412_000),
  c('c5', '2026-08-26', 'subcontractori', 'Act adițional subcontractor: excavație și stabilizare strat argilos', 'Terra Excav SRL (fictiv)', 168_000),
  c('c6', '2026-07-01', 'subcontractori', 'Instalație electrică și nocturnă', 'Electro Lumina Instal SRL (fictiv)', 192_000),
  c('c7', '2026-06-15', 'utilaje', 'Închiriere cilindru compactor și buldoexcavator', 'Rent Utilaje Centru SRL (fictiv)', 96_000),
];

const scenarioCosts: CostEntry[] = [
  k('k1', '2026-06-30', 'materiale', 'Agregate fundație, tranșa 1', 'Cariera Nord SRL (fictiv)', 248_000, 'c1'),
  k('k2', '2026-07-31', 'materiale', 'Agregate fundație, tranșa 2', 'Cariera Nord SRL (fictiv)', 214_000, 'c1'),
  k('k3', '2026-08-31', 'materiale', 'Agregate și geotextil, tranșa 3', 'Cariera Nord SRL (fictiv)', 150_000, 'c1'),
  k('k4', '2026-07-20', 'materiale', 'Stâlpi și proiectoare LED', 'Lumen Pro SRL (fictiv)', 236_000, 'c3'),
  k('k5', '2026-09-18', 'materiale', 'Panouri împrejmuire, livrare parțială', 'Lumen Pro SRL (fictiv)', 112_000, 'c3'),
  k('k6', '2026-09-30', 'materiale', 'Țeavă dren, cămine, tubulatură', 'Hidro Drenaj SRL (fictiv)', 52_000),
  k('k7', '2026-06-30', 'manopera', 'Manoperă echipe proprii, iunie', 'Pontaj intern', 41_000),
  k('k8', '2026-07-31', 'manopera', 'Manoperă echipe proprii, iulie', 'Pontaj intern', 96_000),
  k('k9', '2026-08-31', 'manopera', 'Manoperă echipe proprii, august', 'Pontaj intern', 104_000),
  k('k10', '2026-09-30', 'manopera', 'Manoperă echipe proprii, septembrie', 'Pontaj intern', 92_000),
  k('k11', '2026-10-19', 'manopera', 'Manoperă echipe proprii, 1–19 octombrie', 'Pontaj intern', 39_000),
  k('k12', '2026-07-15', 'utilaje', 'Excavator propriu, terasamente generale', 'Parc utilaje propriu', 118_000),
  k('k13', '2026-08-28', 'utilaje', 'Excavator propriu, excavație suplimentară zona est (12 zile)', 'Parc utilaje propriu', 88_000),
  k('k14', '2026-09-30', 'utilaje', 'Închiriere compactor, iunie–septembrie', 'Rent Utilaje Centru SRL (fictiv)', 72_000, 'c7'),
  k('k15', '2026-10-15', 'utilaje', 'Autobasculantă, evacuare pământ excedentar', 'Parc utilaje propriu', 40_000),
  k('k16', '2026-07-31', 'transport', 'Transport agregate iulie', 'Trans Cargo Mureș SRL (fictiv)', 46_000),
  k('k17', '2026-08-31', 'transport', 'Transport pământ excedentar la depozit autorizat', 'Trans Cargo Mureș SRL (fictiv)', 38_000),
  k('k18', '2026-09-30', 'transport', 'Transport materiale și deplasări echipe', 'Logistică proprie', 28_000),
  k('k19', '2026-07-10', 'subcontractori', 'Terasamente generale, situația 1', 'Terra Excav SRL (fictiv)', 214_000, 'c4'),
  k('k20', '2026-08-12', 'subcontractori', 'Terasamente generale, situația 2', 'Terra Excav SRL (fictiv)', 154_000, 'c4'),
  k('k21', '2026-09-25', 'subcontractori', 'Excavație și stabilizare strat argilos', 'Terra Excav SRL (fictiv)', 118_000, 'c5'),
  k('k22', '2026-06-20', 'alte', 'Organizare de șantier, utilități', 'Diverși furnizori', 46_000),
  k('k23', '2026-07-05', 'alte', 'Expertiză geotehnică suplimentară', 'Geo Consult Alba SRL (fictiv)', 18_000),
  k('k24', '2026-08-01', 'alte', 'Asigurări și garanții', 'Diverși furnizori', 20_000),
];

const scenarioPhotos: SitePhoto[] = [
  { id: `${S}-ph9`, date: '2026-10-20', stage: 'apa', seed: 91, caption: 'Zona est: apă stagnantă după precipitații, strat argilos expus' },
  { id: `${S}-ph8`, date: '2026-10-20', stage: 'drenaj', seed: 92, caption: 'Tranșee drenaj existent, capacitate insuficientă pe latura de est' },
  { id: `${S}-ph7`, date: '2026-10-17', stage: 'fundatie', seed: 93, caption: 'Strat de fundație compactat, teren fotbal zona vest' },
  { id: `${S}-ph6`, date: '2026-10-09', stage: 'imprejmuire', seed: 94, caption: 'Montaj stâlpi împrejmuire și iluminat' },
  { id: `${S}-ph5`, date: '2026-08-27', stage: 'excavatie', seed: 95, caption: 'Excavație suplimentară zona est, strat argilos' },
  { id: `${S}-ph4`, date: '2026-07-14', stage: 'decopertare', seed: 96, caption: 'Decopertare și terasamente generale' },
];

const scenario: Project = {
  ...scenarioBase,
  budget: { materiale: 1_820_000, manopera: 610_000, utilaje: 420_000, transport: 185_000, subcontractori: 790_000, alte: 160_000 },
  etc: { materiale: 395_000, manopera: 268_000, utilaje: 138_000, transport: 78_000, subcontractori: 92_000, alte: 76_000 },
  commitments: scenarioCommitments,
  costs: scenarioCosts,
  stages: [
    { id: 's1', name: 'Organizare de șantier', weight: 4, progress: 100, plannedEnd: '2026-06-25', confirmedAt: '2026-06-24' },
    { id: 's2', name: 'Terasamente generale', weight: 12, progress: 100, plannedEnd: '2026-07-31', confirmedAt: '2026-08-29' },
    { id: 's3', name: 'Drenaj și rețele', weight: 14, progress: 82, plannedEnd: '2026-08-31' },
    { id: 's4', name: 'Fundații și structuri', weight: 16, progress: 85, plannedEnd: '2026-09-25' },
    { id: 's5', name: 'Suprafețe sportive', weight: 24, progress: 20, plannedEnd: '2026-11-10' },
    { id: 's6', name: 'Împrejmuiri, iluminat, tribune', weight: 18, progress: 70, plannedEnd: '2026-11-25' },
    { id: 's7', name: 'Dotări și finisaje', weight: 8, progress: 10, plannedEnd: '2026-12-08' },
    { id: 's8', name: 'Recepție la terminarea lucrărilor', weight: 4, progress: 0, plannedEnd: '2026-12-15' },
  ],
  photos: scenarioPhotos,
};

export const PROJECTS: Project[] = [scenario, ...SPECS.map(buildProject)];
export const SCENARIO_PROJECT_ID = S;
