// Conversation starters for a match. Returns i18n keys + params so the app
// and the emails render them in each person's own language.

import { createRng, shuffle } from './matching.ts'

export interface Starter {
  key: string
  params?: Record<string, string>
}

export const GENERIC_STARTERS = 8

export interface StarterPerson {
  department: string
  interests: string[]
}

/**
 * Up to `count` starters for `me` meeting `them`, stable for a given match id:
 * one about a shared interest, one about their team (work only), then generic ones.
 */
export function pickStarters(
  matchId: string,
  me: StarterPerson,
  them: StarterPerson,
  kind: 'work' | 'friends',
  count = 3,
): Starter[] {
  const rng = createRng(matchId)
  const out: Starter[] = []
  const mine = new Set(me.interests.map((i) => i.toLowerCase()))
  const shared = them.interests.filter((i) => mine.has(i.toLowerCase()))

  if (shared.length) out.push({ key: 'starters.sharedInterest', params: { interest: shared[Math.floor(rng() * shared.length)]! } })
  if (kind === 'work' && them.department && them.department.toLowerCase() !== me.department.toLowerCase()) {
    out.push({ key: 'starters.theirTeam', params: { department: them.department } })
  }
  const generic = shuffle(
    Array.from({ length: GENERIC_STARTERS }, (_, i) => i),
    rng,
  )
  for (const i of generic) {
    if (out.length >= count) break
    out.push({ key: `starters.generic.${i}` })
  }
  return out.slice(0, count)
}
