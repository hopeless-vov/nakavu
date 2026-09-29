// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import SiteFooter from '~/components/SiteFooter.vue'
import SiteHeader from '~/components/SiteHeader.vue'
import { useSessionStore } from '~/stores/session'
import FaqView from '~/views/FaqView.vue'
import ForFriendsView from '~/views/ForFriendsView.vue'
import ForTeamsView from '~/views/ForTeamsView.vue'
import LandingView from '~/views/LandingView.vue'
import NotFoundView from '~/views/NotFoundView.vue'
import PrivacyView from '~/views/PrivacyView.vue'
import TermsView from '~/views/TermsView.vue'

beforeEach(async () => {
  await (useNuxtApp().$i18n as { setLocale: (l: string) => Promise<void> }).setLocale('uk')
})

describe('public views', () => {
  it('landing shows the hero, steps, features and FAQ in Ukrainian', async () => {
    const w = await mountSuspended(LandingView)
    expect(w.find('h1').text()).toContain('ніколи')
    expect(w.text()).toContain('Три кроки')
    expect(w.text()).toContain('Розумний підбір')
    expect(w.text()).toContain('Як Nakavu обирає пари?')
    expect(w.find('a[href*="workspaces"]').exists()).toBe(true)
  })

  it('audience pages use their own copy', async () => {
    expect((await mountSuspended(ForTeamsView)).text()).toContain('Ваші колеги')
    expect((await mountSuspended(ForFriendsView)).text()).toContain('велика компанія')
  })

  it('FAQ lists ten questions', async () => {
    const w = await mountSuspended(FaqView)
    expect(w.findAll('h3')).toHaveLength(10)
  })

  it('legal pages render all sections', async () => {
    expect((await mountSuspended(PrivacyView)).findAll('h2')).toHaveLength(7)
    expect((await mountSuspended(TermsView)).findAll('h2')).toHaveLength(6)
  })

  it('404 links home', async () => {
    const w = await mountSuspended(NotFoundView)
    expect(w.text()).toContain('Тут кави немає')
    expect(w.find('a').attributes('href')).toBe('/')
  })
})

describe('site chrome', () => {
  it('header shows sign-in for guests and toggles the mobile menu', async () => {
    const w = await mountSuspended(SiteHeader)
    await flushPromises()
    expect(w.text()).toContain('Створити воркспейс')
    const menu = w.find('button[aria-expanded]')
    await menu.trigger('click')
    expect(menu.attributes('aria-expanded')).toBe('true')
    await flushPromises()
    expect(w.findAll('nav').length).toBeGreaterThan(1)
  })

  it('header offers to open the app when signed in', async () => {
    const store = useSessionStore()
    store.session = { user: { id: 'u1' } } as never
    const w = await mountSuspended(SiteHeader)
    await flushPromises()
    expect(w.text()).toContain('Відкрити Nakavu')
    store.session = null
  })

  it('footer links legal pages and shows the year', async () => {
    const w = await mountSuspended(SiteFooter)
    expect(w.text()).toContain(String(new Date().getFullYear()))
    expect(w.find('a[href="/privacy"]').exists()).toBe(true)
  })
})
