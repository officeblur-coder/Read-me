import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Banner, CartLine, Category, Item, Promo, Settings } from "../lib/types";
import { ALLERGENS, MEAT, TAGS, imgUrl, lei, rememberOrder } from "../lib/format";
import { useCustomer } from "../lib/auth";
import { TIER_CLS, nextTierInfo, planRedeem, redeemCap, tierName, useRewards, vppOf } from "../lib/rewards";
import { flyToCart, haptic } from "../lib/fx";
import { LOCALITIES, geocodeAddress, useZones, zoneFor, type LatLng } from "../lib/zones";
import { hoursLabel, isOpenNow, slotDays, whenLabel } from "../lib/schedule";
import { cut, menuPct, useDiscounts } from "../lib/discounts";
import ModePick from "../components/ModePick";
import { track } from "../lib/track";
import { InstallSheet, OffersAsk, shouldAutoShow, useInstall } from "../components/InstallApp";
import Icon from "../components/Icon";
import BottomNav from "../components/BottomNav";
import SiteFooter from "../components/SiteFooter";
import { BURGER_CATS, CAT_ICON, EXTRA_IDS, MAIN_CATS, POPULAR, SEARCH_PH, UPSELL } from "../lib/menuConfig";

type Lang = "ro" | "hu";
type ItemSheet = { id: string; qty: number; vi: number; extras: string[]; note: string };
type CodeInfo = { code: string; percent: number; category_id: string | null; label: string };
type Form = { name: string; phone: string; email: string; address: string; city: string ; uid?: string };

const T = {
  ro: { deliv: "Livrare", pick: "Ridicare", search: SEARCH_PH.ro, add: "Adaugă", from: "de la", out: "Epuizat azi",
        cart: "Coșul tău", hot: "Tigaie fierbinte", portion: "Alege porția", extras: "Completează", note: "Mențiuni pentru bucătărie",
        notePh: "Ex: fără ceapă, sosul separat", wine: "Potrivit cu vin", mood: "Ce poftă ai?", all: "produse", menu: "Tot meniul" },
  hu: { deliv: "Kiszállítás", pick: "Elvitel", search: SEARCH_PH.hu, add: "Kosárba", from: "ártól", out: "Ma elfogyott",
        cart: "Kosarad", hot: "Forró serpenyő", portion: "Válassz adagot", extras: "Egészítsd ki", note: "Megjegyzés a konyhának",
        notePh: "Pl. hagyma nélkül, szósz külön", wine: "Ajánlott bor", mood: "Mire van kedved?", all: "termék", menu: "Teljes étlap" },
};

function loadCart(): CartLine[] {
  try { return JSON.parse(localStorage.getItem("lyra-cart") || "[]"); } catch { return []; }
}
function loadForm(): Form {
  try { return { name: "", phone: "", email: "", address: "", city: "Târgu Mureș", ...JSON.parse(localStorage.getItem("lyra-form") || "{}") }; }
  catch { return { name: "", phone: "", email: "", address: "", city: "Târgu Mureș" }; }
}
const DEFAULT_BANNERS: Banner[] = [
  { id: "d1", chip: "Nou · Smash Burgers", title: null, body: "Chiftele smash din vită, cheddar topit, chiflă artizanală. De la 25 lei.", cta: "Comandă acum", image: "double-smash.jpg", category_id: "smash", active: true, sort: 10 },
  { id: "d2", chip: "BBQ Pit Box Smoker", title: "Afumat lent, ore întregi", body: null, cta: "Specialitățile casei", image: "pitbox.jpg", category_id: "specialitati", active: true, sort: 20 },
];
const isDesktop = () => window.matchMedia("(min-width: 1100px)").matches;

export default function Menu({ source }: { source?: string }) {
  const nav = useNavigate();
  const { customer, ready: authReady, refresh: refreshCustomer } = useCustomer();
  const [useWelcome, setUseWelcome] = useState(true);
  const rw = useRewards(customer?.id);
  const { zones } = useZones();
  const [geo, setGeo] = useState<LatLng | null>(() => { try { return JSON.parse(localStorage.getItem("lyra-geo2") || "null")?.p ?? null; } catch { return null; } });
  const [geoFor, setGeoFor] = useState<string>(() => { try { return JSON.parse(localStorage.getItem("lyra-geo2") || "null")?.a ?? ""; } catch { return ""; } });
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoLabel, setGeoLabel] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadErr, setLoadErr] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [lang, setLang] = useState<Lang>("ro");
  // livrare / ridicare: aleasă în prima fereastră (o dată pe vizită), ținută minte pe telefon
  const [mode, setModeRaw] = useState<"livrare" | "ridicare">(() => { try { return localStorage.getItem("lyra-mode") === "ridicare" ? "ridicare" : "livrare"; } catch { return "livrare"; } });
  const setMode = (m: "livrare" | "ridicare") => { setModeRaw(m); try { localStorage.setItem("lyra-mode", m); } catch { /* ignore */ } };
  const [modePick, setModePick] = useState(() => { try { return !sessionStorage.getItem("lyra-mode-ok"); } catch { return true; } });
  const pickMode = (m: "livrare" | "ridicare") => { setMode(m); setModePick(false); try { sessionStorage.setItem("lyra-mode-ok", "1"); } catch { /* ignore */ } };
  // când: „cât mai curând” (doar în program) sau o oră aleasă (precomandă)
  const [when, setWhen] = useState<"asap" | "later">("asap");
  const [schedDay, setSchedDay] = useState("");
  const [schedAt, setSchedAt] = useState("");
  const [clock, setClock] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 30000); return () => clearInterval(t); }, []);
  const [q, setQ] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [activeCat, setActiveCat] = useState("");
  const [cart, setCart] = useState<CartLine[]>(loadCart);
  const [sheet, setSheet] = useState<ItemSheet | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "details">("cart");
  const [popup, setPopup] = useState<Promo | null>(null);
  const [joinPop, setJoinPop] = useState(false);
  // „Pune Lyra pe ecran”: pe telefon, la o secundă după deschidere (o dată la câteva zile)
  const inst = useInstall();
  const [installOpen, setInstallOpen] = useState(false);
  const installShown = useRef(false);
  useEffect(() => {
    if (!shouldAutoShow()) return;
    const t = setTimeout(() => { installShown.current = true; setInstallOpen(true); }, 1000);
    return () => clearTimeout(t);
  }, []);              // invite new visitors to Lyra Rewards
  const [form, setForm] = useState<Form>(loadForm);
  const [orderNote, setOrderNote] = useState("");
  const [pay, setPay] = useState<"card" | "cash" | "online">("card");
  const [redeemWant, setRedeemWant] = useState(0);              // Lyra Rewards points the customer chose to use
  const [voucherItem, setVoucherItem] = useState("");          // dessert picked for the free-dessert voucher
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState<CodeInfo | null>(null);
  const [codeMsg, setCodeMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const [slide, setSlide] = useState(0);
  const pillsRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const t = T[lang];
  const L = lang === "hu" ? 1 : 0;
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");
  function toggleTheme() {
    const next = !dark; setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try { localStorage.setItem("lyra-theme", next ? "dark" : "light"); } catch { /* ignore */ }
  }

  // pinned category bar sits right under the header, whatever its height
  useEffect(() => {
    const el = topRef.current; if (!el) return;
    const set = () => document.documentElement.style.setProperty("--tbh", el.offsetHeight + "px");
    set(); const ro = new ResizeObserver(set); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- data ----
  async function load() {
    const [c, i, s, p, b] = await Promise.all([
      supabase.from("categories").select("*").eq("active", true).order("sort"),
      supabase.from("items").select("*").eq("active", true).order("sort"),
      supabase.from("settings").select("*").eq("id", 1).single(),
      supabase.from("promos").select("*").eq("active", true).order("created_at", { ascending: false }),
      supabase.from("banners").select("*").eq("active", true).order("sort"),
    ]);
    setBanners(b.error ? DEFAULT_BANNERS : (b.data || []) as Banner[]);
    if (c.error || i.error) { setLoadErr("Meniul nu s-a putut încărca. Verifică conexiunea și reîncarcă pagina."); return null; }
    setCats(c.data as Category[]);
    setItems(i.data as Item[]);
    if (s.data) setSettings(s.data as Settings);
    setLoaded(true);
    const now = Date.now();
    return ((p.data || []) as Promo[]).filter(x => (!x.starts_at || new Date(x.starts_at).getTime() <= now) && (!x.ends_at || new Date(x.ends_at).getTime() >= now));
  }
  useEffect(() => {
    load().then(ps => {
      let seen = false;
      try { seen = sessionStorage.getItem("lyra-popup") === "1"; } catch { /* ignore */ }
      const first = ps?.find(x => x.popup);
      if (first && !seen) setTimeout(() => setPopup(first), 1400);
    });
    const ch = supabase.channel("menu-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => { load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => { load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "banners" }, () => { load(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "promos" }, payload => {
        const p = payload.new as Promo;
        if (p.active && p.pushed_at && Date.now() - new Date(p.pushed_at).getTime() < 60000) setPopup(p);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  useEffect(() => { try { localStorage.setItem("lyra-cart", JSON.stringify(cart)); } catch { /* ignore */ } }, [cart]);
  useEffect(() => { try { localStorage.setItem("lyra-form", JSON.stringify(form)); } catch { /* ignore */ } }, [form]);
  useEffect(() => {
    document.body.style.overflow = sheet || popup || (cartOpen && !isDesktop()) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheet, popup, cartOpen]);
  // datele din formular rămân în telefon (localStorage) și sunt legate de contul care le-a completat:
  // alt cont pe același telefon pornește de la datele lui, iar la ieșirea din cont datele se șterg
  useEffect(() => {
    if (!authReady) return;
    if (!customer) {
      setForm(f => (f.uid ? { name: "", phone: "", email: "", address: "", city: f.city || "Târgu Mureș" } : f));
      return;
    }
    setForm(f => {
      const mine = !f.uid || f.uid === customer.id;     // completat de acest cont sau ca vizitator, înainte de cont
      const base = mine ? f : { ...f, name: "", phone: "", address: "", email: "" };
      return { ...base, uid: customer.id,
        name: base.name || customer.name || "", phone: base.phone || customer.phone || "",
        email: customer.email || base.email, address: base.address || customer.addresses?.[0] || "" };
    });
  }, [authReady, customer?.id]);
  // ?cart=1 opens the cart (used by "comandă din nou" and the bottom bar)
  const rloc = useLocation();
  useEffect(() => {
    if (new URLSearchParams(rloc.search).get("cart") === "1") { setCartOpen(true); nav(rloc.pathname, { replace: true }); }
  }, [rloc.search]);

  // hero carousel: auto-advance, pause on touch
  const shownBanners = banners.slice(0, 4);
  useEffect(() => {
    if (shownBanners.length < 2) return;
    const id = setInterval(() => {
      const el = heroRef.current; if (!el || el.matches(":hover")) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % shownBanners.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 5500);
    return () => clearInterval(id);
  }, [shownBanners.length]);

  const byId = useMemo(() => Object.fromEntries(items.map(x => [x.id, x])), [items]);
  const dsc = useDiscounts(false, mode);
  useEffect(() => { track("visit"); }, []);
  const nm = (it: Item) => (L && it.name_hu) || it.name_ro;
  const ds = (it: Item) => (L && it.desc_hu) || it.desc_ro || "";
  const catName = (c: Category) => (L && c.name_hu) || c.name_ro;

  // ---- pricing (mirrors place_order in the database; the database has the final word) ----
  const fullOf = (it: Item, vi?: number) => (it.variants?.length ? it.variants[vi ?? 0].p : it.price);
  const pctOf = (id: string) => dsc.pct[id] || 0;
  // reducerea din admin se aplică doar prețului produsului (nu și extra), exact ca în baza de date
  const baseOf = (it: Item, vi?: number) => cut(fullOf(it, vi), pctOf(it.id));
  const unitOf = (l: CartLine) => {
    const it = byId[l.id]; if (!it) return 0;
    if (l.promoPrice != null) return l.promoPrice;
    return baseOf(it, l.vi) + l.extras.reduce((s, k) => s + (byId[k]?.price || 0), 0);
  };
  const lineOff = (l: CartLine) => l.promoPrice == null && pctOf(l.id) > 0;
  const validCart = cart.filter(l => byId[l.id]);
  const sub = validCart.reduce((s, l) => s + unitOf(l) * l.qty, 0);
  const disc = code
    ? Math.round((code.category_id
        ? validCart.filter(l => byId[l.id].category_id === code.category_id && l.promoPrice == null && !lineOff(l)).reduce((s, l) => s + unitOf(l) * l.qty, 0)
        : validCart.filter(l => !lineOff(l)).reduce((s, l) => s + unitOf(l) * l.qty, 0)) * code.percent) / 100
    : 0;
  const openNow = !!settings && isOpenNow(settings, clock);
  const canAsap = openNow && !!settings?.accepting_orders;
  const days = useMemo(() => (settings ? slotDays(settings, clock) : []), [settings, clock]);
  const canOrder = canAsap || days.length > 0;
  const whenEff = canAsap ? when : "later";
  const day = days.find(d => d.key === schedDay) || days[0];
  const slot = day?.slots.find(x => x.iso === schedAt);
  const schedOk = whenEff === "asap" || !!slot;
  // delivery: the zone drawn in admin where the pin falls; without zones, the general fee from settings
  const hasZones = zones.length > 0;
  const zone = hasZones ? zoneFor(geo, zones) : null;
  const feeKnown = !hasZones || !!zone;
  const freeOver = hasZones ? (zone?.free_over ?? Infinity) : (settings?.free_delivery_over ?? 100);
  const baseFee = hasZones ? (zone?.fee ?? 0) : (settings?.delivery_fee ?? 0);
  const fee = mode === "livrare" && settings && sub > 0 && sub < freeOver ? baseFee : 0;
  // ---- Lyra Rewards (same rules as place_order: max % of products, oldest points first) ----
  const tierN = rw.me?.tier ?? customer?.tier ?? 1;
  const tierLabel = tierName(rw.cfg, tierN);
  const rwOn = rw.cfg.enabled;
  const lots = rw.me?.lots || [];
  const cap = redeemCap(rw.cfg, sub - disc);
  const maxPlan = rwOn && customer ? planRedeem(lots, Number.MAX_SAFE_INTEGER, cap) : { points: 0, value: 0 };
  const plan = rwOn && customer ? planRedeem(lots, Math.min(redeemWant, maxPlan.points), cap) : { points: 0, value: 0 };
  const ptsVal = plan.value;
  const voucher = rwOn ? rw.me?.vouchers.find(v => v.status === "active" && new Date(v.expires_at).getTime() > Date.now()) : undefined;
  const desserts = rw.cfg.dessert_ids.map(id => byId[id]).filter(it => it && it.available);
  const voucherPick = voucher && desserts.some(d => d.id === voucherItem) ? voucherItem : "";
  // delivery packaging, per piece (dish + each extra); no discounts or points on it
  const pk = (it?: Item) => (it ? Number(it.packaging ?? 2) : 0);
  const pack = validCart.reduce((s, l) => s + (pk(byId[l.id]) + l.extras.reduce((t, k) => t + pk(byId[k]), 0)) * l.qty, 0);
  // garanția SGR (sticle, doze, PET), pe bucată; fără reduceri
  const sg = (it?: Item) => (it ? Number(it.sgr ?? 0) : 0);
  const sgr = validCart.reduce((s, l) => s + (sg(byId[l.id]) + l.extras.reduce((t, k) => t + sg(byId[k]), 0)) * l.qty, 0);
  // bonus de bun venit: tot odată, la produse de minim welcome_min lei, fără cod de reducere (ca în place_order)
  const wMin = Number(settings?.welcome_min ?? 150);
  const wCredit = Number(customer?.welcome_credit || 0);
  const wHas = !!customer && wCredit > 0 && !customer.welcome_used_at;
  const wOk = wHas && sub >= wMin && disc === 0;
  const welc = wOk && useWelcome ? Math.min(wCredit, Math.max(0, sub - disc - ptsVal)) : 0;
  const total = Math.max(0, sub - disc - ptsVal - welc + fee) + pack + sgr;
  const earn = rwOn ? Math.floor(Math.max(0, sub - disc - ptsVal - welc)) : 0;
  const count = validCart.reduce((s, l) => s + l.qty, 0);
  const qtyOf = (id: string) => validCart.filter(l => l.id === id && !l.promo).reduce((s, l) => s + l.qty, 0);

  function addLine(line: Omit<CartLine, "key">, from?: Element | null) {
    track("add_cart", line.id);
    const key = [line.id, line.vi ?? "", [...line.extras].sort().join(","), line.note, line.promo ?? ""].join("|");
    setCart(c => {
      const ex = c.find(l => l.key === key);
      return ex ? c.map(l => (l.key === key ? { ...l, qty: l.qty + line.qty } : l)) : [...c, { ...line, key }];
    });
    haptic(); flyToCart(from || null);
  }
  const openItem = (it: Item) => { setSheet({ id: it.id, qty: 1, vi: 0, extras: [], note: "" }); track("view_item", it.id); };
  // ?p=<produs> (din newsletter) deschide direct produsul
  const wantItem = useRef(new URLSearchParams(rloc.search).get("p"));
  useEffect(() => {
    const id = wantItem.current; if (!id || !byId[id]) return;
    wantItem.current = null; openItem(byId[id]);
  }, [byId]);
  function quickAdd(it: Item, e?: React.MouseEvent) {
    if (it.variants?.length) { openItem(it); return; }
    const card = (e?.currentTarget as HTMLElement | undefined)?.closest("[data-card]");
    addLine({ id: it.id, qty: 1, extras: [], note: "" }, card?.querySelector("img"));
  }
  function dec(id: string) {
    setCart(c => {
      const idx = c.map(l => l.id === id && !l.promo).lastIndexOf(true);
      if (idx < 0) return c;
      const l = c[idx];
      return l.qty > 1 ? c.map((x, i) => (i === idx ? { ...x, qty: x.qty - 1 } : x)) : c.filter((_, i) => i !== idx);
    });
    haptic(6);
  }
  const extrasFor = (it: Item) =>
    (BURGER_CATS.includes(it.category_id) && !EXTRA_IDS.burger.includes(it.id) ? EXTRA_IDS.burger
      : MAIN_CATS.includes(it.category_id) ? EXTRA_IDS.main
      : it.category_id === "desert" ? EXTRA_IDS.desert : []).map(id => byId[id]).filter(Boolean);

  async function applyCode() {
    const v = codeInput.trim().toUpperCase();
    if (!v) { setCode(null); setCodeMsg(""); return; }
    const { data } = await supabase.rpc("check_code", { p_code: v });
    if (data) { setCode(data as CodeInfo); setCodeMsg("Cod aplicat: " + (data as CodeInfo).label); }
    else { setCode(null); setCodeMsg(`Codul „${v}” nu există sau a expirat.`); }
  }

  // Lyra Rewards invitation: once every 14 days, only to visitors without an account, after they had a look
  useEffect(() => {
    if (!authReady || customer || !(rw.cfg.enabled || settings?.welcome_on)) return;
    let last = 0; try { last = Number(localStorage.getItem("lyra-join-pop") || 0); } catch { /* ignore */ }
    if (Date.now() - last < 14 * 864e5) return;
    const t = setTimeout(() => setJoinPop(true), 6000);
    return () => clearTimeout(t);
  }, [authReady, customer?.id, rw.cfg.enabled, settings?.welcome_on]);
  function closeJoin() { setJoinPop(false); try { localStorage.setItem("lyra-join-pop", String(Date.now())); } catch { /* ignore */ } }

  // address → coordinates in the background (OpenStreetMap); the customer only types the address, no map
  const addrKey = `${form.address.trim()}|${(form.city || "Târgu Mureș").trim()}`;
  function setPin(p: LatLng, key: string) {
    setGeo(p); setGeoFor(key);
    try { localStorage.setItem("lyra-geo2", JSON.stringify({ p, a: key })); } catch { /* ignore */ }
  }
  async function locate(key = addrKey) {
    const [street, city] = key.split("|");
    setGeoBusy(true);
    const r = await geocodeAddress(street, city);
    setGeoBusy(false);
    if (r) { setPin({ lat: r.lat, lng: r.lng }, key); setGeoLabel(r.label.split(",").slice(0, 3).map(x => x.trim()).join(", ")); }
    else { setGeo(null); setGeoFor(key); setGeoLabel(""); }
    return r;
  }
  useEffect(() => {
    if (mode !== "livrare" || !hasZones || step !== "details") return;
    if (form.address.trim().length < 4 || addrKey === geoFor) return;
    const t = setTimeout(() => { locate(addrKey); }, 900);
    return () => clearTimeout(t);
  }, [addrKey, mode, hasZones, step]);

  async function placeOrder() {
    setSendErr("");
    if (!form.name.trim() || !form.phone.trim() || (mode === "livrare" && !form.address.trim())) {
      setSendErr(mode === "livrare" ? "Completează numele, telefonul și adresa." : "Completează numele și telefonul."); return;
    }
    if (mode === "livrare" && hasZones) {
      let p = addrKey === geoFor ? geo : null;
      if (!p) { const r = await locate(); p = r ? { lat: r.lat, lng: r.lng } : null; }
      if (!p) { setSendErr("Nu găsim adresa pe hartă. Verifică numele străzii și localitatea."); return; }
      if (!zoneFor(p, zones)) { setSendErr("Ne pare rău, adresa nu este în zona noastră de livrare. Poți alege ridicarea din restaurant."); return; }
      const zn = zoneFor(p, zones)!;
      if (sub < zn.min_order) { setSendErr(`Comanda minimă pentru zona ${zn.name} este ${lei(zn.min_order)}.`); return; }
    }
    if (whenEff === "later" && !slot) { setSendErr("Alege ziua și ora la care vrei comanda."); return; }
    setSending(true);
    const { data, error } = await supabase.rpc("place_order", {
      p: {
        name: form.name, phone: form.phone, email: form.email, mode, payment: pay,
        address: form.city && !form.address.toLowerCase().includes(form.city.toLowerCase().slice(0, 5)) ? `${form.address.trim()}, ${form.city.trim()}` : form.address,
        lat: mode === "livrare" && geo ? geo.lat : null, lng: mode === "livrare" && geo ? geo.lng : null,
        scheduled_for: whenEff === "later" && slot ? slot.iso : null,
        use_welcome: welc > 0,
        note: orderNote, code: code?.code || "", redeem_points: plan.points,
        voucher_id: voucherPick ? voucher!.id : null, voucher_item: voucherPick || null,
        source: source || new URLSearchParams(rloc.search).get("s") || "site",
        items: validCart.map(l => ({ id: l.id, qty: l.qty, vi: l.vi, extras: l.extras, note: l.note, promo: l.promo })),
      },
    });
    setSending(false);
    if (error) { setSendErr(error.message || "Comanda nu a putut fi trimisă. Încearcă din nou."); return; }
    const res = data as { token: string; number: number };
    rememberOrder(res.token, res.number);
    track("order", res.number);
    if (customer && form.address && !customer.addresses?.includes(form.address)) {
      supabase.from("customers").update({ addresses: [form.address, ...(customer.addresses || [])].slice(0, 5), phone: customer.phone || form.phone, name: customer.name || form.name }).eq("id", customer.id).then(() => {});
    }
    setCart([]); setCartOpen(false); setStep("cart"); setOrderNote(""); setCode(null); setCodeInput(""); setCodeMsg(""); setRedeemWant(0); setVoucherItem(""); rw.reload(); if (welc > 0) refreshCustomer();
    if (pay === "online") {   // pagina de plată Stripe; dacă nu pornește, clientul poate plăti din pagina comenzii
      setSending(true);
      const { startPayment } = await import("../lib/pay");
      const err = await startPayment(res.token);
      setSending(false);
      if (!err) return;
    }
    nav("/comanda/" + res.token, { state: { fresh: pay !== "online" } });
  }

  // ---- category highlight while scrolling ----
  useEffect(() => {
    const onScroll = () => {
      const secs = Array.from(document.querySelectorAll<HTMLElement>("[data-sec]"));
      let cur = secs[0]?.dataset.sec || "";
      for (const s of secs) if (s.getBoundingClientRect().top < 180) cur = s.dataset.sec || cur;
      setActiveCat(prev => (prev === cur ? prev : cur));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const el = pillsRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    if (el && pillsRef.current) pillsRef.current.scrollTo({ left: el.offsetLeft - 24, behavior: "smooth" });
  }, [activeCat]);
  const jump = (id: string) => {
    const el = document.getElementById("sec-" + id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (topRef.current?.offsetHeight || 64) - 64, behavior: "smooth" });
  };

  const query = q.trim().toLowerCase();
  useEffect(() => { if (query.length < 3) return; const t = setTimeout(() => track("search", query), 1500); return () => clearTimeout(t); }, [query]);
  const match = (it: Item) => !query || `${it.name_ro} ${it.name_hu} ${it.desc_ro}`.toLowerCase().includes(query);
  const visibleCats = cats.filter(c => items.some(i => i.category_id === c.id));
  // "Cele mai comandate": dishes tagged "top" in admin, otherwise the default picks
  const tagged = items.filter(it => it.tags.includes("top") && it.image);
  const popular = (tagged.length ? tagged : POPULAR.map(id => byId[id]).filter(it => it && it.image)).slice(0, 8);
  const catOf = (id: string | null) => cats.find(c => c.id === id);

  if (loadErr) return <div className="m-page"><p className="closed">{loadErr}</p></div>;

  // ---------- price + add button, shared by cards and rails ----------
  const buyRow = (it: Item) => {
    const qn = qtyOf(it.id), out = !it.available;
    const full = it.variants?.length ? Math.min(...it.variants.map(v => v.p)) : it.price;
    const pc = pctOf(it.id), price = cut(full, pc);
    return (
      <div className="pc-foot">
        <span className={`price num${pc ? " off" : ""}`}>{it.variants?.length ? <small>{t.from} </small> : null}{lei(price)}{pc > 0 && <s>{lei(full)}</s>}</span>
        {out ? <button className="addbtn" disabled>{t.out}</button>
          : qn && !it.variants?.length
            ? <span className="qty lg"><button onClick={() => dec(it.id)} aria-label="Mai puțin">−</button><b className="num">{qn}</b><button onClick={e => quickAdd(it, e)} aria-label="Mai mult">+</button></span>
            : <button className="addbtn round" onClick={e => quickAdd(it, e)} aria-label={`${t.add} ${nm(it)}`}><span>+</span></button>}
      </div>
    );
  };

  // ---------- cart panel (desktop sidebar + mobile sheet) ----------
  const cartPanel = (
    <div className="cp">
      <div className="cp-head">
        {step === "details"
          ? <button className="cp-back" onClick={() => setStep("cart")}>← Înapoi la coș</button>
          : <h2 data-cart-target>{t.cart} {count > 0 && <span className="cp-count">{count}</span>}</h2>}
        <button className="cp-x" onClick={() => setCartOpen(false)} aria-label="Închide coșul">×</button>
      </div>
      <div className="cp-steps"><span className={step === "cart" ? "on" : "done"}>1 · Produse</span><i /><span className={step === "details" ? "on" : ""}>2 · Livrare și plată</span></div>

      {validCart.length === 0 ? (
        <div className="cp-empty">
          <div className="cp-empty-ic"><Icon name="bag" size={38} /></div>
          <b>Coșul este gol</b>
          <p>Alege preparatele preferate din meniul Lyra's. {hasZones ? "Livrăm în Târgu Mureș și împrejurimi." : `Livrarea e gratuită peste ${lei(freeOver)}.`}</p>
          <button className="cp-empty-go" onClick={() => { setCartOpen(false); if (visibleCats[0]) jump(visibleCats[0].id); }}><Icon name="cutlery" size={18} />Vezi meniul</button>
        </div>
      ) : step === "cart" ? (<>
        <div className="cp-lines">
          {validCart.map(l => {
            const it = byId[l.id], img = imgUrl(it.image);
            const info = [l.vi != null && it.variants ? it.variants[l.vi]?.l : "", ...l.extras.map(k => "+ " + (byId[k] ? nm(byId[k]) : k)), l.promoTitle ? "Ofertă" : "", l.note ? `„${l.note}”` : ""].filter(Boolean).join(" · ");
            return (
              <div key={l.key} className="cl">
                {img ? <img src={img} alt="" /> : <span className="cl-ph"><Icon name="dish" size={22} /></span>}
                <div className="cl-txt"><b>{nm(it)}</b>{info && <small>{info}</small>}<span className={`num${lineOff(l) ? " off" : ""}`}>{lei(unitOf(l) * l.qty)}{lineOff(l) && <s>{lei((fullOf(it, l.vi) + l.extras.reduce((a, k) => a + (byId[k]?.price || 0), 0)) * l.qty)}</s>}{lineOff(l) && <em className="cl-off">−{pctOf(l.id)}%</em>}</span></div>
                <span className="qty">
                  <button onClick={() => setCart(c => c.flatMap(x => x.key !== l.key ? [x] : x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []))} aria-label="Mai puțin">{l.qty === 1 ? "×" : "−"}</button>
                  <b className="num">{l.qty}</b>
                  <button onClick={() => setCart(c => c.map(x => x.key === l.key ? { ...x, qty: x.qty + 1 } : x))} aria-label="Mai mult">+</button>
                </span>
              </div>
            );
          })}
        </div>
        {mode === "livrare" && feeKnown && freeOver !== Infinity && (sub < freeOver
          ? <div className="freebar"><span>Încă <b className="num">{lei(freeOver - sub)}</b> și livrarea e gratuită</span><div className="prog"><i style={{ width: `${Math.min(100, (sub / freeOver) * 100)}%` }} /></div></div>
          : <div className="freebar ok"><Icon name="check" size={16} /> Livrarea e gratuită</div>)}
        {(() => {
          const ups = UPSELL.filter(id => byId[id] && byId[id].available && !validCart.some(l => l.id === id)).slice(0, 6);
          return ups.length > 0 && <div className="ups-wrap"><p className="cp-lbl">Merge perfect alături</p><div className="ups">{ups.map(id => {
            const it = byId[id], img = imgUrl(it.image);
            return <button key={id} className="up" onClick={() => addLine({ id: it.id, qty: 1, extras: [], note: "" })}>{img ? <img src={img} alt="" /> : <span className="up-ph">{nm(it).slice(0, 1)}</span>}<span className="up-n">{nm(it)}</span><em className="num">+{lei(baseOf(it))}</em></button>;
          })}</div></div>;
        })()}
        <div className="cp-sum">
          <div><span>Produse</span><span className="num">{lei(sub)}</span></div>
          {pack > 0 && <div><span>Ambalaj</span><span className="num">{lei(pack)}</span></div>}
          {sgr > 0 && <div><span>Garanție SGR</span><span className="num">{lei(sgr)}</span></div>}
          {mode === "livrare" && <div><span>Livrare{zone ? ` · ${zone.name}` : ""}</span><span className="num">{!feeKnown ? "după adresă" : fee ? lei(fee) : "gratuit"}</span></div>}
          <div className="tot"><span>Total</span><span className="num">{lei(sub + pack + sgr + fee)}</span></div>
        </div>
        <button className="cta" onClick={() => { setStep("details"); track("checkout"); }}>Continuă <span>→</span></button>
      </>) : (<>
        {rwOn && (customer
          ? <div className="club-strip"><span className={`club-dot ${TIER_CLS[tierN - 1]}`} /><div><b>Lyra {tierLabel} · {rw.me?.points ?? customer.points} puncte</b><small>Valorează {lei(rw.me?.value ?? 0)} · câștigi +{earn} puncte la comanda asta</small></div></div>
          : <Link to="/cont" className="club-strip guest"><Icon name="star" size={18} fill /><div><b>Ai cont Lyra Rewards?</b><small>Intră ca să folosești punctele și să-ți salvăm adresa.</small></div><span>→</span></Link>)}
        <div className="mode-fixed"><Icon name={mode === "livrare" ? "bike" : "bag"} size={18} />
          <b>{mode === "livrare" ? "Livrare la domiciliu" : "Ridicare din restaurant"}</b>
          {menuPct(dsc.list, mode) > 0 && <span className="b b-off">−{menuPct(dsc.list, mode)}% la tot meniul</span>}</div>
        <p className="cp-lbl">Când o vrei?</p>
        <div className="seg big2">
          <button aria-pressed={whenEff === "asap"} disabled={!canAsap} onClick={() => setWhen("asap")}><Icon name="bolt" size={18} />{canAsap ? "Cât mai curând" : "Închis acum"}</button>
          <button aria-pressed={whenEff === "later"} disabled={!days.length} onClick={() => { setWhen("later"); if (!schedDay && days[0]) setSchedDay(days[0].key); }}><Icon name="clock" size={18} />Programează</button>
        </div>
        {!canAsap && settings && <p className="sched-note">{openNow ? "Restaurantul nu preia comenzi pentru acum." : `Acum suntem închiși · program ${hoursLabel(settings)}.`}{days.length ? " Poți programa comanda pentru mai târziu." : ""}</p>}
        {whenEff === "later" && day && <div className="sched">
          <div className="sched-days">{days.map(d => <button key={d.key} aria-pressed={d.key === day.key} onClick={() => { setSchedDay(d.key); setSchedAt(""); }}>{d.label}</button>)}</div>
          <div className="sched-slots">{day.slots.map(x => <button key={x.iso} aria-pressed={x.iso === schedAt} onClick={() => setSchedAt(x.iso)}>{x.label}</button>)}</div>
          <p className="sched-note">{slot ? <>Comanda ta {mode === "livrare" ? "ajunge" : "e gata de ridicat"} <b>{whenLabel(slot.iso)}</b>.</> : `Alege ora ${mode === "livrare" ? "livrării" : "ridicării"}.`}</p>
        </div>}
        <p className="cp-lbl">Datele tale</p>
        <div className="fields">
          <label className="fl"><span>Nume</span><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoComplete="name" placeholder="Ioana Pop" /></label>
          <label className="fl"><span>Telefon</span><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} inputMode="tel" autoComplete="tel" placeholder="07xx xxx xxx" /></label>
          {mode === "livrare" && <label className="fl wide"><span>Adresa de livrare</span>
            {customer && customer.addresses?.length > 1
              ? <select value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}>{customer.addresses.map(a => <option key={a}>{a}</option>)}<option value="">Altă adresă…</option></select>
              : null}
            {(!customer || (customer.addresses?.length || 0) < 2 || !form.address) && <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} autoComplete="street-address" placeholder="Strada, număr, bloc, apartament" />}
          </label>}
          {mode === "livrare" && <label className="fl wide"><span>Localitatea</span>
            <input list="lyra-localities" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} autoComplete="address-level2" placeholder="Târgu Mureș" />
            <datalist id="lyra-localities">{LOCALITIES.map(l => <option key={l} value={l} />)}</datalist>
          </label>}
          {mode === "livrare" && hasZones && form.address.trim().length >= 4 && <div className={`geo-zone wide ${geoBusy || addrKey !== geoFor ? "" : zone ? "ok" : "out"}`}>
            {geoBusy || addrKey !== geoFor ? "Verificăm adresa…"
              : !geo ? <>Nu găsim adresa pe hartă. Scrie strada și numărul (ex.: Strada Gheorghe Doja 10) și alege localitatea corectă.</>
              : zone ? <><b>Livrăm la tine</b> · {zone.free_over != null && sub >= zone.free_over ? "livrare gratuită" : zone.fee ? `livrare ${lei(zone.fee)}` : "livrare gratuită"}{zone.free_over != null && sub < zone.free_over ? ` · gratuit peste ${lei(zone.free_over)}` : ""}{zone.min_order ? ` · minim ${lei(zone.min_order)}` : ""}{geoLabel && <small className="geo-found">Adresa găsită: {geoLabel}</small>}</>
              : <>{geoLabel && <small className="geo-found">Adresa găsită: {geoLabel}</small>}Ne pare rău, adresa nu este în zona noastră de livrare. Poți alege <button type="button" className="linkbtn" onClick={() => setMode("ridicare")}>ridicarea din restaurant</button>.</>}
          </div>}
          {!customer && <label className="fl wide"><span>Email <i>opțional · strângi puncte Lyra Rewards pe email</i></span><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} inputMode="email" autoComplete="email" placeholder="nume@email.com" /></label>}
          <label className="fl wide"><span>Mențiuni <i>opțional</i></span><textarea rows={2} value={orderNote} onChange={e => setOrderNote(e.target.value)} placeholder="Interfon, etaj, fără tacâmuri…" /></label>
        </div>
        {wHas && <div className={`wl-box ${wOk ? "" : "dis"}`}>
          <div className="wl-gift">🎁</div>
          <div className="wl-txt"><b>Bonus de bun venit · {lei(wCredit)}</b>
            <small>{disc > 0 ? `Nu se cumulează cu codul ${code?.code}. Scoate codul ca să folosești bonusul.`
              : sub < wMin ? `Se folosește tot odată, la o comandă de minim ${lei(wMin)}. Mai adaugă ${lei(wMin - sub)} în coș.`
              : useWelcome ? `Se scad ${lei(welc)} din comanda asta.` : "Îl poți folosi la comanda asta."}</small>
            {sub < wMin && disc === 0 && <div className="prog"><i style={{ width: `${Math.min(100, (sub / wMin) * 100)}%` }} /></div>}</div>
          {wOk && <button className="switch" role="switch" aria-checked={useWelcome} aria-label="Folosește bonusul de bun venit" onClick={() => setUseWelcome(!useWelcome)} />}
        </div>}
        {rwOn && customer && <div className={`rw-box ${maxPlan.points ? "" : "dis"}`}>
          <div className="rw-head"><div><b>Folosește puncte</b>
            <small>{maxPlan.points ? `Poți folosi până la ${maxPlan.points} puncte (${lei(maxPlan.value)}, maxim ${rw.cfg.max_redeem_pct}% din produse)` : (rw.me?.points ? `Poți folosi punctele când produsele depășesc ${lei(Math.ceil(100 / rw.cfg.max_redeem_pct))}.` : "Punctele câștigate azi le folosești de la comanda următoare.")}</small></div>
            {maxPlan.points > 0 && <button className="mini" onClick={() => setRedeemWant(plan.points === maxPlan.points ? 0 : maxPlan.points)}>{plan.points === maxPlan.points ? "Anulează" : "Folosește tot"}</button>}</div>
          {maxPlan.points > 0 && <>
            <input type="range" className="rw-range" min={0} max={maxPlan.points} step={1} value={plan.points} onChange={e => setRedeemWant(Number(e.target.value))} aria-label="Câte puncte folosești" />
            <div className="rw-val"><span className="num">{plan.points} puncte</span><b className="num">−{lei(plan.value)}</b></div>
          </>}
        </div>}
        {voucher && desserts.length > 0 && <div className="rw-voucher">
          <div className="rw-head"><div><b>🍰 Desert cadou Lyra {tierName(rw.cfg, voucher.tier)}</b>
            <small>Alege unul, e din partea casei. Valabil până pe {new Date(voucher.expires_at).toLocaleDateString("ro-RO", { day: "numeric", month: "long" })}.</small></div></div>
          <div className="rw-desserts">
            {desserts.map(d => <button key={d.id} aria-pressed={voucherPick === d.id} onClick={() => setVoucherItem(voucherPick === d.id ? "" : d.id)}>
              {d.image && <img src={imgUrl(d.image)!} alt="" />}<span>{nm(d)}</span><em>{voucherPick === d.id ? "Ales ✓" : "gratuit"}</em></button>)}
          </div>
        </div>}
        <p className="cp-lbl">Plata</p>
        <div className="paygrid">
          <button aria-pressed={pay === "card"} onClick={() => setPay("card")}><b>Card</b><small>{mode === "livrare" ? "la livrare, POS la livrator" : "la ridicare"}</small></button>
          <button aria-pressed={pay === "cash"} onClick={() => setPay("cash")}><b>Numerar</b><small>{mode === "livrare" ? "la livrare" : "la ridicare"}</small></button>
          {settings?.online_pay_on && <button aria-pressed={pay === "online"} onClick={() => setPay("online")}><b>Card online</b><small>plătești acum</small></button>}
        </div>
        {pay === "online" && <p className="muted" style={{ fontSize: 12, margin: "6px 2px 0" }}>După „Trimite comanda” te ducem pe pagina securizată de plată. Comanda ajunge la restaurant după plată.</p>}
        <div className="codebar">
          <input value={codeInput} onChange={e => setCodeInput(e.target.value)} placeholder="Cod promoțional" aria-label="Cod promoțional" />
          <button onClick={applyCode}>Aplică</button>
        </div>
        {codeMsg && <p className={`codemsg ${code ? "ok" : ""}`}>{codeMsg}</p>}
        <div className="cp-sum">
          <div><span>Produse ({count})</span><span className="num">{lei(sub)}</span></div>
          {disc > 0 && <div className="neg"><span>{code?.label}</span><span className="num">−{lei(disc)}</span></div>}
          {ptsVal > 0 && <div className="neg"><span>Puncte Lyra Rewards ({plan.points})</span><span className="num">−{lei(ptsVal)}</span></div>}
          {welc > 0 && <div className="neg"><span>Bonus de bun venit</span><span className="num">−{lei(welc)}</span></div>}
          {voucherPick && <div className="neg"><span>Desert cadou: {nm(byId[voucherPick])}</span><span className="num">gratuit</span></div>}
          {pack > 0 && <div><span>Ambalaj</span><span className="num">{lei(pack)}</span></div>}
          {sgr > 0 && <div><span>Garanție SGR</span><span className="num">{lei(sgr)}</span></div>}
          {mode === "livrare" && <div><span>Livrare{zone ? ` · ${zone.name}` : ""}</span><span className="num">{!feeKnown ? "după adresă" : fee ? lei(fee) : "gratuit"}</span></div>}
          <div className="tot"><span>Total</span><span className="num">{lei(total)}</span></div>
          {rwOn && (customer || form.email.includes("@")) && earn > 0 && <div className="earn"><span>Câștigi la livrare</span><span className="num">+{earn} puncte · {lei(Math.floor(earn * vppOf(rw.cfg, customer ? tierN : 1) * 100) / 100)}</span></div>}
          {rwOn && customer && (() => {
            const before = nextTierInfo(rw.cfg, tierN, rw.me?.spent ?? 0);
            if (!before || !earn) return null;
            if (earn >= before.left) return <p className="rw-near">Cu această comandă urci la Lyra {tierName(rw.cfg, before.tier)} 🎉 și primești un desert cadou.</p>;
            const left = before.left - earn;
            return left <= rw.cfg.near_tier_lei ? <p className="rw-near">După comanda asta mai ai doar {lei(left)} până la Lyra {tierName(rw.cfg, before.tier)}: {rw.cfg.rates[before.tier - 1]}% cashback și un desert cadou.</p> : null;
          })()}
        </div>
        <button className="cta" onClick={placeOrder} disabled={sending || !canOrder || !schedOk}>
          {!canOrder ? "Nu preluăm comenzi acum" : sending ? "Se trimite…" : whenEff === "later" ? <>{slot ? "Programează comanda" : "Alege ora"} · <span className="num">{lei(total)}</span></> : <>Trimite comanda · <span className="num">{lei(total)}</span></>}
        </button>
        {sendErr && <p className="err">{sendErr}</p>}
        <p className="fine">Plătești la livrare. Trimițând comanda ești de acord cu <Link to="/termeni">Termenii</Link> și <Link to="/confidentialitate">Politica de confidențialitate</Link>.</p>
      </>)}
    </div>
  );

  return (
    <div className="m-page">
      {/* ---------- top bar ---------- */}
      <header className="topbar" ref={topRef}>
        <div className="tb-in">
          <button className="tb-ic tb-burger" onClick={() => setDrawer(true)} aria-label="Meniu"><Icon name="menu" size={22} /></button>
          <a className="wordmark" href="/" aria-label="Lyra's Delivery · acasă">
            <b>LYRA’S</b><span>DELIVERY</span>
            <svg viewBox="0 0 120 10" aria-hidden="true"><path d="M4 6c30-5 80-5 112 0" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
          </a>
          <button className="tb-where" onClick={() => setModePick(true)} aria-label="Livrare sau ridicare">
            <Icon name="pin" size={17} /><span>{mode === "livrare" ? `${t.deliv} · Mureș` : `${t.pick} · Acățari`}</span><Icon name="chev" size={15} />
          </button>
          <label className="tb-search"><Icon name="search" size={18} /><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t.search} aria-label="Caută în meniu" /></label>
          <Link to="/cont" className="tb-ic tb-user" aria-label="Contul meu · Lyra Rewards"><Icon name="user" size={20} />{customer && <em className="num">{customer.points}</em>}</Link>
          <button className="tb-cart" onClick={() => { if (window.matchMedia("(min-width:1100px)").matches) document.querySelector(".cartcol")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); else setCartOpen(true); }} aria-label="Coșul tău">
            <Icon name="cart" size={20} /><b className="num">{lei(sub)}</b>{count > 0 && <i className="num">{count}</i>}
          </button>
        </div>
      </header>
      {drawer && <div className="drawer-wrap"><div className="veil" onClick={() => setDrawer(false)} />
        <nav className="drawer" aria-label="Meniu principal">
          <div className="dr-head"><span className="wordmark sm"><b>LYRA’S</b><span>DELIVERY</span></span><button className="x-btn" onClick={() => setDrawer(false)} aria-label="Închide">×</button></div>
          <button onClick={() => { setDrawer(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Icon name="cutlery" size={19} />{t.menu}</button>
          <Link to="/cont" onClick={() => setDrawer(false)}><Icon name="star" size={19} />{customer ? `Lyra Rewards · ${customer.points} puncte` : "Lyra Rewards · intră în cont"}</Link>
          <Link to="/cont" onClick={() => setDrawer(false)}><Icon name="orders" size={19} />Comenzile mele</Link>
          {inst.can && <button className="dr-install" onClick={() => { setDrawer(false); setInstallOpen(true); }}><img src="/icons/icon-192.png" alt="" />Pune Lyra pe ecran<small>aplicația, cu o atingere</small></button>}
          <div className="dr-row"><button onClick={toggleTheme}><Icon name={dark ? "sun" : "moon"} size={19} />{dark ? "Temă deschisă" : "Temă întunecată"}</button>
            <button onClick={() => setLang(lang === "ro" ? "hu" : "ro")}><b className="dr-lang">{lang === "ro" ? "HU" : "RO"}</b>{lang === "ro" ? "Magyarul" : "Românește"}</button></div>
          <div className="dr-legal"><Link to="/termeni">Termeni și condiții</Link><Link to="/confidentialitate">Confidențialitate</Link></div>
        </nav></div>}
      {settings && !canAsap && <p className="closed">{openNow ? "Restaurantul nu preia comenzi pentru acum." : `Acum suntem închiși · program ${hoursLabel(settings)}.`} {days.length ? "Poți face o precomandă pentru mai târziu." : "Poți răsfoi meniul."}</p>}

      <div className="shell">
        <main className="m-main">
          {!query && <>
            {/* ---------- hero: banners from admin ---------- */}
            {shownBanners.length > 0 && <section className="hero2">
              <div className="hero-track" ref={heroRef} onScroll={e => { const el = e.currentTarget; setSlide(Math.round(el.scrollLeft / el.clientWidth)); }}>
                {shownBanners.map(bn => {
                  const head = bn.title || (bn.category_id && catOf(bn.category_id) ? catName(catOf(bn.category_id)!) : "Lyra's Delivery");
                  return (
                    <div key={bn.id} className="h2-slide">
                      <div className="h2-txt">
                        <span className="h2-kick">{L ? "A LYRA'S AJÁNLATA" : "RECOMANDAREA LYRA'S"}</span>
                        <h2>{head}<svg viewBox="0 0 300 16" aria-hidden="true"><path d="M6 11c60-7 150-9 210-6M150 13c50-3 100-3 144-1" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg></h2>
                        {bn.body && <p>{bn.body}</p>}
                        <button className="h2-cta" onClick={() => bn.category_id && jump(bn.category_id)}>{bn.cta || (L ? "Rendelj most" : "Comandă acum")}<Icon name="arrow" size={18} /></button>
                      </div>
                      <button className="h2-img" onClick={() => bn.category_id && jump(bn.category_id)} aria-label={head}>
                        {bn.image && <img src={imgUrl(bn.image)!} alt="" />}
                        {bn.chip && <span className="h2-note">{bn.chip}<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M50 4c4 20-6 38-34 44M16 48l9-10M16 48l12 3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg></span>}
                      </button>
                    </div>
                  );
                })}
              </div>
              {shownBanners.length > 1 && <div className="dots">{shownBanners.map((b, i) => <button key={b.id} aria-label={`Banner ${i + 1}`} aria-current={slide === i} onClick={() => heroRef.current?.scrollTo({ left: i * heroRef.current.clientWidth, behavior: "smooth" })} />)}</div>}
            </section>}

            {/* ---------- categories ---------- */}
            <nav className="cat-tiles" aria-label="Categorii">
              {visibleCats.map(c => (
                <button key={c.id} aria-current={activeCat === c.id} onClick={() => jump(c.id)}>
                  <Icon name={CAT_ICON[c.id] || "dish"} size={30} /><span>{catName(c)}</span>
                </button>
              ))}
            </nav>

            {/* ---------- most ordered ---------- */}
            {popular.length > 0 && <section className="top-wrap">
              <div className="sec-h top-h"><h2>{L ? "Legnépszerűbb" : "Cele mai comandate"}</h2>
                <button className="see-all" onClick={() => visibleCats[0] && jump(visibleCats[0].id)}>{L ? "Teljes étlap" : "Vezi tot meniul"}<Icon name="arrow" size={16} /></button></div>
              <div className="top-rail">
                {popular.map(it => (
                  <article key={it.id} className="top-card" data-card>
                    <button className="tc-img" onClick={() => openItem(it)} aria-label={nm(it)}><img src={imgUrl(it.image)!} alt="" loading="lazy" />{pctOf(it.id) > 0 && <span className="b b-off tc-off"><Icon name="tag" size={12} />−{pctOf(it.id)}%</span>}</button>
                    <div className="tc-body">
                      <button className="tc-name" onClick={() => openItem(it)}><h3>{nm(it)}</h3></button>
                      {catOf(it.category_id) && <small>{catName(catOf(it.category_id)!)}</small>}
                      {buyRow(it)}
                    </div>
                  </article>
                ))}
              </div>
            </section>}
          </>}

          {/* ---------- sticky category pills ---------- */}
          <nav className="pills" ref={pillsRef} aria-label={t.menu}>
            {visibleCats.map(c => <button key={c.id} aria-current={activeCat === c.id} onClick={() => jump(c.id)}>{catName(c)}</button>)}
          </nav>

          {/* ---------- products ---------- */}
          {!loaded && <div className="grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="pc skel"><div className="pc-img" /><div className="pc-body"><i /><i /><i /></div></div>)}</div>}
          {cats.map(c => {
            const list = items.filter(i => i.category_id === c.id && match(i));
            if (!list.length) return null;
            const note = L ? c.note_hu : c.note_ro;
            return (
              <section key={c.id} className="sec" id={"sec-" + c.id} data-sec={c.id}>
                <header className="sec-h"><h2>{catName(c)}</h2><span>{list.length} {t.all}</span>{note && <p>{note}</p>}</header>
                <div className="grid">
                  {list.map(it => {
                    const out = !it.available, img = imgUrl(it.image);
                    return (
                      <article key={it.id} className={`pc ${img ? "" : "noimg"} ${out ? "out" : ""}`} data-card>
                        {img && <button className="pc-img" onClick={() => openItem(it)} aria-label={nm(it)}>
                          <img src={img} alt="" loading="lazy" />
                          <span className="pc-badges">
                            {pctOf(it.id) > 0 && <span className="b b-off"><Icon name="tag" size={12} />−{pctOf(it.id)}%</span>}
                            {it.tags.includes("new") && <span className="b b-new">{L ? "Új" : "Nou"}</span>}
                            {it.hot && <span className="b b-hot"><Icon name="flame" size={12} fill />{t.hot}</span>}
                            {it.tags.includes("veg") && <span className="b b-veg">Veg</span>}
                            {it.tags.includes("post") && <span className="b b-veg">{TAGS.post[L]}</span>}
                          </span>
                          {out && <span className="pc-out">{t.out}</span>}
                        </button>}
                        <div className="pc-body">
                          <button className="pc-name" onClick={() => openItem(it)}><h3>{nm(it)}</h3></button>
                          {ds(it) && <p className="pc-desc">{ds(it)}</p>}
                          <div className="pc-meta">
                            <span className="gr">{it.variants?.[0]?.g || it.grams}</span>
                            {it.allergens.length > 0 && <span className="al" title={"Alergeni: " + it.allergens.map(a => ALLERGENS[a]?.[L]).join(", ")}>{it.allergens.map(a => <i key={a}><Icon name={a} size={11} /></i>)}</span>}
                          </div>
                          {buyRow(it)}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {query && loaded && !items.some(match) && <p className="empty-q">Nimic găsit pentru „{q}”. Încearcă „ciolan”, „burger” sau „papanaș”.</p>}
          <SiteFooter />
        </main>

        <aside className="cartcol" aria-label="Coș">{cartPanel}</aside>
      </div>

      <BottomNav active="menu" count={count} total={sub} onCart={() => setCartOpen(true)} />
      {cartOpen && <div className="cart-sheet"><div className="veil" onClick={() => setCartOpen(false)} /><div className="sheet sheet-cart" role="dialog" aria-modal="true" aria-label="Coșul tău">{cartPanel}</div></div>}

      {/* ---------- product detail ---------- */}
      {sheet && byId[sheet.id] && (() => {
        const it = byId[sheet.id], img = imgUrl(it.image), exs = extrasFor(it);
        const unit = baseOf(it, sheet.vi) + sheet.extras.reduce((s, k) => s + (byId[k]?.price || 0), 0);
        return (<>
          <div className="veil" onClick={() => setSheet(null)} />
          <div className="sheet modal" role="dialog" aria-modal="true" aria-label={nm(it)}>
            <button className="x-btn" onClick={() => setSheet(null)} aria-label="Închide">×</button>
            <div className="md-grid">
              {img && <div className="md-img" style={{ ["--img" as string]: `url(${img})` }}><img src={img} alt="" /></div>}
              <div className="md-body">
                {pctOf(it.id) > 0 && <div className="md-off"><span className="b b-off"><Icon name="tag" size={13} />Reducere −{pctOf(it.id)}%</span>
                  <span className="num"><b>{lei(baseOf(it, sheet.vi))}</b> <s>{lei(fullOf(it, sheet.vi))}</s></span></div>}
                <h2 className="md-name">{nm(it)}</h2>
                <p className="md-sub">{L ? it.name_ro : it.name_hu}</p>
                {ds(it) && <p className="md-desc">{ds(it)}</p>}
                <div className="facts">
                  <span className="fact">{it.variants?.[sheet.vi]?.g || it.grams}</span>
                  {it.hot && <span className="fact hot"><Icon name="flame" size={13} fill />{t.hot}</span>}
                  {it.tags.filter(x => TAGS[x] && x !== "new").map(x => <span key={x} className="fact">{TAGS[x][L]}</span>)}
                  {it.meat && MEAT[it.meat] && <span className="fact">{MEAT[it.meat][L]}</span>}
                </div>
                {it.allergens.length > 0 && <div className="facts">{it.allergens.map(a => <span key={a} className="fact al-f"><Icon name={a} size={13} />{ALLERGENS[a]?.[L]}</span>)}</div>}
                {it.wine && <div className="wine"><Icon name="wine" size={22} /><div>{t.wine} <b>{it.wine}</b></div></div>}
                {it.variants?.length ? <><p className="cp-lbl">{t.portion}</p><div className="paygrid">
                  {it.variants.map((v, i) => <button key={i} aria-pressed={sheet.vi === i} onClick={() => setSheet({ ...sheet, vi: i })}><b>{(L && v.lh) || v.l}</b><small className="num">{pctOf(it.id) > 0 ? <><s>{lei(v.p)}</s> {lei(cut(v.p, pctOf(it.id)))}</> : lei(v.p)} · {v.g}</small></button>)}
                </div></> : null}
                {exs.length > 0 && <><p className="cp-lbl">{t.extras}</p>{exs.map(e => (
                  <label key={e.id} className="opt"><input type="checkbox" checked={sheet.extras.includes(e.id)}
                    onChange={ev => setSheet({ ...sheet, extras: ev.target.checked ? [...sheet.extras, e.id] : sheet.extras.filter(k => k !== e.id) })} />
                    <span>{nm(e)}</span><b className="num">+{lei(e.price)}</b></label>))}</>}
                <p className="cp-lbl">{t.note}</p>
                <textarea className="ta" rows={2} value={sheet.note} placeholder={t.notePh} onChange={e => setSheet({ ...sheet, note: e.target.value })} />
                <div className="md-foot">
                  <span className="qty lg"><button onClick={() => setSheet({ ...sheet, qty: Math.max(1, sheet.qty - 1) })} aria-label="Mai puțin">−</button><b className="num">{sheet.qty}</b><button onClick={() => setSheet({ ...sheet, qty: sheet.qty + 1 })} aria-label="Mai mult">+</button></span>
                  <button className="cta" disabled={!it.available}
                    onClick={e => { const from = (e.currentTarget.closest(".sheet") as HTMLElement)?.querySelector(".md-img img"); addLine({ id: it.id, qty: sheet.qty, vi: it.variants?.length ? sheet.vi : undefined, extras: sheet.extras, note: sheet.note.trim() }, from); setSheet(null); }}>
                    {it.available ? <>{t.add} · <span className="num">{lei(unit * sheet.qty)}</span></> : t.out}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>);
      })()}

      {/* ---------- promo popup ---------- */}
      {modePick && <ModePick current={mode} livPct={menuPct(dsc.list, "livrare")} ridPct={menuPct(dsc.list, "ridicare")} onPick={pickMode}
        onClose={(() => { try { return sessionStorage.getItem("lyra-mode-ok") ? () => setModePick(false) : undefined; } catch { return undefined; } })()} />}
      {!modePick && !cartOpen && !sheet && !popup && <OffersAsk />}
      {installOpen && !modePick && !cartOpen && !sheet && <InstallSheet hasAccount={!!customer} onClose={() => setInstallOpen(false)} />}
      {joinPop && !modePick && !installOpen && !installShown.current && !popup && !customer && !cartOpen && !sheet && <div className="pop" role="dialog" aria-modal="true" aria-label="Lyra Rewards" onClick={e => e.target === e.currentTarget && closeJoin()}>
        <div className="pop-card join-pop">
          <button className="x-btn" onClick={closeJoin} aria-label="Închide">×</button>
          {settings?.welcome_on && Number(settings.welcome_lei) > 0
            ? <div className="jp-top jp-gift"><span className="jp-badge">🎁 CADOU LA CONT NOU</span>
                <h2><em className="num">{Number(settings.welcome_lei)} lei</em> reducere la prima comandă</h2>
                <p>Îți faci cont gratuit și primești pe loc {Number(settings.welcome_lei)} de lei, pe care îi folosești la prima comandă de minim {Number(settings.welcome_min)} de lei.</p></div>
            : <div className="jp-top"><span className="rw-kicker">LYRA REWARDS</span><h2>Fă-ți cont și primești înapoi la fiecare comandă</h2></div>}
          {settings?.welcome_on && Number(settings.welcome_lei) > 0
            ? rw.cfg.enabled && <ul className="jp-perks">
                <li><b>Plus Lyra Rewards: {rw.cfg.rates[0]}–{rw.cfg.rates[2]}% înapoi în puncte</b><span>la fiecare comandă, și desert cadou la fiecare nivel nou 🍰</span></li>
              </ul>
            : <ul className="jp-perks">
                <li><b>{rw.cfg.rates[0]}% înapoi în puncte</b><span>de la prima comandă, folosite la următoarele</span></li>
                <li><b>Până la {rw.cfg.rates[2]}% la nivelul {rw.cfg.tier_names[2]}</b><span>cu cât comanzi mai des, cu atât valorează mai mult</span></li>
                <li><b>Desert cadou 🍰</b><span>la fiecare nivel nou: {rw.cfg.tier_names[1]} și {rw.cfg.tier_names[2]}</span></li>
                <li><b>Comandă din nou cu un click</b><span>adrese salvate, istoric, fără parolă</span></li>
              </ul>}
          <Link to="/cont" className="cta" onClick={closeJoin}>{settings?.welcome_on && Number(settings.welcome_lei) > 0 ? `Creează cont și ia ${Number(settings.welcome_lei)} lei` : "Creează cont gratuit"}</Link>
          <button className="later" onClick={closeJoin}>Mai târziu</button>
        </div>
      </div>}
      {popup && !installOpen && !modePick && (() => {
        const it = popup.item_id ? byId[popup.item_id] : undefined;
        const old = it ? it.price + popup.extras.reduce((s, k) => s + (byId[k]?.price || 0), 0) : 0;
        const close = () => { setPopup(null); try { sessionStorage.setItem("lyra-popup", "1"); } catch { /* ignore */ } };
        const img = imgUrl(popup.image) || imgUrl(it?.image || null);
        return (
          <div className="pop" role="dialog" aria-modal="true" aria-label={popup.title} onClick={e => e.target === e.currentTarget && close()}>
            <div className="pop-card">
              <div className="pi"><span className="ribbon">{popup.kicker || "Ofertă"}</span>{img && <img src={img} alt="" />}<button className="x-btn" onClick={close} aria-label="Închide">×</button></div>
              <div className="pb">
                <h3>{popup.title}</h3>{popup.body && <p>{popup.body}</p>}
                {popup.price != null && it && <div className="pp num">{lei(popup.price)}{old > popup.price && <s>{lei(old)}</s>}</div>}
                {popup.code && <div className="codebox">{popup.code}</div>}
                <button className="cta" onClick={() => {
                  if (popup.price != null && it) { addLine({ id: it.id, qty: 1, extras: popup.extras, note: "", promo: popup.id, promoPrice: popup.price, promoTitle: popup.title }); close(); setStep("cart"); setCartOpen(true); }
                  else if (popup.code) { setCodeInput(popup.code); close(); }
                  else close();
                }}>{popup.price != null ? "Adaugă în coș" : popup.code ? "Folosește codul" : "Vezi meniul"}</button>
                <button className="later" onClick={close}>Mai târziu</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
