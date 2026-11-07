import { useEffect } from "react";
import { supabase } from "../lib/supabase";

/** lyrasdelivery.ro/l?s=…&k=… — a link from a newsletter: count the click, then go to the real address. */
export default function Link() {
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const s = q.get("s"), k = Number(q.get("k"));
    const go = (u: string | null) => location.replace(u && /^https?:\/\//i.test(u) ? u : "/?s=newsletter");
    if (!s || !k) { go(null); return; }
    try { sessionStorage.setItem("lyra-src", "newsletter"); } catch { /* ignore */ }
    const t = setTimeout(() => go(null), 4000);          // dacă serverul nu răspunde, tot ajunge pe site
    supabase.rpc("newsletter_click", { p_send: s, p_k: k }).then(({ data }) => { clearTimeout(t); go((data as string) || null); }, () => go(null));
  }, []);
  return <div className="app"><p className="t-sub" style={{ padding: 40, textAlign: "center" }}>Te ducem la Lyra's Delivery…</p></div>;
}
