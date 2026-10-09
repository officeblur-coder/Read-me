import { useEffect } from "react";
import { Link } from "react-router-dom";
import { COMPANY } from "../lib/company";
import SiteFooter from "../components/SiteFooter";

const UPDATED = "9 octombrie 2026";
const contact = [COMPANY.email && `email ${COMPANY.email}`, COMPANY.phone && `telefon ${COMPANY.phone}`].filter(Boolean).join(" sau ")
  || "datele de contact din subsolul site-ului";

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  useEffect(() => { document.title = `${title} · Lyra`; window.scrollTo(0, 0); }, [title]);
  return (
    <div className="legal">
      <header className="acc-top"><Link to="/"><img src="/img/logo-lyra.jpg" alt="Lyra" /></Link><b>{COMPANY.brand}</b><Link className="mini" to="/">Înapoi la meniu</Link></header>
      <article className="legal-doc">
        <h1>{title}</h1>
        <p className="muted">Ultima actualizare: {UPDATED}</p>
        {children}
      </article>
      <SiteFooter />
    </div>
  );
}

export function Privacy() {
  return (
    <Page title="Politica de confidențialitate">
      <p>Această politică explică ce date personale colectăm când comanzi pe acest site sau îți faci cont Lyra Club, de ce le folosim și ce drepturi ai, conform Regulamentului (UE) 2016/679 (GDPR).</p>

      <h2>1. Cine suntem</h2>
      <p>Operatorul datelor este <b>{COMPANY.name}</b>, CUI {COMPANY.cui}, Nr. Reg. Com. {COMPANY.regCom}, cu sediul în {COMPANY.address}, care operează {COMPANY.brand}. Ne poți contacta pentru orice întrebare legată de date prin {contact}.</p>

      <h2>2. Ce date colectăm</h2>
      <ul>
        <li><b>Date de comandă:</b> nume, telefon, adresa de livrare, produsele comandate, mențiunile tale, metoda de plată, data și ora.</li>
        <li><b>Email (opțional):</b> dacă îl introduci la comandă sau îți faci cont, ca să primești punctele Lyra Club și emailul de mulțumire.</li>
        <li><b>Cont Lyra Club:</b> email, nume, telefon, adrese salvate, puncte, nivel, istoricul comenzilor.</li>
        <li><b>Alergii (opțional):</b> doar dacă le bifezi tu, ca bucătăria să vadă o alertă pe bon. Sunt date despre sănătate, le folosim exclusiv în acest scop și le poți șterge oricând din cont.</li>
        <li><b>Evaluarea comenzii:</b> nota cu stele, dacă o dai.</li>
      </ul>
      <p>Nu colectăm date de card. Plata se face la livrare.</p>

      <h2>3. De ce le folosim și pe ce temei</h2>
      <ul>
        <li><b>Preluarea și livrarea comenzii</b> (executarea contractului): pregătirea comenzii, livrarea, contactarea ta dacă e nevoie, urmărirea comenzii.</li>
        <li><b>Lyra Club</b> (executarea contractului): acordarea și folosirea punctelor, nivelurile, cadourile.</li>
        <li><b>Obligații legale</b>: evidențe contabile și fiscale.</li>
        <li><b>Emailuri despre comandă</b> (interes legitim): confirmarea și mulțumirea după livrare, cu punctele câștigate.</li>
        <li><b>Oferte și noutăți</b> (consimțământ): doar dacă bifezi că vrei să le primești. Te poți dezabona oricând, din linkul din fiecare email sau din contul tău.</li>
        <li><b>Alergii</b> (consimțământul tău explicit): doar pentru alerta pe bonul din bucătărie.</li>
      </ul>

      <h2>4. Cine are acces la date</h2>
      <ul>
        <li>Echipa Lyra: recepția și bucătăria (comanda) și curierii (nume, telefon, adresă, sumă de încasat).</li>
        <li>Furnizori care ne ajută să funcționăm, cu contracte de prelucrare a datelor: Supabase (baza de date, servere în Uniunea Europeană, Frankfurt), Netlify (găzduirea site-ului), Resend (trimiterea emailurilor).</li>
        <li>Autorități, doar când legea ne obligă.</li>
      </ul>
      <p>Nu vindem și nu închiriem datele tale.</p>

      <h2>5. Cât timp le păstrăm</h2>
      <ul>
        <li>Comenzile: cât cer legile contabile și fiscale (de regulă 5 ani pentru documentele financiar-contabile).</li>
        <li>Contul Lyra Club: până îl ștergi sau ne ceri ștergerea. Conturile inactive de peste 3 ani le putem șterge.</li>
        <li>Acordul pentru oferte: până îl retragi.</li>
      </ul>

      <h2>6. Drepturile tale</h2>
      <p>Ai dreptul să ceri accesul la date, rectificarea, ștergerea, restricționarea prelucrării, portabilitatea și să te opui prelucrării. Poți retrage oricând consimțământul, fără să afecteze ce s-a făcut înainte. Scrie-ne prin {contact} și răspundem în cel mult 30 de zile.</p>
      <p>Dacă ești nemulțumit, poți depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), <a href="https://www.dataprotection.ro" target="_blank" rel="noreferrer">www.dataprotection.ro</a>.</p>

      <h2>7. Cookie-uri și stocare locală</h2>
      <p>Nu folosim cookie-uri de publicitate sau de urmărire. Folosim doar stocarea locală a browserului, strict necesară pentru funcționare: coșul de cumpărături, datele de livrare completate, logarea în cont, limba și tema aleasă.</p>

      <h2>8. Securitate</h2>
      <p>Conexiunea la site este criptată (HTTPS). Accesul la date este limitat pe roluri: clienții își văd doar comenzile proprii, curierii doar livrările, iar administrarea e protejată cu parolă.</p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Termeni și condiții">
      <p>Acești termeni se aplică comenzilor plasate pe acest site. Prin trimiterea unei comenzi confirmi că i-ai citit și ești de acord cu ei.</p>

      <h2>1. Vânzătorul</h2>
      <p><b>{COMPANY.name}</b>, CUI {COMPANY.cui}, Nr. Reg. Com. {COMPANY.regCom}, EUID {COMPANY.euid}, sediu: {COMPANY.address}, care operează {COMPANY.brand}. Contact: {contact}.</p>

      <h2>2. Comanda</h2>
      <ul>
        <li>Comanda se consideră încheiată după ce restaurantul o <b>acceptă</b>. Primești confirmarea și ora estimată pe pagina comenzii.</li>
        <li>Restaurantul poate refuza o comandă (de exemplu produs epuizat, adresă în afara zonei de livrare, capacitate depășită). În acest caz nu datorezi nicio sumă.</li>
        <li>Timpul de livrare este estimativ și poate varia în funcție de trafic, vreme și volumul de comenzi. Te anunțăm pe pagina comenzii dacă apar întârzieri.</li>
      </ul>

      <h2>3. Prețuri și plată</h2>
      <ul>
        <li>Prețurile sunt în lei și includ TVA. Taxa de livrare, dacă există, este afișată în coș înainte de trimiterea comenzii.</li>
        <li>Plata se face la livrare sau la ridicare, numerar sau cu cardul.</li>
        <li>Reducerile din coduri promoționale și din punctele Lyra Club nu se cumulează peste limitele afișate în coș și nu se pot transforma în bani.</li>
      </ul>

      <h2>4. Dreptul de retragere</h2>
      <p>Conform OUG 34/2014 (art. 16), dreptul de retragere de 14 zile <b>nu se aplică</b> produselor alimentare preparate la comandă, care se pot deteriora rapid. Poți anula o comandă gratuit până când restaurantul o acceptă. După acceptare, te rugăm să ne contactezi telefonic.</p>

      <h2>5. Probleme cu comanda</h2>
      <p>Dacă lipsește ceva sau un produs nu e în regulă, anunță-ne cât mai repede, ideal în aceeași zi, prin {contact}. Rezolvăm prin înlocuire, reducere sau rambursare, după caz.</p>

      <h2>6. Alergeni</h2>
      <p>Alergenii fiecărui preparat sunt afișați pe site. Bucătăria noastră lucrează cu toți alergenii majori, așa că nu putem garanta absența urmelor. Dacă ai o alergie severă, scrie-o în mențiuni sau sună-ne înainte de a comanda.</p>

      <h2>7. Lyra Club</h2>
      <ul>
        <li>Primești puncte pentru comenzile <b>livrate sau ridicate</b>: 1 punct pentru fiecare leu plătit, plus bonus după nivel (Argint +5%, Aur +10%).</li>
        <li>100 de puncte valorează 10 lei reducere și pot acoperi cel mult 50% dintr-o comandă. Punctele nu au valoare în bani și nu se pot transfera.</li>
        <li>La fiecare a 6-a comandă finalizată primești un desert din partea casei la comanda următoare.</li>
        <li>Punctele câștigate cu emailul, fără cont, se transferă în cont când îl creezi cu același email.</li>
        <li>Putem modifica regulile programului cu anunț pe site. Punctele deja câștigate rămân valabile.</li>
      </ul>

      <h2>8. Soluționarea litigiilor</h2>
      <p>Pentru orice nemulțumire, contactează-ne întâi pe noi. Poți apela și la Autoritatea Națională pentru Protecția Consumatorilor (<a href="https://anpc.ro" target="_blank" rel="noreferrer">anpc.ro</a>) sau la procedura de soluționare alternativă a litigiilor (<a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noreferrer">SAL</a>).</p>

      <h2>9. Date personale</h2>
      <p>Modul în care folosim datele tale este descris în <Link to="/confidentialitate">Politica de confidențialitate</Link>.</p>
    </Page>
  );
}
