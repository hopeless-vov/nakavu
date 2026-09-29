<script setup lang="ts">
export type PillTone = 'sage' | 'accent' | 'neutral' | 'ink'

withDefaults(defineProps<{ tone?: PillTone; dot?: boolean }>(), { tone: 'neutral' })

const toneClass: Record<PillTone, string> = {
  sage: 'bg-sage-soft text-sage-text',
  accent: 'bg-accent-soft text-accent-text',
  neutral: 'bg-surface-2 text-muted',
  ink: 'bg-ink text-on-ink',
}
</script>

<template>
  <span
    class="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap"
    :class="toneClass[tone]"
  >
    <span
      v-if="dot"
      class="size-1.5 rounded-full bg-current"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
