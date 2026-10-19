import Link from "next/link";
import { ArrowRight, Car, Inbox, Plus } from "lucide-react";
import { requireContext } from "@/server/auth/session";
import { getDashboard } from "@/server/dashboard/service";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Kpi } from "@/components/ui/kpi";
import { StatusBadge } from "@/components/ui/status-badge";
import { VehicleThumb } from "@/components/ui/vehicle-thumb";
import { ColumnChart, RankBars, TrendChart } from "@/components/charts";
import { formatMoney, formatNumber, formatStockNumber, monthLabel } from "@/lib/format";
import { can } from "@/lib/permissions";

export const metadata = { title: "Dashboard" };

function greeting(d = new Date()) {
  const h = Number(new Intl.DateTimeFormat("ro-RO", { hour: "numeric", hour12: false, timeZone: "Europe/Bucharest" }).format(d));
  return h < 11 ? "Bună dimineața" : h < 18 ? "Bună ziua" : "Bună seara";
}

function Panel({ title, sub, children, action }: { title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14.5px] font-semibold">{title}</h2>
          {sub && <p className="text-[12.5px] text-muted">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function DashboardPage() {
  const ctx = await requireContext();
  const d = await getDashboard(ctx);
  const cur = ctx.dealer.currency;
  const m = (v: number | null) => formatMoney(v, cur);
  const firstName = ctx.user.fullName.split(" ")[0];
  const today = new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const canCreate = can(ctx.role, "vehicle.create");

  const addButton = canCreate && (
    <Link href="/vehicles/new" className="btn-primary">
      <Plus className="size-4" /> Adaugă autoturism
    </Link>
  );

  if (d.counts.total === 0) {
    return (
      <>
        <PageHeader eyebrow={today} title={`${greeting()}, ${firstName}`} />
        <div className="card">
          <EmptyState
            icon={<Car className="size-5" />}
            title="Stocul este gol"
            action={addButton}
          >
            Adăugați primul autoturism. Indicatorii și graficele de pe această pagină se calculează automat din datele introduse.
          </EmptyState>
        </div>
      </>
    );
  }

  const monthly = d.monthly.map((x) => ({ ...x, label: monthLabel(x.month) }));
  const agingRows = [
    { label: "0–30 zile", value: d.aging.d0, tone: "" },
    { label: "31–60 zile", value: d.aging.d30, tone: "" },
    { label: "61–90 zile", value: d.aging.d60, tone: "text-warn" },
    { label: "Peste 90 zile", value: d.aging.d90, tone: "text-bad" },
  ];
  const missing = d.stock.missingCost + d.stock.missingPrice;

  return (
    <div className="animate-in">
      <PageHeader eyebrow={today} title={`${greeting()}, ${firstName}`} description="Situația parcului auto, calculată din datele introduse." actions={addButton} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Autoturisme în stoc" value={formatNumber(d.counts.inStock)} sub={`${d.counts.preparation} în pregătire`} />
        <Kpi label="Disponibile" value={formatNumber(d.counts.available)} sub="Listate pentru vânzare" />
        <Kpi label="Rezervate" value={formatNumber(d.counts.reserved)} />
        <Kpi label="Vândute" value={formatNumber(d.counts.sold)} sub={`${d.thisMonth.sold} în luna curentă`} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Valoarea stocului (cost)" value={m(d.stock.cost)} locked={!d.financials} sub="Achiziție + costuri directe" />
        <Kpi label="Valoare estimată la vânzare" value={m(d.stock.listValue)} sub="Suma prețurilor de listare" />
        <Kpi
          label="Profit brut estimat"
          value={m(d.stock.estimatedProfit)}
          locked={!d.financials}
          tone={d.stock.estimatedProfit != null && d.stock.estimatedProfit < 0 ? "bad" : undefined}
          sub={missing ? `Exclude ${missing} fișe fără cost sau preț` : "Estimativ — nu este profit net"}
        />
        <Kpi
          label="Durată medie până la vânzare"
          value={d.avgDaysToSale != null ? `${formatNumber(d.avgDaysToSale)} zile` : "—"}
          sub="Ultimele 12 luni"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Vânzări lunare" sub="Autoturisme vândute, ultimele 12 luni">
          <ColumnChart data={monthly.map((x) => ({ label: x.label, value: x.sold }))} unit="vândute" />
        </Panel>
        {d.financials ? (
          <Panel title="Profit brut realizat" sub="Preț final − cost total, pe luna vânzării">
            <TrendChart data={monthly.map((x) => ({ label: x.label, value: x.profit }))} kind="money" currency={cur} />
          </Panel>
        ) : (
          <Panel title="Durată medie până la vânzare" sub="Zile de la achiziție la vânzare">
            <TrendChart data={monthly.map((x) => ({ label: x.label, value: x.avgDays }))} kind="days" area={false} />
          </Panel>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Vânzări pe mărci" sub="Ultimele 12 luni">
          <RankBars data={d.byMake.map((b) => ({ label: b.make, value: b.n }))} unit="vândute" emptyText="Nicio vânzare înregistrată încă." />
        </Panel>
        <Panel title="Performanța agenților" sub="Ultimele 12 luni">
          <RankBars
            data={d.agents.map((a) => ({ label: a.name, value: a.sold, sub: a.revenue != null ? formatMoney(a.revenue, cur, { compact: true }) : undefined }))}
            unit="vândute"
            emptyText="Nicio vânzare înregistrată încă."
          />
        </Panel>
        <Panel title="Vechimea stocului" sub="Zile de la achiziție">
          <ul className="grid grid-cols-2 gap-2">
            {agingRows.map((a) => (
              <li key={a.label} className="rounded-lg bg-surface-2 px-3 py-2.5">
                <p className="text-[12px] text-fg-2">{a.label}</p>
                <p className={`tabular text-[20px] font-semibold ${a.value ? a.tone : ""}`}>{a.value}</p>
              </li>
            ))}
          </ul>
          {d.oldest.length > 0 && (
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {d.oldest.slice(0, 4).map((o) => (
                <li key={o.id}>
                  <Link href={`/vehicles/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 text-[13px] hover:text-accent">
                    <span className="truncate">
                      {o.make} {o.model} <span className="text-muted">{o.year}</span>
                    </span>
                    <span className={`tabular shrink-0 font-medium ${o.days > 90 ? "text-bad" : o.days > 60 ? "text-warn" : "text-fg-2"}`}>
                      {o.days} zile
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Adăugate recent"
          action={
            <Link href="/vehicles" className="btn-ghost btn-sm">
              Tot stocul <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <ul className="-mx-2">
            {d.recent.map((r) => (
              <li key={r.id}>
                <Link href={`/vehicles/${r.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
                  <VehicleThumb photoId={r.photo_id} alt={`${r.make} ${r.model}`} className="h-11 w-16 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {r.make} {r.model} <span className="font-normal text-muted">{r.year}</span>
                    </p>
                    <p className="text-[12.5px] text-muted">
                      {formatStockNumber(r.stock_number)} · {r.mileage_km != null ? formatNumber(r.mileage_km, " km") : "km nespecificat"}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="tabular font-medium">{m(r.list_price)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Cereri clienți și sarcini">
          <EmptyState icon={<Inbox className="size-5" />} title="Modulul CRM este în dezvoltare">
            Cererile noi, clienții de contactat și sarcinile programate vor apărea aici după activarea modulului Clienți.
          </EmptyState>
        </Panel>
      </div>
    </div>
  );
}
