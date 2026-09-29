<script setup lang="ts">
import type { MatchFeedback } from '~/types/domain'

defineProps<{
  label: string
  value: MatchFeedback | null
  options: { value: MatchFeedback; label: string }[]
  disabled?: boolean
}>()
const emit = defineEmits<{ select: [value: MatchFeedback] }>()

const tone: Record<MatchFeedback, string> = {
  met: 'border-sage-text bg-sage-soft text-sage-text',
  not_yet: 'border-fg bg-surface-2 text-fg',
  skipped: 'border-accent bg-accent-soft text-accent-text',
}
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="flex flex-wrap items-center gap-2"
  >
    <span class="mr-1 text-sm font-semibold text-muted">{{ label }}</span>
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      :aria-checked="value === o.value"
      :disabled="disabled"
      class="h-8 rounded-full border px-3.5 text-[13px] font-semibold transition-[background-color,border-color,color,transform] duration-200 active:scale-95 disabled:opacity-60"
      :class="value === o.value ? tone[o.value] : 'border-line text-muted hover:border-muted hover:text-fg'"
      @click="emit('select', o.value)"
    >
      <span
        v-if="value === o.value"
        aria-hidden="true"
      >✓ </span>{{ o.label }}
    </button>
  </div>
</template>
