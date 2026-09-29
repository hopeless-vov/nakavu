import { useIntervalFn } from '@vueuse/core'
import { ref } from 'vue'

/** A clock that ticks every `intervalMs` (1s by default) while the component is mounted. */
export function useNow(intervalMs = 1000) {
  const now = ref(new Date())
  useIntervalFn(() => (now.value = new Date()), intervalMs)
  return now
}
