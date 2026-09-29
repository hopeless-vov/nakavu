// @vitest-environment nuxt
import { withSetup } from './helpers/with-setup'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import * as invitesApi from '~/api/invites'
import { ApiError } from '~/api/supabase'
import * as wsApi from '~/api/workspaces'
import WorkspaceFormFields from '~/components/WorkspaceFormFields.vue'
import { useInvites } from '~/composables/use-invites'
import { useJoin } from '~/composables/use-join'
import { injectWorkspaceForm, provideWorkspaceForm, useWorkspaceForm } from '~/composables/use-workspace-form'
import { useSessionStore } from '~/stores/session'
import { useWorkspacesStore } from '~/stores/workspaces'
import type { MyWorkspace } from '~/types/domain'
import JoinView from '~/views/JoinView.vue'
import WorkspaceCreateView from '~/views/WorkspaceCreateView.vue'
import WorkspaceInviteView from '~/views/WorkspaceInviteView.vue'
import { defineComponent, h } from 'vue'

const { navigateTo, route } = vi.hoisted(() => ({ navigateTo: vi.fn(), route: { params: {} as Record<string, string>, query: {} as Record<string, string>, fullPath: '/' } }))
mockNuxtImport('navigateTo', () => navigateTo)
mockNuxtImport('useRoute', () => () => route)

const ws = (over: Partial<MyWorkspace> = {}): MyWorkspace => ({
  id: 'w1', name: 'Northwind', slug: 'northwind', kind: 'work', logoUrl: null, allowedDomains: ['nw.com'], groupSize: 2,
  cadence: 'monthly', anchorDay: 1, roundHour: 9, timezone: 'Europe/Amsterdam', nextRoundAt: '2099-10-01T07:00:00Z', inviteToken: 'tok123',
  createdAt: 'c', role: 'owner', includeInMatching: true, skipNextRound: false, memberCount: 1, ...over,
})
const preview = { id: 'w1', name: 'Northwind', slug: 'northwind', kind: 'work' as const, logoUrl: null, memberCount: 12, allowedDomains: ['nw.com'], nextRoundAt: '2099-10-01T07:00:00Z', invitedEmail: null }

let session: ReturnType<typeof useSessionStore>
let store: ReturnType<typeof useWorkspacesStore>

beforeEach(async () => {
  await (useNuxtApp().$i18n as { setLocale: (l: string) => Promise<void> }).setLocale('uk')
  vi.restoreAllMocks()
  navigateTo.mockReset()
  route.params = {}
  route.query = {}
  session = useSessionStore()
  session.session = { user: { id: 'u1', email: 'olena@nw.com' } } as never
  session.profile = { onboardedAt: '2026-01-01' } as never
  vi.spyOn(session, 'init').mockResolvedValue()
  store = useWorkspacesStore()
  store.$reset()
})

describe('useWorkspaceForm', () => {
  it('previews upcoming rounds and resets the day when the cadence family changes', async () => {
    const f = await withSetup(() => useWorkspaceForm({ timezone: 'Europe/Kyiv' }))
    expect(f.upcoming.value).toHaveLength(3)
    f.draft.anchorDay = 15
    f.draft.cadence = 'weekly'
    await flushPromises()
    expect(f.draft.anchorDay).toBe(1)
    f.draft.anchorDay = 5
    f.draft.cadence = 'biweekly'
    await flushPromises()
    expect(f.draft.anchorDay).toBe(5)
  })

  it('manages domains and clears them for friends', async () => {
    const f = await withSetup(() => useWorkspaceForm())
    f.domainInput.value = '@Acme.com'
    f.addDomain()
    f.domainInput.value = 'acme.com'
    f.addDomain()
    expect(f.draft.allowedDomains).toEqual(['acme.com'])
    f.domainInput.value = 'nope'
    f.addDomain()
    expect(f.errors.value.domain).toBe('workspaceForm.errors.domain')
    f.domainInput.value = ''
    f.addDomain()
    f.removeDomain('acme.com')
    expect(f.draft.allowedDomains).toEqual([])
    f.draft.allowedDomains = ['x.com']
    f.draft.kind = 'friends'
    await flushPromises()
    expect(f.draft.allowedDomains).toEqual([])
  })

  it('keeps settings when nothing relevant changes', async () => {
    const f = await withSetup(() => useWorkspaceForm({ name: 'A', allowedDomains: ['a.com'] }))
    f.draft.anchorDay = 12
    f.draft.cadence = 'quarterly'
    f.draft.kind = 'work'
    await flushPromises()
    expect(f.draft.anchorDay).toBe(12)
    f.draft.kind = 'friends'
    await flushPromises()
    f.draft.kind = 'work'
    await flushPromises()
    expect(f.draft.allowedDomains).toEqual([])
    vi.spyOn(store, 'update').mockResolvedValue(ws())
    const upload = vi.spyOn(store, 'uploadLogo')
    expect(await f.save('w1')).toBe(true)
    expect(upload).not.toHaveBeenCalled()
  })

  it('validates the name', async () => {
    const f = await withSetup(() => useWorkspaceForm())
    expect(f.validate()).toBe(false)
    expect(f.errors.value.name).toBe('workspaceForm.errors.name')
    f.draft.name = 'x'.repeat(81)
    expect(f.validate()).toBe(false)
    expect(f.errors.value.name).toBe('workspaceForm.errors.nameLong')
    expect(await f.create()).toBeNull()
    expect(await f.save('w1')).toBe(false)
  })

  it('creates with the next round and uploads the logo (ignoring logo failures)', async () => {
    const create = vi.spyOn(store, 'create').mockResolvedValue(ws())
    const upload = vi.spyOn(store, 'uploadLogo').mockRejectedValue(new Error('storage'))
    const f = await withSetup(() => useWorkspaceForm())
    f.draft.name = '  Northwind  '
    f.domainInput.value = 'nw.com'
    f.logo.value = new File(['x'], 'l.png')
    expect((await f.create())!.id).toBe('w1')
    const input = create.mock.calls[0]![0]
    expect(input.name).toBe('Northwind')
    expect(input.allowedDomains).toEqual(['nw.com'])
    expect(new Date(input.nextRoundAt).getTime()).toBeGreaterThan(Date.now())
    expect(upload).toHaveBeenCalled()
  })

  it('reports create and save errors, and saves edits', async () => {
    vi.spyOn(store, 'create').mockRejectedValue(new ApiError('x', '42501'))
    const f = await withSetup(() => useWorkspaceForm({ name: 'A' }))
    expect(await f.create()).toBeNull()
    expect(f.errors.value.form).toBe('errors.forbidden')

    const update = vi.spyOn(store, 'update').mockResolvedValue(ws())
    const upload = vi.spyOn(store, 'uploadLogo').mockResolvedValue(ws())
    f.logo.value = new File(['x'], 'l.png')
    expect(await f.save('w1')).toBe(true)
    expect(update).toHaveBeenCalled()
    expect(upload).toHaveBeenCalled()
    update.mockRejectedValue(new Error('x'))
    expect(await f.save('w1')).toBe(false)
    expect(f.errors.value.form).toBe('common.somethingWrong')
  })

  it('needs a provider for the fields component', async () => {
    await expect(withSetup(() => injectWorkspaceForm())).rejects.toThrow('provideWorkspaceForm')
  })
})

describe('WorkspaceFormFields', () => {
  it('edits name, kind, size, cadence, day, hour and zone', async () => {
    const form = await withSetup(() => useWorkspaceForm({ timezone: 'Europe/Kyiv' }))
    const w = await mountSuspended(defineComponent({ setup: () => (provideWorkspaceForm(form), () => h(WorkspaceFormFields)) }))
    await w.find('input').setValue('Guild')
    expect(form.draft.name).toBe('Guild')
    const radio = (label: string) => w.findAll('[role=radio]').find((r) => r.text().includes(label))!
    await radio('Трійки').trigger('click')
    expect(form.draft.groupSize).toBe(3)
    await radio('Щотижня').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('День тижня')
    const selects = w.findAll('select')
    await selects[0]!.setValue('3')
    await selects[1]!.setValue('18')
    expect(form.draft.anchorDay).toBe(3)
    expect(form.draft.roundHour).toBe(18)
    form.domainInput.value = 'acme.com'
    await flushPromises()
    await w.findAll('input').find((i) => i.attributes('placeholder')?.includes('домен'))!.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(w.text()).toContain('@acme.com')
    await w.find('button[aria-label="Прибрати"]').trigger('click')
    expect(form.draft.allowedDomains).toEqual([])
    await radio('Друзі').trigger('click')
    await flushPromises()
    expect(w.text()).not.toContain('Дозволені домени')
  })
})

describe('WorkspaceCreateView', () => {
  it('creates and goes to the invite step', async () => {
    vi.spyOn(store, 'create').mockResolvedValue(ws())
    const w = await mountSuspended(WorkspaceCreateView)
    expect(w.text()).toContain('Найближчі раунди')
    await w.find('input').setValue('Northwind')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(navigateTo).toHaveBeenCalledWith('/app/workspaces/northwind/invite')
  })

  it('shows errors and does not navigate', async () => {
    vi.spyOn(store, 'create').mockRejectedValue(new ApiError('x', '42501'))
    const w = await mountSuspended(WorkspaceCreateView)
    await w.find('input').setValue('N')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('На це немає прав.')
    expect(navigateTo).not.toHaveBeenCalled()
  })
})

describe('useInvites', () => {
  it('builds the link, copies, shares and sends invites', async () => {
    vi.spyOn(invitesApi, 'createInvites').mockResolvedValue([])
    vi.spyOn(invitesApi, 'listInvites').mockResolvedValue([{ id: 'i1', email: 'a@nw.com', createdAt: '', expiresAt: '', acceptedAt: null }])
    vi.spyOn(invitesApi, 'revokeInvite').mockResolvedValue()
    const inv = await withSetup(() => useInvites(ws()))
    expect(inv.link.value).toBe('http://localhost:3000/join/tok123')

    inv.emailsText.value = 'a@nw.com, bad@x'
    await inv.send()
    expect(invitesApi.createInvites).toHaveBeenCalledWith('w1', ['a@nw.com'], 'u1')
    expect(inv.sentCount.value).toBe(1)
    expect(inv.emailsText.value).toBe('bad@x')
    expect(inv.pending.value).toHaveLength(1)
    await inv.revoke('i1')
    expect(inv.pending.value).toEqual([])

    inv.emailsText.value = ''
    await inv.send()
    expect(inv.error.value).toBe('invite.errors.none')

    const shareFn = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { share: shareFn })
    expect(await inv.share('N', 'Join')).toBe(true)
    expect(shareFn).toHaveBeenCalledWith({ title: 'N', text: 'Join', url: inv.link.value })
    shareFn.mockRejectedValueOnce(new Error('AbortError'))
    expect(await inv.share('N', 'Join')).toBe(true)
    Object.assign(navigator, { share: undefined })
    expect(await inv.share('N', 'Join')).toBe(false)
  })

  it('handles errors, rotation and a missing workspace', async () => {
    vi.spyOn(invitesApi, 'createInvites').mockRejectedValue(new ApiError('x', '42501'))
    const rotate = vi.spyOn(store, 'rotateInvite').mockResolvedValue('new')
    const inv = await withSetup(() => useInvites(ws()))
    inv.emailsText.value = 'a@nw.com'
    await inv.send()
    expect(inv.error.value).toBe('errors.forbidden')
    await inv.rotate()
    expect(rotate).toHaveBeenCalledWith('w1')

    const none = await withSetup(() => useInvites(undefined))
    expect(none.link.value).toBe('')
    await none.loadPending()
    await none.send()
    await none.rotate()
    expect(rotate).toHaveBeenCalledTimes(1)
  })
})

describe('WorkspaceInviteView', () => {
  it('shows the link and email form for admins', async () => {
    route.params = { slug: 'northwind' }
    store.items = [ws()]
    store.loaded = true
    vi.spyOn(invitesApi, 'listInvites').mockResolvedValue([])
    const w = await mountSuspended(WorkspaceInviteView)
    await flushPromises()
    expect(w.text()).toContain('Northwind готовий!')
    expect(w.text()).toContain('Або запросіть поштою')
    expect(w.text()).toContain('@nw.com')
  })

  it('hides the email form for members and shows not-found for unknown slugs', async () => {
    route.params = { slug: 'northwind' }
    store.items = [ws({ role: 'member', memberCount: 9, allowedDomains: [] })]
    store.loaded = true
    const w = await mountSuspended(WorkspaceInviteView)
    expect(w.text()).not.toContain('Або запросіть поштою')
    route.params = { slug: 'nope' }
    const missing = await mountSuspended(WorkspaceInviteView)
    expect(missing.text()).toContain('Не знайшли')
  })
})

describe('useJoin / JoinView', () => {
  beforeEach(() => {
    route.params = { token: 'tok123' }
  })

  it('previews and joins, then goes home', async () => {
    vi.spyOn(wsApi, 'previewInvite').mockResolvedValue(preview)
    const join = vi.spyOn(store, 'join').mockResolvedValue(ws())
    const w = await mountSuspended(JoinView)
    await flushPromises()
    expect(w.text()).toContain('Вас запросили до Northwind')
    expect(w.text()).toContain('12 учасників')
    await w.find('button').trigger('click')
    await flushPromises()
    expect(join).toHaveBeenCalledWith('tok123')
    expect(navigateTo).toHaveBeenCalledWith('/app')
  })

  it('sends new people to onboarding after joining', async () => {
    session.profile = { onboardedAt: null } as never
    vi.spyOn(wsApi, 'previewInvite').mockResolvedValue(preview)
    vi.spyOn(store, 'join').mockResolvedValue(ws())
    const j = await withSetup(() => useJoin())
    await flushPromises()
    await j.join()
    expect(navigateTo).toHaveBeenCalledWith('/onboarding?next=/app')
  })

  it('asks guests to sign in, pre-filling the invited email', async () => {
    session.session = null
    vi.spyOn(wsApi, 'previewInvite').mockResolvedValue({ ...preview, invitedEmail: 'eve@gmail.com' })
    const j = await withSetup(() => useJoin())
    await flushPromises()
    expect(j.signInTo.value).toContain('email=eve@gmail.com')
    expect(j.domainMismatch.value).toBe(false)
    const w = await mountSuspended(JoinView)
    await flushPromises()
    expect(w.find('a').attributes('href')).toContain('/sign-in')
  })

  it('warns about a domain mismatch and shows join errors with allowed domains', async () => {
    session.session = { user: { id: 'u1', email: 'eve@gmail.com' } } as never
    vi.spyOn(wsApi, 'previewInvite').mockResolvedValue(preview)
    vi.spyOn(store, 'join').mockRejectedValue(new ApiError('email domain not allowed', '42501', 'nw.com,nw.org'))
    const j = await withSetup(() => useJoin())
    await flushPromises()
    expect(j.domainMismatch.value).toBe(true)
    await j.join()
    expect(j.state.value).toBe('error')
    expect(j.error.value).toBe('errors.domainNotAllowed')
    expect(j.allowedHint.value).toBe('@nw.com, @nw.org')
    const w = await mountSuspended(JoinView)
    await flushPromises()
    expect(w.text()).toContain('eve@gmail.com')
  })

  it('shows a missing invite for unknown or failing tokens', async () => {
    vi.spyOn(wsApi, 'previewInvite').mockResolvedValue(null)
    const w = await mountSuspended(JoinView)
    await flushPromises()
    expect(w.text()).toContain('Запрошення не знайдено')
    vi.spyOn(wsApi, 'previewInvite').mockRejectedValue(new Error('down'))
    const j = await withSetup(() => useJoin())
    await flushPromises()
    expect(j.state.value).toBe('missing')
  })

  it('still previews when the session cannot be read, and has no mismatch before loading', async () => {
    vi.mocked(session.init).mockRejectedValue(new Error('no supabase'))
    let resolve!: (v: typeof preview) => void
    vi.spyOn(wsApi, 'previewInvite').mockReturnValue(new Promise((r) => (resolve = r)))
    const j = await withSetup(() => useJoin())
    expect(j.domainMismatch.value).toBe(false)
    resolve(preview)
    await flushPromises()
    expect(j.state.value).toBe('ready')
  })

  it('treats a missing token as empty', async () => {
    route.params = {}
    vi.spyOn(wsApi, 'previewInvite').mockResolvedValue(null)
    const j = await withSetup(() => useJoin())
    expect(j.token.value).toBe('')
  })

  it('reports errors without a hint', async () => {
    vi.spyOn(wsApi, 'previewInvite').mockResolvedValue({ ...preview, allowedDomains: [] })
    vi.spyOn(store, 'join').mockRejectedValue(new Error('x'))
    const j = await withSetup(() => useJoin())
    await flushPromises()
    await j.join()
    expect(j.allowedHint.value).toBe('')
    expect(j.error.value).toBe('common.somethingWrong')
  })
})
