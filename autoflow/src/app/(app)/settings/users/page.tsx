import { redirect } from "next/navigation";
import { requireContext } from "@/server/auth/session";
import { listTeam } from "@/server/company/service";
import { PageHeader } from "@/components/ui/page-header";
import { can, ROLE_LABELS, type Role } from "@/lib/permissions";
import { formatDateTime } from "@/lib/format";
import { AddMemberForm, MemberActions } from "./members";

export const metadata = { title: "Utilizatori" };

const ROLE_HELP: Record<Role, string> = {
  owner: "Acces complet, inclusiv utilizatori și abonament.",
  manager: "Stoc, prețuri, costuri, marje și rapoarte.",
  sales: "Autoturisme, prețul minim, rezervări și vânzări. Fără costuri de achiziție.",
  operator: "Introducere și actualizare fișe și fotografii. Fără prețuri sau vânzări.",
};

export default async function UsersPage() {
  const ctx = await requireContext();
  if (!can(ctx.role, "users.read")) redirect("/dashboard");
  const team = await listTeam(ctx);
  const manage = can(ctx.role, "users.manage");
  return (
    <div className="animate-in">
      <PageHeader title="Utilizatori și roluri" description="Permisiunile sunt verificate pe server la fiecare acțiune." />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="card overflow-hidden">
          <table className="w-full text-left text-[13.5px]">
            <thead className="border-b border-line bg-surface-2/60 text-[12px] text-fg-2">
              <tr>
                <th className="py-2.5 pr-3 pl-4 font-medium">Utilizator</th>
                <th className="px-3 py-2.5 font-medium">Rol</th>
                <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Ultima autentificare</th>
                {manage && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {team.map((m) => (
                <tr key={m.id}>
                  <td className="py-3 pr-3 pl-4">
                    <p className="font-medium">
                      {m.fullName} {m.id === ctx.userId && <span className="font-normal text-muted">(dvs.)</span>}
                    </p>
                    <p className="text-[12.5px] text-muted">{m.email}</p>
                  </td>
                  <td className="px-3">
                    {manage && m.role !== "owner" && m.id !== ctx.userId ? (
                      <MemberActions userId={m.id} role={m.role} mode="role" />
                    ) : (
                      ROLE_LABELS[m.role as Role]
                    )}
                  </td>
                  <td className="hidden px-3 text-fg-2 sm:table-cell">{m.lastLoginAt ? formatDateTime(m.lastLoginAt) : "Niciodată"}</td>
                  {manage && (
                    <td className="pr-3">{m.role !== "owner" && m.id !== ctx.userId && <MemberActions userId={m.id} role={m.role} mode="remove" />}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          {manage && <AddMemberForm />}
          <section className="card p-5">
            <h2 className="mb-3 text-[14.5px] font-semibold">Ce poate face fiecare rol</h2>
            <dl className="space-y-3 text-[13px]">
              {(Object.keys(ROLE_HELP) as Role[]).map((r) => (
                <div key={r}>
                  <dt className="font-medium">{ROLE_LABELS[r]}</dt>
                  <dd className="text-fg-2">{ROLE_HELP[r]}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
