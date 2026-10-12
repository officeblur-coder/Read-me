# Lyra – Carduri cadou

Aplicație pentru cardurile cadou de la Pensiune Restaurant Lyra.

- **Recepție (calculator):** scanează cardul, completează datele clientului, alege suma și valabilitatea.
- **Evidență:** toate cardurile, cine le-a încărcat și când, cât a rămas pe ele, când expiră.
  Cu 7 zile înainte de expirare apare o notificare cu numărul de telefon al clientului.
- **Newsletter:** doar clienții care au bifat acordul pentru emailuri de promovare.
- **Ospătar (telefon):** scanează cardul, vede suma și valabilitatea, scade suma consumată.

## Demo

Deschide `index.html` în Chrome. Datele de probă sunt salvate doar în browserul respectiv
(butonul „Repune datele de probă” le resetează). Camera funcționează când pagina e deschisă
de pe `https://` sau `localhost`.

## Pașii pentru varianta reală

1. **Codurile de pe carduri.** Scanați un card cu camera telefonului și notați ce text apare.
   Acela este „codul” cardului. Lista tuturor codurilor se încarcă o singură dată în baza de date,
   ca să nu poată fi folosit un QR străin.
2. **Baza de date (gratuit pentru volumul unui restaurant).** Cont nou pe [supabase.com](https://supabase.com),
   proiect nou în regiunea Frankfurt, apoi în *SQL Editor* se rulează `baza-de-date.sql`.
3. **Conturi pentru angajați.** În Supabase → *Authentication* se creează câte un cont
   pentru fiecare recepționer și ospătar. Așa se vede în evidență cine a încărcat fiecare card.
4. **Legarea aplicației de baza de date.** În `index.html`, funcțiile `load()` / `save()`
   (acum în browser) se înlocuiesc cu apeluri Supabase; scăderea de pe card folosește
   funcția `consuma_card`, care nu permite sold negativ.
5. **Publicarea.** Folderul se urcă gratuit pe Netlify, Vercel sau GitHub Pages
   (de ex. `carduri.lyra.ro`). Pe telefoanele ospătarilor se deschide adresa și se alege
   „Adaugă pe ecranul principal”, ca să arate ca o aplicație.
6. **Recepția.** Merge cu o cameră web sau, mai comod, cu un cititor QR pe USB (~100–150 lei):
   acesta „scrie” codul direct în câmpul de cod.
7. **Emailuri de promovare.** Din fila *Clienți newsletter* se copiază lista și se importă
   în Mailchimp / Brevo. Fiecare email trebuie să aibă link de dezabonare (cerință GDPR).
8. **GDPR.** Pe formular sau la recepție, o notă scurtă despre ce date se păstrează și de ce.
   Acordul de marketing se salvează cu data la care a fost dat.

## Fișiere

- `index.html` – aplicația (recepție, evidență, newsletter, ospătar)
- `baza-de-date.sql` – tabelele pentru Supabase
- `lyra-sign.jpg`, `lyra-logo.jpg` – logo
