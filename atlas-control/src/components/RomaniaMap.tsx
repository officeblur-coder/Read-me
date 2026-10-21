import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { COUNTIES, MAP_H, MAP_W, MERCATOR } from '../data/geo/romania';
import type { ProjectRow } from '../domain/portfolio';
import { riskColor } from './ui';
import { fmtMoney, fmtPct } from '../domain/format';
import { TYPE_LABEL } from '../domain/labels';

export function project(lng: number, lat: number): [number, number] {
  const λ = (lng * Math.PI) / 180;
  const φ = (lat * Math.PI) / 180;
  return [MERCATOR.tx + MERCATOR.scale * λ, MERCATOR.ty - MERCATOR.scale * Math.log(Math.tan(Math.PI / 4 + φ / 2))];
}

/** Inverse of project(): SVG map coordinates back to longitude / latitude. */
export function unproject(x: number, y: number): [number, number] {
  const λ = (x - MERCATOR.tx) / MERCATOR.scale;
  const φ = 2 * Math.atan(Math.exp((MERCATOR.ty - y) / MERCATOR.scale)) - Math.PI / 2;
  return [(λ * 180) / Math.PI, (φ * 180) / Math.PI];
}

interface Props {
  rows: ProjectRow[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  highlightCounty?: string;
  compact?: boolean;
  className?: string;
}

export function RomaniaMap({ rows, selectedId, onSelect, highlightCounty, compact, className }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const countiesWithWork = useMemo(() => new Set(rows.map((r) => r.project.county)), [rows]);
  const maxValue = Math.max(...rows.map((r) => r.fin.revenue), 1);
  const hovered = rows.find((r) => r.project.id === hover);

  // Spread markers that share almost the same position (same city).
  const points = useMemo(() => {
    const seen = new Map<string, number>();
    return rows.map((r) => {
      const [x, y] = project(r.project.lng, r.project.lat);
      const key = `${Math.round(x / 8)}:${Math.round(y / 8)}`;
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      return { r, x: x + n * 11, y: y - n * 4 };
    });
  }, [rows]);

  return (
    <div className={clsx('relative', className)}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-auto w-full" role="img" aria-label="Harta proiectelor pe județe">
        <g>
          {COUNTIES.map((c) => (
            <path
              key={c.name}
              d={c.d}
              fill={highlightCounty === c.name ? '#d5ecdd' : countiesWithWork.has(c.name) ? '#e9efe8' : '#f4f5f2'}
              stroke="#c9d0ca"
              strokeWidth={0.8}
              strokeLinejoin="round"
            >
              <title>{c.name}</title>
            </path>
          ))}
        </g>
        {!compact && (
          <g className="pointer-events-none select-none">
            {COUNTIES.map((c) => (
              <text key={c.name} x={c.cx} y={c.cy} textAnchor="middle" className="fill-ink-400" style={{ fontSize: 10.5, fontWeight: 500 }}>
                {c.name === 'București' ? '' : c.name}
              </text>
            ))}
          </g>
        )}
        <g>
          {points.map(({ r, x, y }) => {
            const rad = (compact ? 5 : 6) + Math.sqrt(r.fin.revenue / maxValue) * (compact ? 9 : 14);
            const color = r.project.status === 'finalizat' ? '#848d87' : riskColor(r.risk.level);
            const sel = r.project.id === selectedId;
            return (
              <g
                key={r.project.id}
                transform={`translate(${x},${y})`}
                className={clsx(onSelect && 'cursor-pointer')}
                onMouseEnter={() => setHover(r.project.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect?.(r.project.id)}
              >
                {r.risk.level === 'risk' && r.project.status !== 'finalizat' && (
                  <circle r={rad} fill={color} opacity={0.35} className="origin-center animate-pulse-ring" style={{ transformBox: 'fill-box' }} />
                )}
                <circle r={rad + 8} fill="transparent" />
                <circle r={rad} fill={color} fillOpacity={r.project.status === 'finalizat' ? 0.45 : 0.88} stroke="#fff" strokeWidth={sel ? 3.5 : 2} />
                {sel && <circle r={rad + 5} fill="none" stroke="#0f1512" strokeWidth={1.6} />}
              </g>
            );
          })}
        </g>
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 w-60 -translate-x-1/2 -translate-y-full rounded-lg border border-ink-200 bg-white p-3 text-[12px] shadow-pop"
          style={{
            left: `${(points.find((p) => p.r.project.id === hover)!.x / MAP_W) * 100}%`,
            top: `calc(${(points.find((p) => p.r.project.id === hover)!.y / MAP_H) * 100}% - 14px)`,
          }}
        >
          <div className="font-semibold text-ink-900">{hovered.project.name}</div>
          <div className="text-ink-500">{hovered.project.city}, jud. {hovered.project.county} · {TYPE_LABEL[hovered.project.type]}</div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 tabular-nums">
            <span className="text-ink-500">Contract</span><span className="text-right font-medium">{fmtMoney(hovered.fin.revenue)}</span>
            <span className="text-ink-500">Progres</span><span className="text-right font-medium">{fmtPct(hovered.sched.progress)}</span>
            <span className="text-ink-500">Marjă estimată</span><span className="text-right font-medium">{fmtPct(hovered.fin.margin)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-500">
      {([['ok', 'În limite'], ['warn', 'Risc'], ['risk', 'Depășire / pierdere']] as const).map(([l, t]) => (
        <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: riskColor(l) }} />{t}</span>
      ))}
      <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-ink-400/60" />Finalizat</span>
      <span>Mărimea punctului: valoarea contractului</span>
    </div>
  );
}
