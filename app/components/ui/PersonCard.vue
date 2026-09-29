<script setup lang="ts">
import AvatarBadge from '~/components/ui/AvatarBadge.vue'

export interface PersonCardChip {
  label: string
  shared?: boolean
}

withDefaults(
  defineProps<{
    name: string
    role?: string
    avatarUrl?: string | null
    facts?: string[]
    chips?: PersonCardChip[]
    askLabel?: string
    ask?: string
    eyebrow?: string
    size?: 'md' | 'lg'
  }>(),
  { size: 'md', facts: () => [], chips: () => [] },
)
</script>

<template>
  <article class="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
    <p
      v-if="eyebrow"
      class="mb-4 text-xs font-semibold tracking-[.14em] text-accent-text uppercase"
    >
      {{ eyebrow }}
    </p>
    <div class="flex items-center gap-4">
      <AvatarBadge
        :name="name"
        :src="avatarUrl"
        :size="size === 'lg' ? 'xl' : 'lg'"
      />
      <div class="min-w-0">
        <p
          class="truncate font-display text-fg"
          :class="size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-xl'"
        >
          {{ name }}
        </p>
        <p
          v-if="role"
          class="truncate text-muted"
        >
          {{ role }}
        </p>
      </div>
    </div>
    <ul
      v-if="facts.length"
      class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted"
    >
      <li
        v-for="f in facts"
        :key="f"
        class="flex items-center gap-1.5"
      >
        <span
          class="size-1 rounded-full bg-sage"
          aria-hidden="true"
        />{{ f }}
      </li>
    </ul>
    <div
      v-if="ask"
      class="mt-5 rounded-lg bg-surface-2 px-4 py-3"
    >
      <p class="text-xs font-semibold tracking-wider text-muted uppercase">
        {{ askLabel }}
      </p>
      <p class="mt-1 font-display text-lg text-fg italic">
        {{ ask }}
      </p>
    </div>
    <ul
      v-if="chips.length"
      class="mt-4 flex flex-wrap gap-1.5"
    >
      <li
        v-for="c in chips"
        :key="c.label"
        class="rounded-full px-3 py-1 text-[13px] font-medium"
        :class="c.shared ? 'bg-sage-soft text-sage-text' : 'bg-surface-2 text-muted'"
      >
        <span
          v-if="c.shared"
          aria-hidden="true"
        >✓ </span>{{ c.label }}
      </li>
    </ul>
    <slot />
  </article>
</template>
