// Funcția Edge „fcm”: notificări native pe telefoanele livratorilor (aplicația Android „Lyra Livrator”), prin Firebase.
// Primește de la baza de date (pg_net) lista de tokenuri și textul; se autentifică la Google cu contul de serviciu Firebase.
// Secrete: FIREBASE_SERVICE_ACCOUNT (tot JSON-ul contului de serviciu), PUSH_SECRET. Publicare cu Verify JWT oprit.
// Fișier unic: se poate lipi direct în Supabase → Edge Functions → Via Editor.

export type Env = { get(k: string): string | undefined };
type SA = { client_email: string; private_key: string; project_id: string };

const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === "string" ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer);
  let s = ""; bytes.forEach(x => (s += String.fromCharCode(x)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** JWT semnat RS256 pentru contul de serviciu (OAuth 2.0 „jwt-bearer”) */
export async function serviceJwt(sa: SA, now = Math.floor(Date.now() / 1000)) {
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${claims}`));
  return `${head}.${claims}.${b64url(sig)}`;
}

let cached: { token: string; until: number } | null = null;
async function accessToken(sa: SA) {
  if (cached && cached.until > Date.now() + 60000) return cached.token;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + (await serviceJwt(sa)),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("Google OAuth: " + (j.error_description || j.error || r.status));
  cached = { token: j.access_token, until: Date.now() + (j.expires_in || 3600) * 1000 };
  return cached.token;
}

/** mesajul FCM: prioritate mare, canalul „comenzi” (sunet de alarmă), vizibil pe ecranul blocat */
export const message = (token: string, title: string, body: string, tag: string) => ({
  message: {
    token,
    notification: { title, body },
    data: { tag, url: "/curier" },
    android: {
      priority: "HIGH", ttl: "600s",
      notification: { channel_id: "comenzi", sound: "alarm", tag, visibility: "PUBLIC", notification_priority: "PRIORITY_MAX", default_vibrate_timings: true },
    },
  },
});

export async function handler(req: Request, env: Env): Promise<Response> {
  if (req.method !== "POST" || req.headers.get("x-push-secret") !== env.get("PUSH_SECRET")) return new Response("forbidden", { status: 403 });
  const { tokens = [], title, body, tag } = await req.json() as { tokens: string[]; title: string; body: string; tag: string };
  const sa = JSON.parse(env.get("FIREBASE_SERVICE_ACCOUNT") || "{}") as SA;
  if (!sa.client_email || !sa.private_key) return Response.json({ error: "FIREBASE_SERVICE_ACCOUNT lipsește" }, { status: 500 });
  const at = await accessToken(sa);
  const gone: string[] = []; let sent = 0;
  await Promise.all(tokens.map(async t => {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST", headers: { Authorization: "Bearer " + at, "Content-Type": "application/json" }, body: JSON.stringify(message(t, title, body, tag || "lyra")),
    });
    if (r.ok) { sent++; return; }
    const j = await r.json().catch(() => ({}));
    const code = j?.error?.details?.find?.((d: { errorCode?: string }) => d.errorCode)?.errorCode || j?.error?.status;
    if (r.status === 404 || code === "UNREGISTERED" || code === "INVALID_ARGUMENT") gone.push(t);
    else console.error("fcm", r.status, JSON.stringify(j));
  }));
  if (gone.length) {   // telefonul a dezinstalat aplicația sau tokenul s-a schimbat
    const key = env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    await fetch(`${env.get("SUPABASE_URL")}/rest/v1/courier_devices?token=in.(${gone.map(g => `"${g}"`).join(",")})`, {
      method: "DELETE", headers: { apikey: key, Authorization: "Bearer " + key } });
  }
  return Response.json({ sent, gone: gone.length });
}

if (typeof Deno !== "undefined") Deno.serve(req => handler(req, Deno.env));
