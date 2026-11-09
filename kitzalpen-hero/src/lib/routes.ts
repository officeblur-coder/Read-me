import type { Season } from '../content/hero';
import { ROOM_KEYS, type RoomKey } from '../content/pensionPage';
import type { SiteLang } from './i18n';

/**
 * Page addresses.
 * - Live site (base '/'): every page and language has a real address (/chalet/, /en/rooms/double/ …),
 *   pre-rendered to static HTML at build time (scripts/prerender.mjs).
 * - Preview copies in a sub-folder (base './'): the same pages are chosen with '#' (#chalet …).
 * Components keep writing hash links ('#chalet'); on the live site the link layer below turns them into real addresses.
 */
export type Route = 'home' | 'explore' | 'ski' | 'arrival' | 'experiences' | 'tours' | 'places' | 'pension' | 'chalet' | 'all-rooms' | 'restaurant' | 'groups' | 'contact' | 'mountain' | Season | `room-${RoomKey}`;

export const SITE = 'https://www.kitzalpen.at';
export const PATHS = import.meta.env.BASE_URL === '/';
export const LANGS: SiteLang[] = ['de', 'en', 'nl', 'ro', 'hu', 'cs', 'pl', 'sv'];

const rooms = Object.fromEntries(ROOM_KEYS.map((k) => [`room-${k}`, `rooms/${k}/`])) as Record<`room-${RoomKey}`, string>;
/** German addresses live at the root; every other language uses the English address after its prefix (/en/, /ro/ …). */
const SLUG: Record<'de' | 'en', Record<Route, string>> = {
  de: {
    home: '', pension: 'pension/', 'all-rooms': 'zimmer/', ...rooms, chalet: 'chalet/', restaurant: 'restaurant/', groups: 'group-activities/', contact: 'kontakt/',
    mountain: 'bergerlebnis/', winter: 'activities/winter/', summer: 'activities/summer/', explore: 'entdecken/', experiences: 'entdecken/top-15/',
    ski: 'entdecken/skigebiete/', tours: 'entdecken/touren/', places: 'entdecken/orte/', arrival: 'anreise/',
  },
  en: {
    home: '', pension: 'pension/', 'all-rooms': 'rooms/', ...rooms, chalet: 'chalet/', restaurant: 'restaurant/', groups: 'group-activities/', contact: 'contact/',
    mountain: 'mountain/', winter: 'activities/winter/', summer: 'activities/summer/', explore: 'explore/', experiences: 'explore/top-15/',
    ski: 'explore/ski-areas/', tours: 'explore/tours/', places: 'explore/places/', arrival: 'arrival/',
  },
};
export const ROUTES = Object.keys(SLUG.de) as Route[];

/** hash (without '#') → page; null when the hash is only an anchor inside a page */
export function routeOfHash(h: string): Route | null {
  if (h === 'top' || h === '') return 'home';
  if (h === 'pension' || h === 'pension-rooms') return 'pension';
  if (h === 'groups' || h === 'groups-plan') return 'groups';
  if (h === 'ski' || h === 'ski-passes') return 'ski';
  if (h === 'explore' || h === 'explore-map') return 'explore';
  if (h === 'mountain' || /^mountain-(dash|cams|plan|find)$/.test(h)) return 'mountain';
  if (h === 'activities-summer') return 'summer';
  if (h === 'activities-winter') return 'winter';
  if (h.startsWith('room-')) return ROOM_KEYS.includes(h.slice(5) as RoomKey) ? (h as Route) : null;
  return (['chalet', 'all-rooms', 'restaurant', 'arrival', 'experiences', 'tours', 'places', 'contact'] as string[]).includes(h) ? (h as Route) : null;
}
/** the part of a hash that is an anchor inside the page (#pension-rooms, #mountain-cams …), kept after the address */
const isSub = (h: string) => /^(pension-rooms|groups-plan|ski-passes|explore-map|mountain-(dash|cams|plan|find))$/.test(h);

export const pathFor = (r: Route, l: SiteLang) => `/${l === 'de' ? '' : `${l}/`}${SLUG[l === 'de' ? 'de' : 'en'][r]}`;

export function parsePath(pathname: string): { lang: SiteLang; route: Route } | null {
  let p = pathname.replace(/^\/+/, '').replace(/index\.html$/, '');
  if (p && !p.endsWith('/')) p += '/';
  const m = /^(en|nl|ro|hu|cs|pl|sv)\//.exec(p);
  const lang = (m ? m[1] : 'de') as SiteLang;
  const rest = m ? p.slice(m[0].length) : p;
  const table = SLUG[lang === 'de' ? 'de' : 'en'];
  const route = ROUTES.find((r) => table[r] === rest);
  return route ? { lang, route } : null;
}

/** the page shown now */
export function currentRoute(): Route {
  const h = window.location.hash.slice(1);
  if (!PATHS) return routeOfHash(h) ?? 'home';
  return parsePath(window.location.pathname)?.route ?? 'home';
}
export const pathLang = (): SiteLang | null => (PATHS ? parsePath(window.location.pathname)?.lang ?? 'de' : null);

/** '#chalet' → '/chalet/' (live) or '#chalet' (preview); null for anchors that are not pages */
export function hrefFor(hash: string, l: SiteLang): string | null {
  const h = hash.replace(/^#/, '');
  const r = routeOfHash(h);
  if (!r) return null;
  if (!PATHS) return `#${h}`;
  return pathFor(r, l) + (isSub(h) ? `#${h}` : '');
}

/** go to a page: '#activities-winter' style key */
export function go(hash: string, l: SiteLang) {
  const to = hrefFor(hash, l);
  if (!to) return;
  if (!PATHS) { window.location.hash = to; return; }
  navigate(to);
}
function navigate(to: string, replace = false) {
  if (replace) window.history.replaceState(null, '', to); else window.history.pushState(null, '', to);
  // components listen to 'hashchange' (close menus, read the page) – one event for every kind of navigation
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/**
 * Live site only: rewrites page links ('#chalet') into real addresses for the current language, and
 * opens same-site page addresses without reloading the document.
 */
let relink = () => undefined as void;
export const relinkPages = () => relink();
export function startLinks(getLang: () => SiteLang) {
  if (!PATHS) return;
  // build step (scripts/prerender.cjs) reads the address list from here
  if (navigator.webdriver) (window as unknown as { __kzPaths: string[] }).__kzPaths = LANGS.flatMap((l) => ROUTES.map((r) => pathFor(r, l)));
  // an old '#page' address (shared preview links) → its real address
  const h = window.location.hash.slice(1);
  const hr = routeOfHash(h);
  if (h && hr && hr !== currentRoute()) window.history.replaceState(null, '', pathFor(hr, getLang()) + (isSub(h) ? `#${h}` : ''));

  const fix = (a: HTMLAnchorElement) => {
    const raw = a.getAttribute('href');
    if (!raw) return;
    const key = raw.startsWith('#') ? raw : a.dataset.k;
    if (!key) return;
    const to = hrefFor(key, getLang());
    if (!to) return;
    a.dataset.k = key;
    if (raw !== to) a.setAttribute('href', to);
  };
  const scan = (root: ParentNode) => root.querySelectorAll<HTMLAnchorElement>('a[href^="#"], a[data-k]').forEach(fix);
  scan(document);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'attributes') { if (m.target instanceof HTMLAnchorElement) fix(m.target); continue; }
      m.addedNodes.forEach((n) => { if (n instanceof HTMLAnchorElement) fix(n); else if (n instanceof Element) scan(n); });
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin || !parsePath(url.pathname)) return;
    e.preventDefault();
    if (url.pathname === window.location.pathname && url.hash) { if (url.hash !== window.location.hash) navigate(url.pathname + url.hash); else document.getElementById(url.hash.slice(1))?.scrollIntoView(); return; }
    if (url.pathname === window.location.pathname && !url.hash) { window.scrollTo(0, 0); return; }
    navigate(url.pathname + url.hash);
  });
  window.addEventListener('popstate', () => window.dispatchEvent(new HashChangeEvent('hashchange')));
  relink = () => scan(document);
}

/**
 * Same page in another language (language switch). Live site: loads the pre-rendered page of that language –
 * a clean page, also when the browser has translated the current one (Chrome / Google Translate rewrites the text,
 * and changing it in place breaks the page). Returns true when the page is being replaced.
 */
export function switchPathLang(l: SiteLang): boolean {
  if (!PATHS) return false;
  const to = pathFor(currentRoute(), l) + window.location.hash;
  if (to === window.location.pathname + window.location.hash) return false;
  window.location.assign(to);
  return true;
}
