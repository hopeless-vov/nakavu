<script setup lang="ts">
import { useLocalePath } from '#imports'
import AvatarBadge from '~/components/ui/AvatarBadge.vue'
import BaseButton from '~/components/ui/BaseButton.vue'
import EmptyState from '~/components/ui/EmptyState.vue'
import FeedbackPicker from '~/components/ui/FeedbackPicker.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import SegmentedControl from '~/components/ui/SegmentedControl.vue'
import { ALL, useHistory } from '~/composables/use-history'
import { useSeo } from '~/composables/use-seo'
import { motion } from 'motion-v'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const localePath = useLocalePath()
const { matches, filter, workspaces, items, summary, setFeedback } = useHistory()

const filters = computed(() => [{ value: ALL, label: t('history.all') }, ...workspaces.value])
const options = computed(() => (['met', 'not_yet', 'skipped'] as const).map((value) => ({ value, label: t(`match.feedback.${value}`) })))

useSeo({ title: 'seo.history.title', description: 'seo.history.description', noindex: true })
</script>

<template>
  <div>
    <PageHeader
      :title="t('history.title')"
      :subtitle="summary || undefined"
    />

    <div
      v-if="workspaces.length > 1"
      class="mb-6 overflow-x-auto pb-1"
    >
      <SegmentedControl
        v-model="filter"
        :label="t('history.filter')"
        :options="filters"
        size="md"
      />
    </div>

    <div
      v-if="!matches.loaded"
      class="space-y-3"
      aria-busy="true"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="h-24 animate-pulse rounded-2xl bg-surface-2"
      />
    </div>

    <EmptyState
      v-else-if="!items.length"
      :title="t('history.empty.title')"
      :description="t('history.empty.body')"
    >
      <BaseButton
        variant="secondary"
        :to="localePath('dashboard')"
      >
        {{ t('invite.toDashboard') }}
      </BaseButton>
    </EmptyState>

    <ul
      v-else
      class="flex flex-col gap-3"
    >
      <motion.li
        v-for="(m, i) in items"
        :key="m.id"
        class="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:p-5"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }"
      >
        <div class="flex min-w-0 flex-1 items-center gap-4">
          <div class="flex shrink-0 -space-x-3">
            <AvatarBadge
              v-for="p in m.partners"
              :key="p.id"
              :name="`${p.firstName} ${p.lastName}`"
              :src="p.avatarUrl"
              class="ring-2 ring-surface"
            />
          </div>
          <div class="min-w-0">
            <p class="truncate font-semibold text-fg">
              {{ m.names || t('history.left') }}
            </p>
            <p
              v-if="m.roles"
              class="truncate text-sm text-muted"
            >
              {{ m.roles }}
            </p>
            <p class="text-xs text-muted">
              {{ m.month }} · {{ m.workspaceName }}
            </p>
          </div>
        </div>
        <FeedbackPicker
          :label="t('match.feedback.label')"
          :value="m.myFeedback"
          :options="options"
          @select="setFeedback(m.id, $event)"
        />
      </motion.li>
    </ul>
  </div>
</template>
