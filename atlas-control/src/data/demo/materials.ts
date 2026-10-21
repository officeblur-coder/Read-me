// DATE DEMONSTRATIVE FICTIVE: prețuri și stocuri orientative, furnizori fictivi.
import type { Material, ProductionOrder, PurchaseOrder, StockTransfer } from '../../domain/types';

const m = (
  id: string, name: string, unit: string, category: Material['category'], unitCost: number,
  stock: number, minStock: number, supplier: string, ownProduction = false,
): Material => ({ id, code: `MAT-${id.slice(2)}`, name, unit, category, unitCost, stock, minStock, supplier, ownProduction });

export const MATERIALS: Material[] = [
  m('m-01', 'Gazon sintetic fotbal 60 mm', 'm²', 'Gazon și suprafețe', 78, 6_200, 3_000, 'Turf Distribution SRL (fictiv)'),
  m('m-02', 'Gazon sintetic multisport 40 mm', 'm²', 'Gazon și suprafețe', 58, 1_150, 1_500, 'Turf Distribution SRL (fictiv)'),
  m('m-03', 'Granule SBR umplutură', 't', 'Gazon și suprafețe', 1_450, 38, 20, 'Recycle Granule SRL (fictiv)'),
  m('m-04', 'Nisip cuarțos 0,3–0,8 mm', 't', 'Gazon și suprafețe', 210, 96, 60, 'Cariera Nord SRL (fictiv)'),
  m('m-05', 'Piatră spartă 16–32 mm', 't', 'Agregate și drenaj', 92, 410, 300, 'Cariera Nord SRL (fictiv)'),
  m('m-06', 'Balast stabilizat 0–63 mm', 't', 'Agregate și drenaj', 58, 820, 400, 'Cariera Nord SRL (fictiv)'),
  m('m-07', 'Geotextil netesut 300 g/m²', 'm²', 'Agregate și drenaj', 6.5, 2_400, 2_000, 'Hidro Drenaj SRL (fictiv)'),
  m('m-08', 'Țeavă dren riflată 160 mm', 'm', 'Agregate și drenaj', 38, 260, 300, 'Hidro Drenaj SRL (fictiv)'),
  m('m-09', 'Cămin de vizitare drenaj', 'buc', 'Agregate și drenaj', 2_450, 4, 4, 'Hidro Drenaj SRL (fictiv)'),
  m('m-10', 'Panou împrejmuire bordurat 2,5×2,03 m', 'buc', 'Împrejmuiri', 265, 340, 150, 'Producție proprie', true),
  m('m-11', 'Stâlp împrejmuire 60×60 galvanizat', 'buc', 'Împrejmuiri', 145, 290, 150, 'Producție proprie', true),
  m('m-12', 'Plasă de protecție PP, ochi 45 mm', 'm²', 'Împrejmuiri', 14, 1_900, 800, 'Net Sport SRL (fictiv)'),
  m('m-13', 'Poartă minifotbal aluminiu 3×2 m', 'buc', 'Echipamente sportive', 6_800, 6, 4, 'Producție proprie', true),
  m('m-14', 'Panou baschet cu stâlp și coș', 'buc', 'Echipamente sportive', 9_400, 3, 2, 'Producție proprie', true),
  m('m-15', 'Fileu tenis de competiție', 'buc', 'Echipamente sportive', 980, 12, 4, 'Net Sport SRL (fictiv)'),
  m('m-16', 'Covor tartan SBR + EPDM 13 mm', 'm²', 'Gazon și suprafețe', 165, 620, 500, 'Track Surfaces SRL (fictiv)'),
  m('m-17', 'Granule EPDM colorate', 'kg', 'Gazon și suprafețe', 9.2, 3_800, 4_000, 'Track Surfaces SRL (fictiv)'),
  m('m-18', 'Liant poliuretanic monocomponent', 'kg', 'Consumabile', 28, 900, 800, 'Chem Bond SRL (fictiv)'),
  m('m-19', 'Ansamblu de joacă multifuncțional „Cetate”', 'buc', 'Locuri de joacă', 48_000, 1, 1, 'Producție proprie', true),
  m('m-20', 'Leagăn dublu cu cuib', 'buc', 'Locuri de joacă', 7_600, 3, 2, 'Producție proprie', true),
  m('m-21', 'Tobogan inox 3 m', 'buc', 'Locuri de joacă', 11_200, 2, 1, 'Play Components SRL (fictiv)'),
  m('m-22', 'Bandă marcaj gazon albă 10 cm', 'm', 'Gazon și suprafețe', 4.5, 2_600, 1_500, 'Turf Distribution SRL (fictiv)'),
  m('m-23', 'Proiector LED 400 W pentru terenuri', 'buc', 'Împrejmuiri', 3_950, 14, 8, 'Lumen Pro SRL (fictiv)'),
  m('m-24', 'Adeziv bicomponent PU pentru îmbinări', 'kg', 'Consumabile', 24, 340, 300, 'Chem Bond SRL (fictiv)'),
];

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: 'po-1', number: 'CF-2026-0412', supplier: 'Turf Distribution SRL (fictiv)', date: '2026-09-29', expected: '2026-10-27', projectId: 'prj-01', items: [{ materialId: 'm-01', qty: 5_400 }, { materialId: 'm-22', qty: 1_200 }], status: 'confirmata' },
  { id: 'po-2', number: 'CF-2026-0418', supplier: 'Track Surfaces SRL (fictiv)', date: '2026-10-06', expected: '2026-10-23', projectId: 'prj-06', items: [{ materialId: 'm-17', qty: 6_000 }], status: 'confirmata' },
  { id: 'po-3', number: 'CF-2026-0421', supplier: 'Hidro Drenaj SRL (fictiv)', date: '2026-10-09', expected: '2026-10-22', items: [{ materialId: 'm-08', qty: 600 }, { materialId: 'm-07', qty: 3_000 }], status: 'emisa' },
  { id: 'po-4', number: 'CF-2026-0396', supplier: 'Cariera Nord SRL (fictiv)', date: '2026-09-18', expected: '2026-09-25', items: [{ materialId: 'm-05', qty: 300 }, { materialId: 'm-06', qty: 500 }], status: 'receptionata' },
  { id: 'po-5', number: 'CF-2026-0425', supplier: 'Turf Distribution SRL (fictiv)', date: '2026-10-14', expected: '2026-11-04', projectId: 'prj-16', items: [{ materialId: 'm-01', qty: 7_600 }], status: 'emisa' },
];

export const TRANSFERS: StockTransfer[] = [
  { id: 'tr-1', number: 'TR-2026-0233', date: '2026-10-16', projectId: 'prj-03', items: [{ materialId: 'm-13', qty: 2 }, { materialId: 'm-22', qty: 240 }], status: 'livrat' },
  { id: 'tr-2', number: 'TR-2026-0236', date: '2026-10-20', projectId: 'prj-05', items: [{ materialId: 'm-20', qty: 2 }, { materialId: 'm-17', qty: 1_200 }], status: 'in_tranzit' },
  { id: 'tr-3', number: 'TR-2026-0238', date: '2026-10-22', projectId: 'prj-18', items: [{ materialId: 'm-10', qty: 36 }, { materialId: 'm-11', qty: 38 }], status: 'pregatit' },
];

export const PRODUCTION_ORDERS: ProductionOrder[] = [
  { id: 'op-1', number: 'OP-2026-118', product: 'Ansamblu de joacă multifuncțional „Cetate”', family: 'Locuri de joacă', qty: 1, projectId: 'prj-05', status: 'control_calitate', start: '2026-09-15', due: '2026-10-24', unitCost: { materiale: 24_800, manopera: 9_600, regie: 3_900 }, progress: 90 },
  { id: 'op-2', number: 'OP-2026-121', product: 'Leagăn dublu cu cuib', family: 'Locuri de joacă', qty: 3, projectId: 'prj-10', status: 'in_lucru', start: '2026-10-05', due: '2026-10-30', unitCost: { materiale: 3_350, manopera: 1_480, regie: 640 }, progress: 55 },
  { id: 'op-3', number: 'OP-2026-122', product: 'Poartă minifotbal aluminiu 3×2 m', family: 'Echipamente sportive', qty: 4, projectId: 'prj-15', status: 'in_lucru', start: '2026-10-08', due: '2026-10-28', unitCost: { materiale: 2_900, manopera: 1_150, regie: 520 }, progress: 40 },
  { id: 'op-4', number: 'OP-2026-124', product: 'Panou împrejmuire bordurat 2,5×2,03 m', family: 'Structuri metalice', qty: 220, projectId: 'prj-01', status: 'in_lucru', start: '2026-10-12', due: '2026-11-07', unitCost: { materiale: 118, manopera: 46, regie: 21 }, progress: 35 },
  { id: 'op-5', number: 'OP-2026-125', product: 'Panou baschet cu stâlp și coș', family: 'Echipamente sportive', qty: 2, projectId: 'prj-18', status: 'planificat', start: '2026-10-26', due: '2026-11-03', unitCost: { materiale: 4_100, manopera: 1_650, regie: 760 }, progress: 0 },
  { id: 'op-6', number: 'OP-2026-126', product: 'Structură de cățărare „Turn”', family: 'Locuri de joacă', qty: 2, projectId: 'prj-10', status: 'planificat', start: '2026-10-28', due: '2026-11-14', unitCost: { materiale: 9_800, manopera: 4_200, regie: 1_650 }, progress: 0 },
  { id: 'op-7', number: 'OP-2026-110', product: 'Stâlp împrejmuire 60×60 galvanizat', family: 'Structuri metalice', qty: 180, status: 'finalizat', start: '2026-09-22', due: '2026-10-10', unitCost: { materiale: 62, manopera: 24, regie: 11 }, progress: 100 },
  { id: 'op-8', number: 'OP-2026-114', product: 'Poartă handbal aluminiu 3×2 m', family: 'Echipamente sportive', qty: 2, projectId: 'prj-18', status: 'livrat', start: '2026-09-25', due: '2026-10-09', unitCost: { materiale: 3_050, manopera: 1_200, regie: 540 }, progress: 100 },
];
