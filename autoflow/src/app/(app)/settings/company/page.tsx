import { requireContext } from "@/server/auth/session";
import { getCompany } from "@/server/company/service";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { CompanyForm } from "./company-form";

export const metadata = { title: "Date companie" };

export default async function CompanyPage() {
  const ctx = await requireContext();
  const d = await getCompany(ctx);
  const defaults = Object.fromEntries(
    ["name", "legalName", "cui", "regCom", "address", "city", "county", "phone", "email", "website", "brandColor"].map((k) => [
      k,
      (d[k as keyof typeof d] as string | null) ?? "",
    ]),
  );
  return (
    <div className="animate-in">
      <PageHeader title="Date companie" description="Apar pe documente, în anunțuri și pe website-ul parcului auto." />
      <CompanyForm defaults={defaults} readOnly={!can(ctx.role, "company.update")} />
    </div>
  );
}
