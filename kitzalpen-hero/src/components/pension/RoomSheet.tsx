import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Lang } from '../../content/hero';
import { BOOK_ROOMS, PR_COPY, ROOM_KEYS, roomData, roomRoute, type RoomKey } from '../../content/pensionPage';
import { ROOM_GALLERIES } from '../../content/pensionRoomPhotos';
import { Icon, I, PRPicture, PR_IMG } from './PensionRooms';

interface Props { roomKey: RoomKey; from: DOMRect | null; lang: Lang; reduced: boolean; onClose: () => void }

/**
 * Room category sheet: grows out of the card that was tapped, shows the category's photos
 * full-bleed (swipe / arrows / thumbnails) next to the verified facts and the real links.
 */
export function RoomSheet({ roomKey, from, lang, reduced, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [idx, setIdx] = useState(0);
  const closing = useRef(false);
  const t = PR_COPY[lang];
  const r = roomData(roomKey), c = t.rooms[roomKey], pics = ROOM_GALLERIES[roomKey];
  const n = pics.length;
  const no = ROOM_KEYS.indexOf(roomKey) + 1;

  const insetFrom = () => {
    const p = panel.current?.getBoundingClientRect();
    if (!p || !from) return 'inset(8% 8% 8% 8% round 22px)';
    const v = (x: number) => `${Math.max(0, x).toFixed(1)}px`;
    return `inset(${v(from.top - p.top)} ${v(p.right - from.right)} ${v(p.bottom - from.bottom)} ${v(from.left - p.left)} round 22px)`;
  };

  // open: the card's frame expands into the sheet
  useLayoutEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    closeBtn.current?.focus({ preventScroll: true });
    if (!reduced && panel.current) {
      const q = gsap.utils.selector(panel);
      gsap.timeline()
        .fromTo(shade.current, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0)
        .fromTo(panel.current, { clipPath: insetFrom() }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.9, ease: 'expo.inOut', clearProps: 'clipPath' }, 0)
        .fromTo(q('.js-rs-slide img'), { scale: 1.12 }, { scale: 1, duration: 1.4, ease: 'power3.out' }, 0.1)
        .fromTo(q('.js-rs-in'), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out' }, 0.5);
    }
    return () => { html.style.overflow = prev; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (reduced || !panel.current) { onClose(); return; }
    const q = gsap.utils.selector(panel);
    gsap.timeline({ onComplete: onClose })
      .to(q('.js-rs-in'), { autoAlpha: 0, duration: 0.2 }, 0)
      .to(panel.current, { clipPath: insetFrom(), duration: 0.7, ease: 'expo.inOut' }, 0.05)
      .to(shade.current, { opacity: 0, duration: 0.5 }, 0.25);
  };

  const goTo = (i: number) => {
    const el = track.current; if (!el) return;
    const k = (i + n) % n;
    el.scrollTo({ left: k * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  };
  const onScroll = () => {
    const el = track.current; if (!el) return;
    const k = Math.round(el.scrollLeft / el.clientWidth);
    if (k !== idx) setIdx(k);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') goTo(idx + 1);
      else if (e.key === 'ArrowLeft') goTo(idx - 1);
      else if (e.key === 'Tab' && panel.current) {
        const f = Array.from(panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }); // re-bound each render so idx is current

  const facts = [
    { k: t.facts.rooms, v: String(r.count) },
    { k: t.facts.guests, v: String(r.guests) },
    { k: t.facts.size, v: `${r.m2} m²` },
    { k: t.facts.beds, v: r.beds[lang] },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="rs-title" className="fixed inset-0 z-[80]">
      <div ref={shade} className="absolute inset-0 bg-[rgba(8,12,10,.62)] backdrop-blur-[3px]" onClick={close} />
      <div ref={panel} className="absolute inset-0 overflow-y-auto overscroll-contain bg-[#FAF8F5] lg:inset-5 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:overflow-hidden lg:rounded-[26px] xl:grid-cols-[minmax(0,1fr)_460px]">
        {/* stage */}
        <div className="relative h-[60svh] min-h-[320px] overflow-hidden bg-[#0f1613] lg:h-full">
          <div ref={track} onScroll={onScroll} className="rs-track flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden" aria-roledescription="carousel" aria-label={c.name}>
            {pics.map((p, i) => (
              <figure key={p.name} className="js-rs-slide relative h-full w-full shrink-0 snap-center overflow-hidden" aria-roledescription="slide" aria-label={t.photoOf(i + 1, n)}>
                {/* soft, blurred copy fills the frame behind photos that don't match its shape */}
                <img aria-hidden src={`${PR_IMG}${p.name}-${p.sizes[0]}.webp`} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" loading={i < 2 ? 'eager' : 'lazy'} />
                <PRPicture pic={p} lang={lang} sizes="(min-width:1024px) 70vw, 100vw" eager={i < 2}
                  className={`relative h-full w-full ${p.h > p.w ? 'object-contain' : 'object-cover'}`} />
              </figure>
            ))}
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/55 to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/40 to-transparent" />

          <p className="js-rs-in absolute left-5 top-5 text-[11px] font-semibold uppercase tracking-[.3em] text-white/90 md:left-7 md:top-7">
            {String(no).padStart(2, '0')} · {c.label}
          </p>

          {/* counter + arrows */}
          <div className="js-rs-in absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 md:bottom-7 md:left-7 md:right-7">
            <div className="hidden gap-2 md:flex" role="tablist" aria-label={t.photos(n)}>
              {pics.map((p, i) => (
                <button key={p.name} type="button" role="tab" aria-selected={i === idx} aria-label={t.photoOf(i + 1, n)} onClick={() => goTo(i)}
                  className={`h-12 w-[72px] overflow-hidden rounded-[10px] outline-none ring-offset-2 ring-offset-black/40 transition-[opacity,box-shadow,transform] duration-300 focus-visible:ring-2 focus-visible:ring-gold-light ${i === idx ? 'opacity-100 ring-2 ring-white' : 'opacity-55 hover:opacity-90'}`}>
                  <img src={`${PR_IMG}${p.name}-${p.sizes[0]}.webp`} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 md:hidden" aria-hidden>
              {pics.map((p, i) => <span key={p.name} className={`h-1.5 rounded-full bg-white transition-all duration-300 ${i === idx ? 'w-6' : 'w-1.5 opacity-50'}`} />)}
            </div>
            <div className="flex items-center gap-3">
              <span className="lnum font-display text-[20px] leading-none text-white" aria-live="polite">{String(idx + 1).padStart(2, '0')}<span className="text-white/50"> / {String(n).padStart(2, '0')}</span></span>
              <button type="button" onClick={() => goTo(idx - 1)} aria-label={t.prev} className="rs-nav grid h-11 w-11 place-items-center rounded-full"><span className="rotate-180"><Icon d={I.arrow} size={17} w={1.8} /></span></button>
              <button type="button" onClick={() => goTo(idx + 1)} aria-label={t.next} className="rs-nav grid h-11 w-11 place-items-center rounded-full"><Icon d={I.arrow} size={17} w={1.8} /></button>
            </div>
          </div>
        </div>

        {/* facts */}
        <div className="relative flex flex-col px-6 pb-[calc(32px+env(safe-area-inset-bottom,0px))] pt-8 md:px-10 md:pt-10 lg:overflow-y-auto lg:px-10 lg:pb-10 lg:pt-16">
          <p className="js-rs-in text-[11px] font-semibold uppercase tracking-[.32em] text-goldink">{t.category} {String(no).padStart(2, '0')}</p>
          <h2 id="rs-title" className="js-rs-in mt-3 font-display text-[36px] font-normal leading-[1.02] tracking-[-0.01em] text-ink md:text-[46px]">{c.name}</h2>
          <p className="js-rs-in mt-3 text-[16px] leading-relaxed text-ink/70">{c.text}</p>

          <dl className="js-rs-in mt-7 grid grid-cols-2 border-t border-ink/10">
            {facts.map((f, i) => (
              <div key={f.k} className={`border-b border-ink/10 py-4 ${i % 2 ? 'pl-5' : 'pr-5 border-r'}`}>
                <dt className="text-[10.5px] font-semibold uppercase tracking-[.2em] text-ink/50">{f.k}</dt>
                <dd className="lnum mt-1.5 font-display text-[22px] leading-tight text-ink">{f.v}</dd>
              </div>
            ))}
          </dl>
          {r.maxCombined && <p className="js-rs-in mt-4 rounded-[14px] bg-pine/[.06] px-4 py-3 text-[14px] leading-snug text-pine">{t.combined(r.maxCombined)}</p>}

          <div className="js-rs-in mt-6">
            <p className="text-[10.5px] font-semibold uppercase tracking-[.2em] text-ink/50">{t.ideal}</p>
            <p className="mt-1.5 text-[15px] text-ink/80">{r.idealFor[lang]}</p>
          </div>
          <div className="js-rs-in mt-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[.2em] text-ink/50">{t.inclusive}</p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {t.incl.map((x) => <li key={x} className="rounded-full border border-ink/12 px-3 py-1.5 text-[13px] text-ink/80">{x}</li>)}
            </ul>
          </div>

          <div className="js-rs-in mt-8 flex flex-col gap-3 lg:mt-auto lg:pt-8">
            <a href={BOOK_ROOMS} target="_blank" rel="noopener noreferrer" className="pr-btn-primary inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full px-7 text-[15.5px] font-semibold">
              {t.book} <Icon d={I.arrow} size={17} w={1.8} />
            </a>
            <a href={roomRoute(roomKey)} onClick={() => { document.documentElement.style.overflow = ''; }} className="pr-btn-ghost inline-flex min-h-[54px] items-center justify-center rounded-full px-7 text-[15.5px] font-semibold">{t.details}</a>
          </div>
        </div>

        <button ref={closeBtn} type="button" onClick={close} aria-label={t.close}
          className="rs-close fixed right-4 top-4 z-10 grid h-12 w-12 place-items-center rounded-full lg:absolute lg:right-6 lg:top-6">
          <Icon d={['M6 6l12 12M18 6 6 18']} size={20} w={1.6} />
        </button>
      </div>
    </div>
  );
}
