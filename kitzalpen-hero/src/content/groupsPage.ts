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
    title: ['Gemeinsam mehr erleben.', 'Eine Basis für Ihre ganze Gruppe.'],
    sub: 'Eine Basis für Motorrad, Rad, Ski, Wandern, Schulreisen und Abenteuer – mit Restaurant im Haus.',
    enquiry: 'Gruppenaufenthalt planen', call: 'Jetzt anrufen', contactHref: '#groups-plan',
    fitEyebrow: 'Gut geeignet für', fitTitle: 'Die stärksten Gründe für Gruppen in dieser Region.',
    whyEyebrow: 'Warum die Pension', whyTitle: 'Eine Basis, die die Logistik ruhig und das Programm flexibel hält.',
    rooms: 'Zimmer im Haupthaus', cats: { double: 'Doppel', triple: 'Dreibett', family: 'Familie', quad: 'Vierbett' },
    beds: (n: number) => `bis ${n} Gäste`,
    sum: (n: number) => `Rechnerisch bis zu ${n} Gäste im Haupthaus – nach Zimmerkategorien.`,
    perks: [
      ['Gruppenrabatte', 'Vergünstigungen je nach Gruppe – fragen Sie uns.'],
      ['Halbpension', 'Frühstück und Abendessen im Restaurant im Haus.'],
      ['Parkplätze am Haus', 'Parken direkt an der Pension.'],
      ['Skiaufbewahrung', 'Ski und Ausrüstung sicher verstaut.'],
      ['Chalet dazu', 'Eigenständiges Chalet für bis zu 4 Gäste.'],
      ['KitzSki · rund 2 km', 'Panoramabahn als Einstieg im Sommer und Winter.'],
    ] as [string, string][],
    mapEyebrow: 'Interaktive Übersicht', mapTitle: 'Eine Planungskarte für Gruppentage, gemeinsame Routen und Mehrtagesaufenthalte.', mapCta: 'Karte öffnen',
    planEyebrow: 'Gemeinsam planen', planTitle: 'Lassen Sie uns Ihren Aufenthalt gemeinsam planen.',
    planText: 'Sagen Sie uns Reisedaten und Gruppenzusammensetzung – wir melden uns innerhalb eines Arbeitstags.',
    ways: { call: 'Anrufen', mail: 'E-Mail', wa: 'WhatsApp', form: 'Anfrageformular' },
    note: 'Preise, Gruppenrabatte und Pakete auf Anfrage.',
  },
  en: {
    eyebrow: 'For groups · Hollersbach im Pinzgau',
    title: ['Experience more together.', 'One base for your whole group.'],
    sub: 'One base for motorcycling, cycling, skiing, hiking, school trips and adventure – with a restaurant in the house.',
    enquiry: 'Plan your group stay', call: 'Call now', contactHref: '#groups-plan',
    fitEyebrow: 'Good fit for', fitTitle: 'The strongest group reasons to stay in this area.',
    whyEyebrow: 'Why the pension works', whyTitle: 'One base that keeps the logistics calm and the programme flexible.',
    rooms: 'rooms in the main house', cats: { double: 'Double', triple: 'Triple', family: 'Family', quad: 'Quadruple' },
    beds: (n: number) => `up to ${n} guests`,
    sum: (n: number) => `Up to ${n} guests in the main house, by room category.`,
    perks: [
      ['Group discounts', 'Reduced rates depending on your group – just ask.'],
      ['Half board', 'Breakfast and dinner in the in-house restaurant.'],
      ['Parking at the house', 'Park right at the pension.'],
      ['Ski storage', 'Skis and gear safely stored.'],
      ['Plus the chalet', 'A standalone chalet for up to 4 guests.'],
      ['KitzSki · about 2 km', 'The Panoramabahn as gateway, summer and winter.'],
    ] as [string, string][],
    mapEyebrow: 'Interactive overview', mapTitle: 'A planning map for group days, shared routes and easy multi-night stays.', mapCta: 'Open the map',
    planEyebrow: 'Plan together', planTitle: 'Let’s plan your stay together.',
    planText: 'Tell us your dates and group composition – we reply within one business day.',
    ways: { call: 'Call', mail: 'Email', wa: 'WhatsApp', form: 'Enquiry form' },
    note: 'Prices, group discounts and packages on request.',
  },
};

/** Group Stay Planner – an enquiry builder, not a booking engine: no availability or prices are shown. */
export const PLANNER_COPY = {
  de: {
    eyebrow: 'Group Stay Planner', title: 'Ihr Gruppenaufenthalt in einer Minute skizziert.',
    text: 'Daten, Gruppe und Wünsche eintragen – wir prüfen Verfügbarkeit und Gruppenrabatt und melden uns persönlich.',
    steps: ['Reisedaten', 'Gruppe', 'Unterkunft', 'Programm', 'Kontakt'],
    arrive: 'Anreise', depart: 'Abreise', adults: 'Erwachsene', children: 'Kinder', rooms: 'Zimmer (ca.)', roomsAuto: 'egal / Vorschlag',
    type: 'Art der Gruppe', types: ['Freunde & Familie', 'Ski-Gruppe', 'Motorrad', 'Rad & MTB', 'Wandern', 'Schule & Jugend', 'Verein & Sport', 'Firma & Team', 'Andere'],
    stay: 'Unterkunft', stays: { pension: 'Pension', chalet: 'Chalet', both: 'Beides', help: 'Bitte beraten' },
    stayHint: { pension: 'Haupthaus mit Restaurant', chalet: 'Eigenständig, bis 4 Gäste', both: 'Pension + Chalet', help: 'Wir schlagen etwas vor' },
    board: 'Verpflegung', boards: ['Frühstück', 'Halbpension', 'Noch offen'],
    acts: 'Gewünschte Aktivitäten', actsList: ['Ski & Snowboard', 'Skitouren & Winterwandern', 'Rodeln', 'Wandern', 'Rad & E-Bike', 'Mountainbike', 'Motorradtouren', 'Rafting & Canyoning', 'Wellness & Therme', 'Ausflüge & Städte'],
    extras: 'Gewünscht', extrasList: ['Parkplatz für Bus', 'Skiaufbewahrung', 'Gemeinsames Abendessen'],
    req: 'Besondere Wünsche', reqPh: 'z. B. Kinderalter, Allergien, Ankunftszeit, Budget …',
    name: 'Name / Gruppe', email: 'E-Mail', phone: 'Telefon',
    summary: 'Ihre Anfrage', nights: (n: number) => (n === 1 ? '1 Nacht' : `${n} Nächte`), guests: (n: number) => (n === 1 ? '1 Gast' : `${n} Gäste`),
    cap: 'Kapazität der Auswahl', capOf: (g: number, c: number) => `${g} von max. ${c} Plätzen`,
    over: (c: number) => `Mehr als ${c} Gäste – das passt nicht in die gewählte Unterkunft. Wählen Sie „Beides“ oder schreiben Sie uns, wir finden eine Lösung.`,
    overAll: 'Für sehr große Gruppen planen wir gern individuell – senden Sie die Anfrage trotzdem.',
    chaletKids: 'Hinweis: Das Chalet ist für bis zu 4 Gäste.',
    roomsOver: 'Das Haupthaus hat 17 Zimmer.',
    discount: 'Gruppenrabatt je nach Gruppe – wir nennen ihn in unserem Angebot.',
    sendMail: 'Per E-Mail senden', sendWa: 'Per WhatsApp senden',
    need: 'Bitte Anreise, Abreise und Name ausfüllen.', badDates: 'Die Abreise muss nach der Anreise liegen.',
    disclaimer: 'Unverbindliche Anfrage – keine Sofortbuchung. Verfügbarkeit, Preis und Rabatt bestätigen wir persönlich.',
    subject: 'Gruppenanfrage KitzAlpen', none: '–',
  },
  en: {
    eyebrow: 'Group Stay Planner', title: 'Sketch your group stay in a minute.',
    text: 'Add dates, group and wishes – we check availability and your group discount and reply personally.',
    steps: ['Dates', 'Group', 'Accommodation', 'Programme', 'Contact'],
    arrive: 'Arrival', depart: 'Departure', adults: 'Adults', children: 'Children', rooms: 'Rooms (approx.)', roomsAuto: 'any / suggest',
    type: 'Type of group', types: ['Friends & family', 'Ski group', 'Motorcycle', 'Bike & MTB', 'Hiking', 'School & youth', 'Club & sports', 'Company & team', 'Other'],
    stay: 'Accommodation', stays: { pension: 'Pension', chalet: 'Chalet', both: 'Both', help: 'Help me choose' },
    stayHint: { pension: 'Main house with restaurant', chalet: 'Self-contained, up to 4', both: 'Pension + chalet', help: 'We suggest the best fit' },
    board: 'Meals', boards: ['Breakfast', 'Half board', 'Not sure yet'],
    acts: 'Activities you’d like', actsList: ['Ski & snowboard', 'Ski touring & winter hiking', 'Tobogganing', 'Hiking', 'Cycling & e-bike', 'Mountain biking', 'Motorcycle tours', 'Rafting & canyoning', 'Wellness & thermal spa', 'Day trips & towns'],
    extras: 'Requested', extrasList: ['Coach parking', 'Ski storage', 'Group dinner'],
    req: 'Special requests', reqPh: 'e.g. children’s ages, allergies, arrival time, budget …',
    name: 'Name / group', email: 'Email', phone: 'Phone',
    summary: 'Your enquiry', nights: (n: number) => (n === 1 ? '1 night' : `${n} nights`), guests: (n: number) => (n === 1 ? '1 guest' : `${n} guests`),
    cap: 'Capacity of your choice', capOf: (g: number, c: number) => `${g} of max. ${c} places`,
    over: (c: number) => `More than ${c} guests – that won’t fit the chosen accommodation. Choose “Both” or write to us and we’ll find a solution.`,
    overAll: 'For very large groups we gladly plan individually – send the enquiry anyway.',
    chaletKids: 'Note: the chalet sleeps up to 4 guests.',
    roomsOver: 'The main house has 17 rooms.',
    discount: 'Group discount depending on your group – we include it in our offer.',
    sendMail: 'Send by email', sendWa: 'Send via WhatsApp',
    need: 'Please fill in arrival, departure and name.', badDates: 'Departure must be after arrival.',
    disclaimer: 'Non-binding enquiry – not an instant booking. We confirm availability, price and discount personally.',
    subject: 'Group enquiry KitzAlpen', none: '–',
  },
};
