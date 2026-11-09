import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { imgUrl } from "../lib/format";
import type { Category, Item } from "../lib/types";
import { useDiscounts } from "../lib/discounts";
import { uploadImage } from "../lib/upload";
import { renderEmail, sample, TEMPLATES, type Block, type Content, type Mode } from "../lib/newsletter";
import Icon from "../components/Icon";

type Camp = {
  id: string; name: string; subject: string; mode: Mode; audience: string; status: string; scheduled_at: string | null; started_at: string | null;
  finished_at: string | null; created_at: string; total: number; sent: number; failed: number; queued: number; clickers: number; clicks: number; unsubscribed: number; last_error: string | null;
};
type Overview = { subscribers: number; daily_limit: number; sent_24h: number; has_key: boolean; campaigns: Camp[] };
type Draft = { id?: string; name: string; subject: string; preheader: string; mode: Mode; content: Content; audience: string; status?: string; scheduled_at?: string | null };

const AUD: [string, string][] = [["all", "Toți abonații"], ["ordered", "Doar cei care au comandat"], ["never_ordered", "Doar cei care n-au comandat încă"],
  ["inactive", "Au comandat, dar nu în ultimele 30 de zile"], ["tier2", "Nivel Select sau Signature"], ["tier3", "Doar nivel Signature"]];
const ST: Record<string, [string, string]> = { draft: ["Ciornă", "off"], scheduled: ["Programată", "soon"], sending: ["Se trimite…", "on"], sent: ["Trimisă", "on"], cancelled: ["Oprită", "off"] };
const BLOCKS: [Block["t"], string, string][] = [["heading", "Titlu", "T"], ["text", "Text", "¶"], ["image", "Poză", "🖼"], ["button", "Buton", "▶"],
  ["products", "Produse din meniu", "🍔"], ["coupon", "Cod reducere", "%"], ["divider", "Linie", "—"], ["spacer", "Spațiu", "↕"]];
const VARS = ["{{prenume}}", "{{nume}}"];
const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const toLocal = (d: Date) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const newBlock = (t: Block["t"]): Block => (t === "heading" ? { t, text: "Titlu nou" } : t === "text" ? { t, text: "" } : t === "image" ? { t, src: "" }
  : t === "button" ? { t, label: "Comandă acum", href: "/?s=newsletter" } : t === "products" ? { t, ids: [], cta: "Comandă acum" } : t === "coupon" ? { t, code: "", note: "" } : { t } as Block);

type PushOv = { subscribers: number; with_account: number; configured: boolean; recent: { title: string; body: string; url: string; sent_to: number; test: boolean; created_at: string }[] };

/** Notificare pe telefon către toți cei care au acceptat oferte prin notificări. */
function PushPanel({ items, flash }: { items: Item[]; flash: (m: string) => void }) {
  const [ov, setOv] = useState<PushOv | null>(null);
  const [f, setF] = useState({ title: "", body: "", url: "/" });
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);
  const load = useCallback(() => { supabase.rpc("admin_push_overview").then(({ data }) => data && setOv(data as PushOv)); }, []);
  useEffect(load, [load]);
  if (!ov) return null;
  async function send(test: boolean) {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_push_send", { p_title: f.title, p_body: f.body, p_url: f.url, p_test: test });
    setBusy(false); setSure(false);
    if (error) { flash(error.message); return; }
    flash(test ? "Test trimis pe telefonul tău." : `Notificarea a plecat către ${(data as { sent_to: number }).sent_to} telefoane.`);
    if (!test) setF({ title: "", body: "", url: "/" });
    load();
  }
  const menu = items.filter(i => i.active).sort((a, b) => a.name_ro.localeCompare(b.name_ro, "ro"));
  return (
    <section className="push-panel">
      <div className="adm-bar"><h1>Notificare pe telefon</h1><span className="muted">{ov.subscribers} telefoane acceptă oferte prin notificări{ov.with_account ? ` (${ov.with_account} cu cont)` : ""}</span></div>
      <p className="muted adm-help">Ajunge pe ecranul telefonului, ca un mesaj, chiar dacă aplicația e închisă. O primesc doar cei care au pornit „Vreau oferte prin notificări”. Folosește-le rar (1–2 pe săptămână), altfel oamenii le opresc.</p>
      {!ov.configured && <p className="tr-tip">⚠️ Notificările nu sunt configurate încă în Supabase (pașii sunt în supabase/functions/push/README.md). Până atunci nimeni nu se poate abona.</p>}
      <div className="push-form">
        <label className="fl"><span>Titlu ({f.title.length}/60)</span><input maxLength={60} value={f.title} placeholder="Smash Week: -20% la burgeri" onChange={e => setF({ ...f, title: e.target.value })} /></label>
        <label className="fl"><span>Text ({f.body.length}/180)</span><textarea maxLength={180} rows={2} value={f.body} placeholder="Până duminică, toți burgerii smash au 20% reducere. Comandă acum!" onChange={e => setF({ ...f, body: e.target.value })} /></label>
        <label className="fl"><span>La apăsare deschide</span><select value={f.url} onChange={e => setF({ ...f, url: e.target.value })}>
          <option value="/">Meniul</option><option value="/cont">Contul / Lyra Rewards</option>
          <optgroup label="Un preparat">{menu.map(i => <option key={i.id} value={`/?p=${i.id}`}>{i.name_ro}</option>)}</optgroup></select></label>
        <div className="push-prev" aria-label="Previzualizare"><img src="/icons/icon-192.png" alt="" /><div><small>Lyra Delivery · acum</small><b>{f.title || "Titlul notificării"}</b><span>{f.body || "Textul notificării apare aici."}</span></div></div>
        <div className="push-acts">
          <button className="mini" disabled={busy || !f.title.trim() || !f.body.trim()} onClick={() => send(true)}>Trimite-mi un test</button>
          {sure ? <><button className="addbtn" disabled={busy} onClick={() => send(false)}>Da, trimite la {ov.subscribers}</button><button className="mini" onClick={() => setSure(false)}>Renunță</button></>
            : <button className="addbtn" disabled={busy || !f.title.trim() || !f.body.trim() || !ov.subscribers} onClick={() => setSure(true)}>Trimite tuturor</button>}
        </div>
      </div>
      {ov.recent.length > 0 && <div className="push-recent"><small>Trimise recent</small>{ov.recent.map((r, i) => <div key={i}><b>{r.title}</b> · {r.test ? "test" : `${r.sent_to} telefoane`} · {fmt(r.created_at)}</div>)}</div>}
    </section>
  );
}

/** Emails to everyone who accepted offers: block newsletter, simple message or own HTML; test, schedule, send, stats. */
export function NewsletterTab({ items, cats, flash }: { items: Item[]; cats: Category[]; flash: (m: string) => void }) {
  const [ov, setOv] = useState<Overview | null>(null);
  const [err, setErr] = useState("");
  const [d, setD] = useState<Draft | null>(null);
  const [picking, setPicking] = useState(false);
  const [links, setLinks] = useState<{ id: string; rows: { url: string; people: number; clicks: number }[] } | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_newsletters");
    if (error) setErr(error.message); else { setErr(""); setOv(data as Overview); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // cât timp se trimite ceva, lista se actualizează singură
  useEffect(() => {
    if (!ov?.campaigns.some(c => c.status === "sending" || c.status === "scheduled")) return;
    const t = setInterval(load, 10000); return () => clearInterval(t);
  }, [ov, load]);

  async function open(id: string) {
    const { data, error } = await supabase.from("email_campaigns").select("*").eq("id", id).single();
    if (error || !data) { flash("Nu s-a putut deschide campania."); return; }
    setD({ id: data.id, name: data.name, subject: data.subject, preheader: data.preheader || "", mode: data.mode, content: data.content || {}, audience: data.audience, status: data.status, scheduled_at: data.scheduled_at });
  }
  async function duplicate(id: string) {
    const { data } = await supabase.from("email_campaigns").select("*").eq("id", id).single();
    if (data) setD({ name: data.name + " (copie)", subject: data.subject, preheader: data.preheader || "", mode: data.mode, content: data.content || {}, audience: data.audience });
  }
  async function remove(c: Camp) {
    if (!confirm(`Ștergi campania „${c.name}”?`)) return;
    const { error } = await supabase.from("email_campaigns").delete().eq("id", c.id);
    flash(error ? "Nu s-a șters: " + error.message : "Campanie ștearsă."); load();
  }
  async function cancel(c: Camp) {
    if (!confirm(c.status === "scheduled" ? "Anulezi programarea? Campania rămâne ciornă." : "Oprești trimiterea? Cei care nu l-au primit încă nu-l vor mai primi.")) return;
    const { error } = await supabase.rpc("newsletter_cancel", { p_campaign: c.id });
    flash(error ? error.message : "Oprit."); load();
  }
  async function showLinks(c: Camp) {
    const { data } = await supabase.rpc("admin_newsletter_links", { p_campaign: c.id });
    setLinks({ id: c.id, rows: (data || []) as { url: string; people: number; clicks: number }[] });
  }
  async function saveLimit(v: number) {
    const { error } = await supabase.from("settings").update({ newsletter_daily_limit: v }).eq("id", 1);
    flash(error ? error.message : "Limita zilnică a fost salvată."); load();
  }

  if (d) return <Editor d={d} setD={setD} items={items} cats={cats} flash={flash} subscribers={ov?.subscribers ?? 0} limit={ov?.daily_limit ?? 100}
    onClose={() => { setD(null); load(); }} />;

  return (
    <div className="adm-page">
      <PushPanel items={items} flash={flash} />
      <div className="adm-bar"><h1>Email · newsletter</h1><button className="addbtn" onClick={() => setPicking(true)}><span>+</span>Campanie nouă</button></div>
      <p className="muted adm-help">Trimiți emailuri doar clienților care au bifat că acceptă oferte. Fiecare email are automat linkul de dezabonare, iar cine se dezabonează nu mai primește nimic. Poți construi un newsletter din blocuri (titluri, poze, produse din meniu cu prețul actual, butoane, cod de reducere), poți scrie un mesaj simplu sau poți lipi HTML-ul tău. Folosește {"{{prenume}}"} ca să te adresezi fiecăruia pe nume.</p>
      {err && <p className="err">{err.includes("admin_newsletters") ? "Rulează întâi actualizare_schema.sql în Supabase." : err}</p>}
      {ov && <>
        <div className="rw-stats">
          <div className="rw-stat"><small>Abonați</small><b className="num">{ov.subscribers}</b><span>clienți care acceptă oferte</span></div>
          <div className="rw-stat"><small>Trimise în ultimele 24 h</small><b className="num">{ov.sent_24h}</b><span>din limita de {ov.daily_limit} pe zi</span></div>
          <div className="rw-stat nl-limit"><small>Limita zilnică</small>
            <span className="nl-lim-row"><input inputMode="numeric" defaultValue={ov.daily_limit} onBlur={e => { const v = Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0); if (v !== ov.daily_limit) saveLimit(v); }} /> emailuri / zi</span>
            <span>Resend gratuit: 100 pe zi și 3.000 pe lună. Restul se trimit automat a doua zi.</span></div>
        </div>
        {!ov.has_key && <p className="tr-tip">⚠️ Lipsește cheia Resend în Supabase (Vault: resend_api_key). Fără ea nu se poate trimite nimic.</p>}
        {!ov.campaigns.length && <div className="dsc-empty" style={{ marginTop: 16 }}><Icon name="send" size={28} /><b>Nicio campanie încă</b><span>Apasă „Campanie nouă” și alege un șablon.</span></div>}
        <div className="dsc-list" style={{ marginTop: 16 }}>{ov.campaigns.map(c => {
          const [st, cls] = ST[c.status] || [c.status, "off"];
          return (
            <div key={c.id} className="nl-card">
              <div className="nl-main">
                <b>{c.name}</b><small className="nl-subj">„{c.subject}”</small>
                <div className="nl-meta"><span className={`dsc-st ${cls}`}>{st}</span>
                  <small>{c.status === "scheduled" ? `pe ${fmt(c.scheduled_at)}` : c.started_at ? `pornită ${fmt(c.started_at)}` : `creată ${fmt(c.created_at)}`} · {AUD.find(a => a[0] === c.audience)?.[1]}</small></div>
                {c.total > 0 && <div className="nl-prog"><i style={{ width: `${pct(c.sent, c.total)}%` }} /></div>}
                {c.last_error && <small className="pe-err">Eroare Resend: {c.last_error}</small>}
              </div>
              {c.total > 0 && <div className="nl-stats">
                <div><b className="num">{c.sent}</b><small>trimise{c.total !== c.sent ? ` din ${c.total}` : ""}</small></div>
                <div><b className="num">{pct(c.clickers, c.sent)}%</b><small>{c.clickers} au dat click</small></div>
                {c.failed > 0 && <div className="bad"><b className="num">{c.failed}</b><small>eșuate</small></div>}
                {c.unsubscribed > 0 && <div><b className="num">{c.unsubscribed}</b><small>dezabonați</small></div>}
                {c.queued > 0 && <div><b className="num">{c.queued}</b><small>la coadă</small></div>}
              </div>}
              <div className="dsc-act">
                {(c.status === "draft" || c.status === "scheduled") && <button className="mini" onClick={() => open(c.id)}>Editează</button>}
                {c.clicks > 0 && <button className="mini" onClick={() => showLinks(c)}>Linkuri</button>}
                <button className="mini" onClick={() => duplicate(c.id)}>Duplică</button>
                {(c.status === "sending" || c.status === "scheduled") && <button className="mini danger" onClick={() => cancel(c)}>{c.status === "scheduled" ? "Anulează" : "Oprește"}</button>}
                {c.status !== "sending" && <button className="mini danger" onClick={() => remove(c)}>Șterge</button>}
              </div>
              {links?.id === c.id && <div className="nl-links">{links.rows.map(r => <div key={r.url}><span>{r.url.replace(/^https?:\/\//, "")}</span><b className="num">{r.people} oameni · {r.clicks} clickuri</b></div>)}
                <button className="mini" onClick={() => setLinks(null)}>Închide</button></div>}
            </div>
          );
        })}</div>
      </>}
      {picking && <div className="pop" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && setPicking(false)}>
        <div className="pop-card nl-pick"><button className="x-btn" onClick={() => setPicking(false)} aria-label="Închide">×</button>
          <h2>Alege un punct de plecare</h2>
          <div className="nl-tpls">{TEMPLATES.map(t => <button key={t.key} onClick={() => { setPicking(false);
            setD({ name: t.key === "empty" ? "Campanie nouă" : t.name, subject: t.subject, preheader: t.preheader, mode: t.mode, content: JSON.parse(JSON.stringify(t.content)), audience: "all" }); }}>
            <b>{t.name}</b><small>{t.desc}</small></button>)}</div>
        </div></div>}
    </div>
  );
}

function Editor({ d, setD, items, cats, flash, subscribers, limit, onClose }: {
  d: Draft; setD: (d: Draft) => void; items: Item[]; cats: Category[]; flash: (m: string) => void; subscribers: number; limit: number; onClose: () => void;
}) {
  const dsc = useDiscounts();
  const [site, setSite] = useState("https://lyrasdelivery.ro");
  const [me, setMe] = useState("");
  const [view, setView] = useState<"desk" | "mob">("desk");
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState("");
  const [testTo, setTestTo] = useState("");
  const [when, setWhen] = useState(d.scheduled_at ? toLocal(new Date(d.scheduled_at)) : "");
  const [confirmSend, setConfirmSend] = useState(false);
  const focused = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  useEffect(() => {
    supabase.from("settings").select("site_url").eq("id", 1).maybeSingle().then(({ data }) => data?.site_url && setSite(data.site_url));
    supabase.auth.getUser().then(({ data }) => { const e = data.user?.email || ""; setMe(e); setTestTo(t => t || e); });
  }, []);
  useEffect(() => { setCount(null); supabase.rpc("newsletter_audience", { p_audience: d.audience }).then(({ data }) => setCount(typeof data === "number" ? data : null)); }, [d.audience]);

  const byId = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items]);
  const out = useMemo(() => renderEmail(d.mode, d.content, d.preheader, { site, byId, pct: dsc.pct }), [d.mode, d.content, d.preheader, site, byId, dsc.pct]);
  const blocks = d.content.blocks || [];
  const setBlocks = (b: Block[]) => setD({ ...d, content: { ...d.content, blocks: b } });
  const upd = (i: number, patch: Partial<Block>) => setBlocks(blocks.map((b, j) => (j === i ? ({ ...b, ...patch } as Block) : b)));
  const move = (i: number, k: number) => { const b = [...blocks]; const [x] = b.splice(i, 1); b.splice(Math.max(0, Math.min(b.length, i + k)), 0, x); setBlocks(b); };
  const insertVar = (v: string) => {
    const el = focused.current; if (!el) { flash("Dă click întâi în câmpul unde vrei variabila."); return; }
    const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? s;
    const val = el.value.slice(0, s) + v + el.value.slice(e);
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!; setter.call(el, val);
    el.dispatchEvent(new Event("input", { bubbles: true })); el.focus(); el.setSelectionRange(s + v.length, s + v.length);
  };
  const track = { onFocus: (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => { focused.current = e.currentTarget; } };

  async function save(quiet = false): Promise<string | null> {
    if (!d.subject.trim()) { flash("Scrie subiectul emailului."); return null; }
    if (!out.html.trim() || (d.mode === "text" && !(d.content.text || "").trim()) || (d.mode === "blocks" && !blocks.length)) { flash("Emailul e gol."); return null; }
    setBusy("save");
    const row = { name: d.name.trim() || d.subject.slice(0, 60), subject: d.subject.trim(), preheader: d.preheader.trim() || null, mode: d.mode, content: d.content,
      html: out.html, text_body: out.text, links: out.links, audience: d.audience, updated_at: new Date().toISOString(), ...(d.id ? {} : { created_by: me }) };
    const res = d.id ? await supabase.from("email_campaigns").update(row).eq("id", d.id).select("id").single() : await supabase.from("email_campaigns").insert(row).select("id").single();
    setBusy("");
    if (res.error) { flash("Nu s-a salvat: " + res.error.message); return null; }
    const id = (res.data as { id: string }).id;
    if (!d.id) setD({ ...d, id });
    if (!quiet) flash("Ciornă salvată.");
    return id;
  }
  async function test() {
    const id = await save(true); if (!id) return;
    setBusy("test");
    const { error } = await supabase.rpc("newsletter_test", { p_campaign: id, p_email: testTo.trim() });
    setBusy("");
    flash(error ? error.message : `Email de test trimis la ${testTo.trim()}. Verifică și în Spam / Promoții.`);
  }
  async function send(at: string | null) {
    const id = await save(true); if (!id) return;
    setBusy("send");
    const { data, error } = await supabase.rpc("newsletter_send", { p_campaign: id, p_at: at ? new Date(at).toISOString() : null });
    if (!error && !at) await supabase.rpc("newsletter_run");     // primul lot pleacă imediat
    setBusy(""); setConfirmSend(false);
    if (error) { flash(error.message); return; }
    flash(at ? `Programată pe ${fmt(new Date(at).toISOString())} pentru ${data} abonați.` : `Trimiterea a pornit către ${data} abonați.`);
    onClose();
  }
  async function upload(f: File | undefined, i: number) {
    if (!f) return; setBusy("img");
    try { const url = await uploadImage(f, "newsletter/img"); upd(i, { src: url } as Partial<Block>); }
    catch (e) { flash("Poza nu s-a încărcat: " + (e as Error).message); }
    setBusy("");
  }
  const days = count != null && limit > 0 ? Math.ceil(count / limit) : 1;

  return (
    <div className="adm-page nl-edit-page">
      <div className="adm-bar"><button className="mini" onClick={onClose}>← Înapoi</button>
        <input className="nl-name" value={d.name} onChange={e => setD({ ...d, name: e.target.value })} aria-label="Numele campaniei (doar pentru tine)" />
        <button className="mini" onClick={() => save()} disabled={!!busy}>{busy === "save" ? "…" : "Salvează ciorna"}</button></div>
      <div className="nl-edit">
        <section className="nl-form">
          <label className="fl"><span>Subiect</span><input value={d.subject} {...track} onChange={e => setD({ ...d, subject: e.target.value })} placeholder="ex. {{prenume}}, ai 25% reducere la burgeri 🔥" maxLength={150} /></label>
          <label className="fl"><span>Text de previzualizare <i>apare lângă subiect în inbox</i></span><input value={d.preheader} {...track} onChange={e => setD({ ...d, preheader: e.target.value })} placeholder="ex. Doar până duminică" maxLength={150} /></label>
          <div className="nl-vars"><small>Inserează:</small>{VARS.map(v => <button key={v} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insertVar(v)}>{v}</button>)}</div>
          <div className="seg big2 nl-mode">{([["blocks", "Newsletter cu blocuri"], ["text", "Mesaj simplu"], ["html", "HTML propriu"]] as const).map(([m, l]) =>
            <button key={m} aria-pressed={d.mode === m} onClick={() => setD({ ...d, mode: m, content: { ...d.content, ...(m === "blocks" && !d.content.blocks ? { blocks: [] } : {}) } })}>{l}</button>)}</div>

          {d.mode === "text" && <>
            <label className="fl"><span>Mesajul <i>**îngroșat**, [text](link), linkurile se fac singure</i></span>
              <textarea rows={10} value={d.content.text || ""} {...track} onChange={e => setD({ ...d, content: { ...d.content, text: e.target.value } })} /></label>
            <div className="hours-row">
              <label className="fl"><span>Buton (opțional)</span><input value={d.content.button?.label || ""} onChange={e => setD({ ...d, content: { ...d.content, button: { label: e.target.value, href: d.content.button?.href || "/?s=newsletter" } } })} placeholder="Comandă acum" /></label>
              <label className="fl"><span>Link buton</span><input value={d.content.button?.href || ""} onChange={e => setD({ ...d, content: { ...d.content, button: { label: d.content.button?.label || "", href: e.target.value } } })} placeholder="https://lyrasdelivery.ro" /></label>
            </div>
          </>}

          {d.mode === "html" && <label className="fl"><span>HTML-ul tău <i>lipește aici emailul făcut în alt program; linkul de dezabonare se adaugă singur</i></span>
            <textarea className="nl-code" rows={18} value={d.content.html || ""} {...track} onChange={e => setD({ ...d, content: { ...d.content, html: e.target.value } })} spellCheck={false} placeholder="<html>…</html>" /></label>}

          {d.mode === "blocks" && <div className="nl-blocks">
            {blocks.map((b, i) => (
              <div key={i} className="nl-block">
                <div className="nl-bh"><b>{BLOCKS.find(x => x[0] === b.t)?.[1]}</b>
                  <span><button onClick={() => move(i, -1)} disabled={!i} aria-label="Mută sus">↑</button><button onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Mută jos">↓</button>
                    <button onClick={() => setBlocks([...blocks.slice(0, i + 1), JSON.parse(JSON.stringify(b)), ...blocks.slice(i + 1)])} aria-label="Dublează">⧉</button>
                    <button className="del" onClick={() => setBlocks(blocks.filter((_, j) => j !== i))} aria-label="Șterge">×</button></span></div>
                {b.t === "heading" && <div className="nl-row"><input value={b.text} {...track} onChange={e => upd(i, { text: e.target.value })} />
                  <select value={b.size || "big"} onChange={e => upd(i, { size: e.target.value as "big" | "mid" })}><option value="big">Mare</option><option value="mid">Mediu</option></select></div>}
                {b.t === "text" && <><textarea rows={4} value={b.text} {...track} onChange={e => upd(i, { text: e.target.value })} placeholder="Scrie aici. **îngroșat**, [text](link)" />
                  <div className="nl-row nl-small"><label><input type="checkbox" checked={b.align === "center"} onChange={e => upd(i, { align: e.target.checked ? "center" : "left" })} /> centrat</label></div></>}
                {b.t === "image" && <>
                  {b.src && <img className="nl-thumb" src={b.src.startsWith("http") ? b.src : imgUrl(b.src) || ""} alt="" />}
                  <div className="nl-row"><label className="mini nl-up">{busy === "img" ? "Se încarcă…" : "Încarcă poză"}<input type="file" accept="image/*" hidden onChange={e => upload(e.target.files?.[0], i)} /></label>
                    <input value={b.src} onChange={e => upd(i, { src: e.target.value })} placeholder="sau adresa pozei (https://…)" /></div>
                  <input value={b.href || ""} onChange={e => upd(i, { href: e.target.value })} placeholder="Link la click pe poză (opțional)" />
                </>}
                {b.t === "button" && <div className="nl-row"><input value={b.label} onChange={e => upd(i, { label: e.target.value })} placeholder="Textul butonului" />
                  <input value={b.href} onChange={e => upd(i, { href: e.target.value })} placeholder="Link (ex. /?s=newsletter sau https://…)" /></div>}
                {b.t === "products" && <ProductPicker ids={b.ids} items={items} cats={cats} pct={dsc.pct} onChange={ids => upd(i, { ids })} cta={b.cta || ""} onCta={cta => upd(i, { cta })} />}
                {b.t === "coupon" && <div className="nl-row"><input value={b.code} onChange={e => upd(i, { code: e.target.value.toUpperCase() })} placeholder="COD (din Coduri reducere)" />
                  <input value={b.note || ""} onChange={e => upd(i, { note: e.target.value })} placeholder="ex. −10% la toată comanda, până duminică" /></div>}
              </div>
            ))}
            <div className="nl-add">{BLOCKS.map(([t, l, ic]) => <button key={t} onClick={() => setBlocks([...blocks, newBlock(t)])}><span>{ic}</span>{l}</button>)}</div>
          </div>}

          <div className="nl-send">
            <label className="fl"><span>Cui trimiți</span>
              <select value={d.audience} onChange={e => setD({ ...d, audience: e.target.value })}>{AUD.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <p className="muted nl-count">{count == null ? "Se numără…" : <><b>{count}</b> abonați primesc emailul{count > limit && limit > 0 ? ` · cu limita de ${limit}/zi se trimite în ${days} zile` : ""}.</>} Din {subscribers} abonați în total.</p>
            <div className="nl-row"><input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="adresa ta de email" inputMode="email" />
              <button className="mini" onClick={test} disabled={!!busy}>{busy === "test" ? "Se trimite…" : "Trimite test"}</button></div>
            <div className="nl-row"><input type="datetime-local" value={when} min={toLocal(new Date())} onChange={e => setWhen(e.target.value)} />
              <button className="mini" disabled={!!busy || !when} onClick={() => send(when)}>Programează</button></div>
            <button className="addbtn nl-go" disabled={!!busy || !count} onClick={() => setConfirmSend(true)}><Icon name="send" size={16} />Trimite acum{count ? ` la ${count} abonați` : ""}</button>
          </div>
        </section>

        <section className="nl-prev">
          <div className="nl-prev-bar"><div className="seg">{([["desk", "Calculator"], ["mob", "Telefon"]] as const).map(([k, l]) => <button key={k} aria-pressed={view === k} onClick={() => setView(k)}>{l}</button>)}</div>
            <small className="muted">Previzualizare cu „Ana” în loc de {"{{prenume}}"}</small></div>
          <div className="nl-inbox"><b>{sample(d.subject) || "(fără subiect)"}</b><span>{sample(d.preheader)}</span></div>
          <iframe title="Previzualizare email" className={`nl-frame ${view}`} sandbox="" srcDoc={sample(out.html)} />
        </section>
      </div>
      {confirmSend && <div className="pop" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && setConfirmSend(false)}>
        <div className="pop-card nl-pick"><h2>Trimiți acum?</h2>
          <p className="muted">„{d.subject}” pleacă la <b>{count}</b> abonați{count && count > limit ? `, câte ${limit} pe zi (${days} zile)` : ""}. După pornire nu se mai poate modifica, doar opri.</p>
          <div className="nl-row"><button className="mini" onClick={() => setConfirmSend(false)}>Nu încă</button>
            <button className="addbtn" disabled={!!busy} onClick={() => send(null)}>{busy === "send" ? "Se pornește…" : "Da, trimite"}</button></div>
        </div></div>}
    </div>
  );
}

function ProductPicker({ ids, items, cats, pct, onChange, cta, onCta }: { ids: string[]; items: Item[]; cats: Category[]; pct: Record<string, number>; onChange: (ids: string[]) => void; cta: string; onCta: (s: string) => void }) {
  const [q, setQ] = useState(""); const [cat, setCat] = useState("all");
  const f = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const list = items.filter(i => i.active && (cat === "all" || (cat === "off" ? pct[i.id] > 0 : i.category_id === cat)) && (!q || f(i.name_ro).includes(f(q)))).slice(0, 60);
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  return (
    <div className="nl-pp">
      {ids.length > 0 && <div className="dsc-chosen"><div>{ids.map(id => byId[id] && <button key={id} onClick={() => onChange(ids.filter(x => x !== id))}>{byId[id].name_ro} ×</button>)}</div></div>}
      <div className="nl-row"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Caută produs…" />
        <select value={cat} onChange={e => setCat(e.target.value)}><option value="all">Toate</option><option value="off">Doar cele reduse acum</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name_ro}</option>)}</select></div>
      <div className="nl-pp-list">{list.map(i => <label key={i.id} className={ids.includes(i.id) ? "on" : ""}>
        <input type="checkbox" checked={ids.includes(i.id)} onChange={() => onChange(ids.includes(i.id) ? ids.filter(x => x !== i.id) : [...ids, i.id].slice(0, 8))} />
        {imgUrl(i.image) ? <img src={imgUrl(i.image)!} alt="" loading="lazy" /> : <span className="ph" />}<span>{i.name_ro}{pct[i.id] ? <em> −{pct[i.id]}%</em> : null}</span></label>)}</div>
      <input value={cta} onChange={e => onCta(e.target.value)} placeholder="Text link sub produs (ex. Comandă acum)" />
      <small className="muted">Maxim 8 produse; apar câte două pe rând, cu poza, prețul actual (și reducerea, dacă e activă) și link direct la produs.</small>
    </div>
  );
}
