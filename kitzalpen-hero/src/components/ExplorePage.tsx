import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../content/hero';
import { EXPLORE, EXPLORE_COPY } from '../content/explore';
import { useReducedMotion } from '../lib/hooks';
import { useSeason } from '../lib/season';
import { Icon, I } from './pension/PensionRooms';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const BASE = import.meta.env.BASE_URL;

/** "Entdecken" hub – every guide page as a bento of photo cards. */
export function ExplorePage({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { season } = useSeason();
  const t = EXPLORE_COPY[lang];
  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-ex-line'), { yPercent: 110 }, { yPercent: 0, duration: 0.95, stagger: 0.1, ease: 'power4.out' }, 0.2)
      .fromTo(q('.js-ex-in'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.6)
      .fromTo(q('.js-ex-card'), { autoAlpha: 0, y: 40, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, stagger: 0.07 }, 0.7);
  }, { scope: root, dependencies: [reduced] });
  // bento spans: first card large
  const span = ['md:col-span-2 md:row-span-2', '', '', 'md:col-span-2', '', '', 'md:col-span-2'];
  return (
    <div ref={root} className="bg-deep text-cream">
      <section id="top" aria-labelledby="ex-title" className="px-5 pb-[calc(110px+env(safe-area-inset-bottom,0px))] pt-52 sm:px-6 md:px-10 md:pb-24 md:pt-60 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <p className="js-ex-in text-[11.5px] font-semibold uppercase tracking-[.34em] text-cream/85 md:text-[13px]">{t.eyebrow}</p>
          <h1 id="ex-title" className="mt-4 font-display font-normal leading-[1.02] md:mt-6" style={{ fontSize: 'clamp(42px, 5.8vw, 92px)' }}>
            <span className="block overflow-hidden pb-[0.06em]"><span className="js-ex-line block">{t.title[0]}</span></span>
            <span className="block overflow-hidden pb-[0.12em]"><span className="js-ex-line block italic text-gold-light">{t.title[1]}</span></span>
          </h1>
          <p className="js-ex-in mt-5 max-w-[620px] text-[16px] leading-relaxed text-cream/80 md:text-[18px]">{t.sub}</p>
          <ul className="mt-12 grid auto-rows-[240px] gap-4 md:grid-cols-4 md:auto-rows-[220px] md:gap-5">
            {EXPLORE.map((x, i) => (
              <li key={x.id} className={`js-ex-card ${span[i] ?? ''}`}>
                <a href={x.href(season)} className="group relative isolate flex h-full flex-col justify-end overflow-hidden rounded-[24px] p-6 md:p-7">
                  <img src={`${BASE}${x.img[season]}`} alt="" loading={i < 3 ? 'eager' : 'lazy'} className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
                  <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[color-mix(in_srgb,var(--k-deep)_92%,transparent)] via-[color-mix(in_srgb,var(--k-deep)_30%,transparent)] to-transparent" />
                  {i === 0 && <span className="lnum font-display text-[80px] leading-[.85] text-gold-light md:text-[120px]">15</span>}
                  <span className={`flex items-center gap-2 font-display italic leading-tight ${i === 0 ? 'mt-2 text-[34px] md:text-[44px]' : 'text-[25px] md:text-[27px]'}`}>{x.live && <span aria-hidden className="live-dot" />}{x.title[lang]}</span>
                  <span className="mt-1.5 max-w-[42ch] text-[14px] leading-snug text-cream/80">{x.text[lang]}</span>
                  <span className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-cream/15 backdrop-blur transition-transform duration-300 group-hover:translate-x-1"><Icon d={I.arrow} size={17} w={1.8} /></span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
