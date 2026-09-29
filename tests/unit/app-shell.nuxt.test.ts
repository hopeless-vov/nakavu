// @vitest-environment nuxt
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import AccountMenu from '~/components/AccountMenu.vue'
import AppToasts from '~/components/AppToasts.vue'
import AppLayout from '~/layouts/app.vue'
import { useSessionStore } from '~/stores/session'
import { useToastStore } from '~/stores/toast'
import { useWorkspacesStore } from '~/stores/workspaces'
import { defineComponent, h } from 'vue'

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateTo)

beforeEach(async () => {
  await (useNuxtApp().$i18n as { setLocale: (l: string) => Promise<void> }).setLocale('uk')
  vi.restoreAllMocks()
  navigateTo.mockReset()
  const s = useSessionStore()
  s.session = { user: { id: 'u1', email: 'olena@acme.io' } } as never
  s.profile = { firstName: 'Olena', lastName: 'Koval', avatarUrl: null } as never
})

describe('app layout', () => {
  it('renders the nav on desktop and mobile and loads workspaces', async () => {
    const load = vi.spyOn(useWorkspacesStore(), 'load').mockResolvedValue()
    const w = await mountSuspended(
      defineComponent({ render: () => h(AppLayout, null, { default: () => h('p', 'content') }) }),
    )
    expect(w.text()).toContain('content')
    expect(w.findAll('nav')).toHaveLength(2)
    expect(w.text()).toContain('Історія')
    expect(w.findAll('nav').at(-1)!.findAll('a')).toHaveLength(4)
    expect(w.find('a[href="/app/account"]').exists()).toBe(true)
    await flushPromises()
    expect(load).toHaveBeenCalled()
  })
})

describe('AccountMenu', () => {
  it('shows who is signed in and signs out', async () => {
    const session = useSessionStore()
    const signOut = vi.spyOn(session, 'signOut').mockResolvedValue()
    const w = await mountSuspended(AccountMenu, { attachTo: document.body })
    await w.find('button').trigger('pointerdown', { button: 0, pointerType: 'mouse' })
    await w.find('button').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(document.body.textContent).toContain('olena@acme.io')
    const items = [...document.querySelectorAll('[role=menuitem]')] as HTMLElement[]
    expect(items.map((i) => i.textContent?.trim())).toEqual(['Налаштування акаунта', 'Створити воркспейс', 'Вийти'])
    items[2]!.click()
    await flushPromises()
    expect(signOut).toHaveBeenCalled()
    expect(navigateTo).toHaveBeenCalledWith('/')
    w.unmount()
  })

  it('falls back to the email when there is no name', async () => {
    useSessionStore().profile = null
    const w = await mountSuspended(AccountMenu)
    expect(w.find('[role=img]').attributes('aria-label')).toBe('olena@acme.io')
  })

  it('navigates from menu items', async () => {
    const w = await mountSuspended(AccountMenu, { attachTo: document.body })
    await w.find('button').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    ;([...document.querySelectorAll('[role=menuitem]')] as HTMLElement[])[0]!.click()
    await flushPromises()
    expect(navigateTo).toHaveBeenCalledWith('/app/account')
    w.unmount()
  })
})

describe('AppToasts', () => {
  it('renders toasts from the store', async () => {
    useToastStore().show('Привіт')
    const w = await mountSuspended(AppToasts)
    expect(w.text()).toContain('Привіт')
    await w.find('button').trigger('click')
    expect(useToastStore().toasts).toEqual([])
  })
})
