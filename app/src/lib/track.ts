// Statistici anonime de vizite (tabelul site_events): un id aleator pe sesiunea din browser, fără date personale.
import { supabase } from "./supabase";

type Kind = "visit" | "view_item" | "add_cart" | "search" | "checkout" | "order" | "account" | "signup";
const DEMO = import.meta.env.MODE === "demo";
const STAFF = /^\/(receptie|admin|curier)/;

function sid() {
  try {
    let v = sessionStorage.getItem("lyra-sid");
    if (!v) { v = crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (+c ^ (Math.random() * 16) >> (+c / 4)).toString(16)); sessionStorage.setItem("lyra-sid", v); }
    return v;
  } catch { return null; }
}

/** where the visitor came from, decided once per session: ?s=, /fb /ig /qr links, utm_source, click ids, referrer */
function source() {
  try {
    const kept = sessionStorage.getItem("lyra-src"); if (kept) return kept;
    const u = new URL(location.href), q = u.searchParams;
    const path = (location.hash.replace(/^#/, "") || location.pathname).split("?")[0].replace(/^\//, "").split("/")[0];
    const named: Record<string, string> = { fb: "facebook", ig: "instagram", qr: "qr", google: "google", tiktok: "tiktok", wa: "whatsapp", flyer: "flyer" };
    let s = q.get("s") || q.get("utm_source") || named[path] || "";
    if (!s && q.get("fbclid")) s = "facebook";
    if (!s && q.get("gclid")) s = "google";
    if (!s && document.referrer) {
      const h = new URL(document.referrer).hostname.replace(/^www\.|^m\.|^l\./, "");
      if (!h.includes(location.hostname)) s = /facebook|fb\./.test(h) ? "facebook" : /instagram/.test(h) ? "instagram" : /google/.test(h) ? "google" : /tiktok/.test(h) ? "tiktok" : h;
    }
    s = (named[s] || s || "direct").toLowerCase();
    sessionStorage.setItem("lyra-src", s); return s;
  } catch { return "direct"; }
}
const device = () => (matchMedia("(max-width: 860px)").matches || /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "telefon" : "calculator");

/** send one step; the database keeps each step once per session (and once per product / search term) */
export function track(kind: Kind, detail?: string | number | null) {
  if (DEMO || STAFF.test(location.pathname) || STAFF.test(location.hash.replace(/^#/, ""))) return;
  const id = sid(); if (!id) return;
  supabase.rpc("track", { p_sid: id, p_kind: kind, p_detail: detail == null ? null : String(detail), p_source: source(), p_device: device() }).then(() => {}, () => {});
}
