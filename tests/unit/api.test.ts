import { personJson, profileRow, workspaceRow } from './fixtures'
import { createSupabaseMock } from './helpers/supabase-mock'
import * as auth from '~/api/auth'
import * as invites from '~/api/invites'
import * as matches from '~/api/matches'
import * as profiles from '~/api/profiles'
import { ApiError, initSupabase, supabase, toApiError, unwrap } from '~/api/supabase'
import * as workspaces from '~/api/workspaces'

const db = createSupabaseMock()
vi.mock('~/api/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/api/supabase')>()
  return { ...actual, supabase: () => db.client }
})

const fail = { message: 'nope', code: '42501', hint: 'acme.com' }

beforeEach(() => db.reset())

describe('supabase helpers', () => {
  it('unwrap returns data or throws ApiError with code and hint', () => {
    expect(unwrap({ data: 1, error: null })).toBe(1)
    try {
      unwrap({ data: null, error: fail })
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).code).toBe('42501')
      expect((e as ApiError).hint).toBe('acme.com')
    }
  })

  it('toApiError falls back to HTTP status or "unknown"', () => {
    expect(toApiError({ message: 'x', status: 429 }).code).toBe('429')
    expect(toApiError({ message: 'x' }).code).toBe('unknown')
    expect(toApiError({ message: 'x', hint: null }).hint).toBeUndefined()
  })

  it('initSupabase creates a client that supabase() returns', async () => {
    const real = await vi.importActual<typeof import('~/api/supabase')>('~/api/supabase')
    expect(() => real.supabase()).toThrow(/not initialised/)
    const client = real.initSupabase('http://127.0.0.1:55321', 'anon')
    expect(real.supabase()).toBe(client)
    expect(supabase).toBeTypeOf('function')
    expect(initSupabase).toBeTypeOf('function')
  })
})

describe('auth api', () => {
  it('sends the sign-in email with locale metadata', async () => {
    await auth.sendSignInEmail('a@b.c', 'http://x/auth/confirm', 'nl')
    expect(db.calls[0]).toEqual(['auth.signInWithOtp', { email: 'a@b.c', options: { emailRedirectTo: 'http://x/auth/confirm', shouldCreateUser: true, data: { locale: 'nl' } } }])
    db.queue({ error: { message: 'rate', status: 429 } })
    await expect(auth.sendSignInEmail('a@b.c', 'x', 'uk')).rejects.toMatchObject({ code: '429' })
  })

  it('verifies a 6-digit code', async () => {
    db.queue({ data: { session: { access_token: 't' } } })
    expect(await auth.verifyEmailCode('a@b.c', '123456')).toEqual({ access_token: 't' })
    expect(db.calls[0]).toEqual(['auth.verifyOtp', { email: 'a@b.c', token: '123456', type: 'email' }])
    db.queue({ error: { message: 'expired', code: 'otp_expired' } })
    await expect(auth.verifyEmailCode('a@b.c', '1')).rejects.toMatchObject({ code: 'otp_expired' })
  })

  it('verifies a token hash', async () => {
    db.queue({ data: { session: null } })
    expect(await auth.verifyTokenHash('hash', 'email')).toBeNull()
    expect(db.calls[0]).toEqual(['auth.verifyOtp', { token_hash: 'hash', type: 'email' }])
    db.queue({ error: fail })
    await expect(auth.verifyTokenHash('hash', 'email')).rejects.toBeInstanceOf(ApiError)
  })

  it('starts OAuth and exchanges the code', async () => {
    await auth.signInWithProvider('azure', 'http://x/auth/confirm')
    expect(db.calls[0]).toEqual(['auth.signInWithOAuth', { provider: 'azure', options: { redirectTo: 'http://x/auth/confirm' } }])
    db.queue({ error: fail })
    await expect(auth.signInWithProvider('google', 'x')).rejects.toBeInstanceOf(ApiError)
    db.queue({ data: { session: { access_token: 'o' } } })
    expect(await auth.exchangeCode('c')).toEqual({ access_token: 'o' })
    db.queue({ error: fail })
    await expect(auth.exchangeCode('c')).rejects.toBeInstanceOf(ApiError)
  })

  it('reads the session and subscribes to changes', async () => {
    db.queue({ data: { session: { access_token: 's' } } })
    expect(await auth.getSession()).toEqual({ access_token: 's' })
    const cb = vi.fn()
    const off = auth.onAuthChange(cb)
    expect(db.calls.at(-1)).toEqual(['auth.onAuthStateChange', cb])
    off()
    expect(db.calls.at(-1)).toEqual(['auth.unsubscribe'])
  })

  it('changes email and signs out', async () => {
    await auth.changeEmail('new@b.c', 'http://x')
    expect(db.calls[0]).toEqual(['auth.updateUser', { email: 'new@b.c' }, { emailRedirectTo: 'http://x' }])
    db.queue({ error: fail })
    await expect(auth.changeEmail('x', 'y')).rejects.toBeInstanceOf(ApiError)
    await auth.signOut()
    expect(db.calls.at(-1)).toEqual(['auth.signOut'])
    db.queue({ error: fail })
    await expect(auth.signOut()).rejects.toBeInstanceOf(ApiError)
  })
})

describe('profiles api', () => {
  it('gets and updates a profile', async () => {
    db.queue({ data: profileRow() })
    expect((await profiles.getProfile('u1')).firstName).toBe('Priya')
    expect(db.calls).toEqual([['from', 'profiles'], ['select', '*'], ['eq', 'id', 'u1'], ['single']])

    db.reset()
    db.queue({ data: profileRow({ city: 'Kyiv' }) })
    expect((await profiles.updateProfile('u1', { city: 'Kyiv', firstName: undefined })).city).toBe('Kyiv')
    expect(db.calls[1]).toEqual(['update', { city: 'Kyiv' }])
  })

  it('uploads an avatar under the user folder', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(42)
    const url = await profiles.uploadAvatar('u1', new File(['x'], 'Me.JPG', { type: 'image/jpeg' }))
    expect(db.calls[0]!.slice(0, 2)).toEqual(['storage.avatars.upload', 'u1/avatar.jpg'])
    expect(url).toBe('https://cdn.test/avatars/u1/avatar.jpg?v=42')
    expect(await profiles.uploadAvatar('u1', new File(['x'], 'noext', { type: 'image/png' }))).toContain('u1/avatar.noext')
    expect(await profiles.uploadAvatar('u1', new File(['x'], 'trailing.', { type: 'image/png' }))).toContain('u1/avatar.png')
    vi.restoreAllMocks()
  })

  it('deletes the account via RPC', async () => {
    await profiles.deleteMyAccount()
    expect(db.calls[0]).toEqual(['rpc', 'delete_my_account', undefined])
  })
})

describe('workspaces api', () => {
  it('lists my workspaces with switches and member counts', async () => {
    db.queue({ data: [{ role: 'owner', include_in_matching: true, skip_next_round: false, workspaces: { ...workspaceRow(), memberships: [{ count: 12 }] } }] })
    const [ws] = await workspaces.listMyWorkspaces('u1')
    expect(ws).toMatchObject({ name: 'Northwind Group', role: 'owner', memberCount: 12, includeInMatching: true })
    expect(db.calls).toContainEqual(['eq', 'user_id', 'u1'])
  })

  it('creates, updates and deletes a workspace', async () => {
    db.queue({ data: workspaceRow() })
    const input = { name: 'N', kind: 'work' as const, groupSize: 2 as const, cadence: 'monthly' as const, anchorDay: 1, roundHour: 9, timezone: 'UTC', allowedDomains: [], nextRoundAt: '2026-10-01T09:00:00Z' }
    expect((await workspaces.createWorkspace(input)).slug).toBe('northwind-group')
    expect(db.calls[0]).toEqual(['rpc', 'create_workspace', expect.objectContaining({ p_name: 'N', p_group_size: 2, p_next_round_at: input.nextRoundAt })])

    db.reset()
    db.queue({ data: workspaceRow({ name: 'New' }) })
    expect((await workspaces.updateWorkspace('w1', { name: 'New', logoUrl: null })).name).toBe('New')
    expect(db.calls[1]).toEqual(['update', { name: 'New', logo_url: null }])

    db.reset()
    await workspaces.deleteWorkspace('w1')
    expect(db.calls).toEqual([['from', 'workspaces'], ['delete'], ['eq', 'id', 'w1']])
  })

  it('uploads a logo', async () => {
    const url = await workspaces.uploadWorkspaceLogo('w1', new File(['x'], 'logo.png', { type: 'image/png' }))
    expect(url).toMatch(/^https:\/\/cdn\.test\/workspace-logos\/w1\/logo\.png\?v=\d+$/)
    expect(await workspaces.uploadWorkspaceLogo('w1', new File(['x'], 'x.', { type: 'image/png' }))).toContain('w1/logo.png')
  })

  it('previews and joins by token', async () => {
    db.queue({ data: [{ id: 'w1', name: 'N', slug: 'n', kind: 'friends', logo_url: null, member_count: 3, allowed_domains: [], next_round_at: 'x', invited_email: null }] })
    expect(await workspaces.previewInvite('t')).toMatchObject({ name: 'N', memberCount: 3, kind: 'friends' })
    db.queue({ data: [] })
    expect(await workspaces.previewInvite('t')).toBeNull()
    db.queue({ data: workspaceRow() })
    expect((await workspaces.joinWorkspace('t')).id).toBe('w1')
    expect(db.calls.at(-1)).toEqual(['rpc', 'join_workspace', { p_token: 't' }])
  })

  it('leaves and rotates the link', async () => {
    await workspaces.leaveWorkspace('w1')
    expect(db.calls[0]).toEqual(['rpc', 'leave_workspace', { p_workspace: 'w1' }])
    db.queue({ data: 'newtok' })
    expect(await workspaces.regenerateInviteToken('w1')).toBe('newtok')
  })

  it('updates only the switches that changed', async () => {
    await workspaces.updateMySwitches('w1', 'u1', { skipNextRound: true })
    expect(db.calls[1]).toEqual(['update', { skip_next_round: true }])
    db.reset()
    await workspaces.updateMySwitches('w1', 'u1', { includeInMatching: false })
    expect(db.calls[1]).toEqual(['update', { include_in_matching: false }])
    expect(db.calls.slice(2)).toEqual([['eq', 'workspace_id', 'w1'], ['eq', 'user_id', 'u1']])
  })

  it('lists members, changes roles and removes members', async () => {
    db.queue({ data: [{ user_id: 'u1', role: 'admin', include_in_matching: true, skip_next_round: false, joined_at: 'j', profiles: profileRow() }] })
    const [m] = await workspaces.listMembers('w1')
    expect(m).toMatchObject({ userId: 'u1', role: 'admin', person: { firstName: 'Priya' } })

    db.reset()
    await workspaces.setMemberRole('w1', 'u2', 'admin')
    expect(db.calls[1]).toEqual(['update', { role: 'admin' }])
    db.reset()
    await workspaces.removeMember('w1', 'u2')
    expect(db.calls).toEqual([['from', 'memberships'], ['delete'], ['eq', 'workspace_id', 'w1'], ['eq', 'user_id', 'u2']])
  })

  it('reads stats', async () => {
    db.queue({ data: [{ members: 4, active: 2, paused: 1, skipping: 1, rounds: [{ scheduled_for: 's', participant_count: 2, answered: 2, met: 1 }] }] })
    expect(await workspaces.getWorkspaceStats('w1')).toEqual({ members: 4, active: 2, paused: 1, skipping: 1, rounds: [{ scheduledFor: 's', participantCount: 2, answered: 2, met: 1 }] })
    db.queue({ data: [{ members: 0, active: 0, paused: 0, skipping: 0, rounds: null }] })
    expect((await workspaces.getWorkspaceStats('w1')).rounds).toEqual([])
  })

  it('surfaces database errors', async () => {
    db.queue({ error: fail })
    await expect(workspaces.joinWorkspace('t')).rejects.toMatchObject({ code: '42501', hint: 'acme.com' })
  })
})

describe('invites api', () => {
  const row = { id: 'i1', workspace_id: 'w1', email: 'a@b.c', invited_by: 'u1', token: 't', created_at: 'c', expires_at: 'e', accepted_at: null }

  it('creates invites idempotently', async () => {
    db.queue({ data: [row] })
    expect(await invites.createInvites('w1', ['a@b.c'], 'u1')).toEqual([{ id: 'i1', email: 'a@b.c', createdAt: 'c', expiresAt: 'e', acceptedAt: null }])
    expect(db.calls[1]).toEqual(['upsert', [{ workspace_id: 'w1', email: 'a@b.c', invited_by: 'u1' }], { onConflict: 'workspace_id,email', ignoreDuplicates: true }])
  })

  it('lists pending invites and revokes', async () => {
    db.queue({ data: [row] })
    expect(await invites.listInvites('w1')).toHaveLength(1)
    expect(db.calls).toContainEqual(['is', 'accepted_at', null])
    db.reset()
    await invites.revokeInvite('i1')
    expect(db.calls).toEqual([['from', 'invites'], ['delete'], ['eq', 'id', 'i1']])
  })
})

describe('matches api', () => {
  it('lists matches with partners', async () => {
    db.queue({ data: [{ match_id: 'm1', workspace_id: 'w1', workspace_name: 'N', round_at: 'r', my_feedback: null, partners: [personJson()] }] })
    const [m] = await matches.listMyMatches()
    expect(m).toMatchObject({ id: 'm1', partners: [{ firstName: 'Tomás', meetingFormat: 'in_person' }] })
    expect(db.calls[0]).toEqual(['rpc', 'my_matches', { p_limit: 50 }])
    db.queue({ data: [{ match_id: 'm2', workspace_id: 'w1', workspace_name: 'N', round_at: 'r', my_feedback: 'met', partners: null }] })
    expect((await matches.listMyMatches(5))[0]!.partners).toEqual([])
  })

  it('sets feedback', async () => {
    await matches.setMatchFeedback('m1', 'met')
    expect(db.calls[0]).toEqual(['rpc', 'set_match_feedback', { p_match: 'm1', p_feedback: 'met' }])
  })
})
