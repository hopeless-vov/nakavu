<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import AvatarBadge from '~/components/ui/AvatarBadge.vue'
import BeanBurst from '~/components/ui/BeanBurst.vue'
import { AnimatePresence, motion } from 'motion-v'
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * The roulette moment: faces shuffle, slow down and land on your match.
 * Plays once; with reduced motion it lands immediately.
 */
const props = defineProps<{ decoys: string[]; name: string; avatarUrl?: string | null; label: string }>()
const emit = defineEmits<{ done: [] }>()

const reduced = usePreferredReducedMotion()
const shown = ref(props.decoys[0] ?? props.name)
const landed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function spin(step: number) {
  // 14 frames, each a little slower than the last (60ms → ~330ms).
  if (step >= 14 || props.decoys.length === 0) {
    shown.value = props.name
    landed.value = true
    timer = setTimeout(() => emit('done'), 900)
    return
  }
  shown.value = props.decoys[step % props.decoys.length]!
  timer = setTimeout(() => spin(step + 1), 60 + step * step * 1.4)
}

onMounted(() => {
  if (reduced.value === 'reduce') {
    shown.value = props.name
    landed.value = true
    emit('done')
  } else spin(0)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div
    class="flex flex-col items-center py-8 text-center"
    role="status"
    :aria-label="label"
  >
    <div class="relative grid size-28 place-items-center">
      <motion.div
        class="absolute inset-0 rounded-full border-2 border-dashed border-accent/40"
        :animate="landed ? { rotate: 0, scale: 1.15, opacity: 0 } : { rotate: 360 }"
        :transition="landed ? { duration: 0.5 } : { duration: 1.2, repeat: Infinity, ease: 'linear' }"
      />
      <AnimatePresence mode="popLayout">
        <motion.div
          :key="shown"
          :initial="{ y: -30, opacity: 0, scale: 0.8 }"
          :animate="{ y: 0, opacity: 1, scale: landed ? [1, 1.18, 1] : 1 }"
          :exit="{ y: 30, opacity: 0, scale: 0.8 }"
          :transition="{ duration: landed ? 0.45 : 0.08 }"
        >
          <AvatarBadge
            :name="shown"
            :src="landed ? avatarUrl : null"
            size="xl"
          />
        </motion.div>
      </AnimatePresence>
      <BeanBurst
        v-if="landed"
        class="absolute inset-0"
      />
    </div>
    <p class="mt-5 text-sm font-semibold tracking-[.14em] text-muted uppercase">
      {{ label }}
    </p>
    <motion.p
      :key="`${shown}-name`"
      class="mt-1 font-display text-3xl text-fg"
      :initial="{ opacity: 0.4 }"
      :animate="{ opacity: landed ? 1 : 0.4 }"
    >
      {{ shown }}
    </motion.p>
  </div>
</template>
