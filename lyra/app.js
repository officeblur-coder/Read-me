/* ===================== LYRA · MENIU DIGITAL · APP ===================== */
(() => {
"use strict";

const CATS = window.LYRA_CATS, ITEMS = window.LYRA_ITEMS, INFO = window.LYRA_INFO;
const LI = { ro: 0, en: 1, hu: 2 };

/* ---------- UI texts ---------- */
const S = {
ro: {
  morning: "Bună dimineața", day: "Bună ziua", evening: "Bună seara",
  heroTitle: "Bun venit la <em>Lyra</em>",
  poem: "Călătorule grăbit într-o lume fără timp, poposește la noi și te ospătează din preparatele noastre tradiționale, rânduite și servite cu drag. Gusturi cum numai în Ardeal găsești!",
  seeMenu: "Vezi meniul", gallery: "Galerie foto", moodTitle: "Ce poftă aveți azi?",
  categories: "Categorii", search: "Caută un preparat, ingredient…", noRes: "Nimic găsit. Încercați alt cuvânt — sau întrebați-l pe Lyra.",
  items: "preparate", watch: "Privește", myList: "Lista mea", total: "Total", empty: "Lista e goală.<br>Apăsați <b>+</b> pe orice preparat.",
  listNote: "Lista vă ajută să alegeți — nu trimite comanda. Arătați-o ospătarului.", showWaiter: "Arată ospătarului", clear: "Golește",
  addToList: "Adaugă în lista mea", added: "Adăugat în listă ✓", pairWith: "Se potrivește cu", half: "Porție medie", glass: "Pahar 100 ml", since: "Tradiții din 1999",
  hours: "Program", daily: "Luni – Duminică", feedback: "Părerea dumneavoastră contează", feedbackTxt: "Sunați-ne la", review: "sau lăsați-ne o recenzie pe Google.",
  ordersNote: "Comenzile se pot face până la 20 de minute înainte de închidere, iar plata cel târziu cu 10 minute înainte.",
  vacation: "Cardurile de vacanță se acceptă doar pentru pachete turistice cu masă și minim o noapte de cazare.",
  invoice: "La cerere, factura se emite doar în ziua comenzii.",
  allergens: "Informații despre alergeni (Reg. UE 1169/2011): vă rugăm să întrebați personalul. Prețurile sunt în lei.",
  back: "Înapoi la meniu",
  tags: { new: "Nou", chef: "Rețeta casei", hot: "Tigaie fierbinte", charcoal: "Cuptor pe cărbune", smoker: "Afumat în smoker", spicy: "Picant", veg: "Vegetarian", post: "De post", kids: "Copii", home: "Home made", share: "De împărțit", garnish: "Cu garnitură", nonalc: "Fără alcool" },
  moods: { ardeal: "Ceva ardelenesc", smoker: "Afumat în smoker", burger: "Burger pe cărbune", soup: "O ciorbă caldă", veg: "Ușor & verde", dessert: "Ceva dulce", surprise: "Surprinde-mă", share: "Pentru toată masa" },
},
en: {
  morning: "Good morning", day: "Good afternoon", evening: "Good evening",
  heroTitle: "Welcome to <em>Lyra</em>",
  poem: "Hurried traveller in a timeless world — stop by and feast on our traditional dishes, prepared and served with love. Flavours you'll only find in Transylvania!",
  seeMenu: "See the menu", gallery: "Photo gallery", moodTitle: "What are you craving today?",
  categories: "Categories", search: "Search a dish, an ingredient…", noRes: "Nothing found. Try another word — or ask Lyra.",
  items: "dishes", watch: "Watch", myList: "My list", total: "Total", empty: "Your list is empty.<br>Tap <b>+</b> on any dish.",
  listNote: "This list helps you choose — it doesn't place an order. Show it to your waiter.", showWaiter: "Show the waiter", clear: "Clear",
  addToList: "Add to my list", added: "Added to your list ✓", pairWith: "Pairs well with", half: "Medium portion", glass: "Glass 100 ml", since: "Traditions since 1999",
  hours: "Opening hours", daily: "Monday – Sunday", feedback: "Your opinion matters", feedbackTxt: "Call us at", review: "or leave us a Google review.",
  ordersNote: "Orders are taken until 20 minutes before closing; payment at the latest 10 minutes before.",
  vacation: "Holiday vouchers are accepted only for tourist packages including meals and at least one night's stay.",
  invoice: "Invoices are issued on request, only on the day of the order.",
  allergens: "Allergen information (EU Reg. 1169/2011): please ask our staff. Prices are in lei (RON).",
  back: "Back to menu",
  tags: { new: "New", chef: "House recipe", hot: "Sizzling pan", charcoal: "Charcoal oven", smoker: "Smoked", spicy: "Spicy", veg: "Vegetarian", post: "Vegan", kids: "Kids", home: "Homemade", share: "To share", garnish: "Side included", nonalc: "Alcohol-free" },
  moods: { ardeal: "Transylvanian classics", smoker: "Smoked low & slow", burger: "Charcoal burgers", soup: "A warm soup", veg: "Light & green", dessert: "Something sweet", surprise: "Surprise me", share: "For the whole table" },
},
hu: {
  morning: "Jó reggelt", day: "Jó napot", evening: "Jó estét",
  heroTitle: "Üdvözöljük a <em>Lyrában</em>",
  poem: "Siető utazó ebben az időtlen világban — térjen be hozzánk, és lakmározzon hagyományos ételeinkből, amelyeket szeretettel készítünk és tálalunk. Ízek, amilyeneket csak Erdélyben talál!",
  seeMenu: "Étlap megnyitása", gallery: "Fotógaléria", moodTitle: "Mire van ma kedve?",
  categories: "Kategóriák", search: "Étel, hozzávaló keresése…", noRes: "Nincs találat. Próbáljon más szót — vagy kérdezze Lyrát.",
  items: "étel", watch: "Megnézem", myList: "Listám", total: "Összesen", empty: "A lista üres.<br>Koppintson a <b>+</b> gombra bármelyik ételnél.",
  listNote: "A lista segít a választásban — nem ad le rendelést. Mutassa meg a pincérnek.", showWaiter: "Megmutatom a pincérnek", clear: "Ürítés",
  addToList: "Hozzáadom a listámhoz", added: "Hozzáadva a listához ✓", pairWith: "Ajánlott mellé", half: "Közepes adag", glass: "Pohár 100 ml", since: "Hagyományok 1999 óta",
  hours: "Nyitvatartás", daily: "Hétfő – Vasárnap", feedback: "Fontos a véleménye", feedbackTxt: "Hívjon minket:", review: "vagy írjon értékelést a Google-on.",
  ordersNote: "Rendelni zárás előtt 20 percig lehet, fizetni legkésőbb 10 perccel előtte.",
  vacation: "Üdülési kártyát csak étkezést és legalább egy éjszakát tartalmazó turisztikai csomagra fogadunk el.",
  invoice: "Számlát kérésre kizárólag a rendelés napján állítunk ki.",
  allergens: "Allergén információk (EU 1169/2011 rendelet): kérjük, érdeklődjön munkatársainknál. Az árak lejben értendők.",
  back: "Vissza az étlaphoz",
  tags: { new: "Új", chef: "Házi recept", hot: "Forró serpenyő", charcoal: "Faszenes sütő", smoker: "Füstölt", spicy: "Csípős", veg: "Vegetáriánus", post: "Böjti", kids: "Gyerek", home: "Házi készítésű", share: "Közös tál", garnish: "Körettel", nonalc: "Alkoholmentes" },
  moods: { ardeal: "Erdélyi ízek", smoker: "Lassan füstölt", burger: "Faszenes burger", soup: "Egy forró leves", veg: "Könnyű & zöld", dessert: "Valami édes", surprise: "Lepjen meg", share: "Az egész asztalnak" },
}};

/* ---------- state ---------- */
let lang = "ro";
const st = { order: {} };
try { const o = JSON.parse(localStorage.getItem("lyra-order") || "{}"); if (o && typeof o === "object") st.order = o; } catch (e) {}

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
const gridI = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>';

const sub = it => it.half ? `${esc(t("half"))}: ${fmtNum(it.half[0])} lei` : it.glass ? `${esc(t("glass"))}: ${fmtNum(it.glass)} lei` : it.big ? `${esc(it.big[1])}: ${fmtNum(it.big[0])} lei` : "";
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
  $("#cgTitle").textContent = t("categories");
  $("#bbCats").textContent = t("categories");
  $("#bbList").textContent = t("myList");

  // hero
  const moods = [
    ["ardeal", "sarmale", "ardeal"], ["smoker", "costite-bbq", "smoker"], ["burger", "double-smash", "burgeri"], ["soup", "fasole-pita", "ciorbe"],
    ["share", "platou-lyra", "platouri"], ["veg", "salata-halloumi", "salate"], ["dessert", "papanas", "desert"]
  ];
  $("#hero").innerHTML = `
    <div class="greet">${esc(greet())} · ${esc(t("since"))}</div>
    <h1>${t("heroTitle")}</h1>
    <p class="poem">${esc(t("poem"))}</p>
    <div class="hero-cta">
      <button class="btn btn-gold" id="heroAsk">${gridI}${esc(t("seeMenu"))}</button>
      <button class="btn btn-ghost" id="heroReels">${playI.replace("<svg", '<svg style="fill:currentColor;stroke:none"')}${esc(t("gallery"))}</button>
    </div>
    <h2 class="mood-title">${esc(t("moodTitle"))}</h2>
    <div class="moods">${moods.map(([k, im, c]) => `
      <button class="mood" data-cat="${c}"><img src="img/t/${im}.webp" alt="" loading="lazy"><span>${esc(t("moods")[k])}</span></button>`).join("")}
    </div>`;
  $("#heroAsk").onclick = () => openOverlay("#catgrid");
  $("#heroReels").onclick = () => openReels(null);
  document.querySelectorAll(".mood").forEach(b => b.onclick = () => goCat(b.dataset.cat));

  // chips
  $("#chips").innerHTML = CATS.map(c => `<button class="chip" data-cat="${c.id}">${esc(tr(c.n))}</button>`).join("");
  document.querySelectorAll(".chip").forEach(b => b.onclick = () => goCat(b.dataset.cat));

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
  document.querySelectorAll(".cg").forEach(b => b.onclick = () => { closeOverlay("#catgrid"); goCat(b.dataset.cat); });
  updateBadge();
}

function sectionHTML(c, ci) {
  const list = ITEMS[c.id] || [];
  const photo = list.filter(i => i.img), rows = list.filter(i => !i.img);
  const nPhotos = list.filter(i => i.img).length;
  return `<section class="sec" id="sec-${c.id}" data-cat="${c.id}">
    <div class="sec-banner">
      <img src="img/t/${c.cover}.webp" data-full="img/${c.cover}.webp" alt="" loading="${ci < 2 ? "eager" : "lazy"}" decoding="async">
      ${nPhotos > 1 ? `<button class="play" data-reels="${c.id}">${playI}${esc(t("watch"))}</button>` : ""}
      <div class="bt"><div class="num">${String(ci + 1).padStart(2, "0")} · ${list.length} ${esc(t("items"))}</div><h2>${esc(tr(c.n))}</h2>${c.note ? `<p class="note">${esc(tr(c.note))}</p>` : ""}</div>
    </div>
    ${photo.length ? `<div class="grid">${photo.map(dishHTML).join("")}</div>` : ""}
    ${rows.length ? `<div class="plist">${rows.map(rowHTML).join("")}</div>` : ""}
  </section>`;
}
function dishHTML(it) {
  return `<article class="dish" data-id="${it.id}">
    <div class="ph"><img src="${src(it, 1)}" data-full="${src(it)}" alt="${esc(tr(it.n))}" loading="lazy" decoding="async"><div class="tags">${tagsHTML(it)}</div>
      <button class="add" data-add="${it.id}" aria-label="+">${plus}</button></div>
    <div class="body"><h3>${esc(tr(it.n))}</h3>${it.d ? `<p>${esc(tr(it.d))}</p>` : ""}
      <div class="meta"><span class="w">${esc(it.w || "")}</span><div>${priceHTML(it.p)}${sub(it) ? `<div class="half">${sub(it)}</div>` : ""}</div></div>
    </div></article>`;
}
function rowHTML(it) {
  return `<div class="prow" data-id="${it.id}"><div class="pt"><b>${esc(tr(it.n))}</b>${it.d || it.w ? `<span>${esc([it.d ? tr(it.d) : "", it.w || ""].filter(Boolean).join(" · "))}</span>` : ""}</div>
    <div>${priceHTML(it.p)}${sub(it) ? `<div class="half">${sub(it)}</div>` : ""}</div><button class="add" data-add="${it.id}" aria-label="+">${plus}</button></div>`;
}

/* ---------- observers: reveal, lazy images, scrollspy, parallax ---------- */
let revealObs, spyObs, imgObs;
function bindSections() {
  revealObs && revealObs.disconnect(); spyObs && spyObs.disconnect(); imgObs && imgObs.disconnect();
  revealObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in"); revealObs.unobserve(e.target);
  }), { rootMargin: "200px 0px 0px 0px", threshold: 0.01 });
  document.querySelectorAll(".dish").forEach(el => revealObs.observe(el));

  /* Phones run out of memory if every large photo stays decoded, and the browser
     then reloads the page. Keep the sharp photo only near the screen and fall
     back to the small one for everything further away. */
  imgObs = new IntersectionObserver(es => es.forEach(e => {
    const img = e.target, want = e.isIntersecting ? img.dataset.full : img.dataset.thumb;
    if (img.getAttribute("src") !== want) img.src = want;
  }), { rootMargin: "700px 0px 700px 0px" });
  document.querySelectorAll("img[data-full]").forEach(img => {
    img.dataset.thumb = img.getAttribute("src");
    img.addEventListener("load", () => img.classList.add("ok"));
    if (img.complete && img.naturalWidth) img.classList.add("ok");
    imgObs.observe(img);
  });

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
  const card = e.target.closest(".dish,.prow");
  if (card) openDish(card.dataset.id);
});

/* =====================================================================
   NAVIGATION
   ===================================================================== */
function goCat(id) {
  const sec = document.getElementById("sec-" + id);
  if (!sec) return;
  closeDish();
  // Jump instantly: a smooth scroll would pass (and load) every photo in between.
  sec.scrollIntoView({ behavior: "instant", block: "start" });
  setChip(id);
  sec.classList.remove("flash"); void sec.offsetWidth; sec.classList.add("flash");
}
function focusItem(id) {
  const it = BY[id]; if (!it) return;
  const el = document.querySelector(`#sec-${it.cat} [data-id="${id}"]`);
  if (!el) return goCat(it.cat);
  const y = el.getBoundingClientRect().top + scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--top")) + 54 + 16);
  scrollTo({ top: y, behavior: "instant" });
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
    ${it.img ? `<div class="dd-img"><img src="${src(it)}" alt="${esc(tr(it.n))}"></div>` : `<div style="height:44px"></div>`}
    <button class="icon-btn sm dd-close" id="ddClose" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <div class="dd-body">
      <div class="cat">${esc(tr(c.n))}</div>
      <h2>${esc(tr(it.n))}</h2>
      ${it.d ? `<p class="desc">${esc(tr(it.d))}</p>` : ""}
      ${tagAll ? `<div class="dd-tags">${tagAll}</div>` : ""}
      <div class="dd-row"><div><div class="w">${esc(it.w || "")}</div>${it.half ? `<div class="w">${esc(t("half"))}: <b>${fmtNum(it.half[0])} lei</b> · ${esc(it.half[1])}</div>` : (it.glass || it.big) ? `<div class="w">${sub(it)}</div>` : ""}</div>${priceHTML(it.p)}</div>
      ${wine ? `<button class="pair" data-wine="${wine.id}"><span class="gl">🍷</span><span><small>${esc(t("pairWith"))}</small><b>${esc(tr(wine.n))}</b></span></button>` : ""}
      <div class="dd-actions">
        <button class="btn btn-gold" id="ddAdd">${plus.replace("<svg", '<svg style="stroke-width:2.4"')}${esc(t("addToList"))}</button>
      </div>
    </div>`;
  showSheet("#dish");
  $("#ddClose").onclick = closeDish;
  $("#ddAdd").onclick = e => { addItem(id, e.currentTarget); };
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
  const b2 = $("#bbCount"); b2.hidden = !n; b2.textContent = n;
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
  $("#reelsTrack").innerHTML = uniq.map((it, i) => `<div class="reel" data-i="${i}">
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
  const unload = el => {
    const im = el.querySelector("img.main"); if (im && im.getAttribute("src")) { im.dataset.src = im.getAttribute("src"); im.removeAttribute("src"); }
    const bg = el.querySelector(".bgblur"); if (bg && bg.style.backgroundImage) { bg.dataset.bg = bg.style.backgroundImage.slice(5, -2); bg.style.backgroundImage = ""; }
  };
  const ob = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const i = +e.target.dataset.i;
    track.querySelectorAll(".reel").forEach(r => { if (Math.abs(+r.dataset.i - i) > 2) unload(r); });
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
   TOP BAR + LANGUAGE
   ===================================================================== */
$("#btnSearch").onclick = () => { openOverlay("#search"); $("#searchInput").value = ""; $("#searchRes").innerHTML = ""; setTimeout(() => $("#searchInput").focus(), 50); };
$("#searchClose").onclick = () => closeOverlay("#search");
$("#btnCats").onclick = () => openOverlay("#catgrid");
$("#cgClose").onclick = () => closeOverlay("#catgrid");
$("#btnList").onclick = openList;
$("#bbCatsBtn").onclick = () => openOverlay("#catgrid");
$("#bbListBtn").onclick = openList;
$("#toTop").onclick = () => scrollTo({ top: 0, behavior: "instant" });
$("#btnLang").onclick = () => {
  const order = ["ro", "en", "hu"]; setLang(order[(order.indexOf(lang) + 1) % 3]);
  const y = scrollY; render(); scrollTo(0, y);
};
function setLang(l) { lang = l; try { localStorage.setItem("lyra-lang", l); } catch (e) {} }

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

/* On phones that allow it (Android), hide the browser's address bar by going
   full screen on the guest's first tap. iPhone Safari does not allow this. */
function goFullscreen() {
  const el = document.documentElement;
  if (!matchMedia("(pointer: coarse)").matches || document.fullscreenElement || !el.requestFullscreen) return;
  try { const r = el.requestFullscreen({ navigationUI: "hide" }); if (r && r.catch) r.catch(() => {}); } catch (e) {}
}

document.querySelectorAll(".lang-btn").forEach(b => b.onclick = () => {
  goFullscreen();
  setLang(b.dataset.lang);
  render();
  $("#app").hidden = false;
  $("#intro").classList.add("leave");
  setTimeout(() => { $("#intro").classList.add("gone"); $("#intro").hidden = true; }, 950);
  $("#bottombar").hidden = false;
});
})();
