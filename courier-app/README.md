# Lyra Livrator — aplicația Android a livratorilor

Aplicația deschide `https://lyrasdelivery.ro/curier` (aceeași pagină ca în browser, deci se actualizează odată cu site-ul)
și adaugă ce un site nu poate face cu ecranul blocat:
- **GPS continuu** (serviciu în prim-plan: în bara de sus apare „Lyra Livrator · tura e pornită”);
- **notificări native cu sunet de alarmă** (Firebase), repetate la un minut până la „Confirm” și la 5 minute după ora promisă.

## Construire
GitHub → **Actions** → „Aplicația livratorilor (Android)” → ultimul build verde → **Artifacts → lyra-livrator-apk**.
Se construiește singur la fiecare schimbare în `courier-app/`; manual: **Run workflow**.

## Firebase (o singură dată, pentru notificări)
1. console.firebase.google.com → **Add project** („Lyra Livrator”, fără Google Analytics).
2. **Add app → Android**, package name `ro.lyrasdelivery.livrator` → descarci `google-services.json`.
3. GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:
   `GOOGLE_SERVICES_JSON` = tot conținutul fișierului `google-services.json`. Apoi Actions → **Run workflow**.
4. Firebase → ⚙ **Project settings → Service accounts → Generate new private key** (un fișier .json).
5. Supabase → **Edge Functions → Deploy a new function → Via Editor**: nume `fcm`, conținut `supabase/functions/fcm/index.ts`,
   apoi **Verify JWT oprit**. **Secrets**: `FIREBASE_SERVICE_ACCOUNT` = tot conținutul fișierului de la pasul 4
   (`PUSH_SECRET` există deja de la plata Stripe).
6. Supabase → SQL Editor:
   `select vault.create_secret('https://mowvnabteszjkavdidgb.supabase.co/functions/v1/fcm', 'fcm_url');`

## Semnătură fixă (opțional)
Fără ea, la o versiune nouă a aplicației dezinstalezi întâi versiunea veche (rar: interfața vine de pe site).
Cu ea, actualizarea se instalează peste: secretele `ANDROID_KEYSTORE_BASE64` (fișierul .keystore în base64) și `ANDROID_KEYSTORE_PASSWORD`.

## Pe telefon
Instalezi `lyra-livrator.apk` (permiți „instalare din surse necunoscute”), intri cu contul livratorului (Istvan, Pipe, Liviu sau Zoli), „Pornește tura”,
permiți **locația „Tot timpul”** și **notificările**. Setări → Aplicații → Lyra Livrator → Baterie → **Fără restricții**.
