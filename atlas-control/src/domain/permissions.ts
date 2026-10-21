// Role-based access. In the demo this filters the UI only; in production every permission
// below is enforced server-side (API middleware + row-level filters on project assignment).
import type { RoleId } from './types';

export type Permission =
  | 'dashboard.view'
  | 'projects.viewAll'
  | 'projects.edit'
  | 'finance.view'
  | 'finance.edit'
  | 'requests.approve'
  | 'map.view'
  | 'sitelog.view'
  | 'field.use'
  | 'resources.view'
  | 'resources.edit'
  | 'materials.view'
  | 'materials.edit'
  | 'production.view'
  | 'production.edit'
  | 'intelligence.use'
  | 'settings.edit';

export interface RoleDef {
  id: RoleId;
  label: string;
  description: string;
  userId: string; // demo persona
  home: string;
  permissions: Permission[];
}

const ALL: Permission[] = [
  'dashboard.view', 'projects.viewAll', 'projects.edit', 'finance.view', 'finance.edit', 'requests.approve',
  'map.view', 'sitelog.view', 'field.use', 'resources.view', 'resources.edit', 'materials.view', 'materials.edit',
  'production.view', 'production.edit', 'intelligence.use', 'settings.edit',
];

export const ROLES: Record<RoleId, RoleDef> = {
  admin: {
    id: 'admin', label: 'Administrator', description: 'Acces complet, configurare platformă și praguri',
    userId: 'u-admin', home: '/', permissions: ALL,
  },
  ceo: {
    id: 'ceo', label: 'Director general', description: 'Vedere completă, aprobări, Atlas Intelligence',
    userId: 'u-ceo', home: '/',
    permissions: ALL.filter((p) => p !== 'field.use'),
  },
  cfo: {
    id: 'cfo', label: 'Director financiar', description: 'Control financiar, costuri, facturare, aprobări',
    userId: 'u-cfo', home: '/financiar',
    permissions: ['dashboard.view', 'projects.viewAll', 'finance.view', 'finance.edit', 'requests.approve', 'map.view',
      'sitelog.view', 'resources.view', 'materials.view', 'production.view', 'intelligence.use'],
  },
  pm: {
    id: 'pm', label: 'Manager de proiect', description: 'Proiectele proprii: costuri, progres, resurse',
    userId: 'p-02', home: '/proiecte',
    permissions: ['dashboard.view', 'projects.edit', 'finance.view', 'finance.edit', 'map.view', 'sitelog.view',
      'resources.view', 'resources.edit', 'materials.view', 'materials.edit', 'intelligence.use'],
  },
  site: {
    id: 'site', label: 'Șef de șantier', description: 'Atlas Field: rapoarte zilnice, consumuri, solicitări',
    userId: 'p-06', home: '/field',
    permissions: ['field.use', 'sitelog.view'],
  },
  production: {
    id: 'production', label: 'Responsabil producție', description: 'Ordine de producție, stocuri, transferuri',
    userId: 'p-13', home: '/productie',
    permissions: ['materials.view', 'materials.edit', 'production.view', 'production.edit', 'resources.view'],
  },
};

export const can = (role: RoleId, perm: Permission) => ROLES[role].permissions.includes(perm);
