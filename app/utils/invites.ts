import { isEmail } from '~/utils/errors'

/** Splits pasted text (commas, semicolons, spaces, new lines, "Name <a@b.c>") into unique emails. */
export function parseEmails(text: string): { valid: string[]; invalid: string[] } {
  const tokens = text
    .split(/[\s,;]+/)
    .map((t) => t.replace(/^<|>$/g, '').trim().toLowerCase())
    .filter(Boolean)
  const valid = [...new Set(tokens.filter(isEmail))]
  const invalid = [...new Set(tokens.filter((t) => !isEmail(t) && t.includes('@')))]
  return { valid, invalid }
}

/** "@Acme.com " → "acme.com"; returns null for anything that isn't a domain. */
export function normalizeDomain(input: string): string | null {
  const d = input.trim().toLowerCase().replace(/^@/, '')
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : null
}

export function emailDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? ''
}

/** Time zones for the schedule picker, with the browser's own first. */
export function timeZones(current: string): string[] {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return [current, ...all.filter((z) => z !== current)]
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Amsterdam'
}
