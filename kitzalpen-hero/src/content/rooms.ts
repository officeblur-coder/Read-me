import type { Lang } from './hero';

export interface RoomPhoto {
  id: string;
  w: number;
  h: number;
  sizes: number[];
  /** Describes only what is visible. No room category is assigned until confirmed. */
  alt: Record<Lang, string>;
}

/** The four original room photographs supplied by KitzAlpen. */
export const ROOM_PHOTOS: RoomPhoto[] = [
  { id: 'room-1', w: 1024, h: 683, sizes: [800, 1024], alt: {
    de: 'Zimmer mit Doppelbett, türkisem Kopfteil, Holzwand mit Baumscheiben-Bild und rotem Teppich',
    en: 'Room with double bed, teal headboard, wooden wall with a log-slice picture and red carpet' } },
  { id: 'room-2', w: 1024, h: 683, sizes: [800, 1024], alt: {
    de: 'Helles Zimmer mit Doppelbett, zusätzlichem Bett, karierten Vorhängen und Holztisch',
    en: 'Bright room with double bed, extra bed, checked curtains and a wooden desk' } },
  { id: 'room-3', w: 1600, h: 1066, sizes: [800, 1600], alt: {
    de: 'Zimmer mit Holzvertäfelung, warmen Wandleuchten, Doppelbett und Schreibtisch am Fenster',
    en: 'Wood-panelled room with warm wall lamps, double bed and a desk by the window' } },
  { id: 'room-4', w: 1024, h: 683, sizes: [800, 1024], alt: {
    de: 'Geräumiges Zimmer mit Doppelbett, Einzelbett, Holztüren und Schrankwand mit Fernseher',
    en: 'Spacious room with double bed, single bed, wooden doors and a wardrobe wall with TV' } },
];

export type FeatureIcon = 'bed' | 'alpine' | 'wifi' | 'breakfast';
export interface RoomFeature {
  icon: FeatureIcon;
  title: string;
  text: string;
  /** true = not yet confirmed by kitzalpen.at – shown with a "to confirm" marker */
  verify?: string;
}

/**
 * Checked against kitzalpen.at (Startseite + /rooms/), Nov 2026:
 *  - "Kostenloses WLAN", "Eigenes Badezimmer", "Flachbild-TV", "Bergblick" are listed.
 *  - "Frühstücksbuffet" 08:00–10:00 is listed – whether it is INCLUDED in the rate is not stated.
 */
export const ROOMS_COPY = {
  de: {
    eyebrow: 'Unsere Zimmer',
    headline: ['Komfort &', 'Alpencharme'],
    sub: 'Gemütliche Zimmer mit viel Holz, modernen Details und alpenländischer Atmosphäre – perfekt zum Entspannen.',
    cta: 'Zimmer entdecken',
    ctaHref: 'https://www.kitzalpen.at/rooms/',
    features: [
      { icon: 'bed', title: 'Komfortable Zimmer', text: 'Eigenes Bad, Flachbild-TV und Bergblick.' },
      { icon: 'alpine', title: 'Alpenstil & Wohlfühlambiente', text: 'Viel Holz, warme Stoffe und alpenländische Details.' },
      { icon: 'wifi', title: 'Kostenloses WLAN', text: 'Kostenfrei für alle Gäste.' },
      { icon: 'breakfast', title: 'Frühstück inklusive', text: 'Frühstücksbuffet im Haus, 08:00 – 10:00 Uhr.', verify: 'Inklusive – zu bestätigen' },
    ] as RoomFeature[],
    gallery: 'Zimmergalerie',
    photo: (i: number, n: number) => `Foto ${i} von ${n}`,
    prev: 'Vorheriges Foto',
    next: 'Nächstes Foto',
    open: 'Foto vergrößern',
    close: 'Schließen',
    view: 'Ansehen',
    swipe: 'Wischen zum Blättern',
    thumbs: 'Fotoauswahl',
  },
  en: {
    eyebrow: 'Our rooms',
    headline: ['Comfort &', 'Alpine charm'],
    sub: 'Cosy rooms with plenty of wood, modern details and an Alpine atmosphere – made for unwinding.',
    cta: 'Explore the rooms',
    ctaHref: 'https://www.kitzalpen.at/en/rooms/',
    features: [
      { icon: 'bed', title: 'Comfortable rooms', text: 'Private bathroom, flat-screen TV and mountain views.' },
      { icon: 'alpine', title: 'Alpine style & cosy feel', text: 'Lots of wood, warm fabrics and Alpine details.' },
      { icon: 'wifi', title: 'Free Wi-Fi', text: 'Free of charge for all guests.' },
      { icon: 'breakfast', title: 'Breakfast included', text: 'Breakfast buffet in the house, 08:00 – 10:00.', verify: 'Included – to be confirmed' },
    ] as RoomFeature[],
    gallery: 'Room gallery',
    photo: (i: number, n: number) => `Photo ${i} of ${n}`,
    prev: 'Previous photo',
    next: 'Next photo',
    open: 'Enlarge photo',
    close: 'Close',
    view: 'View',
    swipe: 'Swipe to browse',
    thumbs: 'Choose photo',
  },
};
export type RoomsCopy = (typeof ROOMS_COPY)['de'];
