import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang, Season } from '../../content/hero';
import { ACT_COPY, ACTIVITIES } from '../../content/activities';
import { QUICK_ACTIONS } from '../../content/amenities';
import { useReducedMotion } from '../../lib/hooks';
import { useSeason } from '../../lib/season';
import { ActIcon, ActPic } from './ActivityCard';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Dedicated page: /activities/summer and /activities/winter on the live site
 * (here routed as #activities-summer / #activities-winter).
 * Opening a page also sets the global season, so the palette matches.
 */
export function ActivitiesPage({ season, lang }: { season: Season; lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const { setSeason } = useSeason();
  const reduced = useReducedMotion();
  const copy = ACT_COPY[lang];
  const sc = copy[season];
  const items = ACTIVITIES[season];
  const practical = season === 'summer' ? copy.practicalSummer : copy.practicalWinter;

  useEffect(() => { setSeason(season); window.scrollTo(0, 0); }, [season, setSeason]);

  useGSAP(() => {
    if (reduced) return;
    gsap.fromTo('.js-ap-line', { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: 0.12, ease: 'power4.out', delay: 0.1 });
    gsap.fromTo('.js-ap-fade', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', delay: 0.4 });
    gsap.utils.toArray<HTMLElement>('.js-ap-row').forEach((row) => {
      gsap.fromTo(row.querySelector('.js-ap-img'), { clipPath: 'inset(0% 0% 100% 0% round 16px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 1.1, ease: 'power3.inOut', scrollTrigger: { trigger: row, start: 'top 80%', once: true } });
      gsap.fromTo(row.querySelectorAll('.js-ap-txt'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 78%', once: true } });
    });
  }, { scope: root, dependencies: [season, lang, reduced] });

  return (
    <article ref={root} className="bg-cream text-ink" aria-labelledby="ap-title">
      {/* page opener – dark band behind the global header */}
      <header className="relative overflow-hidden bg-deep pb-14 pt-32 text-cream md:pb-20 md:pt-40">
        <div aria-hidden className="absolute inset-0 opacity-40">
          <ActPic stem={items[0].photo ?? sc.feature} alt="" sizes="100vw" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--k-deep)_70%,transparent),var(--k-deep))]" />
        </div>
        <div className="relative mx-auto grid max-w-[1360px] gap-10 px-5 sm:px-6 md:px-10 lg:grid-cols-12 lg:items-end lg:px-14">
          <div className="lg:col-span-8">
            <a href="#top" className="js-ap-fade inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold uppercase tracking-[.18em] text-gold-light hover:text-cream">← {copy.page.back}</a>
            <p className="js-ap-fade mt-6 text-[12px] font-semibold uppercase tracking-[.36em] text-cream/80">{copy.eyebrow}</p>
            <h1 id="ap-title" className="mt-4 font-display font-medium leading-[0.95] text-cream" style={{ fontSize: 'clamp(46px, 7vw, 112px)' }}>
              <span className="block overflow-hidden pb-[0.04em]"><span className="js-ap-line block">{sc.head[0]}</span></span>
              <span className="block overflow-hidden pb-[0.12em]"><span className="js-ap-line block italic text-gold">{sc.head[1]}</span></span>
            </h1>
            <p className="js-ap-fade mt-5 max-w-[50ch] text-[16px] leading-[1.7] text-cream/80 md:text-[18px]">{sc.sub}</p>
          </div>
          <div className="js-ap-fade hidden lg:col-span-4 lg:block">
            <div className="ml-auto aspect-[4/5] w-[min(26vw,340px)] overflow-hidden rounded-[18px]"><ActPic stem={sc.feature} alt={sc.featureAlt} sizes="340px" /></div>
          </div>
        </div>
      </header>

      {/* activities as editorial rows */}
      <div className="mx-auto max-w-[1360px] px-5 py-16 sm:px-6 md:px-10 md:py-24 lg:px-14">
        <ol className="flex flex-col gap-16 md:gap-24">
          {items.map((a, i) => (
            <li key={a.id} id={a.id} className="js-ap-row grid items-center gap-6 md:grid-cols-12 md:gap-12">
              <div className={`js-ap-img relative aspect-[4/3] overflow-hidden rounded-[16px] bg-pine/10 md:col-span-7 ${i % 2 ? 'md:order-2' : ''}`}>
                {a.photo ? <ActPic stem={a.photo} alt={a.title[lang]} sizes="(min-width:768px) 55vw, 100vw" style={{ objectPosition: a.focus }} />
                  : <div className="grid h-full place-items-center bg-[linear-gradient(160deg,var(--k-pine),var(--k-deep))] text-gold"><ActIcon name={a.icon} size={64} /></div>}
              </div>
              <div className="md:col-span-5">
                <p className="js-ap-txt font-display text-[22px] italic text-goldink">{String(i + 1).padStart(2, '0')}</p>
                <h2 className="js-ap-txt mt-2 font-display text-[clamp(32px,3.6vw,52px)] font-medium leading-[1.02] text-pine">{a.title[lang]}</h2>
                {a.fact && <p className="js-ap-txt mt-3 inline-block rounded-full border border-gold/60 px-3 py-1 text-[12px] font-semibold text-goldink">{a.fact[lang]}</p>}
                {a.verify && <p className="js-ap-txt mt-3 inline-block rounded-full border border-dashed border-gold px-3 py-1 text-[12px] font-semibold text-goldink">{a.verify[lang]}</p>}
                <p className="js-ap-txt mt-4 text-[16px] leading-[1.75] text-ink/80 md:text-[17px]">{a.more[lang]}</p>
                {a.highlights && (
                  <ul className="js-ap-txt mt-5 flex flex-col gap-2 border-t border-pine/10 pt-4 text-[15px] text-ink/85">
                    {a.highlights[lang].map((h) => <li key={h} className="flex items-center gap-3"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold" />{h}</li>)}
                  </ul>
                )}
                {a.href && (
                  <a href={a.href} target="_blank" rel="noopener noreferrer" className="js-ap-txt act-cta mt-6 inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold uppercase tracking-[.16em] text-pine">
                    {copy.visit} <span aria-hidden className="act-cta-arrow">↗</span>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>

        {/* practical info */}
        <section aria-labelledby="ap-practical" className="mt-20 grid gap-8 rounded-[20px] border border-pine/10 bg-soft p-6 md:mt-28 md:grid-cols-12 md:p-10">
          <h2 id="ap-practical" className="font-display text-[34px] font-medium italic text-pine md:col-span-4">{copy.page.practical}</h2>
          <div className="md:col-span-8">
            <ul className="flex flex-col gap-3 text-[16px] text-ink/85">
              {practical.map((p) => <li key={p} className="flex gap-3"><span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{p}</li>)}
            </ul>
            {season === 'winter' && <p className="mt-5 text-[14px] text-ink/60">{copy.otherWinter}</p>}
            <a href={QUICK_ACTIONS.room} target="_blank" rel="noopener noreferrer" className="btn-pine mt-7 inline-flex min-h-[52px] items-center gap-3 rounded-full px-8 text-[15px] font-semibold">
              {copy.page.book} <span className="arrow" aria-hidden>→</span>
            </a>
          </div>
        </section>
      </div>
    </article>
  );
}
