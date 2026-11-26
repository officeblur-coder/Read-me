import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { ALLERGENS, BAR, MENU, MENU_COPY, TAGS, eur, type Allergen, type Chapter, type Dish, type Tag } from '../../content/menuCard';
import { MENU_PDF } from '../../content/restaurant';
import { siteLang, tr } from '../../lib/i18n';
import { useReducedMotion } from '../../lib/hooks';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const IMG = `${import.meta.env.BASE_URL}images/menu/`;
const REVIEW = 'https://maps.app.goo.gl/5pN6vJZboPjuMqSo6';
type Filter = 'all' | Tag;
const FILTERS: Filter[] = ['all', 'veggie', 'chicken', 'pork', 'beef', 'fish'];
const AL_FILTER: Allergen[] = ['A', 'G', 'C', 'D', 'H', 'L', 'M', 'N', 'O'];
/** photos only available small (breakfast page of the printed card): shown in a narrower sheet so they stay sharp */
const SMALL = new Set(['spinat', 'omelett', 'hummus', 'kalte-platte', 'creme-caramel', 'palatschinken', 'topfenknoedel', 'apfelstrudel']);

/** contour lines of the cover (like the printed card) */
function Contours({ className = '' }: { className?: string }) {
  const lines = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg aria-hidden viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className={className}>
      {lines.map((i) => (
        <path key={i} className="mc-contour" pathLength={1}
          d={`M-50 ${120 + i * 70} C 200 ${60 + i * 64}, 360 ${210 + i * 58}, 600 ${150 + i * 66} S 1000 ${40 + i * 72}, 1260 ${170 + i * 60}`} />
      ))}
      {[0, 1, 2, 3].map((i) => <ellipse key={`e${i}`} className="mc-contour" pathLength={1} cx={930} cy={190} rx={60 + i * 48} ry={34 + i * 30} />)}
    </svg>
  );
}
const Ridge = ({ className = '', d }: { className?: string; d: string }) => (
  <svg aria-hidden viewBox="0 0 1440 220" preserveAspectRatio="none" className={className}><path d={d} /></svg>
);
const RIDGE_A = 'M0 150 L90 120 L150 136 L230 70 L300 118 L380 92 L470 130 L560 60 L640 104 L720 84 L820 128 L900 40 L990 112 L1080 86 L1170 124 L1260 70 L1350 110 L1440 92 L1440 220 L0 220Z';
const RIDGE_B = 'M0 190 L120 160 L220 176 L330 140 L430 170 L540 150 L650 176 L760 136 L880 168 L990 150 L1100 178 L1220 146 L1330 170 L1440 156 L1440 220 L0 220Z';
const Peak = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 68 34" className={className}><path className="mc-peak" pathLength={1} d="M2 32 L24 6 L33 17 L44 2 L66 32" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" /></svg>
);

function AlDots({ al, lang }: { al?: Allergen[]; lang: Lang }) {
  if (!al?.length) return null;
  return (
    <span className="flex flex-wrap gap-1" aria-label={`${tr(MENU_COPY[lang].allergens)}: ${al.map((a) => tr(ALLERGENS[a][lang])).join(', ')}`}>
      {al.map((a) => <span key={a} aria-hidden title={tr(ALLERGENS[a][lang])} className="mc-al">{a}</span>)}
    </span>
  );
}

/** the two languages of the printed card: the site language first (German for the other site languages) */
function useNames() {
  const site = siteLang();
  const first: Lang = site === 'en' ? 'en' : 'de';
  const second: Lang = first === 'en' ? 'de' : 'en';
  return { first, second };
}

function DishCard({ d, idx, lang, onOpen }: { d: Dish; idx: number; lang: Lang; onOpen: (d: Dish) => void }) {
  const { first, second } = useNames();
  const t = MENU_COPY[lang];
  return (
    <article className="mc-card js-mc-card group" data-tag={d.tag ?? ''}>
      {d.img && (
        <button type="button" onClick={() => onOpen(d)} className="mc-photo js-mc-photo" aria-label={`${d.name[first]} – ${tr(t.details)}`}>
          <img src={`${IMG}${d.img}.webp`} alt="" loading="lazy" decoding="async" className="js-mc-img" />
          <span aria-hidden className="mc-frame" />
          <span aria-hidden className="mc-no">{String(idx + 1).padStart(2, '0')}</span>
          {d.tag && d.tag !== 'veggie' && <span className="mc-tag">{tr(TAGS[d.tag][lang])}</span>}
          {d.tag === 'veggie' && <span className="mc-tag mc-tag-v">{tr(TAGS.veggie[lang])}</span>}
          <span aria-hidden className="mc-zoom">+</span>
        </button>
      )}
      <div className="mc-body">
        <div data-i18n-skip>
          <h3 className="mc-name">{d.name[first]}</h3>
          <p className="mc-sub">{d.name[second]}</p>
          {d.desc && <p className="mc-desc">{d.desc[first]}</p>}
          {d.desc && <p className="mc-desc2">{d.desc[second]}</p>}
          {d.note && <p className="mc-note">{d.note[first]} · {d.note[second]}</p>}
        </div>
        <div className="mc-foot">
          <AlDots al={d.al} lang={lang} />
          <span aria-hidden className="mc-leader" />
          <span className="mc-price" data-i18n-skip>{eur(d.price)}</span>
        </div>
      </div>
    </article>
  );
}

function ChapterSection({ c, lang, filter, noAl, onOpen }: { c: Chapter; lang: Lang; filter: Filter; noAl: Allergen[]; onOpen: (d: Dish) => void }) {
  const { first, second } = useNames();
  const t = MENU_COPY[lang];
  const show = (d: Dish) => (filter === 'all' || d.tag === filter) && !noAl.some((a) => d.al?.includes(a));
  const dishes = c.dishes.filter(show);
  const filtered = filter !== 'all' || noAl.length > 0;
  return (
    <section id={`mc-${c.id}`} aria-labelledby={`mc-${c.id}-h`} className="mc-chapter js-mc-chapter" data-ch={c.id}>
      <div className="mc-ch-side">
        <div className="mc-ch-sticky">
          <span aria-hidden className="mc-ch-ghost js-mc-ghost">{c.no}</span>
          <p className="mc-kicker">{tr(t.chapter)} · {c.no}</p>
          <h2 id={`mc-${c.id}-h`} className="mc-ch-title" data-i18n-skip>{c.title[first]}</h2>
          <p className="mc-ch-sub" data-i18n-skip>{c.title[second]}</p>
          <Peak className="mt-4 h-4 w-9 text-[var(--mc-gold)]" />
          {c.time && <p className="mc-time" data-i18n-skip>{c.time[first]}</p>}
          <div className="mc-ch-photo js-mc-chphoto">
            <img src={`${IMG}${c.img}-640.webp`} srcSet={`${IMG}${c.img}-640.webp 640w, ${IMG}${c.img}.webp 1051w`} sizes="(min-width:1024px) 30vw, 90vw" alt="" loading="lazy" decoding="async" className="js-mc-chimg" />
            <span aria-hidden className="mc-frame" />
          </div>
        </div>
      </div>
      <div className="mc-ch-main">
        {dishes.length > 0 ? (
          <div className="mc-grid">{dishes.map((d, i) => <DishCard key={d.id} d={d} idx={c.dishes.indexOf(d) >= 0 ? c.dishes.indexOf(d) : i} lang={lang} onOpen={onOpen} />)}</div>
        ) : filtered ? <p className="mc-empty">{tr(t.none)}</p> : null}

        {c.daily && !filtered && (
          <div className="mc-daily js-mc-reveal">
            <div className="mc-daily-head" data-i18n-skip>
              <div>
                <p className="mc-kicker">{tr(t.daily)}</p>
                <h3 className="mc-name">{c.daily.name[first]}</h3>
                <p className="mc-sub">{c.daily.name[second]}</p>
                <p className="mc-desc">{c.daily.desc[first]}</p>
                <p className="mc-desc2">{c.daily.desc[second]}</p>
              </div>
              <span className="mc-price">{eur(c.daily.price)}</span>
            </div>
            {c.daily.list && (
              <ul className="mc-daily-list">
                {c.daily.list.map((x) => (
                  <li key={x.name.de} className="mc-daily-item">
                    {x.img && <span className="mc-daily-img"><img src={`${IMG}${x.img}.webp`} alt="" loading="lazy" /></span>}
                    <span className="min-w-0 flex-1" data-i18n-skip><b>{x.name[first]}</b> <i>/ {x.name[second]}</i></span>
                    <AlDots al={x.al} lang={lang} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {c.extras && !filtered && (
          <div className="mc-extras js-mc-reveal">
            <p className="mc-kicker">{c.extrasTitle ? tr(c.extrasTitle[lang]) : ''}</p>
            <ul>
              {c.extras.map((x) => (
                <li key={x.name.de}><span data-i18n-skip><b>{x.name[first]}</b>{x.name[second] !== x.name[first] && <i> / {x.name[second]}</i>}</span><AlDots al={x.al} lang={lang} /><span aria-hidden className="mc-leader" /><span className="mc-p" data-i18n-skip>{eur(x.price)}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function DishModal({ list, index, lang, onClose, onMove }: { list: Dish[]; index: number; lang: Lang; onClose: () => void; onMove: (i: number) => void }) {
  const d = list[index];
  const { first, second } = useNames();
  const t = MENU_COPY[lang];
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touch = useRef<number | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onMove((index + 1) % list.length);
      if (e.key === 'ArrowLeft') onMove((index - 1 + list.length) % list.length);
    };
    window.addEventListener('keydown', key);
    document.documentElement.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', key); document.documentElement.style.overflow = ''; };
  }, [index, list.length, onClose, onMove]);
  useEffect(() => {
    if (reduced || !box.current) return;
    const q = gsap.utils.selector(box);
    gsap.fromTo(q('.js-mm-img'), { scale: 1.12, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.9, ease: 'power3.out' });
    gsap.fromTo(q('.js-mm-txt > *'), { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', delay: 0.1 });
  }, [index, reduced]);
  if (!d) return null;
  return (
    <div className="mc-modal" role="dialog" aria-modal="true" aria-label={d.name[first]} onClick={onClose}>
      <div ref={box} className={`mc-modal-box ${d.img && SMALL.has(d.img) ? 'is-small' : ''}`} onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 50) onMove((index + (dx < 0 ? 1 : -1) + list.length) % list.length); }}>
        <div className="mc-modal-photo">
          {d.img && <img key={d.id} src={`${IMG}${d.img}.webp`} alt={d.name[first]} className="js-mm-img" />}
          <span aria-hidden className="mc-frame" />
        </div>
        <div className="mc-modal-txt js-mm-txt">
          {d.tag && <p className="mc-kicker">{tr(TAGS[d.tag][lang])}</p>}
          <h3 className="mc-modal-name" data-i18n-skip>{d.name[first]}</h3>
          <p className="mc-sub" data-i18n-skip>{d.name[second]}</p>
          {d.desc && <p className="mc-modal-desc" data-i18n-skip>{d.desc[first]}</p>}
          {d.desc && <p className="mc-desc2" data-i18n-skip>{d.desc[second]}</p>}
          {d.note && <p className="mc-note" data-i18n-skip>{d.note[first]} · {d.note[second]}</p>}
          {d.al?.length ? (
            <ul className="mc-modal-al">{d.al.map((a) => <li key={a}><span className="mc-al">{a}</span>{tr(ALLERGENS[a][lang])}</li>)}</ul>
          ) : null}
          <p className="mc-modal-price" data-i18n-skip>{eur(d.price)}</p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={tr(t.close)} className="mc-modal-close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 5l14 14M19 5 5 19" /></svg></button>
        <button type="button" onClick={() => onMove((index - 1 + list.length) % list.length)} aria-label={tr(t.prev)} className="mc-modal-nav mc-modal-prev">‹</button>
        <button type="button" onClick={() => onMove((index + 1) % list.length)} aria-label={tr(t.next)} className="mc-modal-nav mc-modal-next">›</button>
        <p aria-hidden className="mc-modal-count">{String(index + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')}</p>
      </div>
    </div>
  );
}

/** Speisekarte – the restaurant's full menu as an animated card: cover, chapter navigation, filters, dish sheets, bar. */
export function MenuPage({ lang }: { lang: Lang }) {
  const t = MENU_COPY[lang];
  const { first, second } = useNames();
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(MENU[0].id);
  const [filter, setFilter] = useState<Filter>('all');
  const [noAl, setNoAl] = useState<Allergen[]>([]);
  const [alOpen, setAlOpen] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const photoDishes = useMemo(() => MENU.flatMap((c) => c.dishes).filter((d) => d.img), []);
  const openDish = useCallback((d: Dish) => setOpen(photoDishes.findIndex((x) => x.id === d.id)), [photoDishes]);
  const chapters = [...MENU.map((c) => ({ id: c.id, no: c.no, title: c.title })), { id: 'bar', no: '10', title: { de: 'Bar', en: 'Bar' } }];

  // cover + scroll choreography
  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(q('.mc-cover .mc-contour'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.4, stagger: 0.08, ease: 'power2.inOut' }, 0)
      .fromTo(q('.js-mc-glow'), { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.8 }, 0)
      .fromTo(q('.mc-cover .mc-peak'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0.2)
      .fromTo(q('.js-mc-char'), { yPercent: 120, rotate: 6, autoAlpha: 0 }, { yPercent: 0, rotate: 0, autoAlpha: 1, duration: 1, stagger: 0.045, ease: 'power4.out' }, 0.5)
      .fromTo(q('.js-mc-in'), { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08 }, 1.1)
      .fromTo(q('.js-mc-ridge'), { yPercent: 40 }, { yPercent: 0, duration: 1.6, stagger: 0.12, ease: 'power2.out' }, 0.2)
      .fromTo(q('.js-mc-tile'), { y: 40, autoAlpha: 0, rotate: (i: number) => (i % 2 ? 4 : -4) }, { y: 0, autoAlpha: 1, rotate: 0, duration: 0.8, stagger: 0.05, ease: 'back.out(1.5)' }, 1.3);
    gsap.to(q('.js-mc-ridge-back'), { yPercent: -18, ease: 'none', scrollTrigger: { trigger: q('.mc-cover')[0], start: 'top top', end: 'bottom top', scrub: 0.6 } });
    gsap.to(q('.js-mc-cover-in'), { y: -80, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: q('.mc-cover')[0], start: 'top top', end: 'bottom top', scrub: 0.6 } });

    q('.js-mc-chapter').forEach((sec) => {
      const s = gsap.utils.selector(sec);
      gsap.fromTo(s('.js-mc-chphoto'), { clipPath: 'inset(100% 0% 0% 0% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.3, ease: 'power3.inOut', scrollTrigger: { trigger: sec, start: 'top 75%', once: true } });
      gsap.fromTo(s('.js-mc-chimg'), { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
      gsap.fromTo(s('.js-mc-ghost'), { yPercent: 30 }, { yPercent: -30, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
    });
    ScrollTrigger.batch(q('.js-mc-card'), {
      start: 'top 90%', once: true,
      onEnter: (els) => {
        gsap.fromTo(els, { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.09, ease: 'power3.out' });
        els.forEach((el, i) => {
          const ph = el.querySelector('.js-mc-photo'); const im = el.querySelector('.js-mc-img');
          if (ph) gsap.fromTo(ph, { clipPath: 'inset(0% 0% 100% 0% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.1, delay: i * 0.09, ease: 'power3.inOut' });
          if (im) gsap.fromTo(im, { scale: 1.3 }, { scale: 1, duration: 1.6, delay: i * 0.09, ease: 'power3.out' });
        });
      },
    });
    q('.js-mc-reveal').forEach((el) => gsap.fromTo(el, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
    gsap.fromTo(q('.js-mc-barrow'), { x: -16, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5, stagger: 0.02, scrollTrigger: { trigger: q('#mc-bar')[0], start: 'top 70%', once: true } });
    gsap.fromTo(q('.mc-end .mc-peak'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: q('.mc-end')[0], start: 'top 80%', once: true } });
  }, { scope: root, dependencies: [reduced] });

  // after filtering, cards that were never revealed must be visible
  useEffect(() => {
    if (!root.current) return;
    root.current.querySelectorAll<HTMLElement>('.js-mc-card').forEach((el) => { if (getComputedStyle(el).visibility === 'hidden' && el.getBoundingClientRect().top < window.innerHeight) gsap.set(el, { autoAlpha: 1, y: 0 }); });
    ScrollTrigger.refresh();
  }, [filter, noAl]);

  // active chapter in the sticky bar
  useEffect(() => {
    const secs = [...document.querySelectorAll<HTMLElement>('.js-mc-chapter, #mc-bar')];
    const io = new IntersectionObserver((es) => {
      const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive((vis.target as HTMLElement).dataset.ch || 'bar');
    }, { rootMargin: '-35% 0px -55% 0px' });
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const nav = navRef.current; if (!nav) return;
    const btn = nav.querySelector<HTMLElement>(`[data-nav="${active}"]`); const pill = nav.querySelector<HTMLElement>('.js-mc-pill');
    if (!btn || !pill) return;
    pill.style.width = `${btn.offsetWidth}px`; pill.style.transform = `translateX(${btn.offsetLeft}px)`;
    const sc = nav.querySelector<HTMLElement>('.mc-nav-scroll');
    if (sc) sc.scrollTo({ left: btn.offsetLeft - sc.clientWidth / 2 + btn.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
  }, [active, reduced, lang]);

  const jump = (id: string) => {
    const el = document.getElementById(`mc-${id}`); if (!el) return;
    const off = (navRef.current?.getBoundingClientRect().bottom ?? 120) + 12;
    const y = el.getBoundingClientRect().top + window.scrollY - off;
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  };
  const toggleAl = (a: Allergen) => setNoAl((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));
  const title = tr(t.title);

  return (
    <div ref={root} className="mc">
      {/* ---------- cover ---------- */}
      <section id="top" className="mc-cover" aria-labelledby="mc-title">
        <span aria-hidden className="mc-glow js-mc-glow" />
        <Contours className="mc-contours" />
        <div className="mc-cover-in js-mc-cover-in">
          <Peak className="mx-auto h-9 w-[72px] text-[var(--mc-gold)]" />
          <p className="mc-eyebrow js-mc-in">{tr(t.eyebrow)}</p>
          <h1 id="mc-title" className="mc-title" aria-label={title}>
            <span aria-hidden data-i18n-skip>{[...title].map((ch, i) => <span key={i} className="mc-char"><span className="js-mc-char inline-block">{ch === ' ' ? ' ' : ch}</span></span>)}</span>
          </h1>
          <p className="mc-lead js-mc-in">{tr(t.sub)}</p>
          <p className="mc-hours js-mc-in">{tr(MENU[0].time ? MENU[0].time[lang] : '')} · {tr(t.dinner)}</p>
        </div>
        <ul className="mc-tiles" aria-label={tr(t.chapter)}>
          {chapters.map((c, i) => (
            <li key={c.id} className="js-mc-tile">
              <button type="button" onClick={() => jump(c.id)} className="mc-tile">
                <span className="mc-tile-img"><img src={`${IMG}ch${String(i + 1).padStart(2, '0')}-640.webp`} alt="" loading={i < 5 ? 'eager' : 'lazy'} /></span>
                <span className="mc-tile-no">{c.no}</span>
                <span className="mc-tile-t" data-i18n-skip>{c.title[first]}</span>
              </button>
            </li>
          ))}
        </ul>
        <Ridge className="mc-ridge mc-ridge-back js-mc-ridge js-mc-ridge-back" d={RIDGE_A} />
        <Ridge className="mc-ridge mc-ridge-front js-mc-ridge" d={RIDGE_B} />
      </section>

      {/* ---------- sticky chapter bar + filters ---------- */}
      <div ref={navRef} className="mc-nav">
        <div className="mc-nav-scroll">
          <div className="mc-nav-row">
            <span aria-hidden className="mc-pill js-mc-pill" />
            {chapters.map((c) => (
              <button key={c.id} type="button" data-nav={c.id} onClick={() => jump(c.id)} aria-current={active === c.id ? 'true' : undefined} className={`mc-nav-btn ${active === c.id ? 'is-on' : ''}`}>
                <span className="mc-nav-no">{c.no}</span><span data-i18n-skip>{c.title[first]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mc-filters" role="group" aria-label={tr(t.filterLabel)}>
          {FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`mc-chip ${filter === f ? 'is-on' : ''}`}>
              {f === 'all' ? tr(t.all) : tr(TAGS[f][lang])}
            </button>
          ))}
          <button type="button" aria-expanded={alOpen} onClick={() => setAlOpen((o) => !o)} className={`mc-chip ${noAl.length ? 'is-on' : ''}`}>
            {tr(t.allergens)}{noAl.length ? ` · ${noAl.length}` : ''} <span aria-hidden className={`inline-block transition-transform ${alOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
        </div>
        {alOpen && (
          <div className="mc-alpanel">
            {AL_FILTER.map((a) => (
              <button key={a} type="button" aria-pressed={noAl.includes(a)} onClick={() => toggleAl(a)} className={`mc-chip mc-chip-s ${noAl.includes(a) ? 'is-on' : ''}`}>
                <span className="mc-al">{a}</span>{tr(t.noAl)} {tr(ALLERGENS[a][lang])}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------- chapters ---------- */}
      <div className="mc-pages">
        {MENU.map((c) => <ChapterSection key={c.id} c={c} lang={lang} filter={filter} noAl={noAl} onOpen={openDish} />)}
      </div>

      {/* ---------- bar ---------- */}
      <section id="mc-bar" data-ch="bar" className="mc-bar" aria-labelledby="mc-bar-h">
        <Contours className="mc-contours mc-contours-bar" />
        <div className="mc-bar-in">
          <div className="mc-bar-head">
            <p className="mc-kicker">{tr(t.chapter)} · 10</p>
            <h2 id="mc-bar-h" className="mc-ch-title">{tr(t.barTitle)}</h2>
            <div className="mc-bar-photo js-mc-reveal"><img src={`${IMG}ch10-640.webp`} alt="" loading="lazy" /><span aria-hidden className="mc-frame" /></div>
          </div>
          <div className="mc-bar-cols">
            {BAR.map((g) => (
              <div key={g.id} className="mc-bar-group">
                <h3 className="mc-bar-title" data-i18n-skip>{g.title[first]} <small>{g.title[second]}</small></h3>
                <ul>
                  {g.items.map((x) => (
                    <li key={x.name} className="mc-barrow js-mc-barrow">
                      <span className="min-w-0" data-i18n-skip><b>{x.name}</b>{x.sub && <i>{x.sub[first] === x.sub[second] ? x.sub[first] : `${x.sub[first]} / ${x.sub[second]}`}</i>}</span>
                      <span aria-hidden className="mc-leader" />
                      <span className="mc-sizes" data-i18n-skip>{x.sizes.map(([s, p]) => <span key={s + p}>{s && <small>{s}</small>}{eur(p).replace(' €', '')}</span>)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- end ---------- */}
      <section className="mc-end">
        <Peak className="mx-auto h-16 w-32 text-[var(--mc-gold)]" />
        <p className="mc-end-title">{tr(t.end)}</p>
        <p className="mc-end-sub">{tr(t.endSub)}</p>
        <div className="mc-end-cta">
          <a href="#restaurant" className="mc-btn">{tr(t.back)}</a>
          <a href="#contact" className="mc-btn">{tr(t.book)}</a>
          <a href={MENU_PDF} target="_blank" rel="noopener" className="mc-btn mc-btn-ghost">{tr(t.pdf)} ↓</a>
          <a href={REVIEW} target="_blank" rel="noopener" className="mc-btn mc-btn-ghost">★ {tr(t.review)}</a>
        </div>
        <p className="mc-legend"><b>{tr(t.legend)}:</b> {(Object.keys(ALLERGENS) as Allergen[]).map((a) => `${a} ${tr(ALLERGENS[a][lang])}`).join(' · ')}</p>
        <p className="mc-legend">{tr(t.vat)}</p>
      </section>

      {open != null && open >= 0 && <DishModal list={photoDishes} index={open} lang={lang} onClose={() => setOpen(null)} onMove={setOpen} />}
    </div>
  );
}
