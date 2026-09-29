import * as api from '~/api/workspaces'
import { useSessionStore } from '~/stores/session'
import type { MyWorkspace, Workspace, WorkspaceInput } from '~/types/domain'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** The signed-in person's workspaces and their own matching switches. */
export const useWorkspacesStore = defineStore('workspaces', () => {
  const items = ref<MyWorkspace[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  const isAdminAnywhere = computed(() => items.value.some((w) => w.role !== 'member'))
  const bySlug = (slug: string) => items.value.find((w) => w.slug === slug)
  /** The soonest upcoming round across workspaces where I'm in the draw. */
  const nextRound = computed(() =>
    items.value
      .filter((w) => w.includeInMatching)
      .map((w) => ({ workspace: w, at: w.nextRoundAt }))
      .sort((a, b) => a.at.localeCompare(b.at))[0] ?? null,
  )

  function userId() {
    const id = useSessionStore().userId
    if (!id) throw new Error('Not signed in')
    return id
  }

  async function load(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    try {
      items.value = await api.listMyWorkspaces(userId())
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function create(input: WorkspaceInput): Promise<Workspace> {
    const ws = await api.createWorkspace(input)
    await load(true)
    return ws
  }

  async function update(id: string, patch: Parameters<typeof api.updateWorkspace>[1]) {
    const ws = await api.updateWorkspace(id, patch)
    items.value = items.value.map((w) => (w.id === id ? { ...w, ...ws } : w))
    return ws
  }

  async function uploadLogo(id: string, file: File) {
    return update(id, { logoUrl: await api.uploadWorkspaceLogo(id, file) })
  }

  async function join(token: string): Promise<Workspace> {
    const ws = await api.joinWorkspace(token)
    await load(true)
    return ws
  }

  async function leave(id: string) {
    await api.leaveWorkspace(id)
    items.value = items.value.filter((w) => w.id !== id)
  }

  async function remove(id: string) {
    await api.deleteWorkspace(id)
    items.value = items.value.filter((w) => w.id !== id)
  }

  /** Optimistic: flips the switch at once and rolls back if the server says no. */
  async function setSwitches(id: string, patch: { includeInMatching?: boolean; skipNextRound?: boolean }) {
    const before = items.value.find((w) => w.id === id)
    if (!before) return
    const next = { ...before, ...patch }
    if (patch.includeInMatching === false) next.skipNextRound = false
    items.value = items.value.map((w) => (w.id === id ? next : w))
    try {
      await api.updateMySwitches(id, userId(), patch)
    } catch (e) {
      items.value = items.value.map((w) => (w.id === id ? before : w))
      throw e
    }
  }

  async function rotateInvite(id: string) {
    const token = await api.regenerateInviteToken(id)
    items.value = items.value.map((w) => (w.id === id ? { ...w, inviteToken: token } : w))
    return token
  }

  function $reset() {
    items.value = []
    loaded.value = false
  }

  return { items, loaded, loading, isAdminAnywhere, nextRound, bySlug, load, create, update, uploadLogo, join, leave, remove, setSwitches, rotateInvite, $reset }
})
