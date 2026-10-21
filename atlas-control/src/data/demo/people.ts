// DATE DEMONSTRATIVE FICTIVE. Persoanele, echipele și utilajele nu corespund realității Atlas Sport.
import type { Equipment, Person, Team } from '../../domain/types';

export const PEOPLE: Person[] = [
  { id: 'u-admin', name: 'Administrator platformă', position: 'Administrator', role: 'admin', hourlyCost: 0, phone: '—' },
  { id: 'u-ceo', name: 'Director general', position: 'Director general', role: 'ceo', hourlyCost: 0, phone: '—' },
  { id: 'u-cfo', name: 'Director financiar', position: 'Director financiar', role: 'cfo', hourlyCost: 0, phone: '—' },
  { id: 'p-01', name: 'Radu Moldovan', position: 'Manager de proiect', role: 'pm', hourlyCost: 92, phone: '0740 000 101' },
  { id: 'p-02', name: 'Ioana Szabo', position: 'Manager de proiect', role: 'pm', hourlyCost: 92, phone: '0740 000 102' },
  { id: 'p-03', name: 'Mihai Câmpean', position: 'Manager de proiect', role: 'pm', hourlyCost: 88, phone: '0740 000 103' },
  { id: 'p-04', name: 'Cristina Dobre', position: 'Manager de proiect', role: 'pm', hourlyCost: 88, phone: '0740 000 104' },
  { id: 'p-05', name: 'Vlad Rus', position: 'Șef de șantier', role: 'site', teamId: 't-1', hourlyCost: 64, phone: '0740 000 105' },
  { id: 'p-06', name: 'Sorin Bucur', position: 'Șef de șantier', role: 'site', teamId: 't-2', hourlyCost: 64, phone: '0740 000 106' },
  { id: 'p-07', name: 'Levente Kiss', position: 'Șef de șantier', role: 'site', teamId: 't-3', hourlyCost: 62, phone: '0740 000 107' },
  { id: 'p-08', name: 'Daniel Marin', position: 'Șef de șantier', role: 'site', teamId: 't-6', hourlyCost: 62, phone: '0740 000 108' },
  { id: 'p-09', name: 'Ovidiu Stan', position: 'Șef de șantier', role: 'site', teamId: 't-5', hourlyCost: 60, phone: '0740 000 109' },
  { id: 'p-10', name: 'Cosmin Ilie', position: 'Șef echipă', teamId: 't-4', hourlyCost: 52, phone: '0740 000 110' },
  { id: 'p-13', name: 'Adriana Pop', position: 'Responsabil producție', role: 'production', hourlyCost: 70, phone: '0740 000 113' },
  // Muncitori
  ...[
    ['p-20', 'Alin Mureșan', 't-1'], ['p-21', 'Bogdan Pașca', 't-1'], ['p-22', 'Marius Oltean', 't-1'], ['p-23', 'Ionuț Vaida', 't-1'],
    ['p-24', 'Florin Togan', 't-2'], ['p-25', 'Gelu Sas', 't-2'], ['p-26', 'Petru Hoza', 't-2'], ['p-27', 'Nicu Avram', 't-2'], ['p-28', 'Dorin Cozma', 't-2'],
    ['p-29', 'Zoltán Bartha', 't-3'], ['p-30', 'Attila Fazakas', 't-3'], ['p-31', 'Ciprian Lazăr', 't-3'],
    ['p-32', 'Lucian Bodea', 't-4'], ['p-33', 'Remus Tătar', 't-4'], ['p-34', 'Sebastian Neagu', 't-4'],
    ['p-35', 'Emil Popa', 't-5'], ['p-36', 'Adrian Varga', 't-5'], ['p-37', 'Viorel Suciu', 't-5'],
    ['p-38', 'Cătălin Roman', 't-6'], ['p-39', 'Paul Ardelean', 't-6'], ['p-40', 'Tudor Gavrilă', 't-6'], ['p-41', 'Răzvan Mihuț', 't-6'],
  ].map(([id, name, teamId]) => ({
    id, name, teamId, position: 'Muncitor calificat', hourlyCost: 46, phone: '—',
  })),
];

export const TEAMS: Team[] = [
  { id: 't-1', name: 'Echipa Gazon 1', specialty: 'Montaj gazon sintetic, marcaje', leadId: 'p-05', memberIds: ['p-05', 'p-20', 'p-21', 'p-22', 'p-23'], dailyCost: 2_150 },
  { id: 't-2', name: 'Echipa Infrastructură', specialty: 'Terasamente, drenaj, fundații', leadId: 'p-06', memberIds: ['p-06', 'p-24', 'p-25', 'p-26', 'p-27', 'p-28'], dailyCost: 2_620 },
  { id: 't-3', name: 'Echipa Gazon 2', specialty: 'Montaj gazon sintetic, multisport', leadId: 'p-07', memberIds: ['p-07', 'p-29', 'p-30', 'p-31'], dailyCost: 1_780 },
  { id: 't-4', name: 'Echipa Împrejmuiri și dotări', specialty: 'Împrejmuiri, iluminat, echipamente', leadId: 'p-10', memberIds: ['p-10', 'p-32', 'p-33', 'p-34'], dailyCost: 1_690 },
  { id: 't-5', name: 'Echipa Locuri de joacă', specialty: 'Montaj echipamente, EPDM', leadId: 'p-09', memberIds: ['p-09', 'p-35', 'p-36', 'p-37'], dailyCost: 1_720 },
  { id: 't-6', name: 'Echipa Tartan și EPDM', specialty: 'Piste de atletism, suprafețe turnate', leadId: 'p-08', memberIds: ['p-08', 'p-38', 'p-39', 'p-40', 'p-41'], dailyCost: 2_200 },
];

export const EQUIPMENT: Equipment[] = [
  { id: 'e-1', name: 'Excavator pe șenile 21 t', kind: 'utilaj', dailyCost: 1_850, status: 'operational' },
  { id: 'e-2', name: 'Buldoexcavator 3CX', kind: 'utilaj', dailyCost: 980, status: 'operational' },
  { id: 'e-3', name: 'Miniîncărcător compact', kind: 'utilaj', dailyCost: 640, status: 'operational' },
  { id: 'e-4', name: 'Cilindru compactor 7 t', kind: 'utilaj', dailyCost: 870, status: 'service', serviceUntil: '2026-10-29' },
  { id: 'e-5', name: 'Placă compactoare reversibilă 400 kg', kind: 'utilaj', dailyCost: 210, status: 'operational' },
  { id: 'e-6', name: 'Mașină periere și umplere gazon', kind: 'utilaj', dailyCost: 420, status: 'operational' },
  { id: 'e-7', name: 'Finisor pentru tartan', kind: 'utilaj', dailyCost: 1_150, status: 'operational' },
  { id: 'e-8', name: 'Sistem nivelment laser', kind: 'utilaj', dailyCost: 180, status: 'operational' },
  { id: 'v-1', name: 'Autobasculantă 8×4', kind: 'vehicul', plate: 'MS 10 ATC', dailyCost: 1_300, status: 'operational' },
  { id: 'v-2', name: 'Camion cu macara 12 t', kind: 'vehicul', plate: 'MS 11 ATC', dailyCost: 1_150, status: 'operational' },
  { id: 'v-3', name: 'Autoutilitară 3,5 t', kind: 'vehicul', plate: 'MS 12 ATC', dailyCost: 360, status: 'operational' },
  { id: 'v-4', name: 'Autoutilitară 3,5 t', kind: 'vehicul', plate: 'MS 13 ATC', dailyCost: 360, status: 'operational' },
  { id: 'v-5', name: 'Autoutilitară cu cabină dublă', kind: 'vehicul', plate: 'MS 14 ATC', dailyCost: 390, status: 'operational' },
];
