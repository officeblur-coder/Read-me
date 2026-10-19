import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireContext } from "@/server/auth/session";
import { getVehicle } from "@/server/vehicles/service";
import { NotFoundError } from "@/server/errors";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { centsToInput, formatStockNumber } from "@/lib/format";
import { VehicleForm } from "../../vehicle-form";

export const metadata = { title: "Editare autoturism" };

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  const { id } = await params;
  const data = await getVehicle(ctx, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const v = data.vehicle;
  const defaults = {
    ...Object.fromEntries(
      Object.entries(v).map(([k, val]) => [k, val == null ? null : Array.isArray(val) ? val : val instanceof Date ? val.toISOString() : String(val)]),
    ),
    purchasePrice: centsToInput(v.purchasePrice),
    transportCost: centsToInput(v.transportCost),
    repairCost: centsToInput(v.repairCost),
    preparationCost: centsToInput(v.preparationCost),
    otherCosts: centsToInput(v.otherCosts),
    listPrice: centsToInput(v.listPrice),
    minPrice: centsToInput(v.minPrice),
    equipment: v.equipment,
  };
  return (
    <div className="animate-in">
      <Link href={`/vehicles/${id}`} className="mb-3 inline-flex items-center gap-1 text-[13px] text-fg-2 hover:text-fg">
        <ChevronLeft className="size-4" /> Înapoi la fișă
      </Link>
      <PageHeader eyebrow={formatStockNumber(v.stockNumber)} title={`Editare: ${v.make} ${v.model}`} />
      <VehicleForm
        vehicleId={id}
        currency={ctx.dealer.currency}
        defaults={defaults}
        perms={{
          costs: can(ctx.role, "vehicle.costs.write"),
          price: can(ctx.role, "vehicle.price.write"),
          minPrice: can(ctx.role, "vehicle.minPrice.write"),
        }}
      />
    </div>
  );
}
