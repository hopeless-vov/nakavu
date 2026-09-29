import type { RouteAccess } from '~/router/routes'

export interface AccessState {
  isSignedIn: boolean
  isOnboarded: boolean
}

export type AccessDecision =
  | { allow: true }
  | { allow: false; to: 'sign-in' | 'onboarding' | 'dashboard'; next?: string }

/** Where a person may go. Pure so it can be tested without a router. */
export function decideAccess(access: RouteAccess | undefined, state: AccessState, fullPath: string): AccessDecision {
  switch (access) {
    case 'guest':
      return state.isSignedIn ? { allow: false, to: state.isOnboarded ? 'dashboard' : 'onboarding' } : { allow: true }
    case 'auth':
      if (!state.isSignedIn) return { allow: false, to: 'sign-in', next: fullPath }
      return { allow: true }
    case 'onboarded':
      if (!state.isSignedIn) return { allow: false, to: 'sign-in', next: fullPath }
      if (!state.isOnboarded) return { allow: false, to: 'onboarding', next: fullPath }
      return { allow: true }
    default:
      return { allow: true }
  }
}

/** Only same-site paths are valid redirect targets — never an absolute URL. */
export function safeNext(next: unknown, fallback = '/app'): string {
  if (typeof next !== 'string') return fallback
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}
