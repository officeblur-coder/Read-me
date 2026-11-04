import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang, Season } from '../../content/hero';
import { useFinePointer, useIsMobile, useReducedMotion } from '../../lib/hooks';
import { useSeason } from '../../lib/season';
import { SeasonFx } from '../SeasonFx';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const IMG = `${import.meta.env.BASE_URL}images/pension/`;
const SITE = 'https://www.kitzalpen.at';

/** Two original photos; focal points keep the building in frame on desktop and mobile. */
const PHOTO: Record<Season, { stem: string; sizes: number[]; desk: string; mob: string }> = {
  winter: { stem: 'hero-winter', sizes: [900, 1600], desk: '62% 50%', mob: '50% 45%' },
  summer: { stem: 'hero-summer', sizes: [900, 1600], desk: '70% 45%', mob: '78% 45%' },
};

/** Reitlehen 42 (OSM Nominatim, see content/map-points.json): 47.27268 N, 12.42573 E */
const COORDS = '47°16′22″ N · 12°25′33″ E';

const COPY = {
  de: {
    eyebrow: 'Die Pension · Hollersbach im Pinzgau',
    winter: ['Ihr Zuhause in den Alpen,', 'ganz nah an den Bergen.'],
    summer: ['Nah an allem, was Ihren', 'Urlaub besonders macht.'],
    stats: [{ n: 17, u: '', l: 'Zimmer', m: 'Zimmer' }, { n: 4, u: '', l: 'Zimmerkategorien', m: 'Kategorien' }, { n: 2, u: ' km', l: 'zur Panoramabahn', m: 'Panoramabahn' }],
    eyebrowShort: 'Die Pension · Hollersbach',
    tag: 'Restaurant & Bar im Haus',
    rooms: 'Zimmer entdecken', contact: 'Kontakt aufnehmen', scroll: 'Scrollen',
    roomsHref: `${SITE}/rooms/`, contactHref: `${SITE}/contact/`,
    alt: { winter: 'Die Pension im Winter, verschneit, mit Holzbalkonen', summer: 'Die Pension im Sommer mit Garten, Terrasse, Holzbalkonen und Bergen im Hintergrund' },
  },
  en: {
    eyebrow: 'The Pension · Hollersbach im Pinzgau',
    winter: ['Your alpine home,', 'closer to the mountains.'],
    summer: ['Stay close to everything', 'that matters.'],
    stats: [{ n: 17, u: '', l: 'Rooms', m: 'Rooms' }, { n: 4, u: '', l: 'Room categories', m: 'Categories' }, { n: 2, u: ' km', l: 'to Panoramabahn', m: 'Panoramabahn' }],
    eyebrowShort: 'The Pension · Hollersbach',
    tag: 'Restaurant & bar in-house',
    rooms: 'Explore our rooms', contact: 'Contact us', scroll: 'Scroll',
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
        <img src={`${IMG}${p.stem}.jpg`} alt={active ? alt : ''} aria-hidden={!active} width={1600} height={1019}
          loading={active ? 'eager' : 'lazy'} decoding="async"
          // @ts-expect-error fetchpriority is valid HTML
          fetchpriority={active ? 'high' : 'low'}
          className="ph-img h-full w-full object-cover" style={{ ['--pos-d' as string]: p.desk, ['--pos-m' as string]: p.mob }} />
      </picture>
    </div>
  );
}

/** Stepped "timber slat" mask: n vertical boards rising from the bottom, staggered. */
function slatPolygon(t: number, n: number, rtl: boolean) {
  const lag = 0.55 / n;                       // stagger between boards
  const span = 1 - lag * (n - 1);
  const pts: string[] = ['0% 100%'];
  for (let k = 0; k < n; k++) {
    const i = rtl ? n - 1 - k : k;
    const raw = Math.max(0, Math.min(1, (t - i * lag) / span));
    const h = 1 - Math.pow(1 - raw, 3);       // ease-out per board
    const y = (100 - h * 100).toFixed(2);
    pts.push(`${((k / n) * 100).toFixed(3)}% ${y}%`, `${(((k + 1) / n) * 100).toFixed(3)}% ${y}%`);
  }
  pts.push('100% 100%');
  return `polygon(${pts.join(', ')})`;
}

/** Pension page · Section 01 – cinematic hero. Reads the shared season; no selector of its own. */
export function PensionHero({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const { season } = useSeason();
  const [shown, setShown] = useState<Season>(season);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const mobile = useIsMobile();
  const tl = useRef<gsap.core.Timeline | null>(null);
  const first = useRef(true);
  const mounted = useRef(false);
  const t = COPY[lang];

  const q = (s: string) => (root.current ? Array.from(root.current.querySelectorAll<HTMLElement>(s)) : []);
  const photo = (s: Season) => q(`.js-ph-photo[data-season="${s}"]`)[0];
  const wordsIn = (d = 0) => gsap.timeline({ delay: d })
    .fromTo(q('.js-ph-word'), { yPercent: 115, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 1, stagger: 0.045, ease: 'power4.out' }, 0);

  // opening: a cinematic shutter parts from the middle while the lens pulls focus on the house
  useGSAP(() => {
    if (reduced) return;
    const frame = q('.js-ph-frame')[0];
    const open = 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)';
    gsap.set(frame, { clipPath: open });
    const blur = mobile ? 14 : 22;
    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
      // the slit widens to a letterbox, holds a beat, then the bars leave the frame
      .fromTo(q('.js-ph-bar'), { scaleY: 1 }, { scaleY: 0.26, duration: 1.2, ease: 'expo.inOut' }, 0.15)
      .to(q('.js-ph-bar'), { scaleY: 0, duration: 1.1, ease: 'expo.inOut' }, 1.45)
      // focus pull + exposure settling, with a slow push away from the house
      .fromTo(q('.js-ph-kb'), { scale: 1.16, filter: `blur(${blur}px) brightness(1.35) saturate(.65)` },
        { scale: 1, filter: 'blur(0px) brightness(1) saturate(1)', duration: 2.6, ease: 'power2.inOut', clearProps: 'filter' }, 0.15)
      .fromTo(q('.js-ph-veil'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, ease: 'power1.out' }, 1.5)
      .fromTo(q('.js-ph-eyebrow'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 1.45)
      .fromTo(q('.js-ph-word'), { yPercent: 115, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.05, ease: 'power4.out' }, 1.5)
      .fromTo(q('.js-ph-rule'), { scaleX: 0 }, { scaleX: 1, duration: 0.9 }, 2.0)
      .fromTo(q('.js-ph-stat'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.1 }, 2.0)
      .fromTo(q('.js-ph-cta'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 2.2)
      .fromTo(q('.js-ph-side'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 2.3);

    // numbers count up with the stats
    q('.js-ph-num').forEach((el, i) => {
      const end = Number(el.dataset.n); const o = { v: 0 };
      intro.to(o, { v: end, duration: 1.4, ease: 'power2.out', onUpdate: () => { el.textContent = String(Math.round(o.v)); } }, 2.05 + i * 0.1);
    });

    // slow breathing of the photo, forever
    intro.add(() => { gsap.to(q('.js-ph-kb'), { scale: 1.07, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1 }); }, 2.8);

    // on scroll the frame lifts into a rounded card and the copy drifts away faster than the photo
    intro.add(() => {
      gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.6 } })
        .to(frame, { clipPath: mobile ? 'inset(0% 3% 8% 3% round 0px 0px 26px 26px)' : 'inset(0% 2.5% 10% 2.5% round 0px 0px 34px 34px)', ease: 'none' }, 0)
        .to(q('.js-ph-par'), { yPercent: 14, ease: 'none' }, 0)
        .to(q('.js-ph-copy'), { y: mobile ? -60 : -120, autoAlpha: 0.15, ease: 'none' }, 0)
        .to(q('.js-ph-side'), { autoAlpha: 0, duration: 0.25, ease: 'none' }, 0);
    }, 2.6);
  }, { scope: root, dependencies: [reduced] });

  // desktop: the scene follows the pointer a few pixels, like looking through a window
  useEffect(() => {
    const el = root.current, layer = q('.js-ph-ptr')[0];
    if (!el || !layer || !fine || reduced) return;
    const xTo = gsap.quickTo(layer, 'x', { duration: 1.2, ease: 'power3.out' });
    const yTo = gsap.quickTo(layer, 'y', { duration: 1.2, ease: 'power3.out' });
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); xTo(-((e.clientX - r.left) / r.width - 0.5) * 22); yTo(-((e.clientY - r.top) / r.height - 0.5) * 14); };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, [fine, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  // season switch: headline out → the new photo rises in timber slats → headline in
  useEffect(() => {
    const isMount = !mounted.current; mounted.current = true;
    if (isMount) return;
    tl.current?.kill();
    const from = photo(shown), to = photo(season);
    if (season === shown) {
      if (from) gsap.set(from, { opacity: 1, clipPath: 'none' });
      const other = photo(shown === 'summer' ? 'winter' : 'summer'); if (other) gsap.set(other, { opacity: 0, clipPath: 'none' });
      if (!reduced) tl.current = wordsIn();
      return;
    }
    if (!from || !to) { setShown(season); return; }
    if (reduced) { gsap.set(from, { opacity: 0 }); gsap.set(to, { opacity: 1, clipPath: 'none' }); setShown(season); return; }
    const img = to.querySelector('img') as HTMLImageElement | null;
    let alive = true;
    const run = () => {
      if (!alive) return;
      const n = mobile ? 5 : 9, rtl = season === 'winter', s = { t: 0 };
      gsap.set(to, { opacity: 1, zIndex: 2, clipPath: slatPolygon(0, n, rtl) });
      gsap.set(from, { opacity: 1, zIndex: 1 });
      tl.current = gsap.timeline()
        .to(q('.js-ph-word'), { yPercent: -115, duration: 0.4, stagger: 0.025, ease: 'power2.in' }, 0)
        .to(s, { t: 1, duration: 1.5, ease: 'power1.inOut', onUpdate: () => { to.style.clipPath = slatPolygon(s.t, n, rtl); } }, 0.1)
        .fromTo(to.querySelector('.ph-img'), { scale: 1.12, yPercent: 3 }, { scale: 1, yPercent: 0, duration: 1.9, ease: 'power3.out' }, 0.1)
        .add(() => setShown(season), 0.5)
        .add(() => { gsap.set(from, { opacity: 0, zIndex: 0 }); gsap.set(to, { clipPath: 'none', zIndex: 0 }); }, 1.62);
    };
    if (img) { img.loading = 'eager'; (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(run); } else run();
    return () => { alive = false; };
  }, [season]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!reduced) tl.current = wordsIn(0.02);
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const head = t[shown];
  const words = (line: string) => line.split(' ').map((w, i) => (
    <span key={i} className="inline-block overflow-hidden pb-[0.1em] align-top"><span className="js-ph-word inline-block">{w}</span>{' '}</span>
  ));
  return (
    <section ref={root} id="top" aria-labelledby="ph-title" className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-deep text-cream">
      <div className="js-ph-frame absolute inset-0 -z-10 overflow-hidden bg-deep">
        <div className="js-ph-par absolute inset-0">
          <div className="js-ph-ptr absolute -inset-4">
            <div className="js-ph-kb absolute inset-0 will-change-transform">
              <Photo s="winter" alt={t.alt.winter} active={shown === 'winter'} />
              <Photo s="summer" alt={t.alt.summer} active={shown === 'summer'} />
            </div>
          </div>
        </div>
        <div aria-hidden className="js-ph-bar ph-bar pointer-events-none absolute inset-x-0 top-0 z-[8] h-1/2 origin-top bg-deep" />
        <div aria-hidden className="js-ph-bar ph-bar pointer-events-none absolute inset-x-0 bottom-0 z-[8] h-[calc(50%+1px)] origin-bottom bg-deep" />
        <SeasonFx mode={season} mobile={mobile} reduced={reduced} />
        {/* contrast only where the text sits: bottom-left; tinted by the season palette */}
        <div aria-hidden className="js-ph-veil pointer-events-none absolute inset-0 z-[6]">
          <div className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--k-deep)_95%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_72%,transparent)_34%,color-mix(in_srgb,var(--k-deep)_22%,transparent)_58%,transparent_72%)] md:bg-[linear-gradient(20deg,color-mix(in_srgb,var(--k-deep)_88%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_55%,transparent)_32%,transparent_60%)]" />
          <div className="absolute inset-0 hidden bg-[radial-gradient(60%_70%_at_100%_100%,color-mix(in_srgb,var(--k-deep)_70%,transparent),transparent_70%)] lg:block" />
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[color-mix(in_srgb,var(--k-deep)_60%,transparent)] to-transparent" />
          <div className="ph-grain absolute inset-0" />
        </div>
      </div>

      {/* editorial side rail (desktop): real coordinates of the house */}
      <p aria-hidden className="js-ph-side ph-rail pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 text-[11px] font-semibold uppercase tracking-[.38em] text-cream/75 lg:block xl:right-10">
        {COORDS}<span className="mx-4 text-gold-light">—</span>Reitlehen 42
      </p>

      <div className="js-ph-copy relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-[calc(100px+env(safe-area-inset-bottom,0px))] pt-36 sm:px-6 md:px-10 md:pb-14 lg:px-14">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
          <div className="min-w-0 max-w-[1000px]">
            <p className="js-ph-eyebrow flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.32em] text-cream/90 md:text-[12.5px]">
              <span aria-hidden className="h-px w-8 bg-gold-light max-sm:hidden" /><span className="sm:hidden">{t.eyebrowShort}</span><span className="max-sm:hidden">{t.eyebrow}</span>
            </p>
            <h1 id="ph-title" className="mt-5 font-display font-normal leading-[0.98] tracking-[-0.02em] text-cream [text-shadow:0_2px_30px_rgba(0,0,0,.28)] md:mt-7" style={{ fontSize: 'clamp(40px, 5.9vw, 100px)' }}>
              <span className="block">{words(head[0])}</span>
              <span className="block italic text-gold-light">{words(head[1])}</span>
            </h1>
            <dl className="mt-6 grid grid-cols-3 gap-3 lg:hidden">
              {t.stats.map((s) => (
                <div key={s.l} className="js-ph-stat flex min-w-0 flex-col gap-1.5 border-t border-cream/30 pt-2.5">
                  <dt className="order-2 truncate text-[10px] font-semibold uppercase tracking-[.16em] text-cream/80">{s.m}</dt>
                  <dd className="font-display text-[34px] leading-none text-cream"><span className="js-ph-num [font-variant-numeric:lining-nums_tabular-nums]" data-n={s.n}>{s.n}</span><span className="text-[.5em] text-gold-light">{s.u}</span></dd>
                </div>
              ))}
            </dl>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 md:mt-10">
              <a href={t.roomsHref} className="js-ph-cta ph-primary inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold">
                {t.rooms} <span className="arrow" aria-hidden>→</span>
              </a>
              <a href={t.contactHref} className="js-ph-cta ph-secondary inline-flex min-h-[54px] items-center justify-center rounded-full px-8 text-[15.5px] font-semibold">
                {t.contact}
              </a>
            </div>
          </div>

          {/* the house in numbers */}
          <div className="hidden lg:block lg:w-[300px]">
            <span aria-hidden className="js-ph-rule hidden h-px w-full origin-left bg-cream/35 lg:block" />
            <dl className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-0">
              {t.stats.map((s) => (
                <div key={s.l} className="js-ph-stat flex min-w-0 flex-col gap-2 border-t border-cream/25 pt-3 lg:flex-row lg:items-baseline lg:justify-between lg:border-t-0 lg:border-b lg:border-cream/20 lg:py-4">
                  <dt className="order-2 text-[10.5px] font-semibold uppercase leading-snug tracking-[.16em] text-cream/80 lg:text-[11.5px] lg:tracking-[.2em]">{s.l}</dt>
                  <dd className="order-1 font-display leading-none text-cream" style={{ fontSize: 'clamp(30px, 3.4vw, 52px)' }}>
                    <span className="js-ph-num [font-variant-numeric:lining-nums_tabular-nums]" data-n={s.n}>{s.n}</span><span className="text-[.5em] text-gold-light">{s.u}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="js-ph-stat mt-4 hidden items-center gap-2.5 text-[11.5px] font-semibold uppercase tracking-[.2em] text-gold-light lg:flex">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold-light" />{t.tag}
            </p>
          </div>
        </div>
      </div>

      {/* scroll cue */}
      <div aria-hidden className="js-ph-side pointer-events-none absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[.34em] text-cream/70 md:flex">
        {t.scroll}<span className="ph-cue relative block h-12 w-px overflow-hidden bg-cream/25" />
      </div>
    </section>
  );
}
