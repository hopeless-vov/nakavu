// @vitest-environment nuxt
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import LanguageSwitcher from '~/components/LanguageSwitcher.vue'
import ThemeToggle from '~/components/ThemeToggle.vue'
import { useSessionStore } from '~/stores/session'

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateTo)

beforeEach(async () => {
  await (useNuxtApp().$i18n as { setLocale: (l: string) => Promise<void> }).setLocale('uk')
})

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    navigateTo.mockReset()
    vi.restoreAllMocks()
  })

  it('lists uk, en and nl and switches the route', async () => {
    const w = await mountSuspended(LanguageSwitcher)
    const radios = w.findAll('[role=radio]')
    expect(radios.map((r) => r.text())).toEqual(['UK', 'EN', 'NL'])
    await radios[2]!.trigger('click')
    await flushPromises()
    expect(navigateTo).toHaveBeenCalledWith(expect.stringMatching(/^\/nl/))
  })

  it('remembers the language on the profile when signed in', async () => {
    const store = useSessionStore()
    store.session = { user: { id: 'u1' } } as never
    store.profile = { locale: 'uk' } as never
    const update = vi.spyOn(store, 'updateProfile').mockResolvedValue({} as never)
    const w = await mountSuspended(LanguageSwitcher)
    await w.findAll('[role=radio]')[1]!.trigger('click')
    await flushPromises()
    expect(update).toHaveBeenCalledWith({ locale: 'en' })

    update.mockRejectedValueOnce(new Error('offline'))
    store.profile = { locale: 'uk' } as never
    await w.findAll('[role=radio]')[2]!.trigger('click')
    await flushPromises()
    expect(update).toHaveBeenCalledTimes(2)
    store.session = null
    store.profile = null
  })
})

describe('ThemeToggle', () => {
  it('flips the theme', async () => {
    const w = await mountSuspended(ThemeToggle)
    const before = document.documentElement.dataset.theme
    await w.find('button').trigger('click')
    await flushPromises()
    expect(document.documentElement.dataset.theme).not.toBe(before)
    expect(w.find('button').attributes('aria-label')).toBe('Змінити тему')
    await w.find('button').trigger('click')
    await flushPromises()
    expect(document.documentElement.dataset.theme).toBe(before)
  })
})
