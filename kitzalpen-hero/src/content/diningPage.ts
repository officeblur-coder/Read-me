import type { Lang } from './hero';

/**
 * Restaurant page (preview route #restaurant; live: /restaurant/).
 * Facts: kitzalpen.at/restaurant/ (see content/restaurant.ts) – breakfast 08:00–10:00 (buffet),
 * dinner 17:00–21:00, Tuesday–Sunday, Monday closed, menu PDF.
 * Photos: dishes supplied by the client (Nov 2026); interiors from content/restaurant.ts;
 * bar, breakfast and dinner photos from the owner's photo shoot (Nov 2026). Dishes are described by what
 * the photo shows – the menu PDF is the source for names and prices.
 */
const D = `${import.meta.env.BASE_URL}images/dining/`;
const R = `${import.meta.env.BASE_URL}images/restaurant/`;
export const dimg = (n: string) => `${D}${n}.webp`;
export const rimg = (n: string, w = 1600) => `${R}${n}-${w}.webp`;

export interface Dish { id: string; title: Record<Lang, string>; note: Record<Lang, string> }
export const DISHES: Dish[] = [
  { id: 'dish-pan', title: { de: 'Aus der Pfanne', en: 'From the pan' }, note: { de: 'Geschmortes Rindfleisch mit Paprika, im Gusseisen serviert', en: 'Braised beef with peppers, served in cast iron' } },
  { id: 'dish-pasta', title: { de: 'Pasta', en: 'Pasta' }, note: { de: 'Penne in Tomatensauce mit Hartkäse und Kräutern', en: 'Penne in tomato sauce with hard cheese and herbs' } },
  { id: 'dish-steak', title: { de: 'Am Abend', en: 'For dinner' }, note: { de: 'Fleisch in heller Pfeffersauce mit Röstkartoffeln', en: 'Meat in a pale pepper sauce with roast potatoes' } },
  { id: 'dish-falafel', title: { de: 'Vegetarisch', en: 'Vegetarian' }, note: { de: 'Falafel auf Hummus mit Fladenbrot', en: 'Falafel on hummus with flatbread' } },
  { id: 'dish-dessert', title: { de: 'Zum Kaffee', en: 'With coffee' }, note: { de: 'Schokoladenkuchen mit Pfirsich und Minze', en: 'Chocolate cake with peach and mint' } },
];

export interface MealPic { id: string; alt: Record<Lang, string> }
export const MEALS: Record<'breakfast' | 'dinner', MealPic[]> = {
  breakfast: [
    { id: 'bf-buffet', alt: { de: 'Das Frühstücksbuffet mit Brot, Obst, Säften, Aufschnitt und Marmeladen', en: 'The breakfast buffet with bread, fruit, juices, cold cuts and jams' } },
    { id: 'bf-room', alt: { de: 'Die Gaststube am Morgen mit gedeckten Tischen und Buffet', en: 'The dining room in the morning with laid tables and buffet' } },
    { id: 'bf-crackling', alt: { de: 'Knuspriger Speck mit roten Zwiebelringen', en: 'Crispy bacon with red onion rings' } },
    { id: 'bf-cake', alt: { de: 'Hausgemachter Marmorkuchen mit Minze', en: 'Home-made marble cake with mint' } },
    { id: 'bf-cereal', alt: { de: 'Cerealien und Milch am Buffet', en: 'Cereals and milk at the buffet' } },
    { id: 'bf-fruit', alt: { de: 'Obstsalat im Glas vor einem Korb grüner Äpfel', en: 'Fruit salad in a jar in front of a basket of green apples' } },
  ],
  dinner: [
    { id: 'dn-corner', alt: { de: 'Für das Abendessen gedeckter Ecktisch mit Weingläsern', en: 'Corner table laid for dinner with wine glasses' } },
    { id: 'dn-buffet', alt: { de: 'Das Abendbuffet mit Suppen, warmen Speisen und Salaten', en: 'The dinner buffet with soups, hot dishes and salads' } },
    { id: 'dn-ham', alt: { de: 'Geschmortes Fleisch mit Sauerkraut und Kartoffelpüree', en: 'Braised meat with sauerkraut and mashed potatoes' } },
    { id: 'dn-tiramisu', alt: { de: 'Tiramisu im Glas, dahinter Muffins', en: 'Tiramisu in glasses, muffins behind' } },
    { id: 'dn-sauces', alt: { de: 'Saucen und Salate am Abendbuffet', en: 'Sauces and salads at the dinner buffet' } },
    { id: 'dn-room', alt: { de: 'Die Gaststube am Abend', en: 'The dining room in the evening' } },
  ],
};
export const MEALS_COPY = {
  de: { eyebrow: 'Frühstück & Abendessen', title: 'Vom Morgen bis zum Abend.', tabs: { breakfast: 'Frühstück', dinner: 'Abendessen' }, hours: { breakfast: 'Täglich 08:00 – 10:00 · Buffet', dinner: 'Di – So 17:00 – 21:00' } },
  en: { eyebrow: 'Breakfast & dinner', title: 'From morning to evening.', tabs: { breakfast: 'Breakfast', dinner: 'Dinner' }, hours: { breakfast: 'Daily 8 – 10 am · buffet', dinner: 'Tue – Sun 5 – 9 pm' } },
};

export const DINING = {
  de: {
    eyebrow: 'Restaurant & Bar · Hollersbach',
    title: ['Am Tisch.', 'Mitten in', 'den Bergen.'],
    heroAlt: 'Die Gaststube mit karierten Tischdecken, Holzstühlen, türkisen Sitzbänken und Korblampen',
    sub: 'Vom reichhaltigen Frühstücksbuffet bis zum Abendessen in der warmen Gaststube – und danach auf ein Glas an die Bar.',
    menu: 'Speisekarte (PDF)',
    today: 'Heute',
    open: 'Geöffnet', closedToday: 'Heute Ruhetag',
    dayEyebrow: 'Ein Tag am Tisch',
    moments: [
      { time: '08:00', end: '10:00', label: 'Morgens', title: 'Frühstücksbuffet', text: 'Ein reichhaltiges Buffet für den Start in den Bergtag – vom Brotkorb bis zum Aufschnitt.' },
      { time: '17:00', end: '21:00', label: 'Abends', title: 'Abendessen', text: 'Regionale Spezialitäten und Hausgemachtes in gemütlicher Atmosphäre.' },
      { time: '21:00', end: '', label: 'Danach', title: 'An der Bar', text: 'Altholz, Fellhocker und ein frisch gezapftes Glas zum Ausklang.' },
    ],
    kitchenEyebrow: 'Aus unserer Küche',
    kitchenTitle: 'Mit Liebe angerichtet.',
    kitchenNote: 'Beispiele aus unserer Küche – das aktuelle Angebot finden Sie in der Speisekarte.',
    roomsEyebrow: 'Die Gaststube',
    roomsTitle: 'Holz, Karo und warmes Licht.',
    hoursTitle: 'Öffnungszeiten',
    hours: [['Frühstück', '08:00 – 10:00'], ['Abendessen', '17:00 – 21:00']] as [string, string][],
    days: 'Dienstag – Sonntag', closed: 'Montag Ruhetag',
    week: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    menuText: 'Alle Gerichte und Getränke in unserer aktuellen Speisekarte.',
  },
  en: {
    eyebrow: 'Restaurant & bar · Hollersbach',
    title: ['At the table.', 'In the middle', 'of the mountains.'],
    heroAlt: 'The dining room with checked tablecloths, wooden chairs, teal benches and wicker lamps',
    sub: 'From a generous breakfast buffet to dinner in the warm dining room – and a glass at the bar afterwards.',
    menu: 'Menu (PDF)',
    today: 'Today',
    open: 'Open', closedToday: 'Closed today',
    dayEyebrow: 'A day at the table',
    moments: [
      { time: '08:00', end: '10:00', label: 'Morning', title: 'Breakfast buffet', text: 'A generous buffet to start your mountain day – from the bread basket to cold cuts.' },
      { time: '17:00', end: '21:00', label: 'Evening', title: 'Dinner', text: 'Regional specialities and home-made dishes in a cosy atmosphere.' },
      { time: '21:00', end: '', label: 'Afterwards', title: 'At the bar', text: 'Reclaimed wood, sheepskin stools and a freshly poured glass to end the day.' },
    ],
    kitchenEyebrow: 'From our kitchen',
    kitchenTitle: 'Plated with care.',
    kitchenNote: 'Examples from our kitchen – see the menu for what is currently on offer.',
    roomsEyebrow: 'The dining room',
    roomsTitle: 'Wood, checks and warm light.',
    hoursTitle: 'Opening hours',
    hours: [['Breakfast', '08:00 – 10:00'], ['Dinner', '17:00 – 21:00']] as [string, string][],
    days: 'Tuesday – Sunday', closed: 'Closed on Mondays',
    week: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    menuText: 'All dishes and drinks in our current menu.',
  },
};
