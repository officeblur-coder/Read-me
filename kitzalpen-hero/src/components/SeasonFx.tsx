import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { Season } from '../content/hero';

interface Props { mode: Season | null; mobile: boolean; reduced: boolean }

/**
 * Atmosphere that answers the visitor's choice:
 *  winter → snow starts falling, softly, at three depths
 *  summer → a low sun fades in over the sky, with warm light
 * Leaving a season lets the snow fall out naturally / fades the sun away.
 */
export function SeasonFx({ mode, mobile, reduced }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sun = useRef<HTMLDivElement>(null);
  const warm = useRef<HTMLDivElement>(null);
  const cool = useRef<HTMLDivElement>(null);
  const snowing = useRef(false);

  // ---------------------------------------------------------------- snow
  useEffect(() => {
    const c = canvas.current;
    if (!c || reduced) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let W = 0, H = 0, dpr = 1, raf = 0, last = performance.now(), alive = true;

    const sprite = (() => {
      const s = document.createElement('canvas'); s.width = s.height = 64;
      const g = s.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return s;
    })();

    type F = { x: number; y: number; r: number; vy: number; amp: number; ph: number; f: number; a: number; on: boolean };
    let flakes: F[] = [];
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = c.clientWidth; H = c.clientHeight;
      c.width = W * dpr; c.height = H * dpr;
      const n = Math.round(Math.min(mobile ? 90 : 170, (W * H) / (mobile ? 3800 : 9000)));
      // keep snowing through resizes (the first ResizeObserver call comes right after the snow starts)
      flakes = Array.from({ length: n }, () => spawn(true, snowing.current));
      if (snowing.current && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    const spawn = (anywhere: boolean, on: boolean): F => {
      const depth = Math.random();                       // 0 far … 1 near
      return {
        x: Math.random() * W, y: anywhere ? Math.random() * H : -10 - Math.random() * H * 0.3,
        r: 1.1 + depth * depth * (mobile ? 3.6 : 5),
        vy: 22 + depth * 70,                             // px / s
        amp: 6 + depth * 22, ph: Math.random() * Math.PI * 2, f: 0.4 + Math.random() * 0.6,
        a: 0.45 + depth * 0.55, on,
      };
    };
    const tick = (t: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      let visible = 0;
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        if (!f.on) continue;
        f.y += f.vy * dt;
        f.ph += f.f * dt;
        const x = f.x + Math.sin(f.ph) * f.amp + (t / 1000) * 6;  // a breath of wind
        if (f.y > H + 12) { flakes[i] = spawn(false, snowing.current); continue; }
        const xx = ((x % (W + 20)) + W + 20) % (W + 20) - 10;
        ctx.globalAlpha = f.a;
        const s = f.r * 2.4;
        ctx.drawImage(sprite, xx - s / 2, f.y - s / 2, s, s);
        visible++;
      }
      ctx.globalAlpha = 1;
      // keep the loop alive only while there is something to draw
      if (snowing.current || visible) raf = requestAnimationFrame(tick); else raf = 0;
    };
    const start = () => {
      flakes.forEach((f, i) => { if (!f.on) { flakes[i] = spawn(false, true); flakes[i].y = -10 - Math.random() * H; } });
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(c);
    (c as HTMLCanvasElement & { __start?: () => void }).__start = start;
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); };
  }, [mobile, reduced]);

  // ---------------------------------------------------------------- react to mode
  useEffect(() => {
    const winter = mode === 'winter', summer = mode === 'summer';
    snowing.current = winter && !reduced;
    if (snowing.current) (canvas.current as (HTMLCanvasElement & { __start?: () => void }) | null)?.__start?.();

    const d = reduced ? 0 : 1;
    gsap.to(canvas.current, { opacity: winter ? 1 : 0, duration: (winter ? 0.4 : 1.4) * d, ease: 'power1.out', overwrite: true });
    gsap.to(cool.current, { autoAlpha: winter ? 1 : 0, duration: 1.6 * d, ease: 'power2.out', overwrite: true });
    gsap.to(warm.current, { autoAlpha: summer ? 1 : 0, duration: 2 * d, ease: 'power2.out', overwrite: true });
    if (summer) {
      gsap.fromTo(sun.current, { autoAlpha: 0, scale: 0.82, y: 24 }, { autoAlpha: 1, scale: 1, y: 0, duration: 2.2 * d, ease: 'power2.out', overwrite: true });
    } else {
      gsap.to(sun.current, { autoAlpha: 0, scale: 0.94, duration: 1.1 * d, ease: 'power2.in', overwrite: true });
    }
  }, [mode, reduced]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {/* winter: a cooler, quieter light */}
      <div ref={cool} className="invisible absolute inset-0 opacity-0 mix-blend-soft-light" style={{ background: 'linear-gradient(180deg, rgba(170,195,230,.16), rgba(140,165,210,.06))' }} />
      {/* summer: warm late-afternoon light falling in from the sun */}
      <div ref={warm} className="invisible absolute inset-0 opacity-0 mix-blend-screen" style={{ background: `radial-gradient(80% 65% at ${mobile ? '30% 9%' : '33% 12%'}, rgba(255,210,150,.30), rgba(255,190,120,.10) 40%, transparent 68%)` }} />
      <div
        ref={sun}
        className="invisible absolute opacity-0"
        style={{ left: mobile ? '30%' : '33%', top: mobile ? '9%' : '12%', width: 0, height: 0 }}
      >
        {/* wide bloom */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen" style={{ width: mobile ? 520 : 820, height: mobile ? 520 : 820, background: 'radial-gradient(circle, rgba(255,232,190,.42) 0%, rgba(255,214,160,.18) 22%, rgba(255,200,140,.06) 42%, transparent 62%)' }} />
        {/* very faint rays */}
        <div className="sun-rays absolute -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen" style={{ width: mobile ? 560 : 900, height: mobile ? 560 : 900 }} />
        {/* blown-out core, like a lens looking into the sun */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen" style={{ width: mobile ? 150 : 210, height: mobile ? 150 : 210, background: 'radial-gradient(circle, rgba(255,253,245,1) 0%, rgba(255,246,222,.9) 14%, rgba(255,232,190,.45) 34%, rgba(255,220,170,.12) 58%, transparent 72%)' }} />
      </div>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
