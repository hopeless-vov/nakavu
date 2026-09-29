<script setup lang="ts">
import { motion } from 'motion-v'

defineProps<{
  label: string
  selected?: boolean
  removable?: boolean
  removeLabel?: string
}>()

const emit = defineEmits<{ toggle: []; remove: [] }>()
</script>

<template>
  <motion.span
    layout
    :while-press="{ scale: 0.95 }"
    :transition="{ type: 'spring', stiffness: 500, damping: 30 }"
    class="inline-flex items-center rounded-full border text-sm font-medium transition-colors duration-200"
    :class="selected ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-surface text-fg hover:border-muted'"
  >
    <button
      type="button"
      class="inline-flex h-9 items-center gap-1.5 rounded-full pl-3"
      :class="removable ? 'pr-1.5' : 'pr-3.5'"
      :aria-pressed="removable ? undefined : !!selected"
      @click="emit('toggle')"
    >
      <span
        aria-hidden="true"
        class="w-3 text-center"
      >{{ selected ? '✓' : '+' }}</span>
      {{ label }}
    </button>
    <button
      v-if="removable"
      type="button"
      class="mr-1 grid size-7 place-items-center rounded-full hover:bg-surface-2"
      :aria-label="removeLabel"
      @click="emit('remove')"
    >
      ×
    </button>
  </motion.span>
</template>
