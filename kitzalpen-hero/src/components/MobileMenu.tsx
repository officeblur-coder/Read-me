import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { NAV, type Copy, type Lang } from '../content/hero';
import { Logo } from './Logo';
import { LangSwitch } from './Header';
import { BOOKING_ENGINE } from './BookingBar';
import { StayAccordion } from './StayMenu';

interface Props { open: boolean; lang: Lang; copy: Copy; reduced: boolean; onClose: () => void; onLang: (l: Lang) => void; onBook?: () => void }

/** Full-screen forest panel. Opening plays a timeline, closing reverses it. */
export function MobileMenu({ open, lang, copy, reduced, onClose, onLang }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useGSAP(() => {
    tl.current = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
      .set(root.current, { visibility: 'visible' })
      .fromTo(root.current, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'power3.inOut' })
      .fromTo('.js-mm-item', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.06 }, '-=0.25')
      .fromTo('.js-mm-foot', { opacity: 0 }, { opacity: 1, duration: 0.4 }, '-=0.3');
  }, { scope: root });

  useEffect(() => {
    if (root.current) (root.current as HTMLElement & { inert: boolean }).inert = !open;
    const t = tl.current;
    if (!t) return;
    if (reduced) t.timeScale(20);
    if (open) { t.timeScale(reduced ? 20 : 1).play(); closeBtn.current?.focus({ preventScroll: true }); }
    else { t.timeScale(reduced ? 20 : 1.4).reverse(); }
    document.documentElement.style.overflow = open ? 'hidden' : '';
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, reduced, onClose]);

  return (
    <div
      id="mobile-menu"
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-label="Menü"
      className="fixed inset-0 z-50 flex flex-col bg-forest-deep text-ivory lg:hidden"
      style={{ visibility: 'hidden', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-between px-[max(16px,env(safe-area-inset-left))] py-5">
        <Logo className="w-[148px]" />
        <div className="flex items-center gap-2">
          <LangSwitch lang={lang} onLang={onLang} label={copy.lang} />
          <button ref={closeBtn} type="button" onClick={onClose} aria-label={copy.close} className="grid h-11 w-11 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-champagne">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M5 5l14 14M19 5 5 19" /></svg>
          </button>
        </div>
      </div>

      <nav aria-label="Hauptnavigation" className="flex-1 overflow-y-auto px-[max(24px,env(safe-area-inset-left))] pt-6">
        <ul className="flex flex-col">
          {NAV[lang].map((n, i) => n.mega ? <StayAccordion key="stay" lang={lang} label={n.label} onNavigate={onClose} /> : (
            <li key={i} className="js-mm-item border-b border-ivory/10">
              <a href={n.href} onClick={onClose} className="flex min-h-[60px] items-center justify-between font-display text-[34px] font-medium leading-none">
                {n.label}
                <span aria-hidden className="text-champagne text-xl">→</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="js-mm-foot px-[max(24px,env(safe-area-inset-left))] pb-8 pt-6">
        <a href={BOOKING_ENGINE} target="_blank" rel="noopener noreferrer" onClick={onClose} className="btn-gold flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full text-[16px] font-semibold">
          {copy.cta} <span className="arrow" aria-hidden>→</span>
        </a>
        <p className="mt-5 text-center text-[13px] text-ivory/60">{copy.address}</p>
      </div>
    </div>
  );
}
