// Stripe prin API-ul REST (fără SDK) + apeluri către baza de date cu cheia service_role.
// Folosește doar fetch și WebCrypto, deci rulează la fel în Deno (Supabase Edge) și în Node (teste).

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

export async function stripe(env: Env, path: string, body: Record<string, unknown>, idem?: string) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + env.get("STRIPE_SECRET_KEY"), "Content-Type": "application/x-www-form-urlencoded", ...(idem ? { "Idempotency-Key": idem } : {}) },
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
    "payment_method_types": ["card"],
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
