// „Pune Lyra pe ecran”: panou jos (~40% din ecran) care apare pe telefon la o secundă după deschidere.
// Android (Chrome, Edge, Samsung): butonul deschide direct fereastra de instalare a telefonului.
// iPhone / iPad: Apple nu permite instalarea dintr-un buton, așa că arătăm cei doi pași din Safari (Distribuie → Adaugă pe ecranul principal).
import { useEffect, useState } from "react";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const KEY_X = "lyra-install-x", KEY_OK = "lyra-installed";
let deferred: BIP | null = null;
const subs = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e as BIP; subs.forEach(f => f()); });
  window.addEventListener("appinstalled", () => { deferred = null; try { localStorage.setItem(KEY_OK, "1"); } catch { /* ignore */ } subs.forEach(f => f()); });
  if ("serviceWorker" in navigator && import.meta.env.PROD && import.meta.env.MODE !== "demo") {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
}

const ua = () => navigator.userAgent;
export const isStandalone = () => matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIOS = () => /iPhone|iPad|iPod/i.test(ua()) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isMobile = () => isIOS() || /Android|Mobi/i.test(ua());
const isIOSNotSafari = () => isIOS() && /CriOS|FxiOS|EdgiOS/i.test(ua());
const isInApp = () => /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok/i.test(ua());   // browserul din Facebook / Instagram

/** whether the sheet can be offered here, and the native prompt when the phone has one */
export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force(n => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  let installed = false; try { installed = localStorage.getItem(KEY_OK) === "1"; } catch { /* ignore */ }
  const can = typeof window !== "undefined" && isMobile() && !isStandalone() && !installed;
  return { can, native: !!deferred, ios: typeof window !== "undefined" && isIOS() };
}

export function shouldAutoShow() {
  if (!isMobile() || isStandalone()) return false;
  try {
    if (localStorage.getItem(KEY_OK) === "1") return false;
    const x = Number(localStorage.getItem(KEY_X) || 0);
    return Date.now() - x > 5 * 864e5;            // după „X”, revine peste 5 zile
  } catch { return true; }
}

const Share = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" /></svg>;
const PlusBox = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" /></svg>;
const Dots = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>;

export function InstallSheet({ onClose, hasAccount }: { onClose: () => void; hasAccount: boolean }) {
  const { native, ios } = useInstall();
  const [steps, setSteps] = useState(false);
  const [done, setDone] = useState(false);
  const close = (remember = true) => { if (remember) try { localStorage.setItem(KEY_X, String(Date.now())); } catch { /* ignore */ } onClose(); };
  async function install() {
    if (!deferred) { setSteps(true); return; }
    await deferred.prompt();
    const r = await deferred.userChoice; deferred = null;
    if (r.outcome === "accepted") { try { localStorage.setItem(KEY_OK, "1"); } catch { /* ignore */ } setDone(true); setTimeout(() => onClose(), 1800); }
  }
  const inApp = isInApp();
  return (
    <div className="ia-wrap" role="dialog" aria-modal="true" aria-label="Pune Lyra pe ecran">
      <div className="ia-veil" onClick={() => close()} />
      <div className="ia-sheet">
        <button className="x-btn ia-x" onClick={() => close()} aria-label="Închide">×</button>
        {done ? <div className="ia-done"><img src="/icons/icon-192.png" alt="" /><b>Gata! Lyra e pe ecranul tău 🎉</b><span>O găsești printre aplicații, cu logo-ul Lyra.</span></div> : <>
          <div className="ia-top">
            <div className="ia-home" aria-hidden="true">
              <i /><i /><span className="ia-app"><img src="/icons/icon-192.png" alt="" /><small>Lyra Delivery</small></span><i /><i />
            </div>
            <div className="ia-txt">
              <b>{hasAccount ? "Ți-ai făcut cont? Pune Lyra pe ecran" : "Pune Lyra pe ecranul telefonului"}</b>
              <span>Mai rapid, mai aproape de comenzi: o atingere și comanzi, fără să cauți linkul.</span>
            </div>
          </div>
          {inApp ? <p className="ia-note">Ești în browserul din Facebook / Instagram. Apasă <b>⋯</b> sus și alege <b>„Deschide în browser”</b>, apoi pune Lyra pe ecran de acolo.</p>
            : ios || steps ? <ol className="ia-steps">
                {ios ? <>
                  <li><span className="ia-n">1</span>Apasă <em className="ia-ic"><Share /></em> {isIOSNotSafari() ? "sus, lângă adresă" : "jos, în Safari"}</li>
                  <li><span className="ia-n">2</span><em className="ia-ic"><PlusBox /></em> <b>„Adaugă pe ecranul principal”</b></li>
                </> : <>
                  <li><span className="ia-n">1</span>Apasă <em className="ia-ic"><Dots /></em> <b>meniul</b> browserului (sus, în dreapta)</li>
                  <li><span className="ia-n">2</span>Alege <b>„Adaugă pe ecranul de pornire”</b> sau <b>„Instalează aplicația”</b></li>
                </>}
              </ol>
            : <button className="cta ia-cta" onClick={install}><PlusBox />Adaugă pe ecran</button>}
          {ios && !inApp && !isIOSNotSafari() && <div className="ia-arrow" aria-hidden="true">↓</div>}
          {!native && !ios && !steps && !inApp && null}
          <button className="ia-later" onClick={() => close()}>Nu acum</button>
        </>}
      </div>
    </div>
  );
}

/** Deschisă de pe ecran (aplicația instalată): o singură dată, întreabă dacă vrea oferte prin notificări. */
export function OffersAsk() {
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let asked = false; try { asked = !!localStorage.getItem("lyra-offers-ask"); } catch { /* ignore */ }
    if (asked || !isStandalone() || !("Notification" in window) || Notification.permission !== "default") return;
    let alive = true;
    const t = setTimeout(() => import("../lib/notify").then(n => n.publicKey()).then(k => { if (alive && k) setShow(true); }), 3000);
    return () => { alive = false; clearTimeout(t); };
  }, []);
  if (!show) return null;
  const done = () => { try { localStorage.setItem("lyra-offers-ask", String(Date.now())); } catch { /* ignore */ } setShow(false); };
  async function yes() {
    const err = await (await import("../lib/notify")).enableOffers();
    if (err) setMsg(err); else done();
  }
  return (
    <div className="offers-ask" role="dialog" aria-label="Oferte prin notificări">
      <img src="/icons/icon-192.png" alt="" />
      <div><b>Vrei să afli primul de oferte?</b><span>Îți trimitem notificări doar cu ofertele Lyra. Le poți opri oricând din cont.</span>
        {msg && <span className="err">{msg}</span>}
        <div className="oa-btns"><button className="cta" onClick={yes}>Da, vreau</button><button className="ia-later" onClick={done}>Nu, mulțumesc</button></div>
      </div>
    </div>
  );
}
