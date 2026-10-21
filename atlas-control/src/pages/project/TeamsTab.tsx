import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/store';
import type { ProjectRow } from '../../domain/portfolio';
import { findAllocationConflicts } from '../../domain/portfolio';
import { Card, CardHeader, Badge, Table, Th, Td } from '../../components/ui';
import { fmtDateShort, fmtMoney } from '../../domain/format';
import { daysBetween } from '../../domain/dates';

const workdays = (a: string, b: string) => Math.round((daysBetween(a, b) + 1) * 5 / 7);

export function TeamsTab({ row }: { row: ProjectRow }) {
  const p = row.project;
  const allocations = useStore((s) => s.allocations);
  const teams = useStore((s) => s.teams);
  const equipment = useStore((s) => s.equipment);
  const people = useStore((s) => s.people);
  const projects = useStore((s) => s.projects);
  const mine = allocations.filter((a) => a.projectId === p.id).sort((a, b) => a.start.localeCompare(b.start));
  const conflicts = findAllocationConflicts(allocations, equipment, teams, (id) => projects.find((x) => x.id === id)?.city ?? id)
    .filter((c) => c.a.projectId === p.id || c.b?.projectId === p.id);

  const teamIds = [...new Set([...p.teamIds, ...mine.filter((a) => a.resourceType === 'team').map((a) => a.resourceId)])];

  return (
    <div className="space-y-6">
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-warn-100 bg-warn-50 px-4 py-3">
          {conflicts.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-[13px] text-warn-700"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><span><span className="font-medium">{c.label}:</span> {c.detail}</span></div>
          ))}
          <Link to="/resurse?tab=planificare" className="mt-1 inline-block text-[13px] font-medium text-ink-900 hover:underline">Rezolvă în planificare</Link>
        </div>
      )}
      <Card pad={false}>
        <div className="px-5 pt-5"><CardHeader title="Resurse planificate pe proiect" subtitle="Costul estimat se calculează din costul zilnic al resursei și zilele lucrătoare alocate." /></div>
        <Table>
          <thead><tr><Th className="pl-5">Resursă</Th><Th>Tip</Th><Th>Perioadă</Th><Th align="right">Zile lucrătoare</Th><Th align="right" className="pr-5">Cost estimat</Th></tr></thead>
          <tbody>
            {mine.map((a) => {
              const team = a.resourceType === 'team' ? teams.find((t) => t.id === a.resourceId) : undefined;
              const eq = a.resourceType === 'equipment' ? equipment.find((e) => e.id === a.resourceId) : undefined;
              const days = workdays(a.start, a.end);
              const cost = days * (team?.dailyCost ?? eq?.dailyCost ?? 0);
              return (
                <tr key={a.id}>
                  <Td className="pl-5"><div className="font-medium text-ink-900">{team?.name ?? eq?.name}</div>{a.note && <div className="text-[12px] text-ink-500">{a.note}</div>}</Td>
                  <Td><Badge tone={team ? 'brand' : 'neutral'}>{team ? 'Echipă' : eq?.kind === 'vehicul' ? 'Vehicul' : 'Utilaj'}</Badge></Td>
                  <Td className="whitespace-nowrap text-[13px] text-ink-600">{fmtDateShort(a.start)} – {fmtDateShort(a.end)}</Td>
                  <Td align="right">{days}</Td>
                  <Td align="right" className="pr-5 font-medium">{fmtMoney(cost)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {!mine.length && <div className="p-8 text-center text-[13px] text-ink-500">Nicio resursă planificată.</div>}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {teamIds.map((id) => {
          const t = teams.find((x) => x.id === id);
          if (!t) return null;
          return (
            <Card key={id}>
              <CardHeader title={t.name} subtitle={`${t.specialty} · ${fmtMoney(t.dailyCost)} / zi`} />
              <ul className="space-y-2">
                {t.memberIds.map((m) => {
                  const person = people.find((x) => x.id === m)!;
                  return (
                    <li key={m} className="flex items-center gap-3 text-[13px]">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-ink-100 text-[11px] font-semibold text-ink-600">{person.name.split(' ').map((w) => w[0]).join('')}</span>
                      <span className="flex-1 text-ink-800">{person.name}</span>
                      <span className="text-ink-500">{m === t.leadId ? 'Șef echipă' : person.position}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
