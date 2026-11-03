import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useCustomer, type Customer } from "../lib/auth";
import { LEDGER_LABEL, TIER_CLS, nextTierInfo, rateOf, tierName, useRewards, vppOf, type RewardsCfg } from "../lib/rewards";
import { confetti } from "../lib/fx";
import type { Order } from "../lib/types";
import { ALLERGENS, imgUrl, lei } from "../lib/format";
import Icon from "../components/Icon";
import Wordmark from "../components/Wordmark";
import BottomNav from "../components/BottomNav";
import SiteFooter from "../components/SiteFooter";

export default function Account() {
  const { session, customer, ready, refresh } = useCustomer();
  if (!ready) return <div className="acc"><p className="muted" style={{ padding: 40, textAlign: "center" }}>Se încarcă…</p></div>;
  return (
    <div className="acc">
      <header className="acc-top"><Link to="/"><Wordmark small /></Link><b>Lyra Rewards</b>
        {session && <button className="mini" onClick={() => supabase.auth.signOut()}>Ieși din cont</button>}</header>
      {session && customer ? <Member c={customer} refresh={refresh} /> : <SignIn />}
      <SiteFooter />
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
  const [optIn, setOptIn] = useState(false);   // offers by email: only if the customer ticks it (GDPR)
  async function send() {
    setErr("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("Scrie o adresă de email validă."); return; }
    setBusy(true);
    try { localStorage.setItem("lyra-optin", optIn ? "1" : "0"); } catch { /* ignore */ }
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, emailRedirectTo: location.origin + "/cont", data: { marketing_ok: optIn } } });
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
        <JoinCard />
        <div className="join-form">
          {!sent ? <>
            <h2>Intră sau fă-ți cont</h2>
            <p className="muted">Fără parolă. Îți trimitem pe email un cod de logare. Dacă ai comandat deja cu emailul ăsta, punctele te așteaptă.</p>
            <label className="fl wide"><span>Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nume@email.com" autoComplete="email" inputMode="email" onKeyDown={e => e.key === "Enter" && send()} /></label>
            <label className="optin"><input type="checkbox" checked={optIn} onChange={e => setOptIn(e.target.checked)} />
              <span>Da, vreau să primesc pe email oferte, noutăți și surprize de la Lyra's Delivery. <i>Opțional. Te poți dezabona oricând, dintr-un click.</i></span></label>
            <button className="cta" onClick={send} disabled={busy}>{busy ? "Se trimite…" : "Trimite-mi codul"}</button>
          </> : <>
            <h2>Verifică emailul</h2>
            <p className="muted">Am trimis un email la <b>{email}</b>. Scrie codul din email sau apasă pe linkul din email. Uită-te și în Spam / Promoții.</p>
            <input className="otp num" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" aria-label="Codul din email" onKeyDown={e => e.key === "Enter" && code.length >= 6 && verify()} />
            <button className="cta" onClick={verify} disabled={busy || code.length < 6}>{busy ? "Se verifică…" : "Intră în cont"}</button>
            <button className="later" onClick={() => { setSent(false); setCode(""); }}>Alt email sau cod nou</button>
          </>}
          {err && <p className="err">{err}</p>}
          <p className="fine">Prin crearea contului ești de acord cu <Link to="/termeni">Termenii</Link>. Datele tale sunt folosite conform <Link to="/confidentialitate">Politicii de confidențialitate</Link>.</p>
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
  const { cfg, me, reload } = useRewards(c.id);
  const welcomeMin = useWelcomeCfg()?.min ?? 150;
  useEffect(() => {
    let want: string | null = null;
    try { want = localStorage.getItem("lyra-optin"); localStorage.removeItem("lyra-optin"); } catch { /* ignore */ }
    if (want === "1" && !c.marketing_ok) supabase.from("customers").update({ marketing_ok: true }).eq("id", c.id).then(() => { setProfile(p => ({ ...p, marketing_ok: true })); refresh(); });
  }, [c.id]);
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
      {Number(c.welcome_credit || 0) > 0 && !c.welcome_used_at && <div className="acc-welcome"><span className="wl-gift">🎁</span><div>
        <b>Ai {Number(c.welcome_credit)} lei bonus de bun venit</b>
        <small>Se scad automat din prima comandă de minim {welcomeMin} lei (produse). Se folosesc tot odată și nu se cumulează cu codurile de reducere.</small></div></div>}
      {me ? <Rewards cfg={cfg} me={me} name={c.name || c.email || ""} since={c.created_at} onSeen={async () => { await supabase.rpc("rewards_mark_read"); reload(); }} />
        : <p className="muted">Se încarcă Lyra Rewards…</p>}

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
                  <small>#{o.number} · {new Date(o.created_at).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })} · {lei(Number(o.total))}{o.points_earned && o.status === "done" ? ` · +${o.points_earned} puncte` : o.status === "refunded" ? " · rambursată" : o.status === "rejected" ? " · refuzată" : ""}</small></Link>
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

const fmtDate = (d: string) => new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });

/** welcome bonus settings (on/off, lei, minimum order) */
function useWelcomeCfg() {
  const [w, setW] = useState<{ on: boolean; lei: number; min: number } | null>(null);
  useEffect(() => {
    supabase.from("settings").select("welcome_on,welcome_lei,welcome_min").eq("id", 1).maybeSingle()
      .then(({ data }) => data && setW({ on: !!data.welcome_on, lei: Number(data.welcome_lei), min: Number(data.welcome_min) }));
  }, []);
  return w;
}

/** Signed-out pitch: the three levels with their real numbers from the admin settings. */
function JoinCard() {
  const { cfg } = useRewards(null);
  const w = useWelcomeCfg();
  return (
    <div className="join-card rw-join">
      {w?.on && w.lei > 0 && <div className="acc-welcome"><span className="wl-gift">🎁</span><div><b>{w.lei} lei cadou la cont nou</b>
        <small>Îi primești pe loc și îi folosești la prima comandă de minim {w.min} lei.</small></div></div>}
      <span className="rw-kicker">{cfg.program_name.toUpperCase()}</span>
      <h1>Fiecare comandă îți dă înapoi.</h1>
      <p>1 leu = 1 punct. Cu cât comanzi mai des, cu atât punctele valorează mai mult. Fără card, fără parolă.</p>
      <ul className="perks">
        {[1, 2, 3].map(t => <li key={t}><b>Lyra {tierName(cfg, t)} · {rateOf(cfg, t)}% cashback</b>
          <span>{t === 1 ? "de la prima comandă" : `după ${lei(cfg.thresholds[t - 1])} cumulat · desert cadou la promovare`}</span></li>)}
      </ul>
    </div>
  );
}

/** Lyra Rewards dashboard: card, progress, levels, vouchers, messages, history. */
function Rewards({ cfg, me, name, since, onSeen }: { cfg: RewardsCfg; me: import("../lib/rewards").MyRewards; name: string; since: string; onSeen: () => void }) {
  const t = me.tier, nx = nextTierInfo(cfg, t, me.spent);
  const promo = me.notifications.find(n => n.kind === "promotion" && !n.read_at);
  const unread = me.notifications.filter(n => !n.read_at).length;
  const active = me.vouchers.filter(v => v.status === "active" && new Date(v.expires_at).getTime() > Date.now());
  useEffect(() => { if (promo) setTimeout(confetti, 300); }, [promo?.id]);
  if (!cfg.enabled) return <section className="acc-box"><h2>{cfg.program_name}</h2><p className="muted">Programul de fidelitate este momentan oprit. Punctele tale ({me.points}) sunt păstrate.</p></section>;
  return (<>
    {promo && <div className="rw-celebrate" role="status">
      <div className="rw-cel-ic">✦</div>
      <div><b>{promo.title}</b><p>{promo.body}</p></div>
      <button className="mini" onClick={onSeen}>Mulțumesc!</button>
    </div>}

    <div className="rw-top">
      <div className={`rw-card ${TIER_CLS[t - 1]}`}>
        <div className="rw-card-top"><span className="rw-kicker">LYRA REWARDS</span><span className="rw-tier">Lyra {tierName(cfg, t)}</span></div>
        <div className="rw-pts"><small>Puncte disponibile</small><b className="num">{me.points.toLocaleString("ro-RO")}</b><span>valorează <b className="num">{lei(me.value)}</b></span></div>
        <div className="rw-card-foot"><span>{name.toUpperCase()}</span><span>{rateOf(cfg, t)}% cashback · membru din {new Date(since).toLocaleDateString("ro-RO", { month: "short", year: "numeric" })}</span></div>
      </div>
      <section className="acc-box rw-progress">
        {nx ? <>
          <h2>Mai ai doar {lei(nx.left)} până la Lyra {tierName(cfg, nx.tier)}!</h2>
          <p className="muted">Deblochezi {rateOf(cfg, nx.tier)}% cashback (1 punct = {vppOf(cfg, nx.tier).toFixed(2).replace(".", ",")} lei) și un desert cadou.</p>
          <div className="rw-bar"><i style={{ width: nx.pct + "%" }} /></div>
          <div className="rw-bar-lbl"><span>Lyra {tierName(cfg, t)}</span><span className="num">{lei(me.spent)} din {lei(cfg.thresholds[nx.tier - 1])}</span><span>Lyra {tierName(cfg, nx.tier)}</span></div>
        </> : <>
          <h2>Ești Lyra {tierName(cfg, t)}, nivelul maxim ✦</h2>
          <p className="muted">Primești {rateOf(cfg, t)}% înapoi în puncte la fiecare comandă. Mulțumim că ești alături de noi!</p>
          <div className="rw-bar"><i style={{ width: "100%" }} /></div>
        </>}
        {me.expires_at && me.points > 0 && <p className="fine" style={{ textAlign: "left", margin: 0 }}>Punctele rămân active cât timp comanzi cel puțin o dată la {cfg.expiry_months} luni (următoarea dată: {fmtDate(me.expires_at)}).</p>}
      </section>
    </div>

    {active.length > 0 && <section className="acc-box rw-vouchers">
      <h2>Vouchere</h2>
      {active.map(v => <div key={v.id} className="rw-v">
        <span className="rw-v-ic">🍰</span>
        <div><b>Desert cadou · Lyra {tierName(cfg, v.tier)}</b><small>Îl alegi în coș, la următoarea comandă. Valabil până pe {fmtDate(v.expires_at)}. O singură folosire.</small></div>
        <Link to="/?cart=1" className="mini">Folosește</Link>
      </div>)}
    </section>}

    <section className="acc-box">
      <h2>Nivelurile Lyra Rewards</h2>
      <div className="rw-levels">
        {[1, 2, 3].map(n => <div key={n} className={`rw-level ${TIER_CLS[n - 1]} ${n === t ? "on" : n < t ? "done" : ""}`}>
          <span className="rw-dot" />
          <b>Lyra {tierName(cfg, n)}</b>
          <em className="num">{rateOf(cfg, n)}%</em>
          <small>{n === 1 ? "Nivel de start" : `De la ${lei(cfg.thresholds[n - 1])} cumulat`}</small>
          <small>1 punct = {vppOf(cfg, n).toFixed(2).replace(".", ",")} lei{n > 1 ? " · desert cadou la promovare" : ""}</small>
        </div>)}
      </div>
      <p className="fine" style={{ textAlign: "left", margin: 0 }}>1 leu plătit pe produse = 1 punct, acordat la livrare. Poți plăti cu puncte până la {cfg.max_redeem_pct}% din produse, de la comanda următoare. Punctele își păstrează valoarea nivelului la care le-ai câștigat. Nivelul nu scade niciodată.</p>
    </section>

    <div className="acc-grid">
      <section className="acc-box">
        <h2>Mesaje {unread > 0 && <span className="rw-badge">{unread}</span>}</h2>
        {me.notifications.length === 0 && <p className="muted">Aici apar punctele câștigate, promovările și voucherele.</p>}
        <div className="rw-notes">{me.notifications.slice(0, 8).map(n => <div key={n.id} className={n.read_at ? "" : "new"}><b>{n.title}</b><small>{n.body}</small><time>{fmtDate(n.created_at)}</time></div>)}</div>
        {unread > 0 && <button className="mini" style={{ justifySelf: "start" }} onClick={onSeen}>Marchează ca citite</button>}
      </section>
      <section className="acc-box">
        <h2>Istoric puncte</h2>
        {me.ledger.length === 0 && <p className="muted">Primele puncte apar după prima comandă livrată.</p>}
        <div className="rw-ledger">{me.ledger.map((l, i) => <div key={i}>
          <div><b>{LEDGER_LABEL[l.kind] || l.kind}</b><small>{l.note || ""} · {fmtDate(l.created_at)}</small></div>
          <span className={`num ${l.points >= 0 ? "plus" : "minus"}`}>{l.points >= 0 ? "+" : ""}{l.points}<small>{lei(Math.abs(Number(l.value)))}</small></span>
        </div>)}</div>
      </section>
    </div>
  </>);
}
