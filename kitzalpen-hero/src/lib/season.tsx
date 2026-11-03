import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Season } from '../content/hero';

/**
 * One shared season for the whole site. The Hero's Sommer / Winter selector writes
 * it; every section reads it. The value lives on <html data-season> (drives the CSS
 * palette) and in localStorage. index.html sets the attribute before first paint,
 * so a returning winter visitor never sees a summer flash.
 */
export const SEASON_KEY = 'kitzalpen-season';

export function readStoredSeason(): Season | null {
  try {
    const v = window.localStorage.getItem(SEASON_KEY);
    return v === 'winter' || v === 'summer' ? v : null;
  } catch { return null; }
}

interface Ctx { season: Season; stored: Season | null; setSeason: (s: Season) => void }
const SeasonContext = createContext<Ctx>({ season: 'summer', stored: null, setSeason: () => {} });

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [stored] = useState(readStoredSeason);
  const [season, set] = useState<Season>(() => stored ?? 'summer');

  useEffect(() => {
    document.documentElement.dataset.season = season;
    try { window.localStorage.setItem(SEASON_KEY, season); } catch { /* private mode – keep in memory only */ }
  }, [season]);

  const setSeason = useCallback((s: Season) => set((cur) => (cur === s ? cur : s)), []);
  return <SeasonContext.Provider value={{ season, stored, setSeason }}>{children}</SeasonContext.Provider>;
}

export const useSeason = () => useContext(SeasonContext);
