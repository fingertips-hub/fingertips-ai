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
        <!-- Prompt 提示信息 -->
        <div
          v-if="promptTemplate"
          class="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-2 py-1 flex-shrink-0"
        >
          <span class="font-semibold">指令模板：</span>
          <span class="font-mono">{{ promptTemplate }}</span>
        </div>
        <textarea
          v-model="inputText"
          class="flex-1 w-full p-3 border border-gray-300 rounded-lg resize-none overflow-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          :placeholder="getInputPlaceholder()"
          @keydown.ctrl.enter="handleGenerate"
        ></textarea>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-between items-center flex-shrink-0">
        <!-- 主操作按钮 -->
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          :disabled="isGenerating || !canGenerate()"
          :title="getGenerateButtonTooltip()"
          @click="handleGenerate"
        >
          <Icon v-if="!isGenerating" :icon="outputText ? 'mdi:refresh' : 'mdi:play'" />
          <Icon v-else icon="mdi:loading" class="animate-spin" />
          <span>{{ getGenerateButtonText() }}</span>
        </button>

        <!-- 次要操作按钮 -->
        <div class="flex gap-2">
          <!-- 复制按钮 - 只在有结果时显示 -->
          <button
            v-if="outputText"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            :disabled="isGenerating"
            title="复制结果到剪贴板"
            @click="handleCopy"
          >
            <Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" />
            <span>{{ copied ? '已复制' : '复制' }}</span>
          </button>
        </div>
      </div>

      <!-- Output Area (3/4) -->
      <div class="flex-1 flex flex-col gap-2 min-h-0">
        <label class="text-xs font-medium text-gray-600 flex-shrink-0">生成结果</label>
        <div
          class="relative flex-1 w-full p-3 border border-gray-300 rounded-lg overflow-y-auto bg-gray-50 font-mono text-sm whitespace-pre-wrap select-text"
        >
          <!-- 空态：未在生成且无输出时显示提示 -->
          <div
            v-if="!isGenerating && !outputText"
            class="flex items-center justify-center h-full text-gray-400"
          >
            点击"生成"按钮开始...
          </div>

          <!-- 内容：无论是否在生成，始终渲染输出文本 -->
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
const promptTemplate = ref('') // 保存原始的 prompt 模板
const inputText = ref('')
const outputText = ref('')
const isGenerating = ref(false)
const copied = ref(false)
const isPinned = ref(false)
const aiModel = ref<string | undefined>() // AI 模型
const aiTemperature = ref<number | undefined>() // Temperature 参数

/**
 * 确保生成进度监听器已注册
 * 由于窗口会被重用，需要在每次初始化时确保监听器存在
 */
const ensureGenerateProgressListener = (): void => {
  console.log('[AIShortcutRunner] Ensuring generate progress listener is registered')
  // preload 层会先移除旧监听器再注册新的，所以这里可以安全地重复调用
  window.api.aiShortcutRunner.onGenerateProgress((content) => {
    console.log('[AIShortcutRunner] Received progress chunk, length:', content.length)
    outputText.value += content
  })
}

/**
 * 初始化 - 接收来自主进程的数据
 */
onMounted(() => {
  console.log('[AIShortcutRunner] Component mounted, setting up listeners...')

  // 第一次注册生成进度监听器
  ensureGenerateProgressListener()

  // 监听来自主进程的初始化数据
  window.api.aiShortcutRunner.onInitData((data) => {
    console.log('[AIShortcutRunner] Received init data:', data)
    shortcutName.value = data.name
    shortcutIcon.value = data.icon
    promptTemplate.value = data.prompt || ''
    aiModel.value = data.model
    aiTemperature.value = data.temperature

    // 重置输出文本（窗口可能被重用）
    outputText.value = ''
    isGenerating.value = false
    console.log('[AIShortcutRunner] State reset for new shortcut')

    // 窗口重用时，需要重新确保监听器已注册（因为关闭时会被移除）
    ensureGenerateProgressListener()

    // 如果有选中的文本，显示选中的文本
    if (data.selectedText && data.selectedText.trim()) {
      inputText.value = data.selectedText
    } else {
      // 没有选中文本，显示空（用户可以输入）
      inputText.value = ''
    }

    // 如果设置了自动执行标记，延迟一点时间后自动执行
    if (data.autoExecute) {
      console.log('[AIShortcutRunner] Auto-execute enabled, generating in 100ms...')
      // 延迟 100ms 让 UI 先渲染
      setTimeout(() => {
        handleGenerate()
      }, 100)
    }
  })

  // 监听键盘事件
  window.addEventListener('keydown', handleKeyDown)

  console.log('[AIShortcutRunner] All listeners initialized')
})

onUnmounted(() => {
  // 移除生成进度监听器
  window.api.aiShortcutRunner.removeGenerateProgressListener()
  // 移除键盘事件监听器
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
 * 获取输入框占位符
 */
const getInputPlaceholder = (): string => {
  if (!promptTemplate.value) {
    return '在此输入提示词...'
  }

  // 检查模板中是否包含 [TEXT] 占位符
  if (/\[TEXT\]/gi.test(promptTemplate.value)) {
    return '输入要替换 [TEXT] 的内容...'
  }

  return '输入补充内容（可选）...'
}

/**
 * 检查是否可以生成
 */
const canGenerate = (): boolean => {
  const hasUserInput = inputText.value.trim().length > 0
  const hasTemplate = promptTemplate.value.trim().length > 0

  // 有用户输入或有模板就可以生成
  return hasUserInput || hasTemplate
}

/**
 * 获取生成按钮文字
 */
const getGenerateButtonText = (): string => {
  if (isGenerating.value) {
    return '生成中...'
  }
  return outputText.value ? '重新生成' : '生成'
}

/**
 * 获取生成按钮提示
 */
const getGenerateButtonTooltip = (): string => {
  if (isGenerating.value) {
    return '正在生成中，请稍候...'
  }
  return outputText.value ? '重新生成 (Ctrl+Enter)' : '开始生成 (Ctrl+Enter)'
}

/**
 * 构建最终的 prompt
 * 支持 [TEXT] 占位符替换
 */
const buildFinalPrompt = (): string => {
  const userInput = inputText.value.trim()
  const template = promptTemplate.value.trim()

  // 如果没有模板，直接返回用户输入
  if (!template) {
    return userInput
  }

  // 检查模板中是否包含 [TEXT] 占位符（不区分大小写）
  const textPlaceholderRegex = /\[TEXT\]/gi

  if (textPlaceholderRegex.test(template)) {
    // 包含占位符：用用户输入替换 [TEXT]
    if (userInput) {
      return template.replace(textPlaceholderRegex, userInput)
    } else {
      // 没有用户输入，移除占位符标记
      return template.replace(textPlaceholderRegex, '').trim()
    }
  } else {
    // 不包含占位符：拼接模板和用户输入
    if (userInput) {
      // 如果有用户输入，将模板和输入组合
      // 使用换行分隔，使结构更清晰
      return `${template}\n\n${userInput}`
    } else {
      // 没有用户输入，只使用模板
      return template
    }
  }
}

/**
 * 生成结果
 */
const handleGenerate = async (): Promise<void> => {
  // 构建最终的 prompt
  const finalPrompt = buildFinalPrompt()

  // 检查是否有内容可以生成
  if (!finalPrompt || isGenerating.value) {
    if (!finalPrompt) {
      error('请输入内容或检查快捷指令配置')
    }
    return
  }

  console.log('[AIShortcutRunner] Starting generation...')
  isGenerating.value = true
  outputText.value = '' // 清空输出，准备接收流式内容
  console.log('[AIShortcutRunner] Output text cleared, ready for streaming')

  try {
    console.log('[AIShortcutRunner] Generating with final prompt:', finalPrompt.substring(0, 100))
    console.log(
      '[AIShortcutRunner] Using model:',
      aiModel.value,
      'temperature:',
      aiTemperature.value
    )

    // 调用主进程的 API 生成响应
    const result = await window.api.aiShortcutRunner.generate(
      finalPrompt,
      aiModel.value,
      aiTemperature.value
    )

    console.log('[AIShortcutRunner] Generation completed, result:', {
      success: result.success,
      hasContent: !!result.content,
      contentLength: result.content?.length || 0,
      currentOutputLength: outputText.value.length
    })

    if (result.success) {
      // 如果没有通过流式更新得到内容，则使用完整内容
      if (!outputText.value && result.content) {
        console.warn(
          '[AIShortcutRunner] No streaming content received, using full content as fallback'
        )
        outputText.value = result.content
      } else if (outputText.value) {
        console.log(
          '[AIShortcutRunner] Streaming content received successfully, length:',
          outputText.value.length
        )
      }
      success('生成成功')
    } else {
      // 生成失败，显示错误信息
      console.error('[AIShortcutRunner] Generation failed:', result.error)
      error(result.error || '生成失败，请重试')
      outputText.value = ''
    }
  } catch (err) {
    console.error('[AIShortcutRunner] Generate error:', err)
    error('生成失败，请检查网络连接或重试')
    outputText.value = ''
  } finally {
    isGenerating.value = false
    console.log('[AIShortcutRunner] Generation process finished')
  }
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
