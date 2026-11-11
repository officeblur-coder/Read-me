import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang, Season } from '../../content/hero';
import { STORIES, STORIES_COPY, TRUST, type Story } from '../../content/stories';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { useSeason } from '../../lib/season';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const IMG = `${import.meta.env.BASE_URL}images/stories/`;
const n = STORIES.length;
const wrap = (i: number) => ((i % n) + n) % n;

const Star = ({ on }: { on: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden className={on ? 'text-gold-dark' : 'text-ink/20'} fill="currentColor"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8Z" /></svg>
);
const Platform = ({ p }: { p: Story['platform'] }) => (
  <span className="story-plat grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold" aria-hidden>
    {p === 'Google' ? 'G' : p === 'Booking.com' ? 'B.' : (
      <svg width="20" height="14" viewBox="0 0 30 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="11" r="5" /><circle cx="22" cy="11" r="5" /><circle cx="8" cy="11" r="1.4" fill="currentColor" /><circle cx="22" cy="11" r="1.4" fill="currentColor" /><path d="M3 5c3-2 7-3 12-3s9 1 12 3" /></svg>
    )}
  </span>
);
const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2);

function Card({ s, lang, active }: { s: Story; lang: Lang; active?: boolean }) {
  const c = STORIES_COPY[lang];
  return (
    <article className={`story-card flex h-full flex-col overflow-hidden rounded-[22px] ${active ? 'is-active' : ''}`} aria-label={`${s.author}, ${s.platform}`}>
      <div className="story-photo relative aspect-[16/9] overflow-hidden bg-pine/10">
        <picture>
          <source type="image/avif" srcSet={`${IMG}${s.photo}.avif`} />
          <source type="image/webp" srcSet={`${IMG}${s.photo}.webp`} />
          <img src={`${IMG}${s.photo}.jpg`} alt={s.photoAlt[lang]} width={900} height={506} loading="lazy" decoding="async" className="h-full w-full object-cover" draggable={false} />
        </picture>
        <span aria-hidden className="story-mark absolute -bottom-5 left-1/2 grid h-11 w-11 -translate-x-1/2 place-items-center rounded-full font-display text-[30px] leading-none">“</span>
      </div>
      <div className="flex flex-1 flex-col px-6 pb-6 pt-8 text-center md:px-7">
        <div className="flex justify-center gap-1" role="img" aria-label={c.stars(s.stars)}>{[1, 2, 3, 4, 5].map((k) => <Star key={k} on={k <= s.stars} />)}</div>
        <blockquote lang="de" className="mt-4 flex-1 font-display text-[19px] italic leading-[1.45] text-ink md:text-[21px]">„{s.quote}“</blockquote>
        {c.origLang && <p className="mt-2 text-[11.5px] uppercase tracking-[.14em] text-ink/45">{c.origLang}</p>}
        <footer className="mt-5 flex items-center gap-3 border-t border-pine/10 pt-4 text-left">
          <span className="story-avatar grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold" aria-hidden>{initials(s.author)}</span>
          <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold text-ink">{s.author}</p><p className="text-[12.5px] text-ink/60">{c.via} {s.platform}</p></div>
          <Platform p={s.platform} />
        </footer>
      </div>
    </article>
  );
}

export function GuestStoriesSection({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const deck = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const { season } = useSeason();
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  // below lg the deck is replaced by a swipe strip (phones and tablets)
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  useEffect(() => { const m = window.matchMedia('(max-width: 1023px)'); const on = () => setMobile(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on); }, []);
  const [active, setActive] = useState(1);   // centre card
  const c = STORIES_COPY[lang];

  // ---------------- A) entrance
  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.set(q('.js-st-eyebrow, .js-st-sub, .js-st-progress, .js-st-trust'), { autoAlpha: 0, y: 20 });
    gsap.set(q('.js-st-line'), { yPercent: 110 });
    gsap.set(q('.js-st-in'), { autoAlpha: 0, y: 50 });
    ScrollTrigger.create({ trigger: root.current, start: 'top 70%', once: true, onEnter: () => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .to(q('.js-st-eyebrow'), { autoAlpha: 1, y: 0, duration: 0.6 }, 0)
        .to(q('.js-st-line'), { yPercent: 0, duration: 0.9, stagger: 0.12, ease: 'power4.out' }, 0.1)
        .to(q('.js-st-sub'), { autoAlpha: 1, y: 0, duration: 0.7 }, 0.45)
        .to(q('.js-st-in'), { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 }, 0.55)
        .to(q('.js-st-progress, .js-st-trust'), { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, 1.1);
    } });
    // E) parallax on the background photo (desktop)
    if (fine) gsap.fromTo(q('.js-st-bg'), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
  }, { scope: root, dependencies: [reduced, fine] });

  // ---------------- B) desktop deck: place cards by their offset from the active one
  const layout = useCallback((instant = false) => {
    const d = deck.current; if (!d || mobile) return;
    const cards = Array.from(d.querySelectorAll<HTMLElement>('.js-st-slot'));
    const w = d.clientWidth;
    const gap = Math.min(380, w * 0.34);
    cards.forEach((el, i) => {
      let off = wrap(i - active); if (off > n / 2) off -= n;
      gsap.to(el, {
        x: off * gap, scale: off === 0 ? 1 : 0.95, autoAlpha: Math.abs(off) <= 1 ? (off === 0 ? 1 : 0.88) : 0,
        zIndex: off === 0 ? 3 : 2, duration: instant || reduced ? 0 : 0.6, ease: 'power2.inOut', overwrite: 'auto',
      });
      el.classList.toggle('is-center', off === 0);
      el.setAttribute('aria-hidden', String(Math.abs(off) > 1));
    });
  }, [active, mobile, reduced]);
  useEffect(() => { layout(); }, [layout]);
  useEffect(() => { const on = () => layout(true); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, [layout]);

  const go = useCallback((dir: 1 | -1) => setActive((a) => wrap(a + dir)), []);

  // mouse drag on desktop
  const drag = useRef<{ x: number; id: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { if (e.pointerType === 'mouse' && e.button === 0) drag.current = { x: e.clientX, id: e.pointerId }; };
  const onUp = (e: React.PointerEvent) => { const d = drag.current; drag.current = null; if (!d || d.id !== e.pointerId) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); };

  // ---------------- mobile: native scroll-snap strip, synced dots
  useEffect(() => {
    const s = strip.current; if (!s || !mobile) return;
    let t = 0;
    const on = () => { window.clearTimeout(t); t = window.setTimeout(() => {
      const kids = Array.from(s.children) as HTMLElement[];
      const mid = s.scrollLeft + s.clientWidth / 2;
      let best = 0, d = Infinity;
      kids.forEach((k, i) => { const dd = Math.abs(k.offsetLeft + k.offsetWidth / 2 - mid); if (dd < d) { d = dd; best = i; } });
      const end = s.scrollLeft + s.clientWidth >= s.scrollWidth - 8;
      setActive(s.scrollLeft < 8 ? 0 : end ? kids.length - 1 : best);
    }, 90); };
    s.addEventListener('scroll', on, { passive: true });
    return () => { s.removeEventListener('scroll', on); window.clearTimeout(t); };
  }, [mobile]);
  const goMobile = (i: number) => { const s = strip.current; const k = s?.children[i] as HTMLElement | undefined; if (s && k) s.scrollTo({ left: k.offsetLeft - 20, behavior: reduced ? 'auto' : 'smooth' }); };
  useEffect(() => { if (mobile) goMobile(0); }, [mobile]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); mobile ? goMobile(wrap(active + 1)) : go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); mobile ? goMobile(wrap(active - 1)) : go(-1); }
  };

  const bg = (s: Season) => (
    <div className={`st-bg absolute inset-0 transition-opacity duration-[900ms] ease-in-out ${season === s ? 'opacity-100' : 'opacity-0'}`} aria-hidden>
      <picture>
        <source type="image/avif" srcSet={`${IMG}bg-${s}.avif`} />
        <source type="image/webp" srcSet={`${IMG}bg-${s}.webp`} />
        <img src={`${IMG}bg-${s}.jpg`} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </picture>
    </div>
  );

  return (
    <section ref={root} id="gaeste" aria-labelledby="st-title" className="relative isolate overflow-hidden bg-cream text-ink">
      {/* D) seasonal background crossfade */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="js-st-bg absolute -inset-y-[8%] inset-x-0">{bg('summer')}{bg('winter')}</div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--k-cream)_92%,transparent)_0%,color-mix(in_srgb,var(--k-cream)_55%,transparent)_30%,color-mix(in_srgb,var(--k-cream)_35%,transparent)_55%,var(--k-cream)_96%)]" />
      </div>

      <div className="mx-auto max-w-[1360px] px-5 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-16 sm:px-6 md:px-10 md:pb-28 md:pt-24 lg:px-14">
        <header className="mx-auto max-w-[820px] text-center">
          <p className="js-st-eyebrow flex items-center justify-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] text-ink/80 md:text-[13px]">
            <span aria-hidden className="h-px w-10 bg-ink/40" />{c.eyebrow}<span aria-hidden className="h-px w-10 bg-ink/40" />
          </p>
          <h2 id="st-title" className="mt-4 font-display font-medium leading-[1] tracking-[-0.01em] text-pine" style={{ fontSize: 'clamp(40px, 5.6vw, 88px)' }}>
            <span className="block overflow-hidden pb-[0.04em]"><span className="js-st-line block">{c.headline[0]}</span></span>
            <span className="block overflow-hidden pb-[0.12em]"><span className="js-st-line block italic text-goldink">{c.headline[1]}</span></span>
          </h2>
          <p className="js-st-sub mx-auto mt-4 max-w-[46ch] text-[16px] leading-relaxed text-ink/75 md:text-[19px]">{c.sub}</p>
        </header>

        <div role="region" aria-roledescription="carousel" aria-label={c.eyebrow} tabIndex={0} onKeyDown={onKey} className="relative mt-10 outline-none focus-visible:ring-2 focus-visible:ring-gold md:mt-14">
          {/* desktop deck */}
          <div ref={deck} className="relative hidden h-[600px] select-none lg:block" onPointerDown={onDown} onPointerUp={onUp} style={{ cursor: fine ? 'grab' : undefined }}>
            {STORIES.map((s, i) => (
              <div key={s.id} className="js-st-slot absolute left-1/2 top-0 h-[560px] w-[min(360px,31%)] -translate-x-1/2" onClick={() => i !== active && setActive(i)}>
                <div className="js-st-in h-full"><Card s={s} lang={lang} active={i === active} /></div>
              </div>
            ))}
            <button type="button" onClick={() => go(-1)} aria-label={c.prev} className="st-arrow left-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg></button>
            <button type="button" onClick={() => go(1)} aria-label={c.next} className="st-arrow right-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M9 5l7 7-7 7" /></svg></button>
          </div>

          {/* mobile strip */}
          <div ref={strip} className="st-strip -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 md:-mx-10 md:px-10 lg:hidden">
            {STORIES.map((s, i) => (
              <div key={s.id} className="js-st-in w-[84%] max-w-[360px] shrink-0 snap-center sm:w-[46%]"><Card s={s} lang={lang} active={i === active} /></div>
            ))}
          </div>

          {/* progress */}
          <div className="js-st-progress mt-6 flex items-center justify-center gap-2" role="group" aria-label={c.eyebrow}>
            {STORIES.map((s, i) => (
              <button key={s.id} type="button" onClick={() => (mobile ? goMobile(i) : setActive(i))} aria-label={c.of(i + 1, n)} aria-current={i === active}
                className={`st-dot ${i === active ? 'is-on' : ''}`} />
            ))}
          </div>
          <p className="sr-only" aria-live="polite">{c.of(active + 1, n)}</p>
        </div>

        {/* trust bar – verified data only */}
        <div className="js-st-trust st-trust mx-auto mt-10 flex max-w-[860px] flex-col items-stretch gap-4 rounded-[22px] p-5 sm:flex-row sm:items-center sm:justify-between md:mt-14 md:px-8">
          <a href={TRUST.engine.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4">
            <span className="font-display text-[44px] font-medium leading-none text-pine tabular-nums">{TRUST.engine.score.toLocaleString(lang === 'de' ? 'de-AT' : 'en-GB')}<span className="text-[20px] text-ink/50">/{TRUST.engine.max}</span></span>
            <span><span className="block text-[15px] font-semibold text-ink">{c.engineLabel}</span><span className="block text-[13px] text-ink/65">{c.engineCount(TRUST.engine.count)} · {c.engineNote} {TRUST.engine.checked}</span></span>
          </a>
          <a href={TRUST.google} target="_blank" rel="noopener noreferrer" className="st-link inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold">
            <span className="font-bold">G</span> {c.google} <span aria-hidden className="arrow">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
