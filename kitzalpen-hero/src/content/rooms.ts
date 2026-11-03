import type { Lang } from './hero';

/**
 * Room categories exactly as published on kitzalpen.at/rooms/ (checked Nov 2026).
 * Each photo was matched pixel-for-pixel to the first image of that category's
 * gallery on the live site (double-01, triple-01, family-01, quad-01).
 */
export interface Room {
  id: string;            // photo file id in /images/rooms
  slug: string;          // live page /rooms/<slug>/
  w: number;
  h: number;
  sizes: number[];
  count: number;         // number of rooms of this category in the main house
  m2: string;
  guests: number;
  maxCombined?: number;  // family rooms: two connected = up to 8
  name: Record<Lang, string>;
  tagline: Record<Lang, string>;   // "Klassischer alpiner Komfort für zwei."
  idealFor: Record<Lang, string>;  // "Ideal für …"
  beds: Record<Lang, string>;
  alt: Record<Lang, string>;
}

export const ROOMS: Room[] = [
  {
    id: 'room-1', slug: 'double', w: 1024, h: 683, sizes: [800, 1024], count: 8, m2: '15–21', guests: 2,
    name: { de: 'Doppelzimmer', en: 'Double room' },
    tagline: { de: 'Klassischer alpiner Komfort für zwei.', en: 'Classic Alpine comfort for two.' },
    idealFor: { de: 'Paare und kurze Aufenthalte', en: 'Couples and short stays' },
    beds: { de: 'Doppelbett', en: 'Double bed' },
    alt: { de: 'Doppelzimmer mit türkisem Kopfteil, Holzwand und rotem Teppich', en: 'Double room with teal headboard, wooden wall and red carpet' },
  },
  {
    id: 'room-2', slug: 'triple', w: 1024, h: 683, sizes: [800, 1024], count: 3, m2: '17–24', guests: 3,
    name: { de: 'Dreibettzimmer', en: 'Triple room' },
    tagline: { de: 'Flexibler Komfort für drei Gäste.', en: 'Flexible comfort for three guests.' },
    idealFor: { de: 'Freunde und Eltern mit einem Kind', en: 'Friends and parents with one child' },
    beds: { de: 'Doppelbett + Einzelbett', en: 'Double bed + single bed' },
    alt: { de: 'Dreibettzimmer mit Doppelbett, Einzelbett und karierten Vorhängen', en: 'Triple room with double bed, single bed and checked curtains' },
  },
  {
    id: 'room-3', slug: 'family', w: 1600, h: 1066, sizes: [800, 1600], count: 4, m2: '19–31', guests: 4, maxCombined: 8,
    name: { de: 'Familienzimmer mit Verbindungstür', en: 'Family room with connecting door' },
    tagline: { de: 'Zwei Zimmer, die sich für große Familien und Gruppen verbinden lassen.', en: 'Two rooms that connect for large families and groups.' },
    idealFor: { de: 'Große Familien und Freundesgruppen', en: 'Large families and groups of friends' },
    beds: { de: 'Flexible Schlafaufteilung', en: 'Flexible sleeping layout' },
    alt: { de: 'Familienzimmer mit Holzvertäfelung, warmen Wandleuchten und Doppelbett', en: 'Family room with wood panelling, warm wall lamps and double bed' },
  },
  {
    id: 'room-4', slug: 'quad', w: 1024, h: 683, sizes: [800, 1024], count: 2, m2: '19–31', guests: 4,
    name: { de: 'Vierbettzimmer', en: 'Quadruple room' },
    tagline: { de: 'Geräumiges, eigenständiges Zimmer für vier Gäste.', en: 'Spacious, self-contained room for four guests.' },
    idealFor: { de: 'Familien zu viert und kleine Gruppen', en: 'Families of four and small groups' },
    beds: { de: 'Flexible Schlafaufteilung', en: 'Flexible sleeping layout' },
    alt: { de: 'Vierbettzimmer mit Doppelbett, Einzelbett und Schrankwand mit Fernseher', en: 'Quadruple room with double bed, single bed and wardrobe wall with TV' },
  },
];

export type FeatureIcon = 'bed' | 'alpine' | 'wifi' | 'breakfast';
export interface RoomFeature {
  icon: FeatureIcon;
  title: string;
  short: string;        // label for the compact mobile row
  /** Present when the claim is not (yet) confirmed on kitzalpen.at */
  verify?: string;
}

const SITE = 'https://www.kitzalpen.at';

/**
 * Feature check against kitzalpen.at:
 *  - every room page lists "Immer inklusive: … TV, WLAN, Eigenes Bad, Dusche"  → confirmed
 *  - a "Frühstücksbuffet" 08:00–10:00 is listed, but breakfast is NOT listed as
 *    included in the room rate → shown with a "zu bestätigen" marker.
 */
export const ROOMS_COPY = {
  de: {
    eyebrow: 'Unsere Zimmer',
    headline: 'Komfort & Alpencharme',
    sub: 'Gemütliche Zimmer mit viel Holz, modernen Details und alpenländischer Atmosphäre – perfekt zum Entspannen.',
    total: '17 Zimmer im Haupthaus · vier Kategorien',
    cta: 'Zimmer entdecken',
    ctaHref: `${SITE}/rooms/`,
    roomHref: (slug: string) => `${SITE}/rooms/${slug}/`,
    details: 'Details ansehen',
    features: [
      { icon: 'bed', title: 'Komfortable Zimmer', short: 'Komfortable Zimmer' },
      { icon: 'alpine', title: 'Alpenstil & Wohlfühlambiente', short: 'Alpenstil' },
      { icon: 'wifi', title: 'Kostenloses WLAN', short: 'WLAN' },
      { icon: 'breakfast', title: 'Frühstück inklusive', short: 'Frühstück inklusive', verify: 'zu bestätigen' },
    ] as RoomFeature[],
    rooms: (n: number) => (n === 1 ? '1 Zimmer' : `${n} Zimmer`),
    guests: (n: number) => `bis ${n} Gäste`,
    combined: (n: number) => `verbunden bis ${n} Gäste`,
    ideal: 'Ideal für',
    inclusive: 'Inklusive: TV, WLAN, eigenes Bad mit Dusche',
    gallery: 'Zimmerkategorien',
    photo: (i: number, n: number, name: string) => `${name}, ${i} von ${n}`,
    prev: 'Vorheriges Zimmer',
    next: 'Nächstes Zimmer',
    open: 'Foto vergrößern',
    close: 'Schließen',
    view: 'Ansehen',
    swipe: 'Wischen zum Blättern',
    thumbs: 'Weitere Zimmer',
  },
  en: {
    eyebrow: 'Our rooms',
    headline: 'Comfort & Alpine charm',
    sub: 'Cosy rooms with plenty of wood, modern details and an Alpine atmosphere – made for unwinding.',
    total: '17 rooms in the main house · four categories',
    cta: 'Explore the rooms',
    ctaHref: `${SITE}/en/rooms/`,
    roomHref: (slug: string) => `${SITE}/en/rooms/${slug}/`,
    details: 'View details',
    features: [
      { icon: 'bed', title: 'Comfortable rooms', short: 'Comfortable rooms' },
      { icon: 'alpine', title: 'Alpine style & cosy feel', short: 'Alpine style' },
      { icon: 'wifi', title: 'Free Wi-Fi', short: 'Wi-Fi' },
      { icon: 'breakfast', title: 'Breakfast included', short: 'Breakfast included', verify: 'to be confirmed' },
    ] as RoomFeature[],
    rooms: (n: number) => (n === 1 ? '1 room' : `${n} rooms`),
    guests: (n: number) => `up to ${n} guests`,
    combined: (n: number) => `connected up to ${n} guests`,
    ideal: 'Ideal for',
    inclusive: 'Included: TV, Wi-Fi, private bathroom with shower',
    gallery: 'Room categories',
    photo: (i: number, n: number, name: string) => `${name}, ${i} of ${n}`,
    prev: 'Previous room',
    next: 'Next room',
    open: 'Enlarge photo',
    close: 'Close',
    view: 'View',
    swipe: 'Swipe to browse',
    thumbs: 'More rooms',
  },
};
export type RoomsCopy = (typeof ROOMS_COPY)['de'];
