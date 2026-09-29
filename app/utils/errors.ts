import { ApiError } from '~/api/supabase'

/** Maps an error from the data layer to an i18n key the UI can show. */
export function errorKey(error: unknown): string {
  if (!(error instanceof ApiError)) return 'common.somethingWrong'
  switch (error.code) {
    case '429':
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'errors.rateLimit'
    case 'otp_expired':
      return 'errors.codeExpired'
    case '403':
    case 'invalid_credentials':
    case 'bad_code_verifier':
      return 'errors.codeInvalid'
    case 'email_address_invalid':
    case 'validation_failed':
      return 'errors.emailInvalid'
    case 'signup_disabled':
      return 'errors.signupDisabled'
    case 'P0002':
      return 'errors.notFound'
    case '42501':
      return error.message.includes('domain') ? 'errors.domainNotAllowed' : 'errors.forbidden'
    case 'P0001':
      return error.message.includes('ownership') ? 'errors.transferOwnership' : 'errors.lastOwner'
    case '23505':
      return 'errors.duplicate'
    default:
      return 'common.somethingWrong'
  }
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}
