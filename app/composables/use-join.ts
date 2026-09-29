import { navigateTo, useLocalePath, useRoute } from '#imports'
import { ApiError } from '~/api/supabase'
import { previewInvite } from '~/api/workspaces'
import { useSessionStore } from '~/stores/session'
import { useWorkspacesStore } from '~/stores/workspaces'
import type { WorkspacePreview } from '~/types/domain'
import { errorKey } from '~/utils/errors'
import { emailDomain } from '~/utils/invites'
import { computed, onMounted, ref } from 'vue'

/** /join/:token — preview the workspace, then sign in (if needed) and join. */
export function useJoin() {
  const route = useRoute()
  const localePath = useLocalePath()
  const session = useSessionStore()
  const workspaces = useWorkspacesStore()

  const token = computed(() => String(route.params.token ?? ''))
  const preview = ref<WorkspacePreview | null>(null)
  const state = ref<'loading' | 'ready' | 'missing' | 'joining' | 'error'>('loading')
  const error = ref('')
  const allowedHint = ref('')

  const domainMismatch = computed(() => {
    const p = preview.value
    if (!p || !session.isSignedIn || p.invitedEmail || p.allowedDomains.length === 0) return false
    return !p.allowedDomains.includes(emailDomain(session.email))
  })

  const signInTo = computed(() =>
    localePath({
      name: 'sign-in',
      query: { next: `/join/${token.value}`, ...(preview.value?.invitedEmail ? { email: preview.value.invitedEmail } : {}) },
    }),
  )

  async function load() {
    state.value = 'loading'
    try {
      await session.init().catch(() => undefined)
      preview.value = await previewInvite(token.value)
      state.value = preview.value ? 'ready' : 'missing'
    } catch {
      state.value = 'missing'
    }
  }

  async function join() {
    state.value = 'joining'
    error.value = ''
    try {
      await workspaces.join(token.value)
      await navigateTo(localePath(session.isOnboarded ? 'dashboard' : { name: 'onboarding', query: { next: '/app' } }))
    } catch (e) {
      error.value = errorKey(e)
      if (e instanceof ApiError && e.hint) allowedHint.value = e.hint.split(',').map((d) => `@${d}`).join(', ')
      state.value = 'error'
    }
  }

  onMounted(load)

  return { token, preview, state, error, allowedHint, domainMismatch, signInTo, session, load, join }
}
