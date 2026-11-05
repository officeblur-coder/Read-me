import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { PASSES, SKI_AREAS, SKI_BUSES, SKI_COPY, type AreaId } from '../../content/skiAreas';
import { todayVienna } from '../../content/seasonOpenings';
import { BOOKING_ENGINE } from '../BookingBar';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { locale } from '../../lib/i18n';
import { Icon, I } from '../pension/PensionRooms';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const IMG = `${import.meta.env.BASE_URL}images/`;
const ICO = {
  lift: ['M3 6l18-3', 'M12 4.5V10', 'M8 10h8v6a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2Z', 'M8 13h8'],
  slope: ['M3 19 10 8l4 5 3-3 4 9Z'],
  peak: ['M3 20 10 6l4 7 2-3 5 10Z', 'M9 9l1.5 2 1.5-2'],
  cal: ['M4 6.5h16V20H4Z', 'M4 10.5h16M8.5 4v4M15.5 4v4'],
  car: ['M5 16h14l-1.5-5a2 2 0 0 0-1.9-1.4H8.4A2 2 0 0 0 6.5 11Z', 'M4 16v3h3v-3M17 16v3h3v-3', 'M7.5 13.5h.01M16.5 13.5h.01'],
  bus: ['M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2Z', 'M4 11h16', 'M7 16v3M17 16v3', 'M7.5 13.5h.01M16.5 13.5h.01'],
  ext: ['M14 5h5v5', 'M19 5l-8 8', 'M18 14v5H5V6h5'],
  check: ['M5 12.5l4.2 4.2L19 7'],
  ticket: ['M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4Z', 'M10 7v10'],
};
const nf = (n: number, lang: Lang) => n.toLocaleString(locale(lang));

/** Ski areas & ski passes – drive-time ruler, area explorer, km comparison, pass finder, ski buses. */
export function SkiPage({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const t = SKI_COPY[lang];
  const [act, setAct] = useState<AreaId>('kitzski');
  const [pick, setPick] = useState<AreaId[]>(['kitzski', 'wildkogel']);
  const a = SKI_AREAS.find((x) => x.id === act)!;
  const today = todayVienna();
  const totalKm = SKI_AREAS.reduce((s, x) => s + x.km, 0);
  const maxKm = Math.max(...SKI_AREAS.map((x) => x.km));
  const byTime = [...SKI_AREAS].sort((x, y) => x.access[0].min - y.access[0].min);
  const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale(lang), { day: 'numeric', month: 'short', year: 'numeric' });

  const matches = useMemo(() => {
    if (!pick.length) return [];
    return PASSES.filter((p) => pick.every((id) => p.covers.includes(id))).sort((x, y) => x.covers.length - y.covers.length);
  }, [pick]);

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-sk-hero'), { scale: 1.08 }, { scale: 1, duration: 1.8, ease: 'power2.out' }, 0)
      .fromTo(q('.js-sk-line'), { yPercent: 110 }, { yPercent: 0, duration: 0.95, stagger: 0.1, ease: 'power4.out' }, 0.3)
      .fromTo(q('.js-sk-in'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.75);
    if (fine) gsap.to(q('.js-sk-par'), { yPercent: 8, ease: 'none', scrollTrigger: { trigger: q('#top')[0], start: 'top top', end: 'bottom top', scrub: 0.6 } });
    q('.js-sk-rev').forEach((el) => gsap.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9, scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    // ruler: the road draws from the house, the resorts drop in at their drive time
    ScrollTrigger.create({ trigger: q('.js-sk-ruler')[0], start: 'top 78%', once: true, onEnter: () => {
      gsap.fromTo(q('.js-sk-road'), { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: 'power2.inOut', transformOrigin: 'left center' });
      gsap.fromTo(q('.js-sk-pin'), { autoAlpha: 0, y: -18 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.16, delay: 0.35, ease: 'back.out(2)' });
    } });
    ScrollTrigger.create({ trigger: q('.js-sk-cmp')[0], start: 'top 80%', once: true, onEnter: () => {
      gsap.fromTo(q('.js-sk-bar'), { scaleX: 0 }, { scaleX: 1, duration: 1.2, stagger: 0.08, ease: 'power3.out', transformOrigin: 'left center' });
    } });
    // hero counter
    const el = q('.js-sk-total')[0], o = { v: 0 };
    if (el) gsap.to(o, { v: totalKm, duration: 2, delay: 0.9, ease: 'power2.out', onUpdate: () => { el.textContent = nf(Math.round(o.v), lang); } });
  }, { scope: root, dependencies: [reduced, fine] });

  const choose = (id: AreaId) => {
    setAct(id);
    if (!root.current || reduced) return;
    const q = gsap.utils.selector(root);
    requestAnimationFrame(() => gsap.fromTo(q('.js-sk-panel > *'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.05, ease: 'power3.out' }));
  };
  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });

  const heading = (eyebrow: string, title: string, id: string, light = false) => (
    <header className="js-sk-rev max-w-[820px]">
      <p className={`flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] md:text-[13px] ${light ? 'text-cream/80' : 'text-ink/75'}`}><span aria-hidden className={`h-px w-8 md:w-12 ${light ? 'bg-cream/50' : 'bg-ink/40'}`} />{eyebrow}</p>
      <h2 id={id} className={`mt-4 font-display font-medium italic leading-[1.02] tracking-[-0.01em] md:mt-5 ${light ? 'text-cream' : 'text-pine'}`} style={{ fontSize: 'clamp(34px, 4.2vw, 64px)' }}>{title}</h2>
    </header>
  );
  const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;
  const started = today >= a.season.start;

  return (
    <div ref={root} className="bg-cream text-ink">
      {/* hero */}
      <section id="top" aria-labelledby="sk-title" className="relative isolate flex min-h-[94svh] items-end overflow-hidden bg-deep text-cream md:min-h-[100svh]">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="js-sk-par absolute inset-0"><img src={`${IMG}winter/kitzski-piste.webp`} alt="" className="js-sk-hero h-full w-full object-cover object-[60%_50%]" /></div>
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--k-deep)_92%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_62%,transparent)_45%,color-mix(in_srgb,var(--k-deep)_10%,transparent)_78%)] md:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--k-deep)_82%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_45%,transparent)_45%,transparent_72%)]" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[color-mix(in_srgb,var(--k-deep)_50%,transparent)] to-transparent" />
        </div>
        <div className="mx-auto w-full max-w-[1440px] px-5 pb-[calc(100px+env(safe-area-inset-bottom,0px))] pt-40 sm:px-6 md:px-10 md:pb-16 lg:px-14">
          <p className="js-sk-in text-[11.5px] font-semibold uppercase tracking-[.34em] text-cream/90 md:text-[13px]">{t.eyebrow}</p>
          <h1 id="sk-title" className="mt-4 font-display font-normal leading-[1.02] tracking-[-0.012em] [text-shadow:0_2px_28px_rgba(0,0,0,.3)] md:mt-6" style={{ fontSize: 'clamp(42px, 6vw, 96px)' }}>
            <span className="block overflow-hidden pb-[0.06em]"><span className="js-sk-line block">{t.title[0]}</span></span>
            <span className="block overflow-hidden pb-[0.12em]"><span className="js-sk-line block italic text-gold-light">{t.title[1]}</span></span>
          </h1>
          <p className="js-sk-in mt-5 max-w-[580px] text-[16px] leading-relaxed text-cream/90 md:text-[18px]">{t.sub}</p>
          <dl className="js-sk-in mt-8 grid max-w-[640px] grid-cols-3 gap-px overflow-hidden rounded-[18px] border border-cream/20 bg-cream/15 backdrop-blur-md">
            {[[String(SKI_AREAS.length), t.stats.areas], [nf(totalKm, lang), t.stats.km, 'js-sk-total'], ['5', t.stats.min]].map(([v, l, c]) => (
              <div key={l} className="bg-deep/35 px-3 py-4 md:px-5">
                <dt className="sr-only">{l}</dt>
                <dd><span className={`lnum block font-display text-[34px] leading-none md:text-[46px] ${c ?? ''}`}>{v}</span><span className="mt-1.5 block text-[11.5px] uppercase tracking-[.14em] text-cream/75 md:text-[12.5px]">{l}</span></dd>
              </div>
            ))}
          </dl>
          <div className="js-sk-in mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button type="button" onClick={() => goTo('sk-explorer')} className="ph-primary inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold">{t.explore}<Icon d={I.arrow} size={17} w={1.8} /></button>
            <button type="button" onClick={() => goTo('sk-passes')} className="ph-secondary inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-full px-8 text-[15.5px] font-semibold"><Icon d={ICO.ticket} size={18} w={1.6} />{t.passes}</button>
          </div>
        </div>
      </section>

      {/* drive-time ruler */}
      <section aria-labelledby="sk-ruler" className="px-5 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto max-w-[1360px]">
          {heading(t.rulerEyebrow, t.rulerTitle, 'sk-ruler')}
          <div className="js-sk-ruler sk-ruler relative mt-14 md:mt-20">
            {/* desktop: horizontal road 0–60 min */}
            <div className="relative hidden h-[270px] md:block">
              <div className="absolute inset-x-0 top-[200px] h-[3px] rounded-full bg-pine/12" />
              <div className="js-sk-road absolute inset-x-0 top-[200px] h-[3px] rounded-full bg-[linear-gradient(90deg,var(--k-gold),var(--k-pine))]" />
              {[0, 10, 20, 30, 40, 50, 60].map((m) => (
                <span key={m} className="lnum absolute top-[214px] -translate-x-1/2 text-[12px] text-ink/45" style={{ left: `${(m / 60) * 100}%` }}>{m}</span>
              ))}
              <span className="absolute left-0 top-[186px] grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-pine text-cream shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M4 11 12 4l8 7v9H4Z" /><path d="M10 20v-5h4v5" /></svg></span>
              {byTime.map((x, i) => {
                const m = x.access[0].min;
                const top = (i % 3) * 56;
                const near = (j: number) => j >= 0 && j < byTime.length && Math.abs(byTime[j].access[0].min - m) <= 4;
                const align = near(i + 1) && !near(i - 1) ? 'end' : near(i - 1) && !near(i + 1) ? 'start' : 'center';
                return (
                  <div key={x.id} className="js-sk-pin absolute top-0 h-[201px] w-0" style={{ left: `${(m / 60) * 100}%` }}>
                    <button type="button" onClick={() => { choose(x.id); goTo('sk-explorer'); }}
                      className={`sk-pin group absolute whitespace-nowrap px-2 ${align === 'center' ? '-translate-x-1/2 text-center' : align === 'end' ? '-translate-x-full text-right' : 'text-left'}`} style={{ top }}>
                      <span className="block font-display text-[20px] italic leading-tight text-pine transition-colors group-hover:text-goldink lg:text-[23px]">{x.short}</span>
                      <span className="lnum mt-0.5 block text-[12.5px] font-semibold text-ink/60">{m} {t.min}</span>
                    </button>
                    <span aria-hidden className="absolute left-0 w-px -translate-x-1/2 bg-pine/30" style={{ top: top + 56, height: 194 - top - 56 }} />
                    <span aria-hidden className="absolute left-0 top-[194px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-[3px] border-cream bg-gold shadow" />
                  </div>
                );
              })}
            </div>
            {/* mobile: vertical list */}
            <ol className="relative space-y-3 border-l-2 border-pine/15 pl-6 md:hidden">
              {byTime.map((x) => (
                <li key={x.id} className="js-sk-pin relative">
                  <span aria-hidden className="absolute -left-[31px] top-4 h-3.5 w-3.5 rounded-full border-[3px] border-cream bg-gold" />
                  <button type="button" onClick={() => { choose(x.id); goTo('sk-explorer'); }} className="flex w-full items-center justify-between gap-4 rounded-[14px] bg-white px-4 py-3 text-left shadow-[0_10px_30px_-24px_rgba(16,46,35,.6)]">
                    <span className="font-display text-[21px] italic text-pine">{x.short}</span>
                    <span className="lnum shrink-0 text-[14px] font-semibold text-ink/65">{x.access[0].min} {t.min}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-[13px] text-ink/50">{t.rulerNote}</p>
          </div>
        </div>
      </section>

      {/* explorer */}
      <section id="sk-explorer" aria-labelledby="sk-ex" className="scroll-mt-28 bg-soft px-5 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto max-w-[1360px]">
          {heading(t.exEyebrow, t.exTitle, 'sk-ex')}
          <div role="tablist" aria-label={t.exEyebrow} className="rs-track -mx-5 mt-10 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:mt-12 md:flex-wrap md:px-0">
            {SKI_AREAS.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={act === x.id} aria-controls="sk-panel" onClick={() => choose(x.id)}
                className={`gp-chip inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold ${act === x.id ? 'is-on' : ''}`}>
                {x.short}<span className="lnum text-[12px] font-medium opacity-70">{x.access[0].min} {t.min}</span>
              </button>
            ))}
          </div>

          <div id="sk-panel" role="tabpanel" aria-live="polite" className="js-sk-panel mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
            <div className="relative min-h-[300px] overflow-hidden rounded-[26px] bg-deep md:min-h-[460px]">
              {a.img ? (
                <img key={a.id} src={a.img} alt={a.imgAlt?.[lang] ?? a.name} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,color-mix(in_srgb,var(--k-gold)_28%,transparent),transparent_55%),linear-gradient(160deg,var(--k-pine),var(--k-deep))]">
                  <svg aria-hidden viewBox="0 0 600 300" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[62%] w-full text-cream/10"><path d="M0 300 L0 210 L90 120 L150 170 L260 40 L360 160 L430 100 L520 190 L600 130 L600 300Z" fill="currentColor" /><path d="M0 300 L0 250 L120 180 L210 230 L330 140 L450 220 L600 170 L600 300Z" fill="currentColor" /></svg>
                  <p className="absolute left-6 top-6 text-[12.5px] text-cream/55 md:left-8 md:top-8">{t.noPhoto}</p>
                </div>
              )}
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--k-deep)_80%,transparent)] via-transparent to-transparent" />
              <div className="absolute inset-x-6 bottom-6 text-cream md:inset-x-8 md:bottom-8">
                <p className="text-[12px] font-semibold uppercase tracking-[.26em] text-gold-light">{a.region[lang]}</p>
                <h3 className="mt-2 font-display text-[36px] font-medium italic leading-[1.02] md:text-[52px]">{a.name}</h3>
              </div>
            </div>

            <div className="min-w-0 space-y-5">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { k: 'km', i: ICO.slope, l: t.km, v: `${nf(a.km, lang)} km` },
                  { k: 'lifts', i: ICO.lift, l: t.lifts, v: String(a.lifts) },
                  ...(a.altMax ? [{ k: 'alt', i: ICO.peak, l: t.alt, v: a.altMin ? t.range(nf(a.altMin, lang), nf(a.altMax, lang)) : t.upTo(nf(a.altMax, lang)) }] : []),
                ].map((s) => (
                  <div key={s.k} className={`rounded-[18px] bg-cream p-4 ${s.k === 'alt' ? 'col-span-2' : ''}`}>
                    <dt className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[.16em] text-ink/55"><Icon d={s.i} size={16} w={1.5} />{s.l}</dt>
                    <dd className="lnum mt-2 font-display text-[28px] leading-none text-pine md:text-[32px]">{s.v}</dd>
                  </div>
                ))}
              </dl>

              {a.split && (
                <div>
                  <div className="flex h-3 overflow-hidden rounded-full" aria-hidden>
                    {a.split.map((v, i) => <span key={i} className={`sk-split-${i}`} style={{ width: `${(v / a.split!.reduce((s, x) => s + x, 0)) * 100}%` }} />)}
                  </div>
                  <p className="lnum mt-2 flex flex-wrap gap-x-4 text-[13px] text-ink/65">{a.split.map((v, i) => <span key={i} className="inline-flex items-center gap-1.5"><span aria-hidden className={`sk-split-${i} h-2.5 w-2.5 rounded-full`} />{v} km {t.split[i]}</span>)}</p>
                </div>
              )}

              <div className="rounded-[18px] bg-cream p-5">
                <p className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[.16em] text-ink/55"><Icon d={ICO.cal} size={16} w={1.5} />{t.season}</p>
                <p className="lnum mt-2 text-[17px] font-semibold text-pine">{fmtDate(a.season.start)} – {fmtDate(a.season.end)}</p>
                {a.season.note && <p className="mt-1 text-[13.5px] leading-snug text-ink/65">{a.season.note[lang]}</p>}
                <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12.5px] font-semibold ${started ? 'bg-pine/10 text-pine' : 'bg-gold/15 text-goldink'}`}>{started && <span aria-hidden className="live-dot" />}{started ? t.open : t.planned(fmtDate(a.season.start))}</p>
              </div>

              <div className="rounded-[18px] bg-cream p-5">
                <p className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[.16em] text-ink/55"><Icon d={ICO.car} size={16} w={1.5} />{t.access}</p>
                <ul className="mt-2 divide-y divide-pine/10">
                  {a.access.map((x) => <li key={x.name.en} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2 text-[14.5px]"><span className="font-medium">{x.name[lang]}</span><span className="lnum text-ink/60">{t.drive(nf(x.km, lang), x.min)}</span></li>)}
                </ul>
              </div>

              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[.16em] text-ink/55">{t.highlights}</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {a.features[lang].map((f) => <li key={f} className="flex items-start gap-2.5 text-[14.5px] leading-snug text-ink/80"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-pine text-cream"><Icon d={ICO.check} size={11} w={2.4} /></span>{f}</li>)}
                </ul>
              </div>

              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[.16em] text-ink/55">{t.validPasses}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PASSES.filter((p) => p.covers.includes(a.id)).map((p) => <a key={p.id} href={p.info} {...ext} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-pine/15 bg-cream px-3.5 text-[13px] font-semibold text-pine hover:border-pine">{p.name}<Icon d={ICO.ext} size={12} w={1.8} /></a>)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {([['status', a.links.status], ['webcams', a.links.webcams], ['map', a.links.map], ['prices', a.links.prices]] as const).filter(([, u]) => u).map(([k, u]) => (
                  <a key={k} href={u} {...ext} className={`inline-flex min-h-12 items-center justify-between gap-2 rounded-[14px] px-4 text-[14px] font-semibold ${k === 'status' ? 'bg-pine text-cream' : 'border border-pine/15 bg-cream text-pine hover:border-pine'}`}>
                    <span className="flex items-center gap-2">{k === 'status' && <span aria-hidden className="live-dot" />}{t.lnk[k]}</span><Icon d={ICO.ext} size={14} w={1.8} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* km comparison */}
      <section aria-labelledby="sk-cmp" className="px-5 py-20 sm:px-6 md:px-10 md:py-24 lg:px-14">
        <div className="mx-auto max-w-[1360px]">
          {heading(t.cmpEyebrow, t.cmpTitle, 'sk-cmp')}
          <ul className="js-sk-cmp mt-10 space-y-4 md:mt-14">
            {[...SKI_AREAS].sort((x, y) => y.km - x.km).map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => { choose(x.id); goTo('sk-explorer'); }} className="group grid w-full grid-cols-[minmax(0,130px)_minmax(0,1fr)] items-center gap-4 text-left md:grid-cols-[220px_minmax(0,1fr)]">
                  <span className="truncate font-display text-[19px] italic text-pine group-hover:text-goldink md:text-[23px]">{x.short}</span>
                  <span className="relative block h-9 md:h-11">
                    <span className="js-sk-bar absolute inset-y-0 left-0 rounded-r-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--k-pine)_85%,transparent),var(--k-pine))] transition-[filter] group-hover:brightness-125" style={{ width: `${Math.max(14, (x.km / maxKm) * 100)}%` }} />
                    <span className="lnum absolute inset-y-0 left-3 flex items-center text-[14px] font-semibold text-cream">{nf(x.km, lang)} km</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ski pass centre */}
      <section id="sk-passes" aria-labelledby="sk-pass" className="scroll-mt-28 bg-deep px-5 py-20 text-cream sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto max-w-[1360px]">
          {heading(t.passEyebrow, t.passTitle, 'sk-pass', true)}
          <p className="js-sk-rev mt-5 max-w-[60ch] text-[16.5px] leading-relaxed text-cream/75">{t.passText}</p>
          <div className="mt-10 grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-12">
            <fieldset className="js-sk-rev">
              <legend className="mb-4 text-[12px] font-semibold uppercase tracking-[.2em] text-cream/60">{t.pick}</legend>
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
                {SKI_AREAS.map((x) => {
                  const on = pick.includes(x.id);
                  return (
                    <button key={x.id} type="button" aria-pressed={on} onClick={() => setPick((p) => (on ? p.filter((y) => y !== x.id) : [...p, x.id]))}
                      className={`sk-pick flex min-h-14 items-center gap-3 rounded-[16px] px-4 text-left ${on ? 'is-on' : ''}`}>
                      <span aria-hidden className="sk-box grid h-5 w-5 shrink-0 place-items-center rounded-[6px]">{on && <Icon d={ICO.check} size={12} w={2.6} />}</span>
                      <span className="min-w-0"><span className="block truncate text-[15px] font-semibold">{x.short}</span><span className="lnum block text-[12px] opacity-65">{x.access[0].min} {t.min}</span></span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="min-w-0" aria-live="polite">
              <p className="text-[14px] font-semibold text-gold-light">{pick.length ? t.fits(matches.length) : t.none}</p>
              <ul className="mt-4 grid gap-4 md:grid-cols-2">
                {matches.map((p) => (
                  <li key={p.id} className={`sk-pass flex flex-col rounded-[22px] p-6 ${p.covers.length === pick.length ? 'is-best' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-display text-[26px] italic leading-tight">{p.name}</p>
                      {p.covers.length === pick.length && <span className="shrink-0 rounded-full bg-gold-light px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.12em] text-deep">{t.best}</span>}
                    </div>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-cream/75">{p.text[lang]}</p>
                    <p className="mt-4 text-[11.5px] font-semibold uppercase tracking-[.16em] text-cream/55">{t.covers}</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {p.covers.map((id) => <li key={id} className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${pick.includes(id) ? 'bg-cream text-deep' : 'border border-cream/25 text-cream/80'}`}>{SKI_AREAS.find((x) => x.id === id)!.short}</li>)}
                    </ul>
                    {p.more && <p className="mt-2 text-[12.5px] text-cream/60">{p.more[lang]}</p>}
                    <div className="mt-auto flex flex-wrap gap-2 pt-5">
                      <a href={p.shop} {...ext} className="ph-primary inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold">{t.shop}<Icon d={ICO.ext} size={13} w={1.8} /></a>
                      <a href={p.info} {...ext} className="inline-flex min-h-11 items-center rounded-full border border-cream/30 px-5 text-[14px] font-semibold hover:border-gold-light">{t.info}</a>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex items-start gap-2.5 text-[13.5px] leading-snug text-cream/70"><span className="mt-0.5 text-gold-light"><Icon d={ICO.ticket} size={17} w={1.6} /></span>{t.machine}</p>
              <p className="mt-2 text-[12.5px] text-cream/50">{t.priceNote}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ski buses */}
      <section aria-labelledby="sk-bus" className="px-5 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto max-w-[1360px]">
          {heading(t.busEyebrow, t.busTitle, 'sk-bus')}
          <p className="js-sk-rev mt-4 max-w-[70ch] text-[14.5px] leading-relaxed text-ink/60">{t.busNote}</p>
          <ul className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SKI_BUSES.map((b) => (
              <li key={b.url} className="js-sk-rev flex flex-col rounded-[22px] border border-pine/10 bg-white p-6">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-pine/10 text-pine"><Icon d={ICO.bus} size={20} w={1.5} /></span>
                <p className="mt-4 font-display text-[23px] italic leading-tight text-pine">{b.name[lang]}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink/75">{b.route[lang]}</p>
                <p className="mt-3 rounded-[12px] bg-soft p-3 text-[13px] leading-snug text-ink/70">{b.free[lang]}</p>
                <a href={b.url} {...ext} className="mt-auto inline-flex items-center gap-2 pt-4 text-[14px] font-semibold text-pine hover:text-goldink">{t.timetable}<Icon d={ICO.ext} size={13} w={1.8} /></a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-[calc(110px+env(safe-area-inset-bottom,0px))] sm:px-6 md:px-10 md:pb-24 lg:px-14">
        <div className="js-sk-rev relative isolate mx-auto flex max-w-[1400px] flex-col items-start gap-6 overflow-hidden rounded-[28px] bg-pine p-8 text-cream md:flex-row md:items-end md:justify-between md:p-14">
          <img src={`${IMG}evening/pension-winter.webp`} alt="" aria-hidden loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35" />
          <div className="max-w-[620px]">
            <h2 className="font-display font-medium italic leading-[1.02]" style={{ fontSize: 'clamp(32px, 4vw, 58px)' }}>{t.ctaTitle}</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-cream/85">{t.ctaText}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={BOOKING_ENGINE} {...ext} className="ph-primary inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold">{t.book}<Icon d={I.arrow} size={17} w={1.8} /></a>
            <a href="#mountain-dash" className="ph-secondary inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full px-7 text-[15px] font-semibold"><span aria-hidden className="live-dot" />{t.mountain}</a>
          </div>
        </div>
      </section>
    </div>
  );
}
