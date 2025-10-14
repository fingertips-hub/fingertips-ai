<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="visible"
        class="toast-container fixed top-4 left-1/2 z-[9999] px-4 py-3 rounded-lg shadow-lg max-w-md"
        :class="typeClasses"
      >
        <div class="flex items-center gap-2">
          <Icon :icon="iconName" class="text-xl flex-shrink-0" />
          <span class="text-sm font-medium">{{ message }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'

export interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  visible?: boolean
}

const props = withDefaults(defineProps<ToastProps>(), {
  type: 'info',
  duration: 3000,
  visible: false
})

const emit = defineEmits<{
  close: []
}>()

const visible = ref(props.visible)
let timer: ReturnType<typeof setTimeout> | null = null

// 根据类型计算样式类
const typeClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-green-500 text-white'
    case 'error':
      return 'bg-red-500 text-white'
    case 'warning':
      return 'bg-yellow-500 text-white'
    case 'info':
    default:
      return 'bg-blue-500 text-white'
  }
})

// 根据类型计算图标
const iconName = computed(() => {
  switch (props.type) {
    case 'success':
      return 'mdi:check-circle'
    case 'error':
      return 'mdi:alert-circle'
    case 'warning':
      return 'mdi:alert'
    case 'info':
    default:
      return 'mdi:information'
  }
})

// 监听 visible prop 变化
watch(
  () => props.visible,
  (newVal) => {
    visible.value = newVal
    if (newVal) {
      startTimer()
    }
  }
)

// 启动定时器
function startTimer(): void {
  if (timer) {
    clearTimeout(timer)
  }
  timer = setTimeout(() => {
    close()
  }, props.duration)
}

// 关闭Toast
function close(): void {
  visible.value = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  emit('close')
}
</script>

<style scoped>
/* 正常状态：水平居中，垂直位置正常 */
.toast-container {
  transform: translateX(-50%) translateY(0);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

/* 进入动画：从上方20px处淡入 */
.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* 离开动画：向上方20px处淡出 */
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
