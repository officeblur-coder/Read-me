import type { Lang } from './hero';

/**
 * Arrival & mobility (preview route #arrival). Official sources, checked 5 Nov 2026:
 * guestmobilityticket.at, salzburg-verkehr.at (line 670 timetable 2026), pinzgauerlokalbahn.at (timetables 2026 + 2027),
 * vvt.at (lines 850, 950X), panoramabahn.at (ski bus), salzburg-airport.com, innsbruck-airport.com, munich-airport.com,
 * felbertauernstrasse.at, gerlosstrasse.at, grossglockner.at, asfinag.at, salzburgerland.com, nationalpark.at.
 * Drive / walk times: OSRM routing on OpenStreetMap from Reitlehen 42 (car without traffic).
 * Nothing here is a timetable – departures are always linked to the official planners.
 */
type T = Record<Lang, string>;

export const PLANNERS = {
  svv: 'https://fahrplan.salzburg-verkehr.at/',
  svvApp: 'https://salzburg-verkehr.at/fahrplaene/salzburg-verkehr-app/',
  oebb: 'https://fahrplan.oebb.at/',
  gmt: 'https://www.guestmobilityticket.at/',
  plb: 'https://www.pinzgauerlokalbahn.at/content/website_pinzgauerlokalbahn/de_at/fahrplan-tarife/fahrplan.html',
  line670: 'https://salzburg-verkehr.at/wp-content/uploads/2026/02/96-670-G-j26-20.pdf',
};

export const NEARBY: { label: T; km: number; min: number; mode: 'walk' | 'car' }[] = [
  { label: { de: 'Haltestelle Hollersbach Bahnhof', en: 'Hollersbach Bahnhof stop' }, km: 1.1, min: 15, mode: 'walk' },
  { label: { de: 'Panoramabahn Talstation', en: 'Panoramabahn valley station' }, km: 2.2, min: 27, mode: 'walk' },
  { label: { de: 'Bahnhof Mittersill', en: 'Mittersill station' }, km: 4.9, min: 5, mode: 'car' },
  { label: { de: 'Bahnhof Zell am See (ÖBB)', en: 'Zell am See station (ÖBB)' }, km: 31.9, min: 32, mode: 'car' },
];

export interface Route { id: string; title: T; sub: T; km?: number; min?: number; steps: Record<Lang, string[]>; links: { label: T; url: string }[] }
export const ROUTES: Record<'car' | 'train' | 'plane', Route[]> = {
  car: [
    { id: 'munich', title: { de: 'Aus Deutschland / München', en: 'From Germany / Munich' }, sub: { de: 'über Kufstein – Kitzbühel – Pass Thurn', en: 'via Kufstein – Kitzbühel – Pass Thurn' }, km: 158, min: 138,
      steps: { de: ['Autobahn bis Kufstein Süd (Vignette für Österreich nötig)', 'Über St. Johann und Kitzbühel zum Pass Thurn – mautfrei', 'Vom Pass hinunter nach Mittersill, dann 5 km bis Hollersbach'], en: ['Motorway to Kufstein Süd (Austrian vignette required)', 'Via St. Johann and Kitzbühel to Pass Thurn – toll-free', 'Down to Mittersill, then 5 km to Hollersbach'] },
      links: [{ label: { de: 'Digitale Vignette (ASFINAG)', en: 'Digital vignette (ASFINAG)' }, url: 'https://www.asfinag.at/en/toll/vignette/' }] },
    { id: 'vienna', title: { de: 'Aus Wien / Salzburg', en: 'From Vienna / Salzburg' }, sub: { de: 'über Zell am See', en: 'via Zell am See' }, km: 425, min: 294,
      steps: { de: ['Westautobahn A1 bis Salzburg', 'Über Lofer oder Bischofshofen nach Zell am See', 'Durch den Oberpinzgau über Mittersill nach Hollersbach'], en: ['A1 West motorway to Salzburg', 'Via Lofer or Bischofshofen to Zell am See', 'Through the Upper Pinzgau via Mittersill to Hollersbach'] },
      links: [{ label: { de: 'Digitale Vignette (ASFINAG)', en: 'Digital vignette (ASFINAG)' }, url: 'https://www.asfinag.at/en/toll/vignette/' }] },
    { id: 'south', title: { de: 'Aus Italien / Osttirol', en: 'From Italy / East Tyrol' }, sub: { de: 'über die Felbertauernstraße', en: 'via the Felbertauern road' },
      steps: { de: ['Über Lienz und Matrei in Osttirol', 'Felbertauernstraße mit Tunnel – mautpflichtig, ganzjährig und rund um die Uhr geöffnet, keine Vignette nötig', 'Ankunft in Mittersill, dann 5 km bis Hollersbach'], en: ['Via Lienz and Matrei in East Tyrol', 'Felbertauern road with tunnel – toll road, open all year round the clock, no vignette needed', 'Arrive in Mittersill, then 5 km to Hollersbach'] },
      links: [{ label: { de: 'Felbertauernstraße', en: 'Felbertauern road' }, url: 'https://www.felbertauernstrasse.at/' }] },
  ],
  train: [
    { id: 'zell', title: { de: 'Mit der Bahn bis Zell am See', en: 'By train to Zell am See' }, sub: { de: 'ÖBB & Westbahn – viele Fernverbindungen', en: 'ÖBB & Westbahn – many long-distance connections' },
      steps: { de: ['Fernzug bis Zell am See', 'Pinzgauer Lokalbahn bis Mittersill, weiter mit dem Ersatzbus nach Hollersbach – oder direkt Bus 670 vom Bahnhofsvorplatz', 'Ausstieg Hollersbach Bahnhof oder Ortsmitte – Bedarfshalt, bitte Haltewunsch drücken'], en: ['Long-distance train to Zell am See', 'Pinzgauer Lokalbahn to Mittersill, then the replacement bus to Hollersbach – or bus 670 straight from the station forecourt', 'Get off at Hollersbach Bahnhof or Ortsmitte – request stop, please press the stop button'] },
      links: [{ label: { de: 'ÖBB Fahrplan (Scotty)', en: 'ÖBB journey planner (Scotty)' }, url: PLANNERS.oebb }, { label: { de: 'Bus 670 + Lokalbahn-Ersatzverkehr (PDF)', en: 'Bus 670 + Lokalbahn replacement (PDF)' }, url: PLANNERS.line670 }] },
    { id: 'kitz', title: { de: 'Über Kitzbühel', en: 'Via Kitzbühel' }, sub: { de: 'Postbus über den Pass Thurn', en: 'Postbus over Pass Thurn' },
      steps: { de: ['Zug bis Kitzbühel', 'Postbus 850 oder 950X bis Mittersill (Tiroler Linien – eigenes Ticket nötig)', 'Weiter mit Bus 670 oder Ersatzbus nach Hollersbach'], en: ['Train to Kitzbühel', 'Postbus 850 or 950X to Mittersill (Tyrolean lines – separate ticket needed)', 'Then bus 670 or the replacement bus to Hollersbach'] },
      links: [{ label: { de: 'Linienfahrpläne Tirol (VVT)', en: 'Tyrol line timetables (VVT)' }, url: 'https://www.vvt.at/ihre-fahrt/linienfahrplan' }] },
  ],
  plane: [
    { id: 'szg', title: { de: 'Flughafen Salzburg', en: 'Salzburg Airport' }, sub: { de: 'der nächste Flughafen', en: 'the nearest airport' }, km: 126, min: 104,
      steps: { de: ['Postbus 260 direkt vom Flughafen nach Zell am See – oder Bus 2 zum Salzburger Hauptbahnhof und mit dem Zug weiter', 'Ab Zell am See wie bei der Bahnanreise', 'Mit Pre-Check-in gilt das Guest Mobility Ticket schon in den Bussen ab dem Flughafen'], en: ['Postbus 260 directly from the airport to Zell am See – or bus 2 to Salzburg main station and on by train', 'From Zell am See as for the train arrival', 'With pre-check-in the Guest Mobility Ticket is already valid on the buses from the airport'] },
      links: [{ label: { de: 'Salzburg Airport – öffentliche Anreise', en: 'Salzburg Airport – public transport' }, url: 'https://www.salzburg-airport.com/en/flights-arrival/arrival-to-the-airport/public-transportation' }] },
    { id: 'inn', title: { de: 'Flughafen Innsbruck', en: 'Innsbruck Airport' }, sub: { de: 'über Tirol', en: 'via Tyrol' }, km: 127, min: 117,
      steps: { de: ['Bus F zum Innsbrucker Hauptbahnhof (rund 20 Min.)', 'Mit dem Zug weiter – Verbindung im ÖBB-Fahrplan planen', 'Mit dem Auto: über Kitzbühel und den Pass Thurn'], en: ['Bus F to Innsbruck main station (about 20 min)', 'On by train – plan the connection in the ÖBB planner', 'By car: via Kitzbühel and Pass Thurn'] },
      links: [{ label: { de: 'Innsbruck Airport', en: 'Innsbruck Airport' }, url: 'https://www.innsbruck-airport.com/en/passengers-visitors/arrival-parking/public-transport/' }] },
    { id: 'muc', title: { de: 'Flughafen München', en: 'Munich Airport' }, sub: { de: 'internationale Verbindungen', en: 'international connections' }, km: 197, min: 154,
      steps: { de: ['S-Bahn S1 oder S8 zum Münchner Hauptbahnhof (rund 40 Min.)', 'Mit dem Zug weiter Richtung Zell am See', 'Mit dem Auto: über Kufstein, Kitzbühel und den Pass Thurn'], en: ['S-Bahn S1 or S8 to Munich main station (about 40 min)', 'On by train towards Zell am See', 'By car: via Kufstein, Kitzbühel and Pass Thurn'] },
      links: [{ label: { de: 'Munich Airport – öffentliche Anreise', en: 'Munich Airport – public transport' }, url: 'https://www.munich-airport.com/public-transport-260822' }] },
  ],
};

export const LINES: { no: string; name: T; text: T; url: string; here: boolean }[] = [
  { no: '670', name: { de: 'Regionalbus Zell am See – Mittersill – Krimml', en: 'Regional bus Zell am See – Mittersill – Krimml' }, text: { de: 'Hält in Hollersbach Mühlleiten, Ortsmitte, Bahnhof und Panoramabahn.', en: 'Stops in Hollersbach at Mühlleiten, Ortsmitte, Bahnhof and Panoramabahn.' }, url: 'https://salzburg-verkehr.at/wp-content/uploads/2026/02/96-670-j26-20.pdf', here: true },
  { no: 'PLB', name: { de: 'Pinzgauer Lokalbahn & Ersatzbus', en: 'Pinzgauer Lokalbahn & replacement bus' }, text: { de: 'Zug Zell am See – Mittersill, ab Mittersill Ersatzbus bis Krimml mit Halt Hollersbach und Hollersbach Panoramabahn.', en: 'Train Zell am See – Mittersill, from Mittersill a replacement bus to Krimml stopping at Hollersbach and Hollersbach Panoramabahn.' }, url: PLANNERS.plb, here: true },
  { no: '850', name: { de: 'Kitzbühel – Pass Thurn – Mittersill', en: 'Kitzbühel – Pass Thurn – Mittersill' }, text: { de: 'Ab Mittersill, mit Halt an der Mittelstation der Panoramabahn am Pass Thurn.', en: 'From Mittersill, stopping at the Panoramabahn middle station on Pass Thurn.' }, url: 'https://www.vvt.at/ihre-fahrt/linienfahrplan', here: false },
  { no: '950X', name: { de: 'Lienz – Felbertauern – Mittersill – Kitzbühel', en: 'Lienz – Felbertauern – Mittersill – Kitzbühel' }, text: { de: 'Ab Bahnhof Mittersill nach Osttirol und Kitzbühel.', en: 'From Mittersill station to East Tyrol and Kitzbühel.' }, url: 'https://www.vvt.at/ihre-fahrt/linienfahrplan', here: false },
  { no: 'Ski', name: { de: 'Gratis-Skibus zur Panoramabahn', en: 'Free ski bus to the Panoramabahn' }, text: { de: 'Im Winter: Mittersill – Hollersbach – Talstation Panoramabahn.', en: 'In winter: Mittersill – Hollersbach – Panoramabahn valley station.' }, url: 'https://www.panoramabahn.at/de/skibus-zur-panoramabahn.html', here: true },
];

export const ROADS: { name: T; state: T; tone: 'ok' | 'toll' | 'closed'; url: string }[] = [
  { name: { de: 'Pass Thurn (Kitzbühel – Mittersill)', en: 'Pass Thurn (Kitzbühel – Mittersill)' }, state: { de: 'Mautfrei', en: 'Toll-free' }, tone: 'ok', url: 'https://www.salzburgerland.com/de/anreise-mit-dem-auto/' },
  { name: { de: 'Felbertauernstraße', en: 'Felbertauern road' }, state: { de: 'Maut · ganzjährig rund um die Uhr offen', en: 'Toll · open all year round the clock' }, tone: 'toll', url: 'https://www.felbertauernstrasse.at/' },
  { name: { de: 'Gerlos Alpenstraße', en: 'Gerlos Alpine Road' }, state: { de: 'Maut · ganzjährig offen · während des Winter-Skibetriebs gratis', en: 'Toll · open all year · free during the winter ski season' }, tone: 'toll', url: 'https://www.gerlosstrasse.at/' },
  { name: { de: 'Großglockner Hochalpenstraße', en: 'Grossglockner High Alpine Road' }, state: { de: 'Wintersperre bis Anfang Mai 2027', en: 'Closed for winter until early May 2027' }, tone: 'closed', url: 'https://www.grossglockner.at/' },
];

export const ARRIVAL_COPY = {
  de: {
    eyebrow: 'Anreise & Mobilität', title: ['Ankommen.', 'Und dann vieles ohne Auto.'],
    sub: 'Wie Sie nach Hollersbach kommen – und warum Bus und Bahn im ganzen Land Salzburg für Sie kostenlos sind.',
    gmtBadge: 'Für alle Übernachtungsgäste', gmtTitle: 'Guest Mobility Ticket', gmtLead: 'Bus & Bahn im ganzen Land Salzburg – inklusive.',
    gmtText: 'Seit 1. Mai 2025 erhält jeder Übernachtungsgast in Salzburg das Ticket beim Check-in – digital, als PDF oder in der Wallet.',
    gmtYes: ['Alle Busse, S-Bahn, Regional- und Fernzüge (ÖBB & Westbahn) im Land Salzburg', 'Pinzgauer Lokalbahn und Ersatzbusse', 'Busse schon ab dem Pre-Check-in – auch vom Flughafen Salzburg', 'Bis Betriebsschluss am Abreisetag'],
    gmtNo: ['Bergbahnen', 'Fahrradmitnahme', 'Strecken außerhalb Salzburgs, z. B. nach Kitzbühel oder Osttirol', 'Züge erst ab dem Check-in'],
    yes: 'Inklusive', no: 'Nicht enthalten', gmtMore: 'Alle Infos zum Ticket',
    nearEyebrow: 'Rund ums Haus', nearTitle: 'Alles in der Nähe.', walk: 'zu Fuß', car: 'mit dem Auto', min: 'Min.',
    howEyebrow: 'Ihre Anreise', howTitle: 'Wie kommen Sie zu uns?', modes: { car: 'Auto', train: 'Bahn', plane: 'Flugzeug' },
    approx: (km: number, h: string) => `${km} km · ca. ${h}`, routeNote: 'Fahrzeit ohne Verkehr, Routenberechnung OpenStreetMap.',
    plbEyebrow: 'Wichtig zu wissen', plbTitle: 'Pinzgauer Lokalbahn: Ersatzbus ab Mittersill',
    plbText: 'Die Züge fahren derzeit nur zwischen Zell am See und Mittersill. Zwischen Mittersill und Krimml – also auch nach Hollersbach – fahren bis auf Weiteres Ersatzbusse, laut Betreiber auch im Fahrplan 2027.',
    plbBike: 'In den Ersatzbussen ist keine Fahrradmitnahme möglich – Ausnahme 1. Mai bis 30. Sept. mit Voranmeldung bis 14 Uhr am Vortag bei ausgewählten Kursen.',
    linesEyebrow: 'Busse & Bahn', linesTitle: 'Die Linien rund um Hollersbach.', stopsHere: 'Hält in Hollersbach', fromMittersill: 'Ab Mittersill', timetable: 'Fahrplan',
    roadsEyebrow: 'Straßen & Pässe', roadsTitle: 'Mit dem Auto unterwegs.', vignette: 'Ab 1. Dezember 2026 gibt es nur noch die digitale Vignette – die Klebevignette 2026 gilt bis 31. Jänner 2027.',
    ev: 'Nächste offizielle E-Ladestation: Nationalparkwelten Mittersill (2 × 120 kW Schnelllader, 4 beschleunigte Ladepunkte).',
    planEyebrow: 'Live planen', planTitle: 'Abfahrten immer aktuell.', planText: 'Fahrpläne ändern sich – wir verlinken deshalb direkt die offiziellen Planer.',
    planners: { svv: 'Salzburg Verkehr Fahrplan', svvApp: 'Salzburg Verkehr-App', oebb: 'ÖBB Scotty' },
    checked: 'Stand: 5. November 2026 · offizielle Quellen der Betreiber',
  },
  en: {
    eyebrow: 'Arrival & mobility', title: ['Arrive.', 'Then leave the car behind.'],
    sub: 'How to reach Hollersbach – and why buses and trains across the whole state of Salzburg are free for you.',
    gmtBadge: 'For every overnight guest', gmtTitle: 'Guest Mobility Ticket', gmtLead: 'Buses & trains across the state of Salzburg – included.',
    gmtText: 'Since 1 May 2025 every overnight guest in Salzburg receives the ticket at check-in – digitally, as a PDF or in the wallet.',
    gmtYes: ['All buses, S-Bahn, regional and long-distance trains (ÖBB & Westbahn) in the state of Salzburg', 'Pinzgauer Lokalbahn and replacement buses', 'Buses from pre-check-in – including from Salzburg Airport', 'Until the end of service on your departure day'],
    gmtNo: ['Cable cars', 'Taking a bike', 'Routes outside Salzburg, e.g. to Kitzbühel or East Tyrol', 'Trains only from check-in'],
    yes: 'Included', no: 'Not included', gmtMore: 'All about the ticket',
    nearEyebrow: 'Around the house', nearTitle: 'Everything close by.', walk: 'on foot', car: 'by car', min: 'min',
    howEyebrow: 'Your arrival', howTitle: 'How do you get here?', modes: { car: 'Car', train: 'Train', plane: 'Plane' },
    approx: (km: number, h: string) => `${km} km · approx. ${h}`, routeNote: 'Drive time without traffic, route calculation OpenStreetMap.',
    plbEyebrow: 'Good to know', plbTitle: 'Pinzgauer Lokalbahn: replacement bus from Mittersill',
    plbText: 'Trains currently run only between Zell am See and Mittersill. Between Mittersill and Krimml – including Hollersbach – replacement buses run until further notice, according to the operator also in the 2027 timetable.',
    plbBike: 'Bikes cannot be taken on the replacement buses – except 1 May to 30 Sept with booking by 2 pm the day before on selected runs.',
    linesEyebrow: 'Buses & trains', linesTitle: 'The lines around Hollersbach.', stopsHere: 'Stops in Hollersbach', fromMittersill: 'From Mittersill', timetable: 'Timetable',
    roadsEyebrow: 'Roads & passes', roadsTitle: 'Travelling by car.', vignette: 'From 1 December 2026 only the digital vignette is sold – the 2026 sticker stays valid until 31 January 2027.',
    ev: 'Nearest official EV charging: Nationalparkwelten Mittersill (2 × 120 kW fast chargers, 4 accelerated charging points).',
    planEyebrow: 'Plan live', planTitle: 'Departures, always up to date.', planText: 'Timetables change – so we link straight to the official planners.',
    planners: { svv: 'Salzburg Verkehr planner', svvApp: 'Salzburg Verkehr app', oebb: 'ÖBB Scotty' },
    checked: 'As of 5 November 2026 · official operator sources',
  },
};
