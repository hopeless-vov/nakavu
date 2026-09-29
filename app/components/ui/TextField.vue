<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    placeholder?: string
    type?: string
    multiline?: boolean
    rows?: number
    maxlength?: number
    autocomplete?: string
    inputmode?: 'text' | 'email' | 'numeric' | 'url'
    readonly?: boolean
    required?: boolean
  }>(),
  { type: 'text', rows: 3 },
)

const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ enter: [event: KeyboardEvent]; focus: [event: FocusEvent] }>()

const id = useId()
const describedBy = computed(() => (props.error ? `${id}-error` : props.hint ? `${id}-hint` : undefined))
const counter = computed(() => (props.maxlength ? `${model.value.length}/${props.maxlength}` : ''))

const fieldClass = computed(() => [
  'w-full rounded-md border bg-field px-3.5 text-[15px] text-fg placeholder:text-muted/70',
  'transition-[border-color,box-shadow] duration-200 outline-none',
  'focus:border-accent focus:ring-4 focus:ring-accent/15',
  props.multiline ? 'py-3 resize-y min-h-24' : 'h-11',
  props.error ? 'border-danger' : 'border-line',
])

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') emit('enter', event)
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div
      v-if="label || counter"
      class="flex items-baseline justify-between gap-2"
    >
      <label
        v-if="label"
        :for="id"
        class="text-sm font-semibold text-fg"
      >{{ label }}</label>
      <span
        v-if="counter"
        class="text-xs text-muted tabular-nums"
      >{{ counter }}</span>
    </div>
    <textarea
      v-if="multiline"
      :id="id"
      v-model="model"
      :class="fieldClass"
      :rows="rows"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :readonly="readonly"
      :required="required"
      :aria-invalid="!!error || undefined"
      :aria-describedby="describedBy"
      @focus="emit('focus', $event)"
    />
    <input
      v-else
      :id="id"
      v-model="model"
      :class="fieldClass"
      :type="type"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :readonly="readonly"
      :required="required"
      :aria-invalid="!!error || undefined"
      :aria-describedby="describedBy"
      @keydown="onKeydown"
      @focus="emit('focus', $event)"
    >
    <p
      v-if="error"
      :id="`${id}-error`"
      class="text-sm text-danger"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      :id="`${id}-hint`"
      class="text-sm text-muted"
    >
      {{ hint }}
    </p>
  </div>
</template>
