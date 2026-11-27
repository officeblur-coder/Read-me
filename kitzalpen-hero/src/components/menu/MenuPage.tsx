import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { ALLERGENS, BAR, MENU, MENU_COPY, TAGS, eur, type Allergen, type Chapter, type Dish, type Tag } from '../../content/menuCard';
import { MENU_IMG } from '../../content/menuImages';
import { MENU_PDF } from '../../content/restaurant';
import { siteLang, tr } from '../../lib/i18n';
import { useReducedMotion } from '../../lib/hooks';

gsap.registerPlugin(useGSAP);
const IMG = `${import.meta.env.BASE_URL}images/menu/`;
const REVIEW = 'https://maps.app.goo.gl/5pN6vJZboPjuMqSo6';
type Diet = 'all' | Tag;
const DIETS: Diet[] = ['all', 'veggie', 'chicken', 'pork', 'beef', 'fish'];
const FREE: Allergen[] = ['A', 'G', 'C', 'D', 'H', 'L', 'M', 'N', 'O'];

const Peak = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 68 34" className={className}><path className="mc-peak" pathLength={1} d="M2 32 L24 6 L33 17 L44 2 L66 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" /></svg>
);
function Contours({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className={className}>
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} className="mc-contour" pathLength={1} d={`M-50 ${120 + i * 70} C 200 ${60 + i * 64}, 360 ${210 + i * 58}, 600 ${150 + i * 66} S 1000 ${40 + i * 72}, 1260 ${170 + i * 60}`} />
      ))}
      {[0, 1, 2, 3].map((i) => <ellipse key={`e${i}`} className="mc-contour" pathLength={1} cx={930} cy={190} rx={60 + i * 48} ry={34 + i * 30} />)}
    </svg>
  );
}
const RIDGE = 'M0 150 L90 120 L150 136 L230 70 L300 118 L380 92 L470 130 L560 60 L640 104 L720 84 L820 128 L900 40 L990 112 L1080 86 L1170 124 L1260 70 L1350 110 L1440 92 L1440 220 L0 220Z';

/** the full photo, its space reserved from the known pixel size (nothing is cropped) */
function Photo({ id, alt = '', className = '', sizes = '(min-width:1024px) 34vw, 92vw', eager = false }: { id: string; alt?: string; className?: string; sizes?: string; eager?: boolean }) {
  const [w, h] = MENU_IMG[id] ?? [4, 3];
  const has640 = id.startsWith('ch');
  return (
    <img src={`${IMG}${has640 ? `${id}-640` : id}.webp`} srcSet={has640 ? `${IMG}${id}-640.webp 640w, ${IMG}${id}.webp ${w}w` : undefined} sizes={has640 ? sizes : undefined}
      width={w} height={h} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className={className} />
  );
}

function Al({ al, lang }: { al?: Allergen[]; lang: Lang }) {
  if (!al?.length) return null;
  const label = al.map((a) => tr(ALLERGENS[a][lang])).join(', ');
  return <span className="mc-al-row" title={label} aria-label={`${tr(MENU_COPY[lang].allergens)}: ${label}`}>{al.map((a) => <span key={a} aria-hidden className="mc-al">{a}</span>)}</span>;
}

/** the two languages of the printed card: the site language first (German on the other site languages) */
const useNames = () => { const first: Lang = siteLang() === 'en' ? 'en' : 'de'; return { first, second: (first === 'en' ? 'de' : 'en') as Lang }; };

function DishItem({ d, lang, onOpen }: { d: Dish; lang: Lang; onOpen: (d: Dish) => void }) {
  const { first, second } = useNames();
  const t = MENU_COPY[lang];
  return (
    <article className="mc-dish mc-rv">
      {d.img && (
        <button type="button" className="mc-dish-photo" onClick={() => onOpen(d)} aria-label={`${d.name[first]} – ${tr(t.details)}`}>
          <Photo id={d.img} />
          <span aria-hidden className="mc-dish-zoom"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4M11 8v6M8 11h6" /></svg></span>
        </button>
      )}
      <div className="mc-dish-txt">
        <div className="mc-dish-line" data-i18n-skip>
          <h3 className="mc-dish-name">{d.name[first]}</h3>
          <span aria-hidden className="mc-dots" />
          <span className="mc-dish-price">{eur(d.price)}</span>
        </div>
        <p className="mc-dish-en" data-i18n-skip>{d.name[second]}</p>
        {d.desc && <p className="mc-dish-desc" data-i18n-skip>{d.desc[first]}</p>}
        {d.desc && <p className="mc-dish-desc2" data-i18n-skip>{d.desc[second]}</p>}
        <div className="mc-dish-meta">
          {d.tag && <span className={`mc-tagtxt ${d.tag === 'veggie' ? 'is-v' : ''}`}>{tr(TAGS[d.tag][lang])}</span>}
          {d.note && <span className="mc-tagtxt" data-i18n-skip>{d.note[first]}</span>}
          <Al al={d.al} lang={lang} />
        </div>
      </div>
    </article>
  );
}

function ChapterBlock({ c, lang, dishes, filtered, onOpen }: { c: Chapter; lang: Lang; dishes: Dish[]; filtered: boolean; onOpen: (d: Dish) => void }) {
  const { first, second } = useNames();
  const t = MENU_COPY[lang];
  return (
    <section id={`mc-${c.id}`} data-ch={c.id} aria-labelledby={`mc-${c.id}-h`} className="mc-chapter">
      <header className="mc-ch-head mc-rv">
        <div className="mc-ch-txt">
          <p className="mc-kicker">{tr(t.chapter)} {c.no}</p>
          <h2 id={`mc-${c.id}-h`} className="mc-ch-title" data-i18n-skip>{c.title[first]}</h2>
          <p className="mc-ch-sub" data-i18n-skip>{c.title[second]}</p>
          <Peak className="mc-ch-peak" />
          {c.time && <p className="mc-time" data-i18n-skip>{c.time[first]}</p>}
        </div>
        <figure className="mc-ch-photo"><Photo id={c.img} sizes="(min-width:1024px) 300px, 60vw" /></figure>
      </header>
      <div className="mc-dishes">{dishes.map((d) => <DishItem key={d.id} d={d} lang={lang} onOpen={onOpen} />)}</div>

      {c.daily && !filtered && (
        <div className="mc-box mc-rv" data-i18n-skip>
          <div className="mc-dish-line">
            <h3 className="mc-dish-name">{c.daily.name[first]}</h3><span aria-hidden className="mc-dots" /><span className="mc-dish-price">{eur(c.daily.price)}</span>
          </div>
          <p className="mc-dish-en">{c.daily.name[second]}</p>
          <p className="mc-dish-desc">{c.daily.desc[first]}</p>
          <p className="mc-dish-desc2">{c.daily.desc[second]}</p>
          {c.daily.list && (
            <ul className="mc-box-list">
              {c.daily.list.map((x) => (
                <li key={x.name.de}>
                  {x.img && <button type="button" className="mc-box-img" onClick={() => onOpen({ id: x.img!, name: x.name, price: c.daily!.price, al: x.al, img: x.img })} aria-label={x.name[first]}><Photo id={x.img} /></button>}
                  <span className="min-w-0 flex-1"><b>{x.name[first]}</b><i>{x.name[second]}</i></span>
                  <Al al={x.al} lang={lang} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {c.extras && !filtered && (
        <div className="mc-extras mc-rv">
          <p className="mc-kicker">{c.extrasTitle ? tr(c.extrasTitle[lang]) : ''}</p>
          <ul>{c.extras.map((x) => (
            <li key={x.name.de} data-i18n-skip><span><b>{x.name[first]}</b>{x.name[second] !== x.name[first] && <i> {x.name[second]}</i>}</span><Al al={x.al} lang={lang} /><span aria-hidden className="mc-dots" /><span className="mc-xp">{eur(x.price)}</span></li>
          ))}</ul>
        </div>
      )}
    </section>
  );
}

function DishSheet({ list, index, lang, onClose, onMove }: { list: Dish[]; index: number; lang: Lang; onClose: () => void; onMove: (i: number) => void }) {
  const d = list[index];
  const { first, second } = useNames();
  const t = MENU_COPY[lang];
  const closeRef = useRef<HTMLButtonElement>(null);
  const touch = useRef<number | null>(null);
  const go = useCallback((s: number) => onMove((index + s + list.length) % list.length), [index, list.length, onMove]);
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', key);
    const prev = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', key); document.documentElement.style.overflow = prev; };
  }, [go, onClose]);
  if (!d) return null;
  return (
    <div className="mc-sheet" role="dialog" aria-modal="true" aria-label={d.name[first]} onClick={onClose}>
      <div className="mc-sheet-box" onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}>
        <div className="mc-sheet-photo">
          {d.img && <><span aria-hidden className="mc-sheet-blur" style={{ backgroundImage: `url(${IMG}${d.img}.webp)` }} /><Photo key={d.id} id={d.img} alt={d.name[first]} eager /></>}
        </div>
        <div className="mc-sheet-txt" key={`t-${d.id}`}>
          {d.tag && <p className="mc-kicker">{tr(TAGS[d.tag][lang])}</p>}
          <h3 className="mc-sheet-name" data-i18n-skip>{d.name[first]}</h3>
          <p className="mc-dish-en" data-i18n-skip>{d.name[second]}</p>
          {d.desc && <p className="mc-sheet-desc" data-i18n-skip>{d.desc[first]}</p>}
          {d.desc && <p className="mc-dish-desc2" data-i18n-skip>{d.desc[second]}</p>}
          {d.note && <p className="mc-tagtxt mt-3 self-start" data-i18n-skip>{d.note[first]} · {d.note[second]}</p>}
          {d.al?.length ? <ul className="mc-sheet-al">{d.al.map((a) => <li key={a}><span className="mc-al">{a}</span>{tr(ALLERGENS[a][lang])}</li>)}</ul> : null}
          <p className="mc-sheet-price" data-i18n-skip>{eur(d.price)}</p>
          <div className="mc-sheet-nav">
            <button type="button" onClick={() => go(-1)} aria-label={tr(t.prev)} className="mc-round">‹</button>
            <span aria-hidden>{index + 1} / {list.length}</span>
            <button type="button" onClick={() => go(1)} aria-label={tr(t.next)} className="mc-round">›</button>
          </div>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={tr(t.close)} className="mc-sheet-close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 5l14 14M19 5 5 19" /></svg></button>
      </div>
    </div>
  );
}

/** Speisekarte – the full menu: cover, contents with search and filters, chapters with full photos, bar, dish sheet. */
export function MenuPage({ lang }: { lang: Lang }) {
  const t = MENU_COPY[lang];
  const { first, second } = useNames();
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(MENU[0].id);
  const [diet, setDiet] = useState<Diet>('all');
  const [free, setFree] = useState<Allergen[]>([]);
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState(false);      // phone: filter sheet
  const [open, setOpen] = useState<{ list: Dish[]; i: number } | null>(null);
  const lock = useRef(0);

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const match = useCallback((d: Dish) => {
    if (diet !== 'all' && d.tag !== diet) return false;
    if (free.some((a) => d.al?.includes(a))) return false;
    if (q.trim()) { const s = norm(`${d.name.de} ${d.name.en} ${d.desc?.de ?? ''} ${d.desc?.en ?? ''}`); return norm(q).split(/\s+/).every((w) => s.includes(w)); }
    return true;
  }, [diet, free, q]);
  const filtered = diet !== 'all' || free.length > 0 || q.trim() !== '';
  const view = useMemo(() => MENU.map((c) => ({ c, dishes: c.dishes.filter(match) })).filter((x) => !filtered || x.dishes.length), [match, filtered]);
  const count = view.reduce((n, x) => n + x.dishes.length, 0);
  const photoList = useMemo(() => view.flatMap((x) => x.dishes).filter((d) => d.img), [view]);
  const openDish = useCallback((d: Dish) => {
    const i = photoList.findIndex((x) => x.id === d.id);
    setOpen(i >= 0 ? { list: photoList, i } : { list: [d], i: 0 });
  }, [photoList]);
  const toc = [...view.map(({ c, dishes }) => ({ id: c.id, no: c.no, title: c.title, n: dishes.length })), ...(filtered ? [] : [{ id: 'bar', no: '10', title: { de: 'Bar', en: 'Bar' }, n: 0 }])];

  // cover
  useGSAP(() => {
    if (reduced) return;
    const s = gsap.utils.selector(root);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(s('.mc-cover .mc-contour'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.4, stagger: 0.08, ease: 'power2.inOut' }, 0)
      .fromTo(s('.js-mc-glow'), { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.8 }, 0)
      .fromTo(s('.mc-cover .mc-peak'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0.2)
      .fromTo(s('.js-mc-char'), { yPercent: 115, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.04, ease: 'power4.out' }, 0.45)
      .fromTo(s('.js-mc-in'), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08 }, 1)
      .fromTo(s('.js-mc-tile'), { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.045 }, 1.15);
  }, { scope: root, dependencies: [reduced] });

  // gentle fade-in of content (CSS), never hiding anything for long
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>('.mc-rv:not(.is-in)'); if (!els) return;
    if (reduced || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [view, reduced]);

  // active chapter (paused while a contents click scrolls)
  useEffect(() => {
    const secs = [...(root.current?.querySelectorAll<HTMLElement>('.mc-chapter, #mc-bar') ?? [])];
    const io = new IntersectionObserver((es) => {
      if (Date.now() < lock.current) return;
      const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive((vis.target as HTMLElement).dataset.ch || 'bar');
    }, { rootMargin: '-30% 0px -60% 0px' });
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [view]);
  // keep the active chip visible in the phone bar
  useEffect(() => {
    const bar = root.current?.querySelector<HTMLElement>('.mc-mbar-scroll'); const b = bar?.querySelector<HTMLElement>(`[data-nav="${active}"]`);
    if (bar && b) bar.scrollTo({ left: b.offsetLeft - bar.clientWidth / 2 + b.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
  }, [active, reduced]);

  const jump = (id: string) => {
    const el = document.getElementById(id === 'top-menu' ? 'mc-start' : `mc-${id}`); if (!el) return;
    const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 80;
    const mbar = root.current?.querySelector<HTMLElement>('.mc-mbar'); const extra = mbar && getComputedStyle(mbar).display !== 'none' ? mbar.offsetHeight : 0;
    setActive(id); lock.current = Date.now() + 1400;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - extra - 18, behavior: reduced ? 'auto' : 'smooth' });
  };
  const reset = () => { setDiet('all'); setFree([]); setQ(''); };
  // after choosing a filter, show the result from its first dish (when the reader is further down)
  const filterKey = `${diet}|${free.join('')}`;
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const start = document.getElementById('mc-start'); if (!start) return;
    const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 80;
    if (start.getBoundingClientRect().top < header) window.scrollTo({ top: start.getBoundingClientRect().top + window.scrollY - header - 8, behavior: reduced ? 'auto' : 'smooth' });
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleFree = (a: Allergen) => setFree((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));
  const title = tr(t.title);

  const filters = (
    <>
      <label className="mc-search">
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4" /></svg>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr(t.search)} aria-label={tr(t.search)} />
      </label>
      <p className="mc-side-h">{tr(t.diet)}</p>
      <div className="mc-chips">
        {DIETS.map((f) => <button key={f} type="button" aria-pressed={diet === f} onClick={() => setDiet(f)} className={`mc-chip ${diet === f ? 'is-on' : ''}`}>{f === 'all' ? tr(t.all) : tr(TAGS[f][lang])}</button>)}
      </div>
      <p className="mc-side-h">{tr(t.free)}</p>
      <div className="mc-chips">
        {FREE.map((a) => <button key={a} type="button" aria-pressed={free.includes(a)} onClick={() => toggleFree(a)} className={`mc-chip mc-chip-s ${free.includes(a) ? 'is-on' : ''}`}>{tr(ALLERGENS[a][lang])}</button>)}
      </div>
      {filtered && <p className="mc-result"><span>{tr(t.results(count))}</span><button type="button" onClick={reset}>{tr(t.reset)}</button></p>}
    </>
  );

  return (
    <div ref={root} className="mc">
      {/* cover */}
      <section id="top" className="mc-cover" aria-labelledby="mc-title">
        <span aria-hidden className="mc-glow js-mc-glow" />
        <Contours className="mc-contours" />
        <div className="mc-cover-in">
          <Peak className="mx-auto h-9 w-[72px] text-[var(--mc-gold)]" />
          <p className="mc-eyebrow js-mc-in">{tr(t.eyebrow)}</p>
          <h1 id="mc-title" className="mc-title" aria-label={title}>
            <span aria-hidden data-i18n-skip>{[...title].map((ch, i) => <span key={i} className="mc-char"><span className="js-mc-char inline-block">{ch === ' ' ? ' ' : ch}</span></span>)}</span>
          </h1>
          <p className="mc-lead js-mc-in">{tr(t.sub)}</p>
          <p className="mc-hours js-mc-in">{tr(MENU[0].time ? MENU[0].time[lang] : '')} · {tr(t.dinner)}</p>
          <button type="button" onClick={() => jump('top-menu')} className="mc-cue js-mc-in">{tr(t.toMenu)} <span aria-hidden>↓</span></button>
        </div>
        <ul className="mc-tiles">
          {[...MENU.map((c) => ({ id: c.id, no: c.no, title: c.title, img: c.img })), { id: 'bar', no: '10', title: { de: 'Bar', en: 'Bar' }, img: 'ch10' }].map((c, i) => (
            <li key={c.id} className="js-mc-tile">
              <button type="button" onClick={() => jump(c.id)} className="mc-tile">
                <span className="mc-tile-img"><Photo id={c.img} sizes="140px" eager={i < 5} /></span>
                <span className="mc-tile-no">{c.no}</span>
                <span className="mc-tile-t" data-i18n-skip>{c.title[first]}</span>
              </button>
            </li>
          ))}
        </ul>
        <svg aria-hidden viewBox="0 0 1440 220" preserveAspectRatio="none" className="mc-ridge"><path d={RIDGE} /></svg>
      </section>

      {/* phone: contents bar + filter button */}
      <div className="mc-mbar">
        <div className="mc-mbar-scroll">
          {toc.map((c) => <button key={c.id} type="button" data-nav={c.id} onClick={() => jump(c.id)} className={`mc-mchip ${active === c.id ? 'is-on' : ''}`} aria-current={active === c.id ? 'true' : undefined}><span className="mc-no">{c.no}</span><span data-i18n-skip>{c.title[first]}</span></button>)}
        </div>
        <button type="button" onClick={() => setSheet(true)} className={`mc-mfilter ${filtered ? 'is-on' : ''}`} aria-label={tr(t.filtersBtn)}>
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          {filtered && <span className="mc-mfilter-n">{count}</span>}
        </button>
      </div>

      <div id="mc-start" className="mc-layout">
        {/* desktop: contents, search, filters */}
        <aside className="mc-side" aria-label={tr(t.contents)}>
          <div className="mc-side-in">
            <p className="mc-side-h">{tr(t.contents)}</p>
            <nav className="mc-toc">
              {toc.map((c) => (
                <button key={c.id} type="button" onClick={() => jump(c.id)} aria-current={active === c.id ? 'true' : undefined} className={`mc-toc-btn ${active === c.id ? 'is-on' : ''}`}>
                  <span className="mc-no">{c.no}</span><span className="flex-1" data-i18n-skip>{c.title[first]}</span>{filtered && <span className="mc-toc-n">{c.n}</span>}
                </button>
              ))}
            </nav>
            {filters}
            <a href={MENU_PDF} target="_blank" rel="noopener" className="mc-side-pdf">{tr(t.pdf)} ↓</a>
          </div>
        </aside>

        <div className="mc-main">
          {view.length ? view.map(({ c, dishes }) => <ChapterBlock key={c.id} c={c} lang={lang} dishes={dishes} filtered={filtered} onOpen={openDish} />)
            : <div className="mc-empty"><p>{tr(t.noResults)}</p><button type="button" onClick={reset} className="mc-btn mt-4">{tr(t.reset)}</button></div>}

          {!filtered && (
            <section id="mc-bar" data-ch="bar" aria-labelledby="mc-bar-h" className="mc-chapter">
              <header className="mc-ch-head mc-rv">
                <div className="mc-ch-txt">
                  <p className="mc-kicker">{tr(t.chapter)} 10</p>
                  <h2 id="mc-bar-h" className="mc-ch-title">{tr(t.barTitle)}</h2>
                  <Peak className="mc-ch-peak" />
                </div>
                <figure className="mc-ch-photo"><Photo id="ch10" sizes="(min-width:1024px) 300px, 60vw" /></figure>
              </header>
              <div className="mc-bar-cols">
                {BAR.map((g) => (
                  <div key={g.id} className="mc-bar-group mc-rv">
                    <h3 className="mc-bar-title" data-i18n-skip>{g.title[first]} <small>{g.title[second]}</small></h3>
                    <ul>{g.items.map((x) => (
                      <li key={x.name} className="mc-barrow" data-i18n-skip>
                        <span className="min-w-0"><b>{x.name}</b>{x.sub && <i>{x.sub[first] === x.sub[second] ? x.sub[first] : `${x.sub[first]} · ${x.sub[second]}`}</i>}</span>
                        <span aria-hidden className="mc-dots" />
                        <span className="mc-sizes">{x.sizes.map(([s, p]) => <span key={s + p}>{s && <small>{s}</small>}{eur(p).replace(' €', '')}</span>)}</span>
                      </li>
                    ))}</ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mc-end">
            <Peak className="mx-auto h-12 w-24 text-[var(--mc-gold)]" />
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
        </div>
      </div>

      {/* phone filter sheet */}
      {sheet && (
        <div className="mc-fsheet" role="dialog" aria-modal="true" aria-label={tr(t.filtersBtn)} onClick={() => setSheet(false)}>
          <div className="mc-fsheet-box" onClick={(e) => e.stopPropagation()}>
            <div className="mc-fsheet-head"><b>{tr(t.filtersBtn)}</b><button type="button" onClick={() => setSheet(false)} className="mc-btn mc-btn-s">{tr(t.done)}</button></div>
            {filters}
          </div>
        </div>
      )}

      {open && <DishSheet list={open.list} index={open.i} lang={lang} onClose={() => setOpen(null)} onMove={(i) => setOpen((o) => (o ? { ...o, i } : o))} />}
    </div>
  );
}
