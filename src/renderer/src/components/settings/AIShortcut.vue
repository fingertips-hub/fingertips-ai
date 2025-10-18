<template>
  <div class="ai-shortcut-wrapper">
    <!-- 主内容区 -->
    <div class="settings-page">
      <div class="settings-header">
        <h1 class="text-2xl font-bold text-gray-800">AI 快捷指令</h1>
        <p class="text-sm text-gray-500 mt-2">配置和管理 AI 驱动的快捷指令</p>
      </div>

      <div class="settings-content">
        <!-- 左右分栏布局 -->
        <div class="flex gap-2 h-full">
          <!-- 左侧：分类侧边栏 -->
          <div class="w-48 flex-shrink-0">
            <CategorySidebar
              :categories="store.categories"
              :selected-category-id="store.selectedCategoryId"
              :get-category-count="store.getCategoryShortcutCount"
              @select-category="handleSelectCategory"
              @add-category="showCategoryDialog('add')"
              @edit-category="handleEditCategory"
              @delete-category="handleDeleteCategory"
              @contextmenu-category="handleCategoryContextMenu"
            />
          </div>

          <!-- 右侧：指令网格 -->
          <div class="flex-1 min-w-0">
            <ShortcutGrid
              :shortcuts="store.currentShortcuts"
              :current-category="store.currentCategory"
              @add-shortcut="showShortcutDialog('add')"
              @add-category="showCategoryDialog('add')"
              @click-card="handleShortcutClick"
              @edit-card="handleEditShortcut"
              @delete-card="handleDeleteShortcut"
              @contextmenu-card="handleShortcutContextMenu"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 对话框层（不影响主内容布局） -->
    <Teleport to="body">
      <!-- 分类对话框 -->
      <CategoryDialog
        v-model:visible="categoryDialogVisible"
        :mode="categoryDialogMode"
        :category="currentEditingCategory"
        @confirm="handleCategoryConfirm"
      />

      <!-- 快捷指令对话框 -->
      <ShortcutDialog
        v-model:visible="shortcutDialogVisible"
        :mode="shortcutDialogMode"
        :shortcut="currentEditingShortcut"
        :categories="store.categories"
        :current-category-id="store.selectedCategoryId"
        @confirm="handleShortcutConfirm"
        @edit="handleShortcutDialogEdit"
      />

      <!-- 确认对话框 -->
      <ConfirmDialog
        v-model:visible="confirmDialogVisible"
        :title="confirmDialogTitle"
        :message="confirmDialogMessage"
        :type="confirmDialogType"
        @confirm="handleConfirmDialogConfirm"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAIShortcutStore } from '../../stores/aiShortcut'
import type { ShortcutCategory, AIShortcut } from '../../stores/aiShortcut'
import CategorySidebar from './ai-shortcut/CategorySidebar.vue'
import ShortcutGrid from './ai-shortcut/ShortcutGrid.vue'
import CategoryDialog from './ai-shortcut/CategoryDialog.vue'
import ShortcutDialog from './ai-shortcut/ShortcutDialog.vue'
import ConfirmDialog from '../common/ConfirmDialog.vue'

// Store
const store = useAIShortcutStore()

// 对话框状态
const categoryDialogVisible = ref(false)
const categoryDialogMode = ref<'add' | 'edit'>('add')
const currentEditingCategory = ref<ShortcutCategory | null>(null)

const shortcutDialogVisible = ref(false)
const shortcutDialogMode = ref<'add' | 'edit' | 'view'>('add')
const currentEditingShortcut = ref<AIShortcut | null>(null)

const confirmDialogVisible = ref(false)
const confirmDialogTitle = ref('')
const confirmDialogMessage = ref('')
const confirmDialogType = ref<'info' | 'warning' | 'danger' | 'success'>('warning')
const confirmDialogCallback = ref<(() => void) | null>(null)

// ==================== 分类操作 ====================

/**
 * 选择分类
 */
function handleSelectCategory(category: ShortcutCategory): void {
  store.selectCategory(category.id)
}

/**
 * 显示分类对话框
 */
function showCategoryDialog(mode: 'add' | 'edit', category?: ShortcutCategory): void {
  categoryDialogMode.value = mode
  currentEditingCategory.value = category || null
  categoryDialogVisible.value = true
}

/**
 * 编辑分类
 */
function handleEditCategory(category: ShortcutCategory): void {
  showCategoryDialog('edit', category)
}

/**
 * 删除分类
 */
function handleDeleteCategory(category: ShortcutCategory): void {
  confirmDialogTitle.value = '删除分类'
  confirmDialogMessage.value = `确定要删除分类"${category.name}"吗？该分类下的所有快捷指令也将被删除。`
  confirmDialogType.value = 'danger'
  confirmDialogCallback.value = () => {
    store.deleteCategory(category.id)
  }
  confirmDialogVisible.value = true
}

/**
 * 分类对话框确认
 */
function handleCategoryConfirm(data: { name: string; icon: string }): void {
  if (categoryDialogMode.value === 'add') {
    store.addCategory(data.name, data.icon)
  } else if (currentEditingCategory.value) {
    store.updateCategory(currentEditingCategory.value.id, {
      name: data.name,
      icon: data.icon
    })
  }
}

/**
 * 分类右键菜单
 */
function handleCategoryContextMenu(event: {
  category: ShortcutCategory
  x: number
  y: number
}): void {
  // 可以在这里实现右键菜单功能
  console.log('Category context menu:', event)
}

// ==================== 快捷指令操作 ====================

/**
 * 显示快捷指令对话框
 */
function showShortcutDialog(mode: 'add' | 'edit' | 'view', shortcut?: AIShortcut): void {
  shortcutDialogMode.value = mode
  currentEditingShortcut.value = shortcut || null
  shortcutDialogVisible.value = true
}

/**
 * 点击快捷指令卡片（查看详情）
 */
function handleShortcutClick(shortcut: AIShortcut): void {
  showShortcutDialog('view', shortcut)
}

/**
 * 编辑快捷指令（从卡片上的编辑按钮）
 */
function handleEditShortcut(shortcut: AIShortcut): void {
  showShortcutDialog('edit', shortcut)
}

/**
 * 从查看对话框切换到编辑模式
 */
function handleShortcutDialogEdit(): void {
  shortcutDialogMode.value = 'edit'
}

/**
 * 删除快捷指令
 */
function handleDeleteShortcut(shortcut: AIShortcut): void {
  confirmDialogTitle.value = '删除快捷指令'
  confirmDialogMessage.value = `确定要删除快捷指令"${shortcut.name}"吗？`
  confirmDialogType.value = 'danger'
  confirmDialogCallback.value = async () => {
    // 先注销快捷键
    if (shortcut.hotkey) {
      await window.api.aiShortcutHotkey.unregister(shortcut.id)
    }
    // 删除快捷指令
    store.deleteShortcut(shortcut.id)
  }
  confirmDialogVisible.value = true
}

/**
 * 快捷指令对话框确认
 */
async function handleShortcutConfirm(data: {
  name: string
  icon: string
  prompt: string
  hotkey?: string
  model?: string
  temperature?: number
  categoryId?: string
}): Promise<void> {
  if (shortcutDialogMode.value === 'add') {
    const newShortcut = store.addShortcut(
      data.name,
      data.icon,
      data.prompt,
      data.categoryId,
      data.hotkey,
      data.model,
      data.temperature
    )
    // 如果设置了快捷键，注册到主进程
    if (data.hotkey && newShortcut) {
      await window.api.aiShortcutHotkey.register(
        newShortcut.id,
        data.hotkey,
        newShortcut.name,
        newShortcut.icon,
        newShortcut.prompt,
        data.model,
        data.temperature
      )
    }
  } else if (currentEditingShortcut.value) {
    const oldHotkey = currentEditingShortcut.value.hotkey
    const shortcutId = currentEditingShortcut.value.id

    // 先注销旧快捷键
    if (oldHotkey) {
      await window.api.aiShortcutHotkey.unregister(shortcutId)
    }

    // 更新快捷指令
    store.updateShortcut(shortcutId, {
      name: data.name,
      icon: data.icon,
      prompt: data.prompt,
      hotkey: data.hotkey,
      model: data.model,
      temperature: data.temperature
    })

    // 注册新快捷键
    if (data.hotkey) {
      await window.api.aiShortcutHotkey.register(
        shortcutId,
        data.hotkey,
        data.name,
        data.icon,
        data.prompt,
        data.model,
        data.temperature
      )
    }
  }
}

/**
 * 快捷指令右键菜单
 */
function handleShortcutContextMenu(event: { shortcut: AIShortcut; x: number; y: number }): void {
  // 可以在这里实现右键菜单功能
  console.log('Shortcut context menu:', event)
}

/**
 * 确认对话框确认
 */
function handleConfirmDialogConfirm(): void {
  if (confirmDialogCallback.value) {
    confirmDialogCallback.value()
    confirmDialogCallback.value = null
  }
}

// 初始化
onMounted(() => {
  // 初始化 store（从 localStorage 加载）
  // 注意：快捷键已经在 SuperPanel 启动时注册，这里只需要加载数据
  store.initialize()
  console.log('[AIShortcut] Store initialized, hotkeys already loaded by SuperPanel')
})
</script>

<style scoped>
.ai-shortcut-wrapper {
  height: 100%;
  width: 100%;
}

.settings-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.settings-header {
  padding: 24px 32px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.settings-content {
  flex: 1;
  padding: 0px 6px;
  overflow: hidden;
  background: #f9fafb;
}
</style>
