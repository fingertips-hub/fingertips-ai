<template>
  <div class="h-full flex flex-col py-1 bg-gray-50 border-r border-gray-200">
    <!-- 分类列表 - 优化间距 -->
    <div class="flex-1 overflow-y-auto p-1.5">
      <div class="space-y-0.5">
        <button
          v-for="category in categories"
          :key="category.id"
          class="w-full px-2.5 py-1.5 rounded-md text-left transition-all flex items-center gap-2 group relative"
          :class="
            selectedCategoryId === category.id
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-100'
          "
          @click="handleSelectCategory(category)"
          @contextmenu.prevent="handleContextMenu(category, $event)"
        >
          <!-- 图标和名称 -->
          <span class="text-sm flex-shrink-0">{{ category.icon }}</span>
          <span class="text-xs font-medium truncate flex-1">{{ category.name }}</span>

          <!-- 指令数量（悬浮时隐藏，给操作按钮让位） -->
          <span
            class="text-xs px-1.5 py-0.5 rounded flex-shrink-0 min-w-[1.5rem] text-center transition-opacity"
            :class="[
              selectedCategoryId === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-600',
              category.id !== 'all' ? 'group-hover:opacity-0' : ''
            ]"
          >
            {{ getCategoryCount(category.id) }}
          </span>

          <!-- 快捷操作按钮（仅非"全部"分类） -->
          <div
            v-if="category.id !== 'all'"
            class="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-inherit rounded px-1"
          >
            <button
              class="p-0.5 rounded hover:bg-white/20 transition-colors"
              title="编辑"
              @click.stop="handleEditCategory(category)"
            >
              <Icon
                icon="mdi:pencil"
                class="text-xs"
                :class="selectedCategoryId === category.id ? 'text-white' : 'text-gray-600'"
              />
            </button>
            <button
              class="p-0.5 rounded hover:bg-white/20 transition-colors"
              title="删除"
              @click.stop="handleDeleteCategory(category)"
            >
              <Icon
                icon="mdi:delete"
                class="text-xs"
                :class="selectedCategoryId === category.id ? 'text-white' : 'text-red-600'"
              />
            </button>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { ShortcutCategory } from '../../../stores/aiShortcut'

interface Props {
  categories: ShortcutCategory[]
  selectedCategoryId: string
  getCategoryCount: (categoryId: string) => number
}

interface Emits {
  (e: 'select-category', category: ShortcutCategory): void
  (e: 'add-category'): void
  (e: 'edit-category', category: ShortcutCategory): void
  (e: 'delete-category', category: ShortcutCategory): void
  (e: 'contextmenu-category', event: { category: ShortcutCategory; x: number; y: number }): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

/**
 * 选择分类
 */
function handleSelectCategory(category: ShortcutCategory): void {
  emit('select-category', category)
}

/**
 * 编辑分类
 */
function handleEditCategory(category: ShortcutCategory): void {
  emit('edit-category', category)
}

/**
 * 删除分类
 */
function handleDeleteCategory(category: ShortcutCategory): void {
  emit('delete-category', category)
}

/**
 * 右键菜单
 */
function handleContextMenu(category: ShortcutCategory, event: MouseEvent): void {
  emit('contextmenu-category', {
    category,
    x: event.clientX,
    y: event.clientY
  })
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
