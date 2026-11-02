import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Item } from "../lib/types";
import { imgUrl, lei } from "../lib/format";
import { LEDGER_LABEL, TIER_CLS, useRewards, type RewardsCfg } from "../lib/rewards";

type Flash = (m: string) => void;
type Overview = Record<string, number> & { tiers: Record<string, number> };
type Row = { id: string; email: string | null; name: string | null; phone: string | null; tier: number; spent: number; points: number; value: number; vouchers: number; orders_count: number; last_activity_at: string | null; marketing_ok: boolean };
type Ledger = { kind: string; points: number; value: number; note: string | null; actor: string | null; order_no: number | null; created_at: string };

const d = (s: string | null) => (s ? new Date(s).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Lyra Rewards: settings, eligible desserts, program figures, customers with manual adjustments. */
export function RewardsTab({ items, flash, isAdmin }: { items: Item[]; flash: Flash; isAdmin: boolean }) {
  const { cfg, reload } = useRewards(null);
  const [f, setF] = useState<RewardsCfg | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Row | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setF(cfg); }, [cfg]);
  const loadStats = async () => {
    const [o, c] = await Promise.all([supabase.rpc("admin_rewards_overview"), supabase.rpc("admin_rewards_customers", { p_q: q.trim() })]);
    if (o.data) setOv(o.data as Overview);
    setRows(((c.data || []) as Row[]).map(r => ({ ...r, spent: Number(r.spent), value: Number(r.value) })));
  };
  useEffect(() => { loadStats(); }, []);
  useEffect(() => { const t = setTimeout(loadStats, 300); return () => clearTimeout(t); }, [q]);

  async function save() {
    if (!f) return;
    setErr(""); setBusy(true);
    const { error } = await supabase.rpc("admin_rewards_save", { p: {
      enabled: f.enabled, program_name: f.program_name, tier_names: f.tier_names, thresholds: f.thresholds.map(Number), rates: f.rates.map(Number),
      max_redeem_pct: Number(f.max_redeem_pct), voucher_days: Number(f.voucher_days), expiry_months: Number(f.expiry_months),
      near_tier_lei: Number(f.near_tier_lei), dessert_ids: f.dessert_ids,
    } });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    flash("Setările Lyra Rewards au fost salvate."); reload();
  }

  const desserts = items.filter(i => (i.category_id === "desert" && i.active) || f?.dessert_ids.includes(i.id));
  const setArr = (k: "tier_names" | "thresholds" | "rates", i: number, v: string) =>
    f && setF({ ...f, [k]: f[k].map((x, j) => (j === i ? (k === "tier_names" ? v : (v as unknown as number)) : x)) } as RewardsCfg);

  return (
    <div className="adm-page rw-admin">
      <div className="adm-bar"><h1>Lyra Rewards</h1>
        {f && isAdmin && <label className="adm-sw"><span>{f.enabled ? "Program activ" : "Program oprit"}</span><button className="switch" role="switch" aria-checked={f.enabled} onClick={() => setF({ ...f, enabled: !f.enabled })} /></label>}
      </div>

      {ov && <div className="rw-stats">
        {[1, 2, 3].map(t => <div key={t} className={`rw-stat ${TIER_CLS[t - 1]}`}><small>Lyra {cfg.tier_names[t - 1]}</small><b className="num">{ov.tiers?.[t] || 0}</b><span>clienți</span></div>)}
        <div className="rw-stat"><small>Puncte emise</small><b className="num">{Number(ov.issued_points).toLocaleString("ro-RO")}</b><span>{lei(Number(ov.issued_value))}</span></div>
        <div className="rw-stat"><small>Puncte folosite</small><b className="num">{Number(ov.used_points).toLocaleString("ro-RO")}</b><span>{lei(Number(ov.used_value))}</span></div>
        <div className="rw-stat"><small>Sold clienți</small><b className="num">{Number(ov.outstanding_points).toLocaleString("ro-RO")}</b><span>{lei(Number(ov.outstanding_value))} datorați</span></div>
        <div className="rw-stat"><small>Vouchere</small><b className="num">{ov.vouchers_used}/{ov.vouchers_issued}</b><span>folosite · {ov.vouchers_active} active</span></div>
        <div className="rw-stat hot"><small>Cost reduceri</small><b className="num">{lei(Number(ov.discount_cost))}</b><span>puncte + deserturi cadou</span></div>
      </div>}

      {f && isAdmin && <section className="rw-settings">
        <h2>Niveluri</h2>
        <div className="rw-tiers-edit">
          {[0, 1, 2].map(i => <div key={i} className={`rw-tier-edit ${TIER_CLS[i]}`}>
            <label className="fl"><span>Nume nivel {i + 1}</span><input value={f.tier_names[i]} onChange={e => setArr("tier_names", i, e.target.value)} /></label>
            <label className="fl"><span>Prag (lei cumulat)</span><input inputMode="decimal" value={f.thresholds[i]} disabled={i === 0} onChange={e => setArr("thresholds", i, e.target.value)} /></label>
            <label className="fl"><span>Cashback %</span><input inputMode="decimal" value={f.rates[i]} onChange={e => setArr("rates", i, e.target.value)} /></label>
            <small className="muted">1 punct = {(Number(f.rates[i]) / 100).toFixed(2)} lei</small>
          </div>)}
        </div>
        <h2>Reguli</h2>
        <div className="fields rw-rules">
          <label className="fl"><span>Maxim plătit cu puncte (% din produse)</span><input inputMode="decimal" value={f.max_redeem_pct} onChange={e => setF({ ...f, max_redeem_pct: e.target.value as unknown as number })} /></label>
          <label className="fl"><span>Valabilitate voucher (zile)</span><input inputMode="numeric" value={f.voucher_days} onChange={e => setF({ ...f, voucher_days: e.target.value as unknown as number })} /></label>
          <label className="fl"><span>Expirare puncte (luni fără comenzi)</span><input inputMode="numeric" value={f.expiry_months} onChange={e => setF({ ...f, expiry_months: e.target.value as unknown as number })} /></label>
          <label className="fl"><span>Mesaj „aproape de nivel” sub (lei)</span><input inputMode="decimal" value={f.near_tier_lei} onChange={e => setF({ ...f, near_tier_lei: e.target.value as unknown as number })} /></label>
        </div>
        <h2>Deserturi pentru voucher</h2>
        <div className="rw-dessert-pick">
          {desserts.map(it => {
            const on = f.dessert_ids.includes(it.id);
            return <button key={it.id} aria-pressed={on} onClick={() => setF({ ...f, dessert_ids: on ? f.dessert_ids.filter(x => x !== it.id) : [...f.dessert_ids, it.id] })}>
              {it.image && <img src={imgUrl(it.image)!} alt="" />}<span>{it.name_ro}</span><em>{lei(Number(it.price))}</em></button>;
          })}
        </div>
        {err && <p className="err">{err}</p>}
        <div className="row-btw" style={{ marginTop: 16 }}><span className="muted">Modificările se aplică punctelor câștigate de acum înainte. Punctele existente își păstrează valoarea.</span>
          <button className="cta" style={{ width: "auto", padding: "13px 26px" }} onClick={save} disabled={busy}>{busy ? "Se salvează…" : "Salvează setările"}</button></div>
      </section>}

      <section className="rw-cust">
        <div className="row-btw"><h2>Clienți</h2><input className="in" style={{ maxWidth: 320 }} placeholder="Caută email, nume, telefon" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="rw-table">
          <div className="rw-tr rw-th"><span>Client</span><span>Nivel</span><span>Cheltuit</span><span>Puncte</span><span>Valoare</span><span>Vouchere</span><span>Ultima comandă</span></div>
          {rows.map(r => <button key={r.id} className="rw-tr" onClick={() => setOpen(r)}>
            <span><b>{r.name || r.email?.split("@")[0] || "—"}</b><small>{r.email}{r.marketing_ok ? " · acceptă oferte" : ""}</small></span>
            <span><i className={`club-dot ${TIER_CLS[r.tier - 1]}`} /> {cfg.tier_names[r.tier - 1]}</span>
            <span className="num">{lei(r.spent)}</span><span className="num">{r.points}</span><span className="num">{lei(r.value)}</span>
            <span className="num">{r.vouchers || "—"}</span><span>{d(r.last_activity_at)}</span>
          </button>)}
          {rows.length === 0 && <p className="muted" style={{ padding: 16 }}>Niciun client găsit.</p>}
        </div>
      </section>

      {open && <CustomerSheet row={open} cfg={cfg} isAdmin={isAdmin} onClose={() => setOpen(null)} onChanged={() => { loadStats(); flash("Punctele au fost ajustate."); }} />}
    </div>
  );
}

function CustomerSheet({ row, cfg, isAdmin, onClose, onChanged }: { row: Row; cfg: RewardsCfg; isAdmin: boolean; onClose: () => void; onChanged: () => void }) {
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [pts, setPts] = useState("");
  const [why, setWhy] = useState("");
  const [err, setErr] = useState("");
  const [cur, setCur] = useState(row.points);
  const load = () => supabase.rpc("admin_rewards_ledger", { p_customer: row.id }).then(({ data }) => setLedger((data || []) as Ledger[]));
  useEffect(() => { load(); }, [row.id]);
  async function adjust() {
    setErr("");
    const { data, error } = await supabase.rpc("admin_rewards_adjust", { p_customer: row.id, p_points: parseInt(pts, 10) || 0, p_reason: why });
    if (error) { setErr(error.message); return; }
    setCur((data as { points: number }).points); setPts(""); setWhy(""); load(); onChanged();
  }
  return (
    <div className="cart-sheet rw-sheet"><div className="veil" onClick={onClose} />
      <div className="sheet modal" role="dialog" aria-modal="true">
        <button className="x-btn" onClick={onClose} aria-label="Închide">×</button>
        <div className="rw-sheet-in">
          <h2>{row.name || row.email}</h2>
          <p className="muted">{row.email} · {row.phone || "fără telefon"} · Lyra {cfg.tier_names[row.tier - 1]} · {lei(row.spent)} cheltuiți · {row.orders_count} comenzi</p>
          <div className="rw-pill-row"><span><b className="num">{cur}</b> puncte</span><span><b className="num">{row.vouchers}</b> vouchere active</span></div>
          {isAdmin && <div className="rw-adjust">
            <label className="fl"><span>Puncte (+ adaugă, − scade)</span><input inputMode="numeric" value={pts} onChange={e => setPts(e.target.value.replace(/[^\d-]/g, ""))} placeholder="+100 sau -50" /></label>
            <label className="fl"><span>Motiv (obligatoriu, apare în jurnal)</span><input value={why} onChange={e => setWhy(e.target.value)} placeholder="Compensație întârziere comanda #1042" /></label>
            <button className="cta" onClick={adjust} disabled={!pts || !why.trim()}>Ajustează</button>
          </div>}
          {err && <p className="err">{err}</p>}
          <p className="cp-lbl">Jurnal puncte</p>
          <div className="rw-ledger">{ledger.map((l, i) => <div key={i}>
            <div><b>{LEDGER_LABEL[l.kind] || l.kind}{l.order_no ? ` · #${l.order_no}` : ""}</b><small>{l.note}{l.actor ? ` · de ${l.actor}` : ""} · {d(l.created_at)}</small></div>
            <span className={`num ${l.points >= 0 ? "plus" : "minus"}`}>{l.points >= 0 ? "+" : ""}{l.points}<small>{lei(Math.abs(Number(l.value)))}</small></span>
          </div>)}
          {ledger.length === 0 && <p className="muted">Nicio mișcare încă.</p>}</div>
        </div>
      </div>
    </div>
  );
}
