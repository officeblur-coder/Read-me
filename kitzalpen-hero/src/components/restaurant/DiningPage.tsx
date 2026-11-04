import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { DINING, DISHES, dimg, rimg } from '../../content/diningPage';
import { MENU_PDF, REST_PHOTOS } from '../../content/restaurant';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { Icon } from '../pension/PensionRooms';
import { PensionFinalCTA } from '../pension/PensionFinalCTA';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const DOC = ['M7 3h7l5 5v13H7Z', 'M14 3v5h5', 'M10 13h6M10 17h6'];
const CLOCK = ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2'];

/** Vienna time → today's status (Mon closed; 08–10 and 17–21). */
function useStatus(lang: Lang) {
  return useMemo(() => {
    const t = DINING[lang];
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vienna', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const wd = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0), m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    const min = h * 60 + m, mon = wd === 'Mon';
    const open = !mon && ((min >= 480 && min < 600) || (min >= 1020 && min < 1260));
    const dayIdx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wd);
    return { mon, open, dayIdx, label: mon ? t.closedToday : open ? t.open : `${t.today}: 08–10 · 17–21` };
  }, [lang]);
}

/** Restaurant page – golden-hour hero with dealt plates, a day at the table, the kitchen, the rooms, hours. */
export function DiningPage({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const t = DINING[lang];
  const st = useStatus(lang);
  const [step, setStep] = useState(0);

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    q('.js-d-step').forEach((el, i) => ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && setStep(i) }));
    if (reduced) return;
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-d-hero'), { filter: 'brightness(.15) saturate(.5)', scale: 1.12 }, { filter: 'brightness(1) saturate(1)', scale: 1, duration: 2.6, ease: 'power2.inOut', clearProps: 'filter' }, 0)
      .fromTo(q('.js-d-glow'), { opacity: 0 }, { opacity: 1, duration: 1.2 }, 0.8)
      .fromTo(q('.js-d-light'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 2 }, 1)
      .fromTo(q('.js-d-line'), { yPercent: 115 }, { yPercent: 0, duration: 1.1, stagger: 0.1, ease: 'power4.out' }, 1.1)
      .fromTo(q('.js-d-in'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, 1.5);
    gsap.to(q('.js-d-par-hero'), { yPercent: 10, ease: 'none', scrollTrigger: { trigger: q('#top')[0], start: 'top top', end: 'bottom top', scrub: 0.6 } });
    q('.js-d-rev').forEach((el) => gsap.fromTo(el, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    q('.js-d-mask').forEach((el) => {
      gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0% round 20px)' }, { clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: 1.3, ease: 'expo.out', clearProps: 'clipPath', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      const im = el.querySelector('img'); if (im) gsap.fromTo(im, { scale: 1.18 }, { scale: 1, duration: 1.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    if (fine) q('.js-d-par').forEach((el, i) => gsap.fromTo(el, { y: [40, -30, 70, -10, 50][i % 5] }, { y: [-40, 30, -70, 10, -50][i % 5], ease: 'none', scrollTrigger: { trigger: q('.js-d-kitchen')[0], start: 'top bottom', end: 'bottom top', scrub: 0.6 } }));
  }, { scope: root, dependencies: [reduced, fine, lang] });

  const SKY = ['#f3e6cf', '#3a2414', '#140d09'];
  const steps = [
    { main: `${import.meta.env.BASE_URL}images/amenities/breakfast.webp`, inset: dimg('breakfast-cold'), alt: t.moments[0].title },
    { main: dimg('hall-clean'), inset: dimg('dish-steak'), alt: t.moments[1].title },
    { main: rimg('bar'), inset: rimg('lounge', 800), alt: t.moments[2].title },
  ];

  return (
    <div ref={root} className="bg-[#1a120c] text-cream">
      {/* hero: the dining room, lights coming on */}
      <section id="top" aria-labelledby="d-title" className="relative isolate flex min-h-[100svh] items-end overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="js-d-par-hero absolute -inset-y-[5%] inset-x-0">
            <img src={dimg('hall-clean')} alt={t.heroAlt} className="js-d-hero h-full w-full object-cover object-[45%_55%]" />
          </div>
          <div aria-hidden className="js-d-glow absolute inset-0 mix-blend-screen" style={{ background: 'radial-gradient(45% 35% at 32% 8%, rgba(255,190,110,.38), transparent 70%), radial-gradient(30% 25% at 74% 14%, rgba(255,190,110,.28), transparent 70%)' }} />
          <div aria-hidden className="js-d-light d-light absolute inset-0" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,rgba(26,18,12,.95)_0%,rgba(26,18,12,.7)_30%,rgba(26,18,12,.15)_60%,transparent_75%)] md:bg-[linear-gradient(20deg,rgba(26,18,12,.92)_0%,rgba(26,18,12,.6)_35%,transparent_65%)]" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent" />
        </div>
        <div className="mx-auto grid w-full max-w-[1440px] items-end gap-8 px-5 pb-[calc(100px+env(safe-area-inset-bottom,0px))] pt-40 sm:px-6 md:px-10 md:pb-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-14">
          <div className="min-w-0">
            <p className="js-d-in flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.32em] text-gold-light md:text-[12.5px]"><span aria-hidden className="h-px w-8 bg-gold-light" />{t.eyebrow}</p>
            <h1 id="d-title" className="mt-5 font-display font-normal leading-[.96] tracking-[-0.02em] [text-shadow:0_2px_30px_rgba(0,0,0,.35)]" style={{ fontSize: 'clamp(46px, 7.4vw, 124px)' }}>
              {t.title.map((l, i) => <span key={i} className="block overflow-hidden pb-[0.07em]"><span className={`js-d-line block ${i === 2 ? 'italic text-gold-light' : ''}`}>{l}</span></span>)}
            </h1>
            <p className="js-d-in mt-6 max-w-[520px] text-[16px] leading-relaxed text-cream/85 md:text-[18px]">{t.sub}</p>
            <div className="js-d-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href={MENU_PDF} target="_blank" rel="noopener noreferrer" className="pf-primary inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold"><Icon d={DOC} size={18} w={1.6} />{t.menu}</a>
              <span className="inline-flex min-h-[56px] items-center justify-center gap-2.5 rounded-full border border-cream/30 bg-black/20 px-6 text-[14px] font-semibold text-cream/90 backdrop-blur-sm">
                <span className={`h-2 w-2 rounded-full ${st.open ? 'bg-[#7fd18b] shadow-[0_0_10px_#7fd18b]' : st.mon ? 'bg-[#e07a5f]' : 'bg-gold-light'}`} />{st.label}
              </span>
            </div>
          </div>
          {/* hours at a glance */}
          <dl className="js-d-in hidden w-[280px] border-t border-cream/30 lg:block">
            {t.hours.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between border-b border-cream/20 py-4"><dt className="text-[11.5px] font-semibold uppercase tracking-[.22em] text-cream/75">{k}</dt><dd className="lnum font-display text-[26px] leading-none">{v}</dd></div>
            ))}
            <p className="pt-3 text-[12.5px] text-cream/65">{t.days} · {t.closed}</p>
          </dl>
        </div>
      </section>

      {/* a day at the table */}
      <section aria-label={t.dayEyebrow} className="relative transition-colors duration-[900ms]" style={{ background: SKY[step] }}>
        <div className={`mx-auto max-w-[1440px] px-5 sm:px-6 md:px-10 lg:px-14 ${step === 0 ? 'text-ink' : 'text-cream'} transition-colors duration-700`}>
          <p className="z-10 pt-14 lg:sticky lg:top-[110px] text-[11.5px] font-semibold uppercase tracking-[.34em] opacity-70 md:pt-14">{t.dayEyebrow}</p>
          {t.moments.map((m, i) => (
            <article key={m.label} className="js-d-step grid min-h-[86vh] items-center gap-8 py-14 md:py-20 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:gap-16">
              <div className="js-d-rev">
                <p className="text-[12px] font-semibold uppercase tracking-[.3em] text-goldink" style={i ? { color: 'var(--k-gold-light)' } : undefined}>{m.label}</p>
                <p className="lnum mt-3 flex items-baseline gap-3 font-display leading-none" style={{ fontSize: 'clamp(72px, 10vw, 160px)' }}>
                  {m.time}{m.end && <span className="text-[.28em] opacity-60">– {m.end}</span>}
                </p>
                <h2 className="mt-4 font-display text-[36px] font-normal leading-tight md:text-[48px]">{m.title}</h2>
                <p className="mt-3 max-w-[440px] text-[16.5px] leading-relaxed opacity-75">{m.text}</p>
              </div>
              <div className="relative">
                <div className="js-d-mask overflow-hidden rounded-[22px] shadow-[0_40px_80px_-40px_rgba(0,0,0,.6)]"><img src={steps[i].main} alt={steps[i].alt} loading="lazy" className="aspect-[16/10] w-full object-cover" /></div>
                <div className="js-d-mask absolute -bottom-8 -left-3 w-[42%] overflow-hidden rounded-[18px] border-[5px] md:-left-10 md:w-[36%]" style={{ borderColor: SKY[i] }}>
                  <img src={steps[i].inset} alt="" loading="lazy" className={`w-full object-cover ${i === 1 ? 'aspect-[4/5]' : 'aspect-[4/3]'}`} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* kitchen */}
      <section aria-labelledby="d-kitchen" className="js-d-kitchen overflow-hidden bg-[#FAF8F5] py-24 text-ink md:py-36">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-6 md:px-10 lg:px-14">
          <p className="js-d-rev text-[11.5px] font-semibold uppercase tracking-[.34em] text-goldink">{t.kitchenEyebrow}</p>
          <h2 id="d-kitchen" className="js-d-rev mt-3 font-display font-normal leading-[1.02] tracking-[-0.015em]" style={{ fontSize: 'clamp(38px, 5vw, 76px)' }}>{t.kitchenTitle}</h2>
        </div>
        <ul className="rs-track mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-6 sm:px-6 md:mt-20 md:grid md:grid-cols-5 md:gap-5 md:overflow-visible md:px-10 lg:px-14">
          {DISHES.map((d, i) => (
            <li key={d.id} className="js-d-par w-[72%] shrink-0 snap-center md:w-auto" style={{ marginTop: fine ? [0, 80, 20, 110, 40][i] : 0 }}>
              <figure className="js-d-rev group m-0">
                <div className="overflow-hidden rounded-[20px] shadow-[0_30px_60px_-35px_rgba(40,20,5,.6)]">
                  <img src={dimg(d.id)} alt={d.note[lang]} loading="lazy" className="aspect-[1000/1414] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]" />
                </div>
                <figcaption className="mt-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[.24em] text-goldink">{String(i + 1).padStart(2, '0')} · {d.title[lang]}</span>
                  <span className="mt-1.5 block font-display text-[20px] leading-snug text-ink/85">{d.note[lang]}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-10 max-w-[1440px] px-5 text-[13px] text-ink/50 sm:px-6 md:mt-28 md:px-10 lg:px-14">{t.kitchenNote}</p>
      </section>

      {/* rooms + hours */}
      <section aria-labelledby="d-rooms" className="bg-[#FAF8F5] px-5 pb-24 text-ink sm:px-6 md:px-10 md:pb-32 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <p className="js-d-rev text-[11.5px] font-semibold uppercase tracking-[.34em] text-goldink">{t.roomsEyebrow}</p>
          <h2 id="d-rooms" className="js-d-rev mt-3 font-display font-normal leading-[1.02] tracking-[-0.015em]" style={{ fontSize: 'clamp(36px, 4.6vw, 70px)' }}>{t.roomsTitle}</h2>
          <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:grid-rows-2 md:gap-5">
            {['hall', 'corner', 'bar'].map((id, i) => {
              const p = REST_PHOTOS.find((x) => x.id === id)!;
              return (
                <figure key={id} className={`js-d-mask relative m-0 overflow-hidden rounded-[22px] ${i === 0 ? 'aspect-[4/3] md:row-span-2 md:aspect-auto md:min-h-[600px]' : 'aspect-[4/3] md:aspect-auto'}`}>
                  <img src={id === 'hall' ? dimg('hall-clean') : rimg(id, 800)} alt={p.alt[lang]} loading="lazy" className="h-full w-full object-cover" />
                  <figcaption className="absolute bottom-3 left-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.16em]">{p.label[lang]}</figcaption>
                </figure>
              );
            })}
          </div>

          <div className="js-d-rev mt-20 grid overflow-hidden rounded-[28px] bg-[#1a120c] text-cream md:mt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="p-8 md:p-12">
              <p className="flex items-center gap-2.5 text-[11.5px] font-semibold uppercase tracking-[.3em] text-gold-light"><Icon d={CLOCK} size={16} w={1.6} />{t.hoursTitle}</p>
              <ul className="mt-6 flex gap-1.5 md:gap-2" aria-label={`${t.days} · ${t.closed}`}>
                {t.week.map((d, i) => (
                  <li key={d} aria-hidden className={`grid h-11 flex-1 place-items-center rounded-[10px] text-[12.5px] font-semibold md:h-12 ${i === 0 ? 'border border-dashed border-cream/25 text-cream/35 line-through' : 'bg-white/[.07]'} ${i === st.dayIdx ? 'ring-2 ring-gold-light' : ''}`}>{d}</li>
                ))}
              </ul>
              <dl className="mt-6 divide-y divide-white/10 border-y border-white/10">
                {t.hours.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between py-4"><dt className="text-[15px] text-cream/75">{k}</dt><dd className="lnum font-display text-[28px] leading-none">{v}</dd></div>
                ))}
              </dl>
              <p className="mt-4 text-[14px] text-cream/60">{t.days} · {t.closed}</p>
            </div>
            <div className="relative min-h-[300px]">
              <img src={dimg('dish-pasta')} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a120c] via-[#1a120c]/40 to-transparent lg:bg-gradient-to-r" />
              <div className="relative flex h-full flex-col justify-end gap-4 p-8 md:p-12">
                <p className="max-w-[320px] font-display text-[26px] leading-snug">{t.menuText}</p>
                <a href={MENU_PDF} target="_blank" rel="noopener noreferrer" className="pf-primary inline-flex min-h-[54px] items-center gap-3 self-start rounded-full px-7 text-[15px] font-semibold"><Icon d={DOC} size={18} w={1.6} />{t.menu}</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PensionFinalCTA lang={lang} />
    </div>
  );
}
