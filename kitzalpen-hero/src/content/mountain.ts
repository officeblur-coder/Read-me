import type { Lang, Season } from './hero';
import { SKY_LABEL, sky } from './weather';

/**
 * Alpine Mountain Experience – typed data models + adapters.
 *
 * Sources (checked 4 Nov 2026):
 *  - Weather: Open-Meteo forecast API (free, no key, CORS). Model values for the coordinates below –
 *    labelled as "weather model", never as an official resort report.
 *  - Lift / slope status: KitzSki and Wildkogel-Arena publish it on their websites and in their official
 *    interactive maps (map.kitzski.at, intermaps). No public API is offered, so we do NOT scrape counts –
 *    the official interactive map is embedded on demand and the official pages are linked.
 *  - Webcams: Panomax 360° viewers (officially embeddable; Wildkogel-Arena embeds them the same way) and
 *    feratel still images used on kitzski.at (refreshed image, CORS-enabled). Each camera states its type.
 *  - Drive km / minutes: OSRM routing on OpenStreetMap from Reitlehen 42 (public/map/routes.json).
 */

type T = Record<Lang, string>;
const IMG = `${import.meta.env.BASE_URL}images/`;
export const HOME = { lat: 47.27268, lon: 12.42573, label: 'Reitlehen 42, 5731 Hollersbach im Pinzgau' };

export type ResortId = 'kitzski' | 'wildkogel';
export interface Resort {
  id: ResortId;
  name: string;
  area: T;
  access: Record<Season, { name: T; lat: number; lon: number; mapId: string; km: number; min: number }>;
  weather: { lat: number; lon: number };
  img: Record<Season, string>;
  facts: Record<Season, Record<Lang, string[]>>;
  links: { report: string; lifts: string; slopes: string; webcams: string; map: Record<Season, string> };
}

export const RESORTS: Resort[] = [
  {
    id: 'kitzski', name: 'KitzSki · Resterkogel',
    area: { de: 'Über die Panoramabahn Hollersbach', en: 'Via the Panoramabahn Hollersbach' },
    access: {
      winter: { name: { de: 'Talstation Panoramabahn, Hollersbach', en: 'Panoramabahn valley station, Hollersbach' }, lat: 47.28068, lon: 12.40538, mapId: 'panoramabahn-w', km: 2.2, min: 5 },
      summer: { name: { de: 'Talstation Panoramabahn, Hollersbach', en: 'Panoramabahn valley station, Hollersbach' }, lat: 47.28068, lon: 12.40538, mapId: 'panoramabahn-s', km: 2.2, min: 5 },
    },
    weather: { lat: 47.30743, lon: 12.38245 },
    img: { winter: `${IMG}activities/kitzski-kitzbuheler-alpen.webp`, summer: `${IMG}real/panoramabahn-summer.webp` },
    facts: {
      winter: { de: ['Rund 2 km bis zur Panoramabahn', 'Direkter Einstieg ins Skigebiet KitzSki', 'Snow Park Kitzbühel im Skigebiet'], en: ['About 2 km to the Panoramabahn', 'Direct access to the KitzSki area', 'Snow Park Kitzbühel in the ski area'] },
      summer: { de: ['Gondel ab Hollersbach', 'Startpunkt für Wanderungen am Resterkogel', 'Kitzbüheler Alpen'], en: ['Gondola from Hollersbach', 'Starting point for hikes on the Resterkogel', 'Kitzbühel Alps'] },
    },
    links: {
      report: 'https://www.kitzski.at/en/current-info/kitzski-snow-report.html',
      lifts: 'https://www.kitzski.at/en/current-info/kitz-lift-status.html',
      slopes: 'https://www.kitzski.at/en/current-info/slope-status.html',
      webcams: 'https://www.kitzski.at/en/current-info/webcams.html',
      map: { winter: 'https://map.kitzski.at/en/winter', summer: 'https://map.kitzski.at/en/summer' },
    },
  },
  {
    id: 'wildkogel', name: 'Wildkogel-Arena',
    area: { de: 'Neukirchen · Bramberg', en: 'Neukirchen · Bramberg' },
    access: {
      winter: { name: { de: 'Talstation Wildkogelbahn, Neukirchen', en: 'Wildkogelbahn valley station, Neukirchen' }, lat: 47.25438, lon: 12.28077, mapId: 'wildkogel-w', km: 12.3, min: 12 },
      summer: { name: { de: 'Talstation Smaragdbahn, Bramberg', en: 'Smaragdbahn valley station, Bramberg' }, lat: 47.27254, lon: 12.34061, mapId: 'wildkogel-s', km: 7.5, min: 9 },
    },
    weather: { lat: 47.2817, lon: 12.2849 },
    img: { winter: `${IMG}activities/wildkogel-arena.webp`, summer: `${IMG}activities/wildkogel-mountain-biking.webp` },
    facts: {
      winter: { de: ['Familienfreundliche Pisten im Nationalpark Hohe Tauern', 'Rodeln unter Flutlicht'], en: ['Family-friendly slopes in the Hohe Tauern National Park', 'Floodlit tobogganing'] },
      summer: { de: ['Mountainbike-Strecken mit Gletscherblick', 'Smaragdweg im Habachtal'], en: ['Mountain-bike trails with glacier views', 'Emerald Trail in the Habach valley'] },
    },
    links: {
      report: 'https://www.wildkogel-arena.at/en/mountain-lifts-wildkogel/facilities-slopes.html',
      lifts: 'https://www.wildkogel-arena.at/en/mountain-lifts-wildkogel/facilities-slopes.html',
      slopes: 'https://www.wildkogel-arena.at/en/mountain-lifts-wildkogel/facilities-slopes.html',
      webcams: 'https://www.wildkogel-arena.at/en/wildkogel-arena/webcams.html',
      map: { winter: 'https://winter.intermaps.com/wildkogel_arena?show=all', summer: 'https://summer.intermaps.com/wildkogel_arena' },
    },
  },
];
export const resortById = (id: ResortId) => RESORTS.find((r) => r.id === id)!;

/* ------------------------------------------------------------------ webcams */
export type CamKind = 'panorama' | 'still';
export interface Webcam { id: string; resort: ResortId; name: string; place: string; kind: CamKind; embed?: string; poster: string; official: string }
const PX = 'https://live-image.panomax.com/cams/';
const FT = 'https://wtvpict.feratel.com/picture/38/';
export const WEBCAMS: Webcam[] = [
  { id: 'resterkogel', resort: 'kitzski', name: 'Resterkogel – Pass Thurn', place: 'Bergstation Panoramabahn', kind: 'still', poster: `${FT}5603.jpeg?design=v5`, official: RESORTS[0].links.webcams },
  { id: 'hahnenkamm', resort: 'kitzski', name: 'Hahnenkamm', place: 'Hahnenkamm Bergstation', kind: 'panorama', embed: 'https://kitzski.panomax.com/hahnenkamm', poster: `${PX}8676/hahnenkamm.jpg`, official: RESORTS[0].links.webcams },
  { id: 'horn', resort: 'kitzski', name: 'Kitzbüheler Horn', place: 'Gipfelbahn', kind: 'panorama', embed: 'https://kitzski.panomax.com/horn', poster: `${PX}9670/horn.jpg`, official: RESORTS[0].links.webcams },
  { id: 'pengelstein', resort: 'kitzski', name: 'Pengelstein', place: 'Kirchberg', kind: 'still', poster: `${FT}5600.jpeg?design=v5`, official: RESORTS[0].links.webcams },
  { id: 'wildkogelbahn', resort: 'wildkogel', name: 'Wildkogelbahn Berg', place: '2.091 m', kind: 'panorama', embed: 'https://wildkogel-arena.panomax.com/wildkogelbahn-berg', poster: `${PX}1641/recent_hd.jpg`, official: RESORTS[1].links.webcams },
  { id: 'gensbichl', resort: 'wildkogel', name: 'Gensbichl Berg', place: '2.105 m', kind: 'panorama', embed: 'https://wildkogel-arena.panomax.com/gensbichl-berg', poster: `${PX}1734/recent_hd.jpg`, official: RESORTS[1].links.webcams },
  { id: 'rettenstein', resort: 'wildkogel', name: 'Skihütte Rettenstein', place: '1.838 m', kind: 'panorama', embed: 'https://wildkogel-arena.panomax.com/rettenstein', poster: `${PX}8188/recent_hd.jpg`, official: RESORTS[1].links.webcams },
];

/* ------------------------------------------------------------------ conditions adapter */
export type LoadState = 'loading' | 'ok' | 'stale' | 'error';
export interface MountainConditions { temp: number; code: number; wind: number; snowCm: number; lastSnow: string | null; newSnow7: number; elevation: number; time: string }
export interface ConditionsResult { state: LoadState; data: Partial<Record<ResortId, MountainConditions>>; fetchedAt?: number; source: string }

const CACHE = 'kitzalpen-mountain-wx';
const TTL = 15 * 60 * 1000;
export const WX_SOURCE = 'https://open-meteo.com/';

export async function loadConditions(signal?: AbortSignal): Promise<ConditionsResult> {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE) || 'null') as ConditionsResult | null;
    if (c && c.fetchedAt && Date.now() - c.fetchedAt < TTL) return { ...c, state: 'ok' };
  } catch { /* storage blocked */ }
  const q = new URLSearchParams({
    latitude: RESORTS.map((r) => r.weather.lat).join(','),
    longitude: RESORTS.map((r) => r.weather.lon).join(','),
    current: 'temperature_2m,weather_code,wind_speed_10m,snow_depth',
    daily: 'snowfall_sum', past_days: '14', forecast_days: '1', timezone: 'Europe/Vienna',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { signal });
  if (!res.ok) throw new Error(String(res.status));
  const json = (await res.json()) as Array<{ elevation: number; current: { time: string; temperature_2m: number; weather_code: number; wind_speed_10m: number; snow_depth: number }; daily: { time: string[]; snowfall_sum: number[] } }>;
  const data: ConditionsResult['data'] = {};
  json.forEach((j, i) => {
    const days = j.daily.time.slice(0, -1), fall = j.daily.snowfall_sum.slice(0, -1);
    let last: string | null = null;
    for (let k = fall.length - 1; k >= 0; k--) if ((fall[k] ?? 0) >= 0.5) { last = days[k]; break; }
    data[RESORTS[i].id] = {
      temp: j.current.temperature_2m, code: j.current.weather_code, wind: j.current.wind_speed_10m,
      snowCm: Math.round((j.current.snow_depth ?? 0) * 100), lastSnow: last,
      newSnow7: Math.round(fall.slice(-7).reduce((s, v) => s + (v ?? 0), 0)), elevation: Math.round(j.elevation), time: j.current.time,
    };
  });
  const out: ConditionsResult = { state: 'ok', data, fetchedAt: Date.now(), source: WX_SOURCE };
  try { sessionStorage.setItem(CACHE, JSON.stringify(out)); } catch { /* ignore */ }
  return out;
}
export const skyLabel = (code: number, lang: Lang) => SKY_LABEL[sky(code)][lang];

export const directionsUrl = (lat: number, lon: number) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${HOME.lat},${HOME.lon}`)}&destination=${encodeURIComponent(`${lat},${lon}`)}&travelmode=driving`;

/* ------------------------------------------------------------------ planner + finder */
export type Who = 'couple' | 'family' | 'friends' | 'solo';
export type Level = 'first' | 'beginner' | 'intermediate' | 'advanced';
export type Style = 'relaxed' | 'scenic' | 'full' | 'family' | 'lakes' | 'cycling' | 'hiking';
export interface PlannerPreferences { who?: Who; level?: Level; style?: Style; date?: string }
export interface PlannerRecommendation { resort: ResortId; reasons: Record<Lang, string[]>; caution?: T }

/** Resort-level only – the site has no verified piste-by-piste metadata, so no single run is ever claimed. */
export function recommend(p: PlannerPreferences, season: Season): PlannerRecommendation {
  if (season === 'summer') {
    const bike = p.style === 'cycling';
    return bike || p.style === 'family'
      ? { resort: 'wildkogel', reasons: { de: [bike ? 'Mountainbike-Strecken mit Gletscherblick' : 'Erlebnisse für Familien im Nationalpark Hohe Tauern', 'Rund 9 Minuten mit dem Auto bis zur Smaragdbahn'], en: [bike ? 'Mountain-bike trails with glacier views' : 'Family experiences in the Hohe Tauern National Park', 'About 9 minutes by car to the Smaragdbahn'] } }
      : { resort: 'kitzski', reasons: { de: ['Mit der Gondel direkt ab Hollersbach auf den Berg', p.style === 'scenic' ? 'Aussicht über die Kitzbüheler Alpen' : 'Wanderungen ab der Bergstation', 'Nur rund 2 km von der Pension'], en: ['Straight up the mountain by gondola from Hollersbach', p.style === 'scenic' ? 'Views across the Kitzbühel Alps' : 'Hikes from the top station', 'Only about 2 km from the guesthouse'] },
          caution: { de: 'Betriebszeiten der Bahn bitte vorab auf der offiziellen Seite prüfen.', en: 'Please check the lift’s operating times on the official website first.' } };
  }
  const gentle = p.level === 'first' || p.level === 'beginner' || p.who === 'family' || p.style === 'family';
  if (gentle) return {
    resort: 'wildkogel',
    reasons: { de: ['Familienfreundliche Pisten im Nationalpark Hohe Tauern', 'Rodeln unter Flutlicht als Ausklang', 'Rund 12 Minuten mit dem Auto'], en: ['Family-friendly slopes in the Hohe Tauern National Park', 'Floodlit tobogganing to end the day', 'About 12 minutes by car'] },
    caution: { de: 'Ob es passt, hängt von den aktuell geöffneten Pisten, Skikursen und dem eigenen Können ab – bitte vorab prüfen.', en: 'Suitability depends on the pistes currently open, ski lessons and your own ability – please check before you go.' },
  };
  return {
    resort: 'kitzski',
    reasons: {
      de: ['Direkter Einstieg über die Panoramabahn – nur rund 2 km', p.style === 'scenic' ? 'Weite Ausblicke über die Kitzbüheler Alpen' : 'Großes, zusammenhängendes Skigebiet für einen ganzen Tag', p.level === 'advanced' ? 'Anspruchsvolle markierte Pisten im Skigebiet – bitte nur gesicherte Pisten' : 'Abfahrten für jedes Tempo'],
      en: ['Direct access via the Panoramabahn – only about 2 km', p.style === 'scenic' ? 'Wide views across the Kitzbühel Alps' : 'A large connected ski area for a full day', p.level === 'advanced' ? 'Challenging marked pistes in the ski area – groomed, marked runs only' : 'Runs for every pace'],
    },
    caution: { de: 'Geöffnete Lifte und Pisten ändern sich täglich – bitte den offiziellen Status prüfen.', en: 'Open lifts and pistes change daily – please check the official status.' },
  };
}

export interface SlopeProfile { id: string; title: T; text: T; prefs: PlannerPreferences }
export const PROFILES: Record<Season, SlopeProfile[]> = {
  winter: [
    { id: 'explorer', title: { de: 'Der Entdecker', en: 'The Explorer' }, text: { de: 'Genießen, schauen, gleiten.', en: 'Scenic, relaxed skiing.' }, prefs: { level: 'intermediate', style: 'scenic' } },
    { id: 'progresser', title: { de: 'Der Aufsteiger', en: 'The Progresser' }, text: { de: 'Mit jedem Schwung sicherer.', en: 'Building confidence.' }, prefs: { level: 'beginner', style: 'relaxed' } },
    { id: 'adventurer', title: { de: 'Der Abenteurer', en: 'The Adventurer' }, text: { de: 'Anspruchsvolle, präparierte Pisten.', en: 'Challenging groomed pistes.' }, prefs: { level: 'advanced', style: 'full' } },
    { id: 'family', title: { de: 'Die Familie', en: 'The Family' }, text: { de: 'Gemeinsam am Berg.', en: 'Together on the mountain.' }, prefs: { who: 'family', style: 'family' } },
  ],
  summer: [
    { id: 'explorer', title: { de: 'Aussichtsgenießer', en: 'Scenic Explorer' }, text: { de: 'Gipfelblicke ohne Eile.', en: 'Summit views, no rush.' }, prefs: { style: 'scenic' } },
    { id: 'hiker', title: { de: 'Bergwanderer', en: 'Mountain Hiker' }, text: { de: 'Wege, Almen, Höhenmeter.', en: 'Trails, pastures, altitude.' }, prefs: { style: 'hiking' } },
    { id: 'family', title: { de: 'Familienabenteurer', en: 'Family Adventurer' }, text: { de: 'Erlebnisse für alle.', en: 'Adventures for everyone.' }, prefs: { style: 'family' } },
    { id: 'cycling', title: { de: 'Radbegeisterte', en: 'Cycling Enthusiast' }, text: { de: 'Trails mit Gletscherblick.', en: 'Trails with glacier views.' }, prefs: { style: 'cycling' } },
  ],
};
