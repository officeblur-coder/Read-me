// Funcția Edge „stripe-webhook”: Stripe anunță plata reușită / sesiunea expirată.
// Publicare: supabase functions deploy stripe-webhook --no-verify-jwt
// În Stripe → Developers → Webhooks: URL https://<proiect>.supabase.co/functions/v1/stripe-webhook,
// evenimentele checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired.
// Fișier unic: se poate lipi direct în Supabase → Edge Functions → Via Editor.

export type Env = { get(k: string): string | undefined };

export async function rpc(env: Env, fn: string, args: Record<string, unknown>) {
  const key = env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const r = await fetch(`${env.get("SUPABASE_URL")}/rest/v1/rpc/${fn}`, {
    method: "POST", headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify(args),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${fn}: ${t}`);
  return t ? JSON.parse(t) : null;
}
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
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

export async function handler(req: Request, env: Env): Promise<Response> {
  const payload = await req.text();
  if (!(await verifyStripe(payload, req.headers.get("stripe-signature"), env.get("STRIPE_WEBHOOK_SECRET") || ""))) return new Response("bad signature", { status: 400 });
  const ev = JSON.parse(payload);
  const s = ev.data?.object || {};
  const order = s.metadata?.order_id || s.client_reference_id;
  try {
    if (order && (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") && s.payment_status === "paid") {
      await rpc(env, "pay_mark_paid", { p_order: order, p_session: s.id, p_payment: s.payment_intent });
    } else if (order && (ev.type === "checkout.session.expired" || ev.type === "checkout.session.async_payment_failed")) {
      await rpc(env, "pay_mark_failed", { p_order: order });
    }
  } catch (e) {
    console.error(e);
    return new Response("retry", { status: 500 });   // Stripe încearcă din nou
  }
  return new Response("ok");
}

if (typeof Deno !== "undefined") Deno.serve(req => handler(req, Deno.env));
