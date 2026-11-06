import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Season } from '../content/hero';

/**
 * One shared season for the whole site. The Hero's Sommer / Winter selector writes
 * it; every section reads it. It is mirrored to <html data-season> (drives the CSS
 * palette).
 *
 * Opening the site: the season follows the calendar in Hollersbach –
 * 1 November to 15 April = winter, the rest of the year = summer.
 * A choice made by the visitor is kept while they browse (in memory); every page load
 * starts from the calendar again.
 * index.html runs the same rule before first paint, so there is no flash.
 */
export const SEASON_KEY = 'kitzalpen-season';

export function seasonByDate(now = new Date()): Season {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vienna', month: 'numeric', day: 'numeric' }).formatToParts(now);
  const m = +(parts.find((p) => p.type === 'month')?.value ?? 1);
  const d = +(parts.find((p) => p.type === 'day')?.value ?? 1);
  return m >= 11 || m <= 3 || (m === 4 && d <= 15) ? 'winter' : 'summer';
}

export function readStoredSeason(): Season | null {
  try {
    const v = window.sessionStorage.getItem(SEASON_KEY);
    return v === 'winter' || v === 'summer' ? v : null;
  } catch { return null; }
}

interface Ctx { season: Season; stored: Season | null; setSeason: (s: Season) => void }
const SeasonContext = createContext<Ctx>({ season: 'summer', stored: null, setSeason: () => {} });

export function SeasonProvider({ children }: { children: ReactNode }) {
  // opening always follows the calendar; a visitor's switch is kept while they move around the site
  const [stored] = useState<Season | null>(null);
  const [season, set] = useState<Season>(() => seasonByDate());

  useEffect(() => {
    document.documentElement.dataset.season = season;
    try { window.sessionStorage.setItem(SEASON_KEY, season); } catch { /* storage blocked – keep in memory only */ }
  }, [season]);

  const setSeason = useCallback((s: Season) => set((cur) => (cur === s ? cur : s)), []);
  return <SeasonContext.Provider value={{ season, stored, setSeason }}>{children}</SeasonContext.Provider>;
}

export const useSeason = () => useContext(SeasonContext);
