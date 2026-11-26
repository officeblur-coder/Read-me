import type { Lang } from './hero';

/**
 * Frequently asked questions (#faq, live: /faq/). Every answer repeats a fact the site already publishes
 * (amenities, rooms, restaurant, arrival, ski and group pages). Nothing new or estimated.
 * The other six languages run through the dictionary (keys = the English strings).
 */
type T = Record<Lang, string>;
export interface Faq { q: T; a: T; more?: { href: string; label: T } }
export interface FaqGroup { id: string; title: T; items: Faq[] }

export const FAQ: FaqGroup[] = [
  {
    id: 'location', title: { de: 'Lage & Anreise', en: 'Location & arrival' },
    items: [
      { q: { de: 'Wo liegt KitzAlpen?', en: 'Where is KitzAlpen?' },
        a: { de: 'In Hollersbach im Pinzgau im Salzburger Land, Reitlehen 42, 5731 Hollersbach – in der Region des Nationalparks Hohe Tauern.', en: 'In Hollersbach im Pinzgau in the province of Salzburg, Reitlehen 42, 5731 Hollersbach – in the Hohe Tauern National Park region.' },
        more: { href: '#contact', label: { de: 'Kontakt & Route', en: 'Contact & directions' } } },
      { q: { de: 'Wie weit ist es zum Skigebiet KitzSki?', en: 'How far is it to the KitzSki ski area?' },
        a: { de: 'Rund 2 km – etwa fünf Minuten bis zur Panoramabahn Kitzbüheler Alpen, die direkt ins Skigebiet KitzSki führt.', en: 'About 2 km – roughly five minutes to the Panoramabahn Kitzbüheler Alpen gondola, which goes straight into the KitzSki ski area.' },
        more: { href: '#ski', label: { de: 'Skigebiete & Skipässe', en: 'Ski areas & passes' } } },
      { q: { de: 'Kann ich mit Bus und Bahn anreisen?', en: 'Can I travel by bus and train?' },
        a: { de: 'Ja. Jeder Übernachtungsgast im Land Salzburg erhält beim Check-in das Guest Mobility Ticket: alle Busse und Züge im Land Salzburg sind damit inklusive.', en: 'Yes. Every overnight guest in the province of Salzburg receives the Guest Mobility Ticket at check-in: all buses and trains in the province are included.' },
        more: { href: '#arrival', label: { de: 'Anreise & Mobilität', en: 'Arrival & mobility' } } },
      { q: { de: 'Gibt es Parkplätze?', en: 'Is there parking?' },
        a: { de: 'Ja, der Parkplatz am Haus ist kostenlos.', en: 'Yes, parking at the house is free.' } },
    ],
  },
  {
    id: 'rooms', title: { de: 'Zimmer & Chalet', en: 'Rooms & chalet' },
    items: [
      { q: { de: 'Welche Zimmer gibt es in der Pension?', en: 'What rooms does the guesthouse have?' },
        a: { de: '17 Zimmer in vier Kategorien: Doppelzimmer für 2, Dreibettzimmer für 3, Familienzimmer mit Verbindungstür für 4 und Vierbettzimmer für 4 Gäste.', en: '17 rooms in four categories: double rooms for 2, triple rooms for 3, family rooms with connecting door for 4 and four-bed rooms for 4 guests.' },
        more: { href: '#all-rooms', label: { de: 'Alle Zimmer', en: 'All rooms' } } },
      { q: { de: 'Haben alle Zimmer ein eigenes Bad?', en: 'Do all rooms have a private bathroom?' },
        a: { de: 'Ja, jedes Zimmer hat ein eigenes Badezimmer mit Dusche.', en: 'Yes, every room has its own bathroom with shower.' } },
      { q: { de: 'Für wie viele Personen ist das Chalet?', en: 'How many people does the chalet sleep?' },
        a: { de: 'Das Chalet ist ein eigenständiges Haus für bis zu 4 Gäste, mit 2 Schlafzimmern, voll ausgestatteter Küche und Bad mit WC.', en: 'The chalet is a self-contained house for up to 4 guests, with 2 bedrooms, a fully equipped kitchen and a bathroom with WC.' },
        more: { href: '#chalet', label: { de: 'Das Chalet', en: 'The chalet' } } },
      { q: { de: 'Ist KitzAlpen für Familien und Gruppen geeignet?', en: 'Is KitzAlpen suitable for families and groups?' },
        a: { de: 'Ja. Die Familienzimmer lassen sich über eine Verbindungstür für bis zu 8 Gäste verbinden. Gruppen erhalten ein Angebot mit Gruppenrabatt je nach Gruppe.', en: 'Yes. The family rooms connect through a door for up to 8 guests. Groups receive an offer with a group discount depending on the group.' },
        more: { href: '#groups', label: { de: 'Gruppenanfrage', en: 'Group request' } } },
    ],
  },
  {
    id: 'food', title: { de: 'Restaurant & Ausstattung', en: 'Restaurant & amenities' },
    items: [
      { q: { de: 'Wann gibt es Frühstück?', en: 'When is breakfast served?' },
        a: { de: 'Das Frühstücksbuffet gibt es täglich von 08:00 bis 10:00 Uhr.', en: 'The breakfast buffet is served daily from 8 to 10 am.' } },
      { q: { de: 'Gibt es Abendessen?', en: 'Is dinner available?' },
        a: { de: 'Ja, das Restaurant bietet Abendessen von Dienstag bis Sonntag, 17 bis 21 Uhr.', en: 'Yes, the restaurant serves dinner Tuesday to Sunday, 5 to 9 pm (17:00–21:00).' },
        more: { href: '#restaurant', label: { de: 'Restaurant & Bar', en: 'Restaurant & bar' } } },
      { q: { de: 'Gibt es WLAN?', en: 'Is there Wi-Fi?' },
        a: { de: 'Ja, WLAN ist kostenlos.', en: 'Yes, Wi-Fi is free.' } },
      { q: { de: 'Wo kann ich Ski und Skischuhe lassen?', en: 'Where can I keep skis and ski boots?' },
        a: { de: 'Im Skiraum der Pension, mit Schuhtrocknern für die Skischuhe.', en: 'In the guesthouse ski room, with dryers for ski boots.' } },
      { q: { de: 'Was ist die M+ Gästekarte?', en: 'What is the M+ Guest Card?' },
        a: { de: 'Die Gästekarte der Region Mittersill, die Gäste von KitzAlpen erhalten. Die aktuellen Vorteile stehen auf der offiziellen Seite von Mittersill.', en: 'The guest card of the Mittersill region, which KitzAlpen guests receive. The current benefits are listed on the official Mittersill website.' },
        more: { href: 'https://www.mittersill.info/en/offer/m-guest-card.html', label: { de: 'M+ Gästekarte (offiziell)', en: 'M+ Guest Card (official)' } } },
    ],
  },
  {
    id: 'booking', title: { de: 'Buchung & Kontakt', en: 'Booking & contact' },
    items: [
      { q: { de: 'Wie kann ich buchen?', en: 'How can I book?' },
        a: { de: 'Direkt online über unser Buchungssystem – für die Zimmer und das Chalet getrennt – oder per WhatsApp, Telefon oder E-Mail.', en: 'Directly online through our booking system – separately for the rooms and the chalet – or by WhatsApp, phone or email.' },
        more: { href: '#contact', label: { de: 'Kontakt', en: 'Contact' } } },
      { q: { de: 'Wie erreiche ich KitzAlpen?', en: 'How do I reach KitzAlpen?' },
        a: { de: 'Telefon und WhatsApp: +43 664 2376571 · E-Mail: kitzbuhelalpenpension@gmail.com', en: 'Phone and WhatsApp: +43 664 2376571 · Email: kitzbuhelalpenpension@gmail.com' } },
      { q: { de: 'Was kann man in der Umgebung erleben?', en: 'What is there to do in the area?' },
        a: { de: 'Im Winter Skigebiete, Winterwandern, Langlauf, Rodeln und Schneeschuhtouren; im Sommer Wandern, Rad- und Mountainbike-Touren, Seen und Wasserfälle – mit Entfernungen ab dem Haus in unseren Guides.', en: 'In winter ski areas, winter walks, cross-country skiing, tobogganing and snowshoe tours; in summer hiking, cycling and mountain-bike tours, lakes and waterfalls – with distances from the house in our guides.' },
        more: { href: '#experiences', label: { de: 'Top 15 Erlebnisse', en: 'Top 15 experiences' } } },
    ],
  },
];

export const FAQ_COPY = {
  de: { eyebrow: 'Häufige Fragen', title: ['Gut zu wissen.', 'Kurz beantwortet.'], sub: 'Die wichtigsten Antworten zu Lage, Zimmern, Chalet, Restaurant und Buchung – auf einen Blick.', more: 'Mehr', ask: 'Ihre Frage ist nicht dabei?', askCta: 'Schreiben Sie uns' },
  en: { eyebrow: 'Frequently asked questions', title: ['Good to know.', 'Answered in short.'], sub: 'The key answers about location, rooms, chalet, restaurant and booking – at a glance.', more: 'More', ask: 'Your question is not here?', askCta: 'Write to us' },
};
