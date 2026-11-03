import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

/** A percentage discount from admin on a set of products (table item_discounts). */
export type Discount = {
  id: string; name: string; percent: number; item_ids: string[]; active: boolean;
  starts_at: string | null; ends_at: string | null; created_at?: string;
};

export const isLive = (d: Discount, now = Date.now()) =>
  d.active && (!d.starts_at || new Date(d.starts_at).getTime() <= now) && (!d.ends_at || new Date(d.ends_at).getTime() > now);

/** same rounding as the database: round(price * (100 - pct) / 100, 2) */
export const cut = (price: number, pct: number) => (pct > 0 ? Math.round(price * (100 - pct)) / 100 : price);

export function useDiscounts(all = false) {
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
  /** best live percent per product */
  const pct = useMemo(() => {
    const m: Record<string, number> = {};
    list.filter(d => isLive(d, now)).forEach(d => d.item_ids.forEach(id => { m[id] = Math.max(m[id] || 0, d.percent); }));
    return m;
  }, [list, now]);
  return { list, pct, reload: load };
}
