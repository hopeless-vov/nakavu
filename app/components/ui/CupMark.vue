<script setup lang="ts">
withDefaults(defineProps<{ steam?: boolean }>(), { steam: true })
</script>

<template>
  <svg
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M5 13h17v5a8.5 8.5 0 0 1-17 0z"
      class="fill-accent"
    />
    <path
      d="M22 15h2a3 3 0 0 1 0 6h-2"
      class="stroke-accent"
      stroke-width="2.5"
    />
    <g
      class="stroke-sage"
      stroke-width="2"
      stroke-linecap="round"
    >
      <path
        d="M10.5 4c-1.5 2 1.5 3 0 5"
        :class="{ 'animate-steam': steam }"
        style="transform-box: fill-box"
      />
      <path
        d="M16 4c-1.5 2 1.5 3 0 5"
        :class="{ 'animate-steam [animation-delay:1.2s]': steam }"
        style="transform-box: fill-box"
      />
    </g>
  </svg>
</template>
