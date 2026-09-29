<script setup lang="ts">
import CupMark from '~/components/ui/CupMark.vue'

withDefaults(defineProps<{ name: string; size?: 'sm' | 'md' }>(), { size: 'md' })
</script>

<template>
  <span class="inline-flex items-center gap-2 font-display font-semibold tracking-tight text-fg">
    <CupMark :class="size === 'sm' ? 'size-6' : 'size-8'" />
    <span :class="size === 'sm' ? 'text-lg' : 'text-xl'">{{ name }}</span>
  </span>
</template>
