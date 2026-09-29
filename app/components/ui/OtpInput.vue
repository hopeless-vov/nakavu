<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = withDefaults(defineProps<{ length?: number; label: string; invalid?: boolean; disabled?: boolean }>(), { length: 6 })
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ complete: [code: string] }>()

const inputs = ref<HTMLInputElement[]>([])
const digits = ref<string[]>(Array.from({ length: props.length }, (_, i) => model.value[i] ?? ''))

watch(model, (value) => {
  if (value !== digits.value.join('')) digits.value = Array.from({ length: props.length }, (_, i) => value[i] ?? '')
})

function commit() {
  const code = digits.value.join('')
  model.value = code
  if (code.length === props.length && /^\d+$/.test(code)) emit('complete', code)
}

async function focusAt(index: number) {
  await nextTick()
  inputs.value[Math.max(0, Math.min(index, props.length - 1))]?.focus()
}

function fill(from: number, text: string) {
  const clean = text.replace(/\D/g, '').slice(0, props.length - from)
  clean.split('').forEach((d, i) => (digits.value[from + i] = d))
  commit()
  void focusAt(from + clean.length)
}

function onInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value
  digits.value[index] = ''
  if (value.replace(/\D/g, '')) fill(index, value)
  else {
    target.value = ''
    commit()
  }
}

function onKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    digits.value[index - 1] = ''
    commit()
    void focusAt(index - 1)
  } else if (event.key === 'ArrowLeft') void focusAt(index - 1)
  else if (event.key === 'ArrowRight') void focusAt(index + 1)
}

function onPaste(index: number, event: ClipboardEvent) {
  event.preventDefault()
  fill(index, event.clipboardData?.getData('text') ?? '')
}

defineExpose({ focus: () => focusAt(digits.value.findIndex((d) => !d)) })
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    class="flex justify-center gap-2 sm:gap-2.5"
  >
    <input
      v-for="(digit, i) in digits"
      :key="i"
      ref="inputs"
      :value="digit"
      type="text"
      inputmode="numeric"
      :autocomplete="i === 0 ? 'one-time-code' : 'off'"
      maxlength="6"
      :disabled="disabled"
      :aria-label="`${label} ${i + 1}`"
      :aria-invalid="invalid || undefined"
      class="h-14 w-11 rounded-md border bg-field text-center font-display text-2xl text-fg tabular-nums outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60 sm:w-12"
      :class="invalid ? 'border-danger' : 'border-line'"
      @input="onInput(i, $event)"
      @keydown="onKeydown(i, $event)"
      @paste="onPaste(i, $event)"
      @focus="($event.target as HTMLInputElement).select()"
    >
  </div>
</template>
