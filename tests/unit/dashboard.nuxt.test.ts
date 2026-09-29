// @vitest-environment nuxt
import { withSetup } from './helpers/with-setup'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import * as wsApi from '~/api/workspaces'
import CurrentMatchCard from '~/components/CurrentMatchCard.vue'
import NextRoundCard from '~/components/NextRoundCard.vue'
import WorkspaceList from '~/components/WorkspaceList.vue'
import { useDashboard } from '~/composables/use-dashboard'
import { SEEN_MATCHES_KEY, useMatchCard } from '~/composables/use-match-card'
import { useMatchesStore } from '~/stores/matches'
import { useSessionStore } from '~/stores/session'
import { useToastStore } from '~/stores/toast'
import { useWorkspacesStore } from '~/stores/workspaces'
import type { Match, MyWorkspace } from '~/types/domain'
import * as ics from '~/utils/ics'
import DashboardView from '~/views/DashboardView.vue'

const ws = (over: Partial<MyWorkspace> = {}): MyWorkspace => ({
  id: 'w1', name: 'Northwind', slug: 'northwind', kind: 'work', logoUrl: null, allowedDomains: [], groupSize: 2,
  cadence: 'monthly', anchorDay: 1, roundHour: 9, timezone: 'UTC', nextRoundAt: '2099-10-01T09:00:00Z', inviteToken: 't',
  createdAt: 'c', role: 'member', includeInMatching: true, skipNextRound: false, memberCount: 5, ...over,
})
const tomas = {
  id: 'u2', email: 'tomas@nw.com', firstName: 'Tomás', lastName: 'Herrera', jobTitle: 'Data Engineer', department: 'risk',
  city: 'Lisbon', meetingFormat: 'in_person' as const, languages: ['en', 'pt'], interests: ['coffee', 'hiking'], askMeAbout: 'croissants', avatarUrl: null,
}
const match = (over: Partial<Match> = {}): Match => ({ id: 'm1', workspaceId: 'w1', workspaceName: 'Northwind', roundAt: '2026-09-01T07:00:00Z', myFeedback: null, partners: [tomas], ...over })

let session: ReturnType<typeof useSessionStore>
let workspaces: ReturnType<typeof useWorkspacesStore>
let matches: ReturnType<typeof useMatchesStore>

beforeEach(async () => {
  await (useNuxtApp().$i18n as { setLocale: (l: string) => Promise<void> }).setLocale('uk')
  vi.restoreAllMocks()
  localStorage.clear()
  session = useSessionStore()
  session.session = { user: { id: 'u1', email: 'olena@nw.com' } } as never
  session.profile = { firstName: 'Olena', lastName: 'Koval', department: 'payments', interests: ['hiking'], avatarUrl: null } as never
  workspaces = useWorkspacesStore()
  matches = useMatchesStore()
  workspaces.$reset()
  matches.$reset()
})

describe('useMatchCard', () => {
  it('shapes partners with shared interests first, starters and a mailto', async () => {
    workspaces.items = [ws()]
    const c = await withSetup(() => useMatchCard(match()))
    expect(c.month.value).toBe('вересень')
    expect(c.partners.value[0]!.chips).toEqual([{ label: 'Походи', shared: true }, { label: 'Кава', shared: false }])
    expect(c.partners.value[0]!.role).toBe('Data Engineer, Ризики')
    expect(c.starters.value[0]).toBe('Ви обоє вказали «Походи». Як ви до цього прийшли?')
    expect(c.starters.value[1]).toContain('Ризики')
    expect(c.emailHref.value).toMatch(/^mailto:tomas%40nw\.com\?subject=/)
    expect(c.kind.value).toBe('work')
  })

  it('handles friends workspaces, no partners and a missing profile', async () => {
    session.profile = null
    const c = await withSetup(() => useMatchCard(match({ partners: [] })))
    expect(c.starters.value).toEqual([])
    expect(c.kind.value).toBe('work')
    workspaces.items = [ws({ kind: 'friends' })]
    const f = await withSetup(() => useMatchCard(match()))
    expect(f.starters.value.some((s) => s.includes('Ризики'))).toBe(false)
  })

  it('remembers seen matches', async () => {
    const c = await withSetup(() => useMatchCard(match()))
    expect(c.isNew.value).toBe(true)
    c.markSeen()
    c.markSeen()
    await flushPromises()
    expect(JSON.parse(localStorage.getItem(SEEN_MATCHES_KEY)!)).toEqual(['m1'])
    expect(c.isNew.value).toBe(false)
  })

  it('downloads a calendar invite and sends feedback with toasts', async () => {
    const download = vi.spyOn(ics, 'downloadFile').mockImplementation(() => undefined)
    const toast = vi.spyOn(useToastStore(), 'show')
    const c = await withSetup(() => useMatchCard(match()))
    c.addToCalendar()
    expect(download.mock.calls[0]![0]).toBe('nakavu-m1.ics')
    expect(download.mock.calls[0]![1]).toContain('SUMMARY:Кава з Tomás')

    vi.spyOn(matches, 'setFeedback').mockResolvedValue()
    await c.setFeedback('met')
    expect(toast).toHaveBeenLastCalledWith('Чудово! Дякуємо, що розповіли.', 'success')
    await c.setFeedback('not_yet')
    expect(toast).toHaveBeenLastCalledWith('Гаразд, нагадаємо згодом.', 'default')
    vi.spyOn(matches, 'setFeedback').mockRejectedValue(new Error('x'))
    await c.setFeedback('met')
    expect(toast).toHaveBeenLastCalledWith('Щось пішло не так. Спробуйте ще раз.', 'error')
  })
})

describe('dashboard components', () => {
  it('CurrentMatchCard reveals a new match, then shows the card and feedback', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    matches.items = [match()]
    const set = vi.spyOn(matches, 'setFeedback').mockResolvedValue()
    const w = await mountSuspended(CurrentMatchCard, { props: { match: match(), decoys: ['Ann Lee'] } })
    expect(w.text()).toContain('Крутимо рулетку')
    await vi.advanceTimersByTimeAsync(6000)
    await flushPromises()
    expect(w.text()).toContain('Tomás Herrera')
    expect(w.text()).toContain('З чого почати розмову')
    await w.findAll('[role=radio]')[0]!.trigger('click')
    await flushPromises()
    expect(set).toHaveBeenCalledWith('m1', 'met')
    vi.useRealTimers()
  })

  it('CurrentMatchCard skips the reveal for seen matches and handles trios', async () => {
    localStorage.setItem(SEEN_MATCHES_KEY, JSON.stringify(['m1']))
    vi.spyOn(ics, 'downloadFile').mockImplementation(() => undefined)
    const trio = match({ partners: [tomas, { ...tomas, id: 'u3', firstName: 'Ann', lastName: 'Lee', email: 'ann@nw.com' }] })
    const w = await mountSuspended(CurrentMatchCard, { props: { match: trio, decoys: [] } })
    expect(w.text()).not.toContain('Крутимо рулетку')
    expect(w.text()).toContain('Написати: Tomás & Ann')
    await w.findAll('button').find((b) => b.text() === 'Додати в календар')!.trigger('click')
    expect(ics.downloadFile).toHaveBeenCalled()
    await w.findAll('[role=radio]')[1]!.trigger('click')
  })

  it('NextRoundCard counts down to the round', async () => {
    const w = await mountSuspended(NextRoundCard, { props: { workspace: ws({ skipNextRound: true }) } })
    expect(w.text()).toContain('Наступна пара через')
    expect(w.text()).toContain('Ви пропускаєте цей раунд.')
  })

  it('WorkspaceList pluralises members in Ukrainian', async () => {
    const w = await mountSuspended(WorkspaceList, { props: { workspaces: [ws({ memberCount: 1 }), ws({ id: 'w2', memberCount: 3, includeInMatching: false }), ws({ id: 'w3', memberCount: 12, role: 'owner' })] } })
    expect(w.text()).toContain('1 учасник · Учасник')
    expect(w.text()).toContain('3 учасники')
    expect(w.text()).toContain('12 учасників · Власник')
    expect(w.text()).toContain('Пауза')
  })
})

describe('DashboardView', () => {
  const loadAll = (items: MyWorkspace[], list: Match[]) => {
    vi.spyOn(workspaces, 'load').mockImplementation(async () => {
      workspaces.items = items
      workspaces.loaded = true
    })
    vi.spyOn(matches, 'load').mockImplementation(async () => {
      matches.items = list
      matches.loaded = true
    })
    vi.spyOn(wsApi, 'listCoworkerNames').mockResolvedValue(['Tomás Herrera', 'Ann Lee'])
  }

  it('greets and shows the empty state without workspaces', async () => {
    loadAll([], [])
    const w = await mountSuspended(DashboardView)
    await flushPromises()
    expect(w.find('h1').text()).toMatch(/Olena$/)
    expect(w.text()).toContain('Ще жодного воркспейсу')
  })

  it('waits for the first round', async () => {
    loadAll([ws()], [])
    const w = await mountSuspended(DashboardView)
    await flushPromises()
    expect(w.text()).toContain('Пари ще немає')
    expect(w.text()).toContain('Наступний раунд')
  })

  it('explains when paused everywhere', async () => {
    loadAll([ws({ includeInMatching: false })], [])
    const w = await mountSuspended(DashboardView)
    await flushPromises()
    expect(w.text()).toContain('Ви на паузі в усіх воркспейсах')
  })

  it('shows current matches with decoys that exclude the partner', async () => {
    localStorage.setItem(SEEN_MATCHES_KEY, JSON.stringify(['m1']))
    loadAll([ws()], [match(), match({ id: 'gone', workspaceId: 'left' })])
    const w = await mountSuspended(DashboardView)
    await flushPromises()
    expect(w.text()).toContain('Кава цього місяця вже чекає')
    expect(w.findAllComponents(CurrentMatchCard)).toHaveLength(1)
    expect(wsApi.listCoworkerNames).toHaveBeenCalledWith('w1')
  })

  it('loads decoys once and survives a failed lookup, even without a profile', async () => {
    session.profile = null
    loadAll([ws()], [match()])
    vi.mocked(wsApi.listCoworkerNames).mockRejectedValueOnce(new Error('rls'))
    const d = await withSetup(() => useDashboard())
    await flushPromises()
    expect(d.firstName.value).toBe('')
    expect(d.decoys.w1).toEqual([])
    await d.load()
    expect(wsApi.listCoworkerNames).toHaveBeenCalledTimes(1)
    const c = await withSetup(() => useMatchCard(match()))
    expect(c.emailHref.value).toContain('body=')
  })

  it('stays on the skeleton if loading fails', async () => {
    vi.spyOn(workspaces, 'load').mockRejectedValue(new Error('offline'))
    vi.spyOn(matches, 'load').mockResolvedValue()
    const d = await withSetup(() => useDashboard())
    await flushPromises()
    expect(d.state.value).toBe('loading')
    expect(d.nextRound.value).toBeNull()
  })

  it('shows a skeleton while loading', async () => {
    vi.spyOn(workspaces, 'load').mockReturnValue(new Promise(() => undefined))
    vi.spyOn(matches, 'load').mockReturnValue(new Promise(() => undefined))
    const w = await mountSuspended(DashboardView)
    expect(w.find('[aria-busy=true]').exists()).toBe(true)
  })
})
