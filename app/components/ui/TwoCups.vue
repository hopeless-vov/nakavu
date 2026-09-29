<script setup lang="ts">
import { motion } from 'motion-v'

const cupTransition = { type: 'spring', stiffness: 120, damping: 14, delay: 0.2 } as const
</script>

<template>
  <svg
    viewBox="0 0 400 240"
    class="w-full"
    aria-hidden="true"
  >
    <ellipse
      cx="200"
      cy="214"
      rx="150"
      ry="12"
      class="fill-ink/10"
    />
    <!-- left cup -->
    <motion.g
      :initial="{ x: -60, rotate: 0, opacity: 0 }"
      :animate="{ x: 0, rotate: 8, opacity: 1 }"
      :transition="cupTransition"
      style="transform-origin: 150px 200px"
    >
      <ellipse
        cx="148"
        cy="206"
        rx="62"
        ry="10"
        class="fill-surface-2"
      />
      <path
        d="M92 118h112v34a56 56 0 0 1-112 0z"
        class="fill-accent"
      />
      <path
        d="M92 118h112"
        class="stroke-accent-strong"
        stroke-width="4"
        stroke-linecap="round"
      />
      <path
        d="M204 130h10a18 18 0 0 1 0 36h-12"
        class="stroke-accent"
        stroke-width="9"
        fill="none"
        stroke-linecap="round"
      />
      <path
        d="M112 140c10 10 34 12 48 0"
        class="stroke-on-accent/50"
        stroke-width="3"
        fill="none"
        stroke-linecap="round"
      />
    </motion.g>
    <!-- right cup -->
    <motion.g
      :initial="{ x: 60, rotate: 0, opacity: 0 }"
      :animate="{ x: 0, rotate: -8, opacity: 1 }"
      :transition="cupTransition"
      style="transform-origin: 252px 200px"
    >
      <ellipse
        cx="254"
        cy="206"
        rx="62"
        ry="10"
        class="fill-surface-2"
      />
      <path
        d="M198 118h112v34a56 56 0 0 1-112 0z"
        class="fill-sage"
      />
      <path
        d="M198 118h112"
        class="stroke-sage-text"
        stroke-width="4"
        stroke-linecap="round"
      />
      <path
        d="M198 130h-10a18 18 0 0 0 0 36h12"
        class="stroke-sage"
        stroke-width="9"
        fill="none"
        stroke-linecap="round"
      />
    </motion.g>
    <!-- steam rising, then a little heart -->
    <g
      class="stroke-muted/60"
      stroke-width="4"
      fill="none"
      stroke-linecap="round"
    >
      <motion.path
        d="M136 100c-10-12 10-18 0-30s10-18 2-28"
        :initial="{ pathLength: 0, opacity: 0 }"
        :animate="{ pathLength: 1, opacity: [0, 1, 1, 0.6] }"
        :transition="{ duration: 2.2, delay: 0.9, ease: 'easeInOut' }"
      />
      <motion.path
        d="M266 100c10-12-10-18 0-30s-10-18-2-28"
        :initial="{ pathLength: 0, opacity: 0 }"
        :animate="{ pathLength: 1, opacity: [0, 1, 1, 0.6] }"
        :transition="{ duration: 2.2, delay: 1.1, ease: 'easeInOut' }"
      />
    </g>
    <g
      class="stroke-muted/40"
      stroke-width="3"
      fill="none"
      stroke-linecap="round"
    >
      <motion.path
        d="M162 96c-7-9 7-14 0-22s7-13 1-20"
        :initial="{ pathLength: 0, opacity: 0 }"
        :animate="{ pathLength: 1, opacity: 1 }"
        :transition="{ duration: 2, delay: 1.3, ease: 'easeInOut' }"
      />
      <motion.path
        d="M240 96c7-9-7-14 0-22s-7-13-1-20"
        :initial="{ pathLength: 0, opacity: 0 }"
        :animate="{ pathLength: 1, opacity: 1 }"
        :transition="{ duration: 2, delay: 1.5, ease: 'easeInOut' }"
      />
    </g>
    <motion.path
      d="M201 44c-6-7-17-2-12 7l12 11 12-11c5-9-6-14-12-7z"
      class="fill-accent"
      :initial="{ scale: 0, opacity: 0 }"
      :animate="{ scale: [0, 1.25, 1], opacity: 1, y: [0, -6, 0] }"
      :transition="{ duration: 0.7, delay: 3 }"
      style="transform-origin: 201px 52px"
    />
  </svg>
</template>
