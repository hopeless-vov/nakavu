<script setup lang="ts">
import { ClientOnly } from '#components'
import { useTheme } from '~/composables/use-theme'
import { AnimatePresence, motion } from 'motion-v'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { resolved, toggle } = useTheme()
</script>

<template>
  <button
    type="button"
    class="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
    :aria-label="t('theme.toggle')"
    :title="t('theme.toggle')"
    @click="toggle"
  >
    <ClientOnly>
      <AnimatePresence mode="wait">
        <motion.svg
          :key="resolved"
          viewBox="0 0 24 24"
          class="size-[18px]"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          :initial="{ rotate: -60, opacity: 0, scale: 0.6 }"
          :animate="{ rotate: 0, opacity: 1, scale: 1 }"
          :exit="{ rotate: 60, opacity: 0, scale: 0.6 }"
          :transition="{ duration: 0.2 }"
        >
          <path
            v-if="resolved === 'dark'"
            d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
          />
          <g v-else>
            <circle
              cx="12"
              cy="12"
              r="4"
            />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </g>
        </motion.svg>
      </AnimatePresence>
    </ClientOnly>
  </button>
</template>
