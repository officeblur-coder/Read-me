import { useEffect, useId, useRef, useState } from 'react';
import type { Lang, Season } from '../content/hero';
import { ROOM_KEYS, PR_COPY, ROOMS_ROUTE, STAY_COPY, roomData, roomRoute } from '../content/pensionPage';
import { useSeason } from '../lib/season';

const IMG = import.meta.env.BASE_URL + 'images/';
/** Seasonal thumbnails: the pension (client hero photos) and the chalet (client exterior photos). */
const THUMB: Record<'pension' | 'chalet', Record<Season, string>> = {
  pension: { winter: 'hero/winter-d-960', summer: 'hero/summer-d-960' },
  chalet: { winter: 'chalet/winter-800', summer: 'chalet/summer-800' },
};
const Chevron = ({ className = '' }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}><path d="m9 6 6 6-6 6" /></svg>
);

function Thumb({ kind, season, alt }: { kind: 'pension' | 'chalet'; season: Season; alt: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {(['winter', 'summer'] as Season[]).map((s) => (
        <picture key={s}>
          <source type="image/avif" srcSet={`${IMG}${THUMB[kind][s]}.avif`} />
          <img src={`${IMG}${THUMB[kind][s]}.webp`} alt={s === season ? alt : ''} loading="lazy" decoding="async"
            className="sm-img absolute inset-0 h-full w-full object-cover transition-opacity duration-700" style={{ opacity: s === season ? 1 : 0 }} />
        </picture>
      ))}
    </div>
  );
}

/** Desktop "Unterkunft / Accommodation" mega panel: pension, chalet and the four room categories. */
export function StayMenu({ lang, label }: { lang: Lang; label: string }) {
  const [open, setOpen] = useState(false);
  const { season } = useSeason();
  const wrap = useRef<HTMLLIElement>(null);
  const timer = useRef<number>();
  const id = useId();
  const t = STAY_COPY[lang], names = PR_COPY[lang].rooms;

  const later = (v: boolean, ms: number) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(v), ms); };
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); (wrap.current?.querySelector('button') as HTMLButtonElement | null)?.focus(); } };
    const down = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const hash = () => setOpen(false);
    window.addEventListener('keydown', key); window.addEventListener('pointerdown', down); window.addEventListener('hashchange', hash);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', down); window.removeEventListener('hashchange', hash); };
  }, [open]);

  const cards = [
    { kind: 'pension' as const, ...t.pension, external: false },
    { kind: 'chalet' as const, ...t.chalet, external: true },
  ];

  return (
    <li ref={wrap} onPointerEnter={(e) => e.pointerType === 'mouse' && later(true, 90)} onPointerLeave={(e) => e.pointerType === 'mouse' && later(false, 220)}
      onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}
        className="js-head nav-link relative inline-flex min-h-11 items-center gap-1.5 opacity-90 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-champagne">
        {label}
        <Chevron className={`rotate-90 transition-transform duration-300 ${open ? '-rotate-90' : ''}`} />
      </button>

      {/* centred under the whole header (the fixed header is the containing block); top padding bridges the pointer */}
      <div id={id} data-open={open} className="stay-menu absolute left-1/2 top-full pt-4" style={{ width: 'min(1000px, calc(100vw - 64px))' }}>
        <div className="grid grid-cols-[1fr_1fr_1.08fr] overflow-hidden rounded-[22px] bg-[#FAF8F5] text-ink shadow-[0_30px_70px_-30px_rgba(10,20,15,.55)] ring-1 ring-black/5">
          {cards.map((c, i) => (
            <a key={c.kind} href={c.href} onClick={() => setOpen(false)} style={{ ['--i' as string]: i }}
              className="sm-item group flex flex-col border-r border-ink/[.07] outline-none focus-visible:bg-white">
              <div className="relative h-[178px] overflow-hidden">
                <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]"><Thumb kind={c.kind} season={season} alt={c.title} /></div>
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[.2em] text-ink">{c.chip}</span>
              </div>
              <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
                <span className="font-display text-[23px] leading-tight text-ink">{c.title}</span>
                <span className="mt-1.5 text-[13.5px] leading-relaxed text-ink/65">{c.text}</span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[11.5px] font-semibold uppercase tracking-[.2em] text-goldink">
                  {t.more}<Chevron className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </a>
          ))}
          <div className="sm-item flex flex-col px-5 py-5" style={{ ['--i' as string]: 2 }}>
            <p className="px-2 text-[10.5px] font-semibold uppercase tracking-[.26em] text-goldink">{t.categories}</p>
            <ul className="mt-2.5 flex flex-col">
              {ROOM_KEYS.map((k) => {
                const r = roomData(k);
                return (
                  <li key={k}>
                    <a href={roomRoute(k)} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-[14px] px-2 py-2.5 outline-none transition-colors hover:bg-white focus-visible:bg-white">
                      <span className="lnum grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/12 text-[13px] font-semibold text-ink/80 transition-colors group-hover:border-pine group-hover:bg-pine group-hover:text-white">{r.count}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold text-ink">{names[k].name}</span>
                        <span className="block text-[12.5px] text-ink/55">{t.upTo(r.guests)}</span>
                      </span>
                      <Chevron className="shrink-0 text-ink/40 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-pine" />
                    </a>
                  </li>
                );
              })}
            </ul>
            <a href={ROOMS_ROUTE} onClick={() => setOpen(false)} className="sm-all mt-auto inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full px-5 text-[11.5px] font-semibold uppercase tracking-[.2em]">
              {t.all}<Chevron />
            </a>
          </div>
        </div>
      </div>
    </li>
  );
}

/** Mobile: the same content as an accordion inside the full-screen menu. */
export function StayAccordion({ lang, label, onNavigate }: { lang: Lang; label: string; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const t = STAY_COPY[lang], names = PR_COPY[lang].rooms;
  return (
    <li className="js-mm-item border-b border-ivory/10">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}
        className="flex min-h-[60px] w-full items-center justify-between text-left font-display text-[34px] font-medium leading-none">
        {label}
        <span aria-hidden className={`text-xl text-champagne transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      <div id={id} className="grid transition-[grid-template-rows] duration-500 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <ul className="flex flex-col gap-1 pb-5" {...(!open ? { inert: '' as unknown as boolean } : {})}>
            {[t.pension, t.chalet].map((c) => (
              <li key={c.title}>
                <a href={c.href} onClick={onNavigate} className="flex min-h-12 items-center justify-between rounded-[12px] text-[19px] font-medium">
                  <span>{c.title}<span className="ml-2 text-[11px] font-semibold uppercase tracking-[.18em] text-champagne/80">{c.chip}</span></span>
                  <span aria-hidden className="text-champagne">→</span>
                </a>
              </li>
            ))}
            <li className="mt-2 text-[10.5px] font-semibold uppercase tracking-[.26em] text-ivory/50">{t.categories}</li>
            {ROOM_KEYS.map((k) => {
              const r = roomData(k);
              return (
                <li key={k}>
                  <a href={roomRoute(k)} onClick={onNavigate} className="flex min-h-12 items-center gap-3 text-[16px]">
                    <span className="lnum grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ivory/25 text-[12.5px] font-semibold">{r.count}</span>
                    <span className="min-w-0 flex-1 truncate">{names[k].name}</span>
                    <span className="shrink-0 text-[12.5px] text-ivory/55">{t.upTo(r.guests)}</span>
                  </a>
                </li>
              );
            })}
            <li><a href={ROOMS_ROUTE} onClick={onNavigate} className="mt-1 inline-flex min-h-11 items-center gap-2 text-[12px] font-semibold uppercase tracking-[.2em] text-champagne">{t.all} →</a></li>
          </ul>
        </div>
      </div>
    </li>
  );
}
