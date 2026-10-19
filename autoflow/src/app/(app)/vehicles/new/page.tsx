import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireContext } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { VehicleForm } from "../vehicle-form";

export const metadata = { title: "Autoturism nou" };

export default async function NewVehiclePage() {
  const ctx = await requireContext();
  if (!can(ctx.role, "vehicle.create")) redirect("/vehicles");
  return (
    <div className="animate-in">
      <Link href="/vehicles" className="mb-3 inline-flex items-center gap-1 text-[13px] text-fg-2 hover:text-fg">
        <ChevronLeft className="size-4" /> Autoturisme
      </Link>
      <PageHeader
        title="Autoturism nou"
        description="Fișa primește automat un ID intern și statusul „În pregătire”. Fotografiile se adaugă după salvare."
      />
      <VehicleForm
        vehicleId={null}
        currency={ctx.dealer.currency}
        defaults={{ acquiredAt: new Date().toISOString().slice(0, 10), equipment: [] }}
        perms={{
          costs: can(ctx.role, "vehicle.costs.write"),
          price: can(ctx.role, "vehicle.price.write"),
          minPrice: can(ctx.role, "vehicle.minPrice.write"),
        }}
      />
    </div>
  );
}
