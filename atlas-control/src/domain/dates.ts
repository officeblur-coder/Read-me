import type { ISODate } from './types';

const DAY = 86_400_000;
const parse = (d: ISODate) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));

export const toISO = (ms: number): ISODate => new Date(ms).toISOString().slice(0, 10);
export const daysBetween = (a: ISODate, b: ISODate) => Math.round((parse(b) - parse(a)) / DAY);
export const addDays = (d: ISODate, n: number): ISODate => toISO(parse(d) + n * DAY);
export const monthKey = (d: ISODate) => d.slice(0, 7);

export function addMonths(d: ISODate, n: number): ISODate {
  const y = +d.slice(0, 4), m = +d.slice(5, 7) - 1 + n;
  return toISO(Date.UTC(y + Math.floor(m / 12), ((m % 12) + 12) % 12, 1));
}

/** Start of ISO week (Monday). */
export function weekStart(d: ISODate): ISODate {
  const dow = (new Date(parse(d)).getUTCDay() + 6) % 7;
  return addDays(d, -dow);
}

export const overlaps = (aStart: ISODate, aEnd: ISODate, bStart: ISODate, bEnd: ISODate) =>
  aStart <= bEnd && bStart <= aEnd;
