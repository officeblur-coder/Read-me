import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { GROUP_CONTACT, GROUP_TYPES, GROUPS_COPY } from '../../content/groupsPage';
import { ROOMS } from '../../content/rooms';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { Icon, I } from '../pension/PensionRooms';
import { GroupPlanner } from './GroupPlanner';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const BASE = import.meta.env.BASE_URL;
const ICO = {
  phone: ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z'],
  mail: ['M3.5 6h17v12h-17Z', 'm4 7 8 6 8-6'],
  wa: ['M4 20l1.3-4A8 8 0 1 1 8 18.7Z', 'M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2Z'],
  form: ['M7 3h7l5 5v13H7Z', 'M14 3v5h5', 'M10 13h6M10 17h6'],
  map: ['M9 4 3 6v14l6-2 6 2 6-2V4l-6 2Z', 'M9 4v14M15 6v14'],
  check: ['M5 12.5l4.2 4.2L19 7'],
};
const TONE: Record<string, string> = { double: 'var(--k-pine)', triple: 'var(--k-gold)', family: 'var(--k-pine-light)', quad: 'var(--k-gold-dark)' };

/** Group activities – photo hero, an interactive "good fit for" selector, capacity at a glance, map, contact. */
export function GroupsPage({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const t = GROUPS_COPY[lang];
  const [act, setAct] = useState(0);
  const shown = useRef(0);
  const g = GROUP_TYPES[act];

  const total = ROOMS.reduce((s, r) => s + r.count * r.guests, 0);
  const tiles = ROOMS.flatMap((r) => Array.from({ length: r.count }, () => r.slug));

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-g-hero'), { scale: 1.07 }, { scale: 1, duration: 1.8, ease: 'power2.out' }, 0)
      .fromTo(q('.js-g-eyebrow'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.25)
      .fromTo(q('.js-g-line'), { yPercent: 110 }, { yPercent: 0, duration: 0.95, stagger: 0.1, ease: 'power4.out' }, 0.35)
      .fromTo(q('.js-g-in'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.8);
    if (fine) gsap.to(q('.js-g-par'), { yPercent: 8, ease: 'none', scrollTrigger: { trigger: q('#top')[0], start: 'top top', end: 'bottom top', scrub: 0.6 } });
    q('.js-g-rev').forEach((el) => gsap.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    // the house fills up: 17 rooms appear category by category, the guest count runs up
    ScrollTrigger.create({ trigger: q('.js-g-cap')[0], start: 'top 80%', once: true, onEnter: () => {
      gsap.fromTo(q('.js-g-tile'), { autoAlpha: 0, y: 14, scale: 0.8 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.045, ease: 'back.out(1.7)' });
      const el = q('.js-g-total')[0], o = { v: 0 };
      if (el) gsap.to(o, { v: total, duration: 1.6, delay: 0.2, ease: 'power2.out', onUpdate: () => { el.textContent = String(Math.round(o.v)); } });
    } });
  }, { scope: root, dependencies: [reduced, fine] });

  // selector: the new photo wipes in over the old one, the text re-rises
  useEffect(() => {
    if (shown.current === act) return;
    shown.current = act;
    if (reduced || !root.current) return;
    const q = gsap.utils.selector(root);
    gsap.fromTo(q('.js-g-pic-new'), { clipPath: 'inset(0% 0% 0% 100% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 0.9, ease: 'expo.inOut' });
    gsap.fromTo(q('.js-g-pic-new img'), { scale: 1.12 }, { scale: 1, duration: 1.3, ease: 'power3.out' });
    gsap.fromTo(q('.js-g-txt > *'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06, delay: 0.25, ease: 'power3.out' });
  }, [act, reduced]);
  const [prev, setPrev] = useState(0);
  useEffect(() => { const id = window.setTimeout(() => setPrev(act), 950); return () => window.clearTimeout(id); }, [act]);

  const heading = (eyebrow: string, title: string, id: string, light = false) => (
    <header className="js-g-rev max-w-[820px]">
      <p className={`flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] md:text-[13px] ${light ? 'text-cream/80' : 'text-ink/75'}`}><span aria-hidden className={`h-px w-8 md:w-12 ${light ? 'bg-cream/50' : 'bg-ink/40'}`} />{eyebrow}</p>
      <h2 id={id} className={`mt-4 font-display font-medium italic leading-[1.02] tracking-[-0.01em] md:mt-5 ${light ? 'text-cream' : 'text-pine'}`} style={{ fontSize: 'clamp(34px, 4.2vw, 64px)' }}>{title}</h2>
    </header>
  );

  return (
    <div ref={root} className="bg-cream text-ink">
      {/* hero */}
      <section id="top" aria-labelledby="g-title" className="relative isolate flex min-h-[94svh] items-end overflow-hidden bg-deep text-cream md:min-h-[100svh]">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="js-g-par absolute inset-0"><img src={GROUP_TYPES[0].img} alt="" className="js-g-hero h-full w-full object-cover object-[40%_60%]" /></div>
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--k-deep)_92%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_70%,transparent)_42%,color-mix(in_srgb,var(--k-deep)_15%,transparent)_70%,transparent_82%)] md:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--k-deep)_78%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_40%,transparent)_42%,transparent_68%)]" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[color-mix(in_srgb,var(--k-deep)_50%,transparent)] to-transparent" />
        </div>
        <div className="mx-auto w-full max-w-[1440px] px-5 pb-[calc(100px+env(safe-area-inset-bottom,0px))] pt-40 sm:px-6 md:px-10 md:pb-16 lg:px-14">
          <div className="max-w-[860px]">
            <p className="js-g-eyebrow text-[11.5px] font-semibold uppercase tracking-[.34em] text-cream/90 md:text-[13px]">{t.eyebrow}</p>
            <h1 id="g-title" className="mt-4 font-display font-normal leading-[1.02] tracking-[-0.012em] [text-shadow:0_2px_28px_rgba(0,0,0,.3)] md:mt-6" style={{ fontSize: 'clamp(40px, 5.4vw, 88px)' }}>
              <span className="block overflow-hidden pb-[0.06em]"><span className="js-g-line block">{t.title[0]}</span></span>
              <span className="block overflow-hidden pb-[0.12em]"><span className="js-g-line block italic text-gold-light">{t.title[1]}</span></span>
            </h1>
            <p className="js-g-in mt-5 max-w-[560px] text-[16px] leading-relaxed text-cream/90 md:text-[18px]">{t.sub}</p>
            <div className="js-g-in mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <a href={t.contactHref} onClick={(e) => { e.preventDefault(); document.getElementById('g-planner')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }} className="ph-primary inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold">{t.enquiry} <span className="arrow" aria-hidden>→</span></a>
              <a href={`tel:${GROUP_CONTACT.tel}`} className="ph-secondary inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-full px-8 text-[15.5px] font-semibold"><Icon d={ICO.phone} size={17} w={1.6} />{t.call}</a>
            </div>
          </div>
          <ul className="js-g-in mt-10 hidden flex-wrap gap-2 md:flex">
            {GROUP_TYPES.map((x, i) => (
              <li key={x.id}><a href="#g-fit" onClick={(e) => { e.preventDefault(); setAct(i); document.getElementById('g-fit')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cream/30 bg-black/15 px-4 text-[13px] font-semibold text-cream/90 backdrop-blur-sm transition-colors hover:border-gold-light hover:text-cream">
                <span className="lnum text-gold-light">{String(i + 1).padStart(2, '0')}</span>{x.label[lang]}</a></li>
            ))}
          </ul>
        </div>
      </section>

      {/* good fit for – interactive */}
      <section id="g-fit" aria-labelledby="g-fit-title" className="scroll-mt-24 px-5 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto max-w-[1360px]">
          {heading(t.fitEyebrow, t.fitTitle, 'g-fit-title')}
          <div className="mt-10 grid gap-8 md:mt-14 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-12">
            <div role="tablist" aria-label={t.fitEyebrow} className="rs-track -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0">
              {GROUP_TYPES.map((x, i) => (
                <button key={x.id} type="button" role="tab" aria-selected={act === i} aria-controls="g-panel" onClick={() => setAct(i)} onPointerEnter={(e) => fine && e.pointerType === 'mouse' && setAct(i)}
                  className={`g-tab group flex shrink-0 items-center gap-4 text-left ${act === i ? 'is-on' : ''}`}>
                  <span className="lnum text-[13px] font-semibold text-goldink">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-display text-[19px] leading-tight lg:text-[26px]">{x.title[lang]}</span>
                  <span aria-hidden className="g-tab-arrow ml-auto hidden lg:block"><Icon d={I.arrow} size={18} w={1.6} /></span>
                </button>
              ))}
            </div>
            <div id="g-panel" role="tabpanel" aria-live="polite" className="relative min-w-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-pine/10 md:aspect-[16/10]">
                <img src={GROUP_TYPES[prev].img} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
                <div key={act} className="js-g-pic-new absolute inset-0 overflow-hidden rounded-[24px]"><img src={g.img} alt={g.title[lang]} className="h-full w-full object-cover" /></div>
                <span aria-hidden className="lnum absolute right-5 top-3 font-display text-[64px] leading-none text-white/90 [text-shadow:0_2px_20px_rgba(0,0,0,.35)] md:text-[96px]">{String(act + 1).padStart(2, '0')}</span>
              </div>
              <div className="js-g-txt relative -mt-16 ml-4 mr-4 rounded-[20px] border border-pine/10 bg-cream p-6 shadow-[0_30px_60px_-35px_rgba(20,35,25,.45)] md:-mt-24 md:ml-10 md:mr-auto md:max-w-[560px] md:p-8">
                <h3 className="font-display text-[30px] font-medium italic leading-tight text-pine md:text-[38px]">{g.title[lang]}</h3>
                <p className="mt-3 text-[15.5px] leading-relaxed text-ink/75">{g.text[lang]}</p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {g.points[lang].map((p) => <li key={p} className="flex items-center gap-3 text-[15px] font-medium text-ink/85"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pine text-cream"><Icon d={ICO.check} size={13} w={2.2} /></span>{p}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* why the pension – capacity at a glance */}
      <section aria-labelledby="g-why" className="bg-soft px-5 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto grid max-w-[1360px] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            {heading(t.whyEyebrow, t.whyTitle, 'g-why')}
            <ul className="mt-10 grid gap-px overflow-hidden rounded-[20px] border border-pine/10 bg-pine/10 sm:grid-cols-2">
              {t.perks.map(([h, p]) => (
                <li key={h} className="js-g-rev bg-cream p-6">
                  <p className="font-display text-[22px] font-medium italic leading-tight text-pine">{h}</p>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink/70">{p}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="js-g-cap self-center rounded-[24px] border border-pine/10 bg-cream p-6 md:p-10">
            <div className="flex items-end justify-between gap-4">
              <p className="lnum font-display text-[84px] leading-none text-pine md:text-[110px]">17</p>
              <p className="pb-3 text-right text-[12px] font-semibold uppercase tracking-[.22em] text-ink/60">{t.rooms}</p>
            </div>
            <ul className="mt-6 grid grid-cols-9 gap-1.5 sm:gap-2" aria-hidden>
              {tiles.map((s, i) => <li key={i} className="js-g-tile aspect-[3/4] rounded-[6px]" style={{ background: TONE[s] }} />)}
            </ul>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3">
              {ROOMS.map((r) => (
                <li key={r.slug} className="flex items-center gap-3 text-[14px]">
                  <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: TONE[r.slug] }} />
                  <span className="lnum font-semibold">{r.count}×</span><span className="text-ink/75">{t.cats[r.slug as keyof typeof t.cats]}</span>
                  <span className="ml-auto text-[12.5px] text-ink/50">{t.beds(r.guests)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-pine/10 pt-5 text-[14.5px] text-ink/75"><span className="lnum js-g-total font-display text-[30px] text-pine">{total}</span> · {t.sum(total)}</p>
          </div>
        </div>
      </section>

      <GroupPlanner lang={lang} />

      {/* planning map */}
      <section aria-labelledby="g-map" className="px-4 py-16 sm:px-6 md:px-10 md:py-20 lg:px-14">
        <a href={GROUP_CONTACT.map} target="_blank" rel="noopener noreferrer" className="group relative isolate mx-auto flex min-h-[380px] max-w-[1400px] items-end overflow-hidden rounded-[28px] bg-deep p-7 text-cream md:min-h-[440px] md:p-12">
          <img src={`${BASE}map/satellite.jpg`} alt="" aria-hidden loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]" />
          <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(20deg,color-mix(in_srgb,var(--k-deep)_90%,transparent),color-mix(in_srgb,var(--k-deep)_35%,transparent)_70%)]" />
          <div className="max-w-[620px]">
            <p className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[.34em] text-cream/80"><Icon d={ICO.map} size={17} w={1.5} />{t.mapEyebrow}</p>
            <h2 id="g-map" className="mt-4 font-display font-medium italic leading-[1.05]" style={{ fontSize: 'clamp(30px, 3.6vw, 52px)' }}>{t.mapTitle}</h2>
            <span className="ph-primary mt-7 inline-flex min-h-[52px] items-center gap-3 rounded-full px-7 text-[15px] font-semibold">{t.mapCta} <span className="arrow" aria-hidden>↗</span></span>
          </div>
        </a>
      </section>

      {/* plan together */}
      <section aria-labelledby="g-plan" className="px-5 pb-[calc(110px+env(safe-area-inset-bottom,0px))] pt-8 sm:px-6 md:px-10 md:pb-28 lg:px-14">
        <div className="mx-auto grid max-w-[1360px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            {heading(t.planEyebrow, t.planTitle, 'g-plan')}
            <p className="js-g-rev mt-5 max-w-[46ch] text-[16.5px] leading-relaxed text-ink/75">{t.planText}</p>
            <p className="js-g-rev mt-3 text-[13px] text-ink/50">{t.note}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { k: 'form', href: t.contactHref, label: t.ways.form, sub: lang === 'de' ? 'Daten & Gruppe' : 'Dates & group', primary: true },
              { k: 'phone', href: `tel:${GROUP_CONTACT.tel}`, label: t.ways.call, sub: GROUP_CONTACT.telLabel },
              { k: 'wa', href: GROUP_CONTACT.wa, label: t.ways.wa, sub: lang === 'de' ? 'Schnell & direkt' : 'Quick & direct' },
              { k: 'mail', href: `mailto:${GROUP_CONTACT.mail}`, label: t.ways.mail, sub: GROUP_CONTACT.mail },
            ].map((w) => (
              <li key={w.k} className="js-g-rev min-w-0">
                <a href={w.href} {...(w.k === 'wa' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={`g-way group flex h-full items-center gap-4 rounded-[18px] border p-5 ${w.primary ? 'is-primary border-pine bg-pine text-cream' : 'border-pine/15 bg-cream text-ink'}`}>
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${w.primary ? 'bg-cream/15' : 'bg-pine/10 text-pine'}`}><Icon d={ICO[w.k as keyof typeof ICO]} size={20} w={1.5} /></span>
                  <span className="min-w-0"><span className="block text-[16px] font-semibold">{w.label}</span><span className={`block truncate text-[13px] ${w.primary ? 'text-cream/75' : 'text-ink/60'}`}>{w.sub}</span></span>
                  <span aria-hidden className="ml-auto transition-transform duration-300 group-hover:translate-x-1"><Icon d={I.arrow} size={17} w={1.7} /></span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
