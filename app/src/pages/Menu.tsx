import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Banner, CartLine, Category, Item, Promo, Settings } from "../lib/types";
import { ALLERGENS, MEAT, TAGS, imgUrl, lei, rememberOrder } from "../lib/format";
import { tierOf, useCustomer } from "../lib/auth";
import { flyToCart, haptic } from "../lib/fx";
import Icon from "../components/Icon";
import BottomNav from "../components/BottomNav";

type Lang = "ro" | "hu";
type ItemSheet = { id: string; qty: number; vi: number; extras: string[]; note: string };
type CodeInfo = { code: string; percent: number; category_id: string | null; label: string };
type Form = { name: string; phone: string; email: string; address: string };

const EXTRA_IDS = {
  burger: ["cartofi", "special-fries", "sosul-casei"],
  main: ["mujdei", "sos-usturoi", "smantana", "ardei-iute"],
  desert: ["smantana"],
};
const MAIN_CATS = ["nou", "specialitati", "porc", "ardeal", "pui", "peste", "post", "dejun", "platouri", "vegetariene"];
const UPSELL = ["sosul-casei", "mujdei", "muraturi", "papanas", "lapte-pasare", "ardei-iute", "cartofi"];
const CAT_IMG: Record<string, string> = {
  antreuri: "platou-branzeturi.jpg", dejun: "english.jpg", nou: "antricot.jpg", platouri: "platou-lyra.jpg",
  specialitati: "costite.jpg", smash: "double-smash.jpg", burger: "eleven-burger.jpg", supe: "ciorba-vita.jpg",
  porc: "ciolan-lyra.jpg", ardeal: "papricas.jpg", pui: "cordon-bleu.jpg", peste: "pastrav.jpg", paste: "carbonara.jpg",
  salate: "halloumi.jpg", vegetariene: "papricas-ciuperci.jpg", post: "ciorba-pita.jpg", kids: "kids-dino.jpg",
  garnituri: "cartofi-coaja.jpg", muraturi: "muraturi.jpg", sosuri: "special-fries.jpg", desert: "papanas.jpg",
};
// "Ce poftă ai?" — quick moods, each a hand-picked set of dishes
const MOODS = [
  { id: "casa", ro: "De-al casei", hu: "Házias", ids: ["ciolan-lyra", "costite", "sarmale", "carne-garnita", "fasole-batuta", "papricas"] },
  { id: "burger", ro: "Burger night", hu: "Burger este", ids: ["double-smash", "spicy-smash", "eleven-burger", "burger-ozn", "special-fries", "smash"] },
  { id: "usor", ro: "Ușor & verde", hu: "Könnyű", ids: ["halloumi", "salata-pui", "pastrav", "oua-posate", "supa-crema", "papricas-ciuperci"] },
  { id: "premium", ro: "Seară specială", hu: "Különleges este", ids: ["antricot", "muschi", "tocanita", "platou-branzeturi", "camembert"] },
  { id: "dulce", ro: "Ceva dulce", hu: "Valami édes", ids: ["papanas", "somloi", "lapte-pasare", "panna-cotta", "clatite", "tarta-mere"] },
  { id: "dimineata", ro: "Mic dejun", hu: "Reggeli", ids: ["english", "bruschete", "omleta", "paine-ou", "spanac"] },
  { id: "grup", ro: "Pentru gașcă", hu: "Társaságnak", ids: ["platou-lyra", "platou-pui", "mix-grill", "gustare", "platou-branzeturi"] },
];
const moodFor = (h: number) => (h < 11 ? "dimineata" : h < 16 ? "casa" : h < 22 ? "burger" : "dulce");

const T = {
  ro: { deliv: "Livrare", pick: "Ridicare", search: "Caută ciolan, burger, papanaș…", add: "Adaugă", from: "de la", out: "Epuizat azi",
        cart: "Coșul tău", hot: "Tigaie fierbinte", portion: "Alege porția", extras: "Completează", note: "Mențiuni pentru bucătărie",
        notePh: "Ex: fără ceapă, sosul separat", wine: "Potrivit cu vin", mood: "Ce poftă ai?", all: "produse", menu: "Tot meniul" },
  hu: { deliv: "Kiszállítás", pick: "Elvitel", search: "Keresés…", add: "Kosárba", from: "ártól", out: "Ma elfogyott",
        cart: "Kosarad", hot: "Forró serpenyő", portion: "Válassz adagot", extras: "Egészítsd ki", note: "Megjegyzés a konyhának",
        notePh: "Pl. hagyma nélkül, szósz külön", wine: "Ajánlott bor", mood: "Mire van kedved?", all: "termék", menu: "Teljes étlap" },
};

function loadCart(): CartLine[] {
  try { return JSON.parse(localStorage.getItem("lyra-cart") || "[]"); } catch { return []; }
}
function loadForm(): Form {
  try { return { name: "", phone: "", email: "", address: "", ...JSON.parse(localStorage.getItem("lyra-form") || "{}") }; }
  catch { return { name: "", phone: "", email: "", address: "" }; }
}
const DEFAULT_BANNERS: Banner[] = [
  { id: "d1", chip: "Nou · Smash Burgers", title: null, body: "Chiftele smash din vită, cheddar topit, chiflă artizanală. De la 25 lei.", cta: "Comandă acum", image: "double-smash.jpg", category_id: "smash", active: true, sort: 10 },
  { id: "d2", chip: "BBQ Pit Box Smoker", title: "Afumat lent, ore întregi", body: null, cta: "Specialitățile casei", image: "pitbox.jpg", category_id: "specialitati", active: true, sort: 20 },
];
const isDesktop = () => window.matchMedia("(min-width: 1100px)").matches;

export default function Menu({ source }: { source?: string }) {
  const nav = useNavigate();
  const { customer } = useCustomer();
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadErr, setLoadErr] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [lang, setLang] = useState<Lang>("ro");
  const [mode, setMode] = useState<"livrare" | "ridicare">("livrare");
  const [q, setQ] = useState("");
  const [mood, setMood] = useState(() => moodFor(new Date().getHours()));
  const [activeCat, setActiveCat] = useState("");
  const [cart, setCart] = useState<CartLine[]>(loadCart);
  const [sheet, setSheet] = useState<ItemSheet | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "details">("cart");
  const [popup, setPopup] = useState<Promo | null>(null);
  const [form, setForm] = useState<Form>(loadForm);
  const [orderNote, setOrderNote] = useState("");
  const [pay, setPay] = useState<"card" | "cash">("card");
  const [usePts, setUsePts] = useState(false);
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
  // signed-in members get their details filled in
  useEffect(() => {
    if (!customer) return;
    setForm(f => ({
      name: f.name || customer.name || "", phone: f.phone || customer.phone || "",
      email: customer.email || f.email, address: f.address || customer.addresses?.[0] || "",
    }));
  }, [customer?.id]);
  // ?cart=1 opens the cart (used by "comandă din nou" and the bottom bar)
  useEffect(() => {
    if (new URLSearchParams(location.search).get("cart") === "1") { setCartOpen(true); history.replaceState(null, "", location.pathname); }
  }, []);

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
  const nm = (it: Item) => (L && it.name_hu) || it.name_ro;
  const ds = (it: Item) => (L && it.desc_hu) || it.desc_ro || "";
  const catName = (c: Category) => (L && c.name_hu) || c.name_ro;

  // ---- pricing (mirrors place_order in the database; the database has the final word) ----
  const baseOf = (it: Item, vi?: number) => (it.variants?.length ? it.variants[vi ?? 0].p : it.price);
  const unitOf = (l: CartLine) => {
    const it = byId[l.id]; if (!it) return 0;
    if (l.promoPrice != null) return l.promoPrice;
    return baseOf(it, l.vi) + l.extras.reduce((s, k) => s + (byId[k]?.price || 0), 0);
  };
  const validCart = cart.filter(l => byId[l.id]);
  const sub = validCart.reduce((s, l) => s + unitOf(l) * l.qty, 0);
  const disc = code
    ? Math.round((code.category_id
        ? validCart.filter(l => byId[l.id].category_id === code.category_id && l.promoPrice == null).reduce((s, l) => s + unitOf(l) * l.qty, 0)
        : sub) * code.percent) / 100
    : 0;
  const tier = tierOf(customer?.lifetime || 0);
  const freeOver = settings?.free_delivery_over ?? 100;
  const fee = mode === "livrare" && settings && sub > 0 && sub < freeOver && tier.name !== "Aur" ? settings.delivery_fee : 0;
  const maxPts = customer ? Math.min(Math.floor(customer.points / 100) * 10, Math.floor((sub - disc) * 0.5 / 10) * 10) : 0;
  const ptsVal = usePts && maxPts > 0 ? maxPts : 0;
  const total = Math.max(0, sub - disc - ptsVal + fee);
  const earn = Math.floor(total * tier.mult);
  const count = validCart.reduce((s, l) => s + l.qty, 0);
  const qtyOf = (id: string) => validCart.filter(l => l.id === id && !l.promo).reduce((s, l) => s + l.qty, 0);

  function addLine(line: Omit<CartLine, "key">, from?: Element | null) {
    const key = [line.id, line.vi ?? "", [...line.extras].sort().join(","), line.note, line.promo ?? ""].join("|");
    setCart(c => {
      const ex = c.find(l => l.key === key);
      return ex ? c.map(l => (l.key === key ? { ...l, qty: l.qty + line.qty } : l)) : [...c, { ...line, key }];
    });
    haptic(); flyToCart(from || null);
  }
  const openItem = (it: Item) => setSheet({ id: it.id, qty: 1, vi: 0, extras: [], note: "" });
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
    (["smash", "burger"].includes(it.category_id) && it.id !== "special-fries" ? EXTRA_IDS.burger
      : MAIN_CATS.includes(it.category_id) ? EXTRA_IDS.main
      : it.category_id === "desert" ? EXTRA_IDS.desert : []).map(id => byId[id]).filter(Boolean);

  async function applyCode() {
    const v = codeInput.trim().toUpperCase();
    if (!v) { setCode(null); setCodeMsg(""); return; }
    const { data } = await supabase.rpc("check_code", { p_code: v });
    if (data) { setCode(data as CodeInfo); setCodeMsg("Cod aplicat: " + (data as CodeInfo).label); }
    else { setCode(null); setCodeMsg(`Codul „${v}” nu există sau a expirat.`); }
  }

  async function placeOrder() {
    setSendErr("");
    if (!form.name.trim() || !form.phone.trim() || (mode === "livrare" && !form.address.trim())) {
      setSendErr(mode === "livrare" ? "Completează numele, telefonul și adresa." : "Completează numele și telefonul."); return;
    }
    setSending(true);
    const { data, error } = await supabase.rpc("place_order", {
      p: {
        name: form.name, phone: form.phone, email: form.email, address: form.address, mode, payment: pay,
        note: orderNote, code: code?.code || "", use_points: ptsVal > 0,
        source: source || new URLSearchParams(location.search).get("s") || "site",
        items: validCart.map(l => ({ id: l.id, qty: l.qty, vi: l.vi, extras: l.extras, note: l.note, promo: l.promo })),
      },
    });
    setSending(false);
    if (error) { setSendErr(error.message || "Comanda nu a putut fi trimisă. Încearcă din nou."); return; }
    const res = data as { token: string; number: number };
    rememberOrder(res.token, res.number);
    if (customer && form.address && !customer.addresses?.includes(form.address)) {
      supabase.from("customers").update({ addresses: [form.address, ...(customer.addresses || [])].slice(0, 5), phone: customer.phone || form.phone, name: customer.name || form.name }).eq("id", customer.id).then(() => {});
    }
    setCart([]); setCartOpen(false); setStep("cart"); setOrderNote(""); setCode(null); setCodeInput(""); setCodeMsg(""); setUsePts(false);
    nav("/comanda/" + res.token, { state: { fresh: true } });
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
  const match = (it: Item) => !query || `${it.name_ro} ${it.name_hu} ${it.desc_ro}`.toLowerCase().includes(query);
  const visibleCats = cats.filter(c => items.some(i => i.category_id === c.id));
  const moodItems = (MOODS.find(m => m.id === mood)?.ids || []).map(id => byId[id]).filter(it => it && it.image);
  const h = new Date().getHours();
  const firstName = customer?.name?.split(" ")[0];
  const hello = L ? (h < 11 ? "Jó reggelt" : h < 18 ? "Jó napot" : "Jó estét") : (h < 11 ? "Bună dimineața" : h < 18 ? "Bună ziua" : "Bună seara");

  if (loadErr) return <div className="m-page"><p className="closed">{loadErr}</p></div>;

  // ---------- price + add button, shared by cards and rails ----------
  const buyRow = (it: Item) => {
    const qn = qtyOf(it.id), out = !it.available;
    const price = it.variants?.length ? Math.min(...it.variants.map(v => v.p)) : it.price;
    return (
      <div className="pc-foot">
        <span className="price num">{it.variants?.length ? <small>{t.from} </small> : null}{lei(price)}</span>
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
          <div className="cp-empty-ic"><Icon name="bag" size={34} /></div>
          <b>Coșul e gol</b>
          <p>Alege ceva bun din meniu. Livrarea e gratuită peste {lei(freeOver)}.</p>
        </div>
      ) : step === "cart" ? (<>
        <div className="cp-lines">
          {validCart.map(l => {
            const it = byId[l.id], img = imgUrl(it.image);
            const info = [l.vi != null && it.variants ? it.variants[l.vi]?.l : "", ...l.extras.map(k => "+ " + (byId[k] ? nm(byId[k]) : k)), l.promoTitle ? "Ofertă" : "", l.note ? `„${l.note}”` : ""].filter(Boolean).join(" · ");
            return (
              <div key={l.key} className="cl">
                {img ? <img src={img} alt="" /> : <span className="cl-ph"><Icon name="dish" size={22} /></span>}
                <div className="cl-txt"><b>{nm(it)}</b>{info && <small>{info}</small>}<span className="num">{lei(unitOf(l) * l.qty)}</span></div>
                <span className="qty">
                  <button onClick={() => setCart(c => c.flatMap(x => x.key !== l.key ? [x] : x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []))} aria-label="Mai puțin">{l.qty === 1 ? "×" : "−"}</button>
                  <b className="num">{l.qty}</b>
                  <button onClick={() => setCart(c => c.map(x => x.key === l.key ? { ...x, qty: x.qty + 1 } : x))} aria-label="Mai mult">+</button>
                </span>
              </div>
            );
          })}
        </div>
        {mode === "livrare" && (tier.name === "Aur" ? <div className="freebar ok"><Icon name="star" size={16} fill /> Livrare gratuită: ești membru Aur</div>
          : sub < freeOver
          ? <div className="freebar"><span>Încă <b className="num">{lei(freeOver - sub)}</b> și livrarea e gratuită</span><div className="prog"><i style={{ width: `${Math.min(100, (sub / freeOver) * 100)}%` }} /></div></div>
          : <div className="freebar ok"><Icon name="check" size={16} /> Livrarea e gratuită</div>)}
        {(() => {
          const ups = UPSELL.filter(id => byId[id] && byId[id].available && !validCart.some(l => l.id === id)).slice(0, 6);
          return ups.length > 0 && <div className="ups-wrap"><p className="cp-lbl">Merge perfect alături</p><div className="ups">{ups.map(id => {
            const it = byId[id], img = imgUrl(it.image);
            return <button key={id} className="up" onClick={() => addLine({ id: it.id, qty: 1, extras: [], note: "" })}>{img ? <img src={img} alt="" /> : <span className="up-ph">{nm(it).slice(0, 1)}</span>}<span className="up-n">{nm(it)}</span><em className="num">+{lei(it.price)}</em></button>;
          })}</div></div>;
        })()}
        <div className="cp-sum">
          <div><span>Produse</span><span className="num">{lei(sub)}</span></div>
          {mode === "livrare" && <div><span>Livrare</span><span className="num">{fee ? lei(fee) : "gratuit"}</span></div>}
          <div className="tot"><span>Total</span><span className="num">{lei(sub + fee)}</span></div>
        </div>
        <button className="cta" onClick={() => setStep("details")}>Continuă <span>→</span></button>
      </>) : (<>
        {customer
          ? <div className="club-strip"><span className={`club-dot ${tier.cls}`} /><div><b>{customer.points} puncte</b><small>Membru {tier.name} · câștigi +{earn} puncte la comanda asta</small></div></div>
          : <Link to="/cont" className="club-strip guest"><Icon name="star" size={18} fill /><div><b>Ai cont Lyra Club?</b><small>Intră ca să folosești punctele și să-ți salvăm adresa.</small></div><span>→</span></Link>}
        <p className="cp-lbl">Cum vrei comanda?</p>
        <div className="seg big2">
          <button aria-pressed={mode === "livrare"} onClick={() => setMode("livrare")}><Icon name="bike" size={18} />{t.deliv}</button>
          <button aria-pressed={mode === "ridicare"} onClick={() => setMode("ridicare")}><Icon name="bag" size={18} />{t.pick}</button>
        </div>
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
          {!customer && <label className="fl wide"><span>Email <i>opțional · primești puncte Lyra Club pe email</i></span><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} inputMode="email" autoComplete="email" placeholder="nume@email.com" /></label>}
          <label className="fl wide"><span>Mențiuni <i>opțional</i></span><textarea rows={2} value={orderNote} onChange={e => setOrderNote(e.target.value)} placeholder="Interfon, etaj, fără tacâmuri…" /></label>
        </div>
        {customer && <div className={`ptsbox ${maxPts ? "" : "dis"}`}>
          <div><b>Folosește {maxPts * 10} puncte</b><small>{maxPts ? `−${lei(maxPts)} din comandă` : "Poți folosi punctele de la 100 în sus."}</small></div>
          <button className="switch" role="switch" aria-checked={ptsVal > 0} disabled={!maxPts} onClick={() => setUsePts(!usePts)} aria-label="Folosește punctele" />
        </div>}
        <p className="cp-lbl">Plata</p>
        <div className="paygrid">
          <button aria-pressed={pay === "card"} onClick={() => setPay("card")}><b>Card</b><small>la livrare</small></button>
          <button aria-pressed={pay === "cash"} onClick={() => setPay("cash")}><b>Numerar</b><small>la livrare</small></button>
        </div>
        <div className="codebar">
          <input value={codeInput} onChange={e => setCodeInput(e.target.value)} placeholder="Cod promoțional" aria-label="Cod promoțional" />
          <button onClick={applyCode}>Aplică</button>
        </div>
        {codeMsg && <p className={`codemsg ${code ? "ok" : ""}`}>{codeMsg}</p>}
        <div className="cp-sum">
          <div><span>Produse ({count})</span><span className="num">{lei(sub)}</span></div>
          {disc > 0 && <div className="neg"><span>{code?.label}</span><span className="num">−{lei(disc)}</span></div>}
          {ptsVal > 0 && <div className="neg"><span>Puncte Lyra Club</span><span className="num">−{lei(ptsVal)}</span></div>}
          {mode === "livrare" && <div><span>Livrare</span><span className="num">{fee ? lei(fee) : "gratuit"}</span></div>}
          <div className="tot"><span>Total</span><span className="num">{lei(total)}</span></div>
          {(customer || form.email.includes("@")) && <div className="earn"><span>Câștigi</span><span className="num">+{earn} puncte · +1 stea</span></div>}
        </div>
        <button className="cta" onClick={placeOrder} disabled={sending || !settings?.accepting_orders}>
          {!settings?.accepting_orders ? "Nu preluăm comenzi acum" : sending ? "Se trimite…" : <>Trimite comanda · <span className="num">{lei(total)}</span></>}
        </button>
        {sendErr && <p className="err">{sendErr}</p>}
        <p className="fine">Plătești la livrare. Primești un link ca să urmărești comanda în timp real.</p>
      </>)}
    </div>
  );

  return (
    <div className="m-page">
      {/* ---------- top bar ---------- */}
      <header className="topbar" ref={topRef}>
        <div className="tb-in">
          <a className="brand" href="/" aria-label="Lyra · acasă"><img src="/img/logo-lyra.jpg" alt="Lyra Pensiune Restaurant" /></a>
          <div className="tb-hello"><small>{hello}{firstName ? `, ${firstName}` : ""}!</small>
            <div className="seg tb-mode" role="group" aria-label="Livrare sau ridicare">
              <button aria-pressed={mode === "livrare"} onClick={() => setMode("livrare")}>{t.deliv}</button>
              <button aria-pressed={mode === "ridicare"} onClick={() => setMode("ridicare")}>{t.pick}</button>
            </div>
          </div>
          <label className="tb-search"><Icon name="search" size={17} /><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t.search} aria-label="Caută în meniu" /></label>
          <button className="tb-ic" onClick={toggleTheme} aria-label={dark ? "Temă deschisă" : "Temă închisă"}><Icon name={dark ? "sun" : "moon"} size={18} /></button>
          <button className="tb-ic tb-lang" onClick={() => setLang(lang === "ro" ? "hu" : "ro")} aria-label="Schimbă limba">{lang === "ro" ? "RO" : "HU"}</button>
          <Link to="/cont" className="tb-club">{customer ? <><span className={`club-dot ${tier.cls}`} /><b className="num">{customer.points}</b><small>puncte</small></> : <><Icon name="star" size={16} fill /><b>Lyra Club</b></>}</Link>
        </div>
      </header>
      {settings && !settings.accepting_orders && <p className="closed">Restaurantul nu preia comenzi online în acest moment. Poți răsfoi meniul.</p>}

      <div className="shell">
        <main className="m-main">
          {!query && <>
            {/* ---------- stories: categories ---------- */}
            <nav className="stories" aria-label="Categorii">
              {visibleCats.map(c => {
                const img = CAT_IMG[c.id] || items.find(i => i.category_id === c.id && i.image)?.image;
                return (
                  <button key={c.id} className="story" onClick={() => jump(c.id)}>
                    <span className="story-ring">{img ? <img src={imgUrl(img)!} alt="" loading="lazy" /> : <i />}</span>
                    <span className="story-n">{catName(c)}</span>
                  </button>
                );
              })}
            </nav>

            {/* ---------- hero carousel ---------- */}
            {shownBanners.length > 0 && <section className="hero-wrap">
              <div className="hero-track" ref={heroRef} onScroll={e => { const el = e.currentTarget; setSlide(Math.round(el.scrollLeft / el.clientWidth)); }}>
                {shownBanners.map((bn, i) => (
                  <button key={bn.id} className="hero" onClick={() => bn.category_id && jump(bn.category_id)}
                    style={{ backgroundImage: bn.image ? `url(${imgUrl(bn.image)})` : undefined }}>
                    <div className="h-txt">
                      {bn.chip && <span className={`chip-hot ${i % 2 ? "alt" : ""}`}>{bn.chip}</span>}
                      {bn.title && <h2>{bn.title}</h2>}
                      {bn.body && <p className="h-lead">{bn.body}</p>}
                      {bn.cta && <span className="h-cta">{bn.cta} →</span>}
                    </div>
                  </button>
                ))}
              </div>
              {shownBanners.length > 1 && <div className="dots">{shownBanners.map((b, i) => <button key={b.id} aria-label={`Banner ${i + 1}`} aria-current={slide === i} onClick={() => heroRef.current?.scrollTo({ left: i * heroRef.current.clientWidth, behavior: "smooth" })} />)}</div>}
            </section>}

            {/* ---------- moods ---------- */}
            <section className="moods-wrap">
              <div className="sec-h"><h2>{t.mood}</h2></div>
              <div className="mood-chips">
                {MOODS.map(m => <button key={m.id} aria-pressed={mood === m.id} onClick={() => { setMood(m.id); haptic(6); }}>{L ? m.hu : m.ro}</button>)}
              </div>
              <div className="rail" key={mood}>
                {moodItems.map(it => (
                  <article key={it.id} className="rc" data-card>
                    <button className="rc-img" onClick={() => openItem(it)} aria-label={nm(it)}><img src={imgUrl(it.image)!} alt="" loading="lazy" /></button>
                    <div className="rc-body"><button className="pc-name" onClick={() => openItem(it)}><h3>{nm(it)}</h3></button>{buyRow(it)}</div>
                  </article>
                ))}
              </div>
            </section>
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
          <footer className="m-foot"><img src="/img/logo-lyra.jpg" alt="" /><p>Lyra · Pensiune Restaurant · Tradiții din 1999</p></footer>
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
                  {it.variants.map((v, i) => <button key={i} aria-pressed={sheet.vi === i} onClick={() => setSheet({ ...sheet, vi: i })}><b>{(L && v.lh) || v.l}</b><small className="num">{lei(v.p)} · {v.g}</small></button>)}
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
      {popup && (() => {
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
