import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { PublicOrder } from "../lib/types";
import { GOOGLE_REVIEW_URL, hm, lei } from "../lib/format";
import Icon from "../components/Icon";

const R = 82, CIRC = 2 * Math.PI * R;

export default function Track() {
  const { token } = useParams();
  const [o, setO] = useState<PublicOrder | null>(null);
  const [missing, setMissing] = useState(false);
  const [now, setNow] = useState(Date.now());

  async function load() {
    const { data, error } = await supabase.rpc("get_order", { p_token: token });
    if (error || !data) { setMissing(true); return; }
    setO(data as PublicOrder);
  }
  useEffect(() => {
    load();
    const poll = setInterval(load, 5000);   // the restaurant's updates arrive within 5 s
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [token]);

  async function rate(n: number) {
    await supabase.rpc("rate_order", { p_token: token, p_rating: n });
    load();
  }

  if (missing) return <div className="app"><div className="track"><h1 className="t-title">Comanda nu a fost găsită</h1><p className="t-sub">Verifică linkul primit sau <Link to="/" style={{ color: "var(--gold)" }}>deschide meniul</Link>.</p></div></div>;
  if (!o) return <div className="app"><p className="t-sub" style={{ padding: 24, textAlign: "center" }}>Se încarcă comanda…</p></div>;

  const pick = o.mode === "ridicare";
  const si = { new: 0, prep: 1, road: 2, done: 3, rejected: 0 }[o.status];
  const labels = ["Trimisă", "În bucătărie", pick ? "Gata de ridicare" : "Pe drum", pick ? "Ridicată" : "Livrată"];
  const due = o.accepted_at && o.eta_min ? new Date(o.accepted_at).getTime() + o.eta_min * 60000 : 0;
  const rem = due - now;
  const frac = o.eta_min ? Math.max(0, Math.min(1, rem / (o.eta_min * 60000))) : 0;

  let ring = null, title = "", sub: React.ReactNode = "";
  if (o.status === "new") {
    ring = <div className="ring wait"><svg viewBox="0 0 184 184"><circle cx="92" cy="92" r={R} style={{ stroke: "var(--surface-3)" }} strokeWidth="10" fill="none" /><circle cx="92" cy="92" r={R} style={{ stroke: "var(--brand)", transition: "stroke-dashoffset 1s linear" }} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={`${CIRC * 0.22} ${CIRC}`} /></svg><div className="c"><b style={{ fontSize: 32 }}>#{o.number}</b><small>trimisă</small></div></div>;
    title = "Restaurantul confirmă comanda"; sub = "De obicei durează sub un minut. Ora estimată apare aici.";
  } else if (o.status === "rejected") {
    title = "Comanda nu a putut fi preluată"; sub = <>{o.reject_reason ? o.reject_reason + ". " : ""}Nu ți-a fost reținută nicio sumă. Ne poți suna pentru detalii.</>;
  } else if (o.status === "done") {
    ring = <div className="ring"><svg viewBox="0 0 184 184"><circle cx="92" cy="92" r={R} style={{ stroke: "var(--ok)" }} strokeWidth="10" fill="none" /></svg><div className="c" style={{ color: "var(--ok)" }}><Icon name="check" size={64} /><small>{pick ? "ridicată" : "livrată"}</small></div></div>;
    title = "Poftă bună!"; sub = "Mulțumim că ai comandat de la Lyra.";
  } else {
    ring = <div className="ring"><svg viewBox="0 0 184 184"><circle cx="92" cy="92" r={R} style={{ stroke: "var(--surface-3)" }} strokeWidth="10" fill="none" /><circle cx="92" cy="92" r={R} style={{ stroke: "var(--brand)", transition: "stroke-dashoffset 1s linear" }} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - frac)} /></svg><div className="c"><b className="num">{Math.max(0, Math.ceil(rem / 60000))}</b><small>minute</small></div></div>;
    title = o.status === "prep" ? "Se gătește acum" : pick ? "Comanda te așteaptă" : "Curierul e pe drum";
    sub = <>{pick ? "Gata de ridicare" : "Sosește"} la ~<b>{hm(due)}</b>{!pick && o.address ? ` · ${o.address}` : ""}</>;
  }

  return (
    <div className="app">
      <header className="c-head"><div className="c-row"><Link to="/" className="c-logo"><img src="/img/logo-lyra.jpg" alt="Lyra" /><span>COMANDA #{o.number}</span></Link></div></header>
      <div className="track">
        {ring}
        <h1 className="t-title">{title}</h1>
        <p className="t-sub">{sub}</p>
        {o.status !== "rejected" && <div className="steps">{labels.map((l, i) => <div key={l} className={i < si || o.status === "done" ? "done" : i === si ? "now" : ""}><i />{l}</div>)}</div>}
        {o.status === "done" && <>
          <div className="stars" role="group" aria-label="Evaluează comanda">{[1, 2, 3, 4, 5].map(n => <button key={n} className={(o.rating || 0) >= n ? "on" : ""} onClick={() => rate(n)} aria-label={`${n} stele`}><Icon name="star" size={32} fill /></button>)}</div>
          {!o.rating && <p className="t-sub">Cum a fost? Apasă pe stele. Evaluarea ajunge direct la bucătar.</p>}
          {o.rating && o.rating >= 4 && (
            <div className="review-cta">
              <b>Ne bucurăm că ți-a plăcut!</b>
              <p>Ne ajuți enorm cu o recenzie pe Google. Durează 30 de secunde.</p>
              <a className="cta" href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer"><span className="g-logo">G</span> Lasă o recenzie pe Google</a>
            </div>
          )}
          {o.rating && o.rating <= 3 && <p className="t-sub">Ne pare rău că n-a fost perfect. Am transmis bucătăriei și ne vom strădui mai mult data viitoare.</p>}
        </>}
        {o.messages.length > 0 && <div className="msgs">{[...o.messages].reverse().map((m, i) => <div key={i} className="msg">{m.body}<small>Lyra · {hm(m.at)}</small></div>)}</div>}
      </div>
      <div className="receipt">
        {o.items.map((l, i) => (
          <div key={i} className="ln"><div>{l.qty}× {l.name}<small>{[l.variant, ...l.extras.map(e => "+ " + e.name), l.gift ? "Cadou Lyra Club" : "", l.promo ? "Ofertă: " + l.promo : "", l.note ? `„${l.note}”` : ""].filter(Boolean).join(" · ")}</small></div><span className="num">{l.unit === 0 ? "gratuit" : lei(l.unit * l.qty)}</span></div>
        ))}
        <div className="sum">
          <div><span>Produse</span><span className="num">{lei(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="neg"><span>{o.discount_label}</span><span className="num">−{lei(o.discount)}</span></div>}
          {o.points_value > 0 && <div className="neg"><span>Puncte Lyra Club</span><span className="num">−{lei(o.points_value)}</span></div>}
          {!pick && <div><span>Livrare</span><span className="num">{o.delivery_fee ? lei(o.delivery_fee) : "gratuit"}</span></div>}
          <div className="tot"><span>Total</span><span className="num">{lei(o.total)}</span></div>
        </div>
        <Link to="/" className="big ghost" style={{ textDecoration: "none" }}>Înapoi la meniu</Link>
      </div>
    </div>
  );
}
