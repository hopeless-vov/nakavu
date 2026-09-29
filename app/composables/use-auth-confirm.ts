import { navigateTo, useLocalePath, useRoute } from '#imports'
import { useSessionStore } from '~/stores/session'
import { safeNext } from '~/utils/access'
import { errorKey } from '~/utils/errors'
import { computed, onMounted, ref } from 'vue'

const LINK_TYPES = ['email', 'magiclink', 'signup', 'invite', 'email_change'] as const
type LinkType = (typeof LINK_TYPES)[number]

/**
 * Landing page for links in auth emails. Email links verify only when the
 * person presses the button — a GET from a mail scanner changes nothing.
 * OAuth redirects (?code=) are exchanged straight away.
 */
export function useAuthConfirm() {
  const route = useRoute()
  const localePath = useLocalePath()
  const session = useSessionStore()

  const tokenHash = computed(() => (typeof route.query.token_hash === 'string' ? route.query.token_hash : ''))
  const type = computed<LinkType>(() => {
    const t = route.query.type
    return typeof t === 'string' && (LINK_TYPES as readonly string[]).includes(t) ? (t as LinkType) : 'email'
  })
  const next = computed(() => safeNext(route.query.next))
  const linkError = typeof route.query.error_description === 'string' ? 'errors.linkInvalid' : ''

  const state = ref<'ready' | 'working' | 'error' | 'invalid'>(linkError || (!tokenHash.value && !route.query.code) ? 'invalid' : 'ready')
  const error = ref(linkError)

  async function finish(work: () => Promise<void>) {
    state.value = 'working'
    error.value = ''
    try {
      await work()
      await navigateTo(localePath(next.value), { replace: true })
    } catch (e) {
      error.value = errorKey(e) === 'common.somethingWrong' ? 'errors.linkInvalid' : errorKey(e)
      state.value = 'error'
    }
  }

  function confirm() {
    return finish(() => session.verifyLink(tokenHash.value, type.value))
  }

  onMounted(() => {
    if (typeof route.query.code === 'string' && state.value === 'ready') void finish(() => session.exchangeOAuthCode(route.query.code as string))
  })

  return { state, error, type, next, confirm }
}
