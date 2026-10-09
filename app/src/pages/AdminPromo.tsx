import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Banner, Category, Item, Promo } from "../lib/types";
import { imgUrl, lei } from "../lib/format";
import Icon from "../components/Icon";
import { uploadImage } from "../lib/upload";

type Flash = (m: string) => void;
type Code = { code: string; percent: number; category_id: string | null; label: string; active: boolean };

/** datetime-local <-> ISO helpers (the input works in the browser's local time) */
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

function PhotoPicker({ value, onChange, prefix, hint }: { value: string | null; onChange: (v: string | null) => void; prefix: string; hint?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const img = imgUrl(value);
  return (
    <>
      <div className="ae-photo">
        {img ? <img src={img} alt="" /> : <div className="ae-nophoto"><Icon name="dish" size={34} /><span>Fără poză</span></div>}
        <div className="ae-photo-btns">
          <button className="addbtn" disabled={busy} onClick={() => ref.current?.click()}>{busy ? "Se încarcă…" : img ? "Schimbă poza" : "Încarcă poza"}</button>
          {img && <button className="mini" onClick={() => onChange(null)}>Scoate poza</button>}
        </div>
        <input ref={ref} type="file" accept="image/*" hidden onChange={async e => {
          const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
          setBusy(true); setErr("");
          try { onChange(await uploadImage(f, prefix)); } catch (x) { setErr("Poza nu a putut fi încărcată: " + (x instanceof Error ? x.message : String(x))); }
          setBusy(false);
        }} />
      </div>
      {hint && <p className="ae-hint">{hint}</p>}
      {err && <p className="err">{err}</p>}
    </>
  );
}

function Drawer({ title, onClose, children, foot }: { title: string; onClose: () => void; children: React.ReactNode; foot: React.ReactNode }) {
  return (<>
    <div className="veil" onClick={onClose} />
    <aside className="adm-editor" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ae-head"><h2>{title}</h2><button className="cp-x" style={{ display: "grid" }} onClick={onClose} aria-label="Închide">×</button></div>
      {children}
      <div className="ae-foot">{foot}</div>
    </aside>
  </>);
}

/* ============================== BANNERE ============================== */
export function BannersTab({ cats, flash }: { cats: Category[]; flash: Flash }) {
  const [list, setList] = useState<Banner[]>([]);
  const [edit, setEdit] = useState<(Banner & { isNew?: boolean }) | null>(null);
  const load = async () => { const { data } = await supabase.from("banners").select("*").order("sort"); setList((data || []) as Banner[]); };
  useEffect(() => { load(); }, []);

  async function move(b: Banner, dir: -1 | 1) {
    const i = list.findIndex(x => x.id === b.id), o = list[i + dir]; if (!o) return;
    await Promise.all([supabase.from("banners").update({ sort: o.sort }).eq("id", b.id), supabase.from("banners").update({ sort: b.sort }).eq("id", o.id)]);
    load();
  }
  async function toggle(b: Banner) { await supabase.from("banners").update({ active: !b.active }).eq("id", b.id); load(); }

  return (
    <div className="adm-page">
      <div className="adm-bar">
        <h1>Bannere</h1>
        <button className="addbtn" onClick={() => setEdit({ id: "", chip: "", title: "", body: "", cta: "Comandă acum", image: null, category_id: null, active: true, sort: (list[list.length - 1]?.sort || 0) + 10, isNew: true })}>Banner nou <span>+</span></button>
      </div>
      <p className="muted adm-help">Copertele mari de sus de pe prima pagină. Se afișează primele 3 active, în ordinea de aici. Primul e cel mare.</p>
      <div className="bn-grid">
        {list.map((b, i) => (
          <div key={b.id} className={`bn-card ${b.active ? "" : "off"}`}>
            <button className="bn-prev hero" style={{ backgroundImage: b.image ? `url(${imgUrl(b.image)})` : undefined }} onClick={() => setEdit({ ...b })}>
              <div className="h-txt">{b.chip && <span className="chip-hot">{b.chip}</span>}{b.title && <h2>{b.title}</h2>}{b.body && <p className="h-lead">{b.body}</p>}</div>
            </button>
            <div className="bn-tools">
              <span className="bn-pos">{b.active && i < 3 ? (i === 0 ? "Banner mare" : `Poziția ${i + 1}`) : b.active ? "Nu încape (max. 3)" : "Ascuns"}</span>
              <button className="mini" onClick={() => move(b, -1)} disabled={i === 0} aria-label="Mută mai sus">↑</button>
              <button className="mini" onClick={() => move(b, 1)} disabled={i === list.length - 1} aria-label="Mută mai jos">↓</button>
              <label className="adm-sw"><span>Activ</span><button className="switch" role="switch" aria-checked={b.active} onClick={() => toggle(b)} /></label>
              <button className="mini" onClick={() => setEdit({ ...b })}>Editează</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="muted">Niciun banner încă. Apasă „Banner nou”.</p>}
      </div>

      {edit && <BannerEditor b={edit} cats={cats} onClose={() => setEdit(null)} onDone={m => { setEdit(null); load(); flash(m); }} />}
    </div>
  );
}

function BannerEditor({ b: initial, cats, onClose, onDone }: { b: Banner & { isNew?: boolean }; cats: Category[]; onClose: () => void; onDone: Flash }) {
  const [b, setB] = useState(initial);
  const [err, setErr] = useState("");
  const [del, setDel] = useState(false);
  const set = (p: Partial<Banner>) => setB(x => ({ ...x, ...p }));
  async function save() {
    if (!b.image) { setErr("Alege o poză pentru banner."); return; }
    const row = { chip: b.chip?.trim() || null, title: b.title?.trim() || null, body: b.body?.trim() || null, cta: b.cta?.trim() || null, image: b.image, category_id: b.category_id, active: b.active, sort: b.sort };
    const { error } = initial.isNew ? await supabase.from("banners").insert(row) : await supabase.from("banners").update(row).eq("id", b.id);
    if (error) { setErr("Nu s-a salvat: " + error.message); return; }
    onDone("Bannerul e live pe site.");
  }
  return (
    <Drawer title={initial.isNew ? "Banner nou" : "Editează bannerul"} onClose={onClose} foot={<>
      {!initial.isNew && (del
        ? <span className="ae-del"><b>Ștergi bannerul?</b><button className="mini danger" onClick={async () => { await supabase.from("banners").delete().eq("id", b.id); onDone("Bannerul a fost șters."); }}>Da</button><button className="mini" onClick={() => setDel(false)}>Nu</button></span>
        : <button className="mini danger" onClick={() => setDel(true)}>Șterge bannerul</button>)}
      <span style={{ flex: 1 }} />{err && <span className="err" style={{ margin: 0 }}>{err}</span>}
      <button className="mini" onClick={onClose}>Anulează</button>
      <button className="cta" style={{ width: "auto", padding: "14px 26px" }} onClick={save}>Salvează</button>
    </>}>
      <div className="ae-grid">
        <div className="ae-form">
          <p className="cp-lbl">Poza</p>
          <PhotoPicker value={b.image} onChange={v => set({ image: v })} prefix="banner" hint="Cel mai bine arată o poză lată (orizontală). Textul stă jos, deci partea de jos a pozei va fi mai întunecată." />
          <p className="cp-lbl">Text</p>
          <div className="fields">
            <label className="fl wide"><span>Eticheta mică <i>ex. „Nou”, „Weekend”</i></span><input value={b.chip || ""} onChange={e => set({ chip: e.target.value })} /></label>
            <label className="fl wide"><span>Titlu mare <i>opțional, lasă gol dacă poza are deja logo/titlu</i></span><input value={b.title || ""} onChange={e => set({ title: e.target.value })} /></label>
            <label className="fl wide"><span>Text scurt <i>opțional</i></span><textarea rows={2} value={b.body || ""} onChange={e => set({ body: e.target.value })} /></label>
            <label className="fl"><span>Text pe buton</span><input value={b.cta || ""} onChange={e => set({ cta: e.target.value })} placeholder="Comandă acum" /></label>
            <label className="fl"><span>La apăsare duce la</span>
              <select value={b.category_id || ""} onChange={e => set({ category_id: e.target.value || null })}><option value="">— nicăieri —</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name_ro}</option>)}</select></label>
          </div>
          <div className="ae-sws"><label className="adm-sw"><span>Activ pe site</span><button className="switch" role="switch" aria-checked={b.active} onClick={() => set({ active: !b.active })} /></label></div>
        </div>
        <div className="ae-side">
          <p className="cp-lbl" style={{ marginTop: 0 }}>Previzualizare</p>
          <div className="hero h-main bn-live" style={{ backgroundImage: b.image ? `url(${imgUrl(b.image)})` : undefined }}>
            <div className="h-txt">{b.chip && <span className="chip-hot">{b.chip}</span>}{b.title && <h2>{b.title}</h2>}{b.body && <p className="h-lead">{b.body}</p>}{b.cta && <span className="h-cta">{b.cta} →</span>}</div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

/* ============================== PROMOȚII ============================== */
type PromoDraft = Promo & { isNew?: boolean; kind: "price" | "code" | "info" };
const kindOf = (p: Promo): PromoDraft["kind"] => (p.price != null && p.item_id ? "price" : p.code ? "code" : "info");

function promoState(p: Promo) {
  const now = Date.now();
  if (!p.active) return ["Oprită", "off"];
  if (p.starts_at && new Date(p.starts_at).getTime() > now) return ["Programată", "warn"];
  if (p.ends_at && new Date(p.ends_at).getTime() < now) return ["Expirată", "off"];
  return ["Activă acum", "ok"];
}

export function PromosTab({ items, flash }: { items: Item[]; flash: Flash }) {
  const [list, setList] = useState<Promo[]>([]);
  const [edit, setEdit] = useState<PromoDraft | null>(null);
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  const load = async () => { const { data } = await supabase.from("promos").select("*").order("created_at", { ascending: false }); setList((data || []) as Promo[]); };
  useEffect(() => { load(); }, []);

  async function pushNow(p: Promo) {
    await supabase.from("promos").update({ pushed_at: new Date().toISOString(), active: true }).eq("id", p.id);
    flash("Popup trimis acum tuturor celor care sunt pe site."); load();
  }

  return (
    <div className="adm-page">
      <div className="adm-bar">
        <h1>Promoții & popup</h1>
        <button className="addbtn" onClick={() => setEdit({ id: "", kicker: "Ofertă specială", title: "", body: "", item_id: null, extras: [], price: null, code: null, image: null, active: true, popup: true, pushed_at: null, starts_at: null, ends_at: null, isNew: true, kind: "price" })}>Promoție nouă <span>+</span></button>
      </div>
      <p className="muted adm-help">O promoție apare ca <b>popup</b> când intră clientul pe site (o dată pe vizită). Cu „Arată acum” o trimiți instant și celor care sunt deja pe site. Dacă sunt mai multe promoții cu popup active, apare cea mai nouă.</p>
      <div className="pr-list">
        {list.map(p => {
          const [label, cls] = promoState(p), it = p.item_id ? byId[p.item_id] : undefined;
          const img = imgUrl(p.image) || imgUrl(it?.image || null);
          return (
            <div key={p.id} className="pr-row">
              <button className="pr-img" onClick={() => setEdit({ ...p, kind: kindOf(p) })}>{img ? <img src={img} alt="" /> : <Icon name="send" size={22} />}</button>
              <button className="adm-info" onClick={() => setEdit({ ...p, kind: kindOf(p) })}>
                <b>{p.title}</b>
                <small>{kindOf(p) === "price" && it ? `${it.name_ro}${p.extras.length ? " + " + p.extras.map(k => byId[k]?.name_ro || k).join(", ") : ""} la ${lei(Number(p.price))} (în loc de ${lei(Number(it.price) + p.extras.reduce((s, k) => s + Number(byId[k]?.price || 0), 0))})` : p.code ? `Cod ${p.code}` : "Anunț"}
                  {p.ends_at ? ` · până la ${new Date(p.ends_at).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</small>
              </button>
              <span className={`pr-state ${cls}`}>{label}</span>
              {p.popup && <span className="tag">popup</span>}
              <button className="mini" onClick={() => pushNow(p)} title="Apare imediat la toți clienții de pe site"><Icon name="send" size={13} /> Arată acum</button>
              <button className="mini" onClick={() => setEdit({ ...p, kind: kindOf(p) })}>Editează</button>
            </div>
          );
        })}
        {list.length === 0 && <p className="muted">Nicio promoție încă. Apasă „Promoție nouă”.</p>}
      </div>
      {edit && <PromoEditor p={edit} items={items} onClose={() => setEdit(null)} onDone={m => { setEdit(null); load(); flash(m); }} />}
    </div>
  );
}

function PromoEditor({ p: initial, items, onClose, onDone }: { p: PromoDraft; items: Item[]; onClose: () => void; onDone: Flash }) {
  const [p, setP] = useState(initial);
  const [codes, setCodes] = useState<Code[]>([]);
  const [err, setErr] = useState("");
  const [del, setDel] = useState(false);
  const set = (x: Partial<PromoDraft>) => setP(v => ({ ...v, ...x }));
  useEffect(() => { supabase.from("promo_codes").select("*").order("code").then(({ data }) => setCodes((data || []) as Code[])); }, []);
  const it = p.item_id ? items.find(i => i.id === p.item_id) : undefined;
  const [showAll, setShowAll] = useState(false);
  const COMMON = ["cartofi", "special-fries", "cartofi-lyra", "sosul-casei", "mujdei", "sos-usturoi", "muraturi", "papanas", "lapte-pasare"];
  const addons = items.filter(i => ["garnituri", "sosuri", "muraturi", "desert"].includes(i.category_id) || COMMON.includes(i.id))
    .filter(i => showAll || COMMON.includes(i.id) || p.extras.includes(i.id));
  const normal = it ? Number(it.price) + p.extras.reduce((s, k) => s + Number(items.find(i => i.id === k)?.price || 0), 0) : 0;
  const img = imgUrl(p.image) || imgUrl(it?.image || null);

  async function save() {
    setErr("");
    if (!p.title.trim()) { setErr("Scrie un titlu."); return; }
    if (p.kind === "price" && (!p.item_id || !(Number(p.price) >= 0))) { setErr("Alege produsul și prețul de ofertă."); return; }
    if (p.kind === "code" && !p.code) { setErr("Alege codul de reducere."); return; }
    const row = {
      kicker: p.kicker?.trim() || null, title: p.title.trim(), body: p.body?.trim() || null,
      item_id: p.kind === "price" ? p.item_id : null, extras: p.kind === "price" ? p.extras : [],
      price: p.kind === "price" ? Number(p.price) : null, code: p.kind === "code" ? p.code : null,
      image: p.image, active: p.active, popup: p.popup, starts_at: p.starts_at, ends_at: p.ends_at,
    };
    const { error } = initial.isNew ? await supabase.from("promos").insert(row) : await supabase.from("promos").update(row).eq("id", p.id);
    if (error) { setErr("Nu s-a salvat: " + error.message); return; }
    onDone(initial.isNew ? "Promoția a fost creată." : "Promoția a fost salvată.");
  }

  return (
    <Drawer title={initial.isNew ? "Promoție nouă" : "Editează promoția"} onClose={onClose} foot={<>
      {!initial.isNew && (del
        ? <span className="ae-del"><b>Ștergi promoția?</b><button className="mini danger" onClick={async () => { await supabase.from("promos").delete().eq("id", p.id); onDone("Promoția a fost ștearsă."); }}>Da</button><button className="mini" onClick={() => setDel(false)}>Nu</button></span>
        : <button className="mini danger" onClick={() => setDel(true)}>Șterge promoția</button>)}
      <span style={{ flex: 1 }} />{err && <span className="err" style={{ margin: 0 }}>{err}</span>}
      <button className="mini" onClick={onClose}>Anulează</button>
      <button className="cta" style={{ width: "auto", padding: "14px 26px" }} onClick={save}>Salvează</button>
    </>}>
      <div className="ae-grid">
        <div className="ae-form">
          <p className="cp-lbl">Ce fel de promoție?</p>
          <div className="paygrid three">
            <button aria-pressed={p.kind === "price"} onClick={() => set({ kind: "price" })}><b>Preț special</b><small>un produs la preț redus</small></button>
            <button aria-pressed={p.kind === "code"} onClick={() => set({ kind: "code" })}><b>Cod de reducere</b><small>ex. -10% la toată comanda</small></button>
            <button aria-pressed={p.kind === "info"} onClick={() => set({ kind: "info" })}><b>Doar anunț</b><small>noutăți, program, eveniment</small></button>
          </div>

          {p.kind === "price" && <>
            <p className="cp-lbl">Produsul și prețul</p>
            <div className="fields">
              <label className="fl wide"><span>Produs</span>
                <select value={p.item_id || ""} onChange={e => set({ item_id: e.target.value || null })}><option value="">— alege —</option>{items.filter(i => i.active).map(i => <option key={i.id} value={i.id}>{i.name_ro} · {lei(Number(i.price))}</option>)}</select></label>
              <label className="fl"><span>Preț de ofertă (lei)</span><input inputMode="decimal" value={p.price ?? ""} onChange={e => set({ price: e.target.value === "" ? null : parseFloat(e.target.value.replace(",", ".")) })} /></label>
              {it && <div className="fl"><span>Preț normal</span><div className="pr-normal num">{lei(normal)}{p.price != null && normal > Number(p.price) && <em> −{Math.round((1 - Number(p.price) / normal) * 100)}%</em>}</div></div>}
            </div>
            <p className="cp-lbl">Inclus în ofertă <i style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>(opțional, ex. cartofi)</i></p>
            <div className="chips">{addons.map(a => <button key={a.id} className="chip" aria-pressed={p.extras.includes(a.id)} onClick={() => set({ extras: p.extras.includes(a.id) ? p.extras.filter(x => x !== a.id) : [...p.extras, a.id] })}>{a.name_ro}</button>)}
              <button className="chip" onClick={() => setShowAll(!showAll)}>{showAll ? "Mai puține" : "Toate garniturile, sosurile, deserturile…"}</button></div>
          </>}

          {p.kind === "code" && <>
            <p className="cp-lbl">Codul</p>
            {codes.length ? <div className="chips">{codes.map(c => <button key={c.code} className="chip" aria-pressed={p.code === c.code} onClick={() => set({ code: c.code })}><b>{c.code}</b> · {c.label}</button>)}</div>
              : <p className="muted">Nu ai coduri încă. Le creezi în secțiunea „Coduri reducere”.</p>}
          </>}

          <p className="cp-lbl">Textul din popup</p>
          <div className="fields">
            <label className="fl wide"><span>Eticheta mică</span><input value={p.kicker || ""} onChange={e => set({ kicker: e.target.value })} placeholder="Ofertă specială" /></label>
            <label className="fl wide"><span>Titlu</span><input value={p.title} onChange={e => set({ title: e.target.value })} placeholder="Ex: Double Smash + cartofi la 42 lei" /></label>
            <label className="fl wide"><span>Descriere</span><textarea rows={2} value={p.body || ""} onChange={e => set({ body: e.target.value })} placeholder="Ce primește clientul și până când" /></label>
          </div>

          <p className="cp-lbl">Poza</p>
          <PhotoPicker value={p.image} onChange={v => set({ image: v })} prefix="promo" hint={it ? "Dacă nu alegi o poză, folosim poza produsului." : undefined} />

          <p className="cp-lbl">Când e valabilă <i style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>(lasă gol = de acum, fără termen)</i></p>
          <div className="fields">
            <label className="fl"><span>De la</span><input type="datetime-local" value={toLocal(p.starts_at)} onChange={e => set({ starts_at: fromLocal(e.target.value) })} /></label>
            <label className="fl"><span>Până la</span><input type="datetime-local" value={toLocal(p.ends_at)} onChange={e => set({ ends_at: fromLocal(e.target.value) })} /></label>
          </div>
          <div className="ae-sws">
            <label className="adm-sw"><span>Promoție activă</span><button className="switch" role="switch" aria-checked={p.active} onClick={() => set({ active: !p.active })} /></label>
            <label className="adm-sw"><span>Arată ca popup la intrare</span><button className="switch" role="switch" aria-checked={p.popup} onClick={() => set({ popup: !p.popup })} /></label>
          </div>
        </div>

        <div className="ae-side">
          <p className="cp-lbl" style={{ marginTop: 0 }}>Așa apare clientului</p>
          <div className="pop-card" style={{ animation: "none", width: "100%" }}>
            <div className="pi"><span className="ribbon">{p.kicker || "Ofertă"}</span>{img && <img src={img} alt="" />}</div>
            <div className="pb">
              <h3>{p.title || "Titlul promoției"}</h3>{p.body && <p>{p.body}</p>}
              {p.kind === "price" && p.price != null && it && <div className="pp num">{lei(Number(p.price))}{normal > Number(p.price) && <s>{lei(normal)}</s>}</div>}
              {p.kind === "code" && p.code && <div className="codebox">{p.code}</div>}
              <span className="cta">{p.kind === "price" ? "Adaugă în coș" : p.kind === "code" ? "Folosește codul" : "Vezi meniul"}</span>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

/* ============================== CODURI ============================== */
export function CodesTab({ cats, flash }: { cats: Category[]; flash: Flash }) {
  const [list, setList] = useState<Code[]>([]);
  const [n, setN] = useState<Code>({ code: "", percent: 10, category_id: null, label: "", active: true });
  const [err, setErr] = useState("");
  const load = async () => { const { data } = await supabase.from("promo_codes").select("*").order("code"); setList((data || []) as Code[]); };
  useEffect(() => { load(); }, []);
  const catName = (id: string | null) => (id ? cats.find(c => c.id === id)?.name_ro || id : "toată comanda");
  const autoLabel = (c: Code) => `-${c.percent}% la ${catName(c.category_id)}`;

  async function add() {
    setErr("");
    const code = n.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9-]{3,20}$/.test(code)) { setErr("Codul: 3–20 litere sau cifre, fără spații (ex. VARA20)."); return; }
    if (!(n.percent >= 1 && n.percent <= 100)) { setErr("Reducerea trebuie să fie între 1 și 100%."); return; }
    const { error } = await supabase.from("promo_codes").insert({ ...n, code, label: n.label.trim() || autoLabel(n) });
    if (error) { setErr(error.message.includes("duplicate") ? "Codul există deja." : "Nu s-a salvat: " + error.message); return; }
    setN({ code: "", percent: 10, category_id: null, label: "", active: true }); load(); flash(`Codul ${code} e activ.`);
  }

  return (
    <div className="adm-page">
      <div className="adm-bar"><h1>Coduri de reducere</h1></div>
      <p className="muted adm-help">Clientul scrie codul în coș, la „Cod promoțional”. Reducerea se calculează automat. Poți pune codul și într-un popup din „Promoții & popup”.</p>
      <div className="code-new">
        <label className="fl"><span>Cod</span><input value={n.code} onChange={e => setN({ ...n, code: e.target.value.toUpperCase() })} placeholder="VARA20" style={{ textTransform: "uppercase" }} /></label>
        <label className="fl"><span>Reducere %</span><input inputMode="numeric" value={n.percent} onChange={e => setN({ ...n, percent: parseInt(e.target.value) || 0 })} /></label>
        <label className="fl"><span>Se aplică la</span><select value={n.category_id || ""} onChange={e => setN({ ...n, category_id: e.target.value || null })}><option value="">Toată comanda</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name_ro}</option>)}</select></label>
        <label className="fl"><span>Text afișat <i>opțional</i></span><input value={n.label} onChange={e => setN({ ...n, label: e.target.value })} placeholder={autoLabel(n)} /></label>
        <button className="addbtn" onClick={add}>Adaugă codul <span>+</span></button>
      </div>
      {err && <p className="err">{err}</p>}
      <div className="pr-list" style={{ marginTop: 16 }}>
        {list.map(c => (
          <div key={c.code} className="pr-row code-row">
            <b className="code-pill">{c.code}</b>
            <div className="adm-info"><b>{c.label}</b><small>-{c.percent}% · {catName(c.category_id)}</small></div>
            <label className="adm-sw"><span>Activ</span><button className="switch" role="switch" aria-checked={c.active} onClick={async () => { await supabase.from("promo_codes").update({ active: !c.active }).eq("code", c.code); load(); }} /></label>
            <button className="mini danger" onClick={async () => { await supabase.from("promo_codes").delete().eq("code", c.code); load(); flash(`Codul ${c.code} a fost șters.`); }}>Șterge</button>
          </div>
        ))}
      </div>
    </div>
  );
}
