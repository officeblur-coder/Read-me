import type { Photo } from '../content/hero';

export interface Placement { s: number; x: number; y: number; w: number; h: number }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Places both photographs so the building lands on the same screen point.
 * The base photo is "cover"-scaled; the other one is scaled towards the same
 * building height but never more than `maxRelScale` (to avoid upscaling blur),
 * and never below cover. Both are clamped so they always fill the frame –
 * if perspectives differ we accept a small offset instead of distorting.
 */
export function placePhotos(
  vw: number,
  vh: number,
  base: Photo,
  other: Photo,
  anchor: { x: number; y: number },
  overscan = 1.05,
  maxRelScale = 1.22,
): [Placement, Placement] {
  const fit = (p: Photo, s: number, ax: number, ay: number): Placement => {
    const w = p.w * s, h = p.h * s;
    const x = clamp(ax - p.lx * w, vw - w, 0);
    const y = clamp(ay - p.ly * h, vh - h, 0);
    return { s, x, y, w, h };
  };
  const cover = (p: Photo) => Math.max(vw / p.w, vh / p.h) * overscan;

  const a = fit(base, cover(base), anchor.x * vw, anchor.y * vh);
  // where the base landmark actually ended up after clamping
  const lx = a.x + base.lx * a.w, ly = a.y + base.ly * a.h;

  const ideal = a.s * (base.h * base.bh) / (other.h * other.bh);
  const s2 = Math.max(cover(other), Math.min(ideal, a.s * maxRelScale));
  const b = fit(other, s2, lx, ly);
  return [a, b];
}

/** Point on a quadratic curve P0-C-P1 at parameter t. */
export const quad = (p0: number, c: number, p1: number, t: number) =>
  (1 - t) * (1 - t) * p0 + 2 * t * (1 - t) * c + t * t * p1;
