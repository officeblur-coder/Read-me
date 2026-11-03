import { useCallback, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Copy, Lang, Season } from '../content/hero';
import { useFinePointer, useIsMobile, useMagnetic, useReducedMotion, useSize } from '../lib/hooks';
import { SeasonCompare, type SeasonCompareHandle } from './SeasonCompare';
import { SeasonToggle } from './SeasonToggle';
import { SeasonFx } from './SeasonFx';
import { BookingBar, type BookingBarHandle, type BookingRequest } from './BookingBar';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface Props {
  lang: Lang;
  copy: Copy;
  bookingRef: React.RefObject<BookingBarHandle>;
  onBookingSubmit: (r: BookingRequest) => void;
}

export function Hero({ lang, copy, bookingRef, onBookingSubmit }: Props) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const compare = useRef<SeasonCompareHandle>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const { w, h } = useSize(stage);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const mobile = useIsMobile();
  const [season, setSeason] = useState<Season>('summer');
  const [fx, setFx] = useState<Season | null>(null);
  useMagnetic(ctaRef, fine && !reduced);
  const ready = w > 0 && h > 0;

  const select = useCallback((s: Season) => { setSeason(s); compare.current?.goTo(s); }, []);

  // ---------------------------------------------------------------- intro
  useGSAP(() => {
    if (!ready) return;
    const q = gsap.utils.selector(root);
    if (reduced) { gsap.set(q('.js-veil'), { autoAlpha: 0 }); return; }
    const head = document.querySelectorAll('.js-head');
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to(q('.js-veil'), { autoAlpha: 0, duration: 0.5, ease: 'power1.out' }, 0)
      .fromTo(q('.js-intro'), { scale: 1.06 }, { scale: 1, duration: 1.1, ease: 'power2.out' }, 0.3)
      .fromTo(head, { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05 }, 0.6)
      .fromTo(q('.js-line-in'), { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.18, ease: 'power4.out' }, 0.9)
      .fromTo(q('.js-fade'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 1.3)
      .fromTo(q('.js-line-path'), { attr: { 'stroke-dasharray': '0 4000' } }, { attr: { 'stroke-dasharray': '4000 0' }, duration: 0.8, ease: 'power2.inOut' }, 1.5)
      .fromTo(q('.js-handle'), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 1.75)
      .fromTo(q('.js-toggle'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 1.6)
      .fromTo(q('.js-booking'), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 1.8)
      .add(() => q('.js-handle')[0]?.classList.add('hint'), 2.6);
  }, { scope: root, dependencies: [reduced, ready] });

  // ------------------------------------------------------- scroll cinematic
  useGSAP(() => {
    if (reduced || !ready) return;
    const q = gsap.utils.selector(root);
    const st = { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.6 };
    gsap.to(q('.js-zoom'), { scale: 1.08, ease: 'none', scrollTrigger: st });
    gsap.to(q('.js-copy'), { y: -70, autoAlpha: 0.15, ease: 'none', scrollTrigger: { ...st, end: '70% top' } });
    gsap.to(q('.js-booking-wrap'), { y: 30, autoAlpha: 0, ease: 'none', scrollTrigger: { ...st, start: '8% top', end: '45% top' } });
  }, { scope: root, dependencies: [reduced, ready] });

  // ---------------------------------------------------------- mouse parallax
  useGSAP(() => {
    if (!fine || reduced || !ready) return;
    const q = gsap.utils.selector(root);
    const photoX = gsap.quickTo(q('.js-parallax'), 'x', { duration: 1.2, ease: 'power3.out' });
    const photoY = gsap.quickTo(q('.js-parallax'), 'y', { duration: 1.2, ease: 'power3.out' });
    const copyX = gsap.quickTo(q('.js-copy-par'), 'x', { duration: 1.4, ease: 'power3.out' });
    const copyY = gsap.quickTo(q('.js-copy-par'), 'y', { duration: 1.4, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
      photoX(-nx * 20); photoY(-ny * 14);  // max ±10 / ±7 px
      copyX(nx * 8); copyY(ny * 6);        // text drifts the other way, slower plane
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, { scope: root, dependencies: [fine, reduced, ready] });

  return (
    <section ref={root} id="top" aria-label="KitzAlpen" className="hero relative h-[100svh] min-h-[600px] w-full overflow-hidden bg-charcoal text-ivory">
      <div ref={stage} className="absolute inset-0">
        <SeasonCompare ref={compare} width={w} height={h} mobile={mobile} reduced={reduced} copy={copy} onDominant={setSeason} onSettle={setFx} />
      </div>
      <SeasonFx mode={fx} mobile={mobile} reduced={reduced} />

      {/* copy */}
      <div className="js-copy pointer-events-none absolute inset-0 z-20">
        <div className="js-copy-par absolute inset-0">
          {/* desktop: left column, upper third */}
          <div className="absolute left-[max(16px,env(safe-area-inset-left))] right-[max(16px,env(safe-area-inset-right))] bottom-[calc(250px+env(safe-area-inset-bottom))] text-center md:bottom-auto md:left-10 md:right-auto md:top-[27%] md:max-w-[min(760px,52vw)] md:text-left lg:left-14">
            <p className="js-fade mb-3 text-[11.5px] font-semibold uppercase tracking-[.32em] text-ivory/90 md:hidden">
              {copy.subShort.join(' · ')}
            </p>
            <h1 className="font-display font-medium leading-[0.98] tracking-[-0.01em] text-ivory [text-shadow:0_2px_30px_rgba(0,0,0,.25)]">
              <span className="block overflow-hidden pb-[0.08em]"><span className="js-line-in block text-[clamp(44px,12vw,58px)] italic md:text-[clamp(56px,5.6vw,96px)] md:not-italic">{copy.headline[0]}</span></span>
              <span className="block overflow-hidden pb-[0.1em]"><span className="js-line-in block text-[clamp(31px,8.4vw,40px)] italic md:text-[clamp(44px,4.5vw,78px)]">{copy.headline[1]}</span></span>
            </h1>
            <span aria-hidden className="js-fade mx-auto mt-4 block h-[2px] w-16 bg-champagne md:mx-0 md:mt-6" />
            <p className="js-fade mt-5 hidden text-[13px] font-semibold uppercase tracking-[.3em] text-ivory/90 md:block lg:text-[14px]">
              {copy.sub.join(' · ')}
            </p>
            <div className="js-fade pointer-events-auto mt-9 hidden md:flex">
              <button ref={ctaRef} type="button" onClick={() => bookingRef.current?.focusArrival()} className="btn-gold inline-flex min-h-[52px] items-center gap-3 rounded-full px-8 text-[16px] font-semibold">
                {copy.cta} <span className="arrow" aria-hidden>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* season toggle + booking */}
      <div className="js-booking-wrap absolute inset-x-0 bottom-0 z-30 px-[max(16px,env(safe-area-inset-left))] pb-[calc(10px+env(safe-area-inset-bottom))] md:px-10 md:pb-6">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center gap-4 md:gap-5">
          <div className="js-toggle"><SeasonToggle active={season} copy={copy} onSelect={select} /></div>
          <div className="js-booking w-full"><BookingBar ref={bookingRef} copy={copy} lang={lang} onSubmit={onBookingSubmit} /></div>
        </div>
      </div>

      {/* intro veil: charcoal fade */}
      <div aria-hidden className="js-veil pointer-events-none absolute inset-0 z-50 bg-charcoal" />
    </section>
  );
}
