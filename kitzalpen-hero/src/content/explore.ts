import type { Lang, Season } from './hero';

/** "Entdecken / Explore" – the menu section and hub page that collect every guide page of the site. */
type T = Record<Lang, string>;
export interface ExploreItem { id: string; href: (s: Season) => string; img: Record<Season, string>; title: T; text: T; live?: boolean }

export const EXPLORE: ExploreItem[] = [
  { id: 'top', href: () => '#experiences', img: { winter: 'images/winter/ksh-3029.webp', summer: 'images/activities/krimml-waterfalls.webp' },
    title: { de: 'Top 15 Erlebnisse', en: 'Top 15 experiences' }, text: { de: 'Die besten Erlebnisse der Saison im Umkreis von 70 km.', en: 'The season’s best experiences within 70 km.' } },
  { id: 'activities', href: (s) => `#activities-${s}`, img: { winter: 'images/winter/wildkogel-night.webp', summer: 'images/activities/wildkogel-mountain-biking.webp' },
    title: { de: 'Aktivitäten', en: 'Activities' }, text: { de: 'Winter- und Sommerziele rund um Hollersbach.', en: 'Winter and summer destinations around Hollersbach.' } },
  { id: 'mountain', href: () => '#mountain', live: true, img: { winter: 'images/winter/ksh-platform.webp', summer: 'images/activities/kitzsteinhorn-kaprun.webp' },
    title: { de: 'Bergerlebnis live', en: 'Mountain live' }, text: { de: 'Bergwetter, Webcams und Ihr Skitag.', en: 'Mountain weather, webcams and your ski day.' } },
  { id: 'ski', href: () => '#ski', img: { winter: 'images/winter/kitzski-piste.webp', summer: 'images/winter/kitzski-piste.webp' },
    title: { de: 'Skigebiete & Skipässe', en: 'Ski areas & passes' }, text: { de: 'Sechs Skigebiete, Fahrzeiten und der passende Skipass.', en: 'Six ski areas, drive times and the right pass.' } },
  { id: 'tours', href: () => '#tours', img: { winter: 'images/groups/tauern-radweg-cycling.webp', summer: 'images/groups/tauern-radweg-cycling.webp' },
    title: { de: 'Touren-Explorer', en: 'Tour explorer' }, text: { de: 'Rad, Mountainbike, Motorrad und Wandern – mit GPX.', en: 'Cycling, MTB, motorcycling and hiking – with GPX.' } },
  { id: 'places', href: () => '#places', img: { winter: 'images/winter/town-kitzbuehel.webp', summer: 'images/activities/zell-am-see.webp' },
    title: { de: 'Orte-Guide', en: 'Places guide' }, text: { de: 'Hollersbach, Mittersill, Krimml, Kitzbühel und mehr.', en: 'Hollersbach, Mittersill, Krimml, Kitzbühel and more.' } },
  { id: 'arrival', href: () => '#arrival', img: { winter: 'images/winter/town-mittersill.webp', summer: 'images/groups/grossglockner.webp' },
    title: { de: 'Anreise & Mobilität', en: 'Arrival & mobility' }, text: { de: 'Gratis Bus & Bahn mit dem Guest Mobility Ticket.', en: 'Free buses & trains with the Guest Mobility Ticket.' } },
];

export const EXPLORE_COPY = {
  de: { all: 'Alles entdecken', overview: 'Übersicht', featured: 'Empfohlen', eyebrow: 'Entdecken · Hollersbach im Pinzgau', title: ['Alles rund um', 'Ihren Aufenthalt.'], sub: 'Erlebnisse, Touren, Skigebiete, Orte und Anreise – jede Rubrik mit offiziellen Quellen und dem Weg ab der Pension.', open: 'Öffnen' },
  en: { all: 'Explore everything', overview: 'Overview', featured: 'Featured', eyebrow: 'Explore · Hollersbach im Pinzgau', title: ['Everything around', 'your stay.'], sub: 'Experiences, tours, ski areas, places and arrival – every section with official sources and the way from the pension.', open: 'Open' },
};
