import { ref, type Ref } from 'vue'

export interface ToastOptions {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ToastState extends ToastOptions {
  visible: boolean
  id: number
}

const toasts = ref<ToastState[]>([])
let toastId = 0

export function useToast(): {
  toasts: Ref<ToastState[]>
  show: (options: ToastOptions) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  clearAll: () => void
} {
  function show(options: ToastOptions): void {
    const id = toastId++
    const toast: ToastState = {
      ...options,
      visible: true,
      id,
      type: options.type || 'info',
      duration: options.duration || 3000
    }

    toasts.value.push(toast)

    // 自动移除
    setTimeout(
      () => {
        remove(id)
      },
      (toast.duration || 3000) + 300
    ) // 加上动画时间
  }

  function remove(id: number): void {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index > -1) {
      toasts.value[index].visible = false
      setTimeout(() => {
        toasts.value.splice(index, 1)
      }, 300) // 等待动画完成
    }
  }

  function success(message: string, duration?: number): void {
    show({ message, type: 'success', duration: duration || 1000 })
  }

  function error(message: string, duration?: number): void {
    show({ message, type: 'error', duration })
  }

  function warning(message: string, duration?: number): void {
    show({ message, type: 'warning', duration })
  }

  function info(message: string, duration?: number): void {
    show({ message, type: 'info', duration })
  }

  function clearAll(): void {
    toasts.value.forEach((toast) => {
      toast.visible = false
    })
    // 清空数组
    setTimeout(() => {
      toasts.value = []
    }, 300) // 等待动画完成
  }

  return {
    toasts,
    show,
    success,
    error,
    warning,
    info,
    clearAll
  }
}
