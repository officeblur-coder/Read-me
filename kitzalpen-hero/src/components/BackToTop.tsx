import { useEffect, useRef, useState } from 'react';
import type { Lang } from '../content/hero';

/** Round "back to top" button with a scroll-progress ring; appears after the first screen. */
export function BackToTop({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const [show, setShow] = useState(false);
  const ring = useRef<SVGCircleElement>(null);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? window.scrollY / max : 0;
        setShow(window.scrollY > window.innerHeight * 0.8);
        if (ring.current) ring.current.style.strokeDashoffset = String(1 - p);
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, []);
  return (
    <button type="button" aria-label={lang === 'de' ? 'Nach oben' : 'Back to top'} tabIndex={show ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}
      className={`to-top fixed z-40 grid h-12 w-12 place-items-center rounded-full ${show ? 'is-on' : ''}`}>
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth="2" />
        <circle ref={ring} cx="24" cy="24" r="22" fill="none" stroke="var(--k-gold-light)" strokeWidth="2" pathLength={1} strokeDasharray="1" strokeDashoffset="1" strokeLinecap="round" />
      </svg>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M6 11l6-6 6 6" /></svg>
    </button>
  );
}
