<script setup lang="ts">
import type { ToastItem } from '~/types/toast'
import { AnimatePresence, motion } from 'motion-v'

defineProps<{ toasts: ToastItem[]; dismissLabel?: string }>()
const emit = defineEmits<{ dismiss: [id: number] }>()

const toneClass = {
  default: 'bg-ink text-on-ink',
  success: 'bg-sage-text text-surface',
  error: 'bg-danger text-surface',
}
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
    role="status"
    aria-live="polite"
  >
    <AnimatePresence>
      <motion.div
        v-for="toast in toasts"
        :key="toast.id"
        layout
        :initial="{ opacity: 0, y: 16, scale: 0.96 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :exit="{ opacity: 0, y: 8, scale: 0.96 }"
        :transition="{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }"
        class="pointer-events-auto flex max-w-md items-center gap-3 rounded-full py-2.5 pr-2.5 pl-5 text-sm font-medium shadow-lift"
        :class="toneClass[toast.tone ?? 'default']"
      >
        <span>{{ toast.message }}</span>
        <button
          type="button"
          class="grid size-7 place-items-center rounded-full opacity-70 hover:opacity-100"
          :aria-label="dismissLabel"
          @click="emit('dismiss', toast.id)"
        >
          ×
        </button>
      </motion.div>
    </AnimatePresence>
  </div>
</template>
