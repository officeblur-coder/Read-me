import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Lang } from '../content/hero';
import { QUICK_ACTIONS } from '../content/amenities';
import { useSeason } from '../lib/season';

const IMG = `${import.meta.env.BASE_URL}images/`;

const WA = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[22px] w-[22px]" aria-hidden><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.3.2-1.5-.1-.1-.3-.2-.6-.3ZM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.3c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.3 8.3 0 1 1 12 20.3Z" /></svg>
);
const Cal = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);

/**
 * One calm "concierge" capsule instead of three loose buttons.
 *   [ WhatsApp ]  [ Buchen  ▴ ]
 * "Buchen" opens a small panel (desktop) / bottom sheet (mobile) with the two real
 * booking engines – Zimmer (Pension) and Chalet – each with a photo.
 * It appears after the hero (the hero has its own booking bar) and slims down while
 * scrolling down. Mount once (global).
 */
export function QuickActions({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const { season } = useSeason();
  const [shown, setShown] = useState(false);
  const [slim, setSlim] = useState(false);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const de = lang === 'de';
  const t = {
    nav: de ? 'Schnellaktionen' : 'Quick actions', book: de ? 'Buchen' : 'Book', wa: de ? 'Per WhatsApp schreiben' : 'Message on WhatsApp',
    title: de ? 'Was möchten Sie buchen?' : 'What would you like to book?', close: de ? 'Schließen' : 'Close',
    room: de ? 'Zimmer in der Pension' : 'Room in the guesthouse', roomSub: de ? '17 Zimmer · Frühstück im Haus' : '17 rooms · breakfast in house',
    chalet: de ? 'KitzAlpen Chalet' : 'KitzAlpen Chalet', chaletSub: de ? 'Eigenes Haus · bis 4 Gäste' : 'Private house · up to 4 guests',
    waLine: de ? 'Fragen? Schreiben Sie uns auf WhatsApp' : 'Questions? Message us on WhatsApp',
  };

  useEffect(() => {
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      setShown(y > window.innerHeight * 0.75);
      if (Math.abs(y - last) > 8) { setSlim(y > last); last = y; }
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { if (!shown) setOpen(false); }, [shown]);

  useEffect(() => {
    gsap.to(root.current, { y: shown ? 0 : 120, autoAlpha: shown ? 1 : 0, duration: reduced ? 0 : 0.7, ease: shown ? 'expo.out' : 'power2.in' });
  }, [shown, reduced]);

  useEffect(() => {
    const p = panel.current;
    if (!p) return;
    if (open) {
      gsap.set(p, { display: 'block' });
      gsap.fromTo(p, { autoAlpha: 0, y: 16, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: reduced ? 0 : 0.45, ease: 'power3.out' });
      gsap.fromTo(p.querySelectorAll('.qa-opt'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: reduced ? 0 : 0.5, stagger: 0.07, ease: 'power3.out', delay: 0.05 });
      const off = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
      const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
      window.addEventListener('pointerdown', off); window.addEventListener('keydown', esc);
      return () => { window.removeEventListener('pointerdown', off); window.removeEventListener('keydown', esc); };
    }
    gsap.to(p, { autoAlpha: 0, y: 10, duration: reduced ? 0 : 0.25, ease: 'power2.in', onComplete: () => { gsap.set(p, { display: 'none' }); } });
  }, [open, reduced]);

  const opts = [
    { href: QUICK_ACTIONS.room, label: t.room, sub: t.roomSub, img: 'rooms/room-1-800.webp' },
    { href: QUICK_ACTIONS.chalet, label: t.chalet, sub: t.chaletSub, img: `chalet/${season === 'winter' ? 'winter' : 'summer'}-800.webp` },
  ];

  return (
    <div
      ref={root}
      role="navigation"
      aria-label={t.nav}
      className="qa-root invisible fixed bottom-0 left-1/2 z-40 w-[min(100%-24px,420px)] -translate-x-1/2 lg:left-auto lg:right-6 lg:w-auto lg:translate-x-0"
      style={{ marginBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* panel / sheet */}
      <div ref={panel} id="qa-panel" role="dialog" aria-label={t.title} className="qa-panel absolute bottom-[calc(100%+10px)] left-0 right-0 hidden rounded-[22px] p-3 lg:left-auto lg:w-[380px]">
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <p className="font-display text-[22px] italic text-cream">{t.title}</p>
          <button type="button" onClick={() => setOpen(false)} aria-label={t.close} className="grid h-10 w-10 place-items-center rounded-full text-cream/70 hover:bg-cream/10 hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {opts.map((o) => (
            <li key={o.href} className="qa-opt">
              <a href={o.href} target="_blank" rel="noopener noreferrer" className="qa-card group flex items-center gap-3.5 rounded-[16px] p-2 pr-4">
                <span className="h-[64px] w-[84px] shrink-0 overflow-hidden rounded-[12px]"><img src={IMG + o.img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15.5px] font-semibold leading-tight text-cream">{o.label}</span>
                  <span className="mt-0.5 block text-[12.5px] text-cream/60">{o.sub}</span>
                </span>
                <span aria-hidden className="qa-go grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/50 text-gold-light">↗</span>
              </a>
            </li>
          ))}
        </ul>
        <a href={QUICK_ACTIONS.whatsapp} target="_blank" rel="noopener noreferrer" className="qa-opt mt-2 flex min-h-11 items-center justify-center gap-2 rounded-[14px] text-[13px] font-medium text-cream/75 hover:text-cream">
          <span className="text-[#5ec27a]">{WA}</span>{t.waLine}
        </a>
      </div>

      {/* the capsule */}
      <div className={`qa-capsule flex items-center gap-1.5 rounded-full p-1.5 transition-[padding] duration-300 ${slim ? 'lg:p-1' : ''}`}>
        <a href={QUICK_ACTIONS.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={t.wa} title="WhatsApp · +40 748 192 821"
          className={`qa-wa grid shrink-0 place-items-center rounded-full transition-[width,height] duration-300 ${slim ? 'h-11 w-11' : 'h-12 w-12'}`}>
          {WA}
        </a>
        <button ref={trigger} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="qa-panel"
          className={`qa-book flex flex-1 items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-semibold transition-[height] duration-300 lg:flex-none lg:px-7 ${slim ? 'h-11' : 'h-12'}`}>
          <Cal /> {t.book}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden className={`transition-transform duration-300 ${open ? '' : 'rotate-180'}`}><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>
    </div>
  );
}
