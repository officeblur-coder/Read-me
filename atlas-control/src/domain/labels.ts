import type { ProjectStatus, ProjectType, RiskLevel, MaterialRequest, ProductionOrder } from './types';

export const TYPE_LABEL: Record<ProjectType, string> = {
  fotbal: 'Teren de fotbal',
  minifotbal: 'Minifotbal',
  multisport: 'Multisport',
  baza: 'Bază sportivă',
  joaca: 'Loc de joacă',
  tenis: 'Tenis',
  atletism: 'Atletism',
  padel: 'Padel',
  baschet: 'Baschet',
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  pregatire: 'În pregătire',
  executie: 'În execuție',
  receptie: 'La recepție',
  finalizat: 'Finalizat',
  suspendat: 'Suspendat',
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  ok: 'În limite',
  warn: 'Risc',
  risk: 'Depășire',
};

export const URGENCY_LABEL: Record<MaterialRequest['urgency'], string> = {
  normala: 'Normală',
  ridicata: 'Ridicată',
  critica: 'Critică',
};

export const REQUEST_STATUS_LABEL: Record<MaterialRequest['status'], string> = {
  in_asteptare: 'În așteptare',
  aprobata: 'Aprobată',
  respinsa: 'Respinsă',
};

export const PRODUCTION_STATUS_LABEL: Record<ProductionOrder['status'], string> = {
  planificat: 'Planificat',
  in_lucru: 'În lucru',
  control_calitate: 'Control calitate',
  finalizat: 'Finalizat',
  livrat: 'Livrat',
};
