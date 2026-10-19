import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
import { Wordmark } from "@/components/brand";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentContext()) redirect("/dashboard");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,44%)]">
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Wordmark />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="animate-in w-full max-w-[400px]">{children}</div>
        </div>
        <p className="text-[12px] text-muted">© {new Date().getFullYear()} BLUR Advertising. Toate drepturile rezervate.</p>
      </main>
      <aside className="relative hidden overflow-hidden bg-sidebar lg:block">
        <svg className="absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden>
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M48 0H0V48" fill="none" stroke="#fff" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div className="relative flex h-full flex-col justify-end p-12 text-sidebar-fg">
          <p className="eyebrow !text-sidebar-muted">Platformă pentru parcuri auto</p>
          <h2 className="mt-3 max-w-md text-[28px] leading-tight font-semibold tracking-tight text-white">
            Stoc, costuri, clienți și anunțuri — într-un singur sistem.
          </h2>
          <ul className="mt-8 space-y-3 text-[14px]">
            {[
              "Fișă completă pentru fiecare autoturism, cu marjă calculată automat",
              "Roluri și permisiuni pentru întreaga echipă",
              "Datele fiecărui dealer sunt izolate la nivel de bază de date",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
