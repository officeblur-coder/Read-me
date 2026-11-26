import { useState } from 'react';
import type { Lang } from '../../content/hero';
import { sky, SKY_LABEL } from '../../content/weather';
import { useSeason } from '../../lib/season';
import { useWeather } from '../WeatherBand';
import { Icon, I } from '../pension/PensionRooms';

const CAM = { poster: 'https://wtvpict.feratel.com/picture/38/5603.jpeg?design=v5', name: 'Resterkogel – Pass Thurn' };
const COPY = {
  de: {
    eyebrow: 'Heute am Berg', live: 'Live',
    title: { winter: 'Schnee, Wetter, Webcams – bevor du losgehst.', summer: 'Wetter, Webcams, Ideen – bevor du losgehst.' },
    cam: 'Webcam · regelmäßig aktualisiert', snow: 'Schnee',
    links: [['cams', 'Webcams ansehen'], ['dash', 'Bedingungen'], ['plan', 'Tag planen'], ['find', 'Pistenfinder']] as [string, string][],
    linksSummer: [['cams', 'Webcams ansehen'], ['dash', 'Bedingungen'], ['plan', 'Tag planen'], ['find', 'Erlebnisfinder']] as [string, string][],
    cta: 'Alle Details', src: 'Wettermodell Open-Meteo',
  },
  en: {
    eyebrow: 'Today on the mountain', live: 'Live',
    title: { winter: 'Snow, weather, webcams – before you head out.', summer: 'Weather, webcams, ideas – before you head out.' },
    cam: 'Webcam · refreshed regularly', snow: 'Snow',
    links: [['cams', 'Watch webcams'], ['dash', 'Conditions'], ['plan', 'Plan your day'], ['find', 'Slope finder']] as [string, string][],
    linksSummer: [['cams', 'Watch webcams'], ['dash', 'Conditions'], ['plan', 'Plan your day'], ['find', 'Adventure finder']] as [string, string][],
    cta: 'All details', src: 'Open-Meteo weather model',
  },
};

/** "Today on the mountain" – a live panel right under the hero that leads into the mountain guide. */
export function MountainTeaser({ lang }: { lang: Lang }) {
  const { season } = useSeason();
  const { data } = useWeather();
  const [camOk, setCamOk] = useState(true);
  const t = COPY[lang];
  const spots = [{ id: 'kitzski', name: 'KitzSki' }, { id: 'wildkogel', name: 'Wildkogel' }, { id: 'hollersbach', name: 'Hollersbach' }];
  const links = season === 'winter' ? t.links : t.linksSummer;
  return (
    <section aria-label={t.eyebrow} className="relative z-[1] bg-deep text-cream">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center md:gap-10 md:px-10 md:py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:px-14">
        <div className="min-w-0">
          <p className="flex items-center gap-2.5 text-[11.5px] font-semibold uppercase tracking-[.3em] text-gold-light"><span aria-hidden className="live-dot" />{t.eyebrow}</p>
          <p className="mt-2 font-display text-[26px] italic leading-tight md:text-[32px]">{t.title[season]}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {links.map(([id, label]) => (
              <li key={id}><a href={`#mountain-${id}`} className="mt-chip inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold">{label}<Icon d={I.arrow} size={14} w={1.8} /></a></li>
            ))}
          </ul>
        </div>

        {/* conditions */}
        <ul className="grid grid-cols-3 gap-px overflow-hidden rounded-[18px] border border-cream/15 bg-cream/15">
          {spots.map((s) => {
            const d = data?.spots[s.id];
            return (
              <li key={s.id} className="flex min-w-0 flex-col bg-deep px-3 py-4 sm:px-4">
                <span className="truncate text-[11px] font-semibold uppercase tracking-[.16em] text-cream/60">{s.name}</span>
                <span className="lnum mt-2 font-display text-[34px] leading-none">{d ? `${Math.round(d.temp)}°` : '—'}</span>
                <span className="mt-1.5 truncate text-[12px] text-cream/70">{d ? (season === 'winter' && s.id !== 'hollersbach' ? `${t.snow} ${d.snowCm} cm` : SKY_LABEL[sky(d.code)][lang]) : ''}</span>
              </li>
            );
          })}
        </ul>

        {/* webcam */}
        <a href="#mountain-cams" className="group relative hidden h-[132px] w-[220px] shrink-0 overflow-hidden rounded-[18px] bg-black lg:block" aria-label={`${CAM.name} – ${t.cam}`}>
          {camOk && <img src={CAM.poster} alt="" loading="lazy" onError={() => setCamOk(false)} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[.14em] backdrop-blur-sm"><span aria-hidden className="live-dot" />Cam</span>
          <span className="absolute inset-x-3 bottom-2.5 truncate text-[12px] font-semibold">{CAM.name}</span>
        </a>
      </div>
      <a href="#mountain" className="mt-teaser-bar flex items-center justify-center gap-2 border-t border-cream/10 py-3 text-[12.5px] font-semibold uppercase tracking-[.22em] text-gold-light">{t.cta}<Icon d={I.arrow} size={14} w={1.8} /></a>
    </section>
  );
}
