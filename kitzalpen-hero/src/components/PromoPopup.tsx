import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Lang } from '../content/hero';
import { QUICK_ACTIONS } from '../content/amenities';
import { useSeason } from '../lib/season';

/**
 * Winter offer pop-up (owner's creative: "Book 5 nights and get 1 night free").
 * Shows once per visit, never in the first 8 s: after ~20 s, after half of the page has been read,
 * or (desktop) when the pointer leaves towards the browser bar. Closed → quiet for 2 days.
 */
const KEY = 'kitzalpen-promo-closed';
const QUIET = 2 * 24 * 3600 * 1000;
const COPY = {
  de: { eyebrow: 'Winterangebot', title: '5 Nächte buchen –', title2: '1 Nacht geschenkt.', text: 'Bei uns in Hollersbach, fünf Minuten von der Panoramabahn ins Skigebiet KitzSki. Details und Verfügbarkeit auf Anfrage.', book: 'Jetzt buchen', wa: 'Fragen per WhatsApp', close: 'Schließen', waText: 'Hallo KitzAlpen, ich interessiere mich für das Winterangebot 5 Nächte + 1 Nacht gratis.' },
  en: { eyebrow: 'Winter offer', title: 'Book 5 nights –', title2: 'get 1 night free.', text: 'With us in Hollersbach, five minutes from the Panoramabahn into the KitzSki ski area. Details and availability on request.', book: 'Book now', wa: 'Questions on WhatsApp', close: 'Close', waText: 'Hello KitzAlpen, I am interested in the winter offer 5 nights + 1 night free.' },
};

export function PromoPopup({ lang, reduced, blocked }: { lang: Lang; reduced: boolean; blocked: boolean }) {
  const { season } = useSeason();
  const [open, setOpen] = useState(false);
  const done = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const t = COPY[lang];

  useEffect(() => {
    if (season !== 'winter') return;
    try { const c = Number(localStorage.getItem(KEY) || 0); if (Date.now() - c < QUIET || sessionStorage.getItem(KEY)) return; } catch { /* storage blocked: still fine */ }
    const t0 = Date.now();
    const show = () => { if (done.current || Date.now() - t0 < 8000) return; done.current = true; setOpen(true); };
    const timer = window.setTimeout(show, 20000);
    const onScroll = () => { const h = document.documentElement; if (h.scrollTop / Math.max(1, h.scrollHeight - innerHeight) > 0.5) show(); };
    const onLeave = (e: MouseEvent) => { if (e.clientY <= 0 && matchMedia('(pointer: fine)').matches) show(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mouseout', onLeave);
    return () => { window.clearTimeout(timer); window.removeEventListener('scroll', onScroll); document.removeEventListener('mouseout', onLeave); };
  }, [season]);

  // never on top of an open menu / panel: wait until it is closed
  const visible = open && !blocked;
  useEffect(() => {
    if (!visible || !box.current) return;
    const prev = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    if (!reduced) gsap.fromTo(box.current, { autoAlpha: 0, y: 30, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' });
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab' && box.current) {
        const f = [...box.current.querySelectorAll<HTMLElement>('a, button')];
        const i = f.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); prev?.focus?.(); };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    setOpen(false);
    try { localStorage.setItem(KEY, String(Date.now())); sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  };
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="presentation">
      <button type="button" aria-label={t.close} tabIndex={-1} onClick={close} className="promo-backdrop absolute inset-0" />
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="promo-title" className="promo-card relative grid w-full max-w-[860px] overflow-hidden rounded-[26px] md:grid-cols-[1.05fr_1fr]">
        <button ref={closeBtn} type="button" onClick={close} aria-label={t.close} className="absolute left-3 top-3 z-10 grid h-11 w-11 md:left-auto md:right-3 place-items-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <img src={`${import.meta.env.BASE_URL}images/promo/winter-5-1.webp`} alt={`${t.title} ${t.title2}`} className="aspect-square h-full max-h-[46vh] w-full object-cover md:max-h-none" />
        <div className="flex flex-col justify-center p-6 md:p-9">
          <p className="text-[12px] font-semibold uppercase tracking-[.3em] text-goldink">{t.eyebrow}</p>
          <h2 id="promo-title" className="mt-3 font-display font-medium leading-[1.02] text-pine" style={{ fontSize: 'clamp(30px, 3.6vw, 46px)' }}>{t.title}<br /><em className="text-[#b5162b]">{t.title2}</em></h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink/75">{t.text}</p>
          <div className="mt-6 flex flex-col gap-3">
            <a href={QUICK_ACTIONS.room} target="_blank" rel="noopener noreferrer" onClick={close} className="ph-primary inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-6 text-[15.5px] font-semibold">{t.book} ↗</a>
            <a href={`https://wa.me/40748192821?text=${encodeURIComponent(t.waText)}`} target="_blank" rel="noopener noreferrer" onClick={close} className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-pine/20 px-6 text-[15px] font-semibold text-pine hover:border-pine">{t.wa}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
