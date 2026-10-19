import { LogOut } from "lucide-react";
import { requireContext } from "@/server/auth/session";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const initials = ctx.user.fullName
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="min-h-dvh">
      <Sidebar dealerName={ctx.dealer.name} canSeeUsers={can(ctx.role, "users.read")} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-end gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur sm:px-6 lg:px-8">
          {ctx.dealer.status === "trial" && (
            <span className="mr-auto ml-12 hidden rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] text-fg-2 sm:inline lg:ml-0">
              Cont de evaluare · plan {ctx.dealer.planCode.toUpperCase()}
            </span>
          )}
          <ThemeToggle />
          <div className="flex items-center gap-2.5 border-l border-line pl-3">
            <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
              {initials}
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-[13px] font-medium">{ctx.user.fullName}</p>
              <p className="text-[11.5px] text-muted">{ROLE_LABELS[ctx.role]}</p>
            </div>
            <form action={logoutAction}>
              <button className="btn-ghost size-8 !px-0" title="Deconectare" aria-label="Deconectare">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
