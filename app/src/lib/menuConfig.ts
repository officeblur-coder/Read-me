// Menu-specific picks for the client page (extras, upsell, story images, "Ce poftă ai?" moods).
// The showcase build swaps this file for src/demo/menuConfig.ts, which matches the demo menu.
export const EXTRA_IDS = {
  burger: ["cartofi", "special-fries", "sosul-casei"],
  main: ["mujdei", "sos-usturoi", "smantana", "ardei-iute"],
  desert: ["smantana"],
};
export const MAIN_CATS = ["nou", "specialitati", "porc", "ardeal", "pui", "peste", "post", "dejun", "platouri", "vegetariene"];
export const UPSELL = ["sosul-casei", "limonada", "mujdei", "papanas", "pepsi", "cinnamon-rolls", "cartofi", "muraturi"];
export const CAT_IMG: Record<string, string> = {
  antreuri: "platou-branzeturi.jpg", dejun: "english.jpg", nou: "antricot.jpg", platouri: "platou-lyra.jpg",
  specialitati: "costite.jpg", smash: "double-smash.jpg", burger: "eleven-burger.jpg", supe: "ciorba-vita.jpg",
  porc: "ciolan-lyra.jpg", ardeal: "papricas.jpg", pui: "cordon-bleu.jpg", peste: "pastrav.jpg", paste: "carbonara.jpg",
  salate: "halloumi.jpg", vegetariene: "papricas-ciuperci.jpg", post: "ciorba-pita.jpg", kids: "kids-dino.jpg",
  garnituri: "special-fries.jpg", muraturi: "muraturi.jpg", sosuri: "special-fries.jpg", desert: "papanas.jpg",
  limonade: "limonada-capsuni.jpg", cocktail: "aperol-spritz.jpg", bere: "moretti.jpg", racoritoare: "virgin-mojito.jpg", vin: "hugo.jpg",
};
// "Ce poftă ai?" — quick moods, each a hand-picked set of dishes
export const MOODS = [
  { id: "casa", ro: "De-al casei", hu: "Házias", ids: ["ciolan-lyra", "costite", "sarmale", "carne-garnita", "fasole-batuta", "papricas"] },
  { id: "burger", ro: "Burger night", hu: "Burger este", ids: ["double-smash", "spicy-smash", "eleven-burger", "burger-ozn", "special-fries", "smash"] },
  { id: "usor", ro: "Ușor & verde", hu: "Könnyű", ids: ["halloumi", "salata-pui", "pastrav", "oua-posate", "supa-crema", "papricas-ciuperci"] },
  { id: "premium", ro: "Seară specială", hu: "Különleges este", ids: ["antricot", "muschi", "tocanita", "platou-branzeturi", "camembert"] },
  { id: "dulce", ro: "Ceva dulce", hu: "Valami édes", ids: ["papanas", "somloi", "lapte-pasare", "panna-cotta", "clatite", "tarta-mere"] },
  { id: "dimineata", ro: "Mic dejun", hu: "Reggeli", ids: ["english", "bruschete", "omleta", "paine-ou", "spanac"] },
  { id: "grup", ro: "Pentru gașcă", hu: "Társaságnak", ids: ["platou-lyra", "platou-pui", "mix-grill", "gustare", "platou-branzeturi"] },
];
export const moodFor = (h: number) => (h < 11 ? "dimineata" : h < 16 ? "casa" : h < 22 ? "burger" : "dulce");

export const BURGER_CATS = ["smash", "burger"];
export const SEARCH_PH = { ro: "Caută ciolan, burger, papanaș…", hu: "Keresés…" };
// icon on the category tiles (names from components/Icon); anything missing gets "dish"
export const CAT_ICON: Record<string, string> = {
  antreuri: "dish", dejun: "egg", nou: "spark", platouri: "dish", specialitati: "flame", smash: "burger", burger: "burger",
  supe: "bowl", porc: "steak", ardeal: "house", pui: "leg", peste: "fish", paste: "pasta", salate: "salad", vegetariene: "leaf",
  post: "leaf", kids: "smile", garnituri: "fries", muraturi: "jar", sosuri: "drop", desert: "cake",
  limonade: "drink", racoritoare: "can", cocktail: "cocktail", vin: "wine", bere: "beer",
};
// "Cele mai comandate" when no dish carries the "top" tag (set it in admin to choose them yourself)
export const POPULAR = ["double-smash", "ciolan-lyra", "cordon-bleu", "platou-lyra", "costite", "chicken-burger", "papanas", "ceafa-tiganeasca"];
