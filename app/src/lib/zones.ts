import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

/** A delivery area drawn on the map in admin (table delivery_zones). */
export type Zone = {
  id: string; name: string; color: string; polygon: [number, number][];
  fee: number; min_order: number; free_over: number | null; eta_extra: number; active: boolean; sort: number;
};
export type LatLng = { lat: number; lng: number };

export const RESTAURANT: LatLng = { lat: 46.4795, lng: 24.6339 };   // Acățari, DN 13
export const MURES_CENTER: LatLng = { lat: 46.53, lng: 24.585 };

const norm = (z: Zone): Zone => ({ ...z, fee: Number(z.fee), min_order: Number(z.min_order), free_over: z.free_over == null ? null : Number(z.free_over) });

export function useZones(all = false) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    let q = supabase.from("delivery_zones").select("*").order("sort");
    if (!all) q = q.eq("active", true);
    const { data, error } = await q;
    setZones(error ? [] : ((data || []) as Zone[]).map(norm));
    setLoaded(true);
  }, [all]);
  useEffect(() => { load(); }, [load]);
  return { zones, loaded, reload: load };
}

/** Ray casting, same rule as point_in_zone in the database. */
export function inPolygon(p: LatLng, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if ((yi > p.lat) !== (yj > p.lat) && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function area(poly: [number, number][]) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) { const [y1, x1] = poly[i], [y2, x2] = poly[(i + 1) % poly.length]; s += x1 * y2 - x2 * y1; }
  return Math.abs(s) / 2;
}
/** The zone a point falls in: the smallest one when zones overlap (like the database). */
export function zoneFor(p: LatLng | null, zones: Zone[]) {
  if (!p) return null;
  return zones.filter(z => z.active && z.polygon.length >= 3 && inPolygon(p, z.polygon))
    .sort((a, b) => area(a.polygon) - area(b.polygon) || a.sort - b.sort)[0] || null;
}

export const LOCALITIES = ["Târgu Mureș", "Sâncraiu de Mureș", "Sângeorgiu de Mureș", "Sântana de Mureș", "Corunca", "Livezeni", "Cristești",
  "Ernei", "Acățari", "Gornești", "Ungheni", "Mureșeni", "Remetea", "Mădăraș", "Band", "Miercurea Nirajului", "Ceuașu de Câmpie", "Pănet"];

const UA_HEADERS = { Accept: "application/json" };
// only results inside this box (Mureș around Târgu Mureș) count; without "bounded" the box is just a hint
const VIEWBOX = "24.2,46.75,25.0,46.3";
async function nominatim(params: Record<string, string>) {
  const qs = new URLSearchParams({ format: "json", limit: "1", countrycodes: "ro", "accept-language": "ro", viewbox: VIEWBOX, bounded: "1", ...params });
  try {
    const r = await fetch("https://nominatim.openstreetmap.org/search?" + qs, { headers: UA_HEADERS });
    const d = (await r.json()) as { lat: string; lon: string; display_name: string }[];
    return d[0] ? { lat: +d[0].lat, lng: +d[0].lon, label: d[0].display_name } : null;
  } catch { return null; }
}
const pause = () => new Promise(r => setTimeout(r, 1100));   // OpenStreetMap allows ~1 search per second
/** lower case, no diacritics: "Târgu Mureș" → "targu mures" */
export const fold = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const isTgm = (c: string) => /^(tg\.?|targu)[\s-]*mures$/.test(fold(c));

/** Street as people write it → what the map search understands: no "Str." before "Aleea", no block/apartment.
 *  A locality written in the street ("Ernei 4b") is taken out and returned, so the search happens in that locality. */
export function cleanStreet(street: string, city: string) {
  let s = " " + street.replace(/\s+/g, " ") + " ";
  let locality = "";
  for (const c of [...LOCALITIES].sort((x, y) => y.length - x.length)) {
    const re = new RegExp("(^|[,\\s])" + fold(c).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=[,\\s]|$)", "i");
    const f = fold(s);
    const m = f.match(re);
    if (m && m.index != null) {
      const at = m.index + m[1].length;
      if (/(str(ada)?\.?|aleea|bd\.?|b-dul|bulevardul|calea|pia[tț]a|intrarea|pasajul)\s*$/i.test(s.slice(0, at))) continue; // "Strada Livezeni" is a street

      s = s.slice(0, at) + " " + s.slice(at + fold(c).length);
      if (!isTgm(c) && fold(c) !== fold(city)) locality = locality || c;
    }
  }
  s = s.replace(/[,\s]*\b(tg\.?|t[aâ]rgu)[\s-]*mure[sș]\b[,\s]*/gi, " ");
  s = s.replace(/[,\s]+(bl(oc)?|sc(ara)?|et(aj)?|ap(artament)?|ap\.|int(erfon)?)\b\.?\s*[\w-]*/gi, " ");
  s = s.replace(/\b(bd\.?|b-dul|blvd\.?)\s+/i, "Bulevardul ").replace(/\bstr\.\s*/i, "Strada ");
  s = s.replace(/(\d+[a-zA-Z]?)\s*\/\s*\w+/, "$1");                          // 11/4 → 11, 4b/1 → 4b
  s = s.replace(/\b(str(ada)?\.?)\s+(?=(aleea|bulevardul|bd\.?|b-dul|calea|pia[țt]a|pasajul|intrarea)\b)/i, ""); // "Str. Aleea X" → "Aleea X"
  s = s.replace(/\bnr\.?\s*/gi, "").replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ").trim().replace(/^,|,$/g, "").trim();
  const m = s.match(/^(.*?)[,\s]*(\d+[a-zA-Z]?)$/);
  const st = (m ? m[1] : s).replace(/[,\s]+$/, "").trim();
  return { street: /[a-zA-ZăâîșțĂÂÎȘȚ]{3,}/.test(st) ? st : "", number: m ? m[2] : "", locality };
}

export type Geo = LatLng & { label: string; precision: "exact" | "street" | "village"; locality: string };
/** Address → coordinates (OpenStreetMap), strict: the street must be found in that locality.
 *  Only villages (outside Târgu Mureș), where houses often have just a number, fall back to the village itself.
 *  Returns null when the address can't be placed; then the order can't be sent for delivery. */
export async function geocodeAddress(street: string, city: string): Promise<Geo | null> {
  const { street: st, number, locality } = cleanStreet(street, city.trim() || "Târgu Mureș");
  const loc = locality || city.trim() || "Târgu Mureș";
  const inLoc = (label: string) => fold(label).includes(fold(loc)) || (isTgm(loc) && fold(label).includes("targu mures"));
  if (st) {
    if (number) {
      const a = await nominatim({ street: `${number} ${st}`, city: loc, county: "Mureș" });
      if (a && inLoc(a.label)) return { ...a, precision: "exact", locality: loc };
      await pause();
    }
    const b = await nominatim({ street: st, city: loc, county: "Mureș" });
    if (b && inLoc(b.label)) return { ...b, precision: "street", locality: loc };
    if (isTgm(loc)) return null;                  // a street in Târgu Mureș that the map doesn't know: no guessing
    await pause();
  } else if (isTgm(loc)) return null;            // no street at all for the city
  const c = await nominatim({ q: `${loc}, Mureș` });
  return c && inLoc(c.label) ? { ...c, precision: "village", locality: loc } : null;
}

/** Address → coordinates (OpenStreetMap / Nominatim), biased to Mureș county. */
export async function geocode(address: string): Promise<(LatLng & { label: string }) | null> {
  const q = address.trim();
  if (q.length < 4) return null;
  return nominatim({ q: /mure[sș]|t[aâ]rgu|tg\.?\s*mure/i.test(q) ? q : `${q}, județul Mureș` });
}
