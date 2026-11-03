import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang, Season } from '../../content/hero';
import { ACT_COPY, ACT_ROUTE, ACTIVITIES } from '../../content/activities';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { useSeason } from '../../lib/season';
import { ActivityCard, ActPic } from './ActivityCard';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Very faint topographic lines behind the section – they drift slowly. */
function Topo() {
  return (
    <svg aria-hidden viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" className="act-topo pointer-events-none absolute inset-0 h-full w-full text-pine/[.07]">
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} fill="none" stroke="currentColor" strokeWidth="1"
          d={`M-50 ${430 - i * 34} C 180 ${380 - i * 40}, 320 ${250 - i * 22}, 520 ${270 - i * 26} S 860 ${420 - i * 30}, 1250 ${300 - i * 28}`} />
      ))}
    </svg>
  );
}

export function ActivitiesSection({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const { season } = useSeason();
  const [shown, setShown] = useState<Season>(season);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const entered = useRef(false);
  const swapTl = useRef<gsap.core.Timeline | null>(null);
  const firstShown = useRef(true);
  const copy = ACT_COPY[lang];
  const sc = copy[shown];
  const items = ACTIVITIES[shown];

  const q = (s: string) => (root.current ? Array.from(root.current.querySelectorAll<HTMLElement>(s)) : []);
  const isVisible = () => { const r = root.current?.getBoundingClientRect(); return !!r && r.top < window.innerHeight && r.bottom > 0; };

  // ------------------------------------------------ A) entrance – plays once
  useGSAP(() => {
    if (reduced) { entered.current = true; return; }
    hideAll();
    ScrollTrigger.create({ trigger: root.current, start: 'top 80%', once: true, onEnter: () => { entered.current = true; reveal(0); } });
    // F) restrained parallax on the featured photo (desktop)
    if (fine) gsap.fromTo('.js-act-feature img', { yPercent: -6, scale: 1.1 }, { yPercent: 6, scale: 1.1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
  }, { scope: root, dependencies: [reduced, fine] });

  function hideAll() {
    gsap.set(q('.js-act-eyebrow, .js-act-sub, .js-act-cta'), { autoAlpha: 0, y: 14 });
    gsap.set(q('.js-act-line'), { yPercent: 110 });
    gsap.set(q('.js-act-feature'), { clipPath: 'inset(100% 0% 0% 0% round 18px)' });
    gsap.set(q('.js-act-card'), { autoAlpha: 0, y: 30 });
    gsap.set(q('.js-act-mask'), { clipPath: 'inset(0% 0% 100% 0%)' });
    gsap.set(q('.js-act-img'), { scale: 1.12 });
  }

  /** shared reveal for the entrance and for a season change (D: image-mask reveal) */
  function reveal(delay: number) {
    const tl = gsap.timeline({ delay, defaults: { ease: 'power3.out' } });
    tl.to(q('.js-act-eyebrow'), { autoAlpha: 1, y: 0, duration: 0.6 }, 0)
      .to(q('.js-act-line'), { yPercent: 0, duration: 0.9, stagger: 0.12, ease: 'power4.out' }, 0.08)
      .to(q('.js-act-sub'), { autoAlpha: 1, y: 0, duration: 0.7 }, 0.35)
      .to(q('.js-act-feature'), { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.1, ease: 'power3.inOut' }, 0.2)
      .to(q('.js-act-card'), { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 }, 0.4)
      .to(q('.js-act-mask'), { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, stagger: 0.1, ease: 'power3.inOut' }, 0.45)
      .to(q('.js-act-img'), { scale: 1, duration: 1.3, stagger: 0.1 }, 0.45)
      .to(q('.js-act-cta'), { autoAlpha: 1, y: 0, duration: 0.6 }, 0.9);
    return tl;
  }

  // ------------------------------------------------ B) season change: out → swap data → in
  useEffect(() => {
    if (season === shown) return;
    swapTl.current?.kill();
    if (reduced || !entered.current || !isVisible()) { setShown(season); return; }   // offscreen: update silently, never scroll
    swapTl.current = gsap.timeline({ defaults: { ease: 'power2.in' } })
      .to(q('.js-act-line'), { yPercent: -110, duration: 0.4, stagger: 0.05 }, 0)
      .to(q('.js-act-sub, .js-act-cta, .js-act-eyebrow'), { autoAlpha: 0, y: -10, duration: 0.35 }, 0)
      .to(q('.js-act-feature'), { clipPath: 'inset(0% 0% 100% 0% round 18px)', duration: 0.5, ease: 'power3.in' }, 0)
      .to(q('.js-act-card'), { autoAlpha: 0, y: -16, duration: 0.35, stagger: 0.04 }, 0.05)
      .add(() => setShown(season));
  }, [season]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (firstShown.current) { firstShown.current = false; return; }
    swapTl.current?.kill();
    if (reduced) return;
    if (!entered.current) { hideAll(); return; }
    if (!isVisible()) { gsap.set(q('.js-act-eyebrow, .js-act-sub, .js-act-cta, .js-act-card, .js-act-line, .js-act-feature, .js-act-mask, .js-act-img'), { clearProps: 'all' }); return; }
    hideAll();
    swapTl.current = reveal(0.05);
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section ref={root} id="activities" aria-labelledby="act-title" data-shown={shown} className="act-section relative overflow-hidden bg-cream text-ink">
      <Topo />
      {/* soft hand-over from the restaurant: one hairline ridge */}
      <svg aria-hidden viewBox="0 0 1440 40" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[30px] w-full">
        <path d="M0 30 C 200 28, 320 12, 470 14 S 700 32, 860 22 S 1150 4, 1440 18" fill="none" style={{ stroke: 'var(--k-gold)' }} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="relative mx-auto max-w-[1360px] px-5 pb-16 pt-16 sm:px-6 md:px-10 md:pb-24 md:pt-24 lg:px-14 lg:pb-32 lg:pt-28">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-14">
          <header className="lg:col-span-7">
            <p className="js-act-eyebrow flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] text-ink/80 md:text-[13px]">
              <span aria-hidden className="h-px w-10 bg-gold" />{copy.eyebrow}
            </p>
            <h2 id="act-title" className="mt-5 font-display font-medium leading-[0.96] tracking-[-0.015em] text-pine" style={{ fontSize: 'clamp(44px, 6.6vw, 104px)' }}>
              <span className="block overflow-hidden pb-[0.04em]"><span className="js-act-line block">{sc.head[0]}</span></span>
              <span className="block overflow-hidden pb-[0.12em] pr-[0.06em]"><span className="js-act-line block italic text-goldink">{sc.head[1]}</span></span>
            </h2>
            <p className="js-act-sub mt-5 max-w-[46ch] text-[16px] leading-[1.7] text-ink/75 md:text-[18px]">{sc.sub}</p>
            <a href={ACT_ROUTE[shown]} className="js-act-cta act-cta mt-8 hidden items-center gap-3 text-[13px] font-semibold uppercase tracking-[.18em] text-pine lg:inline-flex">
              {sc.cta} <span aria-hidden className="act-cta-arrow">↗</span>
            </a>
          </header>

          {/* featured seasonal photograph (supplied by KitzAlpen) */}
          <figure className="lg:col-span-5 lg:justify-self-end">
            <div className="js-act-feature relative aspect-[5/4] w-full overflow-hidden rounded-[18px] bg-pine/10 sm:aspect-[16/10] lg:aspect-[4/5] lg:w-[min(30vw,400px)]">
              <ActPic stem={sc.feature} alt={sc.featureAlt} sizes="(min-width:1024px) 400px, 100vw" />
              <figcaption className="absolute bottom-3 left-3 rounded-full bg-deep/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.22em] text-cream backdrop-blur-sm">{sc.caption}</figcaption>
            </div>
          </figure>
        </div>

        {/* five cards: grid on desktop, swipeable strip on mobile */}
        <ul className="act-strip -mx-5 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 md:mt-14 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0">
          {items.map((a) => (
            <li key={a.id} className="w-[78%] max-w-[320px] shrink-0 snap-start sm:w-[44%] lg:w-auto lg:max-w-none">
              <ActivityCard a={a} lang={lang} visit={copy.visit} />
            </li>
          ))}
        </ul>

        <a href={ACT_ROUTE[shown]} className="js-act-cta btn-pine mt-8 flex min-h-[54px] items-center justify-center gap-3 rounded-full px-6 text-center text-[15px] font-semibold lg:hidden">
          {sc.cta} <span aria-hidden>↗</span>
        </a>
      </div>
    </section>
  );
}
