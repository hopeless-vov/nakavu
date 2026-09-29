// @vitest-environment nuxt
import { profileRow } from './fixtures'
import { withSetup } from './helpers/with-setup'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import { ApiError } from '~/api/supabase'
import ProfileFields from '~/components/ProfileFields.vue'
import ProfilePreview from '~/components/ProfilePreview.vue'
import { useCatalog } from '~/composables/use-catalog'
import { injectProfileForm, provideProfileForm, useProfileForm } from '~/composables/use-profile-form'
import { useSessionStore } from '~/stores/session'
import { useToastStore } from '~/stores/toast'
import { toProfile } from '~/utils/mappers'
import OnboardingView from '~/views/OnboardingView.vue'
import { defineComponent, h } from 'vue'

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateTo)

let store: ReturnType<typeof useSessionStore>


/** Mounts ProfileFields under a parent that provides the given form. */
function mountFields(form: ReturnType<typeof useProfileForm>, props: Record<string, unknown> = {}) {
  return mountSuspended(
    defineComponent({
      setup() {
        provideProfileForm(form)
        return () => h(ProfileFields, props)
      },
    }),
  )
}

beforeEach(async () => {
  await (useNuxtApp().$i18n as { setLocale: (l: string) => Promise<void> }).setLocale('uk')
  vi.restoreAllMocks()
  navigateTo.mockReset()
  store = useSessionStore()
  store.session = { user: { id: 'u1' } } as never
  store.profile = toProfile(profileRow({ onboarded_at: null, languages: [], interests: [], locale: 'uk' }))
})

describe('useCatalog', () => {
  it('labels catalogue keys and keeps custom values', async () => {
    const c = await withSetup(() => useCatalog())
    expect(c.interestLabel('hiking')).toBe('Походи')
    expect(c.interestLabel('Birdwatching')).toBe('Birdwatching')
    expect(c.languageLabel('uk')).toBe('Українська')
    expect(c.languageLabel('xx')).toBe('xx')
    expect(c.departmentLabel('risk')).toBe('Ризики')
    expect(c.departmentLabel('Treasury')).toBe('Treasury')
    expect(c.formatLabel('online')).toBe('Онлайн')
    expect(c.languageOptions.value[0]).toEqual({ value: 'uk', label: 'Українська' })
    expect(c.interestOptions.value.length).toBeGreaterThan(20)
    expect(c.departmentOptions.value.find((d) => d.value === 'people')!.label).toBe('HR')
    expect(c.interestLabels.value.hiking).toBe('Походи')
    expect(c.roleLine({ jobTitle: 'Engineer', department: 'risk' })).toBe('Engineer, Ризики')
    expect(c.roleLine({ jobTitle: '', department: '' })).toBe('')
    expect(c.facts({ city: 'Kyiv', meetingFormat: 'both', languages: ['uk', 'en'] })).toEqual(['Kyiv', 'Наживо або онлайн', 'Українська, Англійська'])
    expect(c.facts({ city: '', meetingFormat: 'online', languages: [] })).toEqual(['Онлайн'])
  })
})

describe('useProfileForm', () => {
  it('pre-fills the interface language for new people and toggles lists', async () => {
    const f = await withSetup(() => useProfileForm({ onboarding: true }))
    expect(f.draft.languages).toEqual(['uk'])
    f.toggle('languages', 'nl')
    f.toggle('languages', 'uk')
    expect(f.draft.languages).toEqual(['nl'])
    f.toggle('interests', 'jazz')
    expect(f.draft.interests).toEqual(['jazz'])
    expect(f.dirty.value).toBe(true)
  })

  it('caps interests at 30', async () => {
    const f = await withSetup(() => useProfileForm())
    for (let i = 0; i < 35; i++) f.toggle('interests', `i${i}`)
    expect(f.draft.interests).toHaveLength(30)
    f.customInterest.value = 'one more'
    f.addCustomInterest()
    expect(f.draft.interests).toHaveLength(30)
  })

  it('adds custom interests, mapping known labels to keys and skipping duplicates', async () => {
    const f = await withSetup(() => useProfileForm())
    f.customInterest.value = '  Походи '
    f.addCustomInterest()
    f.customInterest.value = 'Birdwatching'
    f.addCustomInterest()
    f.customInterest.value = 'birdwatching'
    f.addCustomInterest()
    f.customInterest.value = '   '
    f.addCustomInterest()
    expect(f.draft.interests).toEqual(['hiking', 'Birdwatching'])
    expect(f.customInterest.value).toBe('')
  })

  it('validates required fields', async () => {
    const f = await withSetup(() => useProfileForm())
    f.draft.firstName = ' '
    expect(await f.save()).toBe(false)
    expect(f.errors.value).toEqual({ firstName: 'profile.errors.firstName', languages: 'profile.errors.languages' })
  })

  it('saves a trimmed patch and marks onboarding done once', async () => {
    const update = vi.spyOn(store, 'updateProfile').mockResolvedValue({} as never)
    const f = await withSetup(() => useProfileForm({ onboarding: true }))
    f.draft.firstName = ' Olena '
    f.draft.askMeAbout = 'x'.repeat(100)
    expect(await f.save()).toBe(true)
    const patch = update.mock.calls[0]![0]
    expect(patch.firstName).toBe('Olena')
    expect(patch.askMeAbout).toHaveLength(80)
    expect(patch.onboardedAt).toMatch(/^\d{4}-/)

    store.profile = { ...store.profile!, onboardedAt: '2026-01-01' }
    const again = await withSetup(() => useProfileForm({ onboarding: true }))
    again.draft.firstName = 'O'
    await again.save()
    expect(update.mock.calls[1]![0].onboardedAt).toBeUndefined()
  })

  it('reports save errors and resets the draft', async () => {
    vi.spyOn(store, 'updateProfile').mockRejectedValue(new ApiError('x', '42501', undefined))
    const f = await withSetup(() => useProfileForm())
    f.draft.languages.push('en')
    expect(await f.save()).toBe(false)
    expect(f.errors.value.form).toBe('errors.forbidden')
    f.reset()
    expect(f.draft.languages).toEqual([])
    expect(f.errors.value).toEqual({})
  })

  it('follows profile changes in settings mode', async () => {
    const f = await withSetup(() => useProfileForm())
    store.profile = { ...store.profile!, city: 'Lviv' }
    await flushPromises()
    expect(f.draft.city).toBe('Lviv')
  })

  it('starts empty without a profile', async () => {
    store.profile = null
    const f = await withSetup(() => useProfileForm({ onboarding: true }))
    expect(f.draft).toMatchObject({ firstName: '', meetingFormat: 'both', languages: ['uk'] })
  })
})

describe('profile components', () => {
  it('ProfileFields edits the draft and shows errors', async () => {
    const form = await withSetup(() => useProfileForm())
    const w = await mountFields(form)
    await w.find('input').setValue('Olena')
    expect(form.draft.firstName).toBe('Olena')
    const uk = w.findAll('button').find((b) => b.text().includes('Українська'))!
    await uk.trigger('click')
    expect(form.draft.languages).toContain('uk')
    const online = w.findAll('[role=radio]').find((b) => b.text().includes('Онлайн'))!
    await online.trigger('click')
    expect(form.draft.meetingFormat).toBe('online')

    form.customInterest.value = 'Kayaking'
    await flushPromises()
    await w.findAll('button').find((b) => b.text() === 'Додати')!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Kayaking')
    const remove = w.find('button[aria-label="Прибрати"]')
    await remove.trigger('click')
    expect(form.draft.interests).not.toContain('Kayaking')

    form.errors.value = { firstName: 'profile.errors.firstName', languages: 'profile.errors.languages' }
    await flushPromises()
    expect(w.text()).toContain('Як до вас звертатися?')
    expect(w.text()).toContain('Оберіть хоча б одну мову.')
  })

  it('ProfileFields needs a provided form', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await expect(withSetup(() => injectProfileForm())).rejects.toThrow('provideProfileForm')
  })

  it('ProfileFields can show selected sections only', async () => {
    const form = await withSetup(() => useProfileForm())
    const w = await mountFields(form, { sections: ['meeting'] })
    expect(w.findAll('h2')).toHaveLength(1)
  })

  it('ProfilePreview falls back to placeholders', async () => {
    const draft = { firstName: '', lastName: '', jobTitle: '', department: '', city: '', meetingFormat: 'both' as const, languages: [], interests: [], askMeAbout: '' }
    const w = await mountSuspended(ProfilePreview, { props: { draft } })
    expect(w.text()).toContain('Ваше ім’я')
    expect(w.text()).toContain('Оберіть кілька інтересів')
    const filled = await mountSuspended(ProfilePreview, { props: { draft: { ...draft, firstName: 'Olena', jobTitle: 'PM', interests: ['jazz'], askMeAbout: 'jazz' } } })
    expect(filled.text()).toContain('Olena')
    expect(filled.text()).toContain('Джаз')
  })
})

describe('OnboardingView', () => {
  it('saves, welcomes and continues to `next`', async () => {
    vi.spyOn(store, 'updateProfile').mockResolvedValue({} as never)
    const toast = vi.spyOn(useToastStore(), 'show')
    const w = await mountSuspended(OnboardingView)
    await w.find('input').setValue('Olena')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(toast).toHaveBeenCalledWith('Вітаємо, Olena! Ви в грі.', 'success')
    expect(navigateTo).toHaveBeenCalledWith('/app')
  })

  it('stays put and explains when invalid', async () => {
    store.profile = { ...store.profile!, firstName: '' }
    const w = await mountSuspended(OnboardingView)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(navigateTo).not.toHaveBeenCalled()
    expect(w.text()).toContain('Перевірте позначені поля.')
  })
})
