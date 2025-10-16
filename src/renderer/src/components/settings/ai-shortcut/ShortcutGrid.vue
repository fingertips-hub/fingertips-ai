<template>
  <div class="h-full flex flex-col py-2">
    <!-- 头部：标题和操作按钮 -->
    <div class="flex items-center justify-between mb-4 flex-shrink-0">
      <div>
        <h2 class="text-lg font-semibold text-gray-800">
          {{ currentCategory?.icon }} {{ currentCategory?.name || '快捷指令' }}
        </h2>
        <p class="text-sm text-gray-500 mt-1">共 {{ shortcuts.length }} 个指令</p>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-2">
        <button
          class="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          @click="$emit('add-category')"
        >
          <Icon icon="mdi:folder-plus" class="text-base" />
          <span>添加分类</span>
        </button>
        <button
          class="px-3 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          @click="$emit('add-shortcut')"
        >
          <Icon icon="mdi:plus" class="text-base" />
          <span>添加指令</span>
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-y-auto p-1">
      <!-- 有指令时显示网格 -->
      <div v-if="shortcuts.length > 0" class="grid gap-3" :class="gridCols">
        <ShortcutCard
          v-for="shortcut in shortcuts"
          :key="shortcut.id"
          :shortcut="shortcut"
          @click="handleCardClick"
          @edit="handleCardEdit"
          @delete="handleCardDelete"
          @contextmenu="handleCardContextMenu"
        />
      </div>

      <!-- 空状态 -->
      <div v-else class="flex flex-col items-center justify-center h-full min-h-[400px]">
        <div class="text-gray-300 mb-4">
          <Icon icon="mdi:lightning-bolt-outline" class="text-6xl" />
        </div>
        <p class="text-gray-500 text-base mb-2">暂无快捷指令</p>
        <p class="text-gray-400 text-sm mb-6">点击上方"添加指令"按钮创建您的第一个 AI 快捷指令</p>
        <button
          class="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          @click="$emit('add-shortcut')"
        >
          <Icon icon="mdi:plus" class="text-base" />
          <span>立即添加</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import ShortcutCard from './ShortcutCard.vue'
import type { AIShortcut, ShortcutCategory } from '../../../stores/aiShortcut'

interface Props {
  shortcuts: AIShortcut[]
  currentCategory: ShortcutCategory | undefined
}

interface Emits {
  (e: 'add-shortcut'): void
  (e: 'add-category'): void
  (e: 'click-card', shortcut: AIShortcut): void
  (e: 'edit-card', shortcut: AIShortcut): void
  (e: 'delete-card', shortcut: AIShortcut): void
  (e: 'contextmenu-card', event: { shortcut: AIShortcut; x: number; y: number }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/**
 * 响应式网格列数
 * 根据容器宽度自动调整列数
 */
const gridCols = computed(() => {
  // 使用 Tailwind 的响应式网格
  // 最小卡片宽度 200px，自动填充
  return 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'
})

/**
 * 点击卡片
 */
function handleCardClick(shortcut: AIShortcut): void {
  emit('click-card', shortcut)
}

/**
 * 编辑卡片
 */
function handleCardEdit(shortcut: AIShortcut): void {
  emit('edit-card', shortcut)
}

/**
 * 删除卡片
 */
function handleCardDelete(shortcut: AIShortcut): void {
  emit('delete-card', shortcut)
}

/**
 * 右键菜单
 */
function handleCardContextMenu(event: { shortcut: AIShortcut; x: number; y: number }): void {
  emit('contextmenu-card', event)
}
</script>

<style scoped>
/* 自定义滚动条 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
