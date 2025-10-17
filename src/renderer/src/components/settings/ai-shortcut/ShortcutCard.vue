<template>
  <div
    class="group relative bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 p-4 transition-all duration-200 cursor-pointer hover:border-blue-400 hover:shadow-lg hover:scale-[1.02] flex flex-col h-full"
    @click="handleClick"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- 头部：标题和图标 -->
    <div class="flex items-start justify-between gap-3 mb-3">
      <!-- 标题 -->
      <h3 class="text-base font-semibold text-gray-800 line-clamp-1 flex-1" :title="shortcut.name">
        {{ shortcut.name }}
      </h3>

      <!-- 图标 -->
      <div
        class="w-10 h-10 flex items-center justify-center text-2xl bg-white/80 rounded-lg shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform"
      >
        {{ shortcut.icon }}
      </div>
    </div>

    <!-- 提示词预览 -->
    <p
      class="text-xs text-gray-600 line-clamp-3 mb-2 leading-relaxed flex-1"
      :title="shortcut.prompt"
    >
      {{ shortcut.prompt }}
    </p>

    <!-- 底部信息栏 -->
    <div class="flex items-center justify-between pt-3 border-t border-gray-200/60 mt-auto">
      <!-- 时间信息 -->
      <span class="text-xs text-gray-400">{{ formatDate(shortcut.updatedAt) }}</span>

      <!-- 操作按钮（始终显示但较淡） -->
      <div class="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
        <button
          class="p-1 rounded hover:bg-white/80 transition-colors"
          title="编辑"
          @click.stop="handleEdit"
        >
          <Icon icon="mdi:pencil" class="text-sm text-gray-600" />
        </button>
        <button
          class="p-1 rounded hover:bg-white/80 transition-colors"
          title="删除"
          @click.stop="handleDelete"
        >
          <Icon icon="mdi:delete" class="text-sm text-red-500" />
        </button>
      </div>
    </div>

    <!-- 悬浮时的高亮边框效果 -->
    <div
      class="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { AIShortcut } from '../../../stores/aiShortcut'

interface Props {
  shortcut: AIShortcut
}

interface Emits {
  (e: 'click', shortcut: AIShortcut): void
  (e: 'edit', shortcut: AIShortcut): void
  (e: 'delete', shortcut: AIShortcut): void
  (e: 'contextmenu', event: { shortcut: AIShortcut; x: number; y: number }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/**
 * 格式化日期
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚'
  }

  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes} 分钟前`
  }

  // 小于1天
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours} 小时前`
  }

  // 小于7天
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `${days} 天前`
  }

  // 格式化为日期
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * 点击卡片
 */
function handleClick(): void {
  emit('click', props.shortcut)
}

/**
 * 编辑
 */
function handleEdit(): void {
  emit('edit', props.shortcut)
}

/**
 * 删除
 */
function handleDelete(): void {
  emit('delete', props.shortcut)
}

/**
 * 右键菜单
 */
function handleContextMenu(event: MouseEvent): void {
  emit('contextmenu', {
    shortcut: props.shortcut,
    x: event.clientX,
    y: event.clientY
  })
}
</script>

<style scoped>
/* 限制文本行数 */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
