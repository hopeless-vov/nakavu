<script setup lang="ts">
withDefaults(defineProps<{ eyebrow?: string; title: string; subtitle?: string; align?: 'left' | 'center' }>(), { align: 'left' })
</script>

<template>
  <div
    class="max-w-2xl"
    :class="align === 'center' ? 'mx-auto text-center' : ''"
  >
    <p
      v-if="eyebrow"
      class="mb-3 text-xs font-semibold tracking-[.16em] text-accent-text uppercase"
    >
      {{ eyebrow }}
    </p>
    <h2 class="text-3xl leading-[1.1] text-fg sm:text-[44px]">
      <slot name="title">
        {{ title }}
      </slot>
    </h2>
    <p
      v-if="subtitle"
      class="mt-4 text-lg text-muted"
    >
      {{ subtitle }}
    </p>
  </div>
</template>
