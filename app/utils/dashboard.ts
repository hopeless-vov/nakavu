import type { MyWorkspace } from '~/types/domain'
import type { PillTone } from '~/types/ui'

/** morning 5–12, afternoon 12–18, evening otherwise. */
export function greetingKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'evening'
}

export type ParticipationStatus = 'draw' | 'skipping' | 'paused'

export function participation(ws: Pick<MyWorkspace, 'includeInMatching' | 'skipNextRound'>): { status: ParticipationStatus; tone: PillTone } {
  if (!ws.includeInMatching) return { status: 'paused', tone: 'neutral' }
  if (ws.skipNextRound) return { status: 'skipping', tone: 'accent' }
  return { status: 'draw', tone: 'sage' }
}

/** mailto: link with a pre-filled, localised note. */
export function mailtoLink(to: string[], subject: string, body: string): string {
  return `mailto:${to.map(encodeURIComponent).join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
  done: boolean
}

export function countdown(target: Date, now: Date): Countdown {
  const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000))
  return {
    days: Math.floor(diff / 86_400),
    hours: Math.floor((diff % 86_400) / 3600),
    minutes: Math.floor((diff % 3600) / 60),
    seconds: diff % 60,
    done: diff === 0,
  }
}
