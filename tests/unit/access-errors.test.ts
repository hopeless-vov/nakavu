import { ApiError } from '~/api/supabase'
import { decideAccess, safeNext } from '~/utils/access'
import { errorKey, isEmail } from '~/utils/errors'

describe('decideAccess', () => {
  const out = { isSignedIn: false, isOnboarded: false }
  const fresh = { isSignedIn: true, isOnboarded: false }
  const ready = { isSignedIn: true, isOnboarded: true }

  it('lets anyone through public or unknown routes', () => {
    expect(decideAccess('public', out, '/')).toEqual({ allow: true })
    expect(decideAccess(undefined, out, '/')).toEqual({ allow: true })
  })

  it('keeps signed-in people off guest pages', () => {
    expect(decideAccess('guest', out, '/sign-in')).toEqual({ allow: true })
    expect(decideAccess('guest', fresh, '/sign-in')).toEqual({ allow: false, to: 'onboarding' })
    expect(decideAccess('guest', ready, '/sign-in')).toEqual({ allow: false, to: 'dashboard' })
  })

  it('sends signed-out people to sign in, remembering where they were going', () => {
    expect(decideAccess('auth', out, '/onboarding')).toEqual({ allow: false, to: 'sign-in', next: '/onboarding' })
    expect(decideAccess('auth', fresh, '/onboarding')).toEqual({ allow: true })
    expect(decideAccess('onboarded', out, '/app/history')).toEqual({ allow: false, to: 'sign-in', next: '/app/history' })
  })

  it('sends people without a profile to onboarding', () => {
    expect(decideAccess('onboarded', fresh, '/app')).toEqual({ allow: false, to: 'onboarding', next: '/app' })
    expect(decideAccess('onboarded', ready, '/app')).toEqual({ allow: true })
  })
})

describe('safeNext', () => {
  it('only allows same-site paths', () => {
    expect(safeNext('/join/abc')).toBe('/join/abc')
    expect(safeNext('https://evil.com')).toBe('/app')
    expect(safeNext('//evil.com')).toBe('/app')
    expect(safeNext('/\\evil.com')).toBe('/app')
    expect(safeNext(['/a'])).toBe('/app')
    expect(safeNext(undefined, '/')).toBe('/')
  })
})

describe('errorKey', () => {
  const e = (code: string, message = 'x') => new ApiError(message, code)

  it.each([
    ['429', 'errors.rateLimit'],
    ['over_email_send_rate_limit', 'errors.rateLimit'],
    ['over_request_rate_limit', 'errors.rateLimit'],
    ['otp_expired', 'errors.codeExpired'],
    ['403', 'errors.codeInvalid'],
    ['invalid_credentials', 'errors.codeInvalid'],
    ['bad_code_verifier', 'errors.codeInvalid'],
    ['email_address_invalid', 'errors.emailInvalid'],
    ['validation_failed', 'errors.emailInvalid'],
    ['signup_disabled', 'errors.signupDisabled'],
    ['P0002', 'errors.notFound'],
    ['23505', 'errors.duplicate'],
    ['whatever', 'common.somethingWrong'],
  ])('%s → %s', (code, key) => expect(errorKey(e(code))).toBe(key))

  it('reads the message for permission and owner errors', () => {
    expect(errorKey(e('42501', 'email domain not allowed'))).toBe('errors.domainNotAllowed')
    expect(errorKey(e('42501', 'admins only'))).toBe('errors.forbidden')
    expect(errorKey(e('P0001', 'transfer ownership before leaving'))).toBe('errors.transferOwnership')
    expect(errorKey(e('P0001', 'a workspace needs at least one owner'))).toBe('errors.lastOwner')
  })

  it('falls back for non-API errors', () => {
    expect(errorKey(new Error('boom'))).toBe('common.somethingWrong')
  })

  it('validates emails', () => {
    expect(isEmail(' olena@company.com ')).toBe(true)
    expect(isEmail('olena@company')).toBe(false)
    expect(isEmail('olena company.com')).toBe(false)
  })
})
