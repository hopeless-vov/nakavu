<script setup lang="ts">
import BaseCard from '~/components/ui/BaseCard.vue'
import CountdownTiles from '~/components/ui/CountdownTiles.vue'
import { useNow } from '~/composables/use-now'
import type { MyWorkspace } from '~/types/domain'
import { countdown, participation } from '~/utils/dashboard'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ workspace: MyWorkspace }>()
const { t, locale } = useI18n()
const now = useNow()

const at = computed(() => new Date(props.workspace.nextRoundAt))
const left = computed(() => countdown(at.value, now.value))
const parts = computed(() => [
  { value: left.value.days, label: t('dashboard.next.days') },
  { value: left.value.hours, label: t('dashboard.next.hours') },
  { value: left.value.minutes, label: t('dashboard.next.minutes') },
  { value: left.value.seconds, label: t('dashboard.next.seconds') },
])
const when = computed(() =>
  new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(at.value),
)
const status = computed(() => participation(props.workspace).status)
</script>

<template>
  <BaseCard>
    <p class="text-xs font-semibold tracking-[.14em] text-muted uppercase">
      {{ t('dashboard.next.title') }}
    </p>
    <div class="mt-4">
      <CountdownTiles :parts="parts" />
    </div>
    <p class="mt-4 text-sm text-muted">
      {{ t('dashboard.next.when', { when, workspace: workspace.name }) }}
      {{ t(`dashboard.next.status.${status}`) }}
    </p>
  </BaseCard>
</template>
