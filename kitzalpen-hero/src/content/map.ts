import type { Lang, Season } from './hero';
import points from './map-points.json';

type T = Record<Lang, string>;
export type MapCat = 'ski' | 'adventure' | 'lakes' | 'hiking' | 'cable' | 'family';

export interface MapPoint {
  id: string; season: Season; cat: MapCat;
  pos: [number, number];          // [lat, lon] marker
  nav?: [number, number];         // [lat, lon] real access point for directions
  navName?: string;               // when no verified access point exists
  photo?: string;                 // stem in /images/activities (photos from kitzalpen.at)
  name: T; access: T; text: T;
}

const TXT: Record<string, { name: T; access: T; text: T }> = {
  'panoramabahn-w': { name: { de: 'Panoramabahn Kitzbüheler Alpen', en: 'Panoramabahn Kitzbüheler Alpen' }, access: { de: 'Talstation Hollersbach', en: 'Valley station Hollersbach' },
    text: { de: 'Ihr Einstieg in KitzSki – von der Talstation direkt hinauf zur Resterhöhe.', en: 'Your way into KitzSki – from the valley station straight up to the Resterhöhe.' } },
  'wildkogel-w': { name: { de: 'Wildkogel-Arena', en: 'Wildkogel Arena' }, access: { de: 'Talstation Wildkogelbahn, Neukirchen', en: 'Wildkogelbahn valley station, Neukirchen' },
    text: { de: 'Familienfreundliche Pisten im Nationalpark Hohe Tauern.', en: 'Family-friendly slopes in the Hohe Tauern National Park.' } },
  zillertal: { name: { de: 'Zillertal Arena', en: 'Zillertal Arena' }, access: { de: 'Dorfbahn Königsleiten', en: 'Dorfbahn, Königsleiten' },
    text: { de: 'Über den Gerlospass – der Pinzgauer Einstieg ins Zillertal.', en: 'Over the Gerlos Pass – the Pinzgau gateway to the Zillertal.' } },
  schmitten: { name: { de: 'Schmittenhöhe', en: 'Schmittenhöhe' }, access: { de: 'Talstation Schmittenhöhebahn, Zell am See', en: 'Schmittenhöhebahn valley station, Zell am See' },
    text: { de: 'Pisten mit Blick auf den Zeller See und über 30 Dreitausender.', en: 'Slopes above Lake Zell with views of more than 30 three-thousanders.' } },
  kitzsteinhorn: { name: { de: 'Kitzsteinhorn', en: 'Kitzsteinhorn' }, access: { de: 'Talstation Gletscherjet 1, Kaprun', en: 'Gletscherjet 1 valley station, Kaprun' },
    text: { de: 'Schneesichere Gletscherpisten bis 3.029 m und Gipfelwelt 3000.', en: 'Snow-sure glacier slopes up to 3,029 m and the Gipfelwelt 3000.' } },
  rodel: { name: { de: 'Rodelbahn Wildkogel', en: 'Wildkogel toboggan run' }, access: { de: 'Talstation Smaragdbahn, Bramberg', en: 'Smaragdbahn valley station, Bramberg' },
    text: { de: 'Die Rodelbahn vom Wildkogel endet in Bramberg – hier kommen Sie an.', en: 'The Wildkogel toboggan run ends in Bramberg – this is where you arrive.' } },
  'npz-w': { name: { de: 'Nationalparkzentrum Hohe Tauern', en: 'Hohe Tauern National Park Centre' }, access: { de: 'Parkplatz, Mittersill', en: 'Car park, Mittersill' },
    text: { de: 'Die Welt des Nationalparks – auch an kalten Tagen ein Erlebnis für Familien.', en: 'The world of the national park – a family outing on cold days too.' } },
  badesee: { name: { de: 'Badesee Hollersbach', en: 'Hollersbach bathing lake' }, access: { de: 'Hollersbach', en: 'Hollersbach' },
    text: { de: 'Der Badesee im Ort – ein paar Minuten von der Pension.', en: 'The village bathing lake – a few minutes from the guesthouse.' } },
  hintersee: { name: { de: 'Hintersee', en: 'Hintersee' }, access: { de: 'Parkplatz Hintersee, Felbertal', en: 'Hintersee car park, Felbertal' },
    text: { de: 'Ein stiller Bergsee am Ende des Felbertals.', en: 'A quiet mountain lake at the end of the Felber valley.' } },
  krimml: { name: { de: 'Krimmler Wasserfälle', en: 'Krimml Waterfalls' }, access: { de: 'Eingang Wasserfallweg, Krimml', en: 'Waterfall trail entrance, Krimml' },
    text: { de: 'Die höchsten Wasserfälle Österreichs, im Nationalpark Hohe Tauern.', en: 'Austria’s highest waterfalls, in the Hohe Tauern National Park.' } },
  hollersbachtal: { name: { de: 'Hollersbachtal', en: 'Hollersbach valley' }, access: { de: 'Taleingang Hollersbach', en: 'Valley entrance, Hollersbach' },
    text: { de: 'Ein Nationalpark-Tal direkt hinter der Pension – zu Fuß oder mit dem Rad.', en: 'A national-park valley right behind the guesthouse – on foot or by bike.' } },
  'npz-s': { name: { de: 'Nationalparkzentrum Hohe Tauern', en: 'Hohe Tauern National Park Centre' }, access: { de: 'Parkplatz, Mittersill', en: 'Car park, Mittersill' },
    text: { de: 'Ausstellungen, Ranger-Programme und Ideen für Familientage.', en: 'Exhibitions, ranger programmes and ideas for family days.' } },
  'panoramabahn-s': { name: { de: 'Panoramabahn Hollersbach', en: 'Panoramabahn Hollersbach' }, access: { de: 'Talstation Hollersbach', en: 'Valley station Hollersbach' },
    text: { de: 'Mit der Gondel hinauf in die Kitzbüheler Alpen – Startpunkt für Wanderungen.', en: 'Up into the Kitzbühel Alps by gondola – a starting point for hikes.' } },
  resterkogel: { name: { de: 'Resterkogel', en: 'Resterkogel' }, access: { de: 'Über die Panoramabahn, Talstation Hollersbach', en: 'Via the Panoramabahn, valley station Hollersbach' },
    text: { de: 'Sommer am Berg über Hollersbach – erreichbar mit der Panoramabahn.', en: 'Summer on the mountain above Hollersbach – reached by the Panoramabahn.' } },
  weisssee: { name: { de: 'Weißsee Gletscherwelt', en: 'Weißsee Glacier World' }, access: { de: 'Talstation Enzingerboden, Uttendorf', en: 'Enzingerboden valley station, Uttendorf' },
    text: { de: 'Hochalpine Seen und Gletscherblick im Stubachtal.', en: 'High-alpine lakes and glacier views in the Stubach valley.' } },
  stauseen: { name: { de: 'Hochgebirgsstauseen Kaprun', en: 'Kaprun high-mountain reservoirs' }, access: { de: 'Kesselfall Alpenhaus (Busstart)', en: 'Kesselfall Alpenhaus (bus start)' },
    text: { de: 'Die Stauseen am Mooserboden – die letzte Strecke geht es mit dem Bus hinauf.', en: 'The Mooserboden reservoirs – the last stretch is by bus.' } },
  'wildkogel-s': { name: { de: 'Wildkogel im Sommer', en: 'Wildkogel in summer' }, access: { de: 'Talstation Smaragdbahn, Bramberg', en: 'Smaragdbahn valley station, Bramberg' },
    text: { de: 'Mountainbike-Strecken mit Gletscherblick, Liftstart ab 2.000 m.', en: 'Mountain-bike trails with glacier views, lifts up to 2,000 m.' } },
};

export const HOME: [number, number] = points.home as [number, number];
export const MAP_POINTS: MapPoint[] = (points.points as Omit<MapPoint, 'name' | 'access' | 'text'>[]).map((p) => ({ ...p, ...TXT[p.id] }));

export const CATS: Record<Season, ('all' | MapCat)[]> = { winter: ['all', 'ski', 'adventure'], summer: ['all', 'lakes', 'hiking', 'cable', 'family'] };

export const MAP_COPY = {
  de: {
    eyebrow: '08 — Die Karte', headline: ['Die Alpen', 'entdecken.'], sub: 'Ihr nächstes Abenteuer beginnt genau hier.',
    cats: { all: 'Alle', ski: 'Skigebiete', adventure: 'Wintererlebnisse', lakes: 'Seen', hiking: 'Wandern', cable: 'Bergbahnen', family: 'Familie' } as Record<'all' | MapCat, string>,
    home: 'KitzAlpen Pension', homeSub: 'Reitlehen 42 · 5731 Hollersbach', directions: 'Route planen', reset: 'Ansicht zurücksetzen',
    drive: (km: number, min: number) => `${km.toLocaleString('de-AT')} km · ca. ${min} Min. mit dem Auto`, driveNote: 'Strecke laut OpenStreetMap-Routing',
    from: 'ab der Pension', access: 'Anfahrt bis', list: 'Ziele', showList: 'Ziele anzeigen', hideList: 'Liste einklappen', close: 'Schließen',
    loading: 'Karte wird geladen …', fail: 'Die 3D-Karte konnte nicht geladen werden.', failCta: 'Pension in Google Maps öffnen',
    zoomIn: 'Hineinzoomen', zoomOut: 'Herauszoomen', tilt: '2D / 3D', mapLabel: 'Interaktive Karte der Region Hollersbach',
  },
  en: {
    eyebrow: '08 — The map', headline: ['Explore', 'the Alps.'], sub: 'Your next adventure starts right here.',
    cats: { all: 'All', ski: 'Ski resorts', adventure: 'Winter adventures', lakes: 'Lakes', hiking: 'Hiking', cable: 'Cable cars', family: 'Family' } as Record<'all' | MapCat, string>,
    home: 'KitzAlpen Pension', homeSub: 'Reitlehen 42 · 5731 Hollersbach', directions: 'Get directions', reset: 'Reset view',
    drive: (km: number, min: number) => `${km.toLocaleString('en-GB')} km · approx. ${min} min by car`, driveNote: 'Route from OpenStreetMap routing',
    from: 'from the guesthouse', access: 'Drive to', list: 'Places', showList: 'Show places', hideList: 'Collapse list', close: 'Close',
    loading: 'Loading map …', fail: 'The 3D map could not be loaded.', failCta: 'Open the guesthouse in Google Maps',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out', tilt: '2D / 3D', mapLabel: 'Interactive map of the Hollersbach region',
  },
};
export type MapCopy = (typeof MAP_COPY)['de'];

export const PENSION_ADDRESS = 'KITZALPEN Pension, Reitlehen 42, 5731 Hollersbach im Pinzgau, Austria';
/** Google Maps Directions URL (official "Maps URLs" API). */
export function directionsUrl(p: MapPoint) {
  const dest = p.nav ? `${p.nav[0]},${p.nav[1]}` : (p.navName ?? p.name.de);
  return 'https://www.google.com/maps/dir/?' + new URLSearchParams({ api: '1', origin: PENSION_ADDRESS, destination: dest, travelmode: 'driving' }).toString();
}
export const PENSION_MAPS = 'https://www.google.com/maps/search/?' + new URLSearchParams({ api: '1', query: PENSION_ADDRESS }).toString();
