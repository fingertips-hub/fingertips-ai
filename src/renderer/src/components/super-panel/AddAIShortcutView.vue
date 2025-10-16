<template>
  <div class="flex flex-col gap-3">
    <!-- 头部 -->
    <div class="flex items-center gap-2">
      <button
        class="p-1.5 hover:bg-gray-100 rounded transition-colors"
        title="返回"
        @click="$emit('back')"
      >
        <Icon icon="mdi:arrow-left" class="text-xl text-gray-600" />
      </button>
      <h2 class="text-base font-semibold text-gray-800">
        {{ mode === 'edit' ? '编辑AI快捷命令' : '选择AI快捷命令' }}
      </h2>
    </div>

    <!-- 提示信息 -->
    <div class="text-xs text-gray-500 px-1">
      {{
        mode === 'edit'
          ? '选择一个新的AI快捷命令进行替换'
          : '选择一个AI快捷命令作为快捷方式,点击后可快速执行该命令'
      }}
    </div>

    <!-- 分类筛选 -->
    <div v-if="categories.length > 1" class="flex gap-2 flex-wrap px-1">
      <button
        v-for="category in categories"
        :key="category.id"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
        :class="
          selectedCategoryId === category.id
            ? 'bg-blue-500 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        "
        @click="selectCategory(category.id)"
      >
        <span v-if="category.icon" class="mr-1">{{ category.icon }}</span>
        {{ category.name }}
        <span class="ml-1 opacity-70">({{ getCategoryCount(category.id) }})</span>
      </button>
    </div>

    <!-- AI Shortcuts 列表 -->
    <div class="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
      <button
        v-for="shortcut in filteredShortcuts"
        :key="shortcut.id"
        class="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group text-left"
        @click="handleSelectShortcut(shortcut)"
      >
        <!-- 图标 -->
        <div
          class="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 group-hover:bg-blue-100 transition-colors flex-shrink-0 text-2xl"
        >
          {{ shortcut.icon }}
        </div>

        <!-- 内容 -->
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-800 text-sm leading-tight truncate">
            {{ shortcut.name }}
          </div>
          <div class="text-xs text-gray-500 leading-tight mt-0.5 line-clamp-2">
            {{ getShortcutPreview(shortcut) }}
          </div>
        </div>

        <!-- 箭头 -->
        <Icon
          icon="mdi:chevron-right"
          class="text-lg text-gray-400 group-hover:text-blue-500 flex-shrink-0"
        />
      </button>

      <!-- 空状态 -->
      <div
        v-if="filteredShortcuts.length === 0"
        class="flex flex-col items-center py-8 text-gray-400 text-sm"
      >
        <Icon icon="mdi:robot" class="text-4xl mb-2" />
        <div class="text-xs mt-1">
          {{ selectedCategoryId === 'all' ? '请先在设置中创建AI快捷命令' : '该分类下暂无命令' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useAIShortcutStore } from '../../stores/aiShortcut'
import type { AIShortcut } from '../../stores/aiShortcut'

interface Props {
  mode?: 'add' | 'edit'
  initialData?: {
    shortcutId: string
    shortcutName: string
    shortcutIcon: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'add'
})

const emit = defineEmits<{
  back: []
  confirm: [data: { shortcutId: string; shortcutName: string; shortcutIcon: string }]
}>()

const aiShortcutStore = useAIShortcutStore()

// 状态
const selectedCategoryId = ref<string>('all')

// 在编辑模式下，如果有初始数据，选择对应的分类
if (props.mode === 'edit' && props.initialData) {
  const shortcut = aiShortcutStore.shortcuts.find((s) => s.id === props.initialData?.shortcutId)
  if (shortcut) {
    selectedCategoryId.value = shortcut.categoryId
  }
}

// 组件挂载时初始化 store
onMounted(() => {
  // 确保 store 已初始化
  if (aiShortcutStore.shortcuts.length === 0) {
    aiShortcutStore.initialize()
  }
})

// 获取所有分类
const categories = computed(() => aiShortcutStore.categories)

// 获取当前分类的快捷命令（已排序）
const filteredShortcuts = computed(() => {
  return aiShortcutStore.getShortcutsByCategory(selectedCategoryId.value)
})

/**
 * 选择分类
 */
function selectCategory(categoryId: string): void {
  selectedCategoryId.value = categoryId
}

/**
 * 获取分类下的快捷命令数量
 */
function getCategoryCount(categoryId: string): number {
  return aiShortcutStore.getCategoryShortcutCount(categoryId)
}

/**
 * 获取快捷命令预览文本（prompt的前50个字符）
 */
function getShortcutPreview(shortcut: AIShortcut): string {
  const maxLength = 50
  if (shortcut.prompt.length <= maxLength) {
    return shortcut.prompt
  }
  return shortcut.prompt.substring(0, maxLength) + '...'
}

/**
 * 处理选择快捷命令
 */
function handleSelectShortcut(shortcut: AIShortcut): void {
  emit('confirm', {
    shortcutId: shortcut.id,
    shortcutName: shortcut.name,
    shortcutIcon: shortcut.icon
  })
}
</script>

<style scoped>
/* 自定义滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 文本截断 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
