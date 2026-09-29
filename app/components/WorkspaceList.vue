<script setup lang="ts">
import { NuxtLink } from '#components'
import { useLocalePath } from '#imports'
import AvatarBadge from '~/components/ui/AvatarBadge.vue'
import StatusPill from '~/components/ui/StatusPill.vue'
import type { MyWorkspace } from '~/types/domain'
import { participation } from '~/utils/dashboard'
import { useI18n } from 'vue-i18n'

defineProps<{ workspaces: MyWorkspace[] }>()
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <ul class="flex flex-col gap-2">
    <li
      v-for="w in workspaces"
      :key="w.id"
    >
      <NuxtLink
        :to="localePath({ name: 'workspaces', query: { ws: w.slug } })"
        class="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:bg-surface-2"
      >
        <AvatarBadge
          :name="w.name"
          :src="w.logoUrl"
          square
        />
        <span class="min-w-0 flex-1">
          <span class="block truncate font-semibold text-fg">{{ w.name }}</span>
          <span class="block truncate text-xs text-muted">{{ t('workspace.meta', { count: w.memberCount, role: t(`workspace.role.${w.role}`) }, w.memberCount) }}</span>
        </span>
        <StatusPill :tone="participation(w).tone">
          {{ t(`workspace.status.${participation(w).status}`) }}
        </StatusPill>
      </NuxtLink>
    </li>
  </ul>
</template>
