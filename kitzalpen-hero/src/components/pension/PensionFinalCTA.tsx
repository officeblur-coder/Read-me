import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang, Season } from '../../content/hero';
import { PR_COPY } from '../../content/pensionPage';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { useSeason } from '../../lib/season';
import { Icon } from './PensionRooms';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const IMG = `${import.meta.env.BASE_URL}images/experience/`;
/** Real Alpine photos already used on the site (Section 07): summer lake with alpine roses, winter high-alpine panorama. */
const PHOTO: Record<Season, { stem: string; sizes: number[]; w: number; h: number; pos: string }> = {
  summer: { stem: 'summer', sizes: [900, 1920], w: 1920, h: 1246, pos: '50% 62%' },
  winter: { stem: 'winter', sizes: [900, 1024], w: 1024, h: 569, pos: '58% 50%' },
};
const CAL = ['M4 6.5h16V20H4Z', 'M4 10.5h16M8.5 4v4M15.5 4v4'];
const MAIL = ['M3.5 6h17v12h-17Z', 'm4 7 8 6 8-6'];

/** Pension page · Section 03 – photographic booking banner; the photo follows the shared season (crossfade). */
export function PensionFinalCTA({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const { season } = useSeason();
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const t = PR_COPY[lang];

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.set(q('.js-pf-frame'), { clipPath: 'inset(8% 6% 8% 6% round 28px)' });
    gsap.set(q('.js-pf-media'), { scale: 1.14 });
    gsap.set(q('.js-pf-in'), { autoAlpha: 0, y: 26 });
    ScrollTrigger.create({ trigger: root.current, start: 'top 78%', once: true, onEnter: () => {
      gsap.timeline()
        .to(q('.js-pf-frame'), { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.4, ease: 'expo.out' }, 0)
        .to(q('.js-pf-media'), { scale: 1.04, duration: 1.8, ease: 'power3.out' }, 0)
        .to(q('.js-pf-in'), { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out' }, 0.35);
    } });
    if (fine) gsap.fromTo(q('.js-pf-par'), { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  }, { scope: root, dependencies: [reduced, fine] });

  return (
    <section ref={root} aria-labelledby="pf-title" className="bg-[#FAF8F5] px-4 pb-[calc(110px+env(safe-area-inset-bottom,0px))] sm:px-6 md:px-10 md:pb-28 lg:px-14">
      <div className="js-pf-frame relative isolate mx-auto flex min-h-[560px] max-w-[1400px] items-center justify-center overflow-hidden rounded-[28px] bg-deep md:min-h-[540px]">
        <div aria-hidden={false} className="absolute inset-0 -z-10">
          <div className="js-pf-par absolute -inset-y-[6%] inset-x-0">
            <div className="js-pf-media absolute inset-0">
              {(['summer', 'winter'] as Season[]).map((s) => {
                const p = PHOTO[s];
                const set = (ext: string) => p.sizes.map((w) => `${IMG}${p.stem}-${w}.${ext} ${w}w`).join(', ');
                return (
                  <picture key={s}>
                    <source type="image/avif" srcSet={set('avif')} sizes="(min-width:1440px) 1400px, 100vw" />
                    <source type="image/webp" srcSet={set('webp')} sizes="(min-width:1440px) 1400px, 100vw" />
                    <img src={`${IMG}${p.stem}.jpg`} alt={s === season ? t.finalAlt[s] : ''} aria-hidden={s !== season} width={p.w} height={p.h} loading="lazy" decoding="async"
                      className="pf-img absolute inset-0 h-full w-full object-cover" style={{ objectPosition: p.pos, opacity: s === season ? 1 : 0 }} />
                  </picture>
                );
              })}
            </div>
          </div>
          {/* deep alpine green (cool blue-green in winter, via the season palette) – enough for legibility, never flat */}
          <div className="absolute inset-0 bg-[radial-gradient(90%_75%_at_50%_50%,color-mix(in_srgb,var(--k-deep)_72%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_48%,transparent)_60%,color-mix(in_srgb,var(--k-deep)_30%,transparent)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[color-mix(in_srgb,var(--k-deep)_55%,transparent)] to-transparent" />
        </div>

        <div className="relative w-full max-w-[780px] px-6 py-16 text-center text-white md:py-20">
          <span aria-hidden className="js-pf-in mx-auto block h-10 w-px bg-gradient-to-b from-transparent to-gold-light" />
          <h2 id="pf-title" className="js-pf-in mt-6 text-balance font-display font-normal leading-[1.04] tracking-[-0.015em] [text-shadow:0_2px_24px_rgba(0,0,0,.25)]" style={{ fontSize: 'clamp(34px, 4.8vw, 64px)' }}>{t.finalTitle}</h2>
          <p className="js-pf-in mx-auto mt-5 max-w-[560px] text-pretty text-[15.5px] leading-relaxed text-white/88 md:text-[17.5px]">{t.finalText}</p>
          <div className="js-pf-in mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <a href={t.roomsHref} className="pf-primary inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold"><Icon d={CAL} size={19} w={1.6} />{t.viewRooms}</a>
            <a href={t.contactHref} className="pf-secondary inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold"><Icon d={MAIL} size={19} w={1.6} />{t.inquiry}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
