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
