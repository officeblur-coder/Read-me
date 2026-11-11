import type { Photo } from '../content/hero';

export interface Placement { s: number; x: number; y: number; w: number; h: number }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Places both photographs so the same architectural point (top-left corner of
 * the upper balcony) lands on the same screen pixel, at the same building size.
 *
 * 1. Scales: both must cover the frame; the building must be equally tall in
 *    both. The larger requirement wins, capped by `maxUp` × cover so neither
 *    photo is blown up into blur (if capped, sizes differ slightly – no warping).
 * 2. Position: each photo can only slide so far before an edge shows. We
 *    intersect the allowed ranges of both and put the landmark as close to the
 *    wished anchor as that intersection allows.
 */
export function placePhotos(
  vw: number,
  vh: number,
  a: Photo,
  b: Photo,
  anchor: { x: number; y: number },
  overscan = 1.04,
  maxUp = 1.4,
): [Placement, Placement] {
  const cover = (p: Photo) => Math.max(vw / p.w, vh / p.h) * overscan;
  // building height in source pixels
  const ha = a.h * a.bh, hb = b.h * b.bh;
  // equal building height on screen: sa*ha = sb*hb
  let sa = Math.max(cover(a), cover(b) * hb / ha);
  sa = Math.min(sa, cover(a) * maxUp);
  const sb = Math.max(cover(b), Math.min(sa * ha / hb, cover(b) * maxUp));

  const range = (p: Photo, s: number, axis: 'x' | 'y') => {
    const size = (axis === 'x' ? p.w : p.h) * s;
    const view = axis === 'x' ? vw : vh;
    const l = (axis === 'x' ? p.lx : p.ly) * size;
    return [view - size + l, l] as const; // possible screen positions of the landmark
  };
  const pick = (axis: 'x' | 'y', want: number) => {
    const [a0, a1] = range(a, sa, axis), [b0, b1] = range(b, sb, axis);
    const lo = Math.max(a0, b0), hi = Math.min(a1, b1);
    return lo <= hi ? clamp(want, lo, hi) : (lo + hi) / 2;
  };
  const X = pick('x', anchor.x * vw), Y = pick('y', anchor.y * vh);

  const place = (p: Photo, s: number): Placement => {
    const w = p.w * s, h = p.h * s;
    return { s, w, h, x: clamp(X - p.lx * w, vw - w, 0), y: clamp(Y - p.ly * h, vh - h, 0) };
  };
  return [place(a, sa), place(b, sb)];
}

/** Point on a quadratic curve P0-C-P1 at parameter t. */
export const quad = (p0: number, c: number, p1: number, t: number) =>
  (1 - t) * (1 - t) * p0 + 2 * t * (1 - t) * c + t * t * p1;
