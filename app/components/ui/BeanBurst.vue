<script setup lang="ts">
import { motion } from 'motion-v'

/** A small celebratory burst of coffee beans. Decorative only. */
withDefaults(defineProps<{ count?: number; distance?: number }>(), { count: 10, distance: 70 })
</script>

<template>
  <div
    class="pointer-events-none"
    aria-hidden="true"
  >
    <motion.span
      v-for="i in count"
      :key="i"
      class="absolute top-1/2 left-1/2 -mt-1.5 -ml-1 h-3 w-2 rounded-full"
      :class="i % 3 === 0 ? 'bg-sage' : i % 3 === 1 ? 'bg-accent' : 'bg-clay'"
      :initial="{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }"
      :animate="{
        x: Math.cos((i / count) * Math.PI * 2) * distance,
        y: Math.sin((i / count) * Math.PI * 2) * distance,
        opacity: 0,
        rotate: 180 + i * 30,
        scale: 1,
      }"
      :transition="{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }"
    />
  </div>
</template>
