import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import type { Lang } from '../../content/hero';
import type { RoomPhoto, RoomsCopy } from '../../content/rooms';

gsap.registerPlugin(CustomEase);
const EASE = CustomEase.create('kzRooms', '0.22,1,0.36,1');
const BASE = `${import.meta.env.BASE_URL}images/rooms/`;
const pad = (n: number) => String(n).padStart(2, '0');

function Pic({ p, lang, sizes, eager, className = '' }: { p: RoomPhoto; lang: Lang; sizes: string; eager?: boolean; className?: string }) {
  const set = (ext: string) => p.sizes.map((s) => `${BASE}${p.id}-${s}.${ext} ${s}w`).join(', ');
  return (
    <picture>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img src={`${BASE}${p.id}.jpg`} alt={p.alt[lang]} width={p.w} height={p.h} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} className={`h-full w-full select-none object-cover ${className}`} />
    </picture>
  );
}

const Arrow = ({ dir }: { dir: 1 | -1 }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={dir < 0 ? 'rotate-180' : ''}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

interface Props { photos: RoomPhoto[]; copy: RoomsCopy; lang: Lang; fine: boolean; reduced: boolean }

export function RoomsGallery({ photos, copy, lang, fine, reduced }: Props) {
  const n = photos.length;
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState(false);
  const cur = useRef(0);
  const busy = useRef(false);
  const frame = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const viewCursor = useRef<HTMLDivElement>(null);
  const dur = reduced ? 0 : 0.75;

  // initial state: only the first slide visible
  useEffect(() => {
    slides.current.forEach((s, i) => s && gsap.set(s, { autoAlpha: i === 0 ? 1 : 0, x: 0, scale: 1 }));
  }, []);

  const go = useCallback((to: number, dirHint?: 1 | -1) => {
    const from = cur.current;
    const target = (to + n) % n;
    if (target === from || busy.current) return;
    const dir = dirHint ?? (target > from ? 1 : -1);
    const a = slides.current[from], b = slides.current[target];
    if (!a || !b) return;
    busy.current = true;
    cur.current = target;
    setIndex(target);
    gsap.killTweensOf([a, b]);
    gsap.to(a, { x: -dir * 48, autoAlpha: 0, duration: dur, ease: EASE });
    gsap.fromTo(b, { x: dir * 18, autoAlpha: 0, scale: 1.04 }, {
      x: 0, autoAlpha: 1, scale: 1, duration: dur, ease: EASE, delay: reduced ? 0 : 0.06,
      onComplete: () => { busy.current = false; },
    });
    if (reduced) busy.current = false;
  }, [n, dur, reduced]);

  const next = useCallback(() => go(cur.current + 1, 1), [go]);
  const prev = useCallback(() => go(cur.current - 1, -1), [go]);

  // ---------------------------------------------------- swipe (touch / pen)
  const swipe = useRef<{ x0: number; y0: number; id: number; dx: number; locked: boolean | null } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    swipe.current = { x0: e.clientX, y0: e.clientY, id: e.pointerId, dx: 0, locked: null };
  };
  const onMove = (e: React.PointerEvent) => {
    const s = swipe.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (s.locked === null && Math.hypot(dx, dy) > 8) s.locked = Math.abs(dx) > Math.abs(dy);
    if (!s.locked) return;
    s.dx = dx;
    const el = slides.current[cur.current];
    if (el) gsap.set(el, { x: dx * 0.45, scale: 1 - Math.min(Math.abs(dx), 200) / 4000 });  // the photo follows the finger
  };
  const onUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    if (!s || s.id !== e.pointerId) return;
    swipe.current = null;
    const el = slides.current[cur.current];
    if (s.locked && Math.abs(s.dx) > 50) { s.dx < 0 ? next() : prev(); }
    else if (el) gsap.to(el, { x: 0, scale: 1, duration: 0.45, ease: EASE });
    if (s.locked) suppressClick.current = true;
  };
  const suppressClick = useRef(false);

  // ---------------------------------------------------- "VIEW" cursor (desktop)
  useEffect(() => {
    const f = frame.current, c = viewCursor.current;
    if (!f || !c || !fine) return;
    const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3.out' });
    const yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3.out' });
    const move = (e: PointerEvent) => { const r = f.getBoundingClientRect(); xTo(e.clientX - r.left); yTo(e.clientY - r.top); };
    const enter = (e: PointerEvent) => { const r = f.getBoundingClientRect(); gsap.set(c, { x: e.clientX - r.left, y: e.clientY - r.top }); gsap.to(c, { scale: 1, autoAlpha: 1, duration: 0.3 }); };
    const leave = () => gsap.to(c, { scale: 0.6, autoAlpha: 0, duration: 0.25 });
    f.addEventListener('pointermove', move); f.addEventListener('pointerenter', enter); f.addEventListener('pointerleave', leave);
    return () => { f.removeEventListener('pointermove', move); f.removeEventListener('pointerenter', enter); f.removeEventListener('pointerleave', leave); };
  }, [fine]);

  const onFrameKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBox(true); }
  };

  return (
    <div className="rooms-gallery" role="region" aria-roledescription="carousel" aria-label={copy.gallery}>
      {/* main photo */}
      <div className="js-rg-mask relative -mx-5 overflow-hidden sm:-mx-6 md:mx-0 md:rounded-[14px]">
        <div
          ref={frame}
          tabIndex={0}
          role="group"
          aria-roledescription="slide"
          aria-label={`${copy.photo(index + 1, n)} – ${copy.open}`}
          onKeyDown={onFrameKey}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setBox(true); }}
          className={`js-rg-zoom group relative aspect-[3/2] w-full overflow-hidden bg-pine/10 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${fine ? 'cursor-none' : 'cursor-pointer'}`}
          style={{ touchAction: 'pan-y' }}
        >
          {photos.map((p, i) => (
            <div key={p.id} ref={(el) => (slides.current[i] = el)} className="absolute inset-0 will-change-transform" aria-hidden={i !== index}>
              <div className="h-full w-full transition-transform duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.025]">
                <Pic p={p} lang={lang} sizes="(min-width: 1024px) 60vw, 100vw" eager={i === 0} />
              </div>
            </div>
          ))}
          {/* very subtle overlay on hover + bottom legibility */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-pine/0 transition-colors duration-500 group-hover:bg-pine/[.06]" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[rgba(16,46,35,.55)] to-transparent" />
          {fine && (
            <div ref={viewCursor} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 z-10 -ml-11 -mt-11 grid h-[88px] w-[88px] scale-75 place-items-center rounded-full bg-cream/95 text-[11px] font-semibold uppercase tracking-[.22em] text-pine opacity-0">
              {copy.view}
            </div>
          )}
        </div>

        {/* counter + arrows, over the photo */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-5 pb-4 text-cream md:px-6 md:pb-5">
          <p className="font-display text-[22px] font-medium tabular-nums leading-none md:text-[26px]" aria-hidden>
            {pad(index + 1)} <span className="mx-1 text-cream/60">/</span> <span className="text-cream/70">{pad(n)}</span>
          </p>
          <div className="pointer-events-auto flex gap-2">
            <button type="button" onClick={prev} aria-label={copy.prev} className="rg-arrow"><Arrow dir={-1} /></button>
            <button type="button" onClick={next} aria-label={copy.next} className="rg-arrow"><Arrow dir={1} /></button>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{copy.photo(index + 1, n)}</p>

      {/* thumbnails */}
      <div role="group" aria-label={copy.thumbs} className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 py-1 sm:-mx-6 sm:px-6 md:mx-0 md:mt-4 md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:px-0">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => go(i)}
            aria-label={copy.photo(i + 1, n)}
            aria-current={i === index}
            className={`js-rg-thumb rg-thumb relative aspect-[3/2] w-[30%] min-w-[96px] shrink-0 overflow-hidden rounded-[8px] md:w-auto ${i === index ? 'is-active' : ''}`}
          >
            <Pic p={p} lang={lang} sizes="200px" />
          </button>
        ))}
      </div>

      <Lightbox open={box} onClose={() => { setBox(false); frame.current?.focus({ preventScroll: true }); }} photos={photos} index={index} onPrev={prev} onNext={next} copy={copy} lang={lang} reduced={reduced} />
    </div>
  );
}

// ------------------------------------------------------------------ lightbox
function Lightbox({ open, onClose, photos, index, onPrev, onNext, copy, lang, reduced }: {
  open: boolean; onClose: () => void; photos: RoomPhoto[]; index: number; onPrev: () => void; onNext: () => void; copy: RoomsCopy; lang: Lang; reduced: boolean;
}) {
  const dlg = useRef<HTMLDialogElement>(null);
  const img = useRef<HTMLDivElement>(null);
  const sx = useRef<number | null>(null);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      gsap.fromTo(d, { opacity: 0 }, { opacity: 1, duration: reduced ? 0 : 0.35 });
      gsap.fromTo(img.current, { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1, duration: reduced ? 0 : 0.6, ease: EASE });
    } else if (!open && d.open) {
      gsap.to(d, { opacity: 0, duration: reduced ? 0 : 0.25, onComplete: () => d.close() });
    }
  }, [open, reduced]);

  useEffect(() => {
    if (!open || !img.current) return;
    gsap.fromTo(img.current, { opacity: 0.4, scale: 1.02 }, { opacity: 1, scale: 1, duration: reduced ? 0 : 0.5, ease: EASE });
  }, [index, open, reduced]);

  const p = photos[index];
  const set = (ext: string) => p.sizes.map((s) => `${BASE}${p.id}-${s}.${ext} ${s}w`).join(', ');
  return (
    <dialog
      ref={dlg}
      aria-label={copy.gallery}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') onNext(); if (e.key === 'ArrowLeft') onPrev(); }}
      onClick={(e) => { if (e.target === dlg.current) onClose(); }}
      className="rooms-lightbox m-0 h-[100dvh] max-h-none w-screen max-w-none bg-[#0b1712]/95 p-0 text-cream backdrop:bg-transparent"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 md:px-8">
          <p className="font-display text-[24px] tabular-nums">{pad(index + 1)} <span className="text-cream/50">/ {pad(photos.length)}</span></p>
          <button type="button" onClick={onClose} aria-label={copy.close} autoFocus className="grid h-11 w-11 place-items-center rounded-full border border-cream/25 transition-colors hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-24"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={(e) => { sx.current = e.clientX; }}
          onPointerUp={(e) => { if (sx.current === null) return; const dx = e.clientX - sx.current; sx.current = null; if (Math.abs(dx) > 50) (dx < 0 ? onNext() : onPrev()); }}
        >
          <div ref={img} className="max-h-full max-w-full">
            <picture>
              <source type="image/avif" srcSet={set('avif')} sizes="100vw" />
              <source type="image/webp" srcSet={set('webp')} sizes="100vw" />
              <img src={`${BASE}${p.id}.jpg`} alt={p.alt[lang]} width={p.w} height={p.h} className="max-h-[calc(100dvh-160px)] w-auto max-w-full rounded-[6px] object-contain" />
            </picture>
          </div>
          <button type="button" onClick={onPrev} aria-label={copy.prev} className="rg-arrow absolute left-3 top-1/2 hidden -translate-y-1/2 md:grid md:left-8"><Arrow dir={-1} /></button>
          <button type="button" onClick={onNext} aria-label={copy.next} className="rg-arrow absolute right-3 top-1/2 hidden -translate-y-1/2 md:grid md:right-8"><Arrow dir={1} /></button>
        </div>
        <div className="flex items-center justify-center gap-3 py-5 md:hidden">
          <button type="button" onClick={onPrev} aria-label={copy.prev} className="rg-arrow"><Arrow dir={-1} /></button>
          <span className="text-[12px] uppercase tracking-[.2em] text-cream/60">{copy.swipe}</span>
          <button type="button" onClick={onNext} aria-label={copy.next} className="rg-arrow"><Arrow dir={1} /></button>
        </div>
        <p className="sr-only" aria-live="polite">{copy.photo(index + 1, photos.length)}</p>
      </div>
    </dialog>
  );
}
