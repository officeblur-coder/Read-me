# Plata online cu cardul (Stripe) — configurare o singură dată

Până la pasul 5, opțiunea „Card online” nu apare pe site.

1. **Cont Stripe** (stripe.com): firma, contul bancar în lei. Întâi testezi cu cheile de test (`sk_test_…`).
2. **Secretele funcțiilor** (Supabase → Edge Functions → Secrets):
   ```
   supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_... PUSH_SECRET=<același ca la notificări>
   ```
   Dacă notificările nu sunt configurate, alege acum un `PUSH_SECRET` (un șir lung, aleator).
3. **Publicarea funcțiilor**:
   ```
   supabase functions deploy pay --no-verify-jwt
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
4. **Webhook în Stripe** (Developers → Webhooks → Add endpoint):
   - URL: `https://<proiect>.supabase.co/functions/v1/stripe-webhook`
   - evenimente: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`
   - secretul afișat (`whsec_…`) merge la `STRIPE_WEBHOOK_SECRET` (pasul 2)
5. **În baza de date** (SQL Editor):
   ```sql
   select vault.create_secret('https://<proiect>.supabase.co/functions/v1/pay', 'pay_url');
   select vault.create_secret('<același PUSH_SECRET>', 'push_secret');   -- doar dacă nu există deja
   update public.settings set online_pay_on = true where id = 1;
   ```
   Sau din admin: Program & precomenzi → „Plata online cu cardul”.

Cum funcționează:
- Clientul alege „Card online” și e dus pe pagina de plată Stripe. Comanda ajunge la recepție doar după plată.
- Dacă plata nu e terminată în 30 de minute, comanda se anulează singură, iar punctele și bonusul revin clientului.
- Comanda plătită și apoi refuzată sau anulată (inclusiv când clientul nu acceptă timpul) se rambursează automat pe card.
  Fără `pay_url` în Vault, rambursarea se face manual din Stripe.
