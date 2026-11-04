import type { Lang } from '../../content/hero';
import { useSeason } from '../../lib/season';
import { Icon, I } from '../pension/PensionRooms';

const COPY = {
  de: { eyebrow: 'Alpine Mountain Guide', winter: 'Dein Tag am Berg beginnt hier.', summer: 'Jeder Tag am Berg steckt voller Möglichkeiten.',
    items: ['Bedingungen', 'Webcams', 'Tagesplaner', 'Finder'], cta: 'Bergerlebnis öffnen' },
  en: { eyebrow: 'Alpine Mountain Guide', winter: 'Your mountain day starts here.', summer: 'Every mountain day begins with possibility.',
    items: ['Conditions', 'Webcams', 'Day planner', 'Finder'], cta: 'Open the mountain guide' },
};

/** Homepage entry point to the Alpine Mountain Experience (#mountain). */
export function MountainTeaser({ lang }: { lang: Lang }) {
  const { season } = useSeason();
  const t = COPY[lang];
  return (
    <section aria-label={t.eyebrow} className="bg-cream px-4 py-10 sm:px-6 md:px-10 md:py-14 lg:px-14">
      <a href="#mountain" className="mt-teaser group relative isolate mx-auto flex max-w-[1360px] flex-col gap-6 overflow-hidden rounded-[24px] bg-deep p-7 text-cream md:flex-row md:items-end md:justify-between md:p-10">
        <img src={`${import.meta.env.BASE_URL}images/${season === 'winter' ? 'winter/glockner' : 'experience/summer-1920'}.webp`} alt="" aria-hidden loading="lazy"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]" />
        <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--k-deep)_90%,transparent),color-mix(in_srgb,var(--k-deep)_35%,transparent))]" />
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[.32em] text-gold-light">{t.eyebrow}</p>
          <p className="mt-3 font-display text-[32px] italic leading-[1.05] md:text-[48px]">{t[season]}</p>
          <ul className="mt-4 flex flex-wrap gap-2">{t.items.map((x, i) => <li key={x} className="rounded-full border border-cream/30 px-3 py-1 text-[12.5px]"><span className="lnum text-gold-light">0{i + 1}</span> {x}</li>)}</ul>
        </div>
        <span className="ph-primary inline-flex min-h-[52px] shrink-0 items-center gap-2.5 self-start rounded-full px-6 text-[15px] font-semibold md:self-auto">{t.cta}<Icon d={I.arrow} size={16} w={1.8} /></span>
      </a>
    </section>
  );
}
