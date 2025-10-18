<template>
  <div class="flex flex-col gap-2">
    <h2 class="text-base font-semibold text-gray-800 mb-1">选择添加类型</h2>

    <!-- 类型选择按钮 -->
    <button
      v-for="item in items"
      :key="item.type"
      class="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
      :class="{ 'opacity-50 cursor-not-allowed': item.disabled }"
      :disabled="item.disabled"
      @click="handleSelect(item.type)"
    >
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 group-hover:bg-blue-100 transition-colors flex-shrink-0"
      >
        <Icon :icon="item.icon" class="text-xl text-gray-600 group-hover:text-blue-600" />
      </div>
      <div class="flex-1 text-left min-w-0">
        <div class="font-medium text-gray-800 text-sm leading-tight">{{ item.label }}</div>
        <div class="text-xs text-gray-500 leading-tight mt-0.5">{{ item.description }}</div>
      </div>
      <Icon
        v-if="!item.disabled"
        icon="mdi:chevron-right"
        class="text-lg text-gray-400 group-hover:text-blue-500 flex-shrink-0"
      />
      <span v-else class="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded flex-shrink-0"
        >即将推出</span
      >
    </button>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { LauncherItemType } from '../../types/launcher'

interface TypeItem {
  type: LauncherItemType
  label: string
  description: string
  icon: string
  disabled: boolean
}

const emit = defineEmits<{
  select: [type: LauncherItemType]
}>()

const items: TypeItem[] = [
  {
    type: 'file',
    label: '文件',
    description: '添加应用程序或快捷方式',
    icon: 'mdi:file-document',
    disabled: false
  },
  {
    type: 'folder',
    label: '文件夹',
    description: '添加文件夹快速访问',
    icon: 'mdi:folder',
    disabled: false // 已实现
  },
  {
    type: 'web',
    label: '网页',
    description: '添加网页链接',
    icon: 'mdi:web',
    disabled: false // 已实现
  },
  {
    type: 'cmd',
    label: 'CMD命令',
    description: '添加命令行快捷方式',
    icon: 'mdi:console',
    disabled: false // 已实现
  },
  {
    type: 'action-page',
    label: '动作页',
    description: '添加动作页快捷方式',
    icon: 'mdi:page-layout-header-footer',
    disabled: false
  },
  {
    type: 'ai-shortcut',
    label: 'AI快捷命令',
    description: '添加AI快捷命令',
    icon: 'mdi:robot',
    disabled: false // 已实现
  },
  {
    type: 'plugin',
    label: '插件',
    description: '添加已启用的插件快捷方式',
    icon: 'mdi:puzzle',
    disabled: false // 已实现
  }
]

function handleSelect(type: LauncherItemType): void {
  emit('select', type)
}
</script>
