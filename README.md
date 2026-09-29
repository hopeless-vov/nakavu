# Nakavu ☕

**Nakavu** (від українського «на каву?») — кавова рулетка для команд і друзів. Раз на місяць (або за розкладом, який обрав воркспейс) кожен учасник отримує випадкового співрозмовника на каву — і лист з усім, що потрібно, щоб почати розмову.

- Кілька воркспейсів на одного користувача: робота, офіс, гільдія, друзі.
- Пари або трійки, розумний підбір: спільна мова обовʼязкова, без повторів, інші відділи, спільні інтереси.
- Пропуск раунду, пауза, історія зустрічей, статистика для адмінів.
- Мови інтерфейсу та листів: українська (типово), English, Nederlands.

## Stack

| Layer | Tech |
|---|---|
| Framework | Nuxt 4 (Vue 3.5, TypeScript) — SSR/prerender for public pages, client-side app |
| State | Pinia |
| Styling | Tailwind CSS 4 with semantic theme tokens (light/dark) |
| Motion | motion-v |
| Headless UI | reka-ui |
| i18n / SEO | @nuxtjs/i18n, @nuxtjs/sitemap, @nuxtjs/robots |
| Backend | Supabase (Postgres + RLS, Auth, Storage, Edge Functions, pg_cron) |
| Email | Supabase Auth templates + Resend for transactional mail |
| Tests | Vitest (+ @nuxt/test-utils, coverage-v8), Playwright, pgTAP |
| Lint | ESLint (flat config), husky + lint-staged |

## Getting started

```bash
nvm use            # Node 22+
npm install
cp .env.example .env
npm run dev        # http://localhost:3000
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Nuxt dev server |
| `npm run build` / `generate` / `preview` | Production build / static generate / preview |
| `npm run typecheck` | vue-tsc type check |
| `npm test` | Vitest in watch mode |
| `npm run test:unit` | Vitest once |
| `npm run test:coverage` | Vitest with coverage thresholds |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run test:db` | pgTAP tests for schema and RLS |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run og` | Re-render Open Graph images (`public/og/{uk,en,nl}.png`) from the hero copy |
| `npm run db:start` / `db:reset` / `db:types` | Local Supabase, reset, regenerate DB types |

## Environment

| Variable | Purpose |
|---|---|
| `NUXT_PUBLIC_SITE_URL` | Canonical site URL (sitemap, hreflang, emails) |
| `NUXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NUXT_PUBLIC_AUTH_PROVIDERS` | Optional comma-separated OAuth providers (`azure,google`). Empty = magic link only |

## Project structure

```
app/
  api/            typed Supabase data layer (one file per resource)
  components/ui/  presentational UI kit — props in, events out
  components/     smart components (stores + composables)
  composables/    reusable logic
  layouts/        site / bare / app shells
  middleware/     route access guards
  router/         routes.ts — the single route table (route → view)
  stores/         Pinia stores
  styles/         main.css — theme tokens
  utils/          pure helpers
  views/          one view per route
i18n/locales/     uk.json (default), en.json, nl.json
shared/           pure logic shared with Edge Functions (matching, schedules)
supabase/         migrations, pgTAP tests, Edge Functions, email templates
tests/unit/       Vitest
tests/e2e/        Playwright
```

Architecture and conventions are described in [CLAUDE.md](CLAUDE.md).

## Pages

Public (prerendered per locale): `/` landing, `/for-teams`, `/for-friends`, `/faq` (FAQPage JSON-LD), `/privacy`, `/terms`. Auth: `/sign-in`, `/auth/confirm`. App: `/onboarding`, `/app/**` (client-rendered, not indexed).

Above-the-fold hero animations are CSS keyframes (`animate-rise`, `animate-pop`) so content is visible before hydration (LCP/SEO); scroll reveals and micro-interactions use motion-v.

## i18n & SEO

- Locales: `uk` (default, no prefix), `en` (`/en/...`), `nl` (`/nl/...`). Files in `i18n/locales/`; a unit test keeps keys and `{placeholders}` identical across all three.
- Browser language is detected on the first visit to `/` and remembered in the `nakavu_locale` cookie.
- Every view calls `useSeo({ title, description, noindex?, jsonLd? })` — title template, description, Open Graph / Twitter cards (`/og/{locale}.png`), robots and JSON-LD.
- `hreflang`, canonical and `<html lang>` come from `useLocaleHead` in `app.vue`.
- `@nuxtjs/sitemap` and `@nuxtjs/robots` exclude the private app (`/app`, `/auth`, `/join`, `/onboarding`); public pages are prerendered per locale.
- Composables that need i18n/router/head are tested in the Nuxt environment (`*.nuxt.test.ts`, `withSetup` helper).

## Database (Supabase)

```bash
npm run db:start   # local Supabase in Docker (API :55321, Studio :55323, Mailpit :55324)
npm run db:reset   # re-apply migrations + seed
npm run db:types   # regenerate app/types/database.ts
npm run test:db    # pgTAP tests
```

Local ports are shifted to `553xx` so Nakavu runs alongside other Supabase projects.

**Schema** (`supabase/migrations/`): `profiles` (1:1 with `auth.users`, created by trigger), `workspaces` (schedule: `cadence`, `anchor_day`, `round_hour`, `timezone`, `next_round_at`; `allowed_domains`; `group_size` 2|3; `kind` work|friends), `memberships` (`role` owner|admin|member, `include_in_matching`, `skip_next_round`), `invites` (personal email invites), `rounds`, `matches`, `match_members` (per-person `feedback`), `email_outbox` (service role only).

**RPCs:** `create_workspace`, `workspace_preview` (anon, for `/join/:token`), `join_workspace`, `leave_workspace`, `regenerate_invite_token`, `set_match_feedback`, `my_matches`, `workspace_stats`, `delete_my_account`.

**RLS:** people see their own profile and profiles of people they share a workspace with; workspace data is visible to members; admins manage settings, invites and roles; matches are visible only to their participants. Column-level grants restrict what clients may update.

**Storage:** public buckets `workspace-logos/<workspace_id>/…` (admins write) and `avatars/<user_id>/…` (owner writes).

`npm run test:db` runs the pgTAP files in `supabase/tests/database/` through `psql` inside the local DB container (`scripts/test-db.mjs`), so it needs no Docker directory sharing.

## Rounds (Edge Functions + pg_cron)

- `supabase/functions/run-due-rounds` — hourly (pg_cron, `5 * * * *`). For every workspace whose `next_round_at` has passed: creates the round (idempotent), matches everyone in the draw (skippers sit out), saves matches, queues emails, clears skips and moves `next_round_at` on. Also queues **reminders** three days before a round and **"did you meet?" nudges** halfway through.
- `supabase/functions/send-emails` — drains `email_outbox` through Resend (every 5 minutes and right after a run).
- All decisions live in `supabase/functions/_shared/rounds.ts` behind a `RoundsDb` interface and are unit-tested; `supabase-db.ts` is the thin Supabase adapter.
- The pure logic in `shared/` is copied to `supabase/functions/_shared/lib/` by `npm run sync:shared`; a unit test fails if the copies drift.
- Production setup: `supabase secrets set CRON_SECRET=… RESEND_API_KEY=… MAIL_FROM=… SITE_URL=…`, then add Vault secrets `project_url` and `cron_secret` (same value as `CRON_SECRET`) — see `supabase/migrations/*_cron.sql`.

## Emails

Two kinds, both in **uk / en / nl**:

1. **Auth emails** (sign-in link + 6-digit code, email change, …) are Supabase Auth templates in `supabase/templates/` — see the section below.
2. **Transactional emails** are queued in `email_outbox` and sent by the `send-emails` Edge Function through Resend:

| Kind | When | Queued by |
|---|---|---|
| `match` | round day — partner card(s), shared interests, conversation starters, "say hi" mailto, `.ics` attachment | `run-due-rounds` |
| `no_match` | round day, when nobody compatible was found | `run-due-rounds` |
| `reminder` | three days before a round, with a one-click "skip" link | `run-due-rounds` |
| `feedback` | halfway through a round: "did you meet?" with answer buttons (`/app/history?match=…&answer=…`) | `run-due-rounds` |
| `invite` | a personal invite is created | DB trigger on `invites` |
| `welcome` | onboarding finished | DB trigger on `profiles.onboarded_at` |
| `goodbye` | account deleted | `delete_my_account()` |

Templates live in `supabase/functions/_shared/email/` (`strings.ts` copy, `layout.ts` email-safe HTML with a dark-mode variant, `templates.ts` rendering, `outbox.ts` sending + retries up to 5 attempts). Every email has a plain-text part and a `List-Unsubscribe` header pointing at notification settings. Email HTML uses literal hex colours (clients don't support CSS variables) mirroring the theme tokens.

### Supabase Auth templates

`npm run email:auth` generates `supabase/templates/{magic_link,confirmation,invite,email_change,reauthentication}.html` from `supabase/functions/_shared/email/auth-templates.ts` (same layout as transactional mail). Each file contains **uk / en / nl** and chooses by `.Data.locale`, which the app sets at sign-up from the interface language. Links go to `/auth/confirm?…&token_hash=…` (verified only on click — safe from link scanners such as Microsoft Safe Links) and sign-in emails also carry the 6-digit `{{ .Token }}`.

- **Local:** already wired in `supabase/config.toml` (see Mailpit at :55324).
- **Production:** Dashboard → Authentication → Emails → paste each file and its subject (subjects are trilingual because Supabase subjects aren't per-user). Set *Site URL* to your domain and add `https://<domain>/**` to *Redirect URLs*. Set the OTP expiry to 900 s and enable custom SMTP (e.g. Resend SMTP) for your own sender address.

## End-to-end tests (Playwright)

- `tests/e2e/public.spec.ts` — public site in three languages, SEO tags (hreflang, OG, JSON-LD), real 404, language switcher, mobile menu, theme persistence, sign-in validation, route guard, and **axe WCAG 2 AA checks on every public page in light and dark mode**. Runs on desktop and a Pixel 7 profile.
- `tests/e2e/flow.spec.ts` — the whole journey against local Supabase: sign in with the code from Mailpit → onboarding → create workspace → guest joins via the invite link → a round → match reveal → "Yes, we met" → history → admin. Needs `E2E_SUPABASE=1` and `SUPABASE_SERVICE_ROLE_KEY` (from `supabase status`). Also asserts the dashboard never scrolls sideways on phones.
- `tests/e2e/fixtures.ts` — `test`/`expect` to import in specs: every `page.goto` waits until Nuxt has hydrated, so clicks never land on inert SSR markup.
- Tests run against the **production build** (`nuxt build` + `node .output/server/index.mjs` on :3100, reading `.env`), like Vercel serves it — no Vite reloads or devtools overlay. Set `E2E_DEV=1` to run against `nuxt dev` for quicker iteration. Locally an already running server on :3100 is reused, so restart it after code changes.

```bash
npx playwright install chromium
npm run test:e2e
```

## Deploy

**1. Supabase (EU region)**

```bash
supabase link --project-ref <ref>
supabase db push                                   # schema, RLS, triggers, cron
supabase functions deploy run-due-rounds send-emails
supabase secrets set CRON_SECRET=<random> RESEND_API_KEY=<key> MAIL_FROM="Nakavu <hello@your-domain>" SITE_URL=https://your-domain
```

Then in SQL: `select vault.create_secret('https://<ref>.supabase.co', 'project_url'); select vault.create_secret('<same CRON_SECRET>', 'cron_secret');` and configure Auth (Site URL, redirect URLs, templates, OTP expiry, SMTP) as described above.

**2. Resend** — verify your sending domain (SPF/DKIM) and use it in `MAIL_FROM`.

**3. Vercel** — import the repo (framework preset *Nuxt*, config in `vercel.json` adds security and caching headers) and set:

| Variable | Value |
|---|---|
| `NUXT_PUBLIC_SITE_URL` | `https://your-domain` |
| `NUXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | project anon/publishable key |
| `NUXT_PUBLIC_AUTH_PROVIDERS` | optional, e.g. `azure,google` (configure the providers in Supabase first) |

Public pages are prerendered per locale (`nitro.prerender.crawlLinks`); `sitemap.xml` and `robots.txt` are generated.

## CI

`.github/workflows/ci.yml` runs lint, type check and unit tests with coverage thresholds; pgTAP against a fresh local Supabase; and Playwright (public + full journey) with a Playwright report on failure.

Locally, big test runs boot many Nuxt test environments — on a memory-constrained machine use `VITEST_MAX_WORKERS=1 npm run test:coverage`.
