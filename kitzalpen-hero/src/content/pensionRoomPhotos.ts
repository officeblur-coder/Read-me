/** Generated photo metadata for the pension room cards and galleries (client photos, Nov 2026). */
export interface Pic { name: string; w: number; h: number; sizes: number[]; alt: { de: string; en: string } }
export const ROOM_COVERS: Record<string, Pic> = {
  double: { name: 'cover-double', w: 1024, h: 1024, sizes: [640, 1000], alt: { de: "Doppelzimmer mit Holzwand, türkisem Kopfteil und Welcome-Bild", en: "Double room with wooden wall, teal headboard and welcome picture" } },
  triple: { name: 'cover-triple', w: 1024, h: 1024, sizes: [640, 1000], alt: { de: "Dreibettzimmer mit drei Betten in einer Reihe und karierten Vorhängen", en: "Triple room with three beds in a row and checked curtains" } },
  family: { name: 'cover-family', w: 1024, h: 1024, sizes: [640, 1000], alt: { de: "Familienzimmer mit Doppelbett und Durchgang zum verbundenen Raum", en: "Family room with double bed and passage to the connected room" } },
  quad: { name: 'cover-quad', w: 1024, h: 1024, sizes: [640, 1000], alt: { de: "Vierbettzimmer mit Doppelbett, Schlafsofa und Schrankwand", en: "Four-bed room with double bed, sofa bed and wardrobe wall" } },
};
export const ROOM_GALLERIES: Record<string, Pic[]> = {
  double: [
    { name: 'double-01', w: 952, h: 635, sizes: [800, 952], alt: { de: "Doppelbett mit Holzwand, Wandleuchten und Rondellen-Bild, von oben", en: "Double bed with wooden wall, wall lamps and log-slice picture, from above" } },
    { name: 'double-02', w: 952, h: 635, sizes: [800, 952], alt: { de: "Doppelbett mit türkisem Kopfteil vor Holzwand, daneben die Holztür", en: "Double bed with teal headboard against a wooden wall, wooden door beside it" } },
    { name: 'double-03', w: 952, h: 635, sizes: [800, 952], alt: { de: "Doppelzimmer mit Hirsch-Bild, Fenster mit karierten Vorhängen und Schreibtisch", en: "Double room with stag picture, window with checked curtains and desk" } },
    { name: 'double-04', w: 952, h: 635, sizes: [800, 952], alt: { de: "Doppelzimmer mit Schrankwand, Schreibtisch, TV und Bett am Fenster", en: "Double room with wardrobe wall, desk, TV and bed by the window" } },
    { name: 'double-05', w: 512, h: 768, sizes: [512], alt: { de: "Badezimmer mit Waschbecken, Holzspiegel und Holzregal", en: "Bathroom with washbasin, wooden mirror and wooden shelf" } },
  ],
  triple: [
    { name: 'triple-01', w: 952, h: 635, sizes: [800, 952], alt: { de: "Dreibettzimmer mit Betten in einer Reihe, karierten Vorhängen und Schrankwand", en: "Triple room with beds in a row, checked curtains and wardrobe wall" } },
    { name: 'triple-02', w: 952, h: 635, sizes: [800, 952], alt: { de: "Dreibettzimmer mit Doppelbett, türkisem Einzelbett und TV", en: "Triple room with double bed, teal single bed and TV" } },
    { name: 'triple-03', w: 1488, h: 991, sizes: [800, 1400], alt: { de: "Doppelbett mit türkisem Kopfteil, warmem Licht und Schreibtisch", en: "Double bed with teal headboard, warm light and desk" } },
  ],
  family: [
    { name: 'family-01', w: 1487, h: 991, sizes: [800, 1400], alt: { de: "Familienzimmer mit Doppelbett und offenem Durchgang zum zweiten Raum", en: "Family room with double bed and open passage to the second room" } },
    { name: 'family-02', w: 1488, h: 991, sizes: [800, 1400], alt: { de: "Doppelbett mit Wandleuchten, TV und Fenster mit karierten Vorhängen", en: "Double bed with wall lamps, TV and window with checked curtains" } },
    { name: 'family-03', w: 1488, h: 991, sizes: [800, 1400], alt: { de: "Zweiter Raum unter der Dachschräge mit zwei Einzelbetten", en: "Second room under the sloped ceiling with two single beds" } },
    { name: 'family-04', w: 1487, h: 991, sizes: [800, 1400], alt: { de: "Blick vom Bett zum Eingang mit Spiegel und Schrankwand", en: "View from the bed to the entrance with mirror and wardrobe" } },
    { name: 'family-05', w: 1487, h: 991, sizes: [800, 1400], alt: { de: "Kompakter Raum mit Doppelbett, Schrank, Holztür und TV", en: "Compact room with double bed, wardrobe, wooden door and TV" } },
  ],
  quad: [
    { name: 'quad-01', w: 952, h: 635, sizes: [800, 952], alt: { de: "Vierbettzimmer mit Doppelbett und Schlafsofa, Schrankwand mit TV", en: "Four-bed room with double bed and sofa bed, wardrobe wall with TV" } },
    { name: 'quad-02', w: 1428, h: 952, sizes: [800, 1400], alt: { de: "Vierbettzimmer mit zwei Doppelbetten und Rundbogenfenster", en: "Four-bed room with two double beds and arched window" } },
    { name: 'quad-03', w: 952, h: 635, sizes: [800, 952], alt: { de: "Zwei Doppelbetten vor türkisem Kopfteil und Holzwand, von oben", en: "Two double beds against teal headboard and wooden wall, from above" } },
    { name: 'quad-04', w: 1428, h: 952, sizes: [800, 1400], alt: { de: "Doppelbett mit Blick auf Schreibtisch, TV und Holztür", en: "Double bed looking towards desk, TV and wooden door" } },
  ],
};
