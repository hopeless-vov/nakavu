<script setup lang="ts">
import CupMark from '~/components/ui/CupMark.vue'

defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
    <CupMark class="mb-4 size-14" />
    <p class="font-display text-xl text-fg">
      {{ title }}
    </p>
    <p
      v-if="description"
      class="mt-1 max-w-sm text-muted"
    >
      {{ description }}
    </p>
    <div class="mt-5 flex flex-wrap justify-center gap-2">
      <slot />
    </div>
  </div>
</template>
