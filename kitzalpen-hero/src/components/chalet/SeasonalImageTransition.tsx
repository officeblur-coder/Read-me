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
  lang: Lang;
  labels: { summer: string; winter: string };
  reduced: boolean;
}

/**
 * Summer → winter, driven by scroll (scrubbed, fully reversible).
 * The two photos are NOT forced on top of each other – they were taken from
 * different spots. Winter descends over summer through a soft, feathered
 * mask (like weather moving down the valley), while summer slowly pushes in
 * and winter settles from 1.08 to 1. A small label follows the season.
 */
export function SeasonalImageTransition({ summer, winter, lang, labels, reduced }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const win = q('.js-sit-winter')[0] as HTMLElement | undefined;
    if (!win) return;
    const setMask = (y: number) => {
      const v = `50% ${y}%`;
      win.style.setProperty('-webkit-mask-position', v);
      win.style.setProperty('mask-position', v);
    };
    if (reduced) { setMask(0); return; }   // static: winter shown, as on the live site

    const st = { p: 100 };
    setMask(100);
    gsap.timeline({
      scrollTrigger: { trigger: root.current, start: 'top 78%', end: 'bottom 30%', scrub: 0.8 },
      defaults: { ease: 'none' },
    })
      .to(st, { p: 0, onUpdate: () => setMask(st.p) }, 0)
      .fromTo(q('.js-sit-summer img'), { scale: 1 }, { scale: 1.07 }, 0)
      .fromTo(q('.js-sit-winter img'), { scale: 1.08 }, { scale: 1 }, 0)
      .fromTo(q('.js-sit-l-summer'), { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -8, duration: 0.12 }, 0.28)
      .fromTo(q('.js-sit-l-winter'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.12 }, 0.36)
      .fromTo(q('.js-sit-bar'), { scaleX: 0 }, { scaleX: 1 }, 0);
  }, { scope: root, dependencies: [reduced] });

  return (
    <div ref={root} className="absolute inset-0">
      <div className="js-sit-summer absolute inset-0 overflow-hidden"><ChaletPic p={summer} lang={lang} sizes="(min-width:1024px) 58vw, 100vw" eager /></div>
      <div className="js-sit-winter sit-winter absolute inset-0 overflow-hidden"><ChaletPic p={winter} lang={lang} sizes="(min-width:1024px) 58vw, 100vw" eager /></div>
      {/* season label + progress hairline */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 md:left-6 md:top-6" aria-hidden>
        <div className="relative h-7 overflow-hidden rounded-full bg-[#071C16]/55 px-3.5 backdrop-blur-sm">
          <span className="js-sit-l-summer absolute inset-0 grid place-items-center text-[11px] font-semibold uppercase tracking-[.24em] text-cream">{labels.summer}</span>
          <span className="js-sit-l-winter invisible grid h-full place-items-center text-[11px] font-semibold uppercase tracking-[.24em] text-cream">{labels.winter}</span>
        </div>
        <span className="js-sit-bar mt-2 block h-px w-full origin-left bg-gold" />
      </div>
    </div>
  );
}
