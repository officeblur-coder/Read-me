import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Funnel = { visits: number; viewed: number; cart: number; checkout: number; orders: number };
type Step = { kind: string; detail: string | null; at: string };
type Sess = { sid: string; started: string; last_at: string; source: string | null; device: string | null; ordered: boolean; cart: boolean; checkout: boolean; steps: Step[] };
type Traffic = {
  funnel: Funnel; signups: number; real_orders: number; abandoned: number;
  days: { day: string; visits: number; cart: number; checkout: number; orders: number }[];
  sources: { source: string; visits: number; cart: number; orders: number }[];
  devices: { device: string; visits: number; orders: number }[];
  items: { id: string; name: string; views: number; carts: number }[];
  searches: { term: string; n: number }[];
  sessions: Sess[];
};

const day = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const PRESETS: [string, () => [Date, Date]][] = [
  ["Azi", () => [day(new Date()), new Date(day(new Date()).getTime() + 864e5)]],
  ["Ieri", () => [new Date(day(new Date()).getTime() - 864e5), day(new Date())]],
  ["7 zile", () => [new Date(day(new Date()).getTime() - 6 * 864e5), new Date(day(new Date()).getTime() + 864e5)]],
  ["30 zile", () => [new Date(day(new Date()).getTime() - 29 * 864e5), new Date(day(new Date()).getTime() + 864e5)]],
];
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const hm = (s: string) => new Date(s).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
const dd = (s: string) => new Date(s).toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
const SRC: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", google: "Google", qr: "Cod QR", tiktok: "TikTok", whatsapp: "WhatsApp", flyer: "Flyer", direct: "Direct (link scris / salvat)" };
const STEP: Record<string, [string, string]> = {
  visit: ["🏠", "a intrat"], view_item: ["👀", "a deschis"], add_cart: ["🛒", "a pus în coș"], search: ["🔍", "a căutat"],
  checkout: ["💳", "a ajuns la Livrare și plată"], order: ["✅", "a trimis comanda"], account: ["👤", "a deschis Contul"], signup: ["🎉", "a intrat în cont"],
};

/** Anonymous visits: where people come from, what they look at, where they stop. */
export function TrafficTab() {
  const [preset, setPreset] = useState(0);
  const [range, setRange] = useState<[Date, Date]>(PRESETS[0][1]());
  const [r, setR] = useState<Traffic | null>(null);
  const [err, setErr] = useState("");
  const [only, setOnly] = useState<"all" | "cart" | "ordered">("all");

  useEffect(() => {
    let alive = true;
    const load = () => supabase.rpc("admin_traffic", { p_from: range[0].toISOString(), p_to: range[1].toISOString() })
      .then(({ data, error }) => { if (!alive) return; if (error) setErr(error.message); else { setErr(""); setR(data as Traffic); } });
    setR(null); load();
    const t = setInterval(load, 60000);            // se actualizează singur la fiecare minut
    return () => { alive = false; clearInterval(t); };
  }, [range]);

  const f = r?.funnel;
  const stages: [string, number, string][] = f ? [
    ["Vizitatori", f.visits, "au intrat pe site"],
    ["Au deschis un produs", f.viewed, "s-au uitat la detalii"],
    ["Au pus în coș", f.cart, "cel puțin un produs"],
    ["Livrare și plată", f.checkout, "au ajuns la ultimul pas"],
    ["Au comandat", f.orders, "au trimis comanda"],
  ] : [];
  // cea mai mare pierdere între doi pași consecutivi (de la „au pus în coș” încolo contează cel mai mult)
  const drop = f && f.visits >= 5 ? (() => {
    if (f.cart < f.visits * 0.15) return "Mulți intră, dar puțini pun ceva în coș: verifică prețurile, pozele și primul ecran (bannerul, „Cele mai comandate”).";
    if (f.checkout < f.cart * 0.6) return "Mulți pun în coș, dar nu merg mai departe: poate taxa de livrare, ambalajul sau comanda minimă îi opresc.";
    if (f.orders < f.checkout * 0.5) return "Mulți ajung la Livrare și plată, dar nu trimit: verifică zona de livrare, programul și ce scrie la adresă.";
    return "";
  })() : "";
  const sessions = (r?.sessions || []).filter(s => only === "all" || (only === "cart" ? s.cart && !s.ordered : s.ordered));

  return (
    <div className="adm-page rep">
      <div className="adm-bar"><h1>Vizite pe site</h1>
        <div className="rep-range">{PRESETS.map(([l, fn], i) => <button key={l} aria-pressed={preset === i} onClick={() => { setPreset(i); setRange(fn()); }}>{l}</button>)}</div></div>
      <p className="muted adm-help">Statistici anonime, fără Google și fără cookie-uri de reclamă: fiecare vizită e numărată o singură dată, fără nume, telefon sau email. Se actualizează singur la fiecare minut. Linkurile cu sursă (<b>lyrasdelivery.ro/fb</b>, <b>/ig</b>, <b>/qr</b>, <b>/google</b>, <b>/tiktok</b>, <b>/wa</b>, <b>/flyer</b>) arată exact de unde vin oamenii.</p>
      {err && <p className="err">{err}</p>}
      {!r && !err && <p className="muted">Se încarcă…</p>}
      {r && f && <>
        <div className="tr-funnel">{stages.map(([l, n, sub], i) => (
          <div key={l} className="tr-stage">
            <small>{l}</small><b className="num">{n}</b><span>{sub}</span>
            {i > 0 && <em className="num">{pct(n, f.visits)}% din vizitatori</em>}
            <i style={{ width: `${Math.max(4, pct(n, Math.max(1, f.visits)))}%` }} />
          </div>))}</div>
        <div className="rw-stats" style={{ marginTop: 12 }}>
          <div className={`rw-stat ${r.abandoned ? "hot" : ""}`}><small>Coșuri abandonate</small><b className="num">{r.abandoned}</b><span>au pus în coș și au plecat</span></div>
          <div className="rw-stat"><small>Conturi noi</small><b className="num">{r.signups}</b><span>în perioada aleasă</span></div>
          <div className="rw-stat"><small>Comenzi primite</small><b className="num">{r.real_orders}</b><span>din baza de comenzi</span></div>
        </div>
        {drop && <p className="tr-tip">💡 {drop}</p>}

        <div className="rep-grid" style={{ marginTop: 16 }}>
          <section className="rw-settings">
            <h3>De unde vin</h3>
            {!r.sources.length && <p className="muted">Nicio vizită încă.</p>}
            <div className="tr-tbl">
              {r.sources.length > 0 && <div className="tr-h"><span>Sursă</span><span>Vizite</span><span>Coș</span><span>Comenzi</span></div>}
              {r.sources.map(x => <div key={x.source}><span>{SRC[x.source] || x.source}</span><span className="num">{x.visits}</span><span className="num">{x.cart}</span><span className="num">{x.orders} <small>({pct(x.orders, x.visits)}%)</small></span></div>)}
            </div>
            <h3 style={{ marginTop: 18 }}>Pe ce intră</h3>
            <div className="tr-tbl">{r.devices.map(x => <div key={x.device}><span>{x.device === "telefon" ? "📱 Telefon" : x.device === "calculator" ? "💻 Calculator" : x.device}</span><span className="num">{x.visits} vizite</span><span /><span className="num">{x.orders} comenzi</span></div>)}</div>
            <h3 style={{ marginTop: 18 }}>Pe zile</h3>
            <div className="tr-tbl">
              {r.days.length > 0 && <div className="tr-h"><span>Zi</span><span>Vizite</span><span>Coș / plată</span><span>Comenzi</span></div>}
              {r.days.map(x => <div key={x.day}><span>{dd(x.day)}</span><span className="num">{x.visits}</span><span className="num">{x.cart} / {x.checkout}</span><span className="num">{x.orders}</span></div>)}
            </div>
          </section>
          <section className="rw-settings">
            <h3>Produse care atrag</h3>
            {!r.items.length && <p className="muted">Încă nimeni nu a deschis un produs.</p>}
            <div className="tr-tbl">
              {r.items.length > 0 && <div className="tr-h"><span>Produs</span><span>Deschis</span><span>În coș</span><span /></div>}
              {r.items.map(x => <div key={x.id}><span>{x.name}</span><span className="num">{x.views}</span><span className="num">{x.carts}</span><span /></div>)}
            </div>
            <h3 style={{ marginTop: 18 }}>Ce caută</h3>
            {!r.searches.length ? <p className="muted">Nicio căutare.</p>
              : <div className="tr-chips">{r.searches.map(x => <span key={x.term}>„{x.term}” <b>{x.n}</b></span>)}</div>}
          </section>
        </div>

        <section className="rw-settings" style={{ marginTop: 16 }}>
          <div className="row-btw" style={{ flexWrap: "wrap", gap: 8 }}><h3>Ce au făcut vizitatorii <small className="muted">(ultimele {r.sessions.length})</small></h3>
            <div className="rep-range">{([["all", "Toți"], ["cart", "Coș abandonat"], ["ordered", "Au comandat"]] as const).map(([k, l]) =>
              <button key={k} aria-pressed={only === k} onClick={() => setOnly(k)}>{l}</button>)}</div></div>
          {!sessions.length && <p className="muted">Nimic de arătat.</p>}
          <div className="tr-sess">{sessions.map(s => (
            <div key={s.sid} className={s.ordered ? "ok" : s.cart ? "warn" : ""}>
              <div className="tr-sh"><b className="num">{dd(s.started)} · {hm(s.started)}</b>
                <span>{SRC[s.source || "direct"] || s.source} · {s.device || "?"}</span>
                <em>{s.ordered ? "a comandat" : s.checkout ? "a plecat la plată" : s.cart ? "coș abandonat" : "doar a privit"}</em></div>
              <div className="tr-steps">{s.steps.filter(x => x.kind !== "visit").map((x, i) => <span key={i} title={hm(x.at)}>{STEP[x.kind]?.[0]} {STEP[x.kind]?.[1]}{x.detail ? ` ${x.kind === "order" ? "#" : x.kind === "search" ? "„" : ""}${x.detail}${x.kind === "search" ? "”" : ""}` : ""}</span>)}
                {s.steps.length <= 1 && <span className="muted">a intrat și a plecat</span>}</div>
            </div>))}</div>
        </section>
      </>}
    </div>
  );
}
