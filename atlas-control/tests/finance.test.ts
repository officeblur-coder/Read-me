import { describe, expect, it } from 'vitest';
import { computeFinancials, assessRisk, computeSchedule, DEFAULT_THRESHOLDS } from '../src/domain/finance';
import { computeRows, computeAlerts } from '../src/domain/portfolio';
import { ask } from '../src/domain/intelligence';
import { createSeed } from '../src/data/demo/seed';
import type { Project } from '../src/domain/types';

const base = (): Project => ({
  id: 'p', code: 'T', name: 'Test', type: 'minifotbal', client: 'C', clientKind: 'Privat', county: 'Mureș', city: 'X', address: '',
  lat: 46, lng: 24, contractValue: 1_000_000, startDate: '2026-01-01', dueDate: '2026-12-31', status: 'executie',
  managerId: 'm', siteManagerId: 's', teamIds: [], stages: [{ id: 's1', name: 'A', weight: 100, progress: 50, plannedEnd: '2026-12-31' }],
  budget: { materiale: 500_000, manopera: 200_000, utilaje: 0, transport: 0, subcontractori: 100_000, alte: 0 },
  etc: { materiale: 100_000, manopera: 100_000, utilaje: 0, transport: 0, subcontractori: 0, alte: 0 },
  costs: [], commitments: [], invoices: [], changeOrders: [], documents: [], photos: [], notes: '', surface: '',
});

describe('computeFinancials', () => {
  it('EAC = efective + angajate deschise + rămase, fără dublă numărare a facturilor pe angajament', () => {
    const p = base();
    p.commitments = [{ id: 'c1', date: '2026-02-01', category: 'materiale', description: '', supplier: '', amount: 300_000 }];
    p.costs = [
      { id: 'k1', date: '2026-03-01', category: 'materiale', description: '', supplier: '', amount: 120_000, commitmentId: 'c1' },
      { id: 'k2', date: '2026-03-01', category: 'manopera', description: '', supplier: '', amount: 80_000 },
    ];
    const f = computeFinancials(p, '2026-07-01');
    expect(f.actual).toBe(200_000);
    expect(f.committedOpen).toBe(180_000); // 300k − 120k deja facturat
    expect(f.etc).toBe(200_000);
    expect(f.eac).toBe(580_000);
    expect(f.profit).toBe(420_000);
    expect(f.margin).toBeCloseTo(42);
  });

  it('factura peste angajament nu produce angajament negativ', () => {
    const p = base();
    p.commitments = [{ id: 'c1', date: '2026-02-01', category: 'materiale', description: '', supplier: '', amount: 100_000 }];
    p.costs = [{ id: 'k1', date: '2026-03-01', category: 'materiale', description: '', supplier: '', amount: 130_000, commitmentId: 'c1' }];
    expect(computeFinancials(p, '2026-07-01').committedOpen).toBe(0);
  });

  it('actele adiționale intră în venit și buget doar după aprobare', () => {
    const p = base();
    p.changeOrders = [{ id: 'co', title: '', amount: 200_000, costBudget: 150_000, status: 'propus', date: '2026-05-01' }];
    expect(computeFinancials(p, '2026-07-01').revenue).toBe(1_000_000);
    p.changeOrders[0].status = 'aprobat';
    const f = computeFinancials(p, '2026-07-01');
    expect(f.revenue).toBe(1_200_000);
    expect(f.budget).toBe(950_000);
  });

  it('clasifică riscul după praguri', () => {
    const p = base();
    p.etc.materiale = 800_000; // EAC 900k, peste bugetul de 800k cu 12,5%
    const f = computeFinancials(p, '2026-07-01');
    const s = computeSchedule(p, '2026-07-01', DEFAULT_THRESHOLDS);
    const r = assessRisk(f, s, DEFAULT_THRESHOLDS);
    expect(r.level).toBe('risk');
    expect(r.reasons.join(' ')).toMatch(/Depășire buget/);
  });
});

describe('date demonstrative', () => {
  const seed = createSeed();
  const rows = computeRows(seed.projects, '2026-10-21', DEFAULT_THRESHOLDS);

  it('conține 15–20 de proiecte', () => {
    expect(seed.projects.length).toBeGreaterThanOrEqual(15);
    expect(seed.projects.length).toBeLessThanOrEqual(20);
  });

  it('proiectul din scenariu este galben înainte de aprobare', () => {
    const r = rows.find((x) => x.project.id === 'prj-01')!;
    expect(r.risk.level).toBe('warn');
    expect(r.fin.eac).toBeGreaterThan(r.fin.budget);
  });

  it('alertele includ proiectul din scenariu și solicitarea REQ-01', () => {
    const alerts = computeAlerts({ rows, requests: seed.requests, materials: seed.materials, projectMaterials: seed.projectMaterials, reports: seed.reports, allocations: seed.allocations, equipment: seed.equipment, teams: seed.teams, today: '2026-10-21' });
    expect(alerts.some((a) => a.id === 'fin-prj-01')).toBe(true);
    expect(alerts.some((a) => a.id === 'req-req-01')).toBe(true);
  });

  it('Atlas Intelligence răspunde din date și refuză întrebările fără date', () => {
    const kb = { rows, requests: seed.requests, materials: seed.materials, projectMaterials: seed.projectMaterials, allocations: seed.allocations, teams: seed.teams, equipment: seed.equipment, people: seed.people, reports: seed.reports, today: '2026-10-21' };
    expect(ask(kb, 'Ce șantiere au depășit bugetul?').items.some((i) => i.text.includes('Ocna Mureș'))).toBe(true);
    expect(ask(kb, 'Ce echipe devin disponibile săptămâna viitoare?').intent).toBe('echipe');
    expect(ask(kb, 'Care e prețul petrolului?').intent).toBe('necunoscut');
  });
});
