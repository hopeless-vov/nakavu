<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: string
    padding?: 'none' | 'md' | 'lg'
    tone?: 'surface' | 'muted' | 'ink'
  }>(),
  { as: 'section', padding: 'md', tone: 'surface' },
)

const paddingClass = { none: '', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' }
const toneClass = {
  surface: 'bg-surface border-line shadow-soft',
  muted: 'bg-surface-2 border-transparent',
  ink: 'bg-ink text-on-ink border-transparent',
}
</script>

<template>
  <component
    :is="as"
    class="rounded-2xl border"
    :class="[paddingClass[padding], toneClass[tone]]"
  >
    <slot />
  </component>
</template>
