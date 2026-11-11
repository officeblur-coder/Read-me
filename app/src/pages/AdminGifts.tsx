// Vouchere cadou: caută un cod (sau email / nr. comandă), vezi valoarea și starea, marchează-l folosit la restaurant, retrimite emailul.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { lei } from "../lib/format";
import Icon from "../components/Icon";

type Gift = { id: string; code: string; value: number; order_no: number | null; email: string; buyer_name: string | null; status: "issued" | "used" | "cancelled";
  issued_at: string; expires_at: string; used_at: string | null; used_by: string | null; emailed_at: string | null; note: string | null };
const d = (s: string | null) => (s ? new Date(s).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" }) : "");

export function GiftsTab({ flash }: { flash: (m: string) => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Gift[] | null>(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(async (s = q) => {
    const { data, error } = await supabase.rpc("admin_gift_cards", { p_q: s });
    if (error) { flash(error.message.includes("admin_gift_cards") ? "Rulează întâi actualizarea bazei de date." : error.message); setList([]); return; }
    setList((data || []) as Gift[]);
  }, [q]);
  useEffect(() => { load(""); }, []);
  useEffect(() => { const t = setTimeout(() => load(q), 300); return () => clearTimeout(t); }, [q]);
  async function use(g: Gift) {
    if (!confirm(`Marchezi voucherul ${g.code} (${lei(Number(g.value))}) ca folosit?`)) return;
    setBusy(g.id);
    const { error } = await supabase.rpc("admin_gift_use", { p_code: g.code, p_note: null });
    setBusy(""); flash(error ? error.message : "Voucher marcat folosit."); load();
  }
  async function resend(g: Gift) {
    const to = prompt("Trimite voucherul pe emailul:", g.email); if (!to) return;
    setBusy(g.id);
    const { error } = await supabase.rpc("admin_gift_resend", { p_id: g.id, p_email: to });
    setBusy(""); flash(error ? error.message : `Voucherul a fost trimis pe ${to}.`); load();
  }
  const live = (g: Gift) => g.status === "issued" && new Date(g.expires_at).getTime() > Date.now();
  const total = (list || []).filter(live).reduce((s, g) => s + Number(g.value), 0);
  return (
    <div className="adm-page">
      <div className="adm-bar"><h1>Vouchere cadou</h1><span className="muted">{(list || []).filter(live).length} active · {lei(total)} de folosit</span></div>
      <p className="muted adm-help">Voucherele se emit singure când comanda cu „Card cadou” e finalizată, iar codul pleacă pe emailul clientului. La restaurant cauți codul, verifici valoarea și apeși „Marchează folosit”. Un voucher se folosește o singură dată. Prețurile variantelor (100–500 lei) se schimbă din Meniu → „Card cadou Lyra”.</p>
      <label className="tb-search gift-search"><Icon name="search" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cod (LYRA-…), email sau nr. comandă" autoFocus /></label>
      {list && !list.length && <div className="dsc-empty"><Icon name="star" size={28} /><b>{q ? "Niciun voucher găsit" : "Niciun voucher emis încă"}</b><span>{q ? "Verifică codul." : "Apar aici după prima comandă finalizată cu card cadou."}</span></div>}
      <div className="gift-list">{(list || []).map(g => {
        const exp = g.status === "issued" && new Date(g.expires_at).getTime() <= Date.now();
        const st = g.status === "used" ? ["Folosit", "off"] : g.status === "cancelled" ? ["Anulat", "off"] : exp ? ["Expirat", "off"] : ["Activ", "on"];
        return (
          <div key={g.id} className={`gift-row ${live(g) ? "" : "dim"}`}>
            <div className="gift-val num">{Number(g.value)}<small> lei</small></div>
            <div className="gift-info">
              <b className="num">{g.code}</b><span className={`dsc-st ${st[1]}`}>{st[0]}</span>
              <small>{g.buyer_name || "—"} · {g.email}{g.order_no ? ` · comanda #${g.order_no}` : ""}</small>
              <small>Emis {d(g.issued_at)} · valabil până la {d(g.expires_at)}{g.emailed_at ? " · trimis pe email" : " · emailul nu a plecat"}{g.used_at ? ` · folosit ${d(g.used_at)}${g.used_by ? ` (${g.used_by})` : ""}` : ""}{g.note ? ` · ${g.note}` : ""}</small>
            </div>
            <div className="dsc-act">
              {live(g) && <button className="addbtn" disabled={busy === g.id} onClick={() => use(g)}>Marchează folosit</button>}
              {g.status === "issued" && <button className="mini" disabled={busy === g.id} onClick={() => resend(g)}>Retrimite emailul</button>}
            </div>
          </div>
        );
      })}</div>
    </div>
  );
}
