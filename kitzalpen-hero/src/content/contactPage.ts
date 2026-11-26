/**
 * Contact page (preview route #contact; live: /contact/). Data as on kitzalpen.at/en/contact/ (Nov 2026):
 * address, phone, email, WhatsApp, reception 07:30–23:00, route + Google Maps links, form fields.
 * The live form's endpoint is not public, so this form prepares the enquiry as an e-mail or a WhatsApp
 * message with all fields filled in – nothing is sent anywhere else.
 */
export const CONTACT = {
  address: ['Reitlehen 42', '5731 Hollersbach im Pinzgau', 'Salzburg, Austria'],
  tel: '+436642376571', telLabel: '+43 664 2376571',
  mail: 'kitzbuhelalpenpension@gmail.com',
  wa: '40748192821',
  route: 'https://maps.app.goo.gl/EfXXFEyuBKU49ENV8',
  maps: 'https://maps.app.goo.gl/5pN6vJZboPjuMqSo6',
  facebook: 'https://www.facebook.com/p/Kitzbuhel-Alpen-Pension-100054288530609/',
  embed: 'https://www.google.com/maps?q=Reitlehen%2042,%205731%20Hollersbach%20im%20Pinzgau&z=14&output=embed',
  reception: [7 * 60 + 30, 23 * 60] as [number, number],
};

export const CONTACT_COPY = {
  de: {
    eyebrow: 'Kontakt · Hollersbach im Pinzgau',
    title: ['Kontakt.', 'Lassen Sie uns Ihren Aufenthalt gemeinsam planen.'],
    sub: 'Fragen Sie nach Preisen, aktuellen Angeboten und Arrangements – wir melden uns innerhalb eines Arbeitstags mit einem passenden Angebot.',
    call: 'Anrufen', write: 'E-Mail', whatsapp: 'WhatsApp',
    formEyebrow: 'Anfrage', formTitle: 'Ihre Anfrage',
    f: { name: 'Name', email: 'E-Mail', phone: 'Telefon', room: 'Zimmertyp', any: 'Keine Präferenz', arrive: 'Anreise', depart: 'Abreise', guests: 'Gäste', msg: 'Nachricht', msgPh: 'Wünsche, Gruppenzusammensetzung, Fragen …' },
    rooms: ['Doppelzimmer', 'Dreibettzimmer', 'Familienzimmer mit Verbindungstür', 'Vierbettzimmer', 'KitzAlpen Chalet'],
    sendMail: 'Per E-Mail senden', sendWa: 'Per WhatsApp senden',
    howNote: 'Ihre Anfrage öffnet sich fertig ausgefüllt in Ihrem E-Mail-Programm oder in WhatsApp.',
    required: 'Bitte Name, E-Mail, Telefon und Reisedaten angeben.',
    dateErr: 'Die Abreise muss nach der Anreise liegen.',
    subject: 'Anfrage über die Website',
    infoTitle: 'Kontaktdaten',
    reception: 'Rezeption', hours: '07:30 – 23:00',
    openNow: 'Rezeption jetzt besetzt', closedNow: 'Rezeption ab 07:30 wieder besetzt',
    route: 'Route planen', maps: 'In Google Maps öffnen',
    book: 'Direkt online buchen',
    mapLoad: 'Karte laden', mapNote: 'Beim Laden der Karte werden Daten an Google übertragen.',
  },
  en: {
    eyebrow: 'Contact · Hollersbach im Pinzgau',
    title: ['Contact.', 'Let’s plan your stay together.'],
    sub: 'Ask about prices, current offers and arrangements – we reply within one business day with a tailored offer.',
    call: 'Call', write: 'Email', whatsapp: 'WhatsApp',
    formEyebrow: 'Enquiry', formTitle: 'Your enquiry',
    f: { name: 'Name', email: 'Email', phone: 'Phone', room: 'Room type', any: 'No preference', arrive: 'Check-in', depart: 'Check-out', guests: 'Guests', msg: 'Message', msgPh: 'Wishes, group composition, questions …' },
    rooms: ['Double room', 'Triple room', 'Family room with connecting door', 'Four-bed room', 'KitzAlpen Chalet'],
    sendMail: 'Send by email', sendWa: 'Send via WhatsApp',
    howNote: 'Your enquiry opens ready-filled in your email app or in WhatsApp.',
    required: 'Please enter name, email, phone and travel dates.',
    dateErr: 'Check-out must be after check-in.',
    subject: 'Enquiry via the website',
    infoTitle: 'Contact details',
    reception: 'Reception', hours: '7:30 am – 11:00 pm',
    openNow: 'Reception open now', closedNow: 'Reception opens again at 7:30 am',
    route: 'Plan your route', maps: 'Open in Google Maps',
    book: 'Book directly online',
    mapLoad: 'Load map', mapNote: 'Loading the map sends data to Google.',
  },
};
