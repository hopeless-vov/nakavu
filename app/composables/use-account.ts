import { navigateTo, useLocalePath, useRuntimeConfig } from '#imports'
import { useMatchesStore } from '~/stores/matches'
import { useSessionStore } from '~/stores/session'
import { useToastStore } from '~/stores/toast'
import { useWorkspacesStore } from '~/stores/workspaces'
import type { Profile } from '~/types/domain'
import { errorKey, isEmail } from '~/utils/errors'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

export type NotificationKey = 'notifyMatch' | 'notifyReminder' | 'notifyFeedback' | 'notifyProduct'
export const NOTIFICATIONS: NotificationKey[] = ['notifyMatch', 'notifyReminder', 'notifyFeedback', 'notifyProduct']

/** Account settings beyond the profile: photo, email, preferences, notifications, deletion. */
export function useAccount() {
  const { t } = useI18n()
  const session = useSessionStore()
  const toast = useToastStore()
  const localePath = useLocalePath()
  const siteUrl = useRuntimeConfig().public.siteUrl as string

  const uploading = ref(false)
  async function uploadAvatar(file: File | null) {
    if (!file) return
    uploading.value = true
    try {
      await session.uploadAvatar(file)
      toast.show(t('account.toast.photo'), 'success')
    } catch (e) {
      toast.show(t(errorKey(e)), 'error')
    } finally {
      uploading.value = false
    }
  }

  async function setPreference<K extends keyof Profile>(key: K, value: Profile[K], message = 'account.toast.saved') {
    try {
      await session.updateProfile({ [key]: value })
      toast.show(t(message))
    } catch (e) {
      toast.show(t(errorKey(e)), 'error')
    }
  }

  const newEmail = ref('')
  const emailError = ref('')
  const emailSent = ref(false)
  async function changeEmail() {
    emailError.value = ''
    if (!isEmail(newEmail.value) || newEmail.value.trim().toLowerCase() === session.email) {
      emailError.value = 'errors.emailInvalid'
      return
    }
    try {
      await session.changeEmail(newEmail.value, `${siteUrl}${localePath('auth-confirm')}?next=/app/account`)
      emailSent.value = true
    } catch (e) {
      emailError.value = errorKey(e)
    }
  }

  const deleteOpen = ref(false)
  const deleteText = ref('')
  const deleting = ref(false)
  const canDelete = computed(() => deleteText.value.trim().toLowerCase() === t('account.delete.word').toLowerCase())
  async function deleteAccount() {
    if (!canDelete.value) return
    deleting.value = true
    try {
      await session.deleteAccount()
      useWorkspacesStore().$reset()
      useMatchesStore().$reset()
      await navigateTo(localePath('home'), { replace: true })
    } catch (e) {
      toast.show(t(errorKey(e)), 'error')
    } finally {
      deleting.value = false
    }
  }

  return { session, uploading, uploadAvatar, setPreference, newEmail, emailError, emailSent, changeEmail, deleteOpen, deleteText, deleting, canDelete, deleteAccount }
}
