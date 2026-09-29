import {
  DEPARTMENTS,
  INTERESTS,
  isDepartmentKey,
  isInterestKey,
  isLanguage,
  LANGUAGES,
  normalizeInterest,
  sharedInterests,
  sharedLanguages,
} from '../../shared/catalog'
import { GENERIC_STARTERS, pickStarters } from '../../shared/starters'

describe('catalog', () => {
  it('includes Ukrainian, English and Dutch', () => {
    expect(LANGUAGES).toEqual(expect.arrayContaining(['uk', 'en', 'nl']))
    expect(new Set(INTERESTS).size).toBe(INTERESTS.length)
    expect(new Set(DEPARTMENTS).size).toBe(DEPARTMENTS.length)
  })

  it('recognises keys', () => {
    expect(isLanguage('uk')).toBe(true)
    expect(isLanguage('klingon')).toBe(false)
    expect(isInterestKey('hiking')).toBe(true)
    expect(isInterestKey('Hiking')).toBe(false)
    expect(isDepartmentKey('risk')).toBe(true)
  })

  it('normalises typed interests and maps known labels to keys', () => {
    expect(normalizeInterest('  bird   watching ')).toBe('bird watching')
    expect(normalizeInterest('x'.repeat(60))).toHaveLength(40)
    expect(normalizeInterest('ПОХОДИ', { hiking: 'Походи' })).toBe('hiking')
    expect(normalizeInterest('Kayaking', { hiking: 'Походи' })).toBe('Kayaking')
  })

  it('finds shared interests and languages', () => {
    expect(sharedInterests(['Jazz', 'hiking', 'Tea'], ['tea', 'jazz'])).toEqual(['Jazz', 'Tea'])
    expect(sharedLanguages(['uk', 'en'], ['en', 'nl'])).toEqual(['en'])
  })
})

describe('pickStarters', () => {
  const me = { department: 'Payments', interests: ['jazz', 'hiking'] }
  const them = { department: 'Risk', interests: ['Hiking', 'coffee'] }

  it('leads with a shared interest and their team, then generic ones', () => {
    const s = pickStarters('m1', me, them, 'work')
    expect(s).toHaveLength(3)
    expect(s[0]).toEqual({ key: 'starters.sharedInterest', params: { interest: 'Hiking' } })
    expect(s[1]).toEqual({ key: 'starters.theirTeam', params: { department: 'Risk' } })
    expect(s[2]!.key).toMatch(/^starters\.generic\.\d$/)
  })

  it('is stable per match and varies between matches', () => {
    expect(pickStarters('m1', me, them, 'work')).toEqual(pickStarters('m1', me, them, 'work'))
    const keys = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((id) => pickStarters(id, me, { department: '', interests: [] }, 'friends', 1)[0]!.key))
    expect(keys.size).toBeGreaterThan(1)
  })

  it('skips the team starter for friends or the same department', () => {
    expect(pickStarters('m', me, them, 'friends').some((s) => s.key === 'starters.theirTeam')).toBe(false)
    expect(pickStarters('m', me, { ...them, department: 'payments' }, 'work').some((s) => s.key === 'starters.theirTeam')).toBe(false)
  })

  it('never returns more than there are generic starters', () => {
    const s = pickStarters('m', { department: '', interests: [] }, { department: '', interests: [] }, 'friends', 20)
    expect(s).toHaveLength(GENERIC_STARTERS)
    expect(new Set(s.map((x) => x.key)).size).toBe(GENERIC_STARTERS)
  })
})
