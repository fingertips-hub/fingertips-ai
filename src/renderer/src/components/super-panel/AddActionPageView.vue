<template>
  <div class="flex flex-col gap-3">
    <!-- 头部 -->
    <div class="flex items-center gap-2">
      <button
        class="p-1.5 hover:bg-gray-100 rounded transition-colors"
        @click="$emit('back')"
        title="返回"
      >
        <Icon icon="mdi:arrow-left" class="text-xl text-gray-600" />
      </button>
      <h2 class="text-base font-semibold text-gray-800">选择动作页</h2>
    </div>

    <!-- 提示信息 -->
    <div class="text-xs text-gray-500 px-1">
      选择一个动作页作为快捷方式,点击后可快速切换到该页面
    </div>

    <!-- 动作页列表 -->
    <div class="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
      <button
        v-for="page in sortedPages"
        :key="page.id"
        class="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group text-left"
        @click="handleSelectPage(page)"
      >
        <!-- 图标 -->
        <div
          class="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 group-hover:bg-blue-100 transition-colors flex-shrink-0"
        >
          <Icon
            icon="mdi:page-layout-header-footer"
            class="text-2xl text-blue-500 group-hover:text-blue-600"
          />
        </div>

        <!-- 内容 -->
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-800 text-sm leading-tight truncate">
            {{ page.title }}
          </div>
          <div class="text-xs text-gray-500 leading-tight mt-0.5">
            {{ getPageItemsCount(page) }} 个项目
          </div>
        </div>

        <!-- 当前页标记 -->
        <div
          v-if="page.id === currentPageId"
          class="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded flex-shrink-0"
        >
          当前
        </div>

        <!-- 箭头 -->
        <Icon
          icon="mdi:chevron-right"
          class="text-lg text-gray-400 group-hover:text-blue-500 flex-shrink-0"
        />
      </button>

      <!-- 空状态 -->
      <div v-if="sortedPages.length === 0" class="text-center py-8 text-gray-400 text-sm">
        <Icon icon="mdi:page-layout-header-footer" class="text-4xl mb-2" />
        <div>暂无动作页</div>
        <div class="text-xs mt-1">请先创建一个动作页</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useActionPageStore } from '../../stores/actionPage'
import type { ActionPage } from '../../types/launcher'

const emit = defineEmits<{
  back: []
  confirm: [data: { pageId: string; pageName: string }]
}>()

const actionPageStore = useActionPageStore()

// 获取所有页面(按顺序排列)
const sortedPages = computed(() => actionPageStore.sortedPages)

// 当前页面ID
const currentPageId = computed(() => actionPageStore.currentPageId)

/**
 * 获取页面的项目数量
 */
function getPageItemsCount(page: ActionPage): number {
  return Object.keys(page.items).length
}

/**
 * 处理选择页面
 */
function handleSelectPage(page: ActionPage): void {
  emit('confirm', {
    pageId: page.id,
    pageName: page.title
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
</style>
