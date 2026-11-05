import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MLMap, Marker as MLMarker, Popup as MLPopup } from 'maplibre-gl';
import type { Lang } from '../content/hero';
import { CATS, TOP, type CatId, type Exp } from '../content/topExperiences';
import { PLACES, TOURS, TOUR_TYPES } from '../content/tours';
import { EXPLORE_MAP_COPY, PLAN_COPY } from '../content/explore';
import { useSeason } from '../lib/season';
import { locale } from '../lib/i18n';
import { Icon, I } from './pension/PensionRooms';

const MAPLIBRE_JS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
const STYLE = 'https://tiles.openfreemap.org/styles/positron';
const HOME: [number, number] = [47.27268, 12.42573];
type MLGlobal = typeof import('maplibre-gl');
function loadMapLibre(): Promise<MLGlobal> {
  const w = window as unknown as { maplibregl?: MLGlobal };
  if (w.maplibregl) return Promise.resolve(w.maplibregl);
  if (!document.querySelector(`link[href="${MAPLIBRE_CSS}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = MAPLIBRE_CSS; document.head.appendChild(l); }
  return new Promise((res, rej) => {
    const ex = document.querySelector<HTMLScriptElement>(`script[src="${MAPLIBRE_JS}"]`);
    const s = ex ?? document.createElement('script');
    s.addEventListener('load', () => (w.maplibregl ? res(w.maplibregl) : rej(new Error('maplibre missing'))));
    s.addEventListener('error', () => rej(new Error('maplibre failed')));
    if (!ex) { s.src = MAPLIBRE_JS; s.async = true; document.head.appendChild(s); }
  });
}
const dir = (lat: number, lon: number) => `https://www.google.com/maps/dir/?api=1&origin=${HOME[0]},${HOME[1]}&destination=${lat},${lon}`;
type Layer = 'exp' | 'tour' | 'place';
interface Pt { id: string; layer: Layer; lat: number; lon: number; name: string; sub: string; km: number; href: string }
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Central map – every experience, tour start and place on one OpenFreeMap basemap, with layer chips. */
export function ExploreMap({ lang }: { lang: Lang }) {
  const { season } = useSeason();
  const t = EXPLORE_MAP_COPY[lang];
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const marks = useRef<MLMarker[]>([]);
  const [ready, setReady] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [on, setOn] = useState<Record<Layer, boolean>>({ exp: true, tour: true, place: true });
  const nf = (n: number) => n.toLocaleString(locale(lang), { maximumFractionDigits: 1 });
  const nm = (e: Exp) => (lang === 'de' ? e.name : e.nameEn ?? e.name);

  const pts = useMemo<Pt[]>(() => [
    ...TOP[season].map((e) => ({ id: e.id, layer: 'exp' as const, lat: e.lat, lon: e.lon, name: nm(e), sub: CATS[e.cat][lang], km: e.km, href: '#experiences' })),
    ...TOURS.filter((x) => TOUR_TYPES.find((y) => y.id === x.type)!.season === season).map((x) => ({ id: x.id, layer: 'tour' as const, lat: x.lat, lon: x.lon, name: x.name[lang], sub: TOUR_TYPES.find((y) => y.id === x.type)!.label[lang], km: x.startKm, href: '#tours' })),
    ...PLACES.filter((p) => p.km >= 1.5).map((p) => ({ id: p.id, layer: 'place' as const, lat: p.lat, lon: p.lon, name: p.name, sub: p.tagline[lang], km: p.km, href: '#places' })),
  ], [season, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const node = el.current; if (!node) return;
    let dead = false;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect(); setReady('loading');
      try {
        const ml = await loadMapLibre(); if (dead) return;
        const m = new ml.Map({ container: node, style: STYLE, center: [12.45, 47.27], zoom: 8.6, attributionControl: false, cooperativeGestures: true });
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        m.addControl(new ml.AttributionControl({ compact: true }), 'bottom-right');
        m.on('load', () => {
          if (dead) return;
          const h = document.createElement('div'); h.className = 'xm-home'; h.innerHTML = '<span></span>KitzAlpen';
          new ml.Marker({ element: h, anchor: 'bottom' }).setLngLat([HOME[1], HOME[0]]).addTo(m);
          map.current = m; setReady('ready');
        });
      } catch { if (!dead) setReady('error'); }
    }, { rootMargin: '400px 0px' });
    io.observe(node);
    return () => { dead = true; io.disconnect(); map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current; const ml = (window as unknown as { maplibregl?: MLGlobal }).maplibregl;
    if (ready !== 'ready' || !m || !ml) return;
    marks.current.forEach((x) => x.remove()); marks.current = [];
    const shown = pts.filter((p) => on[p.layer]);
    shown.forEach((p) => {
      const d = document.createElement('button'); d.type = 'button'; d.className = `xm-dot is-${p.layer}`; d.setAttribute('aria-label', `${p.name} · ${p.km} km`);
      const pop: MLPopup = new ml.Popup({ offset: 14, closeButton: true, maxWidth: '260px' }).setHTML(
        `<p class="xm-sub">${esc(p.sub)}</p><p class="xm-name">${esc(p.name)}</p><p class="xm-km">${esc(nf(p.km))} km ${esc(t.fromHouse)}</p><p class="xm-links"><a href="${p.href}">${esc(t.details)}</a><a href="${dir(p.lat, p.lon)}" target="_blank" rel="noopener noreferrer">${esc(t.route)} ↗</a></p>`);
      marks.current.push(new ml.Marker({ element: d }).setLngLat([p.lon, p.lat]).setPopup(pop).addTo(m));
    });
    if (shown.length) {
      const b = new ml.LngLatBounds([HOME[1], HOME[0]], [HOME[1], HOME[0]]);
      shown.filter((p) => p.km <= 45).forEach((p) => b.extend([p.lon, p.lat]));
      m.fitBounds(b, { padding: 50, maxZoom: 11, duration: 900 });
    }
  }, [ready, pts, on]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = (l: Layer) => pts.filter((p) => p.layer === l).length;
  return (
    <section id="explore-map" aria-labelledby="xm-title" className="scroll-mt-28 bg-cream px-5 py-20 text-ink sm:px-6 md:px-10 md:py-24 lg:px-14">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <header className="max-w-[720px]">
            <p className="flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] text-ink/75 md:text-[13px]"><span aria-hidden className="h-px w-8 bg-ink/40 md:w-12" />{t.eyebrow}</p>
            <h2 id="xm-title" className="mt-4 font-display font-medium italic leading-[1.02] text-pine" style={{ fontSize: 'clamp(34px, 4.2vw, 64px)' }}>{t.title}</h2>
          </header>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t.layers}>
            {(['exp', 'tour', 'place'] as Layer[]).map((l) => (
              <button key={l} type="button" aria-pressed={on[l]} onClick={() => setOn((s) => ({ ...s, [l]: !s[l] }))} className={`xm-chip inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold ${on[l] ? 'is-on' : ''}`}>
                <span aria-hidden className={`xm-key is-${l}`} />{t.layer[l]}<span className="lnum text-[12px] opacity-60">{count(l)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="relative mt-8 overflow-hidden rounded-[26px] border border-pine/10 bg-soft">
          <div ref={el} className="h-[68vh] min-h-[440px] w-full" />
          {ready !== 'ready' && <p className="absolute inset-0 grid place-items-center text-[14px] text-ink/55">{ready === 'error' ? t.error : t.loading}</p>}
        </div>
        <p className="mt-3 text-[12.5px] text-ink/50">{t.note[season]}</p>
      </div>
    </section>
  );
}

/** Trip planner – days, interests and kids → a day-by-day plan built only from the verified experiences. */
export function TripPlanner({ lang }: { lang: Lang }) {
  const { season } = useSeason();
  const t = PLAN_COPY[lang];
  const list = TOP[season];
  const cats = useMemo(() => [...new Set(list.map((e) => e.cat))], [list]);
  const [days, setDays] = useState(3);
  const [want, setWant] = useState<CatId[]>([]);
  const [kids, setKids] = useState(false);
  const [copied, setCopied] = useState(false);
  const nm = (e: Exp) => (lang === 'de' ? e.name : e.nameEn ?? e.name);
  const indoor = (e: Exp) => e.cat === 'wellness' || e.cat === 'culture';

  const plan = useMemo(() => {
    let pool = [...list];
    const score = (e: Exp) => (want.includes(e.cat) ? 0 : 1) * 100 + (kids && !e.family ? 50 : 0) + (e.signature ? 0 : 10) + list.indexOf(e);
    pool = [...pool].sort((a, b) => score(a) - score(b));
    const used = new Set<string>();
    const out: { main: Exp; near?: Exp }[] = [];
    for (const e of pool) {
      if (out.length >= days) break;
      if (used.has(e.id)) continue;
      used.add(e.id);
      const dist = (x: Exp) => Math.hypot(x.lat - e.lat, (x.lon - e.lon) * Math.cos((e.lat * Math.PI) / 180));
      const near = pool.filter((x) => !used.has(x.id) && dist(x) < 0.12).sort((a, b) => dist(a) - dist(b))[0];
      if (near) used.add(near.id);
      out.push({ main: e, near });
    }
    const rain = list.filter((e) => indoor(e) && !used.has(e.id)).slice(0, 2);
    return { out, rain };
  }, [list, days, want, kids]); // eslint-disable-line react-hooks/exhaustive-deps

  const text = () => [t.shareTitle(days), ...plan.out.map((d, i) => `${t.day(i + 1)}: ${nm(d.main)} (${d.main.km} km)${d.near ? ` + ${nm(d.near)}` : ''}`), plan.rain.length ? `${t.rain}: ${plan.rain.map(nm).join(', ')}` : '', 'KitzAlpen · Hollersbach im Pinzgau'].filter(Boolean).join('\n');
  const share = async () => {
    const s = text();
    try { if (navigator.share) { await navigator.share({ title: 'KitzAlpen', text: s }); return; } await navigator.clipboard.writeText(s); setCopied(true); window.setTimeout(() => setCopied(false), 2200); } catch { /* cancelled */ }
  };

  return (
    <section id="trip-planner" aria-labelledby="tp2-title" className="scroll-mt-28 bg-soft px-5 py-20 text-ink sm:px-6 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto grid max-w-[1360px] gap-10 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-14">
        <div>
          <p className="flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] text-ink/75 md:text-[13px]"><span aria-hidden className="h-px w-8 bg-ink/40 md:w-12" />{t.eyebrow}</p>
          <h2 id="tp2-title" className="mt-4 font-display font-medium italic leading-[1.02] text-pine" style={{ fontSize: 'clamp(34px, 4vw, 58px)' }}>{t.title}</h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-ink/70">{t.sub}</p>
          <div className="mt-8 space-y-6 rounded-[24px] bg-cream p-6">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[.16em] text-ink/60">{t.days}</p>
              <div className="mt-2 flex flex-wrap gap-2">{[1, 2, 3, 4, 5, 7].map((n) => <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)} className={`gp-chip lnum min-h-11 min-w-11 rounded-full px-3 text-[15px] font-semibold ${days === n ? 'is-on' : ''}`}>{n}</button>)}</div>
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[.16em] text-ink/60">{t.interests}</p>
              <div className="mt-2 flex flex-wrap gap-2">{cats.map((c) => { const a = want.includes(c); return <button key={c} type="button" aria-pressed={a} onClick={() => setWant((w) => (a ? w.filter((x) => x !== c) : [...w, c]))} className={`gp-chip min-h-11 rounded-full px-4 text-[14px] font-semibold ${a ? 'is-on' : ''}`}>{CATS[c][lang]}</button>; })}</div>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] font-semibold text-pine">
              <input type="checkbox" checked={kids} onChange={(e) => setKids(e.target.checked)} className="h-5 w-5 accent-[var(--k-pine)]" />{t.kids}
            </label>
          </div>
        </div>
        <div className="min-w-0" aria-live="polite">
          <ol className="relative space-y-4 border-l-2 border-pine/15 pl-6 md:pl-8">
            {plan.out.map((d, i) => (
              <li key={d.main.id} className="relative">
                <span aria-hidden className="absolute -left-[37px] top-6 grid h-6 w-6 place-items-center rounded-full bg-pine text-[11px] font-bold text-cream md:-left-[45px]">{i + 1}</span>
                <article className="overflow-hidden rounded-[22px] bg-cream sm:grid sm:grid-cols-[200px_minmax(0,1fr)]">
                  <div className="relative h-40 sm:h-full">{d.main.img ? <img src={`${import.meta.env.BASE_URL}${d.main.img}`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : <div className="tp-type absolute inset-0" />}</div>
                  <div className="p-5">
                    <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-goldink">{t.day(i + 1)} · {CATS[d.main.cat][lang]}</p>
                    <h3 className="mt-1.5 font-display text-[25px] italic leading-tight text-pine">{nm(d.main)}</h3>
                    <p className="lnum mt-1 text-[13px] text-ink/55">{d.main.town} · {d.main.km.toLocaleString(locale(lang))} km · {t.min(d.main.min)}</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink/70">{d.main.text[lang]}</p>
                    {d.near && <p className="mt-3 rounded-[12px] bg-soft px-3 py-2 text-[13.5px] text-ink/70"><b className="font-semibold text-pine">{t.near}:</b> {nm(d.near)} ({d.near.km.toLocaleString(locale(lang))} km)</p>}
                    <div className="mt-3 flex flex-wrap gap-2 text-[13px] font-semibold">
                      <a href={d.main.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-full bg-pine px-4 text-cream">{t.official} ↗</a>
                      <a href={dir(d.main.lat, d.main.lon)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-pine/15 px-4 text-pine">{t.route} ↗</a>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ol>
          {plan.rain.length > 0 && <p className="mt-6 rounded-[18px] border border-pine/15 bg-cream p-4 text-[14px] leading-relaxed text-ink/75"><b className="text-pine">{t.rain}:</b> {plan.rain.map(nm).join(' · ')}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={share} className="ph-primary inline-flex min-h-[52px] items-center gap-2.5 rounded-full px-6 text-[15px] font-semibold">{copied ? t.copied : t.share}<Icon d={I.arrow} size={16} w={1.8} /></button>
            <a href="#all-rooms" className="inline-flex min-h-[52px] items-center rounded-full border border-pine/20 px-6 text-[15px] font-semibold text-pine">{t.rooms}</a>
          </div>
          <p className="mt-4 text-[12.5px] text-ink/50">{t.note}</p>
        </div>
      </div>
    </section>
  );
}

