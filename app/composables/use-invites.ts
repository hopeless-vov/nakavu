import { useClipboard } from '@vueuse/core'
import { useLocalePath } from '#imports'
import * as invitesApi from '~/api/invites'
import { useSiteUrl } from '~/composables/use-site-url'
import { useSessionStore } from '~/stores/session'
import { useWorkspacesStore } from '~/stores/workspaces'
import type { Invite, MyWorkspace } from '~/types/domain'
import { errorKey } from '~/utils/errors'
import { parseEmails } from '~/utils/invites'
import { computed, type MaybeRefOrGetter, ref, toValue } from 'vue'

/** The invite link and personal email invites for one workspace. */
export function useInvites(source: MaybeRefOrGetter<MyWorkspace | undefined>) {
  const siteUrl = useSiteUrl()
  const localePath = useLocalePath()
  const session = useSessionStore()
  const store = useWorkspacesStore()
  const { copy, copied } = useClipboard({ copiedDuring: 2000, legacy: true })

  const workspace = computed(() => toValue(source))
  const link = computed(() => (workspace.value ? `${siteUrl}${localePath({ name: 'join', params: { token: workspace.value.inviteToken } })}` : ''))

  const emailsText = ref('')
  const parsed = computed(() => parseEmails(emailsText.value))
  const pending = ref<Invite[]>([])
  const sending = ref(false)
  const error = ref('')
  const sentCount = ref(0)

  async function copyLink() {
    await copy(link.value)
  }

  async function share(title: string, text: string) {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, text, url: link.value }).catch(() => undefined)
      return true
    }
    await copyLink()
    return false
  }

  async function loadPending() {
    if (!workspace.value) return
    pending.value = await invitesApi.listInvites(workspace.value.id)
  }

  async function send() {
    error.value = ''
    const ws = workspace.value
    if (!ws || !session.userId) return
    if (parsed.value.valid.length === 0) {
      error.value = 'invite.errors.none'
      return
    }
    sending.value = true
    try {
      await invitesApi.createInvites(ws.id, parsed.value.valid, session.userId)
      sentCount.value = parsed.value.valid.length
      emailsText.value = parsed.value.invalid.join(', ')
      await loadPending()
    } catch (e) {
      error.value = errorKey(e)
    } finally {
      sending.value = false
    }
  }

  async function revoke(id: string) {
    await invitesApi.revokeInvite(id)
    pending.value = pending.value.filter((i) => i.id !== id)
  }

  async function rotate() {
    if (workspace.value) await store.rotateInvite(workspace.value.id)
  }

  return { workspace, link, copied, copyLink, share, emailsText, parsed, pending, sending, error, sentCount, loadPending, send, revoke, rotate }
}
