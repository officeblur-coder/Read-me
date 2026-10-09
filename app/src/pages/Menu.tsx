import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { CartLine, Category, Item, Promo, Settings } from "../lib/types";
import { ALLERGENS, MEAT, TAGS, imgUrl, lei, rememberOrder } from "../lib/format";
import Icon from "../components/Icon";

type Lang = "ro" | "hu";
type Sheet = { kind: "item"; id: string; qty: number; vi: number; extras: string[]; note: string } | { kind: "cart" } | null;
type CodeInfo = { code: string; percent: number; category_id: string | null; label: string };

const EXTRA_IDS = {
  burger: ["cartofi", "special-fries", "sosul-casei"],
  main: ["mujdei", "sos-usturoi", "smantana", "ardei-iute"],
  desert: ["smantana"],
};
const MAIN_CATS = ["nou", "specialitati", "porc", "ardeal", "pui", "peste", "post", "dejun", "platouri", "vegetariene"];
const UPSELL = ["sosul-casei", "mujdei", "muraturi", "papanas", "lapte-pasare", "ardei-iute", "cartofi"];

const T = {
  ro: { deliv: "Livrare", pick: "Ridicare", search: "Caută: ciolan, papanaș, burger…", add: "Adaugă", from: "de la", out: "Epuizat azi",
        cart: "Vezi coșul", hot: "Servit în tigaie fierbinte", portion: "Alege porția", extras: "Completează", note: "Mențiuni pentru bucătărie",
        notePh: "Ex: fără ceapă, sosul separat", wine: "Potrivit cu vin" },
  hu: { deliv: "Kiszállítás", pick: "Elvitel", search: "Keresés: csülök, túrógombóc, burger…", add: "Hozzáad", from: "ártól", out: "Ma elfogyott",
        cart: "Kosár", hot: "Forró serpenyőben tálalva", portion: "Válassz adagot", extras: "Egészítsd ki", note: "Megjegyzés a konyhának",
        notePh: "Pl. hagyma nélkül, szósz külön", wine: "Ajánlott bor" },
};

function loadCart(): CartLine[] {
  try { return JSON.parse(localStorage.getItem("lyra-cart") || "[]"); } catch { return []; }
}
function loadForm() {
  try { return { name: "", phone: "", email: "", address: "", ...JSON.parse(localStorage.getItem("lyra-form") || "{}") }; }
  catch { return { name: "", phone: "", email: "", address: "" }; }
}

export default function Menu({ source }: { source?: string }) {
  const nav = useNavigate();
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [, setPromos] = useState<Promo[]>([]);
  const [loadErr, setLoadErr] = useState("");
  const [lang, setLang] = useState<Lang>("ro");
  const [mode, setMode] = useState<"livrare" | "ridicare">("livrare");
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState("");
  const [cart, setCart] = useState<CartLine[]>(loadCart);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [popup, setPopup] = useState<Promo | null>(null);
  const [form, setForm] = useState(loadForm);
  const [orderNote, setOrderNote] = useState("");
  const [pay, setPay] = useState<"card" | "cash">("card");
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState<CodeInfo | null>(null);
  const [codeMsg, setCodeMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const catsRef = useRef<HTMLElement>(null);
  const t = T[lang];

  // ---- data ----
  async function load() {
    const [c, i, s, p] = await Promise.all([
      supabase.from("categories").select("*").eq("active", true).order("sort"),
      supabase.from("items").select("*").eq("active", true).order("sort"),
      supabase.from("settings").select("*").eq("id", 1).single(),
      supabase.from("promos").select("*").eq("active", true).order("created_at", { ascending: false }),
    ]);
    if (c.error || i.error) { setLoadErr("Meniul nu s-a putut încărca. Verifică conexiunea și reîncarcă pagina."); return; }
    setCats(c.data as Category[]);
    setItems(i.data as Item[]);
    if (s.data) setSettings(s.data as Settings);
    if (p.data) setPromos(p.data as Promo[]);
    setActiveCat((c.data as Category[])[0]?.id || "");
    return p.data as Promo[] | null;
  }
  useEffect(() => {
    load().then(ps => {
      let seen = false;
      try { seen = sessionStorage.getItem("lyra-popup") === "1"; } catch { /* ignore */ }
      const first = ps?.find(x => x.popup);
      if (first && !seen) setTimeout(() => setPopup(first), 1200);
    });
    // live updates: sold-out items, opening hours, promos pushed from reception
    const ch = supabase.channel("menu-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => { load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => { load(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "promos" }, payload => {
        const p = payload.new as Promo;
        load();
        if (p.active && p.pushed_at && Date.now() - new Date(p.pushed_at).getTime() < 60000) setPopup(p);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  useEffect(() => { try { localStorage.setItem("lyra-cart", JSON.stringify(cart)); } catch { /* ignore */ } }, [cart]);
  useEffect(() => { try { localStorage.setItem("lyra-form", JSON.stringify(form)); } catch { /* ignore */ } }, [form]);

  const byId = useMemo(() => Object.fromEntries(items.map(x => [x.id, x])), [items]);
  const nm = (it: Item) => (lang === "hu" && it.name_hu) || it.name_ro;
  const ds = (it: Item) => (lang === "hu" && it.desc_hu) || it.desc_ro || "";
  const catName = (c: Category) => (lang === "hu" && c.name_hu) || c.name_ro;

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
  const fee = mode === "livrare" && settings && sub > 0 && sub < settings.free_delivery_over ? settings.delivery_fee : 0;
  const total = Math.max(0, sub - disc + fee);
  const count = validCart.reduce((s, l) => s + l.qty, 0);
  const qtyOf = (id: string) => validCart.filter(l => l.id === id && !l.promo).reduce((s, l) => s + l.qty, 0);

  function addLine(line: Omit<CartLine, "key">) {
    const key = [line.id, line.vi ?? "", [...line.extras].sort().join(","), line.note, line.promo ?? ""].join("|");
    setCart(c => {
      const ex = c.find(l => l.key === key);
      return ex ? c.map(l => (l.key === key ? { ...l, qty: l.qty + line.qty } : l)) : [...c, { ...line, key }];
    });
  }
  function quickAdd(it: Item) {
    if (it.variants?.length) { setSheet({ kind: "item", id: it.id, qty: 1, vi: 0, extras: [], note: "" }); return; }
    addLine({ id: it.id, qty: 1, extras: [], note: "" });
  }
  function dec(id: string) {
    setCart(c => {
      const idx = c.map(l => l.id === id && !l.promo).lastIndexOf(true);
      if (idx < 0) return c;
      const l = c[idx];
      return l.qty > 1 ? c.map((x, i) => (i === idx ? { ...x, qty: x.qty - 1 } : x)) : c.filter((_, i) => i !== idx);
    });
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
        note: orderNote, code: code?.code || "", source: source || new URLSearchParams(location.search).get("s") || "site",
        items: validCart.map(l => ({ id: l.id, qty: l.qty, vi: l.vi, extras: l.extras, note: l.note, promo: l.promo })),
      },
    });
    setSending(false);
    if (error) { setSendErr(error.message || "Comanda nu a putut fi trimisă. Încearcă din nou."); return; }
    const res = data as { token: string; number: number };
    rememberOrder(res.token, res.number);
    setCart([]); setSheet(null); setOrderNote(""); setCode(null); setCodeInput(""); setCodeMsg("");
    nav("/comanda/" + res.token);
  }

  // ---- category highlight on scroll ----
  useEffect(() => {
    const onScroll = () => {
      const secs = Array.from(document.querySelectorAll<HTMLElement>("[data-sec]"));
      let cur = secs[0]?.dataset.sec || "";
      for (const s of secs) if (s.getBoundingClientRect().top < 120) cur = s.dataset.sec || cur;
      setActiveCat(prev => (prev === cur ? prev : cur));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const el = catsRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    if (el && catsRef.current) catsRef.current.scrollTo({ left: el.offsetLeft - 40, behavior: "smooth" });
  }, [activeCat]);
  const jump = (id: string) => {
    const el = document.getElementById("sec-" + id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 56, behavior: "smooth" });
  };

  const query = q.trim().toLowerCase();
  const match = (it: Item) => !query || `${it.name_ro} ${it.name_hu} ${it.desc_ro}`.toLowerCase().includes(query);
  const h = new Date().getHours();
  const hello = lang === "hu" ? (h < 11 ? "Jó reggelt" : h < 18 ? "Jó napot" : "Jó estét") : (h < 11 ? "Bună dimineața" : h < 18 ? "Bună ziua" : "Bună seara");

  if (loadErr) return <div className="app"><p className="closed">{loadErr}</p></div>;

  return (
    <div className="app">
      <header className="c-head">
        <div className="c-row">
          <div className="c-logo"><img src="/img/logo-lyra.jpg" alt="Lyra Pensiune Restaurant" /><span>COMENZI</span></div>
          <button className="lang" onClick={() => setLang(lang === "ro" ? "hu" : "ro")} aria-label="Schimbă limba">{lang === "ro" ? "RO · hu" : "ro · HU"}</button>
        </div>
        <div className="mode" role="group" aria-label="Livrare sau ridicare">
          <button aria-pressed={mode === "livrare"} onClick={() => setMode("livrare")}>{t.deliv}</button>
          <button aria-pressed={mode === "ridicare"} onClick={() => setMode("ridicare")}>{t.pick}</button>
        </div>
      </header>
      {settings && !settings.accepting_orders && <p className="closed">Restaurantul nu preia comenzi online în acest moment. Poți răsfoi meniul.</p>}

      <div className="c-body">
        <h1 className="hello">{hello}! <em>{lang === "hu" ? "Mire van kedved?" : "Ce poftă ai azi?"}</em></h1>
        {byId["spicy-smash"] && (
          <button className="hero" onClick={() => jump("smash")}>
            <div className="h-txt"><div className="k">{lang === "hu" ? "Újdonság" : "Nou"} · by Lyra</div><h3>New Smash<br />Burgers</h3>
              <p>{lang === "hu" ? "25 leitől" : "De la 25 lei"}</p><span className="cta">{lang === "hu" ? "Megnézem" : "Descoperă"} →</span></div>
            <img className="h-photo" src="/img/spicy-smash.jpg" alt="" />
          </button>
        )}
        <label className="search"><Icon name="search" size={16} /><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t.search} aria-label="Caută în meniu" /></label>

        <nav className="cats" ref={catsRef}>
          {cats.filter(c => items.some(i => i.category_id === c.id)).map(c => (
            <button key={c.id} className="cat" aria-current={activeCat === c.id} onClick={() => jump(c.id)}>{catName(c)}</button>
          ))}
        </nav>

        {cats.map(c => {
          const list = items.filter(i => i.category_id === c.id && match(i));
          if (!list.length) return null;
          return (
            <section key={c.id} className="sec" id={"sec-" + c.id} data-sec={c.id}>
              <div className="sec-h"><h2>{catName(c)}</h2><span>{lang === "hu" ? c.name_ro : c.name_hu}</span></div>
              {(lang === "hu" ? c.note_hu : c.note_ro) && <p className="sec-note">{lang === "hu" ? c.note_hu : c.note_ro}</p>}
              {list.map(it => {
                const qn = qtyOf(it.id), out = !it.available, img = imgUrl(it.image);
                return (
                  <article key={it.id} className={`it ${img ? "" : "noimg"} ${out ? "out" : ""}`}>
                    {img && <button className="it-img" onClick={() => setSheet({ kind: "item", id: it.id, qty: 1, vi: 0, extras: [], note: "" })} aria-label={nm(it)}>
                      <img src={img} alt="" loading="lazy" />{it.hot && <span className="flame" title={t.hot}><Icon name="flame" size={14} fill /></span>}
                    </button>}
                    <div className="it-body">
                      <button className="it-open" onClick={() => setSheet({ kind: "item", id: it.id, qty: 1, vi: 0, extras: [], note: "" })}>
                        <div className="it-t">{it.num != null && <span className="it-no">{it.num}</span>}<h4>{nm(it)}</h4></div>
                        {ds(it) && <p>{ds(it)}</p>}
                      </button>
                      <div className="it-meta">
                        <span className="gr">{it.variants?.[0]?.g || it.grams}</span>
                        <span className="al">{it.allergens.map(a => <i key={a} title={ALLERGENS[a]?.[0]}><Icon name={a} size={11} /></i>)}</span>
                        {it.tags.includes("new") && <span className="tag">{lang === "hu" ? "Új" : "Nou"}</span>}
                        {it.tags.includes("post") && <span className="tag green">{TAGS.post[lang === "hu" ? 1 : 0]}</span>}
                        {it.tags.includes("veg") && <span className="tag green">{TAGS.veg[lang === "hu" ? 1 : 0]}</span>}
                        {out && <span className="tag red">{t.out}</span>}
                      </div>
                      <div className="it-foot">
                        <span className="price num">{it.variants?.length ? <><small>{t.from} </small>{lei(Math.min(...it.variants.map(v => v.p)))}</> : lei(it.price)}</span>
                        {out ? <button className="add" disabled aria-label={t.out}>+</button>
                          : qn && !it.variants?.length ? <span className="step"><button onClick={() => dec(it.id)} aria-label="Mai puțin">−</button><b className="num">{qn}</b><button onClick={() => quickAdd(it)} aria-label="Mai mult">+</button></span>
                          : <button className="add" onClick={() => quickAdd(it)} aria-label={`${t.add} ${nm(it)}`}>+</button>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>

      {count > 0 && !sheet && (
        <button className="fab" onClick={() => setSheet({ kind: "cart" })}><span className="q">{count}</span><span>{t.cart}</span><b className="num">{lei(sub)}</b></button>
      )}

      {sheet?.kind === "item" && byId[sheet.id] && (() => {
        const it = byId[sheet.id], L = lang === "hu" ? 1 : 0, img = imgUrl(it.image), exs = extrasFor(it);
        const unit = baseOf(it, sheet.vi) + sheet.extras.reduce((s, k) => s + (byId[k]?.price || 0), 0);
        return (<>
          <div className="veil" onClick={() => setSheet(null)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label={nm(it)}>
            {img ? <div className="d-img"><img src={img} alt="" /></div> : <div className="grab" />}
            <button className="sh-close" onClick={() => setSheet(null)} aria-label="Închide">×</button>
            <div className="sh-pad">
              <h2 className="d-name">{nm(it)}</h2>
              <p className="d-hu">{L ? it.name_ro : it.name_hu}</p>
              {ds(it) && <p className="d-desc">{ds(it)}</p>}
              <div className="facts">
                <span className="fact">{it.variants?.[sheet.vi]?.g || it.grams}</span>
                {it.hot && <span className="fact hot"><Icon name="flame" size={13} fill />{t.hot}</span>}
                {it.tags.filter(x => TAGS[x] && x !== "new").map(x => <span key={x} className="fact">{TAGS[x][L]}</span>)}
                {it.meat && MEAT[it.meat] && <span className="fact">{MEAT[it.meat][L]}</span>}
              </div>
              {it.allergens.length > 0 && <div className="facts">{it.allergens.map(a => <span key={a} className="fact"><Icon name={a} size={13} />{ALLERGENS[a]?.[L]}</span>)}</div>}
              {it.wine && <div className="wine"><Icon name="wine" size={22} /><div>{t.wine} <b>{it.wine}</b></div></div>}
              {it.variants?.length ? <><p className="lbl">{t.portion}</p><div className="chips">
                {it.variants.map((v, i) => <button key={i} className="chip" aria-pressed={sheet.vi === i} onClick={() => setSheet({ ...sheet, vi: i })}>{(L && v.lh) || v.l} · {lei(v.p)}</button>)}
              </div></> : null}
              {exs.length > 0 && <><p className="lbl">{t.extras}</p>{exs.map(e => (
                <label key={e.id} className="opt"><input type="checkbox" checked={sheet.extras.includes(e.id)}
                  onChange={ev => setSheet({ ...sheet, extras: ev.target.checked ? [...sheet.extras, e.id] : sheet.extras.filter(k => k !== e.id) })} />
                  <span>{nm(e)}</span><b className="num">+{lei(e.price)}</b></label>))}</>}
              <p className="lbl">{t.note}</p>
              <textarea rows={2} value={sheet.note} placeholder={t.notePh} onChange={e => setSheet({ ...sheet, note: e.target.value })} />
              <div className="row-btw" style={{ marginTop: 16 }}>
                <span className="step"><button onClick={() => setSheet({ ...sheet, qty: Math.max(1, sheet.qty - 1) })} aria-label="Mai puțin">−</button><b className="num">{sheet.qty}</b><button onClick={() => setSheet({ ...sheet, qty: sheet.qty + 1 })} aria-label="Mai mult">+</button></span>
                <button className="big" style={{ width: "auto", flex: 1 }} disabled={!it.available}
                  onClick={() => { addLine({ id: it.id, qty: sheet.qty, vi: it.variants?.length ? sheet.vi : undefined, extras: sheet.extras, note: sheet.note.trim() }); setSheet(null); }}>
                  {it.available ? <>{t.add} · <span className="num">{lei(unit * sheet.qty)}</span></> : t.out}
                </button>
              </div>
            </div>
          </div>
        </>);
      })()}

      {sheet?.kind === "cart" && (<>
        <div className="veil" onClick={() => setSheet(null)} />
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Coșul tău">
          <div className="grab" /><button className="sh-close" onClick={() => setSheet(null)} aria-label="Închide">×</button>
          <div className="sh-pad">
            <h2 className="d-name" style={{ margin: "0 0 4px" }}>Coșul tău</h2>
            {validCart.length === 0 && <p className="muted">Coșul e gol.</p>}
            {validCart.map(l => {
              const it = byId[l.id], img = imgUrl(it.image);
              const info = [l.vi != null && it.variants ? it.variants[l.vi]?.l : "", ...l.extras.map(k => "+ " + (byId[k] ? nm(byId[k]) : k)), l.promoTitle ? "Ofertă: " + l.promoTitle : "", l.note ? `„${l.note}”` : ""].filter(Boolean).join(" · ");
              return (
                <div key={l.key} className="cl">{img ? <img src={img} alt="" /> : <span className="ph" />}
                  <div><b>{nm(it)}</b>{info && <small>{info}</small>}<span className="p num">{lei(unitOf(l) * l.qty)}</span></div>
                  <span className="step">
                    <button onClick={() => setCart(c => c.flatMap(x => x.key !== l.key ? [x] : x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []))} aria-label="Mai puțin">−</button>
                    <b className="num">{l.qty}</b>
                    <button onClick={() => setCart(c => c.map(x => x.key === l.key ? { ...x, qty: x.qty + 1 } : x))} aria-label="Mai mult">+</button>
                  </span>
                </div>
              );
            })}
            {(() => {
              const ups = UPSELL.filter(id => byId[id] && byId[id].available && !validCart.some(l => l.id === id)).slice(0, 5);
              return ups.length > 0 && <><p className="lbl">Merge perfect alături</p><div className="ups">{ups.map(id => {
                const it = byId[id], img = imgUrl(it.image);
                return <button key={id} className="up" onClick={() => quickAdd(it)}>{img ? <img src={img} alt="" /> : <span className="ph" />}{nm(it)} <em className="num">+{lei(it.price)}</em></button>;
              })}</div></>;
            })()}

            <p className="lbl">Livrare</p>
            <div className="mode" style={{ marginTop: 0 }}>
              <button aria-pressed={mode === "livrare"} onClick={() => setMode("livrare")}>{t.deliv}</button>
              <button aria-pressed={mode === "ridicare"} onClick={() => setMode("ridicare")}>{t.pick}</button>
            </div>
            {mode === "livrare" && settings && (sub < settings.free_delivery_over
              ? <><p className="note-ok">Mai adaugă <b className="num">{lei(settings.free_delivery_over - sub)}</b> pentru livrare gratuită.</p><div className="prog"><i style={{ width: `${Math.min(100, (sub / settings.free_delivery_over) * 100)}%` }} /></div></>
              : <p className="note-ok"><b>Livrarea e gratuită</b> pentru comanda ta.</p>)}
            <div className="grid2" style={{ marginTop: 10 }}>
              <input className="in" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nume" aria-label="Nume" autoComplete="name" />
              <input className="in" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Telefon" aria-label="Telefon" inputMode="tel" autoComplete="tel" />
            </div>
            {mode === "livrare" && <input className="in" style={{ marginTop: 8 }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Adresa de livrare" aria-label="Adresa de livrare" autoComplete="street-address" />}
            <input className="in" style={{ marginTop: 8 }} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email (opțional, pentru puncte Lyra Club)" aria-label="Email" inputMode="email" autoComplete="email" />
            <textarea rows={2} style={{ marginTop: 8 }} value={orderNote} onChange={e => setOrderNote(e.target.value)} placeholder="Mențiuni pentru curier sau bucătărie" />

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input className="in" value={codeInput} onChange={e => setCodeInput(e.target.value)} placeholder="Cod promoțional" aria-label="Cod promoțional" style={{ textTransform: "uppercase" }} />
              <button className="mini" onClick={applyCode}>Aplică</button>
            </div>
            {codeMsg && <p className="note-ok">{codeMsg}</p>}

            <p className="lbl">Plata</p>
            <div className="chips">
              <button className="chip" aria-pressed={pay === "card"} onClick={() => setPay("card")}>Card la livrare</button>
              <button className="chip" aria-pressed={pay === "cash"} onClick={() => setPay("cash")}>Numerar</button>
            </div>

            <div className="sum">
              <div><span>Produse</span><span className="num">{lei(sub)}</span></div>
              {disc > 0 && <div className="neg"><span>{code?.label}</span><span className="num">−{lei(disc)}</span></div>}
              {mode === "livrare" && <div><span>Livrare</span><span className="num">{fee ? lei(fee) : "gratuit"}</span></div>}
              <div className="tot"><span>Total</span><span className="num">{lei(total)}</span></div>
            </div>
            <button className="big" onClick={placeOrder} disabled={sending || !validCart.length || !settings?.accepting_orders}>
              {!settings?.accepting_orders ? "Restaurantul nu preia comenzi acum" : sending ? "Se trimite…" : <>Trimite comanda · <span className="num">{lei(total)}</span></>}
            </button>
            {sendErr && <p className="err">{sendErr}</p>}
          </div>
        </div>
      </>)}

      {popup && (() => {
        const it = popup.item_id ? byId[popup.item_id] : undefined;
        const old = it ? it.price + popup.extras.reduce((s, k) => s + (byId[k]?.price || 0), 0) : 0;
        const close = () => { setPopup(null); try { sessionStorage.setItem("lyra-popup", "1"); } catch { /* ignore */ } };
        return (
          <div className="pop" role="dialog" aria-modal="true" aria-label={popup.title} onClick={e => e.target === e.currentTarget && close()}>
            <div className="pop-card">
              <div className="pi"><span className="ribbon">{popup.kicker || "Ofertă"}</span>{imgUrl(popup.image) && <img src={imgUrl(popup.image)!} alt="" />}<button className="sh-close" onClick={close} aria-label="Închide">×</button></div>
              <div className="pb">
                <h3>{popup.title}</h3>{popup.body && <p>{popup.body}</p>}
                {popup.price != null && it && <div className="pp num">{lei(popup.price)}{old > popup.price && <s>{lei(old)}</s>}</div>}
                {popup.code && <div className="codebox">{popup.code}</div>}
                <button className="big" onClick={() => {
                  if (popup.price != null && it) { addLine({ id: it.id, qty: 1, extras: [], note: "", promo: popup.id, promoPrice: popup.price, promoTitle: popup.title }); close(); setSheet({ kind: "cart" }); }
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
