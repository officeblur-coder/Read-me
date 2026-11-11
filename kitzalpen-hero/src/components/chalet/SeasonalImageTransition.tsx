import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import type { ChaletPhoto } from '../../content/chalet';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const BASE = `${import.meta.env.BASE_URL}images/chalet/`;

export function ChaletPic({ p, lang, sizes, eager, className = '' }: { p: ChaletPhoto; lang: Lang; sizes: string; eager?: boolean; className?: string }) {
  const set = (ext: string) => p.sizes.map((s) => `${BASE}${p.id}-${s}.${ext} ${s}w`).join(', ');
  return (
    <picture>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img src={`${BASE}${p.id}.jpg`} alt={p.alt[lang]} width={p.w} height={p.h} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} className={`h-full w-full select-none object-cover ${className}`} />
    </picture>
  );
}

interface Props {
  summer: ChaletPhoto;
  winter: ChaletPhoto;
  season: 'summer' | 'winter';
  lang: Lang;
  labels: { summer: string; winter: string };
  reduced: boolean;
}

/**
 * Follows the global season: winter descends over summer through a soft,
 * feathered mask (like weather moving down the valley) and lifts again for
 * summer. The two photos are NOT forced on top of each other – they were taken
 * from different spots, so nothing is warped; it is a wipe, not a morph.
 */
export function SeasonalImageTransition({ summer, winter, season, lang, labels, reduced }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const st = useRef({ p: season === 'winter' ? 0 : 100 });

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const win = q('.js-sit-winter')[0] as HTMLElement | undefined;
    if (!win) return;
    const setMask = () => {
      const v = `50% ${st.current.p}%`;
      win.style.setProperty('-webkit-mask-position', v);
      win.style.setProperty('mask-position', v);
    };
    const toWinter = season === 'winter';
    const instant = reduced || first.current;
    first.current = false;
    gsap.killTweensOf(st.current);
    gsap.to(st.current, { p: toWinter ? 0 : 100, duration: instant ? 0 : 1.6, ease: 'power2.inOut', onUpdate: setMask, onComplete: setMask });
    gsap.to(q('.js-sit-summer img'), { scale: toWinter ? 1.06 : 1, duration: instant ? 0 : 1.8, ease: 'power2.out' });
    gsap.fromTo(q('.js-sit-winter img'), { scale: toWinter ? 1.08 : 1 }, { scale: toWinter ? 1 : 1.04, duration: instant ? 0 : 1.8, ease: 'power2.out' });
    gsap.to(q('.js-sit-l-summer'), { autoAlpha: toWinter ? 0 : 1, y: toWinter ? -8 : 0, duration: instant ? 0 : 0.5, delay: instant ? 0 : 0.5 });
    gsap.to(q('.js-sit-l-winter'), { autoAlpha: toWinter ? 1 : 0, y: toWinter ? 0 : 8, duration: instant ? 0 : 0.5, delay: instant ? 0 : 0.6 });
    gsap.fromTo(q('.js-sit-bar'), { scaleX: 0 }, { scaleX: 1, duration: instant ? 0 : 1.6, ease: 'power2.inOut' });
    setMask();
  }, { scope: root, dependencies: [season, reduced] });

  return (
    <div ref={root} className="absolute inset-0">
      <div className="js-sit-summer absolute inset-0 overflow-hidden"><ChaletPic p={summer} lang={lang} sizes="(min-width:1024px) 58vw, 100vw" eager /></div>
      <div className="js-sit-winter sit-winter absolute inset-0 overflow-hidden"><ChaletPic p={winter} lang={lang} sizes="(min-width:1024px) 58vw, 100vw" eager /></div>
      {/* season label + progress hairline */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 md:left-6 md:top-6" aria-hidden>
        <div className="relative h-7 overflow-hidden rounded-full bg-deep/55 px-3.5 backdrop-blur-sm">
          <span className="js-sit-l-summer absolute inset-0 grid place-items-center text-[11px] font-semibold uppercase tracking-[.24em] text-cream">{labels.summer}</span>
          <span className="js-sit-l-winter invisible grid h-full place-items-center text-[11px] font-semibold uppercase tracking-[.24em] text-cream">{labels.winter}</span>
        </div>
        <span className="js-sit-bar mt-2 block h-px w-full origin-left bg-gold" />
      </div>
    </div>
  );
}
