# Meniu Tacos animat – ecran restaurant

Deschide `index.html` în browser (Chrome recomandat) pe ecranul din restaurant.

- Format vertical 1080×1920 (9:16), se scalează automat pe orice ecran.
- Click sau orice tastă → fullscreen. Cursorul este ascuns.
- Intro-ul complet se reia automat la fiecare 60 de secunde (`LOOP_MS` în script).
- Prețurile se schimbă direct în HTML (`data-v="30"` + textul din `.num`).
- Pozele sunt în `assets/` (PNG cu fundal transparent).
- Fonturile se încarcă de pe Google Fonts (e nevoie de internet; fără internet se folosesc fonturi de rezervă).

---

# Lyra — meniu digital premium cu Ospătarul Lyra (`lyra/`)

Meniul online pentru QR: deschide `lyra/index.html`.

- **Limba la intrare:** Română · English · Magyar (tot meniul și ospătarul se traduc; butonul RO/EN/HU din colț schimbă limba oricând).
- **Ospătarul Lyra:** întâmpină clientul, întreabă de ciorbă → felul doi (vită, porc, pui, pește, burger, smoker, ardelenesc, vegetarian, platouri, copii) → desert → băuturi, recomandă vinul potrivit și **duce direct la categorie**. Înțelege și text liber (ex. „ceva picant și vin roșu”, „halat kérek”, „something for the kids”), plus dictare vocală și citire cu voce (buton difuzor) unde browserul permite.
- **Poze mari** pe fiecare preparat, galerie full-screen tip „reels” (butonul *Privește* / *Galerie foto*), categorii în bară + grilă cu poze, căutare, „Lista mea” cu total și ecran „Arată ospătarului” (lista nu trimite comanda).

## Ce modifici și unde

| Vrei să schimbi | Fișier |
| --- | --- |
| prețuri, denumiri, descrieri, gramaje | `lyra/data.js` → `LYRA_ITEMS` (câmpul `p` = preț) |
| ce recomandă Lyra (pentru fiecare întrebare) | `lyra/data.js` → `LYRA_WAITER` (liste de `id`-uri, în ordinea preferinței) |
| vinul recomandat lângă un preparat | câmpul `wine` al preparatului |
| ordinea / numele categoriilor | `lyra/data.js` → `LYRA_CATS` |
| poze | `lyra/img/<id>.webp` (mare) + `lyra/img/t/<id>.webp` (miniatură) |

## Publicare pentru QR

Fișierele sunt statice — orice hosting merge. Cu GitHub Pages: *Settings → Pages → Deploy from branch* și apoi QR-ul către `https://<utilizator>.github.io/<repo>/lyra/`.

Informațiile despre alergeni nu sunt marcate pe fiecare preparat; pagina îi trimite pe clienți să întrebe personalul (ca în meniul tipărit, Reg. UE 1169/2011).
