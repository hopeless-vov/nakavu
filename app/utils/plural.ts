/**
 * Ukrainian plural form index for vue-i18n messages written as "one | few | many":
 * 1 учасник · 2–4 учасники · 5+ учасників (11–14 → many). Two-form messages fall back to one/other.
 */
export function ukrainianPlural(choice: number, choicesLength: number): number {
  if (choicesLength < 3) return choice === 1 ? 0 : 1
  const n = Math.abs(choice) % 100
  const last = n % 10
  if (n > 10 && n < 20) return 2
  if (last === 1) return 0
  if (last >= 2 && last <= 4) return 1
  return 2
}
