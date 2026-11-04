import type { Lang } from './hero';

/**
 * Winter activities page (preview route #activities-winter; live: /activities/winter/).
 * Road distances, drive times and claims are taken from the client's brochure "Winter 2022/2023"
 * (pages KitzSki … Towns near by). Photos are cut from the same brochure pages.
 * Compass positions use real coordinates (OSM Nominatim, Nov 2026) – straight-line bearing and distance
 * from Reitlehen 42; the labels always show the brochure's road distance.
 */
export interface WStop {
  id: string;
  km: number;                 // road km, brochure
  time?: Record<Lang, string>; // drive time, brochure map
  bearing: number;            // degrees from north, straight line
  air: number;                // straight-line km
  dest: string;               // lat,lng for Google Maps directions
  name: string;
  tag: Record<Lang, string>;
  text: Record<Lang, string>;
  facts: Record<Lang, string[]>;
  pics: string[];             // /images/winter/<name>.webp, first = lead
  site?: string;
}

export const W_IMG = `${import.meta.env.BASE_URL}images/winter/`;
export const HOME_LL = '47.27268,12.42573';

export const STOPS: WStop[] = [
  {
    id: 'kitzski', km: 2, time: { de: '4 Min.', en: '4 min' }, bearing: 300, air: 1.8, dest: '47.28068,12.40538', name: 'KitzSki',
    tag: { de: 'Skigebiet · Panoramabahn Kitzbüheler Alpen', en: 'Ski area · Panoramabahn Kitzbüheler Alpen' },
    text: { de: 'Nur 2 km bis zur Panoramabahn – der direkte Einstieg ins Skigebiet KitzSki. Mit dabei: der Snow Park Kitzbühel für Freestyler.', en: 'Just 2 km to the Panoramabahn – your direct way into the KitzSki ski area. Including the Snow Park Kitzbühel for freestylers.' },
    facts: { de: ['230 km Pisten (geprüft)', 'Snow Park Kitzbühel'], en: ['230 km of slopes (verified)', 'Snow Park Kitzbühel'] },
    pics: ['kitzski-gondola', 'kitzski-piste', 'park-jump', 'park-rail', 'kitzski-kid'], site: 'https://www.kitzski.at',
  },
  {
    id: 'wildkogel', km: 21, time: { de: '39 Min.', en: '39 min' }, bearing: 259, air: 11.1, dest: '47.25438,12.28077', name: 'Wildkogel-Arena',
    tag: { de: 'Neukirchen · Bramberg', en: 'Neukirchen · Bramberg' },
    text: { de: 'Rodeln unter Flutlicht: In der Wildkogel-Arena liegt die längste beleuchtete Rodelbahn der Welt.', en: 'Tobogganing under floodlights: the Wildkogel Arena is home to the world’s longest floodlit toboggan run.' },
    facts: { de: ['Längste beleuchtete Rodelbahn der Welt'], en: ['World’s longest floodlit toboggan run'] },
    pics: ['wildkogel-night', 'wildkogel-rodel'],
  },
  {
    id: 'krimml', km: 25, time: { de: '27 Min.', en: '27 min' }, bearing: 250, air: 20.6, dest: '47.20837,12.17022', name: 'Krimmler Wasserfälle',
    tag: { de: 'Österreichs höchste Wasserfälle', en: 'Austria’s highest waterfalls' },
    text: { de: 'Eine spektakuläre Wanderung zu Österreichs höchsten Wasserfällen. Drei Etappen ab dem Ort Krimml führen zu immer eindrucksvolleren Ausblicken – Kamera nicht vergessen.', en: 'A spectacular hike to Austria’s highest waterfalls. Three stages from the village of Krimml lead to ever more impressive views – bring your camera.' },
    facts: { de: ['3 Etappen ab Krimml'], en: ['3 stages from Krimml'] },
    pics: ['krimml'],
  },
  {
    id: 'spa', km: 27, time: { de: '28 Min.', en: '28 min' }, bearing: 88, air: 25.2, dest: '47.2825373,12.7600498', name: 'Tauern Spa',
    tag: { de: 'Zell am See · Kaprun', en: 'Zell am See · Kaprun' },
    text: { de: 'Ein luxuriöses Spa-Resort inmitten spektakulärer Bergkulisse – vom aktiven Tag draußen bis zur vollkommenen Entspannung.', en: 'A luxurious spa resort amid spectacular mountain scenery – from an active day outdoors to total relaxation.' },
    facts: { de: ['Spa-Resort mit Bergblick'], en: ['Spa resort with mountain views'] },
    pics: ['spa'],
  },
  {
    id: 'zell', km: 28, time: { de: '30 Min.', en: '30 min' }, bearing: 78, air: 28.5, dest: '47.3239636,12.7963165', name: 'Zell am See–Kaprun',
    tag: { de: 'Skigebiet am See', en: 'Ski area by the lake' },
    text: { de: 'Pisten mit Blick auf den Zeller See und die Hohen Tauern – nur eine halbe Stunde entfernt.', en: 'Slopes overlooking Lake Zell and the Hohe Tauern – just half an hour away.' },
    facts: { de: ['30 Min. mit dem Auto'], en: ['30 min by car'] },
    pics: ['zell-carve', 'ksh-powder'],
  },
  {
    id: 'kitzsteinhorn', km: 41, bearing: 102, air: 23.2, dest: '47.22897,12.72597', name: 'Kitzsteinhorn',
    tag: { de: 'Gletscher · Gipfelwelt 3000', en: 'Glacier · Gipfelwelt 3000' },
    text: { de: 'Das komplette Programm der Alpen – vom Wintersport über Aussichten bis zum Sightseeing in der Gipfelwelt 3000. An 365 Tagen im Jahr.', en: 'The complete programme of the Alps – from winter sports and views to sightseeing at Gipfelwelt 3000. 365 days a year.' },
    facts: { de: ['3.029 m · Top of Salzburg', '365 Tage im Jahr'], en: ['3,029 m · Top of Salzburg', '365 days a year'] },
    pics: ['ksh-skier', 'ksh-3029', 'ksh-platform'],
  },
  {
    id: 'glockner', km: 73, time: { de: '1 Std. 20 Min.', en: '1 h 20 min' }, bearing: 137, air: 29.9, dest: '47.0745464,12.6938826', name: 'Großglockner',
    tag: { de: 'Nationalpark Hohe Tauern', en: 'Hohe Tauern National Park' },
    text: { de: 'Österreichs höchster Berg und Herzstück des Nationalparks Hohe Tauern: Der „schwarze Berg“ ragt 3.798 m aus einem Meer von dreihundert Dreitausendern.', en: 'Austria’s highest mountain and centrepiece of the Hohe Tauern National Park: the “black mountain” rises 3,798 m above a sea of three hundred 3,000 m peaks.' },
    facts: { de: ['3.798 m', '300 Dreitausender ringsum'], en: ['3,798 m', '300 peaks over 3,000 m around'] },
    pics: ['glockner'],
  },
];

export const TOWNS = [
  { id: 'mittersill', name: 'Mittersill', km: 5, bearing: 80, air: 3.9, pic: 'town-mittersill' },
  { id: 'kitzbuehel', name: 'Kitzbühel', km: 33, bearing: 352, air: 19.5, pic: 'town-kitzbuehel' },
  { id: 'salzburg', name: 'Salzburg', km: 118, bearing: 39, air: 74.9, pic: 'town-salzburg' },
];
export const FAR = [{ name: 'Innsbruck', km: 125 }, { name: 'München', km: 156 }, { name: 'Venezia', km: 295 }, { name: 'Wien', km: 424 }];
export const SLEIGH_TEL = '+436642052168';

export const WINTER_COPY = {
  de: {
    eyebrow: 'Aktivitäten · Winter',
    title: ['Ein Winter.', 'Sieben Ziele.', 'Alles ab 2 km.'],
    sub: 'Skifahren, Rodeln unter Flutlicht, Gletscher, Wasserfälle und Spa – alles erreichbar von der Pension in Hollersbach.',
    compass: 'Vom Haus aus gesehen',
    compassNote: 'Richtung und Lage in Luftlinie · Beschriftung: Straßen-km',
    home: 'Pension',
    road: 'Straßen-km',
    drive: 'Fahrt',
    km: 'km',
    route: 'Route planen',
    web: 'Website',
    photos: 'Fotos',
    nearEyebrow: 'Vor der Haustür',
    nearTitle: 'Langsamer Winter.',
    shoe: { title: 'Schneeschuhwandern', text: 'Leise Spuren durch verschneite Wälder – Natur pur, direkt im Tal.' },
    sleigh: { title: 'Pferdeschlittenfahrt', text: 'Mit dem Pferdeschlitten durch die Winterlandschaft.', who: 'Steger Georg · Mittersill', call: 'Anrufen' },
    townsEyebrow: 'Städte in der Nähe',
    townsTitle: 'Und wenn Sie mehr sehen wollen.',
    scroll: 'Die Reise beginnt',
    source: 'Distanzen und Fahrzeiten laut Winterprospekt der Pension',
  },
  en: {
    eyebrow: 'Activities · Winter',
    title: ['One winter.', 'Seven places.', 'All from 2 km.'],
    sub: 'Skiing, floodlit tobogganing, a glacier, waterfalls and a spa – all within reach of the guesthouse in Hollersbach.',
    compass: 'Seen from the house',
    compassNote: 'Direction and position as the crow flies · labels: road km',
    home: 'Pension',
    road: 'Road km',
    drive: 'Drive',
    km: 'km',
    route: 'Plan route',
    web: 'Website',
    photos: 'photos',
    nearEyebrow: 'On the doorstep',
    nearTitle: 'Slow winter.',
    shoe: { title: 'Snowshoe hiking', text: 'Quiet tracks through snowy forests – pure nature, right in the valley.' },
    sleigh: { title: 'Horse-drawn sleigh ride', text: 'Through the winter landscape by horse-drawn sleigh.', who: 'Steger Georg · Mittersill', call: 'Call' },
    townsEyebrow: 'Towns nearby',
    townsTitle: 'And if you want to see more.',
    scroll: 'The journey begins',
    source: 'Distances and drive times as in the guesthouse’s winter brochure',
  },
};
export const directions = (dest: string) => `https://www.google.com/maps/dir/?api=1&origin=${HOME_LL}&destination=${dest}&travelmode=driving`;
