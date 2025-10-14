<template>
  <div class="flex flex-col h-full">
    <!-- 顶部返回按钮 -->
    <div class="flex items-center gap-2 mb-4 flex-shrink-0">
      <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors" @click="emit('back')">
        <Icon icon="mdi:arrow-left" class="text-xl text-gray-600" />
      </button>
      <h2 class="text-lg font-semibold text-gray-800">添加文件夹</h2>
    </div>

    <!-- 主体区域 - 支持滚动 -->
    <div class="flex-1 min-h-0 max-h-[400px] overflow-y-auto pr-2">
      <div class="space-y-4">
        <!-- 文件夹选择/拖拽区域 (合并) -->
        <div>
          <div
            ref="dropZoneRef"
            class="w-full px-4 py-6 border-2 border-dashed rounded-lg transition-all flex flex-col items-center justify-center gap-2 cursor-pointer select-none"
            :class="
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : loading
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
            "
            @dblclick="handleSelectFolder"
            @dragover.prevent="handleDragOver"
            @dragleave.prevent="handleDragLeave"
            @drop.prevent="handleDrop"
          >
            <Icon
              v-if="!loading"
              :icon="isDragging ? 'mdi:folder-download' : 'mdi:folder-plus'"
              class="text-3xl transition-all"
              :class="isDragging ? 'text-blue-500' : 'text-gray-400'"
            />
            <Icon v-else icon="mdi:loading" class="text-3xl text-blue-500 animate-spin" />
            <div class="text-center">
              <p
                class="text-base font-medium"
                :class="isDragging ? 'text-blue-600' : 'text-gray-700'"
              >
                {{ loading ? '处理中...' : isDragging ? '释放以添加文件夹' : '双击选择文件夹' }}
              </p>
              <p class="text-sm text-gray-500 mt-1">
                {{ loading ? '正在加载信息...' : '或将文件夹拖拽到此处' }}
              </p>
            </div>
            <div v-if="!loading && !isDragging" class="text-xs text-gray-400 mt-1">
              仅支持文件夹
            </div>
          </div>
        </div>

        <!-- 预览区域 -->
        <div v-if="folderInfo" class="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <div class="flex items-center gap-4">
            <!-- 图标 -->
            <div class="w-12 h-12 flex-shrink-0">
              <div class="w-full h-full bg-blue-50 rounded flex items-center justify-center">
                <Icon icon="mdi:folder" class="text-3xl text-blue-500" />
              </div>
            </div>

            <!-- 信息 -->
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-800 truncate">{{ folderInfo.name }}</div>
              <div class="text-sm text-gray-500 truncate" :title="folderInfo.path">
                {{ folderInfo.path }}
              </div>
            </div>

            <!-- 删除按钮 -->
            <button
              class="p-2 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
              @click="handleClear"
            >
              <Icon icon="mdi:close" class="text-lg text-gray-600" />
            </button>
          </div>

          <!-- 名称编辑 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
            <input
              v-model="displayName"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入文件夹显示名称"
              maxlength="20"
            />
            <div class="mt-1 text-xs text-gray-400">{{ displayName.length }}/20 字符</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部确认按钮 - 固定在底部 -->
    <div class="mt-6 pt-4">
      <button
        class="w-full px-4 py-3 rounded-lg font-medium transition-all"
        :class="
          folderInfo && !loading
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        "
        :disabled="!folderInfo || loading"
        @click="handleConfirm"
      >
        {{ loading ? '处理中...' : '确认添加' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import type { FileInfo } from '../../types/launcher'
import { useToast } from '../../composables/useToast'

const emit = defineEmits<{
  back: []
  confirm: [data: { folderInfo: FileInfo; icon: string }]
}>()

const toast = useToast()

// 状态
const loading = ref(false)
const isDragging = ref(false)
const folderInfo = ref<FileInfo | null>(null)
const displayName = ref('')
const dropZoneRef = ref<HTMLElement | null>(null)

/**
 * 处理文件夹选择
 */
async function handleSelectFolder(): Promise<void> {
  try {
    loading.value = true
    const folderPath = await window.api.launcher.selectFolder()

    if (folderPath) {
      await processFolder(folderPath)
    }
  } catch (error) {
    console.error('Error selecting folder:', error)
    toast.error('选择文件夹失败')
  } finally {
    loading.value = false
  }
}

/**
 * 处理拖拽进入
 */
function handleDragOver(event: DragEvent): void {
  event.preventDefault()
  isDragging.value = true
}

/**
 * 处理拖拽离开
 */
function handleDragLeave(): void {
  isDragging.value = false
}

/**
 * 处理文件夹拖放
 */
async function handleDrop(event: DragEvent): Promise<void> {
  isDragging.value = false

  console.log('=== Drop Event Debug Info ===')
  console.log('Event:', event)
  console.log('dataTransfer:', event.dataTransfer)

  const items = event.dataTransfer?.items
  console.log('dataTransfer.items:', items)

  if (!items || items.length === 0) {
    toast.error('未检测到文件夹')
    return
  }

  // 尝试从拖拽项中获取文件夹
  const item = items[0]

  // 如果是文件对象，尝试获取路径
  if (item.kind === 'file') {
    const file = item.getAsFile()
    if (!file) {
      toast.error('无法获取文件夹信息')
      return
    }

    try {
      // 使用 webUtils.getPathForFile API 获取路径
      const folderPath = window.api.launcher.getFilePath(file)
      console.log('Folder path from webUtils:', folderPath)

      if (!folderPath) {
        console.error('Failed to get folder path from webUtils')
        toast.error('无法获取文件夹路径，请尝试使用文件夹选择器')
        return
      }

      // 验证是否为文件夹
      const isFolderResult = await window.api.launcher.isFolder(folderPath)
      if (!isFolderResult) {
        toast.error('请拖拽文件夹，而不是文件')
        return
      }

      await handleDroppedFolder(folderPath)
    } catch (error) {
      console.error('Error in handleDrop:', error)
      toast.error('处理拖拽文件夹失败，请尝试使用文件夹选择器')
    }
  }
}

/**
 * 处理拖拽的文件夹
 */
async function handleDroppedFolder(folderPath: string): Promise<void> {
  console.log('Processing dropped folder:', folderPath)

  try {
    loading.value = true
    await processFolder(folderPath)
  } catch (error) {
    console.error('Error processing dropped folder:', error)
    toast.error('处理文件夹失败')
  } finally {
    loading.value = false
  }
}

/**
 * 处理文件夹(提取信息)
 */
async function processFolder(folderPath: string): Promise<void> {
  try {
    // 获取文件夹信息
    const info = await window.api.launcher.getFolderInfo(folderPath)
    if (!info) {
      toast.error('无法获取文件夹信息')
      return
    }

    folderInfo.value = info
    // 初始化显示名称为文件夹名
    displayName.value = info.name
    toast.success('文件夹加载成功')
  } catch (error) {
    console.error('Error processing folder:', error)
    toast.error('处理文件夹失败')
    throw error
  }
}

/**
 * 清除选择
 */
function handleClear(): void {
  folderInfo.value = null
  displayName.value = ''
}

/**
 * 确认添加
 */
function handleConfirm(): void {
  if (!folderInfo.value) {
    toast.error('请先选择文件夹')
    return
  }

  // 验证显示名称
  if (!displayName.value.trim()) {
    toast.error('请输入显示名称')
    return
  }

  // 使用自定义的显示名称
  const customFolderInfo: FileInfo = {
    ...folderInfo.value,
    name: displayName.value.trim()
  }

  // 使用 mdi:folder 作为图标标识
  emit('confirm', {
    folderInfo: customFolderInfo,
    icon: 'mdi:folder'
  })
}
</script>
