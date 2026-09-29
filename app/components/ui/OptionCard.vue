<script setup lang="ts">
defineProps<{
  label: string
  description?: string
  selected?: boolean
}>()

const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    role="radio"
    :aria-checked="!!selected"
    class="flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-lg border px-4 py-3 text-left transition-[background-color,border-color,color,transform] duration-200 ease-out-soft active:scale-[.98]"
    :class="selected ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-fg hover:border-muted'"
    @click="emit('select')"
  >
    <span class="text-[15px] font-semibold">{{ label }}</span>
    <span
      v-if="description"
      class="text-[13px] opacity-75"
    >{{ description }}</span>
  </button>
</template>
