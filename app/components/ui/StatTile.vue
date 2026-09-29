<script setup lang="ts">
defineProps<{ label: string; value: string; hint?: string; accent?: boolean }>()
</script>

<template>
  <div
    class="rounded-2xl border p-5"
    :class="accent ? 'border-transparent bg-accent-soft' : 'border-line bg-surface'"
  >
    <p class="text-xs font-semibold tracking-[.12em] text-muted uppercase">
      {{ label }}
    </p>
    <p
      class="mt-2 font-display text-4xl tabular-nums"
      :class="accent ? 'text-accent-text' : 'text-fg'"
    >
      {{ value }}
    </p>
    <p
      v-if="hint"
      class="mt-1 text-sm text-muted"
    >
      {{ hint }}
    </p>
  </div>
</template>
