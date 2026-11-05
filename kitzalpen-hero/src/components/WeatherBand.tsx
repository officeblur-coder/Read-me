import { useEffect, useState } from 'react';
import { OpeningsBar } from './OpeningsBar';
import type { Lang } from '../content/hero';
import { parseOpenMeteo, sky, SKY_LABEL, WEATHER_URL, type Sky, type WeatherData } from '../content/weather';
import { useSeason } from '../lib/season';

const SNAPSHOT = `${import.meta.env.BASE_URL}weather.json`;

/** Live from Open-Meteo, every 15 min; falls back to the bundled snapshot when the live call is blocked. */
export function useWeather() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(WEATHER_URL, { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        const d = parseOpenMeteo(await r.json());
        if (alive) { setData(d); setLive(true); }
      } catch {
        try { const r = await fetch(SNAPSHOT); const d = parseOpenMeteo(await r.json()); if (alive) { setData((cur) => cur ?? d); } } catch { /* stay empty */ }
      }
    };
    load();
    const t = window.setInterval(load, 15 * 60 * 1000);
    return () => { alive = false; window.clearInterval(t); };
  }, []);
  return { data, live };
}

const ICON: Record<Sky, string[]> = {
  sun: ['M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z', 'M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],
  partly: ['M8 4v1.5M3.5 8H5M4.8 4.8l1 1M11.2 4.8l-1 1', 'M10.5 9.4A3 3 0 1 0 5.6 11', 'M7 19h10.5a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6 1.4A2.8 2.8 0 0 0 7 19Z'],
  cloud: ['M6.5 18.5h11a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.6 3.2 3.2 0 0 0 0 6.4Z'],
  fog: ['M4 9h16M3 13h18M5 17h14'],
  rain: ['M6.5 14.5h11a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.6 3.2 3.2 0 0 0 0 6.4Z', 'M8 17.5l-1 2.5M12 17.5l-1 2.5M16 17.5l-1 2.5'],
  snow: ['M6.5 13.5h11a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.6 3.2 3.2 0 0 0 0 6.4Z', 'M8 17v.01M12 19v.01M16 17v.01M10 21v.01M14 21v.01'],
  storm: ['M6.5 13.5h11a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.6 3.2 3.2 0 0 0 0 6.4Z', 'M12.5 14.5l-2 3.5h3l-2 3.5'],
};
const Icon = ({ s, size = 15 }: { s: Sky; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
    {ICON[s].map((d, i) => <path key={i} d={d} />)}
  </svg>
);

const fmt = (n: number, lang: Lang) => `${n.toLocaleString(lang === 'de' ? 'de-AT' : 'en-GB', { maximumFractionDigits: 0 })}°`;

/** Austrian local time, ticking every 20 s (never the visitor's own time zone). */
function useViennaTime(lang: Lang) {
  const f = () => new Intl.DateTimeFormat(lang === 'de' ? 'de-AT' : 'en-GB', { timeZone: 'Europe/Vienna', hour: '2-digit', minute: '2-digit' }).format(new Date());
  const [t, setT] = useState(f);
  useEffect(() => { setT(f()); const id = window.setInterval(() => setT(f()), 20000); return () => window.clearInterval(id); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  return t;
}

/**
 * Two fixed bars above the header.
 *  1 · Alpine weather bar: valley (Hollersbach) and mountain (KitzSki) kept apart and labelled,
 *      Austrian time, link to the mountain guide. No ticker. On phones: the essentials + a details panel.
 *  2 · OpeningsBar (season starts in winter, lift timetables in summer).
 * Heights are fixed via CSS variables, so loading weather never shifts the layout.
 */
export function WeatherBand({ lang }: { lang: Lang; reduced?: boolean }) {
  const { season } = useSeason();
  const { data, live } = useWeather();
  const time = useViennaTime(lang);
  const [open, setOpen] = useState(false);
  const winter = season === 'winter';
  const L = lang === 'de'
    ? { title: 'Wetter', valley: 'Tal', mountain: 'Berg', hl: 'Heute', snow: 'Schnee', fresh: 'Neuschnee', wind: 'Wind', time: 'Ortszeit', more: 'Bergwetter & Webcams', src: 'Open-Meteo · Modellwerte', updated: 'Stand', loading: 'Wetter wird geladen …', na: 'Wetter derzeit nicht verfügbar', details: 'Wetterdetails' }
    : { title: 'Weather', valley: 'Valley', mountain: 'Mountain', hl: 'Today', snow: 'Snow', fresh: 'New snow', wind: 'Wind', time: 'Local time', more: 'Mountain weather & webcams', src: 'Open-Meteo · model values', updated: 'Updated', loading: 'Loading weather …', na: 'Weather currently unavailable', details: 'Weather details' };
  const v = data?.spots.hollersbach, m = data?.spots.kitzski;
  const upd = data?.time ? data.time.slice(11, 16) : '';
  const sep = <span aria-hidden className="h-5 w-px shrink-0 bg-cream/15" />;
  const mountain = m && (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-[10.5px] font-semibold uppercase tracking-[.18em] text-cream/55">{L.mountain}</span>
      <span className="text-cream/80">KitzSki 1.665 m</span>
      <Icon s={sky(m.code)} /><b className="lnum font-semibold">{fmt(m.temp, lang)}</b>
      {winter ? <span className="text-cream/70">· {L.snow} {m.snowCm} cm{m.newSnowCm > 0 ? ` · ${L.fresh} +${m.newSnowCm}` : ''}</span> : <span className="text-cream/70">· {L.wind} {Math.round(m.wind)} km/h</span>}
    </span>
  );

  return (
    <div className="topbars fixed inset-x-0 top-0 z-[45] bg-deep" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <aside aria-label={L.title} className="weather-band relative border-b border-gold/20 text-[13px] text-cream">
        <div className="mx-auto flex h-full max-w-[1680px] items-center gap-4 px-[max(14px,env(safe-area-inset-left))] md:gap-5 md:px-10 lg:px-14">
          {/* valley – always visible */}
          <span className="flex min-w-0 items-center gap-2.5 whitespace-nowrap">
            <span className="hidden text-[10.5px] font-semibold uppercase tracking-[.18em] text-cream/55 md:inline">{L.valley}</span>
            <span className="font-semibold">Hollersbach</span>
            {v ? (<>
              <span className="text-gold-light"><Icon s={sky(v.code)} size={20} /></span>
              <b className="lnum font-display text-[24px] font-medium leading-none md:text-[26px]">{fmt(v.temp, lang)}</b>
              <span className="truncate text-cream/80">{SKY_LABEL[sky(v.code)][lang]}</span>
              <span className="lnum hidden text-cream/55 lg:inline">{L.hl} {fmt(v.min, lang)} / {fmt(v.max, lang)}</span>
            </>) : <span className="text-cream/55">{data === null && !live ? L.loading : L.na}</span>}
          </span>
          {m && <span className="hidden items-center gap-5 xl:flex">{sep}{mountain}</span>}
          <span className="ml-auto flex shrink-0 items-center gap-4 md:gap-5">
            <span className="lnum flex items-center gap-2 whitespace-nowrap"><span className="hidden text-[10.5px] font-semibold uppercase tracking-[.18em] text-cream/55 sm:inline">{L.time}</span><b className="font-semibold">{time}</b></span>
            <a href="#mountain-dash" className="wb-link hidden min-h-[34px] items-center gap-1.5 rounded-full border border-gold/35 px-3.5 text-[12px] font-semibold text-gold-light md:inline-flex">{L.more} →</a>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="wb-panel" aria-label={L.details}
              className="grid h-9 w-9 place-items-center rounded-full border border-cream/20 xl:hidden">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
            </button>
          </span>
        </div>
        {/* details panel (phones / tablets) – overlays, never pushes the layout */}
        <div id="wb-panel" hidden={!open} className="absolute inset-x-0 top-full z-10 border-b border-gold/20 bg-deep/97 px-[max(16px,env(safe-area-inset-left))] py-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] backdrop-blur-md xl:hidden">
          <div className="flex flex-col gap-3 text-[13.5px]">
            {v && <span className="lnum">{L.valley} · Hollersbach 807 m · {L.hl} {fmt(v.min, lang)} / {fmt(v.max, lang)} · {L.wind} {Math.round(v.wind)} km/h</span>}
            {mountain}
            <a href="#mountain-dash" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center self-start rounded-full border border-gold/35 px-4 font-semibold text-gold-light">{L.more} →</a>
            <span className="text-[11.5px] text-cream/45">{L.src}{upd ? ` · ${L.updated} ${upd}` : ''}</span>
          </div>
        </div>
      </aside>
      <OpeningsBar lang={lang} />
    </div>
  );
}
