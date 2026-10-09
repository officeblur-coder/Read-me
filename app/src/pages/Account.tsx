import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { STARS, TIERS, nextTier, tierOf, useCustomer, type Customer } from "../lib/auth";
import type { Order } from "../lib/types";
import { ALLERGENS, imgUrl, lei } from "../lib/format";
import Icon from "../components/Icon";
import BottomNav from "../components/BottomNav";

// six stars of the Lyra constellation; Vega (the brightest) lights up last
const PTS: [number, number][] = [[60, 22], [92, 14], [78, 62], [118, 72], [104, 124], [54, 112]];
const LIGHT_ORDER = [1, 2, 5, 4, 3, 0];
const LINES: [number, number][] = [[0, 1], [0, 2], [2, 3], [3, 4], [4, 5], [5, 2]];
export function Constellation({ lit, size = 150 }: { lit: number; size?: number }) {
  const on = new Set(LIGHT_ORDER.slice(0, lit));
  return (
    <svg viewBox="0 0 150 150" width={size} height={size} role="img" aria-label={`${lit} din ${STARS} stele aprinse`} className="constel">
      {LINES.map(([a, b], i) => <line key={i} x1={PTS[a][0]} y1={PTS[a][1]} x2={PTS[b][0]} y2={PTS[b][1]} className={on.has(a) && on.has(b) ? "ln on" : "ln"} />)}
      {PTS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 0 ? 9 : 6} className={on.has(i) ? "st on" : "st"} />)}
    </svg>
  );
}

export default function Account() {
  const { session, customer, ready, refresh } = useCustomer();
  if (!ready) return <div className="acc"><p className="muted" style={{ padding: 40, textAlign: "center" }}>Se încarcă…</p></div>;
  return (
    <div className="acc">
      <header className="acc-top"><Link to="/"><img src="/img/logo-lyra.jpg" alt="Lyra" /></Link><b>Lyra Club</b>
        {session && <button className="mini" onClick={() => supabase.auth.signOut()}>Ieși din cont</button>}</header>
      {session && customer ? <Member c={customer} refresh={refresh} /> : <SignIn />}
      <BottomNav active={location.hash === "#comenzi" ? "orders" : "club"} />
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState(() => { try { return JSON.parse(localStorage.getItem("lyra-form") || "{}").email || ""; } catch { return ""; } });
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function send() {
    setErr("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("Scrie o adresă de email validă."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, emailRedirectTo: location.origin + "/cont" } });
    setBusy(false);
    if (error) { setErr(error.message.includes("rate") ? "Ai cerut prea multe coduri. Încearcă din nou peste câteva minute." : error.message); return; }
    setSent(true);
  }
  async function verify() {
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setErr("Codul nu e corect sau a expirat. Cere unul nou.");
  }
  return (
    <main className="acc-main">
      <section className="join">
        <div className="join-card">
          <Constellation lit={4} size={120} />
          <h1>Fiecare comandă aprinde o stea.</h1>
          <p>Strânge puncte la fiecare comandă, urcă de la Bronz la Aur și primește desertul din partea casei la a 6-a stea.</p>
          <ul className="perks">
            <li><b>1 leu = 1 punct</b><span>100 de puncte = 10 lei reducere</span></li>
            <li><b>Constelația Lyra</b><span>a 6-a comandă vine cu Papanaș gratuit</span></li>
            <li><b>Nivel Aur</b><span>livrare gratuită mereu și +10% puncte</span></li>
          </ul>
        </div>
        <div className="join-form">
          {!sent ? <>
            <h2>Intră sau fă-ți cont</h2>
            <p className="muted">Fără parolă. Îți trimitem pe email un cod de logare. Dacă ai comandat deja cu emailul ăsta, punctele te așteaptă.</p>
            <label className="fl wide"><span>Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nume@email.com" autoComplete="email" inputMode="email" onKeyDown={e => e.key === "Enter" && send()} /></label>
            <button className="cta" onClick={send} disabled={busy}>{busy ? "Se trimite…" : "Trimite-mi codul"}</button>
          </> : <>
            <h2>Verifică emailul</h2>
            <p className="muted">Am trimis un email la <b>{email}</b>. Scrie codul de 6 cifre sau apasă pe linkul din email. Uită-te și în Spam / Promoții.</p>
            <input className="otp num" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" aria-label="Codul din email" onKeyDown={e => e.key === "Enter" && code.length === 6 && verify()} />
            <button className="cta" onClick={verify} disabled={busy || code.length < 6}>{busy ? "Se verifică…" : "Intră în cont"}</button>
            <button className="later" onClick={() => { setSent(false); setCode(""); }}>Alt email sau cod nou</button>
          </>}
          {err && <p className="err">{err}</p>}
          <p className="fine">Prin crearea contului ești de acord să păstrăm emailul, telefonul și comenzile tale pentru Lyra Club.</p>
        </div>
      </section>
    </main>
  );
}

function Member({ c, refresh }: { c: Customer; refresh: () => void }) {
  const nav = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState({ name: c.name || "", phone: c.phone || "", address: c.addresses?.[0] || "", allergies: c.allergies || [], marketing_ok: c.marketing_ok });
  const [saved, setSaved] = useState("");
  const tier = tierOf(c.lifetime), nt = nextTier(c.lifetime);
  const pct = nt ? Math.round(((c.lifetime - tier.min) / (nt.min - tier.min)) * 100) : 100;

  useEffect(() => {
    supabase.from("orders").select("*").eq("customer_id", c.id).order("created_at", { ascending: false }).limit(20).then(({ data }) => setOrders((data || []) as Order[]));
    if (location.hash === "#comenzi") setTimeout(() => document.getElementById("comenzi")?.scrollIntoView({ behavior: "smooth" }), 300);
  }, [c.id]);

  async function saveProfile() {
    const addresses = profile.address.trim() ? [profile.address.trim(), ...(c.addresses || []).filter(a => a !== profile.address.trim())].slice(0, 5) : c.addresses;
    const { error } = await supabase.from("customers").update({ name: profile.name.trim() || null, phone: profile.phone.trim() || null, addresses, allergies: profile.allergies, marketing_ok: profile.marketing_ok }).eq("id", c.id);
    setSaved(error ? "Nu s-a salvat: " + error.message : "Salvat."); refresh();
    try { localStorage.setItem("lyra-form", JSON.stringify({ name: profile.name, phone: profile.phone, email: c.email, address: profile.address })); } catch { /* ignore */ }
    setTimeout(() => setSaved(""), 2500);
  }
  function reorder(o: Order) {
    const lines = o.items.filter(l => !l.gift && !l.promo).map(l => ({
      key: [l.id, (l as { vi?: number }).vi ?? "", l.extras.map(e => e.id).sort().join(","), l.note, ""].join("|"),
      id: l.id, qty: l.qty, vi: (l as { vi?: number }).vi ?? undefined, extras: l.extras.map(e => e.id), note: l.note || "",
    }));
    try { localStorage.setItem("lyra-cart", JSON.stringify(lines)); } catch { /* ignore */ }
    nav("/?cart=1");
  }

  return (
    <main className="acc-main">
      <h1 className="acc-hello">Salut{c.name ? `, ${c.name.split(" ")[0]}` : ""}!</h1>
      <div className={`mcard ${tier.cls}`}>
        <Constellation lit={c.stars} size={170} />
        <div className="mc-top"><b>LYRA</b><span>Membru {tier.name}</span></div>
        <div className="mc-pts"><small>Puncte disponibile</small><b className="num">{c.points}</b><span>= {lei(Math.floor(c.points / 100) * 10)} reducere</span></div>
        <div className="mc-foot"><span>{(c.name || c.email || "").toUpperCase()}</span><span>din {new Date(c.created_at).toLocaleDateString("ro-RO", { month: "short", year: "numeric" })}</span></div>
      </div>

      <div className="acc-grid">
        <section className="acc-box">
          <h2>Nivelul tău</h2>
          <div className="tiers">{TIERS.map(t => <div key={t.name} className={`tier-step ${t.name === tier.name ? "on" : c.lifetime >= t.min ? "done" : ""}`}><span className={`club-dot ${t.cls}`} /><b>{t.name}</b><small>{t.perk}</small></div>)}</div>
          <div className="prog big"><i style={{ width: pct + "%" }} /></div>
          <p className="muted">{nt ? <>Încă <b>{nt.min - c.lifetime} puncte</b> până la {nt.name}.</> : "Ești la nivelul maxim. Mulțumim!"}</p>
        </section>
        <section className="acc-box">
          <h2>Constelația Lyra</h2>
          <p className="muted"><b>{c.stars} din {STARS}</b> stele aprinse. {c.free_gift ? "Papanașul din partea casei te așteaptă la următoarea comandă!" : `Încă ${STARS - c.stars} comenzi până la desertul din partea casei.`}</p>
          <div className="stars-row">{Array.from({ length: STARS }, (_, i) => <span key={i} className={i < c.stars ? "on" : ""}><Icon name="star" size={22} fill /></span>)}</div>
        </section>
      </div>

      <section className="acc-box" id="comenzi">
        <div className="row-btw"><h2>Comenzile tale</h2><Link to="/" className="mini">Comandă acum</Link></div>
        {orders.length === 0 && <p className="muted">Încă nu ai comenzi cu acest cont.</p>}
        <div className="hist">
          {orders.map(o => {
            const imgs = o.items.map(l => l.id).slice(0, 3);
            return (
              <div key={o.id} className="hist-row">
                <div className="hist-imgs">{imgs.map(id => <img key={id} src={imgUrl(id + ".jpg")!} alt="" onError={e => (e.currentTarget.style.visibility = "hidden")} />)}</div>
                <Link to={"/comanda/" + o.token} className="hist-txt"><b>{o.items.map(l => l.name).join(", ")}</b>
                  <small>#{o.number} · {new Date(o.created_at).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })} · {lei(Number(o.total))}{o.points_earned && o.status === "done" ? ` · +${o.points_earned} puncte` : ""}</small></Link>
                <button className="mini" onClick={() => reorder(o)}>Din nou</button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="acc-box">
        <h2>Datele tale</h2>
        <div className="fields">
          <label className="fl"><span>Nume</span><input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} autoComplete="name" /></label>
          <label className="fl"><span>Telefon</span><input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} inputMode="tel" autoComplete="tel" /></label>
          <label className="fl wide"><span>Adresa principală</span><input value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} autoComplete="street-address" /></label>
        </div>
        <p className="cp-lbl">Alergii <i style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>(bucătăria vede alerta pe bon)</i></p>
        <div className="chips">{Object.keys(ALLERGENS).map(a => <button key={a} className="chip" aria-pressed={profile.allergies.includes(a)} onClick={() => setProfile({ ...profile, allergies: profile.allergies.includes(a) ? profile.allergies.filter(x => x !== a) : [...profile.allergies, a] })}><Icon name={a} size={13} /> {ALLERGENS[a][0]}</button>)}</div>
        <label className="adm-sw" style={{ marginTop: 16 }}><button className="switch" role="switch" aria-checked={profile.marketing_ok} onClick={() => setProfile({ ...profile, marketing_ok: !profile.marketing_ok })} /><span>Vreau să primesc oferte pe email</span></label>
        <div className="row-btw" style={{ marginTop: 16 }}><span className="muted">{saved}</span><button className="cta" style={{ width: "auto", padding: "13px 26px" }} onClick={saveProfile}>Salvează</button></div>
        <p className="fine" style={{ textAlign: "left" }}>Cont: {c.email}. Pentru ștergerea contului scrie-ne și o facem în 24 de ore.</p>
      </section>
    </main>
  );
}
