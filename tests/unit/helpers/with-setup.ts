import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'

/** Runs a composable inside a mounted Nuxt component (i18n, router, head available). */
export async function withSetup<T>(composable: () => T): Promise<T> {
  let result!: T
  await mountSuspended(
    defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      },
    }),
  )
  return result
}
