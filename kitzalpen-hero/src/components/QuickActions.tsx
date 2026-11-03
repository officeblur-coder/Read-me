import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Lang } from '../content/hero';
import { QUICK_ACTIONS } from '../content/amenities';

const WA = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.3.2-1.5-.1-.1-.3-.2-.6-.3ZM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.3c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.3 8.3 0 1 1 12 20.3Z" /></svg>
);
const HOUSE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
);
const BED = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" /><path d="M3 18h18" /><path d="M5 9V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" /><path d="M8 9V7h3v2M13 9V7h3v2" /></svg>
);

/**
 * Global quick actions (one instance, mounted in App).
 * Mobile: sticky bar at the bottom, appears after the hero (the hero has its own
 * booking bar) and turns compact while scrolling down.
 * Desktop: a slim dock on the left edge, labels slide out on hover – like the live site.
 */
export function QuickActions({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const t = QUICK_ACTIONS.label[lang];
  const [shown, setShown] = useState(false);
  const [compact, setCompact] = useState(false);
  const bar = useRef<HTMLElement>(null);
  const dock = useRef<HTMLElement>(null);

  useEffect(() => {
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      setShown(y > window.innerHeight * 0.75);
      if (Math.abs(y - last) > 6) { setCompact(y > last); last = y; }
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    const d = reduced ? 0 : 0.6;
    gsap.to(bar.current, { yPercent: shown ? 0 : 130, autoAlpha: shown ? 1 : 0, duration: d, ease: shown ? 'power3.out' : 'power2.in' });
    gsap.to(dock.current, { x: shown ? 0 : -90, autoAlpha: shown ? 1 : 0, duration: d, ease: 'power3.out' });
    if (shown && !reduced) gsap.fromTo(bar.current?.querySelectorAll('a') ?? [], { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.07, ease: 'power3.out', delay: 0.1 });
  }, [shown, reduced]);

  const items = [
    { href: QUICK_ACTIONS.whatsapp, label: t.whatsapp, sub: '+40 748 192 821', icon: WA, cls: 'qa-wa' },
    { href: QUICK_ACTIONS.chalet, label: t.chalet, sub: 'KitzAlpen Chalet', icon: HOUSE, cls: 'qa-chalet' },
    { href: QUICK_ACTIONS.room, label: t.room, sub: 'Pension · 17 Zimmer', icon: BED, cls: 'qa-room' },
  ];

  return (
    <>
      {/* mobile */}
      <nav ref={bar} aria-label={t.nav} className="invisible fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-cream via-cream/90 to-cream/0 px-[max(14px,env(safe-area-inset-left))] pt-4 md:hidden" style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="mx-auto grid max-w-[560px] grid-cols-3 gap-2.5">
          {items.map((it) => (
            <a key={it.cls} href={it.href} target="_blank" rel="noopener noreferrer" className={`qa ${it.cls} flex flex-col items-center justify-center gap-1 rounded-[16px] px-1.5 text-[11.5px] font-semibold leading-none min-[380px]:text-[13px] transition-[min-height,padding] duration-300 ${compact ? 'min-h-[46px] flex-row gap-2' : 'min-h-[60px]'}`}>
              <span className={`transition-transform duration-300 ${compact ? 'scale-90' : ''}`}>{it.icon}</span>
              <span className="truncate">{it.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* desktop dock */}
      <nav ref={dock} aria-label={t.nav} className="qa-dock invisible fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 md:block">
        <div className="flex flex-col gap-2 rounded-[22px] border border-gold/30 bg-[#071C16]/85 p-2 shadow-[0_20px_50px_rgba(0,0,0,.28)] backdrop-blur-xl">
          {items.map((it) => (
            <a key={it.cls} href={it.href} target="_blank" rel="noopener noreferrer" title={it.label} className="qa-dock-item group/q flex items-center rounded-[16px] p-1 text-cream transition-colors hover:bg-cream/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
              <span className={`qa ${it.cls} grid h-11 w-11 shrink-0 place-items-center rounded-[13px]`}>{it.icon}</span>
              <span className="qa-dock-label flex flex-col overflow-hidden whitespace-nowrap">
                <span className="text-[14px] font-semibold leading-tight">{it.label}</span>
                <span className="text-[11px] uppercase tracking-[.12em] text-cream/55">{it.sub}</span>
              </span>
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}
