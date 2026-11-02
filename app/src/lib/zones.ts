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

/** Address → coordinates (OpenStreetMap / Nominatim), biased to Mureș county. */
export async function geocode(address: string): Promise<(LatLng & { label: string }) | null> {
  const q = address.trim();
  if (q.length < 4) return null;
  const search = /mure[sș]|t[aâ]rgu|tg\.?\s*mure|acățari|acatari/i.test(q) ? q : `${q}, județul Mureș`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ro&accept-language=ro&viewbox=24.2,46.75,25.0,46.3&bounded=0&q=${encodeURIComponent(search)}`;
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const d = (await r.json()) as { lat: string; lon: string; display_name: string }[];
    return d[0] ? { lat: +d[0].lat, lng: +d[0].lon, label: d[0].display_name } : null;
  } catch { return null; }
}
