import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Lang } from '../../content/hero';
import { TOUR_COPY, TOUR_URL } from '../../content/tour';
import { useReducedMotion } from '../../lib/hooks';

/** 360° icon */
export const Icon360 = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <ellipse cx="12" cy="12" rx="9.5" ry="4" /><path d="M12 8a4 9.5 0 0 1 0 8" opacity=".55" /><path d="m17.5 15.2 2.4.9-.9 2.3" />
  </svg>
);

/**
 * Full-screen overlay that plays the 3DVista tour in place (iframe) – nothing opens in a new tab.
 * It grows as a circle out of the button that was pressed; the iframe is only created on first open.
 */
export function VirtualTour({ lang }: { lang: Lang }) {
  const t = TOUR_COPY[lang];
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const origin = useRef({ x: 50, y: 50 });
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ x?: number; y?: number }>).detail || {};
      origin.current = { x: d.x != null ? (d.x / window.innerWidth) * 100 : 50, y: d.y != null ? (d.y / window.innerHeight) * 100 : 50 };
      opener.current = document.activeElement;
      setOpen(true);
    };
    window.addEventListener('kitzalpen:tour', on);
    return () => window.removeEventListener('kitzalpen:tour', on);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSlow(false);
    const slowId = window.setTimeout(() => setSlow(true), 6000);
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = 'hidden';
    closeBtn.current?.focus({ preventScroll: true });
    const { x, y } = origin.current;
    if (!reduced && panel.current) gsap.fromTo(panel.current, { clipPath: `circle(0% at ${x}% ${y}%)` }, { clipPath: `circle(150% at ${x}% ${y}%)`, duration: 0.9, ease: 'expo.inOut', clearProps: 'clipPath' });
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', key);
    return () => { window.clearTimeout(slowId); html.style.overflow = prev; window.removeEventListener('keydown', key); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    const done = () => { setOpen(false); (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true }); };
    if (reduced || !panel.current) return done();
    const { x, y } = origin.current;
    gsap.to(panel.current, { clipPath: `circle(0% at ${x}% ${y}%)`, duration: 0.6, ease: 'expo.in', onComplete: done });
  };

  if (!open) return null;
  return (
    <div ref={panel} role="dialog" aria-modal="true" aria-label={t.title} className="fixed inset-0 z-[95] bg-deep text-cream">
      {TOUR_URL ? (
        <>
          {!loaded && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="flex flex-col items-center gap-4 text-cream/80"><span className="vt-spin text-gold-light"><Icon360 size={44} /></span><span className="text-[14px] font-semibold tracking-[.08em]">{t.loading}</span></div>
            </div>
          )}
          <iframe src={TOUR_URL} title={t.title} onLoad={() => setLoaded(true)} allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer; magnetometer" allowFullScreen
            className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`} />
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <div className="max-w-[460px]">
            <span className="vt-spin mx-auto grid h-20 w-20 place-items-center rounded-full border border-gold-light/40 text-gold-light"><Icon360 size={40} /></span>
            <p className="mt-6 font-display text-[34px] italic leading-tight">{t.soon}</p>
            <p className="mt-3 text-[15.5px] text-cream/70">{t.soonText}</p>
          </div>
        </div>
      )}
      {TOUR_URL && slow && (
        <a href={TOUR_URL} target="_blank" rel="noopener noreferrer" className="absolute bottom-[max(18px,env(safe-area-inset-bottom))] left-1/2 z-10 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-cream/95 px-5 text-[13.5px] font-semibold text-deep shadow-[0_10px_30px_-10px_rgba(0,0,0,.6)]">
          {t.direct} ↗
        </a>
      )}
      <button ref={closeBtn} type="button" onClick={close} aria-label={t.close}
        className="absolute right-[max(16px,env(safe-area-inset-right))] top-[max(16px,env(safe-area-inset-top))] z-10 grid h-12 w-12 place-items-center rounded-full bg-cream/95 text-deep shadow-[0_10px_30px_-10px_rgba(0,0,0,.6)] transition-transform hover:rotate-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </div>
  );
}
