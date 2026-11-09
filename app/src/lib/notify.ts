// Notificări pe telefon/calculator.
// 1) Web Push (cu serverul configurat: settings.push_public_key): vin și cu browserul închis.
// 2) Fără server: notificări locale, cât pagina e deschisă (și în fundal), din schimbările observate la reîmprospătare.
import { supabase } from "./supabase";

export const notifSupported = () => typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
export const pushSupported = () => notifSupported() && "PushManager" in window;
export const notifState = (): NotificationPermission | "unsupported" => notifSupported() ? Notification.permission : "unsupported";
/** iPhone fără „Adaugă pe ecranul principal”: Safari nu permite notificări */
export const iosNeedsInstall = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) && !(navigator as Navigator & { standalone?: boolean }).standalone && !matchMedia("(display-mode: standalone)").matches;

let pushKey: Promise<string | null> | null = null;
export const publicKey = () => pushKey ??= Promise.resolve(supabase.from("settings").select("push_public_key").eq("id", 1).maybeSingle())
  .then(({ data }) => (data?.push_public_key as string | null) || null, () => null);

function b64ToBytes(b64: string) {
  const s = atob((b64 + "=".repeat((4 - b64.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, c => c.charCodeAt(0));
}
async function registration() {
  return (await navigator.serviceWorker.getRegistration()) || navigator.serviceWorker.register("/sw.js");
}

/** Cere voie și, dacă serverul e configurat, abonează telefonul. Întoarce true dacă abonarea push a reușit. */
export async function enableNotifications(save: (sub: PushSubscriptionJSON) => Promise<{ error: unknown }>): Promise<{ ok: boolean; push: boolean; msg?: string }> {
  if (!notifSupported()) return { ok: false, push: false, msg: "Browserul acesta nu are notificări." };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, push: false, msg: "Notificările sunt blocate. Le poți porni din setările browserului, la acest site." };
  const key = pushSupported() ? await publicKey() : null;
  if (!key) return { ok: true, push: false };
  try {
    const reg = await registration();
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
    const { error } = await save(sub.toJSON());
    return { ok: true, push: !error };
  } catch {
    return { ok: true, push: false };
  }
}

/** notificare locală (când nu există push), doar dacă pagina nu e în prim-plan */
export async function localNotify(title: string, body: string, url: string, tag?: string) {
  if (notifState() !== "granted" || document.visibilityState === "visible") return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const opts = { body, tag, icon: "/icons/icon-192.png", badge: "/icons/favicon-48.png", data: { url } } as NotificationOptions;
    if (reg) await reg.showNotification(title, opts); else new Notification(title, opts);
  } catch { /* ignore */ }
}

/** semnal când pagina e deschisă: vibrație (telefon) */
export const buzz = () => { try { navigator.vibrate?.([200, 100, 200]); } catch { /* ignore */ } };
