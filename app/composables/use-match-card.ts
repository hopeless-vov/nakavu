import { useLocalStorage } from '@vueuse/core'
import { sharedInterests } from '#shared/catalog'
import { pickStarters } from '#shared/starters'
import { useCatalog } from '~/composables/use-catalog'
import { useMatchesStore } from '~/stores/matches'
import { useSessionStore } from '~/stores/session'
import { useToastStore } from '~/stores/toast'
import { useWorkspacesStore } from '~/stores/workspaces'
import type { Match, MatchFeedback } from '~/types/domain'
import { mailtoLink } from '~/utils/dashboard'
import { errorKey } from '~/utils/errors'
import { buildIcs, downloadFile, suggestedSlot } from '~/utils/ics'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useI18n } from 'vue-i18n'

export const SEEN_MATCHES_KEY = 'nakavu_seen_matches'

/** Everything the dashboard card needs about one match, in the viewer's language. */
export function useMatchCard(source: MaybeRefOrGetter<Match>) {
  const { t, locale } = useI18n()
  const session = useSessionStore()
  const workspaces = useWorkspacesStore()
  const matches = useMatchesStore()
  const toast = useToastStore()
  const { interestLabel, departmentLabel, roleLine, facts } = useCatalog()
  const seen = useLocalStorage<string[]>(SEEN_MATCHES_KEY, [])

  const match = computed(() => toValue(source))
  const me = computed(() => ({ department: session.profile?.department ?? '', interests: session.profile?.interests ?? [] }))
  const kind = computed(() => workspaces.items.find((w) => w.id === match.value.workspaceId)?.kind ?? 'work')
  const month = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'long' }).format(new Date(match.value.roundAt)))

  const partners = computed(() =>
    match.value.partners.map((p) => {
      const shared = new Set(sharedInterests(p.interests, me.value.interests).map((x) => x.toLowerCase()))
      return {
        ...p,
        name: `${p.firstName} ${p.lastName}`.trim(),
        role: roleLine(p),
        facts: facts(p),
        chips: [...p.interests]
          .sort((a, b) => Number(shared.has(b.toLowerCase())) - Number(shared.has(a.toLowerCase())))
          .map((i) => ({ label: interestLabel(i), shared: shared.has(i.toLowerCase()) })),
      }
    }),
  )

  const firstNames = computed(() => partners.value.map((p) => p.firstName).join(' & '))

  const starters = computed(() => {
    const first = match.value.partners[0]
    if (!first) return []
    return pickStarters(match.value.id, me.value, first, kind.value).map((s) =>
      t(s.key, {
        interest: s.params?.interest ? interestLabel(s.params.interest) : '',
        department: s.params?.department ? departmentLabel(s.params.department) : '',
      }),
    )
  })

  const emailHref = computed(() =>
    mailtoLink(
      match.value.partners.map((p) => p.email),
      t('match.email.subject'),
      t('match.email.body', { names: firstNames.value, me: session.profile?.firstName ?? '' }),
    ),
  )

  const isNew = computed(() => !seen.value.includes(match.value.id))
  function markSeen() {
    if (isNew.value) seen.value = [...seen.value.slice(-50), match.value.id]
  }

  function addToCalendar() {
    const ics = buildIcs({
      uid: match.value.id,
      start: suggestedSlot(new Date()),
      minutes: 30,
      title: t('match.calendar.title', { names: firstNames.value }),
      description: t('match.calendar.description', { workspace: match.value.workspaceName }),
    })
    downloadFile(`nakavu-${match.value.id.slice(0, 8)}.ics`, ics)
    toast.show(t('match.calendar.toast', { names: firstNames.value }))
  }

  async function setFeedback(value: MatchFeedback) {
    try {
      await matches.setFeedback(match.value.id, value)
      toast.show(t(`match.feedback.toast.${value}`), value === 'met' ? 'success' : 'default')
    } catch (e) {
      toast.show(t(errorKey(e)), 'error')
    }
  }

  return { match, kind, month, partners, firstNames, starters, emailHref, isNew, markSeen, addToCalendar, setFeedback }
}
