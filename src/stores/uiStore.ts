import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'error'

export interface Toast {
  id: number
  type: ToastType
  message: string
}

let nextToastId = 1

export const useUiStore = defineStore('ui', () => {
  const toasts = ref<Toast[]>([])

  function dismissToast(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function notify(message: string, type: ToastType = 'success', durationMs = 3800) {
    const id = nextToastId++
    toasts.value = [...toasts.value, { id, type, message }]
    window.setTimeout(() => dismissToast(id), durationMs)
  }

  return { toasts, notify, dismissToast }
})
