import type { Lang } from './hero';

/**
 * Every room of the main house, as printed in the client's brochure "Winter 2022/2023" (room pages 001–305):
 * room number, floor, room type and size. Equipment icons on every room page: TV, hair dryer, Wi-Fi, shower, balcony.
 * Photos: the owner's room photo shoot (Nov 2026), 4–5 per room. Preview route #all-rooms (live: /rooms/).
 */
export type RoomType = 'double' | 'triple' | 'quad';
export interface RPic { name: string; w: number; h: number; sizes: number[] }
export interface HouseRoom { no: string; floor: 0 | 1 | 2 | 3; type: RoomType; m2: number; extraBed?: boolean; pics: RPic[] }

export const HOUSE_ROOMS: HouseRoom[] = [
  { no: '001', floor: 0, type: 'quad', m2: 18, pics: [{ name: 'r001-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r001-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r001-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r001-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r001-4', w: 1066, h: 1599, sizes: [1066] }] },
  { no: '101', floor: 1, type: 'triple', m2: 18, pics: [{ name: 'r101-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r101-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r101-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r101-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r101-4', w: 1600, h: 1066, sizes: [1600] }] },
  { no: '102', floor: 1, type: 'quad', m2: 29, pics: [{ name: 'r102-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r102-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r102-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r102-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r102-4', w: 1066, h: 1599, sizes: [1066] }] },
  { no: '103', floor: 1, type: 'double', m2: 15, extraBed: true, pics: [{ name: 'r103-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r103-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r103-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r103-3', w: 1066, h: 1599, sizes: [1066] },{ name: 'r103-4', w: 1600, h: 1066, sizes: [1600] }] },
  { no: '104', floor: 1, type: 'quad', m2: 21, pics: [{ name: 'r104-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r104-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r104-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r104-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r104-4', w: 1066, h: 1599, sizes: [1066] }] },
  { no: '105', floor: 1, type: 'triple', m2: 19, pics: [{ name: 'r105-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r105-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r105-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r105-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r105-4', w: 1066, h: 1599, sizes: [1066] }] },
  { no: '106', floor: 1, type: 'double', m2: 15, pics: [{ name: 'r106-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r106-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r106-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r106-3', w: 1066, h: 1599, sizes: [1066] },{ name: 'r106-4', w: 1600, h: 1066, sizes: [1600] }] },
  { no: '201', floor: 2, type: 'double', m2: 17, pics: [{ name: 'r201-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r201-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r201-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r201-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r201-4', w: 1066, h: 1599, sizes: [1066] }] },
  { no: '202', floor: 2, type: 'double', m2: 18, pics: [{ name: 'r202-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r202-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r202-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r202-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r202-4', w: 1600, h: 1066, sizes: [1600] }] },
  { no: '203', floor: 2, type: 'triple', m2: 18, pics: [{ name: 'r203-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r203-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r203-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r203-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r203-4', w: 1066, h: 1599, sizes: [1066] }] },
  { no: '204', floor: 2, type: 'double', m2: 15, pics: [{ name: 'r204-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r204-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r204-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r204-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r204-4', w: 1600, h: 1066, sizes: [1600] }] },
  { no: '205', floor: 2, type: 'double', m2: 17, pics: [{ name: 'r205-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r205-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r205-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r205-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r205-4', w: 1600, h: 1066, sizes: [1600] }] },
  { no: '206', floor: 2, type: 'triple', m2: 16, pics: [{ name: 'r206-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r206-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r206-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r206-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r206-4', w: 1600, h: 1066, sizes: [1600] }] },
  { no: '301', floor: 3, type: 'double', m2: 14, pics: [{ name: 'r301-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r301-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r301-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r301-3', w: 1600, h: 1066, sizes: [1600] }] },
  { no: '302', floor: 3, type: 'double', m2: 14, pics: [{ name: 'r302-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r302-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r302-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r302-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r302-4', w: 1066, h: 1599, sizes: [1066] }] },
  { no: '303', floor: 3, type: 'quad', m2: 25, pics: [{ name: 'r303-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r303-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r303-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r303-3', w: 1066, h: 1599, sizes: [1066] },{ name: 'r303-4', w: 1600, h: 1066, sizes: [1600] }] },
  { no: '304', floor: 3, type: 'triple', m2: 17, pics: [{ name: 'r304-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r304-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r304-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r304-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r304-4', w: 1600, h: 1066, sizes: [1600] }] },
  { no: '305', floor: 3, type: 'quad', m2: 30, pics: [{ name: 'r305-0', w: 1600, h: 1066, sizes: [1600] },{ name: 'r305-1', w: 1600, h: 1066, sizes: [1600] },{ name: 'r305-2', w: 1600, h: 1066, sizes: [1600] },{ name: 'r305-3', w: 1600, h: 1066, sizes: [1600] },{ name: 'r305-4', w: 1600, h: 1066, sizes: [1600] }] },
];

export const TYPE_GUESTS: Record<RoomType, number> = { double: 2, triple: 3, quad: 4 };

export const ALL_ROOMS_COPY = {
  de: {
    eyebrow: 'Alle Zimmer · Haupthaus',
    title: ['18 Zimmer.', 'Vier Etagen.', 'Ihr Platz in den Alpen.'],
    sub: 'Jedes Zimmer mit Nummer, Etage und Größe – wählen Sie nach Etage oder Zimmertyp.',
    floors: ['Erdgeschoss', '1. Stock', '2. Stock', '3. Stock'],
    floorShort: ['EG', '1', '2', '3'],
    types: { double: 'Doppelzimmer', triple: 'Dreibettzimmer', quad: '4-Personen-Zimmer' } as Record<RoomType, string>,
    all: 'Alle',
    room: 'Zimmer',
    guests: (n: number) => `${n} Personen`,
    extraBed: '+1 Zusatzbett',
    rooms: (n: number) => (n === 1 ? '1 Zimmer' : `${n} Zimmer`),
    house: 'Das Haus',
    houseHint: 'Tippen Sie auf eine Zimmernummer',
    filterType: 'Zimmertyp',
    filterFloor: 'Etage',
    stats: { rooms: 'Zimmer', floors: 'Etagen', sizes: 'Größen' },
    equip: 'Ausstattung',
    eq: ['TV', 'Föhn', 'WLAN', 'Dusche', 'Balkon'],
    book: 'Verfügbarkeit prüfen',
    category: 'Zur Kategorie',
    open: (no: string) => `Zimmer ${no} öffnen`,
    close: 'Schließen', prev: 'Vorheriges Foto', next: 'Nächstes Foto',
    prevRoom: 'Vorheriges Zimmer', nextRoom: 'Nächstes Zimmer',
    photoOf: (i: number, n: number) => `Foto ${i} von ${n}`,
    empty: 'Keine Zimmer für diese Auswahl.',
    source: 'Angaben laut Hausprospekt',
  },
  en: {
    eyebrow: 'All rooms · Main house',
    title: ['18 rooms.', 'Four floors.', 'Your place in the Alps.'],
    sub: 'Every room with its number, floor and size – choose by floor or by room type.',
    floors: ['Ground floor', '1st floor', '2nd floor', '3rd floor'],
    floorShort: ['G', '1', '2', '3'],
    types: { double: 'Double room', triple: 'Triple room', quad: '4-person room' } as Record<RoomType, string>,
    all: 'All',
    room: 'Room',
    guests: (n: number) => `${n} guests`,
    extraBed: '+1 extra bed',
    rooms: (n: number) => (n === 1 ? '1 room' : `${n} rooms`),
    house: 'The house',
    houseHint: 'Tap a room number',
    filterType: 'Room type',
    filterFloor: 'Floor',
    stats: { rooms: 'Rooms', floors: 'Floors', sizes: 'Sizes' },
    equip: 'Equipment',
    eq: ['TV', 'Hair dryer', 'Wi-Fi', 'Shower', 'Balcony'],
    book: 'Check availability',
    category: 'View category',
    open: (no: string) => `Open room ${no}`,
    close: 'Close', prev: 'Previous photo', next: 'Next photo',
    prevRoom: 'Previous room', nextRoom: 'Next room',
    photoOf: (i: number, n: number) => `Photo ${i} of ${n}`,
    empty: 'No rooms for this selection.',
    source: 'Details as printed in the house brochure',
  },
};
export type AllRoomsCopy = (typeof ALL_ROOMS_COPY)['de'];
export const allRoomsCopy = (l: Lang) => ALL_ROOMS_COPY[l];
