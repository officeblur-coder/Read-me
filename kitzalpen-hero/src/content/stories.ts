import type { Lang } from './hero';

/**
 * The three guest reviews published on kitzalpen.at (homepage, "Was unsere Gäste sagen"),
 * copied verbatim (German originals), each shown there with 5 stars and its platform.
 * No direct links to the individual reviews are published, so none are invented.
 */
export interface Story { id: string; quote: string; author: string; platform: 'Google' | 'Booking.com' | 'Tripadvisor'; stars: number; photo: string; photoAlt: Record<Lang, string> }

export const STORIES: Story[] = [
  { id: 'maria', author: 'Maria S.', platform: 'Google', stars: 5, photo: 'double-room',
    quote: 'Ein wunderbarer alpiner Rückzugsort! Die Zimmer waren makellos, das Frühstück war köstlich und das Personal hat uns das Gefühl gegeben, zu Hause zu sein.',
    photoAlt: { de: 'Doppelzimmer der Pension mit Holzwand und türkisem Kopfteil', en: 'Double room at the guesthouse with wooden wall and teal headboard' } },
  { id: 'thomas', author: 'Thomas K.', platform: 'Booking.com', stars: 5, photo: 'chalet-room',
    quote: 'Wir haben eine Woche mit der Familie verbracht und jeden Moment genossen. Das KitzAlpen Chalet war perfekt für uns.',
    photoAlt: { de: 'Schlafraum im KitzAlpen Chalet unter dem Dach, mit Doppelbett und Etagenbett', en: 'Attic bedroom in the KitzAlpen Chalet with double bed and bunk bed' } },
  { id: 'anna', author: 'Anna M.', platform: 'Tripadvisor', stars: 5, photo: 'breakfast',
    quote: 'Tolles Preis-Leistungs-Verhältnis. Saubere Zimmer, freundliche Gastgeber und eine ausgezeichnete Basis zur Erkundung des Salzburger Landes.',
    photoAlt: { de: 'Frühstücksbuffet der Pension mit Käse, Aufschnitt, Eiern und Obst', en: 'The guesthouse breakfast buffet with cheese, cold cuts, eggs and fruit' } },
];

/** Verified trust data only. */
export const TRUST = {
  // shown on the pension's own booking engine (kitzbuhel.pynbooking.direct), checked 3 Nov 2026
  engine: { score: 9.2, max: 10, count: 95, url: 'https://kitzbuhel.pynbooking.direct/', checked: '11/2026' },
  // the Google Maps link published on kitzalpen.at → the pension's Google profile
  google: 'https://maps.app.goo.gl/5pN6vJZboPjuMqSo6',
};

export const STORIES_COPY = {
  de: {
    eyebrow: 'Unsere Gäste', headline: ['Echte Erlebnisse', 'von KitzAlpen-Gästen'], sub: 'Was unsere Gäste an ihrem Aufenthalt am meisten schätzen.',
    prev: 'Vorherige Bewertung', next: 'Nächste Bewertung', of: (i: number, n: number) => `Bewertung ${i} von ${n}`, stars: (n: number) => `${n} von 5 Sternen`,
    via: 'Bewertung auf', origLang: null as string | null,
    engineLabel: 'Hervorragend', engineCount: (n: number) => `${n} Bewertungen im KitzAlpen-Buchungssystem`, engineNote: 'Stand', google: 'Google-Bewertungen ansehen',
  },
  en: {
    eyebrow: 'Our guests', headline: ['Real experiences', 'from KitzAlpen guests'], sub: 'Discover what our guests love most about their stay.',
    prev: 'Previous review', next: 'Next review', of: (i: number, n: number) => `Review ${i} of ${n}`, stars: (n: number) => `${n} out of 5 stars`,
    via: 'Review on', origLang: 'Original review in German' as string | null,
    engineLabel: 'Excellent', engineCount: (n: number) => `${n} reviews in the KitzAlpen booking system`, engineNote: 'as of', google: 'See Google reviews',
  },
};
