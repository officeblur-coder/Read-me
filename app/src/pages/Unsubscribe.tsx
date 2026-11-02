import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Wordmark from "../components/Wordmark";

/** One-click unsubscribe from offers: lyrasdelivery.ro/dezabonare?t=<token> (no login needed). */
export default function Unsubscribe() {
  const t = new URLSearchParams(useLocation().search).get("t") || "";
  const [state, setState] = useState<"wait" | "ok" | "bad">("wait");
  const [email, setEmail] = useState("");
  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(t)) { setState("bad"); return; }
    supabase.rpc("unsubscribe", { p_token: t }).then(({ data }) => {
      const d = data as { ok: boolean; email?: string } | null;
      if (d?.ok) { setEmail(d.email || ""); setState("ok"); } else setState("bad");
    });
  }, [t]);
  return (
    <div className="acc"><header className="acc-top"><Link to="/"><Wordmark small /></Link></header>
      <main className="acc-main"><section className="acc-box" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
        {state === "wait" && <p className="muted">Se procesează…</p>}
        {state === "ok" && <><h2>Te-ai dezabonat</h2><p className="muted">Adresa {email} nu mai primește oferte de la Lyra's Delivery. Emailurile despre comenzile tale (confirmare, puncte) continuă.</p>
          <p className="muted">Te-ai răzgândit? Bifează din nou ofertele în <Link to="/cont">contul tău</Link>.</p></>}
        {state === "bad" && <><h2>Link invalid</h2><p className="muted">Linkul de dezabonare nu e valid. Poți opri ofertele din <Link to="/cont">contul tău</Link> sau ne poți scrie la comenzi@lyrasdelivery.ro.</p></>}
        <Link to="/" className="cta" style={{ width: "auto", display: "inline-flex", padding: "13px 26px", marginTop: 12, textDecoration: "none" }}>Înapoi la meniu</Link>
      </section></main>
    </div>
  );
}
