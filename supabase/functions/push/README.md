# Notificări pe telefon (Web Push) — configurare o singură dată

Fără acești pași site-ul funcționează normal. Notificările apar doar cât pagina comenzii sau recepția sunt deschise.

1. **Cheile VAPID** (pe calculator, o singură dată):
   `npx web-push generate-vapid-keys`
   Rezultă o cheie publică și una privată. Cea privată nu se pune niciodată în site sau în git.

2. **Secretele funcției** (Supabase → Edge Functions → Secrets, sau din terminal):
   ```
   supabase secrets set VAPID_PUBLIC_KEY=<publică> VAPID_PRIVATE_KEY=<privată> VAPID_SUBJECT=mailto:comenzi@lyrasdelivery.ro PUSH_SECRET=<un șir lung, aleator>
   ```

3. **Publicarea funcției** (din folderul repo-ului):
   `supabase functions deploy push --no-verify-jwt`

4. **În baza de date** (Supabase → SQL Editor):
   ```sql
   select vault.create_secret('https://<proiect>.supabase.co/functions/v1/push', 'push_url');
   select vault.create_secret('<același PUSH_SECRET de la pasul 2>', 'push_secret');
   update public.settings set push_public_key = '<cheia VAPID publică>' where id = 1;
   ```

Gata. Pe pagina comenzii clientul vede „Anunță-mă pe telefon”. La recepție apare butonul „Notificări”.
Pe iPhone notificările merg doar după „Adaugă pe ecranul principal” (iOS 16.4 sau mai nou). Site-ul arată pașii.
