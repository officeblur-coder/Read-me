import type { Lang } from './hero';

/**
 * Group page (preview route #groups; live: /group-activities/). Categories, places and links as on
 * kitzalpen.at/en/group-activities/ (Nov 2026). The site gives no prices, durations or group sizes.
 * Photos: the same images the live page uses (activities-curated) or already in this project.
 */
const G = `${import.meta.env.BASE_URL}images/groups/`;
const A = `${import.meta.env.BASE_URL}images/activities/`;
const SITE = 'https://www.kitzalpen.at';

export interface GroupType { id: string; img: string; label: Record<Lang, string>; title: Record<Lang, string>; text: Record<Lang, string>; points: Record<Lang, string[]> }

export const GROUP_TYPES: GroupType[] = [
  { id: 'moto', img: `${G}grossglockner.webp`,
    label: { de: 'Motorrad', en: 'Motorcycle' }, title: { de: 'Motorradgruppen', en: 'Motorcycle groups' },
    text: { de: 'Hollersbach ist eine ruhige Basis zwischen bekannten Bergstraßen, Panoramapässen und kurzen Runden.', en: 'Hollersbach is a quieter base between well-known mountain roads, scenic passes and short loops.' },
    points: { de: ['Großglockner Hochalpenstraße', 'Gerlos & Krimmler Aussichtspunkte', 'Pass Thurn & Felbertauern'], en: ['Grossglockner High Alpine Road', 'Gerlos & Krimml viewpoints', 'Pass Thurn & Felbertauern'] } },
  { id: 'bike', img: `${G}tauern-radweg-cycling.webp`,
    label: { de: 'Rad & MTB', en: 'Bike & MTB' }, title: { de: 'Radfahren, Gravel & MTB', en: 'Cycling, gravel & MTB' },
    text: { de: 'Tauernradweg, KAT Bike-Routen und die Panoramabahn – von leichten Ausfahrten bis zu mehrtägigen Etappen.', en: 'The Tauern Cycle Path, KAT Bike routes and the Panoramabahn – from easy rides to multi-day stages.' },
    points: { de: ['Tauernradweg', 'KAT Bike für Mehrtagesgruppen', 'Panoramabahn als Bike-Einstieg'], en: ['Tauern Cycle Path', 'KAT Bike for multi-day groups', 'Panoramabahn as a biking gateway'] } },
  { id: 'ski', img: `${A}kitzski-kitzbuheler-alpen.webp`,
    label: { de: 'Ski', en: 'Ski' }, title: { de: 'Ski & Snowboard', en: 'Ski & snowboard' },
    text: { de: 'Nah an der Panoramabahn, mehrere Skigebiete in Tagesreichweite.', en: 'Close to the Panoramabahn, with several ski areas within day-trip distance.' },
    points: { de: ['KitzSki · rund 2 km', 'Wildkogel-Arena', 'Kaprun & Zell am See als Ergänzung'], en: ['KitzSki · about 2 km', 'Wildkogel Arena', 'Kaprun & Zell am See as add-ons'] } },
  { id: 'hike', img: `${A}krimml-waterfalls.webp`,
    label: { de: 'Wandern', en: 'Hiking' }, title: { de: 'Wandern & Trailrunning', en: 'Hiking & trail running' },
    text: { de: 'Talrunden und längere Bergetappen – genug für mehrere Tage zu Fuß oder im Laufschritt.', en: 'Valley loops and longer mountain stages – enough for several days on foot or on the run.' },
    points: { de: ['Krimmler Wasserfälle', 'Etappen am Hohe Tauern Panorama Trail', 'Tal- und Seerouten'], en: ['Krimml Waterfalls', 'Hohe Tauern Panorama Trail stages', 'Valley and lake routes'] } },
  { id: 'school', img: `${A}wildkogel-arena.webp`,
    label: { de: 'Schule & Familie', en: 'School & family' }, title: { de: 'Schulreisen & Familiencamps', en: 'School trips & family camps' },
    text: { de: 'Natur, Bewegung und Lernen passen zusammen – für Camps, Projektwochen und mehrere Familien.', en: 'Nature, movement and learning fit together – for camps, project weeks and multi-family groups.' },
    points: { de: ['Nationalparkzentrum Mittersill', 'Ranger-Erlebnisse', 'Rodeln & Erlebnispfade'], en: ['National Park Centre Mittersill', 'Ranger-led experiences', 'Tobogganing & discovery trails'] } },
  { id: 'adventure', img: `${G}rafting-salzach.webp`,
    label: { de: 'Abenteuer', en: 'Adventure' }, title: { de: 'Abenteuer & Erholung', en: 'Adventure & recovery' },
    text: { de: 'Kräftige Tage und ruhige Erholungstage – ohne die Unterkunft zu wechseln.', en: 'Big days and slow recovery days – without changing base.' },
    points: { de: ['Rafting & Canyoning in Taxenbach', 'Paragliding & Mega Flying Fox', 'Tauern Spa & Kogler Spa'], en: ['Rafting & canyoning in Taxenbach', 'Paragliding & mega flying fox', 'Tauern Spa & Kogler Spa'] } },
];

export const GROUP_CONTACT = {
  tel: '+436642376571', telLabel: '+43 664 2376571',
  mail: 'kitzbuhelalpenpension@gmail.com',
  wa: 'https://wa.me/40748192821',
  map: `${SITE}/maps/group-attractions-map.html`,
};

export const GROUPS_COPY = {
  de: {
    eyebrow: 'Für Gruppen · Hollersbach im Pinzgau',
    title: ['Gruppenaktivitäten,', 'die aus einem Aufenthalt eine Alpenreise machen.'],
    sub: 'Eine Basis für Motorrad, Rad, Ski, Wandern, Schulreisen und Abenteuer – mit Restaurant im Haus.',
    enquiry: 'Gruppenanfrage senden', call: 'Jetzt anrufen', contactHref: `${SITE}/contact/`,
    fitEyebrow: 'Gut geeignet für', fitTitle: 'Die stärksten Gründe für Gruppen in dieser Region.',
    whyEyebrow: 'Warum die Pension', whyTitle: 'Eine Basis, die die Logistik ruhig und das Programm flexibel hält.',
    rooms: 'Zimmer im Haupthaus', cats: { double: 'Doppel', triple: 'Dreibett', family: 'Familie', quad: 'Vierbett' },
    beds: (n: number) => `bis ${n} Gäste`,
    sum: (n: number) => `Rechnerisch bis zu ${n} Gäste im Haupthaus – nach Zimmerkategorien.`,
    perks: [
      ['Restaurant im Haus', 'Frühstück und Abendessen ohne Transfer.'],
      ['Chalet dazu', 'Eigenständiges Chalet für bis zu 4 Gäste.'],
      ['KitzSki · rund 2 km', 'Panoramabahn als Einstieg im Sommer und Winter.'],
      ['M+ Card', 'Regionale Gästevorteile.'],
    ] as [string, string][],
    mapEyebrow: 'Interaktive Übersicht', mapTitle: 'Eine Planungskarte für Gruppentage, gemeinsame Routen und Mehrtagesaufenthalte.', mapCta: 'Karte öffnen',
    planEyebrow: 'Gemeinsam planen', planTitle: 'Lassen Sie uns Ihren Aufenthalt gemeinsam planen.',
    planText: 'Sagen Sie uns Reisedaten und Gruppenzusammensetzung – wir melden uns innerhalb eines Arbeitstags.',
    ways: { call: 'Anrufen', mail: 'E-Mail', wa: 'WhatsApp', form: 'Anfrageformular' },
    note: 'Preise und Pakete auf Anfrage.',
  },
  en: {
    eyebrow: 'For groups · Hollersbach im Pinzgau',
    title: ['Group activities', 'that turn one stay into a fuller alpine trip.'],
    sub: 'One base for motorcycling, cycling, skiing, hiking, school trips and adventure – with a restaurant in the house.',
    enquiry: 'Send a group enquiry', call: 'Call now', contactHref: `${SITE}/en/contact/`,
    fitEyebrow: 'Good fit for', fitTitle: 'The strongest group reasons to stay in this area.',
    whyEyebrow: 'Why the pension works', whyTitle: 'One base that keeps the logistics calm and the programme flexible.',
    rooms: 'rooms in the main house', cats: { double: 'Double', triple: 'Triple', family: 'Family', quad: 'Quadruple' },
    beds: (n: number) => `up to ${n} guests`,
    sum: (n: number) => `Up to ${n} guests in the main house, by room category.`,
    perks: [
      ['Restaurant in-house', 'Breakfast and dinner without a transfer.'],
      ['Plus the chalet', 'A standalone chalet for up to 4 guests.'],
      ['KitzSki · about 2 km', 'The Panoramabahn as gateway, summer and winter.'],
      ['M+ Card', 'Regional guest perks.'],
    ] as [string, string][],
    mapEyebrow: 'Interactive overview', mapTitle: 'A planning map for group days, shared routes and easy multi-night stays.', mapCta: 'Open the map',
    planEyebrow: 'Plan together', planTitle: 'Let’s plan your stay together.',
    planText: 'Tell us your dates and group composition – we reply within one business day.',
    ways: { call: 'Call', mail: 'Email', wa: 'WhatsApp', form: 'Enquiry form' },
    note: 'Prices and packages on request.',
  },
};
