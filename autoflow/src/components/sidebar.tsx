"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Car,
  FileText,
  Globe,
  LayoutDashboard,
  Menu,
  Megaphone,
  Users,
  UserCog,
  X,
} from "lucide-react";
import { Wordmark } from "./brand";

type Item = { href: string; label: string; icon: typeof Car; soon?: string; show?: boolean };

export function Sidebar({ dealerName, canSeeUsers }: { dealerName: string; canSeeUsers: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const groups: { title?: string; items: Item[] }[] = [
    {
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/vehicles", label: "Autoturisme", icon: Car },
        { href: "/crm", label: "Clienți", icon: Users, soon: "Etapa 1" },
        { href: "/calendar", label: "Programări", icon: CalendarDays, soon: "Etapa 3" },
        { href: "/listings", label: "Anunțuri", icon: Megaphone, soon: "Etapa 2" },
        { href: "/documents", label: "Documente", icon: FileText, soon: "Etapa 3" },
        { href: "/reports", label: "Rapoarte", icon: BarChart3, soon: "Etapa 3" },
        { href: "/website", label: "Website", icon: Globe, soon: "Etapa 2" },
      ],
    },
    {
      title: "Setări",
      items: [
        { href: "/settings/company", label: "Companie", icon: Building2 },
        { href: "/settings/users", label: "Utilizatori", icon: UserCog, show: canSeeUsers },
      ],
    },
  ];

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/dashboard">
          <Wordmark tone="inverse" />
        </Link>
        <button className="text-sidebar-muted lg:hidden" onClick={() => setOpen(false)} aria-label="Închide meniul">
          <X className="size-5" />
        </button>
      </div>
      <div className="mx-3 mb-4 rounded-lg bg-sidebar-2 px-3 py-2.5">
        <p className="text-[11px] tracking-wide text-sidebar-muted uppercase">Parc auto</p>
        <p className="truncate text-[13.5px] font-medium text-white">{dealerName}</p>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.title && <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.08em] text-sidebar-muted uppercase">{g.title}</p>}
            <ul className="space-y-0.5">
              {g.items
                .filter((i) => i.show !== false)
                .map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  if (item.soon) {
                    return (
                      <li
                        key={item.href}
                        className="flex h-9 cursor-default items-center gap-3 rounded-lg px-3 text-[13.5px] text-sidebar-muted/70"
                        title={`Modul planificat — ${item.soon}`}
                      >
                        <Icon className="size-[17px]" strokeWidth={1.75} />
                        <span className="flex-1">{item.label}</span>
                        <span className="rounded border border-white/10 px-1.5 text-[10px] tracking-wide uppercase">În curând</span>
                      </li>
                    );
                  }
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={clsx(
                          "relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] transition",
                          active ? "bg-white/[0.08] font-medium text-white" : "text-sidebar-fg hover:bg-white/[0.04] hover:text-white",
                        )}
                      >
                        {active && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r bg-accent" />}
                        <Icon className="size-[17px]" strokeWidth={1.75} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
      <p className="px-5 pb-5 text-[11px] text-sidebar-muted">BLUR Advertising · v0.1</p>
    </nav>
  );

  return (
    <>
      <button
        className="btn-ghost fixed top-3 left-3 z-30 size-10 !px-0 lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Deschide meniul"
      >
        <Menu className="size-5" />
      </button>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 bg-sidebar lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="animate-in absolute inset-y-0 left-0 w-72 bg-sidebar">{nav}</aside>
        </div>
      )}
    </>
  );
}
