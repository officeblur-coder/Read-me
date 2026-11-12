import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Item, Order, OrderStatus, Promo, Settings } from "../lib/types";
import { ALLERGENS, hm, imgUrl, lei, mmss } from "../lib/format";
import Icon from "../components/Icon";
import Wordmark from "../components/Wordmark";
import { whenLabel } from "../lib/schedule";
import { ago, courierColor, type CourierInfo, type CourierLoc } from "../lib/couriers";
const CourierMap = lazy(() => import("../components/CourierMap"));

const ETAS = [20, 30, 40, 50, 60, 75];
const REASONS = ["Produs epuizat", "Zonă în afara livrării", "Bucătăria e plină", "Restaurantul se închide"];
const QUICK = ["Comanda ta e pe grătar, miroase minunat!", "Curierul a plecat spre tine.", "Am adăugat un mic cadou din partea casei."];

/* ---------- sound: a loud two-burst bell. Browsers only allow audio after one tap, hence the start screen. ---------- */
let AC: AudioContext | null = null;
export function unlockAudio() {
  try { if (!AC) AC = new AudioContext(); if (AC.state === "suspended") AC.resume(); } catch { /* no audio */ }
}
export const audioReady = () => !!AC && AC.state === "running";
export function chime() {
  if (!AC) return;
  if (AC.state === "suspended") AC.resume();
  const t = AC.currentTime;
  [0, 0.75].forEach(base => [[988, 0], [1319, 0.14], [1760, 0.28]].forEach(([f, dt]) => {
    const o = AC!.createOscillator(), g = AC!.createGain();
    o.type = "triangle"; o.frequency.value = f;
    g.gain.setValueAtTime(0, t + base + dt);
    g.gain.linearRampToValueAtTime(0.55, t + base + dt + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + base + dt + 0.7);
    o.connect(g).connect(AC!.destination); o.start(t + base + dt); o.stop(t + base + dt + 0.75);
  }));
}
let wakeLock: { release: () => Promise<void> } | null = null;
export async function keepAwake() {
  try { wakeLock = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen"); } catch { /* not supported */ }
}

// Consola stă deschisă zile întregi: când publicăm o versiune nouă a site-ului, se reîncarcă singură
// (verifică la 2 minute și când ecranul revine în față; nu întrerupe o comandă care se preia).
let rxBusy = false;
function useAutoUpdate() {
  useEffect(() => {
    if (!import.meta.env.PROD || import.meta.env.MODE === "demo") return;
    const mine = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')?.src.split("/assets/")[1];
    if (!mine) return;
    let fresh = false;
    const check = async () => {
      try {
        const html = await (await fetch("/receptie", { cache: "no-store" })).text();
        const live = html.match(/\/assets\/(index-[^"']+\.js)/)?.[1];
        if (live && live !== mine) fresh = true;
      } catch { /* fără internet: încercăm data viitoare */ }
      if (fresh && !rxBusy) location.reload();
    };
    const t = setInterval(check, 2 * 60000);
    const vis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, []);
}

export default function Reception() {
  useAutoUpdate();
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
    supabase.from("staff").select("role").eq("user_id", session.user.id).maybeSingle()
      .then(({ data }) => setIsStaff(!!data && data.role !== "courier"));
  }, [session]);

  if (!ready) return null;
  if (!session) return <Login users={RECEPTION_USERS} />;
  if (isStaff === null) return <div className="login"><p className="muted">Se verifică accesul…</p></div>;
  if (!isStaff) return (
    <div className="login"><form onSubmit={e => { e.preventDefault(); supabase.auth.signOut(); }}>
      <Wordmark small /><h1>Fără acces la recepție</h1>
      <p className="muted" style={{ textAlign: "center" }}>Contul {session.user.email} nu are acces la recepție. Curierii folosesc <a href="/curier">lyrasdelivery.ro/curier</a>.</p>
      <button className="big ghost">Ieși din cont</button></form></div>
  );
  return <Console email={session.user.email || ""} />;
}

/** Receptioners shown as buttons on the reception login (user name = account before @lyrasdelivery.ro). */
const RECEPTION_USERS = ["Marco", "Ciprian"];

export function Login({ title = "Recepție", users = [] }: { title?: string; users?: string[] }) {
  const [email, setEmail] = useState(() => { try { const u = localStorage.getItem("lyra-recv-user") || ""; return users.includes(u) ? u : ""; } catch { return ""; } });
  const [other, setOther] = useState(false);
  const picked = users.find(u => u === email);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="login">
      <form onSubmit={async e => {
        e.preventDefault(); setBusy(true); setErr(""); unlockAudio();
        // staff can type a short user name: "receptielyra" means receptielyra@lyrasdelivery.ro
        // nume scurt: „Marco” = marco@lyrasdelivery.ro, „Istvan” = istvan@lyrasdelivery.ro
        const login = email.includes("@") ? email.trim() : email.trim().toLowerCase().replace(/\s+/g, "") + "@lyrasdelivery.ro";
        const { error } = await supabase.auth.signInWithPassword({ email: login, password });
        setBusy(false);
        if (!error && picked) try { localStorage.setItem("lyra-recv-user", picked); } catch {}
        if (error) setErr(error.message === "Invalid login credentials" ? "Utilizator sau parolă greșită." : error.message);
      }}>
        <Wordmark small />
        <h1>{title}</h1>
        {users.length > 0 && <>
          <p className="muted login-who">Cine preia comenzile?</p>
          <div className="login-users">
            {users.map(u => <button type="button" key={u} className={picked === u && !other ? "on" : ""} onClick={() => { setEmail(u); setOther(false); setErr(""); }}>
              <span className="av">{u[0]}</span>{u}</button>)}
          </div>
          <button type="button" className="linkbtn login-other" onClick={() => { setOther(o => !o); setEmail(""); }}>{other ? "Înapoi la listă" : "Alt cont"}</button>
        </>}
        {(users.length === 0 || other) && <input className="in" type="text" required placeholder="Utilizator sau email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} aria-label="Utilizator sau email" />}
        <input className="in" type="password" required placeholder="Parolă" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" aria-label="Parolă" />
        <button className="big" disabled={busy || (users.length > 0 && !other && !picked)}>{busy ? "Se conectează…" : picked && !other ? `Intră ca ${picked}` : "Intră în consolă"}</button>
        {err && <p className="err">{err}</p>}
      </form>
    </div>
  );
}

function startOfDay() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); }

function Console({ email }: { email: string }) {
  const [tab, setTab] = useState<"orders" | "couriers" | "menu" | "promos">("orders");
  // livratorii: lista, poziția GPS, atribuirea comenzilor
  const [couriers, setCouriers] = useState<CourierInfo[]>([]);
  const [locs, setLocs] = useState<CourierLoc[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [now, setNow] = useState(Date.now());
  const [sound, setSound] = useState(true);
  const [sel, setSel] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const [customEta, setCustomEta] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [toast, setToast] = useState<{ m: string; bad?: boolean }>({ m: "" });
  const prev = useRef<Map<string, Order>>(new Map());
  const seen = useRef<Set<string> | null>(null);
  const soundRef = useRef(sound); soundRef.current = sound;
  const flashRef = useRef<(m: string, bad?: boolean) => void>(() => {});
  const [showStart, setShowStart] = useState(true);
  const started = useRef(false);
  // working session for the admin report: opened with the console, a heartbeat every minute, closed on "Ieși"
  const sessionId = useRef<string | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.rpc("console_open", { p_device: navigator.userAgent.includes("Mobile") ? "telefon" : "calculator" })
      .then(({ data }) => { if (alive) sessionId.current = (data as string) || null; });
    const beat = setInterval(() => { if (sessionId.current) supabase.rpc("console_ping", { p_id: sessionId.current }); }, 60000);
    const bye = () => { if (sessionId.current) supabase.rpc("console_close", { p_id: sessionId.current }); };
    window.addEventListener("pagehide", bye);
    return () => { alive = false; clearInterval(beat); window.removeEventListener("pagehide", bye); bye(); };
  }, []);
  async function logout() {
    if (sessionId.current) { await supabase.rpc("console_close", { p_id: sessionId.current }); sessionId.current = null; }
    supabase.auth.signOut();
  }
  function start() {
    unlockAudio(); chime(); keepAwake();
    started.current = true; setShowStart(false);
  }

  const flash = (m: string, bad = false) => { setToast({ m, bad }); setTimeout(() => setToast({ m: "" }), bad ? 9000 : 2500); };
  flashRef.current = flash;

  const loadOrders = useCallback(async () => {
    await supabase.rpc("settle_offers");   // ofertele fără răspuns se închid după setare
    const { data } = await supabase.from("orders").select("*")
      .or(`status.in.(new,prep,road),created_at.gte.${startOfDay()}`).order("created_at");
    const list = (data || []) as Order[];
    const fresh = list.filter(o => o.status === "new" && !o.offered_at).map(o => o.id);
    // răspunsul clientului la timpul propus: anunț pe ecran (anularea rămâne mai mult și sună)
    for (const o of list) {
      const was = prev.current.get(o.id);
      if (was && was.courier_id && was.courier_id === o.courier_id) {
        if (!was.courier_ack_at && o.courier_ack_at && o.status !== "done") flashRef.current(`${o.courier_name} a confirmat comanda #${o.number} ✓`);
        if ((o.courier_late_count || 0) > (was.courier_late_count || 0)) { flashRef.current(`${o.courier_name} întârzie cu #${o.number} (${o.name})`, true); if (soundRef.current) chime(); }
        if (was.status !== "done" && o.status === "done") flashRef.current(`${o.courier_name} a predat #${o.number} clientului`);
      }
      if (!was || was.status !== "new" || !was.offered_at || o.status === "new") continue;
      if (o.status === "prep") flashRef.current(`#${o.number} ${o.name}: ${o.offer_answer === "accepted" ? "clientul a acceptat" : o.offer_answer === "phone" ? "confirmat telefonic" : "confirmată automat"} · ${o.eta_min} min`);
      else if (o.status === "rejected") { flashRef.current(`#${o.number} ${o.name}: ${o.cancelled_by === "client" ? "clientul a ANULAT comanda (timpul nu convine)" : "anulată, clientul nu a răspuns"}`, true); if (soundRef.current) chime(); }
    }
    prev.current = new Map(list.map(o => [o.id, o]));
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
    supabase.rpc("couriers").then(({ data }) => data && setCouriers(data as CourierInfo[]));
    const loadLocs = () => supabase.from("courier_locations").select("*").then(({ data }) => data && setLocs(data as CourierLoc[]));
    loadLocs();
    const lc = supabase.channel("courier-locs").on("postgres_changes", { event: "*", schema: "public", table: "courier_locations" }, () => loadLocs()).subscribe();
    const lp = setInterval(loadLocs, 15000);
    return () => { supabase.removeChannel(lc); clearInterval(lp); };
  }, []);
  useEffect(() => {
    loadOrders(); loadMenu();
    const ch = supabase.channel("reception")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => loadMenu())
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => loadMenu())
      .subscribe();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(loadOrders, 4000);                // new orders show up within 4 s even if the live connection drops
    const ring = setInterval(() => { if (soundRef.current && document.querySelector(".incoming")) chime(); }, 4000);
    const wake = () => { if (document.visibilityState === "visible" && started.current) keepAwake(); };
    document.addEventListener("visibilitychange", wake);
    const unlock = () => unlockAudio();
    document.addEventListener("pointerdown", unlock);
    return () => { supabase.removeChannel(ch); clearInterval(tick); clearInterval(poll); clearInterval(ring); document.removeEventListener("pointerdown", unlock); document.removeEventListener("visibilitychange", wake); wakeLock?.release().catch(() => {}); };
  }, [loadOrders, loadMenu]);

  const incoming = orders.filter(o => o.status === "new" && !o.offered_at);
  rxBusy = incoming.length > 0 || !!drawer || rejecting || !!customEta;
  const waiting = orders.filter(o => o.status === "new" && !!o.offered_at);
  const confirmEta = settings?.confirm_eta !== false;
  // livrări din bucătărie / de la pass fără livrator: cerere de atribuire
  const couriersOn = settings?.couriers_on === true;   // admin → Program → Livratori
  const unassigned = !couriersOn ? [] : orders.filter(o => o.mode === "livrare" && (o.status === "prep" || o.status === "road") && !o.courier_id
    && !(o.status === "prep" && !!o.scheduled_for && new Date(o.scheduled_for).getTime() - now > 60 * 60000));
  const loadOf = (cid: string) => orders.filter(o => o.courier_id === cid && (o.status === "prep" || o.status === "road")).length;
  const unSeen = useRef<Set<string>>(new Set());
  useEffect(() => {
    const fresh = unassigned.filter(o => !unSeen.current.has(o.id));
    if (fresh.length && unSeen.current.size + fresh.length > 0 && soundRef.current && started.current) chime();
    unassigned.forEach(o => unSeen.current.add(o.id));
  }, [unassigned.map(o => o.id).join(",")]);
  // precomenzi acceptate, cu ora la mai mult de o oră: stau deoparte până se apropie ora lor
  const isLater = (o: Order) => o.status === "prep" && !!o.scheduled_for && new Date(o.scheduled_for).getTime() - now > 60 * 60000;
  const planned = orders.filter(isLater).sort((a, b) => (a.scheduled_for || "").localeCompare(b.scheduled_for || ""));
  const kitchen = orders.filter(o => o.status === "prep" && !isLater(o)).length;
  useEffect(() => { document.title = incoming.length ? `(${incoming.length}) Comandă nouă · Lyra` : "Recepție · Lyra"; }, [incoming.length]);

  async function setStatus(o: Order, status: OrderStatus, extra: Partial<Order> = {}, message?: string) {
    const { error } = await supabase.from("orders").update({ status, ...extra }).eq("id", o.id);
    if (error) { flash("Nu s-a salvat: " + error.message); return; }
    if (message) await supabase.from("order_messages").insert({ order_id: o.id, body: message });
    loadOrders();
  }
  const acceptLater = (o: Order) => {
    const m = Math.max(1, Math.round((new Date(o.scheduled_for!).getTime() - Date.now()) / 60000));
    return setStatus(o, "prep", { eta_min: m, accepted_at: new Date().toISOString() },
      `Precomanda a fost acceptată. ${o.mode === "livrare" ? "Livrarea" : "Ridicarea"} e programată ${whenLabel(o.scheduled_for!)}.`);
  };
  async function offer(o: Order, m: number) {
    const { error } = await supabase.rpc("offer_eta", { p_id: o.id, p_eta: m });
    if (error) { flash("Nu s-a trimis: " + error.message); return; }
    flash(`Timpul de ${m} min a fost trimis clientului.`); loadOrders();
  }
  async function assign(o: Order, cid: string | null) {
    const { error } = await supabase.rpc("courier_assign", { p_order: o.id, p_courier: cid });
    if (error) flash("Nu s-a atribuit: " + error.message);
    else flash(cid ? `#${o.number} → ${couriers.find(c => c.id === cid)?.name}. Telefonul lui sună până confirmă.` : `#${o.number} nu mai are livrator.`);
    loadOrders();
  }
  async function phoneOk(o: Order) {
    const { error } = await supabase.rpc("confirm_offer_phone", { p_id: o.id });
    if (error) flash("Nu s-a salvat: " + error.message); else loadOrders();
  }
  const accept = (o: Order, m: number) => confirmEta ? offer(o, m) :
    setStatus(o, "prep", { eta_min: m, accepted_at: new Date().toISOString() },
      `Comanda a fost acceptată. Estimăm ${o.mode === "livrare" ? "livrarea" : "ridicarea"} în ${m} minute, la ${hm(Date.now() + m * 60000)}.`);
  const advance = (o: Order) => o.status === "prep"
    ? setStatus(o, "road", {}, o.mode === "livrare" ? `${o.courier_name || "Curierul"} a preluat comanda și e pe drum spre tine.` : "Comanda e gata. Te așteptăm la restaurant.")
    : setStatus(o, "done", {}, "Poftă bună! Mulțumim că ai comandat de la Lyra's Delivery.");
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
        <div className="rb"><Wordmark small /><small>Recepție</small></div>
        <button className="rnav" aria-current={tab === "orders"} onClick={() => setTab("orders")}><Icon name="orders" />Comenzi{incoming.length > 0 && <span className="n">{incoming.length}</span>}</button>
        {couriersOn && <button className="rnav" aria-current={tab === "couriers"} onClick={() => setTab("couriers")}><Icon name="bike" />Livratori{unassigned.length > 0 && <span className="n">{unassigned.length}</span>}</button>}
        <button className="rnav" aria-current={tab === "menu"} onClick={() => setTab("menu")}><Icon name="dish" />Meniu & stoc</button>
        <button className="rnav" aria-current={tab === "promos"} onClick={() => setTab("promos")}><Icon name="send" />Promoții</button>
        <div className="openbox">
          <div className="row-btw"><b>{settings?.accepting_orders ? "Preiau comenzi" : "Închis online"}</b>
            <button className="switch" role="switch" aria-checked={!!settings?.accepting_orders} aria-label="Preiau comenzi online"
              onClick={async () => { await supabase.from("settings").update({ accepting_orders: !settings?.accepting_orders }).eq("id", 1); loadMenu(); }} /></div>
          <span className="muted" style={{ fontSize: 11.5 }}>{email}</span>
          <button className="rbtn" onClick={logout}><Icon name="logout" size={15} />Ieși</button>
        </div>
      </aside>

      <main className="rx-main">
        <div className="rx-top">
          <h2>{tab === "orders" ? "Comenzi" : tab === "couriers" ? "Livratori" : tab === "menu" ? "Meniu & stoc" : "Promoții"}</h2>
          <span className="clock num">{new Date(now).toLocaleTimeString("ro-RO")}</span>
          <button className={`rbtn ${sound ? "on" : ""}`} onClick={() => { unlockAudio(); if (!sound) chime(); setSound(!sound); }}><Icon name={sound ? "sound" : "mute"} size={16} />{sound ? "Sunet pornit" : "Sunet oprit"}</button>
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
                {incoming.length > 1 && <span className="q">{incoming.map((x, i) => <button key={x.id} aria-current={x.id === cur.id} onClick={() => { setSel(i); setEta(null); setCustomEta(""); setRejecting(false); }}>#{x.number}</button>)}</span>}
                <span className="age num">acum {mmss(now - new Date(cur.created_at).getTime())}</span></div>
              <Ticket o={cur} />
              <div className="decide">
                <div className="who"><b>{cur.name}</b><small>{cur.phone} · {cur.address}</small>{cur.source && cur.source !== "site" && <small> · sursa: {cur.source}</small>}</div>
                {cur.scheduled_for ? <>
                  <div className="sched-box"><Icon name="clock" size={22} /><div><small>PRECOMANDĂ · {cur.mode === "livrare" ? "livrare" : "ridicare"}</small><b>{whenLabel(cur.scheduled_for, undefined, now)}</b></div></div>
                  <button className="accept" onClick={() => { acceptLater(cur); setSel(0); }}><Icon name="check" size={20} />Acceptă precomanda · {hm(cur.scheduled_for)}</button>
                </> : <>
                <div><p className="muted" style={{ margin: "0 0 10px", fontSize: 12 }}>Timp estimat {cur.mode === "livrare" ? "de livrare" : "de ridicare"} · {kitchen} comenzi în bucătărie</p>
                  <div className="etas">{ETAS.map(m => <button key={m} className="eta" aria-pressed={chosen === m && !customEta} onClick={() => { setEta(m); setCustomEta(""); }}>{m === rec && <span className="rec">recomandat</span>}{m}<small>gata la {hm(now + m * 60000)}</small></button>)}</div>
                  <label className={`eta-custom ${customEta ? "on" : ""}`}><span>Alt timp</span>
                    <input type="number" inputMode="numeric" min={5} max={480} step={5} placeholder="ex. 90" value={customEta}
                      onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 3); setCustomEta(v); setEta(v ? Math.min(480, Math.max(5, +v)) : null); }} />
                    <span>min{customEta && +customEta >= 5 ? ` · gata la ${hm(now + Math.min(480, +customEta) * 60000)}` : ""}</span></label></div>
                <button className="accept" disabled={!!customEta && +customEta < 5} onClick={() => { accept(cur, chosen); setEta(null); setCustomEta(""); setSel(0); }}><Icon name={confirmEta ? "send" : "check"} size={20} />{confirmEta ? `Propune clientului · ${chosen} min` : `Acceptă · ${chosen} min`}</button>
                </>}
                {rejecting
                  ? <div className="rsn">{REASONS.map(r => <button key={r} onClick={() => { setStatus(cur, "rejected", { reject_reason: r }, `Ne pare rău, nu putem prelua comanda: ${r.toLowerCase()}.`); setRejecting(false); }}>{r}</button>)}<button onClick={() => setRejecting(false)} style={{ borderColor: "var(--line)", color: "var(--muted)" }}>Anulează</button></div>
                  : <button className="reject" onClick={() => setRejecting(true)}>Refuză comanda…</button>}
              </div>
            </section>
          )}

          {unassigned.length > 0 && couriers.length > 0 && <section className="assign" aria-live="polite">
            <div className="col-h"><i style={{ background: "var(--brand)" }} />Atribuie livratorului<span>{unassigned.length}</span></div>
            <div className="assign-list">{unassigned.map(o => <div key={o.id} className="as-row">
              <div><b>#{o.number}</b> <span className="muted">{o.status === "prep" ? "în bucătărie" : "la pass"}</span><small>{o.address}</small></div>
              <div className="as-btns">{couriers.map((c, i) => <button key={c.id} style={{ borderColor: courierColor(i) }} onClick={() => assign(o, c.id)}>
                <i style={{ background: courierColor(i) }} />{c.name}<small>{loadOf(c.id) ? `${loadOf(c.id)} în curs` : "liber"}</small></button>)}</div>
            </div>)}</div>
          </section>}
          {couriersOn && couriers.length > 0 && <div className="cr-strip">{couriers.map((c, i) => {
            const l = locs.find(x => x.courier_id === c.id), n = loadOf(c.id);
            const pend = orders.filter(o => o.courier_id === c.id && (o.status === "prep" || o.status === "road") && !o.courier_ack_at).length;
            return <button key={c.id} className="crs" onClick={() => setTab("couriers")}><i style={{ background: courierColor(i) }} /><b>{c.name}</b>
              <small>{n ? `${n} comenzi` : "liber"}{pend ? ` · ${pend} neconfirmate` : ""} · {l ? `GPS ${ago(l.updated_at, now)}` : "fără GPS"}</small></button>;
          })}</div>}
          {waiting.length > 0 && <section className="waiting" aria-live="polite"><div className="col-h"><i style={{ background: "var(--gold)" }} />Așteaptă confirmarea clientului<span>{waiting.length}</span></div>
            <div className="waiting-list">{waiting.map(o => {
              const left = new Date(o.offered_at!).getTime() + (settings?.offer_window_min || 5) * 60000 - now;
              return <div key={o.id} className="wt">
                <div className="h"><b>#{o.number}</b><span className={`tag ${o.mode === "livrare" ? "" : "green"}`}>{o.mode}</span><span>{o.name}</span>
                  <span className="tm num" title="timp rămas pentru răspuns">{left > 0 ? mmss(left) : "0:00"}</span></div>
                <small className="muted">Propus: <b>{o.offer_eta} min</b> · {left > 0 ? (settings?.offer_timeout === "cancel" ? "fără răspuns se anulează" : "fără răspuns se confirmă singură") : "se închide…"}</small>
                <div className="acts">
                  <a href={`tel:${o.phone.replace(/\s/g, "")}`}><Icon name="phone" size={13} /> {o.phone}</a>
                  <button className="ok" onClick={() => phoneOk(o)}>Confirmat la telefon</button>
                  <button onClick={() => setDrawer(o.id)}>Detalii</button>
                  <button className="no" onClick={() => setStatus(o, "rejected", { reject_reason: "Anulată la cererea clientului", cancelled_by: "client" }, "Comanda a fost anulată la cererea ta.")}>Clientul anulează</button>
                </div>
              </div>;
            })}</div></section>}
          {planned.length > 0 && <div className="planned"><div className="col-h"><i style={{ background: "#5aa0ff" }} />Precomenzi programate<span>{planned.length}</span></div>
            <div className="planned-list">{planned.map(o => <button key={o.id} className="pl" onClick={() => setDrawer(o.id)}>
              <b className="num">{hm(o.scheduled_for!)}</b><small>{whenLabel(o.scheduled_for!, undefined, now).split(" la ")[0]}</small>
              <span>#{o.number} · {o.name}</span><em>{o.mode}{o.zone_name ? ` · ${o.zone_name}` : ""} · {lei(Number(o.total))}</em></button>)}</div></div>}
          <div className="board">
            {([["prep", "În bucătărie", "var(--warn)", "Nicio comandă în lucru"], ["road", "Pe drum / la pass", "var(--gold)", "Nimic de predat"], ["done", "Finalizate azi", "var(--ok)", "Încă nimic finalizat"]] as const).map(([st, title, color, empty]) => {
              // la „Finalizate azi” apar și comenzile refuzate / rambursate, ca să nu dispară nimic de pe ecran
              const list = orders.filter(o => (o.status === st || (st === "done" && (o.status === "rejected" || o.status === "refunded") && o.created_at >= startOfDay())) && !isLater(o))
                .sort((a, b) => st === "done" ? (b.done_at || b.created_at).localeCompare(a.done_at || a.created_at) : a.created_at.localeCompare(b.created_at));
              return (
                <div key={st} className="col"><div className="col-h"><i style={{ background: color }} />{title}<span>{list.length}</span></div>
                  {list.length ? list.map(o => <OrderCard key={o.id} o={o} now={now} onOpen={() => setDrawer(o.id)} onAdvance={() => advance(o)} />) : <div className="colempty">{empty}</div>}
                </div>
              );
            })}
          </div>
        </div>}

        {tab === "couriers" && couriersOn && <div className="rx-body">
          {couriers.length === 0 && <p className="muted">Nu există încă livratori. Creează conturile livratora@lyrasdelivery.ro și livratorb@lyrasdelivery.ro în Supabase și rulează actualizarea bazei.</p>}
          <div className="cm-wrap">
            <Suspense fallback={<div className="cm-map" style={{ height: 520 }} />}><CourierMap couriers={couriers} locs={locs} orders={orders.filter(o => o.status === "prep" || o.status === "road")} /></Suspense>
            <div className="cm-side">{couriers.map((c, i) => {
              const l = locs.find(x => x.courier_id === c.id);
              const mine = orders.filter(o => o.courier_id === c.id && (o.status === "prep" || o.status === "road"));
              return <div key={c.id} className="cm-c">
                <div className="row-btw"><b><i style={{ background: courierColor(i) }} />{c.name}</b><small className="muted">{l ? `GPS ${ago(l.updated_at, now)}${l.battery != null ? ` · ${Math.round(l.battery * 100)}%` : ""}` : "fără GPS"}</small></div>
                {mine.length === 0 && <small className="muted">Liber</small>}
                {mine.map(o => <button key={o.id} className="cm-o" onClick={() => setDrawer(o.id)}><b>#{o.number}</b> {o.address}
                  <CourierChip o={o} now={now} /></button>)}
              </div>;
            })}</div>
          </div>
          {unassigned.length > 0 && <p className="muted" style={{ marginTop: 12 }}>{unassigned.length} livrări fără livrator: le atribui din „Comenzi”.</p>}
        </div>}

        {tab === "menu" && <div className="rx-body">
          <div className="row-btw" style={{ flexWrap: "wrap" }}><p className="muted" style={{ margin: 0 }}>Un preparat marcat epuizat apare imediat gri pe site și nu mai poate fi comandat. Apasă pe preț ca să-l schimbi.</p><a className="rbtn" href="/admin">Editează meniul (poze, prețuri) →</a></div>
          <div className="mgrid">{items.map(it => (
            <div key={it.id} className={`mi ${it.available ? "" : "off"}`}>
              {imgUrl(it.image) ? <img src={imgUrl(it.image)!} alt="" /> : <span className="ph" />}
              <div><b>{it.name_ro}</b><div className="row-btw" style={{ marginTop: 4, fontSize: 12, color: "var(--gold-2)" }}>
                <PriceEdit it={it} onSaved={m => { loadMenu(); flash(m); }} />
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
          <a className="rbtn" href="/admin#promos" style={{ justifySelf: "start" }}>Creează sau editează promoții →</a>
        </div>}
      </main>

      {drawerOrder && <>
        <div className="drawer-veil" onClick={() => setDrawer(null)} />
        <aside className="drawer" role="dialog" aria-modal="true">
          <div className="row-btw"><h3>Comanda #{drawerOrder.number}</h3><button className="mini" onClick={() => setDrawer(null)} aria-label="Închide">×</button></div>
          <p className="muted">{drawerOrder.name} · {drawerOrder.phone}<br />{drawerOrder.address}</p>
          <Ticket o={drawerOrder} />
          {couriersOn && ["prep", "road"].includes(drawerOrder.status) && drawerOrder.mode === "livrare" && couriers.length > 0 && <>
            <p className="lbl">Livrator {drawerOrder.courier_name && <CourierChip o={drawerOrder} now={now} />}</p>
            <div className="as-btns">{couriers.map((c, i) => <button key={c.id} aria-pressed={drawerOrder.courier_id === c.id} style={{ borderColor: courierColor(i) }} onClick={() => assign(drawerOrder, c.id)}>
              <i style={{ background: courierColor(i) }} />{c.name}<small>{loadOf(c.id) ? `${loadOf(c.id)} în curs` : "liber"}</small></button>)}
              {drawerOrder.courier_id && <button onClick={() => assign(drawerOrder, null)}>Fără livrator</button>}</div>
          </>}
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
          {drawerOrder.status === "done" && <button className="big ghost" style={{ marginTop: 14 }} onClick={() => {
            if (confirm(`Rambursezi comanda #${drawerOrder.number}? Clientul pierde punctele câștigate pe ea, iar punctele și desertul cadou folosite îi revin.`))
              setStatus(drawerOrder, "refunded", {}, "Comanda ta a fost rambursată. Punctele folosite au revenit în contul Lyra Rewards.");
          }}>Rambursează comanda</button>}
          {drawerOrder.status === "refunded" && <p className="tag red" style={{ justifySelf: "start" }}>Rambursată</p>}
        </aside>
      </>}
      {toast.m && <div className={`toast ${toast.bad ? "bad" : ""}`} role="status">{toast.m}</div>}
      {showStart && (
        <div className="start-veil">
          <div className="start-card">
            <Wordmark small />
            <h2>Pornește consola</h2>
            <p>Apasă o dată ca să pornești <b>soneria</b> pentru comenzi noi. Ecranul rămâne aprins cât e deschisă consola.</p>
            {incoming.length > 0 && <p className="start-new">{incoming.length} {incoming.length === 1 ? "comandă nouă te așteaptă" : "comenzi noi te așteaptă"}</p>}
            <button className="cta" onClick={start}><Icon name="bell" size={20} /> Pornește soneria</button>
            <button className="later" onClick={() => setShowStart(false)}>Continuă fără sunet</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** price on the reception menu: tap to edit; items with sizes get one field per size */
function PriceEdit({ it, onSaved }: { it: Item; onSaved: (msg: string) => void }) {
  const vs = it.variants?.length ? it.variants : null;
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const start = () => { setVals(vs ? vs.map(v => String(v.p)) : [String(it.price)]); setErr(""); setOpen(true); };
  async function save() {
    const nums = vals.map(v => Number(v.replace(",", ".")));
    if (nums.some(n => !Number.isFinite(n) || n <= 0 || n > 5000)) { setErr("Preț invalid"); return; }
    const round = (n: number) => Math.round(n * 100) / 100;
    setBusy(true);
    const patch = vs ? { variants: vs.map((v, i) => ({ ...v, p: round(nums[i]) })), price: round(Math.min(...nums)) } : { price: round(nums[0]) };
    const { error } = await supabase.from("items").update(patch).eq("id", it.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOpen(false); onSaved(`Preț nou: ${it.name_ro}`);
  }
  if (!open) return <button className="price-btn num" onClick={start} title="Schimbă prețul">{vs ? vs.map(v => lei(Number(v.p))).join(" / ") : lei(Number(it.price))}<Icon name="edit" size={13} /></button>;
  return (
    <form className="price-edit" onSubmit={e => { e.preventDefault(); save(); }}>
      {vals.map((v, i) => <label key={i}>{vs && <span>{vs[i].l}</span>}
        <input autoFocus={i === 0} inputMode="decimal" value={v} onChange={e => setVals(vals.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Preț ${it.name_ro}${vs ? " " + vs[i].l : ""}`} /><em>lei</em></label>)}
      <div className="pe-act"><button type="submit" disabled={busy}>{busy ? "…" : "Salvează"}</button><button type="button" className="ghost" onClick={() => setOpen(false)}>Renunță</button></div>
      {err && <small className="pe-err">{err}</small>}
    </form>
  );
}

function Ticket({ o }: { o: Order }) {
  const flagged = o.items.filter(l => l.allergens?.some(a => o.allergies.includes(a)));
  return (
    <div className="ticket">
      <div className="tno"><b>#{o.number}</b><span>{hm(o.created_at)} · {o.mode === "livrare" ? `LIVRARE${o.zone_name ? " · " + o.zone_name.toUpperCase() : ""}` : "RIDICARE"}</span></div>
      {o.scheduled_for && <div className="sched-tk">PRECOMANDĂ · {whenLabel(o.scheduled_for).toUpperCase()}</div>}
      {o.allergies.length > 0 && <div className="alert">ALERGIE CLIENT: {o.allergies.map(a => ALLERGENS[a]?.[0].toUpperCase()).join(", ")}{flagged.length > 0 && ` · verifică: ${flagged.map(l => l.name).join(", ")}`}</div>}
      {o.items.map((l, i) => (
        <div key={i} className="tl"><span className="q">{l.qty}×</span>
          <div><b>{l.name}</b>{l.variant && <span className="x">{l.variant}</span>}{l.extras.map(e => <span key={e.id} className="x">+ {e.name}</span>)}
            {l.note && <span className="x">„{l.note}”</span>}{l.gift && <span className="x">DESERT CADOU · LYRA REWARDS</span>}{l.promo && <span className="x">ofertă: {l.promo}</span>}
            <small>{l.grams}{l.hot ? " · tigaie fierbinte" : ""}</small></div>
          <span>{l.unit === 0 ? "0.00" : (l.unit * l.qty).toFixed(2)}</span></div>
      ))}
      {o.note && <div className="tn"><b>Mențiune:</b> {o.note}</div>}
      {Number(o.packaging) > 0 && <div className="tl"><span className="q" /><div><b>Ambalaj</b></div><span>{Number(o.packaging).toFixed(2)}</span></div>}
      {Number(o.sgr) > 0 && <div className="tl"><span className="q" /><div><b>Garanție SGR</b></div><span>{Number(o.sgr).toFixed(2)}</span></div>}
      {Number(o.delivery_fee) > 0 && <div className="tl"><span className="q" /><div><b>Livrare</b></div><span>{Number(o.delivery_fee).toFixed(2)}</span></div>}
      <div className="tot"><span>TOTAL · {o.payment === "cash" ? "numerar" : o.payment === "online" ? "plătit online" : "card la livrare"}</span><b>{lei(Number(o.total))}</b></div>
      {Number(o.discount) > 0 && <small>{o.discount_label}: −{lei(Number(o.discount))}</small>}
      {Number(o.points_value) > 0 && <small>Puncte Lyra Rewards ({o.points_used}): −{lei(Number(o.points_value))}</small>}
      {Number(o.welcome_value) > 0 && <small>Bonus de bun venit (cont nou): −{lei(Number(o.welcome_value))}</small>}
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
        {o.status === "rejected" && <span className="tag red">{o.cancelled_by === "client" ? "anulată de client" : o.cancelled_by ? "anulată, fără răspuns" : "refuzată"}</span>}
        {o.status === "refunded" && <span className="tag red">rambursată</span>}
        {o.allergies.length > 0 && <span className="tag red">alergie</span>}
        {o.scheduled_for && <span className="tag blue">{hm(o.scheduled_for)}</span>}
        {active && due ? <span className={`tm ${cls} num`}>{rem < 0 ? "întârziere " + mmss(rem) : mmss(rem)}</span> : o.done_at ? <span className="tm ok num">{hm(o.done_at)}</span> : null}</div>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{o.name}{o.courier_name && <> <CourierChip o={o} now={now} /></>}</div>
      <div className="its">{o.items.map(l => `${l.qty}× ${l.name}`).join(" · ")}</div>
      {active && due > 0 && <div className="bar"><i style={{ width: `${Math.min(100, Math.max(2, frac * 100))}%`, background: `var(--${cls})` }} /></div>}
      <div className="ft"><b className="num" style={{ color: "var(--gold-2)" }}>{lei(Number(o.total))}</b>{o.rating && <span style={{ color: "var(--gold)" }}>{"★".repeat(o.rating)}</span>}
        {active && <button className="go" onClick={e => { e.stopPropagation(); onAdvance(); }}>{o.status === "prep" ? (o.mode === "livrare" ? "Predă curierului →" : "Gata de ridicare →") : (o.mode === "livrare" ? "Livrată ✓" : "Ridicată ✓")}</button>}</div>
    </div>
  );
}

/** livratorul unei comenzi și starea lui: neconfirmat / confirmat / întârzie */
function CourierChip({ o, now }: { o: Order; now: number }) {
  if (!o.courier_name) return null;
  const late = !!o.courier_late_at && o.status !== "done";
  const st = o.status === "done" ? ["predat", "ok"] : late ? ["întârzie", "bad"] : o.courier_ack_at ? ["confirmat ✓", "ok"] : ["neconfirmat", "wait"];
  const since = !o.courier_ack_at && o.courier_assigned_at ? ` ${mmss(now - new Date(o.courier_assigned_at).getTime())}` : "";
  return <span className={`crchip ${st[1]}`}>{o.courier_name} · {st[0]}{st[1] === "wait" ? since : ""}</span>;
}
