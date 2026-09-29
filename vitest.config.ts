import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    // Each Nuxt-environment file boots a Nuxt app; cap parallel workers to keep memory in check.
    maxWorkers: process.env.VITEST_MAX_WORKERS ? Number(process.env.VITEST_MAX_WORKERS) : 2,
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/unit/setup.ts'],
    // happy-dom's Web Animations stub rejects finished promises when motion-v cancels an animation.
    onUnhandledError: (error) => error.name !== 'AbortError',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['app/api/**', 'app/composables/**', 'app/stores/**', 'app/utils/**', 'app/components/**', 'app/router/**', 'shared/**', 'supabase/functions/_shared/rounds.ts', 'supabase/functions/_shared/email/**'],
      thresholds: {
        'app/{api,composables,stores,utils,router}/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'shared/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'supabase/functions/_shared/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'app/components/**': { lines: 90, functions: 90, branches: 85, statements: 90 },
      },
    },
  },
})
