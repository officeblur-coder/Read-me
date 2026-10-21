import { useMemo } from 'react';
import { useStore } from '../../store/store';
import { useRows } from '../../store/derived';
import type { KnowledgeBase } from '../../domain/intelligence';

export function useKnowledgeBase(): KnowledgeBase {
  const rows = useRows();
  const s = useStore();
  return useMemo(() => ({
    rows, requests: s.requests, materials: s.materials, projectMaterials: s.projectMaterials, allocations: s.allocations,
    teams: s.teams, equipment: s.equipment, people: s.people, reports: s.reports, today: s.today,
  }), [rows, s.requests, s.materials, s.projectMaterials, s.allocations, s.teams, s.equipment, s.people, s.reports, s.today]);
}
