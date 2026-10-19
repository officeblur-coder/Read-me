# Meniu Tacos animat – ecran restaurant

Deschide `index.html` în browser (Chrome recomandat) pe ecranul din restaurant.

- Format vertical 1080×1920 (9:16), se scalează automat pe orice ecran.
- Click sau orice tastă → fullscreen. Cursorul este ascuns.
- Intro-ul complet se reia automat la fiecare 60 de secunde (`LOOP_MS` în script).
- Prețurile se schimbă direct în HTML (`data-v="30"` + textul din `.num`).
- Pozele sunt în `assets/` (PNG cu fundal transparent).
- Fonturile se încarcă de pe Google Fonts (e nevoie de internet; fără internet se folosesc fonturi de rezervă).

---

# Lyra — meniu digital (`lyra/`)

Meniul online pentru QR: deschide `lyra/index.html`. Conținutul urmează meniul final din octombrie 2026.

- **Limba la intrare:** Română · English · Magyar; butonul RO/EN/HU din colț schimbă limba oricând.
- **Navigare:** bară de categorii sus, butonul „Categorii” jos (grilă cu poze), căutare, scurtături „Ce poftă aveți azi?”.
- **Poze mari** pe fiecare preparat (mărite cu super-resolution din pozele PDF-ului), galerie full-screen la fiecare categorie.
- **Lista mea:** clientul adaugă preparate cu „+”, vede totalul și o arată ospătarului (nu trimite comanda).

## Ce modifici și unde

| Vrei să schimbi | Fișier |
| --- | --- |
| prețuri, denumiri, descrieri, gramaje | `lyra/data.js` → `LYRA_ITEMS` (câmpul `p` = preț) |
| ordinea / numele categoriilor | `lyra/data.js` → `LYRA_CATS` |
| vinul recomandat lângă un preparat | câmpul `wine` al preparatului |
| poze | `lyra/img/<id>.webp` (mare) + `lyra/img/t/<id>.webp` (miniatură) |

## Publicare pentru QR

Fișierele sunt statice — orice hosting merge. Cu GitHub Pages: *Settings → Pages → Deploy from branch* și apoi QR-ul către `https://<utilizator>.github.io/<repo>/lyra/`.

Alergenii nu sunt marcați pe fiecare preparat; pagina îi trimite pe clienți să întrebe personalul (Reg. UE 1169/2011).
