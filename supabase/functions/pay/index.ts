// Funcția Edge „pay”:
//  • din site: { token }            → deschide plata Stripe Checkout pentru comandă și întoarce { url }
//  • din baza de date (pg_net): { action: "refund", order_id } cu antetul x-pay-secret → rambursează pe card
// Publicare: supabase functions deploy pay --no-verify-jwt   (vezi README.md)
// Fișier unic: se poate lipi direct în Supabase → Edge Functions → Via Editor.

export type Env = { get(k: string): string | undefined };

/** {a: 1, b: {c: 2}, d: [{e: 3}]} → a=1&b[c]=2&d[0][e]=3 (formatul cerut de Stripe) */
export function form(obj: Record<string, unknown>, prefix = ""): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") out.push(form(v as Record<string, unknown>, key));
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out.filter(Boolean).join("&");
}

// versiunea API fixată: integrarea nu se schimbă singură când Stripe lansează versiuni noi
export const STRIPE_VERSION = "2026-10-28.endive";
// eticheta sesiunilor Lyra în Dashboard (Checkout → filtrare după integrare)
export const INTEGRATION_ID = "lyra_comenzi_qkvmtrwz";
// STRIPE_SECRET_KEY poate fi o cheie restricționată (rk_…), recomandat: Checkout Sessions = Write, Refunds = Write
const auth = (env: Env) => ({ Authorization: "Bearer " + env.get("STRIPE_SECRET_KEY"), "Stripe-Version": STRIPE_VERSION });

export async function stripe(env: Env, path: string, body: Record<string, unknown>, idem?: string) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: { ...auth(env), "Content-Type": "application/x-www-form-urlencoded", ...(idem ? { "Idempotency-Key": idem } : {}) },
    body: form(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "Stripe " + r.status);
  return j;
}

export async function rpc(env: Env, fn: string, args: Record<string, unknown>) {
  const key = env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const r = await fetch(`${env.get("SUPABASE_URL")}/rest/v1/rpc/${fn}`, {
    method: "POST", headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify(args),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${fn}: ${t}`);
  return t ? JSON.parse(t) : null;
}

/** parametrii sesiunii Stripe Checkout pentru o comandă (suma vine din bază, în bani) */
export function sessionParams(o: { id: string; number: number; total: number; email?: string | null; site_url: string }, token: string) {
  const site = o.site_url.replace(/\/$/, "");
  return {
    mode: "payment",
    locale: "ro",
    // fără payment_method_types: Stripe arată singur metodele potrivite (card, Apple Pay, Google Pay…), alese din Dashboard
    integration_identifier: INTEGRATION_ID,
    line_items: [{ quantity: 1, price_data: { currency: "ron", unit_amount: Math.round(Number(o.total) * 100), product_data: { name: `Comanda #${o.number} · Lyra's Delivery` } } }],
    customer_email: o.email || undefined,
    client_reference_id: o.id,
    metadata: { order_id: o.id, order_no: String(o.number) },
    payment_intent_data: { metadata: { order_id: o.id, order_no: String(o.number) } },
    success_url: `${site}/comanda/${token}?plata=ok`,
    cancel_url: `${site}/comanda/${token}?plata=anulat`,
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,   // minim 30 de minute la Stripe
  };
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");

/** verifică antetul Stripe-Signature (t=…,v1=…) cu secretul webhook-ului; toleranță 5 minute */
export async function verifyStripe(payload: string, header: string | null, secret: string, now = Date.now()): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map(p => p.split("=") as [string, string]).filter(p => p.length === 2));
  const sigs = header.split(",").filter(p => p.startsWith("v1=")).map(p => p.slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length || Math.abs(now / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`)));
  return sigs.some(s => s.length === mac.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ mac.charCodeAt(i)), 0) === 0);
}

// ---------- funcția ----------
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

export async function handler(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "POST" }, 405);
  const b = await req.json().catch(() => ({}));
  try {
    if (b.action === "refund") {
      if (req.headers.get("x-pay-secret") !== env.get("PUSH_SECRET")) return json({ error: "forbidden" }, 403);
      const key = env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const r = await fetch(`${env.get("SUPABASE_URL")}/rest/v1/orders?id=eq.${encodeURIComponent(b.order_id)}&select=stripe_payment,pay_status`, { headers: { apikey: key, Authorization: "Bearer " + key } });
      const [o] = await r.json();
      if (!o?.stripe_payment || !["paid", "refunding"].includes(o.pay_status)) return json({ skipped: true });
      const ref = await stripe(env, "refunds", { payment_intent: o.stripe_payment, metadata: { order_id: b.order_id } }, "refund-" + b.order_id);
      await rpc(env, "pay_mark_refunded", { p_order: b.order_id, p_refund: ref.id });
      return json({ refunded: ref.id });
    }
    if (!b.token) return json({ error: "Lipsește comanda." }, 400);
    const o = await rpc(env, "pay_order_info", { p_token: b.token });
    if (!o) return json({ error: "Comanda nu a fost găsită." }, 404);
    if (o.payment !== "online" || o.pay_status !== "pending" || o.status !== "new") return json({ error: o.pay_status === "paid" ? "Comanda e deja plătită." : "Comanda nu mai așteaptă plata." }, 409);
    if (Date.now() - new Date(o.created_at).getTime() > 29 * 60000) return json({ error: "Timpul pentru plată a expirat. Plasează comanda din nou." }, 409);
    // aceeași sesiune dacă clientul revine (Stripe o păstrează deschisă până expiră)
    if (o.stripe_session) {
      const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + o.stripe_session, { headers: auth(env) });
      const s = await r.json();
      if (r.ok && s.status === "open" && s.url) return json({ url: s.url });
    }
    const s = await stripe(env, "checkout/sessions", sessionParams(o, b.token));
    await rpc(env, "pay_set_session", { p_order: o.id, p_session: s.id });
    return json({ url: s.url });
  } catch (e) {
    console.error(e);
    return json({ error: "Plata nu a putut fi pornită. Încearcă din nou sau sună-ne." }, 502);
  }
}

// rulează în Supabase (Deno); în teste se importă doar funcțiile
if (typeof Deno !== "undefined") Deno.serve(req => handler(req, Deno.env));
