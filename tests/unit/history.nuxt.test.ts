// @vitest-environment nuxt
import { withSetup } from './helpers/with-setup'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import { ALL, useHistory } from '~/composables/use-history'
import { useMatchesStore } from '~/stores/matches'
import { useToastStore } from '~/stores/toast'
import type { Match } from '~/types/domain'
import HistoryView from '~/views/HistoryView.vue'

const person = (id: string, firstName: string) => ({
  id, email: `${id}@x.io`, firstName, lastName: 'L', jobTitle: 'Engineer', department: 'data', city: '', meetingFormat: 'both' as const,
  languages: ['en'], interests: [], askMeAbout: '', avatarUrl: null,
})
const list: Match[] = [
  { id: 'm3', workspaceId: 'w1', workspaceName: 'Northwind', roundAt: '2026-09-01T07:00:00Z', myFeedback: 'met', partners: [person('a', 'Amara')] },
  { id: 'm2', workspaceId: 'w2', workspaceName: 'Friends', roundAt: '2026-08-01T07:00:00Z', myFeedback: null, partners: [person('b', 'Rahul'), person('c', 'Chloé')] },
  { id: 'm1', workspaceId: 'w1', workspaceName: 'Northwind', roundAt: '2026-06-01T07:00:00Z', myFeedback: 'skipped', partners: [] },
]

const { navigateTo, route } = vi.hoisted(() => ({ navigateTo: vi.fn(), route: { query: {} as Record<string, string>, params: {}, fullPath: '/app/history' } }))
mockNuxtImport('navigateTo', () => navigateTo)
mockNuxtImport('useRoute', () => () => route)

let matches: ReturnType<typeof useMatchesStore>

beforeEach(async () => {
  await (useNuxtApp().$i18n as { setLocale: (l: string) => Promise<void> }).setLocale('uk')
  vi.restoreAllMocks()
  navigateTo.mockReset()
  route.query = {}
  matches = useMatchesStore()
  matches.$reset()
  vi.spyOn(matches, 'load').mockImplementation(async () => {
    matches.items = list
    matches.loaded = true
  })
})

describe('useHistory', () => {
  it('lists, filters and summarises matches', async () => {
    const h = await withSetup(() => useHistory())
    await flushPromises()
    expect(h.items.value).toHaveLength(3)
    expect(h.items.value[1]!.names).toBe('Rahul L & Chloé L')
    expect(h.items.value[1]!.roles).toBe('Engineer, Дані · Engineer, Дані')
    expect(h.items.value[0]!.month).toContain('вересень')
    expect(h.summary.value).toBe('3 кави з 1 червня 2026 р., відбулося: 1.')
    expect(h.workspaces.value).toEqual([{ value: 'w1', label: 'Northwind' }, { value: 'w2', label: 'Friends' }])
    h.filter.value = 'w2'
    expect(h.items.value.map((m) => m.id)).toEqual(['m2'])
    h.filter.value = 'none'
    expect(h.summary.value).toBe('')
    h.filter.value = ALL
  })

  it('saves feedback and shows errors', async () => {
    const h = await withSetup(() => useHistory())
    const set = vi.spyOn(matches, 'setFeedback').mockResolvedValue()
    await h.setFeedback('m2', 'met')
    expect(set).toHaveBeenCalledWith('m2', 'met')
    const toast = vi.spyOn(useToastStore(), 'show')
    set.mockRejectedValue(new Error('x'))
    await h.setFeedback('m2', 'met')
    expect(toast).toHaveBeenCalledWith('Щось пішло не так. Спробуйте ще раз.', 'error')
  })

  it('applies an answer from the email link, then clears the query', async () => {
    route.query = { match: 'm2', answer: 'met' }
    const set = vi.spyOn(matches, 'setFeedback').mockResolvedValue()
    const toast = vi.spyOn(useToastStore(), 'show')
    await withSetup(() => useHistory())
    await flushPromises()
    expect(set).toHaveBeenCalledWith('m2', 'met')
    expect(toast).toHaveBeenCalledWith('Чудово! Дякуємо, що розповіли.', 'success')
    expect(navigateTo).toHaveBeenCalledWith({ query: {} }, { replace: true })
    route.query = { match: 'm2', answer: 'not_yet' }
    await withSetup(() => useHistory())
    await flushPromises()
    expect(toast).toHaveBeenLastCalledWith('Гаразд, нагадаємо згодом.', 'default')
    route.query = { match: 'm2', answer: 'hack' }
    await withSetup(() => useHistory())
    await flushPromises()
    expect(set).toHaveBeenCalledTimes(2)
  })

  it('ignores a failed load', async () => {
    vi.spyOn(matches, 'load').mockRejectedValue(new Error('offline'))
    await withSetup(() => useHistory())
    await flushPromises()
    expect(matches.loaded).toBe(false)
  })
})

describe('HistoryView', () => {
  it('renders items, filters and answers', async () => {
    const set = vi.spyOn(matches, 'setFeedback').mockResolvedValue()
    const w = await mountSuspended(HistoryView)
    await flushPromises()
    expect(w.text()).toContain('Історія зустрічей')
    expect(w.text()).toContain('Amara L')
    expect(w.text()).toContain('Учасник вийшов')
    expect(w.findAll('[role=radiogroup]')[0]!.findAll('[role=radio]').map((r) => r.text())).toEqual(['Усі', 'Northwind', 'Friends'])
    const second = w.findAll('li')[1]!
    await second.findAll('[role=radio]')[0]!.trigger('click')
    expect(set).toHaveBeenCalledWith('m2', 'met')
  })

  it('shows loading and empty states', async () => {
    vi.spyOn(matches, 'load').mockReturnValue(new Promise(() => undefined))
    const loading = await mountSuspended(HistoryView)
    expect(loading.find('[aria-busy=true]').exists()).toBe(true)
    matches.loaded = true
    matches.items = []
    const empty = await mountSuspended(HistoryView)
    expect(empty.text()).toContain('Поки порожньо')
  })
})
