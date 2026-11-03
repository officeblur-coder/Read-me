import type { Lang } from './hero';

export interface ChaletPhoto {
  id: string;
  w: number;
  h: number;
  sizes: number[];
  label: Record<Lang, string>;
  alt: Record<Lang, string>;
}

/**
 * winter + summer: exterior photos supplied by KitzAlpen.
 * bunk: interior-03 from the chalet gallery on kitzalpen.at (the bunk-bed room),
 * added as third photo so the gallery also shows the inside.
 */
export const CHALET_PHOTOS: ChaletPhoto[] = [
  { id: 'winter', w: 1536, h: 1024, sizes: [800, 1536],
    label: { de: 'Winter', en: 'Winter' },
    alt: { de: 'KitzAlpen Chalet im Winter, verschneit und mit Lichterketten beleuchtet', en: 'KitzAlpen Chalet in winter, snow-covered and lit with fairy lights' } },
  { id: 'summer', w: 1440, h: 1080, sizes: [800, 1440],
    label: { de: 'Sommer', en: 'Summer' },
    alt: { de: 'KitzAlpen Chalet im Sommer mit Terrasse, Rasen und Wald im Hintergrund', en: 'KitzAlpen Chalet in summer with terrace, lawn and forest behind' } },
  { id: 'bunk', w: 994, h: 768, sizes: [800, 994],
    label: { de: 'Schlafzimmer', en: 'Bedroom' },
    alt: { de: 'Schlafzimmer im Chalet mit Etagenbett aus Altholz', en: 'Chalet bedroom with a reclaimed-wood bunk bed' } },
];

export type ChaletIcon = 'guests' | 'kitchen' | 'bath' | 'living' | 'beds';

/** All facts as published on kitzalpen.at/chalet/ (Nov 2026): "bis zu 4 Gäste" and the amenity list. */
export const CHALET_COPY = {
  de: {
    eyebrow: 'KitzAlpen Chalet',
    headline: ['Ihr privates', 'Alpenrefugium'],
    sub: 'Gemütliches Chalet für bis zu 4 Personen in Hollersbach im Pinzgau – ideal für Familien oder kleine Gruppen.',
    features: [
      { icon: 'guests', label: 'Bis zu 4 Personen' },
      { icon: 'kitchen', label: 'Voll ausgestattete Küche' },
      { icon: 'bath', label: 'Badezimmer mit WC' },
      { icon: 'living', label: 'Gemütlicher Wohnbereich' },
      { icon: 'beds', label: 'Doppelbett & Stockbett' },
    ] as { icon: ChaletIcon; label: string }[],
    cta: 'Mehr Details',
    ctaHref: 'https://www.kitzalpen.at/chalet/',
    season: { summer: 'Sommer', winter: 'Winter' },
    scrollHint: 'Scrollen: vom Sommer in den Winter',
    gallery: 'Chalet-Galerie',
    prev: 'Vorheriges Foto',
    next: 'Nächstes Foto',
    open: 'Foto vergrößern',
    close: 'Schließen',
    view: 'Ansehen',
    photo: (i: number, n: number, l: string) => `${l}, Foto ${i} von ${n}`,
    swipe: 'Wischen zum Blättern',
    thumbs: 'Weitere Fotos',
  },
  en: {
    eyebrow: 'KitzAlpen Chalet',
    headline: ['Your private', 'Alpine retreat'],
    sub: 'A cosy chalet for up to 4 people in Hollersbach im Pinzgau – ideal for families or small groups.',
    features: [
      { icon: 'guests', label: 'Up to 4 people' },
      { icon: 'kitchen', label: 'Fully equipped kitchen' },
      { icon: 'bath', label: 'Bathroom with WC' },
      { icon: 'living', label: 'Cosy living area' },
      { icon: 'beds', label: 'Double bed & bunk bed' },
    ] as { icon: ChaletIcon; label: string }[],
    cta: 'More details',
    ctaHref: 'https://www.kitzalpen.at/en/chalet/',
    season: { summer: 'Summer', winter: 'Winter' },
    scrollHint: 'Scroll: from summer into winter',
    gallery: 'Chalet gallery',
    prev: 'Previous photo',
    next: 'Next photo',
    open: 'Enlarge photo',
    close: 'Close',
    view: 'View',
    photo: (i: number, n: number, l: string) => `${l}, photo ${i} of ${n}`,
    swipe: 'Swipe to browse',
    thumbs: 'More photos',
  },
};
export type ChaletCopy = (typeof CHALET_COPY)['de'];
