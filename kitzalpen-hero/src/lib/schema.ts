import { ROOMS } from '../content/rooms';
import { FAQ } from '../content/faq';
import { TOP } from '../content/topExperiences';
import { SKI_AREAS } from '../content/skiAreas';
import { PLACES, TOURS } from '../content/tours';
import type { Lang, Season } from '../content/hero';
import { baseLang, tr } from './i18n';
import type { SiteLang } from './i18n';
import { SITE, pathFor, type Route } from './routes';

/**
 * Per-page structured data (schema.org JSON-LD) and share image. The business itself (LodgingBusiness) is in index.html.
 * Only facts that the site already publishes.
 */
const IMG: Partial<Record<Route, string>> = {
  home: 'hero/winter-d.jpg', pension: 'hero/winter-d.jpg', 'all-rooms': 'rooms/room-1.jpg', 'room-double': 'rooms/room-1.jpg', 'room-triple': 'rooms/room-2.jpg',
  'room-family': 'rooms/room-3.jpg', 'room-quad': 'rooms/room-4.jpg', chalet: 'chalet/winter.jpg', restaurant: 'restaurant/hall.jpg', groups: 'groups/grossglockner.webp',
  contact: 'hero/winter-d.jpg', mountain: 'real/kitzski-gondola-couple.webp', winter: 'real/ski-panorama.webp', summer: 'real/panoramabahn-summer.webp',
  explore: 'real/kitzsteinhorn-aerial.webp', experiences: 'real/kitzsteinhorn-aerial.webp', ski: 'real/ski-panorama.webp', tours: 'real/winter-walk.webp',
  places: 'winter/town-kitzbuehel.webp', arrival: 'winter/town-mittersill.webp',
};
export const shareImage = (r: Route) => `${SITE}/images/${IMG[r] ?? 'hero/winter-d.jpg'}`;

const PARENT: Partial<Record<Route, Route>> = {
  'room-double': 'all-rooms', 'room-triple': 'all-rooms', 'room-family': 'all-rooms', 'room-quad': 'all-rooms', 'all-rooms': 'pension',
  experiences: 'explore', ski: 'explore', tours: 'explore', places: 'explore', winter: 'explore', summer: 'explore', arrival: 'explore',
};
const BUSINESS = `${SITE}/#lodging`;

export function pageSchema(route: Route, lang: SiteLang, name: string, description: string, nameOf: (r: Route) => string, season: Season = 'winter') {
  const L: Lang = baseLang(lang);
  const url = SITE + pathFor(route, lang);
  const trail: Route[] = [];
  for (let r: Route | undefined = route; r && r !== 'home'; r = PARENT[r]) trail.unshift(r);
  const graph: Record<string, unknown>[] = [{
    '@type': 'WebPage', '@id': `${url}#page`, url, name, description, inLanguage: lang, primaryImageOfPage: shareImage(route),
    isPartOf: { '@type': 'WebSite', '@id': `${SITE}/#site`, url: `${SITE}/`, name: 'KitzAlpen' }, about: { '@id': BUSINESS },
    ...(trail.length ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
  }];
  if (trail.length) {
    graph.push({
      '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
      itemListElement: [{ r: 'home' as Route, n: 'KitzAlpen' }, ...trail.map((r) => ({ r, n: r === route ? name : nameOf(r) }))]
        .map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.n, item: SITE + pathFor(x.r, lang) })),
    });
  }
  if (route.startsWith('room-')) {
    const room = ROOMS.find((x) => x.slug === route.slice(5));
    if (room) {
      const [min, max] = room.m2.split('–').map(Number);
      graph.push({
        '@type': 'HotelRoom', name, description, url, image: shareImage(route), containedInPlace: { '@id': BUSINESS },
        occupancy: { '@type': 'QuantitativeValue', maxValue: room.guests },
        ...(min ? { floorSize: { '@type': 'QuantitativeValue', minValue: min, maxValue: max || min, unitCode: 'MTK' } } : {}),
      });
    }
  }
  if (route === 'chalet') {
    graph.push({
      '@type': 'House', name, description, url, image: shareImage(route), containedInPlace: { '@id': BUSINESS },
      occupancy: { '@type': 'QuantitativeValue', maxValue: 4 }, numberOfBedrooms: 2,
      potentialAction: { '@type': 'ReserveAction', target: 'https://chalet-kitzalpen.pynbooking.direct/' },
    });
  }
  if (route === 'restaurant') {
    graph.push({
      '@type': 'Restaurant', name: 'KitzAlpen Restaurant & Bar', url, image: shareImage(route), containedInPlace: { '@id': BUSINESS },
      address: { '@type': 'PostalAddress', streetAddress: 'Reitlehen 42', postalCode: '5731', addressLocality: 'Hollersbach im Pinzgau', addressCountry: 'AT' },
      telephone: '+43 664 2376571',
      openingHoursSpecification: [
        { '@type': 'OpeningHoursSpecification', name: 'Breakfast', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '08:00', closes: '10:00' },
        { '@type': 'OpeningHoursSpecification', name: 'Dinner', dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '17:00', closes: '21:00' },
      ],
    });
  }
  const list = (items: Record<string, unknown>[]) => graph.push({ '@type': 'ItemList', name, numberOfItems: items.length, itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, item })) });
  const geo = (lat: number, lon: number) => ({ '@type': 'GeoCoordinates', latitude: lat, longitude: lon });
  if (route === 'faq') {
    graph.push({
      '@type': 'FAQPage', '@id': `${url}#faq`, url, inLanguage: lang,
      mainEntity: FAQ.flatMap((g) => g.items).map((f) => ({ '@type': 'Question', name: tr(f.q[L]), acceptedAnswer: { '@type': 'Answer', text: tr(f.a[L]) } })),
    });
  }
  if (route === 'experiences') list(TOP[season].map((e) => ({ '@type': 'TouristAttraction', name: L === 'en' && e.nameEn ? e.nameEn : e.name, description: tr(e.text[L]), url: e.url, geo: geo(e.lat, e.lon), address: { '@type': 'PostalAddress', addressLocality: e.town, addressCountry: 'AT' } })));
  if (route === 'ski') list(SKI_AREAS.map((a) => ({ '@type': 'SkiResort', name: a.name, url: a.links.status, description: tr(a.features[L].join(' · ')), areaServed: a.region[L] })));
  if (route === 'places') list(PLACES.map((pl) => ({ '@type': 'Place', name: pl.name, description: tr(pl.intro[L]), url: pl.url, geo: geo(pl.lat, pl.lon) })));
  if (route === 'tours') list(TOURS.filter((x) => x.url).map((x) => ({ '@type': 'TouristTrip', name: tr(x.name[L]), url: x.url, ...(x.km ? { description: `${x.km} km${x.up ? ` · ${x.up} m` : ''}` } : {}) })));
  return { '@context': 'https://schema.org', '@graph': graph };
}
