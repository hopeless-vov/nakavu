import * as matchesApi from '~/api/matches'
import * as wsApi from '~/api/workspaces'
import { useMatchesStore } from '~/stores/matches'
import { useSessionStore } from '~/stores/session'
import { useWorkspacesStore } from '~/stores/workspaces'
import type { Match, MyWorkspace } from '~/types/domain'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('~/api/workspaces')
vi.mock('~/api/matches')

const ws = (over: Partial<MyWorkspace> = {}): MyWorkspace => ({
  id: 'w1', name: 'Northwind', slug: 'northwind', kind: 'work', logoUrl: null, allowedDomains: [], groupSize: 2,
  cadence: 'monthly', anchorDay: 1, roundHour: 9, timezone: 'UTC', nextRoundAt: '2026-10-01T09:00:00Z', inviteToken: 't',
  createdAt: 'c', role: 'member', includeInMatching: true, skipNextRound: false, memberCount: 3, ...over,
})
const match = (over: Partial<Match> = {}): Match => ({ id: 'm1', workspaceId: 'w1', workspaceName: 'N', roundAt: '2026-09-01', myFeedback: null, partners: [], ...over })

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
})

describe('workspaces store', () => {
  const signIn = () => {
    useSessionStore().session = { user: { id: 'u1' } } as never
  }

  it('needs a signed-in person', async () => {
    await expect(useWorkspacesStore().load()).rejects.toThrow('Not signed in')
  })

  it('loads once unless forced and exposes helpers', async () => {
    signIn()
    vi.mocked(wsApi.listMyWorkspaces).mockResolvedValue([
      ws(),
      ws({ id: 'w2', slug: 'friends', role: 'owner', nextRoundAt: '2026-09-30T09:00:00Z' }),
      ws({ id: 'w3', slug: 'paused', includeInMatching: false, nextRoundAt: '2026-09-29T09:00:00Z' }),
    ])
    const store = useWorkspacesStore()
    await store.load()
    await store.load()
    expect(wsApi.listMyWorkspaces).toHaveBeenCalledTimes(1)
    expect(wsApi.listMyWorkspaces).toHaveBeenCalledWith('u1')
    expect(store.isAdminAnywhere).toBe(true)
    expect(store.bySlug('friends')!.id).toBe('w2')
    expect(store.nextRound!.workspace.id).toBe('w2')
    await store.load(true)
    expect(wsApi.listMyWorkspaces).toHaveBeenCalledTimes(2)
    store.$reset()
    expect(store.items).toEqual([])
    expect(store.nextRound).toBeNull()
  })

  it('creates and joins, then refreshes the list', async () => {
    signIn()
    vi.mocked(wsApi.listMyWorkspaces).mockResolvedValue([ws()])
    vi.mocked(wsApi.createWorkspace).mockResolvedValue(ws() as never)
    vi.mocked(wsApi.joinWorkspace).mockResolvedValue(ws() as never)
    const store = useWorkspacesStore()
    expect((await store.create({} as never)).id).toBe('w1')
    expect((await store.join('tok')).id).toBe('w1')
    expect(wsApi.listMyWorkspaces).toHaveBeenCalledTimes(2)
  })

  it('updates, uploads a logo, leaves, removes and rotates the invite', async () => {
    signIn()
    const store = useWorkspacesStore()
    store.items = [ws(), ws({ id: 'w2' })]
    vi.mocked(wsApi.updateWorkspace).mockResolvedValue({ ...ws(), name: 'New' } as never)
    await store.update('w1', { name: 'New' })
    expect(store.items[0]!.name).toBe('New')
    expect(store.items[1]!.name).toBe('Northwind')
    vi.mocked(wsApi.uploadWorkspaceLogo).mockResolvedValue('https://logo')
    await store.uploadLogo('w1', new File([], 'l.png'))
    expect(wsApi.updateWorkspace).toHaveBeenLastCalledWith('w1', { logoUrl: 'https://logo' })
    vi.mocked(wsApi.regenerateInviteToken).mockResolvedValue('fresh')
    expect(await store.rotateInvite('w1')).toBe('fresh')
    expect(store.items[0]!.inviteToken).toBe('fresh')
    expect(store.items[1]!.inviteToken).toBe('t')
    await store.leave('w1')
    await store.remove('w2')
    expect(store.items).toEqual([])
  })

  it('flips switches optimistically, clears skip on pause, and rolls back on error', async () => {
    signIn()
    const store = useWorkspacesStore()
    store.items = [ws({ skipNextRound: true }), ws({ id: 'w2' })]
    await store.setSwitches('w1', { includeInMatching: false })
    expect(store.items[0]).toMatchObject({ includeInMatching: false, skipNextRound: false })
    expect(wsApi.updateMySwitches).toHaveBeenCalledWith('w1', 'u1', { includeInMatching: false })

    vi.mocked(wsApi.updateMySwitches).mockRejectedValue(new Error('nope'))
    await expect(store.setSwitches('w1', { includeInMatching: true })).rejects.toThrow('nope')
    expect(store.items[0]!.includeInMatching).toBe(false)
    await store.setSwitches('missing', { skipNextRound: true })
    expect(wsApi.updateMySwitches).toHaveBeenCalledTimes(2)
  })
})

describe('matches store', () => {
  it('loads once and picks the latest match per workspace', async () => {
    vi.mocked(matchesApi.listMyMatches).mockResolvedValue([
      match({ id: 'new', myFeedback: 'met' }),
      match({ id: 'old', myFeedback: 'met' }),
      match({ id: 'other', workspaceId: 'w2' }),
    ])
    const store = useMatchesStore()
    await store.load()
    await store.load()
    expect(matchesApi.listMyMatches).toHaveBeenCalledTimes(1)
    expect(matchesApi.listMyMatches).toHaveBeenCalledWith(100)
    expect(store.current.map((m) => m.id)).toEqual(['new', 'other'])
    expect(store.metCount).toBe(2)
    store.$reset()
    expect(store.loaded).toBe(false)
  })

  it('sets feedback optimistically with rollback', async () => {
    const store = useMatchesStore()
    store.items = [match(), match({ id: 'm2' })]
    await store.setFeedback('m1', 'met')
    expect(store.items[0]!.myFeedback).toBe('met')
    vi.mocked(matchesApi.setMatchFeedback).mockRejectedValue(new Error('offline'))
    await expect(store.setFeedback('m1', 'skipped')).rejects.toThrow('offline')
    expect(store.items[0]!.myFeedback).toBe('met')
    await expect(store.setFeedback('ghost', 'met')).rejects.toThrow()
    expect(store.items[1]!.myFeedback).toBeNull()
  })

  it('stops loading on failure', async () => {
    vi.mocked(matchesApi.listMyMatches).mockRejectedValue(new Error('down'))
    const store = useMatchesStore()
    await expect(store.load()).rejects.toThrow('down')
    expect(store.loading).toBe(false)
    expect(store.loaded).toBe(false)
  })
})
