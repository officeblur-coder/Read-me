# KitzAlpen – publicare pe cyber_Folks (cPanel, Apache)

Site-ul este static (HTML, CSS, JS, imagini, fonturi). Pe server nu e nevoie de Node.js, PHP sau bază de date.

## Build
- Producție (rădăcina domeniului, indexabil): `npm run build`, iar rezultatul e în `dist/`.
- Previzualizare (orice subfolder, `noindex`): `npm run build:preview`.

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

## `.htaccess` (inclus)
- Navigarea între pagini nu cere reguli: toate paginile sunt pe `/`, cu `#` (de ex. `/#chalet`).
- Redirecționează HTTP la HTTPS și `kitzalpen.at` la `www.kitzalpen.at`.
- 301 de la adresele vechi la pagina nouă. De exemplu, `/en/chalet/` duce la `/?lang=en#chalet`.
- Cache: un an pentru `assets/`, care au nume cu hash; o lună pentru imagini; `index.html` e reverificat mereu.
- Adresele necunoscute arată site-ul, cu statusul 404.
