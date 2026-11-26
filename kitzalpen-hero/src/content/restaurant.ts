import type { Lang } from './hero';

export interface RestPhoto { id: string; w: number; h: number; label: Record<Lang, string>; alt: Record<Lang, string> }

/** Four real photos supplied by KitzAlpen (restaurant hall, bar, window corner, bar lounge). */
export const REST_PHOTOS: RestPhoto[] = [
  { id: 'hall', w: 1600, h: 1066, label: { de: 'Gaststube', en: 'Dining room' },
    alt: { de: 'Die Gaststube am Abend mit Korblampen, karierten Tischläufern und türkisen Sitzbänken', en: 'The dining room in the evening with wicker lamps, checked table runners and teal benches' } },
  { id: 'bar', w: 1600, h: 1066, label: { de: 'Bar', en: 'Bar' },
    alt: { de: 'Die Bar mit Kachelofen, hängenden Gläsern und Hockern mit Fell', en: 'The bar with tiled stove, hanging glasses and sheepskin stools' } },
  { id: 'corner', w: 1600, h: 1066, label: { de: 'Fensterecke', en: 'Window corner' },
    alt: { de: 'Für das Abendessen gedeckter Ecktisch mit Weingläsern vor dem Bergsee-Bild', en: 'Corner table laid for dinner with wine glasses in front of the mountain-lake mural' } },
  { id: 'lounge', w: 1600, h: 1066, label: { de: 'Barstube', en: 'Bar room' },
    alt: { de: 'Die Barstube mit Holzbank, Kachelofen und Theke im warmen Licht', en: 'The bar room with wooden bench, tiled stove and counter in warm light' } },
];

export type RestIcon = 'breakfast' | 'regional' | 'cosy' | 'bar';

/**
 * Facts from kitzalpen.at/restaurant/ (Nov 2026): Frühstück 08:00–10:00,
 * Abendessen 17:00–21:00, Dienstag–Sonntag, montags geschlossen;
 * reichhaltiges Frühstücksbuffet, schwedisches Abendbuffet; menu = /menu/kitzalpen-menu.pdf
 */
export const REST_COPY = {
  de: {
    eyebrow: 'Unser Restaurant',
    headline: ['Regionale Genüsse', 'in gemütlicher', 'Atmosphäre'],
    sub: 'Hausgemachte Spezialitäten, Pinzgauer Gastfreundschaft und ein Ambiente zum Wohlfühlen – vom reichhaltigen Frühstück bis zum genussvollen Abendessen.',
    cta: 'Speisekarte entdecken',
    ctaNote: 'PDF',
    highlights: [
      { icon: 'breakfast', label: 'Reichhaltiges Frühstück' },
      { icon: 'regional', label: 'Regionale Spezialitäten' },
      { icon: 'cosy', label: 'Gemütliche Atmosphäre' },
      { icon: 'bar', label: 'Restaurant & Bar' },
    ] as { icon: RestIcon; label: string }[],
    hoursTitle: 'Öffnungszeiten',
    hours: [['Frühstück', '08:00 – 10:00'], ['Abendessen', '17:00 – 21:00']] as [string, string][],
    days: 'Dienstag – Sonntag',
    closed: 'Montag Ruhetag',
    gallery: 'Restaurant-Galerie', prev: 'Vorheriges Foto', next: 'Nächstes Foto', open: 'Foto vergrößern', close: 'Schließen', view: 'Ansehen',
    photo: (i: number, n: number, l: string) => `${l}, Foto ${i} von ${n}`, swipe: 'Wischen zum Blättern', thumbs: 'Weitere Fotos',
  },
  en: {
    eyebrow: 'Our restaurant',
    headline: ['Regional flavours', 'in a cosy', 'atmosphere'],
    sub: 'Home-made specialities, Pinzgau hospitality and a place to feel at home – from a generous breakfast to a relaxed dinner.',
    cta: 'Explore the menu',
    ctaNote: 'PDF',
    highlights: [
      { icon: 'breakfast', label: 'Generous breakfast' },
      { icon: 'regional', label: 'Regional specialities' },
      { icon: 'cosy', label: 'Cosy atmosphere' },
      { icon: 'bar', label: 'Restaurant & Bar' },
    ] as { icon: RestIcon; label: string }[],
    hoursTitle: 'Opening hours',
    hours: [['Breakfast', '08:00 – 10:00'], ['Dinner', '17:00 – 21:00']] as [string, string][],
    days: 'Tuesday – Sunday',
    closed: 'Closed on Mondays',
    gallery: 'Restaurant gallery', prev: 'Previous photo', next: 'Next photo', open: 'Enlarge photo', close: 'Close', view: 'View',
    photo: (i: number, n: number, l: string) => `${l}, photo ${i} of ${n}`, swipe: 'Swipe to browse', thumbs: 'More photos',
  },
};
export type RestCopy = (typeof REST_COPY)['de'];
export const MENU_PDF = 'https://www.kitzalpen.at/menu/kitzalpen-menu.pdf';
