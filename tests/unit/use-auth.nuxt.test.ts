// @vitest-environment nuxt
import { withSetup } from './helpers/with-setup'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useNuxtApp } from '#imports'
import { ApiError } from '~/api/supabase'
import { useAuthConfirm } from '~/composables/use-auth-confirm'
import { RESEND_COOLDOWN_S, useSignIn } from '~/composables/use-sign-in'
import { useSessionStore } from '~/stores/session'
import { nextTick, reactive } from 'vue'

const { navigateTo, route } = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  route: { query: {} as Record<string, unknown>, fullPath: '/sign-in' },
}))
mockNuxtImport('navigateTo', () => navigateTo)
mockNuxtImport('useRoute', () => () => route)

describe('useSignIn', () => {
  let store: ReturnType<typeof useSessionStore>

  beforeEach(async () => {
    vi.restoreAllMocks()
    await (useNuxtApp().$i18n as { setLocale: (l: string) => Promise<void> }).setLocale('uk')
    store = useSessionStore()
    navigateTo.mockReset()
    route.query = {}
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => vi.useRealTimers())

  it('validates the email before sending', async () => {
    const send = vi.spyOn(store, 'sendSignInEmail').mockResolvedValue()
    const s = await withSetup(() => useSignIn())
    s.email.value = 'nope'
    await s.sendEmail()
    expect(s.error.value).toBe('errors.emailInvalid')
    expect(send).not.toHaveBeenCalled()
  })

  it('sends the email with a confirm link that carries `next`, then counts down', async () => {
    route.query = { next: '/join/abc', email: 'priya@northwind.com' }
    const send = vi.spyOn(store, 'sendSignInEmail').mockResolvedValue()
    const s = await withSetup(() => useSignIn())
    expect(s.email.value).toBe('priya@northwind.com')
    await s.sendEmail()
    expect(send).toHaveBeenCalledWith('priya@northwind.com', 'http://localhost:3000/auth/confirm?next=%2Fjoin%2Fabc', 'uk')
    expect(s.step.value).toBe('code')
    expect(s.cooldown.value).toBe(RESEND_COOLDOWN_S)

    await s.resend()
    expect(send).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(RESEND_COOLDOWN_S * 1000)
    await nextTick()
    expect(s.cooldown.value).toBe(0)
    await s.resend()
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('shows a mapped error when sending fails', async () => {
    vi.spyOn(store, 'sendSignInEmail').mockRejectedValue(new ApiError('slow down', '429'))
    const s = await withSetup(() => useSignIn())
    s.email.value = 'a@b.co'
    await s.sendEmail()
    expect(s.error.value).toBe('errors.rateLimit')
    expect(s.step.value).toBe('email')
    expect(s.busy.value).toBe(false)
  })

  it('verifies the code and goes to `next`', async () => {
    route.query = { next: '/app/history' }
    const verify = vi.spyOn(store, 'verifyCode').mockResolvedValue()
    const s = await withSetup(() => useSignIn())
    s.email.value = 'a@b.co'
    await s.verify('12')
    expect(s.error.value).toBe('errors.codeInvalid')
    await s.verify('123456')
    expect(verify).toHaveBeenCalledWith('a@b.co', '123456')
    expect(navigateTo).toHaveBeenCalledWith('/app/history')
  })

  it('clears the code on a wrong code and can go back to the email step', async () => {
    vi.spyOn(store, 'verifyCode').mockRejectedValue(new ApiError('bad', 'otp_expired'))
    const s = await withSetup(() => useSignIn())
    s.code.value = '123456'
    await s.verify()
    expect(s.error.value).toBe('errors.codeExpired')
    expect(s.code.value).toBe('')
    s.step.value = 'code'
    s.changeEmail()
    expect(s.step.value).toBe('email')
    expect(s.error.value).toBe('')
  })
})

describe('useAuthConfirm', () => {
  let store: ReturnType<typeof useSessionStore>

  beforeEach(async () => {
    vi.restoreAllMocks()
    await (useNuxtApp().$i18n as { setLocale: (l: string) => Promise<void> }).setLocale('uk')
    store = useSessionStore()
    navigateTo.mockReset()
  })

  it('waits for a click before verifying an email link', async () => {
    route.query = reactive({ token_hash: 'hash', type: 'magiclink', next: '/join/x' })
    const verify = vi.spyOn(store, 'verifyLink').mockResolvedValue()
    const c = await withSetup(() => useAuthConfirm())
    expect(c.state.value).toBe('ready')
    expect(verify).not.toHaveBeenCalled()
    await c.confirm()
    expect(verify).toHaveBeenCalledWith('hash', 'magiclink')
    expect(navigateTo).toHaveBeenCalledWith('/join/x', { replace: true })
  })

  it('falls back to the email type and shows link errors', async () => {
    route.query = { token_hash: 'hash', type: 'weird' }
    vi.spyOn(store, 'verifyLink').mockRejectedValue(new Error('boom'))
    const c = await withSetup(() => useAuthConfirm())
    expect(c.type.value).toBe('email')
    await c.confirm()
    expect(c.state.value).toBe('error')
    expect(c.error.value).toBe('errors.linkInvalid')

    vi.spyOn(store, 'verifyLink').mockRejectedValue(new ApiError('slow', '429'))
    await c.confirm()
    expect(c.error.value).toBe('errors.rateLimit')
  })

  it('is invalid without a token or with an error from Supabase', async () => {
    route.query = {}
    expect((await withSetup(() => useAuthConfirm())).state.value).toBe('invalid')
    route.query = { error_description: 'Email link is invalid or has expired', token_hash: 'x' }
    const c = await withSetup(() => useAuthConfirm())
    expect(c.state.value).toBe('invalid')
    expect(c.error.value).toBe('errors.linkInvalid')
  })

  it('exchanges an OAuth code straight away', async () => {
    route.query = { code: 'oauth-code' }
    const exchange = vi.spyOn(store, 'exchangeOAuthCode').mockResolvedValue()
    await withSetup(() => useAuthConfirm())
    await vi.waitFor(() => expect(exchange).toHaveBeenCalledWith('oauth-code'))
    expect(navigateTo).toHaveBeenCalledWith('/app', { replace: true })
  })
})
