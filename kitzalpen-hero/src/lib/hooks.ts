import { useEffect, useState, type RefObject } from 'react';
import gsap from 'gsap';

const mq = (q: string) => (typeof window !== 'undefined' ? window.matchMedia(q) : null);

function useMedia(query: string) {
  const [match, setMatch] = useState(() => !!mq(query)?.matches);
  useEffect(() => {
    const m = mq(query);
    if (!m) return;
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');
/** Desktop-class pointer: mouse or trackpad, hover capable. */
export const useFinePointer = () => useMedia('(hover: hover) and (pointer: fine)');
export const useIsMobile = () => useMedia('(max-width: 767px)');

/** Very subtle magnetic pull for buttons (desktop only, max ~6px). */
export function useMagnetic(ref: RefObject<HTMLElement | null>, enabled: boolean, strength = 0.18, max = 6) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * strength;
      const dy = (e.clientY - (r.top + r.height / 2)) * strength;
      xTo(Math.max(-max, Math.min(max, dx)));
      yTo(Math.max(-max, Math.min(max, dy)));
    };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); gsap.set(el, { x: 0, y: 0 }); };
  }, [ref, enabled, strength, max]);
}

/** Size of an element, updated on resize. */
export function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((s) => (Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
