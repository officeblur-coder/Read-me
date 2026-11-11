import { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { ARRIVAL_COPY, LINES, NEARBY, PLANNERS, ROADS, ROUTES } from '../../content/arrivalPage';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { useSeason } from '../../lib/season';
import { locale } from '../../lib/i18n';
import { Icon } from '../pension/PensionRooms';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const IMG = `${import.meta.env.BASE_URL}images/`;
const ICO = {
  car: ['M5 16h14l-1.5-5a2 2 0 0 0-1.9-1.4H8.4A2 2 0 0 0 6.5 11Z', 'M4 16v3h3v-3M17 16v3h3v-3', 'M7.5 13.5h.01M16.5 13.5h.01'],
  train: ['M7 4h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Z', 'M5 11h14', 'M9 21l1.5-3M15 21l-1.5-3', 'M8.5 14.5h.01M15.5 14.5h.01'],
  plane: ['M10.5 4.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5V9l7 4v2l-7-2v4.5l2 1.5v1.5L12 20l-3.5 1v-1.5l2-1.5V13l-7 2v-2l7-4Z'],
  walk: ['M13 6a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z', 'M9.5 21l2.2-6.5 2.8 2.8V21', 'M7 12.5l2.6-3.6h3.6l2.8 3.3', 'M11.7 14.5l1.2-5.6'],
  bus: ['M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2Z', 'M4 11h16', 'M7 16v3M17 16v3', 'M7.5 13.5h.01M16.5 13.5h.01'],
  ext: ['M14 5h5v5', 'M19 5l-8 8', 'M18 14v5H5V6h5'],
  yes: ['M5 12.5l4.2 4.2L19 7'], no: ['M6 6l12 12M18 6 6 18'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5M12 8h.01'],
  road: ['M8 3 5 21M16 3l3 18', 'M12 4v3M12 10.5v3M12 17v3'],
  plug: ['M9 3v5M15 3v5', 'M7 8h10v3a5 5 0 0 1-10 0Z', 'M12 16v5'],
  home: ['M4 11 12 4l8 7v9H4Z', 'M10 20v-5h4v5'],
};
const hm = (min: number, lang: Lang) => (min < 60 ? `${min} ${lang === 'de' ? 'Min.' : 'min'}` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`);

/** Arrival & mobility – Guest Mobility Ticket, nearby distances, arrival by car/train/plane, lines, roads, planners. */
export function ArrivalPage({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const { season } = useSeason();
  const t = ARRIVAL_COPY[lang];
  const [mode, setMode] = useState<'car' | 'train' | 'plane'>('train');
  const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;
  const nf = (n: number) => n.toLocaleString(locale(lang));

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-ar-hero'), { scale: 1.07 }, { scale: 1, duration: 1.8, ease: 'power2.out' }, 0)
      .fromTo(q('.js-ar-line'), { yPercent: 110 }, { yPercent: 0, duration: 0.95, stagger: 0.1, ease: 'power4.out' }, 0.3)
      .fromTo(q('.js-ar-in'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.75)
      .fromTo(q('.js-ar-ticket'), { autoAlpha: 0, y: 40, rotate: -3 }, { autoAlpha: 1, y: 0, rotate: -1.5, duration: 1.1, ease: 'back.out(1.4)' }, 0.95);
    if (fine) gsap.to(q('.js-ar-par'), { yPercent: 8, ease: 'none', scrollTrigger: { trigger: q('#top')[0], start: 'top top', end: 'bottom top', scrub: 0.6 } });
    q('.js-ar-rev').forEach((el) => gsap.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9, scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    ScrollTrigger.create({ trigger: q('.js-ar-near')[0], start: 'top 80%', once: true, onEnter: () => gsap.fromTo(q('.js-ar-dist'), { scaleX: 0 }, { scaleX: 1, duration: 1.2, stagger: 0.12, ease: 'power3.out', transformOrigin: 'left center' }) });
  }, { scope: root, dependencies: [reduced, fine] });

  const switchMode = (m: typeof mode) => {
    setMode(m);
    if (reduced || !root.current) return;
    const q = gsap.utils.selector(root);
    requestAnimationFrame(() => gsap.fromTo(q('.js-ar-route'), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' }));
  };

  const heading = (eyebrow: string, title: string, id: string, light = false) => (
    <header className="js-ar-rev max-w-[820px]">
      <p className={`flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] md:text-[13px] ${light ? 'text-cream/80' : 'text-ink/75'}`}><span aria-hidden className={`h-px w-8 md:w-12 ${light ? 'bg-cream/50' : 'bg-ink/40'}`} />{eyebrow}</p>
      <h2 id={id} className={`mt-4 font-display font-medium italic leading-[1.02] tracking-[-0.01em] md:mt-5 ${light ? 'text-cream' : 'text-pine'}`} style={{ fontSize: 'clamp(34px, 4.2vw, 64px)' }}>{title}</h2>
    </header>
  );
  const maxKm = Math.max(...NEARBY.map((n) => n.km));

  return (
    <div ref={root} className="bg-cream text-ink">
      {/* hero + ticket */}
      <section id="top" aria-labelledby="ar-title" className="relative isolate overflow-hidden bg-deep text-cream">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="js-ar-par absolute inset-0"><img src={`${IMG}hero/${season}-d-${season === 'winter' ? 1672 : 1671}.webp`} alt="" className="js-ar-hero h-full w-full object-cover" /></div>
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--k-deep)_95%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_70%,transparent)_50%,color-mix(in_srgb,var(--k-deep)_30%,transparent)_100%)] lg:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--k-deep)_90%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_55%,transparent)_55%,color-mix(in_srgb,var(--k-deep)_25%,transparent)_100%)]" />
        </div>
        <div className="mx-auto grid min-h-[94svh] w-full max-w-[1440px] items-end gap-10 px-5 pb-[calc(100px+env(safe-area-inset-bottom,0px))] pt-40 sm:px-6 md:px-10 md:pb-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:px-14 lg:pt-[300px]">
          <div>
            <p className="js-ar-in text-[11.5px] font-semibold uppercase tracking-[.34em] text-cream/90 md:text-[13px]">{t.eyebrow}</p>
            <h1 id="ar-title" className="mt-4 font-display font-normal leading-[1.02] tracking-[-0.012em] [text-shadow:0_2px_28px_rgba(0,0,0,.3)] md:mt-6" style={{ fontSize: 'clamp(42px, 5.8vw, 92px)' }}>
              <span className="block overflow-hidden pb-[0.06em]"><span className="js-ar-line block">{t.title[0]}</span></span>
              <span className="block overflow-hidden pb-[0.12em]"><span className="js-ar-line block italic text-gold-light">{t.title[1]}</span></span>
            </h1>
            <p className="js-ar-in mt-5 max-w-[540px] text-[16px] leading-relaxed text-cream/90 md:text-[18px]">{t.sub}</p>
          </div>
          {/* the ticket */}
          <article className="js-ar-ticket ar-ticket relative mx-auto w-full max-w-[460px] rotate-[-1.5deg] overflow-hidden rounded-[24px] text-deep lg:mx-0 lg:justify-self-end">
            <div className="p-6 pb-5 md:p-7">
              <p className="inline-flex items-center gap-2 rounded-full bg-pine px-3 py-1 text-[11px] font-bold uppercase tracking-[.16em] text-cream">{t.gmtBadge}</p>
              <h2 className="mt-4 font-display text-[34px] font-medium italic leading-none md:text-[40px]">{t.gmtTitle}</h2>
              <p className="mt-2 text-[16px] font-semibold text-pine">{t.gmtLead}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-deep/70">{t.gmtText}</p>
            </div>
            <div aria-hidden className="ar-perf relative h-0 border-t-2 border-dashed border-deep/15" />
            <div className="grid gap-4 p-6 pt-5 text-[13.5px] sm:grid-cols-2 md:p-7 md:pt-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.16em] text-pine">{t.yes}</p>
                <ul className="mt-2 space-y-1.5">{t.gmtYes.map((x) => <li key={x} className="flex gap-2 leading-snug"><span className="mt-0.5 text-pine"><Icon d={ICO.yes} size={14} w={2.4} /></span>{x}</li>)}</ul>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.16em] text-deep/50">{t.no}</p>
                <ul className="mt-2 space-y-1.5 text-deep/65">{t.gmtNo.map((x) => <li key={x} className="flex gap-2 leading-snug"><span className="mt-0.5 text-deep/40"><Icon d={ICO.no} size={13} w={2.2} /></span>{x}</li>)}</ul>
              </div>
            </div>
            <a href={PLANNERS.mplus} {...ext} className="group mx-6 mb-5 flex items-start gap-3 rounded-[14px] border border-gold/40 bg-gold/10 p-3.5 md:mx-7">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-light font-display text-[15px] font-semibold text-deep">M+</span>
              <span className="min-w-0 text-[13px] leading-snug text-deep/75"><b className="block text-[14px] text-deep">{t.mplus}</b>{t.mplusText}</span>
              <span className="mt-1 text-deep/50 transition-transform group-hover:translate-x-0.5"><Icon d={ICO.ext} size={13} w={1.8} /></span>
            </a>
            <a href={PLANNERS.gmt} {...ext} className="flex min-h-12 items-center justify-between bg-pine px-6 text-[14px] font-semibold text-cream hover:bg-deep md:px-7">{t.gmtMore}<Icon d={ICO.ext} size={14} w={1.8} /></a>
          </article>
        </div>
      </section>

      {/* nearby */}
      <section aria-labelledby="ar-near" className="px-5 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto max-w-[1360px]">
          {heading(t.nearEyebrow, t.nearTitle, 'ar-near')}
          <ul className="js-ar-near mt-10 space-y-5 md:mt-14">
            {NEARBY.map((n) => (
              <li key={n.label.en} className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-4 md:grid-cols-[52px_280px_minmax(0,1fr)]">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-pine text-cream md:h-[52px] md:w-[52px]"><Icon d={n.mode === 'walk' ? ICO.walk : ICO.car} size={20} w={1.6} /></span>
                <div className="md:contents">
                  <p className="font-display text-[21px] italic leading-tight text-pine md:text-[24px]">{n.label[lang]}</p>
                  <div className="relative mt-2 h-10 md:mt-0">
                    <span className="js-ar-dist absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,var(--k-gold-light),color-mix(in_srgb,var(--k-gold)_70%,transparent))]" style={{ width: `${Math.max(30, Math.sqrt(n.km / maxKm) * 100)}%` }} />
                    <span className="lnum absolute inset-y-0 left-4 flex items-center gap-2 text-[14px] font-semibold text-deep">{nf(n.km)} km · {n.min} {t.min} <span className="font-normal text-deep/70">{n.mode === 'walk' ? t.walk : t.car}</span></span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* arrival modes */}
      <section aria-labelledby="ar-how" className="bg-soft px-5 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto max-w-[1360px]">
          {heading(t.howEyebrow, t.howTitle, 'ar-how')}
          <div role="tablist" aria-label={t.howTitle} className="js-ar-rev mt-10 flex w-full max-w-full rounded-full border border-pine/15 bg-cream p-1.5 sm:inline-flex sm:w-auto">
            {(['car', 'train', 'plane'] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} aria-controls="ar-routes" onClick={() => switchMode(m)}
                className={`ar-mode inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 text-[14px] font-semibold sm:flex-none sm:gap-2 sm:px-6 sm:text-[15px] ${mode === m ? 'is-on' : ''}`}>
                <Icon d={ICO[m]} size={18} w={1.6} />{t.modes[m]}
              </button>
            ))}
          </div>
          <div id="ar-routes" role="tabpanel" className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {ROUTES[mode].map((r) => (
              <article key={r.id} className="js-ar-route flex flex-col rounded-[24px] bg-cream p-6 md:p-7">
                <p className="text-[12px] font-semibold uppercase tracking-[.18em] text-goldink">{r.sub[lang]}</p>
                <h3 className="mt-2 font-display text-[28px] italic leading-tight text-pine">{r.title[lang]}</h3>
                {r.km && r.min && <p className="lnum mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-pine/10 px-3 py-1 text-[13px] font-semibold text-pine"><Icon d={ICO.car} size={14} w={1.6} />{t.approx(r.km, hm(r.min, lang))}</p>}
                <ol className="mt-5 space-y-3">
                  {r.steps[lang].map((s, i) => (
                    <li key={s} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 text-[14.5px] leading-relaxed text-ink/80">
                      <span className="lnum grid h-7 w-7 place-items-center rounded-full border border-pine/25 text-[12.5px] font-semibold text-pine">{i + 1}</span>{s}
                    </li>
                  ))}
                </ol>
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  {r.links.map((l) => <a key={l.url} href={l.url} {...ext} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-pine/15 px-4 text-[13px] font-semibold text-pine hover:border-pine">{l.label[lang]}<Icon d={ICO.ext} size={12} w={1.8} /></a>)}
                </div>
              </article>
            ))}
          </div>
          <p className="mt-5 text-[13px] text-ink/50">{t.routeNote}</p>
        </div>
      </section>

      {/* Lokalbahn notice */}
      <section aria-labelledby="ar-plb" className="px-5 pt-20 sm:px-6 md:px-10 md:pt-28 lg:px-14">
        <div className="js-ar-rev mx-auto grid max-w-[1360px] gap-6 rounded-[26px] border border-gold/40 bg-[color-mix(in_srgb,var(--k-gold)_10%,var(--k-cream))] p-6 md:grid-cols-[auto_minmax(0,1fr)] md:p-10">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gold/20 text-goldink"><Icon d={ICO.train} size={26} w={1.5} /></span>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[.26em] text-goldink">{t.plbEyebrow}</p>
            <h2 id="ar-plb" className="mt-2 font-display text-[28px] italic leading-tight text-pine md:text-[36px]">{t.plbTitle}</h2>
            <p className="mt-3 max-w-[75ch] text-[15.5px] leading-relaxed text-ink/80">{t.plbText}</p>
            <p className="mt-2 max-w-[75ch] text-[14px] leading-relaxed text-ink/60">{t.plbBike}</p>
            <a href={PLANNERS.plb} {...ext} className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-pine hover:text-goldink">{t.timetable} Pinzgauer Lokalbahn<Icon d={ICO.ext} size={13} w={1.8} /></a>
          </div>
        </div>
      </section>

      {/* lines */}
      <section aria-labelledby="ar-lines" className="px-5 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto max-w-[1360px]">
          {heading(t.linesEyebrow, t.linesTitle, 'ar-lines')}
          <ul className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {LINES.map((l) => (
              <li key={l.no} className="js-ar-rev flex flex-col rounded-[22px] border border-pine/10 bg-white p-6">
                <div className="flex items-center gap-3">
                  <span className="lnum grid h-12 min-w-12 place-items-center rounded-[12px] bg-pine px-2 text-[15px] font-bold text-cream">{l.no === 'Ski' ? <Icon d={ICO.bus} size={20} w={1.6} /> : l.no}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${l.here ? 'bg-pine/10 text-pine' : 'bg-ink/5 text-ink/60'}`}>{l.here ? t.stopsHere : t.fromMittersill}</span>
                </div>
                <p className="mt-4 font-display text-[22px] italic leading-tight text-pine">{l.name[lang]}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink/70">{l.text[lang]}</p>
                <a href={l.url} {...ext} className="mt-auto inline-flex items-center gap-2 pt-4 text-[14px] font-semibold text-pine hover:text-goldink">{t.timetable}<Icon d={ICO.ext} size={13} w={1.8} /></a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* roads */}
      <section aria-labelledby="ar-roads" className="bg-deep px-5 py-20 text-cream sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto max-w-[1360px]">
          {heading(t.roadsEyebrow, t.roadsTitle, 'ar-roads', true)}
          <ul className="mt-10 divide-y divide-cream/10 border-y border-cream/10">
            {ROADS.map((r) => (
              <li key={r.name.en} className="js-ar-rev">
                <a href={r.url} {...ext} className="group flex flex-wrap items-center gap-x-6 gap-y-2 py-5 md:py-6">
                  <span className="text-gold-light"><Icon d={ICO.road} size={22} w={1.5} /></span>
                  <span className="font-display text-[22px] italic md:text-[28px]">{r.name[lang]}</span>
                  <span className={`ar-road ml-auto rounded-full px-3.5 py-1.5 text-[13px] font-semibold is-${r.tone}`}>{r.state[lang]}</span>
                  <span className="text-cream/50 transition-transform group-hover:translate-x-1"><Icon d={ICO.ext} size={15} w={1.8} /></span>
                </a>
              </li>
            ))}
          </ul>
          <p className="js-ar-rev mt-6 flex items-start gap-3 text-[14px] leading-relaxed text-cream/75"><span className="mt-0.5 text-gold-light"><Icon d={ICO.info} size={18} w={1.6} /></span><span>{t.vignette} <a href="https://www.asfinag.at/en/toll/vignette/" {...ext} className="underline decoration-gold-light/60 underline-offset-2 hover:text-cream">ASFINAG</a></span></p>
          <p className="js-ar-rev mt-3 flex items-start gap-3 text-[14px] leading-relaxed text-cream/75"><span className="mt-0.5 text-gold-light"><Icon d={ICO.plug} size={18} w={1.6} /></span>{t.ev}</p>
        </div>
      </section>

      {/* planners */}
      <section aria-labelledby="ar-plan" className="px-5 pb-[calc(110px+env(safe-area-inset-bottom,0px))] pt-20 sm:px-6 md:px-10 md:pb-28 md:pt-28 lg:px-14">
        <div className="mx-auto grid max-w-[1360px] items-end gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            {heading(t.planEyebrow, t.planTitle, 'ar-plan')}
            <p className="js-ar-rev mt-4 max-w-[52ch] text-[16px] leading-relaxed text-ink/70">{t.planText}</p>
            <p className="mt-6 text-[12.5px] text-ink/45">{t.checked}</p>
          </div>
          <ul className="grid gap-3">
            {(['svv', 'svvApp', 'oebb'] as const).map((k, i) => (
              <li key={k} className="js-ar-rev">
                <a href={PLANNERS[k]} {...ext} className={`flex min-h-[64px] items-center justify-between gap-4 rounded-[18px] px-6 text-[16px] font-semibold ${i === 0 ? 'bg-pine text-cream' : 'border border-pine/15 bg-white text-pine hover:border-pine'}`}>
                  <span className="flex items-center gap-3"><Icon d={k === 'oebb' ? ICO.train : ICO.bus} size={20} w={1.6} />{t.planners[k]}</span><Icon d={ICO.ext} size={15} w={1.8} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
