import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard, FolderKanban, Landmark, Map, NotebookPen, Smartphone, Users, Boxes, Factory, Sparkles,
  Settings, Layers, Menu, ChevronDown, PlayCircle, RotateCcw, ShieldCheck,
} from 'lucide-react';
import { useStore } from '../../store/store';
import { useAlerts, useRole } from '../../store/derived';
import { ROLES, can, type Permission } from '../../domain/permissions';
import type { RoleId } from '../../domain/types';
import { fmtDate } from '../../domain/format';
import { AtlasLogo } from './Logo';
import { DemoTour } from '../../features/tour/DemoTour';
import { AssistantDrawer } from '../../features/intelligence/AssistantDrawer';

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; perm: Permission; badge?: 'alerts' | 'requests' }

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Conducere',
    items: [
      { to: '/', label: 'Dashboard executiv', icon: LayoutDashboard, perm: 'dashboard.view', badge: 'alerts' },
      { to: '/intelligence', label: 'Atlas Intelligence', icon: Sparkles, perm: 'intelligence.use' },
    ],
  },
  {
    section: 'Proiecte',
    items: [
      { to: '/proiecte', label: 'Proiecte și contracte', icon: FolderKanban, perm: 'dashboard.view' },
      { to: '/financiar', label: 'Control financiar', icon: Landmark, perm: 'finance.view' },
      { to: '/harta', label: 'Harta șantierelor', icon: Map, perm: 'map.view' },
      { to: '/jurnal', label: 'Jurnal de șantier', icon: NotebookPen, perm: 'sitelog.view' },
      { to: '/field', label: 'Atlas Field', icon: Smartphone, perm: 'field.use' },
    ],
  },
  {
    section: 'Operațiuni',
    items: [
      { to: '/resurse', label: 'Echipe și utilaje', icon: Users, perm: 'resources.view' },
      { to: '/materiale', label: 'Materiale și stocuri', icon: Boxes, perm: 'materials.view', badge: 'requests' },
      { to: '/productie', label: 'Producție proprie', icon: Factory, perm: 'production.view' },
    ],
  },
  {
    section: 'Platformă',
    items: [
      { to: '/setari', label: 'Setări și roluri', icon: Settings, perm: 'dashboard.view' },
      { to: '/arhitectura', label: 'Arhitectură', icon: Layers, perm: 'dashboard.view' },
    ],
  },
];

// Settings and architecture pages are informational for every role.
const ALWAYS = new Set(['/setari', '/arhitectura']);

export function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMobileOpen(false), [location.pathname]);
  const isField = location.pathname.startsWith('/field');

  return (
    <div className="min-h-screen bg-[#f3f4f1]">
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-brand-950 text-white transition-transform duration-300 lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <Sidebar />
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <div className="lg:pl-[264px]">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className={clsx('mx-auto w-full', isField ? 'max-w-none' : 'max-w-[1480px] px-4 pb-16 pt-6 sm:px-6 lg:px-8')}>
          <div key={location.pathname} className="animate-fade-up">{children}</div>
        </main>
      </div>
      <DemoTour />
      <AssistantDrawer />
    </div>
  );
}

function Sidebar() {
  const role = useStore((s) => s.role);
  const alerts = useAlerts();
  const pending = useStore((s) => s.requests.filter((r) => r.status === 'in_asteptare').length);
  const riskAlerts = alerts.filter((a) => a.severity === 'risk').length;

  return (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
        <AtlasLogo />
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-[0.02em]">ATLAS CONTROL</div>
          <div className="text-[11px] text-white/45">Project Intelligence</div>
        </div>
      </div>
      <nav className="scrollbar-none flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((g) => {
          const items = g.items.filter((i) => ALWAYS.has(i.to) || can(role, i.perm));
          if (!items.length) return null;
          return (
            <div key={g.section} className="mb-5">
              <div className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/35">{g.section}</div>
              {items.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.to === '/'}
                  className={({ isActive }) => clsx(
                    'group relative mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors',
                    isActive ? 'bg-white/[0.08] font-medium text-white' : 'text-white/65 hover:bg-white/[0.04] hover:text-white',
                  )}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-lime-500" />}
                      <i.icon size={17} strokeWidth={1.8} className={isActive ? 'text-lime-400' : 'text-white/50 group-hover:text-white/80'} />
                      <span className="flex-1">{i.label}</span>
                      {i.badge === 'alerts' && riskAlerts > 0 && <span className="rounded bg-risk-500/90 px-1.5 text-[11px] font-semibold text-white">{riskAlerts}</span>}
                      {i.badge === 'requests' && pending > 0 && <span className="rounded bg-white/15 px-1.5 text-[11px] font-semibold text-white">{pending}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/[0.06] p-4">
        <div className="rounded-lg bg-white/[0.04] p-3 text-[11.5px] leading-relaxed text-white/55">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-white/80"><ShieldCheck size={13} /> Mediu demonstrativ</div>
          Toate datele sunt fictive. Nicio integrare externă (contabilitate, GPS, ERP) nu este activă.
        </div>
      </div>
    </>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const today = useStore((s) => s.today);
  const setTour = useStore((s) => s.setTour);
  const tour = useStore((s) => s.tour);
  const roleDef = useRole();
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-[#f3f4f1]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button className="-ml-1 rounded-md p-2 text-ink-600 hover:bg-ink-100 lg:hidden" onClick={onMenu} aria-label="Meniu"><Menu size={20} /></button>
        <div className="hidden items-center gap-2 text-[13px] text-ink-500 md:flex">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-warn-500/50 bg-warn-50 px-2 py-1 text-[11.5px] font-medium text-warn-700">DATE DEMONSTRATIVE FICTIVE</span>
          <span className="text-ink-400">·</span>
          <span>Situație la <span className="font-medium text-ink-700">{fmtDate(today)}</span></span>
        </div>
        <div className="flex-1" />
        <Button onClick={() => setTour({ open: !tour.open })} active={tour.open} />
        <AskButton />
        <RoleSwitcher current={roleDef.id} />
      </div>
    </header>
  );
}

function Button({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={clsx('hidden h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors sm:inline-flex',
        active ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50')}
    >
      <PlayCircle size={16} /> Scenariu demo
    </button>
  );
}

function AskButton() {
  const role = useStore((s) => s.role);
  if (!can(role, 'intelligence.use')) return null;
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('atlas:ask'))}
      className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-3 text-[13px] font-medium text-white hover:bg-ink-800"
    >
      <Sparkles size={15} className="text-lime-400" /> <span className="hidden sm:inline">Întreabă</span>
    </button>
  );
}

function RoleSwitcher({ current }: { current: RoleId }) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const setRole = useStore((s) => s.setRole);
  const resetDemo = useStore((s) => s.resetDemo);
  const people = useStore((s) => s.people);
  const navigate = useNavigate();
  const def = ROLES[current];
  const person = people.find((p) => p.id === def.userId);
  const initials = (person?.name ?? def.label).split(' ').map((w) => w[0]).slice(0, 2).join('');

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex h-9 items-center gap-2 rounded-lg border border-ink-200 bg-white pl-1 pr-2 hover:bg-ink-50">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-800 text-[11px] font-semibold text-lime-300">{initials}</span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-[12.5px] font-medium text-ink-900">{person?.name}</span>
          <span className="block text-[11px] text-ink-500">{def.label}</span>
        </span>
        <ChevronDown size={15} className="text-ink-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-[300px] animate-fade-up overflow-hidden rounded-xl border border-ink-200 bg-white shadow-pop">
            <div className="border-b border-ink-100 px-4 py-3">
              <div className="text-[13px] font-semibold text-ink-900">Testează platforma ca…</div>
              <div className="text-[12px] text-ink-500">Selector de roluri, disponibil doar în demo.</div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-1.5">
              {Object.values(ROLES).map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setRole(r.id); setOpen(false); navigate(r.home); }}
                  className={clsx('flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-ink-50', r.id === current && 'bg-brand-50/70')}
                >
                  <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', r.id === current ? 'bg-brand-600' : 'bg-ink-200')} />
                  <span>
                    <span className="block text-[13px] font-medium text-ink-900">{r.label}</span>
                    <span className="block text-[12px] text-ink-500">{r.description}</span>
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => { if (!armed) { setArmed(true); return; } resetDemo(); setArmed(false); setOpen(false); navigate('/'); }}
              onMouseLeave={() => setArmed(false)}
              className={clsx('flex w-full items-center gap-2 border-t border-ink-100 px-4 py-2.5 text-[12.5px] hover:bg-ink-50', armed ? 'font-medium text-risk-600' : 'text-ink-600')}
            >
              <RotateCcw size={14} /> {armed ? 'Confirmă: toate modificările se pierd' : 'Resetează datele demo'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
