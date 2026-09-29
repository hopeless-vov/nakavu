import { profileRow } from './fixtures'
import * as authApi from '~/api/auth'
import * as profilesApi from '~/api/profiles'
import { useSessionStore } from '~/stores/session'
import { toProfile } from '~/utils/mappers'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('~/api/auth')
vi.mock('~/api/profiles')

const session = (id = 'u1', email = 'priya@northwind.com') => ({ user: { id, email } }) as never
const profile = toProfile(profileRow())

describe('session store', () => {
  let emit: (event: string, s: unknown) => void

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    vi.mocked(authApi.onAuthChange).mockImplementation((cb) => {
      emit = cb as never
      return vi.fn()
    })
    vi.mocked(profilesApi.getProfile).mockResolvedValue(profile)
  })

  it('initialises once from the stored session and loads the profile', async () => {
    vi.mocked(authApi.getSession).mockResolvedValue(session())
    const store = useSessionStore()
    await Promise.all([store.init(), store.init()])
    expect(authApi.getSession).toHaveBeenCalledTimes(1)
    expect(store.ready).toBe(true)
    expect(store.isSignedIn).toBe(true)
    expect(store.userId).toBe('u1')
    expect(store.email).toBe('priya@northwind.com')
    expect(store.isOnboarded).toBe(true)
    expect(profilesApi.getProfile).toHaveBeenCalledWith('u1')
  })

  it('follows auth changes and only reloads the profile for a new user', async () => {
    vi.mocked(authApi.getSession).mockResolvedValue(null)
    const store = useSessionStore()
    await store.init()
    expect(store.isSignedIn).toBe(false)
    expect(store.profile).toBeNull()
    expect(store.email).toBe('')
    store.session = { user: { id: 'u9' } } as never
    expect(store.email).toBe('')
    store.session = null

    emit('SIGNED_IN', session())
    await vi.waitFor(() => expect(store.profile).toEqual(profile))
    emit('TOKEN_REFRESHED', session())
    await Promise.resolve()
    expect(profilesApi.getProfile).toHaveBeenCalledTimes(1)
    emit('SIGNED_OUT', null)
    await vi.waitFor(() => expect(store.profile).toBeNull())
  })

  it('normalises the email when sending and verifying', async () => {
    const store = useSessionStore()
    await store.sendSignInEmail('  Priya@Northwind.com ', 'http://x', 'en')
    expect(authApi.sendSignInEmail).toHaveBeenCalledWith('priya@northwind.com', 'http://x', 'en')
    vi.mocked(authApi.verifyEmailCode).mockResolvedValue(session())
    await store.verifyCode(' Priya@Northwind.com', '123456')
    expect(authApi.verifyEmailCode).toHaveBeenCalledWith('priya@northwind.com', '123456')
    expect(store.profile).toEqual(profile)
  })

  it('waits for the profile the auth listener started loading when verifying a code', async () => {
    vi.mocked(authApi.getSession).mockResolvedValue(null)
    const store = useSessionStore()
    await store.init()
    let resolveProfile!: (p: typeof profile) => void
    vi.mocked(profilesApi.getProfile).mockReturnValue(new Promise((r) => (resolveProfile = r)))
    // Supabase emits SIGNED_IN before verifyEmailCode resolves.
    vi.mocked(authApi.verifyEmailCode).mockImplementation(async () => {
      emit('SIGNED_IN', session())
      return session()
    })
    const verifying = store.verifyCode('priya@northwind.com', '123456')
    await Promise.resolve()
    let done = false
    void verifying.then(() => (done = true))
    await new Promise((r) => setTimeout(r, 0))
    expect(done).toBe(false)
    resolveProfile(profile)
    await verifying
    expect(store.isOnboarded).toBe(true)
    expect(profilesApi.getProfile).toHaveBeenCalledTimes(1)
  })

  it('ignores a slow profile load for a user who already signed out', async () => {
    vi.mocked(authApi.getSession).mockResolvedValue(null)
    const store = useSessionStore()
    await store.init()
    let resolveFirst!: (p: typeof profile) => void
    vi.mocked(profilesApi.getProfile).mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))
    emit('SIGNED_IN', session())
    emit('SIGNED_OUT', null)
    await vi.waitFor(() => expect(store.isSignedIn).toBe(false))
    resolveFirst(profile)
    await new Promise((r) => setTimeout(r, 0))
    expect(store.profile).toBeNull()
  })

  it('recovers when loading the profile fails', async () => {
    vi.mocked(profilesApi.getProfile).mockRejectedValueOnce(new Error('offline'))
    vi.mocked(authApi.verifyTokenHash).mockResolvedValue(session())
    const store = useSessionStore()
    await expect(store.verifyLink('h', 'email')).rejects.toThrow('offline')
    vi.mocked(authApi.exchangeCode).mockResolvedValue(session('u2'))
    await store.exchangeOAuthCode('code')
    expect(store.profile).toEqual(profile)
  })

  it('verifies links, OAuth codes and starts OAuth', async () => {
    const store = useSessionStore()
    vi.mocked(authApi.verifyTokenHash).mockResolvedValue(session())
    await store.verifyLink('hash', 'email')
    expect(store.isSignedIn).toBe(true)
    vi.mocked(authApi.exchangeCode).mockResolvedValue(session('u2'))
    await store.exchangeOAuthCode('code')
    expect(store.userId).toBe('u2')
    await store.signInWithProvider('azure', 'http://x')
    expect(authApi.signInWithProvider).toHaveBeenCalledWith('azure', 'http://x')
  })

  it('updates the profile and uploads an avatar', async () => {
    const store = useSessionStore()
    await expect(store.updateProfile({ city: 'Kyiv' })).rejects.toThrow('Not signed in')
    await expect(store.uploadAvatar(new File([], 'a.png'))).rejects.toThrow('Not signed in')

    vi.mocked(authApi.verifyTokenHash).mockResolvedValue(session())
    await store.verifyLink('h', 'email')
    vi.mocked(profilesApi.updateProfile).mockResolvedValue({ ...profile, city: 'Kyiv' })
    expect((await store.updateProfile({ city: 'Kyiv' })).city).toBe('Kyiv')
    vi.mocked(profilesApi.uploadAvatar).mockResolvedValue('https://cdn/a.png')
    vi.mocked(profilesApi.updateProfile).mockResolvedValue({ ...profile, avatarUrl: 'https://cdn/a.png' })
    expect((await store.uploadAvatar(new File([], 'a.png'))).avatarUrl).toBe('https://cdn/a.png')
    expect(profilesApi.updateProfile).toHaveBeenLastCalledWith('u1', { avatarUrl: 'https://cdn/a.png' })
  })

  it('signs out and deletes the account even if sign-out then fails', async () => {
    const store = useSessionStore()
    vi.mocked(authApi.verifyTokenHash).mockResolvedValue(session())
    await store.verifyLink('h', 'email')
    await store.signOut()
    expect(store.isSignedIn).toBe(false)
    expect(store.profile).toBeNull()

    vi.mocked(authApi.signOut).mockRejectedValue(new Error('gone'))
    await store.deleteAccount()
    expect(profilesApi.deleteMyAccount).toHaveBeenCalled()
  })

  it('disposes the auth subscription', async () => {
    const off = vi.fn()
    vi.mocked(authApi.onAuthChange).mockReturnValue(off)
    vi.mocked(authApi.getSession).mockResolvedValue(null)
    const store = useSessionStore()
    await store.init()
    store.dispose()
    store.dispose()
    expect(off).toHaveBeenCalledTimes(1)
    expect(store.ready).toBe(false)
  })
})
