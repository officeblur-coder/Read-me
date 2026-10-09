/** Small UI effects: the dish photo flies into the cart, a light haptic tap, confetti. */
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function haptic(ms = 12) { try { navigator.vibrate?.(ms); } catch { /* not supported */ } }

export function flyToCart(from: Element | null) {
  if (!from || reduced()) return;
  const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]")).filter(el => el.offsetParent !== null);
  const to = targets[0]; if (!to) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const src = from instanceof HTMLImageElement ? from.src : from.querySelector("img")?.src;
  if (!src) return;
  const img = document.createElement("img");
  img.src = src;
  Object.assign(img.style, { position: "fixed", left: a.left + "px", top: a.top + "px", width: a.width + "px", height: a.height + "px",
    objectFit: "cover", borderRadius: "18px", zIndex: "999", pointerEvents: "none", boxShadow: "0 20px 40px -10px rgba(0,0,0,.4)" });
  document.body.appendChild(img);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = img.animate([
    { transform: "translate(0,0) scale(1)", opacity: 1, borderRadius: "18px" },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(.45)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: 0.4, borderRadius: "50%" },
  ], { duration: 720, easing: "cubic-bezier(.5,0,.2,1)" });
  anim.onfinish = () => { img.remove(); to.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 380, easing: "cubic-bezier(.2,1.6,.4,1)" }); };
}

export function confetti() {
  if (reduced()) return;
  const c = document.createElement("canvas");
  Object.assign(c.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "999" });
  c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
  document.body.appendChild(c);
  const ctx = c.getContext("2d")!; ctx.scale(devicePixelRatio, devicePixelRatio);
  const colors = ["#ee4a28", "#ff9a4a", "#f5a524", "#14a06b", "#1f1712", "#ffd99a"];
  const parts = Array.from({ length: 160 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    s: 6 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[(Math.random() * colors.length) | 0],
  }));
  let t = 0;
  const step = () => {
    t++; ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - t / 160);
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    }
    if (t < 160) requestAnimationFrame(step); else c.remove();
  };
  requestAnimationFrame(step);
}
