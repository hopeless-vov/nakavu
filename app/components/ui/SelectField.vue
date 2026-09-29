<script setup lang="ts">
import { useId } from 'vue'

defineProps<{
  label?: string
  options: { value: string; label: string }[]
  placeholder?: string
}>()

const model = defineModel<string>({ default: '' })
const id = useId()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      v-if="label"
      :for="id"
      class="text-sm font-semibold text-fg"
    >{{ label }}</label>
    <div class="relative">
      <select
        :id="id"
        v-model="model"
        class="h-11 w-full appearance-none rounded-md border border-line bg-field pr-10 pl-3.5 text-[15px] text-fg outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
      >
        <option
          v-if="placeholder"
          value=""
          disabled
        >
          {{ placeholder }}
        </option>
        <option
          v-for="o in options"
          :key="o.value"
          :value="o.value"
        >
          {{ o.label }}
        </option>
      </select>
      <svg
        class="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m4 6 4 4 4-4"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </div>
</template>
