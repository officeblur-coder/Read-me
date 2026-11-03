import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { PHOTOS, type Copy, type Photo, type Season } from '../content/hero';
import { placePhotos, quad, type Placement } from '../lib/align';

export interface SeasonCompareHandle {
  goTo: (s: Season) => void;
}

interface Props {
  width: number;
  height: number;
  mobile: boolean;
  reduced: boolean;
  copy: Copy;
  onDominant: (s: Season) => void;
}

const BASE = `${import.meta.env.BASE_URL}images/`;

/** Curve shape of the divider, in fractions of the hero width. */
const CURVE = {
  desktop: { top: 0.03, ctrl: 0.045, bottom: -0.06, handleY: 0.49, edge: 64 },
  mobile: { top: 0.13, ctrl: 0.1, bottom: -0.3, handleY: 0.4, edge: 40 },
};

function PhotoLayer({ photo, place, priority }: { photo: Photo; place: Placement; priority?: boolean }) {
  const n = photo.name;
  return (
    <div className="js-zoom absolute inset-0 will-change-transform">
      <div className="js-intro absolute inset-0 will-change-transform">
        <div className="js-parallax absolute inset-0 will-change-transform">
          <picture>
            <source type="image/avif" srcSet={`${BASE}${n}-960.avif 960w, ${BASE}${n}-1600.avif 1600w`} sizes={`${Math.round(place.w)}px`} />
            <source type="image/webp" srcSet={`${BASE}${n}-960.webp 960w, ${BASE}${n}-1600.webp 1600w`} sizes={`${Math.round(place.w)}px`} />
            <img
              src={`${BASE}${n}.jpg`}
              alt={photo.alt}
              width={photo.w}
              height={photo.h}
              decoding="async"
              // @ts-expect-error fetchpriority is valid HTML, React 18 types lag behind
              fetchpriority={priority ? 'high' : 'auto'}
              loading={priority ? 'eager' : 'eager'}
              draggable={false}
              className="absolute left-0 top-0 max-w-none select-none"
              style={{ width: place.w, height: place.h, transform: `translate3d(${place.x}px, ${place.y}px, 0)` }}
            />
          </picture>
        </div>
      </div>
    </div>
  );
}

export const SeasonCompare = forwardRef<SeasonCompareHandle, Props>(function SeasonCompare(
  { width: W, height: H, mobile, reduced, copy, onDominant },
  ref,
) {
  const winterRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const hitRef = useRef<SVGPathElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const state = useRef({ p: 0.5 });
  const dominant = useRef<Season>('summer');
  const geo = mobile ? CURVE.mobile : CURVE.desktop;

  const [summerPlace, winterPlace] = useMemo(() => {
    if (!W || !H) return [null, null] as const;
    const anchor = mobile ? { x: 0.6, y: 0.4 } : { x: 0.66, y: 0.47 };
    return placePhotos(W, H, PHOTOS.summer, PHOTOS.winter, anchor, 1.05, mobile ? 1.0 : 1.08);
  }, [W, H, mobile]);

  // geometry helpers --------------------------------------------------------
  const margin = (Math.max(Math.abs(geo.top), Math.abs(geo.ctrl), Math.abs(geo.bottom)) * W) + 30;
  const handleOffset = quad(geo.top, geo.ctrl, geo.bottom, geo.handleY) * W;
  const pFromHandleX = useCallback((hx: number) => (hx - handleOffset + margin) / (W + 2 * margin), [handleOffset, margin, W]);
  const pMin = pFromHandleX(geo.edge);
  const pMax = pFromHandleX(W - geo.edge);

  const draw = useCallback(() => {
    if (!W || !H) return;
    const p = state.current.p;
    const X = -margin + p * (W + 2 * margin);
    const xt = X + geo.top * W, xc = X + geo.ctrl * W, xb = X + geo.bottom * W;
    const d = `M ${xt.toFixed(1)} -2 Q ${xc.toFixed(1)} ${(H / 2).toFixed(1)} ${xb.toFixed(1)} ${(H + 2).toFixed(1)}`;
    if (winterRef.current) {
      winterRef.current.style.clipPath = `path('${d} L ${W + 4} ${H + 2} L ${W + 4} -2 Z')`;
    }
    lineRef.current?.setAttribute('d', d);
    glowRef.current?.setAttribute('d', d);
    hitRef.current?.setAttribute('d', d);
    const hx = quad(xt, xc, xb, geo.handleY);
    if (handleRef.current) {
      handleRef.current.style.left = `${hx}px`;
      handleRef.current.style.top = `${geo.handleY * H}px`;
      handleRef.current.setAttribute('aria-valuenow', String(Math.round(((p - pMin) / (pMax - pMin)) * 100)));
    }
    const dom: Season = p >= 0.5 ? 'summer' : 'winter';
    if (dom !== dominant.current) { dominant.current = dom; onDominant(dom); }
  }, [W, H, margin, geo, pMin, pMax, onDominant]);

  useEffect(() => { draw(); }, [draw]);

  const tweenTo = useCallback((p: number, duration = 1.4) => {
    gsap.to(state.current, {
      p: Math.max(pMin, Math.min(pMax, p)),
      duration: reduced ? 0 : duration,
      ease: 'power3.inOut',
      overwrite: true,
      onUpdate: draw,
    });
  }, [pMin, pMax, reduced, draw]);

  useImperativeHandle(ref, () => ({
    goTo: (s) => tweenTo(s === 'summer' ? pMax : pMin),
  }), [tweenTo, pMin, pMax]);

  // dragging (mouse + touch) --------------------------------------------------
  const drag = useRef<{ x0: number; p0: number; id: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    gsap.killTweensOf(state.current);
    drag.current = { x0: e.clientX, p0: state.current.p, id: e.pointerId };
    handleRef.current?.classList.add('is-pressed');
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const p = d.p0 + (e.clientX - d.x0) / (W + 2 * margin);
    gsap.to(state.current, { p: Math.max(pMin, Math.min(pMax, p)), duration: reduced ? 0 : 0.35, ease: 'power3.out', overwrite: true, onUpdate: draw });
  };
  const onUp = (e: React.PointerEvent) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
    handleRef.current?.classList.remove('is-pressed');
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.15 : 0.05;
    const p = state.current.p;
    const map: Record<string, number> = { ArrowLeft: p - step, ArrowRight: p + step, Home: pMin, End: pMax };
    if (e.key in map) { e.preventDefault(); tweenTo(map[e.key], 0.6); }
  };

  const dragProps = { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp };

  return (
    <div className="absolute inset-0 overflow-hidden bg-charcoal">
      {summerPlace && winterPlace && (
        <>
          <div className="absolute inset-0"><PhotoLayer photo={PHOTOS.summer} place={summerPlace} priority /></div>
          <div ref={winterRef} className="absolute inset-0"><PhotoLayer photo={PHOTOS.winter} place={winterPlace} /></div>
        </>
      )}

      {/* legibility: soft vignette, never a flat dark wash */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_40%,transparent_40%,rgba(10,18,13,.45)_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[rgba(10,18,13,.85)] via-[rgba(10,18,13,.4)] to-transparent md:h-[45%]" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-[55%] bg-gradient-to-r from-[rgba(10,18,13,.55)] to-transparent md:block" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[rgba(10,18,13,.45)] to-transparent" />

      {/* divider */}
      <svg className="js-line absolute inset-0 z-10 h-full w-full overflow-visible" aria-hidden>
        <path ref={glowRef} fill="none" stroke="rgba(244,239,228,.35)" strokeWidth={6} style={{ filter: 'blur(4px)' }} />
        <path ref={lineRef} className="js-line-path" fill="none" stroke="#f4efe4" strokeWidth={1.5} />
        <path ref={hitRef} fill="none" stroke="transparent" strokeWidth={44} className="cursor-ew-resize" style={{ pointerEvents: 'stroke', touchAction: 'none' }} {...dragProps} />
      </svg>

      <button
        ref={handleRef}
        type="button"
        role="slider"
        aria-label={copy.compare}
        aria-description={copy.compareHint}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={50}
        aria-valuetext={`${copy.summer} / ${copy.winter}`}
        onKeyDown={onKey}
        {...dragProps}
        className="js-handle seam-handle absolute z-20 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full bg-ivory text-forest shadow-[0_10px_30px_rgba(0,0,0,.28)] outline-none ring-champagne/0 transition-[box-shadow,transform] duration-300 focus-visible:ring-4 focus-visible:ring-champagne/70 md:h-16 md:w-16"
        style={{ touchAction: 'none', left: '50%', top: '50%' }}
      >
        <svg width="26" height="16" viewBox="0 0 26 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M8 2 2 8l6 6M18 2l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
});
