import { nextTick } from 'vue'

import { flushPromises, mount } from '@vue/test-utils'

import AvatarBadge from '~/components/ui/AvatarBadge.vue'
import BaseButton from '~/components/ui/BaseButton.vue'
import BaseModal from '~/components/ui/BaseModal.vue'
import BaseCard from '~/components/ui/BaseCard.vue'
import ChipToggle from '~/components/ui/ChipToggle.vue'
import CupMark from '~/components/ui/CupMark.vue'
import EmptyState from '~/components/ui/EmptyState.vue'
import OptionGroup from '~/components/ui/OptionGroup.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import SelectField from '~/components/ui/SelectField.vue'
import SettingRow from '~/components/ui/SettingRow.vue'
import StatusPill from '~/components/ui/StatusPill.vue'
import TextField from '~/components/ui/TextField.vue'
import ToastStack from '~/components/ui/ToastStack.vue'
import ToggleSwitch from '~/components/ui/ToggleSwitch.vue'

const NuxtLinkStub = { props: ['to'], template: '<a :data-to="JSON.stringify(to)" v-bind="$attrs"><slot /></a>' }
const global = { stubs: { NuxtLink: NuxtLinkStub } }

describe('BaseButton', () => {
  it('renders a button and emits click', async () => {
    const w = mount(BaseButton, { slots: { default: 'Go' }, global })
    await w.trigger('click')
    expect(w.element.tagName).toBe('BUTTON')
    expect(w.text()).toBe('Go')
    expect(w.emitted('click')).toHaveLength(1)
  })

  it('applies variant, size and block classes', () => {
    const w = mount(BaseButton, { props: { variant: 'danger', size: 'lg', block: true }, global })
    expect(w.classes()).toEqual(expect.arrayContaining(['border-danger', 'h-13', 'w-full']))
  })

  it('blocks clicks and shows a spinner while loading', async () => {
    const w = mount(BaseButton, { props: { loading: true }, global })
    await w.trigger('click')
    expect(w.attributes('disabled')).toBeDefined()
    expect(w.attributes('aria-busy')).toBe('true')
    expect(w.find('.animate-spin').exists()).toBe(true)
    expect(w.emitted('click')).toBeUndefined()
  })

  it('renders a router link when `to` is given', async () => {
    const w = mount(BaseButton, { props: { to: '/app' }, global })
    await w.trigger('click')
    expect(w.element.tagName).toBe('A')
    expect(w.attributes('data-to')).toBe('"/app"')
    expect(w.emitted('click')).toHaveLength(1)
  })

  it('marks a disabled router link', () => {
    const w = mount(BaseButton, { props: { to: '/app', loading: true }, global })
    expect(w.attributes('aria-disabled')).toBe('true')
  })

  it('renders an anchor for `href` and swallows clicks when disabled', async () => {
    const w = mount(BaseButton, { props: { href: 'mailto:a@b.c', disabled: true }, global })
    const event = new MouseEvent('click', { cancelable: true })
    w.element.dispatchEvent(event)
    expect(w.attributes('href')).toBe('mailto:a@b.c')
    expect(w.attributes('aria-disabled')).toBe('true')
    expect(event.defaultPrevented).toBe(true)
    expect(w.emitted('click')).toBeUndefined()
  })
})

describe('TextField', () => {
  it('binds v-model and shows label and counter', async () => {
    const w = mount(TextField, { props: { label: 'Name', maxlength: 10, modelValue: 'Pri', 'onUpdate:modelValue': (v: string) => w.setProps({ modelValue: v }) } })
    expect(w.find('label').text()).toBe('Name')
    expect(w.text()).toContain('3/10')
    await w.find('input').setValue('Priya')
    expect(w.props('modelValue')).toBe('Priya')
    expect(w.text()).toContain('5/10')
    expect(w.find('label').attributes('for')).toBe(w.find('input').attributes('id'))
  })

  it('emits enter and focus', async () => {
    const w = mount(TextField)
    await w.find('input').trigger('keydown', { key: 'a' })
    await w.find('input').trigger('keydown', { key: 'Enter' })
    await w.find('input').trigger('focus')
    expect(w.emitted('enter')).toHaveLength(1)
    expect(w.emitted('focus')).toHaveLength(1)
  })

  it('prefers error over hint and links it for assistive tech', async () => {
    const w = mount(TextField, { props: { hint: 'Help' } })
    expect(w.text()).toContain('Help')
    expect(w.find('input').attributes('aria-describedby')).toMatch(/-hint$/)
    await w.setProps({ error: 'Bad' })
    expect(w.find('[role=alert]').text()).toBe('Bad')
    expect(w.text()).not.toContain('Help')
    expect(w.find('input').attributes('aria-invalid')).toBe('true')
    expect(w.find('input').attributes('aria-describedby')).toMatch(/-error$/)
  })

  it('renders a textarea when multiline', async () => {
    const w = mount(TextField, { props: { multiline: true, rows: 4, modelValue: '', 'onUpdate:modelValue': (v: string) => w.setProps({ modelValue: v }) } })
    await w.find('textarea').setValue('a@b.c')
    expect(w.props('modelValue')).toBe('a@b.c')
    expect(w.find('textarea').attributes('rows')).toBe('4')
    await w.find('textarea').trigger('focus')
    expect(w.emitted('focus')).toHaveLength(1)
    expect(w.find('label').exists()).toBe(false)
  })
})

describe('SelectField', () => {
  it('lists options with an optional placeholder', async () => {
    const w = mount(SelectField, {
      props: { label: 'Dept', placeholder: 'Pick', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }], modelValue: '', 'onUpdate:modelValue': (v: string) => w.setProps({ modelValue: v }) },
    })
    expect(w.findAll('option').map((o) => o.text())).toEqual(['Pick', 'A', 'B'])
    await w.find('select').setValue('b')
    expect(w.props('modelValue')).toBe('b')
  })

  it('works without label and placeholder', () => {
    const w = mount(SelectField, { props: { options: [{ value: 'a', label: 'A' }] } })
    expect(w.find('label').exists()).toBe(false)
    expect(w.findAll('option')).toHaveLength(1)
  })
})

describe('ChipToggle', () => {
  it('toggles and reflects pressed state', async () => {
    const w = mount(ChipToggle, { props: { label: 'Jazz', selected: true } })
    expect(w.text()).toContain('✓')
    expect(w.find('button').attributes('aria-pressed')).toBe('true')
    await w.find('button').trigger('click')
    expect(w.emitted('toggle')).toHaveLength(1)
    await w.setProps({ selected: false })
    expect(w.text()).toContain('+')
  })

  it('emits remove when removable', async () => {
    const w = mount(ChipToggle, { props: { label: 'acme.com', removable: true, removeLabel: 'Remove' } })
    const [, remove] = w.findAll('button')
    expect(remove!.attributes('aria-label')).toBe('Remove')
    await remove!.trigger('click')
    expect(w.emitted('remove')).toHaveLength(1)
  })
})

describe('OptionGroup', () => {
  it('selects an option', async () => {
    const w = mount(OptionGroup, {
      props: {
        label: 'Size',
        columns: 2,
        options: [{ value: 2, label: 'Pairs', description: 'Two' }, { value: 3, label: 'Trios' }],
        modelValue: 2,
        'onUpdate:modelValue': (v: number) => w.setProps({ modelValue: v }),
      },
    })
    const radios = w.findAll('[role=radio]')
    expect(radios[0]!.attributes('aria-checked')).toBe('true')
    expect(radios[0]!.text()).toContain('Two')
    await radios[1]!.trigger('click')
    expect(w.props('modelValue')).toBe(3)
    expect(w.find('[role=radiogroup]').classes()).toContain('sm:grid-cols-2')
  })

  it('defaults to three columns', () => {
    const w = mount(OptionGroup, { props: { options: [], modelValue: 'a' } })
    expect(w.find('[role=radiogroup]').classes()).toContain('sm:grid-cols-3')
  })
})

describe('ToggleSwitch', () => {
  it('flips its model', async () => {
    const w = mount(ToggleSwitch, { props: { label: 'On', modelValue: false, 'onUpdate:modelValue': (v: boolean) => w.setProps({ modelValue: v }) } })
    await w.trigger('click')
    expect(w.props('modelValue')).toBe(true)
    expect(w.attributes('aria-checked')).toBe('true')
    expect(w.classes()).toContain('bg-accent')
  })
})

describe('AvatarBadge', () => {
  it('shows initials with a stable tone', () => {
    const w = mount(AvatarBadge, { props: { name: 'Priya Raman', size: 'lg', square: true } })
    expect(w.text()).toBe('PR')
    expect(w.attributes('aria-label')).toBe('Priya Raman')
    expect(w.classes()).toEqual(expect.arrayContaining(['size-14', 'rounded-md']))
  })

  it('shows an image when given', () => {
    const w = mount(AvatarBadge, { props: { name: 'X', src: '/a.png' } })
    expect(w.find('img').attributes('src')).toBe('/a.png')
    expect(w.classes()).toContain('rounded-full')
  })
})

describe('small presentational pieces', () => {
  it('StatusPill renders tone and dot', () => {
    const w = mount(StatusPill, { props: { tone: 'sage', dot: true }, slots: { default: 'In the draw' } })
    expect(w.classes()).toContain('bg-sage-soft')
    expect(w.find('.rounded-full.bg-current').exists()).toBe(true)
    expect(mount(StatusPill).classes()).toContain('bg-surface-2')
  })

  it('BaseCard renders as a custom element with tone and padding', () => {
    const w = mount(BaseCard, { props: { as: 'article', tone: 'ink', padding: 'lg' }, slots: { default: 'x' } })
    expect(w.element.tagName).toBe('ARTICLE')
    expect(w.classes()).toEqual(expect.arrayContaining(['bg-ink', 'p-6']))
  })

  it('SettingRow shows title, description and control', () => {
    const w = mount(SettingRow, { props: { title: 'Skip', description: 'Busy?', dimmed: true }, slots: { default: '<button>t</button>' } })
    expect(w.text()).toContain('Skip')
    expect(w.text()).toContain('Busy?')
    expect(w.classes()).toContain('opacity-50')
    expect(mount(SettingRow, { props: { title: 'T' } }).findAll('p')).toHaveLength(1)
  })

  it('PageHeader renders eyebrow, title, subtitle and actions', () => {
    const w = mount(PageHeader, { props: { title: 'Hi', subtitle: 'Sub', eyebrow: 'Admin' }, slots: { actions: '<button>a</button>' } })
    expect(w.find('h1').text()).toBe('Hi')
    expect(w.text()).toContain('Sub')
    expect(w.text()).toContain('Admin')
    expect(w.find('button').exists()).toBe(true)
    expect(mount(PageHeader, { props: { title: 'Only' } }).findAll('p')).toHaveLength(0)
  })

  it('EmptyState renders copy and actions', () => {
    const w = mount(EmptyState, { props: { title: 'Nothing', description: 'Yet' }, slots: { default: '<button>Go</button>' } })
    expect(w.text()).toContain('Nothing')
    expect(w.text()).toContain('Yet')
    expect(mount(EmptyState, { props: { title: 'T' } }).text()).toBe('T')
  })

  it('CupMark animates steam unless disabled', () => {
    expect(mount(CupMark).findAll('.animate-steam')).toHaveLength(2)
    expect(mount(CupMark, { props: { steam: false } }).findAll('.animate-steam')).toHaveLength(0)
  })
})

describe('ToastStack', () => {
  it('renders toasts by tone and emits dismiss', async () => {
    const w = mount(ToastStack, {
      props: { dismissLabel: 'Close', toasts: [{ id: 1, message: 'Saved', tone: 'success' }, { id: 2, message: 'Hi' }] },
    })
    await nextTick()
    expect(w.text()).toContain('Saved')
    expect(w.text()).toContain('Hi')
    await w.findAll('button')[0]!.trigger('click')
    expect(w.emitted('dismiss')![0]).toEqual([1])
  })
})

describe('BaseModal', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('renders title, description, body and actions when open', async () => {
    const w = mount(BaseModal, {
      props: { open: true, title: 'Leave?', description: 'Sure?' },
      slots: { default: '<p>Body</p>', actions: '<button>Stay</button>' },
      attachTo: document.body,
    })
    await flushPromises()
    expect(document.body.textContent).toContain('Leave?')
    expect(document.body.textContent).toContain('Sure?')
    expect(document.body.textContent).toContain('Body')
    expect(document.body.textContent).toContain('Stay')
    w.unmount()
  })

  it('closes on Escape and renders nothing when closed', async () => {
    const w = mount(BaseModal, {
      props: { open: true, title: 'T', 'onUpdate:open': (v: boolean) => w.setProps({ open: v }) },
      attachTo: document.body,
    })
    await flushPromises()
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(w.props('open')).toBe(false)
    w.unmount()
  })
})
