# Notificări cu oferte pe telefon — configurare o singură dată

Fără acești pași, butonul „Vreau oferte prin notificări” nu apare pe site, iar în admin vezi un avertisment.

1. **Cheile VAPID** (pe un calculator cu Node.js, o singură dată):
   `npx web-push generate-vapid-keys`
   Rezultă o cheie *Public Key* și una *Private Key*. Cheia privată nu se pune niciodată în site sau în git.

2. **Funcția `push`** (Supabase → Edge Functions → Deploy a new function → Via Editor):
   - nume: `push`
   - conținut: tot fișierul `supabase/functions/push/index.ts`
   - după creare: Details → dezactivează **Verify JWT** (sau din terminal: `supabase functions deploy push --no-verify-jwt`)

3. **Secretele funcției** (Supabase → Edge Functions → Secrets → Add):
   - `VAPID_PUBLIC_KEY` = cheia publică
   - `VAPID_PRIVATE_KEY` = cheia privată
   - `VAPID_SUBJECT` = `mailto:comenzi@lyrasdelivery.ro`
   - `PUSH_SECRET` = un șir lung inventat de tine (ex. 40 de litere și cifre)

4. **În baza de date** (Supabase → SQL Editor), cu valorile tale:
   ```sql
   select vault.create_secret('https://mowvnabteszjkavdidgb.supabase.co/functions/v1/push', 'push_url');
   select vault.create_secret('<același PUSH_SECRET de la pasul 3>', 'push_secret');
   update public.settings set push_public_key = '<cheia VAPID publică>' where id = 1;
   ```

Gata. În cont apare „Vreau oferte prin notificări pe acest telefon”, iar cine deschide Lyra de pe ecranul telefonului
este întrebat o singură dată dacă vrea oferte. Trimiți din **admin → Email & notificări**: întâi „Trimite-mi un test”, apoi „Trimite tuturor”.
Pe iPhone notificările merg doar pentru Lyra pusă pe ecran (iOS 16.4 sau mai nou).
