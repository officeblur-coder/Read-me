import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang, Season } from '../../content/hero';
import { ACT_ROUTE } from '../../content/activities';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { useSeason } from '../../lib/season';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const BASE = `${import.meta.env.BASE_URL}images/experience/`;

/** Two original photos supplied by KitzAlpen; focal points per breakpoint. */
const PHOTO: Record<Season, { sizes: number[]; w: number; h: number; desk: string; mob: string }> = {
  summer: { sizes: [900, 1920], w: 1920, h: 1246, desk: '50% 55%', mob: '42% 60%' },
  winter: { sizes: [900, 1024], w: 1024, h: 569, desk: '55% 60%', mob: '62% 62%' },
};

const COPY = {
  de: {
    eyebrow: '07 — The Alpine Experience',
    summer: { head: ['Es gibt Orte,', 'die man spüren muss.'], sub: 'Unberührte Natur, frische Bergluft und unvergessliche Sommerabenteuer rund um KitzAlpen.', cta: 'Sommer entdecken', alt: 'Bergsee zwischen grünen Almen und Felsgipfeln, im Vordergrund blühende Alpenrosen' },
    winter: { head: ['Wo der Winter', 'zum Zauber wird.'], sub: 'Verschneite Gipfel, atemberaubende Bergpanoramen und echte alpine Erlebnisse.', cta: 'Winter entdecken', alt: 'Verschneites Hochgebirgspanorama mit präparierten Pisten auf dem Gletscher' },
  },
  en: {
    eyebrow: '07 — The Alpine Experience',
    summer: { head: ['Some places are', 'meant to be felt.'], sub: 'Discover the natural beauty, fresh mountain air and unforgettable summer adventures around KitzAlpen.', cta: 'Explore Summer', alt: 'Mountain lake between green alpine pastures and rocky peaks, alpine roses in bloom in front' },
    winter: { head: ['Where winter', 'feels like magic.'], sub: 'Snow-covered peaks, breathtaking mountain scenery and authentic alpine experiences.', cta: 'Explore Winter', alt: 'Snow-covered high-alpine panorama with groomed slopes on the glacier' },
  },
};

function Photo({ s, alt, active }: { s: Season; alt: string; active: boolean }) {
  const p = PHOTO[s];
  const set = (ext: string) => p.sizes.map((w) => `${BASE}${s}-${w}.${ext} ${w}w`).join(', ');
  return (
    <div className={`js-ax-photo absolute inset-0 ${active ? '' : 'opacity-0'}`} data-season={s} aria-hidden={!active}>
      <div className="js-ax-par absolute inset-x-0 -inset-y-[8%] will-change-transform">
        <picture>
          <source type="image/avif" srcSet={set('avif')} sizes="100vw" />
          <source type="image/webp" srcSet={set('webp')} sizes="100vw" />
          {/* both seasons are decoded up front, so a switch never waits for the network */}
          <img src={`${BASE}${s}.jpg`} alt={active ? alt : ''} width={p.w} height={p.h} loading="eager" decoding="async"
            className="ax-img h-full w-full object-cover" style={{ ['--pos-d' as string]: p.desk, ['--pos-m' as string]: p.mob }} />
        </picture>
      </div>
    </div>
  );
}

/**
 * Section 07 – a fullscreen photographic pause after Activities.
 * Reads the shared season (same source as Hero / Activities); no selector of its own.
 */
export function AlpineExperienceSection({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const { season } = useSeason();
  const [shown, setShown] = useState<Season>(season);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const entered = useRef(false);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const first = useRef(true);
  const t = COPY[lang], c = t[shown];

  const q = (s: string) => (root.current ? Array.from(root.current.querySelectorAll<HTMLElement>(s)) : []);
  const visible = () => { const r = root.current?.getBoundingClientRect(); return !!r && r.top < window.innerHeight && r.bottom > 0; };
  const photoOf = (s: Season) => q(`.js-ax-photo[data-season="${s}"]`)[0];

  const hideText = () => {
    gsap.set(q('.js-ax-eyebrow, .js-ax-cta'), { autoAlpha: 0, y: 12 });
    gsap.set(q('.js-ax-sub'), { autoAlpha: 0, y: 20 });
    gsap.set(q('.js-ax-line'), { yPercent: 110 });
  };
  const revealText = (d = 0) => gsap.timeline({ delay: d, defaults: { ease: 'power3.out' } })
    .to(q('.js-ax-eyebrow'), { autoAlpha: 1, y: 0, duration: 0.6 }, 0)
    .to(q('.js-ax-line'), { yPercent: 0, duration: 0.9, stagger: 0.14, ease: 'power4.out' }, 0.1)
    .to(q('.js-ax-sub'), { autoAlpha: 1, y: 0, duration: 0.7 }, 0.5)
    .to(q('.js-ax-cta'), { autoAlpha: 1, y: 0, duration: 0.6 }, 0.8);

  // A) scroll reveal (once) + C) parallax
  useGSAP(() => {
    if (reduced) { entered.current = true; return; }
    hideText();
    gsap.set(q('.ax-img'), { scale: 1.08 });
    ScrollTrigger.create({
      trigger: root.current, start: 'top 70%', once: true,
      onEnter: () => { entered.current = true; gsap.to(q('.ax-img'), { scale: 1, duration: 1.6, ease: 'power3.out' }); revealText(0.1); },
    });
    if (fine) gsap.fromTo(q('.js-ax-par'), { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
  }, { scope: root, dependencies: [reduced, fine] });

  // B) seasonal crossfade: text out → photos crossfade → text in (rapid switching kills the running timeline)
  useEffect(() => {
    tl.current?.kill();
    if (season === shown) {
      // switched back before the swap finished: restore this season's state
      const keep = photoOf(shown), other = photoOf(shown === 'summer' ? 'winter' : 'summer');
      if (keep && other) { gsap.to(keep, { opacity: 1, duration: reduced ? 0 : 0.4 }); gsap.to(other, { opacity: 0, duration: reduced ? 0 : 0.4 }); }
      if (entered.current && !reduced) { tl.current = revealText(0); } else gsap.set(q('.js-ax-eyebrow, .js-ax-sub, .js-ax-cta, .js-ax-line'), { clearProps: 'all' });
      return;
    }
    const from = photoOf(shown), to = photoOf(season);
    if (reduced || !entered.current || !visible()) {
      if (from && to) { gsap.set(from, { opacity: 0 }); gsap.set(to, { opacity: 1 }); }
      setShown(season); return;
    }
    tl.current = gsap.timeline()
      .to(q('.js-ax-line'), { yPercent: -110, duration: 0.35, stagger: 0.05, ease: 'power2.in' }, 0)
      .to(q('.js-ax-eyebrow, .js-ax-sub, .js-ax-cta'), { autoAlpha: 0, y: -10, duration: 0.3, ease: 'power2.in' }, 0)
      .fromTo(to, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.inOut' }, 0.1)
      .fromTo(to.querySelector('img'), { scale: 1.06 }, { scale: 1, duration: 1.2, ease: 'power3.out' }, 0.1)
      .to(from, { opacity: 0, duration: 1, ease: 'power2.inOut' }, 0.1)
      .add(() => setShown(season), 0.4);
  }, [season]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduced || !entered.current) return;
    if (!visible()) { gsap.set(q('.js-ax-eyebrow, .js-ax-sub, .js-ax-cta, .js-ax-line'), { clearProps: 'all' }); return; }
    hideText();
    tl.current = revealText(0.05);
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section ref={root} id="experience" aria-labelledby="ax-title" className="ax relative isolate flex min-h-[92svh] items-end overflow-hidden bg-deep text-cream md:min-h-[100svh] md:items-center">
      <div className="absolute inset-0 -z-10">
        <Photo s="summer" alt={t.summer.alt} active={shown === 'summer'} />
        <Photo s="winter" alt={t.winter.alt} active={shown === 'winter'} />
        {/* readability: darker where the text sits, tinted by the season palette */}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--k-deep)_88%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_45%,transparent)_45%,transparent_75%)] md:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--k-deep)_86%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_58%,transparent)_42%,transparent_74%)]" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[color-mix(in_srgb,var(--k-deep)_45%,transparent)] to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-[1360px] px-5 pb-[calc(110px+env(safe-area-inset-bottom,0px))] pt-28 sm:px-6 md:px-10 md:pb-24 lg:px-14">
        <div className="max-w-[650px]">
          <p className="js-ax-eyebrow flex items-center gap-4 text-[11.5px] font-semibold uppercase tracking-[.34em] text-gold-light md:text-[13px]">
            <span aria-hidden className="h-px w-10 bg-gold" />{t.eyebrow}
          </p>
          <h2 id="ax-title" className="mt-5 font-display font-medium leading-[0.98] tracking-[-0.015em] text-cream [text-shadow:0_2px_30px_rgba(0,0,0,.25)]" style={{ fontSize: 'clamp(42px, 6vw, 100px)' }}>
            <span className="block overflow-hidden pb-[0.04em]"><span className="js-ax-line block">{c.head[0]}</span></span>
            <span className="block overflow-hidden pb-[0.12em] pr-[0.06em]"><span className="js-ax-line block italic text-gold-light">{c.head[1]}</span></span>
          </h2>
          <p className="js-ax-sub mt-5 max-w-[46ch] text-[16.5px] leading-[1.7] text-cream/85 md:mt-6 md:text-[19px]">{c.sub}</p>
          <a href={ACT_ROUTE[shown]} className="js-ax-cta ax-cta mt-8 inline-flex min-h-[54px] items-center gap-3 rounded-full px-8 text-[15.5px] font-semibold md:mt-10">
            {c.cta} <span className="arrow" aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
