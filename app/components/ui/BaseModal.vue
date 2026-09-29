<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'

defineProps<{ title: string; description?: string }>()
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <AnimatePresence>
        <DialogOverlay
          v-if="open"
          as-child
          force-mount
        >
          <motion.div
            class="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 1 }"
            :exit="{ opacity: 0 }"
            :transition="{ duration: 0.2 }"
          />
        </DialogOverlay>
      </AnimatePresence>
      <AnimatePresence>
        <DialogContent
          v-if="open"
          as-child
          force-mount
        >
          <motion.div
            class="fixed top-1/2 left-1/2 z-50 w-[min(92vw,460px)] rounded-2xl border border-line bg-surface p-6 shadow-lift outline-none sm:p-7"
            :initial="{ opacity: 0, scale: 0.96, x: '-50%', y: '-46%' }"
            :animate="{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }"
            :exit="{ opacity: 0, scale: 0.97, x: '-50%', y: '-48%' }"
            :transition="{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }"
          >
            <DialogTitle class="font-display text-2xl text-fg">
              {{ title }}
            </DialogTitle>
            <DialogDescription
              v-if="description"
              class="mt-2 text-muted"
            >
              {{ description }}
            </DialogDescription>
            <div class="mt-4">
              <slot />
            </div>
            <div class="mt-6 flex flex-wrap justify-end gap-2">
              <slot name="actions" />
            </div>
          </motion.div>
        </DialogContent>
      </AnimatePresence>
    </DialogPortal>
  </DialogRoot>
</template>
