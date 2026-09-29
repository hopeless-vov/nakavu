import { useLocalStorage, usePreferredDark } from '@vueuse/core'
import { THEME_STORAGE_KEY, type ThemePreference } from '~/utils/theme'
import { computed, watchEffect } from 'vue'

/**
 * Light/dark theme. The preference is stored per browser; the resolved theme is
 * written to `data-theme` on <html>, which flips every colour token at once.
 * A tiny inline script in nuxt.config applies it before first paint.
 */
export function useTheme() {
  const preference = useLocalStorage<ThemePreference>(THEME_STORAGE_KEY, 'system')
  const prefersDark = usePreferredDark()

  const resolved = computed<'light' | 'dark'>(() =>
    preference.value === 'system' ? (prefersDark.value ? 'dark' : 'light') : preference.value,
  )

  watchEffect(() => {
    /* v8 ignore next -- no document during SSR */
    if (typeof document !== 'undefined') document.documentElement.dataset.theme = resolved.value
  })

  function toggle() {
    preference.value = resolved.value === 'dark' ? 'light' : 'dark'
  }

  return { preference, resolved, toggle }
}
