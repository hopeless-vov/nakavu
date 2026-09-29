<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'

defineProps<{ parts: { value: number; label: string }[] }>()
const pad = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <div class="grid grid-cols-4 gap-2">
    <div
      v-for="p in parts"
      :key="p.label"
      class="flex flex-col items-center rounded-lg bg-surface-2 px-1 py-3"
    >
      <span class="relative h-9 overflow-hidden font-display text-3xl leading-9 text-fg tabular-nums">
        <AnimatePresence
          mode="popLayout"
          :initial="false"
        >
          <motion.span
            :key="p.value"
            class="block"
            :initial="{ y: -24, opacity: 0 }"
            :animate="{ y: 0, opacity: 1 }"
            :exit="{ y: 24, opacity: 0 }"
            :transition="{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }"
          >{{ pad(p.value) }}</motion.span>
        </AnimatePresence>
      </span>
      <span class="mt-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{{ p.label }}</span>
    </div>
  </div>
</template>
