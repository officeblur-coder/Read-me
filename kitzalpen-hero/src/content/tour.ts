/**
 * 3DVista virtual tour (client export "Kitzalpen Pension", Dec 2025).
 * Upload the WHOLE unzipped folder (index.htm, lib/, media/, script.js, locale/, loading/, misc/, …)
 * to the web host, e.g. https://www.kitzalpen.at/tour/ – then put the address of its index.htm here.
 * While it is empty, the button still opens the overlay and shows a short "coming soon" note.
 */
const HOSTED = 'https://kitzbuhelalpenpension.at/virtualtour/index.htm';
/** On the same host (with or without www) load the tour from the same origin – keeps the host's bot check and cookies happy. */
export const TOUR_URL = typeof window !== 'undefined' && /(^|\.)kitzbuhelalpenpension\.at$/.test(window.location.hostname) ? '/virtualtour/index.htm' : HOSTED;

export const TOUR_COPY = {
  de: { button: '360° Rundgang', title: 'Virtueller Rundgang', close: 'Rundgang schließen', loading: 'Rundgang wird geladen …', direct: 'Lädt nicht? Rundgang direkt öffnen',
    soon: 'Der 360°-Rundgang wird gerade eingebunden.', soonText: 'Bald können Sie Zimmer, Restaurant und Haus hier direkt erkunden.' },
  en: { button: '360° tour', title: 'Virtual tour', close: 'Close tour', loading: 'Loading the tour …', direct: 'Not loading? Open the tour directly',
    soon: 'The 360° tour is being set up.', soonText: 'Soon you can explore the rooms, restaurant and house right here.' },
};
export const openTour = (x?: number, y?: number) => window.dispatchEvent(new CustomEvent('kitzalpen:tour', { detail: { x, y } }));
export const warmTour = () => window.dispatchEvent(new Event('kitzalpen:tour-warm'));
