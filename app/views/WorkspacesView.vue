<script setup lang="ts">
import { useLocalePath } from '#imports'
import AvatarBadge from '~/components/ui/AvatarBadge.vue'
import BaseButton from '~/components/ui/BaseButton.vue'
import BaseCard from '~/components/ui/BaseCard.vue'
import BaseModal from '~/components/ui/BaseModal.vue'
import EmptyState from '~/components/ui/EmptyState.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import SegmentedControl from '~/components/ui/SegmentedControl.vue'
import SettingRow from '~/components/ui/SettingRow.vue'
import StatusPill from '~/components/ui/StatusPill.vue'
import ToggleSwitch from '~/components/ui/ToggleSwitch.vue'
import { useSeo } from '~/composables/use-seo'
import { useWorkspaceSettings } from '~/composables/use-workspace-settings'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const localePath = useLocalePath()
const { store, selectedSlug, selected, status, isAdmin, nextDate, afterNextDate, leaveOpen, leaving, setInclude, setSkip, leave } = useWorkspaceSettings()

const tabs = computed(() => store.items.map((w) => ({ value: w.slug, label: w.name })))
const include = computed({ get: () => selected.value?.includeInMatching ?? false, set: (v: boolean) => void setInclude(v) })
const skip = computed({ get: () => !!selected.value?.includeInMatching && !!selected.value?.skipNextRound, set: (v: boolean) => void setSkip(v) })
const skipDescription = computed(() => {
  if (!selected.value?.includeInMatching) return t('settings.skip.needsInclude')
  return selected.value.skipNextRound ? t('settings.skip.on', { next: nextDate.value, back: afterNextDate.value }) : t('settings.skip.off', { next: nextDate.value })
})

useSeo({ title: 'seo.workspaces.title', description: 'seo.workspaces.description', noindex: true })
</script>

<template>
  <div>
    <PageHeader
      :title="t('settings.title')"
      :subtitle="t('settings.subtitle')"
    >
      <template #actions>
        <BaseButton
          variant="secondary"
          :to="localePath('workspace-new')"
        >
          {{ t('dashboard.createWorkspace') }}
        </BaseButton>
      </template>
    </PageHeader>

    <EmptyState
      v-if="store.loaded && !store.items.length"
      :title="t('dashboard.empty.title')"
      :description="t('dashboard.empty.body')"
    >
      <BaseButton :to="localePath('workspace-new')">
        {{ t('dashboard.empty.create') }}
      </BaseButton>
    </EmptyState>

    <div v-else-if="selected">
      <div
        v-if="tabs.length > 1"
        class="mb-6 overflow-x-auto pb-1"
      >
        <SegmentedControl
          v-model="selectedSlug"
          :label="t('settings.pick')"
          :options="tabs"
          size="md"
        />
      </div>

      <BaseCard class="max-w-3xl">
        <div class="flex flex-wrap items-center gap-4 border-b border-line pb-5">
          <AvatarBadge
            :name="selected.name"
            :src="selected.logoUrl"
            size="lg"
            square
          />
          <div class="min-w-0 flex-1">
            <p class="truncate font-display text-2xl text-fg">
              {{ selected.name }}
            </p>
            <p class="text-sm text-muted">
              {{ t('workspace.meta', { count: selected.memberCount, role: t(`workspace.role.${selected.role}`) }, selected.memberCount) }}
              · {{ t(`cadence.${selected.cadence}`) }}
            </p>
          </div>
          <StatusPill
            v-if="status"
            :tone="status.tone"
            dot
          >
            {{ t(`workspace.status.${status.status}`) }}
          </StatusPill>
        </div>

        <div class="divide-y divide-line">
          <SettingRow
            :title="t('settings.include.title')"
            :description="t('settings.include.body')"
          >
            <ToggleSwitch
              v-model="include"
              :label="t('settings.include.title')"
            />
          </SettingRow>
          <SettingRow
            :title="t('settings.skip.title')"
            :description="skipDescription"
            :dimmed="!selected.includeInMatching"
          >
            <ToggleSwitch
              v-model="skip"
              :label="t('settings.skip.title')"
              :disabled="!selected.includeInMatching"
            />
          </SettingRow>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <BaseButton
            variant="secondary"
            size="sm"
            :to="localePath({ name: 'workspace-invite', params: { slug: selected.slug } })"
          >
            {{ t('settings.invite') }}
          </BaseButton>
          <BaseButton
            v-if="isAdmin"
            variant="soft"
            size="sm"
            :to="localePath({ name: 'workspace-admin', params: { slug: selected.slug } })"
          >
            {{ t('settings.admin') }}
          </BaseButton>
        </div>
      </BaseCard>

      <BaseCard
        tone="muted"
        class="mt-6 max-w-3xl"
      >
        <SettingRow
          :title="t('settings.leave.title')"
          :description="t('settings.leave.body')"
        >
          <BaseButton
            variant="danger"
            size="sm"
            @click="leaveOpen = true"
          >
            {{ t('settings.leave.button', { name: selected.name }) }}
          </BaseButton>
        </SettingRow>
      </BaseCard>

      <BaseModal
        v-model:open="leaveOpen"
        :title="t('settings.leave.confirmTitle', { name: selected.name })"
        :description="t('settings.leave.confirmBody')"
      >
        <template #actions>
          <BaseButton
            variant="secondary"
            @click="leaveOpen = false"
          >
            {{ t('settings.leave.stay') }}
          </BaseButton>
          <BaseButton
            variant="danger"
            :loading="leaving"
            @click="leave"
          >
            {{ t('settings.leave.confirm') }}
          </BaseButton>
        </template>
      </BaseModal>
    </div>

    <div
      v-else
      class="h-64 max-w-3xl animate-pulse rounded-2xl bg-surface-2"
      aria-busy="true"
    />
  </div>
</template>
