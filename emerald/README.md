# Emerald Luxury Events — site nou (static)

Site complet pentru **emeraldluxuryevents.ro**, generat static (HTML + CSS + JS, fără WordPress, fără dependențe).

## Structură
- `index.html` + câte un folder pe pagină (URL-uri curate, **aceleași slug-uri ca site-ul vechi** → nu se pierde SEO-ul existent):
  `sapphire-ballroom/`, `gold-ballroom/`, `diamond-ballroom/`, `salonul-gourmet/`, `terasa-emerald/`, `gradina-emerald/`,
  `emerald-boutique-hotel/`, `servicii-all-inclusive/`, `evenimente-corporate/`, `galeria-foto-video/`, `despre-noi/`
- Pagini noi pentru SEO: `nunti-targu-mures/`, `botez-targu-mures/`, `intrebari-frecvente/`, `contact/`, `404.html`
- `assets/css/style.css`, `assets/js/main.js` — design și interacțiuni
- `img/` — poze optimizate WebP (1600px + 800px), logo transparent, favicon-uri
- `media/` — video hero (desktop + mobil) și poster
- `sitemap.xml` (cu imagini), `robots.txt` (permite boții AI), `llms.txt` + `llms-full.txt` (GEO), `site.webmanifest`, `.htaccess`

## Editare
Tot textul e în `_build/build.py`. După modificare:
```
python3 _build/build.py
```
Pozele noi: adaugă-le în `MAP` din `_build/images.py` și rulează `python3 _build/images.py <folder-cu-originale>`.

## Publicare
Se urcă tot conținutul folderului (fără `_build/`) în rădăcina domeniului.
Formularul trimite cererea pe WhatsApp (0745 998 018) sau pe e-mail; harta Google se încarcă doar la click.
