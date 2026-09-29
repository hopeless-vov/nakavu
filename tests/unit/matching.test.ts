import {
  createRng,
  groupSizes,
  hashSeed,
  historyIndex,
  matchParticipants,
  pairScore,
  type Participant,
  shuffle,
  WEIGHTS,
} from '../../shared/matching'

const person = (id: string, over: Partial<Participant> = {}): Participant => ({
  id,
  department: 'Engineering',
  city: 'Amsterdam',
  meetingFormat: 'both',
  languages: ['en'],
  interests: [],
  ...over,
})

const ids = (groups: string[][]) => groups.map((g) => [...g].sort()).sort()
const everyone = (r: { groups: string[][]; unmatched: string[] }) => [...r.groups.flat(), ...r.unmatched].sort()

describe('seeded randomness', () => {
  it('is deterministic per seed', () => {
    expect(hashSeed('a')).toBe(hashSeed('a'))
    expect(hashSeed('a')).not.toBe(hashSeed('b'))
    const a = createRng('x')
    const b = createRng('x')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
    const r = createRng('y')()
    expect(r).toBeGreaterThanOrEqual(0)
    expect(r).toBeLessThan(1)
  })

  it('shuffles without losing items', () => {
    const out = shuffle([1, 2, 3, 4, 5], createRng('s'))
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5])
    expect(shuffle([1, 2, 3, 4, 5], createRng('s'))).toEqual(out)
  })
})

describe('groupSizes', () => {
  it('pairs, with one trio for odd counts', () => {
    expect(groupSizes(0, 2)).toEqual([])
    expect(groupSizes(1, 2)).toEqual([])
    expect(groupSizes(2, 2)).toEqual([2])
    expect(groupSizes(5, 2)).toEqual([3, 2])
    expect(groupSizes(6, 2)).toEqual([2, 2, 2])
  })

  it('trios, never leaving anyone alone', () => {
    expect(groupSizes(2, 3)).toEqual([2])
    expect(groupSizes(3, 3)).toEqual([3])
    expect(groupSizes(4, 3)).toEqual([2, 2])
    expect(groupSizes(5, 3)).toEqual([3, 2])
    expect(groupSizes(7, 3)).toEqual([3, 2, 2])
    expect(groupSizes(9, 3)).toEqual([3, 3, 3])
  })
})

describe('pairScore', () => {
  const none = new Map<string, number>()

  it('requires a shared language unless someone listed none', () => {
    expect(pairScore(person('a', { languages: ['uk'] }), person('b', { languages: ['nl'] }), 'work', none)).toBe(Number.NEGATIVE_INFINITY)
    expect(pairScore(person('a', { languages: ['UK'] }), person('b', { languages: ['uk', 'nl'] }), 'friends', none)).toBeGreaterThan(Number.NEGATIVE_INFINITY)
    expect(pairScore(person('a', { languages: [] }), person('b'), 'friends', none)).toBeGreaterThan(Number.NEGATIVE_INFINITY)
  })

  it('penalises same department only in work workspaces', () => {
    const a = person('a', { city: '' })
    const b = person('b', { city: '' })
    expect(pairScore(a, b, 'work', none)).toBe(WEIGHTS.sameDepartment)
    expect(pairScore(a, b, 'friends', none)).toBe(0)
    expect(pairScore(a, person('b', { city: '', department: 'Risk' }), 'work', none)).toBe(0)
    expect(pairScore(person('a', { department: '', city: '' }), person('b', { department: '', city: '' }), 'work', none)).toBe(0)
  })

  it('penalises clashing meeting formats', () => {
    const s = pairScore(person('a', { meetingFormat: 'in_person', city: '' }), person('b', { meetingFormat: 'online', department: 'x' }), 'work', none)
    expect(s).toBe(WEIGHTS.formatClash)
  })

  it('rewards shared interests (capped) and same city for in-person', () => {
    const many = ['a', 'b', 'c', 'd', 'e']
    expect(pairScore(person('a', { interests: many, city: '' }), person('b', { interests: many, department: 'x' }), 'work', none)).toBe(WEIGHTS.sharedInterestCap)
    expect(pairScore(person('a', { department: 'x' }), person('b', { city: ' amsterdam ' }), 'work', none)).toBe(WEIGHTS.sameCityInPerson)
    expect(pairScore(person('a', { department: 'x', meetingFormat: 'online' }), person('b', { meetingFormat: 'online' }), 'work', none)).toBe(0)
  })

  it('penalises past meetings by recency', () => {
    const h = historyIndex([
      { a: 'b', b: 'a', roundsAgo: 2 },
      { a: 'a', b: 'c', roundsAgo: 5 },
      { a: 'a', b: 'd', roundsAgo: 9 },
      { a: 'a', b: 'd', roundsAgo: 12 },
    ])
    const base = { department: '', city: '' }
    expect(pairScore(person('a', base), person('b', base), 'friends', h)).toBe(WEIGHTS.metRecently)
    expect(pairScore(person('a', base), person('c', base), 'friends', h)).toBe(WEIGHTS.metBefore)
    expect(pairScore(person('a', base), person('d', base), 'friends', h)).toBe(WEIGHTS.metLongAgo)
    expect(historyIndex().size).toBe(0)
  })
})

describe('matchParticipants', () => {
  it('matches everyone into pairs, deterministically', () => {
    const people = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => person(id))
    const r1 = matchParticipants(people, { groupSize: 2, kind: 'work', seed: 'round-1' })
    const r2 = matchParticipants(people, { groupSize: 2, kind: 'work', seed: 'round-1' })
    expect(r1).toEqual(r2)
    expect(r1.groups).toHaveLength(3)
    expect(r1.groups.every((g) => g.length === 2)).toBe(true)
    expect(everyone(r1)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('makes one trio instead of leaving someone out', () => {
    const r = matchParticipants(['a', 'b', 'c', 'd', 'e'].map((id) => person(id)), { groupSize: 2, kind: 'work', seed: 's' })
    expect(r.groups.map((g) => g.length).sort()).toEqual([2, 3])
    expect(r.unmatched).toEqual([])
  })

  it('leaves a lone person unmatched', () => {
    expect(matchParticipants([person('a')], { groupSize: 2, kind: 'work', seed: 's' })).toEqual({ groups: [], unmatched: ['a'] })
    expect(matchParticipants([], { groupSize: 3, kind: 'work', seed: 's' })).toEqual({ groups: [], unmatched: [] })
  })

  it('never puts people without a shared language together', () => {
    const people = [
      person('uk1', { languages: ['uk'] }),
      person('uk2', { languages: ['uk'] }),
      person('nl1', { languages: ['nl'] }),
      person('nl2', { languages: ['nl'] }),
      person('both', { languages: ['uk', 'nl', 'en'] }),
      person('xx', { languages: ['ja'] }),
    ]
    const r = matchParticipants(people, { groupSize: 2, kind: 'friends', seed: 'lang' })
    const lang = new Map(people.map((p) => [p.id, p.languages]))
    for (const g of r.groups) {
      for (const a of g) for (const b of g) if (a !== b) expect(lang.get(a)!.some((l) => lang.get(b)!.includes(l))).toBe(true)
    }
    expect(r.unmatched).toEqual(['xx'])
    expect(everyone(r)).toHaveLength(6)
  })

  it('avoids repeating last round when there is an alternative', () => {
    const people = ['a', 'b', 'c', 'd'].map((id) => person(id, { department: id }))
    const history = [{ a: 'a', b: 'b', roundsAgo: 1 }, { a: 'c', b: 'd', roundsAgo: 1 }]
    for (const seed of ['1', '2', '3', '4', '5']) {
      const r = matchParticipants(people, { groupSize: 2, kind: 'work', seed, history })
      expect(ids(r.groups)).not.toContainEqual(['a', 'b'])
      expect(ids(r.groups)).not.toContainEqual(['c', 'd'])
    }
  })

  it('prefers other departments at work', () => {
    const people = [person('e1', { department: 'Eng' }), person('e2', { department: 'Eng' }), person('r1', { department: 'Risk' }), person('r2', { department: 'Risk' })]
    const r = matchParticipants(people, { groupSize: 2, kind: 'work', seed: 'dept' })
    for (const g of r.groups) expect(new Set(g.map((id) => id[0])).size).toBe(2)
  })

  it('builds trios and splits remainders into pairs', () => {
    const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => person(id))
    const r = matchParticipants(seven, { groupSize: 3, kind: 'friends', seed: 't' })
    expect(r.groups.map((g) => g.length).sort()).toEqual([2, 2, 3])
    expect(everyone(r)).toHaveLength(7)
  })

  it('places stranded people into the best compatible group', () => {
    // With candidateLimit 1 the Japanese speaker is often stranded and must join a group with a ja speaker.
    const people = [
      person('ja', { languages: ['ja'] }),
      person('b', { languages: ['ja', 'en'] }),
      person('c', { languages: ['ja', 'en'] }),
      ...['e1', 'e2', 'e3', 'e4', 'e5'].map((id) => person(id)),
    ]
    for (let i = 0; i < 25; i++) {
      const r = matchParticipants(people, { groupSize: 2, kind: 'friends', seed: `left-${i}`, candidateLimit: 1 })
      expect(everyone(r)).toHaveLength(8)
      const g = r.groups.find((x) => x.includes('ja'))
      if (g) expect(g.some((id) => id === 'b' || id === 'c')).toBe(true)
    }
  })

  it('leaves someone out when no group can take them', () => {
    const people = [person('a', { languages: ['uk'] }), person('b', { languages: ['nl'] }), person('c', { languages: ['uk', 'nl'] })]
    const r = matchParticipants(people, { groupSize: 2, kind: 'friends', seed: 'x' })
    expect(r.groups).toHaveLength(1)
    expect(r.unmatched).toHaveLength(1)
    const noLang = matchParticipants([person('a', { languages: [] }), person('b')], { groupSize: 2, kind: 'friends', seed: 'y' })
    expect(noLang.groups).toEqual([expect.arrayContaining(['a', 'b'])])
  })

  it('scales to a large workspace quickly', () => {
    const langs = [['en'], ['en', 'nl'], ['uk', 'en'], ['nl']]
    const people = Array.from({ length: 2000 }, (_, i) =>
      person(`p${i}`, { department: `d${i % 12}`, city: `c${i % 5}`, languages: langs[i % 4]!, interests: [`i${i % 20}`, `i${(i * 7) % 20}`] }),
    )
    const t = performance.now()
    const r = matchParticipants(people, { groupSize: 2, kind: 'work', seed: 'big', improveRounds: 5 })
    expect(performance.now() - t).toBeLessThan(5000)
    expect(everyone(r)).toHaveLength(2000)
    expect(r.unmatched.length).toBeLessThan(5)
  })
})
