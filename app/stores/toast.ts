import type { ToastItem } from '~/types/toast'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const TOAST_DURATION_MS = 3200

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([])
  let nextId = 1

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function show(message: string, tone: ToastItem['tone'] = 'default') {
    const id = nextId++
    // Keep at most three on screen; the oldest goes first.
    toasts.value = [...toasts.value.slice(-2), { id, message, tone }]
    setTimeout(() => dismiss(id), TOAST_DURATION_MS)
    return id
  }

  return { toasts, show, dismiss }
})
