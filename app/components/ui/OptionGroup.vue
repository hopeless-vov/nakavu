<script setup lang="ts" generic="T extends string | number">
import OptionCard from '~/components/ui/OptionCard.vue'

defineProps<{
  label?: string
  options: { value: T; label: string; description?: string }[]
  columns?: 2 | 3
}>()

const model = defineModel<T>({ required: true })
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="grid gap-2.5"
    :class="columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'"
  >
    <OptionCard
      v-for="o in options"
      :key="o.value"
      :label="o.label"
      :description="o.description"
      :selected="model === o.value"
      @select="model = o.value"
    />
  </div>
</template>
