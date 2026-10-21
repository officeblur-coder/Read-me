import { useMemo } from 'react';
import { useStore } from './store';
import { computeAlerts, computeRows, computeTotals } from '../domain/portfolio';
import { can, ROLES, type Permission } from '../domain/permissions';

export function useRows() {
  const projects = useStore((s) => s.projects);
  const today = useStore((s) => s.today);
  const thresholds = useStore((s) => s.thresholds);
  return useMemo(() => computeRows(projects, today, thresholds), [projects, today, thresholds]);
}

export function useRow(id: string | undefined) {
  const rows = useRows();
  return rows.find((r) => r.project.id === id);
}

export function useTotals() {
  const rows = useRows();
  return useMemo(() => computeTotals(rows), [rows]);
}

export function useAlerts() {
  const rows = useRows();
  const requests = useStore((s) => s.requests);
  const materials = useStore((s) => s.materials);
  const projectMaterials = useStore((s) => s.projectMaterials);
  const reports = useStore((s) => s.reports);
  const allocations = useStore((s) => s.allocations);
  const equipment = useStore((s) => s.equipment);
  const teams = useStore((s) => s.teams);
  const today = useStore((s) => s.today);
  return useMemo(
    () => computeAlerts({ rows, requests, materials, projectMaterials, reports, allocations, equipment, teams, today }),
    [rows, requests, materials, projectMaterials, reports, allocations, equipment, teams, today],
  );
}

export function usePermission(perm: Permission) {
  const role = useStore((s) => s.role);
  return can(role, perm);
}

export function useRole() {
  const role = useStore((s) => s.role);
  return ROLES[role];
}

export function usePerson() {
  const people = useStore((s) => s.people);
  return (id: string | undefined) => people.find((p) => p.id === id);
}

/** Projects visible to the current role (PM and site manager see only their own). */
export function useVisibleRows() {
  const rows = useRows();
  const role = useStore((s) => s.role);
  const def = ROLES[role];
  return useMemo(() => {
    if (can(role, 'projects.viewAll')) return rows;
    if (role === 'pm') return rows.filter((r) => r.project.managerId === def.userId);
    if (role === 'site') return rows.filter((r) => r.project.siteManagerId === def.userId);
    return rows;
  }, [rows, role, def.userId]);
}
