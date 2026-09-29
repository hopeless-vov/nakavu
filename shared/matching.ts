// Coffee matching. Pure and deterministic for a given seed, so a round can be
// re-run (and tested) with the same outcome.
//
// 1. Everyone needs a shared language with everyone in their group.
// 2. People who met recently are kept apart; so are people from the same
//    department (in work workspaces) and incompatible meeting formats.
// 3. Shared interests and the same city (for in-person) are a bonus.
// 4. Groups are built greedily, hardest-to-place first, then improved by
//    swapping people between groups while the total score goes up.

export type MeetingFormat = 'in_person' | 'online' | 'both'

export interface Participant {
  id: string
  department: string
  city: string
  meetingFormat: MeetingFormat
  languages: string[]
  interests: string[]
}

export interface PastMeeting {
  a: string
  b: string
  /** How many rounds ago they met (1 = last round). */
  roundsAgo: number
}

export interface MatchOptions {
  groupSize: 2 | 3
  kind: 'work' | 'friends'
  seed: string
  history?: PastMeeting[]
  /** How many candidates to consider per placement. Keeps big workspaces fast. */
  candidateLimit?: number
  /** Swap attempts per person during improvement. */
  improveRounds?: number
}

export interface MatchResult {
  groups: string[][]
  unmatched: string[]
}

export const WEIGHTS = {
  metRecently: -80, // met within the last 3 rounds
  metBefore: -40, // met 4–6 rounds ago
  metLongAgo: -15, // met earlier than that
  sameDepartment: -12,
  formatClash: -25,
  sharedInterest: 4,
  sharedInterestCap: 12,
  sameCityInPerson: 6,
  jitter: 3,
} as const

const INCOMPATIBLE = Number.NEGATIVE_INFINITY

// ── Seeded randomness ────────────────────────────────────────────────────
export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

export function createRng(seed: string): () => number {
  let a = hashSeed(seed)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

// ── Group sizes ──────────────────────────────────────────────────────────
/** How to split n people into groups of the preferred size. Never leaves a single person alone if avoidable. */
export function groupSizes(n: number, groupSize: 2 | 3): number[] {
  if (n < 2) return []
  if (groupSize === 2) {
    const sizes = Array<number>(Math.floor(n / 2)).fill(2)
    if (n % 2 === 1) sizes[0] = 3
    return sizes
  }
  if (n === 2) return [2]
  if (n === 4) return [2, 2]
  const trios = Math.floor(n / 3)
  const rest = n % 3
  if (rest === 0) return Array<number>(trios).fill(3)
  if (rest === 2) return [...Array<number>(trios).fill(3), 2]
  return [...Array<number>(trios - 1).fill(3), 2, 2]
}

// ── Scoring ──────────────────────────────────────────────────────────────
const norm = (s: string) => s.trim().toLowerCase()

function overlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const set = new Set(a.map(norm))
  return b.reduce((n, x) => n + (set.has(norm(x)) ? 1 : 0), 0)
}

export function historyIndex(history: PastMeeting[] = []): Map<string, number> {
  const index = new Map<string, number>()
  for (const m of history) {
    const key = m.a < m.b ? `${m.a}|${m.b}` : `${m.b}|${m.a}`
    index.set(key, Math.min(index.get(key) ?? Number.POSITIVE_INFINITY, m.roundsAgo))
  }
  return index
}

/** Pair score without jitter. -Infinity when the two can't be matched at all. */
export function pairScore(a: Participant, b: Participant, kind: 'work' | 'friends', met: Map<string, number>): number {
  // No languages listed means "any" (should not happen after onboarding).
  if (a.languages.length && b.languages.length && overlap(a.languages, b.languages) === 0) return INCOMPATIBLE

  let score = 0
  const roundsAgo = met.get(a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`)
  if (roundsAgo !== undefined) {
    score += roundsAgo <= 3 ? WEIGHTS.metRecently : roundsAgo <= 6 ? WEIGHTS.metBefore : WEIGHTS.metLongAgo
  }
  if (kind === 'work' && a.department && norm(a.department) === norm(b.department)) score += WEIGHTS.sameDepartment

  const formats = new Set([a.meetingFormat, b.meetingFormat])
  if (formats.has('in_person') && formats.has('online')) score += WEIGHTS.formatClash

  score += Math.min(overlap(a.interests, b.interests) * WEIGHTS.sharedInterest, WEIGHTS.sharedInterestCap)

  const inPerson = a.meetingFormat !== 'online' && b.meetingFormat !== 'online'
  if (inPerson && a.city && norm(a.city) === norm(b.city)) score += WEIGHTS.sameCityInPerson
  return score
}

// ── Matching ─────────────────────────────────────────────────────────────
export function matchParticipants(people: Participant[], options: MatchOptions): MatchResult {
  const rng = createRng(options.seed)
  const met = historyIndex(options.history)
  const limit = options.candidateLimit ?? 250
  const cache = new Map<string, number>()

  const score = (a: Participant, b: Participant): number => {
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
    let s = cache.get(key)
    if (s === undefined) {
      s = pairScore(a, b, options.kind, met)
      if (s !== INCOMPATIBLE) s += rng() * WEIGHTS.jitter
      cache.set(key, s)
    }
    return s
  }
  const groupScore = (group: Participant[]): number => {
    let total = 0
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) total += score(group[i]!, group[j]!)
    return total
  }
  const fitsInto = (p: Participant, group: Participant[]) => group.every((q) => score(p, q) !== INCOMPATIBLE)

  // Hardness: how many people someone could be matched with (by language only).
  const byLanguage = new Map<string, number>()
  for (const p of people) for (const l of new Set(p.languages.map(norm))) byLanguage.set(l, (byLanguage.get(l) ?? 0) + 1)
  const reach = (p: Participant) =>
    p.languages.length ? Math.max(...[...new Set(p.languages.map(norm))].map((l) => byLanguage.get(l)!)) : people.length

  const order = shuffle(people, rng).sort((a, b) => reach(a) - reach(b))
  const unassigned = new Set(order)
  const groups: Participant[][] = []
  const unmatched: Participant[] = []

  for (const size of groupSizes(people.length, options.groupSize)) {
    // Group sizes add up to everyone, so there is always someone left to seed with.
    const seedPerson = unassigned.values().next().value!
    unassigned.delete(seedPerson)
    const group = [seedPerson]
    while (group.length < size) {
      let best: Participant | undefined
      let bestScore = INCOMPATIBLE
      let seen = 0
      for (const candidate of unassigned) {
        if (seen++ >= limit) break
        if (!fitsInto(candidate, group)) continue
        const s = group.reduce((t, q) => t + score(candidate, q), 0)
        if (s > bestScore) {
          bestScore = s
          best = candidate
        }
      }
      if (!best) break
      unassigned.delete(best)
      group.push(best)
    }
    if (group.length >= 2) groups.push(group)
    else unmatched.push(seedPerson)
  }

  // Leftovers (no compatible group partner found, or rounding): join a group if they fit.
  for (const p of [...unassigned, ...unmatched.splice(0)]) {
    let best: Participant[] | undefined
    let bestGain = INCOMPATIBLE
    for (const g of groups) {
      if (g.length >= options.groupSize + 1 || !fitsInto(p, g)) continue
      const gain = g.reduce((t, q) => t + score(p, q), 0)
      if (gain > bestGain) {
        bestGain = gain
        best = g
      }
    }
    if (best) best.push(p)
    else unmatched.push(p)
  }

  // Improve: try swapping members between random pairs of groups.
  const attempts = (options.improveRounds ?? 30) * people.length
  for (let i = 0; i < attempts && groups.length > 1; i++) {
    const g1 = groups[Math.floor(rng() * groups.length)]!
    const g2 = groups[Math.floor(rng() * groups.length)]!
    if (g1 === g2) continue
    const i1 = Math.floor(rng() * g1.length)
    const i2 = Math.floor(rng() * g2.length)
    const before = groupScore(g1) + groupScore(g2)
    ;[g1[i1], g2[i2]] = [g2[i2]!, g1[i1]!]
    const after = groupScore(g1) + groupScore(g2)
    if (!(after > before)) [g1[i1], g2[i2]] = [g2[i2]!, g1[i1]!]
  }

  return {
    groups: groups.map((g) => g.map((p) => p.id)),
    unmatched: unmatched.map((p) => p.id),
  }
}
