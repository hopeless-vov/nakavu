import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import { initSupabase } from '~/api/supabase'

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  setup() {
    const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig().public
    // Without config (unit tests, a misconfigured preview) the public pages still render.
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[nakavu] NUXT_PUBLIC_SUPABASE_URL / _ANON_KEY are not set — sign-in is disabled.')
      return
    }
    initSupabase(supabaseUrl as string, supabaseAnonKey as string)
  },
})
