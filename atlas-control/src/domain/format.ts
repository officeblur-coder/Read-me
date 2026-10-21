import type { ISODate } from './types';

const ron0 = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 });
const num2 = new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num1 = new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmtRon = (v: number) => `${ron0.format(Math.round(v))} lei`;
export const fmtNum = (v: number, digits = 0) =>
  new Intl.NumberFormat('ro-RO', { maximumFractionDigits: digits }).format(v);
export const fmtPct = (v: number) => `${num1.format(v)}%`;

/** Compact money: 1,24 mil. lei / 845 mii lei. */
export function fmtMoney(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${num2.format(v / 1_000_000)} mil. lei`;
  if (a >= 10_000) return `${ron0.format(v / 1000)} mii lei`;
  return fmtRon(v);
}

const MONTHS = ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sept.', 'oct.', 'nov.', 'dec.'];
const MONTHS_LONG = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

export const fmtDate = (d: ISODate) => `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
export const fmtDateShort = (d: ISODate) => `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]}`;
export const fmtMonth = (key: string) => `${MONTHS[+key.slice(5, 7) - 1]} ${key.slice(2, 4)}`;
export const fmtMonthLong = (key: string) => `${MONTHS_LONG[+key.slice(5, 7) - 1]} ${key.slice(0, 4)}`;

/** Lowercase, strip Romanian diacritics (both cedilla and comma forms). */
export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[şș]/g, 's').replace(/[ţț]/g, 't');
