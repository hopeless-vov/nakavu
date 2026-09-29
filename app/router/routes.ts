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
  { name: 'for-teams', path: '/for-teams', view: 'ForTeamsView', meta: { access: 'public', layout: 'site' } },
  { name: 'for-friends', path: '/for-friends', view: 'ForFriendsView', meta: { access: 'public', layout: 'site' } },
  { name: 'faq', path: '/faq', view: 'FaqView', meta: { access: 'public', layout: 'site' } },
  { name: 'privacy', path: '/privacy', view: 'PrivacyView', meta: { access: 'public', layout: 'site' } },
  { name: 'terms', path: '/terms', view: 'TermsView', meta: { access: 'public', layout: 'site' } },
  { name: 'sign-in', path: '/sign-in', view: 'SignInView', meta: { access: 'guest', layout: 'bare' } },
  { name: 'auth-confirm', path: '/auth/confirm', view: 'AuthConfirmView', meta: { access: 'public', layout: 'bare' } },
  { name: 'join', path: '/join/:token', view: 'JoinView', meta: { access: 'public', layout: 'bare' } },
  { name: 'onboarding', path: '/onboarding', view: 'OnboardingView', meta: { access: 'auth', layout: 'bare' } },
  { name: 'dashboard', path: '/app', view: 'DashboardView', meta: { access: 'onboarded', layout: 'app' } },
  { name: 'history', path: '/app/history', view: 'HistoryView', meta: { access: 'onboarded', layout: 'app' } },
  { name: 'workspaces', path: '/app/workspaces', view: 'WorkspacesView', meta: { access: 'onboarded', layout: 'app' } },
  { name: 'workspace-new', path: '/app/workspaces/new', view: 'WorkspaceCreateView', meta: { access: 'onboarded', layout: 'app' } },
  { name: 'workspace-invite', path: '/app/workspaces/:slug/invite', view: 'WorkspaceInviteView', meta: { access: 'onboarded', layout: 'app' } },
  { name: 'workspace-admin', path: '/app/workspaces/:slug/admin', view: 'WorkspaceAdminView', meta: { access: 'onboarded', layout: 'app' } },
  { name: 'not-found', path: '/:pathMatch(.*)*', view: 'NotFoundView', meta: { access: 'public', layout: 'site' } },
]
