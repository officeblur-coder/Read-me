import Link from "next/link";
import clsx from "clsx";
import { Car, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { requireContext } from "@/server/auth/session";
import { listVehicles } from "@/server/vehicles/service";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { VehicleThumb } from "@/components/ui/vehicle-thumb";
import { can } from "@/lib/permissions";
import { daysBetween, marginPercent } from "@/lib/finance";
import { formatMoney, formatNumber, formatStockNumber } from "@/lib/format";
import { FUEL_OPTIONS, TRANSMISSION_OPTIONS, optionLabel } from "@/lib/vehicle-options";

export const metadata = { title: "Autoturisme" };

const TABS = [
  { v: "", label: "Toate" },
  { v: "in_stock", label: "În stoc" },
  { v: "preparation", label: "În pregătire" },
  { v: "available", label: "Disponibile" },
  { v: "reserved", label: "Rezervate" },
  { v: "sold", label: "Vândute" },
  { v: "withdrawn", label: "Retrase" },
];

type SP = Record<string, string | undefined>;

function href(sp: SP, patch: SP) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
  const s = p.toString();
  return `/vehicles${s ? `?${s}` : ""}`;
}

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const data = await listVehicles(ctx, {
    q: sp.q,
    status: sp.status,
    make: sp.make,
    fuel: sp.fuel,
    transmission: sp.transmission,
    sort: sp.sort,
    page: Number(sp.page) || 1,
  });
  const showCosts = can(ctx.role, "vehicle.costs.read");
  const cur = ctx.dealer.currency;
  const now = new Date();
  const filtered = Boolean(sp.q || sp.make || sp.fuel || sp.transmission || sp.status);

  return (
    <div className="animate-in">
      <PageHeader
        title="Autoturisme"
        description={`${formatNumber(data.total)} ${data.total === 1 ? "autoturism" : "autoturisme"}${filtered ? " găsite" : " în evidență"}`}
        actions={
          can(ctx.role, "vehicle.create") && (
            <Link href="/vehicles/new" className="btn-primary">
              <Plus className="size-4" /> Adaugă autoturism
            </Link>
          )
        }
      />

      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <nav className="flex w-max gap-1 rounded-lg border border-line bg-surface p-1">
          {TABS.map((t) => (
            <Link
              key={t.v}
              href={href(sp, { status: t.v, page: undefined })}
              className={clsx(
                "rounded-md px-3 py-1.5 text-[13px] whitespace-nowrap transition",
                (sp.status ?? "") === t.v ? "bg-surface-3 font-medium text-fg" : "text-fg-2 hover:text-fg",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      <form className="card mb-4 grid grid-cols-2 gap-2 p-3 lg:grid-cols-[1fr_repeat(4,minmax(0,170px))_auto]" role="search">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <div className="relative col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={sp.q} placeholder="Caută marcă, model, VIN, nr. auto…" className="input pl-9" />
        </div>
        <select name="make" defaultValue={sp.make ?? ""} className="input" aria-label="Marcă">
          <option value="">Toate mărcile</option>
          {data.makes.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select name="fuel" defaultValue={sp.fuel ?? ""} className="input" aria-label="Combustibil">
          <option value="">Orice combustibil</option>
          {Object.entries(FUEL_OPTIONS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="transmission" defaultValue={sp.transmission ?? ""} className="input" aria-label="Transmisie">
          <option value="">Orice transmisie</option>
          {Object.entries(TRANSMISSION_OPTIONS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="sort" defaultValue={sp.sort ?? "newest"} className="input" aria-label="Sortare">
          <option value="newest">Adăugate recent</option>
          <option value="oldest">Cele mai vechi în stoc</option>
          <option value="price_asc">Preț crescător</option>
          <option value="price_desc">Preț descrescător</option>
          <option value="year_desc">An (cele mai noi)</option>
          <option value="mileage_asc">Kilometraj redus</option>
        </select>
        <div className="col-span-2 flex gap-2 lg:col-span-1">
          <button className="btn-secondary flex-1">Filtrează</button>
          {filtered && (
            <Link href="/vehicles" className="btn-ghost">
              Resetează
            </Link>
          )}
        </div>
      </form>

      <div className="card overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<Car className="size-5" />}
            title={filtered ? "Niciun rezultat pentru filtrele selectate" : "Niciun autoturism în evidență"}
            action={
              !filtered && can(ctx.role, "vehicle.create") ? (
                <Link href="/vehicles/new" className="btn-primary">
                  <Plus className="size-4" /> Adaugă primul autoturism
                </Link>
              ) : undefined
            }
          >
            {filtered ? "Modificați căutarea sau resetați filtrele." : "Fișele adăugate apar aici, cu status, preț și vechime în stoc."}
          </EmptyState>
        ) : (
          <>
            {/* Tabel — ecrane mari */}
            <table className="hidden w-full text-left text-[13.5px] md:table">
              <thead className="border-b border-line bg-surface-2/60 text-[12px] text-fg-2">
                <tr>
                  <th className="py-2.5 pr-3 pl-4 font-medium">Autoturism</th>
                  <th className="px-3 py-2.5 font-medium">An</th>
                  <th className="px-3 py-2.5 text-right font-medium">Kilometraj</th>
                  <th className="hidden px-3 py-2.5 font-medium lg:table-cell">Motorizare</th>
                  <th className="px-3 py-2.5 text-right font-medium">Preț listare</th>
                  {showCosts && <th className="hidden px-3 py-2.5 text-right font-medium xl:table-cell">Profit brut est.</th>}
                  <th className="px-3 py-2.5 text-right font-medium">Zile</th>
                  <th className="py-2.5 pr-4 pl-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((v) => {
                  const days = daysBetween(new Date(v.acquiredAt), v.soldAt ?? now);
                  const margin = marginPercent(v.estimatedProfit ?? null, v.listPrice);
                  return (
                    <tr key={v.id} className="group relative transition hover:bg-surface-2/60">
                      <td className="py-2.5 pr-3 pl-4">
                        <Link href={`/vehicles/${v.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
                          <VehicleThumb photoId={v.photoId} alt={`${v.make} ${v.model}`} className="h-10 w-14 shrink-0 rounded-md" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium group-hover:text-accent">
                              {v.make} {v.model}
                              {v.version && <span className="font-normal text-fg-2"> {v.version}</span>}
                            </span>
                            <span className="text-[12px] text-muted">
                              {formatStockNumber(v.stockNumber)}
                              {v.plateNumber && ` · ${v.plateNumber}`}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="tabular px-3">{v.year}</td>
                      <td className="tabular px-3 text-right">{formatNumber(v.mileageKm, " km")}</td>
                      <td className="hidden px-3 text-fg-2 lg:table-cell">
                        {optionLabel(FUEL_OPTIONS, v.fuel)} · {optionLabel(TRANSMISSION_OPTIONS, v.transmission)}
                      </td>
                      <td className="tabular px-3 text-right font-medium">
                        {v.status === "sold" && v.salePrice != null ? (
                          <span title="Preț final de vânzare">{formatMoney(v.salePrice, cur)}</span>
                        ) : (
                          formatMoney(v.listPrice, cur)
                        )}
                      </td>
                      {showCosts && (
                        <td className="tabular hidden px-3 text-right xl:table-cell">
                          {v.status === "sold" ? (
                            <span className={(v.realizedProfit ?? 0) < 0 ? "text-bad" : ""}>{formatMoney(v.realizedProfit ?? null, cur)}</span>
                          ) : (
                            <>
                              <span className={(v.estimatedProfit ?? 0) < 0 ? "text-bad" : ""}>{formatMoney(v.estimatedProfit ?? null, cur)}</span>
                              {margin != null && <span className="ml-1.5 text-[12px] text-muted">{margin}%</span>}
                            </>
                          )}
                        </td>
                      )}
                      <td className={clsx("tabular px-3 text-right", v.status !== "sold" && days > 90 ? "font-medium text-bad" : v.status !== "sold" && days > 60 ? "text-warn" : "text-fg-2")}>
                        {days}
                      </td>
                      <td className="py-2.5 pr-4 pl-3">
                        <StatusBadge status={v.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Carduri — mobil */}
            <ul className="divide-y divide-line md:hidden">
              {data.items.map((v) => (
                <li key={v.id}>
                  <Link href={`/vehicles/${v.id}`} className="flex gap-3 p-3">
                    <VehicleThumb photoId={v.photoId} alt={`${v.make} ${v.model}`} className="h-16 w-22 shrink-0 rounded-md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-medium">
                          {v.make} {v.model}
                        </p>
                        <StatusBadge status={v.status} />
                      </div>
                      <p className="text-[12.5px] text-muted">
                        {v.year} · {formatNumber(v.mileageKm, " km")} · {optionLabel(FUEL_OPTIONS, v.fuel)}
                      </p>
                      <p className="tabular mt-0.5 font-medium">{formatMoney(v.listPrice, cur)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {data.pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-[13px] text-fg-2">
          <span>
            Pagina {data.page} din {data.pageCount}
          </span>
          <div className="flex gap-2">
            {data.page > 1 && (
              <Link href={href(sp, { page: String(data.page - 1) })} className="btn-secondary btn-sm">
                <ChevronLeft className="size-4" /> Anterioară
              </Link>
            )}
            {data.page < data.pageCount && (
              <Link href={href(sp, { page: String(data.page + 1) })} className="btn-secondary btn-sm">
                Următoare <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
