// Notificări cu oferte (Web Push). Le primesc doar telefoanele care au acceptat; adminul le trimite din Newsletter.
import { supabase } from "./supabase";

export const pushSupported = () => typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
/** iPhone în Safari (nu de pe ecran): Apple permite notificări doar aplicației puse pe ecran */
export const iosNeedsInstall = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) && !(navigator as Navigator & { standalone?: boolean }).standalone && !matchMedia("(display-mode: standalone)").matches;

let keyP: Promise<string | null> | null = null;
/** cheia publică VAPID din setări; null = notificările nu sunt configurate pe server */
export const publicKey = () => keyP ??= Promise.resolve(supabase.from("settings").select("push_public_key").eq("id", 1).maybeSingle())
  .then(({ data }) => (data?.push_public_key as string | null) || null, () => null);

const b64 = (s: string) => Uint8Array.from(atob((s + "=".repeat((4 - s.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
async function reg() { return (await navigator.serviceWorker.getRegistration()) || navigator.serviceWorker.register("/sw.js"); }

/** abonamentul existent pe acest telefon (null = nu primește oferte) */
export async function currentSub() {
  if (!pushSupported() || Notification.permission !== "granted") return null;
  try { return await (await reg()).pushManager.getSubscription(); } catch { return null; }
}

export const enableOffers = () => enablePush("push_subscribe_offers");

/** cere voie, abonează telefonul și îl salvează prin funcția dată (oferte / livratori); "" = gata */
export async function enablePush(rpcName: string): Promise<string> {
  if (!pushSupported()) return iosNeedsInstall() ? "Pe iPhone, pune întâi Lyra pe ecran (Distribuie → Adaugă pe ecranul principal) și deschide-o de acolo." : "Telefonul sau browserul acesta nu are notificări.";
  const key = await publicKey();
  if (!key) return "Notificările nu sunt pornite încă de restaurant.";
  if (await Notification.requestPermission() !== "granted") return "Notificările sunt blocate. Le poți porni din setările telefonului, la acest site.";
  try {
    const r = await reg(); await navigator.serviceWorker.ready;
    const sub = (await r.pushManager.getSubscription()) || await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
    const { error } = await supabase.rpc(rpcName, { p_sub: sub.toJSON() });
    return error ? error.message : "";
  } catch { return "Nu am putut porni notificările. Încearcă din nou."; }
}

export async function disableOffers() {
  const sub = await currentSub();
  if (!sub) return;
  await supabase.rpc("push_unsubscribe", { p_endpoint: sub.endpoint });
  await sub.unsubscribe().catch(() => {});
}
