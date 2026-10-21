// Single client-side store for the demo. Every mutation goes through an action here, so the
// same actions can later be backed by API calls without touching the pages.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Allocation, ChangeOrder, CostCategory, CostEntry, Commitment, MaterialRequest, Project, ProjectDocument,
  RoleId, SitePhoto, SiteReport, Thresholds, ProductionOrder,
} from '../domain/types';
import { DEFAULT_THRESHOLDS } from '../domain/finance';
import { requestValue } from '../domain/portfolio';
import { createSeed, type DemoData } from '../data/demo/seed';
import { DEMO_TODAY } from '../data/demo/constants';
import { addDays } from '../domain/dates';

export interface ActivityItem {
  id: string;
  date: string;
  actor: string;
  text: string;
  projectId?: string;
  tone?: 'neutral' | 'positive' | 'negative';
}

interface State extends DemoData {
  today: string;
  role: RoleId;
  thresholds: Thresholds;
  activity: ActivityItem[];
  tour: { open: boolean; step: number };
  /** Instantanee pentru a arăta „înainte / după” în scenariul demo. */
  snapshots: Record<string, number>;
}

interface Actions {
  setRole(role: RoleId): void;
  setThresholds(t: Partial<Thresholds>): void;
  resetDemo(): void;
  setTour(t: Partial<State['tour']>): void;
  setSnapshot(key: string, value: number): void;

  addProject(p: Project, materials: DemoData['projectMaterials']): void;
  updateProject(id: string, patch: Partial<Pick<Project, 'status' | 'notes' | 'contractValue' | 'dueDate'>>): void;
  setEtc(projectId: string, category: CostCategory, value: number): void;
  setBudget(projectId: string, category: CostCategory, value: number): void;
  addCost(projectId: string, entry: Omit<CostEntry, 'id'>): void;
  removeCost(projectId: string, costId: string): void;
  addCommitment(projectId: string, c: Omit<Commitment, 'id'>): void;
  addChangeOrder(projectId: string, c: Omit<ChangeOrder, 'id'>): void;
  setChangeOrderStatus(projectId: string, id: string, status: ChangeOrder['status']): void;
  registerPayment(projectId: string, invoiceId: string): void;
  addDocument(projectId: string, d: Omit<ProjectDocument, 'id'>): void;
  setStageProgress(projectId: string, stageId: string, progress: number): void;
  confirmStage(projectId: string, stageId: string, by: string): void;

  approveRequest(id: string, by: string): void;
  rejectRequest(id: string, by: string): void;
  createRequest(r: Omit<MaterialRequest, 'id' | 'status'>): void;
  submitReport(r: Omit<SiteReport, 'id' | 'photoIds' | 'laborCost'>, photos: Omit<SitePhoto, 'id'>[], hourlyRate: number): void;

  addAllocation(a: Omit<Allocation, 'id'>): void;
  removeAllocation(id: string): void;

  reserveStock(projectId: string, materialId: string, qty: number): void;
  transferToSite(projectId: string, materialId: string, qty: number): void;
  receivePurchaseOrder(id: string): void;
  advanceProduction(id: string): void;
  addProductionOrder(o: Omit<ProductionOrder, 'id' | 'number' | 'progress' | 'status'>): void;
}

// localStorage can be unavailable (private mode, blocked storage, sandboxed preview).
const memory = new Map<string, string>();
const safeStorage = {
  getItem: (k: string) => { try { return localStorage.getItem(k); } catch { return memory.get(k) ?? null; } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { memory.set(k, v); } },
  removeItem: (k: string) => { try { localStorage.removeItem(k); } catch { memory.delete(k); } },
};

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

const initial = (): State => ({
  ...createSeed(),
  today: DEMO_TODAY,
  role: 'ceo',
  thresholds: DEFAULT_THRESHOLDS,
  activity: [
    { id: 'a1', date: '2026-10-20', actor: 'Sorin Bucur', text: 'a trimis raportul zilnic și a semnalat o problemă critică la Ocna Mureș', projectId: 'prj-01', tone: 'negative' },
    { id: 'a2', date: '2026-10-20', actor: 'Sorin Bucur', text: 'a solicitat materiale pentru drenaj suplimentar (Ocna Mureș)', projectId: 'prj-01' },
    { id: 'a3', date: '2026-10-20', actor: 'Daniel Marin', text: 'a solicitat urgent granule EPDM pentru pista din Bacău', projectId: 'prj-06' },
    { id: 'a4', date: '2026-10-19', actor: 'Levente Kiss', text: 'a confirmat finalizarea etapei „Montaj suprafață sportivă” la Reghin', projectId: 'prj-03', tone: 'positive' },
    { id: 'a5', date: '2026-10-16', actor: 'Adriana Pop', text: 'a trecut OP-2026-118 („Cetate”) în control de calitate' },
  ],
  tour: { open: false, step: 0 },
  snapshots: {},
});

const today = () => useStore.getState().today;

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => {
      const mapProject = (id: string, fn: (p: Project) => Project) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? fn(p) : p)) }));
      const log = (text: string, projectId?: string, tone?: ActivityItem['tone'], actor?: string) =>
        set((s) => ({
          activity: [{ id: uid('a'), date: s.today, actor: actor ?? actorName(s), text, projectId, tone }, ...s.activity].slice(0, 60),
        }));
      const actorName = (s: State) => s.people.find((p) => p.id === roleUser(s.role))?.name ?? 'Utilizator';

      return {
        ...initial(),

        setRole: (role) => set({ role }),
        setThresholds: (t) => set((s) => ({ thresholds: { ...s.thresholds, ...t } })),
        resetDemo: () => set({ ...initial(), role: get().role }),
        setTour: (t) => set((s) => ({ tour: { ...s.tour, ...t } })),
        setSnapshot: (key, value) => set((s) => ({ snapshots: { ...s.snapshots, [key]: value } })),

        addProject: (p, materials) => {
          set((s) => ({ projects: [p, ...s.projects], projectMaterials: [...s.projectMaterials, ...materials] }));
          log(`a creat proiectul ${p.code}: ${p.name}, ${p.city}`, p.id, 'positive');
        },
        updateProject: (id, patch) => {
          mapProject(id, (p) => ({ ...p, ...patch }));
          if (patch.status) log(`a schimbat statusul proiectului în „${patch.status}”`, id);
        },
        setEtc: (projectId, category, value) => {
          mapProject(projectId, (p) => ({ ...p, etc: { ...p.etc, [category]: Math.max(0, value) } }));
          log(`a actualizat costul estimat rămas (${category})`, projectId);
        },
        setBudget: (projectId, category, value) =>
          mapProject(projectId, (p) => ({ ...p, budget: { ...p.budget, [category]: Math.max(0, value) } })),
        addCost: (projectId, entry) => {
          mapProject(projectId, (p) => ({ ...p, costs: [...p.costs, { ...entry, id: uid('k') }] }));
          log(`a înregistrat un cost efectiv: ${entry.description}`, projectId);
        },
        removeCost: (projectId, costId) =>
          mapProject(projectId, (p) => ({ ...p, costs: p.costs.filter((c) => c.id !== costId) })),
        addCommitment: (projectId, c) => {
          mapProject(projectId, (p) => ({ ...p, commitments: [...p.commitments, { ...c, id: uid('c') }] }));
          log(`a înregistrat un angajament: ${c.description}`, projectId);
        },
        addChangeOrder: (projectId, c) => {
          mapProject(projectId, (p) => ({ ...p, changeOrders: [...p.changeOrders, { ...c, id: uid('co') }] }));
          log(`a inițiat act adițional: ${c.title}`, projectId);
        },
        setChangeOrderStatus: (projectId, id, status) => {
          mapProject(projectId, (p) => ({ ...p, changeOrders: p.changeOrders.map((c) => (c.id === id ? { ...c, status } : c)) }));
          log(`a marcat actul adițional ca ${status}`, projectId, status === 'aprobat' ? 'positive' : undefined);
        },
        registerPayment: (projectId, invoiceId) => {
          mapProject(projectId, (p) => ({ ...p, invoices: p.invoices.map((i) => (i.id === invoiceId ? { ...i, paid: i.amount } : i)) }));
          log('a înregistrat încasarea unei facturi', projectId, 'positive');
        },
        addDocument: (projectId, d) => {
          mapProject(projectId, (p) => ({ ...p, documents: [{ ...d, id: uid('d') }, ...p.documents] }));
          log(`a adăugat documentul „${d.name}”`, projectId);
        },
        setStageProgress: (projectId, stageId, progress) =>
          mapProject(projectId, (p) => ({ ...p, stages: p.stages.map((s) => (s.id === stageId ? { ...s, progress } : s)) })),
        confirmStage: (projectId, stageId, by) => {
          const p = get().projects.find((x) => x.id === projectId);
          const st = p?.stages.find((s) => s.id === stageId);
          mapProject(projectId, (q) => ({
            ...q, stages: q.stages.map((s) => (s.id === stageId ? { ...s, progress: 100, confirmedAt: today() } : s)),
          }));
          log(`a confirmat finalizarea etapei „${st?.name}”`, projectId, 'positive', personName(get(), by));
        },

        approveRequest: (id, by) => {
          const s = get();
          const req = s.requests.find((r) => r.id === id);
          if (!req || req.status !== 'in_asteptare') return;
          const value = Math.round(requestValue(req, s.materials));
          const covered = Math.min(value, req.coveredByEstimate);
          mapProject(req.projectId, (p) => ({
            ...p,
            // Partea deja estimată iese din ETC: devine angajament, nu cost suplimentar.
            etc: { ...p.etc, [req.category]: Math.max(0, p.etc[req.category] - covered) },
            commitments: [...p.commitments, {
              id: uid('c'), date: s.today, category: req.category, supplier: req.supplier, amount: value, sourceRef: req.id,
              description: `Solicitare aprobată ${req.id.toUpperCase()}: ${req.items.length} poziții materiale`,
            }],
          }));
          set((st) => ({
            requests: st.requests.map((r) => (r.id === id ? { ...r, status: 'aprobata', decidedBy: by, decidedAt: st.today } : r)),
            projectMaterials: mergeNeeds(st.projectMaterials, req),
            purchaseOrders: [{
              id: uid('po'), number: `CF-2026-${String(430 + st.purchaseOrders.length).padStart(4, '0')}`, supplier: req.supplier,
              date: st.today, expected: addDays(st.today, req.urgency === 'normala' ? 10 : 4), projectId: req.projectId, items: req.items, status: 'emisa',
            }, ...st.purchaseOrders],
          }));
          log(`a aprobat solicitarea de materiale ${req.id.toUpperCase()} (${value.toLocaleString('ro-RO')} lei)`, req.projectId, 'positive', personName(s, by));
        },
        rejectRequest: (id, by) => {
          const req = get().requests.find((r) => r.id === id);
          set((s) => ({ requests: s.requests.map((r) => (r.id === id ? { ...r, status: 'respinsa', decidedBy: by, decidedAt: s.today } : r)) }));
          log(`a respins solicitarea ${id.toUpperCase()}`, req?.projectId, 'negative', personName(get(), by));
        },
        createRequest: (r) => {
          set((s) => ({ requests: [{ ...r, id: `req-${String(s.requests.length + 1).padStart(2, '0')}`, status: 'in_asteptare' }, ...s.requests] }));
          log('a trimis o solicitare de materiale', r.projectId, undefined, personName(get(), r.requestedBy));
        },
        submitReport: (r, photos, hourlyRate) => {
          const s = get();
          const newPhotos: SitePhoto[] = photos.map((ph) => ({ ...ph, id: uid('ph') }));
          const laborCost = Math.round(r.hours * hourlyRate);
          const reportId = uid('rep');
          mapProject(r.projectId, (p) => ({
            ...p,
            stages: p.stages.map((st) => {
              const u = r.stageUpdates.find((x) => x.stageId === st.id);
              return u ? { ...st, progress: Math.max(st.progress, u.progress) } : st;
            }),
            photos: [...newPhotos, ...p.photos],
            // Manopera raportată devine cost efectiv și consumă din estimarea rămasă (fără dublare).
            costs: laborCost > 0 ? [...p.costs, {
              id: uid('k'), date: r.date, category: 'manopera', description: `Manoperă raport zilnic ${r.date} (${r.hours} ore)`,
              supplier: 'Pontaj intern', amount: laborCost, source: 'raport-santier', sourceRef: reportId,
            }] : p.costs,
            etc: { ...p.etc, manopera: Math.max(0, p.etc.manopera - laborCost) },
          }));
          set((st) => ({
            reports: [{ ...r, id: reportId, photoIds: newPhotos.map((x) => x.id), laborCost }, ...st.reports],
            projectMaterials: st.projectMaterials.map((pm) => {
              const used = r.materials.find((m) => m.materialId === pm.materialId);
              return pm.projectId === r.projectId && used ? { ...pm, consumed: pm.consumed + used.qty } : pm;
            }),
          }));
          const critical = r.issues.some((i) => i.severity === 'critica');
          log(`a trimis raportul zilnic${critical ? ' cu o problemă critică' : ''}`, r.projectId, critical ? 'negative' : undefined, personName(s, r.authorId));
        },

        addAllocation: (a) => {
          set((s) => ({ allocations: [...s.allocations, { ...a, id: uid('al') }] }));
          log('a planificat o resursă', a.projectId);
        },
        removeAllocation: (id) => set((s) => ({ allocations: s.allocations.filter((a) => a.id !== id) })),

        reserveStock: (projectId, materialId, qty) => {
          set((s) => ({
            projectMaterials: s.projectMaterials.map((pm) =>
              pm.projectId === projectId && pm.materialId === materialId ? { ...pm, reserved: pm.reserved + qty } : pm),
          }));
          log('a rezervat stoc pentru proiect', projectId);
        },
        transferToSite: (projectId, materialId, qty) => {
          const s = get();
          const mat = s.materials.find((m) => m.id === materialId);
          if (!mat) return;
          const amount = Math.round(qty * mat.unitCost);
          set((st) => ({
            materials: st.materials.map((m) => (m.id === materialId ? { ...m, stock: Math.max(0, m.stock - qty) } : m)),
            projectMaterials: st.projectMaterials.map((pm) =>
              pm.projectId === projectId && pm.materialId === materialId
                ? { ...pm, transferred: pm.transferred + qty, reserved: Math.max(0, pm.reserved - qty) } : pm),
            transfers: [{
              id: uid('tr'), number: `TR-2026-${String(240 + st.transfers.length).padStart(4, '0')}`, date: st.today, projectId,
              items: [{ materialId, qty }], status: 'pregatit',
            }, ...st.transfers],
          }));
          // Materialul din stoc devine cost efectiv al proiectului și reduce estimarea rămasă.
          mapProject(projectId, (p) => ({
            ...p,
            costs: [...p.costs, {
              id: uid('k'), date: s.today, category: 'materiale', description: `Transfer din depozit: ${mat.name} (${qty} ${mat.unit})`,
              supplier: 'Depozit central Târgu Mureș', amount, source: 'consum-stoc',
            }],
            etc: { ...p.etc, materiale: Math.max(0, p.etc.materiale - amount) },
          }));
          log(`a transferat pe șantier ${qty} ${mat.unit} ${mat.name}`, projectId);
        },
        receivePurchaseOrder: (id) => {
          const po = get().purchaseOrders.find((p) => p.id === id);
          if (!po || po.status === 'receptionata') return;
          set((s) => ({
            purchaseOrders: s.purchaseOrders.map((p) => (p.id === id ? { ...p, status: 'receptionata' } : p)),
            materials: po.projectId ? s.materials : s.materials.map((m) => {
              const it = po.items.find((x) => x.materialId === m.id);
              return it ? { ...m, stock: m.stock + it.qty } : m;
            }),
            projectMaterials: po.projectId ? s.projectMaterials.map((pm) => {
              const it = po.items.find((x) => x.materialId === pm.materialId);
              return pm.projectId === po.projectId && it ? { ...pm, transferred: pm.transferred + it.qty, reserved: Math.max(0, pm.reserved - it.qty) } : pm;
            }) : s.projectMaterials,
          }));
          log(`a recepționat comanda ${po.number}${po.projectId ? ' (livrare directă pe șantier)' : ' în depozit'}`, po.projectId);
        },
        advanceProduction: (id) => {
          const order = ['planificat', 'in_lucru', 'control_calitate', 'finalizat', 'livrat'] as const;
          const op = get().productionOrders.find((o) => o.id === id);
          if (!op) return;
          const next = order[Math.min(order.length - 1, order.indexOf(op.status) + 1)];
          set((s) => ({
            productionOrders: s.productionOrders.map((o) =>
              o.id === id ? { ...o, status: next, progress: next === 'in_lucru' ? Math.max(o.progress, 10) : next === 'control_calitate' ? 90 : next === 'finalizat' || next === 'livrat' ? 100 : o.progress } : o),
          }));
          log(`a avansat ${op.number} la „${next.replace('_', ' ')}”`, op.projectId);
        },
        addProductionOrder: (o) => {
          set((s) => ({
            productionOrders: [{ ...o, id: uid('op'), number: `OP-2026-${130 + s.productionOrders.length}`, status: 'planificat', progress: 0 }, ...s.productionOrders],
          }));
          log(`a lansat un ordin de producție: ${o.product}`, o.projectId);
        },
      };
    },
    {
      name: 'atlas-control-demo',
      version: 4,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ ...s, tour: { open: s.tour.open, step: s.tour.step } }),
      migrate: () => initial() as never,
    },
  ),
);

function roleUser(role: RoleId) {
  return { admin: 'u-admin', ceo: 'u-ceo', cfo: 'u-cfo', pm: 'p-02', site: 'p-06', production: 'p-13' }[role];
}

function personName(s: State, id: string) {
  return s.people.find((p) => p.id === id)?.name ?? 'Utilizator';
}

function mergeNeeds(pms: DemoData['projectMaterials'], req: MaterialRequest) {
  const out = [...pms];
  for (const it of req.items) {
    const idx = out.findIndex((pm) => pm.projectId === req.projectId && pm.materialId === it.materialId);
    if (idx >= 0) out[idx] = { ...out[idx], planned: out[idx].planned + it.qty };
    else out.push({ projectId: req.projectId, materialId: it.materialId, planned: it.qty, reserved: 0, transferred: 0, consumed: 0 });
  }
  return out;
}

export const currentUserId = (role: RoleId) => roleUser(role);
