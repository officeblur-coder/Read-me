export const lei = (n: number) => (Math.round(n * 100) / 100).toFixed(2) + " lei";

export const hm = (d: string | number | Date) =>
  new Date(d).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });

export const mmss = (ms: number) => {
  const neg = ms < 0;
  ms = Math.abs(ms);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return (neg ? "+" : "") + m + ":" + String(s).padStart(2, "0");
};

export const imgUrl = (image: string | null) => (image ? (image.startsWith("http") ? image : "/img/" + image) : null);

export const ALLERGENS: Record<string, [string, string]> = {
  gluten: ["Gluten", "Glutén"],
  ou: ["Ou", "Tojás"],
  lactoza: ["Lactoză", "Laktóz"],
  telina: ["Țelină", "Zeller"],
  mustar: ["Muștar", "Mustár"],
  soia: ["Soia", "Szója"],
  seminte: ["Semințe", "Magvak"],
  ciuperci: ["Ciuperci", "Gomba"],
  peste: ["Pește", "Hal"],
};

export const MEAT: Record<string, [string, string]> = {
  porc: ["Porc", "Sertés"],
  vita: ["Vită", "Marha"],
  pui: ["Pui", "Csirke"],
  peste: ["Pește", "Hal"],
};

export const TAGS: Record<string, [string, string]> = {
  garn: ["Include garnitură", "Körettel"],
  nogarn: ["Fără garnitură", "Köret nélkül"],
  casa: ["Rețeta casei", "Házi recept"],
  home: ["Home made", "Házi készítésű"],
  angus: ["Black Angus", "Black Angus"],
  coal: ["Cuptor pe cărbune", "Faszenes kemence"],
  post: ["De post", "Böjti"],
  veg: ["Vegetarian", "Vegetáriánus"],
  new: ["Nou", "Új"],
  spicy: ["Picant", "Csípős"],
  smoker: ["Din BBQ Pit Box Smoker", "BBQ Pit Box Smokerből"],
  share: ["Pentru 2–3 persoane", "2–3 személyre"],
};

/** Saved order links on this device, so a guest can find their order again. */
const KEY = "lyra-my-orders";
export function rememberOrder(token: string, number: number) {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]") as { token: string; number: number; at: number }[];
    list.unshift({ token, number, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
  } catch { /* storage unavailable */ }
}
export function myOrders(): { token: string; number: number; at: number }[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export const GOOGLE_REVIEW_URL = "https://g.page/r/Cb92kT0SuXLSEAE/review";
