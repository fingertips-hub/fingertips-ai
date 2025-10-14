<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    @click.self="handleCancel"
  >
    <div class="bg-white rounded-lg shadow-xl p-6 w-96 animate-fade-in">
      <!-- 标题 -->
      <div class="flex items-center gap-3 mb-4">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          :class="iconBgClass"
        >
          <Icon :icon="icon" class="text-xl" :class="iconColorClass" />
        </div>
        <h3 class="text-lg font-semibold text-gray-800">{{ title }}</h3>
      </div>

      <!-- 内容 -->
      <p class="text-gray-600 mb-6 leading-relaxed">{{ message }}</p>

      <!-- 按钮组 -->
      <div class="flex justify-end gap-3">
        <button
          class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          @click="handleCancel"
        >
          {{ cancelText }}
        </button>
        <button
          class="px-4 py-2 text-white rounded-lg transition-colors"
          :class="confirmButtonClass"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

type DialogType = 'info' | 'warning' | 'danger' | 'success'

interface Props {
  visible: boolean
  title?: string
  message: string
  type?: DialogType
  confirmText?: string
  cancelText?: string
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认操作',
  type: 'info',
  confirmText: '确定',
  cancelText: '取消'
})

const emit = defineEmits<Emits>()

// 图标
const icon = computed(() => {
  switch (props.type) {
    case 'warning':
      return 'mdi:alert'
    case 'danger':
      return 'mdi:alert-circle'
    case 'success':
      return 'mdi:check-circle'
    default:
      return 'mdi:information'
  }
})

// 图标背景色
const iconBgClass = computed(() => {
  switch (props.type) {
    case 'warning':
      return 'bg-yellow-100'
    case 'danger':
      return 'bg-red-100'
    case 'success':
      return 'bg-green-100'
    default:
      return 'bg-blue-100'
  }
})

// 图标颜色
const iconColorClass = computed(() => {
  switch (props.type) {
    case 'warning':
      return 'text-yellow-600'
    case 'danger':
      return 'text-red-600'
    case 'success':
      return 'text-green-600'
    default:
      return 'text-blue-600'
  }
})

// 确认按钮样式
const confirmButtonClass = computed(() => {
  switch (props.type) {
    case 'warning':
      return 'bg-yellow-500 hover:bg-yellow-600'
    case 'danger':
      return 'bg-red-500 hover:bg-red-600'
    case 'success':
      return 'bg-green-500 hover:bg-green-600'
    default:
      return 'bg-blue-500 hover:bg-blue-600'
  }
})

/**
 * 确认
 */
function handleConfirm(): void {
  emit('confirm')
  emit('update:visible', false)
}

/**
 * 取消
 */
function handleCancel(): void {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
</style>
