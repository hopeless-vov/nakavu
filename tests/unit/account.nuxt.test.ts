// @vitest-environment nuxt
import { profileRow } from './fixtures'
import { withSetup } from './helpers/with-setup'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import * as authApi from '~/api/auth'
import { ApiError } from '~/api/supabase'
import { useAccount } from '~/composables/use-account'
import { useProfileForm } from '~/composables/use-profile-form'
import { useSessionStore } from '~/stores/session'
import { useToastStore } from '~/stores/toast'
import { toProfile } from '~/utils/mappers'
import AccountView from '~/views/AccountView.vue'

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateTo)

let session: ReturnType<typeof useSessionStore>
let toast: ReturnType<typeof vi.spyOn>

beforeEach(async () => {
  await (useNuxtApp().$i18n as { setLocale: (l: string) => Promise<void> }).setLocale('uk')
  vi.restoreAllMocks()
  navigateTo.mockReset()
  session = useSessionStore()
  session.session = { user: { id: 'u1', email: 'priya@northwind.com' } } as never
  session.profile = toProfile(profileRow())
  toast = vi.spyOn(useToastStore(), 'show')
})

describe('useAccount', () => {
  it('uploads a photo and reports failures', async () => {
    const upload = vi.spyOn(session, 'uploadAvatar').mockResolvedValue(session.profile!)
    const a = await withSetup(() => useAccount())
    await a.uploadAvatar(null)
    expect(upload).not.toHaveBeenCalled()
    await a.uploadAvatar(new File(['x'], 'me.png'))
    expect(toast).toHaveBeenLastCalledWith('Фото оновлено.', 'success')
    upload.mockRejectedValue(new Error('x'))
    await a.uploadAvatar(new File(['x'], 'me.png'))
    expect(toast).toHaveBeenLastCalledWith('Щось пішло не так. Спробуйте ще раз.', 'error')
    expect(a.uploading.value).toBe(false)
  })

  it('saves preferences', async () => {
    const update = vi.spyOn(session, 'updateProfile').mockResolvedValue(session.profile!)
    const a = await withSetup(() => useAccount())
    await a.setPreference('notifyProduct', true)
    expect(update).toHaveBeenCalledWith({ notifyProduct: true })
    expect(toast).toHaveBeenLastCalledWith('Збережено.')
    update.mockRejectedValue(new Error('x'))
    await a.setPreference('timezone', 'UTC')
    expect(toast).toHaveBeenLastCalledWith('Щось пішло не так. Спробуйте ще раз.', 'error')
  })

  it('changes the email after validating it', async () => {
    const change = vi.spyOn(authApi, 'changeEmail').mockResolvedValue()
    const a = await withSetup(() => useAccount())
    a.newEmail.value = 'priya@northwind.com'
    await a.changeEmail()
    expect(a.emailError.value).toBe('errors.emailInvalid')
    a.newEmail.value = ' New@Acme.io '
    await a.changeEmail()
    expect(change).toHaveBeenCalledWith('new@acme.io', 'http://localhost:3000/auth/confirm?next=/app/account')
    expect(a.emailSent.value).toBe(true)
    change.mockRejectedValue(new ApiError('x', '429'))
    await a.changeEmail()
    expect(a.emailError.value).toBe('errors.rateLimit')
  })

  it('deletes the account only after typing the word', async () => {
    const del = vi.spyOn(session, 'deleteAccount').mockResolvedValue()
    const a = await withSetup(() => useAccount())
    await a.deleteAccount()
    expect(del).not.toHaveBeenCalled()
    a.deleteText.value = ' Видалити '
    expect(a.canDelete.value).toBe(true)
    await a.deleteAccount()
    expect(del).toHaveBeenCalled()
    expect(navigateTo).toHaveBeenCalledWith('/', { replace: true })
    del.mockRejectedValue(new Error('x'))
    await a.deleteAccount()
    expect(toast).toHaveBeenLastCalledWith('Щось пішло не так. Спробуйте ще раз.', 'error')
  })
})

describe('profile form in settings', () => {
  it('keeps unsaved edits when the stored profile changes', async () => {
    const f = await withSetup(() => useProfileForm())
    f.draft.city = 'Lviv'
    session.profile = { ...session.profile!, notifyProduct: true }
    await flushPromises()
    expect(f.draft.city).toBe('Lviv')
  })
})

describe('AccountView', () => {
  it('renders sections, saves the profile and toggles notifications', async () => {
    const update = vi.spyOn(session, 'updateProfile').mockResolvedValue(session.profile!)
    const w = await mountSuspended(AccountView, { attachTo: document.body })
    expect(w.text()).toContain('Налаштування акаунта')
    expect(w.text()).toContain('Зараз: priya@northwind.com')
    const save = w.findAll('button').find((b) => b.text() === 'Зберегти зміни')!
    expect(save.attributes('disabled')).toBeDefined()
    await w.find('input[autocomplete="given-name"]').setValue('Pri')
    await w.findAll('button').find((b) => b.text() === 'Скасувати зміни')!.trigger('click')
    expect((w.find('input[autocomplete="given-name"]').element as HTMLInputElement).value).toBe('Priya')
    await w.find('input[autocomplete="given-name"]').setValue('Pri')
    await w.findAll('form')[0]!.trigger('submit')
    await flushPromises()
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Pri' }))
    expect(toast).toHaveBeenCalledWith('Збережено.', 'success')

    await w.findAll('[role=switch]').at(-1)!.trigger('click')
    expect(update).toHaveBeenLastCalledWith({ notifyProduct: true })

    const tz = w.findAll('select').at(-1)!
    await tz.setValue('Europe/Berlin')
    expect(update).toHaveBeenLastCalledWith({ timezone: 'Europe/Berlin' })

    await w.findAll('button').find((b) => b.text() === 'Видалити акаунт')!.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Видалити акаунт?')
    ;([...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Залишити акаунт') as HTMLButtonElement).click()
    w.unmount()
  })

  it('uploads a new photo and changes email from the form', async () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
    const upload = vi.spyOn(session, 'uploadAvatar').mockResolvedValue(session.profile!)
    vi.spyOn(authApi, 'changeEmail').mockResolvedValue()
    const w = await mountSuspended(AccountView)
    const input = w.find('input[type=file]')
    Object.defineProperty(input.element, 'files', { value: [new File(['1'], 'a.png')] })
    await input.trigger('change')
    await flushPromises()
    expect(upload).toHaveBeenCalled()
    await w.find('input[type=email]').setValue('new@acme.io')
    await w.findAll('form')[1]!.trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Ми надіслали підтвердження')
  })

  it('shows save errors', async () => {
    vi.spyOn(session, 'updateProfile').mockRejectedValue(new Error('x'))
    const w = await mountSuspended(AccountView)
    await w.find('input[autocomplete="given-name"]').setValue('Pri')
    await w.findAll('form')[0]!.trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Щось пішло не так')
  })
})
