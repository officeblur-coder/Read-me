import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { AMENITIES, AMENITIES_COPY } from '../../content/amenities';
import { useReducedMotion } from '../../lib/hooks';
import { AmenityCard } from './AmenityCard';
import { AlpineTransition } from './AlpineTransition';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const BASE = `${import.meta.env.BASE_URL}images/amenities/`;

/** Contour lines like an engraved relief map – drawn in when the section appears. */
function Relief() {
  const lines = [
    'M0 150 C 40 140, 70 112, 104 104 S 160 66, 186 40 S 226 18, 250 34 S 300 92, 340 104 S 400 130, 440 140',
    'M20 150 C 60 138, 86 118, 118 112 S 168 82, 192 60 S 228 42, 248 54 S 290 100, 330 112 S 390 136, 430 146',
    'M48 150 C 80 140, 104 126, 132 120 S 176 98, 198 82 S 230 68, 246 76 S 282 108, 318 120 S 372 140, 410 150',
    'M90 150 C 120 142, 140 134, 160 130 S 192 116, 206 106 S 232 98, 244 102 S 272 122, 300 130 S 344 146, 372 150',
  ];
  return (
    <svg aria-hidden viewBox="0 0 440 160" fill="none" className="js-relief mt-10 hidden w-full max-w-[440px] text-gold/45 lg:block">
      {lines.map((d, i) => <path key={i} d={d} stroke="currentColor" strokeWidth={i === 0 ? 1.2 : 0.7} opacity={1 - i * 0.18} pathLength={1} />)}
      <circle cx="250" cy="34" r="2.2" fill="currentColor" />
      <text x="258" y="28" fill="currentColor" fontSize="10" letterSpacing="2" fontFamily="Manrope, sans-serif">807 M</text>
    </svg>
  );
}

export function AmenitiesSection({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const ridge = useRef<HTMLDivElement>(null);
  const copy = AMENITIES_COPY[lang];
  const reduced = useReducedMotion();

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    const cards = q('.js-am-card');

    // 1) the dark green sheet rises over the cream rooms section
    gsap.fromTo(sheet.current,
      { clipPath: 'inset(0% 4% 0% 4% round 44px 44px 0px 0px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 20%', scrub: 0.5 } });
    // panorama drifts slower than the page
    gsap.fromTo(q('.js-am-pano'), { yPercent: -8, scale: 1.12 }, { yPercent: 8, scale: 1.02, ease: 'none',
      scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });

    // 2) reveal, once
    gsap.set(q('.js-am-eyebrow, .js-am-sub'), { autoAlpha: 0, y: 14 });
    gsap.set(q('.js-am-line'), { yPercent: 110 });
    gsap.set(cards, { autoAlpha: 0, y: 36, clipPath: 'inset(18% 0% 0% 0% round 14px)' });
    gsap.set(q('.amenity-border'), { opacity: 0 });
    gsap.set(q('.amenity-sheen'), { scaleX: 0 });
    gsap.set(q('.ic-draw, .js-relief path'), { strokeDasharray: 1, strokeDashoffset: 1 });

    const cols = window.matchMedia('(min-width: 1024px)').matches ? 2 : 2;
    const wave = (i: number) => (Math.floor(i / cols) + (i % cols)) * 0.1; // diagonal waves

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tl.to(q('.js-am-eyebrow'), { autoAlpha: 1, y: 0, duration: 0.5 }, 0)
      .to(q('.js-am-line'), { yPercent: 0, duration: 0.8, stagger: 0.14, ease: 'power4.out' }, 0.1)
      .to(q('.js-am-sub'), { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0.4)
      .to(q('.js-relief path'), { strokeDashoffset: 0, duration: 1.4, stagger: 0.12, ease: 'power2.inOut' }, 0.3);
    cards.forEach((c, i) => {
      const t = 0.35 + wave(i);
      tl.to(c, { autoAlpha: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.7 }, t)
        .to(c.querySelector('.amenity-border'), { opacity: 1, duration: 0.6 }, t + 0.25)
        .to(c.querySelector('.amenity-sheen'), { scaleX: 1, duration: 0.7, ease: 'power2.inOut' }, t + 0.25)
        .to(c.querySelectorAll('.ic-draw'), { strokeDashoffset: 0, duration: 0.7, stagger: 0.06, ease: 'power2.inOut' }, t + 0.3);
    });
    ScrollTrigger.create({ trigger: q('.js-am-grid')[0] ?? root.current, start: 'top 82%', once: true, onEnter: () => tl.play() });

    // 3) mountain hand-over to the next (cream) section
    const fill = ridge.current?.querySelector('.js-ridge-fill');
    const line = ridge.current?.querySelector('.js-ridge-line');
    if (fill && line) {
      gsap.set(line, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.timeline({ scrollTrigger: { trigger: ridge.current, start: 'top bottom', end: 'bottom 55%', scrub: 0.6 } })
        .fromTo(fill, { yPercent: 55 }, { yPercent: 0, ease: 'none' }, 0)
        .to(line, { strokeDashoffset: 0, ease: 'none' }, 0)
        .to(q('.js-am-pano'), { opacity: 0.35, ease: 'none' }, 0);
    }
  }, { scope: root, dependencies: [reduced] });

  return (
    <section ref={root} id="leistungen" aria-labelledby="amenities-title" className="relative bg-cream">
      <div ref={sheet} className="relative overflow-hidden bg-[#071C16] text-cream">
        {/* real panorama of the region, held back behind a deep green veil */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-[78%] overflow-hidden lg:h-full">
          <picture>
            <source type="image/avif" srcSet={`${BASE}panorama.avif`} />
            <source type="image/webp" srcSet={`${BASE}panorama.webp`} />
            <img src={`${BASE}panorama.jpg`} alt="" loading="lazy" decoding="async" className="js-am-pano h-full w-full object-cover opacity-70 lg:opacity-60" style={{ objectPosition: '50% 40%' }} />
          </picture>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,28,22,.55)_0%,rgba(7,28,22,.72)_40%,#071C16_100%)] lg:bg-[linear-gradient(90deg,rgba(7,28,22,.78)_0%,rgba(7,28,22,.86)_45%,rgba(7,28,22,.95)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_15%_10%,rgba(215,183,123,.18),transparent_70%)]" />
        </div>

        <div className="relative mx-auto grid max-w-[1360px] gap-10 px-5 pb-[130px] pt-16 sm:px-6 sm:pb-[170px] md:px-10 md:pt-24 lg:grid-cols-12 lg:gap-14 lg:px-14 lg:pb-[230px] lg:pt-32">
          <header className="text-center lg:col-span-5 lg:pt-6 lg:text-left">
            <p className="js-am-eyebrow flex items-center justify-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] text-cream/85 lg:justify-start">
              <span aria-hidden className="h-px w-8 bg-cream/40 md:w-12" />{copy.eyebrow}<span aria-hidden className="h-px w-8 bg-cream/40 md:w-12 lg:hidden" />
            </p>
            <h2 id="amenities-title" className="mt-5 font-display font-medium leading-[0.98] tracking-[-0.01em] text-cream" style={{ fontSize: 'clamp(38px, 5vw, 80px)' }}>
              <span className="block overflow-hidden pb-[0.06em]"><span className="js-am-line block">{copy.headline[0]}</span></span>
              <span className="block overflow-hidden pb-[0.14em] pr-[0.08em]"><span className="js-am-line block italic text-gold">{copy.headline[1]}</span></span>
            </h2>
            <p className="js-am-sub mx-auto mt-5 max-w-[44ch] text-[15.5px] leading-[1.7] text-cream/80 md:text-[17px] lg:mx-0">{copy.sub}</p>
            <p className="js-am-sub mt-4 text-[12px] font-semibold uppercase tracking-[.2em] text-gold/90">{copy.meta}</p>
            <Relief />
          </header>

          <ul className="js-am-grid grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-7 lg:gap-5">
            {AMENITIES.map((a, i) => <AmenityCard key={a.kind} a={a} lang={lang} index={i} />)}
          </ul>
        </div>

        <AlpineTransition ref={ridge} />
      </div>
    </section>
  );
}
