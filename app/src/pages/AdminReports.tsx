import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { lei } from "../lib/format";

type Sum = Record<string, number | null>;
type Row = { number: number; created_at: string; name: string; mode: string; zone: string | null; total: number; status: string; reject_reason: string | null;
  accepted_by: string | null; rejected_by: string | null; courier: string | null; accept_min: number | null; promised_min: number | null; final_eta: number | null; actual_min: number | null; rating: number | null };
type Sess = { name: string | null; started_at: string; ended_at: string; open: boolean; lost: boolean; device: string | null; minutes: number };
type Ev = { name: string | null; kind: string; at: string };
type Report = { summary: Sum; orders: Row[]; staff: { name: string; accepted: number; avg_accept_min: number }[]; sessions: Sess[]; events: Ev[] };

const day = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const PRESETS: [string, () => [Date, Date]][] = [
  ["Azi", () => [day(new Date()), new Date(day(new Date()).getTime() + 864e5)]],
  ["Ieri", () => [new Date(day(new Date()).getTime() - 864e5), day(new Date())]],
  ["7 zile", () => [new Date(day(new Date()).getTime() - 6 * 864e5), new Date(day(new Date()).getTime() + 864e5)]],
  ["30 zile", () => [new Date(day(new Date()).getTime() - 29 * 864e5), new Date(day(new Date()).getTime() + 864e5)]],
];
const t = (s: string | null) => (s ? new Date(s).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "—");
const dt = (s: string) => new Date(s).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const mins = (m: number | null | undefined) => (m == null ? "—" : `${Math.round(Number(m))} min`);
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`);
const ST: Record<string, [string, string]> = {
  new: ["Nouă", ""], prep: ["În bucătărie", ""], road: ["Pe drum", ""], done: ["Livrată", "green"],
  rejected: ["Refuzată", "red"], refunded: ["Rambursată", "red"], unanswered: ["Nepreluată", "red"],
};
const EV: Record<string, string> = { console_open: "a deschis recepția", console_close: "a închis recepția", accepting_off: "a OPRIT comenzile online", accepting_on: "a pornit comenzile online" };

/** Opening/closing of the reception console, missed orders, time to accept, promised vs. real delivery time. */
export function ReportsTab() {
  const [preset, setPreset] = useState(0);
  const [range, setRange] = useState<[Date, Date]>(PRESETS[0][1]());
  const [rep, setRep] = useState<Report | null>(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"all" | "missed" | "late">("all");

  useEffect(() => {
    setRep(null); setErr("");
    supabase.rpc("admin_report", { p_from: range[0].toISOString(), p_to: range[1].toISOString() })
      .then(({ data, error }) => { if (error) setErr(error.message); else setRep(data as Report); });
  }, [range]);

  const s = rep?.summary || {};
  const n = (k: string) => Number(s[k] ?? 0);
  const late = (o: Row) => o.status === "done" && o.actual_min != null && o.promised_min != null && o.actual_min > o.promised_min + 5;
  const rows = (rep?.orders || []).filter(o => filter === "all" || (filter === "missed" ? ["rejected", "unanswered"].includes(o.status) : late(o)));
  function csv() {
    if (!rep) return;
    const head = ["Nr", "Data", "Client", "Tip", "Zona", "Total", "Status", "Motiv refuz", "Acceptat de", "Minute până la acceptare", "Timp promis", "Timp final", "Livrat în", "Curier", "Rating"];
    const body = rep.orders.map(o => [o.number, dt(o.created_at), o.name, o.mode, o.zone || "", o.total, ST[o.status]?.[0] || o.status, o.reject_reason || "", o.accepted_by || o.rejected_by || "", o.accept_min ?? "", o.promised_min ?? "", o.final_eta ?? "", o.actual_min ?? "", o.courier || "", o.rating ?? ""]);
    const text = "﻿" + [head, ...body].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    a.download = `raport-lyra-${range[0].toISOString().slice(0, 10)}.csv`; a.click();
  }

  return (
    <div className="adm-page rep">
      <div className="adm-bar"><h1>Rapoarte</h1>
        <div className="rep-range">
          {PRESETS.map(([l, f], i) => <button key={l} aria-pressed={preset === i} onClick={() => { setPreset(i); setRange(f()); }}>{l}</button>)}
          <input type="date" aria-label="De la" value={range[0].toISOString().slice(0, 10)} onChange={e => { setPreset(-1); setRange([day(new Date(e.target.value)), range[1]]); }} />
          <input type="date" aria-label="Până la" value={new Date(range[1].getTime() - 1).toISOString().slice(0, 10)} onChange={e => { setPreset(-1); setRange([range[0], new Date(day(new Date(e.target.value)).getTime() + 864e5)]); }} />
          <button onClick={csv} disabled={!rep}>Export Excel</button>
        </div>
      </div>
      {err && <p className="err">{err}</p>}
      {!rep && !err && <p className="muted">Se încarcă raportul…</p>}
      {rep && <>
        <div className="rw-stats">
          <div className="rw-stat"><small>Comenzi</small><b className="num">{n("orders")}</b><span>{n("done")} livrate · {lei(n("revenue"))}</span></div>
          <div className={`rw-stat ${n("missed") ? "hot" : ""}`}><small>Ratate</small><b className="num">{n("missed")}</b><span>{n("rejected")} refuzate{n("client_cancelled") ? ` (din care ${n("client_cancelled")} anulate de client)` : ""} · {n("unanswered")} nepreluate · {lei(n("lost_revenue"))}</span></div>
          <div className="rw-stat"><small>Timp până la acceptare</small><b className="num">{mins(s.avg_accept_min)}</b><span>{n("slow_accept")} acceptate după 5 min</span></div>
          <div className="rw-stat"><small>Timp promis</small><b className="num">{mins(s.avg_promised_min)}</b><span>media la comenzile livrate</span></div>
          <div className="rw-stat"><small>Livrare reală</small><b className="num">{mins(s.avg_actual_min)}</b><span>de la acceptare la livrat</span></div>
          <div className={`rw-stat ${n("late") ? "hot" : ""}`}><small>La timp</small><b className="num">{n("done") ? Math.round((n("on_time") / n("done")) * 100) : 0}%</b><span>{n("late")} întârziate{s.avg_late_min ? ` · în medie +${Math.round(Number(s.avg_late_min))} min` : ""}</span></div>
          {n("refunded") > 0 && <div className="rw-stat"><small>Rambursate</small><b className="num">{n("refunded")}</b><span>comenzi</span></div>}
        </div>

        <div className="rep-grid">
          <section className="rw-settings">
            <h2>Recepția: deschidere și închidere</h2>
            {rep.sessions.length === 0 && <p className="muted">Recepția nu a fost deschisă în această perioadă.</p>}
            <div className="rep-list">{rep.sessions.map((x, i) => <div key={i}>
              <span><b>{x.name || "—"}</b><small>{x.device || ""}</small></span>
              <span className="num">{dt(x.started_at)} → {x.open ? <b className="tag green">deschisă acum</b> : t(x.ended_at)}{x.lost && <small> (fără „Ieși”: ultima activitate)</small>}</span>
              <span className="num">{dur(x.minutes)}</span>
            </div>)}</div>
            <h2 style={{ marginTop: 10 }}>Evenimente</h2>
            {rep.events.length === 0 && <p className="muted">Niciun eveniment.</p>}
            <div className="rep-list">{rep.events.map((e, i) => <div key={i} className={e.kind === "accepting_off" ? "warn" : ""}>
              <span className="num">{dt(e.at)}</span><span><b>{e.name || "—"}</b> {EV[e.kind] || e.kind}</span>
            </div>)}</div>
          </section>
          <section className="rw-settings">
            <h2>Echipa</h2>
            {rep.staff.length === 0 && <p className="muted">Nicio comandă acceptată.</p>}
            <div className="rep-list">{rep.staff.map(x => <div key={x.name}><span><b>{x.name}</b></span><span className="num">{x.accepted} acceptate</span><span className="num">{mins(x.avg_accept_min)} până la acceptare</span></div>)}</div>
            <p className="fine" style={{ textAlign: "left", margin: 0 }}>Ratate = refuzate + nepreluate în 10 minute. Întârziată = livrată cu peste 5 minute după timpul promis la acceptare.</p>
          </section>
        </div>

        <section className="rw-cust">
          <div className="row-btw"><h2>Comenzi</h2>
            <div className="rep-range">{([["all", "Toate"], ["missed", "Ratate"], ["late", "Întârziate"]] as const).map(([k, l]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}</div></div>
          <div className="rw-table rep-table">
            <div className="rw-tr rw-th"><span>Comanda</span><span>Status</span><span>Acceptare</span><span>Promis</span><span>Livrat în</span><span>De</span><span>Total</span></div>
            {rows.map(o => <div key={o.number} className="rw-tr">
              <span><b>#{o.number} · {o.name}</b><small>{dt(o.created_at)} · {o.mode === "livrare" ? `livrare${o.zone ? " · " + o.zone : ""}` : "ridicare"}</small></span>
              <span><i className={`tag ${ST[o.status]?.[1] || ""}`}>{ST[o.status]?.[0] || o.status}</i>{o.reject_reason && <small>{o.reject_reason}</small>}</span>
              <span className={`num ${o.accept_min != null && o.accept_min > 5 ? "rep-bad" : ""}`}>{mins(o.accept_min)}</span>
              <span className="num">{mins(o.promised_min)}{o.final_eta != null && o.final_eta !== o.promised_min ? <small>final {o.final_eta} min</small> : null}</span>
              <span className={`num ${late(o) ? "rep-bad" : o.status === "done" ? "rep-good" : ""}`}>{mins(o.actual_min)}</span>
              <span>{o.accepted_by || o.rejected_by || "—"}{o.courier ? <small>curier {o.courier}</small> : null}</span>
              <span className="num">{lei(Number(o.total))}</span>
            </div>)}
            {rows.length === 0 && <p className="muted" style={{ padding: 16 }}>Nicio comandă.</p>}
          </div>
        </section>
      </>}
    </div>
  );
}
