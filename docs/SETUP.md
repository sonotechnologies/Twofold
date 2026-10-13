# Twofold setup guide

Do these in order. Everything here is free except what's marked otherwise.
Your Supabase project: `https://rcpjjpsdggjoritgrwnf.supabase.co` (already set in `mobile/.env`).

**Never paste these anywhere public or into the app:** the Supabase `service_role` / secret key, your
database password, the Google client secret, the Meta app secret. They only go into the dashboards below.

---

## 1. Database (5 minutes)

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) → your project → **SQL Editor** → **New query**.
2. Open [`supabase/setup/all-migrations.sql`](../supabase/setup/all-migrations.sql) on GitHub, click **Raw**, select all, copy.
3. Paste into the query box and click **Run**. You should see "Success. No rows returned".
4. Check: **Table Editor** now lists `profiles`, `couples`, `messages`, `daily_questions` (60 rows) and others.

Run it **once**, on this project. If you later add migrations, run only the new files (or use the CLI in step 3).

Then, still in the dashboard:

- **Authentication → URL Configuration**: under **Redirect URLs** add `twofold://auth-callback` and save.
- **Authentication → Providers → Phone**: leave **off** (WhatsApp sign-in replaces SMS).

## 2. Google sign-in (10 minutes)

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project called "Twofold".
2. **APIs & Services → OAuth consent screen**: choose **External**, app name "Twofold", your support email, save.
   Add yourself under **Test users** while it's in testing.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URI: `https://rcpjjpsdggjoritgrwnf.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client secret**.
5. Supabase → **Authentication → Providers → Google**: turn on, paste both, save.

## 3. Server functions (15 minutes, on your computer)

You need [Node.js](https://nodejs.org) (LTS) installed. In a terminal:

```bash
git clone https://github.com/sonotechnologies/Twofold.git
cd Twofold
npx supabase login                                   # opens the browser
npx supabase link --project-ref rcpjjpsdggjoritgrwnf
npx supabase functions deploy delete-account
npx supabase functions deploy wa-start
npx supabase functions deploy wa-webhook
npx supabase functions deploy wa-complete
```

(`supabase/config.toml` already tells Supabase that the three `wa-*` functions are public; account deletion
requires the signed-in user.)

## 4. "Verify with WhatsApp" with your existing business number

How it works: the app shows a code and opens WhatsApp with a message ready to send to your Twofold number.
The person taps send; Meta forwards that message to `wa-webhook`, which records which number sent it.
Twofold never sends a reply, so there's no per-message fee from Meta for verification.

**Before you start:** update the WhatsApp Business app on your phone (version 2.24.17 or newer), and have a
Facebook Page you're an admin of. Connecting the number to the API ("coexistence") keeps it working in the
Business app, but some features (such as broadcast lists) may stop working on it, and Meta may limit sending.
Menu names on Meta's side change often; if a label below doesn't match, look for the nearest equivalent.

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create app** → type **Business**
   → name "Twofold" → link it to your Meta Business account (create one if asked).
2. In the app, **Add product → WhatsApp → Set up**.
3. Connect your number: in **WhatsApp → API Setup**, choose to add a phone number and pick the option to
   connect an **existing WhatsApp Business app** number. Follow the prompts; you'll scan a QR code from the
   Business app (**Settings → Account → Business Platform** or similar). If this option isn't offered for your
   number, tell me: we can use Meta's free test number meanwhile.
4. **Webhook**: **WhatsApp → Configuration → Webhook → Edit**
   - Callback URL: `https://rcpjjpsdggjoritgrwnf.supabase.co/functions/v1/wa-webhook`
   - Verify token: make up a long random phrase (for example from a password generator). Keep it for step 6.
   - Click **Verify and save** (do step 6 first, or it will fail; then come back).
   - Under **Webhook fields**, **Subscribe** to `messages`.
5. **App secret**: **App settings → Basic → App secret → Show**. Copy it.
6. Back in your terminal, set the secrets (replace the values; the number is in international format, digits only):

   ```bash
   npx supabase secrets set WHATSAPP_BUSINESS_NUMBER=2348012345678
   npx supabase secrets set WHATSAPP_VERIFY_TOKEN=the-phrase-from-step-4
   npx supabase secrets set META_APP_SECRET=the-app-secret-from-step-5
   ```

7. Finish step 4 (**Verify and save**), then switch the Meta app to **Live** (top of the app dashboard).
   Live mode asks for a **privacy policy URL**. Twofold doesn't have one yet; ask me and I'll make a free page.

Test: open the app → **Continue with WhatsApp** → send the message → come back. You should land on "About you".

## 5. Install on your Android phone (20 minutes, mostly waiting)

1. Create a free account at [expo.dev](https://expo.dev/signup).
2. In the `Twofold` folder from step 3:

   ```bash
   cd mobile
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest init            # links the app to your Expo account (say yes)
   npx eas-cli@latest build --platform android --profile preview
   ```

3. When the build finishes (about 15 minutes on the free tier), Expo shows a link and QR code. Open it on your
   Android phone, download the APK and install it (allow "install unknown apps" when asked).
4. Install it on a second phone (your partner's) to test pairing and chat for real.

Commit the change `eas init` makes to `mobile/app.json` (it adds your Expo project ID), or tell me the ID.

## 6. Try it without any of the above

`cd mobile && npm install && npm run demo` runs the app with a built-in demo partner ("Bella"), no backend needed.

## What to send me

Nothing secret. Just tell me how far you got, and anything that looked wrong or broke while testing on the phone
(screenshots help). I'll fix those before starting Phase 2.
