# KitzAlpen – SEO & migrare pe kitzalpen.at

Stare: noiembrie 2026. Previzualizarea folosește rute cu `#` (de ex. `#ski`), are `noindex` și nu este indexată.
La mutarea pe **kitzalpen.at** paginile primesc adrese reale, iar pașii de mai jos se fac în această ordine.

## 1. Adrese noi (o adresă reală pentru fiecare pagină și limbă)

Germana rămâne la rădăcină, fără prefix. Celelalte limbi primesc prefix: `/en/`, `/nl/`, `/ro/`, `/hu/`, `/cs/`, `/pl/`, `/sv/`.

| Previzualizare | DE (rădăcină) | EN (exemplu) |
|---|---|---|
| `#` (acasă) | `/` | `/en/` |
| `#pension` | `/pension/` | `/en/pension/` |
| `#all-rooms` | `/zimmer/` | `/en/rooms/` |
| `#room-double` · `-triple` · `-family` · `-quad` | `/rooms/double/` … (ca acum) | `/en/rooms/double/` … |
| `#chalet` | `/chalet/` | `/en/chalet/` |
| `#restaurant` | `/restaurant/` | `/en/restaurant/` |
| `#groups` | `/group-activities/` (ca acum) | `/en/group-activities/` |
| `#contact` | `/kontakt/` | `/en/contact/` |
| `#mountain` | `/bergerlebnis/` | `/en/mountain/` |
| `#activities-winter` / `-summer` | `/activities/winter/` · `/activities/summer/` | `/en/activities/…` |
| `#explore` | `/entdecken/` | `/en/explore/` |
| `#experiences` | `/entdecken/top-15/` | `/en/explore/top-15/` |
| `#ski` | `/entdecken/skigebiete/` | `/en/explore/ski-areas/` |
| `#tours` | `/entdecken/touren/` | `/en/explore/tours/` |
| `#places` | `/entdecken/orte/` | `/en/explore/places/` |
| `#arrival` | `/anreise/` | `/en/arrival/` |

## 2. Redirecționări 301
- Fiecare adresă actuală de pe kitzalpen.at care își schimbă numele primește un 301 spre noua adresă din tabel. Pagina veche de grupuri `/en/group-activities/` și paginile de cameră `/rooms/<slug>/` își păstrează adresa, deci nu au nevoie de 301.
- `kitzbuhelalpenpension.at` → 301 spre `https://www.kitzalpen.at/`, cu excepția `/virtualtour/`, care se mută pe același domeniu (`/virtualtour/`).
- Înainte de mutare: export complet al adreselor vechi din Google Search Console (Pagini → Indexate). Fiecare adresă primește un 301 spre pagina nouă cea mai apropiată, nu spre prima pagină.

## 3. Ce se schimbă în cod la lansare
1. **Ruter cu adrese reale** în locul celui cu `#`: aceleași componente, alt mecanism de navigare.
2. **Pre-randare**: fiecare pagină și limbă devine un HTML static (de ex. cu `vite-ssg` sau un script Playwright care salvează fiecare rută). Astfel Google vede textul complet, titlul și descrierea fără JavaScript.
3. **Fără `noindex`**: se scoate `<meta name="robots" content="noindex, nofollow">` din `index.html`.
4. **hreflang** pe fiecare pagină, pentru toate cele 8 limbi plus `x-default` (germana):
   `<link rel="alternate" hreflang="ro" href="https://www.kitzalpen.at/ro/pension/">`
5. **canonical** pe fiecare pagină, spre propria adresă.
6. **og:image** cu adresă absolută (de ex. `https://www.kitzalpen.at/images/hero/winter-d-1672.webp`) și `og:url`.
7. **sitemap.xml**: toate paginile în toate limbile, cu `xhtml:link` hreflang. **robots.txt**: `Sitemap: https://www.kitzalpen.at/sitemap.xml`.
8. **Date structurate**: `LodgingBusiness` e deja în `index.html` (nume, adresă, telefon, email, coordonate, chalet pentru 4 persoane, WLAN, parcare, restaurant). La lansare se adaugă `image`, iar `priceRange` și `aggregateRating` doar cu valori reale.

## 4. Deja pregătit în previzualizare
- Titlu și descriere unice pentru fiecare pagină, în DE/EN și traduse în celelalte 6 limbi (`src/content/seo.ts`).
- Etichete Open Graph (`og:title`, `og:description`, `og:locale`) care se actualizează la fiecare pagină.
- `html lang` corect pentru fiecare limbă.
- Accesibilitate: contrast ≥ 4,5:1 la textele mici, linkurile duplicate din bara care rulează ascunse corect, titluri animate citite întregi de cititoarele de ecran.

## 5. După lansare (GEO / AEO)
- Google Search Console: proprietate nouă, se trimite sitemap-ul, se urmăresc erorile 404 timp de 4 săptămâni.
- Google Business Profile: aceeași adresă, telefon și site ca în datele structurate (NAP identic).
- Bing Webmaster Tools: import din Search Console.
- Paginile „Top 15”, „Touren”, „Orte” și „Anreise” răspund deja la întrebări concrete (distanțe, sezoane, skipass-uri, transport gratuit). Asta ajută și motoarele de răspuns AI (AEO). Datele trebuie actualizate o dată pe sezon (`verifiedAt`).
