// Funcția Edge „pay”:
//  • din site: { token }            → deschide plata Stripe Checkout pentru comandă și întoarce { url }
//  • din baza de date (pg_net): { action: "refund", order_id } cu antetul x-pay-secret → rambursează pe card
// Publicare: supabase functions deploy pay --no-verify-jwt   (vezi README.md)
import { rpc, sessionParams, stripe } from "../_shared/stripe.ts";

const env = Deno.env;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async req => {
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
      const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + o.stripe_session, { headers: { Authorization: "Bearer " + env.get("STRIPE_SECRET_KEY") } });
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
});
