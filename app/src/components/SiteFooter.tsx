import { Link } from "react-router-dom";
import { COMPANY } from "../lib/company";

const SOCIAL: { k: "facebook" | "instagram" | "tiktok"; label: string; d: string }[] = [
  { k: "facebook", label: "Facebook", d: "M14 8.5V6.8c0-.8.5-1 .9-1H17V2.2h-2.9C11 2.2 10.3 4.5 10.3 6v2.5H8v3.7h2.3V22H14v-9.8h2.7l.4-3.7z" },
  { k: "instagram", label: "Instagram", d: "M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2zM17 5.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 2.5c-2.6 0-2.9 0-3.9.1-3.5.2-5.4 2.1-5.6 5.6-.1 1-.1 1.3-.1 3.8s0 2.9.1 3.9c.2 3.5 2.1 5.4 5.6 5.6 1 .1 1.3.1 3.9.1s2.9 0 3.9-.1c3.5-.2 5.4-2.1 5.6-5.6.1-1 .1-1.3.1-3.9s0-2.8-.1-3.8c-.2-3.5-2.1-5.4-5.6-5.6-1-.1-1.3-.1-3.9-.1zm0 1.7c2.5 0 2.8 0 3.8.1 2.5.1 3.7 1.3 3.8 3.8.1 1 .1 1.3.1 3.8s0 2.8-.1 3.8c-.1 2.5-1.3 3.7-3.8 3.8-1 .1-1.3.1-3.8.1s-2.8 0-3.8-.1c-2.5-.1-3.7-1.3-3.8-3.8-.1-1-.1-1.3-.1-3.8s0-2.8.1-3.8c.1-2.5 1.3-3.7 3.8-3.8 1-.1 1.3-.1 3.8-.1z" },
  { k: "tiktok", label: "TikTok", d: "M16.6 2.5h-3.3v13.2a2.9 2.9 0 1 1-2.1-2.8V9.5a6.2 6.2 0 1 0 5.4 6.2V9.1a7.7 7.7 0 0 0 4.5 1.4V7.2a4.5 4.5 0 0 1-4.5-4.5z" },
];

export default function SiteFooter() {
  return (
    <footer className="sfoot">
      <div className="sf-brand"><img src="/img/logo-lyra.jpg" alt="Lyra" /><p><b className="wm">Lyra's <span>Delivery</span></b><br />by Lyra Pensiune Restaurant · Tradiții din 1999</p></div>
      <div className="sf-cols">
        <div>
          <b>{COMPANY.name}</b>
          <span>CUI {COMPANY.cui} · Reg. Com. {COMPANY.regCom}</span>
          <span>{COMPANY.address}</span>
          {COMPANY.phone && <span>Telefon: {COMPANY.phone}</span>}
          {COMPANY.email && <span>Email: {COMPANY.email}</span>}
        </div>
        <nav aria-label="Informații legale">
          <Link to="/termeni">Termeni și condiții</Link>
          <Link to="/confidentialitate">Politica de confidențialitate</Link>
          <a href="https://anpc.ro/" target="_blank" rel="noreferrer">ANPC</a>
        </nav>
        <a className="sal" href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noreferrer" aria-label="ANPC – Soluționarea alternativă a litigiilor">
          <small>ANPC</small><b>SAL</b><span>Soluționarea alternativă a litigiilor</span>
        </a>
      </div>
      {COMPANY.social && <div className="sf-social" aria-label="Rețele sociale">
        {SOCIAL.map(s => <a key={s.k} href={COMPANY.social![s.k]} target="_blank" rel="noreferrer" aria-label={s.label} title={s.label}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d={s.d} /></svg><span>{s.label}</span></a>)}
      </div>}
      <p className="sf-copy">© {new Date().getFullYear()} {COMPANY.name}. Prețurile includ TVA.</p>
      <a className="sf-blur" href="https://bluradvertising.ro/" target="_blank" rel="noreferrer">
        <img src="/img/blur-advertising.png" alt="blur advertising" width="36" height="36" loading="lazy" />
        <span>Sistem de comenzi online creat de <b>blur advertising</b></span>
      </a>
    </footer>
  );
}
