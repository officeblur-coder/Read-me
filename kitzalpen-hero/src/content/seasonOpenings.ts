import type { Lang } from './hero';

/**
 * Ski season openings 2026/27 – PLANNED dates, verified on the operators' own websites on 5 Nov 2026.
 * Owner-editable without a rebuild: put a file `openings.json` (same shape as OPENINGS_DEFAULT) next to
 * index.html on the server – it overrides these values at runtime (see useOpenings in OpeningsBar).
 * Never shows an operating status itself: after a start date the bar links to the operator's live status.
 */
export interface Opening {
  id: string;
  name: string;
  start?: string;           // ISO date of the planned season start (absent when only the operator's 'open' is known)
  note?: Record<Lang, string>;
  status?: 'operator-open'; // only when the operator's own website says so (with verifiedAt)
  url: string;              // official operating times page
  live?: string;            // official live lift / piste status
}
export interface OpeningsData { verifiedAt: string; season: string; items: Opening[] }

export const OPENINGS_DEFAULT: OpeningsData = {
  verifiedAt: '2026-11-05',
  season: '2026/27',
  items: [
    { id: 'resterkogel', name: 'KitzSki Resterkogel', start: '2026-11-06',
      note: { de: 'Mo–Fr Training, Sa–So öffentlich', en: 'Mon–Fri training, Sat–Sun public' },
      url: 'https://www.kitzski.at/en/ski-area-tirol/timetables-operating-times.html', live: 'https://www.kitzski.at/en/current-info/kitz-lift-status.html' },
    { id: 'kitzsteinhorn', name: 'Kitzsteinhorn', status: 'operator-open',
      note: { de: 'Gletscher – laut Betreiber in Betrieb', en: 'Glacier – open according to the operator' },
      url: 'https://www.kitzsteinhorn.at/en', live: 'https://www.kitzsteinhorn.at/en' },
    { id: 'zillertal', name: 'Zillertal Arena · Gerlos', start: '2026-12-04',
      url: 'https://www.zillertalarena.com/en/winter/ski-area/operating-hours/' },
    { id: 'schmitten', name: 'Schmittenhöhe', start: '2026-12-04', url: 'https://www.schmitten.at/en' },
    { id: 'wildkogel', name: 'Wildkogel-Arena', start: '2026-12-05',
      note: { de: '5.–8. Dez., dann ab 11. Dez.', en: '5–8 Dec, then from 11 Dec' },
      url: 'https://www.wildkogel-arena.at/en/mountain-lifts-wildkogel/opening-hours-prices-winter.html',
      live: 'https://www.wildkogel-arena.at/en/mountain-lifts-wildkogel/facilities-slopes.html' },
    { id: 'skiwelt', name: 'SkiWelt', start: '2026-12-05', url: 'https://www.skiwelt.at/en/' },
    { id: 'kitzski-full', name: 'KitzSki · Skischaukel komplett', start: '2026-12-11',
      note: { de: 'Hahnenkamm – Resterhöhe verbunden', en: 'Hahnenkamm – Resterhöhe connected' },
      url: 'https://www.kitzski.at/en/ski-area-tirol/timetables-operating-times.html', live: 'https://www.kitzski.at/en/current-info/kitz-lift-status.html' },
  ],
};

/** Summer: no dates are shown (none verified yet) – only links to the operators' summer timetables. */
export const SUMMER_LIFTS = [
  { name: 'Panoramabahn Kitzbüheler Alpen', url: 'https://www.kitzski.at/en/ski-area-tirol/timetables-operating-times.html' },
  { name: 'Wildkogel-Arena', url: 'https://www.wildkogel-arena.at/en/' },
  { name: 'Kitzsteinhorn', url: 'https://www.kitzsteinhorn.at/en' },
  { name: 'Schmittenhöhe', url: 'https://www.schmitten.at/en' },
];

/** Today in Austria, as YYYY-MM-DD (the visitor's own time zone never decides). */
export const todayVienna = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(new Date());
