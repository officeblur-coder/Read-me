import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { DINING, DISHES, dimg, rimg } from '../../content/diningPage';
import { MENU_PDF, REST_COPY, REST_PHOTOS } from '../../content/restaurant';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { RestaurantHighlights } from './RestaurantHighlights';
import { RestaurantOpeningHours } from './RestaurantOpeningHours';
import { PensionFinalCTA } from '../pension/PensionFinalCTA';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const AMEN = `${import.meta.env.BASE_URL}images/amenities/`;

/** Restaurant page – same language as the rest of the site: photo hero, cream sections, pine & gold. */
export function DiningPage({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const t = DINING[lang];
  const rc = REST_COPY[lang];

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    // hero: the photo is there from the first frame; it only settles, the words rise
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-d-hero'), { scale: 1.06 }, { scale: 1, duration: 1.8, ease: 'power2.out' }, 0)
      .fromTo(q('.js-d-eyebrow'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.25)
      .fromTo(q('.js-d-line'), { yPercent: 110 }, { yPercent: 0, duration: 0.95, stagger: 0.1, ease: 'power4.out' }, 0.35)
      .fromTo(q('.js-d-in'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.8);
    if (fine) gsap.to(q('.js-d-par'), { yPercent: 8, ease: 'none', scrollTrigger: { trigger: q('#top')[0], start: 'top top', end: 'bottom top', scrub: 0.6 } });

    q('.js-d-rev').forEach((el) => gsap.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    q('.js-d-mask').forEach((el) => {
      const im = el.querySelector('img');
      if (im) gsap.fromTo(im, { scale: 1.08 }, { scale: 1, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
    ScrollTrigger.create({ trigger: q('.js-d-facts')[0], start: 'top 88%', once: true, onEnter: () => {
      gsap.fromTo(q('.js-rh'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' });
      gsap.fromTo(q('.js-rhours'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.3, ease: 'power3.out' });
    } });
  }, { scope: root, dependencies: [reduced, fine, lang] });

  const moments = [
    { ...t.moments[0], img: `${AMEN}breakfast.webp` },
    { ...t.moments[1], img: dimg('hall-clean') },
    { ...t.moments[2], img: rimg('bar', 800) },
  ];
  const head = (eyebrow: string, title: string, id: string, center = false) => (
    <header className={`js-d-rev max-w-[760px] ${center ? 'mx-auto text-center' : ''}`}>
      <p className={`flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] text-ink/75 md:text-[13px] ${center ? 'justify-center' : ''}`}>
        <span aria-hidden className="h-px w-8 bg-ink/40 md:w-12" />{eyebrow}{center && <span aria-hidden className="h-px w-8 bg-ink/40 md:w-12" />}
      </p>
      <h2 id={id} className="mt-4 font-display font-medium italic leading-[1] tracking-[-0.01em] text-pine md:mt-5" style={{ fontSize: 'clamp(36px, 4.4vw, 68px)' }}>{title}</h2>
    </header>
  );

  return (
    <div ref={root} className="bg-cream text-ink">
      {/* hero – like the other subpages: the real room, contrast only where the text sits */}
      <section id="top" aria-labelledby="d-title" className="relative isolate flex min-h-[92svh] items-end overflow-hidden bg-deep text-cream md:min-h-[100svh]">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="js-d-par absolute inset-0">
            <img src={dimg('hall-clean')} alt={t.heroAlt} className="js-d-hero h-full w-full object-cover object-[45%_55%]" />
          </div>
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--k-deep)_92%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_72%,transparent)_45%,color-mix(in_srgb,var(--k-deep)_20%,transparent)_70%,transparent_80%)] md:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--k-deep)_72%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_35%,transparent)_40%,transparent_65%)]" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[color-mix(in_srgb,var(--k-deep)_50%,transparent)] to-transparent" />
        </div>
        <div className="mx-auto w-full max-w-[1440px] px-5 pb-[calc(100px+env(safe-area-inset-bottom,0px))] pt-40 sm:px-6 md:px-10 md:pb-20 lg:px-14">
          <div className="max-w-[760px]">
            <p className="js-d-eyebrow text-[11.5px] font-semibold uppercase tracking-[.34em] text-cream/90 md:text-[13px]">{t.eyebrow}</p>
            <h1 id="d-title" className="mt-4 font-display font-normal leading-[1.02] tracking-[-0.012em] [text-shadow:0_2px_28px_rgba(0,0,0,.3)] md:mt-6" style={{ fontSize: 'clamp(40px, 5.6vw, 92px)' }}>
              <span className="block overflow-hidden pb-[0.06em]"><span className="js-d-line block">{rc.headline[0]}</span></span>
              <span className="block overflow-hidden pb-[0.12em]"><span className="js-d-line block italic text-gold-light">{rc.headline[1]} {rc.headline[2]}</span></span>
            </h1>
            <p className="js-d-in mt-5 max-w-[520px] text-[16px] leading-relaxed text-cream/90 md:text-[18px]">{t.sub}</p>
            <div className="js-d-in mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <a href={MENU_PDF} target="_blank" rel="noopener noreferrer" className="ph-primary inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold">
                {rc.cta} <span className="text-[11px] tracking-[.14em] opacity-70">PDF</span> <span className="arrow" aria-hidden>→</span>
              </a>
              <a href="#d-day" onClick={(e) => { e.preventDefault(); document.getElementById('d-day')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }} className="ph-secondary inline-flex min-h-[54px] items-center justify-center rounded-full px-8 text-[15.5px] font-semibold">{rc.hoursTitle}</a>
            </div>
          </div>
        </div>
      </section>

      {/* intro + highlights + hours */}
      <section aria-labelledby="d-intro" className="px-5 pb-20 pt-20 sm:px-6 md:px-10 md:pb-28 md:pt-28 lg:px-14">
        <div className="mx-auto grid max-w-[1360px] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            {head(rc.eyebrow, lang === 'de' ? 'Pinzgauer Gastfreundschaft am Tisch.' : 'Pinzgau hospitality at the table.', 'd-intro')}
            <p className="js-d-rev mt-6 max-w-[46ch] text-[16px] leading-[1.75] text-ink/75 md:text-[18px]">{rc.sub}</p>
          </div>
          <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-end gap-4 md:gap-5">
            <figure className="js-d-mask js-d-rev m-0 overflow-hidden rounded-[20px]"><img src={rimg('corner', 800)} alt={REST_PHOTOS.find((p) => p.id === 'corner')!.alt[lang]} loading="lazy" className="aspect-[4/5] w-full object-cover" /></figure>
            <figure className="js-d-mask js-d-rev m-0 overflow-hidden rounded-[20px]"><img src={dimg('dish-pan')} alt={DISHES[0].note[lang]} loading="lazy" className="aspect-[3/4] w-full object-cover" /></figure>
          </div>
        </div>
        <div className="js-d-facts mx-auto mt-14 flex max-w-[1360px] flex-col gap-6 md:mt-20 md:gap-10">
          <RestaurantHighlights items={rc.highlights} />
          <RestaurantOpeningHours copy={rc} lang={lang} />
        </div>
      </section>

      {/* the day: three calm columns */}
      <section id="d-day" aria-labelledby="d-day-title" className="scroll-mt-24 bg-soft px-5 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto max-w-[1360px]">
          {head(t.dayEyebrow, lang === 'de' ? 'Vom Frühstück bis zur Bar.' : 'From breakfast to the bar.', 'd-day-title', true)}
          <ul className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-8">
            {moments.map((m) => (
              <li key={m.label} className="js-d-rev flex flex-col">
                <figure className="js-d-mask m-0 overflow-hidden rounded-[20px]"><img src={m.img} alt={m.title} loading="lazy" className="aspect-[4/3] w-full object-cover" /></figure>
                <div className="mt-5 flex items-baseline justify-between gap-4 border-b border-pine/15 pb-4">
                  <h3 className="font-display text-[28px] font-medium italic leading-tight text-pine md:text-[32px]">{m.title}</h3>
                  <span className="lnum shrink-0 text-[14px] font-semibold text-goldink">{m.end ? `${m.time}–${m.end}` : m.label}</span>
                </div>
                <p className="mt-4 text-[15.5px] leading-relaxed text-ink/70">{m.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* kitchen */}
      <section aria-labelledby="d-kitchen" className="py-20 md:py-28">
        <div className="mx-auto max-w-[1360px] px-5 sm:px-6 md:px-10 lg:px-14">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            {head(t.kitchenEyebrow, t.kitchenTitle, 'd-kitchen')}
            <a href={MENU_PDF} target="_blank" rel="noopener noreferrer" className="js-d-rev btn-pine inline-flex min-h-[52px] shrink-0 items-center gap-3 self-start rounded-full px-7 text-[15px] font-semibold md:self-auto">
              {rc.cta} <span className="text-[11px] font-semibold tracking-[.14em] text-gold">PDF</span> <span className="arrow" aria-hidden>→</span>
            </a>
          </div>
        </div>
        <ul className="rs-track mx-auto mt-12 flex max-w-[1360px] snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:px-6 md:mt-14 md:grid md:grid-cols-5 md:gap-5 md:overflow-visible md:px-10 lg:px-14">
          {DISHES.map((d) => (
            <li key={d.id} className="js-d-rev w-[70%] shrink-0 snap-center md:w-auto">
              <figure className="group m-0">
                <div className="overflow-hidden rounded-[18px] border border-pine/10"><img src={dimg(d.id)} alt={d.note[lang]} loading="lazy" className="aspect-[4/5] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]" /></div>
                <figcaption className="mt-3 text-[14px] leading-snug text-ink/70"><span className="block text-[11px] font-semibold uppercase tracking-[.2em] text-goldink">{d.title[lang]}</span>{d.note[lang]}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-8 max-w-[1360px] px-5 text-[13px] text-ink/50 sm:px-6 md:px-10 lg:px-14">{t.kitchenNote}</p>
      </section>

      {/* the rooms */}
      <section aria-labelledby="d-rooms" className="px-5 pb-24 sm:px-6 md:px-10 md:pb-32 lg:px-14">
        <div className="mx-auto max-w-[1360px]">
          {head(t.roomsEyebrow, t.roomsTitle, 'd-rooms')}
          <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:grid-rows-2 md:gap-5">
            {['hall', 'lounge', 'bar'].map((id, i) => {
              const p = REST_PHOTOS.find((x) => x.id === id)!;
              return (
                <figure key={id} className={`js-d-mask js-d-rev relative m-0 overflow-hidden rounded-[20px] ${i === 0 ? 'aspect-[4/3] md:row-span-2 md:aspect-auto md:min-h-[560px]' : 'aspect-[4/3] md:aspect-auto'}`}>
                  <img src={id === 'hall' ? dimg('hall-clean') : rimg(id, 800)} alt={p.alt[lang]} loading="lazy" className="h-full w-full object-cover" />
                  <figcaption className="absolute bottom-3 left-4 rounded-full bg-cream/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.16em] text-pine">{p.label[lang]}</figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      <PensionFinalCTA lang={lang} />
    </div>
  );
}
