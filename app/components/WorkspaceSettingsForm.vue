<script setup lang="ts">
import BaseButton from '~/components/ui/BaseButton.vue'
import BaseCard from '~/components/ui/BaseCard.vue'
import BaseModal from '~/components/ui/BaseModal.vue'
import SettingRow from '~/components/ui/SettingRow.vue'
import TextField from '~/components/ui/TextField.vue'
import WorkspaceFormFields from '~/components/WorkspaceFormFields.vue'
import { provideWorkspaceForm, useWorkspaceForm } from '~/composables/use-workspace-form'
import { useToastStore } from '~/stores/toast'
import type { MyWorkspace } from '~/types/domain'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

/** Edit a workspace's details and schedule; owners can delete it. */
const props = defineProps<{ workspace: MyWorkspace; canDelete: boolean }>()
const emit = defineEmits<{ delete: [] }>()
const { t } = useI18n()
const toast = useToastStore()

const form = provideWorkspaceForm(
  useWorkspaceForm({
    name: props.workspace.name,
    kind: props.workspace.kind,
    groupSize: props.workspace.groupSize,
    cadence: props.workspace.cadence,
    anchorDay: props.workspace.anchorDay,
    roundHour: props.workspace.roundHour,
    timezone: props.workspace.timezone,
    allowedDomains: props.workspace.allowedDomains,
  }),
)

async function save() {
  if (await form.save(props.workspace.id)) toast.show(t('admin.toast.saved'), 'success')
}

const deleteOpen = ref(false)
const confirmText = ref('')
const canConfirm = computed(() => confirmText.value.trim() === props.workspace.name)
</script>

<template>
  <form
    novalidate
    @submit.prevent="save"
  >
    <WorkspaceFormFields :logo-url="workspace.logoUrl" />
    <div class="mt-6 flex flex-wrap items-center gap-3">
      <BaseButton
        type="submit"
        :loading="form.saving.value"
      >
        {{ t('common.save') }}
      </BaseButton>
      <p
        v-if="form.errors.value.form"
        class="text-sm text-danger"
        role="alert"
      >
        {{ t(form.errors.value.form) }}
      </p>
    </div>
  </form>

  <BaseCard
    v-if="canDelete"
    tone="muted"
    class="mt-8"
  >
    <SettingRow
      :title="t('admin.delete.title')"
      :description="t('admin.delete.body')"
    >
      <BaseButton
        variant="danger"
        size="sm"
        @click="deleteOpen = true"
      >
        {{ t('admin.delete.button') }}
      </BaseButton>
    </SettingRow>
  </BaseCard>

  <BaseModal
    v-model:open="deleteOpen"
    :title="t('admin.delete.confirmTitle', { name: workspace.name })"
    :description="t('admin.delete.confirmBody', { name: workspace.name })"
  >
    <TextField
      v-model="confirmText"
      :placeholder="workspace.name"
      :label="t('admin.delete.typeName')"
    />
    <template #actions>
      <BaseButton
        variant="secondary"
        @click="deleteOpen = false"
      >
        {{ t('common.cancel') }}
      </BaseButton>
      <BaseButton
        variant="danger"
        :disabled="!canConfirm"
        @click="emit('delete')"
      >
        {{ t('admin.delete.confirm') }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
