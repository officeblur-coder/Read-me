import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { CHALET_COPY, CHALET_PHOTOS } from '../../content/chalet';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { ChaletGallery } from './ChaletGallery';
import { ChaletFeatures } from './ChaletFeatures';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Editorial hand-over: one fine contour line of a ridge, traced while you scroll out. */
function ContourEdge() {
  return (
    <svg aria-hidden viewBox="0 0 1440 90" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-[60px] w-full md:h-[90px]">
      <path className="js-ch-contour" pathLength={1} vectorEffect="non-scaling-stroke" fill="none" style={{ stroke: 'var(--k-gold)' }} strokeWidth="1.2"
        d="M0 70 C 120 66, 210 58, 300 46 S 450 18, 520 22 S 610 50, 690 44 S 800 8, 870 12 S 990 52, 1080 50 S 1230 30, 1300 40 S 1400 60, 1440 58" />
      <path className="js-ch-contour" pathLength={1} vectorEffect="non-scaling-stroke" fill="none" style={{ stroke: 'var(--k-pine)' }} strokeOpacity=".18" strokeWidth="1"
        d="M0 84 C 140 80, 240 74, 330 64 S 470 40, 540 42 S 630 64, 700 60 S 810 30, 880 32 S 1000 66, 1090 64 S 1240 48, 1310 56 S 1400 72, 1440 70" />
    </svg>
  );
}

export function ChaletSection({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const copy = CHALET_COPY[lang];
  const reduced = useReducedMotion();
  const fine = useFinePointer();

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    const ease = 'kzChalet';

    gsap.set(q('.js-ch-eyebrow, .js-ch-sub, .js-cf, .js-ch-cta'), { autoAlpha: 0 });
    gsap.set(q('.js-ch-line'), { yPercent: 110 });
    gsap.set(q('.js-cg-mask'), { clipPath: 'inset(6% 5% 6% 5% round 18px)' });
    gsap.set(q('.js-cg-zoom'), { scale: 1.04 });
    gsap.set(q('.js-cg-thumb'), { autoAlpha: 0, y: 18 });
    gsap.set(q('.cf-icon path'), { strokeDasharray: 1, strokeDashoffset: 1 });

    const tl = gsap.timeline({ paused: true, defaults: { ease } });
    tl.fromTo(q('.js-ch-eyebrow'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0)
      .to(q('.js-ch-line'), { yPercent: 0, duration: 0.85, stagger: 0.14 }, 0.12)
      .fromTo(q('.js-ch-sub'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.4)
      .to(q('.js-cg-mask'), { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 0.9 }, 0.3)
      .to(q('.js-cg-zoom'), { scale: 1, duration: 1.2 }, 0.3)
      .fromTo(q('.js-cf'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, 0.6)
      .to(q('.cf-icon path'), { strokeDashoffset: 0, duration: 0.8, stagger: 0.03, ease: 'power2.inOut' }, 0.7)
      .to(q('.js-cg-thumb'), { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.12 }, 0.9)
      .fromTo(q('.js-ch-cta'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 1.25);
    ScrollTrigger.create({ trigger: root.current, start: 'top 68%', once: true, onEnter: () => tl.play() });

    // bottom contour traced on the way out, reversible
    gsap.set(q('.js-ch-contour'), { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.to(q('.js-ch-contour'), { strokeDashoffset: 0, ease: 'none', stagger: 0.15,
      scrollTrigger: { trigger: q('.js-ch-contour')[0]?.parentElement ?? root.current, start: 'top 95%', end: 'bottom 55%', scrub: 0.6 } });
  }, { scope: root, dependencies: [reduced] });

  return (
    <section ref={root} id="chalet" aria-labelledby="chalet-title" className="relative overflow-hidden bg-cream text-ink">
      <div className="relative mx-auto grid max-w-[1360px] gap-9 px-5 pb-28 pt-14 sm:px-6 md:px-10 md:pb-36 md:pt-20 lg:grid-cols-12 lg:items-center lg:gap-14 lg:px-14 lg:pb-44 lg:pt-28">
        {/* text column */}
        <div className="contents lg:col-span-5 lg:block">
          <header className="order-1 text-center lg:text-left">
            <p className="js-ch-eyebrow flex items-center justify-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] text-ink/80 lg:justify-start md:text-[13px]">
              <span aria-hidden className="h-px w-8 bg-ink/40 md:w-12" />{copy.eyebrow}<span aria-hidden className="h-px w-8 bg-ink/40 md:w-12" />
            </p>
            <h2 id="chalet-title" className="mt-4 font-display font-medium italic leading-[0.98] tracking-[-0.01em] text-pine md:mt-6" style={{ fontSize: 'clamp(40px, 5.6vw, 88px)' }}>
              <span className="block overflow-hidden pb-[0.05em]"><span className="js-ch-line block">{copy.headline[0]}</span></span>
              <span className="block overflow-hidden pb-[0.12em] pr-[0.06em]"><span className="js-ch-line block">{copy.headline[1]}</span></span>
            </h2>
            <p className="js-ch-sub mx-auto mt-4 max-w-[42ch] text-[15.5px] leading-[1.7] text-ink/75 md:mt-6 md:text-[18px] lg:mx-0">{copy.sub}</p>
          </header>
          <div className="order-3 mt-0 lg:mt-10"><ChaletFeatures items={copy.features} /></div>
          <div className="js-ch-cta order-4 mt-0 flex justify-center lg:mt-10 lg:justify-start">
            <a href={copy.ctaHref} className="btn-pine inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full px-9 text-[16px] font-semibold">
              {copy.cta} <span className="arrow" aria-hidden>→</span>
            </a>
          </div>
        </div>

        {/* gallery */}
        <div className="order-2 min-w-0 lg:order-none lg:col-span-7">
          <ChaletGallery photos={CHALET_PHOTOS} copy={copy} lang={lang} fine={fine && !reduced} reduced={reduced} />
        </div>
      </div>
      <ContourEdge />
    </section>
  );
}
