import { useEffect, useId, useRef, useState } from 'react';
import type { Lang } from '../content/hero';
import { EXPLORE, EXPLORE_COPY } from '../content/explore';
import { useSeason } from '../lib/season';

const BASE = import.meta.env.BASE_URL;
const Chevron = ({ className = '' }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}><path d="m9 6 6 6-6 6" /></svg>
);

/** Desktop "Entdecken / Explore" mega panel: featured Top 15 + every guide page. */
export function ExploreMenu({ lang, label }: { lang: Lang; label: string }) {
  const [open, setOpen] = useState(false);
  const { season } = useSeason();
  const wrap = useRef<HTMLLIElement>(null);
  const timer = useRef<number>();
  const id = useId();
  const t = EXPLORE_COPY[lang];
  const [feat, ...rest] = EXPLORE;
  const later = (v: boolean, ms: number) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(v), ms); };
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); (wrap.current?.querySelector('button') as HTMLButtonElement | null)?.focus(); } };
    const down = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const hash = () => setOpen(false);
    window.addEventListener('keydown', key); window.addEventListener('pointerdown', down); window.addEventListener('hashchange', hash);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', down); window.removeEventListener('hashchange', hash); };
  }, [open]);

  return (
    <li ref={wrap} onPointerEnter={(e) => e.pointerType === 'mouse' && later(true, 90)} onPointerLeave={(e) => e.pointerType === 'mouse' && later(false, 220)}
      onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}
        className="js-head nav-link relative inline-flex min-h-11 items-center gap-1.5 opacity-90 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-champagne">
        {label}
        <Chevron className={`rotate-90 transition-transform duration-300 ${open ? '-rotate-90' : ''}`} />
      </button>
      <div id={id} data-open={open} className="stay-menu absolute left-1/2 top-full pt-4" style={{ width: 'min(1060px, calc(100vw - 64px))' }}>
        <div className="grid grid-cols-[1fr_1.55fr] overflow-hidden rounded-[22px] bg-[#FAF8F5] text-ink shadow-[0_30px_70px_-30px_rgba(10,20,15,.55)] ring-1 ring-black/5">
          <a href={feat.href(season)} onClick={() => setOpen(false)} className="sm-item group relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden p-6 text-cream" style={{ ['--i' as string]: 0 }}>
            <img src={`${BASE}${feat.img[season]}`} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]" />
            <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[color-mix(in_srgb,var(--k-deep)_90%,transparent)] via-[color-mix(in_srgb,var(--k-deep)_25%,transparent)] to-transparent" />
            <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[.2em] text-ink">{t.featured}</span>
            <span className="lnum font-display text-[64px] leading-[.85] text-gold-light">15</span>
            <span className="mt-2 font-display text-[27px] leading-tight">{feat.title[lang]}</span>
            <span className="mt-1 text-[13.5px] text-cream/80">{feat.text[lang]}</span>
          </a>
          <div className="sm-item flex flex-col p-4" style={{ ['--i' as string]: 1 }}>
            <ul className="grid grid-cols-2 gap-1">
              {rest.map((x) => (
                <li key={x.id}>
                  <a href={x.href(season)} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-[16px] p-2 outline-none transition-colors hover:bg-white focus-visible:bg-white">
                    <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-[12px]"><img src={`${BASE}${x.img[season]}`} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">{x.live && <span aria-hidden className="live-dot" />}{x.title[lang]}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-ink/60">{x.text[lang]}</span>
                    </span>
                    <Chevron className="shrink-0 text-ink/35 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-pine" />
                  </a>
                </li>
              ))}
            </ul>
            <a href="#explore" onClick={() => setOpen(false)} className="sm-all mt-auto inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full px-5 text-[11.5px] font-semibold uppercase tracking-[.2em]">{t.all}<Chevron /></a>
          </div>
        </div>
      </div>
    </li>
  );
}

/** Mobile: the same list as an accordion inside the full-screen menu. */
export function ExploreAccordion({ lang, label, onNavigate }: { lang: Lang; label: string; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const { season } = useSeason();
  const id = useId();
  const t = EXPLORE_COPY[lang];
  return (
    <li className="js-mm-item border-b border-ivory/10">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className="flex min-h-[60px] w-full items-center justify-between text-left font-display text-[34px] font-medium leading-none">
        {label}<span aria-hidden className={`text-xl text-champagne transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      <div id={id} className="grid transition-[grid-template-rows] duration-500 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <ul className="flex flex-col gap-1 pb-5" {...(!open ? { inert: '' as unknown as boolean } : {})}>
            {EXPLORE.map((x) => (
              <li key={x.id}>
                <a href={x.href(season)} onClick={onNavigate} className="flex min-h-12 items-center gap-3 text-[17px] font-medium">
                  <span className="h-10 w-12 shrink-0 overflow-hidden rounded-[8px]"><img src={`${BASE}${x.img[season]}`} alt="" loading="lazy" className="h-full w-full object-cover" /></span>
                  <span className="min-w-0 flex-1 truncate">{x.live && <span aria-hidden className="live-dot mr-2" />}{x.title[lang]}</span>
                  <span aria-hidden className="text-champagne">→</span>
                </a>
              </li>
            ))}
            <li><a href="#explore" onClick={onNavigate} className="mt-1 inline-flex min-h-11 items-center gap-2 text-[12px] font-semibold uppercase tracking-[.2em] text-champagne">{t.all} →</a></li>
          </ul>
        </div>
      </div>
    </li>
  );
}
