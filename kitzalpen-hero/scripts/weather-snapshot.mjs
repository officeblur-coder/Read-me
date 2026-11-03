// Writes public/weather.json – a fallback snapshot for previews that cannot call
// Open-Meteo directly (e.g. sandboxed previews). The live site fetches fresh data.
// Usage: node scripts/weather-snapshot.mjs
import { writeFileSync } from 'node:fs';

const spots = [
  [47.2767, 12.4236, 807], [47.4246, 12.3684, 1665], [47.2817, 12.2849, 2100], [47.1963, 12.6917, 2450],
];
const url = 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
  latitude: spots.map((s) => s[0]).join(','), longitude: spots.map((s) => s[1]).join(','), elevation: spots.map((s) => s[2]).join(','),
  current: 'temperature_2m,weather_code,wind_speed_10m,snow_depth', daily: 'snowfall_sum,temperature_2m_max,temperature_2m_min',
  timezone: 'Europe/Vienna', forecast_days: '1',
});
const res = await fetch(url);
if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
writeFileSync(new URL('../public/weather.json', import.meta.url), JSON.stringify(await res.json()));
console.log('public/weather.json written');
