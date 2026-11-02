import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Customer = {
  id: string; email: string | null; name: string | null; phone: string | null;
  addresses: string[]; allergies: string[]; points: number; orders_count: number; spent: number;
  marketing_ok: boolean; created_at: string;
  tier: number; reward_spent: number; last_activity_at: string | null;   // Lyra Rewards
};

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
