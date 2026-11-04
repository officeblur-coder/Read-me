import { useEffect, useState } from 'react';
import type { Lang } from '../content/hero';
import { parseOpenMeteo, sky, SKY_LABEL, SPOTS, WEATHER_URL, type Sky, type WeatherData } from '../content/weather';
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
const Icon = ({ s }: { s: Sky }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
    {ICON[s].map((d, i) => <path key={i} d={d} />)}
  </svg>
);
const Flake = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden className="shrink-0"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" /></svg>
);
const fmt = (n: number, lang: Lang) => `${n.toLocaleString(lang === 'de' ? 'de-AT' : 'en-GB', { maximumFractionDigits: 0 })}°`;

/**
 * A thin band above the header that stays while scrolling. It runs as a slow ticker.
 * Winter: weather + snow depth + fresh snow for the three ski areas.
 * Summer: weather only.
 */
export function WeatherBand({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const { season } = useSeason();
  const { data, live } = useWeather();
  const winter = season === 'winter';
  const L = lang === 'de'
    ? { title: winter ? 'Wetter & Schnee' : 'Wetter', snow: 'Schnee', fresh: 'Neuschnee', range: 'heute', src: winter ? 'Wetterdaten: Open-Meteo.com · Schneehöhen = Modellwerte' : 'Wetterdaten: Open-Meteo.com', loading: 'Wetter wird geladen …', updated: 'Stand' }
    : { title: winter ? 'Weather & snow' : 'Weather', snow: 'Snow', fresh: 'Fresh', range: 'today', src: winter ? 'Weather data: Open-Meteo.com · snow depths are model values' : 'Weather data: Open-Meteo.com', loading: 'Loading weather …', updated: 'Updated' };
  const time = data?.time ? data.time.slice(11, 16) : '';

  const items = data ? SPOTS.map((s) => {
    const w = data.spots[s.id]; if (!w) return null;
    const k = sky(w.code);
    return (
      <li key={s.id} className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
        <span className="font-semibold text-cream">{s.name}</span>
        <span className="text-cream/50 tabular-nums">{s.alt.toLocaleString('de-DE')} m</span>
        <span className="flex items-center gap-1.5 text-gold-light" title={SKY_LABEL[k][lang]}><Icon s={k} /><span className="sr-only">{SKY_LABEL[k][lang]}</span><span className="tabular-nums text-cream">{fmt(w.temp, lang)}</span></span>
        <span className="tabular-nums text-cream/55">{L.range} {fmt(w.min, lang)} / {fmt(w.max, lang)}</span>
        {winter && s.ski && (
          <span className="flex items-center gap-1.5 tabular-nums text-gold-light"><Flake />{L.snow} {w.snowCm} cm{w.newSnowCm > 0 ? ` · ${L.fresh} +${w.newSnowCm} cm` : ''}</span>
        )}
        <span aria-hidden className="ml-4 h-1 w-1 rounded-full bg-gold/60" />
      </li>
    );
  }) : null;

  const tail = (
    <li className="flex shrink-0 items-center gap-2 whitespace-nowrap text-cream/45">
      {time && <span>{L.updated} {time}{live ? '' : ' ·'}</span>}<span>{L.src}</span><span aria-hidden className="ml-6 h-1 w-1 rounded-full bg-gold/60" />
    </li>
  );

  return (
    <aside aria-label={L.title} className="weather-band fixed inset-x-0 top-0 z-[45] cursor-pointer border-b border-gold/20 bg-deep text-[12px] text-cream" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* the whole band opens the mountain guide */}
      <a href="#mountain" className="absolute inset-0 z-[2]" aria-label={L.title}><span className="sr-only">{L.title}</span></a>
      <div className="relative flex h-[34px] items-center">
        <p className="relative z-[1] flex h-full shrink-0 items-center gap-2 bg-deep pl-[max(14px,env(safe-area-inset-left))] pr-4 text-[10.5px] font-semibold uppercase tracking-[.22em] text-gold-light shadow-[12px_0_14px_-6px_var(--k-deep)]">
          <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-[#5ec27a]' : 'bg-gold'}`} aria-hidden />{L.title}
        </p>
        <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_3%,#000_96%,transparent)]">
          {data ? (
            <div className={`wb-track flex w-max ${reduced ? '' : 'wb-run'}`}>
              <ul className="flex items-center gap-6 pr-6">{items}{tail}</ul>
              {!reduced && <ul aria-hidden className="flex items-center gap-6 pr-6">{items}{tail}</ul>}
            </div>
          ) : <p className="px-2 text-cream/60">{L.loading}</p>}
        </div>
      </div>
    </aside>
  );
}
