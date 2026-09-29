import { listCoworkerNames } from '~/api/workspaces'
import { useMatchesStore } from '~/stores/matches'
import { useSessionStore } from '~/stores/session'
import { useWorkspacesStore } from '~/stores/workspaces'
import { greetingKey } from '~/utils/dashboard'
import { computed, onMounted, reactive } from 'vue'

/** Loads and shapes what the home screen shows. */
export function useDashboard() {
  const session = useSessionStore()
  const workspaces = useWorkspacesStore()
  const matches = useMatchesStore()
  const decoys = reactive<Record<string, string[]>>({})

  const greeting = computed(() => `dashboard.greeting.${greetingKey(new Date().getHours())}`)
  const firstName = computed(() => session.profile?.firstName ?? '')
  const ready = computed(() => workspaces.loaded && matches.loaded)
  const hasWorkspaces = computed(() => workspaces.items.length > 0)

  /** Only matches from workspaces I'm still in, newest first. */
  const current = computed(() => matches.current.filter((m) => workspaces.items.some((w) => w.id === m.workspaceId)))

  const state = computed<'loading' | 'empty' | 'waiting' | 'matched'>(() => {
    if (!ready.value) return 'loading'
    if (!hasWorkspaces.value) return 'empty'
    return current.value.length ? 'matched' : 'waiting'
  })

  async function loadDecoys() {
    await Promise.all(
      current.value.map(async (m) => {
        if (decoys[m.workspaceId]) return
        const names = await listCoworkerNames(m.workspaceId).catch(() => [])
        const partnerNames = new Set(m.partners.map((p) => `${p.firstName} ${p.lastName}`.trim()))
        decoys[m.workspaceId] = names.filter((n) => !partnerNames.has(n))
      }),
    )
  }

  async function load() {
    await Promise.all([workspaces.load(), matches.load()])
    await loadDecoys()
  }

  onMounted(() => {
    void load().catch(() => undefined)
  })

  return { greeting, firstName, ready, state, current, decoys, nextRound: computed(() => workspaces.nextRound), workspaces, load }
}
