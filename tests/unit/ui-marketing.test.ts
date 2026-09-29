import { flushPromises, mount } from '@vue/test-utils'
import FaqList from '~/components/ui/FaqList.vue'
import FeatureCard from '~/components/ui/FeatureCard.vue'
import PersonCard from '~/components/ui/PersonCard.vue'
import RevealOnScroll from '~/components/ui/RevealOnScroll.vue'
import RouletteReel from '~/components/ui/RouletteReel.vue'
import SectionHeading from '~/components/ui/SectionHeading.vue'
import TwoCups from '~/components/ui/TwoCups.vue'
import { nextTick } from 'vue'

describe('PersonCard', () => {
  it('renders name, role, facts, ask and shared chips', () => {
    const w = mount(PersonCard, {
      props: {
        eyebrow: 'Your match',
        name: 'Tomás Herrera',
        role: 'Data Engineer, Risk',
        facts: ['Lisbon', 'In person'],
        askLabel: 'Ask me about',
        ask: 'croissants',
        chips: [{ label: 'Jazz', shared: true }, { label: 'Hiking' }],
        size: 'lg',
      },
      slots: { default: '<button>Say hi</button>' },
    })
    expect(w.text()).toContain('Your match')
    expect(w.text()).toContain('Tomás Herrera')
    expect(w.text()).toContain('Lisbon')
    expect(w.text()).toContain('croissants')
    expect(w.find('li.bg-sage-soft').text()).toContain('Jazz')
    expect(w.find('button').text()).toBe('Say hi')
    expect(w.find('p.text-2xl').exists()).toBe(true)
  })

  it('omits empty parts', () => {
    const w = mount(PersonCard, { props: { name: 'A' } })
    expect(w.findAll('ul')).toHaveLength(0)
    expect(w.text()).toBe('AA')
  })
})

describe('marketing pieces', () => {
  it('SectionHeading aligns and shows optional parts', () => {
    const w = mount(SectionHeading, { props: { title: 'T', eyebrow: 'E', subtitle: 'S', align: 'center' } })
    expect(w.classes()).toContain('text-center')
    expect(w.text()).toBe('ETS')
    expect(mount(SectionHeading, { props: { title: 'T' } }).text()).toBe('T')
  })

  it('FeatureCard renders tone, icon slot and copy', () => {
    const w = mount(FeatureCard, { props: { title: 'Smart', body: 'Body', tone: 'sage' }, slots: { icon: '<i class="ico" />' } })
    expect(w.find('.bg-sage-soft .ico').exists()).toBe(true)
    expect(w.text()).toContain('Smart')
    expect(mount(FeatureCard, { props: { title: 'x', body: 'y' } }).find('.bg-accent-soft').exists()).toBe(true)
  })

  it('RevealOnScroll renders its slot', () => {
    expect(mount(RevealOnScroll, { props: { delay: 0.1, as: 'li' }, slots: { default: 'Hi' } }).text()).toBe('Hi')
  })

  it('TwoCups draws the illustration', () => {
    expect(mount(TwoCups).findAll('path').length).toBeGreaterThan(6)
  })

  it('FaqList opens an answer', async () => {
    const w = mount(FaqList, { props: { items: [{ question: 'Q1', answer: 'A1' }, { question: 'Q2', answer: 'A2' }] }, attachTo: document.body })
    expect(w.findAll('button').map((b) => b.text())).toEqual(['Q1 +', 'Q2 +'])
    await w.findAll('button')[0]!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('A1')
    w.unmount()
  })
})

describe('RouletteReel', () => {
  const pairs = [
    { a: { name: 'Priya', team: 'Payments' }, b: { name: 'Tomás', team: 'Risk' }, caption: 'Payments meets Risk' },
    { a: { name: 'Olena', team: 'Design' }, b: { name: 'Kenji', team: 'Finance' }, caption: 'Design × Finance' },
  ]

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('cycles through pairs', async () => {
    const w = mount(RouletteReel, { props: { pairs, intervalMs: 1000 } })
    expect(w.text()).toContain('Payments meets Risk')
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(w.text()).toContain('Olena')
  })

  it('renders nothing without pairs', () => {
    expect(mount(RouletteReel, { props: { pairs: [] } }).html()).toBe('<!--v-if-->')
  })
})
