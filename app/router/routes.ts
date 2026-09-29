export type RouteAccess = 'public' | 'guest' | 'auth' | 'onboarded'

export interface AppRoute {
  name: string
  path: string
  view: string
  meta: { access: RouteAccess; layout?: string }
}

// One route per view. `access` is enforced by the global route middleware:
// public — anyone; guest — signed-out only; auth — signed in;
// onboarded — signed in with a finished profile.
export const routes: AppRoute[] = [
  { name: 'home', path: '/', view: 'LandingView', meta: { access: 'public', layout: 'site' } },
  { name: 'sign-in', path: '/sign-in', view: 'SignInView', meta: { access: 'guest', layout: 'bare' } },
  { name: 'auth-confirm', path: '/auth/confirm', view: 'AuthConfirmView', meta: { access: 'public', layout: 'bare' } },
  { name: 'not-found', path: '/:pathMatch(.*)*', view: 'NotFoundView', meta: { access: 'public', layout: 'site' } },
]
