// Teste: node --experimental-strip-types supabase/functions/fcm_test.ts
import { generateKeyPairSync, createVerify } from "node:crypto";
import { handler, serviceJwt, message } from "./fcm/index.ts";
const ok = (c: boolean, m: string) => { if (!c) { console.log("EȘUAT", m); process.exitCode = 1; } else console.log("ok ", m); };
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const sa = { client_email: "fcm@lyra.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) as string, project_id: "lyra-livrator" };
const jwt = await serviceJwt(sa, 1700000000);
const [h, c, s] = jwt.split(".");
const v = createVerify("RSA-SHA256"); v.update(`${h}.${c}`);
ok(v.verify(publicKey, Buffer.from(s, "base64url")), "JWT semnat corect (RS256)");
const claims = JSON.parse(Buffer.from(c, "base64url").toString());
ok(claims.iss === sa.client_email && claims.scope.includes("firebase.messaging") && claims.exp === 1700003600, "JWT: emitent, scop, expirare");
const m = message("tok", "Comandă nouă #12", "Str. X", "cr-1") as any;
ok(m.message.android.priority === "HIGH" && m.message.android.notification.channel_id === "comenzi" && m.message.android.notification.sound === "alarm", "mesaj: prioritate mare, canal comenzi, sunet alarmă");
const calls: { u: string; o: any }[] = [];
(globalThis as any).fetch = async (u: string, o: any) => {
  calls.push({ u, o });
  if (u.includes("oauth2")) return new Response(JSON.stringify({ access_token: "at1", expires_in: 3600 }));
  if (u.includes("fcm.googleapis.com")) return JSON.parse(o.body).message.token === "mort"
    ? new Response(JSON.stringify({ error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } }), { status: 404 })
    : new Response(JSON.stringify({ name: "projects/x/messages/1" }));
  return new Response(null, { status: 204 });
};
const env = { get: (k: string) => ({ PUSH_SECRET: "s3", FIREBASE_SERVICE_ACCOUNT: JSON.stringify(sa), SUPABASE_URL: "https://db.test", SUPABASE_SERVICE_ROLE_KEY: "srv" } as any)[k] };
let r = await handler(new Request("https://f/fcm", { method: "POST", body: "{}" }), env);
ok(r.status === 403, "fără secret: refuzat");
r = await handler(new Request("https://f/fcm", { method: "POST", headers: { "x-push-secret": "s3" }, body: JSON.stringify({ tokens: ["viu", "mort"], title: "T", body: "B", tag: "cr-1" }) }), env);
const j = await r.json();
ok(j.sent === 1 && j.gone === 1, "trimis la tokenul valid, cel dezinstalat e marcat");
ok(calls.some(x => x.u.includes("/projects/lyra-livrator/messages:send") && x.o.headers.Authorization === "Bearer at1"), "cerere FCM cu tokenul OAuth");
ok(calls.some(x => x.o?.method === "DELETE" && x.u.includes("courier_devices") && x.u.includes("mort")), "tokenul mort se șterge din bază");
