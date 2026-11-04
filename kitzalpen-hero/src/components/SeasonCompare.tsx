import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { PHOTOS, PHOTOS_M, type Copy, type Photo, type Season } from '../content/hero';
import { placePhotos, quad, type Placement } from '../lib/align';

export interface SeasonCompareHandle {
  goTo: (s: Season) => void;
}

interface Props {
  /** season shown when the hero opens (divider fully on that side) */
  initial?: Season;
  width: number;
  height: number;
  mobile: boolean;
  reduced: boolean;
  copy: Copy;
  /** Which side is larger right now (drives the toggle). */
  onDominant: (s: Season) => void;
  /** Fired when the divider has fully arrived at one side (null while in between). */
  onSettle: (s: Season | null) => void;
}

const BASE = `${import.meta.env.BASE_URL}images/`;

/** Curve shape of the divider, in fractions of the hero width. */
const CURVE = {
  desktop: { top: 0.03, ctrl: 0.045, bottom: -0.06, handleY: 0.49, dock: 26 },
  mobile: { top: 0.13, ctrl: 0.1, bottom: -0.3, handleY: 0.4, dock: 28 },
};
/** Seconds for a full sweep from one side to the other. */
const SWEEP = 1.5;

function PhotoLayer({ photo, place, priority }: { photo: Photo; place: Placement; priority?: boolean }) {
  const n = photo.name;
  const set = (ext: string) => photo.sizes.map((s) => `${BASE}${n}-${s}.${ext} ${s}w`).join(', ');
  return (
    <div className="js-zoom absolute inset-0 will-change-transform">
      <div className="js-intro absolute inset-0 will-change-transform">
        <div className="js-parallax absolute inset-0 will-change-transform">
          <picture>
            <source type="image/avif" srcSet={set('avif')} sizes={`${Math.round(place.w)}px`} />
            <source type="image/webp" srcSet={set('webp')} sizes={`${Math.round(place.w)}px`} />
            <img
              src={`${BASE}${n}.jpg`}
              alt={photo.alt}
              width={photo.w}
              height={photo.h}
              decoding="async"
              // @ts-expect-error fetchpriority is valid HTML, React 18 types lag behind
              fetchpriority={priority ? 'high' : 'auto'}
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
  { width: W, height: H, mobile, reduced, copy, onDominant, onSettle, initial = 'summer' },
  ref,
) {
  const winterRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const hitRef = useRef<SVGPathElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const state = useRef({ p: initial === 'winter' ? 0 : 1 });           // 1 = all summer, 0 = all winter
  const dominant = useRef<Season>(initial);
  const settled = useRef<Season | null>(null);
  const geo = mobile ? CURVE.mobile : CURVE.desktop;

  const [summerPlace, winterPlace] = useMemo(() => {
    if (!W || !H) return [null, null] as const;
    const set = mobile ? PHOTOS_M : PHOTOS;
    const anchor = mobile ? { x: 0.5, y: 0.4 } : { x: 0.64, y: 0.56 };
    return placePhotos(W, H, set.summer, set.winter, anchor);
  }, [W, H, mobile]);

  // the whole curve leaves the frame at p = 0 / 1
  const margin = Math.max(Math.abs(geo.top), Math.abs(geo.ctrl), Math.abs(geo.bottom)) * W + 8;

  const draw = useCallback(() => {
    if (!W || !H) return;
    const p = state.current.p;
    const X = -margin + p * (W + 2 * margin);
    const xt = X + geo.top * W, xc = X + geo.ctrl * W, xb = X + geo.bottom * W;
    const d = `M ${xt.toFixed(1)} -2 Q ${xc.toFixed(1)} ${(H / 2).toFixed(1)} ${xb.toFixed(1)} ${(H + 2).toFixed(1)}`;
    if (winterRef.current) winterRef.current.style.clipPath = `path('${d} L ${W + 4} ${H + 2} L ${W + 4} -2 Z')`;
    lineRef.current?.setAttribute('d', d);
    glowRef.current?.setAttribute('d', d);
    hitRef.current?.setAttribute('d', d);

    // the handle rides the curve; at either end it docks against the frame edge
    const onCurve = quad(xt, xc, xb, geo.handleY);
    const hx = Math.max(geo.dock, Math.min(W - geo.dock, onCurve));
    const h = handleRef.current;
    if (h) {
      h.style.left = `${hx}px`;
      h.style.top = `${geo.handleY * H}px`;
      h.classList.toggle('docked', Math.abs(hx - onCurve) > 6);
      h.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    }
    const dom: Season = p >= 0.5 ? 'summer' : 'winter';
    if (dom !== dominant.current) { dominant.current = dom; onDominant(dom); }
    const st: Season | null = p >= 0.999 ? 'summer' : p <= 0.001 ? 'winter' : null;
    if (st !== settled.current) { settled.current = st; onSettle(st); }
  }, [W, H, margin, geo, onDominant, onSettle]);

  useEffect(() => { draw(); }, [draw]);

  const tweenTo = useCallback((p: number, duration?: number) => {
    const target = Math.max(0, Math.min(1, p));
    const dist = Math.abs(target - state.current.p);
    gsap.to(state.current, {
      p: target,
      duration: reduced ? 0 : duration ?? Math.max(0.6, SWEEP * Math.min(1, dist * 1.4)),
      ease: 'power3.inOut',
      overwrite: true,
      onUpdate: draw,
    });
  }, [reduced, draw]);

  useImperativeHandle(ref, () => ({ goTo: (s) => tweenTo(s === 'summer' ? 1 : 0) }), [tweenTo]);

  // dragging: follow the finger, then glide all the way to the side you pulled towards
  const drag = useRef<{ x0: number; p0: number; id: number; lastX: number; dir: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    gsap.killTweensOf(state.current);
    drag.current = { x0: e.clientX, p0: state.current.p, id: e.pointerId, lastX: e.clientX, dir: 0 };
    handleRef.current?.classList.add('is-pressed');
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (Math.abs(e.clientX - d.lastX) > 1) { d.dir = Math.sign(e.clientX - d.lastX); d.lastX = e.clientX; }
    const p = Math.max(0, Math.min(1, d.p0 + (e.clientX - d.x0) / (W + 2 * margin)));
    gsap.to(state.current, { p, duration: reduced ? 0 : 0.3, ease: 'power3.out', overwrite: true, onUpdate: draw });
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    handleRef.current?.classList.remove('is-pressed');
    const moved = e.clientX - d.x0;
    if (Math.abs(moved) < 12) { tweenTo(d.p0, 0.5); return; }          // a tap, not a drag
    const dir = d.dir || Math.sign(moved);
    tweenTo(dir > 0 ? 1 : 0);                                          // right → summer, left → winter
  };
  const onKey = (e: React.KeyboardEvent) => {
    const map: Record<string, number> = { ArrowLeft: 0, ArrowRight: 1, Home: 0, End: 1, PageDown: 0, PageUp: 1 };
    if (e.key in map) { e.preventDefault(); tweenTo(map[e.key]); }
  };
  const dragProps = { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp };

  return (
    <div className="absolute inset-0 overflow-hidden bg-charcoal">
      {summerPlace && winterPlace && (
        <>
          <div className="absolute inset-0"><PhotoLayer photo={(mobile ? PHOTOS_M : PHOTOS).summer} place={summerPlace} priority /></div>
          <div ref={winterRef} className="absolute inset-0"><PhotoLayer photo={(mobile ? PHOTOS_M : PHOTOS).winter} place={winterPlace} /></div>
        </>
      )}

      {/* legibility: soft vignette and gradients, never a flat dark wash */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_40%,transparent_40%,rgba(10,18,13,.45)_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[rgba(10,18,13,.85)] via-[rgba(10,18,13,.4)] to-transparent md:h-[45%]" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-[55%] bg-gradient-to-r from-[rgba(10,18,13,.55)] to-transparent md:block" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[rgba(10,18,13,.45)] to-transparent" />

      <svg className="js-line absolute inset-0 z-10 h-full w-full overflow-visible" aria-hidden>
        <path ref={glowRef} fill="none" stroke="rgba(244,239,228,.35)" strokeWidth={6} style={{ filter: 'blur(4px)' }} />
        <path ref={lineRef} className="js-line-path" fill="none" stroke="#f4efe4" strokeWidth={1.5} />
        <path ref={hitRef} fill="none" stroke="transparent" strokeWidth={44} className="cursor-ew-resize" style={{ pointerEvents: 'stroke', touchAction: 'none' }} {...dragProps} />
      </svg>

      <span id="seam-hint" className="sr-only">{copy.compareHint}</span>
      <button
        ref={handleRef}
        type="button"
        role="slider"
        aria-label={copy.compare}
        aria-describedby="seam-hint"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={50}
        aria-valuetext={`${copy.summer} / ${copy.winter}`}
        onKeyDown={onKey}
        {...dragProps}
        className="js-handle seam-handle absolute z-20 grid h-16 w-16 cursor-ew-resize place-items-center rounded-full outline-none [translate:-50%_-50%] focus-visible:[&>span]:ring-4 focus-visible:[&>span]:ring-champagne/70"
        style={{ touchAction: 'none', left: '50%', top: '50%' }}
      >
        <span className="seam-disc grid h-14 w-14 place-items-center rounded-full bg-ivory text-forest shadow-[0_10px_30px_rgba(0,0,0,.28)] md:h-16 md:w-16">
          <svg width="26" height="16" viewBox="0 0 26 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M8 2 2 8l6 6M18 2l6 6-6 6" />
          </svg>
        </span>
      </button>
    </div>
  );
});
