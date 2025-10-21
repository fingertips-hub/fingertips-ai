<template>
  <div class="flex flex-col gap-2 h-full" @wheel="handleWheel">
    <!-- 顶部工具栏 -->
    <div class="flex items-center justify-between flex-shrink-0 px-2">
      <!-- 页面标题 -->
      <div class="text-sm text-gray-600 font-medium">{{ currentPageTitle }}</div>

      <!-- 页面切换按钮 -->
      <div class="flex items-center gap-3">
        <Icon
          icon="mdi:chevron-double-left"
          class="w-4.5 h-4.5 transition-colors"
          :class="
            canGoPrevious
              ? 'text-gray-500 cursor-pointer hover:text-blue-600'
              : 'text-gray-300 cursor-not-allowed'
          "
          @click="handlePreviousPage"
        />
        <Icon
          icon="mdi:chevron-double-right"
          class="w-4.5 h-4.5 transition-colors"
          :class="
            canGoNext
              ? 'text-gray-500 cursor-pointer hover:text-blue-600'
              : 'text-gray-300 cursor-not-allowed'
          "
          @click="handleNextPage"
        />
      </div>

      <!-- 编辑和创建按钮 -->
      <div class="flex items-center gap-2">
        <Icon
          icon="mdi:plus"
          class="text-gray-500 cursor-pointer w-5 h-5 hover:text-blue-600 transition-colors"
          @click="handleCreatePage"
        />
        <Icon
          icon="mdi:pencil"
          class="text-gray-500 cursor-pointer w-4.5 h-4.5 hover:text-blue-600 transition-colors"
          @click="handleEditPageTitle"
        />
        <Icon
          icon="mdi:trash-can"
          class="w-4.5 h-4.5 transition-colors"
          :class="
            canDeletePage
              ? 'text-gray-500 cursor-pointer hover:text-red-600'
              : 'text-gray-300 cursor-not-allowed'
          "
          @click="handleDeletePage"
        />
      </div>
    </div>

    <!-- Items 网格 -->
    <div class="w-full bg-transparent grid grid-cols-5 grid-rows-4 gap-1 p-1 flex-1">
      <SuperPanelItem v-for="index in 20" :key="index" :index="index - 1" area="action" />
    </div>

    <!-- 输入对话框 -->
    <InputDialog
      v-model:visible="dialogVisible"
      :title="dialogTitle"
      :placeholder="dialogPlaceholder"
      :default-value="dialogDefaultValue"
      @confirm="handleDialogConfirm"
    />

    <!-- 确认删除对话框 -->
    <ConfirmDialog
      v-model:visible="confirmDeleteVisible"
      type="danger"
      title="删除页面"
      :message="`确定要删除页面「${currentPageTitle}」吗？删除后该页面的所有项目都将丢失，此操作不可恢复。`"
      confirm-text="删除"
      cancel-text="取消"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useActionPageStore } from '../../stores/actionPage'
import SuperPanelItem from './SuperPanelItem.vue'
import InputDialog from '../common/InputDialog.vue'
import ConfirmDialog from '../common/ConfirmDialog.vue'

const actionPageStore = useActionPageStore()

// 输入对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogPlaceholder = ref('')
const dialogDefaultValue = ref('')
const dialogMode = ref<'create' | 'edit'>('create')

// 确认删除对话框状态
const confirmDeleteVisible = ref(false)

// 滚轮切换防抖控制
const isWheelThrottled = ref(false)
const WHEEL_THROTTLE_DELAY = 300 // 300ms 的节流延迟

// 当前页面标题
const currentPageTitle = computed(() => actionPageStore.currentPage?.title || '默认')

// 是否可以切换页面
const canGoPrevious = computed(() => actionPageStore.canGoPrevious)
const canGoNext = computed(() => actionPageStore.canGoNext)

// 是否可以删除页面（至少保留一个页面）
const canDeletePage = computed(() => actionPageStore.sortedPages.length > 1)

/**
 * 切换到上一页
 */
function handlePreviousPage(): void {
  if (canGoPrevious.value) {
    actionPageStore.previousPage()
  }
}

/**
 * 切换到下一页
 */
function handleNextPage(): void {
  if (canGoNext.value) {
    actionPageStore.nextPage()
  }
}

/**
 * 创建新页面
 */
function handleCreatePage(): void {
  dialogMode.value = 'create'
  dialogTitle.value = '创建新页面'
  dialogPlaceholder.value = '请输入页面名称'
  dialogDefaultValue.value = '新页面'
  dialogVisible.value = true
}

/**
 * 编辑页面标题
 */
function handleEditPageTitle(): void {
  if (!actionPageStore.currentPageId) return

  dialogMode.value = 'edit'
  dialogTitle.value = '编辑页面标题'
  dialogPlaceholder.value = '请输入新的页面名称'
  dialogDefaultValue.value = currentPageTitle.value
  dialogVisible.value = true
}

/**
 * 删除页面（显示确认对话框）
 */
function handleDeletePage(): void {
  // 如果只有一个页面，不允许删除
  if (!canDeletePage.value) return
  if (!actionPageStore.currentPageId) return
  confirmDeleteVisible.value = true
}

/**
 * 确认删除页面
 */
function handleConfirmDelete(): void {
  if (actionPageStore.currentPageId) {
    actionPageStore.deletePage(actionPageStore.currentPageId)
  }
}

/**
 * 对话框确认
 */
function handleDialogConfirm(value: string): void {
  if (dialogMode.value === 'create') {
    // 创建新页面
    const newPageId = actionPageStore.createPage(value)
    // 自动切换到新创建的页面
    actionPageStore.setCurrentPage(newPageId)
  } else if (dialogMode.value === 'edit') {
    // 编辑页面标题
    if (actionPageStore.currentPageId) {
      actionPageStore.updatePageTitle(actionPageStore.currentPageId, value)
    }
  }
}

/**
 * 处理鼠标滚轮事件
 * 向上滚动切换到上一页，向下滚动切换到下一页
 */
function handleWheel(event: WheelEvent): void {
  // 如果正在节流中，忽略事件
  if (isWheelThrottled.value) return

  // 判断滚动方向
  const isScrollingDown = event.deltaY > 0
  const isScrollingUp = event.deltaY < 0

  // 向上滚动且可以切换到上一页
  if (isScrollingUp && canGoPrevious.value) {
    event.preventDefault() // 阻止默认滚动行为
    actionPageStore.previousPage()
    throttleWheel()
  }
  // 向下滚动且可以切换到下一页
  else if (isScrollingDown && canGoNext.value) {
    event.preventDefault() // 阻止默认滚动行为
    actionPageStore.nextPage()
    throttleWheel()
  }
}

/**
 * 节流控制：在指定延迟内不响应新的滚轮事件
 */
function throttleWheel(): void {
  isWheelThrottled.value = true
  setTimeout(() => {
    isWheelThrottled.value = false
  }, WHEEL_THROTTLE_DELAY)
}
</script>

<style scoped></style>
