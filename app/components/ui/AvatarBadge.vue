<script setup lang="ts">
import { avatarTone, avatarToneClass, initials } from '~/utils/avatar'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    src?: string | null
    size?: 'sm' | 'md' | 'lg' | 'xl'
    square?: boolean
  }>(),
  { size: 'md' },
)

const sizeClass = { sm: 'size-8 text-xs', md: 'size-11 text-sm', lg: 'size-14 text-lg', xl: 'size-20 text-2xl' }
const letters = computed(() => initials(props.name))
const tone = computed(() => avatarToneClass[avatarTone(props.name)])
</script>

<template>
  <span
    class="relative inline-grid shrink-0 place-items-center overflow-hidden font-semibold tracking-wide select-none"
    :class="[sizeClass[size], square ? 'rounded-md' : 'rounded-full', src ? 'bg-surface-2' : tone]"
    :aria-label="name"
    role="img"
  >
    <img
      v-if="src"
      :src="src"
      alt=""
      class="size-full object-cover"
    >
    <span
      v-else
      aria-hidden="true"
    >{{ letters }}</span>
  </span>
</template>
