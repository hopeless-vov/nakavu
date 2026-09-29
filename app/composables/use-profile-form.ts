import { MAX_ASK_ME_ABOUT, MAX_INTERESTS, normalizeInterest } from '#shared/catalog'
import { useCatalog } from '~/composables/use-catalog'
import { useSessionStore } from '~/stores/session'
import type { MeetingFormat, Profile, ProfilePatch } from '~/types/domain'
import { errorKey } from '~/utils/errors'
import { computed, inject, type InjectionKey, provide, reactive, ref, watch } from 'vue'

export interface ProfileDraft {
  firstName: string
  lastName: string
  jobTitle: string
  department: string
  city: string
  meetingFormat: MeetingFormat
  languages: string[]
  interests: string[]
  askMeAbout: string
}

function fromProfile(p: Profile | null): ProfileDraft {
  return {
    firstName: p?.firstName ?? '',
    lastName: p?.lastName ?? '',
    jobTitle: p?.jobTitle ?? '',
    department: p?.department ?? '',
    city: p?.city ?? '',
    meetingFormat: p?.meetingFormat ?? 'both',
    languages: [...(p?.languages ?? [])],
    interests: [...(p?.interests ?? [])],
    askMeAbout: p?.askMeAbout ?? '',
  }
}

/** Editable copy of the signed-in person's profile, shared by onboarding and account settings. */
export function useProfileForm(options: { onboarding?: boolean } = {}) {
  const session = useSessionStore()
  const { interestLabels } = useCatalog()

  const draft = reactive<ProfileDraft>(fromProfile(session.profile))
  const customInterest = ref('')
  const errors = ref<Partial<Record<'firstName' | 'languages' | 'form', string>>>({})
  const saving = ref(false)

  // Pre-fill languages with the interface language for new people.
  if (options.onboarding && draft.languages.length === 0) draft.languages.push(String(session.profile?.locale ?? 'uk'))

  // Follow the stored profile (e.g. after a notification toggle) — but never
  // overwrite edits the person hasn't saved yet.
  watch(
    () => session.profile,
    (p, old) => {
      const untouched = JSON.stringify(draft) === JSON.stringify(fromProfile(old ?? null))
      if (!options.onboarding && untouched) Object.assign(draft, fromProfile(p))
    },
  )

  const dirty = computed(() => JSON.stringify(draft) !== JSON.stringify(fromProfile(session.profile)))

  function toggle(list: 'languages' | 'interests', value: string) {
    const items = draft[list]
    const i = items.indexOf(value)
    if (i >= 0) items.splice(i, 1)
    else if (list === 'languages' || items.length < MAX_INTERESTS) items.push(value)
  }

  function addCustomInterest() {
    const value = normalizeInterest(customInterest.value, interestLabels.value)
    customInterest.value = ''
    if (!value) return
    const exists = draft.interests.some((x) => x.toLowerCase() === value.toLowerCase())
    if (!exists && draft.interests.length < MAX_INTERESTS) draft.interests.push(value)
  }

  function validate() {
    const next: typeof errors.value = {}
    if (!draft.firstName.trim()) next.firstName = 'profile.errors.firstName'
    if (draft.languages.length === 0) next.languages = 'profile.errors.languages'
    errors.value = next
    return Object.keys(next).length === 0
  }

  function toPatch(): ProfilePatch {
    return {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      jobTitle: draft.jobTitle.trim(),
      department: draft.department.trim(),
      city: draft.city.trim(),
      meetingFormat: draft.meetingFormat,
      languages: [...draft.languages],
      interests: [...draft.interests],
      askMeAbout: draft.askMeAbout.trim().slice(0, MAX_ASK_ME_ABOUT),
      ...(options.onboarding && !session.profile?.onboardedAt ? { onboardedAt: new Date().toISOString() } : {}),
    }
  }

  async function save(): Promise<boolean> {
    if (!validate()) return false
    saving.value = true
    try {
      await session.updateProfile(toPatch())
      return true
    } catch (e) {
      errors.value = { form: errorKey(e) }
      return false
    } finally {
      saving.value = false
    }
  }

  function reset() {
    Object.assign(draft, fromProfile(session.profile))
    errors.value = {}
  }

  return { draft, customInterest, errors, saving, dirty, toggle, addCustomInterest, validate, save, reset }
}

export type ProfileForm = ReturnType<typeof useProfileForm>
const PROFILE_FORM: InjectionKey<ProfileForm> = Symbol('profile-form')

/** Shares one form between a view and the ProfileFields editor below it. */
export function provideProfileForm(form: ProfileForm) {
  provide(PROFILE_FORM, form)
  return form
}

export function injectProfileForm(): ProfileForm {
  const form = inject(PROFILE_FORM)
  if (!form) throw new Error('ProfileFields needs provideProfileForm() in a parent')
  return form
}
