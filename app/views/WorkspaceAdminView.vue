<script setup lang="ts">
import { useLocalePath } from '#imports'
import MemberActions from '~/components/MemberActions.vue'
import AvatarBadge from '~/components/ui/AvatarBadge.vue'
import BarChart from '~/components/ui/BarChart.vue'
import BaseButton from '~/components/ui/BaseButton.vue'
import BaseCard from '~/components/ui/BaseCard.vue'
import EmptyState from '~/components/ui/EmptyState.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import SegmentedControl from '~/components/ui/SegmentedControl.vue'
import StatTile from '~/components/ui/StatTile.vue'
import StatusPill from '~/components/ui/StatusPill.vue'
import TextField from '~/components/ui/TextField.vue'
import WorkspaceSettingsForm from '~/components/WorkspaceSettingsForm.vue'
import { PAGE_SIZE, useAdmin } from '~/composables/use-admin'
import { useSeo } from '~/composables/use-seo'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, n } = useI18n()
const localePath = useLocalePath()
const { workspace, isOwner, stats, query, limit, state, bars, lastMet, filtered, visible, load, setRole, remove, deleteWorkspace } = useAdmin()

const tab = ref<'overview' | 'members' | 'settings'>('overview')
const tabs = computed(() => (['overview', 'members', 'settings'] as const).map((value) => ({ value, label: t(`admin.tabs.${value}`) })))

useSeo({ title: 'seo.admin.title', description: 'seo.admin.description', noindex: true })
</script>

<template>
  <div>
    <div
      v-if="state === 'loading'"
      class="space-y-4"
      aria-busy="true"
    >
      <div class="h-12 w-72 animate-pulse rounded-lg bg-surface-2" />
      <div class="grid gap-3 sm:grid-cols-4">
        <div
          v-for="i in 4"
          :key="i"
          class="h-28 animate-pulse rounded-2xl bg-surface-2"
        />
      </div>
    </div>

    <EmptyState
      v-else-if="state === 'forbidden'"
      :title="t('admin.forbidden')"
    >
      <BaseButton :to="localePath('workspaces')">
        {{ t('app.nav.workspaces') }}
      </BaseButton>
    </EmptyState>

    <EmptyState
      v-else-if="state === 'error'"
      :title="t('common.somethingWrong')"
    >
      <BaseButton @click="load">
        {{ t('admin.retry') }}
      </BaseButton>
    </EmptyState>

    <template v-else-if="workspace && stats">
      <PageHeader
        :eyebrow="t('admin.eyebrow')"
        :title="workspace.name"
      >
        <template #actions>
          <BaseButton
            variant="secondary"
            :to="localePath({ name: 'workspace-invite', params: { slug: workspace.slug } })"
          >
            {{ t('settings.invite') }}
          </BaseButton>
        </template>
      </PageHeader>

      <div class="mb-6 overflow-x-auto pb-1">
        <SegmentedControl
          v-model="tab"
          :label="t('admin.tabs.label')"
          :options="tabs"
          size="md"
        />
      </div>

      <div v-if="tab === 'overview'">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            :label="t('admin.stats.members')"
            :value="n(stats.members)"
          />
          <StatTile
            :label="t('admin.stats.active')"
            :value="n(stats.active)"
          />
          <StatTile
            :label="t('admin.stats.away')"
            :value="n(stats.paused + stats.skipping)"
            :hint="t('admin.stats.awayHint', { paused: stats.paused, skipping: stats.skipping })"
          />
          <StatTile
            accent
            :label="lastMet ? t('admin.stats.met', { month: lastMet.label }) : t('admin.stats.metNone')"
            :value="lastMet ? `${Math.round(lastMet.value * 100)}%` : '—'"
          />
        </div>
        <BaseCard class="mt-6">
          <h2 class="font-display text-2xl">
            {{ t('admin.chart.title') }}
          </h2>
          <p class="mt-1 mb-6 text-sm text-muted">
            {{ t('admin.chart.subtitle') }}
          </p>
          <BarChart
            :title="t('admin.chart.title')"
            :bars="bars"
            :empty-label="t('admin.chart.empty')"
          />
        </BaseCard>
      </div>

      <BaseCard
        v-else-if="tab === 'members'"
        padding="none"
      >
        <div class="border-b border-line p-4 sm:p-5">
          <TextField
            v-model="query"
            type="search"
            :placeholder="t('admin.members.search')"
          />
        </div>
        <ul class="divide-y divide-line">
          <li
            v-for="m in visible"
            :key="m.userId"
            class="flex items-center gap-3 px-4 py-3 sm:px-5"
          >
            <AvatarBadge
              :name="m.name"
              :src="m.person.avatarUrl"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-fg">
                {{ m.name }} <span
                  v-if="m.isMe"
                  class="text-sm font-normal text-muted"
                >{{ t('admin.members.you') }}</span>
              </p>
              <p class="truncate text-sm text-muted">
                {{ m.subtitle || m.person.email }}
              </p>
            </div>
            <StatusPill
              class="hidden sm:inline-flex"
              :tone="m.role === 'member' ? 'neutral' : 'ink'"
            >
              {{ t(`workspace.role.${m.role}`) }}
            </StatusPill>
            <StatusPill :tone="m.status.tone">
              {{ t(`workspace.status.${m.status.status}`) }}
            </StatusPill>
            <MemberActions
              v-if="!m.isMe && m.role !== 'owner'"
              :name="m.name"
              :role="m.role"
              @role="setRole(m.userId, $event)"
              @remove="remove(m.userId)"
            />
            <span
              v-else
              class="size-8"
            />
          </li>
        </ul>
        <div class="flex items-center justify-between gap-3 border-t border-line p-4 text-sm text-muted sm:px-5">
          <span>{{ t('admin.members.showing', { shown: visible.length, total: filtered.length }) }}</span>
          <BaseButton
            v-if="visible.length < filtered.length"
            variant="ghost"
            size="sm"
            @click="limit += PAGE_SIZE"
          >
            {{ t('admin.members.more') }}
          </BaseButton>
        </div>
      </BaseCard>

      <WorkspaceSettingsForm
        v-else
        :workspace="workspace"
        :can-delete="isOwner"
        @delete="deleteWorkspace"
      />
    </template>
  </div>
</template>
