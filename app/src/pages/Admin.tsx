import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Category, Item, Variant } from "../lib/types";
import { ALLERGENS, MEAT, TAGS, imgUrl, lei } from "../lib/format";
import Icon from "../components/Icon";
import { Login } from "./Reception";

type Draft = Omit<Item, "price"> & { price: string; isNew?: boolean };

const TAG_KEYS = ["new", "garn", "nogarn", "casa", "home", "coal", "smoker", "angus", "spicy", "veg", "post", "share"];

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/** Shrinks a photo in the browser before upload (max 1600 px, JPEG), so the site stays fast. */
async function resizeImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = url; });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, err) => c.toBlob(b => (b ? ok(b) : err(new Error("Poza nu a putut fi procesată."))), "image/jpeg", 0.86));
  } finally { URL.revokeObjectURL(url); }
}

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setRole(undefined); return; }
    supabase.from("staff").select("role").eq("user_id", session.user.id).maybeSingle().then(({ data }) => setRole(data?.role ?? null));
  }, [session]);

  if (!ready) return null;
  if (!session) return <Login title="Administrare meniu" />;
  if (role === undefined) return <div className="login"><p className="muted">Se verifică accesul…</p></div>;
  if (role !== "admin") return (
    <div className="login"><form onSubmit={e => { e.preventDefault(); supabase.auth.signOut(); }}>
      <img src="/img/logo-lyra.jpg" alt="Lyra" /><h1>Fără acces</h1>
      <p className="muted" style={{ textAlign: "center" }}>Contul {session.user.email} nu are drept de administrator. Pentru comenzi folosește <a href="/receptie">recepția</a>.</p>
      <button className="big ghost">Ieși din cont</button></form></div>
  );
  return <AdminPanel email={session.user.email || ""} />;
}

function AdminPanel({ email }: { email: string }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [catEdit, setCatEdit] = useState<Category | null>(null);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  async function load() {
    const [c, i] = await Promise.all([
      supabase.from("categories").select("*").order("sort"),
      supabase.from("items").select("*").order("sort"),
    ]);
    setCats((c.data || []) as Category[]);
    setItems((i.data || []) as Item[]);
  }
  useEffect(() => { load(); }, []);

  const catName = (id: string) => cats.find(c => c.id === id)?.name_ro || id;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter(i => (cat === "all" || i.category_id === cat) && (!s || `${i.name_ro} ${i.name_hu} ${i.num ?? ""}`.toLowerCase().includes(s)));
  }, [items, cat, q]);

  async function quick(it: Item, patch: Partial<Item>) {
    setItems(xs => xs.map(x => (x.id === it.id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("items").update(patch).eq("id", it.id);
    if (error) { flash("Nu s-a salvat: " + error.message); load(); }
  }
  function newItem() {
    const c = cat === "all" ? cats[0]?.id || "" : cat;
    const maxSort = Math.max(0, ...items.filter(i => i.category_id === c).map(i => i.sort));
    setDraft({ id: "", category_id: c, num: null, name_ro: "", name_hu: "", desc_ro: "", desc_hu: "", price: "", grams: "", allergens: [], meat: null, hot: false, tags: [], wine: null, image: null, variants: null, available: true, active: true, sort: maxSort + 10, isNew: true });
  }
  async function moveCat(c: Category, dir: -1 | 1) {
    const idx = cats.findIndex(x => x.id === c.id), other = cats[idx + dir];
    if (!other) return;
    await Promise.all([
      supabase.from("categories").update({ sort: other.sort }).eq("id", c.id),
      supabase.from("categories").update({ sort: c.sort }).eq("id", other.id),
    ]);
    load();
  }

  return (
    <div className="adm">
      <header className="adm-top">
        <img src="/img/logo-lyra.jpg" alt="Lyra" />
        <div className="adm-title"><b>Administrare meniu</b><small>{email}</small></div>
        <nav>
          <a className="rbtn" href="/" target="_blank" rel="noreferrer">Vezi site-ul ↗</a>
          <a className="rbtn" href="/receptie">Recepție</a>
          <button className="rbtn" onClick={() => supabase.auth.signOut()}><Icon name="logout" size={15} />Ieși</button>
        </nav>
      </header>

      <div className="adm-shell">
        <aside className="adm-cats">
          <p className="cp-lbl" style={{ marginTop: 0 }}>Categorii</p>
          <button className="adm-cat" aria-current={cat === "all"} onClick={() => setCat("all")}><span>Toate preparatele</span><i>{items.length}</i></button>
          {cats.map((c, i) => (
            <div key={c.id} className={`adm-cat-row ${c.active ? "" : "off"}`}>
              <button className="adm-cat" aria-current={cat === c.id} onClick={() => setCat(c.id)}>
                <span>{c.name_ro}</span><i>{items.filter(x => x.category_id === c.id).length}</i>
              </button>
              <span className="adm-cat-tools">
                <button onClick={() => moveCat(c, -1)} disabled={i === 0} aria-label="Mută sus">↑</button>
                <button onClick={() => moveCat(c, 1)} disabled={i === cats.length - 1} aria-label="Mută jos">↓</button>
                <button onClick={() => setCatEdit({ ...c })} aria-label="Editează categoria">✎</button>
              </span>
            </div>
          ))}
        </aside>

        <main className="adm-main">
          <div className="adm-bar">
            <h1>{cat === "all" ? "Toate preparatele" : catName(cat)}</h1>
            <label className="tb-search"><Icon name="search" size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Caută după nume sau număr…" aria-label="Caută" /></label>
            <button className="addbtn" onClick={newItem}>Preparat nou <span>+</span></button>
          </div>
          <p className="muted" style={{ margin: "0 0 14px", fontSize: 13.5 }}>Apasă pe un preparat ca să-i schimbi poza, prețul sau descrierea. Comutatoarele se salvează imediat.</p>

          <div className="adm-list">
            {list.map(it => (
              <div key={it.id} className={`adm-row ${it.active ? "" : "hidden-item"}`}>
                <button className="adm-thumb" onClick={() => setDraft({ ...it, price: String(it.price) })} aria-label={`Editează ${it.name_ro}`}>
                  {imgUrl(it.image) ? <img src={imgUrl(it.image)!} alt="" loading="lazy" /> : <span><Icon name="dish" size={22} /></span>}
                </button>
                <button className="adm-info" onClick={() => setDraft({ ...it, price: String(it.price) })}>
                  <b>{it.num != null && <em>{it.num}</em>}{it.name_ro}</b>
                  <small>{catName(it.category_id)} · {it.variants?.length ? it.variants.map(v => `${v.l} ${lei(v.p)}`).join(" / ") : lei(Number(it.price))}</small>
                </button>
                <label className="adm-sw"><span>Disponibil azi</span><button className="switch" role="switch" aria-checked={it.available} onClick={() => quick(it, { available: !it.available })} /></label>
                <label className="adm-sw"><span>Vizibil pe site</span><button className="switch" role="switch" aria-checked={it.active} onClick={() => quick(it, { active: !it.active })} /></label>
                <button className="mini" onClick={() => setDraft({ ...it, price: String(it.price) })}>Editează</button>
              </div>
            ))}
            {list.length === 0 && <p className="muted">Niciun preparat aici. Apasă „Preparat nou”.</p>}
          </div>
        </main>
      </div>

      {draft && <ItemEditor draft={draft} cats={cats} items={items} onClose={() => setDraft(null)} onSaved={m => { setDraft(null); load(); flash(m); }} />}
      {catEdit && <CategoryEditor c={catEdit} onClose={() => setCatEdit(null)} onSaved={() => { setCatEdit(null); load(); flash("Categoria a fost salvată."); }} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function ItemEditor({ draft: initial, cats, items, onClose, onSaved }: { draft: Draft; cats: Category[]; items: Item[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (p: Partial<Draft>) => setD(x => ({ ...x, ...p }));
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  const variants: Variant[] = d.variants || [];
  const img = imgUrl(d.image);

  async function upload(f: File) {
    setErr(""); setUploading(true);
    try {
      const blob = await resizeImage(f);
      const path = `${d.id || slug(d.name_ro) || "preparat"}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("menu").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      set({ image: supabase.storage.from("menu").getPublicUrl(path).data.publicUrl });
    } catch (e) {
      setErr("Poza nu a putut fi încărcată: " + (e instanceof Error ? e.message : String(e)));
    } finally { setUploading(false); }
  }

  async function save() {
    setErr("");
    const price = parseFloat(String(d.price).replace(",", "."));
    if (!d.name_ro.trim()) { setErr("Scrie numele preparatului."); return; }
    if (!variants.length && !(price >= 0)) { setErr("Scrie prețul (de ex. 45 sau 49.50)."); return; }
    if (variants.some(v => !v.l.trim() || !(v.p >= 0))) { setErr("Fiecare porție are nevoie de nume și preț."); return; }
    setBusy(true);
    const row = {
      category_id: d.category_id, num: d.num, name_ro: d.name_ro.trim(), name_hu: d.name_hu?.trim() || null,
      desc_ro: d.desc_ro?.trim() || null, desc_hu: d.desc_hu?.trim() || null,
      price: variants.length ? variants[0].p : price, grams: d.grams?.trim() || null, allergens: d.allergens, meat: d.meat || null,
      hot: d.hot, tags: d.tags, wine: d.wine?.trim() || null, image: d.image, variants: variants.length ? variants : null,
      available: d.available, active: d.active, sort: d.sort, updated_at: new Date().toISOString(),
    };
    let error;
    if (d.isNew) {
      let id = slug(d.name_ro) || "preparat";
      if (items.some(i => i.id === id)) id += "-" + Date.now().toString(36).slice(-4);
      ({ error } = await supabase.from("items").insert({ id, ...row }));
    } else {
      ({ error } = await supabase.from("items").update(row).eq("id", d.id));
    }
    setBusy(false);
    if (error) { setErr("Nu s-a salvat: " + error.message); return; }
    onSaved(d.isNew ? "Preparatul a fost adăugat pe site." : "Modificările sunt live pe site.");
  }

  async function remove() {
    setBusy(true);
    // dishes that already appear in orders are hidden, not deleted, so order history stays intact
    const { error } = await supabase.from("items").delete().eq("id", d.id);
    if (error) {
      await supabase.from("items").update({ active: false }).eq("id", d.id);
      setBusy(false); onSaved("Preparatul a fost ascuns de pe site."); return;
    }
    setBusy(false); onSaved("Preparatul a fost șters.");
  }

  const previewPrice = variants.length ? Math.min(...variants.map(v => v.p)) : parseFloat(String(d.price).replace(",", ".")) || 0;

  return (<>
    <div className="veil" onClick={onClose} />
    <aside className="adm-editor" role="dialog" aria-modal="true" aria-label="Editează preparatul">
      <div className="ae-head">
        <h2>{d.isNew ? "Preparat nou" : "Editează preparatul"}</h2>
        <button className="cp-x" style={{ display: "grid" }} onClick={onClose} aria-label="Închide">×</button>
      </div>

      <div className="ae-grid">
        <div className="ae-form">
          <p className="cp-lbl">Poza</p>
          <div className="ae-photo">
            {img ? <img src={img} alt="" /> : <div className="ae-nophoto"><Icon name="dish" size={34} /><span>Fără poză</span></div>}
            <div className="ae-photo-btns">
              <button className="addbtn" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "Se încarcă…" : img ? "Schimbă poza" : "Încarcă poza"}</button>
              {img && <button className="mini" onClick={() => set({ image: null })}>Scoate poza</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          </div>
          <p className="ae-hint">Merge orice poză din telefon sau calculator. O micșorăm automat, ca site-ul să rămână rapid.</p>

          <p className="cp-lbl">Nume și descriere</p>
          <div className="fields">
            <label className="fl wide"><span>Nume (română)</span><input value={d.name_ro} onChange={e => set({ name_ro: e.target.value })} placeholder="Ex: Ciolan à la Lyra" /></label>
            <label className="fl wide"><span>Nume (maghiară) <i>opțional</i></span><input value={d.name_hu || ""} onChange={e => set({ name_hu: e.target.value })} /></label>
            <label className="fl wide"><span>Descriere (română)</span><textarea rows={3} value={d.desc_ro || ""} onChange={e => set({ desc_ro: e.target.value })} placeholder="Ingrediente, cum e servit…" /></label>
            <label className="fl wide"><span>Descriere (maghiară) <i>opțional</i></span><textarea rows={2} value={d.desc_hu || ""} onChange={e => set({ desc_hu: e.target.value })} /></label>
          </div>

          <p className="cp-lbl">Preț și categorie</p>
          <div className="fields">
            {!variants.length && <label className="fl"><span>Preț (lei)</span><input inputMode="decimal" value={d.price} onChange={e => set({ price: e.target.value })} placeholder="45.00" /></label>}
            <label className="fl"><span>Gramaj</span><input value={d.grams || ""} onChange={e => set({ grams: e.target.value })} placeholder="300 gr" /></label>
            <label className="fl"><span>Categorie</span>
              <select value={d.category_id} onChange={e => set({ category_id: e.target.value })}>{cats.map(c => <option key={c.id} value={c.id}>{c.name_ro}</option>)}</select></label>
            <label className="fl"><span>Nr. în meniu <i>opțional</i></span><input inputMode="numeric" value={d.num ?? ""} onChange={e => set({ num: e.target.value ? parseInt(e.target.value) || null : null })} /></label>
          </div>

          <p className="cp-lbl">Porții diferite <i style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>(ex. porție întreagă / medie)</i></p>
          {variants.map((v, i) => (
            <div key={i} className="ae-var">
              <input value={v.l} onChange={e => set({ variants: variants.map((x, j) => j === i ? { ...x, l: e.target.value } : x) })} placeholder="Porție medie" aria-label="Nume porție" />
              <input inputMode="decimal" value={Number.isNaN(v.p) ? "" : v.p} onChange={e => set({ variants: variants.map((x, j) => j === i ? { ...x, p: parseFloat(e.target.value.replace(",", ".")) } : x) })} placeholder="Preț" aria-label="Preț porție" />
              <input value={v.g} onChange={e => set({ variants: variants.map((x, j) => j === i ? { ...x, g: e.target.value } : x) })} placeholder="200 gr" aria-label="Gramaj porție" />
              <button className="mini" onClick={() => set({ variants: variants.filter((_, j) => j !== i) })} aria-label="Șterge porția">×</button>
            </div>
          ))}
          <button className="mini" onClick={() => set({ variants: [...(variants.length ? variants : [{ l: "Porție întreagă", p: parseFloat(d.price) || 0, g: d.grams || "" }]), { l: "", p: NaN, g: "" }] })}>+ Adaugă o porție</button>

          <p className="cp-lbl">Alergeni</p>
          <div className="chips">{Object.keys(ALLERGENS).map(a => <button key={a} className="chip" aria-pressed={d.allergens.includes(a)} onClick={() => set({ allergens: toggle(d.allergens, a) })}><Icon name={a} size={13} /> {ALLERGENS[a][0]}</button>)}</div>

          <p className="cp-lbl">Etichete</p>
          <div className="chips">
            <button className="chip" aria-pressed={d.hot} onClick={() => set({ hot: !d.hot })}>Tigaie fierbinte</button>
            {TAG_KEYS.map(t => <button key={t} className="chip" aria-pressed={d.tags.includes(t)} onClick={() => set({ tags: toggle(d.tags, t) })}>{TAGS[t][0]}</button>)}
          </div>

          <p className="cp-lbl">Altele</p>
          <div className="fields">
            <label className="fl"><span>Tip de carne</span><select value={d.meat || ""} onChange={e => set({ meat: e.target.value || null })}><option value="">—</option>{Object.keys(MEAT).map(m => <option key={m} value={m}>{MEAT[m][0]}</option>)}</select></label>
            <label className="fl"><span>Vin recomandat <i>opțional</i></span><input value={d.wine || ""} onChange={e => set({ wine: e.target.value })} placeholder="Fetească Regală Pivnița Savu" /></label>
          </div>
          <div className="ae-sws">
            <label className="adm-sw"><span>Disponibil azi</span><button className="switch" role="switch" aria-checked={d.available} onClick={() => set({ available: !d.available })} /></label>
            <label className="adm-sw"><span>Vizibil pe site</span><button className="switch" role="switch" aria-checked={d.active} onClick={() => set({ active: !d.active })} /></label>
          </div>
        </div>

        <div className="ae-side">
          <p className="cp-lbl" style={{ marginTop: 0 }}>Așa apare pe site</p>
          <article className="pc">
            {img && <div className="pc-img"><img src={img} alt="" /><span className="pc-badges">{d.tags.includes("new") && <span className="b b-new">Nou</span>}{d.hot && <span className="b b-hot"><Icon name="flame" size={12} fill />Tigaie fierbinte</span>}</span></div>}
            <div className="pc-body">
              <h3 className="pc-name" style={{ fontFamily: "var(--f-display)", fontSize: 19, letterSpacing: "-.02em" }}>{d.name_ro || "Numele preparatului"}</h3>
              {d.desc_ro && <p className="pc-desc">{d.desc_ro}</p>}
              <div className="pc-meta"><span className="gr">{variants[0]?.g || d.grams}</span><span className="al">{d.allergens.map(a => <i key={a}><Icon name={a} size={11} /></i>)}</span></div>
              <div className="pc-foot"><span className="price num">{variants.length > 0 && <small>de la </small>}{lei(previewPrice)}</span><span className="addbtn">Adaugă <span>+</span></span></div>
            </div>
          </article>
        </div>
      </div>

      {err && <p className="err">{err}</p>}
      <div className="ae-foot">
        {!d.isNew && (confirmDel
          ? <span className="ae-del"><b>Sigur ștergi „{d.name_ro}”?</b><button className="mini danger" onClick={remove} disabled={busy}>Da, șterge</button><button className="mini" onClick={() => setConfirmDel(false)}>Nu</button></span>
          : <button className="mini danger" onClick={() => setConfirmDel(true)}>Șterge preparatul</button>)}
        <span style={{ flex: 1 }} />
        <button className="mini" onClick={onClose}>Anulează</button>
        <button className="cta" style={{ width: "auto", padding: "14px 26px" }} onClick={save} disabled={busy || uploading}>{busy ? "Se salvează…" : "Salvează"}</button>
      </div>
    </aside>
  </>);
}

function CategoryEditor({ c: initial, onClose, onSaved }: { c: Category; onClose: () => void; onSaved: () => void }) {
  const [c, setC] = useState(initial);
  const [err, setErr] = useState("");
  async function save() {
    if (!c.name_ro.trim()) { setErr("Scrie numele categoriei."); return; }
    const { error } = await supabase.from("categories").update({ name_ro: c.name_ro.trim(), name_hu: c.name_hu?.trim() || null, note_ro: c.note_ro?.trim() || null, note_hu: c.note_hu?.trim() || null, active: c.active }).eq("id", c.id);
    if (error) { setErr("Nu s-a salvat: " + error.message); return; }
    onSaved();
  }
  return (<>
    <div className="veil" onClick={onClose} />
    <div className="sheet modal" role="dialog" aria-modal="true" style={{ width: "min(520px, calc(100% - 32px))", padding: 24 }}>
      <div className="ae-head"><h2>Categoria „{initial.name_ro}”</h2><button className="cp-x" style={{ display: "grid" }} onClick={onClose} aria-label="Închide">×</button></div>
      <div className="fields" style={{ marginTop: 14 }}>
        <label className="fl wide"><span>Nume (română)</span><input value={c.name_ro} onChange={e => setC({ ...c, name_ro: e.target.value })} /></label>
        <label className="fl wide"><span>Nume (maghiară)</span><input value={c.name_hu || ""} onChange={e => setC({ ...c, name_hu: e.target.value })} /></label>
        <label className="fl wide"><span>Notă sub titlu <i>opțional</i></span><input value={c.note_ro || ""} onChange={e => setC({ ...c, note_ro: e.target.value })} placeholder="Ex: Între orele 10–21" /></label>
      </div>
      <div className="ae-sws"><label className="adm-sw"><span>Vizibilă pe site</span><button className="switch" role="switch" aria-checked={c.active} onClick={() => setC({ ...c, active: !c.active })} /></label></div>
      {err && <p className="err">{err}</p>}
      <div className="ae-foot"><span style={{ flex: 1 }} /><button className="mini" onClick={onClose}>Anulează</button><button className="cta" style={{ width: "auto", padding: "14px 26px" }} onClick={save}>Salvează</button></div>
    </div>
  </>);
}
