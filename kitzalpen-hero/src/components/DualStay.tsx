import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang, Season } from '../content/hero';
import { useReducedMotion } from '../lib/hooks';
import { useSeason } from '../lib/season';
import { useDaypart, type Daypart } from '../lib/daypart';
import { Icon, I } from './pension/PensionRooms';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const IMG = `${import.meta.env.BASE_URL}images/`;

/**
 * Real photographs only. Evening uses genuine evening shots where they exist (pension in winter, chalet with
 * its lights); otherwise the daytime photo stays, with the restrained evening colour treatment from CSS.
 */
const PHOTO: Record<'pension' | 'chalet', Record<Season, Record<Daypart, string>>> = {
  pension: {
    winter: { day: `${IMG}evening/pension-winter-day.webp`, evening: `${IMG}evening/pension-winter.webp` },
    summer: { day: `${IMG}hero/summer-d-1671.webp`, evening: `${IMG}hero/summer-d-1671.webp` },
  },
  chalet: {
    winter: { day: `${IMG}chalet/winter-1536.webp`, evening: `${IMG}chalet-page/exterior-03-1024.webp` },
    summer: { day: `${IMG}chalet/summer-1440.webp`, evening: `${IMG}chalet/summer-1440.webp` },
  },
};
const GENUINE_EVENING = { pension: { winter: true, summer: false }, chalet: { winter: true, summer: false } };

const COPY = {
  de: {
    eyebrow: 'Zwei Arten, bei uns zu wohnen', title: ['Pension oder Chalet?', 'Beides ist KitzAlpen.'],
    pension: { label: 'KitzAlpen Pension', title: 'Herzlich im Haupthaus', text: 'Alpine Zimmer, Frühstücksbuffet und Abendessen im Restaurant – mitten in Hollersbach.', chips: ['17 Zimmer · 4 Kategorien', 'Restaurant & Bar', 'TV · WLAN · Bad mit Dusche'], cta: 'Pension entdecken', rooms: 'Alle Zimmer' },
    chalet: { label: 'KitzAlpen Chalet', title: 'Privat und eigenständig', text: 'Ein eigenes Haus mit voll ausgestatteter Küche, Bad und gemütlichem Wohnbereich – für Familien und kleine Gruppen.', chips: ['Bis zu 4 Gäste', 'Voll ausgestattete Küche', 'Bad mit WC'], cta: 'Chalet entdecken', rooms: 'Chalet buchen' },
  },
  en: {
    eyebrow: 'Two ways to stay with us', title: ['Pension or chalet?', 'Both are KitzAlpen.'],
    pension: { label: 'KitzAlpen Pension', title: 'Welcoming main house', text: 'Alpine rooms, a breakfast buffet and dinner in the restaurant – in the heart of Hollersbach.', chips: ['17 rooms · 4 categories', 'Restaurant & bar', 'TV · Wi-Fi · bathroom with shower'], cta: 'Explore the pension', rooms: 'All rooms' },
    chalet: { label: 'KitzAlpen Chalet', title: 'Private and self-contained', text: 'A house of your own with a fully equipped kitchen, bathroom and cosy living area – for families and small groups.', chips: ['Up to 4 guests', 'Fully equipped kitchen', 'Bathroom with WC'], cta: 'Explore the chalet', rooms: 'Book the chalet' },
  },
};

export function DualStay({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { season } = useSeason();
  const { daypart } = useDaypart();
  const t = COPY[lang];

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.fromTo(q('.js-ds-in'), { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: root.current, start: 'top 80%', once: true } });
    gsap.fromTo(q('.js-ds-panel'), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.14, ease: 'power3.out', scrollTrigger: { trigger: root.current, start: 'top 72%', once: true } });
  }, { scope: root, dependencies: [reduced] });

  const panel = (k: 'pension' | 'chalet', href: string, second: string) => {
    const c = t[k];
    const evTreat = daypart === 'evening' && !GENUINE_EVENING[k][season];
    return (
      <article className="js-ds-panel ds-panel group relative isolate flex min-h-[620px] flex-col justify-end overflow-hidden rounded-[26px] text-cream md:min-h-[620px]">
        {(['day', 'evening'] as Daypart[]).map((d) => (
          <img key={d} src={PHOTO[k][season][d]} alt={d === daypart ? `${c.label} – ${c.title}` : ''} aria-hidden={d !== daypart} loading="lazy"
            className={`ds-img absolute inset-0 -z-10 h-full w-full object-cover ${evTreat ? 'is-ev' : ''}`} style={{ opacity: d === daypart ? 1 : 0 }} />
        ))}
        <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--k-deep)_94%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_74%,transparent)_48%,color-mix(in_srgb,var(--k-deep)_20%,transparent)_80%,transparent_100%)]" />
        <span aria-hidden className="absolute inset-0 -z-10 bg-[color-mix(in_srgb,var(--k-deep)_28%,transparent)] md:hidden" />
        <div className="p-7 md:p-10">
          <p className="text-[11.5px] font-semibold uppercase tracking-[.3em] text-gold-light">{c.label}</p>
          <h3 className="mt-3 font-display text-[38px] font-medium italic leading-[1.02] md:text-[50px]">{c.title}</h3>
          <p className="mt-3 max-w-[460px] text-[15.5px] leading-relaxed text-cream/85">{c.text}</p>
          <ul className="mt-5 flex flex-wrap gap-2">{c.chips.map((x) => <li key={x} className="rounded-full border border-cream/30 bg-black/15 px-3 py-1.5 text-[12.5px] backdrop-blur-sm">{x}</li>)}</ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={href} className="ph-primary inline-flex min-h-[52px] items-center gap-2.5 rounded-full px-6 text-[15px] font-semibold">{c.cta}<Icon d={I.arrow} size={16} w={1.8} /></a>
            <a href={second} {...(second.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="ph-secondary inline-flex min-h-[52px] items-center rounded-full px-6 text-[15px] font-semibold">{c.rooms}</a>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section ref={root} aria-labelledby="ds-title" className="bg-cream px-4 py-16 sm:px-6 md:px-10 md:py-24 lg:px-14">
      <div className="mx-auto max-w-[1440px]">
        <header className="mx-auto max-w-[760px] text-center">
          <p className="js-ds-in flex items-center justify-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] text-ink/70"><span aria-hidden className="h-px w-10 bg-ink/35" />{t.eyebrow}<span aria-hidden className="h-px w-10 bg-ink/35" /></p>
          <h2 id="ds-title" className="js-ds-in mt-4 font-display font-medium leading-[1.02] text-pine" style={{ fontSize: 'clamp(36px, 4.6vw, 70px)' }}>{t.title[0]} <em className="text-goldink">{t.title[1]}</em></h2>
        </header>
        <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-2 md:gap-6">
          {panel('pension', '#pension', '#all-rooms')}
          {panel('chalet', '#chalet', 'https://chalet-kitzalpen.pynbooking.direct/')}
        </div>
      </div>
    </section>
  );
}
