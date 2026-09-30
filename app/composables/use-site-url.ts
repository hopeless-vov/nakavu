import { useRuntimeConfig } from '#imports'
import { withoutTrailingSlash } from '~/utils/url'

/** Public origin of the site (from NUXT_PUBLIC_SITE_URL), never ending in `/`. */
export function useSiteUrl(): string {
  return withoutTrailingSlash(useRuntimeConfig().public.siteUrl as string)
}
