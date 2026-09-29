<script setup lang="ts">
defineProps<{ steps: string[]; current: number }>()
</script>

<template>
  <ol class="mb-6 flex items-center gap-3 text-sm font-semibold">
    <li
      v-for="(label, i) in steps"
      :key="label"
      class="flex items-center gap-2"
      :aria-current="i === current ? 'step' : undefined"
    >
      <span
        class="grid size-7 place-items-center rounded-full text-xs transition-colors"
        :class="i < current ? 'bg-sage-soft text-sage-text' : i === current ? 'bg-ink text-on-ink' : 'bg-surface-2 text-muted'"
      >{{ i < current ? '✓' : i + 1 }}</span>
      <span :class="i === current ? 'text-fg' : 'text-muted'">{{ label }}</span>
      <span
        v-if="i < steps.length - 1"
        class="mx-1 h-px w-8 bg-line"
        aria-hidden="true"
      />
    </li>
  </ol>
</template>
