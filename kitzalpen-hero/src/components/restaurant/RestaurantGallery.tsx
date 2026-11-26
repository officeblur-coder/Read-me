import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import type { Lang } from '../../content/hero';
import type { RestCopy, RestPhoto } from '../../content/restaurant';

gsap.registerPlugin(CustomEase);
const EASE = CustomEase.create('kzRest', '0.22,1,0.36,1');
const BASE = `${import.meta.env.BASE_URL}images/restaurant/`;
const pad = (n: number) => String(n).padStart(2, '0');

function Pic({ p, lang, sizes, eager, className = '' }: { p: RestPhoto; lang: Lang; sizes: string; eager?: boolean; className?: string }) {
  const set = (ext: string) => [800, 1600].map((s) => `${BASE}${p.id}-${s}.${ext} ${s}w`).join(', ');
  return (
    <picture>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img src={`${BASE}${p.id}.jpg`} alt={p.alt[lang]} width={p.w} height={p.h} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} className={`h-full w-full select-none object-cover ${className}`} />
    </picture>
  );
}
const Arrow = ({ dir }: { dir: 1 | -1 }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={dir < 0 ? 'rotate-180' : ''}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

interface Props { photos: RestPhoto[]; copy: RestCopy; lang: Lang; fine: boolean; reduced: boolean }

export function RestaurantGallery({ photos, copy, lang, fine, reduced }: Props) {
  const n = photos.length;
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState(false);
  const cur = useRef(0);
  const frame = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const viewCursor = useRef<HTMLDivElement>(null);
  const dur = reduced ? 0 : 0.7;

  useEffect(() => { slides.current.forEach((s, i) => s && gsap.set(s, { autoAlpha: i === 0 ? 1 : 0 })); }, []);

  /** cinematic crossfade: old fades & drifts in, new fades in settling from 1.05 */
  const go = useCallback((to: number) => {
    const from = cur.current, target = (to + n) % n;
    if (target === from) return;
    const a = slides.current[from], b = slides.current[target];
    if (!a || !b) return;
    cur.current = target; setIndex(target);
    gsap.killTweensOf([a, b]);
    gsap.to(a, { autoAlpha: 0, scale: 1.02, duration: dur, ease: EASE });
    gsap.fromTo(b, { autoAlpha: 0, scale: 1.05 }, { autoAlpha: 1, scale: 1, duration: dur, ease: EASE });
  }, [n, dur]);
  const next = useCallback(() => go(cur.current + 1), [go]);
  const prev = useCallback(() => go(cur.current - 1), [go]);

  // swipe
  const sw = useRef<{ x0: number; y0: number; id: number; dx: number; lock: boolean | null } | null>(null);
  const suppress = useRef(false);
  const onDown = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') sw.current = { x0: e.clientX, y0: e.clientY, id: e.pointerId, dx: 0, lock: null }; };
  const onMove = (e: React.PointerEvent) => {
    const s = sw.current; if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (s.lock === null && Math.hypot(dx, dy) > 8) s.lock = Math.abs(dx) > Math.abs(dy);
    if (!s.lock) return;
    s.dx = dx;
    const el = slides.current[cur.current]; if (el) gsap.set(el, { x: dx * 0.35 });
  };
  const onUp = (e: React.PointerEvent) => {
    const s = sw.current; if (!s || s.id !== e.pointerId) return;
    sw.current = null;
    if (s.lock) suppress.current = true;
    const el = slides.current[cur.current]; if (el) gsap.to(el, { x: 0, duration: 0.5, ease: EASE });
    if (s.lock && Math.abs(s.dx) > 50) (s.dx < 0 ? next() : prev());
  };

  useEffect(() => {
    const f = frame.current, c = viewCursor.current;
    if (!f || !c || !fine) return;
    const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3.out' }), yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3.out' });
    const move = (e: PointerEvent) => { const r = f.getBoundingClientRect(); xTo(e.clientX - r.left); yTo(e.clientY - r.top); const on = (e.target as Element).closest('button'); gsap.to(c, { autoAlpha: on ? 0 : 1, scale: on ? 0.6 : 1, duration: 0.25, overwrite: 'auto' }); };
    const enter = (e: PointerEvent) => { const r = f.getBoundingClientRect(); gsap.set(c, { x: e.clientX - r.left, y: e.clientY - r.top }); };
    const leave = () => gsap.to(c, { autoAlpha: 0, scale: 0.6, duration: 0.25, overwrite: 'auto' });
    f.addEventListener('pointermove', move); f.addEventListener('pointerenter', enter); f.addEventListener('pointerleave', leave);
    return () => { f.removeEventListener('pointermove', move); f.removeEventListener('pointerenter', enter); f.removeEventListener('pointerleave', leave); };
  }, [fine]);

  const p = photos[index];
  const others = [1, 2, 3].map((k) => (index + k) % n);

  return (
    <div role="region" aria-roledescription="carousel" aria-label={copy.gallery}>
      <div className="js-rgal-mask relative overflow-hidden rounded-[18px] shadow-[0_30px_70px_-34px_color-mix(in_srgb,var(--k-deep)_55%,transparent)]">
        <div
          ref={frame} tabIndex={0} role="group" aria-roledescription="slide"
          aria-label={`${copy.photo(index + 1, n, p.label[lang])}. ${copy.open}`}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBox(true); }
          }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onClick={(e) => { if ((e.target as Element).closest('button')) return; if (suppress.current) { suppress.current = false; return; } setBox(true); }}
          className={`js-rgal-zoom group relative aspect-[4/3] w-full overflow-hidden bg-pine/15 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold sm:aspect-[16/10] ${fine ? 'cursor-none' : 'cursor-pointer'}`}
          style={{ touchAction: 'pan-y' }}
        >
          {photos.map((ph, i) => (
            <div key={ph.id} ref={(el) => (slides.current[i] = el)} className="absolute inset-0 will-change-transform" aria-hidden={i !== index}>
              <div className="h-full w-full transition-transform duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.025]">
                <Pic p={ph} lang={lang} sizes="(min-width:1024px) 60vw, 100vw" eager={i === 0} />
              </div>
            </div>
          ))}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[color-mix(in_srgb,var(--k-deep)_60%,transparent)] to-transparent" />

          {/* mobile: side arrows + dots */}
          <button type="button" onClick={prev} aria-label={copy.prev} className="cg-arrow left-3 md:hidden"><Arrow dir={-1} /></button>
          <button type="button" onClick={next} aria-label={copy.next} className="cg-arrow right-3 md:hidden"><Arrow dir={1} /></button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2 md:hidden">
            {photos.map((ph, i) => <button key={ph.id} type="button" onClick={() => go(i)} aria-label={copy.photo(i + 1, n, ph.label[lang])} aria-current={i === index} className={`cg-dot ${i === index ? 'is-on' : ''}`} />)}
          </div>

          {/* desktop: label left, counter + arrows right */}
          <p className="pointer-events-none absolute bottom-5 left-6 hidden text-[12px] font-semibold uppercase tracking-[.24em] text-cream/90 md:block">{p.label[lang]}</p>
          <div className="absolute bottom-4 right-5 hidden items-center gap-3 text-cream md:flex">
            <span className="text-[15px] font-semibold tabular-nums" aria-hidden>{pad(index + 1)} <span className="font-normal text-cream/70">/ {pad(n)}</span></span>
            <button type="button" onClick={prev} aria-label={copy.prev} className="rg-arrow"><Arrow dir={-1} /></button>
            <button type="button" onClick={next} aria-label={copy.next} className="rg-arrow"><Arrow dir={1} /></button>
          </div>

          {fine && (
            <div ref={viewCursor} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 z-10 -ml-10 -mt-10 grid h-20 w-20 scale-75 place-items-center rounded-full bg-cream/95 text-[10.5px] font-semibold uppercase tracking-[.22em] text-pine opacity-0">{copy.view}</div>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{copy.photo(index + 1, n, p.label[lang])}</p>

      <div role="group" aria-label={copy.thumbs} className="mt-4 hidden grid-cols-3 gap-4 sm:grid">
        {others.map((i) => (
          <button key={photos[i].id} type="button" onClick={() => go(i)} aria-label={copy.photo(i + 1, n, photos[i].label[lang])}
            className="js-rgal-thumb cg-thumb group/t relative aspect-[3/2] overflow-hidden rounded-[12px]">
            <Pic p={photos[i]} lang={lang} sizes="(min-width:1024px) 20vw, 30vw" className="transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover/t:scale-[1.04]" />
          </button>
        ))}
      </div>

      <Lightbox open={box} onClose={() => { setBox(false); frame.current?.focus({ preventScroll: true }); }} photos={photos} index={index} onPrev={prev} onNext={next} copy={copy} lang={lang} reduced={reduced} />
    </div>
  );
}

function Lightbox({ open, onClose, photos, index, onPrev, onNext, copy, lang, reduced }: {
  open: boolean; onClose: () => void; photos: RestPhoto[]; index: number; onPrev: () => void; onNext: () => void; copy: RestCopy; lang: Lang; reduced: boolean;
}) {
  const dlg = useRef<HTMLDialogElement>(null);
  const img = useRef<HTMLDivElement>(null);
  const sx = useRef<number | null>(null);
  useEffect(() => {
    const d = dlg.current; if (!d) return;
    if (open && !d.open) { d.showModal(); gsap.fromTo(d, { opacity: 0 }, { opacity: 1, duration: reduced ? 0 : 0.35 }); }
    else if (!open && d.open) gsap.to(d, { opacity: 0, duration: reduced ? 0 : 0.25, onComplete: () => d.close() });
  }, [open, reduced]);
  useEffect(() => { if (open && img.current) gsap.fromTo(img.current, { opacity: 0.3, scale: 1.03 }, { opacity: 1, scale: 1, duration: reduced ? 0 : 0.6, ease: EASE }); }, [index, open, reduced]);
  const p = photos[index];
  return (
    <dialog ref={dlg} aria-label={copy.gallery}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') onNext(); if (e.key === 'ArrowLeft') onPrev(); }}
      onClick={(e) => { if (e.target === dlg.current) onClose(); }}
      className="rooms-lightbox m-0 h-[100dvh] max-h-none w-screen max-w-none bg-deep/95 p-0 text-cream">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 md:px-8">
          <p className="font-display text-[24px] tabular-nums">{pad(index + 1)} <span className="text-cream/50">/ {pad(photos.length)}</span> <span className="ml-3 font-sans text-[13px] uppercase tracking-[.2em] text-gold">{p.label[lang]}</span></p>
          <button type="button" onClick={onClose} aria-label={copy.close} autoFocus className="grid h-11 w-11 place-items-center rounded-full border border-cream/25 hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-24" style={{ touchAction: 'pan-y' }}
          onPointerDown={(e) => { sx.current = e.clientX; }}
          onPointerUp={(e) => { if (sx.current === null) return; const dx = e.clientX - sx.current; sx.current = null; if (Math.abs(dx) > 50) (dx < 0 ? onNext() : onPrev()); }}>
          <div ref={img} className="max-h-full max-w-full">
            <img src={`${BASE}${p.id}.jpg`} alt={p.alt[lang]} width={p.w} height={p.h} className="max-h-[calc(100dvh-170px)] w-auto max-w-full rounded-[6px] object-contain" />
          </div>
          <button type="button" onClick={onPrev} aria-label={copy.prev} className="rg-arrow absolute left-8 top-1/2 hidden -translate-y-1/2 md:grid"><Arrow dir={-1} /></button>
          <button type="button" onClick={onNext} aria-label={copy.next} className="rg-arrow absolute right-8 top-1/2 hidden -translate-y-1/2 md:grid"><Arrow dir={1} /></button>
        </div>
        <div className="flex items-center justify-center gap-3 py-5 md:hidden">
          <button type="button" onClick={onPrev} aria-label={copy.prev} className="rg-arrow"><Arrow dir={-1} /></button>
          <span className="text-[12px] uppercase tracking-[.2em] text-cream/60">{copy.swipe}</span>
          <button type="button" onClick={onNext} aria-label={copy.next} className="rg-arrow"><Arrow dir={1} /></button>
        </div>
      </div>
    </dialog>
  );
}
