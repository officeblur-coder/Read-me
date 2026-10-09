import { Link } from "react-router-dom";
import { COMPANY } from "../lib/company";

export default function SiteFooter() {
  return (
    <footer className="sfoot">
      <div className="sf-brand"><img src="/img/logo-lyra.jpg" alt="Lyra" /><p>Lyra · Pensiune Restaurant · Tradiții din 1999</p></div>
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
      <p className="sf-copy">© {new Date().getFullYear()} {COMPANY.name}. Prețurile includ TVA.</p>
    </footer>
  );
}
