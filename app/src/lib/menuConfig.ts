// Menu-specific picks for the client page (extras, upsell, story images, "Ce poftă ai?" moods).
// The showcase build swaps this file for src/demo/menuConfig.ts, which matches the demo menu.
export const EXTRA_IDS = {
  burger: ["cartofi", "special-fries", "sosul-casei"],
  main: ["mujdei", "sos-usturoi", "smantana", "ardei-iute"],
  desert: ["smantana"],
};
export const MAIN_CATS = ["nou", "specialitati", "porc", "ardeal", "pui", "peste", "post", "dejun", "platouri", "vegetariene"];
export const UPSELL = ["sosul-casei", "mujdei", "muraturi", "papanas", "lapte-pasare", "ardei-iute", "cartofi"];
export const CAT_IMG: Record<string, string> = {
  antreuri: "platou-branzeturi.jpg", dejun: "english.jpg", nou: "antricot.jpg", platouri: "platou-lyra.jpg",
  specialitati: "costite.jpg", smash: "double-smash.jpg", burger: "eleven-burger.jpg", supe: "ciorba-vita.jpg",
  porc: "ciolan-lyra.jpg", ardeal: "papricas.jpg", pui: "cordon-bleu.jpg", peste: "pastrav.jpg", paste: "carbonara.jpg",
  salate: "halloumi.jpg", vegetariene: "papricas-ciuperci.jpg", post: "ciorba-pita.jpg", kids: "kids-dino.jpg",
  garnituri: "cartofi-coaja.jpg", muraturi: "muraturi.jpg", sosuri: "special-fries.jpg", desert: "papanas.jpg",
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
