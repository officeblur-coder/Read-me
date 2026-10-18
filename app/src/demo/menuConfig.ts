// Showcase build: menu picks matching the fictional Savoro menu (see src/demo/seed).
export const EXTRA_IDS = {
  burger: ["cartofi", "cartofi-rustici", "sosul-casei"],
  main: ["cartofi", "sos-usturoi", "sosul-casei"],
  desert: [] as string[],
};
export const MAIN_CATS = ["grill"];
export const BURGER_CATS = ["burgers"];
export const UPSELL = ["cartofi", "sosul-casei", "tiramisu", "fresh-portocale", "cartofi-rustici", "gogosi"];
export const CAT_IMG: Record<string, string> = { extra: "m-cartofi.jpg" };
export const MOODS = [
  { id: "burger", ro: "Burger night", hu: "Burger este", ids: ["double-cheese", "classic-smash", "bbq-bacon", "avocado-burger", "sliders"] },
  { id: "pizza", ro: "Pizza & paste", hu: "Pizza", ids: ["margherita", "diavola", "bianca", "quattro", "spaghete-creveti", "penne-arrabbiata"] },
  { id: "usor", ro: "Ușor & verde", hu: "Könnyű", ids: ["poke-somon", "buddha", "green-salad", "farfalle-pesto", "egg-bowl"] },
  { id: "premium", ro: "Seară specială", hu: "Különleges este", ids: ["ribeye", "steak-frites", "sushi-boat", "nigiri-set", "spaghete-creveti"] },
  { id: "dulce", ro: "Ceva dulce", hu: "Valami édes", ids: ["tiramisu", "tort-zmeura", "gogosi", "sundae", "pancakes"] },
  { id: "dimineata", ro: "Brunch", hu: "Brunch", ids: ["avocado-toast", "french-toast", "pancakes", "egg-bowl", "club-sandwich"] },
  { id: "grup", ro: "Pentru gașcă", hu: "Társaságnak", ids: ["frigarui", "sushi-boat", "ribs", "aripioare", "sliders"] },
];
export const moodFor = (h: number) => (h < 11 ? "dimineata" : h < 16 ? "usor" : h < 22 ? "burger" : "dulce");
export const SEARCH_PH = { ro: "Caută burger, pizza, sushi…", hu: "Keresés…" };
