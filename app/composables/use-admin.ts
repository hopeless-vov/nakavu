import { navigateTo, useLocalePath, useRoute } from '#imports'
import * as wsApi from '~/api/workspaces'
import { useCatalog } from '~/composables/use-catalog'
import { useSessionStore } from '~/stores/session'
import { useToastStore } from '~/stores/toast'
import { useWorkspacesStore } from '~/stores/workspaces'
import type { Member, MemberRole, WorkspaceStats } from '~/types/domain'
import { participation } from '~/utils/dashboard'
import { errorKey } from '~/utils/errors'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

export const PAGE_SIZE = 50

/** Admin overview of one workspace: stats, participation chart and members. */
export function useAdmin() {
  const { t, locale } = useI18n()
  const route = useRoute()
  const localePath = useLocalePath()
  const store = useWorkspacesStore()
  const session = useSessionStore()
  const toast = useToastStore()
  const { roleLine } = useCatalog()

  const workspace = computed(() => store.bySlug(String(route.params.slug)))
  const canAdmin = computed(() => !!workspace.value && workspace.value.role !== 'member')
  const isOwner = computed(() => workspace.value?.role === 'owner')

  const stats = ref<WorkspaceStats | null>(null)
  const members = ref<Member[]>([])
  const query = ref('')
  const limit = ref(PAGE_SIZE)
  const state = ref<'loading' | 'ready' | 'forbidden' | 'error'>('loading')

  const monthFmt = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'short' }))
  const bars = computed(() =>
    (stats.value?.rounds ?? []).map((r) => {
      const share = r.participantCount ? r.met / r.participantCount : 0
      return { label: monthFmt.value.format(new Date(r.scheduledFor)), value: share, detail: t('admin.chart.detail', { met: r.met, total: r.participantCount }) }
    }),
  )
  const lastMet = computed(() => bars.value.at(-1))

  const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    const list = q
      ? members.value.filter((m) =>
          [m.person.firstName, m.person.lastName, m.person.email, m.person.jobTitle, m.person.department, m.person.city].join(' ').toLowerCase().includes(q),
        )
      : members.value
    return list
  })
  const visible = computed(() =>
    filtered.value.slice(0, limit.value).map((m) => ({
      ...m,
      name: `${m.person.firstName} ${m.person.lastName}`.trim() || m.person.email,
      subtitle: [roleLine(m.person), m.person.city].filter(Boolean).join(' · '),
      status: participation(m),
      isMe: m.userId === session.userId,
    })),
  )
  watch(query, () => (limit.value = PAGE_SIZE))

  async function load() {
    state.value = 'loading'
    await store.load().catch(() => undefined)
    const ws = workspace.value
    if (!ws || !canAdmin.value) {
      state.value = 'forbidden'
      return
    }
    try {
      const [s, m] = await Promise.all([wsApi.getWorkspaceStats(ws.id), wsApi.listMembers(ws.id)])
      stats.value = s
      members.value = m
      state.value = 'ready'
    } catch {
      state.value = 'error'
    }
  }

  async function setRole(userId: string, role: MemberRole) {
    const ws = workspace.value!
    try {
      await wsApi.setMemberRole(ws.id, userId, role)
      members.value = members.value.map((m) => (m.userId === userId ? { ...m, role } : m))
      toast.show(t('admin.toast.role', { role: t(`workspace.role.${role}`) }))
    } catch (e) {
      toast.show(t(errorKey(e)), 'error')
    }
  }

  async function remove(userId: string) {
    const ws = workspace.value!
    try {
      await wsApi.removeMember(ws.id, userId)
      members.value = members.value.filter((m) => m.userId !== userId)
      toast.show(t('admin.toast.removed'))
    } catch (e) {
      toast.show(t(errorKey(e)), 'error')
    }
  }

  async function deleteWorkspace() {
    const ws = workspace.value!
    try {
      await store.remove(ws.id)
      toast.show(t('admin.toast.deleted', { name: ws.name }))
      await navigateTo(localePath('workspaces'), { replace: true })
    } catch (e) {
      toast.show(t(errorKey(e)), 'error')
    }
  }

  onMounted(load)

  return { workspace, canAdmin, isOwner, stats, members, query, limit, state, bars, lastMet, filtered, visible, load, setRole, remove, deleteWorkspace }
}
