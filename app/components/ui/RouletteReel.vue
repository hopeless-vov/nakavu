<script setup lang="ts">
import { useIntervalFn, usePreferredReducedMotion } from '@vueuse/core'
import AvatarBadge from '~/components/ui/AvatarBadge.vue'
import { AnimatePresence, motion } from 'motion-v'
import { computed, ref } from 'vue'

export interface ReelPair {
  a: { name: string; team: string }
  b: { name: string; team: string }
  caption: string
}

const props = withDefaults(defineProps<{ pairs: ReelPair[]; intervalMs?: number }>(), { intervalMs: 3200 })

const index = ref(0)
const reduced = usePreferredReducedMotion()
const current = computed(() => props.pairs[index.value % Math.max(1, props.pairs.length)])

useIntervalFn(() => {
  if (reduced.value !== 'reduce') index.value++
}, props.intervalMs)

const enter = (side: -1 | 1) => ({ opacity: 0, y: 28 * side, filter: 'blur(4px)' })
</script>

<template>
  <div
    v-if="current"
    class="relative rounded-2xl border border-line bg-surface/90 p-4 shadow-lift backdrop-blur"
    aria-live="off"
  >
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div class="h-14 overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            :key="`a-${index}`"
            class="flex h-14 items-center gap-2.5"
            :initial="enter(-1)"
            :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
            :exit="{ opacity: 0, y: 28, filter: 'blur(4px)' }"
            :transition="{ type: 'spring', stiffness: 260, damping: 24 }"
          >
            <AvatarBadge
              :name="current.a.name"
              size="md"
            />
            <div class="min-w-0 leading-tight">
              <p class="truncate text-sm font-semibold text-fg">
                {{ current.a.name }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ current.a.team }}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <motion.span
        :key="`x-${index}`"
        class="font-display text-2xl text-accent"
        :initial="{ rotate: -90, scale: 0.4 }"
        :animate="{ rotate: 0, scale: 1 }"
        :transition="{ type: 'spring', stiffness: 300, damping: 14, delay: 0.25 }"
      >
        ×
      </motion.span>
      <div class="h-14 overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            :key="`b-${index}`"
            class="flex h-14 items-center justify-end gap-2.5 text-right"
            :initial="enter(1)"
            :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
            :exit="{ opacity: 0, y: -28, filter: 'blur(4px)' }"
            :transition="{ type: 'spring', stiffness: 260, damping: 24, delay: 0.08 }"
          >
            <div class="min-w-0 leading-tight">
              <p class="truncate text-sm font-semibold text-fg">
                {{ current.b.name }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ current.b.team }}
              </p>
            </div>
            <AvatarBadge
              :name="current.b.name"
              size="md"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
    <AnimatePresence mode="wait">
      <motion.p
        :key="`c-${index}`"
        class="mt-2 border-t border-line pt-2.5 text-center text-sm text-muted"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25, delay: 0.3 }"
      >
        {{ current.caption }}
      </motion.p>
    </AnimatePresence>
  </div>
</template>
