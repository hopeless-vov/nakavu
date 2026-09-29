<script setup lang="ts">
import AvatarBadge from '~/components/ui/AvatarBadge.vue'
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{ name: string; label: string; hint?: string; current?: string | null; maxBytes?: number; tooBigLabel?: string }>()
const file = defineModel<File | null>({ default: null })

const preview = ref<string | null>(props.current ?? null)
const error = ref('')

watch(file, (f, _old) => {
  if (preview.value?.startsWith('blob:')) URL.revokeObjectURL(preview.value)
  preview.value = f ? URL.createObjectURL(f) : (props.current ?? null)
})
onBeforeUnmount(() => {
  if (preview.value?.startsWith('blob:')) URL.revokeObjectURL(preview.value)
})

function onChange(event: Event) {
  const f = (event.target as HTMLInputElement).files?.[0] ?? null
  error.value = ''
  if (f && props.maxBytes && f.size > props.maxBytes) {
    error.value = props.tooBigLabel ?? ''
    return
  }
  file.value = f
}
</script>

<template>
  <div class="flex items-center gap-4">
    <AvatarBadge
      :name="name"
      :src="preview"
      size="xl"
      square
    />
    <div>
      <label class="inline-flex h-10 cursor-pointer items-center rounded-full border border-dashed border-line px-4 text-sm font-semibold text-fg transition-colors hover:border-accent">
        {{ label }}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          class="sr-only"
          @change="onChange"
        >
      </label>
      <p
        v-if="error"
        class="mt-1.5 text-sm text-danger"
        role="alert"
      >
        {{ error }}
      </p>
      <p
        v-else-if="hint"
        class="mt-1.5 text-sm text-muted"
      >
        {{ hint }}
      </p>
    </div>
  </div>
</template>
