import { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { ROOM_KEYS, PR_COPY, roomData, type RoomKey } from '../../content/pensionPage';
import { ROOM_COVERS, ROOM_GALLERIES, type Pic } from '../../content/pensionRoomPhotos';
import { useReducedMotion } from '../../lib/hooks';
import { RoomSheet } from './RoomSheet';

gsap.registerPlugin(ScrollTrigger, useGSAP);
export const PR_IMG = `${import.meta.env.BASE_URL}images/pension-rooms/`;

export function PRPicture({ pic, lang, sizes, className = '', eager = false, alt }: { pic: Pic; lang: Lang; sizes: string; className?: string; eager?: boolean; alt?: string }) {
  const set = (ext: string) => pic.sizes.map((w) => `${PR_IMG}${pic.name}-${w}.${ext} ${w}w`).join(', ');
  return (
    <picture>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img src={`${PR_IMG}${pic.name}-${pic.sizes[pic.sizes.length - 1]}.webp`} alt={alt ?? pic.alt[lang]} width={pic.w} height={pic.h} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} className={className} />
    </picture>
  );
}

export function Icon({ d, size = 18, w = 1.5 }: { d: string[]; size?: number; w?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}
export const I = {
  bed: ['M3 18.5v-11M21 18.5v-5.5a2 2 0 0 0-2-2H3M3 15.5h18M5 8h5.2v3.5H5Z'],
  guest: ['M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M5 20a7 7 0 0 1 14 0'],
  size: ['M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'],
  arrow: ['M5 12h14M13 6l6 6-6 6'],
  photo: ['M4 7h3l1.5-2h7L17 7h3v12H4Z', 'M12 16a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z'],
  peaks: ['M2 19 8.5 8l4 6.5L15.5 10 22 19Z', 'M6.6 11.3 8.5 13l1.7-1.5'],
  trail: ['M14.5 5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z', 'M3 19.5l17 2.2', 'M7.5 12.5l4-3.2 3 2.6-2.2 3.6 3 2.6', 'M11.5 9.3 9 6.5', 'M4.5 9.5 9 20'],
  people: ['M8 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z', 'M2.5 20a5.5 5.5 0 0 1 11 0M14 15.2a4.5 4.5 0 0 1 7.5 3.3V20'],
  chat: ['M4 5h16v11H9l-5 4Z', 'M8 9.5h8M8 12.5h5'],
};

/** Pension page · Section 02 – room categories + why-stay band. Cards open the room sheet with its gallery. */
export function PensionRooms({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<{ key: RoomKey; from: DOMRect | null } | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const t = PR_COPY[lang];

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.set(q('.js-pr-head > *'), { autoAlpha: 0, y: 26 });
    gsap.set(q('.js-pr-card'), { autoAlpha: 0, y: 46 });
    gsap.set(q('.js-pr-mask'), { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(q('.js-pr-img'), { scale: 1.18 });
    gsap.set(q('.js-pr-why'), { autoAlpha: 0, y: 22 });
    gsap.set(q('.js-pr-sep'), { scaleY: 0 });
    ScrollTrigger.create({ trigger: q('.js-pr-head')[0], start: 'top 82%', once: true, onEnter: () => {
      gsap.to(q('.js-pr-head > *'), { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: 'power3.out' });
    } });
    ScrollTrigger.batch(q('.js-pr-card'), { start: 'top 88%', once: true, onEnter: (els) => {
      els.forEach((el, i) => {
        const d = i * 0.12;
        gsap.timeline({ delay: d })
          .to(el, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' }, 0)
          .to(el.querySelector('.js-pr-mask'), { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: 'expo.out' }, 0.05)
          .to(el.querySelector('.js-pr-img'), { scale: 1, duration: 1.6, ease: 'power3.out' }, 0.05);
      });
    } });
    ScrollTrigger.create({ trigger: q('.js-pr-band')[0], start: 'top 88%', once: true, onEnter: () => {
      gsap.to(q('.js-pr-why'), { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out' });
      gsap.to(q('.js-pr-sep'), { scaleY: 1, duration: 1, stagger: 0.1, ease: 'power3.out', delay: 0.2 });
    } });
  }, { scope: root, dependencies: [reduced] });

  const openRoom = (key: RoomKey, el: HTMLButtonElement) => {
    opener.current = el;
    setOpen({ key, from: el.getBoundingClientRect() });
  };

  return (
    <section ref={root} id="rooms" aria-labelledby="pr-title" className="relative bg-[#FAF8F5] pb-20 pt-20 text-ink md:pb-28 md:pt-28">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-6 md:px-10 lg:px-14">
        <header className="js-pr-head mx-auto max-w-[820px] text-center">
          <p className="text-[11.5px] font-semibold uppercase tracking-[.36em] text-goldink md:text-[12.5px]">{t.eyebrow}</p>
          <h2 id="pr-title" className="mt-4 text-balance font-display font-normal leading-[1.04] tracking-[-0.015em] text-ink md:mt-5" style={{ fontSize: 'clamp(34px, 4.6vw, 66px)' }}>{t.title}</h2>
          <p className="mx-auto mt-4 max-w-[560px] text-pretty text-[15.5px] leading-relaxed text-ink/70 md:mt-5 md:text-[17px]">{t.sub}</p>
          <p className="mt-6 inline-flex items-center gap-3 text-[11.5px] font-semibold uppercase tracking-[.26em] text-pine/80">
            <span aria-hidden className="h-px w-8 bg-gold" />{t.total}<span aria-hidden className="h-px w-8 bg-gold" />
          </p>
        </header>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 md:mt-16 md:gap-6 xl:grid-cols-4">
          {ROOM_KEYS.map((k, i) => {
            const r = roomData(k), c = t.rooms[k], pic = ROOM_COVERS[k], n = ROOM_GALLERIES[k].length;
            return (
              <li key={k} className="js-pr-card min-w-0">
                <button type="button" onClick={(e) => openRoom(k, e.currentTarget)} aria-haspopup="dialog" aria-label={t.open(c.name)}
                  className="pr-card group flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-ink/[.07] bg-white text-left outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-[#FAF8F5]">
                  <div className="js-pr-mask relative aspect-[1/1] w-full overflow-hidden bg-pine/10 sm:aspect-[5/4] xl:aspect-[4/4.2]">
                    <div className="js-pr-img absolute inset-0">
                      <PRPicture pic={pic} lang={lang} sizes="(min-width:1280px) 25vw, (min-width:640px) 50vw, 100vw" className="pr-card-img h-full w-full object-cover" />
                    </div>
                    <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
                    <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[.14em] text-ink shadow-[0_6px_18px_-10px_rgba(0,0,0,.4)] backdrop-blur-sm">
                      <Icon d={I.bed} size={15} />{c.label}
                    </span>
                    <span className="absolute right-4 top-3.5 lnum font-display text-[22px] leading-none text-white [text-shadow:0_1px_12px_rgba(0,0,0,.35)]">{String(i + 1).padStart(2, '0')}</span>
                    <span className="absolute bottom-3.5 left-3.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[.16em] text-white/95">
                      <Icon d={I.photo} size={15} />{t.photos(n)}
                    </span>
                    <span className="absolute bottom-3.5 right-4 text-[11.5px] font-semibold uppercase tracking-[.16em] text-white/95">{t.count(r.count)}</span>
                  </div>
                  <div className="flex flex-1 flex-col px-5 pb-5 pt-5 md:px-6 md:pb-6">
                    <h3 className="font-display text-[26px] font-normal leading-[1.08] text-ink md:text-[28px] xl:min-h-[2.16em]">{c.name}</h3>
                    <p className="mb-5 mt-2 text-[14.5px] leading-relaxed text-ink/65">{c.text}</p>
                    <div className="mt-auto flex items-center gap-4 border-t border-ink/[.08] pt-4">
                      <span className="inline-flex items-center gap-1.5 text-[13.5px] text-ink/75"><Icon d={I.guest} size={17} />{t.guests(r.guests)}</span>
                      <span className="inline-flex items-center gap-1.5 text-[13.5px] text-ink/75"><Icon d={I.size} size={17} />{r.m2} m²</span>
                      <span aria-hidden className="pr-arrow ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full"><Icon d={I.arrow} size={17} w={1.8} /></span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* why stay with us – an editorial band, no cards */}
        <ul className="js-pr-band mt-16 grid grid-cols-1 gap-x-6 gap-y-8 min-[380px]:grid-cols-2 md:mt-20 lg:grid-cols-4 lg:gap-0">
          {t.why.map((w, i) => (
            <li key={w.title} className="relative flex min-w-0 flex-col gap-3 lg:flex-row lg:gap-4 lg:px-8 lg:first:pl-0 lg:last:pr-0">
              {i > 0 && <span aria-hidden className="js-pr-sep absolute left-0 top-1 hidden h-[calc(100%-4px)] w-px origin-top bg-ink/12 lg:block" />}
              <span className="js-pr-why shrink-0 text-goldink"><Icon d={I[w.icon as keyof typeof I]} size={34} w={1.15} /></span>
              <div className="js-pr-why min-w-0">
                <h3 className="text-[15.5px] font-semibold leading-snug text-ink">{w.title}</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink/65">{w.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {open && (
        <RoomSheet roomKey={open.key} from={open.from} lang={lang} reduced={reduced}
          onClose={() => { setOpen(null); opener.current?.focus({ preventScroll: true }); }} />
      )}
    </section>
  );
}
