import {
  feedbackNudgeAt,
  isoWeek,
  isValidTimeZone,
  isWeekly,
  nextRoundAt,
  REMINDER_LEAD_MS,
  runsInMonth,
  type Schedule,
  tzOffsetMs,
  upcomingRounds,
  zonedDate,
  zonedToUtc,
} from '../../shared/schedule'

const ams = (cadence: Schedule['cadence'], anchorDay: number, roundHour = 9): Schedule => ({ cadence, anchorDay, roundHour, timezone: 'Europe/Amsterdam' })
const iso = (d: Date) => d.toISOString()

describe('time zone helpers', () => {
  it('validates time zones', () => {
    expect(isValidTimeZone('Europe/Kyiv')).toBe(true)
    expect(isValidTimeZone('Mars/Olympus')).toBe(false)
  })

  it('computes offsets across DST', () => {
    expect(tzOffsetMs(Date.UTC(2026, 0, 15), 'Europe/Amsterdam')).toBe(3_600_000)
    expect(tzOffsetMs(Date.UTC(2026, 6, 15), 'Europe/Amsterdam')).toBe(7_200_000)
    expect(tzOffsetMs(Date.UTC(2026, 6, 15), 'UTC')).toBe(0)
  })

  it('converts wall-clock time to UTC, moving through the spring-forward gap', () => {
    expect(iso(zonedToUtc(2026, 9, 1, 9, 'Europe/Amsterdam'))).toBe('2026-10-01T07:00:00.000Z')
    expect(iso(zonedToUtc(2026, 11, 1, 9, 'Europe/Kyiv'))).toBe('2026-12-01T07:00:00.000Z')
    // 02:00 on 29 March 2026 does not exist in Amsterdam → 03:00 CEST
    expect(iso(zonedToUtc(2026, 2, 29, 2, 'Europe/Amsterdam'))).toBe('2026-03-29T01:00:00.000Z')
  })

  it('reads the local calendar date', () => {
    // 23:30 UTC on 30 Sep is already 1 Oct in Kyiv (a Thursday)
    expect(zonedDate(Date.UTC(2026, 8, 30, 23, 30), 'Europe/Kyiv')).toEqual({ year: 2026, month: 9, day: 1, weekday: 4 })
  })

  it('numbers ISO weeks', () => {
    expect(isoWeek(2026, 0, 1)).toBe(1)
    expect(isoWeek(2026, 8, 29)).toBe(40)
    expect(isoWeek(2027, 0, 1)).toBe(53)
  })
})

describe('cadence helpers', () => {
  it('knows weekly cadences and which months run', () => {
    expect(isWeekly('biweekly')).toBe(true)
    expect(isWeekly('monthly')).toBe(false)
    expect([0, 1, 2, 3].map((m) => runsInMonth('bimonthly', m))).toEqual([true, false, true, false])
    expect([0, 3, 6, 9, 4].map((m) => runsInMonth('quarterly', m))).toEqual([true, true, true, true, false])
    expect(runsInMonth('monthly', 7)).toBe(true)
  })
})

describe('nextRoundAt', () => {
  const now = new Date('2026-09-29T10:00:00Z')

  it('monthly: the next 1st at 09:00 local', () => {
    expect(iso(nextRoundAt(ams('monthly', 1), now))).toBe('2026-10-01T07:00:00.000Z')
  })

  it('monthly: later this month when the day has not passed', () => {
    expect(iso(nextRoundAt(ams('monthly', 28), new Date('2026-09-10T00:00:00Z')))).toBe('2026-09-28T07:00:00.000Z')
  })

  it('is strictly after `after`', () => {
    const first = nextRoundAt(ams('monthly', 1), now)
    expect(iso(nextRoundAt(ams('monthly', 1), first))).toBe('2026-11-01T08:00:00.000Z') // CET again
  })

  it('bimonthly runs in odd months, quarterly at quarter starts', () => {
    expect(iso(nextRoundAt(ams('bimonthly', 1), now))).toBe('2026-11-01T08:00:00.000Z')
    expect(iso(nextRoundAt(ams('quarterly', 15), now))).toBe('2026-10-15T07:00:00.000Z')
    expect(iso(nextRoundAt(ams('quarterly', 1), new Date('2026-10-02T00:00:00Z')))).toBe('2027-01-01T08:00:00.000Z')
  })

  it('weekly: the next given ISO weekday', () => {
    // 29 Sep 2026 is a Tuesday; Monday = 1
    expect(iso(nextRoundAt(ams('weekly', 1), now))).toBe('2026-10-05T07:00:00.000Z')
    expect(iso(nextRoundAt(ams('weekly', 2, 18), now))).toBe('2026-09-29T16:00:00.000Z')
    expect(iso(nextRoundAt(ams('weekly', 2, 9), now))).toBe('2026-10-06T07:00:00.000Z')
  })

  it('biweekly: only on even ISO weeks', () => {
    const at = nextRoundAt(ams('biweekly', 1), now)
    expect(iso(at)).toBe('2026-10-12T07:00:00.000Z')
    expect(isoWeek(2026, 9, 12) % 2).toBe(0)
    expect(iso(nextRoundAt(ams('biweekly', 1), at))).toBe('2026-10-26T08:00:00.000Z')
  })

  it('lists upcoming rounds', () => {
    expect(upcomingRounds(ams('monthly', 1), now, 3).map(iso)).toEqual([
      '2026-10-01T07:00:00.000Z',
      '2026-11-01T08:00:00.000Z',
      '2026-12-01T08:00:00.000Z',
    ])
  })
})

describe('reminders', () => {
  it('nudges halfway through a round', () => {
    const a = new Date('2026-10-01T00:00:00Z')
    const b = new Date('2026-10-31T00:00:00Z')
    expect(iso(feedbackNudgeAt(a, b))).toBe('2026-10-16T00:00:00.000Z')
    expect(REMINDER_LEAD_MS).toBe(259_200_000)
  })
})
