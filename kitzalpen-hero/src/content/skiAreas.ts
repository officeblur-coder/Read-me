import type { Lang } from './hero';

/**
 * Ski area explorer + ski pass centre (preview route #ski).
 * Facts from the operators' official sites and the official pass sites, checked 5 Nov 2026 (season 2026/27):
 *  kitzski.at (Winter Info Plan 2026/27), panoramabahn.at, wildkogel-arena.at, zillertalarena.com, zillertal.at,
 *  kitzsteinhorn.at, alpincard.at, schmitten.at, skiwelt.at, superskicard.com.
 * A value the official source does not state is left out (never estimated). Prices are only linked.
 * Drive km / minutes: OSRM routing on OpenStreetMap from Reitlehen 42 – without traffic or snow chains.
 */
type T = Record<Lang, string>;
const A = `${import.meta.env.BASE_URL}images/activities/`;

export type AreaId = 'kitzski' | 'wildkogel' | 'zillertal' | 'kitzsteinhorn' | 'schmitten' | 'skiwelt';
export interface Access { name: T; km: number; min: number }
export interface SkiArea {
  id: AreaId; name: string; short: string; region: T; img?: string; imgAlt?: T;
  km: number; split?: [number, number, number]; lifts: number; altMin?: number; altMax?: number;
  season: { start: string; end: string; note?: T };
  access: Access[]; features: Record<Lang, string[]>;
  links: { status: string; webcams: string; map?: string; prices: string };
}

export const SKI_AREAS: SkiArea[] = [
  {
    id: 'kitzski', name: 'KitzSki', short: 'KitzSki', region: { de: 'Kitzbühel · Kirchberg · Mittersill', en: 'Kitzbühel · Kirchberg · Mittersill' },
    img: `${A}kitzski-kitzbuheler-alpen.webp`, imgAlt: { de: 'Gondel der KitzSki über verschneiten Pisten', en: 'KitzSki gondola above snowy slopes' },
    km: 233, lifts: 58,
    season: { start: '2026-11-06', end: '2027-04-04', note: { de: 'Resterkogel ab 6. Nov. · gesamte Skischaukel 11. Dez. – 29. März · Saisonfinale bis 4. April', en: 'Resterkogel from 6 Nov · full ski circuit 11 Dec – 29 Mar · season finale until 4 April' } },
    access: [{ name: { de: 'Panoramabahn Kitzbüheler Alpen, Talstation Hollersbach', en: 'Panoramabahn Kitzbüheler Alpen, Hollersbach valley station' }, km: 2.2, min: 5 }],
    features: {
      de: ['Direkt ab Hollersbach mit der Panoramabahn auf den Resterkogel', 'Snowpark Kitzbühel an der Hanglalm', 'Streif-Starthaus mit Fotopunkt', '10 kostenlose Übungslifte im Tal'],
      en: ['Straight from Hollersbach up to the Resterkogel with the Panoramabahn', 'Snowpark Kitzbühel at the Hanglalm', 'Streif start house with photo point', '10 free practice lifts in the valley'],
    },
    links: { status: 'https://www.kitzski.at/en/current-info/kitz-lift-status.html', webcams: 'https://www.kitzski.at/en/current-info/webcams.html', map: 'https://map.kitzski.at/en/winter/', prices: 'https://www.kitzski.at/en/tickets-vouchers/ski-passes-for-kitzbuehel-kirchberg-mittersill.html' },
  },
  {
    id: 'wildkogel', name: 'Wildkogel-Arena', short: 'Wildkogel', region: { de: 'Neukirchen · Bramberg', en: 'Neukirchen · Bramberg' },
    img: `${A}wildkogel-arena.webp`, imgAlt: { de: 'Skifahrer auf der Wildkogel-Arena mit Blick auf die Hohen Tauern', en: 'Skier in the Wildkogel Arena overlooking the Hohe Tauern' },
    km: 75, split: [35, 30, 10], lifts: 20, altMax: 2150,
    season: { start: '2026-12-05', end: '2027-04-04', note: { de: '5. – 8. Dez., dann 11. Dez. – 4. April', en: '5 – 8 Dec, then 11 Dec – 4 April' } },
    access: [
      { name: { de: 'Smaragdbahn, Bramberg', en: 'Smaragdbahn, Bramberg' }, km: 7.5, min: 9 },
      { name: { de: 'Wildkogelbahn, Neukirchen', en: 'Wildkogelbahn, Neukirchen' }, km: 12.3, min: 12 },
    ],
    features: {
      de: ['14 km beleuchtete Rodelbahn', 'Fun Slope, Family Park & Snowpark', 'Kogel-Mogel-Kinderareale', 'Skimovie & Speedcheck'],
      en: ['14 km floodlit toboggan run', 'Fun slope, family park & snow park', 'Kogel-Mogel children’s areas', 'Skimovie & speed check'],
    },
    links: { status: 'https://www.wildkogel-arena.at/en/mountain-lifts-wildkogel/facilities-slopes.html', webcams: 'https://www.wildkogel-arena.at/en/wildkogel-arena/webcams.html', prices: 'https://www.wildkogel-arena.at/en/mountain-lifts-wildkogel/opening-hours-prices-winter.html' },
  },
  {
    id: 'zillertal', name: 'Zillertal Arena', short: 'Zillertal Arena', region: { de: 'Hochkrimml · Königsleiten · Gerlos · Zell am Ziller', en: 'Hochkrimml · Königsleiten · Gerlos · Zell am Ziller' },
    km: 150, lifts: 52, altMax: 2500,
    season: { start: '2026-12-04', end: '2027-04-11', note: { de: 'Bei ausreichender Schneelage · Gerlosstein 18. Dez. – 29. März', en: 'With sufficient snow · Gerlosstein 18 Dec – 29 Mar' } },
    access: [
      { name: { de: 'Krimml-Hochkrimml', en: 'Krimml-Hochkrimml' }, km: 31, min: 34 },
      { name: { de: 'Dorfbahn, Königsleiten', en: 'Dorfbahn, Königsleiten' }, km: 35.6, min: 40 },
      { name: { de: 'Isskogelbahn, Gerlos', en: 'Isskogelbahn, Gerlos' }, km: 41.3, min: 43 },
    ],
    features: {
      de: ['77 % der Pisten über 1.700 m', '88 % technisch beschneit', 'Familienskigebiet & Kinderskischulen', 'Mondschein- und Good-Morning-Skiing'],
      en: ['77 % of the slopes above 1,700 m', '88 % covered by snowmaking', 'Family ski area & children’s ski schools', 'Moonlight and good-morning skiing'],
    },
    links: { status: 'https://www.zillertalarena.com/en/winter/ski-area/lifts-slopes/', webcams: 'https://www.zillertalarena.com/en/information-services/live-cams-weather/live-cams/', map: 'https://www.zillertalarena.com/en/information-services/live-cams-weather/interactive-ski-map/', prices: 'https://www.zillertalarena.com/en/winter/ski-area/tickets-prices/' },
  },
  {
    id: 'kitzsteinhorn', name: 'Kitzsteinhorn Kaprun', short: 'Kitzsteinhorn', region: { de: 'Gletscher · Kaprun', en: 'Glacier · Kaprun' },
    img: `${A}kitzsteinhorn-kaprun.webp`, imgAlt: { de: 'Aussichtsplattform am Kitzsteinhorn über dem Gletscher', en: 'Viewing platform on the Kitzsteinhorn above the glacier' },
    km: 61, lifts: 23, altMin: 1976, altMax: 3029,
    season: { start: '2026-10-10', end: '2027-05-17', note: { de: 'Gletscherskigebiet · Maiskogel 5. Dez. – 4. April', en: 'Glacier ski area · Maiskogel 5 Dec – 4 April' } },
    access: [{ name: { de: 'Talstation Gletscherjet, Kaprun', en: 'Gletscherjet valley station, Kaprun' }, km: 34.4, min: 35 }],
    features: {
      de: ['Gletscherskilauf von 1.976 bis 3.029 m', 'Snowparks am Kitzsteinhorn', 'Freeride XXL mit 5 markierten Routen', 'TOP OF SALZBURG auf 3.029 m'],
      en: ['Glacier skiing from 1,976 to 3,029 m', 'Snow parks on the Kitzsteinhorn', 'Freeride XXL with 5 marked routes', 'TOP OF SALZBURG at 3,029 m'],
    },
    links: { status: 'https://www.kitzsteinhorn.at/en/winter/information/ski-map-opening-times', webcams: 'https://www.kitzsteinhorn.at/en/service/information/weather-webcams', map: 'https://winter.intermaps.com/kitzsteinhorn?lang=en', prices: 'https://www.kitzsteinhorn.at/en/tickets-prices' },
  },
  {
    id: 'schmitten', name: 'Schmittenhöhe', short: 'Schmittenhöhe', region: { de: 'Zell am See', en: 'Zell am See' },
    img: `${A}schmittenhohe-zell-am-see.webp`, imgAlt: { de: 'Familie auf der Piste der Schmittenhöhe über dem Zeller See', en: 'Family on a Schmittenhöhe slope above Lake Zell' },
    km: 77, split: [30, 28, 19], lifts: 27,
    season: { start: '2026-12-04', end: '2027-04-04', note: { de: 'Geplant, abhängig von Schnee und Wetter', en: 'Planned, depending on snow and weather' } },
    access: [{ name: { de: 'Talstationen Zell am See / Schüttdorf', en: 'Valley stations Zell am See / Schüttdorf' }, km: 34.1, min: 37 }],
    features: {
      de: ['Trass-Abfahrt: schwarz, fast 1.000 Höhenmeter', 'Snowpark & Funslope XXL', '5 Talabfahrten mit über 1.000 Höhenmetern', 'Kinder-Erlebnispunkte mit Drache Schmidolin'],
      en: ['Trass run: black, almost 1,000 m vertical', 'Snow park & Funslope XXL', '5 valley runs with over 1,000 m vertical', 'Children’s adventure spots with Schmidolin the dragon'],
    },
    links: { status: 'https://www.schmitten.at/en/Winter-on-the-mountain/Skiing/Open-slopes-facilities', webcams: 'https://www.schmitten.at/en/Service/Webcams', map: 'https://www.schmitten.at/en/Winter-on-the-mountain/Skiing/interactive-ski-map', prices: 'https://www.schmitten.at/en/Tickets-Prices/Wintertickets' },
  },
  {
    id: 'skiwelt', name: 'SkiWelt Wilder Kaiser – Brixental', short: 'SkiWelt', region: { de: 'Brixen · Westendorf · Söll · Ellmau', en: 'Brixen · Westendorf · Söll · Ellmau' },
    km: 275, lifts: 81,
    season: { start: '2026-12-05', end: '2027-03-29', note: { de: 'Ellmau bis 4. April · auf Ski auch über die KitzSkiWelt Tour erreichbar', en: 'Ellmau until 4 April · also reachable on skis via the KitzSkiWelt Tour' } },
    access: [{ name: { de: 'Gondelbahn Brixen im Thale (über Pass Thurn – Kitzbühel)', en: 'Brixen im Thale gondola (via Pass Thurn – Kitzbühel)' }, km: 46.4, min: 51 }],
    features: {
      de: ['Österreichs größtes Nachtskigebiet (rund 10 km beleuchtet)', '3 Funparks & Erlebnispisten', '3 beleuchtete Rodelbahnen', 'Über 20 Talabfahrten'],
      en: ['Austria’s largest night-skiing area (about 10 km floodlit)', '3 fun parks & adventure slopes', '3 floodlit toboggan runs', 'More than 20 valley runs'],
    },
    links: { status: 'https://www.skiwelt.at/en/lift-status-winter.html', webcams: 'https://www.skiwelt.at/en/webcams-in-winter.html', map: 'https://skimap.skiwelt.at/en/map-winter.html', prices: 'https://www.skiwelt.at/en/skiwelt-tariffs.html' },
  },
];

export interface Pass { id: string; name: string; covers: AreaId[]; more?: T; text: T; info: string; shop: string }
export const PASSES: Pass[] = [
  { id: 'kitzski', name: 'KitzSki Skipass', covers: ['kitzski'], text: { de: '1 Tag bis 14 Tage, Stunden- und Saisonkarte (KitzSki Card) – inkl. Panoramabahn Hollersbach.', en: '1 to 14 days, hourly and season pass (KitzSki Card) – incl. the Panoramabahn Hollersbach.' }, info: 'https://www.kitzski.at/en/tickets-vouchers/ski-passes-for-kitzbuehel-kirchberg-mittersill.html', shop: 'https://www.kitzski.at/en/ticket-shop-kitzski.html' },
  { id: 'wildkogel', name: 'Wildkogel-Arena Skipass', covers: ['wildkogel'], text: { de: 'Tageskarte bis 14 Tage, auch „You-Pick-The-Days“.', en: 'Day pass up to 14 days, also “You-Pick-The-Days”.' }, info: 'https://www.wildkogel-arena.at/en/mountain-lifts-wildkogel/opening-hours-prices-winter.html', shop: 'https://bergbahnen-wildkogel.skiperformance.com/de/' },
  { id: 'zillertal-arena', name: 'Zillertal Arena Skipass', covers: ['zillertal', 'wildkogel'], text: { de: 'Gültig in der ganzen Zillertal Arena und laut Betreiber auch in der Wildkogel-Arena.', en: 'Valid throughout the Zillertal Arena and, per the operator, also in the Wildkogel Arena.' }, info: 'https://www.zillertalarena.com/en/winter/ski-area/tickets-prices/', shop: 'https://web.zillertalarena.com/en/stories/skitickets' },
  { id: 'zillertal-super', name: 'Zillertaler Superskipass', covers: ['zillertal', 'wildkogel'], more: { de: '+ Hochzillertal, Mayrhofen, Hintertux', en: '+ Hochzillertal, Mayrhofen, Hintertux' }, text: { de: 'Ab 2 Tagen – das ganze Zillertal und Wildkogel-Arena.', en: 'From 2 days – the whole Zillertal plus the Wildkogel Arena.' }, info: 'https://www.zillertal.at/en/winter/holidays/zillertal-superskipass.html', shop: 'https://www.myzillertal.at/en/stories/zillertaler-superskipass' },
  { id: 'alpin', name: 'Ski ALPIN CARD', covers: ['kitzsteinhorn', 'schmitten'], more: { de: '+ Skicircus Saalbach Hinterglemm Leogang Fieberbrunn', en: '+ Skicircus Saalbach Hinterglemm Leogang Fieberbrunn' }, text: { de: 'Kitzsteinhorn, Schmittenhöhe und Skicircus mit einem Ticket.', en: 'Kitzsteinhorn, Schmittenhöhe and the Skicircus on one ticket.' }, info: 'https://www.alpincard.at/en/ski-alpin-card.html', shop: 'https://tickets.kitzsteinhorn.at/en/' },
  { id: 'skiwelt', name: 'SkiWelt Skipass', covers: ['skiwelt'], text: { de: '1 bis 14 Tage und SkiWelt Wintercard.', en: '1 to 14 days and the SkiWelt Wintercard.' }, info: 'https://www.skiwelt.at/en/ski-passes.html', shop: 'https://www.skiwelt.at/en/ticketshop.html' },
  { id: 'kitzskiwelt', name: 'KitzSkiWelt Tour', covers: ['kitzski', 'skiwelt'], text: { de: 'Die Skisafari zwischen KitzSki und SkiWelt.', en: 'The ski safari between KitzSki and the SkiWelt.' }, info: 'https://www.kitzski.at/en/tickets-vouchers/kitzskiwelt-tour.html', shop: 'https://www.kitzski.at/en/ticket-shop-kitzski.html' },
  { id: 'super', name: 'SuperSkiCard', covers: ['kitzski', 'wildkogel', 'zillertal', 'kitzsteinhorn', 'schmitten', 'skiwelt'], more: { de: '+ über 20 weitere Skigebiete in Salzburg, Tirol & Kärnten', en: '+ over 20 more ski areas in Salzburg, Tyrol & Carinthia' }, text: { de: 'Alle sechs Skigebiete in der Nähe – und viele mehr. Saisonkarte oder 2 – 14 Tage.', en: 'All six nearby ski areas – and many more. Season pass or 2 – 14 days.' }, info: 'https://www.superskicard.com/en/', shop: 'https://www.superskicard.com/en/ticket-shop.html' },
];

export interface Bus { name: T; route: T; free: T; url: string }
export const SKI_BUSES: Bus[] = [
  { name: { de: 'Skibus Mittersill – Hollersbach Panoramabahn', en: 'Ski bus Mittersill – Hollersbach Panoramabahn' }, route: { de: 'Mittersill – Rettenbach – Hollersbach Ortszentrum – Talstation Panoramabahn', en: 'Mittersill – Rettenbach – Hollersbach village centre – Panoramabahn valley station' }, free: { de: 'Alle als „Skibus“ beschilderten Busse sind laut KitzSki mit gültigem KitzSki-Ticket und Wintersportbekleidung kostenlos.', en: 'Per KitzSki, all buses signed “Skibus” are free with a valid KitzSki ticket and winter-sports clothing.' }, url: 'https://www.panoramabahn.at/de/guenstig-bequem-auf-die-skipiste-1.html' },
  { name: { de: 'Gratis-Skibus Wildkogel', en: 'Free Wildkogel ski bus' }, route: { de: 'Panoramabahn Hollersbach – Smaragdbahn Bramberg – Wildkogelbahn Neukirchen – Zillertal Arena', en: 'Panoramabahn Hollersbach – Smaragdbahn Bramberg – Wildkogelbahn Neukirchen – Zillertal Arena' }, free: { de: 'Kostenlos mit gültigem Skipass und/oder Ausrüstung. Nur einzelne Fahrten halten an der Panoramabahn.', en: 'Free with a valid ski pass and/or equipment. Only some runs stop at the Panoramabahn.' }, url: 'https://www.wildkogel-arena.at/media/Skibusplan-Innerhofer-2025-26-end.pdf' },
  { name: { de: 'Skibus Linie 850', en: 'Ski bus line 850' }, route: { de: 'Mittersill – Pass Thurn (Mittelstation Panoramabahn, Resterhöhe) – Jochberg – Kitzbühel', en: 'Mittersill – Pass Thurn (Panoramabahn middle station, Resterhöhe) – Jochberg – Kitzbühel' }, free: { de: 'Skibus der KitzSki – mit gültigem KitzSki-Ticket kostenlos.', en: 'KitzSki ski bus – free with a valid KitzSki ticket.' }, url: 'https://www.panoramabahn.at/media/850-kitz-mittersill-hauptsaison.pdf' },
  { name: { de: 'Skibus zur Zillertal Arena', en: 'Ski bus to the Zillertal Arena' }, route: { de: 'Neukirchen – Wald im Pinzgau – Krimml – Königsleiten', en: 'Neukirchen – Wald im Pinzgau – Krimml – Königsleiten' }, free: { de: 'Kostenlos mit Zillertal-Arena-Skipass oder Zillertaler Superskipass.', en: 'Free with a Zillertal Arena pass or Zillertaler Superskipass.' }, url: 'https://www.zillertalarena.com/en/winter/ski-area/ski-bus/' },
  { name: { de: 'Skibus Zell am See – Kaprun – Kitzsteinhorn', en: 'Ski bus Zell am See – Kaprun – Kitzsteinhorn' }, route: { de: 'Zell am See – Kaprun – Kitzsteinhorn / Maiskogel', en: 'Zell am See – Kaprun – Kitzsteinhorn / Maiskogel' }, free: { de: 'Innerhalb Kaprun für alle frei, Zell am See ↔ Kaprun mit gültigem Skipass.', en: 'Free for everyone within Kaprun, Zell am See ↔ Kaprun with a valid ski pass.' }, url: 'https://www.kitzsteinhorn.at/en/winter/information/ski-bus' },
];

export const SKI_COPY = {
  de: {
    eyebrow: 'Skigebiete & Skipässe · Winter 2026/27', title: ['Sechs Skigebiete.', 'Ein Zuhause in Hollersbach.'],
    sub: 'Von der Panoramabahn fünf Minuten vor der Tür bis zum Gletscher in Kaprun – alle Fakten aus den offiziellen Quellen der Betreiber.',
    stats: { areas: 'Skigebiete', km: 'Pistenkilometer', min: 'Min. zur Gondel' },
    explore: 'Skigebiete entdecken', passes: 'Skipass finden',
    rulerEyebrow: 'Fahrzeit ab der Pension', rulerTitle: 'Wie nah ist welche Piste?', rulerNote: 'Fahrzeit mit dem Auto ohne Verkehr, Routenberechnung OpenStreetMap.', min: 'Min.',
    exEyebrow: 'Skigebiet-Explorer', exTitle: 'Jedes Skigebiet auf einen Blick.',
    km: 'Pisten', lifts: 'Lifte', alt: 'Höhe', season: 'Saison 2026/27', upTo: (m: string) => `bis ${m} m`, range: (a: string, b: string) => `${a} – ${b} m`,
    split: ['blau', 'rot', 'schwarz'], access: 'Einstieg ab KitzAlpen', drive: (km: string, min: number) => `${km} km · ca. ${min} Min.`,
    open: 'Saisonstart lt. Plan erreicht', planned: (d: string) => `Saisonstart geplant ${d}`,
    highlights: 'Highlights', validPasses: 'Gültige Skipässe',
    lnk: { status: 'Lift- & Pistenstatus', webcams: 'Webcams', map: 'Pistenplan', prices: 'Preise beim Betreiber' },
    noPhoto: 'Offizielle Bilder beim Betreiber',
    cmpEyebrow: 'Im Vergleich', cmpTitle: 'Pistenkilometer der sechs Skigebiete.',
    passEyebrow: 'Skipass-Center', passTitle: 'Welcher Skipass passt zu Ihrem Urlaub?',
    passText: 'Wählen Sie die Skigebiete, die Sie besuchen möchten – wir zeigen die Skipässe, die alle abdecken.',
    pick: 'Ihre Skigebiete', none: 'Wählen Sie mindestens ein Skigebiet.', fits: (n: number) => (n === 1 ? '1 passender Skipass' : `${n} passende Skipässe`),
    best: 'Genau passend', covers: 'Gültig in', info: 'Infos', shop: 'Online kaufen',
    priceNote: 'Preise nennen wir bewusst nicht – sie ändern sich je Saison. Es gelten die Angaben der Betreiber.',
    machine: 'Ticketautomat direkt an der Talstation der Panoramabahn in Hollersbach (laut KitzSki).',
    busEyebrow: 'Skibus', busTitle: 'Ohne Auto zur Piste.', busNote: 'Fahrpläne 2026/27 veröffentlichen die Betreiber vor Saisonbeginn – bis dahin verlinken wir die aktuellsten offiziellen Pläne (Stand 2025/26).', timetable: 'Fahrplan & Infos',
    ctaTitle: 'Bereit für Ihren Skiurlaub?', ctaText: 'Zimmer in der Pension oder das eigene Chalet – fünf Minuten zur Panoramabahn.', book: 'Jetzt buchen', mountain: 'Live: Bergwetter & Webcams',
  },
  en: {
    eyebrow: 'Ski areas & ski passes · winter 2026/27', title: ['Six ski areas.', 'One home in Hollersbach.'],
    sub: 'From the Panoramabahn five minutes from the door to the glacier in Kaprun – every fact from the operators’ official sources.',
    stats: { areas: 'ski areas', km: 'km of slopes', min: 'min to the gondola' },
    explore: 'Explore the ski areas', passes: 'Find your ski pass',
    rulerEyebrow: 'Drive time from the pension', rulerTitle: 'How close is each slope?', rulerNote: 'Drive time by car without traffic, route calculation OpenStreetMap.', min: 'min',
    exEyebrow: 'Ski area explorer', exTitle: 'Every ski area at a glance.',
    km: 'Slopes', lifts: 'Lifts', alt: 'Altitude', season: 'Season 2026/27', upTo: (m: string) => `up to ${m} m`, range: (a: string, b: string) => `${a} – ${b} m`,
    split: ['blue', 'red', 'black'], access: 'Access from KitzAlpen', drive: (km: string, min: number) => `${km} km · approx. ${min} min`,
    open: 'Planned season start reached', planned: (d: string) => `Season start planned ${d}`,
    highlights: 'Highlights', validPasses: 'Valid ski passes',
    lnk: { status: 'Lift & slope status', webcams: 'Webcams', map: 'Piste map', prices: 'Prices at the operator' },
    noPhoto: 'Official images at the operator',
    cmpEyebrow: 'Compared', cmpTitle: 'Kilometres of slopes in the six ski areas.',
    passEyebrow: 'Ski pass centre', passTitle: 'Which ski pass fits your holiday?',
    passText: 'Choose the ski areas you would like to visit – we show the passes that cover all of them.',
    pick: 'Your ski areas', none: 'Choose at least one ski area.', fits: (n: number) => (n === 1 ? '1 matching ski pass' : `${n} matching ski passes`),
    best: 'Exact fit', covers: 'Valid in', info: 'Info', shop: 'Buy online',
    priceNote: 'We deliberately don’t quote prices – they change every season. The operators’ details apply.',
    machine: 'Ticket machine right at the Panoramabahn valley station in Hollersbach (per KitzSki).',
    busEyebrow: 'Ski bus', busTitle: 'To the slopes without a car.', busNote: 'The operators publish the 2026/27 timetables before the season – until then we link the latest official plans (2025/26).', timetable: 'Timetable & info',
    ctaTitle: 'Ready for your ski holiday?', ctaText: 'A room in the pension or your own chalet – five minutes to the Panoramabahn.', book: 'Book now', mountain: 'Live: mountain weather & webcams',
  },
};
