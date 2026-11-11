import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

/** A percentage discount from admin on a set of products (table item_discounts). */
export type Discount = {
  id: string; name: string; percent: number; item_ids: string[]; active: boolean;
  starts_at: string | null; ends_at: string | null; created_at?: string;
  mode?: Mode;          // pentru cine: toată lumea, doar livrare sau doar ridicare
  all_items?: boolean;  // la tot meniul
};
export type Mode = "all" | "livrare" | "ridicare";
export const MODE_LABEL: Record<Mode, string> = { all: "Livrare și ridicare", livrare: "Doar la livrare", ridicare: "Doar la ridicare" };

/** best live percent for a product, for the chosen way of ordering (same rule as item_discount_pct in the database) */
export function pctFor(list: Discount[], id: string, mode: "livrare" | "ridicare" | undefined, now = Date.now()) {
  let best = 0;
  for (const d of list) {
    if (!isLive(d, now)) continue;
    if (d.mode && d.mode !== "all" && d.mode !== mode) continue;
    if (d.all_items || d.item_ids.includes(id)) best = Math.max(best, d.percent);
  }
  return best;
}
/** the "whole menu" percent for a way of ordering (shown on the livrare / ridicare choice) */
export const menuPct = (list: Discount[], mode: "livrare" | "ridicare", now = Date.now()) =>
  Math.max(0, ...list.filter(d => isLive(d, now) && d.all_items && (!d.mode || d.mode === "all" || d.mode === mode)).map(d => d.percent));

export const isLive = (d: Discount, now = Date.now()) =>
  d.active && (!d.starts_at || new Date(d.starts_at).getTime() <= now) && (!d.ends_at || new Date(d.ends_at).getTime() > now);

/** same rounding as the database: round(price * (100 - pct) / 100, 2) */
export const cut = (price: number, pct: number) => (pct > 0 ? Math.round(price * (100 - pct)) / 100 : price);

export function useDiscounts(all = false, mode?: "livrare" | "ridicare") {
  const [list, setList] = useState<Discount[]>([]);
  const [now, setNow] = useState(Date.now());
  const load = useCallback(async () => {
    let q = supabase.from("item_discounts").select("*").order("created_at", { ascending: false });
    if (!all) q = q.eq("active", true);
    const { data, error } = await q;
    setList(error ? [] : ((data || []) as Discount[]).map(d => ({ ...d, percent: Number(d.percent) })));
  }, [all]);
  useEffect(() => {
    load();
    const ch = supabase.channel("item-discounts-" + (all ? "a" : "p"))
      .on("postgres_changes", { event: "*", schema: "public", table: "item_discounts" }, () => load()).subscribe();
    const t = setInterval(() => setNow(Date.now()), 60000);   // a discount that starts or ends shows up within a minute
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [load, all]);
  /** best live percent per product (read as pct[id]; includes whole-menu discounts for the chosen mode) */
  const pct = useMemo(() => new Proxy({} as Record<string, number>, {
    get: (_, k) => (typeof k === "string" ? pctFor(list, k, mode, now) : undefined),
  }), [list, now, mode]);
  return { list, pct, reload: load };
}
