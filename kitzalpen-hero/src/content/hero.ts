export type Lang = 'de' | 'en';
export type Season = 'summer' | 'winter';

/** Real pages of kitzalpen.at – no invented URLs. */
const SITE = 'https://www.kitzalpen.at';

/** `mega: true` opens the accommodation panel (pension, chalet, room categories) instead of linking away. */
export interface NavItem { label: string; href: string; mega?: boolean }
export const NAV: Record<Lang, NavItem[]> = {
  de: [
    { label: 'Unterkunft', href: '#pension', mega: true }, // preview route – live: `${SITE}/pension/`
    { label: 'Restaurant', href: `${SITE}/restaurant/` },
    { label: 'Aktivitäten', href: `${SITE}/activities/` },
    { label: 'Gruppen', href: `${SITE}/group-activities/` },
    { label: 'Kontakt', href: `${SITE}/contact/` },
  ],
  en: [
    { label: 'Accommodation', href: '#pension', mega: true }, // preview route – live: `${SITE}/en/pension/`
    { label: 'Restaurant', href: `${SITE}/en/restaurant/` },
    { label: 'Activities', href: `${SITE}/en/activities/` },
    { label: 'Groups', href: `${SITE}/en/group-activities/` },
    { label: 'Contact', href: `${SITE}/en/contact/` },
  ],
};

/** Footer quick links keep the full flat list. */
export const FOOTER_NAV: Record<Lang, NavItem[]> = {
  de: [
    { label: 'Pension', href: '#pension' }, { label: 'Chalet', href: '#chalet' }, { label: 'Zimmer', href: '#pension-rooms' },
    { label: 'Restaurant', href: `${SITE}/restaurant/` }, { label: 'Aktivitäten', href: `${SITE}/activities/` },
    { label: 'Gruppen', href: `${SITE}/group-activities/` }, { label: 'Kontakt', href: `${SITE}/contact/` },
  ],
  en: [
    { label: 'Guesthouse', href: '#pension' }, { label: 'Chalet', href: '#chalet' }, { label: 'Rooms', href: '#pension-rooms' },
    { label: 'Restaurant', href: `${SITE}/en/restaurant/` }, { label: 'Activities', href: `${SITE}/en/activities/` },
    { label: 'Groups', href: `${SITE}/en/group-activities/` }, { label: 'Contact', href: `${SITE}/en/contact/` },
  ],
};

export const COPY = {
  de: {
    headline: ['Zwei Jahreszeiten.', 'Ein Zuhause in den Alpen.'],
    sub: ['Pension', 'Chalet', 'Restaurant', 'Naturerlebnisse'],
    subShort: ['Pension', 'Chalet', 'Restaurant'],
    cta: 'Jetzt Verfügbarkeit prüfen',
    book: 'Jetzt buchen',
    summer: 'Sommer',
    winter: 'Winter',
    arrival: 'Anreise',
    departure: 'Abreise',
    guests: 'Gäste',
    adults: 'Erwachsene',
    adultsHint: 'ab 18 Jahren',
    children: 'Kinder',
    childrenHint: '0 – 17 Jahre',
    childAge: (n: number) => `Alter Kind ${n}`,
    choose: 'Alter wählen',
    years: (y: number) => (y === 1 ? '1 Jahr' : `${y} Jahre`),
    errAges: 'Bitte das Alter jedes Kindes angeben.',
    opened: 'Das Buchungssystem wurde in einem neuen Tab geöffnet.',
    check: 'Verfügbarkeit prüfen',
    done: 'Fertig',
    nights: (n: number) => (n === 1 ? '1 Nacht' : `${n} Nächte`),
    guestCount: (n: number) => (n === 1 ? '1 Gast' : `${n} Gäste`),
    errDates: 'Bitte Anreise und Abreise wählen – oder beide leer lassen für den Kalender.',
    errOrder: 'Die Abreise muss nach der Anreise liegen.',
    sent: 'Anfrage vorbereitet',
    sentNote: 'Die Anbindung an das Buchungssystem folgt bei der Integration.',
    compare: 'Sommer und Winter vergleichen',
    compareHint: 'Pfeiltasten verschieben die Trennlinie',
    menu: 'Menü öffnen',
    close: 'Menü schließen',
    lang: 'Sprache',
    skip: 'Zum Inhalt springen',
    next: 'Der nächste Abschnitt folgt hier.',
    address: 'Reitlehen 42 · 5731 Hollersbach im Pinzgau',
  },
  en: {
    headline: ['Two seasons.', 'One home in the Alps.'],
    sub: ['Guesthouse', 'Chalet', 'Restaurant', 'Nature'],
    subShort: ['Guesthouse', 'Chalet', 'Restaurant'],
    cta: 'Check availability',
    book: 'Book now',
    summer: 'Summer',
    winter: 'Winter',
    arrival: 'Arrival',
    departure: 'Departure',
    guests: 'Guests',
    adults: 'Adults',
    adultsHint: '18 years and older',
    children: 'Children',
    childrenHint: '0 – 17 years',
    childAge: (n: number) => `Age of child ${n}`,
    choose: 'Choose age',
    years: (y: number) => (y === 1 ? '1 year' : `${y} years`),
    errAges: 'Please give the age of each child.',
    opened: 'The booking system opened in a new tab.',
    check: 'Check availability',
    done: 'Done',
    nights: (n: number) => (n === 1 ? '1 night' : `${n} nights`),
    guestCount: (n: number) => (n === 1 ? '1 guest' : `${n} guests`),
    errDates: 'Please choose arrival and departure – or leave both empty to see the calendar.',
    errOrder: 'Departure must be after arrival.',
    sent: 'Request prepared',
    sentNote: 'The booking system will be connected during integration.',
    compare: 'Compare summer and winter',
    compareHint: 'Arrow keys move the divider',
    menu: 'Open menu',
    close: 'Close menu',
    lang: 'Language',
    skip: 'Skip to content',
    next: 'The next section follows here.',
    address: 'Reitlehen 42 · 5731 Hollersbach im Pinzgau',
  },
};
export type Copy = (typeof COPY)['de'];

/**
 * The two original photographs and one shared landmark in each:
 * lx/ly = top-left corner of the upper balcony (fraction of image),
 * bh = height from upper balcony rail to lower balcony beam (fraction of image height).
 * Both are the same building from the same viewpoint, so they line up exactly.
 */
export interface Photo { name: string; w: number; h: number; sizes: number[]; lx: number; ly: number; bh: number; alt: string }
/** Client photos (Nov 2026). lx/ly = centre of the house, used to keep it in the same place in both seasons. */
export const PHOTOS: Record<Season, Photo> = {
  summer: { name: 'hero/summer-d', w: 1671, h: 941, sizes: [960, 1671], lx: 0.56, ly: 0.52, bh: 0.6, alt: 'Die Pension im Sommer mit Holzbalkonen, Blumen, Terrasse und Bergen im Hintergrund' },
  winter: { name: 'hero/winter-d', w: 1672, h: 941, sizes: [960, 1672], lx: 0.66, ly: 0.63, bh: 0.6, alt: 'Die Pension im Winter, verschneit, vor bewaldeten Bergen in der Morgensonne' },
};
/** Portrait versions for phones. */
export const PHOTOS_M: Record<Season, Photo> = {
  summer: { name: 'hero/summer-m', w: 941, h: 1671, sizes: [640, 941], lx: 0.52, ly: 0.52, bh: 0.3, alt: PHOTOS.summer.alt },
  winter: { name: 'hero/winter-m', w: 941, h: 1672, sizes: [640, 941], lx: 0.54, ly: 0.53, bh: 0.3, alt: PHOTOS.winter.alt },
};
