import type { Lang } from './hero';

/**
 * Tour explorer (#tours) and destination guides (#places). Facts from the official tourism-board / national-park
 * pages linked in `url`, checked November 2026. Start distances: OSRM routing on OpenStreetMap from Reitlehen 42.
 * Nothing estimated: a value the official page does not state is left out.
 */
type T = Record<Lang, string>;
export type TourType = 'bike' | 'mtb' | 'moto' | 'hike';
export type Level = 'easy' | 'medium' | 'hard';
export const HOME: [number, number] = [47.27268, 12.42573];
export interface Tour {
  id: string; type: TourType; name: T; start: T; lat: number; lon: number; startKm: number; startMin: number;
  km?: number | null; up?: number | null; time?: T | null; level?: Level | null; season?: T | null;
  highlights: Record<Lang, string[]>; family?: boolean | null; url: string; gpx?: string | null; img?: string | null;
}
export interface Place {
  id: string; name: string; tagline: T; intro: T; lat: number; lon: number; km: number; min: number; url: string; img?: string | null;
  dontMiss: { name: T; url: string }[]; know: Record<Lang, string[]>;
}

export const TOUR_TYPES: { id: TourType; img: string; label: T; sub: T }[] = [
  { id: 'bike', img: 'images/groups/tauern-radweg-cycling.webp', label: { de: 'Rad & E-Bike', en: 'Cycling & e-bike' }, sub: { de: 'Talradwege und Etappen', en: 'Valley paths and stages' } },
  { id: 'mtb', img: 'images/activities/wildkogel-mountain-biking.webp', label: { de: 'Mountainbike', en: 'Mountain bike' }, sub: { de: 'Almen und Bergtrails', en: 'Alpine pastures and trails' } },
  { id: 'moto', img: 'images/groups/grossglockner.webp', label: { de: 'Motorrad', en: 'Motorcycle' }, sub: { de: 'Pässe und Panoramastraßen', en: 'Passes and scenic roads' } },
  { id: 'hike', img: 'images/activities/emerald-trail-smaragdweg.webp', label: { de: 'Wandern', en: 'Hiking' }, sub: { de: 'Täler, Seen und Gipfel', en: 'Valleys, lakes and summits' } },
];
export const LEVEL: Record<Level, T> = { easy: { de: 'leicht', en: 'easy' }, medium: { de: 'mittel', en: 'moderate' }, hard: { de: 'schwierig', en: 'difficult' } };

export const TOURS_COPY = {
  de: {
    eyebrow: 'Touren-Explorer · ab Hollersbach', title: ['Raus auf die Tour.', 'Rad, Bike, Motorrad, zu Fuß.'],
    sub: 'Ausgewählte Touren aus den offiziellen Tourenportalen der Region – mit Länge, Höhenmetern und dem Weg vom Haus zum Start.',
    pick: 'Tourenart wählen', count: (n: number) => `${n} Touren`,
    matrixEyebrow: 'Auf einen Blick', matrixTitle: 'Länge und Höhenmeter im Vergleich.', matrixX: 'Länge (km)', matrixY: 'Höhenmeter', matrixNote: 'Nur Touren mit offiziellen Angaben zu Länge und Höhenmetern.',
    km: 'Länge', up: 'Aufstieg', time: 'Dauer', level: 'Schwierigkeit', season: 'Saison', start: 'Start', fromHouse: (km: string, min: number) => `${km} km ab KitzAlpen · ca. ${min} Min.`, fromHouseWalk: 'direkt ab Hollersbach',
    family: 'familienfreundlich', official: 'Tour ansehen', gpx: 'GPX', route: 'Route zum Start',
    note: 'Angaben laut offiziellen Tourenportalen, Stand November 2026. Bitte Wetter und Sperren vor der Tour prüfen.',
    ctaPlaces: 'Orte-Guide: die Orte der Region', ctaTop: 'Top 15 Erlebnisse',
    placesEyebrow: 'Orte-Guide', placesTitle: ['Sechs Orte.', 'Einer davon ist Ihr Zuhause.'],
    placesSub: 'Kurze Porträts der Orte rund um Hollersbach – mit dem, was man nicht verpassen sollte, und dem offiziellen Infoportal.',
    dontMiss: 'Nicht verpassen', know: 'Gut zu wissen', visit: 'Offizielles Infoportal', here: 'Ihr Ort', away: (km: string, min: number) => `${km} km · ca. ${min} Min.`,
  },
  en: {
    eyebrow: 'Tour explorer · from Hollersbach', title: ['Head out.', 'By bike, motorbike or on foot.'],
    sub: 'Selected tours from the region’s official tour portals – with length, ascent and the way from the house to the start.',
    pick: 'Choose a tour type', count: (n: number) => `${n} tours`,
    matrixEyebrow: 'At a glance', matrixTitle: 'Length and ascent compared.', matrixX: 'Length (km)', matrixY: 'Ascent (m)', matrixNote: 'Only tours with official length and ascent.',
    km: 'Length', up: 'Ascent', time: 'Duration', level: 'Difficulty', season: 'Season', start: 'Start', fromHouse: (km: string, min: number) => `${km} km from KitzAlpen · approx. ${min} min`, fromHouseWalk: 'right from Hollersbach',
    family: 'family-friendly', official: 'View tour', gpx: 'GPX', route: 'Route to the start',
    note: 'Details as published on the official tour portals, November 2026. Please check weather and closures before you set off.',
    ctaPlaces: 'Places guide: the towns around us', ctaTop: 'Top 15 experiences',
    placesEyebrow: 'Places guide', placesTitle: ['Six places.', 'One of them is your home.'],
    placesSub: 'Short portraits of the places around Hollersbach – with what not to miss and the official information portal.',
    dontMiss: 'Don’t miss', know: 'Good to know', visit: 'Official information', here: 'Your village', away: (km: string, min: number) => `${km} km · approx. ${min} min`,
  },
};

// filled from the official-source research (pending)
export const TOURS: Tour[] = [];
export const PLACES: Place[] = [];
