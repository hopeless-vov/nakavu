// @vitest-environment nuxt
import { withSetup } from './helpers/with-setup'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import { ApiError } from '~/api/supabase'
import { useWorkspaceSettings } from '~/composables/use-workspace-settings'
import { useToastStore } from '~/stores/toast'
import { useWorkspacesStore } from '~/stores/workspaces'
import type { MyWorkspace } from '~/types/domain'
import WorkspacesView from '~/views/WorkspacesView.vue'

const { navigateTo, route } = vi.hoisted(() => ({ navigateTo: vi.fn(), route: { query: {} as Record<string, string>, params: {}, fullPath: '/app/workspaces' } }))
mockNuxtImport('navigateTo', () => navigateTo)
mockNuxtImport('useRoute', () => () => route)

const ws = (over: Partial<MyWorkspace> = {}): MyWorkspace => ({
  id: 'w1', name: 'Northwind', slug: 'northwind', kind: 'work', logoUrl: null, allowedDomains: [], groupSize: 2,
  cadence: 'monthly', anchorDay: 1, roundHour: 9, timezone: 'Europe/Amsterdam', nextRoundAt: '2099-10-01T07:00:00Z', inviteToken: 't',
  createdAt: 'c', role: 'member', includeInMatching: true, skipNextRound: false, memberCount: 5, ...over,
})

let store: ReturnType<typeof useWorkspacesStore>
let toast: ReturnType<typeof vi.spyOn>

beforeEach(async () => {
  await (useNuxtApp().$i18n as { setLocale: (l: string) => Promise<void> }).setLocale('uk')
  vi.restoreAllMocks()
  navigateTo.mockReset()
  route.query = {}
  store = useWorkspacesStore()
  store.$reset()
  vi.spyOn(store, 'load').mockResolvedValue()
  toast = vi.spyOn(useToastStore(), 'show')
})

describe('useWorkspaceSettings', () => {
  it('selects from the query or falls back to the first workspace', async () => {
    store.items = [ws(), ws({ id: 'w2', slug: 'friends', name: 'Friends', role: 'owner' })]
    const s = await withSetup(() => useWorkspaceSettings())
    expect(s.selected.value!.slug).toBe('northwind')
    expect(s.isAdmin.value).toBe(false)
    route.query = { ws: 'friends' }
    const f = await withSetup(() => useWorkspaceSettings())
    expect(f.selected.value!.slug).toBe('friends')
    expect(f.isAdmin.value).toBe(true)
    f.selectedSlug.value = 'northwind'
    expect(navigateTo).toHaveBeenCalledWith({ query: { ws: 'northwind' } }, { replace: true })
    route.query = { ws: 'ghost' }
    expect((await withSetup(() => useWorkspaceSettings())).selected.value!.slug).toBe('northwind')
  })

  it('computes next and after-next round dates', async () => {
    store.items = [ws()]
    const s = await withSetup(() => useWorkspaceSettings())
    expect(s.nextDate.value).toBe('1 жовтня')
    expect(s.afterNextDate.value).toBe('1 листопада')
  })

  it('toggles participation with toasts and reports errors', async () => {
    store.items = [ws()]
    const set = vi.spyOn(store, 'setSwitches').mockResolvedValue()
    const s = await withSetup(() => useWorkspaceSettings())
    await s.setInclude(false)
    expect(set).toHaveBeenCalledWith('w1', { includeInMatching: false })
    expect(toast).toHaveBeenLastCalledWith('Пауза. У Northwind ви не отримуватимете пар.')
    await s.setInclude(true)
    expect(toast).toHaveBeenLastCalledWith('Ви знову в розіграші Northwind.')
    await s.setSkip(true)
    expect(toast).toHaveBeenLastCalledWith('Пропускаєте. До зустрічі 1 листопада!')
    await s.setSkip(false)
    expect(toast).toHaveBeenLastCalledWith('Ви в грі 1 жовтня.')
    set.mockRejectedValue(new Error('x'))
    await s.setInclude(true)
    await s.setSkip(true)
    expect(toast).toHaveBeenLastCalledWith('Щось пішло не так. Спробуйте ще раз.', 'error')
  })

  it('leaves, or explains why it cannot', async () => {
    store.items = [ws()]
    const leave = vi.spyOn(store, 'leave').mockResolvedValue()
    const s = await withSetup(() => useWorkspaceSettings())
    s.leaveOpen.value = true
    await s.leave()
    expect(leave).toHaveBeenCalledWith('w1')
    expect(s.leaveOpen.value).toBe(false)
    expect(navigateTo).toHaveBeenCalledWith('/app/workspaces', { replace: true })

    store.items = [ws()]
    leave.mockRejectedValue(new ApiError('transfer ownership before leaving', 'P0001'))
    await s.leave()
    expect(toast).toHaveBeenLastCalledWith('Спершу передайте права власника комусь іншому.', 'error')
  })

  it('does nothing without a workspace', async () => {
    const set = vi.spyOn(store, 'setSwitches')
    const s = await withSetup(() => useWorkspaceSettings())
    await s.setInclude(true)
    await s.setSkip(true)
    await s.leave()
    expect(set).not.toHaveBeenCalled()
    expect(s.status.value).toBeNull()
    expect(s.nextDate.value).toBe('')
    expect(s.afterNextDate.value).toBe('')
  })

  it('ignores a failed load', async () => {
    vi.spyOn(store, 'load').mockRejectedValue(new Error('offline'))
    await withSetup(() => useWorkspaceSettings())
    await flushPromises()
  })
})

describe('WorkspacesView', () => {
  it('shows switches, admin link and the leave dialog', async () => {
    store.items = [ws({ role: 'admin', skipNextRound: true }), ws({ id: 'w2', slug: 'b', name: 'B' })]
    store.loaded = true
    const set = vi.spyOn(store, 'setSwitches').mockResolvedValue()
    const w = await mountSuspended(WorkspacesView, { attachTo: document.body })
    expect(w.text()).toContain('Брати участь у підборі')
    expect(w.text()).toContain('Повернетеся в розіграш')
    expect(w.text()).toContain('Адмін-панель')
    expect(w.findAll('[role=radio]')).toHaveLength(2)
    await w.findAll('[role=switch]')[1]!.trigger('click')
    expect(set).toHaveBeenCalledWith('w1', { skipNextRound: false })
    await w.findAll('[role=switch]')[0]!.trigger('click')
    expect(set).toHaveBeenCalledWith('w1', { includeInMatching: false })
    await w.findAll('button').find((b) => b.text().startsWith('Вийти з'))!.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Вийти з Northwind?')
    w.unmount()
  })

  it('shows the paused hint and the empty state', async () => {
    store.items = [ws({ includeInMatching: false })]
    store.loaded = true
    const w = await mountSuspended(WorkspacesView)
    expect(w.text()).toContain('Спершу ввімкніть участь')
    store.items = []
    const empty = await mountSuspended(WorkspacesView)
    expect(empty.text()).toContain('Ще жодного воркспейсу')
    store.loaded = false
    const loading = await mountSuspended(WorkspacesView)
    expect(loading.find('[aria-busy=true]').exists()).toBe(true)
  })
})
