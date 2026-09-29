<script setup lang="ts" generic="T extends string">
import { motion } from 'motion-v'
import { useId } from 'vue'

defineProps<{
  label: string
  options: { value: T; label: string; title?: string }[]
  size?: 'sm' | 'md'
}>()
const model = defineModel<T>({ required: true })
const layoutId = `seg-${useId()}`
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="inline-flex rounded-full border border-line bg-surface p-0.5"
  >
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      :aria-checked="model === o.value"
      :title="o.title"
      class="relative rounded-full font-semibold transition-colors"
      :class="[size === 'md' ? 'h-9 px-4 text-sm' : 'h-7 px-2.5 text-xs', model === o.value ? 'text-on-ink' : 'text-muted hover:text-fg']"
      @click="model = o.value"
    >
      <motion.span
        v-if="model === o.value"
        :layout-id="layoutId"
        class="absolute inset-0 rounded-full bg-ink"
        :transition="{ type: 'spring', stiffness: 500, damping: 38 }"
      />
      <span class="relative">{{ o.label }}</span>
    </button>
  </div>
</template>
