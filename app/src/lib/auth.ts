import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Customer = {
  id: string; email: string | null; name: string | null; phone: string | null;
  addresses: string[]; allergies: string[]; points: number; lifetime: number; stars: number;
  free_gift: boolean; orders_count: number; spent: number; marketing_ok: boolean; created_at: string;
};

export const TIERS = [
  { name: "Bronz", min: 0, mult: 1, cls: "bronze", perk: "1 leu = 1 punct" },
  { name: "Argint", min: 500, mult: 1.05, cls: "silver", perk: "+5% puncte la fiecare comandă" },
  { name: "Aur", min: 1500, mult: 1.1, cls: "gold", perk: "+10% puncte și livrare gratuită mereu" },
];
export const tierOf = (lifetime: number) => [...TIERS].reverse().find(t => lifetime >= t.min)!;
export const nextTier = (lifetime: number) => TIERS.find(t => t.min > lifetime);
export const STARS = 6;

/** Current login session + the matching Lyra Club profile (null when signed out). */
export function useCustomer() {
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ready, setReady] = useState(false);
  async function refresh(s: Session | null = session) {
    if (!s) { setCustomer(null); return; }
    const { data } = await supabase.from("customers").select("*").eq("id", s.user.id).maybeSingle();
    setCustomer((data as Customer) || null);
  }
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => { setSession(data.session); await refresh(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); refresh(s); });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, customer, ready, refresh: () => refresh() };
}
