import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { ALL_ROOMS_COPY, HOUSE_ROOMS, TYPE_GUESTS, type HouseRoom, type RPic, type RoomType } from '../../content/allRooms';
import { BOOK_ROOMS } from '../../content/pensionPage';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { Icon, I } from './PensionRooms';
import { PensionFinalCTA } from './PensionFinalCTA';
import { HouseFacade } from './HouseFacade';
import { useSeason } from '../../lib/season';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const IMG = `${import.meta.env.BASE_URL}images/all-rooms/`;
const TYPES: RoomType[] = ['double', 'triple', 'quad'];
/** quiet, distinct type accents (work on dark and light) */
const TONE: Record<RoomType, string> = { double: '#c9a46a', triple: '#7fb5a6', quad: '#d98b6a' };
const CAT: Partial<Record<RoomType, string>> = { double: '#room-double', triple: '#room-triple' };

const EQ = [
  ['M3.5 6h17v11h-17Z', 'M9 20h6'],
  ['M4 9a4 4 0 0 1 4-4h5v8H8a4 4 0 0 1-4-4Z', 'M13 6.5h6M13 11.5h4', 'M8 13l1.5 7H12l-1-7'],
  ['M2.5 9a14 14 0 0 1 19 0', 'M5.5 12.3a9.5 9.5 0 0 1 13 0', 'M8.6 15.5a5 5 0 0 1 6.8 0', 'M12 19h.01'],
  ['M5 20V7a3 3 0 0 1 6 0', 'M8 8h7l-1.5 3.5h-4Z', 'M10 14v1M12.5 14v2M15 14v1'],
  ['M3 11h18', 'M4 11v9M20 11v9M8 11v9M12 11v9M16 11v9', 'M3 20h18', 'M6 11V5h12v6'],
];

function Pic({ p, sizes, className = '', eager = false, alt = '' }: { p: RPic; sizes: string; className?: string; eager?: boolean; alt?: string }) {
  // WebP only (brochure crops): every current browser supports it
  const set = p.sizes.map((w) => `${IMG}${p.name}-${w}.webp ${w}w`).join(', ');
  return <img src={`${IMG}${p.name}-${p.sizes[p.sizes.length - 1]}.webp`} srcSet={set} sizes={sizes} alt={alt} width={p.w} height={p.h} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} className={className} />;
}

/** Full-screen room viewer: photos + facts, step through rooms without closing. */
function RoomViewer({ list, start, lang, onClose }: { list: HouseRoom[]; start: number; lang: Lang; onClose: () => void }) {
  const t = ALL_ROOMS_COPY[lang];
  const [ri, setRi] = useState(start);
  const [pi, setPi] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const x0 = useRef<number | null>(null);
  const r = list[ri], n = r.pics.length;
  const goRoom = useCallback((d: number) => { setRi((v) => (v + d + list.length) % list.length); setPi(0); }, [list.length]);

  useEffect(() => {
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = 'hidden'; closeRef.current?.focus({ preventScroll: true });
    if (panel.current) gsap.fromTo(panel.current, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' });
    return () => { html.style.overflow = prev; };
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setPi((v) => (v + 1) % n);
      else if (e.key === 'ArrowLeft') setPi((v) => (v - 1 + n) % n);
      else if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goRoom(1); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goRoom(-1); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [n, goRoom, onClose]);
  useEffect(() => {
    const img = panel.current?.querySelector('.js-rv-img');
    if (img) gsap.fromTo(img, { autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power3.out' });
  }, [ri, pi]);

  const p = r.pics[pi];
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="rv-title" className="fixed inset-0 z-[80] bg-[#0b100d]/95 backdrop-blur-sm">
      <div ref={panel} className="flex h-full flex-col text-white lg:grid lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="relative min-h-0 flex-1 lg:h-full"
          onPointerDown={(e) => { x0.current = e.clientX; }}
          onPointerUp={(e) => { if (x0.current == null) return; const d = e.clientX - x0.current; x0.current = null; if (Math.abs(d) > 50) setPi((v) => (v + (d < 0 ? 1 : -1) + n) % n); }}>
          <div key={`${r.no}-${pi}`} className="js-rv-img absolute inset-0 p-3 pt-16 md:p-10 md:pt-20">
            <Pic p={p} sizes="(min-width:1024px) 70vw, 100vw" eager className="h-full w-full select-none object-contain" alt={`${t.room} ${r.no} – ${t.photoOf(pi + 1, n)}`} />
          </div>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:bottom-6" aria-hidden>
            {r.pics.map((q, k) => <span key={q.name} className={`h-1.5 rounded-full bg-white transition-all duration-300 ${k === pi ? 'w-6' : 'w-1.5 opacity-40'}`} />)}
          </div>
          <button type="button" onClick={() => setPi((pi - 1 + n) % n)} aria-label={t.prev} className="rs-nav absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full md:grid"><span className="rotate-180"><Icon d={I.arrow} size={18} w={1.8} /></span></button>
          <button type="button" onClick={() => setPi((pi + 1) % n)} aria-label={t.next} className="rs-nav absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full md:grid"><Icon d={I.arrow} size={18} w={1.8} /></button>
        </div>

        <div className="relative max-h-[52svh] overflow-y-auto bg-[#FAF8F5] px-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-6 text-ink lg:max-h-none lg:px-9 lg:pt-20">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.26em] text-ink/55">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: TONE[r.type] }} />{t.types[r.type]}
          </div>
          <h2 id="rv-title" className="mt-2 flex items-baseline gap-3 font-display font-normal leading-none">
            <span className="text-[22px] text-ink/50">{t.room}</span><span className="lnum text-[64px] tracking-[-0.02em] md:text-[80px]">{r.no}</span>
          </h2>
          <dl className="mt-5 grid grid-cols-3 border-y border-ink/10">
            {[[t.filterFloor, t.floors[r.floor]], [t.guests(TYPE_GUESTS[r.type]).split(' ')[1], String(TYPE_GUESTS[r.type]) + (r.extraBed ? ' + 1' : '')], ['m²', String(r.m2)]].map(([k, v], i) => (
              <div key={k} className={`py-3.5 ${i ? 'border-l border-ink/10 pl-4' : 'pr-3'}`}>
                <dt className="text-[10px] font-semibold uppercase tracking-[.2em] text-ink/50">{k}</dt>
                <dd className="lnum mt-1 font-display text-[21px] leading-tight">{v}</dd>
              </div>
            ))}
          </dl>
          {r.extraBed && <p className="mt-3 text-[13.5px] text-pine">{t.extraBed}</p>}
          <p className="mt-5 text-[10.5px] font-semibold uppercase tracking-[.2em] text-ink/50">{t.equip}</p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {t.eq.map((e, i) => <li key={e} className="inline-flex items-center gap-1.5 rounded-full border border-ink/12 px-3 py-1.5 text-[13px] text-ink/80"><Icon d={EQ[i]} size={15} w={1.4} />{e}</li>)}
          </ul>
          <div className="mt-6 flex flex-col gap-2.5">
            <a href={BOOK_ROOMS} target="_blank" rel="noopener noreferrer" className="pr-btn-primary inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full px-6 text-[15px] font-semibold">{t.book}<Icon d={I.arrow} size={16} w={1.8} /></a>
            {CAT[r.type] && <a href={CAT[r.type]} className="pr-btn-ghost inline-flex min-h-[52px] items-center justify-center rounded-full px-6 text-[15px] font-semibold">{t.category}</a>}
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-ink/10 pt-4">
            <button type="button" onClick={() => goRoom(-1)} className="inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-ink/70 hover:text-ink"><span className="rotate-180"><Icon d={I.arrow} size={15} w={1.8} /></span>{list[(ri - 1 + list.length) % list.length].no}</button>
            <span className="lnum text-[12px] text-ink/45">{ri + 1} / {list.length}</span>
            <button type="button" onClick={() => goRoom(1)} className="inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-ink/70 hover:text-ink">{list[(ri + 1) % list.length].no}<Icon d={I.arrow} size={15} w={1.8} /></button>
          </div>
        </div>
      </div>
      <button ref={closeRef} type="button" onClick={onClose} aria-label={t.close} className="rs-close fixed right-4 top-4 z-10 grid h-12 w-12 place-items-center rounded-full"><Icon d={['M6 6l12 12M18 6 6 18']} size={20} w={1.6} /></button>
    </div>
  );
}

/** "All rooms" page – the house as an interactive elevation, then every room floor by floor. */
export function AllRoomsPage({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const t = ALL_ROOMS_COPY[lang];
  const { season } = useSeason();
  const [type, setType] = useState<RoomType | 'all'>('all');
  const [floor, setFloor] = useState<number | 'all'>('all');
  const [hover, setHover] = useState<HouseRoom | null>(null);
  const [view, setView] = useState<{ list: HouseRoom[]; i: number } | null>(null);
  const closeView = useCallback(() => setView(null), []);

  const visible = useMemo(() => HOUSE_ROOMS.filter((r) => (type === 'all' || r.type === type) && (floor === 'all' || r.floor === floor)), [type, floor]);
  const m2 = HOUSE_ROOMS.map((r) => r.m2);
  const open = (r: HouseRoom, list = visible.length && visible.includes(r) ? visible : HOUSE_ROOMS) => setView({ list, i: list.indexOf(r) });
  const matches = (r: HouseRoom) => (type === 'all' || r.type === type) && (floor === 'all' || r.floor === floor);

  // opening: the house builds itself floor by floor, the roof is drawn last
  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-ar-line'), { yPercent: 115 }, { yPercent: 0, duration: 1.1, stagger: 0.1, ease: 'power4.out' }, 0.15)
      .fromTo(q('.js-ar-in'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0.6);
    tl      .fromTo(q('.js-ar-stat'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 1.6);
    q('.js-ar-num').forEach((el) => {
      const o = { v: 0 }, end = Number(el.dataset.n);
      tl.to(o, { v: end, duration: 1.2, ease: 'power2.out', onUpdate: () => { el.textContent = String(Math.round(o.v)); } }, 1.65);
    });
    q('.js-ar-rev').forEach((el) => gsap.fromTo(el, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    q('.js-ar-bignum').forEach((el) => gsap.fromTo(el, { yPercent: 30 }, { yPercent: -30, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.6 } }));
  }, { scope: root, dependencies: [reduced] });

  // cards re-enter after a filter change
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduced || !root.current) return;
    gsap.fromTo(root.current.querySelectorAll('.js-ar-card'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.04, ease: 'power3.out' });
    ScrollTrigger.refresh();
  }, [type, floor, reduced]);

  const chip = (active: boolean) => `ar-chip inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold ${active ? 'is-on' : ''}`;

  return (
    <div ref={root}>
      {/* hero: the house */}
      <section id="top" aria-labelledby="ar-title" className="relative isolate overflow-hidden bg-[#0f1411] text-cream">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(80%_70%_at_75%_40%,color-mix(in_srgb,var(--k-pine)_45%,transparent),transparent_70%)]" />
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 pb-16 pt-[132px] sm:px-6 md:px-10 md:pb-24 md:pt-[170px] lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)] lg:gap-14 lg:px-14 lg:pt-[250px]">
          <div className="min-w-0">
            <p className="js-ar-in flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.32em] text-gold-light md:text-[12.5px]"><span aria-hidden className="h-px w-8 bg-gold-light" />{t.eyebrow}</p>
            <h1 id="ar-title" className="mt-5 font-display font-normal leading-[.98] tracking-[-0.02em]" style={{ fontSize: 'clamp(40px, 5.6vw, 88px)' }}>
              {t.title.map((l, i) => <span key={i} className="block overflow-hidden pb-[0.07em]"><span className={`js-ar-line block ${i === 2 ? 'italic text-gold-light' : ''}`}>{l}</span></span>)}
            </h1>
            <p className="js-ar-in mt-6 max-w-[480px] text-[16px] leading-relaxed text-cream/75 md:text-[17.5px]">{t.sub}</p>
            <dl className="mt-9 grid max-w-[460px] grid-cols-3 border-t border-cream/15">
              {[{ k: t.stats.rooms, n: 18 }, { k: t.stats.floors, n: 4 }, { k: t.stats.sizes, v: `${Math.min(...m2)}–${Math.max(...m2)}` }].map((s, i) => (
                <div key={s.k} className={`js-ar-stat pt-4 ${i ? 'border-l border-cream/15 pl-4' : ''}`}>
                  <dd className="lnum whitespace-nowrap font-display text-[30px] leading-none sm:text-[34px] md:text-[42px]">{'n' in s ? <span className="js-ar-num" data-n={s.n}>{s.n}</span> : s.v}{i === 2 && <span className="text-[.45em] text-gold-light"> m²</span>}</dd>
                  <dt className="mt-2 text-[10.5px] font-semibold uppercase tracking-[.2em] text-cream/55">{s.k}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* elevation */}
          <div className="relative min-w-0">
            <p className="js-ar-in mb-3 text-center text-[11px] font-semibold uppercase tracking-[.26em] text-cream/50">{t.house} · {t.houseHint}</p>
            <div className="relative mx-auto w-full max-w-[620px] lg:max-w-[560px]">
              <HouseFacade t={t} season={season} reduced={reduced} tone={TONE} floor={floor} matches={matches} hover={hover}
                onHover={setHover} onOpen={(r) => open(r, HOUSE_ROOMS)} onFloor={(f) => setFloor(floor === f ? 'all' : f)} />
              {/* hover preview (desktop) */}
              {fine && (
                <div className={`ar-peek pointer-events-none absolute left-1/2 top-[3%] z-10 w-[300px] overflow-hidden rounded-[16px] bg-[#FAF8F5] text-ink shadow-[0_30px_60px_-25px_rgba(0,0,0,.8)] ${hover ? 'is-on' : ''}`} aria-hidden>
                  {hover && (
                    <>
                      <div className="aspect-[16/9] overflow-hidden"><Pic p={hover.pics[0]} sizes="300px" className="h-full w-full object-cover" /></div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="font-display text-[22px] leading-none"><span className="lnum">{hover.no}</span></span>
                        <span className="text-[12px] text-ink/60">{t.types[hover.type]} · {hover.m2} m²</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <ul className="js-ar-in mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[12px] text-cream/70">
              {TYPES.map((k) => <li key={k} className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TONE[k] }} />{t.types[k]}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* filters */}
      <div className="ar-filters sticky top-[106px] z-30 border-b border-ink/[.07] bg-[#FAF8F5]/92 backdrop-blur-md">
        <div className="rs-track mx-auto flex max-w-[1440px] items-center gap-2 overflow-x-auto px-5 py-3 sm:px-6 md:px-10 lg:px-14 lg:pr-[300px]">
          <span className="mr-1 shrink-0 text-[10.5px] font-semibold uppercase tracking-[.2em] text-ink/45 max-md:sr-only">{t.filterType}</span>
          <button type="button" className={chip(type === 'all')} aria-pressed={type === 'all'} onClick={() => setType('all')}>{t.all}<span className="lnum opacity-60">18</span></button>
          {TYPES.map((k) => (
            <button key={k} type="button" className={chip(type === k)} aria-pressed={type === k} onClick={() => setType(type === k ? 'all' : k)}>
              <span className="h-2 w-2 rounded-full" style={{ background: TONE[k] }} />{t.types[k]}<span className="lnum opacity-60">{HOUSE_ROOMS.filter((r) => r.type === k).length}</span>
            </button>
          ))}
          <span className="mx-2 h-6 w-px shrink-0 bg-ink/12" />
          <span className="mr-1 shrink-0 text-[10.5px] font-semibold uppercase tracking-[.2em] text-ink/45 max-md:sr-only">{t.filterFloor}</span>
          <button type="button" className={chip(floor === 'all')} aria-pressed={floor === 'all'} onClick={() => setFloor('all')}>{t.all}</button>
          {[0, 1, 2, 3].map((f) => <button key={f} type="button" className={chip(floor === f)} aria-pressed={floor === f} onClick={() => setFloor(floor === f ? 'all' : f)}>{t.floors[f]}</button>)}
        </div>
      </div>

      {/* floor by floor */}
      <section aria-label={t.eyebrow} className="bg-[#FAF8F5] px-5 pb-24 pt-14 text-ink sm:px-6 md:px-10 md:pb-32 md:pt-20 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <p className="sr-only" aria-live="polite">{t.rooms(visible.length)}</p>
          {visible.length === 0 && <p className="py-20 text-center text-[16px] text-ink/60">{t.empty}</p>}
          {[0, 1, 2, 3].map((f) => {
            const rooms = visible.filter((r) => r.floor === f);
            if (!rooms.length) return null;
            return (
              <div key={f} className="relative mb-20 last:mb-0 md:mb-28">
                <span aria-hidden className="js-ar-bignum lnum pointer-events-none absolute -top-10 right-0 select-none font-display text-[150px] leading-none text-ink/[.045] md:-top-16 md:text-[260px]">{f === 0 ? '0' : f}</span>
                <header className="js-ar-rev relative flex items-end justify-between gap-4 border-b border-ink/10 pb-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[.3em] text-goldink">{String(f).padStart(2, '0')}</p>
                    <h2 className="mt-2 font-display font-normal leading-none tracking-[-0.015em]" style={{ fontSize: 'clamp(34px, 4vw, 58px)' }}>{t.floors[f]}</h2>
                  </div>
                  <span className="text-[12px] font-semibold uppercase tracking-[.2em] text-ink/50">{t.rooms(rooms.length)}</span>
                </header>
                <ul className="relative mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
                  {rooms.map((r) => (
                    <li key={r.no} className="js-ar-card js-ar-rev min-w-0">
                      <button type="button" onClick={() => open(r)} aria-label={`${t.open(r.no)} · ${t.types[r.type]} · ${r.m2} m²`}
                        className="pr-card group flex w-full flex-col overflow-hidden rounded-[22px] border border-ink/[.07] bg-white text-left outline-none focus-visible:ring-2 focus-visible:ring-gold">
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-pine/10">
                          <Pic p={r.pics[0]} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="pr-card-img h-full w-full object-cover" alt={`${t.room} ${r.no}`} />
                          <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />
                          <span className="lnum absolute bottom-3 left-4 font-display text-[54px] leading-none text-white [text-shadow:0_2px_18px_rgba(0,0,0,.35)] md:text-[64px]">{r.no}</span>
                          <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[.14em] text-ink">
                            <span className="h-2 w-2 rounded-full" style={{ background: TONE[r.type] }} />{t.types[r.type]}
                          </span>
                          <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[.14em] text-white/90"><Icon d={I.photo} size={15} />{r.pics.length}</span>
                        </div>
                        <div className="flex items-center gap-4 px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-[13.5px] text-ink/75"><Icon d={I.guest} size={17} />{t.guests(TYPE_GUESTS[r.type])}{r.extraBed ? ' +1' : ''}</span>
                          <span className="inline-flex items-center gap-1.5 text-[13.5px] text-ink/75"><Icon d={I.size} size={17} /><span className="lnum">{r.m2}</span> m²</span>
                          <span aria-hidden className="pr-arrow ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full"><Icon d={I.arrow} size={16} w={1.8} /></span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <p className="mt-16 text-center text-[12px] text-ink/45">{t.source}</p>
        </div>
      </section>

      <PensionFinalCTA lang={lang} />
      {view && <RoomViewer list={view.list} start={view.i} lang={lang} onClose={closeView} />}
    </div>
  );
}
