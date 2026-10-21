// Domain model for ATLAS CONTROL. Pure types: no demo data, no UI.
// All monetary values are in RON, without VAT (fără TVA).

export type ISODate = string; // YYYY-MM-DD

export type ProjectType =
  | 'fotbal'
  | 'minifotbal'
  | 'multisport'
  | 'baza'
  | 'joaca'
  | 'tenis'
  | 'atletism'
  | 'padel'
  | 'baschet';

export type ProjectStatus = 'pregatire' | 'executie' | 'receptie' | 'finalizat' | 'suspendat';

export type CostCategory =
  | 'materiale'
  | 'manopera'
  | 'utilaje'
  | 'transport'
  | 'subcontractori'
  | 'alte';

export type RiskLevel = 'ok' | 'warn' | 'risk';

export type RoleId =
  | 'admin'
  | 'ceo'
  | 'cfo'
  | 'pm'
  | 'site'
  | 'production';

export interface Person {
  id: string;
  name: string;
  position: string;
  role?: RoleId; // platform role, for people who log in
  teamId?: string;
  hourlyCost: number; // cost firmă / oră, RON
  phone: string;
}

export interface Team {
  id: string;
  name: string;
  specialty: string;
  leadId: string;
  memberIds: string[];
  dailyCost: number; // cost complet / zi lucrătoare, RON
}

export interface Equipment {
  id: string;
  name: string;
  kind: 'utilaj' | 'vehicul';
  plate?: string;
  dailyCost: number;
  status: 'operational' | 'service';
  serviceUntil?: ISODate;
}

export interface Allocation {
  id: string;
  resourceType: 'team' | 'equipment';
  resourceId: string;
  projectId: string;
  start: ISODate;
  end: ISODate;
  note?: string;
}

export interface Stage {
  id: string;
  name: string;
  weight: number; // pondere în progresul fizic, suma = 100
  progress: number; // 0-100
  plannedEnd: ISODate;
  confirmedAt?: ISODate;
}

/** Cost efectiv: document primit (factură furnizor, pontaj, bon). */
export interface CostEntry {
  id: string;
  date: ISODate;
  category: CostCategory;
  description: string;
  supplier: string;
  amount: number;
  commitmentId?: string; // dacă provine dintr-un angajament (comandă/contract)
  source?: 'manual' | 'raport-santier' | 'consum-stoc' | 'import';
  sourceRef?: string;
}

/** Angajament: comandă sau contract semnat; costul devine efectiv pe măsură ce se facturează. */
export interface Commitment {
  id: string;
  date: ISODate;
  category: CostCategory;
  description: string;
  supplier: string;
  amount: number;
  sourceRef?: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: ISODate;
  dueDate: ISODate;
  amount: number; // fără TVA
  paid: number;
}

export interface ChangeOrder {
  id: string;
  title: string;
  amount: number; // venit suplimentar, fără TVA
  costBudget: number; // buget de cost suplimentar aferent
  status: 'propus' | 'aprobat' | 'respins';
  date: ISODate;
}

export interface ProjectDocument {
  id: string;
  name: string;
  kind: 'Contract' | 'Act adițional' | 'Proiect tehnic' | 'Deviz' | 'Autorizație' | 'Proces-verbal' | 'Fișă tehnică' | 'Altele';
  date: ISODate;
  sizeKb: number;
}

export type PhotoStage = 'decopertare' | 'excavatie' | 'drenaj' | 'fundatie' | 'imprejmuire' | 'suprafata' | 'finalizat' | 'joaca' | 'apa';

export interface SitePhoto {
  id: string;
  date: ISODate;
  stage: PhotoStage;
  caption: string;
  seed: number;
  dataUrl?: string; // fotografie reală încărcată în sesiune (Atlas Field)
}

export interface Project {
  id: string;
  code: string;
  name: string;
  type: ProjectType;
  client: string;
  clientKind: 'Autoritate publică' | 'Unitate de învățământ' | 'Club sportiv' | 'Privat';
  county: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  contractValue: number; // fără TVA
  startDate: ISODate;
  dueDate: ISODate;
  status: ProjectStatus;
  managerId: string;
  siteManagerId: string;
  teamIds: string[];
  stages: Stage[];
  budget: Record<CostCategory, number>;
  /** Cost estimat rămas până la finalizare, peste efective + angajamente deschise. */
  etc: Record<CostCategory, number>;
  costs: CostEntry[];
  commitments: Commitment[];
  invoices: Invoice[];
  changeOrders: ChangeOrder[];
  documents: ProjectDocument[];
  photos: SitePhoto[];
  notes: string;
  surface: string; // ex. „Gazon sintetic 60 mm, 40×20 m”
}

export interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: 'Gazon și suprafețe' | 'Agregate și drenaj' | 'Împrejmuiri' | 'Echipamente sportive' | 'Locuri de joacă' | 'Consumabile';
  unitCost: number;
  stock: number; // depozit central Târgu Mureș
  minStock: number;
  supplier: string;
  ownProduction: boolean;
}

/** Necesar și mișcări de material pe proiect. */
export interface ProjectMaterial {
  projectId: string;
  materialId: string;
  planned: number;
  reserved: number; // rezervat în depozit, netransferat
  transferred: number; // ajuns pe șantier
  consumed: number; // pus în operă (raportat din șantier)
}

export interface MaterialRequest {
  id: string;
  projectId: string;
  requestedBy: string;
  date: ISODate;
  urgency: 'normala' | 'ridicata' | 'critica';
  reason: string;
  items: { materialId: string; qty: number }[];
  category: CostCategory;
  supplier: string;
  /** Partea din valoare deja inclusă în costul estimat rămas (ETC) al proiectului. */
  coveredByEstimate: number;
  status: 'in_asteptare' | 'aprobata' | 'respinsa';
  decidedBy?: string;
  decidedAt?: ISODate;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplier: string;
  date: ISODate;
  expected: ISODate;
  projectId?: string;
  items: { materialId: string; qty: number }[];
  status: 'emisa' | 'confirmata' | 'receptionata';
}

export interface StockTransfer {
  id: string;
  number: string;
  date: ISODate;
  projectId: string;
  items: { materialId: string; qty: number }[];
  status: 'pregatit' | 'in_tranzit' | 'livrat';
}

export interface ProductionOrder {
  id: string;
  number: string;
  product: string;
  family: 'Echipamente sportive' | 'Locuri de joacă' | 'Structuri metalice';
  qty: number;
  projectId?: string;
  status: 'planificat' | 'in_lucru' | 'control_calitate' | 'finalizat' | 'livrat';
  start: ISODate;
  due: ISODate;
  unitCost: { materiale: number; manopera: number; regie: number };
  progress: number;
}

export interface Issue {
  severity: 'minora' | 'majora' | 'critica';
  text: string;
}

export interface SiteReport {
  id: string;
  projectId: string;
  date: ISODate;
  authorId: string;
  weather: string;
  workers: number;
  hours: number;
  activities: string;
  stageUpdates: { stageId: string; progress: number }[];
  materials: { materialId: string; qty: number }[];
  issues: Issue[];
  photoIds: string[];
  laborCost: number;
}

export interface Thresholds {
  marginWarnPct: number; // sub această marjă: galben
  marginRiskPct: number; // sub această marjă: roșu
  overrunWarnPct: number; // depășire buget (EAC vs buget) peste: galben
  overrunRiskPct: number; // peste: roșu
  scheduleGapPct: number; // întârziere: progres fizic sub progresul planificat cu mai mult de X puncte
}
