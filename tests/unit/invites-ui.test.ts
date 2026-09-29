import { flushPromises, mount } from '@vue/test-utils'
import CopyField from '~/components/ui/CopyField.vue'
import LogoPicker from '~/components/ui/LogoPicker.vue'
import StepIndicator from '~/components/ui/StepIndicator.vue'
import { browserTimeZone, emailDomain, normalizeDomain, parseEmails, timeZones } from '~/utils/invites'

describe('invite utils', () => {
  it('parses pasted email lists', () => {
    expect(parseEmails('Olena <olena@acme.io>, taras@acme.io;  OLENA@acme.io\nnope@x bad')).toEqual({
      valid: ['olena@acme.io', 'taras@acme.io'],
      invalid: ['nope@x'],
    })
    expect(parseEmails('')).toEqual({ valid: [], invalid: [] })
  })

  it('normalises domains', () => {
    expect(normalizeDomain(' @Acme.COM ')).toBe('acme.com')
    expect(normalizeDomain('sub.acme.co.uk')).toBe('sub.acme.co.uk')
    expect(normalizeDomain('acme')).toBeNull()
    expect(normalizeDomain('a b.com')).toBeNull()
  })

  it('reads email domains', () => {
    expect(emailDomain('A@Acme.io')).toBe('acme.io')
    expect(emailDomain('broken')).toBe('')
  })

  it('lists time zones with the current one first', () => {
    const zones = timeZones('Europe/Kyiv')
    expect(zones[0]).toBe('Europe/Kyiv')
    expect(zones.filter((z) => z === 'Europe/Kyiv')).toHaveLength(1)
    const original = Intl.supportedValuesOf
    ;(Intl as { supportedValuesOf?: unknown }).supportedValuesOf = undefined
    expect(timeZones('UTC')).toEqual(['UTC'])
    Intl.supportedValuesOf = original
  })

  it('reads the browser time zone with a fallback', () => {
    expect(browserTimeZone()).toBeTruthy()
    const spy = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ timeZone: '' } as Intl.ResolvedDateTimeFormatOptions)
    expect(browserTimeZone()).toBe('Europe/Amsterdam')
    spy.mockRestore()
  })
})

describe('StepIndicator', () => {
  it('marks done, current and upcoming steps', () => {
    const w = mount(StepIndicator, { props: { steps: ['Details', 'Invite', 'Done'], current: 1 } })
    const items = w.findAll('li')
    expect(items[0]!.text()).toContain('✓')
    expect(items[1]!.attributes('aria-current')).toBe('step')
    expect(items[2]!.text()).toContain('3')
  })
})

describe('CopyField', () => {
  it('shows the value and emits copy', async () => {
    const w = mount(CopyField, { props: { label: 'Link', value: 'https://x', copyLabel: 'Copy', copiedLabel: 'Copied' } })
    expect((w.find('input').element as HTMLInputElement).value).toBe('https://x')
    await w.find('input').trigger('focus')
    await w.find('button').trigger('click')
    expect(w.emitted('copy')).toHaveLength(1)
    await w.setProps({ copied: true })
    expect(w.find('button').text()).toBe('Copied')
  })
})

describe('LogoPicker', () => {
  beforeEach(() => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:logo'), revokeObjectURL: vi.fn() })
  })

  const pick = async (w: ReturnType<typeof mount>, file: File) => {
    const input = w.find('input[type=file]')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await flushPromises()
  }

  it('previews a chosen file and rejects big ones', async () => {
    const w = mount(LogoPicker, {
      props: { name: 'Acme', label: 'Upload', hint: 'Square', current: 'https://old.png', maxBytes: 10, tooBigLabel: 'Too big', modelValue: null, 'onUpdate:modelValue': (f: File | null) => w.setProps({ modelValue: f }) },
    })
    expect(w.find('img').attributes('src')).toBe('https://old.png')
    expect(w.text()).toContain('Square')
    await pick(w, new File(['12345678901'], 'big.png'))
    expect(w.text()).toContain('Too big')
    await pick(w, new File(['1'], 'ok.png'))
    expect(w.find('img').attributes('src')).toBe('blob:logo')
    await w.setProps({ modelValue: null })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:logo')
    w.unmount()
  })

  it('cleans up the object URL on unmount and handles no file', async () => {
    const w = mount(LogoPicker, { props: { name: 'A', label: 'Upload', modelValue: null, 'onUpdate:modelValue': (f: File | null) => w.setProps({ modelValue: f }) } })
    await pick(w, new File(['1'], 'a.png'))
    const input = w.find('input[type=file]')
    Object.defineProperty(input.element, 'files', { value: [], configurable: true })
    await input.trigger('change')
    w.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })
})
