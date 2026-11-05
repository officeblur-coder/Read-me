import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang, Season } from '../../content/hero';
import { CATS, HOME_LL, TOP, TOP_COPY, type CatId, type Exp } from '../../content/topExperiences';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { useSeason } from '../../lib/season';
import { locale } from '../../lib/i18n';
import { Icon, I } from '../pension/PensionRooms';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const BASE = import.meta.env.BASE_URL;
const ICO = {
  ext: ['M14 5h5v5', 'M19 5l-8 8', 'M18 14v5H5V6h5'],
  route: ['M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M8 17h6a3 3 0 0 0 0-6H10a3 3 0 0 1 0-6h6'],
  car: ['M5 16h14l-1.5-5a2 2 0 0 0-1.9-1.4H8.4A2 2 0 0 0 6.5 11Z', 'M4 16v3h3v-3M17 16v3h3v-3'],
  family: ['M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 8a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z', 'M5 21v-7l-1-4h8l-1 4v7', 'M14 21v-5l-1-4h6l-1 4v5'],
  star: ['M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9Z'],
  check: ['M5 12.5l4.2 4.2L19 7'],
};
const bearing = (e: Exp) => {
  const r = Math.PI / 180, [la1, lo1] = HOME_LL, y = Math.sin((e.lon - lo1) * r) * Math.cos(e.lat * r);
  const x = Math.cos(la1 * r) * Math.sin(e.lat * r) - Math.sin(la1 * r) * Math.cos(e.lat * r) * Math.cos((e.lon - lo1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
};
const dirUrl = (e: Exp) => `https://www.google.com/maps/dir/?api=1&origin=${HOME_LL[0]},${HOME_LL[1]}&destination=${e.lat},${e.lon}&travelmode=driving`;
const img = (p?: string | null) => (p ? `${BASE}${p}` : null);
const nm = (e: Exp, lang: Lang) => (lang === 'de' ? e.name : e.nameEn ?? e.name);

function Pic({ e, lang, className = '' }: { e: Exp; lang: Lang; className?: string }) {
  const src = img(e.img);
  return src ? <img src={src} alt={nm(e, lang)} loading="lazy" className={`h-full w-full object-cover ${className}`} /> : (
    <div className={`tp-type relative h-full w-full overflow-hidden ${className}`} aria-hidden>
      <svg viewBox="0 0 400 260" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[70%] w-full"><path d="M0 260V170l70-60 50 40 90-100 80 90 50-40 60 60v100Z" fill="currentColor" opacity=".16" /><path d="M0 260v-40l100-60 70 40 110-70 120 80v50Z" fill="currentColor" opacity=".22" /></svg>
      <span className="absolute left-5 top-4 text-[11px] font-semibold uppercase tracking-[.22em] opacity-70">{CATS[e.cat][lang]}</span>
    </div>
  );
}

/** Top 15 per season – signature features, a 70 km radar, category filter, ranked list with official links. */
export function TopPage({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const { season, setSeason } = useSeason();
  const t = TOP_COPY[lang];
  const list = TOP[season];
  const [cat, setCat] = useState<CatId | 'all'>('all');
  const [sort, setSort] = useState<'rank' | 'km'>('rank');
  const [hot, setHot] = useState<string | null>(null);
  const sig = list.filter((e) => e.signature).slice(0, 3);
  const cats = useMemo(() => [...new Set(list.map((e) => e.cat))], [list]);
  const shown = useMemo(() => {
    const l = list.filter((e) => cat === 'all' || e.cat === cat);
    return sort === 'km' ? [...l].sort((a, b) => a.km - b.km) : l;
  }, [list, cat, sort]);
  const nf = (n: number) => n.toLocaleString(locale(lang));

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-tp-num'), { autoAlpha: 0, scale: 0.6, yPercent: 20 }, { autoAlpha: 1, scale: 1, yPercent: 0, duration: 1.2, ease: 'expo.out' }, 0.1)
      .fromTo(q('.js-tp-line'), { yPercent: 110 }, { yPercent: 0, duration: 0.95, stagger: 0.1, ease: 'power4.out' }, 0.35)
      .fromTo(q('.js-tp-in'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.75)
      .fromTo(q('.js-tp-sig'), { autoAlpha: 0, y: 60, rotate: (i: number) => [-4, 2, -2][i] ?? 0 }, { autoAlpha: 1, y: 0, rotate: (i: number) => [-3, 1.5, -1.5][i] ?? 0, duration: 1.1, stagger: 0.12, ease: 'back.out(1.3)' }, 0.6);
    q('.js-tp-rev').forEach((el) => gsap.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9, scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    ScrollTrigger.create({ trigger: q('.js-tp-radar')[0], start: 'top 75%', once: true, onEnter: () => {
      gsap.fromTo(q('.js-tp-ring'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 1.2, stagger: 0.12, ease: 'expo.out' });
      gsap.fromTo(q('.js-tp-dot'), { autoAlpha: 0, scale: 0, transformOrigin: 'center' }, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.05, delay: 0.5, ease: 'back.out(2.5)' });
    } });
  }, { scope: root, dependencies: [reduced, fine, season] });

  const refilter = (fn: () => void) => {
    fn();
    if (reduced || !root.current) return;
    const q = gsap.utils.selector(root);
    requestAnimationFrame(() => gsap.fromTo(q('.js-tp-card'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.04, ease: 'power3.out' }));
  };
  const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;
  const heading = (eyebrow: string, title: string, id: string, light = false) => (
    <header className="js-tp-rev max-w-[820px]">
      <p className={`flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] md:text-[13px] ${light ? 'text-cream/80' : 'text-ink/75'}`}><span aria-hidden className={`h-px w-8 md:w-12 ${light ? 'bg-cream/50' : 'bg-ink/40'}`} />{eyebrow}</p>
      <h2 id={id} className={`mt-4 font-display font-medium italic leading-[1.02] tracking-[-0.01em] md:mt-5 ${light ? 'text-cream' : 'text-pine'}`} style={{ fontSize: 'clamp(34px, 4.2vw, 64px)' }}>{title}</h2>
    </header>
  );
  const R = 150; // radar radius (px in a 360 viewBox) = 70 km

  return (
    <div ref={root} className="bg-cream text-ink">
      {/* hero */}
      <section id="top" aria-labelledby="tp-title" className="relative isolate overflow-hidden bg-deep pb-[calc(90px+env(safe-area-inset-bottom,0px))] pt-52 text-cream md:pb-24 md:pt-60">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,color-mix(in_srgb,var(--k-gold)_22%,transparent),transparent_50%),radial-gradient(circle_at_10%_90%,color-mix(in_srgb,var(--k-pine)_70%,transparent),transparent_60%)]" />
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 sm:px-6 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:px-14">
          <div>
            <p className="js-tp-in text-[11.5px] font-semibold uppercase tracking-[.34em] text-cream/90 md:text-[13px]">{t.eyebrow[season]}</p>
            <div className="mt-4 flex items-end gap-5">
              <span className="js-tp-num lnum font-display text-[120px] font-medium leading-[.8] text-gold-light md:text-[190px]">15</span>
              <h1 id="tp-title" className="pb-2 font-display font-normal leading-[1.02]" style={{ fontSize: 'clamp(30px, 3.6vw, 56px)' }}>
                <span className="block overflow-hidden pb-[0.06em]"><span className="js-tp-line block">{t.title[0]}</span></span>
                <span className="block overflow-hidden pb-[0.12em]"><span className="js-tp-line block italic text-gold-light">{t.title[1][season]}</span></span>
              </h1>
            </div>
            <p className="js-tp-in mt-6 max-w-[540px] text-[16px] leading-relaxed text-cream/85 md:text-[18px]">{t.sub}</p>
            <div className="js-tp-in mt-7 inline-flex rounded-full border border-cream/20 bg-cream/5 p-1.5" role="group" aria-label={t.seasonLabel}>
              {(['winter', 'summer'] as Season[]).map((s) => (
                <button key={s} type="button" aria-pressed={season === s} onClick={() => { setCat('all'); setSeason(s); }}
                  className={`min-h-11 rounded-full px-5 text-[14.5px] font-semibold transition-colors ${season === s ? 'bg-cream text-deep' : 'text-cream/80 hover:text-cream'}`}>{t.seasons[s]}</button>
              ))}
            </div>
          </div>
          {/* three signature cards, fanned */}
          <div className="relative grid grid-cols-3 gap-3 md:gap-5">
            {sig.map((e, i) => (
              <a key={e.id} href={`#tp-${e.id}`} className={`js-tp-sig group relative block aspect-[3/4.4] overflow-hidden rounded-[20px] shadow-[0_40px_80px_-40px_rgba(0,0,0,.8)] ${i === 1 ? 'md:-translate-y-8' : 'md:translate-y-4'}`}>
                <Pic e={e} lang={lang} className="transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--k-deep)_88%,transparent)] via-transparent to-transparent" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold-light px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[.1em] text-deep"><Icon d={ICO.star} size={11} w={2} />Top</span>
                <span className="absolute inset-x-3 bottom-3 md:inset-x-4 md:bottom-4">
                  <span className="block font-display text-[16px] italic leading-tight md:text-[23px]">{nm(e, lang)}</span>
                  <span className="lnum mt-1 block text-[11.5px] text-cream/75 md:text-[12.5px]">{nf(e.km)} km</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* radar */}
      <section aria-labelledby="tp-radar" className="px-5 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto grid max-w-[1360px] items-center gap-12 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
          <div>
            {heading(t.radarEyebrow, t.radarTitle, 'tp-radar')}
            <p className="js-tp-rev mt-5 max-w-[48ch] text-[16px] leading-relaxed text-ink/70">{t.radarText}</p>
            <p className="js-tp-rev mt-4 text-[13px] text-ink/50">{t.radarNote}</p>
            <p className="mt-6 min-h-[56px] font-display text-[26px] italic leading-tight text-pine" aria-live="polite">{hot ? (() => { const e = list.find((x) => x.id === hot)!; return <>{nm(e, lang)} <span className="lnum font-sans text-[15px] not-italic text-ink/60">· {nf(e.km)} km · {e.town}</span></>; })() : ''}</p>
          </div>
          <div className="js-tp-radar relative mx-auto w-full max-w-[560px]">
            <svg viewBox="-80 0 520 360" className="w-full overflow-visible" role="group" aria-label={t.radarTitle}>
              {[5, 15, 35, 70].map((k) => <circle key={k} className="js-tp-ring" cx="180" cy="180" r={Math.sqrt(k / 70) * R} fill="none" stroke="var(--k-pine)" strokeOpacity={k === 70 ? 0.35 : 0.14} strokeDasharray={k === 70 ? '0' : '3 5'} />)}
              {[5, 15, 35, 70].map((k) => <text key={k} x={180 + 4} y={180 - Math.sqrt(k / 70) * R - 4} fontSize="9" fill="var(--k-ink)" opacity=".45" className="lnum">{k} km</text>)}
              {['N', 'O', 'S', 'W'].map((d, i) => <text key={d} x={180 + Math.sin((i * Math.PI) / 2) * (R + 16)} y={180 - Math.cos((i * Math.PI) / 2) * (R + 16) + 4} fontSize="11" textAnchor="middle" fill="var(--k-ink)" opacity=".5" fontWeight="600">{lang === 'de' ? d : ['N', 'E', 'S', 'W'][i]}</text>)}
              <g>
                <circle cx="180" cy="180" r="11" fill="var(--k-pine)" />
                <path d="M174 182l6-6 6 6v6h-12Z" fill="var(--k-cream)" />
              </g>
              {list.map((e) => {
                const b = (bearing(e) * Math.PI) / 180, d = Math.sqrt(Math.min(e.km, 70) / 70) * R;
                const x = 180 + Math.sin(b) * d, y = 180 - Math.cos(b) * d, on = hot === e.id;
                return (
                  <a key={e.id} href={`#tp-${e.id}`} onMouseEnter={() => setHot(e.id)} onFocus={() => setHot(e.id)} onMouseLeave={() => setHot(null)} aria-label={`${nm(e, lang)}, ${e.km} km`}>
                    <circle className="js-tp-dot" cx={x} cy={y} r={on ? 9 : e.signature ? 8 : 5.5} fill={e.signature ? 'var(--k-goldink, var(--k-gold))' : 'var(--k-pine)'} stroke="var(--k-cream)" strokeWidth="2" style={{ transition: 'r .2s ease' }} />
                    {(e.signature || on) && <text x={x + (Math.sin(b) >= 0 ? 12 : -12)} y={y + 4} fontSize="10.5" fontWeight="600" textAnchor={Math.sin(b) >= 0 ? 'start' : 'end'} fill="var(--k-ink)" stroke="var(--k-cream)" strokeWidth="3" paintOrder="stroke">{nm(e, lang)}</text>}
                  </a>
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      {/* list */}
      <section aria-labelledby="tp-list" className="bg-soft px-5 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto max-w-[1360px]">
          {heading(t.listEyebrow, t.listTitle[season], 'tp-list')}
          <div className="js-tp-rev mt-8 flex flex-wrap items-center gap-2">
            <div className="rs-track -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
              {(['all', ...cats] as const).map((c) => (
                <button key={c} type="button" aria-pressed={cat === c} onClick={() => refilter(() => setCat(c))} className={`gp-chip inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[14px] font-semibold ${cat === c ? 'is-on' : ''}`}>{c === 'all' ? t.all : CATS[c][lang]}</button>
              ))}
            </div>
            <div className="ml-auto inline-flex rounded-full border border-pine/15 bg-cream p-1" role="group" aria-label={t.sortLabel}>
              {(['rank', 'km'] as const).map((s) => <button key={s} type="button" aria-pressed={sort === s} onClick={() => refilter(() => setSort(s))} className={`min-h-10 rounded-full px-4 text-[13.5px] font-semibold ${sort === s ? 'bg-pine text-cream' : 'text-pine'}`}>{t.sort[s]}</button>)}
            </div>
          </div>
          <ol className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((e) => (
              <li key={e.id} id={`tp-${e.id}`} className="js-tp-card scroll-mt-32">
                <article className="tp-card group flex h-full flex-col overflow-hidden rounded-[24px] bg-cream">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Pic e={e} lang={lang} className="transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]" />
                    <span className="lnum absolute left-4 top-3 font-display text-[54px] leading-none text-white [text-shadow:0_2px_18px_rgba(0,0,0,.45)]">{String(list.indexOf(e) + 1).padStart(2, '0')}</span>
                    <span className="absolute bottom-3 right-3 rounded-full bg-deep/70 px-3 py-1 text-[12px] font-semibold text-cream backdrop-blur-sm">{CATS[e.cat][lang]}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="lnum flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-semibold text-ink/55">
                      <span>{e.town}</span><span className="inline-flex items-center gap-1"><Icon d={ICO.car} size={13} w={1.7} />{nf(e.km)} km · {t.min(e.min)}</span>
                      {e.family && <span className="inline-flex items-center gap-1 text-pine"><Icon d={ICO.family} size={14} w={1.5} />{t.family}</span>}
                    </p>
                    <h3 className="mt-2 font-display text-[27px] italic leading-tight text-pine">{nm(e, lang)}</h3>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-ink/75">{e.text[lang]}</p>
                    {e.facts[lang].length > 0 && <ul className="mt-3 space-y-1.5">{e.facts[lang].map((f) => <li key={f} className="flex gap-2 text-[13.5px] leading-snug text-ink/70"><span className="mt-0.5 text-goldink"><Icon d={ICO.check} size={13} w={2.2} /></span>{f}</li>)}</ul>}
                    {e.open && <p className="mt-3 rounded-[12px] bg-soft px-3 py-2 text-[12.5px] leading-snug text-ink/65">{e.open[lang]}</p>}
                    <div className="mt-auto flex flex-wrap gap-2 pt-5">
                      <a href={e.url} {...ext} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-pine px-4 text-[13px] font-semibold text-cream hover:bg-deep">{t.official}<Icon d={ICO.ext} size={12} w={1.8} /></a>
                      <a href={dirUrl(e)} {...ext} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-pine/15 px-4 text-[13px] font-semibold text-pine hover:border-pine"><Icon d={ICO.route} size={14} w={1.6} />{t.route}</a>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-[13px] text-ink/50">{t.note}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 pb-[calc(110px+env(safe-area-inset-bottom,0px))] sm:px-6 md:px-10 md:pb-24 lg:px-14">
        <div className="js-tp-rev mx-auto flex max-w-[1400px] flex-col items-start gap-6 rounded-[28px] bg-pine p-8 text-cream md:flex-row md:items-end md:justify-between md:p-14">
          <div className="max-w-[620px]">
            <h2 className="font-display font-medium italic leading-[1.02]" style={{ fontSize: 'clamp(32px, 4vw, 58px)' }}>{t.ctaTitle}</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-cream/85">{t.ctaText}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="#all-rooms" className="ph-primary inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold">{t.rooms}<Icon d={I.arrow} size={17} w={1.8} /></a>
            <a href="#arrival" className="ph-secondary inline-flex min-h-[54px] items-center justify-center rounded-full px-7 text-[15px] font-semibold">{t.arrival}</a>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Home teaser – five of the season's top experiences as a film strip, link to the page. */
export function TopTeaser({ lang }: { lang: Lang }) {
  const { season } = useSeason();
  const t = TOP_COPY[lang];
  const list = TOP[season];
  const pick = [...list.filter((e) => e.signature), ...list.filter((e) => !e.signature && e.img)].slice(0, 5);
  return (
    <section aria-labelledby="tt-title" className="overflow-hidden bg-cream px-5 py-16 sm:px-6 md:px-10 md:py-24 lg:px-14">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <span className="lnum font-display text-[92px] font-medium leading-[.8] text-goldink md:text-[132px]">15</span>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[.3em] text-ink/65">{t.teaserEyebrow[season]}</p>
              <h2 id="tt-title" className="mt-2 font-display font-medium italic leading-[1.02] text-pine" style={{ fontSize: 'clamp(30px, 3.6vw, 54px)' }}>{t.teaserTitle}</h2>
            </div>
          </div>
          <a href="#experiences" className="ph-primary inline-flex min-h-[54px] items-center justify-center gap-3 self-start rounded-full px-7 text-[15.5px] font-semibold md:self-auto">{t.teaserCta}<Icon d={I.arrow} size={17} w={1.8} /></a>
        </div>
        <ul className="rs-track -mx-5 mt-10 flex snap-x gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
          {pick.map((e, i) => (
            <li key={e.id} className="w-[68vw] shrink-0 snap-start sm:w-[42vw] md:w-auto">
              <a href="#experiences" className={`group relative block aspect-[3/4] overflow-hidden rounded-[22px] text-cream ${i % 2 ? 'md:translate-y-8' : ''}`}>
                <Pic e={e} lang={lang} className="transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--k-deep)_85%,transparent)] via-transparent to-transparent" />
                <span className="lnum absolute left-4 top-3 font-display text-[40px] leading-none [text-shadow:0_2px_14px_rgba(0,0,0,.4)]">{String(list.indexOf(e) + 1).padStart(2, '0')}</span>
                <span className="absolute inset-x-4 bottom-4"><span className="block font-display text-[21px] italic leading-tight">{nm(e, lang)}</span><span className="lnum mt-1 block text-[12.5px] text-cream/75">{e.km.toLocaleString(locale(lang))} km · {CATS[e.cat][lang]}</span></span>
              </a>
            </li>
          ))}
                </ul>
        <div className="mt-12 grid gap-4 md:mt-20 md:grid-cols-2">
          {([['#tours', t.toursCard, t.toursSub, 'images/groups/tauern-radweg-cycling.webp'], ['#places', t.placesCard, t.placesSub, 'images/winter/town-kitzbuehel.webp']] as const).map(([href, title, sub, pic]) => (
            <a key={href} href={href} className="group relative isolate flex min-h-[150px] items-end justify-between gap-4 overflow-hidden rounded-[24px] p-6 text-cream md:min-h-[180px] md:p-8">
              <img src={`${BASE}${pic}`} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]" />
              <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--k-deep)_88%,transparent),color-mix(in_srgb,var(--k-deep)_35%,transparent))]" />
              <span><span className="block font-display text-[28px] italic leading-tight md:text-[34px]">{title}</span><span className="mt-1 block text-[14px] text-cream/80">{sub}</span></span>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cream/15 backdrop-blur transition-transform group-hover:translate-x-1"><Icon d={I.arrow} size={18} w={1.8} /></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
