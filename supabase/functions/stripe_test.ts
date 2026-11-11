// Teste: node --experimental-strip-types supabase/functions/stripe_test.ts  (sau deno run stripe_test.ts)
import { form, sessionParams, stripe } from "./pay/index.ts";
import { verifyStripe } from "./stripe-webhook/index.ts";
import { createHmac } from "node:crypto";
const ok = (c: boolean, m: string) => { if (!c) { console.log("EȘUAT", m); process.exitCode = 1; } else console.log("ok ", m); };
const p = sessionParams({ id: "o1", number: 12, total: 87.5, email: null, site_url: "https://lyrasdelivery.ro/" }, "tok");
const f = decodeURIComponent(form(p));
ok(f.includes("line_items[0][price_data][unit_amount]=8750") && f.includes("line_items[0][price_data][currency]=ron"), "suma în bani, lei");
ok(!f.includes("payment_method_types") && f.includes("integration_identifier=lyra_comenzi_") && f.includes("metadata[order_id]=o1") && !f.includes("customer_email"), "metode dinamice, etichetă, câmpuri goale");
ok(f.includes("success_url=https://lyrasdelivery.ro/comanda/tok?plata=ok"), "linkul de întoarcere");
const sec = "whsec_test", body = '{"type":"checkout.session.completed"}', t = Math.floor(Date.now() / 1000);
const sig = createHmac("sha256", sec).update(`${t}.${body}`).digest("hex");
ok(await verifyStripe(body, `t=${t},v1=${sig}`, sec), "semnătură bună");
ok(!(await verifyStripe(body + " ", `t=${t},v1=${sig}`, sec)), "conținut schimbat: respins");
ok(!(await verifyStripe(body, `t=${t - 600},v1=${createHmac("sha256", sec).update(`${t - 600}.${body}`).digest("hex")}`, sec)), "semnătură veche: respinsă");
ok(!(await verifyStripe(body, null, sec)), "fără antet: respins");
let seen: any = null;
(globalThis as any).fetch = async (u: string, o: any) => { seen = { u, o }; return new Response(JSON.stringify({ id: "cs_1", url: "https://checkout.stripe.com/x" }), { status: 200 }); };
const env = { get: (k: string) => ({ STRIPE_SECRET_KEY: "sk_test_1" } as any)[k] };
const s = await stripe(env, "checkout/sessions", p, "k1");
ok(s.id === "cs_1" && seen.u === "https://api.stripe.com/v1/checkout/sessions" && seen.o.headers.Authorization === "Bearer sk_test_1" && seen.o.headers["Idempotency-Key"] === "k1" && seen.o.headers["Stripe-Version"] === "2026-10-28.endive", "cerere Stripe corectă, versiune API fixată");
(globalThis as any).fetch = async () => new Response(JSON.stringify({ error: { message: "Invalid API Key" } }), { status: 401 });
try { await stripe(env, "refunds", {}); ok(false, "eroare"); } catch (e) { ok((e as Error).message === "Invalid API Key", "eroarea Stripe ajunge la apelant"); }

// ---- drumul complet, cu Stripe și baza de date simulate ----
import { handler as payHandler } from "./pay/index.ts";
import { handler as hookHandler } from "./stripe-webhook/index.ts";
const ENV = { get: (k: string) => ({ STRIPE_SECRET_KEY: "sk_test_1", STRIPE_WEBHOOK_SECRET: "whsec_test", PUSH_SECRET: "s3", SUPABASE_URL: "https://db.test", SUPABASE_SERVICE_ROLE_KEY: "srv" } as any)[k] };
const calls: { u: string; b: any }[] = [];
(globalThis as any).fetch = async (u: string, o: any = {}) => {
  const b = o.body ? (typeof o.body === "string" && o.body.startsWith("{") ? JSON.parse(o.body) : o.body) : null; calls.push({ u, b });
  if (u.endsWith("/rpc/pay_order_info")) return new Response(JSON.stringify({ id: "o9", number: 9, total: 54, email: "a@b.ro", pay_status: "pending", payment: "online", status: "new", created_at: new Date().toISOString(), site_url: "https://lyrasdelivery.ro", stripe_session: null }));
  if (u.endsWith("/v1/checkout/sessions")) return new Response(JSON.stringify({ id: "cs_9", url: "https://checkout.stripe.com/c/cs_9" }));
  if (u.includes("/rest/v1/orders?id=eq.o9")) return new Response(JSON.stringify([{ stripe_payment: "pi_9", pay_status: "refunding" }]));
  if (u.endsWith("/v1/refunds")) return new Response(JSON.stringify({ id: "re_9" }));
  return new Response("true", { status: 200 });
};
let res = await payHandler(new Request("https://f/pay", { method: "POST", body: JSON.stringify({ token: "tok9" }) }), ENV);
let j = await res.json();
ok(j.url === "https://checkout.stripe.com/c/cs_9" && calls.some(c => c.u.endsWith("/rpc/pay_set_session") && c.b.p_session === "cs_9"), "pay: deschide plata și salvează sesiunea");
ok(String(calls.find(c => c.u.endsWith("/checkout/sessions"))!.b).includes("unit_amount%5D=5400"), "pay: suma 54 lei = 5400 bani");
res = await payHandler(new Request("https://f/pay", { method: "POST", body: JSON.stringify({ action: "refund", order_id: "o9" }) }), ENV);
ok(res.status === 403, "rambursare fără secret: refuzată");
res = await payHandler(new Request("https://f/pay", { method: "POST", headers: { "x-pay-secret": "s3" }, body: JSON.stringify({ action: "refund", order_id: "o9" }) }), ENV);
ok((await res.json()).refunded === "re_9" && calls.some(c => c.u.endsWith("/rpc/pay_mark_refunded") && c.b.p_refund === "re_9"), "rambursare: Stripe + marcată în bază");
const ev = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_9", payment_status: "paid", payment_intent: "pi_9", metadata: { order_id: "o9" } } } });
const ts = Math.floor(Date.now() / 1000);
res = await hookHandler(new Request("https://f/hook", { method: "POST", headers: { "stripe-signature": `t=${ts},v1=${createHmac("sha256", "whsec_test").update(`${ts}.${ev}`).digest("hex")}` }, body: ev }), ENV);
ok(res.status === 200 && calls.some(c => c.u.endsWith("/rpc/pay_mark_paid") && c.b.p_order === "o9" && c.b.p_payment === "pi_9"), "webhook: plata marcată în bază");
res = await hookHandler(new Request("https://f/hook", { method: "POST", headers: { "stripe-signature": `t=${ts},v1=00` }, body: ev }), ENV);
ok(res.status === 400, "webhook cu semnătură falsă: respins");
