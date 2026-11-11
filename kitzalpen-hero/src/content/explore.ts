import type { Lang, Season } from './hero';

/** "Entdecken / Explore" – the menu section and hub page that collect every guide page of the site. */
type T = Record<Lang, string>;
export interface ExploreItem { id: string; href: (s: Season) => string; img: Record<Season, string>; title: T; text: T; textWinter?: T; only?: Season; live?: boolean }
/** the items of the current season (winter-only / summer-only entries are left out of the other season) */
export const exploreFor = (s: Season) => EXPLORE.filter((x) => !x.only || x.only === s);
export const exploreText = (x: ExploreItem, s: Season, l: Lang) => (s === 'winter' && x.textWinter ? x.textWinter[l] : x.text[l]);

export const EXPLORE: ExploreItem[] = [
  { id: 'top', href: () => '#experiences', img: { winter: 'images/real/kitzsteinhorn-aerial.webp', summer: 'images/activities/krimml-waterfalls.webp' },
    title: { de: 'Top 15 Erlebnisse', en: 'Top 15 experiences' }, text: { de: 'Die besten Erlebnisse der Saison im Umkreis von 70 km.', en: 'The season’s best experiences within 70 km.' } },
  { id: 'activities', href: (s) => `#activities-${s}`, img: { winter: 'images/winter/wildkogel-night.webp', summer: 'images/activities/wildkogel-mountain-biking.webp' },
    title: { de: 'Aktivitäten', en: 'Activities' }, text: { de: 'Winter- und Sommerziele rund um Hollersbach.', en: 'Winter and summer destinations around Hollersbach.' } },
  { id: 'mountain', href: () => '#mountain', live: true, img: { winter: 'images/real/kitzski-gondola-couple.webp', summer: 'images/real/panoramabahn-summer.webp' },
    title: { de: 'Bergerlebnis live', en: 'Mountain live' }, text: { de: 'Bergwetter, Webcams und Ihr Skitag.', en: 'Mountain weather, webcams and your ski day.' } },
  { id: 'ski', only: 'winter', href: () => '#ski', img: { winter: 'images/real/ski-panorama.webp', summer: 'images/real/ski-panorama.webp' },
    title: { de: 'Skigebiete & Skipässe', en: 'Ski areas & passes' }, text: { de: 'Sechs Skigebiete, Fahrzeiten und der passende Skipass.', en: 'Six ski areas, drive times and the right pass.' } },
  { id: 'tours', href: () => '#tours', img: { winter: 'images/real/winter-walk.webp', summer: 'images/groups/tauern-radweg-cycling.webp' },
    title: { de: 'Touren-Explorer', en: 'Tour explorer' }, text: { de: 'Rad, Mountainbike, Motorrad und Wandern – mit GPX.', en: 'Cycling, MTB, motorcycling and hiking – with GPX.' },
    textWinter: { de: 'Winterwandern, Langlauf, Rodeln und Schneeschuh.', en: 'Winter walks, cross-country, tobogganing and snowshoeing.' } },
  { id: 'places', href: () => '#places', img: { winter: 'images/winter/town-kitzbuehel.webp', summer: 'images/activities/zell-am-see.webp' },
    title: { de: 'Orte-Guide', en: 'Places guide' }, text: { de: 'Hollersbach, Mittersill, Krimml, Kitzbühel und mehr.', en: 'Hollersbach, Mittersill, Krimml, Kitzbühel and more.' } },
  { id: 'arrival', href: () => '#arrival', img: { winter: 'images/winter/town-mittersill.webp', summer: 'images/groups/grossglockner.webp' },
    title: { de: 'Anreise & Mobilität', en: 'Arrival & mobility' }, text: { de: 'Gratis Bus & Bahn mit dem Guest Mobility Ticket.', en: 'Free buses & trains with the Guest Mobility Ticket.' } },
];

export const EXPLORE_COPY = {
  de: { all: 'Alles entdecken', overview: 'Übersicht', featured: 'Empfohlen', eyebrow: 'Entdecken · Hollersbach im Pinzgau', title: ['Alles rund um', 'Ihren Aufenthalt.'], sub: 'Erlebnisse, Touren, Skigebiete, Orte und Anreise – jede Rubrik mit offiziellen Quellen und dem Weg ab der Pension.', open: 'Öffnen' },
  en: { all: 'Explore everything', overview: 'Overview', featured: 'Featured', eyebrow: 'Explore · Hollersbach im Pinzgau', title: ['Everything around', 'your stay.'], sub: 'Experiences, tours, ski areas, places and arrival – every section with official sources and the way from the pension.', open: 'Open' },
};

export const EXPLORE_MAP_COPY = {
  de: { eyebrow: 'Die Karte', title: 'Alles auf einer Karte.', layers: 'Ebenen', layer: { exp: 'Erlebnisse', tour: 'Tourenstarts', place: 'Orte' }, fromHouse: 'ab KitzAlpen', details: 'Details', route: 'Route', loading: 'Karte wird geladen …', error: 'Die Karte konnte nicht geladen werden.', note: { winter: 'Erlebnisse der Wintersaison · Karte © OpenFreeMap, OpenMapTiles, OpenStreetMap-Mitwirkende', summer: 'Erlebnisse der Sommersaison · Karte © OpenFreeMap, OpenMapTiles, OpenStreetMap-Mitwirkende' } as Record<Season, string> },
  en: { eyebrow: 'The map', title: 'Everything on one map.', layers: 'Layers', layer: { exp: 'Experiences', tour: 'Tour starts', place: 'Places' }, fromHouse: 'from KitzAlpen', details: 'Details', route: 'Route', loading: 'Loading the map …', error: 'The map could not be loaded.', note: { winter: 'Winter-season experiences · map © OpenFreeMap, OpenMapTiles, OpenStreetMap contributors', summer: 'Summer-season experiences · map © OpenFreeMap, OpenMapTiles, OpenStreetMap contributors' } as Record<Season, string> },
};

export const PLAN_COPY = {
  de: {
    eyebrow: 'Urlaubsplaner', title: 'Ihr Urlaub, Tag für Tag.', sub: 'Tage und Interessen wählen – der Planer stellt aus unseren geprüften Top-Erlebnissen einen Vorschlag zusammen, mit einem passenden Ziel in der Nähe für jeden Tag.',
    days: 'Wie viele Tage?', interests: 'Was interessiert Sie?', kids: 'Mit Kindern unterwegs', day: (n: number) => `Tag ${n}`, near: 'Dazu passt', official: 'Offizielle Seite', route: 'Route',
    min: (m: number) => `ca. ${m} Min.`, rain: 'Bei Schlechtwetter', share: 'Plan teilen', copied: 'Plan kopiert', rooms: 'Zimmer ansehen', shareTitle: (d: number) => `Mein KitzAlpen-Plan · ${d} ${d === 1 ? 'Tag' : 'Tage'}`,
    note: 'Ein Vorschlag aus den Erlebnissen dieser Saison – bitte Öffnungszeiten und Wetter vor Ort prüfen.',
  },
  en: {
    eyebrow: 'Holiday planner', title: 'Your holiday, day by day.', sub: 'Choose days and interests – the planner builds a suggestion from our verified top experiences, with a matching nearby stop for each day.',
    days: 'How many days?', interests: 'What are you into?', kids: 'Travelling with children', day: (n: number) => `Day ${n}`, near: 'Pairs well with', official: 'Official website', route: 'Route',
    min: (m: number) => `approx. ${m} min`, rain: 'If the weather turns', share: 'Share plan', copied: 'Plan copied', rooms: 'See the rooms', shareTitle: (d: number) => `My KitzAlpen plan · ${d} ${d === 1 ? 'day' : 'days'}`,
    note: 'A suggestion from this season’s experiences – please check opening times and weather locally.',
  },
};
