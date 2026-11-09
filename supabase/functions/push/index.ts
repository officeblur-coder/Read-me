// Funcția Edge „push”: primește de la baza de date (pg_net) lista de abonamente și textul notificării,
// o criptează și o trimite fiecărui telefon (Web Push, chei VAPID). Abonamentele expirate se șterg.
// Publicare: supabase functions deploy push --no-verify-jwt   (vezi README.md)
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

type Sub = { endpoint: string; p256dh: string; auth: string };

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:comenzi@lyrasdelivery.ro",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async req => {
  if (req.method !== "POST" || req.headers.get("x-push-secret") !== Deno.env.get("PUSH_SECRET")) return new Response("forbidden", { status: 403 });
  const { subs = [], title, body, url, tag } = await req.json() as { subs: Sub[]; title: string; body: string; url: string; tag?: string };
  const payload = JSON.stringify({ title, body, url, tag });
  const gone: string[] = [];
  let sent = 0;
  await Promise.all(subs.map(async s => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: "high" });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) gone.push(s.endpoint);   // telefonul a renunțat la abonament
      else console.error("push", code, (e as Error).message);
    }
  }));
  if (gone.length) {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await sb.from("push_subs").delete().in("endpoint", gone);
  }
  return Response.json({ sent, gone: gone.length });
});
