// „Recomandă un prieten”: linkul /r/COD, mesajul pentru cel invitat și cardul din cont.
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { lei } from "../lib/format";
import Icon from "./Icon";

const KEY = "lyra-ref";
const getRef = () => { try { return localStorage.getItem(KEY) || ""; } catch { return ""; } };
const setRef = (v: string) => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch { /* ignore */ } };
type Info = { name: string; lei: number; min: number };

/** /r/ANA4821: ține minte codul și deschide meniul cu mesajul invitației */
export function RefLanding() {
  const { code } = useParams();
  if (code) setRef(code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12));
  return <Navigate to="/?invitat=1" replace />;
}

/** mesajul de jos pentru cel invitat (meniu, cont fără login) */
export function InviteNote({ compact = false }: { compact?: boolean }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [x, setX] = useState(false);
  useEffect(() => {
    const code = getRef();
    if (!code) return;
    supabase.rpc("referral_info", { p_code: code }).then(({ data }) => { if (data) setInfo(data as Info); else setRef(""); });
  }, []);
  if (!info || x) return null;
  const text = <><b>{info.name} te invită la Lyra's Delivery.</b> Fă-ți cont și, după prima ta comandă de minim {lei(Number(info.min))}, primiți amândoi câte {lei(Number(info.lei))} în puncte Lyra Rewards.</>;
  if (compact) return <div className="acc-welcome"><span className="wl-gift">🤝</span><div><small>{text}</small></div></div>;
  return (
    <div className="invite-note" role="dialog" aria-label="Invitație">
      <span className="wl-gift">🤝</span><p>{text}</p>
      <Link to="/cont" className="big">Fă-ți cont</Link>
      <button className="x" aria-label="Închide" onClick={() => setX(true)}>×</button>
    </div>
  );
}

type Mine = { on: boolean; lei: number; min: number; code: string; link: string; invited: number; rewarded: number; earned: number; referred_by: string | null; my_bonus_paid: boolean };

/** cardul din cont: leagă invitația primită și arată linkul propriu */
export function InviteCard() {
  const [m, setM] = useState<Mine | null>(null);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  async function load() { const { data } = await supabase.rpc("my_referral"); if (data) setM(data as Mine); }
  useEffect(() => {
    (async () => {
      const code = getRef();
      if (code) {
        const { data, error } = await supabase.rpc("claim_referral", { p_code: code });
        setRef("");
        if (error) setMsg(error.message);
        else if (data && !(data as { already?: boolean }).already) setMsg(`Gata! Ești invitatul lui ${(data as Info).name}. Bonusul vine după prima comandă livrată.`);
      }
      load();
    })();
  }, []);
  if (!m || !m.on) return msg ? <p className="muted">{msg}</p> : null;
  const share = `Comandă de la Lyra's Delivery cu linkul meu și primim amândoi câte ${Number(m.lei)} lei: ${m.link}`;
  async function shareIt() {
    if (navigator.share) { try { await navigator.share({ title: "Lyra's Delivery", text: share }); return; } catch { /* anulat */ } }
    copy();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(m!.link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }
  return (
    <section className="acc-box invite">
      <h2>Invită un prieten · {lei(Number(m.lei))} pentru amândoi</h2>
      <p className="muted">Trimite linkul tău. Prietenul își face cont din link, iar după prima lui comandă livrată de minim {lei(Number(m.min))} primiți amândoi câte {lei(Number(m.lei))} în puncte Lyra Rewards.</p>
      {msg && <p className="invite-msg">{msg}</p>}
      {m.referred_by && <p className="muted" style={{ fontSize: 13 }}>Te-a invitat {m.referred_by}{m.my_bonus_paid ? " · bonusul tău a fost acordat" : " · bonusul vine după prima comandă livrată"}.</p>}
      <div className="invite-code"><small>Codul tău</small><b className="num">{m.code}</b></div>
      <div className="invite-acts">
        <button className="big" onClick={shareIt}><Icon name="send" size={18} />Trimite linkul</button>
        <a className="big ghost" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer">WhatsApp</a>
        <button className="big ghost" onClick={copy}>{copied ? "Copiat ✓" : "Copiază linkul"}</button>
      </div>
      <div className="invite-stats"><span><b className="num">{m.invited}</b> invitați</span><span><b className="num">{m.rewarded}</b> au comandat</span><span><b className="num">{lei(Number(m.earned))}</b> câștigați</span></div>
    </section>
  );
}
