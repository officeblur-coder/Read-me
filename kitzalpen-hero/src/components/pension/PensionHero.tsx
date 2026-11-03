import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang, Season } from '../../content/hero';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { useSeason } from '../../lib/season';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const IMG = `${import.meta.env.BASE_URL}images/pension/`;
const SITE = 'https://www.kitzalpen.at';

/** Two original photos; focal points keep the building in frame on desktop and mobile. */
const PHOTO: Record<Season, { stem: string; sizes: number[]; desk: string; mob: string }> = {
  winter: { stem: 'hero-winter', sizes: [900, 1600], desk: '62% 50%', mob: '50% 45%' },
  summer: { stem: 'hero-summer', sizes: [900, 1600], desk: '70% 45%', mob: '78% 45%' },
};

const COPY = {
  de: {
    eyebrow: 'Die Pension · Hollersbach',
    winter: ['Ihr Zuhause in den Alpen,', 'ganz nah an den Bergen.'],
    summer: ['Nah an allem, was Ihren', 'Urlaub besonders macht.'],
    facts: ['17 Zimmer', 'Restaurant im Haus', '2 km zur Panoramabahn'],
    rooms: 'Zimmer entdecken', contact: 'Kontakt aufnehmen',
    roomsHref: `${SITE}/rooms/`, contactHref: `${SITE}/contact/`,
    alt: { winter: 'Die Pension im Winter, verschneit, mit Holzbalkonen', summer: 'Die Pension im Sommer mit Garten, Terrasse, Holzbalkonen und Bergen im Hintergrund' },
  },
  en: {
    eyebrow: 'The Pension · Hollersbach',
    winter: ['Your alpine home,', 'closer to the mountains.'],
    summer: ['Stay close to everything', 'that matters.'],
    facts: ['17 rooms', 'Restaurant in-house', '2 km to Panoramabahn'],
    rooms: 'Explore our rooms', contact: 'Contact us',
    roomsHref: `${SITE}/en/rooms/`, contactHref: `${SITE}/en/contact/`,
    alt: { winter: 'The guesthouse in winter, snow-covered, with wooden balconies', summer: 'The guesthouse in summer with garden, terrace, wooden balconies and mountains behind' },
  },
};

function Photo({ s, alt, active }: { s: Season; alt: string; active: boolean }) {
  const p = PHOTO[s];
  const set = (ext: string) => p.sizes.map((w) => `${IMG}${p.stem}-${w}.${ext} ${w}w`).join(', ');
  return (
    <div className={`js-ph-photo absolute inset-0 ${active ? '' : 'opacity-0'}`} data-season={s}>
      <picture>
        <source type="image/avif" srcSet={set('avif')} sizes="100vw" />
        <source type="image/webp" srcSet={set('webp')} sizes="100vw" />
        {/* active season loads eagerly (LCP); the other one lazily – the crossfade waits for it */}
        <img src={`${IMG}${p.stem}.jpg`} alt={active ? alt : ''} aria-hidden={!active} width={1600} height={1019}
          loading={active ? 'eager' : 'lazy'} decoding="async"
          // @ts-expect-error fetchpriority is valid HTML
          fetchpriority={active ? 'high' : 'low'}
          className="ph-img h-full w-full object-cover" style={{ ['--pos-d' as string]: p.desk, ['--pos-m' as string]: p.mob }} />
      </picture>
    </div>
  );
}

/** Pension page · Section 01 – cinematic hero. Reads the shared season; no selector of its own. */
export function PensionHero({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const { season } = useSeason();
  const [shown, setShown] = useState<Season>(season);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const tl = useRef<gsap.core.Timeline | null>(null);
  const first = useRef(true);
  const t = COPY[lang];

  const q = (s: string) => (root.current ? Array.from(root.current.querySelectorAll<HTMLElement>(s)) : []);
  const photo = (s: Season) => q(`.js-ph-photo[data-season="${s}"]`)[0];
  const textIn = (d = 0) => gsap.timeline({ delay: d, defaults: { ease: 'power3.out' } })
    .fromTo(q('.js-ph-line'), { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.12, ease: 'power4.out' }, 0);

  // initial reveal
  useGSAP(() => {
    if (reduced) return;
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-ph-media'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: 'power1.out' }, 0)
      .fromTo(q('.ph-img'), { scale: 1.06 }, { scale: 1, duration: 1.8, ease: 'power2.out' }, 0)
      .fromTo(q('.js-ph-eyebrow'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.35)
      .fromTo(q('.js-ph-line'), { yPercent: 110 }, { yPercent: 0, duration: 0.95, stagger: 0.12, ease: 'power4.out' }, 0.45)
      .fromTo(q('.js-ph-rule'), { scaleX: 0 }, { scaleX: 1, duration: 0.7 }, 0.95)
      .fromTo(q('.js-ph-fact'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 }, 1.0)
      .fromTo(q('.js-ph-cta'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, 1.2);
    if (fine) gsap.to(q('.js-ph-par'), { yPercent: 8, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.6 } });
  }, { scope: root, dependencies: [reduced, fine] });

  // season switch: preload → headline out → crossfade → headline in
  useEffect(() => {
    tl.current?.kill();
    const from = photo(shown), to = photo(season);
    if (season === shown) {
      if (from) gsap.to(from, { opacity: 1, duration: reduced ? 0 : 0.4 });
      const other = photo(shown === 'summer' ? 'winter' : 'summer'); if (other) gsap.to(other, { opacity: 0, duration: reduced ? 0 : 0.4 });
      if (!reduced) tl.current = textIn();
      return;
    }
    if (!from || !to) { setShown(season); return; }
    if (reduced) { gsap.set(from, { opacity: 0 }); gsap.set(to, { opacity: 1 }); setShown(season); return; }
    const img = to.querySelector('img') as HTMLImageElement | null;
    let alive = true;
    const run = () => {
      if (!alive) return;
      tl.current = gsap.timeline()
        .to(q('.js-ph-line'), { yPercent: -110, duration: 0.35, stagger: 0.05, ease: 'power2.in' }, 0)
        .fromTo(to, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.inOut' }, 0.05)
        .fromTo(to.querySelector('.ph-img'), { scale: 1.05 }, { scale: 1, duration: 1.2, ease: 'power3.out' }, 0.05)
        .to(from, { opacity: 0, duration: 1, ease: 'power2.inOut' }, 0.05)
        .add(() => setShown(season), 0.38);
    };
    if (img) { img.loading = 'eager'; (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(run); } else run();
    return () => { alive = false; };
  }, [season]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!reduced) tl.current = textIn(0.02);
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const head = t[shown];
  return (
    <section ref={root} id="top" aria-labelledby="ph-title" className="relative isolate flex min-h-[94svh] items-end overflow-hidden bg-deep text-cream md:min-h-[100svh] md:items-center">
      <div className="js-ph-media absolute inset-0 -z-10 overflow-hidden">
        <div className="js-ph-par absolute inset-0">
          <Photo s="winter" alt={t.alt.winter} active={shown === 'winter'} />
          <Photo s="summer" alt={t.alt.summer} active={shown === 'summer'} />
        </div>
        {/* contrast only where the text sits: left on desktop, bottom on mobile; tinted by the season palette */}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--k-deep)_94%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_78%,transparent)_38%,color-mix(in_srgb,var(--k-deep)_30%,transparent)_60%,transparent_74%)] md:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--k-deep)_80%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_45%,transparent)_38%,transparent_62%)]" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[color-mix(in_srgb,var(--k-deep)_55%,transparent)] to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-[1440px] px-5 pb-[calc(104px+env(safe-area-inset-bottom,0px))] pt-36 sm:px-6 md:px-10 md:pb-16 md:pt-40 lg:px-14">
        <div className="max-w-[780px]">
          <p className="js-ph-eyebrow text-[11.5px] font-semibold uppercase tracking-[.34em] text-cream/90 md:text-[13px]">{t.eyebrow}</p>
          <h1 id="ph-title" className="mt-4 font-display font-normal leading-[1.02] tracking-[-0.012em] text-cream [text-shadow:0_2px_28px_rgba(0,0,0,.3)] md:mt-6" style={{ fontSize: 'clamp(36px, 5.2vw, 86px)' }}>
            <span className="block overflow-hidden pb-[0.06em]"><span className="js-ph-line block">{head[0]}</span></span>
            <span className="block overflow-hidden pb-[0.12em]"><span className="js-ph-line block text-gold-light">{head[1]}</span></span>
          </h1>
          <span aria-hidden className="js-ph-rule mt-6 block h-px w-16 origin-left bg-gold-light md:mt-8" />
          <ul className="mt-5 flex flex-wrap gap-x-3 gap-y-1.5 text-[11.5px] font-semibold uppercase tracking-[.22em] text-cream/90 md:mt-6 md:text-[13px]">
            {t.facts.map((f, i) => (
              <li key={f} className="js-ph-fact flex items-center gap-3">{i > 0 && <span aria-hidden className="text-gold-light">·</span>}{f}</li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4 md:mt-10">
            <a href={t.roomsHref} className="js-ph-cta ph-primary inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold">
              {t.rooms} <span className="arrow" aria-hidden>→</span>
            </a>
            <a href={t.contactHref} className="js-ph-cta ph-secondary inline-flex min-h-[54px] items-center justify-center rounded-full px-8 text-[15.5px] font-semibold">
              {t.contact}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
