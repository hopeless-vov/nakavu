export const AVATAR_TONES = ['accent', 'moss', 'clay', 'plum', 'teal'] as const
export type AvatarTone = (typeof AVATAR_TONES)[number]

export const avatarToneClass: Record<AvatarTone, string> = {
  accent: 'bg-accent text-on-accent',
  moss: 'bg-moss text-on-accent',
  clay: 'bg-clay text-on-accent',
  plum: 'bg-plum text-on-accent',
  teal: 'bg-teal text-on-accent',
}

/** Stable colour for a person or workspace: the same seed always gets the same tone. */
export function avatarTone(seed: string): AvatarTone {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0
  return AVATAR_TONES[hash % AVATAR_TONES.length]!
}

/** "Priya Raman" → "PR", "Northwind Group" → "NG", "" → "?" */
export function initials(...parts: (string | null | undefined)[]): string {
  const words = parts
    .flatMap((p) => (p ?? '').trim().split(/\s+/))
    .filter((w) => /^\p{L}/u.test(w))
  if (words.length === 0) return '?'
  const first = words[0]!
  const last = words.length > 1 ? words[words.length - 1]! : ''
  return (first[0]! + (last[0] ?? '')).toUpperCase()
}
