// Funcția Edge „stripe-webhook”: Stripe anunță plata reușită / sesiunea expirată.
// Publicare: supabase functions deploy stripe-webhook --no-verify-jwt
// În Stripe → Developers → Webhooks: URL https://<proiect>.supabase.co/functions/v1/stripe-webhook,
// evenimentele checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.expired.
import { rpc, verifyStripe } from "../_shared/stripe.ts";

const env = Deno.env;

Deno.serve(async req => {
  const payload = await req.text();
  if (!(await verifyStripe(payload, req.headers.get("stripe-signature"), env.get("STRIPE_WEBHOOK_SECRET") || ""))) return new Response("bad signature", { status: 400 });
  const ev = JSON.parse(payload);
  const s = ev.data?.object || {};
  const order = s.metadata?.order_id || s.client_reference_id;
  try {
    if (order && (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") && s.payment_status === "paid") {
      await rpc(env, "pay_mark_paid", { p_order: order, p_session: s.id, p_payment: s.payment_intent });
    } else if (order && ev.type === "checkout.session.expired") {
      await rpc(env, "pay_mark_failed", { p_order: order });
    }
  } catch (e) {
    console.error(e);
    return new Response("retry", { status: 500 });   // Stripe încearcă din nou
  }
  return new Response("ok");
});
