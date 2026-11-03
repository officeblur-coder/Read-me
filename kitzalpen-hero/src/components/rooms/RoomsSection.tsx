import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { ROOMS, ROOMS_COPY } from '../../content/rooms';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { RoomsGallery } from './RoomsGallery';
import { RoomFeatures } from './RoomFeatures';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Fine line drawing of a ridge, in the spirit of an engraved map – drawn on as the section appears. */
function Ridge() {
  return (
    <svg aria-hidden viewBox="0 0 420 150" fill="none" className="js-ridge pointer-events-none absolute right-[4%] top-10 hidden w-[min(34vw,440px)] text-pine/25 lg:block">
      <path d="M2 148 C 60 120, 92 112, 128 92 S 176 70, 196 44 L 214 22 L 228 34 L 246 12 L 266 40 C 290 66, 322 86, 352 108 S 398 136, 418 148" stroke="currentColor" strokeWidth="1.1" />
      <path d="M196 44 L 205 62 L 214 52 L 222 74 M246 12 L 252 38 L 262 32 L 270 60 M128 92 L 146 98 L 160 86" stroke="currentColor" strokeWidth=".8" />
      <path d="M80 148 C 130 132, 168 126, 210 110 S 270 100, 300 118 S 360 140, 400 148" stroke="currentColor" strokeWidth=".7" opacity=".7" />
    </svg>
  );
}

/**
 * Section 02 – Unsere Zimmer.
 * The cream sheet rises out of the dark hero, then: centred heading,
 * features column on the left, large room gallery on the right.
 */
export function RoomsSection({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const copy = ROOMS_COPY[lang];
  const reduced = useReducedMotion();
  const fine = useFinePointer();

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);

    // hand-over from the hero: the cream sheet rises and opens to full width (scrubbed)
    gsap.fromTo(sheet.current,
      { clipPath: 'inset(0% 4% 0% 4% round 40px 40px 0px 0px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 25%', scrub: 0.5 } });

    // a slow drift on the ridge drawing (scroll, not mouse)
    gsap.fromTo(q('.js-ridge'), { y: 30 }, { y: -30, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });

    // reveal once the section is reached
    gsap.set(q('.js-r-eyebrow, .js-r-sub, .js-rf, .js-r-cta'), { autoAlpha: 0 });
    gsap.set(q('.js-r-line'), { yPercent: 110 });
    gsap.set(q('.js-rg-mask'), { clipPath: 'inset(8% 6% 8% 6% round 14px)' });
    gsap.set(q('.js-rg-zoom'), { scale: 1.1 });
    gsap.set(q('.js-rg-thumb'), { autoAlpha: 0, y: 20 });
    gsap.set(q('.js-ridge path'), { strokeDasharray: 900, strokeDashoffset: 900 });

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tl.fromTo(q('.js-r-eyebrow'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.2)
      .to(q('.js-r-line'), { yPercent: 0, duration: 0.75, ease: 'power4.out' }, 0.35)
      .fromTo(q('.js-r-sub'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.6)
      .to(q('.js-ridge path'), { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut', stagger: 0.15 }, 0.3)
      .to(q('.js-rg-mask'), { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.8, ease: 'power3.inOut' }, 0.5)
      .to(q('.js-rg-zoom'), { scale: 1, duration: 1.1, ease: 'power2.out' }, 0.5)
      .fromTo(q('.js-rf'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, 0.7)
      .to(q('.js-rg-thumb'), { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07 }, 0.9)
      .fromTo(q('.js-r-cta'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 1.1);

    ScrollTrigger.create({ trigger: root.current, start: 'top 62%', once: true, onEnter: () => tl.play() });
  }, { scope: root, dependencies: [reduced] });

  return (
    <section ref={root} id="zimmer" aria-labelledby="rooms-title" className="relative bg-charcoal">
      <div ref={sheet} className="relative overflow-hidden bg-cream text-ink">
        <Ridge />
        <div className="relative mx-auto max-w-[1360px] px-5 pb-20 pt-16 sm:px-6 md:px-10 md:pb-28 md:pt-24 lg:px-14 lg:pb-32 lg:pt-28">
          {/* centred heading */}
          <header className="mx-auto max-w-[760px] text-center">
            <p className="js-r-eyebrow flex items-center justify-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] text-ink/80 md:text-[13px]">
              <span aria-hidden className="h-px w-8 bg-ink/40 md:w-12" />{copy.eyebrow}<span aria-hidden className="h-px w-8 bg-ink/40 md:w-12" />
            </p>
            <h2 id="rooms-title" className="mt-4 overflow-hidden pb-[0.1em] font-display font-medium italic leading-[1.02] tracking-[-0.01em] text-ink md:mt-5" style={{ fontSize: 'clamp(40px, 6vw, 84px)' }}>
              <span className="js-r-line block [text-wrap:balance]">{copy.headline}</span>
            </h2>
            <p className="js-r-sub mx-auto mt-4 max-w-[52ch] text-[15.5px] leading-[1.65] text-ink/75 md:mt-5 md:text-[18px]">{copy.sub}</p>
            <p className="js-r-sub mt-3 text-[12px] font-semibold uppercase tracking-[.18em] text-[#8a6a2f] md:text-[13px]">{copy.total}</p>
          </header>

          {/* features left · gallery right (mobile: gallery, then features) */}
          <div className="mt-10 grid gap-9 md:mt-14 lg:mt-16 lg:grid-cols-12 lg:gap-12">
            <div className="min-w-0 lg:order-2 lg:col-span-9">
              <RoomsGallery rooms={ROOMS} copy={copy} lang={lang} fine={fine && !reduced} reduced={reduced} />
            </div>
            <div className="flex min-w-0 flex-col items-center lg:order-1 lg:col-span-3 lg:items-stretch lg:justify-center">
              <div className="w-full"><RoomFeatures features={copy.features} /></div>
              <div className="js-r-cta mt-9 lg:mt-10">
                <a href={copy.ctaHref} className="btn-pine inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full px-9 text-[16px] font-semibold">
                  {copy.cta} <span className="arrow" aria-hidden>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
