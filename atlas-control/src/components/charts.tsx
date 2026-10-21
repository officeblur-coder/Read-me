// Shared chart styling. Two-series palette validated for CVD separation and contrast:
// SERIES_A (venit / buget) and SERIES_B (cost). Status colors stay reserved for risk.
import type { ReactNode } from 'react';
import { fmtMoney } from '../domain/format';

export const SERIES_A = '#178650';
export const SERIES_B = '#3d7bb5';
export const GRID = '#e6e9e6';
export const AXIS = '#848d87';

export const axisProps = {
  tick: { fill: AXIS, fontSize: 11.5 },
  axisLine: false,
  tickLine: false,
} as const;

export function ChartTooltip({ active, payload, label, format = fmtMoney, labelFormat }: {
  active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: string;
  format?: (v: number) => string; labelFormat?: (l: string) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[170px] rounded-lg border border-ink-200 bg-white px-3 py-2 text-[12px] shadow-pop">
      <div className="mb-1 font-medium text-ink-900">{labelFormat ? labelFormat(label ?? '') : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-ink-500"><span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />{p.name}</span>
          <span className="font-medium tabular-nums text-ink-900">{format(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-500">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />{i.label}</span>
      ))}
    </div>
  );
}

export const shortMoney = (v: number) =>
  Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace('.', ',')} mil.` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)} mii` : `${v}`;
