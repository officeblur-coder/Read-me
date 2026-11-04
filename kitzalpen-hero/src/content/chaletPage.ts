import type { Lang } from './hero';

/**
 * Chalet page (preview route #chalet; live: /chalet/).
 * Facts as published on kitzalpen.at/chalet/ (checked Nov 2026):
 *  - "Eigenständiges Chalet für bis zu 4 Gäste", "warmes und einladendes alpines Refugium", Dorf Hollersbach im Pinzgau
 *  - Doppelschlafzimmer im Erdgeschoss · Hauptschlafzimmer mit Doppelbett und Etagenbett
 *  - Voll ausgestattete Küche · Badezimmer mit WC · Gemütlicher Wohnbereich
 *  - booking: chalet-kitzalpen.pynbooking.direct · "Wir melden uns innerhalb eines Arbeitstags mit einem passenden Angebot."
 * Photos: the chalet gallery on kitzalpen.at (/images/chalet-curated/…).
 */
export interface CPic { name: string; w: number; h: number; sizes: number[]; alt: Record<Lang, string> }
const P = (name: string, w: number, h: number, sizes: number[], de: string, en: string): CPic => ({ name, w, h, sizes, alt: { de, en } });

export const CP = {
  ext1: P('exterior-01', 994, 768, [640, 994], 'Chalet-Fassade aus Altholz mit Blumenkästen, Thujen und Bergblick', 'Reclaimed-wood chalet façade with flower boxes, thujas and mountain view'),
  ext2: P('exterior-02', 1024, 683, [640, 1024], 'Überdachter Sitzplatz aus Holz mit Tisch, Fellen und Blumen', 'Covered wooden seating area with table, sheepskins and flowers'),
  ext3: P('exterior-03', 1024, 683, [640, 1024], 'Das Chalet am Abend, mit Lichterketten und Tannenbäumchen beleuchtet', 'The chalet in the evening, lit with fairy lights and small fir trees'),
  int1: P('interior-01', 994, 768, [640, 994], 'Wohnraum mit Bett, Essplatz, Kachelofen und Dachfenster unter Holzbalken', 'Living space with bed, dining table, tiled stove and skylight under timber beams'),
  int2: P('interior-02', 994, 768, [640, 994], 'Offener Wohnbereich mit Küche, Essplatz, Kachelofen und Sessel', 'Open living area with kitchen, dining table, tiled stove and armchair'),
  int3: P('interior-03', 994, 768, [640, 994], 'Etagenbett aus Altholz mit warmer Beleuchtung', 'Reclaimed-wood bunk bed in warm light'),
  int4: P('interior-04', 994, 768, [640, 994], 'Hauptschlafzimmer am Abend mit Doppelbett, Etagenbett und Sitzecke', 'Main bedroom in the evening with double bed, bunk bed and seating corner'),
  int6: P('interior-06', 1024, 768, [640, 1024], 'Küche mit Essplatz für vier und Holzfronten', 'Kitchen with dining table for four and wooden fronts'),
  int7: P('interior-07', 994, 768, [640, 994], 'Doppelbett aus Altholz mit Wolldecke und Handtüchern', 'Reclaimed-wood double bed with wool throw and towels'),
  int8: P('interior-08', 1024, 768, [640, 1024], 'Blick über Essplatz und Doppelbett bis zur Küche', 'View across the dining table and double bed to the kitchen'),
  bath1: P('baie-01', 576, 768, [480, 576], 'Waschbecken mit Altholzspiegel und Dusche', 'Washbasin with reclaimed-wood mirror and shower'),
  bath2: P('baie-02', 994, 768, [640, 994], 'Badezimmer mit Badewanne, WC und Waschbecken', 'Bathroom with bathtub, WC and washbasin'),
  d1: P('detalii-01', 576, 768, [480, 576], 'Heller Sessel am Fenster', 'Light armchair by the window'),
  d3: P('detalii-03', 576, 768, [480, 576], 'Alte Holzski als Wanddekoration', 'Old wooden skis as wall decoration'),
  d4: P('detalii-04', 576, 768, [480, 576], 'Kuhglocke unter dem Holzdach', 'Cowbell under the wooden roof'),
  d5: P('detalii-05', 576, 768, [480, 576], 'Alte Schlittschuhe im Holzrahmen', 'Vintage ice skates in a wooden frame'),
  d6: P('detalii-06', 576, 768, [480, 576], 'Laterne mit Sternen und Winterdekoration', 'Lantern with stars and winter decoration'),
  d8: P('detalii-08', 576, 768, [480, 576], 'Kochfeld und Backofen in der Küche', 'Hob and oven in the kitchen'),
  d9: P('detalii-09', 576, 768, [480, 576], 'Großer Kühlschrank in der Küche', 'Large fridge in the kitchen'),
};
export const CHALET_ALL: CPic[] = [CP.ext3, CP.ext1, CP.ext2, CP.int2, CP.int8, CP.int1, CP.int4, CP.int7, CP.int3, CP.int6, CP.d8, CP.d9, CP.bath2, CP.bath1, CP.d1, CP.d3, CP.d4, CP.d5, CP.d6];

export const CHALET_BOOKING = 'https://chalet-kitzalpen.pynbooking.direct/';
export const CHALET_MAPS = 'https://maps.app.goo.gl/EfXXFEyuBKU49ENV8';
const SITE = 'https://www.kitzalpen.at';

export const CHALET_PAGE = {
  de: {
    eyebrow: 'KitzAlpen Chalet · Hollersbach im Pinzgau',
    title: ['Ihr privates', 'Alpenrefugium.'],
    sub: 'Eigenständiges Chalet für bis zu 4 Gäste – im Dorf Hollersbach im Pinzgau.',
    chips: ['Bis zu 4 Gäste', '2 Schlafzimmer', 'Voll ausgestattete Küche', 'Bad mit WC'],
    book: 'Chalet buchen', inquiry: 'Anfrage senden', contactHref: `${SITE}/contact/`,
    scroll: 'Entdecken',
    introEyebrow: 'Das Chalet',
    intro: 'Ein warmes und einladendes alpines Refugium.',
    introText: 'Altholz, warmes Licht und viel Liebe zum Detail. Das Chalet steht für sich – mit eigener Küche, eigenem Bad und Platz für bis zu vier Gäste.',
    facts: [
      { icon: 'guests', k: 'Gäste', v: 'bis zu 4' },
      { icon: 'beds', k: 'Schlafen', v: 'Doppelbett · Doppelbett & Etagenbett' },
      { icon: 'kitchen', k: 'Küche', v: 'voll ausgestattet' },
      { icon: 'bath', k: 'Bad', v: 'Badezimmer mit WC' },
      { icon: 'living', k: 'Wohnen', v: 'gemütlicher Wohnbereich' },
    ],
    roomsEyebrow: 'Raum für Raum',
    roomsTitle: 'Ein Zuhause auf Zeit.',
    chapters: [
      { n: '01', label: 'Wohnen', title: 'Gemütlich ankommen.', text: 'Ein gemütlicher Wohnbereich mit Essplatz – der Mittelpunkt des Chalets.' },
      { n: '02', label: 'Schlafen', title: 'Ruhig schlafen.', text: 'Ein Doppelschlafzimmer im Erdgeschoss und ein Hauptschlafzimmer mit Doppelbett und Etagenbett.' },
      { n: '03', label: 'Küche', title: 'Selbst kochen.', text: 'Eine voll ausgestattete Küche – für ein ruhiges Frühstück oder das Abendessen nach einem langen Tag in den Bergen.' },
      { n: '04', label: 'Bad', title: 'Frisch in den Tag.', text: 'Ein modernes Badezimmer mit WC.' },
    ],
    detailsEyebrow: 'Liebe zum Detail',
    detailsTitle: 'Kleine Dinge, die bleiben.',
    outEyebrow: 'Draußen',
    outTitle: 'Vom Morgen bis in den Abend.',
    outText: 'Altholz, Blumen und Bergblick am Tag – Lichterketten am Abend.',
    all: (n: number) => `Alle ${n} Fotos ansehen`,
    finalTitle: 'Bereit für Ihr eigenes Chalet in den Alpen?',
    finalText: 'Buchen Sie direkt online oder senden Sie uns eine Anfrage – wir melden uns innerhalb eines Arbeitstags mit einem passenden Angebot.',
    address: 'Reitlehen 42 · 5731 Hollersbach im Pinzgau',
    route: 'Anfahrt planen',
    close: 'Schließen', prev: 'Vorheriges Foto', next: 'Nächstes Foto',
    open: (i: number) => `Foto ${i} vergrößern`,
  },
  en: {
    eyebrow: 'KitzAlpen Chalet · Hollersbach im Pinzgau',
    title: ['Your private', 'alpine retreat.'],
    sub: 'A self-contained chalet for up to 4 guests – in the village of Hollersbach im Pinzgau.',
    chips: ['Up to 4 guests', '2 bedrooms', 'Fully equipped kitchen', 'Bathroom with WC'],
    book: 'Book the chalet', inquiry: 'Send an inquiry', contactHref: `${SITE}/en/contact/`,
    scroll: 'Discover',
    introEyebrow: 'The chalet',
    intro: 'A warm and inviting alpine refuge.',
    introText: 'Reclaimed wood, warm light and a lot of love for detail. The chalet stands on its own – with its own kitchen, its own bathroom and room for up to four guests.',
    facts: [
      { icon: 'guests', k: 'Guests', v: 'up to 4' },
      { icon: 'beds', k: 'Sleeping', v: 'double bed · double bed & bunk bed' },
      { icon: 'kitchen', k: 'Kitchen', v: 'fully equipped' },
      { icon: 'bath', k: 'Bathroom', v: 'bathroom with WC' },
      { icon: 'living', k: 'Living', v: 'cosy living area' },
    ],
    roomsEyebrow: 'Room by room',
    roomsTitle: 'A home for a while.',
    chapters: [
      { n: '01', label: 'Living', title: 'Settle in.', text: 'A cosy living area with a dining table – the heart of the chalet.' },
      { n: '02', label: 'Sleeping', title: 'Sleep soundly.', text: 'A double bedroom on the ground floor and a main bedroom with a double bed and a bunk bed.' },
      { n: '03', label: 'Kitchen', title: 'Cook your own.', text: 'A fully equipped kitchen – for a slow breakfast or dinner after a long day in the mountains.' },
      { n: '04', label: 'Bathroom', title: 'Fresh into the day.', text: 'A modern bathroom with WC.' },
    ],
    detailsEyebrow: 'Love for detail',
    detailsTitle: 'Little things that stay with you.',
    outEyebrow: 'Outside',
    outTitle: 'From morning into the evening.',
    outText: 'Reclaimed wood, flowers and mountain views by day – fairy lights in the evening.',
    all: (n: number) => `View all ${n} photos`,
    finalTitle: 'Ready for your own chalet in the Alps?',
    finalText: 'Book directly online or send us an inquiry – we will get back to you within one working day with a suitable offer.',
    address: 'Reitlehen 42 · 5731 Hollersbach im Pinzgau',
    route: 'Plan your route',
    close: 'Close', prev: 'Previous photo', next: 'Next photo',
    open: (i: number) => `Enlarge photo ${i}`,
  },
};
/** photos per chapter: [main, inset] */
export const CHAPTER_PICS: [CPic, CPic][] = [[CP.int2, CP.int8], [CP.int4, CP.int3], [CP.int6, CP.d8], [CP.bath2, CP.bath1]];
export const DETAIL_PICS: CPic[] = [CP.d4, CP.d1, CP.d5, CP.d3, CP.d6, CP.d9, CP.int7];
