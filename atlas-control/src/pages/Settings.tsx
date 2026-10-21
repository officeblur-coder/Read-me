import { Check, Minus, RotateCcw } from 'lucide-react';
import { useStore } from '../store/store';
import { usePermission, useRows } from '../store/derived';
import { Card, CardHeader, PageHeader, Button, Table, Th, Td, RiskDot } from '../components/ui';
import { ROLES, type Permission } from '../domain/permissions';
import { DEFAULT_THRESHOLDS } from '../domain/finance';
import type { Thresholds } from '../domain/types';
import { isActive } from '../domain/portfolio';

const FIELDS: { key: keyof Thresholds; label: string; hint: string; max: number; step: number; tone: 'warn' | 'risk' }[] = [
  { key: 'marginWarnPct', label: 'Marjă minimă pentru verde', hint: 'Sub această marjă estimată, proiectul devine galben', max: 30, step: 0.5, tone: 'warn' },
  { key: 'marginRiskPct', label: 'Marjă critică', hint: 'Sub această marjă estimată, proiectul devine roșu', max: 20, step: 0.5, tone: 'risk' },
  { key: 'overrunWarnPct', label: 'Depășire buget – avertizare', hint: 'Cost estimat peste buget cu mai mult de X%: galben', max: 15, step: 0.5, tone: 'warn' },
  { key: 'overrunRiskPct', label: 'Depășire buget – critică', hint: 'Cost estimat peste buget cu mai mult de X%: roșu', max: 25, step: 0.5, tone: 'risk' },
  { key: 'scheduleGapPct', label: 'Abatere de la grafic', hint: 'Progres fizic sub cel planificat cu mai mult de X puncte: întârziat', max: 40, step: 1, tone: 'warn' },
];

const PERMS: { id: Permission; label: string }[] = [
  { id: 'dashboard.view', label: 'Dashboard și proiecte' },
  { id: 'projects.viewAll', label: 'Toate proiectele (nu doar cele proprii)' },
  { id: 'finance.view', label: 'Date financiare' },
  { id: 'finance.edit', label: 'Editare costuri și estimări' },
  { id: 'requests.approve', label: 'Aprobare solicitări și acte adiționale' },
  { id: 'field.use', label: 'Atlas Field' },
  { id: 'resources.edit', label: 'Planificare resurse' },
  { id: 'materials.edit', label: 'Gestiune materiale' },
  { id: 'production.edit', label: 'Producție' },
  { id: 'intelligence.use', label: 'Atlas Intelligence' },
  { id: 'settings.edit', label: 'Configurare praguri' },
];

export function SettingsPage() {
  const thresholds = useStore((s) => s.thresholds);
  const setThresholds = useStore((s) => s.setThresholds);
  const resetDemo = useStore((s) => s.resetDemo);
  const canEdit = usePermission('settings.edit');
  const rows = useRows().filter((r) => isActive(r.project));
  const counts = { ok: 0, warn: 0, risk: 0 };
  rows.forEach((r) => counts[r.risk.level]++);

  return (
    <div>
      <PageHeader eyebrow="Setări" title="Praguri de avertizare și roluri" subtitle="Pragurile determină automat culoarea fiecărui proiect și alertele din dashboard. Modificările se aplică imediat." />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="Sistem de avertizare" subtitle={canEdit ? 'Trage de cursoare pentru a vedea cum se reclasifică proiectele.' : 'Doar administratorul și directorul general pot modifica pragurile.'} action={canEdit && <Button size="sm" variant="ghost" onClick={() => setThresholds(DEFAULT_THRESHOLDS)}><RotateCcw size={14} /> Implicite</Button>} />
          <div className="space-y-6">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink-900"><RiskDot level={f.tone} />{f.label}</div>
                    <div className="text-[12px] text-ink-500">{f.hint}</div>
                  </div>
                  <div className="text-[18px] font-semibold tabular-nums text-ink-900">{String(thresholds[f.key]).replace('.', ',')}{f.key === 'scheduleGapPct' ? ' pp' : '%'}</div>
                </div>
                <input type="range" min={0} max={f.max} step={f.step} value={thresholds[f.key]} disabled={!canEdit} onChange={(e) => setThresholds({ [f.key]: +e.target.value })} className="mt-2 w-full accent-brand-600 disabled:opacity-50" />
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Efect asupra portofoliului activ" />
            <div className="space-y-3">
              {([['ok', 'Verde – în limitele stabilite'], ['warn', 'Galben – risc de depășire'], ['risk', 'Roșu – depășire sau pierdere']] as const).map(([l, t]) => (
                <div key={l} className="flex items-center justify-between text-[13.5px]"><span className="flex items-center gap-2"><RiskDot level={l} />{t}</span><span className="text-[18px] font-semibold tabular-nums">{counts[l]}</span></div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Date demonstrative" subtitle="Readuce toate proiectele, costurile, rapoartele și solicitările la starea inițială." />
            <Button variant="danger" onClick={() => { if (confirm('Resetezi datele demonstrative?')) resetDemo(); }}><RotateCcw size={15} /> Resetează datele demo</Button>
          </Card>
        </div>
      </div>

      <Card pad={false} className="mt-6">
        <div className="px-5 pt-5"><CardHeader title="Matrice de roluri și permisiuni" subtitle="În demo, selectorul de roluri din bara de sus filtrează interfața. În producție, aceleași permisiuni sunt validate pe server la fiecare cerere, iar managerii și șefii de șantier văd doar proiectele alocate." /></div>
        <Table>
          <thead><tr><Th className="pl-5">Permisiune</Th>{Object.values(ROLES).map((r) => <Th key={r.id} align="center">{r.label}</Th>)}</tr></thead>
          <tbody>
            {PERMS.map((p) => (
              <tr key={p.id}>
                <Td className="pl-5 text-[13px]">{p.label}</Td>
                {Object.values(ROLES).map((r) => (
                  <Td key={r.id} align="center">{r.permissions.includes(p.id) ? <Check size={16} className="mx-auto text-brand-600" /> : <Minus size={14} className="mx-auto text-ink-300" />}</Td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
