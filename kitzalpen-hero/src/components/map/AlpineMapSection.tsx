import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Map as MLMap, Marker as MLMarker } from 'maplibre-gl';
import type { Lang } from '../../content/hero';
import { CATS, directionsUrl, HOME, MAP_COPY, MAP_POINTS, PENSION_MAPS, type MapCat, type MapPoint } from '../../content/map';
import { useReducedMotion, useIsMobile } from '../../lib/hooks';
import { useSeason } from '../../lib/season';
import { Logo } from '../Logo';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const BASE = `${import.meta.env.BASE_URL}`;
const abs = (p: string) => new URL(BASE + p, window.location.href).href;
/** MapLibre GL JS – open source, no API key. Loaded only when the section approaches. */
const MAPLIBRE_JS = `${import.meta.env.BASE_URL}vendor/maplibre-gl-4.7.1/maplibre-gl.js`;
type MLGlobal = typeof import('maplibre-gl');

let mlPromise: Promise<MLGlobal> | null = null;
let satProtocol: Promise<void> | null = null;
function loadMapLibre(): Promise<MLGlobal> {
  const w = window as unknown as { maplibregl?: MLGlobal };
  if (w.maplibregl) return Promise.resolve(w.maplibregl);
  mlPromise ??= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = MAPLIBRE_JS; s.async = true;
    s.onload = () => (w.maplibregl ? res(w.maplibregl) : rej(new Error('maplibre missing')));
    s.onerror = () => rej(new Error('maplibre failed'));
    document.head.appendChild(s);
  });
  return mlPromise;
}

const ICON: Record<MapCat, string> = {
  ski: 'M14.5 5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM3 19.5l17 2.2M7.5 12.5l4-3.2 3 2.6-2.2 3.6 3 2.6',
  adventure: 'M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.4l6-.8Z',
  lakes: 'M2.5 17c1.6 0 1.6 1.2 3.2 1.2S7.3 17 8.9 17s1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 2.9-1.2M3 13.5 8.5 6l3.4 4.6L14.5 7 21 13.5',
  hiking: 'M13.5 5.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM10 21l2.2-6.2 2.6 2.4V21M8.5 11.5l2.4-3.6 3.8 1.2 2 3M18.5 9.5 17 21',
  cable: 'M2.5 5.5 21.5 3M12 4.2v3.3M7 7.5h10l1 7.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z',
  family: 'M7 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16.5 9a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2ZM4 21v-6.5a3 3 0 0 1 6 0V21M14 21v-4.8a2.5 2.5 0 0 1 5 0V21',
};
const CatIcon = ({ c, size = 16 }: { c: MapCat; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ICON[c]} /></svg>
);
const DirIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2.5 21.5 12 12 21.5 2.5 12Z" /><path d="M9 13.5v-2a1.5 1.5 0 0 1 1.5-1.5H15M13 8l2 2-2 2" /></svg>
);

interface Routes { [id: string]: { km: number; min: number } }

function PlaceCard({ p, lang, copy, route, compact, onClose }: { p: MapPoint; lang: Lang; copy: (typeof MAP_COPY)['de']; route?: { km: number; min: number }; compact?: boolean; onClose?: () => void }) {
  return (
    <article className={`map-card relative overflow-hidden rounded-[18px] ${compact ? '' : 'js-map-card'}`}>
      {compact ? null : p.photo ? (
        <div className={`map-card-photo relative overflow-hidden ${compact ? 'h-[108px]' : 'h-[150px]'}`}>
          <img src={`${BASE}images/activities/${p.photo}.webp`} alt={p.name[lang]} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className={`relative grid place-items-center overflow-hidden bg-[linear-gradient(150deg,var(--k-pine),var(--k-deep))] text-gold ${compact ? 'h-[108px]' : 'h-[150px]'}`}>
          <svg aria-hidden viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-gold/25">
            {[0, 1, 2, 3].map((i) => <path key={i} fill="none" stroke="currentColor" strokeWidth=".6" d={`M0 ${80 - i * 12} C 40 ${70 - i * 14}, 70 ${40 - i * 8}, 100 ${36 - i * 8} S 160 ${60 - i * 10}, 200 ${70 - i * 12}`} />)}
          </svg>
          <span className="relative"><CatIcon c={p.cat} size={34} /></span>
        </div>
      )}
      {onClose && (
        <button type="button" onClick={onClose} aria-label={copy.close} className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-deep/60 text-cream backdrop-blur-sm hover:bg-deep">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      )}
      <div className={compact ? 'p-3.5' : 'p-4 md:p-5'}>
        <p className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[.2em] text-gold-light"><CatIcon c={p.cat} size={13} />{copy.cats[p.cat]}</p>
        <h3 className={`mt-1.5 font-display font-medium leading-[1.05] text-cream ${compact ? 'text-[21px]' : 'text-[26px]'}`}>{p.name[lang]}</h3>
        {!compact && <p className="mt-2 text-[14px] leading-relaxed text-cream/75">{p.text[lang]}</p>}
        <p className="mt-2 text-[12.5px] text-cream/60">{copy.access}: {p.access[lang]}</p>
        {route && <p className="mt-1 text-[12.5px] font-semibold tabular-nums text-cream/85" title={copy.driveNote}>{copy.drive(route.km, route.min)} <span className="font-normal text-cream/50">{copy.from}</span></p>}
        <a href={directionsUrl(p)} target="_blank" rel="noopener noreferrer" className="map-dir mt-3.5 flex min-h-[48px] items-center justify-center gap-2.5 rounded-full text-[14px] font-semibold uppercase tracking-[.12em]">
          <DirIcon /> {copy.directions} <span className="arrow" aria-hidden>↗</span>
        </a>
      </div>
    </article>
  );
}

/** Mobile: slim card – photo, name, distance and a direct route button. */
function MiniCard({ p, lang, copy, route, active }: { p: MapPoint; lang: Lang; copy: (typeof MAP_COPY)['de']; route?: { km: number; min: number }; active: boolean }) {
  return (
    <div className={`map-mini flex items-center gap-3 rounded-[16px] p-2 pr-2.5 ${active ? 'is-active' : ''}`}>
      <span className="grid h-[60px] w-[60px] shrink-0 place-items-center overflow-hidden rounded-[11px] bg-[linear-gradient(150deg,var(--k-pine),var(--k-deep))] text-gold-light">
        {p.photo ? <img src={`${BASE}images/activities/${p.photo}.webp`} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <CatIcon c={p.cat} size={24} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-gold-light"><CatIcon c={p.cat} size={11} />{copy.cats[p.cat]}</span>
        <span className="mt-0.5 block truncate font-display text-[18px] font-medium leading-tight text-cream">{p.name[lang]}</span>
        <span className="block truncate text-[11.5px] tabular-nums text-cream/65">{route ? copy.drive(route.km, route.min) : p.access[lang]}</span>
      </span>
      <a href={directionsUrl(p)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label={`${copy.directions}: ${p.name[lang]}`}
        className="map-dir grid h-11 w-11 shrink-0 place-items-center rounded-full"><DirIcon /></a>
    </div>
  );
}

export function AlpineMapSection({ lang }: { lang: Lang }) {
  const root = useRef<HTMLElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef<Map<string, { m: MLMarker; el: HTMLElement }>>(new Map());
  const homeMarker = useRef<MLMarker | null>(null);
  const flown = useRef(false);
  const { season } = useSeason();
  const reduced = useReducedMotion();
  const mobile = useIsMobile();
  const copy = MAP_COPY[lang];
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [cat, setCat] = useState<'all' | MapCat>('all');
  const [sel, setSel] = useState<string | null>(null);
  const progScroll = useRef(0);
  const [routes, setRoutes] = useState<Routes>({});
  const [is3d, setIs3d] = useState(true);

  const visible = useMemo(() => MAP_POINTS.filter((p) => p.season === season && (cat === 'all' || p.cat === cat)), [season, cat]);
  const selected = MAP_POINTS.find((p) => p.id === sel) ?? null;

  useEffect(() => { setCat('all'); setSel(null); }, [season]);
  useEffect(() => { fetch(`${BASE}map/routes.json`).then((r) => r.json()).then(setRoutes).catch(() => {}); }, []);

  // ------------------------------------------------ intro reveal (once)
  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.set(q('.js-map-line'), { yPercent: 110 });
    gsap.set(q('.js-map-sub, .js-map-eyebrow'), { autoAlpha: 0, y: 14 });
    gsap.set(holder.current, { clipPath: 'inset(10% 6% 10% 6% round 28px)' });
    ScrollTrigger.create({ trigger: root.current, start: 'top 70%', once: true, onEnter: () => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .to(q('.js-map-eyebrow'), { autoAlpha: 1, y: 0, duration: 0.6 }, 0)
        .to(q('.js-map-line'), { yPercent: 0, duration: 0.9, stagger: 0.12, ease: 'power4.out' }, 0.1)
        .to(q('.js-map-sub'), { autoAlpha: 1, y: 0, duration: 0.7 }, 0.45)
        .to(holder.current, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.2, ease: 'power3.inOut' }, 0.3);
    } });
  }, { scope: root, dependencies: [reduced] });

  // ------------------------------------------------ lazy-load + init the map
  useEffect(() => {
    const el = mapEl.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setStatus('loading');
      try {
        const ml = await loadMapLibre();
        const meta = await (await fetch(`${BASE}map/meta.json`)).json();
        // satellite tiles come from one packed file (sat-pack.jpg + index) via a custom protocol
        if (!satProtocol) {
          satProtocol = (async () => {
            const [idx, buf] = await Promise.all([fetch(`${BASE}map/sat-index.json`).then((r) => r.json()), fetch(`${BASE}map/sat-pack.jpg`).then((r) => r.arrayBuffer())]);
            ml.addProtocol('kzsat', async (params: { url: string }) => {
              const key = params.url.replace('kzsat://', '');
              const e = (idx as Record<string, [number, number]>)[key];
              if (!e) throw new Error('no tile');
              return { data: buf.slice(e[0], e[0] + e[1]) };
            });
          })();
        }
        await satProtocol;
        if (cancelled) return;
        const [W, S, E, N] = meta.bbox as number[];
        const m = new ml.Map({
          container: el,
          attributionControl: false,
          center: [(W + E) / 2, (S + N) / 2], zoom: 9.4, pitch: 0, bearing: 0,
          minZoom: 9, maxZoom: 14.6, maxPitch: 70, maxBounds: [[12.0, 47.04], [12.88, 47.42]],
          dragRotate: true, touchPitch: true, cooperativeGestures: false,
          style: {
            version: 8,
            sources: {
              // XYZ tiles (z9–13, overzoomed beyond) – drapes reliably on 3D terrain on every device, incl. iOS
              sat: { type: 'raster', tiles: ['kzsat://{z}/{x}/{y}'], tileSize: 256, minzoom: 9, maxzoom: 13, bounds: [12.02, 47.06, 12.86, 47.40] },
              dem: { type: 'raster-dem', tiles: [abs('map/dem/') + '{z}/{x}/{y}.png'], tileSize: 256, encoding: 'terrarium', minzoom: 8, maxzoom: 11, bounds: [W, S, E, N] },
            },
            layers: [
              { id: 'bg', type: 'background', paint: { 'background-color': '#9db1bf' } },
              { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-fade-duration': 0, 'raster-contrast': 0.12, 'raster-saturation': 0.18, 'raster-brightness-min': 0.06 } },
              { id: 'hill', type: 'hillshade', source: 'dem', paint: { 'hillshade-exaggeration': 0.12, 'hillshade-shadow-color': '#0a1410', 'hillshade-highlight-color': '#ffffff', 'hillshade-accent-color': '#000000' } },
            ],
            terrain: { source: 'dem', exaggeration: 1.2 },
          } as never,
        });
        m.addControl(new ml.AttributionControl({ compact: true, customAttribution: [
          'Satellit: <a href="https://cloudless.eox.at" target="_blank" rel="noopener">EOxCloudless 2016</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 &amp; 2017), CC BY 4.0',
          'Gelände: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">AWS Terrain Tiles</a> (Mapzen)',
          'Orte &amp; Routen: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende',
        ] }), 'bottom-right');
        map.current = m;
        m.on('load', () => {
          if (cancelled) return;
          setStatus('ready');
          // attribution stays available behind the (i) button, collapsed by default
          el.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
          // KitzAlpen home marker
          const h = document.createElement('div');
          h.className = 'map-home';
          h.innerHTML = '<span class="map-home-halo"></span><span class="map-home-pin"><span class="map-home-logo"></span></span><span class="map-home-label">KitzAlpen</span>';
          const logo = h.querySelector<HTMLElement>('.map-home-logo');
          if (logo) { const u = `url(${abs('images/logo-kitzalpen.png')})`; logo.style.webkitMaskImage = u; logo.style.maskImage = u; }
          h.style.zIndex = '5';
          homeMarker.current = new ml.Marker({ element: h, anchor: 'bottom', opacityWhenCovered: '0.9' } as never).setLngLat([HOME[1], HOME[0]]).addTo(m);
          gsap.fromTo(h.querySelector('.map-home-pin'), { scale: 0, y: 20 }, { scale: 1, y: 0, duration: reduced ? 0 : 0.8, ease: 'back.out(1.8)', delay: reduced ? 0 : 0.6 });
        });
        m.on('error', () => { /* tile errors outside the bbox are expected; the image + DEM are local */ });
      } catch { if (!cancelled) setStatus('error'); }
    }, { rootMargin: '500px 0px' });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); map.current?.remove(); map.current = null; markers.current.clear(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // cinematic approach – once, when the map is visible and ready
  useEffect(() => {
    if (status !== 'ready' || flown.current) return;
    const m = map.current; if (!m) return;
    const st = ScrollTrigger.create({ trigger: holder.current, start: 'top 75%', once: true, onEnter: () => {
      flown.current = true;
      const target = { center: [HOME[1] - 0.03, HOME[0] - 0.02] as [number, number], zoom: mobile ? 9.9 : 10.45, pitch: mobile ? 46 : 56, bearing: -14,
        padding: mobile ? { top: 50, bottom: 110, left: 0, right: 0 } : { top: 0, bottom: 0, left: 400, right: 0 } };
      if (reduced) m.jumpTo(target); else m.flyTo({ ...target, duration: 4200, curve: 1.3, essential: true });
    } });
    return () => st.kill();
  }, [status, mobile, reduced]);

  // ------------------------------------------------ markers follow season + filter (camera stays)
  const select = useCallback((id: string | null, fly = true) => {
    setSel(id);
    const m = map.current; const p = MAP_POINTS.find((x) => x.id === id);
    if (!m || !p || !fly) return;
    const pad = mobile ? { top: 70, bottom: 120, left: 30, right: 60 } : { top: 60, bottom: 60, left: 440, right: 60 };
    const cam = { center: [p.pos[1], p.pos[0]] as [number, number], zoom: 12.4, pitch: is3d ? (mobile ? 50 : 56) : 0, padding: pad };
    if (reduced) m.jumpTo(cam); else m.flyTo({ ...cam, duration: 2200, curve: 1.4, essential: true });
  }, [mobile, reduced, is3d]);

  // deep link from the mountain guide: #karte-<pointId> – scroll here, then fly to the point once ready
  const pending = useRef<string | null>(null);
  useEffect(() => {
    const read = () => {
      const mm = /^#karte-(.+)$/.exec(window.location.hash);
      if (!mm || !MAP_POINTS.some((x) => x.id === mm[1])) return;
      pending.current = mm[1];
      window.setTimeout(() => root.current?.scrollIntoView({ behavior: 'auto', block: 'start' }), 120);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  useEffect(() => {
    if (status !== 'ready' || !pending.current) return;
    const id = pending.current; pending.current = null; flown.current = true;
    setCat('all');
    window.setTimeout(() => select(id), 400);
  }, [status, select]);

  useEffect(() => {
    const m = map.current; const ml = (window as unknown as { maplibregl?: MLGlobal }).maplibregl;
    if (status !== 'ready' || !m || !ml) return;
    const keep = new Set(visible.map((p) => p.id));
    // remove markers that no longer belong (fade out)
    markers.current.forEach((v, id) => {
      if (keep.has(id)) return;
      markers.current.delete(id);
      gsap.to(v.el.firstElementChild, { scale: 0.4, autoAlpha: 0, duration: reduced ? 0 : 0.3, ease: 'power2.in', onComplete: () => { v.m.remove(); } });
    });
    // add new ones (staggered)
    let i = 0;
    visible.forEach((p) => {
      if (markers.current.has(p.id)) return;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'map-pin';
      el.setAttribute('aria-label', p.name[lang]);
      el.innerHTML = `<span class="map-pin-dot"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[p.cat]}"/></svg></span><span class="map-pin-tip">${p.name[lang].replace(/</g, '&lt;')}</span>`;
      el.addEventListener('click', (e) => { e.stopPropagation(); select(p.id); });
      const mk = new ml.Marker({ element: el, anchor: 'center', opacityWhenCovered: '0.9' } as never).setLngLat([p.pos[1], p.pos[0]]).addTo(m);
      markers.current.set(p.id, { m: mk, el });
      gsap.fromTo(el.firstElementChild, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: reduced ? 0 : 0.5, ease: 'back.out(2)', delay: reduced ? 0 : 0.9 + i++ * 0.08 });
    });
  }, [visible, status, lang, reduced, select]);

  // highlight selected marker + keep labels in the current language
  useEffect(() => {
    markers.current.forEach((v, id) => {
      v.el.classList.toggle('is-active', id === sel);
      const p = MAP_POINTS.find((x) => x.id === id);
      if (p) { v.el.setAttribute('aria-label', p.name[lang]); const tip = v.el.querySelector('.map-pin-tip'); if (tip) tip.textContent = p.name[lang]; }
    });
  }, [sel, lang, visible]);

  // card reveal on selection (desktop panel)
  useEffect(() => {
    if (!sel || reduced) return;
    const c = root.current?.querySelector('.js-map-card');
    if (c) { gsap.fromTo(c, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out' }); gsap.fromTo(c.querySelector('img'), { scale: 1.08 }, { scale: 1, duration: 1.1, ease: 'power3.out' }); }
  }, [sel, reduced]);

  // mobile: marker selection scrolls the card strip; swiping the strip selects the centred card
  useEffect(() => {
    if (!mobile || !sel || !strip.current) return;
    const card = strip.current.querySelector<HTMLElement>(`[data-id="${sel}"]`);
    progScroll.current = Date.now();
    if (card) strip.current.scrollTo({ left: card.offsetLeft - 12, behavior: reduced ? 'auto' : 'smooth' });
  }, [sel, mobile, reduced]);
  useEffect(() => {
    const s = strip.current; if (!s || !mobile) return;
    let t = 0;
    const on = () => { window.clearTimeout(t); t = window.setTimeout(() => {
      if (Date.now() - progScroll.current < 900) return; // our own scroll, not a swipe
      const left = s.scrollLeft + 12;
      let best: HTMLElement | null = null, d = Infinity;
      s.querySelectorAll<HTMLElement>('[data-id]').forEach((c) => { const cd = Math.abs(c.offsetLeft - left); if (cd < d) { d = cd; best = c; } });
      const id = (best as HTMLElement | null)?.dataset.id;
      if (id && id !== sel) select(id);
    }, 160); };
    s.addEventListener('scroll', on, { passive: true });
    return () => { s.removeEventListener('scroll', on); window.clearTimeout(t); };
  }, [mobile, sel, select]);

  const reset = () => {
    const m = map.current; if (!m) return;
    setSel(null);
    const cam = { center: [HOME[1] - 0.03, HOME[0] - 0.02] as [number, number], zoom: mobile ? 9.9 : 10.45, pitch: is3d ? (mobile ? 46 : 56) : 0, bearing: -14,
      padding: mobile ? { top: 50, bottom: 110, left: 0, right: 0 } : { top: 0, bottom: 0, left: 400, right: 0 } };
    if (reduced) m.jumpTo(cam); else m.flyTo({ ...cam, duration: 1800, essential: true });
  };
  const toggle3d = () => { const m = map.current; if (!m) return; const n = !is3d; setIs3d(n); m.easeTo({ pitch: n ? 58 : 0, duration: reduced ? 0 : 900 }); };

  const filters = (
    <div role="group" aria-label={copy.list} className="flex flex-wrap gap-1.5">
      {CATS[season].map((c) => (
        <button key={c} type="button" aria-pressed={cat === c} onClick={() => { setCat(c); setSel(null); }} className={`map-filter ${cat === c ? 'is-on' : ''}`}>{copy.cats[c]}</button>
      ))}
    </div>
  );

  return (
    <section ref={root} id="karte" aria-labelledby="map-title" className="relative overflow-hidden bg-cream text-ink">
      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-16 sm:px-6 md:px-10 md:pb-28 md:pt-24 lg:px-14">
        <header className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="js-map-eyebrow flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] text-ink/80"><span aria-hidden className="h-px w-10 bg-gold" />{copy.eyebrow}</p>
            <h2 id="map-title" className="mt-4 font-display font-medium leading-[0.95] tracking-[-0.015em] text-pine" style={{ fontSize: 'clamp(44px, 6.4vw, 104px)' }}>
              <span className="block overflow-hidden pb-[0.04em]"><span className="js-map-line block">{copy.headline[0]}</span></span>
              <span className="block overflow-hidden pb-[0.12em] pr-[0.06em]"><span className="js-map-line block italic text-goldink">{copy.headline[1]}</span></span>
            </h2>
          </div>
          <p className="js-map-sub max-w-[34ch] text-[17px] leading-relaxed text-ink/75 md:pb-4 md:text-right md:text-[19px]">{copy.sub}</p>
        </header>

        <div ref={holder} className="map-holder relative -mx-5 h-[78svh] min-h-[520px] overflow-hidden bg-deep sm:-mx-6 md:mx-0 md:h-[720px] md:rounded-[22px]">
          <div ref={mapEl} className="absolute inset-0" role="region" aria-label={copy.mapLabel} />

          {status !== 'ready' && (
            <div className="absolute inset-0 grid place-items-center bg-cover bg-center" style={{ backgroundImage: `url(${BASE}map/satellite.jpg)` }}>
              <div className="absolute inset-0 bg-deep/55" />
              <div className="relative px-6 text-center text-cream">
                {status === 'error' ? (
                  <><p className="text-[16px]">{copy.fail}</p><a href={PENSION_MAPS} target="_blank" rel="noopener noreferrer" className="map-dir mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-full px-6 text-[14px] font-semibold">{copy.failCta} ↗</a></>
                ) : <p className="text-[13px] uppercase tracking-[.24em] text-cream/80">{copy.loading}</p>}
              </div>
            </div>
          )}

          {/* custom controls */}
          <div className="map-ctls absolute right-3 top-[60px] z-[2] flex flex-col overflow-hidden md:right-5 md:top-5 md:gap-2 md:overflow-visible">
            <button type="button" className="map-ctl" aria-label={copy.zoomIn} onClick={() => map.current?.zoomIn()}>+</button>
            <button type="button" className="map-ctl" aria-label={copy.zoomOut} onClick={() => map.current?.zoomOut()}>−</button>
            <button type="button" className="map-ctl text-[11px] font-bold tracking-[.06em]" aria-label={copy.tilt} aria-pressed={is3d} onClick={toggle3d}>{is3d ? '3D' : '2D'}</button>
            <button type="button" className="map-ctl" aria-label={copy.reset} title={copy.reset} onClick={reset}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" /></svg>
            </button>
          </div>

          {/* desktop: floating panel – home, filters, list / selected card */}
          <aside className="map-panel absolute bottom-5 left-5 top-5 z-[2] hidden w-[380px] flex-col overflow-hidden rounded-[20px] md:flex">
            <div className="flex items-center gap-3 border-b border-cream/10 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream/10 text-cream"><Logo mark className="w-7" /></span>
              <div className="min-w-0"><p className="text-[14px] font-semibold text-cream">{copy.home}</p><p className="text-[12px] text-cream/60">{copy.homeSub}</p></div>
            </div>
            <div className="border-b border-cream/10 p-4">{filters}</div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {selected ? (
                <PlaceCard key={selected.id} p={selected} lang={lang} copy={copy} route={routes[selected.id]} onClose={() => setSel(null)} />
              ) : (
                <ul className="flex flex-col gap-1">
                  {visible.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => select(p.id)} onMouseEnter={() => markers.current.get(p.id)?.el.classList.add('is-hover')} onMouseLeave={() => markers.current.get(p.id)?.el.classList.remove('is-hover')}
                        className="map-row flex w-full items-center gap-3 rounded-[12px] p-2.5 text-left">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/40 text-gold-light"><CatIcon c={p.cat} /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-[14.5px] font-semibold text-cream">{p.name[lang]}</span>
                          <span className="block truncate text-[12px] text-cream/55">{routes[p.id] ? copy.drive(routes[p.id].km, routes[p.id].min) : p.access[lang]}</span></span>
                        <span aria-hidden className="map-row-arrow text-gold-light">→</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          {/* mobile: filter chips on top, slim swipeable cards at the bottom – the map stays visible */}
          <div className="map-chips absolute inset-x-0 top-0 z-[3] md:hidden">
            <div role="group" aria-label={copy.list} className="flex gap-1.5 overflow-x-auto px-3 py-3">
              {CATS[season].map((c) => (
                <button key={c} type="button" aria-pressed={cat === c} onClick={() => { setCat(c); setSel(null); }} className={`map-filter shrink-0 ${cat === c ? 'is-on' : ''}`}>{copy.cats[c]}</button>
              ))}
            </div>
          </div>
          <div className="map-bottom absolute inset-x-0 bottom-0 z-[2] pb-3 pt-10 md:hidden">
            <div ref={strip} className="map-strip flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 scroll-px-3">
              {visible.map((p) => (
                <div key={p.id} data-id={p.id} role="button" tabIndex={0} aria-pressed={sel === p.id}
                  onClick={() => select(p.id)} onKeyDown={(e) => { if (e.key === 'Enter') select(p.id); }}
                  className="w-[86%] max-w-[340px] shrink-0 snap-start">
                  <MiniCard p={p} lang={lang} copy={copy} route={routes[p.id]} active={sel === p.id} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
