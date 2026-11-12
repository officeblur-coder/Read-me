// Aplicația livratorului (lyrasdelivery.ro/curier), instalată pe telefonul de serviciu.
// • Comenzile atribuite de recepție; alarmă (sunet + vibrație) până apasă „Confirm”.
// • Ora de livrare, clientul (apel), produsele, adresa cu Google Maps, plata.
// • „Predat clientului” oricând; după ora promisă, alarmă la fiecare 5 minute: „Am predat” / „Sunt în întârziere”.
// • GPS cât aplicația e deschisă (ecranul rămâne aprins), pentru harta din recepție.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Order } from "../lib/types";
import { hm, lei, mmss } from "../lib/format";
import { enablePush, publicKey } from "../lib/notify";
import { isNativeApp, startNativeGps, startNativePush } from "../lib/native";
import Icon from "../components/Icon";
import Wordmark from "../components/Wordmark";
import { Login, chime, keepAwake, unlockAudio } from "./Reception";

type Me = { id: string; name: string; role: string };
const COURIERS = ["Istvan", "Pipe", "Liviu", "Zoli"];   // contul = numele@lyrasdelivery.ro

export default function Courier() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  // instalat pe ecran, telefonul deschide direct aplicația livratorului
  useEffect(() => {
    const l = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const old = l?.href;
    if (l) l.href = "/manifest-curier.webmanifest";
    document.title = "Lyra Livrator";
    return () => { if (l && old) l.href = old; };
  }, []);
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
  if (!session) return <Login title="Livratori" users={COURIERS} />;
  if (me === undefined) return <div className="login"><p className="muted">Se verifică accesul…</p></div>;
  if (!me || me.role !== "courier") return (
    <div className="login"><form onSubmit={e => { e.preventDefault(); supabase.auth.signOut(); }}>
      <Wordmark small /><h1>Fără acces</h1>
      <p className="muted" style={{ textAlign: "center" }}>Contul {session.user.email} nu e cont de livrator. Intră cu contul tău de livrator (Istvan, Pipe, Liviu sau Zoli).</p>
      <button className="big ghost">Ieși din cont</button></form></div>
  );
  return <CourierGate me={me} />;
}

/** pornit / oprit din admin → Program → Livratori */
function CourierGate({ me }: { me: Me }) {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    const load = () => supabase.from("settings").select("couriers_on").eq("id", 1).maybeSingle().then(({ data }) => setOn(!!data?.couriers_on));
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  if (on === null) return <div className="login"><p className="muted">Se încarcă…</p></div>;
  if (!on) return (
    <div className="cr cr-start">
      <Wordmark />
      <h1>Bună, {me.name}!</h1>
      <p>Aplicația livratorilor e oprită momentan de restaurant. Pornește singură când recepția o activează (verificăm la 30 de secunde).</p>
      <button className="linkbtn" onClick={() => supabase.auth.signOut()}>Ieși din cont</button>
    </div>
  );
  return <CourierApp me={me} />;
}

function startOfDay() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); }
// pinul de pe hartă când clientul a ales unul, altfel adresa scrisă
const mapsUrl = (a: string, lat?: number | null, lng?: number | null) =>
  "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + encodeURIComponent(lat != null && lng != null ? `${lat},${lng}` : a);
const payText = (o: Order) => o.payment === "online" ? "Plătit online · nu încasezi nimic" : `De încasat ${lei(Number(o.total))} · ${o.payment === "cash" ? "numerar" : "card (POS)"}`;
const dueOf = (o: Order) => o.scheduled_for ? new Date(o.scheduled_for).getTime() : o.accepted_at && o.eta_min ? new Date(o.accepted_at).getTime() + o.eta_min * 60000 : 0;
const LATE_EVERY = 5 * 60000;

type Alarm = { o: Order; kind: "new" | "late" };

function CourierApp({ me }: { me: Me }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [started, setStarted] = useState(false);
  const [gps, setGps] = useState<{ ok: boolean; at?: number; acc?: number; err?: string }>({ ok: false });
  const [push, setPush] = useState<"" | "on" | "off">("");
  // „Sunt în întârziere” / deschiderea reamintirii: următoarea vine peste 5 minute
  const lateSeen = useRef<Record<string, number>>({});
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    const { data } = await supabase.from("orders").select("*").eq("courier_id", me.id)
      .or(`status.in.(prep,road),done_at.gte.${startOfDay()}`).order("created_at");
    setOrders((data || []) as Order[]);
  }, [me.id]);
  useEffect(() => {
    load();
    const ch = supabase.channel("courier-" + me.id).on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load()).subscribe();
    const poll = setInterval(load, 5000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { supabase.removeChannel(ch); clearInterval(poll); clearInterval(tick); };
  }, [load, me.id]);

  // GPS: trimite poziția la cel mult 10 secunde (sau la 25 m distanță)
  const last = useRef<{ t: number; lat: number; lng: number } | null>(null);
  const native = isNativeApp();
  // în aplicația Android: GPS și cu ecranul blocat
  useEffect(() => {
    if (!started || !native) return;
    let stop: (() => void) | null = null;
    startNativeGps(l => {
      setGps({ ok: true, at: Date.now(), acc: Math.round(l.accuracy) });
      const p = last.current, moved = p ? Math.hypot((l.latitude - p.lat) * 111000, (l.longitude - p.lng) * 76000) : 1e9;
      if (p && Date.now() - p.t < 10000 && moved < 25) return;
      last.current = { t: Date.now(), lat: l.latitude, lng: l.longitude };
      supabase.rpc("courier_ping", { p_lat: l.latitude, p_lng: l.longitude, p_acc: l.accuracy, p_heading: l.bearing, p_speed: l.speed, p_battery: null });
    }, m => setGps({ ok: false, err: m })).then(s => { stop = s; });
    return () => { stop?.(); };
  }, [started, native]);
  useEffect(() => {
    if (!started || native || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(async p => {
      const { latitude: lat, longitude: lng, accuracy, heading, speed } = p.coords;
      setGps({ ok: true, at: Date.now(), acc: Math.round(accuracy) });
      const l = last.current, moved = l ? Math.hypot((lat - l.lat) * 111000, (lng - l.lng) * 76000) : 1e9;
      if (l && Date.now() - l.t < 10000 && moved < 25) return;
      last.current = { t: Date.now(), lat, lng };
      let battery: number | null = null;
      try { battery = (await (navigator as unknown as { getBattery?: () => Promise<{ level: number }> }).getBattery?.())?.level ?? null; } catch { /* ignore */ }
      supabase.rpc("courier_ping", { p_lat: lat, p_lng: lng, p_acc: accuracy, p_heading: heading, p_speed: speed, p_battery: battery });
    }, e => setGps({ ok: false, err: e.code === 1 ? "Locația e blocată: permite accesul la locație pentru lyrasdelivery.ro." : "Nu găsim semnal GPS." }),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
    return () => navigator.geolocation.clearWatch(id);
  }, [started]);
  // ecranul rămâne aprins (telefon de serviciu)
  useEffect(() => {
    if (!started) return;
    keepAwake();
    const v = () => { if (document.visibilityState === "visible") { keepAwake(); load(); } };
    document.addEventListener("visibilitychange", v);
    return () => document.removeEventListener("visibilitychange", v);
  }, [started, load]);
  useEffect(() => { publicKey().then(k => setPush(k ? "off" : "")); }, []);

  async function start() {
    unlockAudio(); chime();
    setStarted(true);
    if (native) {   // aplicația Android: notificări Firebase (sună și cu ecranul blocat)
      const err = await startNativePush(t => Promise.resolve(supabase.rpc("courier_device_register", { p_token: t })), () => load());
      setPush(err ? "" : "on"); if (err && !err.startsWith("fără")) flash(err);
    } else if (push === "off") { const err = await enablePush("push_subscribe_courier"); if (!err) setPush("on"); }
  }

  const active = orders.filter(o => o.status === "prep" || o.status === "road").sort((a, b) => (dueOf(a) || 9e15) - (dueOf(b) || 9e15));
  const doneToday = orders.filter(o => o.status === "done");
  // alarma: comenzi neconfirmate, apoi întârzieri (la 5 minute)
  const alarms: Alarm[] = [
    ...active.filter(o => !o.courier_ack_at).map(o => ({ o, kind: "new" as const })),
    ...active.filter(o => o.courier_ack_at && dueOf(o) && now > dueOf(o) && now - (lateSeen.current[o.id] || 0) >= LATE_EVERY).map(o => ({ o, kind: "late" as const })),
  ];
  const alarm = alarms[0];
  useEffect(() => {
    if (!alarm || !started) return;
    const ring = () => { chime(); try { navigator.vibrate?.([400, 150, 400, 150, 400]); } catch { /* ignore */ } };
    ring();
    const t = setInterval(ring, 2500);
    return () => { clearInterval(t); try { navigator.vibrate?.(0); } catch { /* ignore */ } };
  }, [alarm?.o.id, alarm?.kind, started]);

  async function call(fn: string, o: Order, ok: string) {
    setBusy(o.id);
    const { error } = await supabase.rpc(fn, { p_order: o.id });
    setBusy(null);
    if (error) flash(error.message); else flash(ok);
    load();
  }
  const confirm = (o: Order) => call("courier_ack", o, `Ai confirmat comanda #${o.number}.`);
  const delivered = (o: Order) => { lateSeen.current[o.id] = Date.now(); return call("courier_delivered", o, `#${o.number} predată. Mulțumim!`); };
  const late = (o: Order) => { lateSeen.current[o.id] = Date.now(); return call("courier_late", o, "Recepția vede că întârzii. Te reamintim peste 5 minute."); };

  if (!started) return (
    <div className="cr cr-start">
      <Wordmark />
      <h1>Bună, {me.name}!</h1>
      <p>{native ? "Apasă ca să pornești tura. Telefonul sună la fiecare comandă nouă, și cu ecranul blocat, iar recepția îți vede locația pe hartă. La prima pornire permite locația „Tot timpul” și notificările."
        : "Apasă ca să pornești tura. Telefonul va suna și vibra la fiecare comandă nouă, ecranul rămâne aprins, iar recepția îți vede locația pe hartă."}</p>
      <button className="cta cr-go" onClick={start}><Icon name="bike" size={22} />Pornește tura</button>
      <button className="linkbtn" onClick={() => supabase.auth.signOut()}>Ieși din cont</button>
    </div>
  );

  return (
    <div className="cr">
      <header className="cr-top">
        <Wordmark small />
        <div><b>{me.name}</b><small>{active.length} de livrat · {doneToday.length} livrate azi · {lei(doneToday.reduce((s, o) => s + (o.payment === "online" ? 0 : Number(o.total)), 0))} încasat</small></div>
        <button className="mini" onClick={() => supabase.auth.signOut()} aria-label="Ieși"><Icon name="logout" size={15} /></button>
      </header>
      <div className={`cr-status ${gps.ok ? "ok" : "bad"}`}>
        <Icon name="pin" size={14} />{gps.ok ? `GPS activ · ±${gps.acc} m` : gps.err || "Pornim GPS-ul…"}
        {push === "on" && <span> · notificări pornite</span>}
      </div>

      <main className="cr-list">
        {active.length === 0 && <div className="cr-empty"><Icon name="bike" size={40} /><p>Nu ai comenzi acum. Când recepția îți dă una, telefonul sună.</p></div>}
        {active.map(o => {
          const due = dueOf(o), rem = due - now, overdue = !!due && rem < 0;
          return (
            <article key={o.id} className={`cr-card ${!o.courier_ack_at ? "new" : ""} ${overdue ? "late" : ""}`}>
              <div className="cr-h">
                <b className="num">#{o.number}</b>
                <span className={`cr-st ${o.status}`}>{o.status === "prep" ? "În bucătărie" : "Predată ție · în drum"}</span>
                {due > 0 && <span className={`tm ${overdue ? "bad" : rem < 8 * 60000 ? "warn" : "ok"} num`}>{overdue ? "întârziere " + mmss(rem) : mmss(rem)}</span>}
              </div>
              {due > 0 && <p className="cr-due">La client până la <b className="num">{hm(due)}</b></p>}
              <p className="cr-addr">{o.address}</p>
              <p className="cr-who"><b>{o.name}</b> · {o.phone}</p>
              <div className="cr-actions">
                <a className="mini" href={`tel:${o.phone.replace(/\s+/g, "")}`}><Icon name="phone" size={14} /> Sună clientul</a>
                {o.address && <a className="mini" href={mapsUrl(o.address, o.lat, o.lng)} target="_blank" rel="noreferrer"><Icon name="send" size={14} /> Direcții Google Maps</a>}
              </div>
              <ul className="cr-items">{o.items.map((l, i) => <li key={i}><b>{l.qty}×</b> {l.name}{l.variant ? ` (${l.variant})` : ""}{l.note ? <small> „{l.note}”</small> : null}</li>)}</ul>
              {o.note && <p className="cr-note"><b>Mențiune:</b> {o.note}</p>}
              <p className={`cr-pay ${o.payment === "online" ? "paid" : ""}`}>{payText(o)}</p>
              {!o.courier_ack_at && <button className="cta" disabled={busy === o.id} onClick={() => confirm(o)}><Icon name="check" size={18} />Confirm, am văzut comanda</button>}
              <div className="cr-btns">
                {overdue && <button className="mini warn" disabled={busy === o.id} onClick={() => late(o)}>Sunt în întârziere</button>}
                <button className="cta ok" disabled={busy === o.id} onClick={() => delivered(o)}><Icon name="check" size={18} />Predat clientului</button>
              </div>
            </article>
          );
        })}
      </main>

      {alarm && <div className="cr-alarm" role="alertdialog" aria-label="Alertă comandă">
        <div className="cr-alarm-box">
          <Icon name="bell" size={44} />
          {alarm.kind === "new" ? <>
            <h2>Comandă nouă #{alarm.o.number}</h2>
            <p className="cr-alarm-addr">{alarm.o.address}</p>
            <p>{alarm.o.name} · la client {dueOf(alarm.o) ? hm(dueOf(alarm.o)) : "cât mai curând"}</p>
            <button className="cta" disabled={busy === alarm.o.id} onClick={() => confirm(alarm.o)}><Icon name="check" size={20} />Confirm</button>
          </> : <>
            <h2>#{alarm.o.number} trebuia livrată la {hm(dueOf(alarm.o))}</h2>
            <p className="cr-alarm-addr">{alarm.o.address}</p>
            <button className="cta ok" disabled={busy === alarm.o.id} onClick={() => delivered(alarm.o)}><Icon name="check" size={20} />Am predat</button>
            <button className="cta warnb" disabled={busy === alarm.o.id} onClick={() => late(alarm.o)}>Sunt în întârziere</button>
          </>}
        </div>
      </div>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
