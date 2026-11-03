import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { ROOM_PHOTOS, ROOMS_COPY } from '../../content/rooms';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { RoomsGallery } from './RoomsGallery';
import { RoomFeatures } from './RoomFeatures';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Section 02 – Unsere Zimmer.
 * Layout: the cream sheet rises out of the hero (it widens and loses its
 * rounded top while scrolling), then an asymmetric editorial grid:
 * headline block on top, features column left, large gallery right.
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

    // 1) hand-over from the hero: the cream sheet rises and opens up (scrubbed)
    gsap.fromTo(sheet.current,
      { clipPath: 'inset(0% 4% 0% 4% round 40px 40px 0px 0px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 25%', scrub: 0.5 } });

    // 2) content reveal, once, when the section is actually reached
    gsap.set(q('.js-r-eyebrow, .js-rf, .js-r-sub, .js-r-cta'), { autoAlpha: 0 });
    gsap.set(q('.js-r-line'), { yPercent: 110 });
    gsap.set(q('.js-rg-mask'), { clipPath: 'inset(8% 6% 8% 6%)' });
    gsap.set(q('.js-rg-zoom'), { scale: 1.1 });
    gsap.set(q('.js-rg-thumb'), { autoAlpha: 0, y: 20 });

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tl.fromTo(q('.js-r-eyebrow'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.2)
      .to(q('.js-r-line'), { yPercent: 0, duration: 0.75, stagger: 0.12, ease: 'power4.out' }, 0.35)
      .fromTo(q('.js-r-sub'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.6)
      .to(q('.js-rg-mask'), { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'power3.inOut' }, 0.5)
      .to(q('.js-rg-zoom'), { scale: 1, duration: 1.1, ease: 'power2.out' }, 0.5)
      .fromTo(q('.js-rf'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, 0.7)
      .to(q('.js-rg-thumb'), { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06 }, 0.9)
      .fromTo(q('.js-r-cta'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 1.1);

    ScrollTrigger.create({ trigger: root.current, start: 'top 62%', once: true, onEnter: () => tl.play() });
  }, { scope: root, dependencies: [reduced] });

  return (
    <section ref={root} id="zimmer" aria-labelledby="rooms-title" className="relative bg-charcoal">
      <div ref={sheet} className="bg-cream text-ink">
        <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-16 sm:px-6 md:px-10 md:pb-28 md:pt-24 lg:px-14 lg:pb-36 lg:pt-32">
          {/* heading block */}
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10">
            <div className="lg:col-span-7">
              <p className="js-r-eyebrow flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[.32em] text-[#8a6a2f]">
                <span aria-hidden className="h-px w-8 bg-gold" />{copy.eyebrow}
              </p>
              <h2 id="rooms-title" className="mt-5 font-display font-medium leading-[0.95] tracking-[-0.015em] text-pine" style={{ fontSize: 'clamp(46px, 7.2vw, 112px)' }}>
                <span className="block overflow-hidden pb-[0.06em]"><span className="js-r-line block">{copy.headline[0]}</span></span>
                <span className="block overflow-hidden pb-[0.1em]"><span className="js-r-line block italic">{copy.headline[1]}</span></span>
              </h2>
            </div>
            <p className="js-r-sub max-w-[46ch] text-[16px] leading-[1.7] text-ink/75 md:text-[17px] lg:col-span-5 lg:pb-4">{copy.sub}</p>
          </div>

          {/* body: features left, gallery right (mobile: gallery first) */}
          <div className="mt-10 grid gap-10 md:mt-14 lg:mt-20 lg:grid-cols-12 lg:gap-10">
            <div className="min-w-0 lg:order-2 lg:col-span-8">
              <RoomsGallery photos={ROOM_PHOTOS} copy={copy} lang={lang} fine={fine && !reduced} reduced={reduced} />
            </div>
            <div className="flex min-w-0 flex-col lg:order-1 lg:col-span-4 lg:pr-6">
              <RoomFeatures features={copy.features} />
              <div className="js-r-cta mt-10 lg:mt-12">
                <a href={copy.ctaHref} className="btn-pine inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full px-8 text-[15px] font-semibold sm:w-auto">
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
