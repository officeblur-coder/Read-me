import type { Lang, Season } from './hero';

type T = Record<Lang, string>;
export type ActivityIcon = 'hike' | 'bike' | 'lake' | 'glider' | 'family' | 'ski' | 'lift' | 'glacier' | 'panorama' | 'peaks';

export interface Activity {
  id: string;
  icon: ActivityIcon;
  title: T;
  text: T;
  /** a short, verified fact (from kitzalpen.at) shown as a chip */
  fact?: T;
  /** longer copy for the dedicated page */
  more: T;
  highlights?: Record<Lang, string[]>;
  photo?: string;            // file stem in /images/activities; none → drawn card
  focus?: string;
  href?: string;             // official website (as linked on kitzalpen.at)
  verify?: T;                // shown when facts are not yet confirmed
}

/* Summer – activities and links exactly as on kitzalpen.at/activities/ */
export const SUMMER: Activity[] = [
  { id: 'hike', icon: 'hike', photo: 'emerald-trail-smaragdweg', focus: '50% 55%',
    title: { de: 'Wandern & Bergpfade', en: 'Hiking & mountain trails' },
    text: { de: 'Almwanderungen, Aussichtspunkte und die Natur der Hohen Tauern.', en: 'Alpine hikes, panoramic viewpoints and Hohe Tauern nature.' },
    fact: { de: 'Smaragdweg · 7 km', en: 'Emerald Trail · 7 km' },
    more: { de: 'Direkt hinter Hollersbach beginnt der Nationalpark Hohe Tauern. Der Smaragdweg im Habachtal führt 7 km zu Europas einziger Smaragdlagerstätte – mit 11 interaktiven Stationen und Rückfahrt per Shuttle.', en: 'The Hohe Tauern National Park begins right behind Hollersbach. The Emerald Trail in the Habach valley leads 7 km to Europe’s only emerald deposit – with 11 interactive stations and a shuttle back.' },
    highlights: { de: ['Nationalpark Hohe Tauern', 'Smaragdweg Habachtal', 'Krimmler Wasserfälle'], en: ['Hohe Tauern National Park', 'Emerald Trail, Habach valley', 'Krimml Waterfalls'] },
    href: 'https://www.wildkogel-arena.at/en/summer/hiking/habachtal/' },
  { id: 'bike', icon: 'bike', photo: 'wildkogel-mountain-biking', focus: '50% 45%',
    title: { de: 'Mountainbike & Radfahren', en: 'Mountain biking & cycling' },
    text: { de: 'Panorama-Radwege und Mountainbike-Abenteuer für jedes Niveau.', en: 'Scenic cycling routes and mountain-bike adventures for every level.' },
    fact: { de: '800 km MTB-Strecken', en: '800 km of MTB trails' },
    more: { de: 'Der Tauernradweg führt 310 km entlang der Salzach direkt durch Hollersbach – zu 90 % asphaltiert und familienfreundlich, E-Bike-Verleih vor Ort. Am Wildkogel warten 800 km Mountainbike-Strecken mit Gletscherblick, Liftstart ab 2.000 m.', en: 'The Tauern Cycle Path runs 310 km along the Salzach right through Hollersbach – 90 % paved and family-friendly, with e-bike hire. At the Wildkogel, 800 km of mountain-bike trails with glacier views start from lifts at 2,000 m.' },
    highlights: { de: ['Tauernradweg 310 km', 'Wildkogel: blau bis schwarz', 'E-Bike-Verleih'], en: ['Tauern Cycle Path 310 km', 'Wildkogel: blue to black', 'E-bike hire'] },
    href: 'https://www.wildkogel-arena.at/en/summer-holidays-cycling-biking' },
  { id: 'lake', icon: 'lake', photo: 'zell-am-see', focus: '50% 55%',
    title: { de: 'Seen & Baden', en: 'Lakes & swimming' },
    text: { de: 'Der Zeller See, Hallenbäder und entspannte Sommertage am Wasser.', en: 'Lake Zell, indoor pools and relaxed summer days by the water.' },
    fact: { de: 'Zeller See', en: 'Lake Zell' },
    more: { de: 'Zell am See mit seinem See liegt in Tagesreichweite. Bei jedem Wetter: das Kristallbad in Wald im Pinzgau, das Kogler Spa in Mittersill mit 60-Meter-Rutsche und das Tauern Spa in Kaprun.', en: 'Zell am See and its lake are an easy day trip. For any weather: the Kristallbad in Wald im Pinzgau, the Kogler Spa in Mittersill with a 60-metre slide, and the Tauern Spa in Kaprun.' },
    highlights: { de: ['Zeller See', 'Kristallbad', 'Tauern Spa Kaprun'], en: ['Lake Zell', 'Kristallbad', 'Tauern Spa Kaprun'] },
    href: 'https://www.zellamsee-kaprun.com' },
  { id: 'glider', icon: 'glider', photo: 'paragliding', focus: '50% 40%',
    title: { de: 'Paragliding', en: 'Paragliding' },
    text: { de: 'Die Alpen aus einer ganz neuen Perspektive erleben.', en: 'Discover the Alps from a completely different perspective.' },
    fact: { de: 'Tandemflüge', en: 'Tandem flights' },
    more: { de: 'Tandemflüge über die Hohen Tauern: Der Pinzgau gilt international als eines der besten Fluggebiete der Welt.', en: 'Tandem flights over the Hohe Tauern: the Pinzgau is recognised internationally as one of the world’s best flying areas.' } },
  { id: 'family', icon: 'family', photo: 'krimml-waterfalls', focus: '50% 50%',
    title: { de: 'Familienausflüge', en: 'Family adventures' },
    text: { de: 'Wasserfälle, Bergbahnen und Erlebnisse für jedes Alter.', en: 'Waterfalls, mountain lifts and experiences for all ages.' },
    fact: { de: 'Krimmler Wasserfälle', en: 'Krimml Waterfalls' },
    more: { de: 'Der Sprühnebel der Krimmler Wasserfälle, der Hochseilpark Saalbach mit Ziplines bis 70 m über dem Glemmtal und die Großglockner Hochalpenstraße – Österreichs höchster Aussichtspunkt.', en: 'The spray of the Krimml Waterfalls, the Saalbach high-ropes park with ziplines up to 70 m above the Glemm valley, and the Grossglockner High Alpine Road – Austria’s highest viewpoint.' },
    highlights: { de: ['Krimmler Wasserfälle', 'Hochseilpark Saalbach', 'Großglockner'], en: ['Krimml Waterfalls', 'Saalbach high-ropes park', 'Grossglockner'] },
    href: 'https://www.wasserfaelle-krimml.at' },
];

/* Winter – the four ski areas presented on kitzalpen.at/ski/, plus Zillertal Arena (requested, not yet on the site) */
export const WINTER: Activity[] = [
  { id: 'kitzski', icon: 'lift', photo: 'kitzski-kitzbuheler-alpen', focus: '50% 50%',
    title: { de: 'KitzSki · Kitzbühel', en: 'KitzSki · Kitzbühel' },
    text: { de: 'Mit der Panoramabahn direkt in den legendären Skikreis.', en: 'Straight into the legendary ski circuit via the Panoramabahn.' },
    fact: { de: '2 km bis zur Panoramabahn', en: '2 km to the Panoramabahn' },
    more: { de: '88 km Skischaukel zwischen Hollersbach/Mittersill und Going – eine der größten zusammenhängenden Pistenerlebnisse der Alpen. Einstieg über die Panoramabahn, 2 km von der Pension.', en: '88 km of connected slopes between Hollersbach/Mittersill and Going – one of the largest linked ski experiences in the Alps. Access via the Panoramabahn, 2 km from the guesthouse.' },
    highlights: { de: ['Panoramabahn als Einstieg', 'Abfahrten rund um Kitzbühel', 'M+ Card Vorteile'], en: ['Panoramabahn access', 'Iconic runs around Kitzbühel', 'M+ Card benefits'] },
    href: 'https://www.kitzski.at/' },
  { id: 'wildkogel', icon: 'ski', photo: 'wildkogel-arena', focus: '50% 50%',
    title: { de: 'Wildkogel-Arena', en: 'Wildkogel Arena' },
    text: { de: 'Familienfreundliche Pisten im Nationalpark Hohe Tauern.', en: 'Family-friendly slopes in the Hohe Tauern National Park.' },
    fact: { de: 'Längste Rodelbahn der Welt', en: 'World’s longest toboggan run' },
    more: { de: 'Entspannte Pisten, breite Familienbereiche und die längste beleuchtete Rodelbahn der Welt – bis hinunter nach Bramberg.', en: 'Relaxed slopes, wide family areas and the world’s longest floodlit toboggan run – all the way down to Bramberg.' },
    highlights: { de: ['Familien- und Anfängergebiet', 'Panoramapisten mit Tauernblick', 'Rodelbahn bis Bramberg'], en: ['Family & beginner area', 'Panoramic slopes, Tauern views', 'Toboggan run to Bramberg'] },
    href: 'https://www.wildkogel-arena.at/' },
  { id: 'kitzsteinhorn', icon: 'glacier', photo: 'kitzsteinhorn-kaprun', focus: '50% 45%',
    title: { de: 'Kitzsteinhorn · Kaprun', en: 'Kitzsteinhorn · Kaprun' },
    text: { de: 'Schneesichere Gletscherpisten und Gipfelwelt 3000.', en: 'Snow-sure glacier slopes and the Gipfelwelt 3000.' },
    fact: { de: 'Gletscher bis 3.029 m', en: 'Glacier up to 3,029 m' },
    more: { de: 'Schneesichere Gletscherpisten bis 3.029 m, die Aussichtsplattform Gipfelwelt 3000 und der Maisi Flitzer Alpin-Coaster am Maiskogel.', en: 'Snow-sure glacier slopes up to 3,029 m, the Gipfelwelt 3000 viewing platform and the Maisi Flitzer alpine coaster on the Maiskogel.' },
    highlights: { de: ['Schneesicherer Gletscher', 'Gipfelwelt 3000', 'Maisi Flitzer'], en: ['Snow-sure glacier', 'Gipfelwelt 3000', 'Maisi Flitzer coaster'] },
    href: 'https://www.kitzsteinhorn.at/' },
  { id: 'schmitten', icon: 'panorama', photo: 'schmittenhohe-zell-am-see', focus: '50% 50%',
    title: { de: 'Schmittenhöhe · Zell am See', en: 'Schmittenhöhe · Zell am See' },
    text: { de: 'Pisten für jedes Niveau mit Blick auf den Zeller See.', en: 'Slopes for every level with views over Lake Zell.' },
    fact: { de: '30+ Dreitausender im Blick', en: '30+ three-thousanders in view' },
    more: { de: 'Ein freier 360°-Blick auf über 30 Dreitausender der Hohen Tauern, abwechslungsreiche Pisten, Fun-Slope und Kinderparcours.', en: 'A free 360° view of more than 30 three-thousand-metre peaks, varied slopes, a fun slope and a kids’ course.' },
    highlights: { de: ['Abwechslungsreiche Pisten', 'Fun-Slope & Kinderparcours', 'Panorama mit Zeller See'], en: ['Varied slopes', 'Fun slope & kids’ course', 'Lake Zell panorama'] },
    href: 'https://www.schmitten.at/' },
  { id: 'zillertal', icon: 'peaks',
    title: { de: 'Zillertal Arena', en: 'Zillertal Arena' },
    text: { de: 'Über den Gerlospass ins Zillertal.', en: 'Over the Gerlos Pass into the Ziller valley.' },
    verify: { de: 'Angaben werden geprüft', en: 'Details being verified' },
    more: { de: 'Die Zillertal Arena ist über den Gerlospass erreichbar. Entfernung, Fahrzeit und Pisteninfos ergänzen wir nach Prüfung.', en: 'The Zillertal Arena is reached via the Gerlos Pass. Distance, travel time and slope details will be added once verified.' },
    href: 'https://www.zillertalarena.com/' },
];

export const ACTIVITIES: Record<Season, Activity[]> = { summer: SUMMER, winter: WINTER };

export const ACT_COPY = {
  de: {
    eyebrow: 'Die Region entdecken',
    summer: { head: ['Sommer.', 'Abseits des Gewöhnlichen.'], sub: 'Bergabenteuer, atemberaubende Landschaften und unvergessliche Momente rund um Hollersbach.', cta: 'Alle Sommer-Aktivitäten entdecken', feature: 'hike-feature', featureAlt: 'Wanderin auf einer Almwiese mit Blick auf Bergsee und Gletschergipfel', caption: 'Hohe Tauern' },
    winter: { head: ['Winter.', 'Finden Sie Ihre Höhe.'], sub: 'Unvergessliche Skitage, verschneite Berge und besondere Wintererlebnisse rund um KitzAlpen.', cta: 'Alle Winter-Aktivitäten entdecken', feature: 'ski-feature', featureAlt: 'Skifahrer im Gegenlicht auf einer frisch präparierten Piste', caption: 'Pinzgau' },
    swipe: 'Wischen',
    visit: 'Website besuchen',
    page: { back: 'Zurück zur Startseite', practical: 'Gut zu wissen', more: 'Mehr Informationen', book: 'Aufenthalt anfragen' },
    practicalSummer: ['Der Tauernradweg führt direkt durch Hollersbach.', 'Mit der M+ Gästekarte erhalten Sie regionale Vorteile.', 'Kostenloser Parkplatz an der Pension.'],
    practicalWinter: ['2 km bis zur Panoramabahn – Einstieg in KitzSki.', 'Skidepot in der Pension, warme Küche am Abend.', 'Mit der M+ Gästekarte erhalten Sie regionale Vorteile.'],
    otherWinter: 'Weitere Skigebiete wie die SkiWelt Wilder Kaiser – Brixental ergänzen wir nach Prüfung von Entfernung und Anreise.',
  },
  en: {
    eyebrow: 'Discover the region',
    summer: { head: ['Summer.', 'Beyond the ordinary.'], sub: 'Discover mountain adventures, breathtaking landscapes and unforgettable moments around Hollersbach.', cta: 'Explore all summer activities', feature: 'hike-feature', featureAlt: 'Hiker on an alpine meadow looking over a mountain lake and glaciated peaks', caption: 'Hohe Tauern' },
    winter: { head: ['Winter.', 'Find your altitude.'], sub: 'Discover unforgettable ski experiences, snow-covered mountains and exceptional winter adventures near KitzAlpen.', cta: 'Explore all winter activities', feature: 'ski-feature', featureAlt: 'Skier against the sun on a freshly groomed slope', caption: 'Pinzgau' },
    swipe: 'Swipe',
    visit: 'Visit website',
    page: { back: 'Back to home', practical: 'Good to know', more: 'More information', book: 'Plan your stay' },
    practicalSummer: ['The Tauern Cycle Path runs right through Hollersbach.', 'The M+ Guest Card gives you regional benefits.', 'Free parking at the guesthouse.'],
    practicalWinter: ['2 km to the Panoramabahn – your way into KitzSki.', 'Ski storage at the guesthouse, warm dinner in the evening.', 'The M+ Guest Card gives you regional benefits.'],
    otherWinter: 'Further ski areas such as SkiWelt Wilder Kaiser – Brixental will be added once distance and travel details are verified.',
  },
};
export type ActCopy = (typeof ACT_COPY)['de'];

/** hash routes for the dedicated pages (artifact-safe); on the live site map them to /activities/summer|winter */
export const ACT_ROUTE: Record<Season, string> = { summer: '#activities-summer', winter: '#activities-winter' };
