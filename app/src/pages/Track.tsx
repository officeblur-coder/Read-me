import { whenLabel } from "../lib/schedule";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { confetti } from "../lib/fx";
import { supabase } from "../lib/supabase";
import type { PublicOrder } from "../lib/types";
import { GOOGLE_REVIEW_URL, hm, lei, mmss } from "../lib/format";
import Icon from "../components/Icon";
import Wordmark from "../components/Wordmark";

const R = 82, CIRC = 2 * Math.PI * R;

export default function Track() {
  const { token } = useParams();
  const [o, setO] = useState<PublicOrder | null>(null);
  const [missing, setMissing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [skew, setSkew] = useState(0);               // ceasul telefonului față de server
  const [answering, setAnswering] = useState<"" | "confirm-cancel" | "busy">("");
  const [answerErr, setAnswerErr] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [payErr, setPayErr] = useState("");
  async function payNow() {
    setPayBusy(true); setPayErr("");
    const { startPayment } = await import("../lib/pay");
    const err = await startPayment(token!);
    setPayBusy(false); if (err) setPayErr(err);
  }
  const loc = useLocation();
  const backFromPay = new URLSearchParams(loc.search).get("plata");
  useEffect(() => { if ((loc.state as { fresh?: boolean } | null)?.fresh) { setTimeout(confetti, 250); history.replaceState({}, ""); } }, []);

  async function load() {
    const { data, error } = await supabase.rpc("get_order", { p_token: token });
    if (error || !data) { setMissing(true); return; }
    const d = data as PublicOrder;
    if (d.server_now) setSkew(new Date(d.server_now).getTime() - Date.now());
    setO(d);
  }
  useEffect(() => {
    load();
    const poll = setInterval(load, 5000);   // the restaurant's updates arrive within 5 s
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [token]);

  async function answer(accept: boolean) {
    setAnswering("busy"); setAnswerErr("");
    const { error } = await supabase.rpc("answer_offer", { p_token: token, p_accept: accept });
    if (error) setAnswerErr(error.message);
    else if (accept) setTimeout(confetti, 150);
    setAnswering("");
    load();
  }

  async function rate(n: number) {
    await supabase.rpc("rate_order", { p_token: token, p_rating: n });
    load();
  }

  if (missing) return <div className="app"><div className="track"><h1 className="t-title">Comanda nu a fost găsită</h1><p className="t-sub">Verifică linkul primit sau <Link to="/" style={{ color: "var(--gold)" }}>deschide meniul</Link>.</p></div></div>;
  if (!o) return <div className="app"><p className="t-sub" style={{ padding: 24, textAlign: "center" }}>Se încarcă comanda…</p></div>;

  const pick = o.mode === "ridicare";
  const si = { new: 0, prep: 1, road: 2, done: 3, rejected: 0, refunded: 3 }[o.status];
  const labels = ["Trimisă", "În bucătărie", pick ? "Gata de ridicare" : "Pe drum", pick ? "Ridicată" : "Livrată"];
  const due = o.accepted_at && o.eta_min ? new Date(o.accepted_at).getTime() + o.eta_min * 60000 : 0;
  const rem = due - now;
  const frac = o.eta_min ? Math.max(0, Math.min(1, rem / (o.eta_min * 60000))) : 0;

  let ring = null, title = "", sub: React.ReactNode = "", offer: React.ReactNode = null;
  const refundNote = o.pay_status === "refunding" || o.pay_status === "refunded";
  const sched = o.scheduled_for ? whenLabel(o.scheduled_for) : "";
  const later = !!o.scheduled_for && new Date(o.scheduled_for).getTime() - now > 60 * 60000;
  if (o.status === "new" && sched) {
    ring = <div className="ring wait"><svg viewBox="0 0 184 184"><circle cx="92" cy="92" r={R} style={{ stroke: "var(--surface-3)" }} strokeWidth="10" fill="none" /></svg><div className="c"><b className="num" style={{ fontSize: 34 }}>{sched.split(" la ")[1]}</b><small>{sched.split(" la ")[0]}</small></div></div>;
    title = "Precomandă trimisă"; sub = <>Ai programat comanda pentru <b>{sched}</b>. Restaurantul o confirmă în program și primești confirmarea aici.</>;
  } else if ((o.status === "prep") && later) {
    ring = <div className="ring"><svg viewBox="0 0 184 184"><circle cx="92" cy="92" r={R} style={{ stroke: "var(--ok)" }} strokeWidth="10" fill="none" /></svg><div className="c"><b className="num" style={{ fontSize: 34 }}>{sched.split(" la ")[1]}</b><small>{sched.split(" la ")[0]}</small></div></div>;
    title = "Precomandă confirmată"; sub = <>{pick ? "Comanda e gata de ridicat" : "Comanda ajunge"} <b>{sched}</b>{!pick && o.address ? ` · ${o.address}` : ""}</>;
  } else if (o.status === "new" && o.pay_status === "pending") {
    ring = <div className="ring wait"><svg viewBox="0 0 184 184"><circle cx="92" cy="92" r={R} style={{ stroke: "var(--surface-3)" }} strokeWidth="10" fill="none" /><circle cx="92" cy="92" r={R} style={{ stroke: "var(--gold)" }} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={`${CIRC * 0.22} ${CIRC}`} /></svg><div className="c"><b style={{ fontSize: 32 }}>#{o.number}</b><small>plată</small></div></div>;
    if (backFromPay === "ok") { title = "Se confirmă plata…"; sub = "Durează câteva secunde. Comanda ajunge apoi la restaurant."; }
    else {
      title = "Comanda așteaptă plata"; sub = "Restaurantul primește comanda după plata cu cardul. Ai 30 de minute, apoi comanda se anulează.";
      offer = <div className="pay-box">{backFromPay === "anulat" && <p>Plata a fost întreruptă. Poți încerca din nou.</p>}
        <button className="big" disabled={payBusy} onClick={payNow}>{payBusy ? "Se deschide plata…" : `Plătește ${lei(o.total)} cu cardul`}</button>
        {payErr && <p className="err">{payErr}</p>}</div>;
    }
  } else if (o.status === "new" && o.offered_at && o.offer_eta) {
    const sNow = now + skew;
    const left = new Date(o.offered_at).getTime() + (o.offer_window || 5) * 60000 - sNow;
    const at = hm(Date.now() + o.offer_eta * 60000);
    ring = <div className="ring offer"><svg viewBox="0 0 184 184"><circle cx="92" cy="92" r={R} style={{ stroke: "var(--gold)" }} strokeWidth="10" fill="none" /></svg><div className="c"><b className="num">{o.offer_eta}</b><small>minute</small></div></div>;
    title = `Restaurantul poate ${pick ? "pregăti" : "livra"} în ${o.offer_eta} minute`;
    sub = <>{pick ? "Comanda e gata de ridicare" : "Comanda ajunge"} la ~<b>{at}</b>. Îți convine timpul?</>;
    offer = (
      <div className="offer-box" role="group" aria-label="Confirmă timpul de livrare">
        <button className="big" disabled={answering === "busy"} onClick={() => answer(true)}><Icon name="check" size={20} />Accept · {pick ? "gata" : "ajunge"} la {at}</button>
        {answering === "confirm-cancel"
          ? <div className="offer-sure"><b>Sigur anulezi comanda?</b>
              <div><button className="big danger" onClick={() => answer(false)}>Da, anulează</button><button className="big ghost" onClick={() => setAnswering("")}>Nu, o păstrez</button></div></div>
          : <button className="big ghost danger-text" disabled={answering === "busy"} onClick={() => setAnswering("confirm-cancel")}>Nu îmi convine · anulez comanda</button>}
        <p className="offer-left">{left > 0
          ? <>Ai <b className="num">{mmss(left)}</b> să răspunzi. Apoi comanda {o.offer_timeout === "cancel" ? "se anulează" : "se confirmă"} automat.</>
          : "Se confirmă…"}</p>
        {answerErr && <p className="err">{answerErr}</p>}
      </div>
    );
  } else if (o.status === "new") {
    ring = <div className="ring wait"><svg viewBox="0 0 184 184"><circle cx="92" cy="92" r={R} style={{ stroke: "var(--surface-3)" }} strokeWidth="10" fill="none" /><circle cx="92" cy="92" r={R} style={{ stroke: "var(--brand)", transition: "stroke-dashoffset 1s linear" }} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={`${CIRC * 0.22} ${CIRC}`} /></svg><div className="c"><b style={{ fontSize: 32 }}>#{o.number}</b><small>trimisă</small></div></div>;
    title = "Restaurantul confirmă comanda"; sub = "De obicei durează sub un minut. Ora estimată apare aici.";
  } else if (o.status === "refunded") {
    title = "Comanda a fost rambursată"; sub = "Suma ți-a fost returnată. Punctele folosite au revenit în contul tău Lyra Rewards.";
  } else if (o.status === "rejected" && o.cancelled_by === "client") {
    title = "Ai anulat comanda"; sub = `${refundNote ? "" : "Nu ți-a fost reținută nicio sumă, iar p"}${refundNote ? "P" : ""}unctele sau bonusul folosite au revenit în cont. Te așteptăm altă dată!`;
  } else if (o.status === "rejected") {
    title = "Comanda nu a putut fi preluată"; sub = <>{o.reject_reason ? o.reject_reason + ". " : ""}{refundNote ? "" : "Nu ți-a fost reținută nicio sumă. "}Ne poți suna pentru detalii.</>;
  } else if (o.status === "done") {
    ring = <div className="ring"><svg viewBox="0 0 184 184"><circle cx="92" cy="92" r={R} style={{ stroke: "var(--ok)" }} strokeWidth="10" fill="none" /></svg><div className="c" style={{ color: "var(--ok)" }}><Icon name="check" size={64} /><small>{pick ? "ridicată" : "livrată"}</small></div></div>;
    title = "Poftă bună!"; sub = "Mulțumim că ai comandat de la Lyra's Delivery.";
  } else {
    ring = <div className="ring"><svg viewBox="0 0 184 184"><circle cx="92" cy="92" r={R} style={{ stroke: "var(--surface-3)" }} strokeWidth="10" fill="none" /><circle cx="92" cy="92" r={R} style={{ stroke: "var(--brand)", transition: "stroke-dashoffset 1s linear" }} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - frac)} /></svg><div className="c"><b className="num">{Math.max(0, Math.ceil(rem / 60000))}</b><small>minute</small></div></div>;
    title = o.status === "prep" ? "Se gătește acum" : pick ? "Comanda te așteaptă" : "Curierul e pe drum";
    sub = <>{pick ? "Gata de ridicare" : "Sosește"} la ~<b>{hm(due)}</b>{!pick && o.address ? ` · ${o.address}` : ""}</>;
  }

  return (
    <div className="app">
      <header className="c-head"><div className="c-row"><Link to="/" className="c-logo"><Wordmark small /><span>COMANDA #{o.number}</span></Link></div></header>
      <div className="track">
        {ring}
        <h1 className="t-title">{title}</h1>
        <p className="t-sub">{sub}</p>
        {o.pay_status === "paid" && o.status !== "rejected" && <span className="paid-tag"><Icon name="check" size={14} />Plătită online cu cardul</span>}
        {(o.pay_status === "refunding" || o.pay_status === "refunded") && <p className="t-sub"><b>{o.pay_status === "refunded" ? "Plata ți-a fost returnată pe card" : "Plata îți va fi returnată pe card"}</b> (de obicei în 3–5 zile lucrătoare).</p>}
        {offer}
        {o.status !== "rejected" && o.status !== "refunded" && <div className="steps">{labels.map((l, i) => <div key={l} className={i < si || o.status === "done" ? "done" : i === si ? "now" : ""}><i />{l}</div>)}</div>}
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
        {o.messages.length > 0 && <div className="msgs">{[...o.messages].reverse().map((m, i) => <div key={i} className="msg">{m.body}<small>Lyra's Delivery · {hm(m.at)}</small></div>)}</div>}
      </div>
      <div className="receipt">
        {o.items.map((l, i) => (
          <div key={i} className="ln"><div>{l.qty}× {l.name}<small>{[l.variant, ...l.extras.map(e => "+ " + e.name), l.gift ? "Desert cadou Lyra Rewards" : "", l.promo ? "Ofertă: " + l.promo : "", l.note ? `„${l.note}”` : ""].filter(Boolean).join(" · ")}</small></div><span className="num">{l.unit === 0 ? "gratuit" : lei(l.unit * l.qty)}</span></div>
        ))}
        <div className="sum">
          <div><span>Produse</span><span className="num">{lei(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="neg"><span>{o.discount_label}</span><span className="num">−{lei(o.discount)}</span></div>}
          {o.points_value > 0 && <div className="neg"><span>Puncte Lyra Rewards</span><span className="num">−{lei(o.points_value)}</span></div>}
          {Number(o.welcome_value) > 0 && <div className="neg"><span>Bonus de bun venit</span><span className="num">−{lei(Number(o.welcome_value))}</span></div>}
          {Number(o.packaging) > 0 && <div><span>Ambalaj</span><span className="num">{lei(Number(o.packaging))}</span></div>}
          {Number(o.sgr) > 0 && <div><span>Garanție SGR</span><span className="num">{lei(Number(o.sgr))}</span></div>}
          {!pick && <div><span>Livrare</span><span className="num">{o.delivery_fee ? lei(o.delivery_fee) : "gratuit"}</span></div>}
          <div className="tot"><span>Total</span><span className="num">{lei(o.total)}</span></div>
        </div>
        <Link to="/" className="big ghost" style={{ textDecoration: "none" }}>Înapoi la meniu</Link>
      </div>
    </div>
  );
}
