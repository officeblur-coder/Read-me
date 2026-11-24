// Program de lucru și precomenzi, în ora României (aceleași reguli ca is_open_at / preorder_error din baza de date).
export type Hours = {
  open_time?: string; close_time?: string; open_days?: number[];
  preorder_on?: boolean; preorder_from?: string; preorder_days?: number; preorder_lead_min?: number; preorder_until?: string; tz?: string;
  holiday_from?: string; holiday_until?: string; holiday_lead_hours?: number; holiday_days?: string[] | null; holiday_deadlines?: Record<string, string> | null; holiday_fullday?: string[] | null;   // produse de sărbători (19_sarbatori.sql)
};

const TZ = (h: Hours) => h.tz || "Europe/Bucharest";
const mins = (t: string | undefined, d: number) => { if (!t) return d; const [a, b] = t.split(":").map(Number); return a * 60 + (b || 0); };
export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** wall clock of an instant in the restaurant's time zone */
function parts(ms: number, tz: string) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" });
  const p: Record<string, string> = {}; f.formatToParts(new Date(ms)).forEach(x => (p[x.type] = x.value));
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday) + 1;
  return { y: +p.year, mo: +p.month, d: +p.day, min: +p.hour * 60 + +p.minute, dow };
}
/** local date + minutes in the restaurant's zone → instant */
function zoned(y: number, mo: number, d: number, m: number, tz: string) {
  let t = Date.UTC(y, mo - 1, d, Math.floor(m / 60), m % 60);
  for (let i = 0; i < 2; i++) { const p = parts(t, tz); t += (Date.UTC(y, mo - 1, d, Math.floor(m / 60), m % 60) - Date.UTC(p.y, p.mo - 1, p.d, Math.floor(p.min / 60), p.min % 60)); }
  return t;
}

export function hoursLabel(h: Hours) {
  const days = h.open_days || [1, 2, 3, 4, 5, 6, 7];
  const dd = days.length === 7 ? "zilnic" : days.map(d => ["", "L", "Ma", "Mi", "J", "V", "S", "D"][d]).join(", ");
  return `${dd} ${hhmm(mins(h.open_time, 660))}–${hhmm(mins(h.close_time, 1320))}`;
}

export function isOpenNow(h: Hours, now = Date.now()) {
  const p = parts(now, TZ(h));
  return (h.open_days || [1, 2, 3, 4, 5, 6, 7]).includes(p.dow) && p.min >= mins(h.open_time, 660) && p.min < mins(h.close_time, 1320);
}

export type SlotDay = { key: string; label: string; slots: { iso: string; label: string }[] };
const WD = ["", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă", "duminică"];
const MO = ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."];

/** the days and one-hour intervals (12:00–13:00 … 20:00–21:00) a customer can pre-order for; iso = start of the interval */
export function slotDays(h: Hours, now = Date.now()): SlotDay[] {
  if (h.preorder_on === false) return [];
  const tz = TZ(h), lead = (h.preorder_lead_min ?? 45) * 60000;
  const from = Math.max(mins(h.preorder_from, 720), mins(h.open_time, 660)), to = Math.min(mins(h.close_time, 1320), mins(h.preorder_until, 1260), 1440);
  const today = parts(now, tz), out: SlotDay[] = [];
  for (let i = 0; i <= (h.preorder_days ?? 2); i++) {
    const noon = zoned(today.y, today.mo, today.d, 720, tz) + i * 864e5;
    const p = parts(noon, tz);
    if (!(h.open_days || [1, 2, 3, 4, 5, 6, 7]).includes(p.dow)) continue;
    const slots: SlotDay["slots"] = [];
    for (let m = Math.ceil(from / 60) * 60; m + 60 <= to; m += 60) {
      const t = zoned(p.y, p.mo, p.d, m, tz);
      if (t >= now + lead) slots.push({ iso: new Date(t).toISOString(), label: `${hhmm(m)}–${hhmm(m + 60)}` });
    }
    if (slots.length) out.push({ key: `${p.y}-${p.mo}-${p.d}`, label: i === 0 ? "Azi" : i === 1 ? "Mâine" : `${WD[p.dow][0].toUpperCase() + WD[p.dow].slice(1)} ${p.d} ${MO[p.mo - 1]}`, slots });
  }
  return out;
}

/** produse de sărbători: din holiday_from până la holiday_until, cu minimum holiday_lead_hours ore înainte (ca holiday_error din baza de date) */
export function holidaySlotDays(h: Hours, now = Date.now()): SlotDay[] {
  const tz = TZ(h), lead = (h.holiday_lead_hours ?? 24) * 3600000;
  const from = Math.max(mins(h.preorder_from, 720), mins(h.open_time, 660)), to = Math.min(mins(h.close_time, 1320), mins(h.preorder_until, 1260), 1440);
  const first = h.holiday_from || "2026-12-03", last = h.holiday_until || "2026-12-31";
  const today = parts(now, tz), out: SlotDay[] = [];
  const todayKey = `${today.y}-${String(today.mo).padStart(2, "0")}-${String(today.d).padStart(2, "0")}`;
  for (let i = 0; i <= 45; i++) {
    const noon = zoned(today.y, today.mo, today.d, 720, tz) + i * 864e5;
    const p = parts(noon, tz);
    const key = `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
    if (key > last) break;
    if (key < first || !(h.open_days || [1, 2, 3, 4, 5, 6, 7]).includes(p.dow)) continue;
    if (h.holiday_days?.length && !h.holiday_days.includes(key)) continue;   // zilele de pauză (23, 25, 26 decembrie)
    if (h.holiday_deadlines?.[key] && todayKey > h.holiday_deadlines[key]) continue;   // Crăciun: comenzi până pe 22, Revelion: până pe 29
    const slots: SlotDay["slots"] = [];
    if (h.holiday_fullday?.includes(key)) {
      // Crăciun / Revelion: livrare pe parcursul zilei, fără oră (salvată la 10:00, ca în baza de date)
      const t = zoned(p.y, p.mo, p.d, FULLDAY_MIN, tz);
      if (t >= now + lead) slots.push({ iso: new Date(t).toISOString(), label: "Pe parcursul zilei" });
    } else for (let m = Math.ceil(from / 60) * 60; m + 60 <= to; m += 60) {
      const t = zoned(p.y, p.mo, p.d, m, tz);
      if (t >= now + lead) slots.push({ iso: new Date(t).toISOString(), label: `${hhmm(m)}–${hhmm(m + 60)}` });
    }
    const special = p.mo === 12 && p.d === 24 ? "Crăciun · " : p.mo === 12 && p.d === 31 ? "Revelion · " : "";
    if (slots.length) out.push({ key, label: special + (i === 1 ? "Mâine" : `${WD[p.dow].slice(0, 3)} ${p.d} ${MO[p.mo - 1]}`), slots });
  }
  return out;
}

/** livrare „pe parcursul zilei” (Crăciun, Revelion): precomanda e salvată la 10:00, oră pe care nu o au intervalele obișnuite */
const FULLDAY_MIN = 600;
export const isFullDay = (iso: string, tz = "Europe/Bucharest") => parts(new Date(iso).getTime(), tz).min === FULLDAY_MIN;
/** până când trebuie livrată o precomandă: sfârșitul intervalului, sau ora de închidere pentru „pe parcursul zilei” */
export function slotEnd(iso: string, close = "21:30", tz = "Europe/Bucharest") {
  const t = new Date(iso).getTime();
  if (!isFullDay(iso, tz)) return t + 3600000;
  const p = parts(t, tz);
  return zoned(p.y, p.mo, p.d, mins(close, 1290), tz);
}
/** "13:00–14:00": the one-hour interval that starts at iso; „pe parcursul zilei” la Crăciun / Revelion */
export function slotRange(iso: string, tz = "Europe/Bucharest") {
  const m = parts(new Date(iso).getTime(), tz).min;
  if (m === FULLDAY_MIN) return "pe parcursul zilei";
  return `${hhmm(m)}–${hhmm((m + 60) % 1440)}`;
}
/** "azi", "mâine", "joi 5 nov." */
export function slotDay(iso: string, tz = "Europe/Bucharest", now = Date.now()) {
  const p = parts(new Date(iso).getTime(), tz), n = parts(now, tz);
  const dayDiff = Math.round((Date.UTC(p.y, p.mo - 1, p.d) - Date.UTC(n.y, n.mo - 1, n.d)) / 864e5);
  return dayDiff === 0 ? "azi" : dayDiff === 1 ? "mâine" : `${WD[p.dow]} ${p.d} ${MO[p.mo - 1]}`;
}
/** "azi, 13:00–14:00", "mâine, 13:00–14:00", "joi 5 nov., 13:00–14:00" */
export function whenLabel(iso: string, tz = "Europe/Bucharest", now = Date.now()) {
  return `${slotDay(iso, tz, now)}, ${slotRange(iso, tz)}`;
}
