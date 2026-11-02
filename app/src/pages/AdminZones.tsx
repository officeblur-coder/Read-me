import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../lib/supabase";
import { lei } from "../lib/format";
import { MURES_CENTER, RESTAURANT, geocode, useZones, zoneFor, type LatLng, type Zone } from "../lib/zones";
import { TILE_ATTR, TILE_URL, homeIcon, pinIcon } from "../components/MapPicker";

type Flash = (m: string) => void;
type Draft = Omit<Zone, "id" | "fee" | "min_order" | "free_over" | "eta_extra"> & { id?: string; fee: string; min_order: string; free_over: string; eta_extra: string };
const COLORS = ["#ff7a1a", "#17b67c", "#3b82f6", "#e2463a", "#a855f7", "#f6b13b", "#14b8a6", "#ec4899"];
const toDraft = (z: Zone): Draft => ({ ...z, fee: String(z.fee), min_order: String(z.min_order), free_over: z.free_over == null ? "" : String(z.free_over), eta_extra: String(z.eta_extra || 0) });
const vertexIcon = (active = false) => L.divIcon({ className: `zone-vx${active ? " on" : ""}`, iconSize: [16, 16], iconAnchor: [8, 8] });
const midIcon = () => L.divIcon({ className: "zone-mid", iconSize: [12, 12], iconAnchor: [6, 6] });

/** Delivery zones drawn on the map: each with its own fee, minimum order and free-delivery threshold. */
export function ZonesTab({ flash }: { flash: Flash }) {
  const { zones, reload } = useZones(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [err, setErr] = useState("");
  const [testQ, setTestQ] = useState("");
  const [test, setTest] = useState<(LatLng & { label: string }) | null>(null);
  const [testMsg, setTestMsg] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const others = useRef<L.LayerGroup | null>(null);
  const edit = useRef<L.LayerGroup | null>(null);
  const testPin = useRef<L.Marker | null>(null);
  const st = useRef({ draft, drawing }); st.current = { draft, drawing };

  // map once
  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current).setView([MURES_CENTER.lat, MURES_CENTER.lng], 11);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(m);
    m.attributionControl.setPrefix(false);
    L.marker([RESTAURANT.lat, RESTAURANT.lng], { icon: homeIcon(), title: "Lyra · Acățari" }).addTo(m);
    others.current = L.layerGroup().addTo(m);
    edit.current = L.layerGroup().addTo(m);
    m.on("click", e => {
      const { draft: d, drawing: dr } = st.current;
      if (d && dr) setDraft({ ...d, polygon: [...d.polygon, [round(e.latlng.lat), round(e.latlng.lng)]] });
    });
    map.current = m;
    setTimeout(() => m.invalidateSize(), 200);
    return () => { m.remove(); map.current = null; };
  }, []);

  // other zones (read-only, clickable to edit)
  useEffect(() => {
    const g = others.current; if (!g) return;
    g.clearLayers();
    zones.filter(z => z.id !== draft?.id).forEach(z => {
      const p = L.polygon(z.polygon, { color: z.color, weight: 2, fillOpacity: z.active ? 0.15 : 0.04, dashArray: z.active ? undefined : "6 6" }).addTo(g);
      p.bindTooltip(`${z.name} · ${z.fee ? lei(z.fee) : "gratuit"}`, { sticky: true });
      p.on("click", () => { if (!st.current.drawing) { setDraft(toDraft(z)); setDrawing(false); } });
    });
  }, [zones, draft?.id]);

  // the zone being edited: polygon + draggable corners + "+" between corners
  useEffect(() => {
    const g = edit.current; if (!g) return;
    g.clearLayers();
    if (!draft) return;
    const pts = draft.polygon;
    if (pts.length >= 2) L.polygon(pts, { color: draft.color, weight: 3, fillOpacity: 0.25, dashArray: drawing ? "6 6" : undefined, interactive: false }).addTo(g);
    pts.forEach((p, i) => {
      const mk = L.marker(p, { icon: vertexIcon(i === pts.length - 1 && drawing), draggable: true, title: "Trage ca să muți · click dreapta ca să ștergi" }).addTo(g);
      mk.on("dragend", () => { const ll = mk.getLatLng(); const d = st.current.draft!; setDraft({ ...d, polygon: d.polygon.map((q, j) => (j === i ? [round(ll.lat), round(ll.lng)] : q)) }); });
      mk.on("contextmenu", () => { const d = st.current.draft!; if (d.polygon.length > 3 || st.current.drawing) setDraft({ ...d, polygon: d.polygon.filter((_, j) => j !== i) }); });
    });
    if (!drawing && pts.length >= 3) pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length];
      const mid = L.marker([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], { icon: midIcon(), title: "Adaugă un colț aici" }).addTo(g);
      mid.on("click", () => { const d = st.current.draft!; const np = [...d.polygon]; np.splice(i + 1, 0, [round((p[0] + q[0]) / 2), round((p[1] + q[1]) / 2)]); setDraft({ ...d, polygon: np }); });
    });
  }, [draft?.polygon, draft?.color, drawing]);

  function startNew() {
    setErr("");
    setDraft({ name: `Zona ${zones.length + 1}`, color: COLORS[zones.length % COLORS.length], polygon: [], fee: "10", min_order: "0", free_over: "", eta_extra: "0", active: true, sort: (zones.length + 1) * 10 });
    setDrawing(true);
  }
  function focus(z: Zone) {
    setDraft(toDraft(z)); setDrawing(false); setErr("");
    if (map.current && z.polygon.length) map.current.fitBounds(L.polygon(z.polygon).getBounds(), { padding: [30, 30] });
  }
  async function save() {
    if (!draft) return;
    setErr("");
    if (!draft.name.trim()) { setErr("Dă un nume zonei."); return; }
    if (draft.polygon.length < 3) { setErr("Zona are nevoie de cel puțin 3 puncte pe hartă."); return; }
    const num = (s: string) => parseFloat(s.replace(",", "."));
    const fee = num(draft.fee), min = num(draft.min_order || "0"), free = draft.free_over.trim() ? num(draft.free_over) : null;
    if (!(fee >= 0) || !(min >= 0) || (free != null && !(free >= 0))) { setErr("Verifică sumele (taxă, minim, gratuit peste)."); return; }
    const row = { name: draft.name.trim(), color: draft.color, polygon: draft.polygon, fee, min_order: min, free_over: free, eta_extra: parseInt(draft.eta_extra || "0", 10) || 0, active: draft.active, sort: draft.sort, updated_at: new Date().toISOString() };
    const { error } = draft.id ? await supabase.from("delivery_zones").update(row).eq("id", draft.id) : await supabase.from("delivery_zones").insert(row);
    if (error) { setErr(error.message); return; }
    flash(`Zona „${row.name}” a fost salvată.`); setDraft(null); setDrawing(false); reload();
  }
  async function remove() {
    if (!draft?.id || !confirm(`Ștergi zona „${draft.name}”?`)) return;
    const { error } = await supabase.from("delivery_zones").delete().eq("id", draft.id);
    if (error) { setErr(error.message); return; }
    flash("Zona a fost ștearsă."); setDraft(null); reload();
  }
  async function runTest() {
    setTestMsg("Caut adresa…");
    const r = await geocode(testQ);
    setTest(r);
    if (!r) { setTestMsg("Adresa nu a fost găsită. Încearcă cu localitatea, de ex. „Str. Gheorghe Doja 10, Târgu Mureș”."); return; }
    const z = zoneFor(r, zones);
    setTestMsg(z ? `✓ ${z.name}: livrare ${z.fee ? lei(z.fee) : "gratuită"}${z.min_order ? `, minim ${lei(z.min_order)}` : ""}${z.free_over != null ? `, gratuit peste ${lei(z.free_over)}` : ""}` : "✗ În afara zonelor de livrare");
    const m = map.current; if (!m) return;
    testPin.current?.remove();
    testPin.current = L.marker([r.lat, r.lng], { icon: pinIcon("test") }).addTo(m).bindTooltip(r.label);
    m.setView([r.lat, r.lng], 14);
  }

  const d = draft;
  return (
    <div className="adm-page zones-page">
      <div className="adm-bar"><h1>Zone de livrare</h1><button className="addbtn" onClick={startNew} disabled={drawing}>+ Zonă nouă</button></div>
      <p className="muted adm-help">Desenează pe hartă unde livrezi. Fiecare zonă are taxa ei, comanda minimă și pragul de livrare gratuită. Când zonele se suprapun, clientul primește zona cea mai mică (de exemplu „Oraș” în interiorul „Împrejurimi”). Fără nicio zonă activă, se folosește taxa generală, ca până acum.</p>
      <div className="zones-grid">
        <div className="zones-map-wrap">
          <div ref={box} className="map-box zones-map" />
          {drawing && <div className="zones-hint">Click pe hartă pentru fiecare colț al zonei · click dreapta pe un colț îl șterge · {d?.polygon.length || 0} puncte
            <button className="mini" disabled={(d?.polygon.length || 0) < 3} onClick={() => setDrawing(false)}>Gata, am închis zona</button></div>}
          {!drawing && d && <div className="zones-hint">Trage colțurile ca să ajustezi · „+” dintre colțuri adaugă un punct · click dreapta pe un colț îl șterge</div>}
        </div>
        <aside className="zones-side">
          {!d && <>
            <div className="zones-list">
              {zones.length === 0 && <p className="muted">Nicio zonă încă. Apasă „+ Zonă nouă” și desenează pe hartă.</p>}
              {zones.map(z => <button key={z.id} className={`zone-row ${z.active ? "" : "off"}`} onClick={() => focus(z)}>
                <i style={{ background: z.color }} /><span><b>{z.name}</b><small>{z.fee ? lei(z.fee) : "gratuit"}{z.min_order ? ` · minim ${lei(z.min_order)}` : ""}{z.free_over != null ? ` · gratuit peste ${lei(z.free_over)}` : ""}{z.active ? "" : " · inactivă"}</small></span><em>Editează</em>
              </button>)}
            </div>
            <div className="zones-test">
              <p className="cp-lbl">Verifică o adresă</p>
              <div className="codebar"><input value={testQ} onChange={e => setTestQ(e.target.value)} onKeyDown={e => e.key === "Enter" && runTest()} placeholder="Str. Bolyai 5, Târgu Mureș" /><button onClick={runTest}>Caută</button></div>
              {testMsg && <p className="muted" style={{ margin: "8px 0 0" }}>{testMsg}</p>}
              {test && null}
            </div>
          </>}
          {d && <div className="zone-form">
            <h2>{d.id ? "Editează zona" : "Zonă nouă"}</h2>
            <label className="fl"><span>Nume</span><input value={d.name} onChange={e => setDraft({ ...d, name: e.target.value })} placeholder="Târgu Mureș centru" /></label>
            <div className="fields">
              <label className="fl"><span>Taxa de livrare (lei)</span><input inputMode="decimal" value={d.fee} onChange={e => setDraft({ ...d, fee: e.target.value })} /></label>
              <label className="fl"><span>Comandă minimă (lei)</span><input inputMode="decimal" value={d.min_order} onChange={e => setDraft({ ...d, min_order: e.target.value })} /></label>
              <label className="fl"><span>Livrare gratuită peste (lei)</span><input inputMode="decimal" value={d.free_over} onChange={e => setDraft({ ...d, free_over: e.target.value })} placeholder="gol = niciodată" /></label>
              <label className="fl"><span>Timp în plus (minute)</span><input inputMode="numeric" value={d.eta_extra} onChange={e => setDraft({ ...d, eta_extra: e.target.value })} /></label>
            </div>
            <p className="cp-lbl">Culoare pe hartă</p>
            <div className="zone-colors">{COLORS.map(c => <button key={c} aria-pressed={d.color === c} style={{ background: c }} onClick={() => setDraft({ ...d, color: c })} aria-label={c} />)}</div>
            <label className="adm-sw" style={{ marginTop: 12 }}><button className="switch" role="switch" aria-checked={d.active} onClick={() => setDraft({ ...d, active: !d.active })} /><span>{d.active ? "Zonă activă" : "Zonă oprită (nu se livrează aici)"}</span></label>
            <div className="zone-pts">{d.polygon.length} puncte pe hartă {!drawing && <button className="mini" onClick={() => setDrawing(true)}>Adaugă puncte</button>} {d.polygon.length > 0 && <button className="mini" onClick={() => setDraft({ ...d, polygon: [] })}>Redesenează</button>}</div>
            {err && <p className="err">{err}</p>}
            <div className="zone-actions">
              {d.id && <button className="mini danger" onClick={remove}>Șterge zona</button>}
              <span style={{ flex: 1 }} />
              <button className="mini" onClick={() => { setDraft(null); setDrawing(false); setErr(""); }}>Anulează</button>
              <button className="cta" style={{ width: "auto", padding: "12px 22px" }} onClick={save} disabled={drawing && d.polygon.length < 3}>Salvează zona</button>
            </div>
          </div>}
        </aside>
      </div>
    </div>
  );
}
const round = (x: number) => Math.round(x * 1e6) / 1e6;
