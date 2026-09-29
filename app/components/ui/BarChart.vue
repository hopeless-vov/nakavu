<script setup lang="ts">
import { motion } from 'motion-v'
import { ref } from 'vue'

/**
 * Single-series bar chart for shares (0–1). One hue, no legend (the title names
 * the series), per-bar hover tooltip, and a visually hidden table for screen readers.
 */
defineProps<{
  title: string
  bars: { label: string; value: number; detail: string }[]
  emptyLabel?: string
}>()

const hovered = ref<number | null>(null)
const pct = (v: number) => `${Math.round(v * 100)}%`
</script>

<template>
  <figure>
    <figcaption class="sr-only">
      {{ title }}
    </figcaption>
    <p
      v-if="!bars.length"
      class="py-10 text-center text-sm text-muted"
    >
      {{ emptyLabel }}
    </p>
    <div
      v-else
      class="relative"
      aria-hidden="true"
    >
      <!-- recessive grid: 0 / 50 / 100 -->
      <div class="pointer-events-none absolute inset-x-0 top-0 bottom-7 flex flex-col justify-between">
        <span
          v-for="g in 3"
          :key="g"
          class="h-px bg-line"
          :class="{ 'opacity-50': g < 3 }"
        />
      </div>
      <div class="relative flex h-48 items-end gap-0.5">
        <div
          v-for="(b, i) in bars"
          :key="b.label"
          class="group relative flex h-full flex-1 flex-col items-center justify-end"
          @mouseenter="hovered = i"
          @mouseleave="hovered = null"
        >
          <span
            class="mb-1 text-xs font-semibold text-fg tabular-nums transition-opacity"
            :class="i === bars.length - 1 || hovered === i ? 'opacity-100' : 'opacity-0'"
          >{{ pct(b.value) }}</span>
          <motion.div
            class="w-full max-w-12 origin-bottom rounded-t-[4px] transition-colors"
            :class="i === bars.length - 1 ? 'bg-accent' : hovered === i ? 'bg-accent/80' : 'bg-accent/45'"
            :style="{ height: `calc((100% - 1.5rem) * ${Math.max(0.02, b.value)})` }"
            :initial="{ scaleY: 0 }"
            :animate="{ scaleY: 1 }"
            :transition="{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }"
          />
          <span class="mt-2 h-5 text-xs text-muted">{{ b.label }}</span>
          <div
            v-if="hovered === i"
            class="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-xs whitespace-nowrap text-on-ink shadow-lift"
          >
            {{ b.detail }}
          </div>
        </div>
      </div>
    </div>
    <table class="sr-only">
      <caption>{{ title }}</caption>
      <tbody>
        <tr
          v-for="b in bars"
          :key="b.label"
        >
          <th scope="row">
            {{ b.label }}
          </th>
          <td>{{ pct(b.value) }}</td>
          <td>{{ b.detail }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>
