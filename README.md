# Guided Reps

A hands-free personal exercise coach — a phone-first PWA that talks you through a
daily workout with voice cues and timers, and can draft routines for you with AI.
Ships as a marketing site at `/` with the app itself under `/app` (installable PWA),
brand **Guided Reps** (`guidedreps.com`).

## Features

- **Personalized 12-week program (Pro)** — a structured, progressive full-body plan
  (3 strength days + 3 walks per week, Foundation → Build → Develop → Strengthen), with
  the strength movements **personalized and calibrated** to what you can do today (a
  capability check sets the starting difficulty) and your equipment/injuries. The
  validated scaffold lives in `src/lib/program.ts`; per-user personalization is generated
  into `program_blocks` and assembled by `src/lib/programPlan.ts`. Each session is fully
  guided (warm-up → movements → stretches, RPE 6–7). Free tier gets personalized single
  routines instead; the program is Pro.
- **In-set coaching** — the coach counts your reps out loud at the movement's tempo,
  counts down timed holds, and describes how to get into position — with a Full / Counts /
  Quiet setting. (`src/lib/useSession.ts`)
- **Hands-free session player** — a big timer, current move + "next up", spoken cues
  ("30 seconds of squats… rest… next: push-ups") and beeps, auto-advancing through
  work and rest. Keeps the screen awake so your phone doesn't sleep mid-set.
- **AI routine generator** — tell it your time, focus, equipment, and intensity, and
  Claude drafts a structured routine you can preview, save, and reuse.
- **Voice commands & how-to** — optional hands-free control ("pause / continue / next /
  back / restart / instructions") via the Web Speech API, plus per-exercise written
  instructions the coach can read aloud, with a "Watch on YouTube" search link.
- **Built-in routines** — three seed routines (Full Body, Morning Mobility, Quick HIIT)
  so it's usable on day one, no setup required.
- **Accounts (optional, multi-user)** — sign in with a passwordless email code; your
  routines, history, and program progress sync to your account (Supabase + Postgres
  RLS, per-user isolated). A one-time onboarding collects your name, a required
  safety-disclaimer agreement, and a short fitness questionnaire that generates three
  personalized starter routines. An admin dashboard lists users and their activity.
- **Local-first fallback** — with no Supabase configured, everything runs in the
  browser (localStorage), no login, works offline. Installable to your home screen.
- **Streaks & history** — day streak, total workouts, minutes trained.

## Tech

- Next.js 16 (App Router) · TypeScript · Tailwind CSS 4
- Web Speech API (voice cues + voice commands) + WebAudio (beeps) · Screen Wake Lock API
- `@anthropic-ai/sdk` with structured outputs for routine generation
- Supabase (`@supabase/ssr`) — auth (email OTP), Postgres, Row-Level Security
- Installable PWA (manifest + service worker for offline)

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

- `http://localhost:3000/` — the **marketing site** (landing, pricing, about, legal). Public.
- `http://localhost:3000/start` — the **public quiz** (no signup): answer a few questions,
  see a real personalized routine, then create a free account to save it. Answers + routines
  are stashed in `localStorage` and migrated into the account on first sign-in.
- `http://localhost:3000/app` — the **app** (the coach). Installs to the home screen; when
  Supabase is configured, `/app/*` requires sign-in and everything else stays public.

Open the app on your phone (same network) for the intended experience — turn the volume up
so you can hear the coach.

### Enabling AI routines (optional)

Copy `.env.local.example` to `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

This powers the **personalized routines** generated from the onboarding questionnaire
(and re-runnable from `/app/personalize`). Without a key, onboarding still completes and
the built-in routines are available — only the personalized generation is skipped. Models
are constants in [`src/lib/generateRoutines.ts`](src/lib/generateRoutines.ts):
`STARTER_MODEL` and `PROGRAM_MODEL` (both `claude-opus-5` for quality — swap `STARTER_MODEL`
to `claude-sonnet-5` if speed/cost matters more than the first-routine quality). The `/start`
preview generates a single routine to keep the pre-signup wait short.

### Enabling cloud accounts (multi-user, optional)

Without Supabase env vars the app runs in **local-only mode** (no login, data stays on
the device). Multi-user is fully implemented — auth, per-user data sync, onboarding +
safety disclaimer, and an admin dashboard. To turn it on:

1. **Create a Supabase project** (supabase.com). From **Settings → API keys**, copy into
   `.env.local` (see `.env.local.example`): the Project URL →
   `NEXT_PUBLIC_SUPABASE_URL`, the **Publishable** key →
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the **Secret** key →
   `SUPABASE_SERVICE_ROLE_KEY` (server-only; used by the admin dashboard to read across
   users — never exposed to the browser). Legacy `anon` / `service_role` JWTs also work.
2. **Run the schema.** In the Supabase **SQL Editor**, paste and run
   [`supabase/schema.sql`](supabase/schema.sql). It's idempotent — it creates the tables,
   the Row-Level Security policies that isolate each user's data, and the disclaimer
   columns + insert policy. Re-run it any time it changes.
3. **Wire magic-link/OTP email to Resend.** In Supabase **Authentication → Emails → SMTP
   Settings**, enable custom SMTP: host `smtp.resend.com`, port `465`, username `resend`,
   password = your Resend API key, from-address on a Resend-verified domain. Under
   **Authentication → URL Configuration**, set the Site URL and add `.../auth/callback`
   as a redirect URL.
4. **Show the sign-in code in the email.** Sign-in uses a passwordless code (so browser
   users aren't pulled into the installed app). In **Authentication → Emails → Magic
   Link**, make sure the template renders the code — include `{{ .Token }}` in the body
   (the default template only shows the link). The magic link still works for app users.
5. **Make yourself an admin.** After your first sign-in, run in the SQL Editor:
   `update public.profiles set is_admin = true where email = 'you@example.com';`

Restart the dev server. Visiting `/app` sends you to `/app/login` → enter your email →
type the code from the email → a one-time onboarding (name + disclaimer + a short fitness
questionnaire that generates your personalized starter routines) → into the app.
The admin dashboard is at `/app/admin` (also linked from the account page for admins).
Only `/app/*` is gated — the marketing pages stay public. Under **URL Configuration**,
the Site URL should point at your deployment and the redirect list keeps `.../auth/callback`.

> **Service worker note:** if you've run a production build (`npm start`) and then switch
> back to `npm run dev`, a leftover service worker can serve stale HTML (causing hydration
> errors). Dev now auto-unregisters it, but the first time you may need to clear it once:
> DevTools → Application → Service Workers → Unregister, then Clear site data.

### Enabling Pro subscriptions (Stripe, optional)

Without Stripe env vars the app is a free product (no upgrade paths appear). Pro is a
subscription with a **7-day free trial**, **$5/mo or $40/yr**. The Free plan is the
hands-free coach + personalized starter routines; **Pro adds the personalized, adaptive
12-week program** (plus progress charts, the custom routine builder, and data export). The
program and Pro-only pages are gated by `isProUser()`. To turn it on:

1. **Create a Stripe account** and stay in **Test mode**. From Developers → API keys, copy
   the **Secret key** into `.env.local` as `STRIPE_SECRET_KEY` (`sk_test_…`).
2. **Create the product + prices.** Run `npm run stripe:setup` — it creates “Guided Reps
   Pro” with monthly ($5) and annual ($40) prices and prints two lines to paste into
   `.env.local`: `STRIPE_PRICE_PRO_MONTHLY` and `STRIPE_PRICE_PRO_ANNUAL`. (Idempotent —
   safe to re-run.)
3. **Run the schema** again (or the new `alter`s) — `supabase/schema.sql` now adds the
   billing columns to `profiles` (`stripe_customer_id`, `subscription_status`, `price_id`,
   `current_period_end`, `ai_generations_used`).
4. **Wire the webhook** so subscription state syncs back:
   - **Local:** install the [Stripe CLI](https://stripe.com/docs/stripe-cli), `stripe login`,
     then `stripe listen --forward-to localhost:3000/api/stripe/webhook`. Copy the printed
     `whsec_…` into `STRIPE_WEBHOOK_SECRET` and restart the dev server.
   - **Production:** Dashboard → Developers → Webhooks → Add endpoint
     `https://guidedreps.com/api/stripe/webhook`, listening for
     `checkout.session.completed` and `customer.subscription.created|updated|deleted`.
     Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
5. **Test.** Sign in → Account → “Start free trial”, pay with test card `4242 4242 4242 4242`
   (any future expiry / CVC). You'll return to Account showing **Pro · trial**. “Manage
   billing” opens the Stripe portal to cancel or switch plans.

Go live by swapping test keys for live keys and re-running `npm run stripe:setup` with the
live secret (creates live products). The upgrade UI lives on the account page; Pro-only
features (stats/export, custom builder) are gated by `isProUser()` in `src/lib/stripe/gate.ts`.

## Architecture notes

- **Two zones, one project.** The marketing site lives in the `src/app/(marketing)`
  route group (`/`, `/pricing`, `/about`, `/privacy`, `/terms`) with its own
  header/footer layout; the app lives under `src/app/app/*` (`/app`, `/app/program`,
  …) with the phone-first shell (`BottomNav`, PWA registration, cloud sync) in
  `src/app/app/layout.tsx`. The root layout is minimal (fonts + metadata). Marketing
  copy/pricing/features are centralized in `src/lib/site.ts`. The PWA manifest is
  scoped to `/app` so the installed app opens straight into the coach.
- **Data layer** (`src/lib/store.ts`) is **dual-mode**: it uses Supabase per-user
  storage when configured, and localStorage otherwise — behind one small async API, so
  the UI is identical either way. On first sign-in, any on-device data is migrated into
  the account (`ensureMigrated`, run by `<CloudSync/>`). Device-only settings
  (voice/beeps) always stay local.
- **Auth** (`src/lib/supabase/*`, root `middleware.ts`) uses `@supabase/ssr`. The
  middleware refreshes the session, redirects signed-out users to `/login`, and gates
  signed-in users through `/onboarding` until they've provided a name + disclaimer. The
  admin dashboard (`/admin`) uses a `server-only` service-role client that bypasses RLS.
- **Billing** (`src/lib/stripe/*`, `src/app/api/stripe/webhook`) uses Stripe Checkout +
  Billing Portal. Entitlement (`getEntitlement`) reads the subscription state mirrored onto
  `profiles` by the webhook (via the service-role client). Pro = `active`/`trialing`. The
  only server-enforced gate today is AI generation (Free = 3, metered by
  `ai_generations_used`); other Free/Pro differences are positioning, not locks.
- **Brand assets.** The icon/logo mark (an open progress ring + upward arrow) is the source
  SVG `public/icon.svg`; the reusable inline mark is `src/components/BrandMark.tsx` (header,
  footer, login). PNG icons (`apple-touch-icon.png` 180, `icon-192/512.png`) are rasterized
  from the SVG with `npm run icons` — re-run it after editing `icon.svg`.
- **Session engine** (`src/lib/useSession.ts`) builds a flat timeline of prep/work/rest
  segments and drives it on a `performance.now()` clock so timing stays accurate even
  when the browser throttles background timers.

## Build

```bash
npm run build && npm start
```
# guidedrep
