// Round scheduling. Pure and dependency-free: used by the Nuxt app (preview,
// create form) and by the Edge Function that runs due rounds.
//
// A schedule is a wall-clock rule in the workspace's time zone, e.g.
// "monthly on the 1st at 09:00 Europe/Amsterdam". nextRoundAt() returns the
// first matching instant strictly after `after`, correct across DST changes.

export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly'

export interface Schedule {
  cadence: Cadence
  /** Day of month 1–28 (monthly/bimonthly/quarterly) or ISO weekday 1–7 (weekly/biweekly). */
  anchorDay: number
  /** Local hour 0–23. */
  roundHour: number
  timezone: string
}

const DAY_MS = 86_400_000

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function isWeekly(cadence: Cadence): boolean {
  return cadence === 'weekly' || cadence === 'biweekly'
}

/** Offset of `tz` from UTC at `instant`, in milliseconds (e.g. +7_200_000 for CEST). */
export function tzOffsetMs(instant: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(instant))
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(instant / 1000) * 1000
}

/** UTC instant of a wall-clock time in `tz`. Non-existent local times (spring-forward gap) move forward. */
export function zonedToUtc(year: number, month: number, day: number, hour: number, tz: string): Date {
  const guess = Date.UTC(year, month, day, hour)
  const first = guess - tzOffsetMs(guess, tz)
  const second = guess - tzOffsetMs(first, tz)
  return new Date(Math.max(first, second))
}

/** The calendar date (y, m, d) and ISO weekday of `instant` in `tz`. */
export function zonedDate(instant: number, tz: string) {
  const local = new Date(instant + tzOffsetMs(instant, tz))
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth(),
    day: local.getUTCDate(),
    weekday: ((local.getUTCDay() + 6) % 7) + 1,
  }
}

/** ISO-8601 week number of a UTC calendar date. */
export function isoWeek(year: number, month: number, day: number): number {
  const date = new Date(Date.UTC(year, month, day))
  const weekday = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - weekday + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  return 1 + Math.round(((date.getTime() - firstThursday.getTime()) / DAY_MS - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
}

function monthStep(cadence: Cadence): number {
  return cadence === 'quarterly' ? 3 : cadence === 'bimonthly' ? 2 : 1
}

/** Months a cadence runs in: every month, odd months (Jan, Mar, …) or quarter starts (Jan, Apr, Jul, Oct). */
export function runsInMonth(cadence: Cadence, month: number): boolean {
  return month % monthStep(cadence) === 0
}

export function nextRoundAt(schedule: Schedule, after: Date): Date {
  const { cadence, anchorDay, roundHour, timezone } = schedule
  const start = zonedDate(after.getTime(), timezone)

  if (isWeekly(cadence)) {
    for (let i = 0; i <= 21; i++) {
      const day = new Date(Date.UTC(start.year, start.month, start.day + i))
      const weekday = ((day.getUTCDay() + 6) % 7) + 1
      if (weekday !== anchorDay) continue
      if (cadence === 'biweekly' && isoWeek(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) % 2 !== 0) continue
      const at = zonedToUtc(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), roundHour, timezone)
      if (at.getTime() > after.getTime()) return at
    }
  }

  for (let i = 0; i <= 12; i++) {
    const month = new Date(Date.UTC(start.year, start.month + i, 1))
    if (!runsInMonth(cadence, month.getUTCMonth())) continue
    const at = zonedToUtc(month.getUTCFullYear(), month.getUTCMonth(), anchorDay, roundHour, timezone)
    if (at.getTime() > after.getTime()) return at
  }
  /* v8 ignore next -- unreachable: every cadence matches within 12 months / 3 weeks */
  throw new Error('No round found for schedule')
}

/** The next `count` rounds after `after`. */
export function upcomingRounds(schedule: Schedule, after: Date, count: number): Date[] {
  const out: Date[] = []
  let cursor = after
  for (let i = 0; i < count; i++) {
    cursor = nextRoundAt(schedule, cursor)
    out.push(cursor)
  }
  return out
}

/** "Skip next round" reminders go out this long before a round. */
export const REMINDER_LEAD_MS = 3 * DAY_MS

/** Mid-round "did you meet?" nudge: halfway between this round and the next. */
export function feedbackNudgeAt(roundAt: Date, nextAt: Date): Date {
  return new Date(roundAt.getTime() + Math.floor((nextAt.getTime() - roundAt.getTime()) / 2))
}
