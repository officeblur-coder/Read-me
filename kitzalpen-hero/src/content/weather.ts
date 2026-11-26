/**
 * Weather band: Hollersbach + three ski areas.
 * Source: Open-Meteo (https://open-meteo.com) – free, no key, CORS enabled, CC BY 4.0
 * (attribution shown in the band). Snow depth is a weather-model estimate for the
 * given point and altitude, not the resort's measured snow report.
 * Coordinates/altitudes are representative points (village, mountain stations).
 */
export interface WeatherSpot { id: string; name: string; lat: number; lon: number; alt: number; ski: boolean }

export const SPOTS: WeatherSpot[] = [
  { id: 'hollersbach', name: 'Hollersbach', lat: 47.2767, lon: 12.4236, alt: 807, ski: false },
  { id: 'kitzski', name: 'KitzSki', lat: 47.4246, lon: 12.3684, alt: 1665, ski: true },
  { id: 'wildkogel', name: 'Wildkogel', lat: 47.2817, lon: 12.2849, alt: 2100, ski: true },
  { id: 'kaprun', name: 'Kaprun · Kitzsteinhorn', lat: 47.1963, lon: 12.6917, alt: 2450, ski: true },
];

export const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?' +
  new URLSearchParams({
    latitude: SPOTS.map((s) => s.lat).join(','),
    longitude: SPOTS.map((s) => s.lon).join(','),
    elevation: SPOTS.map((s) => s.alt).join(','),
    current: 'temperature_2m,weather_code,wind_speed_10m,snow_depth',
    daily: 'snowfall_sum,temperature_2m_max,temperature_2m_min',
    timezone: 'Europe/Vienna',
    forecast_days: '1',
  }).toString();

export interface SpotNow { temp: number; code: number; wind: number; snowCm: number; newSnowCm: number; max: number; min: number }
export interface WeatherData { time: string; spots: Record<string, SpotNow> }

/** Normalises the Open-Meteo multi-location response. */
export function parseOpenMeteo(json: unknown): WeatherData {
  const arr = (Array.isArray(json) ? json : [json]) as Array<{ current: Record<string, number | string>; daily: Record<string, number[]> }>;
  const spots: Record<string, SpotNow> = {};
  arr.forEach((r, i) => {
    const s = SPOTS[i]; if (!s || !r?.current) return;
    spots[s.id] = {
      temp: Number(r.current.temperature_2m), code: Number(r.current.weather_code), wind: Number(r.current.wind_speed_10m),
      snowCm: Math.round(Number(r.current.snow_depth ?? 0) * 100), newSnowCm: Math.round(Number(r.daily?.snowfall_sum?.[0] ?? 0)),
      max: Number(r.daily?.temperature_2m_max?.[0]), min: Number(r.daily?.temperature_2m_min?.[0]),
    };
  });
  return { time: String(arr[0]?.current?.time ?? ''), spots };
}

export type Sky = 'sun' | 'partly' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm';
/** WMO weather code → icon + DE/EN words */
export function sky(code: number): Sky {
  if (code === 0 || code === 1) return 'sun';
  if (code === 2) return 'partly';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'rain';
}
export const SKY_LABEL: Record<Sky, { de: string; en: string }> = {
  sun: { de: 'sonnig', en: 'sunny' }, partly: { de: 'leicht bewölkt', en: 'partly cloudy' }, cloud: { de: 'bewölkt', en: 'cloudy' },
  fog: { de: 'Nebel', en: 'fog' }, rain: { de: 'Regen', en: 'rain' }, snow: { de: 'Schneefall', en: 'snowfall' }, storm: { de: 'Gewitter', en: 'thunderstorm' },
};
