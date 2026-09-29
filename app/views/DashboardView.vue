<script setup lang="ts">
import { useLocalePath } from '#imports'
import CurrentMatchCard from '~/components/CurrentMatchCard.vue'
import NextRoundCard from '~/components/NextRoundCard.vue'
import BaseButton from '~/components/ui/BaseButton.vue'
import BaseCard from '~/components/ui/BaseCard.vue'
import EmptyState from '~/components/ui/EmptyState.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import TwoCups from '~/components/ui/TwoCups.vue'
import WorkspaceList from '~/components/WorkspaceList.vue'
import { useDashboard } from '~/composables/use-dashboard'
import { useSeo } from '~/composables/use-seo'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { greeting, firstName, state, current, decoys, nextRound, workspaces } = useDashboard()

const subtitle = computed(() => {
  if (state.value === 'matched') return t('dashboard.subtitle.matched')
  if (state.value === 'waiting' && nextRound.value) {
    const when = new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long' }).format(new Date(nextRound.value.at))
    return t('dashboard.subtitle.waiting', { when })
  }
  if (state.value === 'waiting') return t('dashboard.subtitle.paused')
  return t('dashboard.subtitle.empty')
})

useSeo({ title: 'seo.dashboard.title', description: 'seo.dashboard.description', noindex: true })
</script>

<template>
  <div>
    <PageHeader
      :title="t(greeting, { name: firstName })"
      :subtitle="state === 'loading' ? undefined : subtitle"
    />

    <div
      v-if="state === 'loading'"
      class="grid gap-6 lg:grid-cols-[1fr_340px]"
      aria-busy="true"
    >
      <div class="h-96 animate-pulse rounded-[28px] bg-surface-2" />
      <div class="h-64 animate-pulse rounded-2xl bg-surface-2" />
    </div>

    <EmptyState
      v-else-if="state === 'empty'"
      :title="t('dashboard.empty.title')"
      :description="t('dashboard.empty.body')"
    >
      <BaseButton :to="localePath('workspace-new')">
        {{ t('dashboard.empty.create') }}
      </BaseButton>
    </EmptyState>

    <div
      v-else
      class="grid items-start gap-6 lg:grid-cols-[1fr_340px]"
    >
      <div class="flex flex-col gap-6">
        <CurrentMatchCard
          v-for="m in current"
          :key="m.id"
          :match="m"
          :decoys="decoys[m.workspaceId] ?? []"
        />
        <BaseCard
          v-if="state === 'waiting'"
          padding="lg"
          class="text-center"
        >
          <div class="mx-auto max-w-xs">
            <TwoCups />
          </div>
          <h2 class="mt-4 text-2xl">
            {{ t('dashboard.waiting.title') }}
          </h2>
          <p class="mx-auto mt-2 max-w-md text-muted">
            {{ t('dashboard.waiting.body') }}
          </p>
          <BaseButton
            class="mt-6"
            variant="secondary"
            :to="localePath('account')"
          >
            {{ t('dashboard.waiting.profile') }}
          </BaseButton>
        </BaseCard>
      </div>

      <aside class="flex flex-col gap-6">
        <NextRoundCard
          v-if="nextRound"
          :workspace="nextRound.workspace"
        />
        <div>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-sans text-base font-semibold">
              {{ t('dashboard.workspaces') }}
            </h2>
            <span class="text-sm text-muted">{{ workspaces.items.length }}</span>
          </div>
          <WorkspaceList :workspaces="workspaces.items" />
          <BaseButton
            variant="ghost"
            block
            class="mt-2 border border-dashed border-line"
            :to="localePath('workspace-new')"
          >
            {{ t('dashboard.createWorkspace') }}
          </BaseButton>
        </div>
      </aside>
    </div>
  </div>
</template>
