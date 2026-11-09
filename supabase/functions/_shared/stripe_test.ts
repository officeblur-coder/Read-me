// Teste: node --experimental-strip-types supabase/functions/_shared/stripe_test.ts  (sau deno run stripe_test.ts)
import { form, sessionParams, verifyStripe, stripe } from "./stripe.ts";
import { createHmac } from "node:crypto";
const ok = (c: boolean, m: string) => { if (!c) { console.log("EȘUAT", m); process.exitCode = 1; } else console.log("ok ", m); };
const p = sessionParams({ id: "o1", number: 12, total: 87.5, email: null, site_url: "https://lyrasdelivery.ro/" }, "tok");
const f = decodeURIComponent(form(p));
ok(f.includes("line_items[0][price_data][unit_amount]=8750") && f.includes("line_items[0][price_data][currency]=ron"), "suma în bani, lei");
ok(f.includes("payment_method_types[0]=card") && f.includes("metadata[order_id]=o1") && !f.includes("customer_email"), "array-uri și câmpuri goale");
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
ok(s.id === "cs_1" && seen.u === "https://api.stripe.com/v1/checkout/sessions" && seen.o.headers.Authorization === "Bearer sk_test_1" && seen.o.headers["Idempotency-Key"] === "k1", "cerere Stripe corectă");
(globalThis as any).fetch = async () => new Response(JSON.stringify({ error: { message: "Invalid API Key" } }), { status: 401 });
try { await stripe(env, "refunds", {}); ok(false, "eroare"); } catch (e) { ok((e as Error).message === "Invalid API Key", "eroarea Stripe ajunge la apelant"); }
