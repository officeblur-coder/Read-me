import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { imgUrl, lei } from "../lib/format";
import type { Category, Item } from "../lib/types";
import { cut, useDiscounts, type Discount } from "../lib/discounts";
import Icon from "../components/Icon";

type Draft = { id?: string; name: string; percent: string; item_ids: string[]; active: boolean; starts: string; ends: string };
const QUICK = [5, 10, 15, 20, 25, 30, 40, 50];
const fold = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// <input type="datetime-local"> works in local time: ISO ↔ "2026-11-03T12:00"
const toLocal = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);
const fmt = (iso: string) => new Date(iso).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function status(d: Discount) {
  const now = Date.now();
  if (!d.active) return ["Oprită", "off"];
  if (d.starts_at && new Date(d.starts_at).getTime() > now) return ["Programată", "soon"];
  if (d.ends_at && new Date(d.ends_at).getTime() <= now) return ["Expirată", "off"];
  return ["Activă acum", "on"];
}

/** Welcome bonus for new accounts (settings row): on/off, value, minimum order. */
function WelcomeCard({ flash }: { flash: (m: string) => void }) {
  const [w, setW] = useState<{ on: boolean; lei: string; min: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from("settings").select("welcome_on,welcome_lei,welcome_min").eq("id", 1).maybeSingle()
      .then(({ data }) => data && setW({ on: !!data.welcome_on, lei: String(Number(data.welcome_lei)), min: String(Number(data.welcome_min)) }));
  }, []);
  if (!w) return null;
  async function save() {
    if (!w) return;
    const l = Number(w.lei.replace(",", ".")), m = Number(w.min.replace(",", "."));
    if (!(l >= 0 && l <= 1000) || !(m >= 0 && m <= 5000)) { flash("Valori invalide."); return; }
    setBusy(true);
    const { error } = await supabase.from("settings").update({ welcome_on: w.on, welcome_lei: l, welcome_min: m }).eq("id", 1);
    setBusy(false);
    flash(error ? "Nu s-a salvat: " + error.message : "Bonusul de bun venit a fost salvat.");
  }
  return (
    <section className="wl-admin">
      <div className="wl-gift">🎁</div>
      <div className="wl-admin-body">
        <b>Bonus de bun venit la cont nou</b>
        <small>Fiecare cont nou primește suma pe loc. Se folosește tot odată, o singură dată, la o comandă cu produse de minim valoarea aleasă; nu se cumulează cu codurile de reducere și nu intră în Lyra Rewards (nu urcă nivelul). Un bonus pe număr de telefon.</small>
        <div className="wl-admin-row">
          <label className="adm-sw"><button className="switch" role="switch" aria-checked={w.on} onClick={() => setW({ ...w, on: !w.on })} /><span>{w.on ? "Pornit" : "Oprit"}</span></label>
          <label>Valoare <input inputMode="decimal" value={w.lei} onChange={e => setW({ ...w, lei: e.target.value })} /> lei</label>
          <label>Comandă minimă <input inputMode="decimal" value={w.min} onChange={e => setW({ ...w, min: e.target.value })} /> lei</label>
          <button className="mini" onClick={save} disabled={busy}>{busy ? "…" : "Salvează"}</button>
        </div>
      </div>
    </section>
  );
}

/** „Invită un prieten”: bonusul pentru amândoi, comanda minimă a prietenului, cifre. */
function ReferralCard({ flash }: { flash: (m: string) => void }) {
  const [r, setR] = useState<{ on: boolean; lei: string; min: string } | null>(null);
  const [st, setSt] = useState<{ invited: number; rewarded: number; cost: number; top: { name: string; invited: number; rewarded: number }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from("settings").select("referral_on,referral_lei,referral_min").eq("id", 1).maybeSingle()
      .then(({ data }) => data && setR({ on: data.referral_on !== false, lei: String(Number(data.referral_lei ?? 20)), min: String(Number(data.referral_min ?? 60)) }));
    supabase.rpc("admin_referral_stats").then(({ data }) => data && setSt(data));
  }, []);
  if (!r) return null;
  async function save() {
    if (!r) return;
    const l = Number(r.lei.replace(",", ".")), m = Number(r.min.replace(",", "."));
    if (!(l >= 0 && l <= 500) || !(m >= 0 && m <= 5000)) { flash("Valori invalide."); return; }
    setBusy(true);
    const { error } = await supabase.from("settings").update({ referral_on: r.on, referral_lei: l, referral_min: m }).eq("id", 1);
    setBusy(false);
    flash(error ? "Nu s-a salvat: " + error.message : "Recomandările au fost salvate.");
  }
  return (
    <section className="wl-admin">
      <div className="wl-gift">🤝</div>
      <div className="wl-admin-body">
        <b>Invită un prieten</b>
        <small>Fiecare client are în cont un link (lyrasdelivery.ro/r/COD). Prietenul își face cont din link; după prima lui comandă livrată, cu produse de minim valoarea aleasă, amândoi primesc suma în puncte Lyra Rewards (se folosesc ca restul punctelor). O singură dată pe prieten; nu se acordă dacă prietenul comandă cu telefonul celui care invită.</small>
        <div className="wl-admin-row">
          <label className="adm-sw"><button className="switch" role="switch" aria-checked={r.on} onClick={() => setR({ ...r, on: !r.on })} /><span>{r.on ? "Pornit" : "Oprit"}</span></label>
          <label>Bonus pentru fiecare <input inputMode="decimal" value={r.lei} onChange={e => setR({ ...r, lei: e.target.value })} /> lei</label>
          <label>Prima comandă minimă <input inputMode="decimal" value={r.min} onChange={e => setR({ ...r, min: e.target.value })} /> lei</label>
          <button className="mini" onClick={save} disabled={busy}>{busy ? "…" : "Salvează"}</button>
        </div>
        {st && <small>{st.invited} conturi invitate · {st.rewarded} au comandat · {Number(st.cost).toFixed(2)} lei acordați în puncte{st.top.length ? " · top: " + st.top.slice(0, 3).map(t => `${t.name} (${t.rewarded}/${t.invited})`).join(", ") : ""}</small>}
      </div>
    </section>
  );
}

/** Percentage discounts on chosen products: shown on the site with the old price struck through. */
export function DiscountsTab({ items, cats, flash }: { items: Item[]; cats: Category[]; flash: (m: string) => void }) {
  const { list, reload } = useDiscounts(true);
  const [d, setD] = useState<Draft | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [onlySel, setOnlySel] = useState(false);
  const [busy, setBusy] = useState(false);

  const menu = useMemo(() => items.filter(i => i.active), [items]);
  const byId = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items]);
  const catName = (id: string) => cats.find(c => c.id === id)?.name_ro || id;
  const sel = useMemo(() => new Set(d?.item_ids || []), [d?.item_ids]);
  const shown = useMemo(() => {
    const s = fold(q.trim());
    return menu.filter(i => (cat === "all" || i.category_id === cat) && (!s || fold(i.name_ro).includes(s) || fold(catName(i.category_id)).includes(s)) && (!onlySel || sel.has(i.id)));
  }, [menu, q, cat, onlySel, sel, cats]);
  const groups = useMemo(() => cats.map(c => ({ c, its: shown.filter(i => i.category_id === c.id) })).filter(g => g.its.length), [cats, shown]);
  const pct = Math.min(90, Math.max(0, Number((d?.percent || "").replace(",", ".")) || 0));

  const startNew = () => { setD({ name: "", percent: "10", item_ids: [], active: true, starts: "", ends: "" }); setQ(""); setCat("all"); setOnlySel(false); };
  const edit = (x: Discount) => { setD({ id: x.id, name: x.name, percent: String(x.percent), item_ids: [...x.item_ids], active: x.active, starts: toLocal(x.starts_at), ends: toLocal(x.ends_at) }); setQ(""); setCat("all"); setOnlySel(true); };
  const setIds = (ids: string[]) => d && setD({ ...d, item_ids: ids });
  const toggle = (id: string) => setIds(sel.has(id) ? d!.item_ids.filter(x => x !== id) : [...d!.item_ids, id]);
  const selectShown = () => setIds([...new Set([...(d?.item_ids || []), ...shown.map(i => i.id)])]);
  const unselectShown = () => { const out = new Set(shown.map(i => i.id)); setIds((d?.item_ids || []).filter(x => !out.has(x))); };
  const toggleGroup = (its: Item[]) => { const all = its.every(i => sel.has(i.id)); const ids = new Set(its.map(i => i.id));
    setIds(all ? d!.item_ids.filter(x => !ids.has(x)) : [...new Set([...d!.item_ids, ...ids])]); };

  async function save() {
    if (!d) return;
    if (!(pct > 0 && pct <= 90)) { flash("Procentul trebuie să fie între 1 și 90."); return; }
    if (!d.item_ids.length) { flash("Alege cel puțin un produs."); return; }
    if (d.starts && d.ends && d.ends <= d.starts) { flash("Data de sfârșit trebuie să fie după început."); return; }
    setBusy(true);
    const row = { name: d.name.trim() || `Reducere ${pct}%`, percent: pct, item_ids: d.item_ids, active: d.active,
      starts_at: fromLocal(d.starts), ends_at: fromLocal(d.ends), updated_at: new Date().toISOString() };
    const { error } = d.id ? await supabase.from("item_discounts").update(row).eq("id", d.id) : await supabase.from("item_discounts").insert(row);
    setBusy(false);
    if (error) { flash("Nu s-a salvat: " + error.message); return; }
    flash(d.id ? "Reducerea a fost actualizată." : "Reducerea a fost creată."); setD(null); reload();
  }
  async function setActive(x: Discount, active: boolean) {
    const { error } = await supabase.from("item_discounts").update({ active, updated_at: new Date().toISOString() }).eq("id", x.id);
    if (error) flash("Nu s-a salvat: " + error.message); else { flash(active ? "Reducere pornită." : "Reducere oprită."); reload(); }
  }
  async function remove(x: Discount) {
    if (!confirm(`Ștergi reducerea „${x.name}”?`)) return;
    const { error } = await supabase.from("item_discounts").delete().eq("id", x.id);
    if (error) flash("Nu s-a șters: " + error.message); else { flash("Reducere ștearsă."); setD(null); reload(); }
  }

  if (!d) return (
    <div className="adm-page">
      <div className="adm-bar"><h1>Reduceri pe produse</h1><button className="addbtn" onClick={startNew}><span>+</span>Reducere nouă</button></div>
      <WelcomeCard flash={flash} />
      <ReferralCard flash={flash} />
      <p className="muted adm-help">Alegi procentul (5%, 10%, 25%, cât vrei) și produsele. Pe site apar prețul vechi tăiat, prețul nou și eticheta roșie de reducere, iar comanda se calculează cu prețul redus. Dacă un produs e în mai multe reduceri active, se aplică cea mai mare. Codurile de reducere nu se adaugă peste produsele deja reduse.</p>
      {!list.length && <div className="dsc-empty"><Icon name="tag" size={28} /><b>Nicio reducere încă</b><span>Apasă „Reducere nouă” ca să alegi produsele și procentul.</span></div>}
      <div className="dsc-list">{list.map(x => {
        const [st, cls] = status(x);
        const names = x.item_ids.map(id => byId[id]?.name_ro).filter(Boolean);
        return (
          <div key={x.id} className="dsc-card">
            <div className="dsc-pct">−{x.percent}%</div>
            <div className="dsc-info">
              <b>{x.name}</b>
              <span className={`dsc-st ${cls}`}>{st}</span>
              <small>{x.item_ids.length} produse · {names.slice(0, 4).join(", ")}{names.length > 4 ? ` +${names.length - 4}` : ""}</small>
              {(x.starts_at || x.ends_at) && <small>{x.starts_at ? `de la ${fmt(x.starts_at)}` : "de acum"} {x.ends_at ? `până la ${fmt(x.ends_at)}` : "fără dată de final"}</small>}
            </div>
            <div className="dsc-act">
              <button className="switch" role="switch" aria-checked={x.active} aria-label="Reducere activă" onClick={() => setActive(x, !x.active)} />
              <button className="mini" onClick={() => edit(x)}>Editează</button>
              <button className="mini danger" onClick={() => remove(x)}>Șterge</button>
            </div>
          </div>
        );
      })}</div>
    </div>
  );

  return (
    <div className="adm-page">
      <div className="adm-bar"><h1>{d.id ? "Editează reducerea" : "Reducere nouă"}</h1>
        <button className="mini" onClick={() => setD(null)}>Renunță</button>
        <button className="addbtn" onClick={save} disabled={busy}>{busy ? "Se salvează…" : `Salvează · ${d.item_ids.length} produse`}</button></div>
      <div className="dsc-edit">
        <section className="dsc-form">
          <label className="fl"><span>Nume (doar pentru tine)</span><input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} placeholder={`ex. Burgeri −${pct || 20}% weekend`} /></label>
          <div className="fl"><span>Reducere</span>
            <div className="dsc-quick">{QUICK.map(p => <button key={p} aria-pressed={pct === p} onClick={() => setD({ ...d, percent: String(p) })}>{p}%</button>)}</div>
            <label className="dsc-custom">Alt procent <input inputMode="decimal" value={d.percent} onChange={e => setD({ ...d, percent: e.target.value.replace(/[^\d.,]/g, "").slice(0, 5) })} /> %</label>
          </div>
          <div className="hours-row">
            <label className="fl"><span>Începe <i>opțional</i></span><input type="datetime-local" value={d.starts} onChange={e => setD({ ...d, starts: e.target.value })} /></label>
            <label className="fl"><span>Se termină <i>opțional</i></span><input type="datetime-local" value={d.ends} onChange={e => setD({ ...d, ends: e.target.value })} /></label>
          </div>
          <label className="adm-sw"><button className="switch" role="switch" aria-checked={d.active} onClick={() => setD({ ...d, active: !d.active })} /><span>{d.active ? "Activă (apare pe site în perioada aleasă)" : "Oprită"}</span></label>
          {d.id && <button className="mini danger" style={{ justifySelf: "start" }} onClick={() => remove(list.find(x => x.id === d.id)!)}>Șterge reducerea</button>}
          {d.item_ids.length > 0 && <div className="dsc-chosen"><b>{d.item_ids.length} produse alese</b>
            <div>{d.item_ids.map(id => byId[id] && <button key={id} onClick={() => toggle(id)} title="Scoate">{byId[id].name_ro} ×</button>)}</div></div>}
        </section>

        <section className="dsc-pick">
          <div className="dsc-tools">
            <div className="tb-search dsc-search"><Icon name="search" size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Caută produs…" aria-label="Caută produs" />{q && <button onClick={() => setQ("")} aria-label="Șterge căutarea">×</button>}</div>
            <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Categorie">
              <option value="all">Toate categoriile</option>
              {cats.filter(c => menu.some(i => i.category_id === c.id)).map(c => <option key={c.id} value={c.id}>{c.name_ro}</option>)}
            </select>
          </div>
          <div className="dsc-bulk">
            <button className="mini" onClick={selectShown} disabled={!shown.length}>Selectează tot ({shown.length})</button>
            <button className="mini" onClick={unselectShown} disabled={!shown.some(i => sel.has(i.id))}>Deselectează tot</button>
            <button className="mini" aria-pressed={onlySel} onClick={() => setOnlySel(!onlySel)}>{onlySel ? "Arată toate" : "Doar cele alese"}</button>
            {d.item_ids.length > 0 && <button className="mini danger" onClick={() => setIds([])}>Golește selecția</button>}
          </div>
          {!groups.length && <p className="muted">Niciun produs găsit.</p>}
          {groups.map(({ c, its }) => {
            const all = its.every(i => sel.has(i.id)), some = its.some(i => sel.has(i.id));
            return (
              <div key={c.id} className="dsc-group">
                <label className="dsc-gh"><input type="checkbox" checked={all} ref={el => { if (el) el.indeterminate = some && !all; }} onChange={() => toggleGroup(its)} />
                  <b>{c.name_ro}</b><small>{its.filter(i => sel.has(i.id)).length}/{its.length}</small></label>
                {its.map(i => {
                  const base = i.variants?.length ? Math.min(...i.variants.map(v => v.p)) : Number(i.price), on = sel.has(i.id);
                  return (
                    <label key={i.id} className={`dsc-row ${on ? "on" : ""}`}>
                      <input type="checkbox" checked={on} onChange={() => toggle(i.id)} />
                      {imgUrl(i.image) ? <img src={imgUrl(i.image)!} alt="" loading="lazy" /> : <span className="ph" />}
                      <span className="dsc-n">{i.name_ro}{i.variants?.length ? <small> · {i.variants.length} porții</small> : null}{!i.available && <small> · epuizat</small>}</span>
                      <span className="dsc-p num">{on && pct > 0 ? <><s>{lei(base)}</s> <b>{lei(cut(base, pct))}</b></> : lei(base)}</span>
                    </label>
                  );
                })}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}


