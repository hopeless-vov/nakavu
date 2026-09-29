import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import { useTheme } from '~/composables/use-theme'
import { TOAST_DURATION_MS, useToastStore } from '~/stores/toast'
import { AVATAR_TONES, avatarTone, initials } from '~/utils/avatar'
import { buttonClass } from '~/utils/button-class'
import { THEME_STORAGE_KEY, themeBootScript } from '~/utils/theme'

describe('avatar utils', () => {
  it('builds initials from names and ignores non-letters', () => {
    expect(initials('Priya Raman')).toBe('PR')
    expect(initials('Priya', 'Raman')).toBe('PR')
    expect(initials('Women in Tech @ Northwind')).toBe('WN')
    expect(initials('олена')).toBe('О')
    expect(initials('', null, undefined)).toBe('?')
    expect(initials('  ')).toBe('?')
  })

  it('returns a stable tone from the palette', () => {
    expect(avatarTone('Tomás')).toBe(avatarTone('Tomás'))
    expect(AVATAR_TONES).toContain(avatarTone('anything'))
    const tones = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(avatarTone))
    expect(tones.size).toBeGreaterThan(1)
  })
})

describe('buttonClass', () => {
  it('defaults to primary md', () => {
    expect(buttonClass()).toContain('bg-accent')
    expect(buttonClass()).toContain('h-11')
  })
})

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('resolves system preference and writes data-theme', async () => {
    const { preference, resolved } = useTheme()
    await nextTick()
    expect(preference.value).toBe('system')
    expect(resolved.value).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('toggles between light and dark and persists', async () => {
    const { toggle, resolved } = useTheme()
    toggle()
    await nextTick()
    expect(resolved.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    toggle()
    await nextTick()
    expect(resolved.value).toBe('light')
  })

  it('follows a dark system preference', async () => {
    const spy = vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList)
    const { resolved } = useTheme()
    await nextTick()
    expect(resolved.value).toBe('dark')
    spy.mockRestore()
  })

  it('boot script applies the stored theme before hydration', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify('dark'))
    new Function(themeBootScript)()
    expect(document.documentElement.dataset.theme).toBe('dark')
    localStorage.setItem(THEME_STORAGE_KEY, '{broken')
    expect(() => new Function(themeBootScript)()).not.toThrow()
  })
})

describe('toast store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('shows and auto-dismisses toasts', () => {
    const store = useToastStore()
    const id = store.show('Saved', 'success')
    expect(store.toasts).toEqual([{ id, message: 'Saved', tone: 'success' }])
    vi.advanceTimersByTime(TOAST_DURATION_MS)
    expect(store.toasts).toEqual([])
  })

  it('keeps at most three and dismisses by id', () => {
    const store = useToastStore()
    const ids = ['a', 'b', 'c', 'd'].map((m) => store.show(m))
    expect(store.toasts.map((t) => t.message)).toEqual(['b', 'c', 'd'])
    expect(store.toasts[0]!.tone).toBe('default')
    store.dismiss(ids[2]!)
    expect(store.toasts.map((t) => t.message)).toEqual(['b', 'd'])
  })
})
