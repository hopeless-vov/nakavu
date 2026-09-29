import { DEPARTMENTS, INTERESTS, isDepartmentKey, isInterestKey, isLanguage, LANGUAGES } from '#shared/catalog'
import type { MeetingFormat, PersonCard } from '~/types/domain'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Human labels for catalogue keys in the current language. Custom values
 * (typed interests, free-text departments) are shown as typed.
 */
export function useCatalog() {
  const { t } = useI18n()

  const interestLabel = (value: string) => (isInterestKey(value) ? t(`catalog.interests.${value}`) : value)
  const languageLabel = (code: string) => (isLanguage(code) ? t(`catalog.languages.${code}`) : code)
  const departmentLabel = (value: string) => (isDepartmentKey(value) ? t(`catalog.departments.${value}`) : value)
  const formatLabel = (format: MeetingFormat) => t(`catalog.formats.${format}`)

  const languageOptions = computed(() => LANGUAGES.map((code) => ({ value: code, label: languageLabel(code) })))
  const interestOptions = computed(() => INTERESTS.map((key) => ({ value: key, label: interestLabel(key) })))
  const departmentOptions = computed(() => DEPARTMENTS.map((key) => ({ value: key, label: departmentLabel(key) })))
  const interestLabels = computed(() => Object.fromEntries(INTERESTS.map((k) => [k, interestLabel(k)])))

  /** "Data Engineer, Risk" */
  const roleLine = (p: Pick<PersonCard, 'jobTitle' | 'department'>) => [p.jobTitle, p.department && departmentLabel(p.department)].filter(Boolean).join(', ')

  /** City, meeting format and languages, for a person card. */
  const facts = (p: Pick<PersonCard, 'city' | 'meetingFormat' | 'languages'>) =>
    [p.city, formatLabel(p.meetingFormat), p.languages.map(languageLabel).join(', ')].filter(Boolean)

  return {
    interestLabel,
    languageLabel,
    departmentLabel,
    formatLabel,
    languageOptions,
    interestOptions,
    departmentOptions,
    interestLabels,
    roleLine,
    facts,
  }
}
