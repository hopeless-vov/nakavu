<script setup lang="ts">
import { motion } from 'motion-v'

defineProps<{ title: string; subtitle?: string; eyebrow?: string }>()
</script>

<template>
  <motion.header
    :initial="{ opacity: 0, y: 8 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }"
    class="mb-8 flex flex-wrap items-end justify-between gap-4"
  >
    <div class="min-w-0">
      <p
        v-if="eyebrow"
        class="mb-2 text-xs font-semibold tracking-[.14em] text-accent-text uppercase"
      >
        {{ eyebrow }}
      </p>
      <h1 class="text-3xl leading-tight text-fg sm:text-4xl">
        <slot name="title">
          {{ title }}
        </slot>
      </h1>
      <p
        v-if="subtitle"
        class="mt-2 max-w-prose text-muted"
      >
        {{ subtitle }}
      </p>
    </div>
    <slot name="actions" />
  </motion.header>
</template>
