// One-off: applies the delivery menu of October 2026 (meniu_lyra_delivery_octombrie_2026.pdf) to lyra/data/menu.js.
// Kept in the repo as the record of what changed. Run once: node scripts/menu-oct2026.mjs
import fs from "node:fs"; import vm from "node:vm"; import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const file = path.join(root, "lyra/data/menu.js");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(file, "utf8") + "\nthis.CATS=CATS;this.M=M;this.FS=FS;this.CB=CB;this.SB=SB;", ctx);
const CATS = ctx.CATS, M = ctx.M, BY = Object.fromEntries(M.map(x => [x.id, x]));
const ent = (p, g) => ({ l: "Porție întreagă", lh: "Egész adag", p, g });
const med = (p, g) => ({ l: "Porție medie", lh: "Közepes adag", p, g });

// number, price, grams as printed in the October menu
const N = {
  "duo-vinete": [1, 36, "100/100/30/100 gr"], "pita-carbune": [2, 27, "100/100/50/30 gr"], "gustare": [3, 39, "40/40/60/40/60/60 gr"],
  "focaccia-untura": [4, 25, "100 gr"], "platou-branzeturi": [5, 42], "iaurt-oua-posate": [6, 38, "250/60 gr"],
  "bruschete": [7, 45, "100/30/150 gr"], "english": [8, 47, "50/100/100/100/50 gr"], "omleta": [9, 35, "300 gr"], "spanac": [10, 38, "200/100 gr"],
  "oua-posate": [11, 43, "300 gr"], "paine-ou": [12, 35, "300 gr"],
  "antricot": [13, 145, "200/250 gr"], "muschi": [14, 165, "160/150/100 gr"], "tocanita": [15, 66, "250/150 gr"],
  "ciolan-varza": [16, 85, "600/250/100 gr"], "iahnie-ciolan": [17, 69, "350/200 gr"],
  "platou-lyra": [18, 290, "160/150/160/250/240/250/240/100/200/90/90 gr"], "platou-pui": [19, 270, "600/500/90/60/90 gr"],
  "sarmale": [20, 60, "400/100/90/45 gr"], "fasii-carnuri": [21, 63, "100/100/100/250 gr"], "costite": [22, 79, "300/150/100/40 gr"],
  "ceafa-afumata": [23, 57, "180/150/50 gr"], "pulled-pork": [24, 47, "300/100 gr"], "pulpa-smoker": [25, 59, "200/150 gr"],
  "chicken-burger": [26, 56], "ozn-pulled": [27, 49.5], "crispy-burger": [28, 48.5], "eleven-burger": [29, 64.5],
  "burger-ozn": [30, 60, "80/100/70/150/100 gr"], "veggie-ozn": [31, 64],
  "double-smash": [32, 35], "spicy-smash": [33, 35], "smash": [34, 25],
  "supa-crema": [37, 29], "ciorba-legume-supe": [38, 29], "supa-pui": [39, 29], "ciorba-vita": [40, 34], "ciorba-fasole-ciolan": [42, 32],
  "supa-salata": [43, 54, "400/300/70/30 gr"], "ciorba-pita-ciolan": [44, 39.5, "350/60/50 gr"], "gulas": [45, 39, "300/70 gr"],
  "burta": [46, 34, "300/120 gr"], "lascute": [47, 27, "400 ml/50 gr"],
  "ciolan-lyra": [48, 55, "180/110/50 gr"], "ceafa-tiganeasca": [49, 68, "170/250/45/75 gr"], "carne-garnita": [50, 63, "220/150/50 gr"],
  "mititei": [51, 8.5, "1 bucată/70/20 gr"], "mix-grill": [52, 49, "350 gr"],
  "fasole-batuta": [53, 59, "250/150 gr"], "papricas": [54, 45, "300/130 gr"], "snitel-lyra": [55, 57, "350 gr"], "ficatei": [56, 47, "250/130 gr"],
  "piept-lyra": [58, 39, "80/100/40/40 gr"], "borzas": [59, 49], "cordon-bleu": [60, 49, "150/250 gr"], "salata-pui": [61, 52, "150/80/30 gr"],
  "crispy-pui": [62, 42, "300/150/90 gr"], "piept-carbune": [63, 36, "100/200 gr"], "piept-vienez": [64, 39, "230 gr"], "piept-palermo": [65, 46, "300 gr"],
  "pastrav": [66, 65, "190/150/45 gr"], "biban": [67, 63, "120/250/100 gr"],
  "carbonara": [68, 46, "250/50/50/30 gr"], "bolognese": [69, 46, "250/120/30 gr"],
  "halloumi": [70, 47, "400 gr"], "camembert": [71, 62, "170/100/50 gr"],
  "snitel-vegetal": [72, 53, "250 gr"], "papricas-ciuperci": [73, 42, "250/100 gr"], "mamaliguta-branza": [74, 35, "300/150/100 gr"],
  "veggie-burger-veg": [75, 64, "300/150 gr"], "cartofi-taranesti-veg": [76, 15, "180 gr"], "cascaval-pane": [77, 31, "120 gr"],
  "ciorba-legume": [78, 29, "400 gr"], "ciorba-fasole": [79, 29, "400 gr"], "ciorba-pita": [80, 37, "270/400/50 gr"], "iahnie-soia": [81, 52, "250/130 gr"],
  "kids-supa-pui": [82, 16, "280 ml/20 gr"], "kids-supa-crema": [83, 16, "250 ml/15 gr"], "kids-dino": [84, 33, "75/100/45 gr"],
  "kids-crispy": [85, 33, "150/100/45 gr"], "kids-carbonara": [86, 29, "150/50/100/30 gr"],
  "special-fries": [87, 21, "200 gr"], "cartofi-lyra": [88, 16, "250 gr"], "cartofi-taranesti": [89, 15, "200 gr"], "legume-tigaie": [90, 22, "200 gr"],
  "risotto": [91, 22, "200 gr"], "piure": [92, 14, "150 gr"], "cartofi": [93, 15, "150 gr"], "mamaliguta": [94, 12, "150 gr"],
  "pita-coapta": [95, 4.5, "50 gr"], "focaccia": [96, 7.5, "2 buc/70 gr"],
  "varza-murata": [97, 15, "130 gr"], "muraturi": [98, 16, "130 gr"], "sfecla": [99, 16, "130 gr"], "ardei-copti": [100, 15, "130 gr"],
  "salata-varza": [101, 13, "130 gr"], "salata-asortata": [102, 15, "130 gr"], "ardei-iute": [103, 4.5], "ceapa": [104, 5, "50 gr"],
  "sos-usturoi": [105, 10, "90 gr"], "mujdei": [106, 10, "90 gr"], "sosul-casei": [107, 10, "90 gr"], "smantana": [108, 5, "45 gr"],
  "ketchup": [109, 7, "90 gr"], "mustar": [110, 7, "90 gr"], "maioneza": [111, 7, "90 gr"], "sos-iaurt": [112, 10, "90 gr"],
  "papanas": [113, 33, "120/70/70 gr"], "lapte-pasare": [114, 29, "130/30 gr"], "cinnamon-rolls": [115, 29, "150/80 gr"],
  "panna-cotta": [116, 29, "150 gr"], "clatite": [117, 28, "130/70 gr"], "somloi": [118, 29, "350 gr"],
};
// no longer on the menu: kept in the database, switched off
const GONE = ["tarta-mere", "melba", "cartofi-coaja"];
// packaging per piece (lei); everything else is 2
const PACK7 = ["borzas", "ciorba-pita", "ciorba-pita-ciolan", "pastrav"];

const NEW = [
  { id: "iaurt-oua-posate", c: "antreuri", ro: "Iaurt cu ouă poșate", hu: "Joghurt posírozott tojással", d: "Iaurt, mărar, ulei cu chili, focaccia, ouă, usturoi copt", dh: "Joghurt, kapor, chilis olaj, focaccia, tojás, sült fokhagyma", al: ["gluten", "ou", "lactoza"], t: ["new", "veg"] },
  { id: "cinnamon-rolls", c: "desert", ro: "Cinnamon Rolls", hu: "Fahéjas csiga", d: "Ou, unt, lapte, sos de vanilie și scorțișoară", dh: "Tojás, vaj, tej, vaníliaszósz és fahéj", al: ["gluten", "ou", "lactoza"], t: ["new", "home"] },
];
const PATCH = {
  "duo-vinete": { d: "Vinete cu maioneză și zacuscă de fasole, cu focaccia făcută în casă" },
  "focaccia-untura": { ro: "Focaccia cu untură, ceapă și ardei iute", hu: "Focaccia zsírral, hagymával és csípős paprikával", d: "Focaccia făcută în casă, untură, ceapă, ardei iute", dh: "Házi focaccia, zsír, hagyma, csípős paprika" },
  "paine-ou": { d: "Servită cu iaurt", dh: "Joghurttal", q: undefined },
  "special-fries": { c: "garnituri", d: "Cartofi pai MasterCrunch, brânză cheddar, bacon crocant, sos burger, chives (arpagic verde)" },
  "cartofi": { d: "Cartofi MasterCrunch cu coajă: extra crocanți la exterior, pufoși la interior", dh: "Héjas MasterCrunch burgonya: kívül ropogós, belül puha" },
  "borzas": { v: [ent(49, "300 gr"), med(32, "200 gr")] },
  "supa-crema": { v: [ent(29, "400/30 gr"), med(22, "200/15 gr")] },
  "ciorba-legume-supe": { v: [ent(29, "400 gr"), med(22, "200 gr")] },
  "supa-pui": { v: [ent(29, "350/50 gr"), med(18, "175/25 gr")] },
  "ciorba-vita": { v: [ent(34, "350/50 gr"), med(23, "175/25 gr")] },
  "ciorba-fasole-ciolan": { v: [ent(32, "350/50 gr"), med(23, "175/25 gr")] },
  "ciorba-pita": { q: undefined },
  "cartofi-lyra": { q: undefined }, "risotto": { q: undefined },
};

// ---------- drinks (new on the delivery menu) ----------
const A18 = ["Doar pentru persoane peste 18 ani. Curierul poate cere actul de identitate.", "Csak 18 év felettieknek. A futár személyi igazolványt kérhet."];
CATS.push(
  { id: "limonade", ro: "Limonade & fresh", hu: "Limonádék, frissek" },
  { id: "racoritoare", ro: "Răcoritoare", hu: "Üdítők" },
  { id: "cocktail", ro: "Cocktailuri", hu: "Koktélok", note: A18 },
  { id: "vin", ro: "Vinuri", hu: "Borok", note: A18 },
  { id: "bere", ro: "Bere & cidru", hu: "Sör, cider", note: A18 },
);
const D = [];
const drink = (c, id, ro, p, g, o = {}) => D.push({ id, c, ro, hu: o.hu || ro, d: o.d || "", dh: o.dh || "", p, g, al: o.al || [], t: o.t || [], ...(o.v ? { v: o.v } : {}), ...(o.img ? { img: id } : {}) });
const flav = (names, p, g) => names.map(([l, lh]) => ({ l, lh, p, g }));
const sizes = list => list.map(([g, p]) => ({ l: g, lh: g, p, g }));
// limonade & fresh
drink("limonade", "limonada", "Limonadă", 27, "400 ml", { hu: "Limonádé", d: "Mentă, lămâie", dh: "Menta, citrom", img: 1 });
drink("limonade", "limonada-soc", "Limonadă cu soc", 29, "400 ml", { hu: "Bodzás limonádé", d: "Cu sirop de soc, mentă, lămâie", dh: "Bodzaszörppel, mentával, citrommal", img: 1 });
drink("limonade", "limonada-ghimbir", "Limonadă cu ghimbir și sirop de agave", 29, "400 ml", { hu: "Gyömbéres limonádé agávésziruppal", d: "Ghimbir, mentă, lămâie, apă minerală", dh: "Gyömbér, menta, citrom, ásványvíz", img: 1 });
drink("limonade", "limonada-capsuni", "Limonadă cu sirop de căpșuni", 29, "400 ml", { hu: "Epres limonádé", d: "Sirop de căpșuni presat la rece, mentă, lămâie, apă minerală", dh: "Hidegen préselt eperszirup, menta, citrom, ásványvíz", img: 1 });
drink("limonade", "apple-pie", "Apple Pie", 30, "400 ml", { d: "Suc de mere cu scorțișoară, sirop de alune, zeamă de lămâie", dh: "Almalé fahéjjal, mogyorószirup, citromlé", v: flav([["Rece", "Hideg"], ["Cald", "Meleg"]], 30, "400 ml"), img: 1 });
drink("limonade", "fresh-portocale", "Fresh de portocale", 27, "400 ml", { hu: "Friss narancslé" });
drink("limonade", "suc-mere", "Suc de mere 100%", 20, "300 ml", { hu: "100% almalé", d: "Fără zahăr adăugat", dh: "Hozzáadott cukor nélkül" });
drink("limonade", "socata", "Socată artizanală", 23, "330 ml", { hu: "Kézműves bodzaszörp", d: "100% natural, din floare de soc și lămâie, fermentate cu ajutorul drojdiei", dh: "100% természetes, bodzavirágból és citromból, élesztővel erjesztve", img: 1 });
drink("limonade", "kombucha", "Kombucha 0%", 21, "330 ml", { d: "Băutură fermentată, ușor acidulată, din ceai îndulcit", dh: "Erjesztett, enyhén szénsavas ital édesített teából", v: flav([["Ghimbir", "Gyömbér"], ["Rodie", "Gránátalma"], ["Mentă", "Menta"], ["Miere", "Méz"]], 21, "330 ml"), img: 1 });
drink("limonade", "zeama-varza", "Zeamă de varză", 10, "330 ml", { hu: "Káposztalé", d: "Tradițională, din fermentarea naturală a verzei albe. Servită rece", dh: "Hagyományos, fehér káposzta természetes erjesztéséből. Hidegen", img: 1 });
drink("limonade", "bere-ghimbir", "Bere de ghimbir 0%", 23, "375 ml", { hu: "Gyömbérsör 0%" });
// răcoritoare
for (const [id, ro, g] of [["pepsi", "Pepsi", "250 ml"], ["pepsi-twist", "Pepsi Twist", "250 ml"], ["pepsi-max", "Pepsi Max", "250 ml"], ["mirinda", "Mirinda portocale", "250 ml"], ["7up", "7UP", "255 ml"], ["apa-tonica", "Apă tonică Evervess", "250 ml"]])
  drink("racoritoare", id, ro, 15.5, g);
drink("racoritoare", "prigat", "Prigat", 15.5, "250 ml", { v: flav([["Căpșuni cu banane", "Eper-banán"], ["Portocale", "Narancs"]], 15.5, "250 ml") });
drink("racoritoare", "aqua-carpatica", "Aqua Carpatica", 15.5, "330 ml", { v: flav([["Plată", "Szénsavmentes"], ["Minerală", "Szénsavas"]], 15.5, "330 ml") });
drink("racoritoare", "apa-mathild", "Apă Mathild", 12, "330 ml", { d: "Izvor montan din arie protejată, sodică, bicarbonatată", dh: "Védett területről származó hegyi forrásvíz" });
drink("racoritoare", "red-bull", "Red Bull", 15, "250 ml");
drink("racoritoare", "hell", "Hell", 11, "250 ml");
// cocktailuri
const alc = { t: ["alc"] };
drink("cocktail", "limoncello-spritz", "Limoncello Spritz", 36, "300 ml", { ...alc, d: "Lichior limoncello, prosecco, apă minerală, lămâie", dh: "Limoncello likőr, prosecco, ásványvíz, citrom", img: 1 });
drink("cocktail", "cuba-libre", "Cuba Libre", 36, "300 ml", { ...alc, d: "Rom Captain Morgan, Pepsi, lime, zahăr brun", dh: "Captain Morgan rum, Pepsi, lime, barna cukor", img: 1 });
drink("cocktail", "hugo", "Hugo", 38, "300 ml", { ...alc, d: "Prosecco, sirop de soc, apă minerală, lime, mentă", dh: "Prosecco, bodzaszirup, ásványvíz, lime, menta", img: 1 });
drink("cocktail", "campari-orange", "Campari Orange", 36, "300 ml", { ...alc, d: "Campari, Prigat portocale", dh: "Campari, narancs Prigat", img: 1 });
drink("cocktail", "gin-tonic", "Gin Tonic", 36, "300 ml", { ...alc, d: "Gin Wembley, apă tonică, lămâie", dh: "Wembley gin, tonik, citrom", img: 1 });
drink("cocktail", "aperol-spritz", "Aperol Spritz", 36, "300 ml", { ...alc, d: "Aperol, prosecco, apă minerală, portocale", dh: "Aperol, prosecco, ásványvíz, narancs", img: 1 });
drink("cocktail", "virgin-mojito", "Virgin Mojito", 33, "300 ml", { d: "7UP, lime, mentă, gheață. Fără alcool", dh: "7UP, lime, menta, jég. Alkoholmentes", img: 1 });
// vinuri (sticlă)
const savu = (id, ro, p, d, dh, g = "700 ml") => drink("vin", id, ro, p, g, { ...alc, d, dh });
savu("savu-feteasca-regala", "Fetească Regală · Pivnița Savu", 130, "Alb demisec 11,8% · DOC-CMD Aiud/Ciumbrud", "Félszáraz fehér 11,8% · DOC-CMD Aiud/Ciumbrud");
savu("savu-sauvignon", "Sauvignon Blanc · Pivnița Savu", 130, "Alb sec 12,6% · DOC-CMD Aiud/Ciumbrud", "Száraz fehér 12,6% · DOC-CMD Aiud/Ciumbrud");
savu("savu-riesling", "Riesling Italian · Pivnița Savu", 130, "Alb sec 12,1% · DOC-CMD Aiud/Ciumbrud", "Száraz fehér 12,1% · DOC-CMD Aiud/Ciumbrud");
savu("savu-traminer", "Traminer Rosé · Pivnița Savu", 130, "Alb sec 13,4% · DOC-CMD Aiud/Ciumbrud", "Száraz fehér 13,4% · DOC-CMD Aiud/Ciumbrud");
savu("savu-chardonnay", "Chardonnay Barique · Pivnița Savu", 130, "Alb sec 13,35% · DOC-CMD Aiud/Ciumbrud", "Száraz fehér 13,35% · DOC-CMD Aiud/Ciumbrud");
savu("savu-not-noir", "Not Noir · Pivnița Savu", 150, "Roșu sec Pinot Noir 11,5%", "Száraz vörös Pinot Noir 11,5%");
savu("savu-muscat", "Muscat Ottonel · Pivnița Savu", 150, "Alb sec 12,5% · DOC-CMD Aiud/Ciumbrud", "Száraz fehér 12,5% · DOC-CMD Aiud/Ciumbrud");
savu("savu-apuseniu", "Apuseniu Fetească Regală · Pivnița Savu", 175, "Alb demisec 12,5% · DOC-CMD Aiud/Ciumbrud", "Félszáraz fehér 12,5% · DOC-CMD Aiud/Ciumbrud");
savu("savu-pinot-rose", "Pinot Noir Rosé Duchess of Transylvania · Pivnița Savu", 175, "Rosé sec 13% · 2023/2024 · DOC-CMD Aiud/Ciumbrud", "Száraz rosé 13% · 2023/2024 · DOC-CMD Aiud/Ciumbrud");
savu("pirovano-montepulciano", "Montepulciano d'Abruzzo · Pirovano", 105, "Roșu sec 12,5%", "Száraz vörös 12,5%");
savu("pirovano-primitivo", "Primitivo di Manduria · Pirovano", 150, "Roșu sec 14,5%", "Száraz vörös 14,5%");
savu("carpathia-chardonnay", "Chardonnay · Domeniile Sâmburești Carpathia", 137, "Alb sec 14%", "Száraz fehér 14%", "750 ml");
savu("carpathia-rose", "Rosé Cabernet Sauvignon & Merlot · Domeniile Sâmburești Carpathia", 137, "Rosé sec 12,5%, cupaj", "Száraz rosé 12,5%, házasítás", "750 ml");
savu("carpathia-feteasca-neagra", "Fetească Neagră · Domeniile Sâmburești Carpathia", 137, "Roșu sec 14,5%", "Száraz vörös 14,5%", "750 ml");
savu("pirovano-prosecco", "Prosecco · Pirovano", 100, "Spumant 12,5%", "Pezsgő 12,5%", "750 ml");
savu("prosecco-mic", "Prosecco", 32, "Spumant 10%", "Pezsgő 10%", "200 ml");
savu("vin-fiert", "Vin fiert cu scorțișoară", 36, "Servit cald", "Melegen", "200 ml");
// bere & cidru
drink("bere", "strongbow", "Strongbow", 22, "330 ml", { ...alc, hu: "Strongbow cider", d: "Cidru 4,5%", dh: "Cider 4,5%", v: flav([["Mere", "Alma"], ["Fructe de pădure", "Erdei gyümölcs"]], 22, "330 ml") });
drink("bere", "silva-dark", "Silva Strong Dark Lager", 22, "500 ml", { ...alc, d: "7%", dh: "7%" });
drink("bere", "azuga", "Azuga nefiltrată", 25, "500 ml", { ...alc, hu: "Azuga szűretlen", d: "5,3%", dh: "5,3%" });
drink("bere", "heineken", "Heineken", 16, "330 ml", { ...alc, d: "5%", dh: "5%", v: sizes([["330 ml", 16], ["400 ml", 19]]) });
drink("bere", "moretti", "Birra Moretti", 15, "330 ml", { ...alc, d: "4,6%", dh: "4,6%", v: sizes([["330 ml", 15], ["500 ml", 16]]), img: 1 });
drink("bere", "ciuc", "Ciuc Premium Lager", 15, "330 ml", { ...alc, d: "5%", dh: "5%", v: sizes([["330 ml", 15], ["500 ml", 16]]) });
drink("bere", "noah-poet", "Noah Poet", 29, "330 ml", { ...alc, d: "Bere artizanală din Târgu Mureș", dh: "Kézműves sör Marosvásárhelyről", img: 1 });
drink("bere", "heineken-0", "Heineken 0%", 19, "330 ml", { d: "Fără alcool", dh: "Alkoholmentes" });
drink("bere", "ciuc-radler-0", "Ciuc Radler 0%", 17, "330 ml", { d: "Fără alcool", dh: "Alkoholmentes", v: flav([["Lămâie și lime", "Citrom és lime"], ["Zmeură și lămâie", "Málna és citrom"]], 17, "330 ml") });
drink("bere", "moretti-0", "Birra Moretti 0%", 15, "330 ml", { d: "Fără alcool", dh: "Alkoholmentes" });

// ---------- apply ----------
const PHOTOS = new Set(fs.readdirSync(path.join(root, "app/public/img")).map(f => f.replace(/\.jpg$/, "")));
const out = [];
for (const it of [...M, ...NEW]) {
  if (GONE.includes(it.id)) { out.push({ ...it, x: 1 }); continue; }
  const row = N[it.id];
  if (!row) throw new Error("not on the October menu: " + it.id);
  const [n, p, g] = row;
  const next = { ...it, ...(PATCH[it.id] || {}), n, p };
  if (g) next.g = g;
  if (PHOTOS.has(it.id)) next.img = it.id;
  if (PACK7.includes(it.id)) next.pk = 7;
  for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
  out.push(next);
}
for (const id of Object.keys(N)) if (!out.some(x => x.id === id)) throw new Error("missing " + id);
for (const d of D) { if (d.img && !PHOTOS.has(d.id)) delete d.img; out.push(d); }
// keep the menu order: by category, then menu number
const order = Object.fromEntries(CATS.map((c, i) => [c.id, i]));
out.sort((a, b) => (order[a.c] - order[b.c]) || ((a.n ?? 999) - (b.n ?? 999)));

// ---------- write ----------
const lit = v => JSON.stringify(v).replace(/"([a-z]+)":/g, "$1:");
const W = { [ctx.FS]: "FS", [ctx.CB]: "CB", [ctx.SB]: "SB" };
const line = it => " " + lit(it).replace(/w:"([^"]+)"/, (m, w) => W[w] ? "w:" + W[w] : m) + ",";
let src = fs.readFileSync(file, "utf8");
const head = src.slice(0, src.indexOf("const CATS = ["))
  .replace(/extras din [^\n]*/, "extras din meniu_lyra_delivery_octombrie_2026 (38 pagini, cu băuturi).")
  .replace("q (de verificat cu restaurantul). */", "q (de verificat cu restaurantul), pk (ambalaj lei/buc, implicit 2), x (scos din meniu). */");
const cats = "const CATS = [\n" + CATS.map(c => "  " + lit(c)).join(",\n") + "\n];\n";
const consts = src.slice(src.indexOf("const FS ="), src.indexOf("const M = ["));
let body = "const M = [\n"; let cur = "";
for (const it of out) {
  if (it.c !== cur) { cur = it.c; body += `\n /* ---------- ${CATS.find(c => c.id === cur).ro} ---------- */\n`; }
  body += line(it) + "\n";
}
body += "];\n";
const tail = src.slice(src.indexOf("const BY ="));
fs.writeFileSync(file, head + cats + consts + body + tail);
console.log("preparate", out.filter(x => !x.x).length, "scoase", out.filter(x => x.x).length, "categorii", CATS.length);
