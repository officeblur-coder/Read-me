/**
 * 3DVista virtual tour (client export "Kitzalpen Pension", Dec 2025).
 * Upload the WHOLE unzipped folder (index.htm, lib/, media/, script.js, locale/, loading/, misc/, …)
 * to the web host, e.g. https://www.kitzalpen.at/tour/ – then put the address of its index.htm here.
 * While it is empty, the button still opens the overlay and shows a short "coming soon" note.
 */
const HOSTED = 'https://kitzbuhelalpenpension.at/virtualtour/index.htm';
/** A copy of the tour folder on the site's own domain (/virtualtour/) is preferred: same origin, so the host's
 * bot check keeps its cookie (Safari blocks it inside a third-party iframe) and nothing extra is fetched. */
const LOCAL = '/virtualtour/index.htm';
const OWN_HOST = /(^|\.)(kitzbuhelalpenpension|kitzalpen)\.at$/;
export const TOUR_URL = HOSTED;
let resolved: Promise<string> | null = null;
/** the address to load: the local copy when it exists on this domain, otherwise the hosted tour */
export function resolveTourUrl(): Promise<string> {
  if (typeof window === 'undefined' || !OWN_HOST.test(window.location.hostname)) return Promise.resolve(HOSTED);
  resolved ??= fetch(LOCAL, { method: 'HEAD', cache: 'no-store' })
    .then((r) => (r.ok && /html/.test(r.headers.get('content-type') || '') ? LOCAL : HOSTED))
    .catch(() => HOSTED);
  return resolved;
}

export const TOUR_COPY = {
  de: { button: '360° Rundgang', title: 'Virtueller Rundgang', close: 'Rundgang schließen', loading: 'Rundgang wird geladen …', direct: 'Lädt nicht? Rundgang direkt öffnen',
    soon: 'Der 360°-Rundgang wird gerade eingebunden.', soonText: 'Bald können Sie Zimmer, Restaurant und Haus hier direkt erkunden.' },
  en: { button: '360° tour', title: 'Virtual tour', close: 'Close tour', loading: 'Loading the tour …', direct: 'Not loading? Open the tour directly',
    soon: 'The 360° tour is being set up.', soonText: 'Soon you can explore the rooms, restaurant and house right here.' },
};
export const openTour = (x?: number, y?: number) => window.dispatchEvent(new CustomEvent('kitzalpen:tour', { detail: { x, y } }));
export const warmTour = () => window.dispatchEvent(new Event('kitzalpen:tour-warm'));
