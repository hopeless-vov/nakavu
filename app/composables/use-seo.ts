import { useHead, useRuntimeConfig, useSeoMeta } from '#imports'
import { useI18n } from 'vue-i18n'

export interface SeoOptions {
  /** i18n key of the page title (without the brand suffix). */
  title: string
  /** i18n key of the meta description. */
  description: string
  /** Keep the page out of search results (app screens, auth, invites). */
  noindex?: boolean
  /** Structured data for this page (schema.org JSON-LD). */
  jsonLd?: Record<string, unknown>
}

const OG_LOCALE: Record<string, string> = { uk: 'uk_UA', en: 'en_GB', nl: 'nl_NL' }

/** Title, description, Open Graph/Twitter cards and JSON-LD for one view. */
export function useSeo(options: SeoOptions) {
  const { t, locale } = useI18n()
  const siteUrl = useRuntimeConfig().public.siteUrl as string
  const image = () => `${siteUrl}/og/${locale.value}.png`

  useSeoMeta({
    title: () => t(options.title),
    description: () => t(options.description),
    ogTitle: () => `${t(options.title)} · ${t('brand.name')}`,
    ogDescription: () => t(options.description),
    ogSiteName: () => t('brand.name'),
    ogType: 'website',
    ogImage: image,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: () => t('seo.ogAlt'),
    ogLocale: () => OG_LOCALE[locale.value],
    twitterCard: 'summary_large_image',
    twitterImage: image,
    robots: options.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
  })

  if (options.jsonLd) {
    useHead({
      script: [{ type: 'application/ld+json', innerHTML: () => JSON.stringify(options.jsonLd) }],
    })
  }
}
