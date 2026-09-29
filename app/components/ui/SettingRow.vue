<script setup lang="ts">
defineProps<{ title: string; description?: string; dimmed?: boolean }>()
</script>

<template>
  <div
    class="flex items-center justify-between gap-6 py-4 transition-opacity"
    :class="{ 'opacity-50': dimmed }"
  >
    <div class="min-w-0">
      <p class="font-semibold text-fg">
        {{ title }}
      </p>
      <p
        v-if="description"
        class="mt-0.5 text-sm text-muted"
      >
        {{ description }}
      </p>
    </div>
    <slot />
  </div>
</template>
