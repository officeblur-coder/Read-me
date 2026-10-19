"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

const axis = { stroke: "var(--chart-axis)", fontSize: 11.5, tickLine: false, axisLine: false } as const;

type Fmt = "count" | "money" | "days";

function fmt(v: number | null | undefined, kind: Fmt, currency = "EUR") {
  if (v == null) return "—";
  if (kind === "money")
    return new Intl.NumberFormat("ro-RO", { style: "currency", currency, maximumFractionDigits: 0 }).format(v / 100);
  if (kind === "days") return `${new Intl.NumberFormat("ro-RO").format(v)} zile`;
  return new Intl.NumberFormat("ro-RO").format(v);
}

function compact(v: number, kind: Fmt) {
  const n = kind === "money" ? v / 100 : v;
  return new Intl.NumberFormat("ro-RO", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function ChartTooltip({ active, payload, label, kind, unit, currency }: TooltipContentProps<number, string> & { kind: Fmt; unit: string; currency?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] shadow-pop">
      <p className="mb-0.5 text-muted">{label}</p>
      <p className="tabular font-semibold text-fg">
        {fmt(payload[0].value as number, kind, currency)} <span className="font-normal text-fg-2">{unit}</span>
      </p>
    </div>
  );
}

export type SeriesPoint = { label: string; value: number | null };

export function ColumnChart({ data, kind = "count", unit = "", height = 220, currency }: { data: SeriesPoint[]; kind?: Fmt; unit?: string; height?: number; currency?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="label" {...axis} dy={6} />
        <YAxis {...axis} allowDecimals={false} tickFormatter={(v) => compact(v, kind)} width={44} />
        <Tooltip cursor={{ fill: "var(--surface-2)" }} content={(p) => <ChartTooltip {...(p as TooltipContentProps<number, string>)} kind={kind} unit={unit} currency={currency} />} />
        <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={500} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data, kind = "money", unit = "", height = 220, area = true, currency }: { data: SeriesPoint[]; kind?: Fmt; unit?: string; height?: number; area?: boolean; currency?: string }) {
  const common = (
    <>
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
      <XAxis dataKey="label" {...axis} dy={6} />
      <YAxis {...axis} tickFormatter={(v) => compact(v, kind)} width={48} />
      <Tooltip
        cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
        content={(p) => <ChartTooltip {...(p as TooltipContentProps<number, string>)} kind={kind} unit={unit} currency={currency} />}
      />
    </>
  );
  const dot = { r: 0 };
  const activeDot = { r: 4, strokeWidth: 2, stroke: "var(--surface)" };
  return (
    <ResponsiveContainer width="100%" height={height}>
      {area ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {common}
          <Area type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} fill="url(#trendFill)" animationDuration={500} dot={dot} activeDot={activeDot} connectNulls />
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          {common}
          <Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }} activeDot={activeDot} connectNulls />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

/** Bare orizontale ca listă HTML: etichete lizibile, valori direct etichetate. */
export function RankBars({ data, unit, emptyText }: { data: { label: string; value: number; sub?: string }[]; unit: string; emptyText: string }) {
  if (!data.length) return <p className="py-10 text-center text-[13px] text-muted">{emptyText}</p>;
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label} className="group" title={`${d.label}: ${d.value} ${unit}${d.sub ? ` · ${d.sub}` : ""}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-fg">{d.label}</span>
            <span className="tabular shrink-0 text-fg-2">
              <span className="font-semibold text-fg">{d.value}</span> {unit}
              {d.sub && <span className="ml-2 text-muted">{d.sub}</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-[var(--chart-1)] transition-[width] duration-500 group-hover:opacity-80"
              style={{ width: `${Math.max(3, (d.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
