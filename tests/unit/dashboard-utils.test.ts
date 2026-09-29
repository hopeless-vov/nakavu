import { mount } from '@vue/test-utils'
import BeanBurst from '~/components/ui/BeanBurst.vue'
import CountdownTiles from '~/components/ui/CountdownTiles.vue'
import FeedbackPicker from '~/components/ui/FeedbackPicker.vue'
import MatchReveal from '~/components/ui/MatchReveal.vue'
import { useNow } from '~/composables/use-now'
import { countdown, greetingKey, mailtoLink, participation } from '~/utils/dashboard'
import { buildIcs, downloadFile, suggestedSlot } from '~/utils/ics'
import { ukrainianPlural } from '~/utils/plural'
import { nextTick } from 'vue'

describe('dashboard utils', () => {
  it('greets by time of day', () => {
    expect([4, 5, 11, 12, 17, 18, 23].map(greetingKey)).toEqual(['evening', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening'])
  })

  it('describes participation', () => {
    expect(participation({ includeInMatching: false, skipNextRound: true })).toEqual({ status: 'paused', tone: 'neutral' })
    expect(participation({ includeInMatching: true, skipNextRound: true })).toEqual({ status: 'skipping', tone: 'accent' })
    expect(participation({ includeInMatching: true, skipNextRound: false })).toEqual({ status: 'draw', tone: 'sage' })
  })

  it('builds a mailto link', () => {
    expect(mailtoLink(['a@b.c', 'x+y@z.io'], 'Hi there', 'Line 1\nLine 2')).toBe('mailto:a%40b.c,x%2By%40z.io?subject=Hi%20there&body=Line%201%0ALine%202')
  })

  it('counts down and stops at zero', () => {
    const now = new Date('2026-09-29T10:00:00Z')
    expect(countdown(new Date('2026-10-01T09:00:00Z'), now)).toEqual({ days: 1, hours: 23, minutes: 0, seconds: 0, done: false })
    expect(countdown(new Date('2026-09-29T10:01:05Z'), now)).toMatchObject({ minutes: 1, seconds: 5 })
    expect(countdown(new Date('2026-09-01T00:00:00Z'), now)).toMatchObject({ days: 0, done: true })
  })

  it('pluralises Ukrainian', () => {
    const forms = (n: number) => ukrainianPlural(n, 3)
    expect([1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111].map(forms)).toEqual([0, 1, 1, 2, 2, 2, 2, 0, 1, 2, 0, 2])
    expect(ukrainianPlural(1, 2)).toBe(0)
    expect(ukrainianPlural(3, 2)).toBe(1)
  })
})

describe('ics', () => {
  it('builds an RFC 5545 event with escaping', () => {
    const ics = buildIcs(
      { uid: 'm1', start: new Date('2026-10-02T08:00:00Z'), minutes: 30, title: 'Coffee, with Tomás; hi', description: 'Line1\nLine2', organizer: 'a@b.c' },
      new Date('2026-09-29T10:00:00Z'),
    )
    expect(ics).toContain('UID:m1@nakavu.app')
    expect(ics).toContain('DTSTART:20261002T080000Z')
    expect(ics).toContain('DTEND:20261002T083000Z')
    expect(ics).toContain('DTSTAMP:20260929T100000Z')
    expect(ics).toContain('SUMMARY:Coffee\\, with Tomás\\; hi')
    expect(ics).toContain('DESCRIPTION:Line1\\nLine2')
    expect(ics).toContain('ORGANIZER:mailto:a@b.c')
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
    expect(buildIcs({ uid: 'x', start: new Date(0), minutes: 1, title: 't' })).not.toContain('DESCRIPTION')
  })

  it('suggests the next weekday at 10:00, at least two days out', () => {
    const fri = suggestedSlot(new Date(2026, 9, 1, 15)) // Thu → Sat → Mon
    expect([fri.getDay(), fri.getHours(), fri.getDate()]).toEqual([1, 10, 5])
    const tue = suggestedSlot(new Date(2026, 8, 29, 9))
    expect([tue.getDay(), tue.getDate()]).toEqual([4, 1])
  })

  it('downloads a file through an object URL', () => {
    vi.useFakeTimers()
    const create = vi.fn(() => 'blob:x')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    downloadFile('a.ics', 'BEGIN')
    expect(create).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledWith('blob:x')
    vi.useRealTimers()
  })
})

describe('useNow', () => {
  it('ticks', async () => {
    vi.useFakeTimers()
    let now!: ReturnType<typeof useNow>
    mount({ setup: () => ((now = useNow(1000)), () => null) })
    const first = now.value
    vi.advanceTimersByTime(1000)
    expect(now.value).not.toBe(first)
    vi.useRealTimers()
  })
})

describe('dashboard ui', () => {
  it('CountdownTiles pads values', () => {
    const w = mount(CountdownTiles, { props: { parts: [{ value: 3, label: 'days' }, { value: 12, label: 'h' }] } })
    expect(w.text()).toContain('03')
    expect(w.text()).toContain('12')
  })

  it('FeedbackPicker marks the selected answer and emits choices', async () => {
    const w = mount(FeedbackPicker, {
      props: { label: 'Did you meet?', value: 'met', options: [{ value: 'met', label: 'Yes' }, { value: 'not_yet', label: 'Not yet' }] },
    })
    const [yes, notYet] = w.findAll('[role=radio]')
    expect(yes!.attributes('aria-checked')).toBe('true')
    expect(yes!.text()).toContain('✓')
    await notYet!.trigger('click')
    expect(w.emitted('select')![0]).toEqual(['not_yet'])
  })

  it('BeanBurst renders decorative beans', () => {
    expect(mount(BeanBurst, { props: { count: 5 } }).findAll('span')).toHaveLength(5)
  })

  it('MatchReveal shuffles and lands on the match', async () => {
    vi.useFakeTimers()
    const w = mount(MatchReveal, { props: { decoys: ['Ann Lee', 'Bo Kim'], name: 'Tomás Herrera', label: 'Spinning' } })
    expect(w.text()).toContain('Ann Lee')
    await vi.advanceTimersByTimeAsync(5000)
    await nextTick()
    expect(w.text()).toContain('Tomás Herrera')
    expect(w.emitted('done')).toHaveLength(1)
    w.unmount()
    vi.useRealTimers()
  })

  it('MatchReveal lands at once without decoys or with reduced motion', async () => {
    vi.useFakeTimers()
    const w = mount(MatchReveal, { props: { decoys: [], name: 'Tomás', label: 'x' } })
    await vi.advanceTimersByTimeAsync(1000)
    expect(w.emitted('done')).toHaveLength(1)

    const spy = vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList)
    const r = mount(MatchReveal, { props: { decoys: ['A'], name: 'Tomás', label: 'x' } })
    await nextTick()
    expect(r.emitted('done')).toHaveLength(1)
    spy.mockRestore()
    vi.useRealTimers()
  })
})
