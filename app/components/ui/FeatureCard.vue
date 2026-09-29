<script setup lang="ts">
withDefaults(defineProps<{ title: string; body: string; tone?: 'accent' | 'sage' | 'teal' | 'plum' }>(), { tone: 'accent' })

const toneClass = {
  accent: 'bg-accent-soft text-accent-text',
  sage: 'bg-sage-soft text-sage-text',
  teal: 'bg-surface-2 text-teal',
  plum: 'bg-surface-2 text-plum',
}
</script>

<template>
  <div class="group h-full rounded-2xl border border-line bg-surface p-6 transition-[transform,box-shadow] duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-lift">
    <div
      class="mb-5 grid size-12 place-items-center rounded-xl transition-transform duration-300 group-hover:-rotate-6"
      :class="toneClass[tone]"
    >
      <slot name="icon" />
    </div>
    <h3 class="font-display text-xl text-fg">
      {{ title }}
    </h3>
    <p class="mt-2 leading-relaxed text-muted">
      {{ body }}
    </p>
  </div>
</template>
