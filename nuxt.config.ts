import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

import { routes } from './app/router/routes'

const siteUrl = process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: true },

  // Explicit imports everywhere — no auto-imported composables or components.
  imports: { autoImport: false },
  components: { dirs: [] },

  // Routes are an explicit table (app/router/routes.ts) over PascalCase views.
  pages: true,
  experimental: { scanPageMeta: 'after-resolve' },
  hooks: {
    'pages:extend'(pages) {
      pages.push(
        ...routes.map((r) => ({
          name: r.name,
          path: r.path,
          file: fileURLToPath(new URL(`./app/views/${r.view}.vue`, import.meta.url)),
          meta: r.meta,
        })),
      )
    },
  },

  modules: ['@pinia/nuxt', '@nuxtjs/i18n', '@nuxtjs/sitemap', '@nuxtjs/robots', '@vueuse/nuxt'],

  css: ['~/styles/main.css'],
  vite: { plugins: [tailwindcss()] },

  app: {
    head: {
      htmlAttrs: { lang: 'uk' },
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [{ name: 'theme-color', content: '#FAF5EC' }],
    },
  },

  site: { url: siteUrl, name: 'Nakavu' },

  i18n: {
    strategy: 'prefix_except_default',
    defaultLocale: 'uk',
    baseUrl: siteUrl,
    langDir: 'locales',
    locales: [
      { code: 'uk', language: 'uk-UA', name: 'Українська', file: 'uk.json' },
      { code: 'en', language: 'en-GB', name: 'English', file: 'en.json' },
      { code: 'nl', language: 'nl-NL', name: 'Nederlands', file: 'nl.json' },
    ],
    detectBrowserLanguage: { useCookie: true, cookieKey: 'nakavu_locale', redirectOn: 'root' },
  },

  sitemap: { exclude: ['/app/**', '/*/app/**', '/auth/**', '/*/auth/**', '/join/**', '/*/join/**', '/onboarding', '/*/onboarding'] },
  robots: { disallow: ['/app', '/auth', '/join', '/onboarding'] },

  // Marketing pages are prerendered per locale; the app itself runs client-side.
  routeRules: {
    '/': { prerender: true },
    '/en': { prerender: true },
    '/nl': { prerender: true },
    '/app/**': { ssr: false },
    '/en/app/**': { ssr: false },
    '/nl/app/**': { ssr: false },
    '/onboarding': { ssr: false },
    '/en/onboarding': { ssr: false },
    '/nl/onboarding': { ssr: false },
  },

  runtimeConfig: {
    public: {
      siteUrl,
      supabaseUrl: '',
      supabaseAnonKey: '',
      authProviders: '',
    },
  },

  typescript: { strict: true },
})
