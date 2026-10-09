import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Order } from "../lib/types";
import { hm, lei, mmss } from "../lib/format";
import Icon from "../components/Icon";
import { Login } from "./Reception";

type Me = { id: string; name: string; role: string };

export default function Courier() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setMe(undefined); return; }
    supabase.from("staff").select("name, role").eq("user_id", session.user.id).maybeSingle().then(({ data }) =>
      setMe(data ? { id: session.user.id, name: data.name || (session.user.email || "").split("@")[0], role: data.role } : null));
  }, [session]);

  if (!ready) return null;
  if (!session) return <Login title="Curieri" />;
  if (me === undefined) return <div className="login"><p className="muted">Se verifică accesul…</p></div>;
  if (!me) return (
    <div className="login"><form onSubmit={e => { e.preventDefault(); supabase.auth.signOut(); }}>
      <img src="/img/logo-lyra.jpg" alt="Lyra" /><h1>Fără acces</h1>
      <p className="muted" style={{ textAlign: "center" }}>Contul {session.user.email} nu e în echipa Lyra. Roagă administratorul să te adauge ca și curier.</p>
      <button className="big ghost">Ieși din cont</button></form></div>
  );
  return <CourierApp me={me} />;
}

function startOfDay() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); }
const mapsUrl = (a: string) => "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(a);
const payText = (o: Order) => o.payment === "online" ? "Plătit online" : `De încasat ${lei(Number(o.total))} · ${o.payment === "cash" ? "numerar" : "card"}`;

function CourierApp({ me }: { me: Me }) {
  const [tab, setTab] = useState<"ready" | "mine">("ready");
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };

  const load = useCallback(async () => {
    const { data } = await supabase.from("orders").select("*")
      .eq("mode", "livrare").or(`status.in.(prep,road),done_at.gte.${startOfDay()}`).order("created_at");
    setOrders((data || []) as Order[]);
  }, []);
  useEffect(() => {
    load();
    const ch = supabase.channel("courier").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load()).subscribe();
    const poll = setInterval(load, 5000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { supabase.removeChannel(ch); clearInterval(poll); clearInterval(tick); };
  }, [load]);

  const available = orders.filter(o => o.status === "prep" && !o.courier_id);
  const mine = orders.filter(o => o.status === "road" && o.courier_id === me.id);
  const doneToday = orders.filter(o => o.status === "done" && o.courier_id === me.id);
  const list = tab === "ready" ? available : mine;

  async function pickUp(o: Order) {
    setBusy(o.id);
    const { data, error } = await supabase.from("orders")
      .update({ status: "road", courier_id: me.id, courier_name: me.name })
      .eq("id", o.id).eq("status", "prep").is("courier_id", null).select("id");
    if (!error && data?.length) {
      await supabase.from("order_messages").insert({ order_id: o.id, body: `${me.name} a preluat comanda și e pe drum spre tine.` });
      flash(`Comanda #${o.number} e a ta. Drum bun!`); setTab("mine");
    } else flash(error ? "Nu s-a salvat: " + error.message : "Comanda a fost deja preluată de alt curier.");
    setBusy(null); load();
  }
  async function deliver(o: Order) {
    setBusy(o.id);
    const { error } = await supabase.from("orders").update({ status: "done" }).eq("id", o.id).eq("courier_id", me.id);
    if (!error) {
      await supabase.from("order_messages").insert({ order_id: o.id, body: "Comanda a fost livrată. Poftă bună!" });
      flash(`#${o.number} livrată. Mulțumim!`);
    } else flash("Nu s-a salvat: " + error.message);
    setBusy(null); load();
  }

  return (
    <div className="cr">
      <header className="cr-top">
        <img src="/img/logo-lyra.jpg" alt="Lyra" />
        <div><b>Curier · {me.name}</b><small>{doneToday.length} livrări azi · {lei(doneToday.reduce((s, o) => s + (o.payment === "online" ? 0 : Number(o.total)), 0))} încasat</small></div>
        <button className="mini" onClick={() => supabase.auth.signOut()} aria-label="Ieși"><Icon name="logout" size={15} /></button>
      </header>

      <div className="seg cr-tabs">
        <button aria-pressed={tab === "ready"} onClick={() => setTab("ready")}>De preluat {available.length > 0 && <span className="cr-n">{available.length}</span>}</button>
        <button aria-pressed={tab === "mine"} onClick={() => setTab("mine")}>Pe drum {mine.length > 0 && <span className="cr-n">{mine.length}</span>}</button>
      </div>

      <main className="cr-list">
        {list.length === 0 && (
          <div className="cr-empty"><Icon name="bike" size={40} />
            <p>{tab === "ready" ? "Nicio comandă de preluat acum. Lista se actualizează singură." : "Nu ai comenzi pe drum. Ia una din „De preluat”."}</p></div>
        )}
        {list.map(o => {
          const due = o.accepted_at && o.eta_min ? new Date(o.accepted_at).getTime() + o.eta_min * 60000 : 0;
          const rem = due - now;
          return (
            <article key={o.id} className="cr-card">
              <div className="cr-h">
                <b className="num">#{o.number}</b>
                {due > 0 && <span className={`tm ${rem < 0 ? "bad" : rem < 8 * 60000 ? "warn" : "ok"} num`}>{rem < 0 ? "întârziere " + mmss(rem) : `la client ${hm(due)} · ${mmss(rem)}`}</span>}
              </div>
              <p className="cr-addr">{o.address}</p>
              <p className="cr-who">{o.name}</p>
              <div className="cr-actions">
                <a className="mini" href={`tel:${o.phone.replace(/\s+/g, "")}`}><Icon name="bell" size={14} /> Sună {o.phone}</a>
                {o.address && <a className="mini" href={mapsUrl(o.address)} target="_blank" rel="noreferrer"><Icon name="send" size={14} /> Navighează</a>}
              </div>
              <ul className="cr-items">{o.items.map((l, i) => <li key={i}><b>{l.qty}×</b> {l.name}{l.variant ? ` (${l.variant})` : ""}</li>)}</ul>
              {o.note && <p className="cr-note"><b>Mențiune:</b> {o.note}</p>}
              <p className={`cr-pay ${o.payment === "online" ? "paid" : ""}`}>{payText(o)}</p>
              {tab === "ready"
                ? <button className="cta" disabled={busy === o.id} onClick={() => pickUp(o)}>{busy === o.id ? "Se salvează…" : "Am preluat comanda"}</button>
                : <button className="cta ok" disabled={busy === o.id} onClick={() => deliver(o)}>{busy === o.id ? "Se salvează…" : "Am livrat"}</button>}
            </article>
          );
        })}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
