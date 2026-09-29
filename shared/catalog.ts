// Stable keys for things people pick from lists. Stored in the database as
// keys, so a Ukrainian and a Dutch colleague who both picked "hiking" share it.
// Labels live in the locale files (interests.*, languages.*, departments.*).
// Anything a person types themselves is stored as plain text.

export const LANGUAGES = ['uk', 'en', 'nl', 'de', 'fr', 'es', 'pt', 'it', 'pl', 'hi', 'zh', 'ar', 'tr', 'ja'] as const
export type LanguageCode = (typeof LANGUAGES)[number]

export const INTERESTS = [
  'coffee',
  'sourdough',
  'cooking',
  'board-games',
  'gaming',
  'hiking',
  'running',
  'cycling',
  'climbing',
  'yoga',
  'football',
  'jazz',
  'concerts',
  'podcasts',
  'reading',
  'films',
  'photography',
  'travel',
  'gardening',
  'parenting',
  'pets',
  'volunteering',
  'languages',
  'design',
  'startups',
] as const
export type InterestKey = (typeof INTERESTS)[number]

export const DEPARTMENTS = [
  'engineering',
  'product',
  'design',
  'data',
  'marketing',
  'sales',
  'finance',
  'risk',
  'legal',
  'people',
  'operations',
  'customer-success',
] as const

export const MAX_INTERESTS = 30
export const MAX_ASK_ME_ABOUT = 80

const isKey = <T extends string>(list: readonly T[], value: string): value is T => (list as readonly string[]).includes(value)

export const isLanguage = (value: string): value is LanguageCode => isKey(LANGUAGES, value)
export const isInterestKey = (value: string): value is InterestKey => isKey(INTERESTS, value)
export const isDepartmentKey = (value: string): value is (typeof DEPARTMENTS)[number] => isKey(DEPARTMENTS, value)

/**
 * Normalises a typed interest: trims, collapses spaces, caps length, and maps
 * it onto a catalogue key when the text matches a known label.
 */
export function normalizeInterest(text: string, knownLabels: Record<string, string> = {}): string {
  const clean = text.trim().replace(/\s+/g, ' ').slice(0, 40)
  const lower = clean.toLowerCase()
  const key = Object.entries(knownLabels).find(([, label]) => label.toLowerCase() === lower)?.[0]
  return key ?? clean
}

/** Interests two people have in common (case-insensitive), in the first person's order. */
export function sharedInterests(a: string[], b: string[]): string[] {
  const set = new Set(b.map((x) => x.toLowerCase()))
  return a.filter((x) => set.has(x.toLowerCase()))
}

/** Languages two people have in common. */
export function sharedLanguages(a: string[], b: string[]): string[] {
  return a.filter((x) => b.includes(x))
}
