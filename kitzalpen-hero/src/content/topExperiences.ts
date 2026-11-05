import type { Lang, Season } from './hero';

/**
 * Top 15 experiences per season within 70 km (preview route #experiences).
 * Researched from the official websites of each operator / tourism board, checked 5 Nov 2026 – see `url`.
 * km / min: OSRM routing on OpenStreetMap from Reitlehen 42 (car, without traffic).
 * Photos: only where an existing real photo shows that very place; otherwise a typographic panel.
 */
export type CatId = 'nature' | 'family' | 'adventure' | 'culture' | 'wellness' | 'panorama' | 'water' | 'sport' | 'food' | 'ski';
export const CATS: Record<CatId, Record<Lang, string>> = {
  nature: { de: 'Natur', en: 'Nature' }, family: { de: 'Familie', en: 'Family' }, adventure: { de: 'Abenteuer', en: 'Adventure' },
  culture: { de: 'Kultur & Orte', en: 'Culture & towns' }, wellness: { de: 'Wellness', en: 'Wellness' }, panorama: { de: 'Panorama', en: 'Panorama' },
  water: { de: 'Wasser', en: 'Water' }, sport: { de: 'Sport', en: 'Sport' }, food: { de: 'Genuss', en: 'Food & huts' }, ski: { de: 'Ski', en: 'Skiing' },
};
export const HOME_LL: [number, number] = [47.27268, 12.42573];
export interface Exp {
  id: string; name: string; town: string; cat: CatId; img?: string | null; lat: number; lon: number; km: number; min: number; url: string;
  text: Record<Lang, string>; facts: Record<Lang, string[]>; open?: Record<Lang, string> | null; family?: boolean | null; signature?: boolean;
}

export const TOP_COPY = {
  de: {
    eyebrow: { winter: 'Winter 2026/27 · im Umkreis von 70 km', summer: 'Sommer · im Umkreis von 70 km' } as Record<Season, string>,
    title: ['Erlebnisse,', { winter: 'die den Winter ausmachen.', summer: 'die den Sommer ausmachen.' } as Record<Season, string>] as const,
    sub: 'Unsere Auswahl der stärksten Erlebnisse rund um Hollersbach – jedes mit Entfernung, offizieller Seite und Route ab der Pension.',
    seasonLabel: 'Jahreszeit', seasons: { winter: 'Winter', summer: 'Sommer' } as Record<Season, string>,
    radarEyebrow: 'Alles im Umkreis', radarTitle: 'Hollersbach in der Mitte.', radarText: 'Jeder Punkt ist ein Erlebnis – in seiner Richtung und mit seiner Straßenentfernung. Goldene Punkte sind die drei Höhepunkte der Saison.', radarNote: 'Richtung in Luftlinie, Abstand = Straßen-km (OpenStreetMap).',
    listEyebrow: 'Die Liste', listTitle: { winter: 'Die 15 besten Wintererlebnisse.', summer: 'Die 15 besten Sommererlebnisse.' } as Record<Season, string>,
    all: 'Alle', sortLabel: 'Sortierung', sort: { rank: 'Empfehlung', km: 'Entfernung' }, min: (m: number) => `ca. ${m} Min.`, family: 'familienfreundlich',
    official: 'Offizielle Seite', route: 'Route ab KitzAlpen', note: 'Angaben laut offiziellen Seiten der Anbieter, Stand November 2026 – Öffnungszeiten bitte vor dem Besuch prüfen.',
    ctaTitle: 'Ihr Ausgangspunkt für alles.', ctaText: 'Zimmer in der Pension oder das eigene Chalet – mitten im Oberpinzgau.', rooms: 'Zimmer ansehen', arrival: 'Anreise & Mobilität',
    teaserEyebrow: { winter: 'Top-Erlebnisse · Winter', summer: 'Top-Erlebnisse · Sommer' } as Record<Season, string>, teaserTitle: 'Die besten Erlebnisse im Umkreis von 70 km.', teaserCta: 'Alle 15 entdecken',
  },
  en: {
    eyebrow: { winter: 'Winter 2026/27 · within 70 km', summer: 'Summer · within 70 km' } as Record<Season, string>,
    title: ['Experiences', { winter: 'that make the winter.', summer: 'that make the summer.' } as Record<Season, string>] as const,
    sub: 'Our pick of the strongest experiences around Hollersbach – each with distance, official website and a route from the pension.',
    seasonLabel: 'Season', seasons: { winter: 'Winter', summer: 'Summer' } as Record<Season, string>,
    radarEyebrow: 'All around', radarTitle: 'Hollersbach at the centre.', radarText: 'Every dot is an experience – in its direction and at its road distance. Gold dots are the three highlights of the season.', radarNote: 'Direction as the crow flies, distance = road km (OpenStreetMap).',
    listEyebrow: 'The list', listTitle: { winter: 'The 15 best winter experiences.', summer: 'The 15 best summer experiences.' } as Record<Season, string>,
    all: 'All', sortLabel: 'Sort', sort: { rank: 'Our pick', km: 'Distance' }, min: (m: number) => `approx. ${m} min`, family: 'family-friendly',
    official: 'Official website', route: 'Route from KitzAlpen', note: 'Details as stated on the providers’ official websites, November 2026 – please check opening times before your visit.',
    ctaTitle: 'Your base for all of it.', ctaText: 'A room in the pension or your own chalet – right in the Upper Pinzgau.', rooms: 'See the rooms', arrival: 'Arrival & mobility',
    teaserEyebrow: { winter: 'Top experiences · winter', summer: 'Top experiences · summer' } as Record<Season, string>, teaserTitle: 'The best experiences within 70 km.', teaserCta: 'Discover all 15',
  },
};

// filled from the official-source research (pending)
export const TOP: Record<Season, Exp[]> = { winter: [], summer: [] };
