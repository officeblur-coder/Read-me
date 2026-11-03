export type Lang = 'de' | 'en';
export type Season = 'summer' | 'winter';

/** Real pages of kitzalpen.at – no invented URLs. */
const SITE = 'https://www.kitzalpen.at';

export const NAV: Record<Lang, { label: string; href: string }[]> = {
  de: [
    { label: 'Pension', href: `${SITE}/pension/` },
    { label: 'Chalet', href: `${SITE}/chalet/` },
    { label: 'Zimmer', href: `${SITE}/rooms/` },
    { label: 'Restaurant', href: `${SITE}/restaurant/` },
    { label: 'Aktivitäten', href: `${SITE}/activities/` },
    { label: 'Gruppen', href: `${SITE}/group-activities/` },
    { label: 'Kontakt', href: `${SITE}/contact/` },
  ],
  en: [
    { label: 'Guesthouse', href: `${SITE}/en/pension/` },
    { label: 'Chalet', href: `${SITE}/en/chalet/` },
    { label: 'Rooms', href: `${SITE}/en/rooms/` },
    { label: 'Restaurant', href: `${SITE}/en/restaurant/` },
    { label: 'Activities', href: `${SITE}/en/activities/` },
    { label: 'Groups', href: `${SITE}/en/group-activities/` },
    { label: 'Contact', href: `${SITE}/en/contact/` },
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
    adultsHint: 'ab 14 Jahren',
    children: 'Kinder',
    childrenHint: '0 – 13 Jahre',
    check: 'Verfügbarkeit prüfen',
    done: 'Fertig',
    nights: (n: number) => (n === 1 ? '1 Nacht' : `${n} Nächte`),
    guestCount: (n: number) => (n === 1 ? '1 Gast' : `${n} Gäste`),
    errDates: 'Bitte Anreise und Abreise wählen.',
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
    adultsHint: '14 years and older',
    children: 'Children',
    childrenHint: '0 – 13 years',
    check: 'Check availability',
    done: 'Done',
    nights: (n: number) => (n === 1 ? '1 night' : `${n} nights`),
    guestCount: (n: number) => (n === 1 ? '1 guest' : `${n} guests`),
    errDates: 'Please choose arrival and departure.',
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
 * The two original photographs and where the building sits in each.
 * lx/ly = centre of the balcony façade (fraction of image), bh = building height
 * from ridge to ground (fraction of image height). Used to line the two up.
 */
export const PHOTOS = {
  summer: { name: 'summer', w: 1600, h: 1031, lx: 0.68, ly: 0.43, bh: 0.57, alt: 'Die Pension im Sommer, Terrasse und Hecke vor den Bergen' },
  winter: { name: 'winter', w: 1600, h: 1019, lx: 0.615, ly: 0.5, bh: 0.39, alt: 'Die Pension im Winter, tief verschneit' },
} as const;
export type Photo = (typeof PHOTOS)[Season];
