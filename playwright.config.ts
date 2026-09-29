import { defineConfig, devices } from '@playwright/test'

const PORT = 3100

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'uk-UA',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Tests run against the production build (what Vercel serves): no Vite reloads, no devtools overlay.
  // E2E_DEV=1 switches to `nuxt dev` for quick local iteration.
  webServer: {
    command: process.env.E2E_DEV
      ? `npx nuxt dev --port ${PORT}`
      : 'npm run build && node --env-file-if-exists=.env .output/server/index.mjs',
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
  },
})
