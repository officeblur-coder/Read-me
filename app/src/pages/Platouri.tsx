// Registru platouri de sărbători: lyrasdelivery.ro/platouri (separat de meniul online)
//  • recepția (contul platouri@ sau un cont de recepție) introduce comenzile și trimite clientului cererea de plată pe email
//  • Simona (simona@) vede tot, bifează „verificat” și printează
//  • clientul plătește integral din linkul primit: /platouri/plata/<token>
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { lei } from "../lib/format";
import Icon from "../components/Icon";
import Wordmark from "../components/Wordmark";
import { Login } from "./Reception";

type Line = { name: string; qty: number; price: number };
type PO = {
  id: string; number: number; name: string; phone: string; address: string; email: string | null; lines: Line[]; qty: number; total: number;
  dispatcher: string; order_date: string; delivery_date: string; delivery_time: string; note: string;
  pay_status: "none" | "sent" | "paid"; pay_sent_at: string | null; pay_sent_count: number; paid_at: string | null;
  verified_at: string | null; verified_by: string | null; cancelled: boolean; created_by: string | null; created_at: string;
};
type Product = { id: number; name: string; price: number };
type Me = { role: "editor" | "checker"; name: string };
type Draft = Omit<PO, "id" | "number" | "qty" | "total" | "lines" | "pay_status" | "pay_sent_at" | "pay_sent_count" | "paid_at" | "verified_at" | "verified_by" | "cancelled" | "created_by" | "created_at" | "email"> & {
  id?: string; email: string; lines: { name: string; qty: string; price: string }[];
};

const TZ = "Europe/Bucharest";
const today = (add = 0) => { const d = new Date(Date.now() + add * 864e5); return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); };
const dmy = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}.${m}.${y}`; };
const WD = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];
const dayName = (iso: string) => WD[new Date(iso + "T12:00:00").getDay()];
const at = (iso: string | null) => iso ? new Date(iso).toLocaleString("ro-RO", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
const empty = (): Draft => ({ name: "", phone: "", address: "", email: "", dispatcher: "", order_date: today(), delivery_date: "", delivery_time: "", note: "", lines: [{ name: "", qty: "1", price: "" }] });
const num = (s: string) => Number(String(s).replace(",", ".")) || 0;

export default function Platouri() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => {
    document.title = "Registru platouri · Lyra";
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setMe(undefined); return; }
    supabase.rpc("platter_me").then(({ data }) => setMe((data as Me) || null));
  }, [session]);
  if (!ready) return null;
  if (!session) return <Login title="Registru platouri" />;
  if (me === undefined) return <div className="login"><p className="muted">Se verifică accesul…</p></div>;
  if (!me) return (
    <div className="login"><form onSubmit={e => { e.preventDefault(); supabase.auth.signOut(); }}>
      <Wordmark small /><h1>Fără acces</h1>
      <p className="muted" style={{ textAlign: "center" }}>Contul {session.user.email} nu are acces la registrul de platouri.</p>
      <button className="big ghost">Ieși din cont</button></form></div>
  );
  return <Register me={me} />;
}

function Register({ me }: { me: Me }) {
  const editor = me.role === "editor";
  const [orders, setOrders] = useState<PO[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState<{ m: string; bad?: boolean }>({ m: "" });
  const [filter, setFilter] = useState<"next" | "all" | "unpaid" | "unverified" | "cancelled">("next");
  const [q, setQ] = useState("");
  const [printing, setPrinting] = useState<PO[] | null>(null);
  const flash = (m: string, bad = false) => { setToast({ m, bad }); setTimeout(() => setToast({ m: "" }), bad ? 7000 : 3000); };

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("platter_list");
    if (data) {
      setOrders(prev => {
        const list = (data.orders || []) as PO[];
        // plata confirmată între timp: anunț pe ecran
        list.forEach(o => { const was = prev.find(p => p.id === o.id); if (was && was.pay_status !== "paid" && o.pay_status === "paid") flash(`Plata confirmată: #${o.number} ${o.name} · ${lei(Number(o.total))}`); });
        return list;
      });
      setProducts((data.products || []) as Product[]);
    }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => { window.print(); setPrinting(null); }, 150);
    return () => clearTimeout(t);
  }, [printing]);

  const t0 = today(), t1 = today(1);
  const active = orders.filter(o => !o.cancelled);
  const tomorrow = active.filter(o => o.delivery_date === t1);
  const todays = active.filter(o => o.delivery_date === t0);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return orders.filter(o =>
      (filter === "cancelled" ? o.cancelled : !o.cancelled) &&
      (filter !== "next" || o.delivery_date >= t0) &&
      (filter !== "unpaid" || o.pay_status !== "paid") &&
      (filter !== "unverified" || !o.verified_at) &&
      (!s || `${o.number} ${o.name} ${o.phone} ${o.email || ""} ${o.address} ${o.dispatcher} ${o.lines.map(l => l.name).join(" ")}`.toLowerCase().includes(s)));
  }, [orders, filter, q, t0]);
  const sum = (list: PO[]) => ({ n: list.length, qty: list.reduce((a, o) => a + o.qty, 0), total: list.reduce((a, o) => a + Number(o.total), 0), paid: list.filter(o => o.pay_status === "paid").reduce((a, o) => a + Number(o.total), 0) });
  const tot = sum(shown);

  const dTotal = draft ? draft.lines.reduce((a, l) => a + (l.name.trim() ? num(l.qty) * num(l.price) : 0), 0) : 0;
  const dQty = draft ? draft.lines.reduce((a, l) => a + (l.name.trim() ? num(l.qty) : 0), 0) : 0;
  const editing = draft?.id ? orders.find(o => o.id === draft.id) : undefined;

  async function save(thenPay = false) {
    if (!draft) return;
    setBusy(true); setErr("");
    const { data, error } = await supabase.rpc("platter_save", { p: { ...draft, lines: draft.lines.map(l => ({ name: l.name, qty: num(l.qty), price: num(l.price) })) } });
    if (error) { setBusy(false); setErr(error.message); return; }
    const o = data as PO;
    if (thenPay) {
      const r = await supabase.rpc("platter_send_pay", { p_id: o.id });
      if (r.error) { setBusy(false); setErr(`Comanda #${o.number} e salvată, dar emailul nu s-a trimis: ${r.error.message}`); setDraft({ ...draft, id: o.id }); load(); return; }
      flash(`#${o.number} salvată · cererea de plată trimisă la ${o.email}`);
    } else flash(`Comanda #${o.number} a fost salvată.`);
    setBusy(false); setDraft(null); load();
  }
  async function sendPay(o: PO) {
    if (o.pay_status === "sent" && !window.confirm(`Cererea de plată a fost deja trimisă (${at(o.pay_sent_at)}). O trimit din nou la ${o.email}?`)) return;
    const { error } = await supabase.rpc("platter_send_pay", { p_id: o.id });
    if (error) flash(error.message, true); else { flash(`Cererea de plată a fost trimisă la ${o.email}.`); load(); }
  }
  async function verify(o: PO) {
    const { error } = await supabase.rpc("platter_verify", { p_id: o.id, p_ok: !o.verified_at });
    if (error) flash(error.message, true); else load();
  }
  async function cancel(o: PO) {
    if (!o.cancelled && !window.confirm(`Anulezi comanda #${o.number} (${o.name})?`)) return;
    const { error } = await supabase.rpc("platter_cancel", { p_id: o.id, p_cancel: !o.cancelled });
    if (error) flash(error.message, true); else { flash(o.cancelled ? "Comanda a fost reactivată." : "Comanda a fost anulată."); setDraft(null); load(); }
  }
  const edit = (o: PO) => { setErr(""); setDraft({ id: o.id, name: o.name, phone: o.phone, address: o.address, email: o.email || "", dispatcher: o.dispatcher, order_date: o.order_date, delivery_date: o.delivery_date, delivery_time: o.delivery_time, note: o.note, lines: o.lines.map(l => ({ name: l.name, qty: String(l.qty), price: String(l.price) })) }); };
  const setLine = (i: number, k: "name" | "qty" | "price", v: string) => {
    if (!draft) return;
    const lines = draft.lines.map((l, j) => j !== i ? l : { ...l, [k]: v });
    // produs din listă: prețul se completează singur
    if (k === "name") { const p = products.find(x => x.name.toLowerCase() === v.trim().toLowerCase()); if (p && !draft.lines[i].price) lines[i].price = String(p.price); }
    setDraft({ ...draft, lines });
  };
  const paidLocked = editing?.pay_status === "paid";

  return (
    <div className="pl">
      <header className="pl-top no-print">
        <Wordmark small /><div className="pl-title"><b>Registru platouri</b><small>Sărbători · {me.name}{editor ? "" : " · verificare"}</small></div>
        <span style={{ flex: 1 }} />
        <button className="rbtn" onClick={() => setPrinting(shown)}>Printează lista</button>
        <button className="rbtn" onClick={() => supabase.auth.signOut()}><Icon name="logout" size={15} />Ieși</button>
      </header>

      <main className="pl-main no-print">
        {(tomorrow.length > 0 || todays.length > 0) && <div className="pl-alerts">
          {tomorrow.length > 0 && <Due title={`Mâine, ${dayName(t1)} ${dmy(t1)}, se predau`} list={tomorrow} hot onOpen={edit} canEdit={editor} onPrint={l => setPrinting(l)} />}
          {todays.length > 0 && <Due title={`Azi, ${dmy(t0)}, de predat`} list={todays} onOpen={edit} canEdit={editor} onPrint={l => setPrinting(l)} />}
        </div>}

        <div className="pl-bar">
          {editor && <button className="pl-new" onClick={() => { setErr(""); setDraft(empty()); }}>+ Comandă nouă</button>}
          <div className="pl-filters">{([["next", "De predat"], ["all", "Toate"], ["unpaid", "Neplătite"], ["unverified", "Neverificate"], ["cancelled", "Anulate"]] as const).map(([k, l]) =>
            <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}</div>
          <input className="pl-search" placeholder="Caută nume, telefon, produs…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="pl-sum"><span><b>{tot.n}</b> comenzi</span><span><b>{tot.qty}</b> bucăți</span><span>Total <b>{lei(tot.total)}</b></span><span>Încasat online <b>{lei(tot.paid)}</b></span></div>

        <div className="pl-table">
          <div className="pl-row pl-head"><span>Nr</span><span>Client</span><span>Livrare</span><span>Ce a comandat</span><span className="r">Buc</span><span className="r">Total</span><span>Plată</span><span>Verificat</span><span /></div>
          {shown.length === 0 && <p className="muted" style={{ padding: 20 }}>Nicio comandă aici.</p>}
          {shown.map(o => <div key={o.id} className={`pl-row ${o.cancelled ? "off" : ""}`}>
            <span className="num"><b>#{o.number}</b><small>{dmy(o.order_date)}</small></span>
            <span><b>{o.name}</b><small><a href={`tel:${o.phone.replace(/\s/g, "")}`}>{o.phone}</a>{o.address ? ` · ${o.address}` : ""}</small>{o.email && <small>{o.email}</small>}</span>
            <span><b>{dmy(o.delivery_date)}</b><small>{dayName(o.delivery_date)}{o.delivery_time ? ` · ${o.delivery_time}` : ""}</small></span>
            <span className="pl-items">{o.lines.map((l, i) => <small key={i}>{l.qty}× {l.name} · {lei(l.price)}</small>)}{o.dispatcher && <small className="muted">dispecer: {o.dispatcher}</small>}{o.note && <small className="muted">„{o.note}”</small>}</span>
            <span className="r num">{o.qty}</span>
            <span className="r num"><b>{lei(Number(o.total))}</b></span>
            <span><PayTag o={o} /></span>
            <span><button className={`pl-ver ${o.verified_at ? "on" : ""}`} onClick={() => verify(o)} title={o.verified_at ? `Verificat de ${o.verified_by}, ${at(o.verified_at)}` : "Marchează verificat"}>
              <Icon name="check" size={16} />{o.verified_at ? o.verified_by || "Verificat" : "Verifică"}</button></span>
            <span className="pl-acts">
              {editor && !o.cancelled && <button onClick={() => edit(o)}>Editează</button>}
              {editor && !o.cancelled && o.pay_status !== "paid" && <button className="pay" disabled={!o.email} title={o.email ? "" : "Lipsește emailul clientului"} onClick={() => sendPay(o)}><Icon name="send" size={14} />{o.pay_status === "sent" ? "Retrimite plata" : "Cere plata"}</button>}
              <button onClick={() => setPrinting([o])}>Print</button>
              {editor && o.cancelled && <button onClick={() => cancel(o)}>Reactivează</button>}
            </span>
          </div>)}
        </div>
      </main>

      {draft && <div className="pl-modal no-print" onClick={e => { if (e.target === e.currentTarget) setDraft(null); }}>
        <div className="pl-form">
          <div className="row-btw"><h2>{draft.id ? `Comanda #${editing?.number}` : "Comandă nouă"}</h2><button className="rbtn" onClick={() => setDraft(null)}>Închide</button></div>
          {editing && <p className="muted" style={{ margin: "0 0 6px" }}><PayTag o={editing} /> {editing.verified_at ? ` · verificat de ${editing.verified_by}` : ""}</p>}
          <div className="pl-grid">
            <label className="fl"><span>Nume *</span><input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
            <label className="fl"><span>Telefon *</span><input inputMode="tel" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} /></label>
            <label className="fl wide"><span>Adresa</span><input value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} /></label>
            <label className="fl"><span>Email (pentru plata online)</span><input type="email" inputMode="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></label>
            <label className="fl"><span>Dispecer</span><input value={draft.dispatcher} onChange={e => setDraft({ ...draft, dispatcher: e.target.value })} /></label>
            <label className="fl"><span>Data comenzii</span><input type="date" value={draft.order_date} onChange={e => setDraft({ ...draft, order_date: e.target.value })} /></label>
            <label className="fl"><span>Data livrării *</span><input type="date" value={draft.delivery_date} onChange={e => setDraft({ ...draft, delivery_date: e.target.value })} /></label>
            <label className="fl"><span>Ora livrării</span><input type="time" value={draft.delivery_time} onChange={e => setDraft({ ...draft, delivery_time: e.target.value })} /></label>
          </div>
          <p className="cp-lbl" style={{ marginTop: 14 }}>Ce a comandat</p>
          {paidLocked && <p className="muted" style={{ fontSize: 13, margin: "0 0 8px" }}>Comanda e plătită: produsele și prețurile nu se mai pot schimba.</p>}
          <datalist id="pl-products">{products.map(p => <option key={p.id} value={p.name}>{lei(p.price)}</option>)}</datalist>
          <div className="pl-lines">
            <div className="pl-line pl-lhead"><span>Produs</span><span>Nr bucăți</span><span>Preț / buc (lei)</span><span className="r">Total</span><span /></div>
            {draft.lines.map((l, i) => <div key={i} className="pl-line">
              <input list="pl-products" placeholder="Alege sau scrie produsul" value={l.name} disabled={paidLocked} onChange={e => setLine(i, "name", e.target.value)} />
              <input inputMode="numeric" value={l.qty} disabled={paidLocked} onChange={e => setLine(i, "qty", e.target.value.replace(/\D/g, "").slice(0, 4))} />
              <input inputMode="decimal" value={l.price} disabled={paidLocked} onChange={e => setLine(i, "price", e.target.value.replace(/[^\d.,]/g, ""))} />
              <span className="r num">{lei(num(l.qty) * num(l.price))}</span>
              {!paidLocked && draft.lines.length > 1 ? <button className="x" aria-label="Șterge rândul" onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, j) => j !== i) })}>×</button> : <span />}
            </div>)}
            {!paidLocked && <button className="rbtn" onClick={() => setDraft({ ...draft, lines: [...draft.lines, { name: "", qty: "1", price: "" }] })}>+ Încă un produs</button>}
          </div>
          <label className="fl wide" style={{ marginTop: 10 }}><span>Mențiuni</span><input value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} /></label>
          <div className="pl-total"><span>{dQty} bucăți</span><b>Total {lei(dTotal)}</b></div>
          {err && <p className="err">{err}</p>}
          <div className="pl-fbtns">
            {editing && <button className="rbtn danger" onClick={() => cancel(editing)}>Anulează comanda</button>}
            <span style={{ flex: 1 }} />
            <button className="rbtn" disabled={busy} onClick={() => save(false)}>Salvează</button>
            {!paidLocked && <button className="pl-new" disabled={busy || !draft.email.trim()} title={draft.email.trim() ? "" : "Completează emailul clientului"} onClick={() => save(true)}>
              <Icon name="send" size={16} />Salvează și trimite cererea de plată</button>}
          </div>
        </div>
      </div>}

      {printing && <PrintSheet list={printing} />}
      {toast.m && <div className={`toast no-print ${toast.bad ? "bad" : ""}`} role="status">{toast.m}</div>}
    </div>
  );
}

function PayTag({ o }: { o: PO }) {
  if (o.pay_status === "paid") return <span className="tag green" title={at(o.paid_at)}>Plătit ✓ {at(o.paid_at)}</span>;
  if (o.pay_status === "sent") return <span className="tag gold" title={`trimis de ${o.pay_sent_count} ori`}>Cerere trimisă {at(o.pay_sent_at)}</span>;
  return <span className="tag">Neplătit</span>;
}

function Due({ title, list, hot, onOpen, canEdit, onPrint }: { title: string; list: PO[]; hot?: boolean; onOpen: (o: PO) => void; canEdit: boolean; onPrint: (l: PO[]) => void }) {
  const qty = list.reduce((a, o) => a + o.qty, 0), unpaid = list.filter(o => o.pay_status !== "paid").length;
  return <section className={`pl-due ${hot ? "hot" : ""}`}>
    <div className="row-btw"><h3><Icon name="bell" size={20} />{title}: {list.length} {list.length === 1 ? "comandă" : "comenzi"} · {qty} bucăți</h3>
      <button className="rbtn" onClick={() => onPrint(list)}>Printează</button></div>
    {unpaid > 0 && <p className="pl-warn">{unpaid} {unpaid === 1 ? "comandă nu e plătită" : "comenzi nu sunt plătite"}</p>}
    <div className="pl-due-list">{[...list].sort((a, b) => a.delivery_time.localeCompare(b.delivery_time)).map(o =>
      <button key={o.id} disabled={!canEdit} onClick={() => onOpen(o)}>
        <b className="num">{o.delivery_time || "—"}</b><span>#{o.number} · {o.name}</span><small>{o.lines.map(l => `${l.qty}× ${l.name}`).join(", ")}</small>
        <em className={o.pay_status === "paid" ? "ok" : "no"}>{o.pay_status === "paid" ? "plătit" : "neplătit"}</em></button>)}</div>
  </section>;
}

function PrintSheet({ list }: { list: PO[] }) {
  return <div className="pl-print">{list.map(o => <div key={o.id} className="pl-ticket">
    <h2>Lyra's Delivery · Platouri #{o.number}{o.cancelled ? " · ANULATĂ" : ""}</h2>
    <table><tbody>
      <tr><th>Nume</th><td>{o.name}</td><th>Telefon</th><td>{o.phone}</td></tr>
      <tr><th>Adresa</th><td colSpan={3}>{o.address || "—"}</td></tr>
      <tr><th>Email</th><td>{o.email || "—"}</td><th>Dispecer</th><td>{o.dispatcher || "—"}</td></tr>
      <tr><th>Data</th><td>{dmy(o.order_date)}</td><th>Data livrare</th><td><b>{dmy(o.delivery_date)} {o.delivery_time}</b> ({dayName(o.delivery_date)})</td></tr>
    </tbody></table>
    <table className="pl-plines"><thead><tr><th>Ce a comandat</th><th>Nr bucăți</th><th>Preț</th><th>Total</th></tr></thead><tbody>
      {o.lines.map((l, i) => <tr key={i}><td>{l.name}</td><td>{l.qty}</td><td>{lei(l.price)}</td><td>{lei(l.qty * l.price)}</td></tr>)}
      <tr className="t"><td>Total</td><td>{o.qty}</td><td /><td>{lei(Number(o.total))}</td></tr>
    </tbody></table>
    <p>Plată: <b>{o.pay_status === "paid" ? `PLĂTIT ONLINE (${at(o.paid_at)})` : o.pay_status === "sent" ? "cerere de plată trimisă, neplătit încă" : "NEPLĂTIT"}</b>
      {" · "}Verificat: <b>{o.verified_at ? `${o.verified_by} (${at(o.verified_at)})` : "nu"}</b></p>
    {o.note && <p>Mențiuni: {o.note}</p>}
  </div>)}</div>;
}

/** pagina clientului: plata integrală din linkul primit pe email */
export function PlatouPlata() {
  const { token } = useParams();
  const [o, setO] = useState<{ number: number; name: string; lines: Line[]; total: number; delivery_date: string; delivery_time: string; pay_status: string; cancelled: boolean } | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const back = new URLSearchParams(location.search).get("plata");
  const load = useCallback(() => supabase.rpc("platter_public", { p_token: token }).then(({ data }) => setO(data || null)), [token]);
  useEffect(() => { document.title = "Plată platouri · Lyra's Delivery"; load(); }, [load]);
  // întors de la plată: confirmarea vine de la Stripe în câteva secunde
  useEffect(() => {
    if (back !== "ok" || !o || o.pay_status === "paid") return;
    const t = setInterval(load, 3000); return () => clearInterval(t);
  }, [back, o, load]);
  async function pay() {
    setBusy(true); setErr("");
    const { data, error } = await supabase.functions.invoke("pay", { body: { platter: token } });
    if (data?.url) { location.href = data.url; return; }
    let msg = (data as { error?: string } | null)?.error || "";
    try { if (!msg && error && "context" in error) msg = (await (error as { context: Response }).context.json()).error; } catch { /* ignore */ }
    setBusy(false); setErr(msg || "Plata nu a putut fi pornită. Încearcă din nou sau sună-ne.");
  }
  if (o === undefined) return <div className="app"><p className="t-sub" style={{ padding: 24, textAlign: "center" }}>Se încarcă…</p></div>;
  if (!o) return <div className="app"><div className="track"><h1 className="t-title">Linkul nu este valid</h1><p className="t-sub">Verifică emailul primit sau sună-ne.</p></div></div>;
  const paid = o.pay_status === "paid";
  return (
    <div className="app">
      <header className="c-head"><div className="c-row"><span className="c-logo"><Wordmark small /><span>PLATOURI #{o.number}</span></span></div></header>
      <div className="track">
        <h1 className="t-title">{paid ? "Plata a fost primită. Mulțumim!" : o.cancelled ? "Comanda a fost anulată" : back === "ok" ? "Se confirmă plata…" : `Bună, ${o.name}!`}</h1>
        <p className="t-sub">Livrare: <b>{dmy(o.delivery_date)}{o.delivery_time ? `, ora ${o.delivery_time}` : ""}</b></p>
        {paid && <span className="paid-tag"><Icon name="check" size={14} />Plătită online cu cardul</span>}
      </div>
      <div className="receipt">
        {o.lines.map((l, i) => <div key={i} className="ln"><div>{l.qty}× {l.name}</div><span className="num">{lei(l.qty * l.price)}</span></div>)}
        <div className="sum"><div className="tot"><span>Total</span><span className="num">{lei(Number(o.total))}</span></div></div>
        {!paid && !o.cancelled && <>
          {back === "anulat" && <p className="t-sub">Plata a fost întreruptă. Poți încerca din nou.</p>}
          <button className="big" disabled={busy} onClick={pay}>{busy ? "Se deschide plata…" : `Plătește ${lei(Number(o.total))} cu cardul`}</button>
          <p className="fine">Plata se face integral, pe pagina securizată Stripe.</p>
          {err && <p className="err">{err}</p>}
        </>}
      </div>
    </div>
  );
}
