import type { Lang } from './hero';
import { ROOMS, ROOMS_COPY } from './rooms';
import { BOOKING_ENGINE } from '../components/BookingBar';

const SITE = 'https://www.kitzalpen.at';

/**
 * Pension page, sections below the hero.
 * Room facts (count, guests, m², beds, connecting rooms up to 8) come from content/rooms.ts,
 * which mirrors kitzalpen.at/rooms/. Short descriptions follow the client brief.
 */
export type RoomKey = 'double' | 'triple' | 'family' | 'quad';
export const ROOM_KEYS: RoomKey[] = ['double', 'triple', 'family', 'quad'];
const SLUG: Record<RoomKey, string> = { double: 'double', triple: 'triple', family: 'family', quad: 'quad' };
export const roomData = (k: RoomKey) => ROOMS.find((r) => r.slug === SLUG[k])!;

export const PR_COPY = {
  de: {
    eyebrow: 'Zimmer & Unterkunft',
    title: 'Finden Sie das Zimmer, das zu Ihnen passt.',
    sub: 'Gemütliche Zimmer mit alpinem Charme – ideal für Paare, Familien und kleine Gruppen.',
    total: '17 Zimmer · 4 Kategorien',
    rooms: {
      double: { label: 'Doppelzimmer', name: 'Doppelzimmer', text: 'Klassischer alpiner Komfort für zwei.' },
      triple: { label: 'Dreibettzimmer', name: 'Dreibettzimmer', text: 'Flexibler Komfort für drei Gäste.' },
      family: { label: 'Familienzimmer', name: 'Familienzimmer mit Verbindungstür', text: 'Zwei verbundene Räume für unvergessliche Familienferien.' },
      quad: { label: 'Vierbettzimmer', name: 'Vierbettzimmer', text: 'Extra Platz für Familien und Freunde.' },
    } as Record<RoomKey, { label: string; name: string; text: string }>,
    count: (n: number) => `${n} Zimmer`,
    guests: (n: number) => `${n} Gäste`,
    photos: (n: number) => `${n} Fotos`,
    open: (name: string) => `${name} – Fotos und Details öffnen`,
    // sheet
    category: 'Zimmerkategorie',
    facts: { rooms: 'Zimmer', guests: 'Gäste', size: 'Größe', beds: 'Betten' },
    combined: (n: number) => `Zwei Zimmer lassen sich verbinden – bis zu ${n} Gäste.`,
    ideal: 'Ideal für',
    inclusive: 'Immer inklusive',
    incl: ['TV', 'WLAN', 'Eigenes Bad', 'Dusche'],
    book: 'Verfügbarkeit prüfen',
    details: 'Details auf kitzalpen.at',
    close: 'Schließen',
    prev: 'Vorheriges Foto',
    next: 'Nächstes Foto',
    photoOf: (i: number, n: number) => `Foto ${i} von ${n}`,
    roomHref: ROOMS_COPY.de.roomHref,
    // why
    why: [
      { icon: 'peaks', title: 'Alpine Lage', text: 'Natur, frische Luft und eine ruhige Umgebung.' },
      { icon: 'trail', title: 'Abenteuer in der Nähe', text: 'Skifahren, Wandern, Radfahren und unvergessliche Ausflüge.' },
      { icon: 'people', title: 'Für jeden Aufenthalt', text: 'Passende Zimmer für Paare, Familien und Gruppen.' },
      { icon: 'chat', title: 'Direkter Kontakt', text: 'Persönliche Hilfe rund um Ihren Aufenthalt und Ihre Buchung.' },
    ],
    // final
    finalTitle: 'Bereit für erholsame Tage in Hollersbach?',
    finalText: 'Entdecken Sie unsere Zimmer oder senden Sie uns eine persönliche Anfrage für Ihren nächsten Urlaub in den Alpen.',
    viewRooms: 'Zimmer entdecken', inquiry: 'Anfrage senden',
    roomsHref: `${SITE}/rooms/`, contactHref: `${SITE}/contact/`,
    finalAlt: { summer: 'Bergsee zwischen grünen Hängen und Felsgipfeln, vorne blühende Almrosen', winter: 'Verschneites Hochgebirgspanorama mit präparierten Pisten unter blauem Himmel' },
  },
  en: {
    eyebrow: 'Rooms & accommodation',
    title: 'Choose the room that fits your stay.',
    sub: 'Comfortable rooms with alpine charm, perfect for couples, families or small groups.',
    total: '17 rooms · 4 categories',
    rooms: {
      double: { label: 'Double room', name: 'Double room', text: 'Classic alpine comfort for two.' },
      triple: { label: 'Triple room', name: 'Triple room', text: 'Flexible comfort for three guests.' },
      family: { label: 'Family room', name: 'Family room with connecting door', text: 'Two connected spaces for memorable family stays.' },
      quad: { label: 'Four-bed room', name: 'Four-bed room', text: 'Extra space for families and friends.' },
    } as Record<RoomKey, { label: string; name: string; text: string }>,
    count: (n: number) => (n === 1 ? '1 room' : `${n} rooms`),
    guests: (n: number) => `${n} guests`,
    photos: (n: number) => `${n} photos`,
    open: (name: string) => `${name} – open photos and details`,
    category: 'Room category',
    facts: { rooms: 'Rooms', guests: 'Guests', size: 'Size', beds: 'Beds' },
    combined: (n: number) => `Two rooms can be connected – up to ${n} guests.`,
    ideal: 'Ideal for',
    inclusive: 'Always included',
    incl: ['TV', 'Wi-Fi', 'Private bathroom', 'Shower'],
    book: 'Check availability',
    details: 'Details on kitzalpen.at',
    close: 'Close',
    prev: 'Previous photo',
    next: 'Next photo',
    photoOf: (i: number, n: number) => `Photo ${i} of ${n}`,
    roomHref: ROOMS_COPY.en.roomHref,
    why: [
      { icon: 'peaks', title: 'Alpine location', text: 'Nature, fresh air and peaceful surroundings.' },
      { icon: 'trail', title: 'Nearby adventures', text: 'Skiing, hiking, cycling and unforgettable day trips.' },
      { icon: 'people', title: 'For every kind of stay', text: 'Comfortable options for couples, families and groups.' },
      { icon: 'chat', title: 'Direct contact', text: 'Personal assistance with your stay and booking.' },
    ],
    finalTitle: 'Ready for a relaxing stay in Hollersbach?',
    finalText: 'Explore our rooms or send us a personal inquiry for your next alpine escape.',
    viewRooms: 'View rooms', inquiry: 'Make an inquiry',
    roomsHref: `${SITE}/en/rooms/`, contactHref: `${SITE}/en/contact/`,
    finalAlt: { summer: 'Mountain lake between green slopes and rocky peaks, alpine roses in bloom in front', winter: 'Snowy high-alpine panorama with groomed slopes under a blue sky' },
  },
};
export type PRCopy = (typeof PR_COPY)['de'];
export const BOOK_ROOMS = BOOKING_ENGINE;
export const prCopy = (l: Lang) => PR_COPY[l];
