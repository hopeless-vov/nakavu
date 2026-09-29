<script setup lang="ts">
defineProps<{ label: string; value: string; copyLabel: string; copiedLabel: string; copied?: boolean }>()
const emit = defineEmits<{ copy: [] }>()
</script>

<template>
  <div>
    <p class="mb-1.5 text-sm font-semibold text-fg">
      {{ label }}
    </p>
    <div class="flex gap-2">
      <input
        :value="value"
        readonly
        :aria-label="label"
        class="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-3.5 font-mono text-sm text-fg outline-none"
        @focus="($event.target as HTMLInputElement).select()"
      >
      <button
        type="button"
        class="h-11 shrink-0 rounded-full px-5 text-sm font-semibold transition-colors"
        :class="copied ? 'bg-sage-text text-surface' : 'bg-accent text-on-accent hover:bg-accent-strong'"
        @click="emit('copy')"
      >
        {{ copied ? copiedLabel : copyLabel }}
      </button>
    </div>
  </div>
</template>
