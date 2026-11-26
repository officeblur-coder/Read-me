import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { QUICK_ACTIONS } from '../../content/amenities';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const IMG = `${import.meta.env.BASE_URL}images/retreat/`;

const COPY = {
  de: {
    eyebrow: 'Ihr Rückzugsort in den Alpen',
    head: { a: 'Bereit für Ihre Auszeit', b: 'bei', brand: 'KitzAlpen', c: '?' },
    sub: 'Genießen Sie alpinen Komfort, herzliche Gastfreundschaft und unvergessliche Momente in den österreichischen Alpen.',
    features: ['Gemütliche Zimmer & Chalet', 'Einzigartige Alpenlage', 'Familiengeführte Gastfreundschaft'],
    room: 'Zimmer buchen', chalet: 'Chalet buchen',
    alt: 'Schlafraum im KitzAlpen Chalet unter dem Dach: Holzbalken, Doppelbett, Etagenbett und Essplatz in warmem Licht',
  },
  en: {
    eyebrow: 'Your alpine retreat',
    head: { a: 'Ready for your', b: '', brand: 'KitzAlpen', c: 'experience?' },
    sub: 'Book your stay and enjoy alpine comfort, authentic hospitality and unforgettable moments in the Austrian Alps.',
    features: ['Cozy rooms & chalet', 'Unique alpine location', 'Family-run hospitality'],
    room: 'Book a room', chalet: 'Book chalet',
    alt: 'Attic bedroom in the KitzAlpen Chalet: timber beams, double bed, bunk bed and dining corner in warm light',
  },
};

const ICONS = [
  'M3 18.5v-11M21 18.5v-5.5a2 2 0 0 0-2-2H3M3 15.5h18M5 8h5.2v3.5H5Z',
  'M2 19 8.8 7.5l4 6.8M10.4 19l5.4-8.8L22 19M2 19h20',
  'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z',
];

/** Section 10 – the closing invitation. Same photo in summer and winter; accents follow the theme. */
export function FinalBookingCTA({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const t = COPY[lang];

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.set(q('.js-fc-img'), { scale: 1.08 });
    gsap.set(q('.js-fc-veil'), { opacity: 0.35 });
    gsap.set(q('.js-fc-eyebrow, .js-fc-sub'), { autoAlpha: 0, y: 20 });
    gsap.set(q('.js-fc-line'), { yPercent: 110 });
    gsap.set(q('.js-fc-feat'), { autoAlpha: 0, y: 18 });
    gsap.set(q('.js-fc-sep'), { scaleY: 0 });
    gsap.set(q('.js-fc-btn'), { autoAlpha: 0, y: 25 });
    gsap.set(q('.js-fc-brand'), { color: 'var(--k-cream)' });
    ScrollTrigger.create({ trigger: root.current, start: 'top 65%', once: true, onEnter: () => {
      gsap.timeline()
        .to(q('.js-fc-img'), { scale: 1, duration: 1.9, ease: 'power2.out' }, 0)            // A
        .to(q('.js-fc-veil'), { opacity: 1, duration: 1.4, ease: 'power2.out' }, 0)
        .to(q('.js-fc-eyebrow'), { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.3)
        .to(q('.js-fc-line'), { yPercent: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out' }, 0.45)  // B
        .to(q('.js-fc-brand'), { color: 'var(--k-gold-light)', duration: 0.8, ease: 'power2.out' }, 1.3)
        .to(q('.js-fc-sub'), { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 1.0)           // C
        .to(q('.js-fc-feat'), { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out' }, 1.25)  // D
        .to(q('.js-fc-sep'), { scaleY: 1, duration: 0.7, stagger: 0.12, ease: 'power2.out' }, 1.35)
        .to(q('.js-fc-btn'), { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 1.6);  // E
    } });
    // F) very slow parallax, desktop only
    if (fine) gsap.fromTo(q('.js-fc-par'), { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 1 } });
  }, { scope: root, dependencies: [reduced, fine] });

  return (
    <section ref={root} id="buchen" aria-labelledby="fc-title" className="fc relative isolate flex min-h-[92svh] items-center overflow-hidden bg-deep text-cream md:min-h-[100svh]">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="js-fc-par absolute inset-x-0 -inset-y-[6%]">
          <picture>
            <source media="(max-width: 640px)" type="image/avif" srcSet={`${IMG}cabin-mobile.avif`} />
            <source media="(max-width: 640px)" type="image/webp" srcSet={`${IMG}cabin-mobile.webp`} />
            <source type="image/avif" srcSet={`${IMG}cabin.avif`} />
            <source type="image/webp" srcSet={`${IMG}cabin.webp`} />
            <img src={`${IMG}cabin.jpg`} alt={t.alt} width={994} height={768} loading="lazy" decoding="async" className="js-fc-img h-full w-full object-cover" style={{ objectPosition: '55% 55%' }} />
          </picture>
        </div>
        {/* legibility, keeps the warmth: darker at the top (text) and fading into the footer colour (G) */}
        <div className="js-fc-veil absolute inset-0 bg-[linear-gradient(180deg,rgba(14,9,5,.72)_0%,rgba(14,9,5,.42)_38%,rgba(14,9,5,.30)_60%,color-mix(in_srgb,var(--k-deep)_80%,transparent)_88%,var(--k-deep)_100%)]" />
      </div>

      <div className="mx-auto w-full max-w-[1100px] px-5 pb-[calc(104px+env(safe-area-inset-bottom,0px))] pt-20 text-center sm:px-6 md:px-10 md:pb-24 md:pt-24">
        <svg aria-hidden width="64" height="30" viewBox="0 0 64 30" fill="none" className="js-fc-eyebrow mx-auto mb-3 hidden text-gold-light min-[400px]:block md:mb-5"><path d="M2 28 22 4l9 11 8-9 23 22" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M18 9l4 3 3-2" stroke="currentColor" strokeWidth="1.1" /></svg>
        <p className="js-fc-eyebrow flex items-center justify-center gap-4 text-[11.5px] font-semibold uppercase tracking-[.34em] text-cream/90 md:text-[13px]">
          <span aria-hidden className="h-px w-8 bg-cream/50 md:w-14" />{t.eyebrow}<span aria-hidden className="h-px w-8 bg-cream/50 md:w-14" />
        </p>
        <h2 id="fc-title" className="mx-auto mt-5 max-w-[16ch] font-display font-normal leading-[1.05] tracking-[-0.01em] text-cream [text-shadow:0_2px_30px_rgba(0,0,0,.35)] md:max-w-none" style={{ fontSize: 'clamp(34px, 5.5vw, 88px)' }}>
          <span className="block overflow-hidden pb-[0.06em]"><span className="js-fc-line block">{t.head.a}</span></span>
          <span className="block overflow-hidden pb-[0.12em]"><span className="js-fc-line block">{t.head.b && `${t.head.b} `}<em className="js-fc-brand not-italic text-gold-light"><span className="italic">{t.head.brand}</span></em>{t.head.c === '?' ? '?' : ` ${t.head.c}`}</span></span>
        </h2>
        <p className="js-fc-sub mx-auto mt-5 max-w-[700px] text-[15.5px] leading-[1.7] text-cream/88 md:mt-6 md:text-[20px]">{t.sub}</p>

        <ul className="mx-auto mt-7 grid max-w-[720px] grid-cols-3 md:mt-12">
          {t.features.map((f, i) => (
            <li key={f} className="relative flex flex-col items-center gap-2.5 px-2 md:px-6">
              {i > 0 && <span aria-hidden className="js-fc-sep absolute left-0 top-1 h-[80%] w-px origin-top bg-cream/25" />}
              <span className="js-fc-feat text-gold-light"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ICONS[i]} /></svg></span>
              <span className="js-fc-feat text-[12.5px] font-medium leading-snug text-cream/92 sm:text-[14px] md:text-[16px]">{f}</span>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-7 flex max-w-[560px] flex-col gap-3 sm:flex-row sm:justify-center sm:gap-5 md:mt-12">
          <a href={QUICK_ACTIONS.room} target="_blank" rel="noopener noreferrer" className="js-fc-btn fc-room flex min-h-[54px] flex-1 items-center justify-center gap-3 rounded-full px-8 text-[16px] font-semibold md:min-h-[62px] md:text-[17px]">
            <svg className="fc-ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
            {t.room}
          </a>
          <a href={QUICK_ACTIONS.chalet} target="_blank" rel="noopener noreferrer" className="js-fc-btn fc-chalet flex min-h-[54px] flex-1 items-center justify-center gap-3 rounded-full px-8 text-[16px] font-semibold md:min-h-[62px] md:text-[17px]">
            <svg className="fc-ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
            {t.chalet}
          </a>
        </div>
      </div>
    </section>
  );
}
