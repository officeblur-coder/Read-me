import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import type { Lang } from '../../content/hero';
import type { ChaletCopy, ChaletPhoto } from '../../content/chalet';
import { ChaletPic, SeasonalImageTransition } from './SeasonalImageTransition';

gsap.registerPlugin(CustomEase);
const EASE = CustomEase.create('kzChalet', '0.22,1,0.36,1');
const BASE = `${import.meta.env.BASE_URL}images/chalet/`;
const pad = (n: number) => String(n).padStart(2, '0');

const Chevron = ({ dir }: { dir: 1 | -1 }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={dir > 0 ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'} />
  </svg>
);

interface Props { photos: ChaletPhoto[]; copy: ChaletCopy; lang: Lang; fine: boolean; reduced: boolean }

/** photos[0] = winter, photos[1] = summer – slide 0 is the scroll-driven summer→winter transition. */
export function ChaletGallery({ photos, copy, lang, fine, reduced }: Props) {
  const n = photos.length;
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState(false);
  const cur = useRef(0);
  const busy = useRef(false);
  const frame = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const thumbs = useRef<HTMLDivElement>(null);
  const viewCursor = useRef<HTMLDivElement>(null);
  const dur = reduced ? 0 : 0.8;

  useEffect(() => {
    slides.current.forEach((s, i) => s && gsap.set(s, { clipPath: i === 0 ? 'inset(0% 0% 0% 0%)' : 'inset(0% 0% 0% 100%)', zIndex: i === 0 ? 2 : 1 }));
  }, []);

  /** cinematic wipe: the next photo is uncovered from the side you travel to, settling from 1.06 */
  const go = useCallback((to: number, dirHint?: 1 | -1) => {
    const from = cur.current, target = (to + n) % n;
    if (target === from || busy.current) return;
    const dir = dirHint ?? (target > from ? 1 : -1);
    const a = slides.current[from], b = slides.current[target];
    if (!a || !b) return;
    busy.current = !reduced;
    cur.current = target;
    setIndex(target);
    slides.current.forEach((s, i) => s && gsap.set(s, { zIndex: i === target ? 3 : i === from ? 2 : 1 }));
    const start = dir > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)';
    gsap.fromTo(b, { clipPath: start }, { clipPath: 'inset(0% 0% 0% 0%)', duration: dur, ease: EASE, onComplete: () => {
      busy.current = false;
      slides.current.forEach((s, i) => s && i !== target && gsap.set(s, { clipPath: 'inset(0% 0% 0% 100%)' }));
    } });
    gsap.fromTo(b.querySelector('.js-cg-inner'), { scale: 1.06 }, { scale: 1, duration: dur * 1.3, ease: EASE });
    gsap.fromTo(a.querySelector('.js-cg-inner'), { scale: 1, xPercent: 0 }, { scale: 1.03, xPercent: -dir * 4, duration: dur, ease: EASE, clearProps: 'transform' });
    if (thumbs.current) gsap.fromTo(thumbs.current.children, { autoAlpha: 0.4, y: 6 }, { autoAlpha: 1, y: 0, duration: reduced ? 0 : 0.5, stagger: 0.06, ease: EASE });
  }, [n, dur, reduced]);
  const next = useCallback(() => go(cur.current + 1, 1), [go]);
  const prev = useCallback(() => go(cur.current - 1, -1), [go]);

  // swipe with feedback
  const sw = useRef<{ x0: number; y0: number; id: number; dx: number; lock: boolean | null } | null>(null);
  const suppress = useRef(false);
  const onDown = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') sw.current = { x0: e.clientX, y0: e.clientY, id: e.pointerId, dx: 0, lock: null }; };
  const onMove = (e: React.PointerEvent) => {
    const s = sw.current; if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (s.lock === null && Math.hypot(dx, dy) > 8) s.lock = Math.abs(dx) > Math.abs(dy);
    if (!s.lock) return;
    s.dx = dx;
    const inner = slides.current[cur.current]?.querySelector('.js-cg-inner');
    if (inner) gsap.set(inner, { x: dx * 0.35 });
  };
  const onUp = (e: React.PointerEvent) => {
    const s = sw.current; if (!s || s.id !== e.pointerId) return;
    sw.current = null;
    if (s.lock) suppress.current = true;
    const inner = slides.current[cur.current]?.querySelector('.js-cg-inner');
    if (inner) gsap.to(inner, { x: 0, duration: 0.5, ease: EASE });
    if (s.lock && Math.abs(s.dx) > 50) (s.dx < 0 ? next() : prev());
  };

  // discreet "view" cursor on desktop
  useEffect(() => {
    const f = frame.current, c = viewCursor.current;
    if (!f || !c || !fine) return;
    const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3.out' });
    const yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = f.getBoundingClientRect(); xTo(e.clientX - r.left); yTo(e.clientY - r.top);
      const onCtl = (e.target as Element).closest('button');
      gsap.to(c, { autoAlpha: onCtl ? 0 : 1, scale: onCtl ? 0.6 : 1, duration: 0.25, overwrite: 'auto' });
    };
    const enter = (e: PointerEvent) => { const r = f.getBoundingClientRect(); gsap.set(c, { x: e.clientX - r.left, y: e.clientY - r.top }); };
    const leave = () => gsap.to(c, { autoAlpha: 0, scale: 0.6, duration: 0.25, overwrite: 'auto' });
    f.addEventListener('pointermove', move); f.addEventListener('pointerenter', enter); f.addEventListener('pointerleave', leave);
    return () => { f.removeEventListener('pointermove', move); f.removeEventListener('pointerenter', enter); f.removeEventListener('pointerleave', leave); };
  }, [fine]);

  const p = photos[index];
  const others = photos.map((_, i) => i).filter((i) => i !== index);

  return (
    <div role="region" aria-roledescription="carousel" aria-label={copy.gallery}>
      <div className="js-cg-mask relative overflow-hidden rounded-[18px] shadow-[0_30px_70px_-34px_color-mix(in_srgb,var(--k-deep)_55%,transparent)]">
        <div
          ref={frame}
          tabIndex={0}
          role="group"
          aria-roledescription="slide"
          aria-label={`${copy.photo(index + 1, n, p.label[lang])}. ${copy.open}`}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBox(true); }
          }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onClick={(e) => { if ((e.target as Element).closest('button')) return; if (suppress.current) { suppress.current = false; return; } setBox(true); }}
          className={`js-cg-zoom group relative aspect-[4/3] w-full overflow-hidden bg-pine/15 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold sm:aspect-[3/2] ${fine ? 'cursor-none' : 'cursor-pointer'}`}
          style={{ touchAction: 'pan-y' }}
        >
          {photos.map((ph, i) => (
            <div key={ph.id} ref={(el) => (slides.current[i] = el)} className="absolute inset-0" aria-hidden={i !== index}>
              <div className="js-cg-inner absolute inset-0 will-change-transform">
                <div className="absolute inset-0 transition-transform duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.025]">
                  {i === 0
                    ? <SeasonalImageTransition winter={photos[0]} summer={photos[1]} lang={lang} labels={copy.season} reduced={reduced} />
                    : <ChaletPic p={ph} lang={lang} sizes="(min-width:1024px) 58vw, 100vw" />}
                </div>
              </div>
            </div>
          ))}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-24 bg-gradient-to-t from-[color-mix(in_srgb,var(--k-deep)_50%,transparent)] to-transparent" />

          <button type="button" onClick={prev} aria-label={copy.prev} className="cg-arrow left-3 md:left-5"><Chevron dir={-1} /></button>
          <button type="button" onClick={next} aria-label={copy.next} className="cg-arrow right-3 md:right-5"><Chevron dir={1} /></button>

          {/* dots + counter */}
          <div className="absolute inset-x-0 bottom-3 z-[5] flex items-center justify-center md:bottom-5">
            <div className="flex items-center gap-2 rounded-full bg-deep/45 px-3 py-2 backdrop-blur-sm">
              {photos.map((ph, i) => (
                <button key={ph.id} type="button" onClick={() => go(i)} aria-label={copy.photo(i + 1, n, ph.label[lang])} aria-current={i === index}
                  className={`cg-dot ${i === index ? 'is-on' : ''}`} />
              ))}
            </div>
          </div>
          <p className="pointer-events-none absolute bottom-4 right-4 z-[5] font-display text-[18px] tabular-nums text-cream md:bottom-6 md:right-6 md:text-[22px]" aria-hidden>
            {pad(index + 1)} <span className="text-cream/60">/ {pad(n)}</span>
          </p>

          {fine && (
            <div ref={viewCursor} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 z-[6] -ml-10 -mt-10 grid h-20 w-20 scale-75 place-items-center rounded-full bg-cream/95 text-[10.5px] font-semibold uppercase tracking-[.22em] text-pine opacity-0">
              {copy.view}
            </div>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{copy.photo(index + 1, n, p.label[lang])}</p>

      {/* the other photos */}
      <div ref={thumbs} role="group" aria-label={copy.thumbs} className="mt-4 hidden grid-cols-2 gap-4 sm:grid md:mt-5 md:gap-5">
        {others.map((i) => (
          <button key={photos[i].id} type="button" onClick={() => go(i, i > index ? 1 : -1)} aria-label={copy.photo(i + 1, n, photos[i].label[lang])}
            className="js-cg-thumb cg-thumb group/t relative aspect-[16/9] overflow-hidden rounded-[14px]">
            <ChaletPic p={photos[i]} lang={lang} sizes="(min-width:1024px) 28vw, 45vw" className="transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover/t:scale-[1.04]" />
            <span className="absolute left-3 top-3 rounded-full bg-deep/55 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[.2em] text-cream backdrop-blur-sm">{photos[i].label[lang]}</span>
          </button>
        ))}
      </div>

      <ChaletLightbox open={box} onClose={() => { setBox(false); frame.current?.focus({ preventScroll: true }); }} photos={photos} index={index} onPrev={prev} onNext={next} copy={copy} lang={lang} reduced={reduced} />
    </div>
  );
}

function ChaletLightbox({ open, onClose, photos, index, onPrev, onNext, copy, lang, reduced }: {
  open: boolean; onClose: () => void; photos: ChaletPhoto[]; index: number; onPrev: () => void; onNext: () => void; copy: ChaletCopy; lang: Lang; reduced: boolean;
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
  const set = (ext: string) => p.sizes.map((s) => `${BASE}${p.id}-${s}.${ext} ${s}w`).join(', ');
  return (
    <dialog ref={dlg} aria-label={copy.gallery}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') onNext(); if (e.key === 'ArrowLeft') onPrev(); }}
      onClick={(e) => { if (e.target === dlg.current) onClose(); }}
      className="rooms-lightbox m-0 h-[100dvh] max-h-none w-screen max-w-none bg-deep/95 p-0 text-cream">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 md:px-8">
          <p className="font-display text-[24px] tabular-nums">{pad(index + 1)} <span className="text-cream/50">/ {pad(photos.length)}</span> <span className="ml-3 text-[14px] font-sans uppercase tracking-[.2em] text-gold">{p.label[lang]}</span></p>
          <button type="button" onClick={onClose} aria-label={copy.close} autoFocus className="grid h-11 w-11 place-items-center rounded-full border border-cream/25 hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-24" style={{ touchAction: 'pan-y' }}
          onPointerDown={(e) => { sx.current = e.clientX; }}
          onPointerUp={(e) => { if (sx.current === null) return; const dx = e.clientX - sx.current; sx.current = null; if (Math.abs(dx) > 50) (dx < 0 ? onNext() : onPrev()); }}>
          <div ref={img} className="max-h-full max-w-full">
            <picture>
              <source type="image/avif" srcSet={set('avif')} sizes="100vw" />
              <source type="image/webp" srcSet={set('webp')} sizes="100vw" />
              <img src={`${BASE}${p.id}.jpg`} alt={p.alt[lang]} width={p.w} height={p.h} className="max-h-[calc(100dvh-170px)] w-auto max-w-full rounded-[6px] object-contain" />
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
