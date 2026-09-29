<script setup lang="ts">
import { motion } from 'motion-v'

defineProps<{ label: string; disabled?: boolean }>()
const model = defineModel<boolean>({ default: false })
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="label"
    :disabled="disabled"
    class="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50"
    :class="model ? 'bg-accent' : 'bg-toggle-off'"
    @click="model = !model"
  >
    <motion.span
      class="absolute top-1 left-1 size-5 rounded-full bg-surface shadow-soft"
      :animate="{ x: model ? 20 : 0 }"
      :transition="{ type: 'spring', stiffness: 600, damping: 32 }"
    />
  </button>
</template>
