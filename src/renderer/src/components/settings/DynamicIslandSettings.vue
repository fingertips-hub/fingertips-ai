<template>
  <div class="dynamic-island-settings">
    <!-- 二级菜单 -->
    <div class="sub-menu">
      <div
        class="sub-menu-item"
        :class="{ active: activeTab === 'collapsed' }"
        @click="activeTab = 'collapsed'"
      >
        收起组件
      </div>
      <div
        class="sub-menu-item"
        :class="{ active: activeTab === 'expanded' }"
        @click="activeTab = 'expanded'"
      >
        展开组件
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 收起组件设置 -->
      <div v-if="activeTab === 'collapsed'" class="collapsed-widgets-settings">
        <h3 class="section-title">收起组件配置</h3>
        <p class="section-desc">
          配置灵动岛收起状态时显示的组件，最多可配置 3 个组件（左、中、右）
        </p>

        <div class="widget-config-list">
          <!-- 左侧组件 -->
          <div class="widget-config-item">
            <div class="widget-config-header">
              <Icon icon="mdi:arrow-left" class="position-icon" />
              <span class="position-label">左侧组件</span>
            </div>
            <select
              v-model="widgetConfig.left"
              class="widget-select"
              :disabled="loading"
              @change="handleWidgetChange"
            >
              <option value="">选择一个组件</option>
              <option v-for="widget in availableWidgets" :key="widget.id" :value="widget.id">
                {{ widget.name }} - {{ widget.description }}
              </option>
            </select>
          </div>

          <!-- 中间组件 -->
          <div class="widget-config-item">
            <div class="widget-config-header">
              <Icon icon="mdi:arrow-up" class="position-icon" />
              <span class="position-label">中间组件</span>
            </div>
            <select
              v-model="widgetConfig.center"
              class="widget-select"
              :disabled="loading"
              @change="handleWidgetChange"
            >
              <option value="">选择一个组件</option>
              <option v-for="widget in availableWidgets" :key="widget.id" :value="widget.id">
                {{ widget.name }} - {{ widget.description }}
              </option>
            </select>
          </div>

          <!-- 右侧组件 -->
          <div class="widget-config-item">
            <div class="widget-config-header">
              <Icon icon="mdi:arrow-right" class="position-icon" />
              <span class="position-label">右侧组件</span>
            </div>
            <select
              v-model="widgetConfig.right"
              class="widget-select"
              :disabled="loading"
              @change="handleWidgetChange"
            >
              <option value="">选择一个组件</option>
              <option v-for="widget in availableWidgets" :key="widget.id" :value="widget.id">
                {{ widget.name }} - {{ widget.description }}
              </option>
            </select>
          </div>
        </div>

        <!-- 可用组件列表 -->
        <div class="available-widgets-section">
          <h4 class="subsection-title">可用组件 ({{ availableWidgets.length }})</h4>
          <div v-if="loading" class="loading-state">
            <Icon icon="mdi:loading" class="spinning" />
            <span>加载中...</span>
          </div>
          <div v-else-if="availableWidgets.length === 0" class="empty-state">
            <Icon icon="mdi:package-variant" class="empty-icon" />
            <p>暂无可用组件</p>
          </div>
          <div v-else class="widgets-grid">
            <div v-for="widget in availableWidgets" :key="widget.id" class="widget-card">
              <div class="widget-card-header">
                <span class="widget-card-name">{{ widget.name }}</span>
                <span v-if="widget.type === 'simple'" class="widget-tag tag-simple">简单</span>
                <span v-else class="widget-tag tag-advanced">高级</span>
              </div>
              <p class="widget-card-desc">{{ widget.description }}</p>
              <div class="widget-card-footer">
                <span class="widget-card-meta">{{ widget.author }}</span>
                <span class="widget-card-version">v{{ widget.version }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 展开组件设置 -->
      <div v-else-if="activeTab === 'expanded'" class="expanded-widgets-settings">
        <h3 class="section-title">展开组件配置</h3>
        <p class="section-desc">配置灵动岛展开状态时显示的组件，支持拖拽排序</p>

        <!-- 已配置的组件列表 -->
        <div class="configured-widgets">
          <div class="configured-header">
            <h4 class="subsection-title">已配置组件 ({{ expandedWidgets.length }})</h4>
            <button class="add-widget-btn" @click="showAddWidgetDialog = true">
              <Icon icon="mdi:plus" />
              添加组件
            </button>
          </div>

          <div v-if="expandedWidgets.length === 0" class="empty-state">
            <Icon icon="mdi:package-variant-closed" class="empty-icon" />
            <p>暂无配置组件</p>
            <button class="add-widget-btn-large" @click="showAddWidgetDialog = true">
              <Icon icon="mdi:plus-circle" />
              添加第一个组件
            </button>
          </div>

          <div v-else class="expanded-widget-list">
            <div
              v-for="(widget, index) in expandedWidgets"
              :key="widget.widgetId"
              class="expanded-widget-item"
              :draggable="true"
              @dragstart="handleExpandedDragStart(index)"
              @dragover.prevent
              @drop="handleExpandedDrop(index)"
            >
              <Icon icon="mdi:drag" class="drag-handle" />
              <div class="widget-info">
                <span class="widget-name">{{ widget.name }}</span>
                <span class="widget-size-tag" :class="`tag-${widget.size}`">
                  {{ widget.size === 'large' ? '大型' : '小型' }}
                </span>
              </div>
              <div class="widget-actions">
                <label class="switch">
                  <input
                    type="checkbox"
                    :checked="widget.enabled"
                    @change="toggleExpandedWidget(widget)"
                  />
                  <span class="slider"></span>
                </label>
                <button class="delete-btn" @click="removeExpandedWidget(index)">
                  <Icon icon="mdi:delete" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 添加组件对话框 -->
        <div
          v-if="showAddWidgetDialog"
          class="dialog-overlay"
          @click.self="showAddWidgetDialog = false"
        >
          <div class="dialog-content">
            <div class="dialog-header">
              <h3>添加展开组件</h3>
              <button class="dialog-close" @click="showAddWidgetDialog = false">
                <Icon icon="mdi:close" />
              </button>
            </div>
            <div class="dialog-body">
              <div v-if="expandedAvailableWidgets.length === 0" class="empty-state">
                <p>暂无可用的展开组件</p>
              </div>
              <div v-else class="add-widget-grid">
                <div
                  v-for="widget in expandedAvailableWidgets"
                  :key="widget.id"
                  class="add-widget-card"
                  @click="addExpandedWidget(widget)"
                >
                  <div class="add-widget-card-header">
                    <span class="widget-name">{{ widget.name }}</span>
                    <span class="widget-size-tag" :class="`tag-${widget.expandedSize}`">
                      {{ widget.expandedSize === 'large' ? '大型' : '小型' }}
                    </span>
                  </div>
                  <p class="add-widget-desc">{{ widget.description }}</p>
                  <div class="add-widget-footer">
                    <span class="widget-meta">{{ widget.author }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useToast } from '../../composables/useToast'

const toast = useToast()

// 当前标签页
const activeTab = ref<'collapsed' | 'expanded'>('collapsed')

// 组件配置
const widgetConfig = ref({
  left: null as string | null,
  center: null as string | null,
  right: null as string | null
})

// 可用组件列表
const availableWidgets = ref<any[]>([])

// 展开组件配置
const expandedWidgets = ref<any[]>([])
const expandedAvailableWidgets = ref<any[]>([])
const showAddWidgetDialog = ref(false)
const draggedExpandedIndex = ref<number | null>(null)

// 加载状态
const loading = ref(false)

/**
 * 加载可用组件
 */
async function loadAvailableWidgets(): Promise<void> {
  try {
    loading.value = true
    const widgets = await window.api.dynamicIslandWidget.getAll()
    availableWidgets.value = widgets || []
  } catch (error) {
    console.error('[DynamicIslandSettings] Failed to load widgets:', error)
    toast.error('加载组件列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载组件配置
 */
async function loadWidgetConfig(): Promise<void> {
  try {
    const config = await window.api.settings.getDynamicIslandWidgets()
    // 处理空值转换为空字符串（用于select绑定）
    widgetConfig.value = {
      left: config.left || '',
      center: config.center || '',
      right: config.right || ''
    } as any
  } catch (error) {
    console.error('[DynamicIslandSettings] Failed to load widget config:', error)
    toast.error('加载组件配置失败')
  }
}

/**
 * 保存组件配置
 */
async function handleWidgetChange(): Promise<void> {
  try {
    // 将空字符串转换为null
    const config = {
      left: widgetConfig.value.left || null,
      center: widgetConfig.value.center || null,
      right: widgetConfig.value.right || null
    }
    const success = await window.api.settings.setDynamicIslandWidgets(config)
    if (success) {
      toast.success('组件配置已保存')
    } else {
      toast.error('保存组件配置失败')
    }
  } catch (error) {
    console.error('[DynamicIslandSettings] Failed to save widget config:', error)
    toast.error('保存组件配置失败')
  }
}

/**
 * 加载展开组件配置
 */
async function loadExpandedWidgetsConfig(): Promise<void> {
  try {
    const config = await window.api.settings.getDynamicIslandExpandedWidgets()
    const allWidgets = await window.api.dynamicIslandWidget.getAll()

    // 加载已配置的展开组件
    expandedWidgets.value = (config.widgets || []).map((item: any) => {
      const widget = allWidgets.find((w: any) => w.id === item.widgetId)
      return {
        ...item,
        name: widget?.name || '未知组件',
        size: widget?.expandedSize || 'small'
      }
    })

    // 加载可用的展开组件（category 为 expanded 或 both）
    expandedAvailableWidgets.value = allWidgets.filter(
      (w: any) =>
        (w.category === 'expanded' || w.category === 'both') &&
        !expandedWidgets.value.some((ew: any) => ew.widgetId === w.id)
    )
  } catch (error) {
    console.error('[DynamicIslandSettings] Failed to load expanded widgets:', error)
    toast.error('加载展开组件失败')
  }
}

/**
 * 添加展开组件
 */
async function addExpandedWidget(widget: any): Promise<void> {
  try {
    const newWidget = {
      widgetId: widget.id,
      row: 0,
      col: expandedWidgets.value.length,
      rowSpan: widget.expandedSize === 'large' ? 2 : 1,
      colSpan: 1,
      enabled: true,
      name: widget.name,
      size: widget.expandedSize || 'small'
    }

    expandedWidgets.value.push(newWidget)
    await saveExpandedWidgetsConfig()
    await loadExpandedWidgetsConfig()
    showAddWidgetDialog.value = false
    toast.success(`已添加组件：${widget.name}`)
  } catch (error) {
    console.error('[DynamicIslandSettings] Failed to add widget:', error)
    toast.error('添加组件失败')
  }
}

/**
 * 删除展开组件
 */
async function removeExpandedWidget(index: number): Promise<void> {
  try {
    const widget = expandedWidgets.value[index]
    expandedWidgets.value.splice(index, 1)
    await saveExpandedWidgetsConfig()
    await loadExpandedWidgetsConfig()
    toast.success(`已删除组件：${widget.name}`)
  } catch (error) {
    console.error('[DynamicIslandSettings] Failed to remove widget:', error)
    toast.error('删除组件失败')
  }
}

/**
 * 切换展开组件启用状态
 */
async function toggleExpandedWidget(widget: any): Promise<void> {
  try {
    widget.enabled = !widget.enabled
    await saveExpandedWidgetsConfig()
    toast.success(widget.enabled ? '已启用组件' : '已禁用组件')
  } catch (error) {
    console.error('[DynamicIslandSettings] Failed to toggle widget:', error)
    toast.error('切换组件状态失败')
  }
}

/**
 * 拖拽开始
 */
function handleExpandedDragStart(index: number): void {
  draggedExpandedIndex.value = index
}

/**
 * 拖拽放置
 */
async function handleExpandedDrop(targetIndex: number): Promise<void> {
  if (draggedExpandedIndex.value === null || draggedExpandedIndex.value === targetIndex) {
    return
  }

  const draggedItem = expandedWidgets.value[draggedExpandedIndex.value]
  expandedWidgets.value.splice(draggedExpandedIndex.value, 1)
  expandedWidgets.value.splice(targetIndex, 0, draggedItem)
  draggedExpandedIndex.value = null

  await saveExpandedWidgetsConfig()
}

/**
 * 保存展开组件配置
 */
async function saveExpandedWidgetsConfig(): Promise<void> {
  try {
    const config = {
      widgets: expandedWidgets.value.map((w, index) => ({
        widgetId: w.widgetId,
        row: 0,
        col: index,
        rowSpan: w.rowSpan,
        colSpan: w.colSpan,
        enabled: w.enabled
      }))
    }
    await window.api.settings.setDynamicIslandExpandedWidgets(config)
  } catch (error) {
    console.error('[DynamicIslandSettings] Failed to save expanded widgets:', error)
    throw error
  }
}

/**
 * 组件挂载
 */
onMounted(async () => {
  await loadAvailableWidgets()
  await loadWidgetConfig()
  await loadExpandedWidgetsConfig()
})
</script>

<style scoped>
.dynamic-island-settings {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 二级菜单 */
.sub-menu {
  display: flex;
  gap: 4px;
  padding: 20px 32px 0;
  border-bottom: 1px solid #e5e7eb;
}

.sub-menu-item {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  position: relative;
  bottom: -1px;
}

.sub-menu-item:hover:not(.disabled) {
  color: #374151;
  background: #f9fafb;
}

.sub-menu-item.active {
  color: #1677ff;
  border-bottom-color: #1677ff;
}

.sub-menu-item.disabled {
  color: #d1d5db;
  cursor: not-allowed;
}

/* 内容区域 */
.content-area {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.section-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 32px 0;
}

/* 组件配置列表 */
.widget-config-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 48px;
}

.widget-config-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.widget-config-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.position-icon {
  font-size: 20px;
  color: #1677ff;
}

.position-label {
  font-size: 15px;
  font-weight: 500;
  color: #374151;
}

/* 下拉选择器 */
.widget-select {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  color: #374151;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s;
}

.widget-select:hover:not(:disabled) {
  border-color: #9ca3af;
}

.widget-select:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.1);
}

.widget-select:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.6;
}

.widget-select option {
  padding: 8px;
}

/* 标签 */
.widget-tag {
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
}

.tag-simple {
  color: #059669;
  background: #d1fae5;
}

.tag-advanced {
  color: #d97706;
  background: #fef3c7;
}

/* 旋转动画 */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 可用组件区域 */
.available-widgets-section {
  padding-top: 32px;
  border-top: 1px solid #e5e7eb;
}

.subsection-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 20px 0;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: #6b7280;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #9ca3af;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.widget-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.widget-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.widget-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.widget-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
}

.widget-card-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.widget-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.widget-card-meta {
  font-size: 12px;
  color: #9ca3af;
}

.widget-card-version {
  font-size: 12px;
  color: #9ca3af;
  font-family: 'Consolas', monospace;
}

/* 即将推出 */
.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 96px 48px;
  text-align: center;
}

.coming-soon-icon {
  font-size: 64px;
  color: #d1d5db;
  margin-bottom: 20px;
}

.coming-soon h3 {
  font-size: 20px;
  font-weight: 600;
  color: #6b7280;
  margin: 0 0 8px 0;
}

.coming-soon p {
  font-size: 14px;
  color: #9ca3af;
  margin: 0;
}

/* 展开组件设置 */
.expanded-widgets-settings {
  flex: 1;
  overflow-y: auto;
}

.configured-widgets {
  margin-top: 24px;
}

.configured-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.add-widget-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-widget-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.add-widget-btn-large {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 16px;
}

.add-widget-btn-large:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.expanded-widget-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.expanded-widget-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: move;
  transition: all 0.2s ease;
}

.expanded-widget-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.drag-handle {
  font-size: 20px;
  color: #9ca3af;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.widget-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.widget-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.widget-size-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.widget-size-tag.tag-small {
  background: #dbeafe;
  color: #1e40af;
}

.widget-size-tag.tag-large {
  background: #fce7f3;
  color: #be123c;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  border-radius: 24px;
  transition: 0.3s;
}

.slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
}

input:checked + .slider {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.delete-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  background: #ef4444;
  color: white;
}

/* 对话框 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.dialog-close {
  width: 32px;
  height: 32px;
  padding: 0;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dialog-close:hover {
  background: rgba(0, 0, 0, 0.1);
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
}

.add-widget-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.add-widget-card {
  padding: 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-widget-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.add-widget-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.add-widget-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.add-widget-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #9ca3af;
}

.widget-meta {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
