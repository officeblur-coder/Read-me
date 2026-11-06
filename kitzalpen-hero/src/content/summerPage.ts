import type { WStop } from './winterPage';

/**
 * Summer activities page (preview route #activities-summer; live: /activities/summer/).
 * Places and texts: kitzalpen.at/activities/ and the map section (content/map.ts, activities.ts).
 * Road km and drive minutes: OSRM routing on OpenStreetMap from Reitlehen 42 (public/map/routes.json),
 * rounded. Compass: real bearing and straight-line distance (map-points.json).
 */
const A = `${import.meta.env.BASE_URL}images/activities/`;
const a = (n: string) => `${A}${n}.webp`;
export const S_HERO = `${import.meta.env.BASE_URL}images/experience/summer-1920.webp`;
export const S_SIDE = a('hike-feature');
export const S_GLIDE = a('paragliding');

export const S_STOPS: WStop[] = [
  {
    id: 'panoramabahn', km: 2, time: { de: '5 Min.', en: '5 min' }, bearing: 300, air: 1.8, dest: '47.28068,12.40538', name: 'Panoramabahn · Resterkogel',
    tag: { de: 'Kitzbüheler Alpen', en: 'Kitzbühel Alps' },
    text: { de: 'Mit der Gondel hinauf in die Kitzbüheler Alpen – Startpunkt für Wanderungen und Sommer am Berg über Hollersbach.', en: 'Up into the Kitzbühel Alps by gondola – a starting point for hikes and summer on the mountain above Hollersbach.' },
    facts: { de: ['Talstation Hollersbach'], en: ['Valley station Hollersbach'] },
    pics: [], // the only KitzSki photo we have is a winter shot – no summer photo yet
  },
  {
    id: 'wildkogel', km: 8, time: { de: '9 Min.', en: '9 min' }, bearing: 270, air: 6.4, dest: '47.27254,12.34061', name: 'Wildkogel · Habachtal',
    tag: { de: 'Mountainbike & Smaragdweg', en: 'Mountain biking & Emerald Trail' },
    text: { de: '800 km Mountainbike-Strecken mit Gletscherblick, Liftstart ab 2.000 m. Im Habachtal führt der Smaragdweg 7 km zu Europas einziger Smaragdlagerstätte – mit 11 Stationen und Rückfahrt per Shuttle.', en: '800 km of mountain-bike trails with glacier views, lifts up to 2,000 m. In the Habach valley, the Emerald Trail leads 7 km to Europe’s only emerald deposit – with 11 stations and a shuttle back.' },
    facts: { de: ['800 km MTB', 'Smaragdweg 7 km'], en: ['800 km MTB', 'Emerald Trail 7 km'] },
    pics: [a('wildkogel-mountain-biking'), a('emerald-trail-smaragdweg')], site: 'https://www.wildkogel-arena.at',
  },
  {
    id: 'hintersee', km: 16, time: { de: '21 Min.', en: '21 min' }, bearing: 157, air: 9.7, dest: '47.1945,12.47657', name: 'Hintersee',
    tag: { de: 'Felbertal', en: 'Felber valley' },
    text: { de: 'Ein stiller Bergsee am Ende des Felbertals.', en: 'A quiet mountain lake at the end of the Felber valley.' },
    facts: { de: ['Bergsee'], en: ['Mountain lake'] },
    pics: [],
  },
  {
    id: 'krimml', km: 24, time: { de: '25 Min.', en: '25 min' }, bearing: 250, air: 20.6, dest: '47.21079,12.16819', name: 'Krimmler Wasserfälle',
    tag: { de: 'Nationalpark Hohe Tauern', en: 'Hohe Tauern National Park' },
    text: { de: 'Die höchsten Wasserfälle Österreichs – mit Sprühnebel, Wasserfallweg und Ausblicken für jedes Alter.', en: 'Austria’s highest waterfalls – spray, the waterfall trail and views for all ages.' },
    facts: { de: ['Österreichs höchste Wasserfälle'], en: ['Austria’s highest waterfalls'] },
    pics: [a('krimml-waterfalls')], site: 'https://www.wasserfaelle-krimml.at',
  },
  {
    id: 'weisssee', km: 29, time: { de: '54 Min.', en: '54 min' }, bearing: 135, air: 21.5, dest: '47.17051,12.62727', name: 'Weißsee Gletscherwelt',
    tag: { de: 'Stubachtal · Uttendorf', en: 'Stubach valley · Uttendorf' },
    text: { de: 'Hochalpine Seen und Gletscherblick im Stubachtal – ab der Talstation Enzingerboden.', en: 'High-alpine lakes and glacier views in the Stubach valley – from the Enzingerboden valley station.' },
    facts: { de: ['Hochalpine Seen'], en: ['High-alpine lakes'] },
    pics: [],
  },
  {
    id: 'zell', km: 34, time: { de: '37 Min.', en: '37 min' }, bearing: 77, air: 26.8, dest: '47.32629,12.77236', name: 'Zell am See · Schmittenhöhe',
    tag: { de: 'Zeller See', en: 'Lake Zell' },
    text: { de: 'Zell am See mit seinem See liegt in Tagesreichweite. Bei jedem Wetter: das Kristallbad in Wald im Pinzgau, das Kogler Spa in Mittersill mit 60-Meter-Rutsche und das Tauern Spa in Kaprun.', en: 'Zell am See and its lake are an easy day trip. For any weather: the Kristallbad in Wald im Pinzgau, the Kogler Spa in Mittersill with a 60-metre slide, and the Tauern Spa in Kaprun.' },
    facts: { de: ['Zeller See', 'Tauern Spa'], en: ['Lake Zell', 'Tauern Spa'] },
    pics: [a('zell-am-see'), a('schmittenhohe-zell-am-see')], site: 'https://www.zellamsee-kaprun.com',
  },
  {
    id: 'stauseen', km: 36, time: { de: '38 Min.', en: '38 min' }, bearing: 120, air: 25.2, dest: '47.21637,12.72602', name: 'Hochgebirgsstauseen Kaprun',
    tag: { de: 'Mooserboden', en: 'Mooserboden' },
    text: { de: 'Die Stauseen am Mooserboden – die letzte Strecke geht es ab dem Kesselfall Alpenhaus mit dem Bus hinauf.', en: 'The Mooserboden reservoirs – the last stretch from the Kesselfall Alpenhaus is by bus.' },
    facts: { de: ['Busstart Kesselfall'], en: ['Bus from Kesselfall'] },
    pics: [],
  },
];

export const S_DOOR = [
  { n: '1', u: 'km', de: ['Badesee Hollersbach', 'Der Badesee im Ort – ein paar Minuten von der Pension.'], en: ['Hollersbach bathing lake', 'The village bathing lake – a few minutes from the guesthouse.'] },
  { n: '0', u: 'km', de: ['Hollersbachtal', 'Ein Nationalpark-Tal direkt hinter der Pension – zu Fuß oder mit dem Rad.'], en: ['Hollersbach valley', 'A national-park valley right behind the guesthouse – on foot or by bike.'] },
  { n: '4', u: 'km', de: ['Nationalparkzentrum', 'Ausstellungen, Ranger-Programme und Ideen für Familientage in Mittersill.'], en: ['National Park Centre', 'Exhibitions, ranger programmes and ideas for family days in Mittersill.'] },
  { n: '310', u: 'km', de: ['Tauernradweg', 'Entlang der Salzach direkt durch Hollersbach – zu 90 % asphaltiert, E-Bike-Verleih vor Ort.'], en: ['Tauern Cycle Path', 'Along the Salzach right through Hollersbach – 90 % paved, e-bike hire.'] },
];

export const SUMMER_COPY = {
  de: {
    eyebrow: 'Aktivitäten · Sommer',
    title: ['Ein Sommer.', 'Sieben Ziele.', 'Der Nationalpark vor der Tür.'],
    sub: 'Gondeln, Bergseen, Wasserfälle, Mountainbike-Trails und der Zeller See – alles erreichbar von der Pension in Hollersbach.',
    nearEyebrow: 'Vor der Haustür', nearTitle: 'Sommer zu Fuß.', sideCap: 'Hohe Tauern',
    glide: { title: 'Paragliding', text: 'Tandemflüge über die Hohen Tauern: Der Pinzgau gilt international als eines der besten Fluggebiete der Welt.', tag: 'Tandemflüge' },
    source: 'Straßen-km und Fahrzeiten: Routenberechnung auf OpenStreetMap (OSRM), gerundet',
    noPhoto: 'Ohne Foto – Bilder folgen',
  },
  en: {
    eyebrow: 'Activities · Summer',
    title: ['One summer.', 'Seven places.', 'The national park next door.'],
    sub: 'Gondolas, mountain lakes, waterfalls, mountain-bike trails and Lake Zell – all within reach of the guesthouse in Hollersbach.',
    nearEyebrow: 'On the doorstep', nearTitle: 'Summer on foot.', sideCap: 'Hohe Tauern',
    glide: { title: 'Paragliding', text: 'Tandem flights over the Hohe Tauern: the Pinzgau is recognised internationally as one of the world’s best flying areas.', tag: 'Tandem flights' },
    source: 'Road km and drive times: routing on OpenStreetMap (OSRM), rounded',
    noPhoto: 'No photo yet',
  },
};
