<template>
  <div class="w-full h-full select-none bg-white flex flex-col overflow-hidden">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0 drag-handle"
    >
      <div class="flex items-center gap-2 select-none">
        <span class="text-lg">{{ shortcutIcon }}</span>
        <span class="text-sm font-semibold text-gray-700">{{ shortcutName }}</span>
      </div>
      <div class="flex items-center gap-1 no-drag">
        <button
          class="p-1 hover:bg-gray-200 rounded transition-colors outline-none"
          :class="{ 'text-blue-500': isPinned, 'text-gray-500 hover:text-gray-700': !isPinned }"
          :title="isPinned ? '取消固定' : '固定窗口'"
          @click="handleTogglePin"
        >
          <Icon :icon="isPinned ? 'mdi:pin' : 'mdi:pin-off'" class="text-xl" />
        </button>
        <button
          class="p-1 hover:bg-gray-200 rounded transition-colors outline-none text-gray-600 hover:text-gray-800"
          title="关闭窗口 (ESC)"
          @click="handleClose"
        >
          <Icon icon="mdi:close" class="text-xl" />
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col p-4 gap-3 min-h-0">
      <!-- Input Area (1/4) -->
      <div class="h-1/4 flex flex-col gap-2 min-h-0">
        <textarea
          v-model="inputText"
          class="flex-1 w-full p-3 border border-gray-300 rounded-lg resize-none overflow-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="在此输入或修改提示词..."
          @keydown.ctrl.enter="handleGenerate"
        ></textarea>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-between items-center flex-shrink-0">
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          :disabled="isGenerating || !inputText.trim()"
          @click="handleGenerate"
        >
          <Icon v-if="!isGenerating" icon="mdi:play" />
          <Icon v-else icon="mdi:loading" class="animate-spin" />
          <span>{{ isGenerating ? '生成中...' : '生成' }}</span>
        </button>

        <div class="flex gap-2">
          <button
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            :disabled="!outputText || isGenerating"
            title="重新生成"
            @click="handleRetry"
          >
            <Icon icon="mdi:refresh" />
            <span>重试</span>
          </button>
          <button
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            :disabled="!outputText"
            title="复制结果"
            @click="handleCopy"
          >
            <Icon icon="mdi:content-copy" />
            <span>{{ copied ? '已复制!' : '复制' }}</span>
          </button>
        </div>
      </div>

      <!-- Output Area (3/4) -->
      <div class="flex-1 flex flex-col gap-2 min-h-0">
        <label class="text-xs font-medium text-gray-600 flex-shrink-0">生成结果</label>
        <div
          class="flex-1 w-full p-3 border border-gray-300 rounded-lg overflow-y-auto bg-gray-50 font-mono text-sm whitespace-pre-wrap"
        >
          <div v-if="isGenerating" class="flex items-center justify-center h-full text-gray-400">
            <div class="flex flex-col items-center gap-2">
              <Icon icon="mdi:loading" class="animate-spin text-3xl" />
              <span>正在生成...</span>
            </div>
          </div>
          <div
            v-else-if="!outputText"
            class="flex items-center justify-center h-full text-gray-400"
          >
            点击"生成"按钮开始...
          </div>
          <div v-else class="text-gray-800">{{ outputText }}</div>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <Toast
      v-for="toast in toasts"
      :key="toast.id"
      :message="toast.message"
      :type="toast.type"
      :duration="toast.duration"
      :visible="toast.visible"
      @close="() => {}"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import Toast from './components/common/Toast.vue'
import { useToast } from './composables/useToast'

// Toast
const { toasts, success, error } = useToast()

// Data
const shortcutName = ref('AI 快捷指令')
const shortcutIcon = ref('🤖')
const inputText = ref('')
const outputText = ref('')
const isGenerating = ref(false)
const copied = ref(false)
const isPinned = ref(false)

/**
 * 初始化 - 接收来自主进程的数据
 */
onMounted(() => {
  // 监听来自主进程的初始化数据
  window.api.aiShortcutRunner.onInitData((data) => {
    console.log('Received init data:', data)
    shortcutName.value = data.name
    shortcutIcon.value = data.icon

    // 如果有选中的文本，只显示选中的文本；否则显示 prompt
    if (data.selectedText && data.selectedText.trim()) {
      inputText.value = data.selectedText
    } else {
      inputText.value = ''
    }
  })

  // 监听键盘事件
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

/**
 * 处理键盘事件
 */
const handleKeyDown = (event: KeyboardEvent): void => {
  // ESC 关闭窗口
  if (event.key === 'Escape') {
    event.preventDefault()
    handleClose()
  }
}

/**
 * 关闭窗口
 */
const handleClose = (): void => {
  // 关闭窗口时重置 pin 状态
  isPinned.value = false
  window.api.aiShortcutRunner.close()
}

/**
 * 切换固定状态
 */
const handleTogglePin = (): void => {
  isPinned.value = !isPinned.value
  window.api.aiShortcutRunner.setPinned(isPinned.value)
  console.log('AI Shortcut Runner pin state toggled:', isPinned.value)
}

/**
 * 生成结果
 */
const handleGenerate = async (): Promise<void> => {
  if (!inputText.value.trim() || isGenerating.value) return

  isGenerating.value = true
  outputText.value = ''

  try {
    // TODO: 这里调用实际的 AI API
    // 目前使用模拟数据
    await new Promise((resolve) => setTimeout(resolve, 2000))
    outputText.value = `这是根据提示词"${inputText.value}"生成的结果。\n\n在实际应用中，这里会显示 AI 生成的内容。\n\n在实际应用中，这里会显示 AI 生成的内容。\n\n在实际应用中，这里会显示 AI 生成的内容。\n\n在实际应用中，这里会显示 AI 生成的内容。\n\n在实际应用中，这里会显示 AI 生成的内容。\n\n在实际应用中，这里会显示 AI 生成的内容。\n\n在实际应用中，这里会显示 AI 生成的内容。\n\n在实际应用中，这里会显示 AI 生成的内容。\n\n在实际应用中，这里会显示 AI 生成的内容。\n\n在实际应用中，这里会显示 AI 生成的内容。\n\n在实际应用中，这里会显示 AI 生成的内容。\n\n在实际应用中，这里会显示 AI 生成的内容。`
    success('生成成功')
  } catch (err) {
    console.error('Generate error:', err)
    error('生成失败，请重试')
  } finally {
    isGenerating.value = false
  }
}

/**
 * 重试
 */
const handleRetry = (): void => {
  handleGenerate()
}

/**
 * 复制结果
 */
const handleCopy = async (): Promise<void> => {
  if (!outputText.value) return

  try {
    await navigator.clipboard.writeText(outputText.value)
    copied.value = true
    success('已复制到剪贴板')

    // 2秒后重置复制状态
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Copy error:', err)
    error('复制失败')
  }
}
</script>

<style scoped>
/* 窗口拖拽 */
.drag-handle {
  -webkit-app-region: drag;
  cursor: move;
}

.no-drag {
  -webkit-app-region: no-drag;
  cursor: pointer;
}

/* 自定义滚动条样式 - 输入框 */
textarea::-webkit-scrollbar {
  width: 8px;
}

textarea::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

textarea::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

textarea::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 自定义滚动条样式 - 输出区域 */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
