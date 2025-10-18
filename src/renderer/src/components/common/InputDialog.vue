<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    @click.self="handleMaskClick"
  >
    <div class="bg-white rounded-lg shadow-xl p-6 w-96 animate-fade-in">
      <!-- 标题 -->
      <h3 class="text-lg font-semibold text-gray-800 mb-4">{{ title }}</h3>

      <!-- 输入框 -->
      <input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        :placeholder="placeholder"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        @keyup.enter="handleConfirm"
        @keyup.esc="handleCancel"
      />

      <!-- 按钮组 -->
      <div class="flex justify-end gap-3 mt-6">
        <button
          class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          @click="handleCancel"
        >
          取消
        </button>
        <button
          class="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          :disabled="!inputValue.trim()"
          @click="handleConfirm"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

interface Props {
  visible: boolean
  title?: string
  placeholder?: string
  defaultValue?: string
  closeOnMask?: boolean // 点击遮罩是否关闭
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', value: string): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '请输入',
  placeholder: '',
  defaultValue: '',
  closeOnMask: false // 默认点击遮罩不关闭
})

const emit = defineEmits<Emits>()

const inputRef = ref<HTMLInputElement | null>(null)
const inputValue = ref('')

// 监听 visible 变化，自动聚焦输入框
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      inputValue.value = props.defaultValue
      nextTick(() => {
        inputRef.value?.focus()
        inputRef.value?.select()
      })
    }
  }
)

/**
 * 确认
 */
function handleConfirm(): void {
  if (inputValue.value.trim()) {
    emit('confirm', inputValue.value.trim())
    emit('update:visible', false)
    inputValue.value = ''
  }
}

/**
 * 取消
 */
function handleCancel(): void {
  emit('cancel')
  emit('update:visible', false)
  inputValue.value = ''
}

/**
 * 点击遮罩
 */
function handleMaskClick(): void {
  if (props.closeOnMask) {
    handleCancel()
  }
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
