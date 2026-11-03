import type { Lang } from './hero';

export type AmenityKind = 'wifi' | 'tv' | 'parking' | 'restaurant' | 'breakfast' | 'bathroom' | 'mountain' | 'card';

export interface Amenity {
  kind: AmenityKind;
  label: Record<Lang, string>;
  /** Only facts that are published on kitzalpen.at */
  detail?: Record<Lang, string>;
  /** Real KitzAlpen photograph (file stem in /images/amenities), or none → graphic background */
  photo?: string;
  /** object-position for the photo inside the card */
  focus?: string;
}

/**
 * The eight amenities listed on kitzalpen.at (homepage, "Zimmer im Haupthaus"):
 * Kostenloses WLAN · Flachbild-TV · Kostenloser Parkplatz · Restaurant & Bar ·
 * Frühstücksbuffet · Eigenes Badezimmer · Bergblick · M+ Gästekarte.
 * Photos: bathroom/restaurant/breakfast supplied by KitzAlpen; wifi/tv are crops of
 * the room photos, parking/mountain are crops of the summer exterior. No card for
 * the guest card photo – none exists, so it gets a drawn background.
 */
export const AMENITIES: Amenity[] = [
  { kind: 'wifi', label: { de: 'Kostenloses WLAN', en: 'Free Wi-Fi' }, photo: 'wifi', focus: '40% 40%' },
  { kind: 'tv', label: { de: 'Flachbild-TV', en: 'Flat-screen TV' }, photo: 'tv', focus: '50% 40%' },
  { kind: 'parking', label: { de: 'Kostenloser Parkplatz', en: 'Free parking' }, photo: 'parking', focus: '60% 70%' },
  { kind: 'restaurant', label: { de: 'Restaurant & Bar', en: 'Restaurant & Bar' }, detail: { de: 'Abendessen Di – So, 17 – 21 Uhr', en: 'Dinner Tue – Sun, 5 – 9 pm' }, photo: 'restaurant', focus: '45% 45%' },
  { kind: 'breakfast', label: { de: 'Frühstücksbuffet', en: 'Breakfast buffet' }, detail: { de: 'Täglich 08:00 – 10:00 Uhr', en: 'Daily 8 – 10 am' }, photo: 'breakfast', focus: '55% 50%' },
  { kind: 'bathroom', label: { de: 'Eigenes Badezimmer', en: 'Private bathroom' }, detail: { de: 'Mit Dusche in jedem Zimmer', en: 'With shower in every room' }, photo: 'bathroom', focus: '60% 45%' },
  { kind: 'mountain', label: { de: 'Bergblick', en: 'Mountain view' }, photo: 'mountain', focus: '40% 50%' },
  { kind: 'card', label: { de: 'M+ Gästekarte', en: 'M+ Guest Card' } },
];

export const AMENITIES_COPY = {
  de: {
    eyebrow: 'Unsere Leistungen',
    headline: ['Alles für Ihren', 'Alpenaufenthalt'],
    // Hollersbach lies in the Salzburger Land (Pinzgau), not in Tirol – hence "Pinzgauer".
    sub: 'Komfort, Service und echte Pinzgauer Gastfreundschaft – für entspannte und unvergessliche Tage in den Alpen.',
    meta: 'Hollersbach im Pinzgau · 807 m',
  },
  en: {
    eyebrow: 'Our services',
    headline: ['Everything for your', 'Alpine stay'],
    sub: 'Comfort, service and genuine Pinzgau hospitality – for relaxed and unforgettable days in the Alps.',
    meta: 'Hollersbach im Pinzgau · 807 m',
  },
};

/** Global quick actions – same URLs as on the live site (checked). */
export const QUICK_ACTIONS = {
  whatsapp: 'https://wa.me/40748192821?text=Hallo!%20Ich%20m%C3%B6chte%20gerne%20eine%20Anfrage%20stellen.',
  chalet: 'https://chalet-kitzalpen.pynbooking.direct/',
  room: 'https://kitzbuhel.pynbooking.direct',
  label: {
    de: { whatsapp: 'WhatsApp', chalet: 'Chalet buchen', room: 'Zimmer buchen', nav: 'Schnellaktionen' },
    en: { whatsapp: 'WhatsApp', chalet: 'Book chalet', room: 'Book a room', nav: 'Quick actions' },
  },
};
