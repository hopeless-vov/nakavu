# CLAUDE.md — Project rules for Claude Code

## README

**Always keep `README.md` up to date.** Whenever you add, remove, or change a package, script, environment variable, directory, or architectural convention, update `README.md` in the same change.

## Commits

Commit after every finished task (one plan step = one commit). Tests and lint must pass first.

## Architecture rules

1. **`app/components/ui/` is presentational only.** No imports from `stores/`, `api/`, or `composables/` (enforced by ESLint). Props in, events out. Before writing markup in a view or smart component, check whether a `ui/` component already does it — reuse or extend it, never duplicate.
2. **`app/views/` are route-level containers.** Each view maps 1:1 to a route in `app/router/routes.ts` (the single route table). Views compose components and connect them to stores/composables.
3. **Smart components in `app/components/` (root) may use stores and composables.** They wire `ui/` components to application logic.
4. **No `api/` imports in components, views or layouts** (enforced by ESLint). Always go through a composable or store.
5. **No barrel exports and no auto-imports.** Import every file, component and composable explicitly (`import { useHead } from '#imports'`, `import BaseButton from '~/components/ui/BaseButton.vue'`).
6. **All user-visible text comes from `i18n/locales/{uk,en,nl}.json`.** `uk` is the default. Add every key to **all three** files and use `t('key')`. Email templates follow the same three locales.
7. **Only theme color tokens.** Colors are semantic tokens in `app/styles/main.css` (`bg`, `surface`, `surface-2`, `fg`, `muted`, `accent`, `sage`, `line`, …) exposed as Tailwind utilities. They flip via `data-theme` on `<html>`. Never use arbitrary colors or raw palette colors.
8. **Pure logic lives in `shared/`** (matching, schedule maths) so both the Nuxt app and Supabase Edge Functions use the same tested code.

## Data / backend

9. **Supabase is the backend.** Typed data layer in `app/api/` (one file per resource, all through `app/api/supabase.ts`). Schema, RLS and SQL functions live in `supabase/migrations/` and are tested with pgTAP in `supabase/tests/`. Scheduled work runs in Edge Functions (`supabase/functions/`).
10. **Auth is magic link + 6-digit code.** Links land on a confirm page that verifies only after a click (corporate link scanners must not burn the token). OAuth buttons appear only for providers listed in `NUXT_PUBLIC_AUTH_PROVIDERS`.

## Testing

11. **Everything in `app/api`, `app/composables`, `app/stores`, `app/utils`, `app/router` and `shared/` has 100% coverage** (Vitest, `tests/unit/`); `app/components` ≥ 90%. Supabase is mocked at the `api/` boundary. User flows are covered by Playwright in `tests/e2e/`.

## Design & motion

12. **Animations are purposeful and quick.** Use `motion-v`; keep UI transitions ≤ ~0.35s with gentle easing. Hero/reveal moments may be longer but never block interaction. Always respect `prefers-reduced-motion`.
13. **SEO:** every public view sets title/description via `useSeo` and is prerendered per locale.
