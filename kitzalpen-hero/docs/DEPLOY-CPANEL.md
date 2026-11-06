# KitzAlpen – publicare pe cyber_Folks (cPanel, Apache)

Site-ul este static (HTML, CSS, JS, imagini, fonturi). Pe server nu e nevoie de Node.js, PHP sau bază de date.

## Build
- **Producție** (rădăcina domeniului, indexabil): `npm run build`. Rezultatul e în `dist/`.
  - Compilează site-ul și salvează fiecare pagină, în toate cele 8 limbi, ca HTML static: 160 de pagini, de exemplu `dist/en/chalet/index.html`.
  - Scrie `sitemap.xml`, cu toate adresele și legăturile `hreflang` între limbi, și `404.html`.
  - Pre-randarea cere Playwright cu Chromium.
- **Previzualizare** (orice subfolder, `noindex`, navigare cu `#`): `npm run build:preview`.
- **Sezon.** Paginile salvate arată sezonul din ziua build-ului; vizitatorii văd oricum sezonul curent. Refă build-ul și reîncarcă la schimbarea sezonului (mijlocul lui aprilie și noiembrie), ca Google să vadă textele sezonului.

## Încărcare
1. cPanel, File Manager, `public_html`. Din Settings bifează „Show Hidden Files”, ca să vezi `.htaccess`.
2. Fă backup la site-ul vechi (Compress, apoi Download).
3. Șterge paginile vechi. Păstrează doar:
   - `tour/`
   - `virtualtour/`
   - `menu/` (meniul PDF e folosit de site)
   - `.well-known/`
   - `cgi-bin/`
4. Urcă **conținutul** folderului `dist/` (sau arhiva `kitzalpen-public_html.zip`, apoi Extract) direct în `public_html`. Urcă fișierele din folder, nu folderul în sine.
5. SSL/TLS Status: certificatul AutoSSL trebuie să fie activ pentru `kitzalpen.at` și `www.kitzalpen.at`.

## Adrese
- Germana e la rădăcină: `/`, `/pension/`, `/zimmer/`, `/rooms/double/`, `/chalet/`, `/restaurant/`, `/group-activities/`, `/kontakt/`, `/bergerlebnis/`, `/activities/winter/`, `/entdecken/`, `/entdecken/top-15/`, `/entdecken/skigebiete/`, `/entdecken/touren/`, `/entdecken/orte/`, `/anreise/`.
- Celelalte limbi au prefix și adresele englezești, de exemplu `/en/rooms/`, `/ro/explore/ski-areas/`, `/nl/contact/`.
- Fiecare pagină are titlu, descriere, `canonical` și `hreflang` proprii. Linkurile vechi cu `#` (`/#chalet`) duc automat la adresa nouă.

## `.htaccess` (inclus)
- Paginile sunt fișiere reale, deci Apache le servește direct. Nu e nevoie de reguli pentru navigare.
- Redirecționează HTTP la HTTPS și `kitzalpen.at` la `www.kitzalpen.at`.
- 301 de la adresele vechi care și-au schimbat numele: `/rooms/` → `/zimmer/`, `/contact/` → `/kontakt/`, `/activities/` → `/entdecken/`, `/ski/` → `/entdecken/skigebiete/`, `/de/...` → `/...`. Adaugă `/` la final (`/chalet` → `/chalet/`).
- Cache: un an pentru `assets/`, care au nume cu hash; o lună pentru imagini; `index.html` e reverificat mereu.
- Adresele necunoscute arată pagina `404.html`, cu statusul 404 și fără indexare.

## După încărcare (Google)
1. Google Search Console: adaugă proprietatea `https://www.kitzalpen.at`, apoi trimite `https://www.kitzalpen.at/sitemap.xml` din Sitemaps.
2. Inspectare URL pe câteva pagini (de ex. `/en/chalet/`), apoi „Solicită indexarea”.
3. În primele 4 săptămâni, urmărește Pagini → „Negăsită (404)”. O adresă veche care apare acolo primește o regulă 301 în `.htaccess`.
4. Google Business Profile: același nume, adresă, telefon și site ca pe pagină.
