import * as api from '~/api/matches'
import type { Match, MatchFeedback } from '~/types/domain'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useMatchesStore = defineStore('matches', () => {
  const items = ref<Match[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  /** Latest match per workspace — what the dashboard shows as "your current coffee". */
  const current = computed(() => {
    const seen = new Set<string>()
    return items.value.filter((m) => !seen.has(m.workspaceId) && seen.add(m.workspaceId))
  })
  const metCount = computed(() => items.value.filter((m) => m.myFeedback === 'met').length)

  async function load(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    try {
      items.value = await api.listMyMatches(100)
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  /** Optimistic feedback with rollback. */
  async function setFeedback(matchId: string, feedback: MatchFeedback) {
    const before = items.value.find((m) => m.id === matchId)?.myFeedback ?? null
    const apply = (value: MatchFeedback | null) => {
      items.value = items.value.map((m) => (m.id === matchId ? { ...m, myFeedback: value } : m))
    }
    apply(feedback)
    try {
      await api.setMatchFeedback(matchId, feedback)
    } catch (e) {
      apply(before)
      throw e
    }
  }

  function $reset() {
    items.value = []
    loaded.value = false
  }

  return { items, loaded, loading, current, metCount, load, setFeedback, $reset }
})
