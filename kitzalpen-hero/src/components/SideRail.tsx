import { useEffect, useState } from 'react';
import type { Lang, Season } from '../content/hero';
import { useSeason } from '../lib/season';

/** Left-hand shortcut rail (season-aware): the things guests look up most, one tap away. */
export const P = {
  lift: ['M3 6l18-3', 'M12 4.5V10', 'M8 10h8v6a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2Z', 'M8 13h8'],
  weather: ['M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 10.5 3.75 3.75 0 0 0 7 18Z', 'M12 2v2M4.2 4.2l1.4 1.4M2 12h2'],
  cam: ['M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M12 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z', 'M8 21h8M12 14v7'],
  ticket: ['M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4Z', 'M10 7v10'],
  map: ['M9 4 3 6v14l6-2 6 2 6-2V4l-6 2Z', 'M9 4v14M15 6v14'],
  route: ['M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M8 17h6a3 3 0 0 0 0-6H10a3 3 0 0 1 0-6h6'],
  tours: ['M3 20 10 6l4 7 2-3 5 10Z'],
  star: ['M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9Z'],
  grid: ['M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4ZM13 13h7v7h-7Z'],
};
export interface Item { k: keyof typeof P; href: string; ext?: boolean; live?: boolean; label: Record<Lang, string>; short?: Record<Lang, string> }
export const ITEMS: Record<Season, Item[]> = {
  winter: [
    { k: 'lift', href: 'https://www.panoramabahn.at/de/liftstatus.html', ext: true, live: true, label: { de: 'Lifte & Pisten', en: 'Lifts & slopes' }, short: { de: 'Lifte', en: 'Lifts' } },
    { k: 'weather', href: '#mountain-dash', label: { de: 'Bergwetter', en: 'Mountain weather' }, short: { de: 'Wetter', en: 'Weather' } },
    { k: 'cam', href: '#mountain-cams', label: { de: 'Webcams', en: 'Webcams' } },
    { k: 'ticket', href: '#ski-passes', label: { de: 'Skipass', en: 'Ski pass' } },
    { k: 'map', href: '#explore-map', label: { de: 'Karte', en: 'Map' } },
    { k: 'route', href: '#arrival', label: { de: 'Anreise', en: 'Arrival' } },
  ],
  summer: [
    { k: 'weather', href: '#mountain-dash', label: { de: 'Bergwetter', en: 'Mountain weather' }, short: { de: 'Wetter', en: 'Weather' } },
    { k: 'cam', href: '#mountain-cams', label: { de: 'Webcams', en: 'Webcams' } },
    { k: 'tours', href: '#tours', label: { de: 'Touren', en: 'Tours' } },
    { k: 'star', href: '#experiences', label: { de: 'Top 15', en: 'Top 15' } },
    { k: 'map', href: '#explore-map', label: { de: 'Karte', en: 'Map' } },
    { k: 'route', href: '#arrival', label: { de: 'Anreise', en: 'Arrival' } },
  ],
};
export const Ico = ({ d }: { d: string[] }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d.map((x) => <path key={x} d={x} />)}</svg>
);

export function SideRail({ lang, hidden = false }: { lang: Lang; hidden?: boolean }) {
  const { season } = useSeason();
  const [open, setOpen] = useState(false); // mobile drawer
  useEffect(() => { const h = () => setOpen(false); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, []);
  const label = lang === 'de' ? 'Schnellzugriff' : 'Shortcuts';
  if (hidden) return null;
  return (
    <nav aria-label={label} className={`side-rail fixed left-0 top-1/2 z-30 hidden -translate-y-1/2 lg:flex ${open ? 'is-open' : ''}`}>
      <button type="button" aria-expanded={open} aria-controls="side-rail-list" onClick={() => setOpen((o) => !o)} className="sr-tab grid h-14 w-7 place-items-center rounded-r-[12px] lg:hidden" aria-label={label}>
        <Ico d={P.grid} />
      </button>
      <ul id="side-rail-list" className="sr-list flex flex-col gap-0.5 rounded-r-[16px] p-[3px] lg:py-1.5">
        {ITEMS[season].map((x) => (
          <li key={x.k}>
            <a href={x.href} {...(x.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})} onClick={() => setOpen(false)} className="sr-item group relative flex h-11 w-11 items-center justify-center rounded-[12px] lg:h-10 lg:w-10">
              <Ico d={P[x.k]} />
              {x.live && <span aria-hidden className="live-dot absolute right-1.5 top-1.5" />}
              <span className="sr-label pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold">{x.label[lang]}{x.ext ? ' ↗' : ''}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
