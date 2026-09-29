import { isWeekly, nextRoundAt, upcomingRounds } from '#shared/schedule'
import { useWorkspacesStore } from '~/stores/workspaces'
import type { Cadence, Workspace, WorkspaceInput, WorkspaceKind } from '~/types/domain'
import { errorKey } from '~/utils/errors'
import { browserTimeZone, normalizeDomain } from '~/utils/invites'
import { computed, inject, type InjectionKey, provide, reactive, ref, watch } from 'vue'

export interface WorkspaceDraft {
  name: string
  kind: WorkspaceKind
  groupSize: 2 | 3
  cadence: Cadence
  anchorDay: number
  roundHour: number
  timezone: string
  allowedDomains: string[]
}

export function defaultDraft(): WorkspaceDraft {
  return { name: '', kind: 'work', groupSize: 2, cadence: 'monthly', anchorDay: 1, roundHour: 9, timezone: browserTimeZone(), allowedDomains: [] }
}

/**
 * Create/edit form for a workspace: validation, domain chips and a live
 * preview of the next rounds from the same schedule code the server uses.
 */
export function useWorkspaceForm(initial: Partial<WorkspaceDraft> = {}) {
  const store = useWorkspacesStore()
  const draft = reactive<WorkspaceDraft>({ ...defaultDraft(), ...initial, allowedDomains: [...(initial.allowedDomains ?? [])] })
  const domainInput = ref('')
  const errors = ref<Partial<Record<'name' | 'domain' | 'form', string>>>({})
  const saving = ref(false)
  const logo = ref<File | null>(null)

  // Switching between monthly-style and weekly-style cadences resets the day to something valid.
  watch(
    () => isWeekly(draft.cadence),
    () => {
      draft.anchorDay = 1
    },
  )
  // Friends' groups don't need a domain fence.
  watch(
    () => draft.kind,
    (kind) => {
      if (kind === 'friends') draft.allowedDomains = []
    },
  )

  const upcoming = computed(() => upcomingRounds(draft, new Date(), 3))

  function addDomain() {
    const d = normalizeDomain(domainInput.value)
    if (!d) {
      if (domainInput.value.trim()) errors.value = { ...errors.value, domain: 'workspaceForm.errors.domain' }
      return
    }
    if (!draft.allowedDomains.includes(d)) draft.allowedDomains.push(d)
    domainInput.value = ''
    errors.value = { ...errors.value, domain: undefined }
  }

  function removeDomain(d: string) {
    draft.allowedDomains = draft.allowedDomains.filter((x) => x !== d)
  }

  function toInput(): WorkspaceInput {
    return { ...draft, name: draft.name.trim(), allowedDomains: [...draft.allowedDomains], nextRoundAt: nextRoundAt(draft, new Date()).toISOString() }
  }

  function validate() {
    const name = draft.name.trim()
    errors.value = name.length === 0 ? { name: 'workspaceForm.errors.name' } : name.length > 80 ? { name: 'workspaceForm.errors.nameLong' } : {}
    return !errors.value.name
  }

  async function create(): Promise<Workspace | null> {
    addDomain()
    if (!validate()) return null
    saving.value = true
    try {
      const ws = await store.create(toInput())
      if (logo.value) await store.uploadLogo(ws.id, logo.value).catch(() => undefined)
      return ws
    } catch (e) {
      errors.value = { form: errorKey(e) }
      return null
    } finally {
      saving.value = false
    }
  }

  async function save(id: string): Promise<boolean> {
    if (!validate()) return false
    saving.value = true
    try {
      await store.update(id, toInput())
      if (logo.value) await store.uploadLogo(id, logo.value)
      return true
    } catch (e) {
      errors.value = { form: errorKey(e) }
      return false
    } finally {
      saving.value = false
    }
  }

  return { draft, domainInput, errors, saving, logo, upcoming, addDomain, removeDomain, validate, create, save, toInput }
}

export type WorkspaceForm = ReturnType<typeof useWorkspaceForm>
const WORKSPACE_FORM: InjectionKey<WorkspaceForm> = Symbol('workspace-form')

/** Shares one form between a view and the WorkspaceFormFields editor below it. */
export function provideWorkspaceForm(form: WorkspaceForm) {
  provide(WORKSPACE_FORM, form)
  return form
}

export function injectWorkspaceForm(): WorkspaceForm {
  const form = inject(WORKSPACE_FORM)
  if (!form) throw new Error('WorkspaceFormFields needs provideWorkspaceForm() in a parent')
  return form
}
