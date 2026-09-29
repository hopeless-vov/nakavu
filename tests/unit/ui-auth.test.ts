import { flushPromises, mount } from '@vue/test-utils'
import BrandMark from '~/components/ui/BrandMark.vue'
import OtpInput from '~/components/ui/OtpInput.vue'
import SegmentedControl from '~/components/ui/SegmentedControl.vue'

function mountOtp(modelValue = '') {
  const w = mount(OtpInput, {
    props: { label: 'Code', modelValue, 'onUpdate:modelValue': (v: string) => w.setProps({ modelValue: v }) },
    attachTo: document.body,
  })
  return w
}

describe('OtpInput', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders one box per digit with labels', () => {
    const w = mountOtp('12')
    const boxes = w.findAll('input')
    expect(boxes).toHaveLength(6)
    expect(boxes[0]!.element.value).toBe('1')
    expect(boxes[5]!.attributes('aria-label')).toBe('Code 6')
    expect(boxes[0]!.attributes('autocomplete')).toBe('one-time-code')
  })

  it('types digit by digit, moves focus and emits complete', async () => {
    const w = mountOtp()
    const boxes = w.findAll('input')
    for (const [i, d] of '123456'.split('').entries()) {
      boxes[i]!.element.value = d
      await boxes[i]!.trigger('input')
    }
    await flushPromises()
    expect(w.props('modelValue')).toBe('123456')
    expect(w.emitted('complete')![0]).toEqual(['123456'])
  })

  it('fills all boxes from a paste and ignores non-digits', async () => {
    const w = mountOtp()
    const box = w.findAll('input')[0]!
    const event = new Event('paste', { cancelable: true }) as ClipboardEvent
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => '98 76-54' } })
    box.element.dispatchEvent(event)
    await flushPromises()
    expect(w.props('modelValue')).toBe('987654')
    expect(event.defaultPrevented).toBe(true)

    const empty = new Event('paste', { cancelable: true })
    w.findAll('input')[0]!.element.dispatchEvent(empty)
    await flushPromises()
    expect(w.props('modelValue')).toBe('987654')
  })

  it('handles autofill of the whole code into the first box', async () => {
    const w = mountOtp()
    const box = w.findAll('input')[0]!
    box.element.value = '246810'
    await box.trigger('input')
    expect(w.props('modelValue')).toBe('246810')
  })

  it('clears a box, rejects letters, and backspaces into the previous box', async () => {
    const w = mountOtp('123')
    const boxes = w.findAll('input')
    boxes[1]!.element.value = 'x'
    await boxes[1]!.trigger('input')
    expect(w.props('modelValue')).toBe('13')
    await boxes[1]!.trigger('keydown', { key: 'Backspace' })
    expect(w.props('modelValue')).toBe('3')
    await boxes[2]!.trigger('keydown', { key: 'Backspace' })
    await boxes[0]!.trigger('keydown', { key: 'Backspace' })
    await boxes[2]!.trigger('keydown', { key: 'ArrowLeft' })
    await boxes[2]!.trigger('keydown', { key: 'ArrowRight' })
    await boxes[2]!.trigger('keydown', { key: 'a' })
    await boxes[0]!.trigger('focus')
    await flushPromises()
    expect(w.emitted('complete')).toBeUndefined()
  })

  it('syncs when the model is reset from outside and exposes focus', async () => {
    const w = mountOtp('123456')
    await w.setProps({ modelValue: '' })
    expect(w.findAll('input').every((i) => i.element.value === '')).toBe(true)
    await (w.vm as unknown as { focus: () => Promise<void> }).focus()
    expect(document.activeElement).toBe(w.findAll('input')[0]!.element)
    await w.setProps({ invalid: true })
    expect(w.find('input').classes()).toContain('border-danger')
  })
})

describe('SegmentedControl', () => {
  it('selects an option', async () => {
    const w = mount(SegmentedControl, {
      props: {
        label: 'Language',
        size: 'md',
        options: [{ value: 'uk', label: 'UK', title: 'Українська' }, { value: 'en', label: 'EN' }],
        modelValue: 'uk',
        'onUpdate:modelValue': (v: string) => w.setProps({ modelValue: v }),
      },
    })
    const [uk, en] = w.findAll('[role=radio]')
    expect(uk!.attributes('aria-checked')).toBe('true')
    expect(uk!.attributes('title')).toBe('Українська')
    expect(uk!.classes()).toContain('h-9')
    await en!.trigger('click')
    expect(w.props('modelValue')).toBe('en')
  })

  it('has a small size', () => {
    const w = mount(SegmentedControl, { props: { label: 'x', options: [{ value: 'a', label: 'A' }], modelValue: 'b' } })
    expect(w.find('[role=radio]').classes()).toContain('h-7')
  })
})

describe('BrandMark', () => {
  it('renders the name at two sizes', () => {
    expect(mount(BrandMark, { props: { name: 'Nakavu' } }).text()).toBe('Nakavu')
    expect(mount(BrandMark, { props: { name: 'Nakavu', size: 'sm' } }).find('span span').classes()).toContain('text-lg')
  })
})
