import type { Provider, Session } from '@supabase/supabase-js'
import * as authApi from '~/api/auth'
import * as profilesApi from '~/api/profiles'
import type { Locale, Profile, ProfilePatch } from '~/types/domain'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * Who is signed in, and their profile. `ready` flips once the stored session
 * has been read, so route guards can wait for it instead of guessing.
 */
export const useSessionStore = defineStore('session', () => {
  const session = ref<Session | null>(null)
  const profile = ref<Profile | null>(null)
  const ready = ref(false)
  let readyPromise: Promise<void> | null = null
  let unsubscribe: (() => void) | null = null

  const userId = computed(() => session.value?.user.id ?? null)
  const email = computed(() => session.value?.user.email ?? '')
  const isSignedIn = computed(() => !!session.value)
  const isOnboarded = computed(() => !!profile.value?.onboardedAt)

  async function loadProfile() {
    profile.value = userId.value ? await profilesApi.getProfile(userId.value) : null
  }

  async function applySession(next: Session | null) {
    const changedUser = next?.user.id !== session.value?.user.id
    session.value = next
    if (changedUser) await loadProfile()
  }

  /** Reads the stored session once and keeps it in sync with Supabase. */
  function init(): Promise<void> {
    readyPromise ??= (async () => {
      await applySession(await authApi.getSession())
      unsubscribe = authApi.onAuthChange((_event, next) => {
        void applySession(next)
      })
      ready.value = true
    })()
    return readyPromise
  }

  async function sendSignInEmail(address: string, redirectTo: string, locale: Locale) {
    await authApi.sendSignInEmail(address.trim().toLowerCase(), redirectTo, locale)
  }

  async function verifyCode(address: string, code: string) {
    await applySession(await authApi.verifyEmailCode(address.trim().toLowerCase(), code))
  }

  async function verifyLink(tokenHash: string, type: Parameters<typeof authApi.verifyTokenHash>[1]) {
    await applySession(await authApi.verifyTokenHash(tokenHash, type))
  }

  async function signInWithProvider(provider: Provider, redirectTo: string) {
    await authApi.signInWithProvider(provider, redirectTo)
  }

  async function exchangeOAuthCode(code: string) {
    await applySession(await authApi.exchangeCode(code))
  }

  async function updateProfile(patch: ProfilePatch) {
    if (!userId.value) throw new Error('Not signed in')
    profile.value = await profilesApi.updateProfile(userId.value, patch)
    return profile.value
  }

  async function uploadAvatar(file: File) {
    if (!userId.value) throw new Error('Not signed in')
    return updateProfile({ avatarUrl: await profilesApi.uploadAvatar(userId.value, file) })
  }

  async function changeEmail(address: string, redirectTo: string) {
    await authApi.changeEmail(address.trim().toLowerCase(), redirectTo)
  }

  async function signOut() {
    await authApi.signOut()
    session.value = null
    profile.value = null
  }

  async function deleteAccount() {
    await profilesApi.deleteMyAccount()
    await signOut().catch(() => undefined)
  }

  function dispose() {
    unsubscribe?.()
    unsubscribe = null
    readyPromise = null
    ready.value = false
  }

  return {
    session,
    profile,
    ready,
    userId,
    email,
    isSignedIn,
    isOnboarded,
    init,
    loadProfile,
    sendSignInEmail,
    verifyCode,
    verifyLink,
    signInWithProvider,
    exchangeOAuthCode,
    updateProfile,
    uploadAvatar,
    changeEmail,
    signOut,
    deleteAccount,
    dispose,
  }
})
