import { useIntervalFn } from '@vueuse/core'
import { navigateTo, useLocalePath, useRoute, useRuntimeConfig } from '#imports'
import { useSessionStore } from '~/stores/session'
import type { Locale } from '~/types/domain'
import { safeNext } from '~/utils/access'
import { errorKey, isEmail } from '~/utils/errors'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

export const RESEND_COOLDOWN_S = 60

/**
 * Two-step sign-in: email → a mail with a link *and* a 6-digit code.
 * The code path matters for corporate inboxes whose link scanners open
 * (and burn) one-time links before the person does.
 */
export function useSignIn() {
  const session = useSessionStore()
  const route = useRoute()
  const localePath = useLocalePath()
  const { locale } = useI18n()
  const siteUrl = useRuntimeConfig().public.siteUrl as string

  const step = ref<'email' | 'code'>('email')
  const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
  const code = ref('')
  const error = ref('')
  const busy = ref(false)
  const cooldown = ref(0)
  const next = computed(() => safeNext(route.query.next))

  const timer = useIntervalFn(() => {
    cooldown.value = Math.max(0, cooldown.value - 1)
    if (cooldown.value === 0) timer.pause()
  }, 1000, { immediate: false })

  function redirectUrl() {
    return `${siteUrl}${localePath('auth-confirm')}?next=${encodeURIComponent(next.value)}`
  }

  async function sendEmail() {
    error.value = ''
    if (!isEmail(email.value)) {
      error.value = 'errors.emailInvalid'
      return
    }
    busy.value = true
    try {
      await session.sendSignInEmail(email.value, redirectUrl(), locale.value as Locale)
      step.value = 'code'
      code.value = ''
      cooldown.value = RESEND_COOLDOWN_S
      timer.resume()
    } catch (e) {
      error.value = errorKey(e)
    } finally {
      busy.value = false
    }
  }

  async function resend() {
    if (cooldown.value > 0 || busy.value) return
    await sendEmail()
  }

  async function verify(value = code.value) {
    error.value = ''
    if (!/^\d{6}$/.test(value)) {
      error.value = 'errors.codeInvalid'
      return
    }
    busy.value = true
    try {
      await session.verifyCode(email.value, value)
      await navigateTo(localePath(next.value))
    } catch (e) {
      error.value = errorKey(e)
      code.value = ''
    } finally {
      busy.value = false
    }
  }

  function changeEmail() {
    step.value = 'email'
    error.value = ''
    code.value = ''
  }

  return { step, email, code, error, busy, cooldown, next, sendEmail, resend, verify, changeEmail }
}
