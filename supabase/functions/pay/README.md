# Plata online cu cardul (Stripe) — configurare o singură dată

Până la ultimul pas, opțiunea „Card online” nu apare pe site. Lucrezi întâi cu cheile de **test**, apoi treci pe cele **live**.

## 1. Cheia secretă Stripe
Stripe → Developers → API keys → **Secret key** (`sk_test_…` pentru probă, `sk_live_…` pentru bani reali).

## 2. Funcțiile în Supabase (fără terminal)
Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**, de două ori:
- nume **`pay`**, conținut: tot fișierul `supabase/functions/pay/index.ts`
- nume **`stripe-webhook`**, conținut: tot fișierul `supabase/functions/stripe-webhook/index.ts`

La amândouă: după publicare → **Details** → **Verify JWT** = **oprit** (Stripe și site-ul nu trimit un JWT).

## 3. Webhook în Stripe
Stripe → Developers → **Webhooks** → **Add endpoint**:
- URL: `https://mowvnabteszjkavdidgb.supabase.co/functions/v1/stripe-webhook`
- evenimente: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`
- după salvare, copiezi **Signing secret** (`whsec_…`)

## 4. Secretele funcțiilor
Supabase → Edge Functions → **Secrets** → Add:
- `STRIPE_SECRET_KEY` = cheia de la pasul 1
- `STRIPE_WEBHOOK_SECRET` = `whsec_…` de la pasul 3
- `PUSH_SECRET` = un text lung inventat de tine (dacă există deja de la notificări, îl păstrezi pe același)

## 5. În baza de date (SQL Editor)
```sql
select vault.create_secret('https://mowvnabteszjkavdidgb.supabase.co/functions/v1/pay', 'pay_url');
select vault.create_secret('<același PUSH_SECRET de la pasul 4>', 'push_secret');   -- sari peste dacă există deja
```

## 6. Pornești plata
Admin → **Program** → „Plata online cu cardul” → pornit → **Salvează**.

Cum funcționează:
- Clientul alege „Card online” și e dus pe pagina de plată Stripe (card, Apple Pay, Google Pay). Comanda ajunge la recepție doar după plată.
- Plata neterminată în 30 de minute anulează comanda, iar punctele și bonusul revin clientului.
- Comanda plătită și apoi refuzată sau anulată (inclusiv când clientul nu acceptă timpul propus) se rambursează automat pe card.
- „Card la livrare (POS la livrator)” și „Numerar” rămân ca înainte.
