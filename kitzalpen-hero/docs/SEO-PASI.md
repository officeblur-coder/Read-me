# KitzAlpen – SEO, GEO, AEO: ce e făcut și ce urmează

## Făcut pe site (noiembrie 2026)
- 168 de pagini cu adresă proprie: 21 de pagini × 8 limbi, salvate ca HTML complet.
- Fiecare pagină are titlu, descriere, `canonical`, `hreflang` (8 limbi + `x-default`), `og:image` și o singură etichetă H1.
- `sitemap.xml` cu toate adresele și legăturile între limbi; `robots.txt`; redirecționări 301 de la adresele vechi.
- Date structurate (schema.org):
  - **Pensiunea:** nume, adresă, telefon, coordonate, 17 camere, dotări, hartă, Facebook, rezervare.
  - **Fiecare pagină:** WebPage și calea paginii (breadcrumbs).
  - **Camere:** tipul camerei, capacitate, m².
  - **Cabana:** 4 persoane, 2 dormitoare.
  - **Restaurant:** orele pentru mic dejun și cină.
  - **Întrebări frecvente:** 16 întrebări cu răspunsuri.
  - **Ghiduri:** Top 15 (atracții), Skigebiete (domenii schiabile), Orte (localități), Touren (trasee).
- Pagina **Întrebări frecvente** (`/faq/`, `/en/faq/` …), cu răspunsuri directe pentru Google și pentru asistenții AI.
- `llms.txt`: rezumat factual pentru ChatGPT, Perplexity, Gemini.

## Pașii tăi, în ordine
1. **Urcă ultima arhivă** în `kitzalpen.at` (Extract cu suprascriere) și urcă meniul la `menu/kitzalpen-menu.pdf`.
2. **Google Search Console:** search.google.com/search-console.
   - Alegi tipul „Domeniu”, scrii `kitzalpen.at`, copiezi rândul TXT.
   - În cPanel → Zone Editor → kitzalpen.at → Add Record → TXT: lipești rândul și apeși Verify.
   - Din meniul Sitemaps trimiți `https://www.kitzalpen.at/sitemap.xml`.
   - Cu Inspectare URL ceri indexarea pentru `/`, `/en/`, `/chalet/`, `/faq/`.
3. **Bing Webmaster Tools:** bing.com/webmasters → „Import from Google Search Console”. ChatGPT și Copilot caută prin Bing.
4. **Google Business Profile:** business.google.com.
   - Categoria „Pension” sau „Gästehaus”.
   - Site: `https://www.kitzalpen.at`. Nume, adresă și telefon identice cu site-ul.
   - Poze reale (casa vara și iarna, camere, restaurant), programul restaurantului, linkul de rezervare.
5. **Recenzii:** cere-le oaspeților la plecare, de exemplu cu un cod QR la recepție spre recenzia Google. Răspunde la fiecare recenzie.
6. **Aceleași date peste tot:** Booking, TripAdvisor, Facebook, hollersbach.at, mittersill.info, salzburgerland.com. Același nume, adresă, telefon și site.
7. **Verificare Google:** search.google.com/test/rich-results, apoi testezi `https://www.kitzalpen.at/rooms/family/` și `/faq/`.

## Lunar / pe sezon
- În Search Console: Pagini (erori 404) și Performanță (căutări, clicuri). Adresele vechi care dau 404 primesc o regulă 301 în `.htaccess`.
- **Pe la 15 aprilie și 1 noiembrie:** o versiune nouă a site-ului, ca Google să vadă textele sezonului. Atunci se verifică și datele de sezon (pârtii, program).

## De la tine, ca să completez site-ul (doar fapte sigure)
- Orele de check-in și check-out; dacă se acceptă animale.
- Linkul de Instagram și profilul Google (după ce e creat).
- Prețul orientativ, dacă vrei să-l afișezi.
- Alte întrebări pe care le pun des oaspeții.
