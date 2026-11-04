import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang, Season } from '../../content/hero';
import { CHALET_ALL, CHALET_BOOKING, CHALET_MAPS, CHALET_PAGE, CHAPTER_PICS, CP, DETAIL_PICS, type CPic } from '../../content/chaletPage';
import { useIsMobile, useReducedMotion } from '../../lib/hooks';
import { useSeason } from '../../lib/season';
import { SeasonFx } from '../SeasonFx';
import { Icon, I } from '../pension/PensionRooms';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const BASE = `${import.meta.env.BASE_URL}images/`;
const CBASE = `${BASE}chalet-page/`;

/** Seasonal exterior photos supplied by KitzAlpen (also used in the homepage chalet section). */
const HERO: Record<Season, { stem: string; sizes: number[]; w: number; h: number; desk: string; mob: string }> = {
  winter: { stem: 'chalet/winter', sizes: [800, 1536], w: 1536, h: 1024, desk: '50% 55%', mob: '52% 50%' },
  summer: { stem: 'chalet/summer', sizes: [800, 1440], w: 1440, h: 1080, desk: '50% 60%', mob: '45% 55%' },
};
const HERO_ALT = {
  de: { winter: 'KitzAlpen Chalet im Winter, verschneit und mit Lichterketten beleuchtet', summer: 'KitzAlpen Chalet im Sommer mit Terrasse, Rasen und Wald im Hintergrund' },
  en: { winter: 'KitzAlpen Chalet in winter, snow-covered and lit with fairy lights', summer: 'KitzAlpen Chalet in summer with terrace, lawn and forest behind' },
};
const FACT_ICON: Record<string, string[]> = {
  guests: ['M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11Z', 'M3 20a6 6 0 0 1 12 0', 'M16 5.2a3 3 0 0 1 0 5.6M21 20a5.5 5.5 0 0 0-3.5-5.1'],
  beds: ['M3 18.5v-11M21 18.5v-5.5a2 2 0 0 0-2-2H3M3 15.5h18M5 8h5.2v3.5H5Z'],
  kitchen: ['M4 4h16v16H4Z', 'M4 9h16', 'M8 6.5h.01M11 6.5h.01', 'M9 14a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z'],
  bath: ['M4 12h16v2.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 14.5Z', 'M6 12V6a2 2 0 0 1 3.8-.8', 'M7 19l-1 2M17 19l1 2'],
  living: ['M4 13V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4', 'M2.5 13.5a1.5 1.5 0 0 1 3 0V16h13v-2.5a1.5 1.5 0 0 1 3 0V19h-19Z', 'M5 19v1.5M19 19v1.5'],
};
const CAL = ['M4 6.5h16V20H4Z', 'M4 10.5h16M8.5 4v4M15.5 4v4'];
const MAIL = ['M3.5 6h17v12h-17Z', 'm4 7 8 6 8-6'];
const PIN = ['M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z', 'M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z'];

export function CPicture({ pic, lang, sizes, className = '', eager = false, alt }: { pic: CPic; lang: Lang; sizes: string; className?: string; eager?: boolean; alt?: string }) {
  const set = (ext: string) => pic.sizes.map((w) => `${CBASE}${pic.name}-${w}.${ext} ${w}w`).join(', ');
  return (
    <picture>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img src={`${CBASE}${pic.name}.jpg`} alt={alt ?? pic.alt[lang]} width={pic.w} height={pic.h} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} className={className} />
    </picture>
  );
}

function Lightbox({ pics, start, lang, onClose }: { pics: CPic[]; start: number; lang: Lang; onClose: () => void }) {
  const t = CHALET_PAGE[lang], n = pics.length;
  const [i, setI] = useState(start);
  const closeRef = useRef<HTMLButtonElement>(null);
  const x0 = useRef<number | null>(null);
  useEffect(() => {
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = 'hidden'; closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((v) => (v + 1) % n);
      if (e.key === 'ArrowLeft') setI((v) => (v - 1 + n) % n);
    };
    window.addEventListener('keydown', key);
    return () => { html.style.overflow = prev; window.removeEventListener('keydown', key); };
  }, [n, onClose]);
  const p = pics[i];
  return (
    <div role="dialog" aria-modal="true" aria-label="KitzAlpen Chalet" className="rp-lb fixed inset-0 z-[80] flex flex-col bg-[#0b100d]/96 text-white backdrop-blur-sm"
      onPointerDown={(e) => { x0.current = e.clientX; }} onPointerUp={(e) => { if (x0.current == null) return; const d = e.clientX - x0.current; x0.current = null; if (Math.abs(d) > 50) setI((v) => (v + (d < 0 ? 1 : -1) + n) % n); }}>
      <div className="flex items-center justify-between px-5 py-4 md:px-8">
        <span className="lnum font-display text-[20px]">{String(i + 1).padStart(2, '0')}<span className="text-white/45"> / {String(n).padStart(2, '0')}</span></span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={t.close} className="rs-nav grid h-11 w-11 place-items-center rounded-full"><Icon d={['M6 6l12 12M18 6 6 18']} size={20} w={1.6} /></button>
      </div>
      <div className="relative min-h-0 flex-1 px-3 pb-3 md:px-20 md:pb-6">
        <div key={p.name} className="rp-lb-img h-full w-full"><CPicture pic={p} lang={lang} sizes="100vw" eager className="h-full w-full select-none object-contain" /></div>
        <button type="button" onClick={() => setI((i - 1 + n) % n)} aria-label={t.prev} className="rs-nav absolute left-6 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full md:grid"><span className="rotate-180"><Icon d={I.arrow} size={18} w={1.8} /></span></button>
        <button type="button" onClick={() => setI((i + 1) % n)} aria-label={t.next} className="rs-nav absolute right-6 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full md:grid"><Icon d={I.arrow} size={18} w={1.8} /></button>
      </div>
      <div className="rs-track flex gap-2 overflow-x-auto px-5 pb-3 md:justify-center">
        {pics.map((q, k) => (
          <button key={q.name} type="button" onClick={() => setI(k)} aria-label={t.open(k + 1)} aria-current={k === i}
            className={`h-12 w-16 shrink-0 overflow-hidden rounded-[8px] transition-opacity ${k === i ? 'opacity-100 ring-2 ring-white' : 'opacity-45 hover:opacity-80'}`}>
            <img src={`${CBASE}${q.name}-${q.sizes[0]}.webp`} alt="" className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      <p className="px-5 pb-[calc(14px+env(safe-area-inset-bottom,0px))] text-center text-[13px] text-white/65">{p.alt[lang]}</p>
    </div>
  );
}

/** Chalet page – cinematic hero, room-by-room chapters, details, outside, booking. */
export function ChaletPage({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { season } = useSeason();
  const reduced = useReducedMotion();
  const mobile = useIsMobile();
  const [lb, setLb] = useState<{ pics: CPic[]; i: number } | null>(null);
  const closeLb = useCallback(() => setLb(null), []);
  const t = CHALET_PAGE[lang];
  const openAll = (pic?: CPic) => setLb({ pics: CHALET_ALL, i: pic ? Math.max(0, CHALET_ALL.indexOf(pic)) : 0 });

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    if (reduced) return;
    // opening: the lights come on – the photo rises out of the dark, warm light blooms, then the words
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-ch-photo'), { filter: 'brightness(.12) saturate(.4)', scale: 1.14 }, { filter: 'brightness(1) saturate(1)', scale: 1, duration: 2.6, ease: 'power2.inOut', clearProps: 'filter' }, 0)
      .fromTo(q('.js-ch-glow'), { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'power2.out' }, 0.9)
      .to(q('.js-ch-glow'), { opacity: 0.35, duration: 1.6, ease: 'power2.inOut' }, 2.3)
      .fromTo(q('.js-ch-eyebrow'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 1.3)
      .fromTo(q('.js-ch-char'), { yPercent: 120, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.022, ease: 'power4.out' }, 1.4)
      .fromTo(q('.js-ch-in'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, 2.0);
    gsap.to(q('.js-ch-par'), { yPercent: 12, ease: 'none', scrollTrigger: { trigger: q('.js-ch-hero')[0], start: 'top top', end: 'bottom top', scrub: 0.6 } });

    // reveals
    q('.js-ch-rev').forEach((el) => gsap.fromTo(el, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
    q('.js-ch-mask').filter((el) => !(window.innerWidth >= 1024 && el.closest('.js-ch-panel'))).forEach((el) => {
      gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      const img = el.querySelector('img'); if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    // the intro sentence lights up word by word while scrolling
    gsap.fromTo(q('.js-ch-word'), { opacity: 0.16 }, { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: q('.js-ch-statement')[0], start: 'top 80%', end: 'bottom 45%', scrub: 0.5 } });

    // room by room: horizontal on large screens. A tall section with a sticky stage (no fixed-position pin),
    // so it keeps working inside embedded / transformed containers too.
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', () => {
      const tr = track.current, sec = pin.current;
      if (!tr || !sec) return;
      const dist = () => Math.max(0, tr.scrollWidth - window.innerWidth);
      const size = () => { sec.style.height = `${window.innerHeight + dist()}px`; };
      size();
      ScrollTrigger.addEventListener('refreshInit', size);
      const tween = gsap.to(tr, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true,
        onUpdate: (st) => { gsap.set(q('.js-ch-progress'), { scaleX: st.progress }); } } });
      q('.js-ch-panel').forEach((p) => {
        const img = p.querySelector('.js-ch-panimg');
        if (img) gsap.fromTo(img, { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
      ScrollTrigger.refresh();
      return () => { ScrollTrigger.removeEventListener('refreshInit', size); sec.style.height = ''; };
    });
    return () => mm.revert();
  }, { scope: root, dependencies: [reduced, lang] });

  const words = t.intro.split(' ');
  return (
    <div ref={root}>
      {/* hero */}
      <section id="top" aria-labelledby="ch-title" className="js-ch-hero relative isolate flex min-h-[100svh] items-end overflow-hidden bg-[#0b0f0c] text-cream">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="js-ch-par absolute -inset-y-[4%] inset-x-0">
            <div className="js-ch-photo absolute inset-0">
              {(['winter', 'summer'] as Season[]).map((s) => {
                const h = HERO[s];
                const set = (ext: string) => h.sizes.map((w) => `${BASE}${h.stem}-${w}.${ext} ${w}w`).join(', ');
                return (
                  <picture key={s}>
                    <source type="image/avif" srcSet={set('avif')} sizes="100vw" />
                    <source type="image/webp" srcSet={set('webp')} sizes="100vw" />
                    <img src={`${BASE}${h.stem}.jpg`} alt={s === season ? HERO_ALT[lang][s] : ''} aria-hidden={s !== season} width={h.w} height={h.h} loading={s === season ? 'eager' : 'lazy'}
                      className="ch-img absolute inset-0 h-full w-full object-cover" style={{ opacity: s === season ? 1 : 0, ['--pos-d' as string]: h.desk, ['--pos-m' as string]: h.mob }} />
                  </picture>
                );
              })}
            </div>
          </div>
          {/* warm light that "switches on" with the opening */}
          <div aria-hidden className="js-ch-glow pointer-events-none absolute inset-0 mix-blend-screen" style={{ background: 'radial-gradient(60% 50% at 55% 55%, rgba(255,190,110,.32), rgba(255,170,90,.08) 45%, transparent 70%)' }} />
          <SeasonFx mode={season} mobile={mobile} reduced={reduced} />
          <div aria-hidden className="pointer-events-none absolute inset-0 z-[6] bg-[linear-gradient(0deg,rgba(8,11,9,.92)_0%,rgba(8,11,9,.6)_32%,rgba(8,11,9,.1)_62%,transparent_75%)]" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[6] h-44 bg-gradient-to-b from-black/50 to-transparent" />
        </div>

        <div className="mx-auto w-full max-w-[1440px] px-5 pb-[calc(100px+env(safe-area-inset-bottom,0px))] pt-36 sm:px-6 md:px-10 md:pb-16 lg:px-14">
          <p className="js-ch-eyebrow flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.32em] text-cream/90 md:text-[12.5px]"><span aria-hidden className="h-px w-8 bg-gold-light max-sm:hidden" /><span className="sm:hidden">{t.eyebrow.split(' · ')[0]}</span><span className="max-sm:hidden">{t.eyebrow}</span></p>
          <h1 id="ch-title" className="mt-5 font-display font-normal leading-[.95] tracking-[-0.025em] [text-shadow:0_2px_30px_rgba(0,0,0,.35)]" style={{ fontSize: 'clamp(48px, 9vw, 150px)' }}>
            {t.title.map((line, li) => (
              <span key={li} className={`block overflow-hidden pb-[0.06em] ${li ? 'italic text-gold-light' : ''}`} aria-label={line}>
                {Array.from(line).map((ch, ci) => <span key={ci} aria-hidden className="js-ch-char inline-block whitespace-pre">{ch}</span>)}
              </span>
            ))}
          </h1>
          <div className="mt-6 flex flex-col gap-7 md:mt-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="js-ch-in max-w-[520px] text-[16px] leading-relaxed text-cream/85 md:text-[18px]">{t.sub}</p>
              <ul className="js-ch-in mt-5 flex flex-wrap gap-2">
                {t.chips.map((c) => <li key={c} className="rounded-full border border-cream/30 bg-black/15 px-3.5 py-1.5 text-[12.5px] font-medium text-cream/90 backdrop-blur-sm">{c}</li>)}
              </ul>
            </div>
            <div className="js-ch-in flex flex-col gap-3 sm:flex-row">
              <a href={CHALET_BOOKING} target="_blank" rel="noopener noreferrer" className="pf-primary inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold"><Icon d={CAL} size={19} w={1.6} />{t.book}</a>
              <a href={t.contactHref} className="pf-secondary inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold"><Icon d={MAIL} size={19} w={1.6} />{t.inquiry}</a>
            </div>
          </div>
        </div>
      </section>

      {/* statement + facts */}
      <section aria-labelledby="ch-intro" className="bg-[#FAF8F5] px-5 py-24 text-ink sm:px-6 md:px-10 md:py-36 lg:px-14">
        <div className="mx-auto grid max-w-[1440px] gap-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,.75fr)] lg:gap-24">
          <div>
            <p className="js-ch-rev text-[11.5px] font-semibold uppercase tracking-[.34em] text-goldink">{t.introEyebrow}</p>
            <h2 id="ch-intro" className="js-ch-statement mt-5 font-display font-normal leading-[1.02] tracking-[-0.02em]" style={{ fontSize: 'clamp(40px, 6vw, 96px)' }}>
              {words.map((w, i) => <span key={i} className="js-ch-word">{w}{i < words.length - 1 ? ' ' : ''}</span>)}
            </h2>
            <p className="js-ch-rev mt-8 max-w-[560px] text-[16.5px] leading-relaxed text-ink/70 md:text-[18px]">{t.introText}</p>
          </div>
          <div className="flex flex-col gap-8">
            <div className="js-ch-mask relative aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-[22px] lg:ml-auto">
              <CPicture pic={CP.d4} lang={lang} sizes="(min-width:1024px) 30vw, 90vw" className="h-full w-full object-cover" />
            </div>
            <dl className="js-ch-rev divide-y divide-ink/[.08] border-y border-ink/[.08] lg:ml-auto lg:w-full lg:max-w-[420px]">
              {t.facts.map((f) => (
                <div key={f.k} className="flex items-center gap-4 py-4">
                  <dt className="flex w-[126px] shrink-0 items-center gap-4 text-[11px] font-semibold uppercase tracking-[.2em] text-ink/50"><span className="text-goldink"><Icon d={FACT_ICON[f.icon]} size={24} w={1.3} /></span>{f.k}</dt>
                  <dd className="text-[15px] font-medium text-ink">{f.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* room by room */}
      <section ref={pin} aria-labelledby="ch-rooms" className="relative bg-[#0f1411] text-cream max-lg:overflow-hidden">
        <div className={`relative lg:sticky lg:top-0 lg:h-[100svh] ${reduced ? 'lg:overflow-x-auto' : 'lg:overflow-hidden'}`}>
        <div className="mx-auto max-w-[1440px] px-5 pt-20 sm:px-6 md:px-10 lg:absolute lg:inset-x-0 lg:top-0 lg:z-10 lg:pt-[118px] lg:px-14">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[.34em] text-gold-light">{t.roomsEyebrow}</p>
              <h2 id="ch-rooms" className="mt-3 font-display font-normal leading-[1.02] tracking-[-0.015em]" style={{ fontSize: 'clamp(34px, 3.8vw, 58px)' }}>{t.roomsTitle}</h2>
            </div>
            <div aria-hidden className="hidden h-px w-[min(320px,25vw)] bg-cream/15 lg:block"><div className="js-ch-progress h-full origin-left scale-x-0 bg-gold-light" /></div>
          </div>
        </div>
        <div ref={track} className="flex flex-col gap-16 px-5 pb-24 pt-12 sm:px-6 md:px-10 lg:h-full lg:w-max lg:flex-row lg:items-end lg:gap-[6vw] lg:px-14 lg:pb-[7vh] lg:pt-0">
          {t.chapters.map((c, i) => {
            const [main, inset] = CHAPTER_PICS[i];
            return (
              <article key={c.n} className="js-ch-panel relative grid min-w-0 gap-6 lg:h-[64vh] lg:w-[78vw] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,.7fr)] lg:gap-10">
                <button type="button" onClick={() => openAll(main)} aria-label={t.open(CHALET_ALL.indexOf(main) + 1)} className="js-ch-mask group relative aspect-[4/3] w-full overflow-hidden rounded-[22px] lg:aspect-auto lg:h-full">
                  <div className="js-ch-panimg absolute -inset-x-[10%] inset-y-0"><CPicture pic={main} lang={lang} sizes="(min-width:1024px) 55vw, 100vw" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" /></div>
                  <span className="lnum absolute left-5 top-4 font-display text-[64px] leading-none text-white/90 [text-shadow:0_2px_20px_rgba(0,0,0,.35)] md:text-[88px]">{c.n}</span>
                </button>
                <div className="flex min-w-0 flex-col justify-end gap-6 lg:pb-2">
                  <button type="button" onClick={() => openAll(inset)} aria-label={t.open(CHALET_ALL.indexOf(inset) + 1)}
                    className={`js-ch-mask relative w-[62%] overflow-hidden rounded-[18px] lg:w-full ${inset.h > inset.w ? 'aspect-[4/5]' : 'aspect-[4/3]'} max-lg:-mt-24 max-lg:ml-auto max-lg:mr-3 max-lg:border-4 max-lg:border-[#0f1411]`}>
                    <CPicture pic={inset} lang={lang} sizes="(min-width:1024px) 22vw, 60vw" className="h-full w-full object-cover" />
                  </button>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[.3em] text-gold-light">{c.label}</p>
                    <h3 className="mt-2 font-display text-[32px] font-normal leading-[1.05] md:text-[40px]">{c.title}</h3>
                    <p className="mt-3 max-w-[380px] text-[15.5px] leading-relaxed text-cream/72">{c.text}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        </div>
      </section>

      {/* details: a slow, endless strip */}
      <section aria-labelledby="ch-details" className="overflow-hidden bg-[#FAF8F5] py-24 text-ink md:py-32">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 sm:px-6 md:flex-row md:items-end md:justify-between md:px-10 lg:px-14">
          <div className="js-ch-rev">
            <p className="text-[11.5px] font-semibold uppercase tracking-[.34em] text-goldink">{t.detailsEyebrow}</p>
            <h2 id="ch-details" className="mt-3 font-display font-normal leading-[1.02] tracking-[-0.015em]" style={{ fontSize: 'clamp(34px, 4.2vw, 64px)' }}>{t.detailsTitle}</h2>
          </div>
          <button type="button" onClick={() => openAll()} className="js-ch-rev pr-btn-ghost inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full px-6 text-[14.5px] font-semibold md:self-auto">{t.all(CHALET_ALL.length)}<Icon d={I.arrow} size={16} w={1.8} /></button>
        </div>
        <div className={`ch-marquee mt-12 md:mt-16 ${reduced ? 'overflow-x-auto' : ''}`}>
          <ul className={`flex w-max gap-4 px-5 md:gap-6 ${reduced ? '' : 'ch-marquee-run'}`}>
            {[...DETAIL_PICS, ...(reduced ? [] : DETAIL_PICS)].map((p, i) => (
              <li key={`${p.name}-${i}`} aria-hidden={i >= DETAIL_PICS.length ? true : undefined} className={`shrink-0 ${i % 2 ? 'md:mt-14' : ''}`}>
                <button type="button" tabIndex={i >= DETAIL_PICS.length ? -1 : 0} onClick={() => openAll(p)} aria-label={t.open(CHALET_ALL.indexOf(p) + 1)}
                  className={`group block overflow-hidden rounded-[20px] ${p.h > p.w ? 'h-[300px] w-[225px] md:h-[400px] md:w-[300px]' : 'h-[300px] w-[390px] md:h-[400px] md:w-[520px]'}`}>
                  <CPicture pic={p} lang={lang} sizes="300px" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* outside */}
      <section aria-labelledby="ch-out" className="bg-[#FAF8F5] px-5 pb-24 text-ink sm:px-6 md:px-10 md:pb-32 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <div className="js-ch-rev max-w-[720px]">
            <p className="text-[11.5px] font-semibold uppercase tracking-[.34em] text-goldink">{t.outEyebrow}</p>
            <h2 id="ch-out" className="mt-3 font-display font-normal leading-[1.02] tracking-[-0.015em]" style={{ fontSize: 'clamp(34px, 4.2vw, 64px)' }}>{t.outTitle}</h2>
            <p className="mt-4 text-[16.5px] leading-relaxed text-ink/70">{t.outText}</p>
          </div>
          <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:grid-rows-2 md:gap-5">
            {[CP.ext3, CP.ext1, CP.ext2].map((p, i) => (
              <button key={p.name} type="button" onClick={() => openAll(p)} aria-label={t.open(CHALET_ALL.indexOf(p) + 1)}
                className={`js-ch-mask group relative overflow-hidden rounded-[22px] ${i === 0 ? 'aspect-[4/3] md:row-span-2 md:aspect-auto md:min-h-[620px]' : 'aspect-[4/3] md:aspect-auto'}`}>
                <CPicture pic={p} lang={lang} sizes={i === 0 ? '(min-width:768px) 60vw, 100vw' : '(min-width:768px) 40vw, 100vw'} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* booking */}
      <section aria-labelledby="ch-final" className="bg-[#FAF8F5] px-4 pb-[calc(110px+env(safe-area-inset-bottom,0px))] sm:px-6 md:px-10 md:pb-28 lg:px-14">
        <div className="js-ch-rev relative isolate mx-auto flex min-h-[560px] max-w-[1400px] items-center justify-center overflow-hidden rounded-[28px] bg-[#0b0f0c]">
          <div className="absolute inset-0 -z-10">
            {([['winter', CP.ext3], ['summer', CP.ext1]] as [Season, CPic][]).map(([s, p]) => (
              <CPicture key={s} pic={p} lang={lang} sizes="100vw" alt="" className={`pf-img absolute inset-0 h-full w-full object-cover ${s === season ? 'opacity-100' : 'opacity-0'}`} />
            ))}
            <div className="absolute inset-0 bg-[radial-gradient(90%_75%_at_50%_50%,rgba(10,14,11,.72)_0%,rgba(10,14,11,.5)_60%,rgba(10,14,11,.35)_100%)]" />
          </div>
          <div className="w-full max-w-[760px] px-6 py-16 text-center text-white md:py-20">
            <span aria-hidden className="mx-auto block h-10 w-px bg-gradient-to-b from-transparent to-gold-light" />
            <h2 id="ch-final" className="mt-6 text-balance font-display font-normal leading-[1.04] tracking-[-0.015em]" style={{ fontSize: 'clamp(34px, 4.6vw, 62px)' }}>{t.finalTitle}</h2>
            <p className="mx-auto mt-5 max-w-[560px] text-[15.5px] leading-relaxed text-white/85 md:text-[17px]">{t.finalText}</p>
            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <a href={CHALET_BOOKING} target="_blank" rel="noopener noreferrer" className="pf-primary inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold"><Icon d={CAL} size={19} w={1.6} />{t.book}</a>
              <a href={t.contactHref} className="pf-secondary inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold"><Icon d={MAIL} size={19} w={1.6} />{t.inquiry}</a>
            </div>
            <p className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13.5px] text-white/75">
              <span className="inline-flex items-center gap-2"><Icon d={PIN} size={16} w={1.5} />{t.address}</span>
              <a href={CHALET_MAPS} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold-light underline decoration-gold-light/50 underline-offset-4 hover:decoration-gold-light">{t.route}</a>
            </p>
          </div>
        </div>
      </section>

      {lb && <Lightbox pics={lb.pics} start={lb.i} lang={lang} onClose={closeLb} />}
    </div>
  );
}
