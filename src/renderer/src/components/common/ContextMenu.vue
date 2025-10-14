<template>
  <Teleport to="body">
    <Transition name="context-menu">
      <div
        v-if="visible"
        ref="menuRef"
        class="fixed z-[9999] min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-200 py-1"
        :style="menuStyle"
        @click="handleMenuClick"
      >
        <template v-for="(item, index) in menuItems" :key="index">
          <!-- 分割线 -->
          <div v-if="item.type === 'divider'" class="h-px bg-gray-200 my-1"></div>

          <!-- 菜单项 -->
          <button
            v-else
            class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="[
              item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700',
              item.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
            ]"
            :disabled="item.disabled"
            @click="handleItemClick(item)"
          >
            <!-- 图标 -->
            <Icon v-if="item.icon" :icon="item.icon" class="text-base" />
            <!-- 文本 -->
            <span>{{ item.label }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Icon } from '@iconify/vue'

/**
 * 菜单项类型定义
 */
export interface ContextMenuItem {
  type?: 'item' | 'divider' // 菜单项类型
  label?: string // 菜单项文本
  icon?: string // 图标 (iconify)
  danger?: boolean // 是否为危险操作 (红色)
  disabled?: boolean // 是否禁用
  action?: () => void | Promise<void> // 点击回调
}

interface Props {
  visible: boolean // 是否显示菜单
  x: number // 鼠标X坐标
  y: number // 鼠标Y坐标
  menuItems: ContextMenuItem[] // 菜单项列表
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  x: 0,
  y: 0,
  menuItems: () => []
})

const emit = defineEmits<{
  close: []
}>()

const menuRef = ref<HTMLDivElement>()

/**
 * 计算菜单位置样式
 * 确保菜单不会超出屏幕边界
 */
const menuStyle = computed(() => {
  if (!menuRef.value) {
    return {
      left: `${props.x}px`,
      top: `${props.y}px`
    }
  }

  const menuRect = menuRef.value.getBoundingClientRect()
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  let left = props.x
  let top = props.y

  // 检查右边界
  if (left + menuRect.width > windowWidth) {
    left = windowWidth - menuRect.width - 10
  }

  // 检查底部边界
  if (top + menuRect.height > windowHeight) {
    top = windowHeight - menuRect.height - 10
  }

  // 确保不超出左边界和顶部边界
  left = Math.max(10, left)
  top = Math.max(10, top)

  return {
    left: `${left}px`,
    top: `${top}px`
  }
})

/**
 * 处理菜单项点击
 */
async function handleItemClick(item: ContextMenuItem): Promise<void> {
  if (item.disabled) return

  // 执行菜单项的 action
  if (item.action) {
    await item.action()
  }

  // 关闭菜单
  emit('close')
}

/**
 * 处理菜单容器点击
 * 阻止事件冒泡,避免触发外部点击关闭
 */
function handleMenuClick(e: Event): void {
  e.stopPropagation()
}

/**
 * 处理点击外部关闭
 */
function handleClickOutside(e: MouseEvent): void {
  if (!menuRef.value) return

  const target = e.target as Node
  if (!menuRef.value.contains(target)) {
    emit('close')
  }
}

/**
 * 处理 ESC 键关闭
 */
function handleEscape(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    emit('close')
  }
}

// 监听 visible 变化,添加/移除事件监听
watch(
  () => props.visible,
  async (newVisible) => {
    if (newVisible) {
      // 等待 DOM 更新后再添加事件监听
      await nextTick()
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    } else {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }
)

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
/* 菜单过渡动画 */
.context-menu-enter-active,
.context-menu-leave-active {
  transition: all 0.15s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.context-menu-enter-to,
.context-menu-leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>
