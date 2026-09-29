export interface IcsEvent {
  uid: string
  start: Date
  minutes: number
  title: string
  description?: string
  organizer?: string
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')

/** RFC 5545 calendar file for a single coffee (UTC times, CRLF line endings). */
export function buildIcs(e: IcsEvent, now = new Date()): string {
  const end = new Date(e.start.getTime() + e.minutes * 60_000)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nakavu//Coffee roulette//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}@nakavu.app`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${escape(e.description)}`] : []),
    ...(e.organizer ? [`ORGANIZER:mailto:${e.organizer}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

/** A friendly default slot: the next weekday at 10:00 local, at least a day from now. */
export function suggestedSlot(from: Date): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + 2)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  return d
}

export function downloadFile(name: string, content: string, type = 'text/calendar') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
