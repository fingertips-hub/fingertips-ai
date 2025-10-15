<template>
  <div class="w-full h-full select-none rounded-lg bg-[#ebebeb]">
    <div
      ref="containerRef"
      class="w-full h-full select-none borderbox m-0 p-2 pt-1 rounded-lg flex flex-col"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <div
        class="flex items-center justify-between p-1 w-full bg-transparent pointer-events-none flex-shrink-0"
      >
        <div class="text-sm font-bold">Fingertips</div>
        <div class="flex gap-0 items-center">
          <button
            class="px-2 py-1 cursor-pointer pointer-events-auto transition-colors outline-none"
            :class="{ 'text-blue-500': isPinned, 'text-gray-400 hover:text-gray-600': !isPinned }"
            :title="isPinned ? '取消固定' : '固定面板'"
            @click="handleTogglePin"
          >
            <Icon :icon="isPinned ? 'mdi:pin' : 'mdi:pin-off'" />
          </button>
          <button
            class="px-2 py-1 cursor-pointer pointer-events-auto outline-none"
            @click="handleClose"
          >
            <Icon icon="mdi:close" />
          </button>
        </div>
      </div>
      <div
        class="w-full bg-transparent flex gap-2 flex-col items-center rounded-lg justify-center flex-1"
      >
        <MainPanel />
        <ActionPagePanel class="w-full flex-1" />
      </div>
    </div>

    <!-- Toast 通知容器 -->
    <Toast
      v-for="toast in toasts"
      :key="toast.id"
      :message="toast.message"
      :type="toast.type"
      :duration="toast.duration"
      :visible="toast.visible"
      @close="() => {}"
    />

    <!-- 全局右键菜单 -->
    <ContextMenu
      :visible="contextMenu.visible.value"
      :x="contextMenu.x.value"
      :y="contextMenu.y.value"
      :menu-items="contextMenu.menuItems.value"
      @close="contextMenu.closeContextMenu"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import MainPanel from './components/super-panel/MainPanel.vue'
import ActionPagePanel from './components/super-panel/ActionPagePanel.vue'
import Toast from './components/common/Toast.vue'
import ContextMenu from './components/common/ContextMenu.vue'
import { useToast } from './composables/useToast'
import { useContextMenu } from './composables/useContextMenu'

// Toast
const { toasts } = useToast()

// 全局右键菜单
const contextMenu = useContextMenu()

// 容器引用
const containerRef = ref<HTMLElement | null>(null)

// 拖动状态
const isDragging = ref(false)
const lastMouseX = ref(0)
const lastMouseY = ref(0)

// 固定状态
const isPinned = ref(false)

/**
 * 处理鼠标按下事件
 */
const handleMouseDown = (event: MouseEvent): void => {
  // 只响应左键
  if (event.button !== 0) return

  // 只有当点击的是最外层容器本身时才允许拖拽
  // 如果点击的是内部元素,则不触发拖拽
  if (event.target !== containerRef.value) return

  isDragging.value = true
  lastMouseX.value = event.screenX
  lastMouseY.value = event.screenY

  // 防止文本选择
  event.preventDefault()
}

/**
 * 处理鼠标移动事件
 */
const handleMouseMove = (event: MouseEvent): void => {
  if (!isDragging.value) return

  // 计算鼠标移动的偏移量
  const deltaX = event.screenX - lastMouseX.value
  const deltaY = event.screenY - lastMouseY.value

  // 只有当偏移量不为0时才发送IPC消息
  if (deltaX !== 0 || deltaY !== 0) {
    // 通过IPC发送窗口移动请求到主进程
    window.api.window.moveWindow(deltaX, deltaY)

    // 更新上次鼠标位置
    lastMouseX.value = event.screenX
    lastMouseY.value = event.screenY
  }
}

/**
 * 处理鼠标释放事件
 */
const handleMouseUp = (): void => {
  isDragging.value = false
}

const handleClose = (): void => {
  window.electron.ipcRenderer.send('hide-super-panel')
}

/**
 * 处理切换固定状态
 */
const handleTogglePin = (): void => {
  isPinned.value = !isPinned.value
  window.api.superPanel.setPinned(isPinned.value)
  console.log('Pin state toggled:', isPinned.value)
}

/**
 * 处理重置固定状态事件
 */
const handleResetPinned = (): void => {
  isPinned.value = false
  console.log('Pin state reset from IPC event')
}

/**
 * 处理键盘按键事件
 */
const handleKeyDown = (event: KeyboardEvent): void => {
  // 按下 ESC 键时隐藏窗口
  if (event.key === 'Escape') {
    event.preventDefault() // 防止默认行为
    handleClose()
  }
}

// 组件挂载时监听 IPC 事件和键盘事件
onMounted(() => {
  window.electron.ipcRenderer.on('super-panel:reset-pinned', handleResetPinned)
  window.addEventListener('keydown', handleKeyDown)
})

// 组件卸载时移除监听
onUnmounted(() => {
  window.electron.ipcRenderer.removeListener('super-panel:reset-pinned', handleResetPinned)
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped></style>
