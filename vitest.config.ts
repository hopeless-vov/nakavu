import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['app/api/**', 'app/composables/**', 'app/stores/**', 'app/utils/**', 'app/components/**', 'app/router/**', 'shared/**'],
      thresholds: {
        'app/{api,composables,stores,utils,router}/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'shared/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'app/components/**': { lines: 90, functions: 90, branches: 85, statements: 90 },
      },
    },
  },
})
