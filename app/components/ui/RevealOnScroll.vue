<script setup lang="ts">
import { motion } from 'motion-v'

withDefaults(defineProps<{ delay?: number; y?: number; as?: string }>(), { delay: 0, y: 18, as: 'div' })
</script>

<template>
  <motion.div
    :as="as"
    :initial="{ opacity: 0, y }"
    :while-in-view="{ opacity: 1, y: 0 }"
    :in-view-options="{ once: true, margin: '0px 0px -10% 0px' }"
    :transition="{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }"
  >
    <slot />
  </motion.div>
</template>
