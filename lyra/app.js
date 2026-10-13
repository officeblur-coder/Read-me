/* ===================== LYRA · MENIU DIGITAL · APP ===================== */
(() => {
"use strict";

const CATS = window.LYRA_CATS, ITEMS = window.LYRA_ITEMS, W = window.LYRA_WAITER, INFO = window.LYRA_INFO;
const LI = { ro: 0, en: 1, hu: 2 };
const SPEECH = { ro: "ro-RO", en: "en-GB", hu: "hu-HU" };

/* ---------- UI + waiter texts ---------- */
const S = {
ro: {
  morning: "Bună dimineața", day: "Bună ziua", evening: "Bună seara",
  heroTitle: "Bun venit la <em>Lyra</em>",
  poem: "Călătorule grăbit într-o lume fără timp, poposește la noi și te ospătează din preparatele noastre tradiționale, rânduite și servite cu drag. Gusturi cum numai în Ardeal găsești!",
  askLyra: "Întreabă-l pe Lyra", gallery: "Galerie foto", moodTitle: "Ce poftă aveți azi?",
  categories: "Categorii", search: "Caută un preparat, ingredient…", noRes: "Nimic găsit. Încercați alt cuvânt — sau întrebați-l pe Lyra.",
  items: "preparate", watch: "Privește", myList: "Lista mea", total: "Total", empty: "Lista e goală.<br>Apăsați <b>+</b> pe orice preparat.",
  listNote: "Lista vă ajută să alegeți — nu trimite comanda. Arătați-o ospătarului.", showWaiter: "Arată ospătarului", clear: "Golește",
  addToList: "Adaugă în lista mea", added: "Adăugat în listă ✓", pairWith: "Se potrivește cu", half: "Porție medie", glass: "Pahar 100 ml", since: "Tradiții din 1999",
  hours: "Program", daily: "Luni – Duminică", feedback: "Părerea dumneavoastră contează", feedbackTxt: "Sunați-ne la", review: "sau lăsați-ne o recenzie pe Google.",
  ordersNote: "Comenzile se pot face până la 20 de minute înainte de închidere, iar plata cel târziu cu 10 minute înainte.",
  vacation: "Cardurile de vacanță se acceptă doar pentru pachete turistice cu masă și minim o noapte de cazare.",
  invoice: "La cerere, factura se emite doar în ziua comenzii.",
  allergens: "Informații despre alergeni (Reg. UE 1169/2011): vă rugăm să întrebați personalul. Prețurile sunt în lei.",
  teaser: "Vă pot ajuta să alegeți? 🍽️", status: "Ospătarul digital · online", inputPh: "Scrieți-i lui Lyra…", back: "Înapoi la meniu",
  tags: { new: "Nou", chef: "Rețeta casei", hot: "Tigaie fierbinte", charcoal: "Cuptor pe cărbune", smoker: "Afumat în smoker", spicy: "Picant", veg: "Vegetarian", post: "De post", kids: "Copii", home: "Home made", share: "De împărțit", garnish: "Cu garnitură", nonalc: "Fără alcool" },
  moods: { ardeal: "Ceva ardelenesc", smoker: "Afumat în smoker", burger: "Burger pe cărbune", soup: "O ciorbă caldă", veg: "Ușor & verde", dessert: "Ceva dulce", surprise: "Surprinde-mă", share: "Pentru toată masa" },
  moodK: "Lyra recomandă",
  // waiter
  w_hello: "{g}! Eu sunt <b>Lyra</b>, ospătarul dumneavoastră digital. ✨ Vă pot recomanda preparate, vă duc direct la ce poftiți și vă ajut să alegeți vinul potrivit.",
  w_help: "Vă ajut să alegeți?",
  o_help: "Da, recomandă-mi", o_specific: "Caut ceva anume", o_surprise: "Surprinde-mă ✨", o_browse: "Răsfoiesc singur",
  w_breakfast: "E dimineață, iar micul dejun e gata. ☀️ Vreți să vedeți ce avem?",
  o_yes: "Da, arată-mi", o_no: "Nu, mulțumesc",
  w_soup: "Începem cu o ciorbă caldă, ca la mama acasă?",
  o_soupYes: "Da, o ciorbă", o_soupNo: "Nu, trecem la felul doi",
  w_soupClosed: "Ciorbele se servesc între 10 și 21, așa că vă propun direct felul principal.",
  w_soupHere: "V-am dus la ciorbe. Preferatele oaspeților noștri:",
  o_next: "Mai departe →",
  w_main: "Ce ați servi la felul doi? Alegeți și vă duc direct acolo.",
  w_here: "Am deschis „{cat}”. Recomandările mele:",
  w_hereBeef: "Vită — de la antricot la mușchi cu sos de piper. Vă recomand:",
  w_herePork: "Porc, așa cum se face în Ardeal. Vă recomand:",
  w_hereSmoker: "Ore întregi la fum de lemn în smoker-ul nostru. 🔥 Vă recomand:",
  w_hereKids: "Pentru cei mici avem porții pe gustul lor:",
  w_hereShare: "Pentru toată masa — platourile noastre se împart frățește:",
  w_dessert: "Un desert de casă? Papanașii noștri sunt adevărate legende. 😉",
  o_dessertYes: "Da, ceva dulce", o_dessertNo: "Fără desert",
  w_dessertHere: "Dulce alegere! Iată deserturile pe care le recomand:",
  w_drinks: "Și de băut, ce vă aduc?",
  w_wineFor: "Pentru {dish}, vă recomand:",
  w_wineGen: "Vinurile Pivnița Savu — preferatele casei:",
  w_porkPair: "La preparatele din porc merge de minune un roșu plin sau, tradițional, o zeamă de varză:",
  w_drinkHere: "Iată ce vă recomand:",
  w_end: "Excelent! Adăugați preparatele dorite în <b>Lista mea</b> cu „+”, apoi arătați-o ospătarului. Poftă bună! 🍽️",
  o_list: "Vezi lista mea", o_restart: "De la capăt", o_more: "Mai vreau ceva",
  w_specific: "Spuneți-mi ce poftiți — de exemplu „ceva picant”, „pește”, „vin roșu” sau numele unui preparat.",
  w_nf: "Hmm, n-am găsit exact asta. Vă pot ajuta cu una dintre variantele de mai jos:",
  w_found: "Uite ce am găsit:",
  w_surprise: "Închideți ochii... 🎲 Alegerea mea pentru dumneavoastră:",
  w_spicy: "Pentru cei care iubesc focul 🌶️:",
  w_light: "Ceva ușor și proaspăt:",
  w_cheap: "Gust mare, preț prietenos:",
  w_thanks: "Cu mare drag! Sunt aici dacă mai aveți nevoie. 🙂",
  w_hi: "Bună! Cu ce vă pot ajuta?",
  w_listEmpty: "Lista e încă goală. Apăsați „+” pe preparatele care vă plac.",
  w_listHas: "Aveți {n} produse în listă, în total {sum}.",
  w_hours: "Suntem deschiși zilnic, 07:00 – 22:00. Comenzile se pot face până la 21:40.",
  o_beef: "🥩 Vită", o_pork: "🐖 Porc", o_chicken: "🍗 Pui", o_fish: "🐟 Pește", o_burger: "🍔 Burger", o_smoker: "🔥 Smoker BBQ", o_ardeal: "🏔️ Ardelenesc", o_veg: "🥗 Vegetarian", o_share: "🍽️ Platou de împărțit", o_kids: "🧒 Pentru copii",
  o_wine: "🍷 Vin", o_beer: "🍺 Bere", o_cocktail: "🍹 Cocktail", o_soft: "🍋 Fără alcool", o_coffee: "☕ Cafea",
  see: "Vezi"
},
en: {
  morning: "Good morning", day: "Good afternoon", evening: "Good evening",
  heroTitle: "Welcome to <em>Lyra</em>",
  poem: "Hurried traveller in a timeless world — stop by and feast on our traditional dishes, prepared and served with love. Flavours you'll only find in Transylvania!",
  askLyra: "Ask Lyra", gallery: "Photo gallery", moodTitle: "What are you craving today?",
  categories: "Categories", search: "Search a dish, an ingredient…", noRes: "Nothing found. Try another word — or ask Lyra.",
  items: "dishes", watch: "Watch", myList: "My list", total: "Total", empty: "Your list is empty.<br>Tap <b>+</b> on any dish.",
  listNote: "This list helps you choose — it doesn't place an order. Show it to your waiter.", showWaiter: "Show the waiter", clear: "Clear",
  addToList: "Add to my list", added: "Added to your list ✓", pairWith: "Pairs well with", half: "Medium portion", glass: "Glass 100 ml", since: "Traditions since 1999",
  hours: "Opening hours", daily: "Monday – Sunday", feedback: "Your opinion matters", feedbackTxt: "Call us at", review: "or leave us a Google review.",
  ordersNote: "Orders are taken until 20 minutes before closing; payment at the latest 10 minutes before.",
  vacation: "Holiday vouchers are accepted only for tourist packages including meals and at least one night's stay.",
  invoice: "Invoices are issued on request, only on the day of the order.",
  allergens: "Allergen information (EU Reg. 1169/2011): please ask our staff. Prices are in lei (RON).",
  teaser: "Can I help you choose? 🍽️", status: "Your digital waiter · online", inputPh: "Message Lyra…", back: "Back to menu",
  tags: { new: "New", chef: "House recipe", hot: "Sizzling pan", charcoal: "Charcoal oven", smoker: "Smoked", spicy: "Spicy", veg: "Vegetarian", post: "Vegan", kids: "Kids", home: "Homemade", share: "To share", garnish: "Side included", nonalc: "Alcohol-free" },
  moods: { ardeal: "Transylvanian classics", smoker: "Smoked low & slow", burger: "Charcoal burgers", soup: "A warm soup", veg: "Light & green", dessert: "Something sweet", surprise: "Surprise me", share: "For the whole table" },
  moodK: "Lyra suggests",
  w_hello: "{g}! I'm <b>Lyra</b>, your digital waiter. ✨ I can recommend dishes, take you straight to what you fancy and help you pick the right wine.",
  w_help: "Shall I help you choose?",
  o_help: "Yes, recommend", o_specific: "I'm looking for something", o_surprise: "Surprise me ✨", o_browse: "I'll browse",
  w_breakfast: "It's morning and breakfast is ready. ☀️ Would you like to see it?",
  o_yes: "Yes, show me", o_no: "No, thanks",
  w_soup: "Shall we start with a warm, homestyle soup?",
  o_soupYes: "Yes, a soup", o_soupNo: "No, straight to mains",
  w_soupClosed: "Soups are served between 10:00 and 21:00, so let's go straight to the main course.",
  w_soupHere: "Here are our soups. Our guests' favourites:",
  o_next: "Next →",
  w_main: "What would you like for your main course? Pick one and I'll take you there.",
  w_here: "I've opened \"{cat}\". My recommendations:",
  w_hereBeef: "Beef — from entrecôte to tenderloin with pepper sauce. I recommend:",
  w_herePork: "Pork, the Transylvanian way. I recommend:",
  w_hereSmoker: "Hours of real wood smoke in our smoker. 🔥 I recommend:",
  w_hereKids: "For the little ones, portions they'll love:",
  w_hereShare: "For the whole table — our platters are made for sharing:",
  w_dessert: "A homemade dessert? Our papanași are a true legend. 😉",
  o_dessertYes: "Yes, something sweet", o_dessertNo: "No dessert",
  w_dessertHere: "Sweet choice! These are the desserts I recommend:",
  w_drinks: "And what may I bring you to drink?",
  w_wineFor: "With {dish}, I recommend:",
  w_wineGen: "Pivnița Savu wines — house favourites:",
  w_porkPair: "Pork loves a full-bodied red — or, the traditional way, a glass of sauerkraut juice:",
  w_drinkHere: "Here's what I recommend:",
  w_end: "Excellent! Add the dishes you like to <b>My list</b> with \"+\", then show it to your waiter. Enjoy your meal! 🍽️",
  o_list: "See my list", o_restart: "Start over", o_more: "Something else",
  w_specific: "Tell me what you fancy — for example \"something spicy\", \"fish\", \"red wine\" or a dish name.",
  w_nf: "Hmm, I couldn't find exactly that. I can help with one of these:",
  w_found: "Here's what I found:",
  w_surprise: "Close your eyes... 🎲 My pick for you:",
  w_spicy: "For those who love the heat 🌶️:",
  w_light: "Something light and fresh:",
  w_cheap: "Big taste, friendly price:",
  w_thanks: "My pleasure! I'm here if you need anything. 🙂",
  w_hi: "Hello! How can I help?",
  w_listEmpty: "Your list is still empty. Tap \"+\" on the dishes you like.",
  w_listHas: "You have {n} items on your list, {sum} in total.",
  w_hours: "We're open daily, 07:00 – 22:00. Last orders at 21:40.",
  o_beef: "🥩 Beef", o_pork: "🐖 Pork", o_chicken: "🍗 Chicken", o_fish: "🐟 Fish", o_burger: "🍔 Burger", o_smoker: "🔥 BBQ Smoker", o_ardeal: "🏔️ Transylvanian", o_veg: "🥗 Vegetarian", o_share: "🍽️ Sharing platter", o_kids: "🧒 For kids",
  o_wine: "🍷 Wine", o_beer: "🍺 Beer", o_cocktail: "🍹 Cocktail", o_soft: "🍋 Alcohol-free", o_coffee: "☕ Coffee",
  see: "View"
},
hu: {
  morning: "Jó reggelt", day: "Jó napot", evening: "Jó estét",
  heroTitle: "Üdvözöljük a <em>Lyrában</em>",
  poem: "Siető utazó ebben az időtlen világban — térjen be hozzánk, és lakmározzon hagyományos ételeinkből, amelyeket szeretettel készítünk és tálalunk. Ízek, amilyeneket csak Erdélyben talál!",
  askLyra: "Kérdezze Lyrát", gallery: "Fotógaléria", moodTitle: "Mire van ma kedve?",
  categories: "Kategóriák", search: "Étel, hozzávaló keresése…", noRes: "Nincs találat. Próbáljon más szót — vagy kérdezze Lyrát.",
  items: "étel", watch: "Megnézem", myList: "Listám", total: "Összesen", empty: "A lista üres.<br>Koppintson a <b>+</b> gombra bármelyik ételnél.",
  listNote: "A lista segít a választásban — nem ad le rendelést. Mutassa meg a pincérnek.", showWaiter: "Megmutatom a pincérnek", clear: "Ürítés",
  addToList: "Hozzáadom a listámhoz", added: "Hozzáadva a listához ✓", pairWith: "Ajánlott mellé", half: "Közepes adag", glass: "Pohár 100 ml", since: "Hagyományok 1999 óta",
  hours: "Nyitvatartás", daily: "Hétfő – Vasárnap", feedback: "Fontos a véleménye", feedbackTxt: "Hívjon minket:", review: "vagy írjon értékelést a Google-on.",
  ordersNote: "Rendelni zárás előtt 20 percig lehet, fizetni legkésőbb 10 perccel előtte.",
  vacation: "Üdülési kártyát csak étkezést és legalább egy éjszakát tartalmazó turisztikai csomagra fogadunk el.",
  invoice: "Számlát kérésre kizárólag a rendelés napján állítunk ki.",
  allergens: "Allergén információk (EU 1169/2011 rendelet): kérjük, érdeklődjön munkatársainknál. Az árak lejben értendők.",
  teaser: "Segíthetek választani? 🍽️", status: "Digitális pincér · online", inputPh: "Írjon Lyrának…", back: "Vissza az étlaphoz",
  tags: { new: "Új", chef: "Házi recept", hot: "Forró serpenyő", charcoal: "Faszenes sütő", smoker: "Füstölt", spicy: "Csípős", veg: "Vegetáriánus", post: "Böjti", kids: "Gyerek", home: "Házi készítésű", share: "Közös tál", garnish: "Körettel", nonalc: "Alkoholmentes" },
  moods: { ardeal: "Erdélyi ízek", smoker: "Lassan füstölt", burger: "Faszenes burger", soup: "Egy forró leves", veg: "Könnyű & zöld", dessert: "Valami édes", surprise: "Lepjen meg", share: "Az egész asztalnak" },
  moodK: "Lyra ajánlja",
  w_hello: "{g}! <b>Lyra</b> vagyok, az Ön digitális pincére. ✨ Ajánlok ételeket, egyenesen oda viszem, amire vágyik, és segítek kiválasztani a hozzá illő bort.",
  w_help: "Segíthetek választani?",
  o_help: "Igen, ajánljon", o_specific: "Valami konkrétat keresek", o_surprise: "Lepjen meg ✨", o_browse: "Inkább böngészek",
  w_breakfast: "Reggel van, és kész a reggeli. ☀️ Megnézi, mit kínálunk?",
  o_yes: "Igen, mutassa", o_no: "Köszönöm, nem",
  w_soup: "Kezdjük egy forró, házias levessel?",
  o_soupYes: "Igen, egy levest", o_soupNo: "Nem, jöhet a főétel",
  w_soupClosed: "A leveseket 10 és 21 óra között szolgáljuk fel, ezért egyenesen a főételt ajánlom.",
  w_soupHere: "Itt vannak a levesek. Vendégeink kedvencei:",
  o_next: "Tovább →",
  w_main: "Mit kér főételnek? Válasszon, és odaviszem.",
  w_here: "Megnyitottam: „{cat}”. Az ajánlataim:",
  w_hereBeef: "Marha — a hátszíntől a borsmártásos bélszínig. Ajánlom:",
  w_herePork: "Sertés, ahogy Erdélyben készül. Ajánlom:",
  w_hereSmoker: "Órákon át valódi fafüstben, a smokerünkben. 🔥 Ajánlom:",
  w_hereKids: "A kicsiknek kedvükre való adagok:",
  w_hereShare: "Az egész asztalnak — tálaink közös falatozásra készülnek:",
  w_dessert: "Egy házi desszert? A papanașink igazi legenda. 😉",
  o_dessertYes: "Igen, valami édeset", o_dessertNo: "Desszert nélkül",
  w_dessertHere: "Édes döntés! Ezeket a desszerteket ajánlom:",
  w_drinks: "És mit hozhatok inni?",
  w_wineFor: "A(z) {dish} mellé ezt ajánlom:",
  w_wineGen: "Pivnița Savu borok — a ház kedvencei:",
  w_porkPair: "A sertéshez egy testes vörös illik — vagy hagyományosan egy pohár káposztalé:",
  w_drinkHere: "Ezt ajánlom:",
  w_end: "Kiváló! A „+” gombbal tegye a kívánt ételeket a <b>Listámba</b>, majd mutassa meg a pincérnek. Jó étvágyat! 🍽️",
  o_list: "Listám megnézése", o_restart: "Újrakezdés", o_more: "Még valamit",
  w_specific: "Mondja meg, mire vágyik — például „valami csípős”, „hal”, „vörösbor” vagy egy étel neve.",
  w_nf: "Hmm, pontosan ezt nem találtam. Ezekben tudok segíteni:",
  w_found: "Ezt találtam:",
  w_surprise: "Csukja be a szemét... 🎲 Az én választásom Önnek:",
  w_spicy: "A csípős ízek kedvelőinek 🌶️:",
  w_light: "Valami könnyű és friss:",
  w_cheap: "Nagy íz, barátságos ár:",
  w_thanks: "Szívesen! Itt vagyok, ha bármire szüksége van. 🙂",
  w_hi: "Üdvözlöm! Miben segíthetek?",
  w_listEmpty: "A lista még üres. Koppintson a „+” gombra a kedvenc ételeinél.",
  w_listHas: "{n} tétel van a listáján, összesen {sum}.",
  w_hours: "Minden nap nyitva vagyunk 07:00 és 22:00 között. Utolsó rendelés 21:40-kor.",
  o_beef: "🥩 Marha", o_pork: "🐖 Sertés", o_chicken: "🍗 Csirke", o_fish: "🐟 Hal", o_burger: "🍔 Burger", o_smoker: "🔥 BBQ Smoker", o_ardeal: "🏔️ Erdélyi", o_veg: "🥗 Vegetáriánus", o_share: "🍽️ Közös tál", o_kids: "🧒 Gyerekeknek",
  o_wine: "🍷 Bor", o_beer: "🍺 Sör", o_cocktail: "🍹 Koktél", o_soft: "🍋 Alkoholmentes", o_coffee: "☕ Kávé",
  see: "Megnézem"
}};

/* ---------- state ---------- */
let lang = "ro";
const st = { order: {}, sound: false, ctx: {} };
try { const o = JSON.parse(localStorage.getItem("lyra-order") || "{}"); if (o && typeof o === "object") st.order = o; } catch (e) {}
try { st.sound = localStorage.getItem("lyra-sound") === "1"; } catch (e) {}

const BY = {};
CATS.forEach(c => (ITEMS[c.id] || []).forEach(it => { it.cat = c.id; if (!BY[it.id]) BY[it.id] = it; }));
for (const k in st.order) if (!BY[k]) delete st.order[k];

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const li = () => LI[lang];
const t = k => (S[lang][k] !== undefined ? S[lang][k] : S.ro[k]);
const tr = a => (Array.isArray(a) ? (a[li()] || a[0]) : a || "");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[ăâ]/g, "a").replace(/[îí]/g, "i").replace(/[șş]/g, "s").replace(/[țţ]/g, "t").replace(/[őö]/g, "o").replace(/[űü]/g, "u");
const imgName = it => (it.img === 1 ? it.id : it.img);
const src = (it, thumb) => (it.img ? `img/${thumb ? "t/" : ""}${imgName(it)}.webp` : "");
const cat = id => CATS.find(c => c.id === id);
const fmtNum = n => {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return lang === "en" ? s : s.replace(".", ",");
};
const price = p => (typeof p === "number" ? fmtNum(p) : esc(p));
const priceHTML = p => `<span class="price">${price(p)}<small>LEI</small></span>`;
const hour = () => new Date().getHours();
const greet = () => { const h = hour(); return h < 11 ? t("morning") : h < 18 ? t("day") : t("evening"); };
const plus = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
const check = '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>';
const playI = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const clocheMini = '<svg viewBox="0 0 64 64"><circle cx="32" cy="15" r="3.2"/><path d="M10 44a22 22 0 0 1 44 0Z"/><rect x="6" y="46" width="52" height="4.5" rx="2.2"/></svg>';

const sub = it => it.half ? `${esc(t("half"))}: ${fmtNum(it.half[0])} lei` : it.glass ? `${esc(t("glass"))}: ${fmtNum(it.glass)} lei` : "";
function tagsHTML(it, max = 3) {
  const f = (it.f || "").split(" ").filter(x => x && t("tags")[x]);
  const order = ["new", "spicy", "chef", "smoker", "charcoal", "veg", "post", "home", "share", "hot", "kids", "garnish", "nonalc"];
  f.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return f.slice(0, max).map(x => `<span class="tag ${x}">${esc(t("tags")[x])}</span>`).join("");
}

/* =====================================================================
   RENDER
   ===================================================================== */
function render() {
  document.documentElement.lang = lang;
  $("#langLabel").textContent = lang.toUpperCase();
  $("#searchInput").placeholder = t("search");
  $("#chatInput").placeholder = t("inputPh");
  $("#chatStatus").textContent = t("status");
  $("#cgTitle").textContent = t("categories");
  $("#fabTeaser").textContent = t("teaser");

  // hero
  const moods = [
    ["ardeal", "sarmale"], ["smoker", "costite-bbq"], ["burger", "eleven-burger"], ["soup", "fasole-pita"],
    ["share", "platou-lyra"], ["veg", "salata-halloumi"], ["dessert", "papanas"], ["surprise", "ciolan-varza-rosie"]
  ];
  $("#hero").innerHTML = `
    <div class="greet">${esc(greet())} · ${esc(t("since"))}</div>
    <h1>${t("heroTitle")}</h1>
    <p class="poem">${esc(t("poem"))}</p>
    <div class="hero-cta">
      <button class="btn btn-gold" id="heroAsk"><span class="mini-av">${clocheMini}</span>${esc(t("askLyra"))}</button>
      <button class="btn btn-ghost" id="heroReels">${playI.replace("<svg", '<svg style="fill:currentColor;stroke:none"')}${esc(t("gallery"))}</button>
    </div>
    <h2 class="mood-title">${esc(t("moodTitle"))}</h2>
    <div class="moods">${moods.map(([k, im]) => `
      <button class="mood" data-mood="${k}"><img src="img/t/${im}.webp" alt="" loading="lazy"><span><small>${esc(t("moodK"))}</small>${esc(t("moods")[k])}</span></button>`).join("")}
    </div>`;
  $("#heroAsk").onclick = () => openChat(true);
  $("#heroReels").onclick = () => openReels(null);
  document.querySelectorAll(".mood").forEach(b => b.onclick = () => moodPick(b.dataset.mood));

  // chips
  $("#chips").innerHTML = CATS.map(c => `<button class="chip" data-cat="${c.id}"><i>${c.icon}</i>${esc(tr(c.n))}</button>`).join("");
  document.querySelectorAll(".chip").forEach(b => b.onclick = () => goCat(b.dataset.cat, false));

  // sections
  $("#sections").innerHTML = CATS.map((c, ci) => sectionHTML(c, ci)).join("");
  bindSections();

  // footer
  $("#footer").innerHTML = `
    <img src="img/logo.webp" alt="Lyra">
    <h4>${esc(t("hours"))}</h4><p>${esc(t("daily"))}: <b>${INFO.hours}</b></p>
    <p>${esc(t("ordersNote"))}</p>
    <h4>${esc(t("feedback"))}</h4>
    <p>${esc(t("feedbackTxt"))} <a href="tel:${INFO.phone.replace(/\s/g, "")}">${INFO.phone}</a> ${esc(t("review"))}</p>
    <p><a href="https://${INFO.web}" target="_blank" rel="noopener">${INFO.web}</a> · <a href="tel:${INFO.orders.replace(/\s/g, "")}">${INFO.orders}</a></p>
    <p class="fine">${esc(t("vacation"))}<br>${esc(t("invoice"))}<br>${esc(t("allergens"))}</p>`;

  // category grid
  $("#cgGrid").innerHTML = CATS.map((c, i) => `<button class="cg" data-cat="${c.id}" style="animation-delay:${i * 25}ms"><img src="img/t/${c.cover}.webp" alt="" loading="lazy"><span>${esc(tr(c.n))}<small>${(ITEMS[c.id] || []).length} ${esc(t("items"))}</small></span></button>`).join("");
  document.querySelectorAll(".cg").forEach(b => b.onclick = () => { closeOverlay("#catgrid"); goCat(b.dataset.cat, false); });
  updateBadge();
}

function sectionHTML(c, ci) {
  const list = ITEMS[c.id] || [];
  const cut = list.filter(i => i.cut), photo = list.filter(i => i.img && !i.cut), rows = list.filter(i => !i.img);
  const nPhotos = list.filter(i => i.img).length;
  return `<section class="sec" id="sec-${c.id}" data-cat="${c.id}">
    <div class="sec-banner">
      <img src="img/${c.cover}.webp" alt="" loading="${ci < 2 ? "eager" : "lazy"}">
      ${nPhotos > 1 ? `<button class="play" data-reels="${c.id}">${playI}${esc(t("watch"))}</button>` : ""}
      <div class="bt"><div class="num">${String(ci + 1).padStart(2, "0")} · ${list.length} ${esc(t("items"))}</div><h2>${esc(tr(c.n))}</h2>${c.note ? `<p class="note">${esc(tr(c.note))}</p>` : ""}</div>
    </div>
    ${cut.length ? `<div class="showcase">${cut.map(scHTML).join("")}</div>` : ""}
    ${photo.length ? `<div class="grid">${photo.map(dishHTML).join("")}</div>` : ""}
    ${rows.length ? `<div class="plist">${rows.map(rowHTML).join("")}</div>` : ""}
  </section>`;
}
function dishHTML(it) {
  return `<article class="dish" data-id="${it.id}">
    <div class="ph"><img data-src="${src(it)}" alt="${esc(tr(it.n))}"><div class="tags">${tagsHTML(it)}</div>
      <button class="add" data-add="${it.id}" aria-label="+">${plus}</button></div>
    <div class="body"><h3>${esc(tr(it.n))}</h3>${it.d ? `<p>${esc(tr(it.d))}</p>` : ""}
      <div class="meta"><span class="w">${esc(it.w || "")}</span><div>${priceHTML(it.p)}${sub(it) ? `<div class="half">${sub(it)}</div>` : ""}</div></div>
    </div></article>`;
}
function scHTML(it) {
  return `<article class="sc" data-id="${it.id}"><img data-src="${src(it)}" alt="${esc(tr(it.n))}">
    <div class="t"><div class="k">by Lyra</div><h3>${esc(tr(it.n))}</h3>${it.d ? `<p>${esc(tr(it.d))}</p>` : ""}</div>
    ${priceHTML(it.p)}<button class="add" data-add="${it.id}" aria-label="+">${plus}</button></article>`;
}
function rowHTML(it) {
  return `<div class="prow" data-id="${it.id}"><div class="pt"><b>${esc(tr(it.n))}</b>${it.d || it.w ? `<span>${esc([it.d ? tr(it.d) : "", it.w || ""].filter(Boolean).join(" · "))}</span>` : ""}</div>
    <div>${priceHTML(it.p)}${sub(it) ? `<div class="half">${sub(it)}</div>` : ""}</div><button class="add" data-add="${it.id}" aria-label="+">${plus}</button></div>`;
}

/* ---------- observers: reveal, lazy images, scrollspy, parallax ---------- */
let revealObs, spyObs;
function bindSections() {
  revealObs && revealObs.disconnect(); spyObs && spyObs.disconnect();
  revealObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, img = el.querySelector("img[data-src]");
    if (img) { img.onload = () => img.classList.add("ok"); img.src = img.dataset.src; img.removeAttribute("data-src"); }
    el.classList.add("in"); revealObs.unobserve(el);
  }), { rootMargin: "200px 0px 0px 0px", threshold: 0.01 });
  document.querySelectorAll(".dish,.sc").forEach(el => revealObs.observe(el));

  spyObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setChip(e.target.dataset.cat); }),
    { rootMargin: "-40% 0px -55% 0px" });
  document.querySelectorAll(".sec").forEach(s => spyObs.observe(s));

  document.querySelectorAll("[data-reels]").forEach(b => b.onclick = e => { e.stopPropagation(); openReels(b.dataset.reels); });
}
function setChip(id) {
  document.querySelectorAll(".chip").forEach(c => {
    const on = c.dataset.cat === id;
    if (on && !c.classList.contains("on")) {
      const box = $("#chips");
      box.scrollTo({ left: c.offsetLeft - box.clientWidth / 2 + c.clientWidth / 2, behavior: "smooth" });
    }
    c.classList.toggle("on", on);
  });
}
let ticking = false;
addEventListener("scroll", () => {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    const vh = innerHeight;
    document.querySelectorAll(".sec-banner").forEach(b => {
      const r = b.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      b.firstElementChild.style.transform = `translateY(${(p * -40).toFixed(1)}px)`;
    });
    ticking = false;
  });
}, { passive: true });

/* ---------- global click delegation ---------- */
document.addEventListener("click", e => {
  const add = e.target.closest("[data-add]");
  if (add) { e.stopPropagation(); addItem(add.dataset.add, add); return; }
  const card = e.target.closest(".dish,.sc,.prow");
  if (card && !e.target.closest("#chat")) openDish(card.dataset.id);
});

/* =====================================================================
   NAVIGATION
   ===================================================================== */
function goCat(id, fromWaiter) {
  const sec = document.getElementById("sec-" + id);
  if (!sec) return;
  if (fromWaiter) setChat("peek");
  closeDish();
  sec.scrollIntoView({ behavior: "smooth", block: "start" });
  setChip(id);
  sec.classList.remove("flash"); void sec.offsetWidth; sec.classList.add("flash");
}
function focusItem(id) {
  const it = BY[id]; if (!it) return;
  const el = document.querySelector(`#sec-${it.cat} [data-id="${id}"]`);
  setChat("peek");
  if (!el) return goCat(it.cat, true);
  const y = el.getBoundingClientRect().top + scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--top")) + 54 + 16);
  scrollTo({ top: y, behavior: "smooth" });
  el.classList.add("hl"); setTimeout(() => el.classList.remove("hl"), 2600);
}

/* =====================================================================
   DISH DETAIL
   ===================================================================== */
function openDish(id) {
  const it = BY[id]; if (!it) return;
  const c = cat(it.cat), wine = it.wine && BY[it.wine];
  const tagAll = tagsHTML(it, 9);
  $("#dish").innerHTML = `
    ${it.img ? `<div class="dd-img ${it.cut ? "cut" : ""}"><img src="${src(it)}" alt="${esc(tr(it.n))}"></div>` : `<div style="height:44px"></div>`}
    <button class="icon-btn sm dd-close" id="ddClose" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <div class="dd-body">
      <div class="cat">${esc(tr(c.n))}</div>
      <h2>${esc(tr(it.n))}</h2>
      ${it.d ? `<p class="desc">${esc(tr(it.d))}</p>` : ""}
      ${tagAll ? `<div class="dd-tags">${tagAll}</div>` : ""}
      <div class="dd-row"><div><div class="w">${esc(it.w || "")}</div>${it.half ? `<div class="w">${esc(t("half"))}: <b>${fmtNum(it.half[0])} lei</b> · ${esc(it.half[1])}</div>` : it.glass ? `<div class="w">${sub(it)}</div>` : ""}</div>${priceHTML(it.p)}</div>
      ${wine ? `<button class="pair" data-wine="${wine.id}"><span class="gl">🍷</span><span><small>${esc(t("pairWith"))}</small><b>${esc(tr(wine.n))}</b></span></button>` : ""}
      <div class="dd-actions">
        <button class="btn btn-gold" id="ddAdd">${plus.replace("<svg", '<svg style="stroke-width:2.4"')}${esc(t("addToList"))}</button>
        <button class="btn btn-ghost" id="ddAsk" aria-label="${esc(t("askLyra"))}"><span class="mini-av">${clocheMini}</span></button>
      </div>
    </div>`;
  showSheet("#dish");
  $("#ddClose").onclick = closeDish;
  $("#ddAdd").onclick = e => { addItem(id, e.currentTarget); };
  $("#ddAsk").onclick = () => { closeDish(); openChat(false); waiterAbout(id); };
  const pb = $("#dish .pair"); if (pb) pb.onclick = () => openDish(pb.dataset.wine);
  $("#dish").scrollTop = 0;
}
function closeDish() { hideSheet("#dish"); }

/* ---------- generic sheet / overlay ---------- */
let sheetOpen = null;
function showSheet(sel) {
  if (sheetOpen && sheetOpen !== sel) $(sheetOpen).hidden = true;
  $(sel).hidden = false; $("#scrim").hidden = false; sheetOpen = sel;
  document.body.classList.add("lock");
}
function hideSheet(sel) {
  if ($(sel).hidden) return;
  $(sel).hidden = true;
  if (sheetOpen === sel) { sheetOpen = null; $("#scrim").hidden = true; document.body.classList.remove("lock"); }
}
$("#scrim").onclick = () => { hideSheet("#dish"); hideSheet("#list"); };
function openOverlay(sel) { $(sel).hidden = false; document.body.classList.add("lock"); }
function closeOverlay(sel) { $(sel).hidden = true; if (!sheetOpen) document.body.classList.remove("lock"); }
addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("#reels").hidden) return closeReels();
  ["#search", "#catgrid", "#showwaiter"].forEach(s => !$(s).hidden && closeOverlay(s));
  hideSheet("#dish"); hideSheet("#list");
});

/* =====================================================================
   MY LIST
   ===================================================================== */
function saveOrder() { try { localStorage.setItem("lyra-order", JSON.stringify(st.order)); } catch (e) {} }
function addItem(id, fromEl) {
  st.order[id] = (st.order[id] || 0) + 1; saveOrder(); updateBadge(true);
  toast(t("added"));
  if (fromEl && fromEl.classList.contains("add")) {
    fromEl.classList.add("done"); fromEl.innerHTML = check;
    setTimeout(() => { fromEl.classList.remove("done"); fromEl.innerHTML = plus; }, 1300);
  }
  flyToCart(fromEl);
  if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
}
function flyToCart(el) {
  if (!el) return;
  const a = el.getBoundingClientRect(), b = $("#btnList").getBoundingClientRect();
  const d = document.createElement("div"); d.className = "fly";
  d.style.left = a.left + a.width / 2 - 7 + "px"; d.style.top = a.top + a.height / 2 - 7 + "px";
  document.body.appendChild(d);
  requestAnimationFrame(() => { d.style.transform = `translate(${b.left + b.width / 2 - a.left - a.width / 2}px,${b.top + b.height / 2 - a.top - a.height / 2}px) scale(.5)`; d.style.opacity = ".2"; });
  setTimeout(() => d.remove(), 750);
}
function orderStats() {
  let n = 0, sum = 0, approx = false;
  for (const id in st.order) { const q = st.order[id], it = BY[id]; n += q; if (typeof it.p === "number") sum += it.p * q; else { approx = true; sum += (parseFloat(String(it.p)) || 0) * q; } }
  return { n, sum, approx };
}
function updateBadge(bump) {
  const { n } = orderStats(), b = $("#listCount");
  b.hidden = !n; b.textContent = n;
  if (bump) { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
}
function renderList() {
  const ids = Object.keys(st.order), { sum, approx } = orderStats();
  $("#list").innerHTML = `<span class="grabber"></span>
    <h2>${esc(t("myList"))}</h2><p class="note">${esc(t("listNote"))}</p>
    <div class="litems">${ids.length ? ids.map(id => { const it = BY[id]; return `
      <div class="li">${it.img ? `<img src="${src(it, 1)}" alt="">` : `<img alt="" src="img/t/${cat(it.cat).cover}.webp">`}
        <div class="lt"><b>${esc(tr(it.n))}</b><span>${price(it.p)} lei</span></div>
        <div class="qty"><button data-q="-1" data-id="${id}">−</button><em>${st.order[id]}</em><button data-q="1" data-id="${id}">+</button></div></div>`; }).join("")
      : `<div class="empty">${t("empty")}</div>`}</div>
    ${ids.length ? `<div class="ltotal"><span>${esc(t("total"))}${approx ? " ≈" : ""}</span><span class="price">${fmtNum(Math.round(sum * 100) / 100)}<small>LEI</small></span></div>
    <div class="lactions"><button class="btn btn-ghost" id="lClear">${esc(t("clear"))}</button><button class="btn btn-gold" id="lShow">${esc(t("showWaiter"))}</button></div>` : ""}`;
  $("#list").querySelectorAll("[data-q]").forEach(b => b.onclick = () => {
    const id = b.dataset.id; st.order[id] = (st.order[id] || 0) + +b.dataset.q;
    if (st.order[id] <= 0) delete st.order[id];
    saveOrder(); updateBadge(); renderList();
  });
  const c = $("#lClear"); if (c) c.onclick = () => { st.order = {}; saveOrder(); updateBadge(); renderList(); };
  const s = $("#lShow"); if (s) s.onclick = showWaiter;
}
function openList() { renderList(); showSheet("#list"); }
function showWaiter() {
  const ids = Object.keys(st.order), { sum, approx } = orderStats();
  $("#showwaiter").innerHTML = `<img src="img/logo.webp" alt="" style="width:120px;margin-bottom:10px"><h2>${esc(t("myList"))}</h2>
    ${ids.map(id => `<div class="sw-row"><span><em>${st.order[id]}×</em>${esc(tr(BY[id].n))}</span><span>${price(BY[id].p)}</span></div>`).join("")}
    <div class="sw-total"><span>${esc(t("total"))}${approx ? " ≈" : ""}</span><span>${fmtNum(Math.round(sum * 100) / 100)} lei</span></div>
    <button class="btn" id="swClose">${esc(t("back"))}</button>`;
  hideSheet("#list"); openOverlay("#showwaiter");
  $("#swClose").onclick = () => closeOverlay("#showwaiter");
}

/* =====================================================================
   SEARCH
   ===================================================================== */
function score(it, q) {
  const words = norm(q).split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return 0;
  const name = norm(it.n.join(" ")), desc = norm((it.d || []).join(" ")), catn = norm(cat(it.cat).n.join(" "));
  let s = 0;
  for (const w of words) {
    if (name.includes(w)) s += 3 + (name.split(/\s+/).some(x => x.startsWith(w)) ? 2 : 0);
    else if (catn.includes(w)) s += 2;
    else if (desc.includes(w)) s += 1;
    else return 0;
  }
  return s + (it.img ? 0.5 : 0);
}
function searchItems(q, limit = 40) {
  const seen = new Set();
  return Object.values(BY).map(it => [it, score(it, q)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1])
    .map(x => x[0]).filter(it => { const k = norm(tr(it.n)); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, limit);
}
$("#searchInput").addEventListener("input", e => {
  const q = e.target.value.trim(), box = $("#searchRes");
  if (q.length < 2) { box.innerHTML = ""; return; }
  const r = searchItems(q);
  box.innerHTML = r.length ? r.map(it => `<div class="sr" data-sid="${it.id}">${it.img ? `<img src="${src(it, 1)}" alt="" loading="lazy">` : `<span class="noimg">${cat(it.cat).icon}</span>`}
    <div class="st"><b>${esc(tr(it.n))}</b><span>${esc(tr(cat(it.cat).n))}</span></div>${priceHTML(it.p)}</div>`).join("")
    : `<p class="empty">${esc(t("noRes"))}</p>`;
  box.querySelectorAll(".sr").forEach(el => el.onclick = () => { closeOverlay("#search"); const id = el.dataset.sid; focusItem(id); setTimeout(() => openDish(id), 450); });
});

/* =====================================================================
   REELS (full-screen swipe gallery)
   ===================================================================== */
function openReels(catId) {
  const list = (catId ? (ITEMS[catId] || []) : CATS.flatMap(c => ITEMS[c.id] || [])).filter(i => i.img);
  const seen = new Set(), uniq = list.filter(i => { const k = imgName(i); if (seen.has(k)) return false; seen.add(k); return true; });
  $("#reelsTrack").innerHTML = uniq.map((it, i) => `<div class="reel ${it.cut ? "cut" : ""}" data-i="${i}">
      <div class="bgblur" data-bg="${src(it, 1)}"></div><img class="main" data-src="${src(it)}" alt="${esc(tr(it.n))}">
      ${i === 0 ? `<div class="reel-hint"><svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>swipe</div>` : ""}
      <div class="rt"><small>${esc(tr(cat(it.cat).n))}</small><h3>${esc(tr(it.n))}</h3>${it.d ? `<p>${esc(tr(it.d))}</p>` : ""}${priceHTML(it.p)}</div>
      <button class="add" data-add="${it.id}" aria-label="+">${plus}</button></div>`).join("");
  $("#reels").hidden = false; document.body.classList.add("lock");
  const track = $("#reelsTrack"); track.scrollTop = 0;
  const load = el => {
    const im = el.querySelector("img[data-src]"); if (im) { im.src = im.dataset.src; im.removeAttribute("data-src"); }
    const bg = el.querySelector("[data-bg]"); if (bg) { bg.style.backgroundImage = `url(${bg.dataset.bg})`; bg.removeAttribute("data-bg"); }
  };
  const ob = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    load(e.target); const nx = e.target.nextElementSibling; if (nx) load(nx);
    const im = e.target.querySelector("img.main"); im.classList.remove("img-in"); void im.offsetWidth; im.classList.add("img-in");
  }), { root: track, threshold: 0.6 });
  track.querySelectorAll(".reel").forEach(r => ob.observe(r));
  track._ob = ob;
  track.querySelectorAll(".rt").forEach(r => r.onclick = () => { const id = r.parentElement.querySelector("[data-add]").dataset.add; closeReels(); openDish(id); });
}
function closeReels() { $("#reels").hidden = true; const tr_ = $("#reelsTrack"); tr_._ob && tr_._ob.disconnect(); tr_.innerHTML = ""; if (!sheetOpen) document.body.classList.remove("lock"); }
$("#reelsClose").onclick = closeReels;

/* =====================================================================
   TOAST
   ===================================================================== */
let toastT;
function toast(msg) { const el = $("#toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 1600); }

/* =====================================================================
   OSPĂTARUL LYRA — waiter brain
   ===================================================================== */
const log = $("#chatLog");
let chatStarted = false, busy = Promise.resolve();

function setChat(mode) {
  const c = $("#chat");
  if (mode === "closed") {
    c.hidden = true; $("#fab").hidden = false;
    clearTimeout(setChat.tt); setChat.tt = setTimeout(() => { if (c.hidden) { $("#fabTeaser").classList.add("show"); setTimeout(() => $("#fabTeaser").classList.remove("show"), 6000); } }, 25000);
    return;
  }
  c.hidden = false; $("#fab").hidden = true;
  c.classList.toggle("peek", mode === "peek");
  setTimeout(() => (log.scrollTop = log.scrollHeight), 480);
}
function openChat(fresh, mode) {
  $("#fabTeaser").classList.remove("show");
  setChat(mode || "full");
  if (!chatStarted || fresh === "reset") { chatStarted = true; log.innerHTML = ""; st.ctx = {}; queue(flowHello); }
}
$("#fab").onclick = () => openChat(false);
$("#btnChatMin").onclick = e => { e.stopPropagation(); setChat("closed"); };
$("#chatHead").onclick = () => setChat($("#chat").classList.contains("peek") ? "full" : "peek");
$("#btnSound").onclick = e => {
  e.stopPropagation(); st.sound = !st.sound;
  try { localStorage.setItem("lyra-sound", st.sound ? "1" : "0"); } catch (er) {}
  $("#btnSound").classList.toggle("on", st.sound);
  if (!st.sound && window.speechSynthesis) speechSynthesis.cancel();
};

function queue(fn) { busy = busy.then(fn).catch(err => console.error(err)); return busy; }

function speak(html) {
  if (!st.sound || !window.speechSynthesis) return;
  const txt = html.replace(/<[^>]+>/g, "").replace(/[\u{1F000}-\u{1FFFF}☀-➿️]/gu, "").replace(/„|”|"/g, "");
  const u = new SpeechSynthesisUtterance(txt); u.lang = SPEECH[lang]; u.rate = 1.02; u.pitch = 1.05;
  const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith(lang));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}
const scrollLog = () => requestAnimationFrame(() => (log.scrollTop = log.scrollHeight));

async function say(html, ms) {
  const ty = document.createElement("div"); ty.className = "msg bot typing"; ty.innerHTML = "<i></i><i></i><i></i>";
  log.appendChild(ty); scrollLog();
  const av = document.querySelector("#chat .avatar"); av && av.classList.add("talk");
  await sleep(ms || Math.min(1300, 420 + html.length * 9));
  ty.remove(); av && av.classList.remove("talk");
  const m = document.createElement("div"); m.className = "msg bot"; m.innerHTML = html;
  log.appendChild(m); scrollLog(); speak(html);
}
function me(text) { const m = document.createElement("div"); m.className = "msg me"; m.textContent = text; log.appendChild(m); scrollLog(); }

function options(list) {
  const box = document.createElement("div"); box.className = "opts";
  list.forEach(([label, fn, primary]) => {
    const b = document.createElement("button"); b.className = "opt" + (primary ? " primary" : ""); b.textContent = label;
    b.onclick = () => {
      if (box.classList.contains("used")) return;
      box.classList.add("used"); b.classList.add("picked");
      me(label.replace(/\s*[→✨]$/, "")); queue(fn);
    };
    box.appendChild(b);
  });
  log.appendChild(box); scrollLog();
}
function cards(ids) {
  const list = ids.map(id => BY[id]).filter(Boolean);
  if (!list.length) return;
  const box = document.createElement("div"); box.className = "cards";
  box.innerHTML = list.map(it => `<div class="ccard">
    <div class="ci ${it.cut ? "cut" : ""}" data-open="${it.id}">${it.img ? `<img src="${src(it, 1)}" alt="" loading="lazy">` : `<img src="img/t/${cat(it.cat).cover}.webp" alt="" loading="lazy">`}</div>
    <div class="cb"><b>${esc(tr(it.n))}</b><div class="cr">${priceHTML(it.p)}<div class="cbtns"><button data-see="${it.id}">${esc(t("see"))}</button><button class="cadd" data-add="${it.id}">+</button></div></div></div></div>`).join("");
  box.querySelectorAll("[data-open]").forEach(b => b.onclick = () => openDish(b.dataset.open));
  box.querySelectorAll("[data-see]").forEach(b => b.onclick = () => focusItem(b.dataset.see));
  log.appendChild(box); scrollLog();
}

/* ---------- flows ---------- */
async function flowHello() {
  await say(t("w_hello").replace("{g}", esc(greet())), 900);
  await say(t("w_help"), 600);
  options([[t("o_help"), flowStart, 1], [t("o_surprise"), flowSurprise], [t("o_specific"), flowSpecific], [t("o_browse"), async () => setChat("closed")]]);
}
async function flowStart() { const h = hour(); if (h >= 7 && h < 11) return flowBreakfast(); return flowSoup(); }
async function flowBreakfast() {
  await say(t("w_breakfast"));
  options([[t("o_yes"), async () => { goCat("mic-dejun", true); await say(tf("w_here", "mic-dejun")); cards(W.breakfast); await sleep(500); options([[t("o_next"), flowSoup, 1]]); }, 1], [t("o_no"), flowSoup]]);
}
async function flowSoup() {
  const h = hour(), [a, b] = INFO.soupHours;
  if (h < a || h >= b) { await say(t("w_soupClosed")); return flowMain(); }
  await say(t("w_soup"));
  options([[t("o_soupYes"), async () => { goCat("ciorbe", true); await say(t("w_soupHere")); cards(W.soup); await sleep(400); options([[t("o_next"), flowMain, 1]]); }, 1], [t("o_soupNo"), flowMain]]);
}
const MAIN = {
  beef: ["noutati", "w_hereBeef"], pork: ["porc", "w_herePork"], chicken: ["pui"], fish: ["peste"], burger: ["burgeri"],
  smoker: ["smoker", "w_hereSmoker"], ardeal: ["ardeal"], veg: ["vegetariene"], share: ["platouri", "w_hereShare"], kids: ["kids", "w_hereKids"],
  breakfast: ["mic-dejun"], soup: ["ciorbe", "w_soupHere"], dessert: ["desert", "w_dessertHere"]
};
const tf = (k, catId) => t(k).replace("{cat}", esc(tr(cat(catId).n)));
async function showIntent(key, then) {
  const [catId, msgKey] = MAIN[key];
  goCat(catId, true);
  if (["beef", "pork", "chicken", "fish", "veg", "burger", "smoker", "ardeal", "share", "kids"].includes(key)) st.ctx.main = key;
  st.ctx.dish = W[key] && W[key][0];
  await say(msgKey ? t(msgKey) : tf("w_here", catId));
  cards(W[key] || []);
  await sleep(400);
  if (then) return then();
}
async function flowMain() {
  await say(t("w_main"));
  const keys = ["beef", "pork", "chicken", "fish", "burger", "smoker", "ardeal", "veg", "share", "kids"];
  options(keys.map(k => [t("o_" + k), () => showIntent(k, afterMain)]));
}
async function afterMain() { options([[t("o_next"), flowDessert, 1], [t("o_more"), flowMain]]); }
async function flowDessert() {
  await say(t("w_dessert"));
  options([[t("o_dessertYes"), async () => { goCat("desert", true); await say(t("w_dessertHere")); cards(W.dessert); await sleep(400); options([[t("o_next"), flowDrinks, 1]]); }, 1], [t("o_dessertNo"), flowDrinks]]);
}
async function flowDrinks() {
  await say(t("w_drinks"));
  options(["wine", "beer", "cocktail", "soft", "coffee"].map(k => [t("o_" + k), () => showDrink(k, flowEnd)]));
}
const PAIR = { beef: ["not-noir", "primitivo", "feteasca-neagra"], pork: ["feteasca-neagra", "montepulciano", "zeama-varza"], chicken: ["feteasca", "chardonnay", "apuseniu"], fish: ["sauvignon", "riesling", "feteasca"], veg: ["sauvignon", "feteasca", "riesling"], burger: ["not-noir", "bere-poet", "chardonnay"], smoker: ["feteasca-neagra", "primitivo", "zeama-varza"], ardeal: ["feteasca-neagra", "zeama-varza", "feteasca"], share: ["feteasca-neagra", "pinot-rose", "feteasca"], kids: ["limonada-capsuni", "limonada", "apple-pie"] };
async function showDrink(k, then, nav = true) {
  const DC = { wine: "vinuri", beer: "bar", cocktail: "cocktails", soft: "limonade", coffee: "cafea" };
  if (nav) goCat(DC[k], true);
  if (k === "wine") {
    const m = st.ctx.main, d = st.ctx.dish && BY[st.ctx.dish];
    if (d && d.wine) { await say(t("w_wineFor").replace("{dish}", "<b>" + esc(tr(d.n)) + "</b>")); cards([d.wine, ...(PAIR[m] || W.wine)].filter((v, i, a) => a.indexOf(v) === i)); }
    else if (m === "pork" || m === "smoker" || m === "ardeal") { await say(t("w_porkPair")); cards(PAIR[m]); }
    else if (m && PAIR[m]) { await say(d ? t("w_wineFor").replace("{dish}", "<b>" + esc(tr(d.n)) + "</b>") : t("w_drinkHere")); cards(PAIR[m]); }
    else { await say(t("w_wineGen")); cards(W.wine); }
  } else { await say(t("w_drinkHere")); cards(W[k]); }
  await sleep(400);
  if (then) return then();
}
async function flowEnd() {
  await say(t("w_end"));
  options([[t("o_list"), async () => { setChat("closed"); openList(); }, 1], [t("o_more"), flowMain], [t("o_restart"), async () => openChat("reset")]]);
}
async function flowSurprise() {
  const pool = W.surprise.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  await say(t("w_surprise"), 1200);
  cards(pool);
  st.ctx.dish = pool[0]; st.ctx.main = BY[pool[0]].pr === "beef" ? "beef" : BY[pool[0]].pr === "pork" ? "pork" : BY[pool[0]].pr;
  await sleep(400);
  options([[t("o_next"), flowDessert, 1], [t("o_surprise"), flowSurprise], [t("o_help"), flowStart]]);
}
async function flowSpecific() { await say(t("w_specific")); $("#chatInput").focus(); }
async function waiterAbout(id) {
  const it = BY[id];
  st.ctx.dish = id; st.ctx.main = it.pr;
  await say("<b>" + esc(tr(it.n)) + "</b> — " + (it.d ? esc(tr(it.d)) : "") );
  if (it.wine || PAIR[it.pr]) { await showDrink("wine", null, false); }
  options([[t("o_next"), flowDessert, 1], [t("o_more"), flowMain]]);
}
async function moodPick(k) {
  openChat(false);
  await busy;
  me(t("moods")[k]);
  if (k === "surprise") return queue(flowSurprise);
  if (k === "veg") return queue(async () => { goCat("salate", true); await say(t("w_light")); cards(["salata-halloumi", "camembert", "oua-posate-salata", "papricas-ciuperci"]); await sleep(300); afterMain(); });
  queue(() => showIntent(k, k === "dessert" ? () => options([[t("o_next"), flowDrinks, 1]]) : k === "soup" ? () => options([[t("o_next"), flowMain, 1]]) : afterMain));
}

/* ---------- free-text understanding (RO / EN / HU) ---------- */
/* Each intent: stems. A stem of 4+ letters matches the start of any word (handles
   Hungarian/Romanian suffixes: "csípőset", "vörösbort", "ciorbă"); shorter stems
   must match a whole word; stems with a space match as a phrase. */
const INTENTS = [
  ["hi", "buna salut hello hi hey szia szervusz udv jo_napot"],
  ["thanks", "multumesc mersi thanks thank koszonom koszi"],
  ["list", "lista nota bill check order rendeles listam szamla"],
  ["hours", "program orar deschis inchide hours open close nyitva nyitvatartas"],
  ["surprise", "surprinde surprise meglep random orice anything recomanda recommend ajanl javasol valassz"],
  ["spicy", "picant iute spicy chili csipos eros jalapeno"],
  ["light", "usor light healthy sanatos dieta konnyu egeszseges"],
  ["cheap", "ieftin cheap budget buget olcso"],
  ["kids", "copii copil kids kid child children gyerek gyermek"],
  ["breakfast", "mic_dejun breakfast reggeli omleta omelette oua eggs tojas"],
  ["soup", "ciorb supa supe soup leves gulas goulash gulyas burta tripe pacal"],
  ["dessert", "desert dulce dessert sweet edes desszert papanas prajitur cake torta inghetata ice_cream fagylalt clatit palacsint"],
  ["wine", "vin vinul vinuri wine wines bor bort borok vorosbor feherbor rose roze prosecco sampanie champagne pezsgo"],
  ["beer", "bere beer sor sort sorok lager cidru cider"],
  ["cocktail", "cocktail coctail koktel aperol spritz hugo mojito gin"],
  ["coffee", "cafea coffee kave kavet espresso cappuccino latte ceai tea frappe"],
  ["soft", "limonad lemonade fara_alcool non_alcoholic alcohol_free alkoholmentes suc juice apa water viz uditot uditok racoritoar"],
  ["share", "platou platter tal talat impart share grup group tarsasag"],
  ["smoker", "smoker afumat smoked bbq barbecue fustolt"],
  ["burger", "burger smash hamburger"],
  ["fish", "peste fish hal halat pastrav trout pisztrang biban perch sullo"],
  ["veg", "vegetarian veggie vegan fara_carne meatless vega hus_nelkul post bojti salata salad"],
  ["chicken", "pui chicken csirke piept breast borzas cordon"],
  ["beef", "vita vitel beef steak marha borju angus antricot entrecote muschi"],
  ["pork", "porc pork sertes ciolan knuckle csulok ceafa carnati sausage kolbasz mici mititei coaste ribs"],
  ["ardeal", "traditional ardelenesc transilvan romanesc romanian erdelyi hagyomanyos sarmal stuffed_cabbage toltott_kaposzta local"]
].map(([k, list]) => [k, list.split(" ").map(x => x.replace(/_/g, " "))]);
function matchIntent(q, stems) {
  const words = q.split(/[^a-z0-9]+/).filter(Boolean);
  return stems.some(st_ => st_.includes(" ") ? q.includes(st_) : st_.length >= 4 ? words.some(w => w.startsWith(st_)) : words.includes(st_));
}
async function understand(text) {
  const q = norm(text);
  const hits = INTENTS.filter(([, stems]) => matchIntent(q, stems)).map(([k]) => k);
  // direct dish match wins when it is strong
  const dishes = searchItems(text, 6);
  const strong = dishes.length && score(dishes[0], text) >= 5;
  const first = hits[0];

  if (first === "hi" && hits.length === 1) { await say(t("w_hi")); return options([[t("o_help"), flowStart, 1], [t("o_surprise"), flowSurprise]]); }
  if (first === "thanks") { await say(t("w_thanks")); return options([[t("o_list"), async () => { setChat("closed"); openList(); }], [t("o_more"), flowMain]]); }
  if (first === "list") {
    const { n, sum } = orderStats();
    await say(n ? t("w_listHas").replace("{n}", n).replace("{sum}", fmtNum(Math.round(sum * 100) / 100) + " lei") : t("w_listEmpty"));
    return n && options([[t("o_list"), async () => { setChat("closed"); openList(); }, 1]]);
  }
  if (first === "hours") { await say(t("w_hours")); return; }
  if (strong && !hits.some(h => ["wine", "beer", "cocktail", "soft", "coffee", "spicy", "light", "cheap"].includes(h))) {
    await say(t("w_found")); cards(dishes.map(d => d.id)); focusItem(dishes[0].id); st.ctx.dish = dishes[0].id; st.ctx.main = dishes[0].pr; return afterMain();
  }
  const drink = hits.find(h => ["wine", "beer", "cocktail", "soft", "coffee"].includes(h));
  const next = drink ? () => showDrink(drink, afterMain) : afterMain;
  if (hits.includes("spicy")) {
    const ids = Object.values(BY).filter(i => /spicy/.test(i.f || "") && i.cat !== "muraturi").map(i => i.id);
    await say(t("w_spicy")); cards(ids); st.ctx.main = "pork"; st.ctx.dish = null; return next();
  }
  if (hits.includes("light")) {
    await say(t("w_light")); goCat("salate", true); cards(["salata-halloumi", "oua-posate-salata", "salata-pui", "supa-crema-legume", "piept-carbune"]); st.ctx.main = "veg"; return next();
  }
  if (hits.includes("cheap")) {
    const mains = ["porc", "pui", "ardeal", "vegetariene", "burgeri", "paste", "ciorbe"].flatMap(c => ITEMS[c]).filter(i => typeof i.p === "number" && i.img && i.pr && i.p >= 20).sort((a, b) => a.p - b.p).slice(0, 6);
    await say(t("w_cheap")); cards(mains.map(i => i.id)); return next();
  }
  if (hits.includes("surprise") && !hits.some(h => MAIN[h] || ["wine", "beer", "cocktail", "soft", "coffee"].includes(h))) return flowSurprise();
  const food = hits.find(h => MAIN[h]);
  if (food) {
    if (food === "soup") return showIntent("soup", () => options([[t("o_next"), flowMain, 1]]));
    if (food === "dessert") return showIntent("dessert", () => options([[t("o_next"), flowDrinks, 1]]));
    return showIntent(food, drink ? () => showDrink(drink, afterMain) : afterMain);
  }
  if (drink) return showDrink(drink, () => options([[t("o_next"), flowEnd, 1], [t("o_more"), flowMain]]));
  if (dishes.length) { await say(t("w_found")); cards(dishes.map(d => d.id)); focusItem(dishes[0].id); return afterMain(); }
  await say(t("w_nf"));
  options([["beef", "pork", "chicken", "fish", "burger", "veg"].map(k => [t("o_" + k), () => showIntent(k, afterMain)]), [[t("o_surprise"), flowSurprise]]].flat());
}
$("#chatForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = $("#chatInput").value.trim(); if (!v) return;
  $("#chatInput").value = "";
  log.querySelectorAll(".opts:not(.used)").forEach(o => o.classList.add("used"));
  me(v); setChat("full"); queue(() => understand(v));
});

/* voice input */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  const mic = $("#btnMic"); mic.hidden = false; let rec = null;
  mic.onclick = () => {
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = SPEECH[lang]; rec.interimResults = false;
    mic.classList.add("rec");
    rec.onresult = ev => { $("#chatInput").value = ev.results[0][0].transcript; $("#chatForm").requestSubmit(); };
    rec.onend = () => { mic.classList.remove("rec"); rec = null; };
    rec.onerror = () => { mic.classList.remove("rec"); rec = null; };
    try { rec.start(); } catch (er) { mic.classList.remove("rec"); rec = null; }
  };
}

/* =====================================================================
   TOP BAR + LANGUAGE
   ===================================================================== */
$("#btnSearch").onclick = () => { openOverlay("#search"); $("#searchInput").value = ""; $("#searchRes").innerHTML = ""; setTimeout(() => $("#searchInput").focus(), 50); };
$("#searchClose").onclick = () => closeOverlay("#search");
$("#btnCats").onclick = () => openOverlay("#catgrid");
$("#cgClose").onclick = () => closeOverlay("#catgrid");
$("#btnList").onclick = openList;
$("#toTop").onclick = () => scrollTo({ top: 0, behavior: "smooth" });
$("#btnLang").onclick = () => {
  const order = ["ro", "en", "hu"]; setLang(order[(order.indexOf(lang) + 1) % 3]);
  const y = scrollY; render(); scrollTo(0, y);
  if (chatStarted) { chatStarted = false; if (!$("#chat").hidden) openChat(false); }
};
function setLang(l) { lang = l; try { localStorage.setItem("lyra-lang", l); } catch (e) {} if (window.speechSynthesis) speechSynthesis.cancel(); }

/* =====================================================================
   INTRO
   ===================================================================== */
(function embers() {
  const cv = $("#embers"), cx = cv.getContext("2d"); let w, h, ps = [], raf;
  const size = () => { w = cv.width = innerWidth * devicePixelRatio; h = cv.height = innerHeight * devicePixelRatio; };
  size(); addEventListener("resize", size);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 70; i++) ps.push({ x: Math.random() * w, y: Math.random() * h, r: (Math.random() * 1.8 + .4) * devicePixelRatio, v: Math.random() * .6 + .2, d: Math.random() * 6.28, a: Math.random() });
  (function loop() {
    if ($("#intro").classList.contains("gone")) return cancelAnimationFrame(raf);
    cx.clearRect(0, 0, w, h);
    for (const p of ps) {
      p.y -= p.v * devicePixelRatio; p.d += .02; p.x += Math.sin(p.d) * .4 * devicePixelRatio;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      const g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(255,${180 + (p.a * 60) | 0},90,${.75 * (0.5 + Math.sin(p.d * 2) * .5)})`); g.addColorStop(1, "rgba(255,120,40,0)");
      cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, p.r * 4, 0, 6.28); cx.fill();
    }
    raf = requestAnimationFrame(loop);
  })();
})();

document.querySelectorAll(".lang-btn").forEach(b => b.onclick = () => {
  setLang(b.dataset.lang);
  render();
  $("#app").hidden = false;
  $("#intro").classList.add("leave");
  setTimeout(() => { $("#intro").classList.add("gone"); $("#intro").hidden = true; }, 950);
  $("#btnSound").classList.toggle("on", st.sound);
  // Lyra greets the guest
  setTimeout(() => openChat(false, "peek"), 1300);
});
})();
