// Când pagina livratorului rulează în aplicația Android „Lyra Livrator” (Capacitor), folosește funcțiile telefonului:
// GPS și cu ecranul blocat (serviciu în prim-plan) și notificări native Firebase (sună și cu ecranul blocat).
// În browser nimic din fișierul acesta nu face ceva.
type Listener = { remove: () => Promise<void> };
type Cap = {
  isNativePlatform?: () => boolean;
  registerPlugin?: <T>(name: string) => T;
  Plugins?: Record<string, unknown>;
};
type Loc = { latitude: number; longitude: number; accuracy: number; bearing: number | null; speed: number | null };
type BgGeo = {
  addWatcher: (o: Record<string, unknown>, cb: (loc?: Loc, err?: { code?: string; message?: string }) => void) => Promise<string>;
  removeWatcher: (o: { id: string }) => Promise<void>;
  openSettings: () => Promise<void>;
};
type Push = {
  requestPermissions: () => Promise<{ receive: string }>;
  register: () => Promise<void>;
  createChannel: (c: Record<string, unknown>) => Promise<void>;
  addListener: (ev: string, cb: (x: { value?: string; [k: string]: unknown }) => void) => Promise<Listener>;
};

const cap = (): Cap | undefined => (globalThis as unknown as { Capacitor?: Cap }).Capacitor;
export const isNativeApp = () => !!cap()?.isNativePlatform?.();
/** build-ul cu Firebase adaugă „LyraLivrator/fcm” la user agent (fără el, register() ar opri aplicația) */
export const hasFirebase = () => /LyraLivrator\/fcm/.test(navigator.userAgent);
function plugin<T>(name: string): T | undefined {
  const c = cap(); if (!c) return undefined;
  return (c.Plugins?.[name] as T) || c.registerPlugin?.<T>(name);
}

/** GPS continuu, și cu ecranul blocat (Android arată „Lyra Livrator · tura e pornită”) */
export async function startNativeGps(onLoc: (l: Loc) => void, onErr: (m: string) => void): Promise<(() => void) | null> {
  const g = plugin<BgGeo>("BackgroundGeolocation"); if (!g) return null;
  const id = await g.addWatcher({
    backgroundTitle: "Lyra Livrator · tura e pornită",
    backgroundMessage: "Recepția îți vede locația. Oprești din „Ieși” în aplicație.",
    requestPermissions: true, stale: false, distanceFilter: 15,
  }, (loc, err) => {
    if (err) { onErr(err.code === "NOT_AUTHORIZED" ? "Locația e oprită: permite locația „Tot timpul” pentru Lyra Livrator." : (err.message || "Fără GPS")); return; }
    if (loc) onLoc(loc);
  });
  return () => { g.removeWatcher({ id }).catch(() => {}); };
}

/** notificări native: canalul „Comenzi” cu sunet de alarmă, tokenul pleacă la server prin save() */
export async function startNativePush(save: (token: string) => Promise<unknown>, onPush: () => void): Promise<string> {
  const p = plugin<Push>("PushNotifications"); if (!p) return "fără plugin";
  if (!hasFirebase()) return "fără Firebase";
  const perm = await p.requestPermissions();
  if (perm.receive !== "granted") return "Notificările sunt oprite: permite-le pentru Lyra Livrator.";
  await p.createChannel({ id: "comenzi", name: "Comenzi noi", description: "Comenzi atribuite și reamintiri de livrare",
    importance: 5, visibility: 1, sound: "alarm", vibration: true, lights: true, lightColor: "#FF7A1A" }).catch(() => {});
  await p.addListener("registration", t => { if (t.value) save(t.value); });
  await p.addListener("pushNotificationReceived", () => onPush());
  await p.addListener("pushNotificationActionPerformed", () => onPush());
  await p.register();
  return "";
}
