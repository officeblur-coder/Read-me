import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import type { Lang } from '../../content/hero';
import type { Room, RoomsCopy } from '../../content/rooms';
import { FeatureIconSvg } from './RoomFeatures';

gsap.registerPlugin(CustomEase);
const EASE = CustomEase.create('kzRooms', '0.22,1,0.36,1');
const BASE = `${import.meta.env.BASE_URL}images/rooms/`;

function Pic({ r, lang, sizes, eager, className = '' }: { r: Room; lang: Lang; sizes: string; eager?: boolean; className?: string }) {
  const set = (ext: string) => r.sizes.map((s) => `${BASE}${r.id}-${s}.${ext} ${s}w`).join(', ');
  return (
    <picture>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img src={`${BASE}${r.id}.jpg`} alt={r.alt[lang]} width={r.w} height={r.h} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} className={`h-full w-full select-none object-cover ${className}`} />
    </picture>
  );
}

const Chevron = ({ dir }: { dir: 1 | -1 }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={dir > 0 ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'} />
  </svg>
);

function Facts({ r, copy, lang, className = '' }: { r: Room; copy: RoomsCopy; lang: Lang; className?: string }) {
  const items = [copy.rooms(r.count), `${r.m2} m²`, copy.guests(r.guests), r.beds[lang]];
  if (r.maxCombined) items.push(copy.combined(r.maxCombined));
  return (
    <ul className={`flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-cream/85 md:text-[13.5px] ${className}`}>
      {items.map((t, i) => (
        <li key={t} className="flex items-center gap-3 tabular-nums">{i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-gold" />}{t}</li>
      ))}
    </ul>
  );
}

interface Props { rooms: Room[]; copy: RoomsCopy; lang: Lang; fine: boolean; reduced: boolean }

export function RoomsGallery({ rooms, copy, lang, fine, reduced }: Props) {
  const n = rooms.length;
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState(false);
  const cur = useRef(0);
  const busy = useRef(false);
  const frame = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const viewCursor = useRef<HTMLDivElement>(null);
  const dur = reduced ? 0 : 0.75;

  useEffect(() => {
    slides.current.forEach((s, i) => s && gsap.set(s, { autoAlpha: i === 0 ? 1 : 0, x: 0, scale: 1 }));
  }, []);

  const go = useCallback((to: number, dirHint?: 1 | -1) => {
    const from = cur.current, target = (to + n) % n;
    if (target === from || busy.current) return;
    const dir = dirHint ?? (target > from ? 1 : -1);
    const a = slides.current[from], b = slides.current[target];
    if (!a || !b) return;
    busy.current = !reduced;
    cur.current = target;
    gsap.killTweensOf([a, b]);
    // current photo drifts away to the side and fades …
    gsap.to(a, { x: -dir * 48, autoAlpha: 0, duration: dur, ease: EASE });
    // … the next one settles in: fade + scale 1.04 → 1
    gsap.fromTo(b, { x: dir * 18, autoAlpha: 0, scale: 1.04 }, { x: 0, autoAlpha: 1, scale: 1, duration: dur, ease: EASE, delay: reduced ? 0 : 0.06, onComplete: () => { busy.current = false; } });
    // caption and thumbnails: out, swap, in
    const out = [caption.current, thumbs.current].filter(Boolean);
    gsap.to(out, { autoAlpha: 0, y: 8, duration: reduced ? 0 : 0.22, ease: 'power2.in', onComplete: () => {
      setIndex(target);
      requestAnimationFrame(() => gsap.fromTo(out, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: reduced ? 0 : 0.55, ease: EASE, stagger: 0.06 }));
    } });
  }, [n, dur, reduced]);

  const next = useCallback(() => go(cur.current + 1, 1), [go]);
  const prev = useCallback(() => go(cur.current - 1, -1), [go]);

  // swipe with visual feedback (touch / pen); vertical scroll stays free
  const swipe = useRef<{ x0: number; y0: number; id: number; dx: number; locked: boolean | null } | null>(null);
  const suppressClick = useRef(false);
  const onDown = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') swipe.current = { x0: e.clientX, y0: e.clientY, id: e.pointerId, dx: 0, locked: null }; };
  const onMove = (e: React.PointerEvent) => {
    const s = swipe.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (s.locked === null && Math.hypot(dx, dy) > 8) s.locked = Math.abs(dx) > Math.abs(dy);
    if (!s.locked) return;
    s.dx = dx;
    const el = slides.current[cur.current];
    if (el) gsap.set(el, { x: dx * 0.45, scale: 1 - Math.min(Math.abs(dx), 200) / 4000 });
  };
  const onUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    if (!s || s.id !== e.pointerId) return;
    swipe.current = null;
    if (s.locked) suppressClick.current = true;
    if (s.locked && Math.abs(s.dx) > 50) (s.dx < 0 ? next() : prev());
    else { const el = slides.current[cur.current]; if (el) gsap.to(el, { x: 0, scale: 1, duration: 0.45, ease: EASE }); }
  };

  // "VIEW" cursor (desktop only)
  useEffect(() => {
    const f = frame.current, c = viewCursor.current;
    if (!f || !c || !fine) return;
    const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3.out' });
    const yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3.out' });
    const pos = (e: PointerEvent) => { const r = f.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const move = (e: PointerEvent) => { const onControl = (e.target as Element).closest('a,button'); gsap.to(c, { autoAlpha: onControl ? 0 : 1, scale: onControl ? 0.6 : 1, duration: 0.25, overwrite: 'auto' }); const [x, y] = pos(e); xTo(x); yTo(y); };
    const enter = (e: PointerEvent) => { const [x, y] = pos(e); gsap.set(c, { x, y }); };
    const leave = () => gsap.to(c, { scale: 0.6, autoAlpha: 0, duration: 0.25, overwrite: 'auto' });
    f.addEventListener('pointermove', move); f.addEventListener('pointerenter', enter); f.addEventListener('pointerleave', leave);
    return () => { f.removeEventListener('pointermove', move); f.removeEventListener('pointerenter', enter); f.removeEventListener('pointerleave', leave); };
  }, [fine]);

  const onFrameKey = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBox(true); }
  };

  const r = rooms[index];
  const others = [1, 2, 3].map((k) => (index + k) % n);
  const label = copy.photo(index + 1, n, r.name[lang]);

  return (
    <div role="region" aria-roledescription="carousel" aria-label={copy.gallery}>
      <div className="js-rg-mask relative overflow-hidden rounded-[14px] shadow-[0_24px_60px_-28px_color-mix(in_srgb,var(--k-pine)_45%,transparent)]">
        <div
          ref={frame}
          tabIndex={0}
          role="group"
          aria-roledescription="slide"
          aria-label={`${label}. ${copy.open}`}
          onKeyDown={onFrameKey}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={(e) => {
            if ((e.target as Element).closest('a,button')) return;
            if (suppressClick.current) { suppressClick.current = false; return; }
            setBox(true);
          }}
          className={`js-rg-zoom group relative aspect-[4/3] w-full overflow-hidden bg-pine/10 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold sm:aspect-[3/2] ${fine ? 'cursor-none' : 'cursor-pointer'}`}
          style={{ touchAction: 'pan-y' }}
        >
          {rooms.map((room, i) => (
            <div key={room.id} ref={(el) => (slides.current[i] = el)} className="absolute inset-0 will-change-transform" aria-hidden={i !== index}>
              <div className="h-full w-full transition-transform duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.025]">
                <Pic r={room} lang={lang} sizes="(min-width: 1024px) 62vw, 100vw" eager={i === 0} />
              </div>
            </div>
          ))}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-pine/0 transition-colors duration-500 group-hover:bg-pine/[.05]" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[color-mix(in_srgb,var(--k-deep)_78%,transparent)] via-[color-mix(in_srgb,var(--k-deep)_30%,transparent)] to-transparent" />

          {/* caption */}
          <div ref={caption} className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-4 text-cream sm:p-5 md:p-7">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="hidden text-cream sm:block"><FeatureIconSvg name="bed" size={30} /></span>
                <h3 className="font-display text-[24px] font-medium leading-[1.05] sm:text-[28px] md:text-[34px]">{r.name[lang]}</h3>
              </div>
              <p className="mt-1 text-[13px] text-cream/85 sm:pl-[42px] md:text-[15px]">{copy.ideal} {r.idealFor[lang]}</p>
              <Facts r={r} copy={copy} lang={lang} className="mt-2.5 hidden sm:flex sm:pl-[42px]" />
              <a href={copy.roomHref(r.slug)} className="mt-3 hidden items-center gap-2 text-[13px] font-semibold text-cream underline decoration-gold decoration-1 underline-offset-[5px] transition-colors hover:text-gold sm:inline-flex sm:ml-[42px]">{copy.details} <span aria-hidden>→</span></a>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[13px] font-medium tabular-nums text-cream/90 md:text-[14px]" aria-hidden>{index + 1} / {n}</span>
              <button type="button" onClick={prev} aria-label={copy.prev} className="rg-arrow hidden md:grid"><Chevron dir={-1} /></button>
              <button type="button" onClick={next} aria-label={copy.next} className="rg-arrow hidden md:grid"><Chevron dir={1} /></button>
            </div>
          </div>

          {/* mobile arrows: on the sides, like the simulation */}
          <button type="button" onClick={prev} aria-label={copy.prev} className="rg-arrow-solid absolute left-3 top-[42%] z-10 -translate-y-1/2 md:hidden"><Chevron dir={-1} /></button>
          <button type="button" onClick={next} aria-label={copy.next} className="rg-arrow-solid absolute right-3 top-[42%] z-10 -translate-y-1/2 md:hidden"><Chevron dir={1} /></button>

          {fine && (
            <div ref={viewCursor} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 z-20 -ml-11 -mt-11 grid h-[88px] w-[88px] scale-75 place-items-center rounded-full bg-cream/95 text-[11px] font-semibold uppercase tracking-[.22em] text-pine opacity-0">
              {copy.view}
            </div>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{label}</p>

      {/* facts on small phones (no room for them on the photo) */}
      <div className="mt-3 flex items-center justify-between gap-3 sm:hidden">
        <p className="text-[12.5px] leading-snug text-ink/75">{copy.rooms(r.count)} · {r.m2} m² · {copy.guests(r.guests)}{r.maxCombined ? ` · ${copy.combined(r.maxCombined)}` : ''}</p>
        <a href={copy.roomHref(r.slug)} className="shrink-0 text-[12.5px] font-semibold text-pine underline decoration-gold underline-offset-4">{copy.details}</a>
      </div>

      {/* the other three rooms */}
      <div ref={thumbs} className="mt-4 hidden grid-cols-3 gap-3 sm:grid md:mt-5 md:gap-4" role="group" aria-label={copy.thumbs}>
        {others.map((i) => (
          <button key={rooms[i].id} type="button" onClick={() => go(i, 1)} aria-label={rooms[i].name[lang]} className="js-rg-thumb rg-thumb group/t relative aspect-[3/2] overflow-hidden rounded-[10px]">
            <Pic r={rooms[i]} lang={lang} sizes="(min-width: 1024px) 18vw, 30vw" className="transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover/t:scale-[1.04]" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--k-deep)_70%,transparent)] to-transparent px-3 pb-2 pt-6 text-left text-[12px] font-medium text-cream opacity-0 transition-opacity duration-300 group-hover/t:opacity-100 group-focus-visible/t:opacity-100">
              {rooms[i].name[lang]}
            </span>
          </button>
        ))}
      </div>

      <Lightbox open={box} onClose={() => { setBox(false); frame.current?.focus({ preventScroll: true }); }} rooms={rooms} index={index} onPrev={prev} onNext={next} copy={copy} lang={lang} reduced={reduced} />
    </div>
  );
}

// ------------------------------------------------------------------ lightbox
function Lightbox({ open, onClose, rooms, index, onPrev, onNext, copy, lang, reduced }: {
  open: boolean; onClose: () => void; rooms: Room[]; index: number; onPrev: () => void; onNext: () => void; copy: RoomsCopy; lang: Lang; reduced: boolean;
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
    if (open && img.current) gsap.fromTo(img.current, { opacity: 0.4, scale: 1.02 }, { opacity: 1, scale: 1, duration: reduced ? 0 : 0.5, ease: EASE });
  }, [index, open, reduced]);

  const r = rooms[index];
  const set = (ext: string) => r.sizes.map((s) => `${BASE}${r.id}-${s}.${ext} ${s}w`).join(', ');
  return (
    <dialog
      ref={dlg}
      aria-label={copy.gallery}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') onNext(); if (e.key === 'ArrowLeft') onPrev(); }}
      onClick={(e) => { if (e.target === dlg.current) onClose(); }}
      className="rooms-lightbox m-0 h-[100dvh] max-h-none w-screen max-w-none bg-deep/95 p-0 text-cream"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div className="min-w-0">
            <p className="truncate font-display text-[24px] md:text-[28px]">{r.name[lang]}</p>
            <p className="text-[13px] text-cream/65 tabular-nums">{index + 1} / {rooms.length} · {r.m2} m² · {copy.guests(r.guests)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={copy.close} autoFocus className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-cream/25 transition-colors hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
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
              <img src={`${BASE}${r.id}.jpg`} alt={r.alt[lang]} width={r.w} height={r.h} className="max-h-[calc(100dvh-170px)] w-auto max-w-full rounded-[6px] object-contain" />
            </picture>
          </div>
          <button type="button" onClick={onPrev} aria-label={copy.prev} className="rg-arrow absolute left-8 top-1/2 hidden -translate-y-1/2 md:grid"><Chevron dir={-1} /></button>
          <button type="button" onClick={onNext} aria-label={copy.next} className="rg-arrow absolute right-8 top-1/2 hidden -translate-y-1/2 md:grid"><Chevron dir={1} /></button>
        </div>
        <div className="flex items-center justify-center gap-3 py-5 md:hidden">
          <button type="button" onClick={onPrev} aria-label={copy.prev} className="rg-arrow"><Chevron dir={-1} /></button>
          <span className="text-[12px] uppercase tracking-[.2em] text-cream/60">{copy.swipe}</span>
          <button type="button" onClick={onNext} aria-label={copy.next} className="rg-arrow"><Chevron dir={1} /></button>
        </div>
      </div>
    </dialog>
  );
}
