import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { HOME, LEVEL, PLACES, TOURS, TOURS_COPY, TOUR_TYPES, type Tour, type TourType } from '../../content/tours';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { locale } from '../../lib/i18n';
import { Icon, I } from '../pension/PensionRooms';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const BASE = import.meta.env.BASE_URL;
const ICO = {
  ext: ['M14 5h5v5', 'M19 5l-8 8', 'M18 14v5H5V6h5'],
  route: ['M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M8 17h6a3 3 0 0 0 0-6H10a3 3 0 0 1 0-6h6'],
  dl: ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'],
  pin: ['M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z', 'M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z'],
  check: ['M5 12.5l4.2 4.2L19 7'],
  family: ['M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 8a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z', 'M5 21v-7l-1-4h8l-1 4v7', 'M14 21v-5l-1-4h6l-1 4v5'],
};
const dirUrl = (lat: number, lon: number) => `https://www.google.com/maps/dir/?api=1&origin=${HOME[0]},${HOME[1]}&destination=${lat},${lon}`;
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

function Heading({ eyebrow, title, id, light = false }: { eyebrow: string; title: string; id: string; light?: boolean }) {
  return (
    <header className="js-to-rev max-w-[820px]">
      <p className={`flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] md:text-[13px] ${light ? 'text-cream/80' : 'text-ink/75'}`}><span aria-hidden className={`h-px w-8 md:w-12 ${light ? 'bg-cream/50' : 'bg-ink/40'}`} />{eyebrow}</p>
      <h2 id={id} className={`mt-4 font-display font-medium italic leading-[1.02] tracking-[-0.01em] md:mt-5 ${light ? 'text-cream' : 'text-pine'}`} style={{ fontSize: 'clamp(34px, 4.2vw, 64px)' }}>{title}</h2>
    </header>
  );
}

function useReveal(root: React.RefObject<HTMLDivElement>, reduced: boolean, deps: unknown[] = []) {
  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-to-line'), { yPercent: 110 }, { yPercent: 0, duration: 0.95, stagger: 0.1, ease: 'power4.out' }, 0.2)
      .fromTo(q('.js-to-in'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.6);
    q('.js-to-rev').forEach((el) => gsap.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9, scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
  }, { scope: root, dependencies: [reduced, ...deps] });
}

/** Tour explorer – type tiles, length/ascent matrix, tour cards with official links, GPX and route to the start. */
export function ToursPage({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useFinePointer();
  const t = TOURS_COPY[lang];
  const [type, setType] = useState<TourType>('hike');
  const [hot, setHot] = useState<string | null>(null);
  const list = useMemo(() => TOURS.filter((x) => x.type === type), [type]);
  const nf = (n: number, d = 1) => n.toLocaleString(locale(lang), { maximumFractionDigits: d });
  useReveal(root, reduced);

  const choose = (k: TourType) => {
    setType(k);
    if (reduced || !root.current) return;
    const q = gsap.utils.selector(root);
    requestAnimationFrame(() => {
      gsap.fromTo(q('.js-to-card'), { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.05, ease: 'power3.out' });
      gsap.fromTo(q('.js-to-dot'), { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: 0.5, stagger: 0.05, ease: 'back.out(2.4)' });
    });
  };
  const matrix = list.filter((x) => x.km && x.up);
  const maxKm = Math.max(10, ...matrix.map((x) => x.km!)), maxUp = Math.max(200, ...matrix.map((x) => x.up!));
  const W = 560, H = 300, P = 44;

  return (
    <div ref={root} className="bg-cream text-ink">
      <section id="top" aria-labelledby="to-title" className="relative isolate overflow-hidden bg-deep px-5 pb-16 pt-52 text-cream sm:px-6 md:px-10 md:pb-20 md:pt-60 lg:px-14">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,color-mix(in_srgb,var(--k-gold)_18%,transparent),transparent_45%)]" />
        <div className="mx-auto max-w-[1440px]">
          <p className="js-to-in text-[11.5px] font-semibold uppercase tracking-[.34em] text-cream/90 md:text-[13px]">{t.eyebrow}</p>
          <h1 id="to-title" className="mt-4 font-display font-normal leading-[1.02] md:mt-6" style={{ fontSize: 'clamp(42px, 5.8vw, 92px)' }}>
            <span className="block overflow-hidden pb-[0.06em]"><span className="js-to-line block">{t.title[0]}</span></span>
            <span className="block overflow-hidden pb-[0.12em]"><span className="js-to-line block italic text-gold-light">{t.title[1]}</span></span>
          </h1>
          <p className="js-to-in mt-5 max-w-[600px] text-[16px] leading-relaxed text-cream/85 md:text-[18px]">{t.sub}</p>
          <div role="tablist" aria-label={t.pick} className="js-to-in mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {TOUR_TYPES.map((x) => {
              const on = type === x.id;
              return (
                <button key={x.id} type="button" role="tab" aria-selected={on} aria-controls="to-list" onClick={() => choose(x.id)}
                  className={`to-tile group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-[20px] p-4 text-left md:aspect-[4/3.2] md:p-5 ${on ? 'is-on' : ''}`}>
                  <img src={`${BASE}${x.img}`} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
                  <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[color-mix(in_srgb,var(--k-deep)_90%,transparent)] via-[color-mix(in_srgb,var(--k-deep)_30%,transparent)] to-transparent" />
                  <span className="font-display text-[22px] italic leading-tight md:text-[28px]">{x.label[lang]}</span>
                  <span className="mt-1 text-[12.5px] text-cream/75 md:text-[13.5px]">{x.sub[lang]} · {t.count(TOURS.filter((y) => y.type === x.id).length)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {matrix.length > 1 && (
        <section aria-labelledby="to-matrix" className="px-5 py-20 sm:px-6 md:px-10 md:py-24 lg:px-14">
          <div className="mx-auto grid max-w-[1360px] items-center gap-10 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <div>
              <Heading eyebrow={t.matrixEyebrow} title={t.matrixTitle} id="to-matrix" />
              <p className="mt-4 text-[13px] text-ink/50">{t.matrixNote}</p>
              <p className="mt-6 min-h-[64px] font-display text-[25px] italic leading-tight text-pine" aria-live="polite">{hot ? (() => { const x = list.find((y) => y.id === hot)!; return <>{x.name[lang]}<span className="lnum mt-1 block font-sans text-[14px] not-italic text-ink/60">{nf(x.km!)} km · {nf(x.up!, 0)} m</span></>; })() : ''}</p>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="group" aria-label={t.matrixTitle}>
              {[0, 0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={P} x2={W - 10} y1={H - P - f * (H - P - 14)} y2={H - P - f * (H - P - 14)} stroke="var(--k-pine)" strokeOpacity=".1" />)}
              {[0, 0.5, 1].map((f) => <text key={f} x={P - 8} y={H - P - f * (H - P - 14) + 4} fontSize="10" textAnchor="end" fill="var(--k-ink)" opacity=".5" className="lnum">{Math.round(maxUp * f)}</text>)}
              {[0, 0.5, 1].map((f) => <text key={f} x={P + f * (W - P - 10)} y={H - P + 18} fontSize="10" textAnchor="middle" fill="var(--k-ink)" opacity=".5" className="lnum">{Math.round(maxKm * f)}</text>)}
              <text x={W - 10} y={H - 6} fontSize="10.5" textAnchor="end" fill="var(--k-ink)" opacity=".6" fontWeight="600">{t.matrixX}</text>
              <text x={P} y={8} fontSize="10.5" fill="var(--k-ink)" opacity=".6" fontWeight="600">{t.matrixY}</text>
              {matrix.map((x) => {
                const cx = P + (x.km! / maxKm) * (W - P - 10), cy = H - P - (x.up! / maxUp) * (H - P - 14), on = hot === x.id;
                return (
                  <a key={x.id} href={`#to-${x.id}`} onMouseEnter={() => setHot(x.id)} onFocus={() => setHot(x.id)} onMouseLeave={() => setHot(null)} aria-label={`${x.name[lang]}: ${x.km} km, ${x.up} m`}>
                    <circle className={`js-to-dot to-dot is-${x.level ?? 'medium'}`} cx={cx} cy={cy} r={on ? 11 : 8} stroke="var(--k-cream)" strokeWidth="2.5" />
                  </a>
                );
              })}
            </svg>
          </div>
        </section>
      )}

      <section id="to-list" role="tabpanel" aria-label={TOUR_TYPES.find((x) => x.id === type)!.label[lang]} className="bg-soft px-5 py-20 sm:px-6 md:px-10 md:py-24 lg:px-14">
        <div className="mx-auto grid max-w-[1360px] gap-5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((x: Tour) => (
            <article key={x.id} id={`to-${x.id}`} className="js-to-card tp-card flex scroll-mt-32 flex-col overflow-hidden rounded-[24px] bg-cream">
              {x.img ? <div className="aspect-[16/9] overflow-hidden"><img src={`${BASE}${x.img}`} alt={x.name[lang]} loading="lazy" className="h-full w-full object-cover" /></div>
                : <div aria-hidden className={`to-band is-${x.level ?? 'medium'} h-2`} />}
              <div className="flex flex-1 flex-col p-6">
                <div className="flex flex-wrap items-center gap-2">
                  {x.level && <span className={`to-level is-${x.level} rounded-full px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[.1em]`}>{LEVEL[x.level][lang]}</span>}
                  {x.family && <span className="inline-flex items-center gap-1 rounded-full bg-pine/10 px-2.5 py-1 text-[11.5px] font-semibold text-pine"><Icon d={ICO.family} size={13} w={1.5} />{t.family}</span>}
                </div>
                <h3 className="mt-3 font-display text-[26px] italic leading-tight text-pine">{x.name[lang]}</h3>
                <dl className="lnum mt-4 grid grid-cols-3 gap-2 text-center">
                  {[[t.km, x.km ? `${nf(x.km)} km` : '–'], [t.up, x.up ? `${nf(x.up, 0)} m` : '–'], [t.time, x.time?.[lang] ?? '–']].map(([k, v]) => (
                    <div key={k} className="rounded-[12px] bg-soft px-2 py-2.5"><dt className="text-[10.5px] font-semibold uppercase tracking-[.12em] text-ink/50">{k}</dt><dd className="mt-1 text-[14.5px] font-semibold text-pine">{v}</dd></div>
                  ))}
                </dl>
                <ul className="mt-4 space-y-1.5">{x.highlights[lang].map((h) => <li key={h} className="flex gap-2 text-[14px] leading-snug text-ink/75"><span className="mt-0.5 text-goldink"><Icon d={ICO.check} size={13} w={2.2} /></span>{h}</li>)}</ul>
                {x.season && <p className="mt-3 text-[12.5px] text-ink/55">{t.season}: {x.season[lang]}</p>}
                <p className="mt-3 flex items-start gap-2 text-[13px] leading-snug text-ink/65"><span className="mt-0.5 text-pine"><Icon d={ICO.pin} size={14} w={1.6} /></span><span><b className="font-semibold text-ink/80">{t.start}:</b> {x.start[lang]}<span className="lnum block text-ink/50">{x.startKm < 1.5 ? t.fromHouseWalk : t.fromHouse(nf(x.startKm), x.startMin)}</span></span></p>
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <a href={x.url} {...ext} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-pine px-4 text-[13px] font-semibold text-cream hover:bg-deep">{t.official}<Icon d={ICO.ext} size={12} w={1.8} /></a>
                  {x.gpx && <a href={x.gpx} {...ext} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-pine/15 px-4 text-[13px] font-semibold text-pine hover:border-pine"><Icon d={ICO.dl} size={13} w={1.8} />{t.gpx}</a>}
                  <a href={dirUrl(x.lat, x.lon)} {...ext} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-pine/15 px-4 text-[13px] font-semibold text-pine hover:border-pine"><Icon d={ICO.route} size={14} w={1.6} />{t.route}</a>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-[1360px] text-[13px] text-ink/50">{t.note}</p>
      </section>

      <section className="px-4 py-16 pb-[calc(110px+env(safe-area-inset-bottom,0px))] sm:px-6 md:px-10 md:pb-24 lg:px-14">
        <div className="mx-auto grid max-w-[1400px] gap-4 md:grid-cols-2">
          <a href="#places" className="group flex min-h-[110px] items-center justify-between gap-4 rounded-[24px] bg-pine p-7 text-cream"><span className="font-display text-[26px] italic leading-tight md:text-[32px]">{t.ctaPlaces}</span><Icon d={I.arrow} size={22} w={1.6} /></a>
          <a href="#experiences" className="group flex min-h-[110px] items-center justify-between gap-4 rounded-[24px] border border-pine/15 bg-white p-7 text-pine"><span className="font-display text-[26px] italic leading-tight md:text-[32px]">{t.ctaTop}</span><Icon d={I.arrow} size={22} w={1.6} /></a>
        </div>
      </section>
    </div>
  );
}

/** Destination guides – one editorial chapter per place, alternating sides. */
export function PlacesPage({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const t = TOURS_COPY[lang];
  const nf = (n: number) => n.toLocaleString(locale(lang), { maximumFractionDigits: 1 });
  useReveal(root, reduced);
  return (
    <div ref={root} className="bg-cream text-ink">
      <section id="top" aria-labelledby="pl-title" className="relative isolate overflow-hidden bg-deep px-5 pb-16 pt-52 text-cream sm:px-6 md:px-10 md:pb-20 md:pt-60 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <p className="js-to-in text-[11.5px] font-semibold uppercase tracking-[.34em] text-cream/90 md:text-[13px]">{t.placesEyebrow}</p>
          <h1 id="pl-title" className="mt-4 font-display font-normal leading-[1.02] md:mt-6" style={{ fontSize: 'clamp(42px, 5.8vw, 92px)' }}>
            <span className="block overflow-hidden pb-[0.06em]"><span className="js-to-line block">{t.placesTitle[0]}</span></span>
            <span className="block overflow-hidden pb-[0.12em]"><span className="js-to-line block italic text-gold-light">{t.placesTitle[1]}</span></span>
          </h1>
          <p className="js-to-in mt-5 max-w-[600px] text-[16px] leading-relaxed text-cream/85 md:text-[18px]">{t.placesSub}</p>
          <ol className="js-to-in mt-10 flex flex-wrap gap-2">
            {PLACES.map((p, i) => <li key={p.id}><a href={`#pl-${p.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`pl-${p.id}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cream/25 px-4 text-[14px] font-semibold text-cream/90 hover:border-gold-light"><span className="lnum text-gold-light">{String(i + 1).padStart(2, '0')}</span>{p.name}</a></li>)}
          </ol>
        </div>
      </section>
      {PLACES.map((p, i) => (
        <section key={p.id} id={`pl-${p.id}`} aria-labelledby={`pl-${p.id}-t`} className={`scroll-mt-28 px-5 py-16 sm:px-6 md:px-10 md:py-24 lg:px-14 ${i % 2 ? 'bg-soft' : ''}`}>
          <div className={`mx-auto grid max-w-[1360px] items-center gap-8 lg:gap-16 ${p.img ? 'lg:grid-cols-2' : ''}`}>
            {p.img && <div className={`js-to-rev relative aspect-[4/3] overflow-hidden rounded-[26px] ${i % 2 ? 'lg:order-2' : ''}`}><img src={`${BASE}${p.img}`} alt={p.name} loading="lazy" className="h-full w-full object-cover" /></div>}
            <div className="js-to-rev min-w-0">
              <p className="lnum flex items-center gap-3 text-[12.5px] font-semibold uppercase tracking-[.24em] text-goldink"><span>{String(i + 1).padStart(2, '0')}</span><span aria-hidden className="h-px w-10 bg-goldink/40" />{p.km < 1.5 ? t.here : t.away(nf(p.km), p.min)}</p>
              <h2 id={`pl-${p.id}-t`} className="mt-3 font-display font-medium italic leading-[1.02] text-pine" style={{ fontSize: 'clamp(36px, 4.4vw, 66px)' }}>{p.name}</h2>
              <p className="mt-2 font-display text-[21px] italic text-ink/70">{p.tagline[lang]}</p>
              <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-ink/75">{p.intro[lang]}</p>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-[11.5px] font-semibold uppercase tracking-[.18em] text-ink/55">{t.dontMiss}</p>
                  <ul className="mt-2 divide-y divide-pine/10">{p.dontMiss.map((d) => <li key={d.url + d.name.en}><a href={d.url} {...ext} className="flex items-center justify-between gap-3 py-2.5 text-[14.5px] font-semibold text-pine hover:text-goldink">{d.name[lang]}<Icon d={ICO.ext} size={12} w={1.8} /></a></li>)}</ul>
                </div>
                {p.know[lang].length > 0 && <div>
                  <p className="text-[11.5px] font-semibold uppercase tracking-[.18em] text-ink/55">{t.know}</p>
                  <ul className="mt-2 space-y-2">{p.know[lang].map((k) => <li key={k} className="flex gap-2 text-[14px] leading-snug text-ink/75"><span className="mt-0.5 text-goldink"><Icon d={ICO.check} size={13} w={2.2} /></span>{k}</li>)}</ul>
                </div>}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <a href={p.url} {...ext} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-pine px-5 text-[14px] font-semibold text-cream hover:bg-deep">{t.visit}<Icon d={ICO.ext} size={12} w={1.8} /></a>
                {p.km >= 1.5 && <a href={dirUrl(p.lat, p.lon)} {...ext} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-pine/15 px-5 text-[14px] font-semibold text-pine hover:border-pine"><Icon d={ICO.route} size={14} w={1.6} />{t.route}</a>}
              </div>
            </div>
          </div>
        </section>
      ))}
      <section className="px-4 pb-[calc(110px+env(safe-area-inset-bottom,0px))] sm:px-6 md:px-10 md:pb-24 lg:px-14">
        <div className="mx-auto grid max-w-[1400px] gap-4 md:grid-cols-2">
          <a href="#tours" className="flex min-h-[110px] items-center justify-between gap-4 rounded-[24px] bg-pine p-7 text-cream"><span className="font-display text-[26px] italic leading-tight md:text-[32px]">{t.eyebrow.split(' · ')[0]}</span><Icon d={I.arrow} size={22} w={1.6} /></a>
          <a href="#experiences" className="flex min-h-[110px] items-center justify-between gap-4 rounded-[24px] border border-pine/15 bg-white p-7 text-pine"><span className="font-display text-[26px] italic leading-tight md:text-[32px]">{t.ctaTop}</span><Icon d={I.arrow} size={22} w={1.6} /></a>
        </div>
      </section>
    </div>
  );
}
