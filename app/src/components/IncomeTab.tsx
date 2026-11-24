// Recepție → Încasări: comenzile finalizate pe zile sau pe un interval ales, defalcate pe numerar / card la livrator / online.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { lei } from "../lib/format";

type Row = { created_at: string; total: number; payment: "cash" | "card" | "online"; pay_status: string | null; mode: string; number: number };
const TZ = "Europe/Bucharest";
const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);   // YYYY-MM-DD în ora României
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dmy = (iso: string) => iso.split("-").reverse().join(".");
/** începutul zilei locale ca moment UTC */
function startOf(iso: string) {
  const guess = Date.parse(iso + "T00:00:00Z");
  const p: Record<string, number> = {};
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(guess)).forEach(x => { if (x.type !== "literal") p[x.type] = +x.value; });
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - guess;   // +2 h iarna, +3 h vara
  return new Date(guess - offset);
}
const PAY: [Row["payment"], string][] = [["cash", "Numerar"], ["card", "Card la livrator / POS"], ["online", "Plată online"]];

export default function IncomeTab() {
  const today = day(new Date());
  const [preset, setPreset] = useState<"today" | "yesterday" | "7" | "month" | "custom">("today");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");

  const range = useMemo(() => {
    if (preset === "today") return [today, today];
    if (preset === "yesterday") return [addDays(today, -1), addDays(today, -1)];
    if (preset === "7") return [addDays(today, -6), today];
    if (preset === "month") return [today.slice(0, 8) + "01", today];
    return from <= to ? [from, to] : [to, from];
  }, [preset, from, to, today]);

  useEffect(() => {
    let alive = true;
    setRows(null); setErr("");
    (async () => {
      const all: Row[] = [];
      for (let p = 0; p < 20; p++) {   // câte 1000 de rânduri
        const { data, error } = await supabase.from("orders").select("created_at,total,payment,pay_status,mode,number")
          .eq("status", "done").gte("created_at", startOf(range[0]).toISOString()).lt("created_at", startOf(addDays(range[1], 1)).toISOString())
          .order("created_at").range(p * 1000, p * 1000 + 999);
        if (error) { if (alive) setErr(error.message); return; }
        all.push(...((data || []) as Row[]));
        if (!data || data.length < 1000) break;
      }
      if (alive) setRows(all);
    })();
    return () => { alive = false; };
  }, [range[0], range[1]]);

  const sum = (list: Row[]) => list.reduce((a, o) => a + Number(o.total), 0);
  const byPay = (list: Row[], p: Row["payment"]) => list.filter(o => o.payment === p);
  const days = useMemo(() => {
    const m = new Map<string, Row[]>();
    (rows || []).forEach(o => { const k = day(new Date(o.created_at)); m.set(k, [...(m.get(k) || []), o]); });
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  return <div className="inc">
    <div className="inc-bar">
      {([["today", "Azi"], ["yesterday", "Ieri"], ["7", "Ultimele 7 zile"], ["month", "Luna aceasta"], ["custom", "Alege perioada"]] as const).map(([k, l]) =>
        <button key={k} aria-pressed={preset === k} onClick={() => setPreset(k)}>{l}</button>)}
      {preset === "custom" && <span className="inc-dates">
        <label>de la <input type="date" value={from} max={today} onChange={e => setFrom(e.target.value)} /></label>
        <label>până la <input type="date" value={to} max={today} onChange={e => setTo(e.target.value)} /></label></span>}
    </div>
    <p className="muted inc-range">{range[0] === range[1] ? dmy(range[0]) : `${dmy(range[0])} – ${dmy(range[1])}`} · doar comenzile finalizate (livrate / ridicate)</p>
    {err && <p className="err">{err}</p>}
    {!rows ? <p className="muted">Se încarcă…</p> : <>
      <div className="inc-cards">
        {PAY.map(([p, l]) => { const list = byPay(rows, p); return <div key={p} className={`inc-card ${p}`}><small>{l}</small><b className="num">{lei(sum(list))}</b><span>{list.length} comenzi</span></div>; })}
        <div className="inc-card total"><small>Total încasat</small><b className="num">{lei(sum(rows))}</b><span>{rows.length} comenzi</span></div>
      </div>
      <div className="inc-mode">
        {(["livrare", "ridicare"] as const).map(m => { const list = rows.filter(o => o.mode === m); return <span key={m}>{m === "livrare" ? "Livrare" : "Ridicare"}: <b>{lei(sum(list))}</b> ({list.length})</span>; })}
        <span>Numerar de predat de livratori: <b>{lei(sum(rows.filter(o => o.payment === "cash" && o.mode === "livrare")))}</b></span>
      </div>
      {days.length > 1 && <div className="inc-table">
        <div className="inc-row head"><span>Ziua</span><span>Numerar</span><span>Card livrator</span><span>Online</span><span>Total</span><span>Comenzi</span></div>
        {days.map(([d, list]) => <div key={d} className="inc-row"><span>{dmy(d)}</span>
          {PAY.map(([p]) => <span key={p} className="num">{lei(sum(byPay(list, p)))}</span>)}
          <span className="num"><b>{lei(sum(list))}</b></span><span className="num">{list.length}</span></div>)}
      </div>}
      {rows.length === 0 && <p className="muted">Nicio comandă finalizată în perioada aleasă.</p>}
    </>}
  </div>;
}
