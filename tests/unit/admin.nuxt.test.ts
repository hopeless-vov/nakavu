// @vitest-environment nuxt
import { withSetup } from './helpers/with-setup'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises, mount } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import * as wsApi from '~/api/workspaces'
import BarChart from '~/components/ui/BarChart.vue'
import StatTile from '~/components/ui/StatTile.vue'
import WorkspaceSettingsForm from '~/components/WorkspaceSettingsForm.vue'
import { PAGE_SIZE, useAdmin } from '~/composables/use-admin'
import { useSessionStore } from '~/stores/session'
import { useToastStore } from '~/stores/toast'
import { useWorkspacesStore } from '~/stores/workspaces'
import type { Member, MyWorkspace, WorkspaceStats } from '~/types/domain'
import WorkspaceAdminView from '~/views/WorkspaceAdminView.vue'

const { navigateTo, route } = vi.hoisted(() => ({ navigateTo: vi.fn(), route: { params: { slug: 'northwind' } as Record<string, string>, query: {}, fullPath: '/' } }))
mockNuxtImport('navigateTo', () => navigateTo)
mockNuxtImport('useRoute', () => () => route)

const ws = (over: Partial<MyWorkspace> = {}): MyWorkspace => ({
  id: 'w1', name: 'Northwind', slug: 'northwind', kind: 'work', logoUrl: null, allowedDomains: [], groupSize: 2,
  cadence: 'monthly', anchorDay: 1, roundHour: 9, timezone: 'Europe/Amsterdam', nextRoundAt: '2099-10-01T07:00:00Z', inviteToken: 't',
  createdAt: 'c', role: 'owner', includeInMatching: true, skipNextRound: false, memberCount: 3, ...over,
})
const member = (id: string, over: Partial<Member> = {}): Member => ({
  userId: id, role: 'member', includeInMatching: true, skipNextRound: false, joinedAt: '',
  person: { id, email: `${id}@nw.com`, firstName: id.toUpperCase(), lastName: 'Test', jobTitle: 'Engineer', department: 'risk', city: 'Kyiv', meetingFormat: 'both', languages: [], interests: [], askMeAbout: '', avatarUrl: null },
  ...over,
})
const stats: WorkspaceStats = {
  members: 3, active: 1, paused: 1, skipping: 1,
  rounds: [
    { scheduledFor: '2026-08-01T07:00:00Z', participantCount: 4, answered: 4, met: 2 },
    { scheduledFor: '2026-09-01T07:00:00Z', participantCount: 0, answered: 0, met: 0 },
  ],
}

let store: ReturnType<typeof useWorkspacesStore>
let toast: ReturnType<typeof vi.spyOn>

beforeEach(async () => {
  await (useNuxtApp().$i18n as { setLocale: (l: string) => Promise<void> }).setLocale('uk')
  vi.restoreAllMocks()
  navigateTo.mockReset()
  route.params = { slug: 'northwind' }
  useSessionStore().session = { user: { id: 'me' } } as never
  store = useWorkspacesStore()
  store.$reset()
  store.items = [ws()]
  vi.spyOn(store, 'load').mockResolvedValue()
  vi.spyOn(wsApi, 'getWorkspaceStats').mockResolvedValue(stats)
  vi.spyOn(wsApi, 'listMembers').mockResolvedValue([member('me', { role: 'owner' }), member('ann', { includeInMatching: false }), member('bo', { role: 'admin', skipNextRound: true })])
  toast = vi.spyOn(useToastStore(), 'show')
})

describe('useAdmin', () => {
  it('loads stats, bars and members', async () => {
    const a = await withSetup(() => useAdmin())
    await flushPromises()
    expect(a.state.value).toBe('ready')
    expect(a.bars.value.map((b) => b.value)).toEqual([0.5, 0])
    expect(a.bars.value[0]!.detail).toBe('2 з 4 зустрілися')
    expect(a.lastMet.value!.label).toBe('вер.')
    expect(a.visible.value.find((m) => m.userId === 'me')!.isMe).toBe(true)
    expect(a.visible.value.find((m) => m.userId === 'ann')!.status.status).toBe('paused')
    expect(a.visible.value[0]!.subtitle).toBe('Engineer, Ризики · Kyiv')
  })

  it('has no bars before loading and falls back to the email for nameless members', async () => {
    vi.mocked(wsApi.listMembers).mockResolvedValue([member('x', { person: { ...member('x').person, firstName: '', lastName: '' } })])
    let release!: () => void
    vi.mocked(store.load).mockReturnValue(new Promise<void>((r) => (release = r)))
    const a = await withSetup(() => useAdmin())
    expect(a.bars.value).toEqual([])
    release()
    await flushPromises()
    expect(a.visible.value[0]!.name).toBe('x@nw.com')
  })

  it('searches members and pages results', async () => {
    const a = await withSetup(() => useAdmin())
    await flushPromises()
    a.query.value = 'ann'
    expect(a.filtered.value.map((m) => m.userId)).toEqual(['ann'])
    await flushPromises()
    a.limit.value = 1
    a.query.value = ''
    await flushPromises()
    expect(a.limit.value).toBe(PAGE_SIZE)
  })

  it('refuses non-admins and unknown workspaces, and reports load errors', async () => {
    store.items = [ws({ role: 'member' })]
    const a = await withSetup(() => useAdmin())
    await flushPromises()
    expect(a.state.value).toBe('forbidden')
    route.params = { slug: 'ghost' }
    const g = await withSetup(() => useAdmin())
    await flushPromises()
    expect(g.state.value).toBe('forbidden')
    route.params = { slug: 'northwind' }
    store.items = [ws()]
    vi.mocked(wsApi.getWorkspaceStats).mockRejectedValue(new Error('x'))
    vi.mocked(store.load).mockRejectedValue(new Error('offline'))
    const e = await withSetup(() => useAdmin())
    await flushPromises()
    expect(e.state.value).toBe('error')
  })

  it('changes roles, removes members and deletes the workspace', async () => {
    const a = await withSetup(() => useAdmin())
    await flushPromises()
    vi.spyOn(wsApi, 'setMemberRole').mockResolvedValue()
    vi.spyOn(wsApi, 'removeMember').mockResolvedValue()
    vi.spyOn(store, 'remove').mockResolvedValue()
    await a.setRole('ann', 'admin')
    expect(a.members.value.find((m) => m.userId === 'ann')!.role).toBe('admin')
    expect(toast).toHaveBeenLastCalledWith('Роль змінено: Адмін.')
    await a.remove('ann')
    expect(a.members.value.map((m) => m.userId)).toEqual(['me', 'bo'])
    await a.deleteWorkspace()
    expect(navigateTo).toHaveBeenCalledWith('/app/workspaces', { replace: true })
  })

  it('reports action errors', async () => {
    const a = await withSetup(() => useAdmin())
    await flushPromises()
    vi.spyOn(wsApi, 'setMemberRole').mockRejectedValue(new Error('x'))
    vi.spyOn(wsApi, 'removeMember').mockRejectedValue(new Error('x'))
    vi.spyOn(store, 'remove').mockRejectedValue(new Error('x'))
    await a.setRole('ann', 'admin')
    await a.remove('ann')
    await a.deleteWorkspace()
    expect(toast).toHaveBeenCalledTimes(3)
    expect(navigateTo).not.toHaveBeenCalled()
  })
})

describe('admin ui', () => {
  it('BarChart shows bars, tooltips and a table', async () => {
    const w = mount(BarChart, { props: { title: 'Participation', bars: [{ label: 'Aug', value: 0.5, detail: '2 of 4' }, { label: 'Sep', value: 0.75, detail: '3 of 4' }] } })
    expect(w.find('table').text()).toContain('50%')
    const first = w.findAll('.group')[0]!
    await first.trigger('mouseenter')
    expect(w.text()).toContain('2 of 4')
    await first.trigger('mouseleave')
    expect(w.find('.bg-ink').exists()).toBe(false)
    expect(mount(BarChart, { props: { title: 'x', bars: [], emptyLabel: 'Nothing yet' } }).text()).toContain('Nothing yet')
  })

  it('StatTile renders plain and accent', () => {
    expect(mount(StatTile, { props: { label: 'Members', value: '12', hint: 'h' } }).text()).toContain('12')
    expect(mount(StatTile, { props: { label: 'Met', value: '78%', accent: true } }).classes()).toContain('bg-accent-soft')
  })

  it('WorkspaceSettingsForm saves and guards deletion by name', async () => {
    const update = vi.spyOn(store, 'update').mockResolvedValue(ws())
    const w = await mountSuspended(WorkspaceSettingsForm, { props: { workspace: ws(), canDelete: true }, attachTo: document.body })
    expect((w.find('input').element as HTMLInputElement).value).toBe('Northwind')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(update).toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('Налаштування збережено.', 'success')

    await w.findAll('button').find((b) => b.text() === 'Видалити')!.trigger('click')
    await flushPromises()
    const confirm = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Видалити назавжди'))!
    expect(confirm.disabled).toBe(true)
    const input = document.querySelector('[role=dialog] input') as HTMLInputElement
    input.value = 'Northwind'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    expect(confirm.disabled).toBe(false)
    confirm.click()
    expect(w.emitted('delete')).toHaveLength(1)
    ;([...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Скасувати') as HTMLButtonElement).click()
    w.unmount()
  })

  it('WorkspaceSettingsForm hides deletion for admins and shows save errors', async () => {
    vi.spyOn(store, 'update').mockRejectedValue(new Error('x'))
    const w = await mountSuspended(WorkspaceSettingsForm, { props: { workspace: ws({ role: 'admin' }), canDelete: false } })
    expect(w.text()).not.toContain('Видалити воркспейс')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Щось пішло не так')
  })
})

describe('WorkspaceAdminView', () => {
  it('shows overview, members with actions and settings tabs', async () => {
    vi.spyOn(wsApi, 'setMemberRole').mockResolvedValue()
    const w = await mountSuspended(WorkspaceAdminView, { attachTo: document.body })
    await flushPromises()
    expect(w.text()).toContain('Адмін-панель')
    expect(w.text()).toContain('Участь')
    expect(w.text()).toContain('пауза: 1 · пропуск: 1')
    const tabs = w.findAll('[role=radio]')
    await tabs[1]!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('(ви)')
    expect(w.text()).toContain('Показано 3 з 3')
    const trigger = w.find('button[aria-label="Дії для ANN Test"]')
    await trigger.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    ;([...document.querySelectorAll('[role=menuitem]')] as HTMLElement[])[0]!.click()
    await flushPromises()
    expect(wsApi.setMemberRole).toHaveBeenCalledWith('w1', 'ann', 'admin')
    await tabs[2]!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Як підбираємо')
    w.unmount()
  })

  it('pages long member lists and removes from the menu', async () => {
    vi.mocked(wsApi.listMembers).mockResolvedValue(Array.from({ length: PAGE_SIZE + 5 }, (_, i) => member(`m${i}`, { role: i === 0 ? 'admin' : 'member' })))
    vi.spyOn(wsApi, 'removeMember').mockResolvedValue()
    vi.spyOn(wsApi, 'setMemberRole').mockResolvedValue()
    const w = await mountSuspended(WorkspaceAdminView, { attachTo: document.body })
    await flushPromises()
    await w.findAll('[role=radio]')[1]!.trigger('click')
    await flushPromises()
    await w.findAll('button').find((b) => b.text() === 'Показати ще')!.trigger('click')
    expect(w.text()).toContain(`Показано ${PAGE_SIZE + 5} з ${PAGE_SIZE + 5}`)
    await w.find('button[aria-label="Дії для M0 Test"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    const items = [...document.querySelectorAll('[role=menuitem]')] as HTMLElement[]
    expect(items[0]!.textContent).toContain('Зробити учасником')
    items[1]!.click()
    await flushPromises()
    expect(wsApi.removeMember).toHaveBeenCalledWith('w1', 'm0')
    w.unmount()
  })

  it('renders forbidden, error and loading states', async () => {
    store.items = [ws({ role: 'member' })]
    const f = await mountSuspended(WorkspaceAdminView)
    await flushPromises()
    expect(f.text()).toContain('лише для адмінів')

    store.items = [ws()]
    vi.mocked(wsApi.getWorkspaceStats).mockRejectedValue(new Error('x'))
    const e = await mountSuspended(WorkspaceAdminView)
    await flushPromises()
    expect(e.text()).toContain('Спробувати ще раз')
    vi.mocked(wsApi.getWorkspaceStats).mockResolvedValue({ ...stats, rounds: [] })
    await e.find('button').trigger('click')
    await flushPromises()
    expect(e.text()).toContain('Ще не було раундів')

    vi.mocked(store.load).mockReturnValue(new Promise(() => undefined))
    const l = await mountSuspended(WorkspaceAdminView)
    expect(l.find('[aria-busy=true]').exists()).toBe(true)
  })
})
