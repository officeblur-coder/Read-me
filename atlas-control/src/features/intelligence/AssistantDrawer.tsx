import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import { Chat } from './Chat';

/** Slide-over assistant available from every page via the topbar. */
export function AssistantDrawer() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  useEffect(() => {
    const h = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<string | undefined>).detail;
      // Let the drawer mount before forwarding the question.
      if (q) setTimeout(() => window.dispatchEvent(new CustomEvent('atlas:question', { detail: q })), 60);
    };
    window.addEventListener('atlas:ask', h);
    return () => window.removeEventListener('atlas:ask', h);
  }, []);

  return (
    <>
      <div className={clsx('fixed inset-0 z-40 bg-ink-900/25 transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={() => setOpen(false)} />
      <aside className={clsx(
        'fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col bg-[#fafbf9] shadow-pop transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        <div className="flex h-16 items-center justify-between border-b border-ink-200/70 px-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900"><Sparkles size={16} className="text-lime-400" /></span>
            <div className="leading-tight">
              <div className="text-[14px] font-semibold text-ink-900">Atlas Intelligence</div>
              <div className="text-[11.5px] text-ink-500">Asistent de analiză · simulare</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-800" aria-label="Închide"><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1">{open && <Chat compact listen onNavigate={() => setOpen(false)} />}</div>
      </aside>
    </>
  );
}
