import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

/** Lyra Rewards settings (table rewards_settings, edited in admin). */
export type RewardsCfg = {
  enabled: boolean;
  program_name: string;
  tier_names: string[];
  thresholds: number[];
  rates: number[];
  max_redeem_pct: number;
  voucher_days: number;
  expiry_months: number;
  near_tier_lei: number;
  dessert_ids: string[];
};
export type Lot = { id: string; remaining: number; vpp: number; tier: number; created_at: string };
export type LedgerRow = { kind: string; points: number; value: number; tier: number | null; note: string | null; order_no: number | null; created_at: string };
export type Voucher = { id: string; tier: number; status: "active" | "used" | "expired" | "cancelled"; item_id: string | null; expires_at: string; used_at: string | null };
export type RewardNote = { id: number; kind: string; title: string; body: string; data: Record<string, unknown>; read_at: string | null; created_at: string };
export type MyRewards = {
  tier: number; spent: number; points: number; value: number; expires_at: string | null;
  lots: Lot[]; ledger: LedgerRow[]; vouchers: Voucher[]; notifications: RewardNote[];
};

export const DEFAULT_CFG: RewardsCfg = {
  enabled: true, program_name: "Lyra Rewards", tier_names: ["Classic", "Select", "Signature"],
  thresholds: [0, 500, 1500], rates: [1, 2, 4], max_redeem_pct: 20, voucher_days: 30, expiry_months: 12,
  near_tier_lei: 150, dessert_ids: [],
};
export const TIER_CLS = ["classic", "select", "signature"];

const num = (x: unknown) => Number(x) || 0;
function normCfg(d: Record<string, unknown> | null): RewardsCfg {
  if (!d) return DEFAULT_CFG;
  return {
    ...DEFAULT_CFG, ...d,
    thresholds: ((d.thresholds as unknown[]) || DEFAULT_CFG.thresholds).map(num),
    rates: ((d.rates as unknown[]) || DEFAULT_CFG.rates).map(num),
    max_redeem_pct: num(d.max_redeem_pct ?? 20), near_tier_lei: num(d.near_tier_lei ?? 150),
  } as RewardsCfg;
}

/** Program settings (public) + the signed-in customer's balance, lots, vouchers and history. */
export function useRewards(customerId?: string | null) {
  const [cfg, setCfg] = useState<RewardsCfg>(DEFAULT_CFG);
  const [me, setMe] = useState<MyRewards | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("rewards_settings").select("*").eq("id", 1).maybeSingle();
    setCfg(normCfg(data as Record<string, unknown> | null));
    if (!customerId) { setMe(null); return; }
    const r = await supabase.rpc("my_rewards");
    const d = r.data as MyRewards | null;
    setMe(d ? { ...d, spent: num(d.spent), value: num(d.value), lots: (d.lots || []).map(l => ({ ...l, vpp: num(l.vpp) })) } : null);
  }, [customerId]);
  useEffect(() => { load(); }, [load]);
  return { cfg, me, reload: load };
}

export const tierName = (cfg: RewardsCfg, t: number) => cfg.tier_names[Math.min(3, Math.max(1, t)) - 1] || "";
export const rateOf = (cfg: RewardsCfg, t: number) => cfg.rates[Math.min(3, Math.max(1, t)) - 1] || 0;
/** lei per point at a tier (1 leu spent = 1 point; rate% cashback) */
export const vppOf = (cfg: RewardsCfg, t: number) => rateOf(cfg, t) / 100;

/** Spending left to the next tier, or null at the top. */
export function nextTierInfo(cfg: RewardsCfg, tier: number, spent: number) {
  if (tier >= 3) return null;
  const target = cfg.thresholds[tier];
  const from = cfg.thresholds[tier - 1] || 0;
  return { tier: tier + 1, left: Math.max(0, target - spent), pct: Math.min(100, Math.max(0, ((spent - from) / (target - from)) * 100)) };
}

/** Same rule as rewards_plan in the database: oldest lots first, never above the cap in lei. */
export function planRedeem(lots: Lot[], want: number, cap: number) {
  let points = 0, acc = 0;
  for (const l of lots) {
    if (points >= want) break;
    let k = Math.min(l.remaining, want - points);
    if (l.vpp > 0) k = Math.min(k, Math.floor((cap - acc) / l.vpp + 1e-9));
    if (k <= 0) break;
    points += k; acc += k * l.vpp;
  }
  return { points, value: Math.floor(acc * 100 + 1e-6) / 100 };
}
/** Cap in lei for a products total (after promo code). */
export const redeemCap = (cfg: RewardsCfg, products: number) => Math.floor(Math.max(0, products) * cfg.max_redeem_pct) / 100;

export const LEDGER_LABEL: Record<string, string> = {
  earn: "Câștigate", redeem: "Folosite", redeem_return: "Returnate", reverse: "Retrase (rambursare)",
  expire: "Expirate", adjust: "Ajustare", migration: "Din Lyra Club", referral: "Invită un prieten",
};
