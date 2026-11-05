import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { locale } from './i18n';

/**
 * Automatic Alpine day / evening (independent of Summer/Winter).
 * Evening from 17:00 Austrian time until the next sunrise in Hollersbach; day from sunrise to 17:00.
 * Austrian time = Europe/Vienna (handles daylight-saving time); the visitor's own time zone is never used.
 * Sunrise: NOAA solar algorithm for 47.2727 N, 12.4257 E (zenith 90.833°), computed per date, in UTC.
 * A manual preview (day / evening) is kept for the tab session; "auto" returns to the clock.
 */
export type Daypart = 'day' | 'evening';
export type DaypartMode = 'auto' | Daypart;
const LAT = 47.2727, LON = 12.4257, KEY = 'kitzalpen-daypart';

/** Sunrise (UTC Date) for a calendar date given as y-m-d. */
export function sunriseUTC(y: number, m: number, d: number): Date {
  const rad = Math.PI / 180;
  const N = Math.floor(275 * m / 9) - Math.floor((m + 9) / 12) * (1 + Math.floor((y - 4 * Math.floor(y / 4) + 2) / 3)) + d - 30;
  const lngHour = LON / 15, t = N + (6 - lngHour) / 24;
  const M = 0.9856 * t - 3.289;
  let L = M + 1.916 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 282.634; L = (L + 360) % 360;
  let RA = Math.atan(0.91764 * Math.tan(L * rad)) / rad; RA = (RA + 360) % 360;
  RA = (RA + (Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90)) / 15;
  const sinDec = 0.39782 * Math.sin(L * rad), cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(90.833 * rad) - sinDec * Math.sin(LAT * rad)) / (cosDec * Math.cos(LAT * rad));
  const H = (360 - Math.acos(Math.max(-1, Math.min(1, cosH))) / rad) / 15;
  const T = H + RA - 0.06571 * t - 6.622;
  const UT = ((T - lngHour) % 24 + 24) % 24;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + UT * 3600e3);
}

const vienna = (date: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vienna', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, min: (+p.hour % 24) * 60 + +p.minute };
};

export function daypartAt(now = new Date()): Daypart {
  const v = vienna(now);
  if (v.min >= 17 * 60) return 'evening';
  return now.getTime() < sunriseUTC(v.y, v.m, v.d).getTime() ? 'evening' : 'day';
}

/** Local Austrian sunrise time as "HH:MM" for today (shown in the preview control). */
export const sunriseToday = (lang: string) => {
  const v = vienna(new Date());
  return new Intl.DateTimeFormat(locale(lang === 'de' ? 'de' : 'en'), { timeZone: 'Europe/Vienna', hour: '2-digit', minute: '2-digit' }).format(sunriseUTC(v.y, v.m, v.d));
};

interface Ctx { daypart: Daypart; mode: DaypartMode; setMode: (m: DaypartMode) => void }
const C = createContext<Ctx>({ daypart: 'day', mode: 'auto', setMode: () => {} });

export function DaypartProvider({ children }: { children: ReactNode }) {
  const [mode, setModeS] = useState<DaypartMode>(() => { try { const v = sessionStorage.getItem(KEY); return v === 'day' || v === 'evening' ? v : 'auto'; } catch { return 'auto'; } });
  const [auto, setAuto] = useState<Daypart>(daypartAt);
  useEffect(() => { const id = window.setInterval(() => setAuto(daypartAt()), 30000); return () => window.clearInterval(id); }, []);
  const daypart = mode === 'auto' ? auto : mode;
  useEffect(() => { document.documentElement.dataset.daypart = daypart; }, [daypart]);
  const setMode = useCallback((m: DaypartMode) => { setModeS(m); try { m === 'auto' ? sessionStorage.removeItem(KEY) : sessionStorage.setItem(KEY, m); } catch { /* ignore */ } }, []);
  return <C.Provider value={{ daypart, mode, setMode }}>{children}</C.Provider>;
}
export const useDaypart = () => useContext(C);
