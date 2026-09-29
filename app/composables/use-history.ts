import { navigateTo, useRoute } from '#imports'
import { useCatalog } from '~/composables/use-catalog'
import { useMatchesStore } from '~/stores/matches'
import { useToastStore } from '~/stores/toast'
import type { MatchFeedback } from '~/types/domain'
import { errorKey } from '~/utils/errors'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

export const ALL = 'all'
const FEEDBACK: MatchFeedback[] = ['met', 'not_yet', 'skipped']

/** Past matches, filterable by workspace, with "did you meet?" answers. */
export function useHistory() {
  const { t, locale } = useI18n()
  const matches = useMatchesStore()
  const toast = useToastStore()
  const { roleLine } = useCatalog()
  const filter = ref<string>(ALL)

  const workspaces = computed(() => {
    const seen = new Map<string, string>()
    for (const m of matches.items) if (!seen.has(m.workspaceId)) seen.set(m.workspaceId, m.workspaceName)
    return [...seen].map(([value, label]) => ({ value, label }))
  })

  const monthFmt = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }))

  const items = computed(() =>
    matches.items
      .filter((m) => filter.value === ALL || m.workspaceId === filter.value)
      .map((m) => ({
        ...m,
        names: m.partners.map((p) => `${p.firstName} ${p.lastName}`.trim()).join(' & '),
        roles: m.partners.map(roleLine).filter(Boolean).join(' · '),
        month: monthFmt.value.format(new Date(m.roundAt)),
      })),
  )

  const summary = computed(() => {
    const list = items.value
    if (!list.length) return ''
    const met = list.filter((m) => m.myFeedback === 'met').length
    // A full date keeps the grammar right (uk genitive: «з 1 червня»).
    const since = new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(list[list.length - 1]!.roundAt))
    return t('history.summary', { count: list.length, since, met }, list.length)
  })

  async function setFeedback(id: string, value: MatchFeedback) {
    try {
      await matches.setFeedback(id, value)
    } catch (e) {
      toast.show(t(errorKey(e)), 'error')
    }
  }

  // Answers straight from the "did you meet?" email: /app/history?match=…&answer=met
  const route = useRoute()
  async function applyAnswerFromLink() {
    const { match, answer } = route.query
    if (typeof match !== 'string' || !FEEDBACK.includes(answer as MatchFeedback)) return
    await setFeedback(match, answer as MatchFeedback)
    toast.show(t(`match.feedback.toast.${answer}`), answer === 'met' ? 'success' : 'default')
    await navigateTo({ query: {} }, { replace: true })
  }

  onMounted(async () => {
    await matches.load().catch(() => undefined)
    await applyAnswerFromLink()
  })

  return { matches, filter, workspaces, items, summary, setFeedback }
}
