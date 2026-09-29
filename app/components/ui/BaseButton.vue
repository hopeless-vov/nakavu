<script setup lang="ts">
import { NuxtLink } from '#components'
import { buttonClass, type ButtonSize, type ButtonVariant } from '~/utils/button-class'
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    type?: 'button' | 'submit'
    to?: RouteLocationRaw
    href?: string
    block?: boolean
    loading?: boolean
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const classes = computed(() => buttonClass({ variant: props.variant, size: props.size, block: props.block }))
const inactive = computed(() => props.disabled || props.loading)

function onClick(event: MouseEvent) {
  if (inactive.value) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :class="classes"
    :aria-disabled="inactive || undefined"
    @click="onClick"
  >
    <slot />
  </NuxtLink>
  <a
    v-else-if="href"
    :href="href"
    :class="classes"
    :aria-disabled="inactive || undefined"
    @click="onClick"
  >
    <slot />
  </a>
  <button
    v-else
    :type="type"
    :class="classes"
    :disabled="inactive"
    :aria-busy="loading || undefined"
    @click="onClick"
  >
    <span
      v-if="loading"
      class="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
