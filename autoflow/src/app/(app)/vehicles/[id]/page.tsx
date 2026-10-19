import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, Pencil } from "lucide-react";
import { requireContext } from "@/server/auth/session";
import { getVehicle } from "@/server/vehicles/service";
import { NotFoundError } from "@/server/errors";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { FormAlert } from "@/components/ui/field";
import { can } from "@/lib/permissions";
import { allowedTransitions, STATUS_LABELS, type VehicleStatus } from "@/lib/vehicle-status";
import { daysBetween, marginPercent } from "@/lib/finance";
import { formatDate, formatDateTime, formatMoney, formatNumber, formatStockNumber } from "@/lib/format";
import {
  BODY_OPTIONS,
  DRIVETRAIN_OPTIONS,
  EMISSION_OPTIONS,
  EQUIPMENT,
  FUEL_OPTIONS,
  ORIGIN_OPTIONS,
  TRANSMISSION_OPTIONS,
  optionLabel,
} from "@/lib/vehicle-options";
import { PhotoManager } from "./photo-manager";
import { StatusPanel } from "./status-panel";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  const { id } = await params;
  try {
    const { vehicle } = await getVehicle(ctx, id);
    return { title: `${vehicle.make} ${vehicle.model} · ${formatStockNumber(vehicle.stockNumber)}` };
  } catch {
    return { title: "Autoturism" };
  }
}

function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-4 sm:p-5 ${className}`}>
      {title && <h2 className="mb-4 text-[14.5px] font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: React.ReactNode; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-fg-2">{label}</dt>
      <dd className={`tabular text-right ${strong ? "font-semibold" : ""} ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}

export default async function VehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const ctx = await requireContext();
  const { id } = await params;
  const { created } = await searchParams;
  const data = await getVehicle(ctx, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const { vehicle: v, media, history, soldByName } = data;
  const cur = ctx.dealer.currency;
  const status = v.status as VehicleStatus;
  const days = daysBetween(new Date(v.acquiredAt), v.soldAt ?? new Date());
  const showCosts = can(ctx.role, "vehicle.costs.read");
  const title = `${v.make} ${v.model}`;

  const specs: [string, React.ReactNode][] = [
    ["An fabricație", v.year],
    ["Kilometraj", formatNumber(v.mileageKm, " km")],
    ["Combustibil", optionLabel(FUEL_OPTIONS, v.fuel)],
    ["Transmisie", optionLabel(TRANSMISSION_OPTIONS, v.transmission)],
    ["Motorizare", v.engine],
    ["Capacitate", v.engineCc ? formatNumber(v.engineCc, " cm³") : null],
    ["Putere", v.powerHp || v.powerKw ? [v.powerHp && `${v.powerHp} CP`, v.powerKw && `${v.powerKw} kW`].filter(Boolean).join(" / ") : null],
    ["Tracțiune", optionLabel(DRIVETRAIN_OPTIONS, v.drivetrain)],
    ["Normă poluare", optionLabel(EMISSION_OPTIONS, v.emissionStandard)],
    ["Caroserie", optionLabel(BODY_OPTIONS, v.bodyType)],
    ["Culoare", v.color],
    ["Uși / locuri", v.doors || v.seats ? `${v.doors ?? "—"} / ${v.seats ?? "—"}` : null],
    ["Proprietari", v.ownersCount],
    ["Proveniență", optionLabel(ORIGIN_OPTIONS, v.origin)],
    ["Prima înmatriculare", v.firstRegistration ? formatDate(v.firstRegistration) : null],
    ["Generație", v.generation],
    ["Serie VIN", v.vin && <span className="font-mono text-[13px]">{v.vin}</span>],
    ["Nr. înmatriculare", v.plateNumber],
  ];
  const equipment = new Set(v.equipment);
  const missing: string[] = [];
  if (v.listPrice == null) missing.push("preț de listare");
  if (!media.length) missing.push("fotografii");
  if (showCosts && v.purchasePrice == null) missing.push("preț de achiziție");

  return (
    <div className="animate-in">
      <Link href="/vehicles" className="mb-3 inline-flex items-center gap-1 text-[13px] text-fg-2 hover:text-fg">
        <ChevronLeft className="size-4" /> Autoturisme
      </Link>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2 normal-case tracking-normal">
            <span className="font-mono text-[12px] tracking-wide">{formatStockNumber(v.stockNumber)}</span>
            <StatusBadge status={status} />
          </span>
        }
        title={v.version ? `${title} ${v.version}` : title}
        description={[v.year, formatNumber(v.mileageKm, " km"), optionLabel(FUEL_OPTIONS, v.fuel), optionLabel(TRANSMISSION_OPTIONS, v.transmission)].join(" · ")}
        actions={
          can(ctx.role, "vehicle.update") && (
            <Link href={`/vehicles/${v.id}/edit`} className="btn-secondary">
              <Pencil className="size-4" /> Editează fișa
            </Link>
          )
        }
      />

      {created && status === "preparation" && (
        <div className="mb-4">
          <FormAlert tone="good">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-4" /> Fișa a fost creată. Adăugați fotografiile, apoi marcați autoturismul disponibil.
            </span>
          </FormAlert>
        </div>
      )}
      {!(created && status === "preparation") && missing.length > 0 && status !== "sold" && (
        <div className="mb-4">
          <FormAlert tone="warn">Fișă incompletă: lipsesc {missing.join(", ")}.</FormAlert>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Card title={`Fotografii (${media.length})`}>
            <PhotoManager
              vehicleId={v.id}
              title={title}
              canEdit={can(ctx.role, "media.write")}
              photos={media.map((m) => ({ id: m.id, isPrimary: m.isPrimary, width: m.width, height: m.height }))}
            />
          </Card>

          <Card title="Date tehnice">
            <dl className="grid gap-x-8 text-[13.5px] sm:grid-cols-2">
              {specs.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-line py-2">
                  <dt className="text-fg-2">{label}</dt>
                  <dd className="text-right font-medium">{value ?? <span className="font-normal text-muted">—</span>}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title={`Dotări (${equipment.size})`}>
            {equipment.size === 0 ? (
              <p className="text-[13px] text-muted">Nicio dotare bifată.</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {EQUIPMENT.map((cat) => {
                  const items = Object.entries(cat.items).filter(([k]) => equipment.has(k));
                  if (!items.length) return null;
                  return (
                    <div key={cat.key}>
                      <p className="eyebrow mb-2">{cat.label}</p>
                      <ul className="space-y-1 text-[13.5px]">
                        {items.map(([k, label]) => (
                          <li key={k} className="flex items-center gap-2">
                            <span className="size-1 rounded-full bg-accent" /> {label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {(v.description || v.internalNotes) && (
            <Card title="Descriere">
              {v.description && <p className="text-[13.5px] whitespace-pre-line">{v.description}</p>}
              {v.internalNotes && (
                <div className="mt-4 rounded-lg border border-line bg-surface-2 p-3">
                  <p className="eyebrow mb-1">Note interne</p>
                  <p className="text-[13px] whitespace-pre-line text-fg-2">{v.internalNotes}</p>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <p className="text-[12.5px] text-fg-2">{status === "sold" ? "Preț final de vânzare" : "Preț de listare"}</p>
            <p className="tabular mt-1 text-[28px] leading-tight font-semibold tracking-tight">
              {formatMoney(status === "sold" ? (v.salePrice ?? null) : v.listPrice, cur)}
            </p>
            {status === "sold" && v.listPrice != null && <p className="text-[12.5px] text-muted">Listat la {formatMoney(v.listPrice, cur)}</p>}
            {v.minPrice !== undefined && (
              <p className="mt-2 text-[12.5px] text-fg-2">
                Preț minim acceptat: <span className="tabular font-medium text-fg">{formatMoney(v.minPrice, cur)}</span>
              </p>
            )}
            <div className="mt-4 border-t border-line pt-4">
              <StatusPanel
                vehicleId={v.id}
                status={status}
                allowed={allowedTransitions(ctx.role, status, v)}
                listPrice={v.listPrice}
                minPrice={v.minPrice}
                currency={cur}
                canDelete={can(ctx.role, "vehicle.delete")}
              />
            </div>
          </Card>

          {showCosts && (
            <Card title="Situație financiară">
              <dl className="text-[13.5px]">
                <Row label="Preț achiziție" value={formatMoney(v.purchasePrice ?? null, cur)} />
                <Row label="Transport" value={formatMoney(v.transportCost ?? null, cur)} />
                <Row label="Reparații" value={formatMoney(v.repairCost ?? null, cur)} />
                <Row label="Pregătire vânzare" value={formatMoney(v.preparationCost ?? null, cur)} />
                <Row label="Alte cheltuieli" value={formatMoney(v.otherCosts ?? null, cur)} />
                <div className="my-2 border-t border-line" />
                <Row label="Cost total" value={formatMoney(v.totalCost ?? null, cur)} strong />
                {status === "sold" ? (
                  <Row
                    label="Profit brut realizat"
                    value={
                      <>
                        {formatMoney(v.realizedProfit ?? null, cur)}
                        {marginPercent(v.realizedProfit ?? null, v.salePrice ?? null) != null && (
                          <span className="ml-1.5 font-normal text-muted">{marginPercent(v.realizedProfit ?? null, v.salePrice ?? null)}%</span>
                        )}
                      </>
                    }
                    strong
                    tone={(v.realizedProfit ?? 0) < 0 ? "text-bad" : "text-good"}
                  />
                ) : (
                  <Row
                    label="Profit brut estimat"
                    value={
                      <>
                        {formatMoney(v.estimatedProfit ?? null, cur)}
                        {marginPercent(v.estimatedProfit ?? null, v.listPrice) != null && (
                          <span className="ml-1.5 font-normal text-muted">{marginPercent(v.estimatedProfit ?? null, v.listPrice)}%</span>
                        )}
                      </>
                    }
                    strong
                    tone={(v.estimatedProfit ?? 0) < 0 ? "text-bad" : ""}
                  />
                )}
              </dl>
              <p className="mt-3 text-[11.5px] leading-snug text-muted">
                Profit brut = preț − cost direct. Nu reprezintă profit contabil net (TVA, regim de marjă, cheltuieli generale).
              </p>
            </Card>
          )}

          <Card title="Evidență">
            <dl className="text-[13.5px]">
              <Row label="Data achiziției" value={formatDate(v.acquiredAt)} />
              <Row
                label={status === "sold" ? "Zile până la vânzare" : "Zile în stoc"}
                value={days}
                tone={status !== "sold" && days > 90 ? "text-bad font-medium" : status !== "sold" && days > 60 ? "text-warn" : ""}
              />
              <Row label="Listat la vânzare" value={formatDate(v.listedAt)} />
              {v.soldAt && <Row label="Vândut" value={formatDate(v.soldAt)} />}
              {soldByName && <Row label="Vândut de" value={soldByName} />}
              <Row label="Ultima actualizare" value={formatDateTime(v.updatedAt)} />
            </dl>
          </Card>

          <Card title="Istoric status">
            <ol className="relative space-y-4 border-l border-line pl-4 text-[13px]">
              {history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-1.5 -left-[20.5px] size-2 rounded-full border-2 border-surface bg-accent" />
                  <p className="font-medium">
                    {h.fromStatus ? `${STATUS_LABELS[h.fromStatus as VehicleStatus]} → ` : "Creat · "}
                    {STATUS_LABELS[h.toStatus as VehicleStatus]}
                  </p>
                  <p className="text-[12px] text-muted">
                    {formatDateTime(h.createdAt)}
                    {h.userName && ` · ${h.userName}`}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
