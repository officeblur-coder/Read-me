import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { hoursLabel, slotDays, type Hours } from "../lib/schedule";

const DAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
const t5 = (t?: string) => (t || "").slice(0, 5);

/** Opening hours and pre-orders (settings row). The database checks the same rules on every order. */
export function HoursTab({ flash }: { flash: (m: string) => void }) {
  const [h, setH] = useState<Hours | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from("settings").select("open_time,close_time,open_days,preorder_on,preorder_from,preorder_days,preorder_lead_min,tz").eq("id", 1).single()
      .then(({ data }) => data && setH({ ...(data as Hours), open_time: t5(data.open_time), close_time: t5(data.close_time), preorder_from: t5(data.preorder_from) }));
  }, []);
  if (!h) return <div className="adm-page"><p className="muted">Se încarcă…</p></div>;
  const days = h.open_days || [];
  const preview = slotDays(h);
  async function save() {
    if (!h) return;
    if (!h.open_time || !h.close_time || h.open_time >= h.close_time) { flash("Ora de închidere trebuie să fie după deschidere."); return; }
    if (!days.length) { flash("Alege cel puțin o zi."); return; }
    setBusy(true);
    const { error } = await supabase.from("settings").update({
      open_time: h.open_time, close_time: h.close_time, open_days: [...days].sort(), preorder_on: h.preorder_on,
      preorder_from: h.preorder_from, preorder_days: Math.min(14, Math.max(0, Number(h.preorder_days) || 0)), preorder_lead_min: Math.min(600, Math.max(0, Number(h.preorder_lead_min) || 0)),
    }).eq("id", 1);
    setBusy(false);
    flash(error ? "Nu s-a salvat: " + error.message : "Programul a fost salvat.");
  }
  return (
    <div className="adm-page">
      <div className="adm-bar"><h1>Program & precomenzi</h1><button className="addbtn" onClick={save} disabled={busy}>{busy ? "Se salvează…" : "Salvează"}</button></div>
      <p className="muted adm-help">Comenzile „cât mai curând” se pot trimite doar în program (și cât timp recepția preia comenzi). Precomenzile se pot face oricând, chiar și noaptea, pentru o oră aleasă de client. Ora e ora României.</p>
      <div className="hours-grid">
        <section className="hours-card">
          <h3>Program de lucru · {hoursLabel(h)}</h3>
          <div className="hours-row">
            <label className="fl"><span>Deschidem la</span><input type="time" value={h.open_time} onChange={e => setH({ ...h, open_time: e.target.value })} /></label>
            <label className="fl"><span>Închidem la</span><input type="time" value={h.close_time} onChange={e => setH({ ...h, close_time: e.target.value })} /></label>
          </div>
          <div className="hours-days">{DAYS.map((d, i) => <button key={d} aria-pressed={days.includes(i + 1)}
            onClick={() => setH({ ...h, open_days: days.includes(i + 1) ? days.filter(x => x !== i + 1) : [...days, i + 1] })}>{d}</button>)}</div>
        </section>
        <section className="hours-card">
          <h3>Precomenzi</h3>
          <label className="adm-sw"><button className="switch" role="switch" aria-checked={h.preorder_on !== false} onClick={() => setH({ ...h, preorder_on: h.preorder_on === false })} /><span>{h.preorder_on !== false ? "Clienții pot programa comenzi" : "Precomenzi oprite"}</span></label>
          <div className="hours-row">
            <label className="fl"><span>Cel mai devreme la</span><input type="time" value={h.preorder_from} onChange={e => setH({ ...h, preorder_from: e.target.value })} /></label>
            <label className="fl"><span>Cu câte zile înainte</span><input inputMode="numeric" value={String(h.preorder_days ?? "")} onChange={e => setH({ ...h, preorder_days: Number(e.target.value.replace(/\D/g, "")) })} /></label>
            <label className="fl"><span>Minim minute de acum</span><input inputMode="numeric" value={String(h.preorder_lead_min ?? "")} onChange={e => setH({ ...h, preorder_lead_min: Number(e.target.value.replace(/\D/g, "")) })} /></label>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>{preview.length ? <>Acum clientul poate alege: {preview.map(d => `${d.label} ${d.slots[0].label}–${d.slots[d.slots.length - 1].label}`).join(" · ")}</> : "Acum nu se poate programa nicio comandă."}</p>
        </section>
      </div>
    </div>
  );
}
