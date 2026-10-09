import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Item, Order, OrderStatus, Promo, Settings } from "../lib/types";
import { ALLERGENS, hm, imgUrl, lei, mmss } from "../lib/format";
import Icon from "../components/Icon";

const ETAS = [20, 30, 40, 50, 60, 75];
const REASONS = ["Produs epuizat", "Zonă în afara livrării", "Bucătăria e plină", "Restaurantul se închide"];
const QUICK = ["Comanda ta e pe grătar, miroase minunat!", "Curierul a plecat spre tine.", "Am adăugat un mic cadou din partea casei."];

/* ---------- sound: a short three-note bell; browsers allow it after the first click ---------- */
let AC: AudioContext | null = null;
function unlockAudio() {
  try { if (!AC) AC = new AudioContext(); if (AC.state === "suspended") AC.resume(); } catch { /* no audio */ }
}
function chime() {
  if (!AC) return;
  const t = AC.currentTime;
  [[880, 0], [1318.5, 0.16], [1760, 0.32]].forEach(([f, dt]) => {
    const o = AC!.createOscillator(), g = AC!.createGain();
    o.frequency.value = f; g.gain.setValueAtTime(0, t + dt);
    g.gain.linearRampToValueAtTime(0.2, t + dt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.9);
    o.connect(g).connect(AC!.destination); o.start(t + dt); o.stop(t + dt + 1);
  });
}

export default function Reception() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setIsStaff(null); return; }
    supabase.from("staff").select("user_id").eq("user_id", session.user.id).maybeSingle()
      .then(({ data }) => setIsStaff(!!data));
  }, [session]);

  if (!ready) return null;
  if (!session) return <Login />;
  if (isStaff === null) return <div className="login"><p className="muted">Se verifică accesul…</p></div>;
  if (!isStaff) return (
    <div className="login"><form onSubmit={e => { e.preventDefault(); supabase.auth.signOut(); }}>
      <img src="/img/logo-lyra.jpg" alt="Lyra" /><h1>Fără acces la recepție</h1>
      <p className="muted" style={{ textAlign: "center" }}>Contul {session.user.email} nu e în echipa Lyra. Cere administratorului să te adauge.</p>
      <button className="big ghost">Ieși din cont</button></form></div>
  );
  return <Console email={session.user.email || ""} />;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="login">
      <form onSubmit={async e => {
        e.preventDefault(); setBusy(true); setErr(""); unlockAudio();
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        setBusy(false);
        if (error) setErr(error.message === "Invalid login credentials" ? "Email sau parolă greșită." : error.message);
      }}>
        <img src="/img/logo-lyra.jpg" alt="Lyra" />
        <h1>Recepție</h1>
        <input className="in" type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" aria-label="Email" />
        <input className="in" type="password" required placeholder="Parolă" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" aria-label="Parolă" />
        <button className="big" disabled={busy}>{busy ? "Se conectează…" : "Intră în consolă"}</button>
        {err && <p className="err">{err}</p>}
      </form>
    </div>
  );
}

function startOfDay() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); }

function Console({ email }: { email: string }) {
  const [tab, setTab] = useState<"orders" | "menu" | "promos">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [now, setNow] = useState(Date.now());
  const [sound, setSound] = useState(true);
  const [sel, setSel] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const seen = useRef<Set<string> | null>(null);
  const soundRef = useRef(sound); soundRef.current = sound;

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const loadOrders = useCallback(async () => {
    const { data } = await supabase.from("orders").select("*")
      .or(`status.in.(new,prep,road),created_at.gte.${startOfDay()}`).order("created_at");
    const list = (data || []) as Order[];
    const fresh = list.filter(o => o.status === "new").map(o => o.id);
    if (seen.current && fresh.some(id => !seen.current!.has(id)) && soundRef.current) chime();
    seen.current = new Set(list.map(o => o.id));
    setOrders(list);
  }, []);
  const loadMenu = useCallback(async () => {
    const [i, s, p] = await Promise.all([
      supabase.from("items").select("*").order("sort"),
      supabase.from("settings").select("*").eq("id", 1).single(),
      supabase.from("promos").select("*").order("created_at", { ascending: false }),
    ]);
    setItems((i.data || []) as Item[]); if (s.data) setSettings(s.data as Settings); setPromos((p.data || []) as Promo[]);
  }, []);

  useEffect(() => {
    loadOrders(); loadMenu();
    const ch = supabase.channel("reception")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => loadMenu())
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => loadMenu())
      .subscribe();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const safety = setInterval(loadOrders, 30000);            // in case the live connection drops
    const ring = setInterval(() => { if (soundRef.current && document.querySelector(".incoming")) chime(); }, 10000);
    const unlock = () => unlockAudio();
    document.addEventListener("pointerdown", unlock);
    return () => { supabase.removeChannel(ch); clearInterval(tick); clearInterval(safety); clearInterval(ring); document.removeEventListener("pointerdown", unlock); };
  }, [loadOrders, loadMenu]);

  const incoming = orders.filter(o => o.status === "new");
  const kitchen = orders.filter(o => o.status === "prep").length;
  useEffect(() => { document.title = incoming.length ? `(${incoming.length}) Comandă nouă · Lyra` : "Recepție · Lyra"; }, [incoming.length]);

  async function setStatus(o: Order, status: OrderStatus, extra: Partial<Order> = {}, message?: string) {
    const { error } = await supabase.from("orders").update({ status, ...extra }).eq("id", o.id);
    if (error) { flash("Nu s-a salvat: " + error.message); return; }
    if (message) await supabase.from("order_messages").insert({ order_id: o.id, body: message });
    loadOrders();
  }
  const accept = (o: Order, m: number) =>
    setStatus(o, "prep", { eta_min: m, accepted_at: new Date().toISOString() },
      `Comanda a fost acceptată. Estimăm ${o.mode === "livrare" ? "livrarea" : "ridicarea"} în ${m} minute, la ${hm(Date.now() + m * 60000)}.`);
  const advance = (o: Order) => o.status === "prep"
    ? setStatus(o, "road", {}, o.mode === "livrare" ? "Curierul a preluat comanda și e pe drum spre tine." : "Comanda e gata. Te așteptăm la restaurant.")
    : setStatus(o, "done", {}, "Poftă bună! Mulțumim că ai comandat de la Lyra.");
  async function delay(o: Order, m: number) {
    const e = Math.max(5, (o.eta_min || 0) + m);
    await supabase.from("orders").update({ eta_min: e }).eq("id", o.id);
    const due = new Date(o.accepted_at || o.created_at).getTime() + e * 60000;
    await supabase.from("order_messages").insert({ order_id: o.id, body: m > 0 ? `Avem nevoie de încă ${m} minute ca totul să iasă perfect. Noua oră estimată: ${hm(due)}.` : `Vești bune: comanda ajunge mai repede, la ${hm(due)}.` });
    loadOrders(); flash("Clientul a fost anunțat.");
  }

  const kpi = useMemo(() => {
    const today = orders.filter(o => o.status !== "rejected" && o.created_at >= startOfDay());
    const rated = today.filter(o => o.rating);
    return {
      count: today.length,
      revenue: today.reduce((s, o) => s + Number(o.total), 0),
      rating: rated.length ? (rated.reduce((s, o) => s + (o.rating || 0), 0) / rated.length).toFixed(1) : "–",
    };
  }, [orders]);

  const cur = incoming[Math.min(sel, incoming.length - 1)];
  const rec = cur ? ETAS.reduce((a, b) => Math.abs(b - ((cur.mode === "livrare" ? 30 : 15) + kitchen * 4)) < Math.abs(a - ((cur.mode === "livrare" ? 30 : 15) + kitchen * 4)) ? b : a) : 40;
  const chosen = eta ?? rec;
  const drawerOrder = orders.find(o => o.id === drawer);

  return (
    <div className="rx">
      <aside className="rx-side">
        <div className="rb"><img src="/img/logo-lyra.jpg" alt="Lyra" /><small>Recepție</small></div>
        <button className="rnav" aria-current={tab === "orders"} onClick={() => setTab("orders")}><Icon name="orders" />Comenzi{incoming.length > 0 && <span className="n">{incoming.length}</span>}</button>
        <button className="rnav" aria-current={tab === "menu"} onClick={() => setTab("menu")}><Icon name="dish" />Meniu & stoc</button>
        <button className="rnav" aria-current={tab === "promos"} onClick={() => setTab("promos")}><Icon name="send" />Promoții</button>
        <div className="openbox">
          <div className="row-btw"><b>{settings?.accepting_orders ? "Preiau comenzi" : "Închis online"}</b>
            <button className="switch" role="switch" aria-checked={!!settings?.accepting_orders} aria-label="Preiau comenzi online"
              onClick={async () => { await supabase.from("settings").update({ accepting_orders: !settings?.accepting_orders }).eq("id", 1); loadMenu(); }} /></div>
          <span className="muted" style={{ fontSize: 11.5 }}>{email}</span>
          <button className="rbtn" onClick={() => supabase.auth.signOut()}><Icon name="logout" size={15} />Ieși</button>
        </div>
      </aside>

      <main className="rx-main">
        <div className="rx-top">
          <h2>{tab === "orders" ? "Comenzi" : tab === "menu" ? "Meniu & stoc" : "Promoții"}</h2>
          <span className="clock num">{new Date(now).toLocaleTimeString("ro-RO")}</span>
          <button className={`rbtn ${sound ? "on" : ""}`} onClick={() => { unlockAudio(); setSound(!sound); }}><Icon name={sound ? "sound" : "mute"} size={16} />{sound ? "Sunet pornit" : "Sunet oprit"}</button>
        </div>

        {tab === "orders" && <div className="rx-body">
          <div className="kpis">
            <div className="kpi"><small>Comenzi azi</small><b className="num">{kpi.count}</b></div>
            <div className="kpi"><small>Încasări azi</small><b className="num">{Math.round(kpi.revenue).toLocaleString("ro-RO")} lei</b></div>
            <div className="kpi"><small>În bucătărie</small><b className="num">{kitchen}</b></div>
            <div className="kpi"><small>Rating azi</small><b className="num">{kpi.rating}</b></div>
          </div>

          {cur && (
            <section className="incoming" aria-live="assertive">
              <div className="inc-h"><Icon name="bell" size={22} /><b>Comandă nouă</b>
                {incoming.length > 1 && <span className="q">{incoming.map((x, i) => <button key={x.id} aria-current={x.id === cur.id} onClick={() => { setSel(i); setEta(null); setRejecting(false); }}>#{x.number}</button>)}</span>}
                <span className="age num">acum {mmss(now - new Date(cur.created_at).getTime())}</span></div>
              <Ticket o={cur} />
              <div className="decide">
                <div className="who"><b>{cur.name}</b><small>{cur.phone} · {cur.address}</small>{cur.source && cur.source !== "site" && <small> · sursa: {cur.source}</small>}</div>
                <div><p className="muted" style={{ margin: "0 0 10px", fontSize: 12 }}>Timp estimat {cur.mode === "livrare" ? "de livrare" : "de ridicare"} · {kitchen} comenzi în bucătărie</p>
                  <div className="etas">{ETAS.map(m => <button key={m} className="eta" aria-pressed={chosen === m} onClick={() => setEta(m)}>{m === rec && <span className="rec">recomandat</span>}{m}<small>gata la {hm(now + m * 60000)}</small></button>)}</div></div>
                <button className="accept" onClick={() => { accept(cur, chosen); setEta(null); setSel(0); }}><Icon name="check" size={20} />Acceptă · {chosen} min</button>
                {rejecting
                  ? <div className="rsn">{REASONS.map(r => <button key={r} onClick={() => { setStatus(cur, "rejected", { reject_reason: r }, `Ne pare rău, nu putem prelua comanda: ${r.toLowerCase()}.`); setRejecting(false); }}>{r}</button>)}<button onClick={() => setRejecting(false)} style={{ borderColor: "var(--line)", color: "var(--muted)" }}>Anulează</button></div>
                  : <button className="reject" onClick={() => setRejecting(true)}>Refuză comanda…</button>}
              </div>
            </section>
          )}

          <div className="board">
            {([["prep", "În bucătărie", "var(--warn)", "Nicio comandă în lucru"], ["road", "Pe drum / la pass", "var(--gold)", "Nimic de predat"], ["done", "Finalizate azi", "var(--ok)", "Încă nimic finalizat"]] as const).map(([st, title, color, empty]) => {
              const list = orders.filter(o => o.status === st).sort((a, b) => st === "done" ? (b.done_at || "").localeCompare(a.done_at || "") : a.created_at.localeCompare(b.created_at));
              return (
                <div key={st} className="col"><div className="col-h"><i style={{ background: color }} />{title}<span>{list.length}</span></div>
                  {list.length ? list.map(o => <OrderCard key={o.id} o={o} now={now} onOpen={() => setDrawer(o.id)} onAdvance={() => advance(o)} />) : <div className="colempty">{empty}</div>}
                </div>
              );
            })}
          </div>
        </div>}

        {tab === "menu" && <div className="rx-body">
          <p className="muted" style={{ margin: 0 }}>Un preparat marcat epuizat apare imediat gri pe site și nu mai poate fi comandat.</p>
          <div className="mgrid">{items.map(it => (
            <div key={it.id} className={`mi ${it.available ? "" : "off"}`}>
              {imgUrl(it.image) ? <img src={imgUrl(it.image)!} alt="" /> : <span className="ph" />}
              <div><b>{it.name_ro}</b><div className="row-btw" style={{ marginTop: 4, fontSize: 12, color: "var(--gold-2)" }}><span className="num">{lei(Number(it.price))}</span>
                <button className="switch" role="switch" aria-checked={it.available} aria-label={`${it.name_ro} disponibil`}
                  onClick={async () => { await supabase.from("items").update({ available: !it.available }).eq("id", it.id); loadMenu(); }} /></div></div>
            </div>))}</div>
        </div>}

        {tab === "promos" && <div className="rx-body">
          {promos.map(p => (
            <div key={p.id} className="mi" style={{ gridTemplateColumns: "90px minmax(0,1fr)" }}>
              {imgUrl(p.image) ? <img src={imgUrl(p.image)!} alt="" style={{ width: 90, height: 70 }} /> : <span className="ph" />}
              <div><b style={{ fontSize: 15 }}>{p.title}</b><span className="muted" style={{ fontSize: 12.5 }}>{p.body}</span>
                <div className="row-btw" style={{ marginTop: 8, flexWrap: "wrap" }}>
                  <span>{p.price != null && <b className="num" style={{ color: "var(--gold-2)" }}>{lei(Number(p.price))}</b>}{p.code && <span className="tag">cod {p.code}</span>}</span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>Activă
                    <button className="switch" role="switch" aria-checked={p.active} aria-label="Promoție activă" onClick={async () => { await supabase.from("promos").update({ active: !p.active }).eq("id", p.id); loadMenu(); }} />
                    <button className="rbtn" disabled={!p.active} onClick={async () => { await supabase.from("promos").update({ pushed_at: new Date().toISOString() }).eq("id", p.id); flash("Popup trimis clienților de pe site."); }}><Icon name="send" size={15} />Arată acum</button>
                  </span>
                </div>
              </div>
            </div>))}
          <p className="muted">Crearea de promoții noi vine în panoul de administrare.</p>
        </div>}
      </main>

      {drawerOrder && <>
        <div className="drawer-veil" onClick={() => setDrawer(null)} />
        <aside className="drawer" role="dialog" aria-modal="true">
          <div className="row-btw"><h3>Comanda #{drawerOrder.number}</h3><button className="mini" onClick={() => setDrawer(null)} aria-label="Închide">×</button></div>
          <p className="muted">{drawerOrder.name} · {drawerOrder.phone}<br />{drawerOrder.address}</p>
          <Ticket o={drawerOrder} />
          {["prep", "road"].includes(drawerOrder.status) && <>
            <p className="lbl">Ține clientul la curent</p>
            <div className="qr">
              <button onClick={() => delay(drawerOrder, 10)}><Icon name="clock" size={14} /> +10 min întârziere</button>
              <button onClick={() => delay(drawerOrder, -5)}><Icon name="clock" size={14} /> −5 min, merge repede</button>
              {QUICK.map(q => <button key={q} onClick={async () => { await supabase.from("order_messages").insert({ order_id: drawerOrder.id, body: q }); flash("Mesaj trimis."); }}>{q}</button>)}
            </div>
            <button className="big" style={{ marginTop: 14 }} onClick={() => advance(drawerOrder)}>
              {drawerOrder.status === "prep" ? (drawerOrder.mode === "livrare" ? "Predă curierului" : "Gata de ridicare") : (drawerOrder.mode === "livrare" ? "Marchează livrată" : "Marchează ridicată")}
            </button>
          </>}
          {drawerOrder.rating && <p style={{ color: "var(--gold)", fontSize: 22 }}>{"★".repeat(drawerOrder.rating)}</p>}
        </aside>
      </>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Ticket({ o }: { o: Order }) {
  const flagged = o.items.filter(l => l.allergens?.some(a => o.allergies.includes(a)));
  return (
    <div className="ticket">
      <div className="tno"><b>#{o.number}</b><span>{hm(o.created_at)} · {o.mode === "livrare" ? "LIVRARE" : "RIDICARE"}</span></div>
      {o.allergies.length > 0 && <div className="alert">ALERGIE CLIENT: {o.allergies.map(a => ALLERGENS[a]?.[0].toUpperCase()).join(", ")}{flagged.length > 0 && ` · verifică: ${flagged.map(l => l.name).join(", ")}`}</div>}
      {o.items.map((l, i) => (
        <div key={i} className="tl"><span className="q">{l.qty}×</span>
          <div><b>{l.name}</b>{l.variant && <span className="x">{l.variant}</span>}{l.extras.map(e => <span key={e.id} className="x">+ {e.name}</span>)}
            {l.note && <span className="x">„{l.note}”</span>}{l.gift && <span className="x">CADOU LYRA CLUB</span>}{l.promo && <span className="x">ofertă: {l.promo}</span>}
            <small>{l.grams}{l.hot ? " · tigaie fierbinte" : ""}</small></div>
          <span>{l.unit === 0 ? "0.00" : (l.unit * l.qty).toFixed(2)}</span></div>
      ))}
      {o.note && <div className="tn"><b>Mențiune:</b> {o.note}</div>}
      <div className="tot"><span>TOTAL · {o.payment === "cash" ? "numerar" : o.payment === "online" ? "plătit online" : "card la livrare"}</span><b>{lei(Number(o.total))}</b></div>
      {Number(o.discount) > 0 && <small>{o.discount_label}: −{lei(Number(o.discount))}</small>}
    </div>
  );
}

function OrderCard({ o, now, onOpen, onAdvance }: { o: Order; now: number; onOpen: () => void; onAdvance: () => void }) {
  const active = o.status === "prep" || o.status === "road";
  const due = o.accepted_at && o.eta_min ? new Date(o.accepted_at).getTime() + o.eta_min * 60000 : 0;
  const rem = due - now;
  const cls = rem < 0 ? "bad" : rem < 8 * 60000 ? "warn" : "ok";
  const frac = o.eta_min ? 1 - rem / (o.eta_min * 60000) : 0;
  return (
    <div className="oc" role="button" tabIndex={0} onClick={onOpen} onKeyDown={e => e.key === "Enter" && onOpen()}>
      <div className="h"><b>#{o.number}</b><span className={`tag ${o.mode === "livrare" ? "" : "green"}`}>{o.mode}</span>
        {o.allergies.length > 0 && <span className="tag red">alergie</span>}
        {active && due ? <span className={`tm ${cls} num`}>{rem < 0 ? "întârziere " + mmss(rem) : mmss(rem)}</span> : o.done_at ? <span className="tm ok num">{hm(o.done_at)}</span> : null}</div>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{o.name}</div>
      <div className="its">{o.items.map(l => `${l.qty}× ${l.name}`).join(" · ")}</div>
      {active && due > 0 && <div className="bar"><i style={{ width: `${Math.min(100, Math.max(2, frac * 100))}%`, background: `var(--${cls})` }} /></div>}
      <div className="ft"><b className="num" style={{ color: "var(--gold-2)" }}>{lei(Number(o.total))}</b>{o.rating && <span style={{ color: "var(--gold)" }}>{"★".repeat(o.rating)}</span>}
        {active && <button className="go" onClick={e => { e.stopPropagation(); onAdvance(); }}>{o.status === "prep" ? (o.mode === "livrare" ? "Predă curierului →" : "Gata de ridicare →") : (o.mode === "livrare" ? "Livrată ✓" : "Ridicată ✓")}</button>}</div>
    </div>
  );
}
