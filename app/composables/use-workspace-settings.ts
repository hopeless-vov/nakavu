import { navigateTo, useLocalePath, useRoute } from '#imports'
import { nextRoundAt } from '#shared/schedule'
import { useToastStore } from '~/stores/toast'
import { useWorkspacesStore } from '~/stores/workspaces'
import { participation } from '~/utils/dashboard'
import { errorKey } from '~/utils/errors'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

/** The Workspaces screen: pick a workspace, flip my switches, or leave. */
export function useWorkspaceSettings() {
  const { t, locale } = useI18n()
  const route = useRoute()
  const localePath = useLocalePath()
  const store = useWorkspacesStore()
  const toast = useToastStore()

  const selectedSlug = computed({
    get: () => (typeof route.query.ws === 'string' && store.bySlug(route.query.ws) ? route.query.ws : store.items[0]?.slug ?? ''),
    set: (slug: string) => void navigateTo({ query: { ...route.query, ws: slug } }, { replace: true }),
  })
  const selected = computed(() => store.bySlug(selectedSlug.value))
  const status = computed(() => (selected.value ? participation(selected.value) : null))
  const isAdmin = computed(() => !!selected.value && selected.value.role !== 'member')

  const fmtDay = (d: Date) => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long' }).format(d)
  const nextDate = computed(() => (selected.value ? fmtDay(new Date(selected.value.nextRoundAt)) : ''))
  /** The round after the next one — where skippers come back. */
  const afterNextDate = computed(() => (selected.value ? fmtDay(nextRoundAt(selected.value, new Date(selected.value.nextRoundAt))) : ''))

  const leaveOpen = ref(false)
  const leaving = ref(false)

  async function setInclude(value: boolean) {
    const ws = selected.value
    if (!ws) return
    try {
      await store.setSwitches(ws.id, { includeInMatching: value })
      toast.show(t(value ? 'settings.toast.resumed' : 'settings.toast.paused', { name: ws.name }))
    } catch (e) {
      toast.show(t(errorKey(e)), 'error')
    }
  }

  async function setSkip(value: boolean) {
    const ws = selected.value
    if (!ws) return
    try {
      await store.setSwitches(ws.id, { skipNextRound: value })
      toast.show(t(value ? 'settings.toast.skipping' : 'settings.toast.notSkipping', { date: value ? afterNextDate.value : nextDate.value }))
    } catch (e) {
      toast.show(t(errorKey(e)), 'error')
    }
  }

  async function leave() {
    const ws = selected.value
    if (!ws) return
    leaving.value = true
    try {
      await store.leave(ws.id)
      leaveOpen.value = false
      toast.show(t('settings.toast.left', { name: ws.name }))
      await navigateTo(localePath('workspaces'), { replace: true })
    } catch (e) {
      toast.show(t(errorKey(e)), 'error')
    } finally {
      leaving.value = false
    }
  }

  onMounted(() => {
    void store.load().catch(() => undefined)
  })

  return { store, selectedSlug, selected, status, isAdmin, nextDate, afterNextDate, leaveOpen, leaving, setInclude, setSkip, leave }
}
