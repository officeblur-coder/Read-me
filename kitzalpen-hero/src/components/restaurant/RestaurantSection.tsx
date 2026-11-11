import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { MENU_PDF, REST_COPY, REST_PHOTOS } from '../../content/restaurant';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { RestaurantGallery } from './RestaurantGallery';
import { RestaurantHighlights } from './RestaurantHighlights';
import { RestaurantOpeningHours } from './RestaurantOpeningHours';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function RestaurantSection({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const copy = REST_COPY[lang];
  const reduced = useReducedMotion();
  const fine = useFinePointer();

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.set(q('.js-re-eyebrow, .js-re-sub, .js-re-cta, .js-rh, .js-rhours'), { autoAlpha: 0 });
    gsap.set(q('.js-re-line'), { yPercent: 110 });
    gsap.set(q('.js-rgal-mask'), { clipPath: 'inset(100% 0% 0% 0% round 18px)' });
    gsap.set(q('.js-rgal-zoom'), { scale: 1.06 });
    gsap.set(q('.js-rgal-thumb'), { autoAlpha: 0, y: 20 });
    gsap.set(q('.rh-icon path'), { strokeDasharray: 1, strokeDashoffset: 1 });

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'kzRest' } });
    tl.fromTo(q('.js-re-eyebrow'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0)
      .to(q('.js-re-line'), { yPercent: 0, duration: 0.85, stagger: 0.12 }, 0.12)
      .fromTo(q('.js-re-sub'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.5)
      .to(q('.js-rgal-mask'), { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.2 }, 0.35)
      .to(q('.js-rgal-zoom'), { scale: 1, duration: 1.4 }, 0.35)
      .to(q('.js-rgal-thumb'), { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, 1.0)
      .fromTo(q('.js-re-cta'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.9);
    ScrollTrigger.create({ trigger: root.current, start: 'top 65%', once: true, onEnter: () => tl.play() });

    // highlights + hours: their own trigger (they sit lower, especially on mobile)
    const tl2 = gsap.timeline({ paused: true, defaults: { ease: 'kzRest' } });
    tl2.fromTo(q('.js-rh'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, 0)
      .to(q('.rh-icon path'), { strokeDashoffset: 0, duration: 0.9, stagger: 0.04, ease: 'power2.inOut' }, 0.1)
      .fromTo(q('.js-rhours'), { autoAlpha: 0, y: 18, clipPath: 'inset(0% 50% 0% 50%)' }, { autoAlpha: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, clearProps: 'clipPath' }, 0.45)
      .fromTo(q('.rh-hand'), { rotate: -120, transformOrigin: '12px 12px' }, { rotate: 0, duration: 1, ease: 'power3.out' }, 0.6);
    ScrollTrigger.create({ trigger: q('.js-re-bottom')[0], start: 'top 85%', once: true, onEnter: () => tl2.play() });
  }, { scope: root, dependencies: [reduced] });

  return (
    <section ref={root} id="restaurant" aria-labelledby="rest-title" className="relative overflow-hidden bg-cream text-ink">
      <div className="mx-auto max-w-[1360px] px-5 pb-24 pt-14 sm:px-6 md:px-10 md:pb-32 md:pt-20 lg:px-14 lg:pb-40 lg:pt-24">
        <div className="grid gap-9 lg:grid-cols-12 lg:items-center lg:gap-14">
          <header className="text-center lg:col-span-4 lg:text-left">
            <p className="js-re-eyebrow flex items-center justify-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] text-ink/80 md:text-[13px] lg:justify-start">
              <span aria-hidden className="h-px w-8 bg-ink/40 md:w-12" />{copy.eyebrow}<span aria-hidden className="h-px w-8 bg-ink/40 md:w-12" />
            </p>
            <h2 id="rest-title" className="mt-4 font-display font-medium italic leading-[0.98] tracking-[-0.01em] text-pine md:mt-6" style={{ fontSize: 'clamp(38px, 4.8vw, 80px)' }}>
              {copy.headline.map((l, i) => (
                <span key={i} className="block overflow-hidden pb-[0.08em] pr-[0.06em]"><span className="js-re-line block">{l}</span></span>
              ))}
            </h2>
            <p className="js-re-sub mx-auto mt-4 max-w-[42ch] text-[15.5px] leading-[1.7] text-ink/75 md:mt-6 md:text-[18px] lg:mx-0">{copy.sub}</p>
            <div className="js-re-cta mt-8 hidden lg:block">
              <a href={MENU_PDF} target="_blank" rel="noopener noreferrer" className="btn-pine inline-flex min-h-[54px] items-center gap-3 rounded-full px-9 text-[16px] font-semibold">
                {copy.cta} <span className="text-[11px] font-semibold tracking-[.14em] text-gold">{copy.ctaNote}</span> <span className="arrow" aria-hidden>→</span>
              </a>
            </div>
          </header>
          <div className="min-w-0 lg:col-span-8">
            <RestaurantGallery photos={REST_PHOTOS} copy={copy} lang={lang} fine={fine && !reduced} reduced={reduced} />
          </div>
        </div>

        <div className="js-re-bottom mt-10 flex flex-col gap-6 md:mt-14 md:gap-10">
          <RestaurantHighlights items={copy.highlights} />
          <RestaurantOpeningHours copy={copy} lang={lang} />
          <a href={MENU_PDF} target="_blank" rel="noopener noreferrer" className="js-re-cta btn-pine flex min-h-[54px] w-full items-center justify-center gap-3 whitespace-nowrap rounded-full px-5 text-[15px] font-semibold min-[360px]:text-[16px] lg:hidden">
            {copy.cta} <span className="text-[11px] font-semibold tracking-[.14em] text-gold">{copy.ctaNote}</span> <span className="arrow" aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
