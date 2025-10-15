<template>
  <div class="hotkey-input-wrapper">
    <input
      ref="inputRef"
      type="text"
      :value="displayValue"
      :placeholder="placeholder"
      readonly
      :class="['hotkey-input', isRecording ? 'recording' : '', disabled ? 'disabled' : '']"
      :disabled="disabled"
      @click="startRecording"
      @blur="stopRecording"
      @keydown="handleKeyDown"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @contextmenu.prevent
    />
    <div v-if="isRecording" class="recording-hint">
      请按下键盘快捷键或长按鼠标按键（{{ Math.floor(recordingTime / 100) * 100 }}ms）
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const isRecording = ref(false)
const recordedKeys = ref<Set<string>>(new Set())

// 鼠标长按相关状态
const mouseDownButton = ref<number | null>(null)
const mouseDownTime = ref<number>(0)
const mousePressTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const recordingTime = ref<number>(0)
const recordingInterval = ref<ReturnType<typeof setInterval> | null>(null)
const currentModifiers = ref<string[]>([])

const LONG_PRESS_THRESHOLD = 300 // 长按阈值（毫秒）

// 鼠标按键映射
const MOUSE_BUTTON_MAP: Record<number, string> = {
  0: 'Left', // 左键
  1: 'Middle', // 中键
  2: 'Right', // 右键
  3: 'Back', // 后退键（侧键1）
  4: 'Forward' // 前进键（侧键2）
}

// 中文显示映射
const DISPLAY_MAP: Record<string, string> = {
  // 修饰键
  Ctrl: 'Ctrl',
  Alt: 'Alt',
  Shift: 'Shift',
  Meta: 'Win',
  // 鼠标动作
  'LongPress:Left': '长按左键',
  'LongPress:Middle': '长按中键',
  'LongPress:Right': '长按右键',
  'LongPress:Back': '长按侧键1',
  'LongPress:Forward': '长按侧键2'
}

/**
 * 显示值 - 将内部格式转换为友好显示
 */
const displayValue = computed(() => {
  if (!props.modelValue) return ''

  // 检查是否包含鼠标动作
  if (props.modelValue.includes('LongPress:')) {
    const parts = props.modelValue.split('+')
    return parts
      .map((part) => {
        if (part.startsWith('LongPress:')) {
          return DISPLAY_MAP[part] || part
        }
        return DISPLAY_MAP[part] || part
      })
      .join(' + ')
  }

  return props.modelValue
})

/**
 * 开始录制快捷键
 */
function startRecording(): void {
  if (props.disabled) return
  isRecording.value = true
  recordedKeys.value.clear()
  mouseDownButton.value = null
  mouseDownTime.value = 0
  recordingTime.value = 0
  currentModifiers.value = []
}

/**
 * 停止录制快捷键
 */
function stopRecording(): void {
  isRecording.value = false
  recordedKeys.value.clear()
  cleanupMousePress()
}

/**
 * 清理鼠标按下状态
 */
function cleanupMousePress(): void {
  if (mousePressTimer.value) {
    clearTimeout(mousePressTimer.value)
    mousePressTimer.value = null
  }
  if (recordingInterval.value) {
    clearInterval(recordingInterval.value)
    recordingInterval.value = null
  }
  mouseDownButton.value = null
  mouseDownTime.value = 0
  recordingTime.value = 0
  currentModifiers.value = []
}

/**
 * 处理鼠标按下事件
 */
function handleMouseDown(event: MouseEvent): void {
  if (props.disabled) return

  // 左键点击用于获取焦点和启动录制，不处理
  if (event.button === 0) {
    return
  }

  // 非左键：只在录制模式下处理
  if (!isRecording.value) return

  // 阻止右键菜单和中键滚动
  event.preventDefault()
  event.stopPropagation()

  // 记录按下的按键
  mouseDownButton.value = event.button
  mouseDownTime.value = Date.now()
  recordingTime.value = 0

  // 记录修饰键
  currentModifiers.value = []
  if (event.ctrlKey) currentModifiers.value.push('Ctrl')
  if (event.altKey) currentModifiers.value.push('Alt')
  if (event.shiftKey) currentModifiers.value.push('Shift')
  if (event.metaKey) currentModifiers.value.push('Meta')

  // 开始计时显示
  recordingInterval.value = setInterval(() => {
    recordingTime.value = Date.now() - mouseDownTime.value
  }, 50)

  // 设置长按检测定时器
  mousePressTimer.value = setTimeout(() => {
    handleLongPress(event.button)
  }, LONG_PRESS_THRESHOLD)
}

/**
 * 处理鼠标释放事件
 */
function handleMouseUp(event: MouseEvent): void {
  if (props.disabled) return

  // 左键释放不处理
  if (event.button === 0) {
    return
  }

  // 非左键：只在录制模式下处理
  if (!isRecording.value) return

  event.preventDefault()
  event.stopPropagation()

  // 清理定时器
  cleanupMousePress()
}

/**
 * 处理长按识别
 */
function handleLongPress(button: number): void {
  const buttonName = MOUSE_BUTTON_MAP[button]
  if (!buttonName) {
    console.warn('Unknown mouse button:', button)
    cleanupMousePress()
    return
  }

  // 构建快捷键字符串
  const parts: string[] = [...currentModifiers.value]
  parts.push(`LongPress:${buttonName}`)

  const hotkey = parts.join('+')

  console.log('Long press detected:', hotkey)

  emit('update:modelValue', hotkey)
  isRecording.value = false
  inputRef.value?.blur()
  cleanupMousePress()
}

/**
 * 处理键盘按键事件
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (!isRecording.value) return

  event.preventDefault()
  event.stopPropagation()

  const key = event.key
  const code = event.code

  // 忽略单独的修饰键
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
    return
  }

  // 构建快捷键字符串
  const parts: string[] = []

  if (event.ctrlKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  if (event.metaKey) parts.push('Meta')

  // 处理特殊键
  let keyName = key
  if (code.startsWith('Key')) {
    // 字母键
    keyName = code.substring(3) // KeyA -> A
  } else if (code.startsWith('Digit')) {
    // 数字键
    keyName = code.substring(5) // Digit1 -> 1
  } else if (key === ' ') {
    keyName = 'Space'
  } else if (key === 'Escape') {
    keyName = 'Esc'
  } else if (key.length === 1) {
    keyName = key.toUpperCase()
  }

  parts.push(keyName)

  const hotkey = parts.join('+')

  // 必须包含至少一个修饰键
  if (parts.length > 1) {
    emit('update:modelValue', hotkey)
    isRecording.value = false
    inputRef.value?.blur()
  }
}

// 组件卸载时清理
onUnmounted(() => {
  cleanupMousePress()
})
</script>

<style scoped>
.hotkey-input-wrapper {
  position: relative;
}

.hotkey-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.hotkey-input:hover:not(.disabled) {
  border-color: #9ca3af;
}

.hotkey-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.hotkey-input.recording {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.hotkey-input.disabled {
  background: #f3f4f6;
  cursor: not-allowed;
  color: #9ca3af;
}

.recording-hint {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  padding: 4px 8px;
  background: #1f2937;
  color: white;
  font-size: 12px;
  border-radius: 4px;
  white-space: nowrap;
  animation: fadeIn 0.2s ease;
  z-index: 10;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
