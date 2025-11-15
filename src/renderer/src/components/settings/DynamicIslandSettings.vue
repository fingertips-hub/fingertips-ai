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
              <option v-for="widget in collapsedAvailableWidgets" :key="widget.id" :value="widget.id">
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
              <option v-for="widget in collapsedAvailableWidgets" :key="widget.id" :value="widget.id">
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
              <option v-for="widget in collapsedAvailableWidgets" :key="widget.id" :value="widget.id">
                {{ widget.name }} - {{ widget.description }}
              </option>
            </select>
          </div>
        </div>

        <!-- 可用组件列表 -->
        <div class="available-widgets-section">
          <h4 class="subsection-title">可用组件 ({{ collapsedAvailableWidgets.length }})</h4>
          <div v-if="loading" class="loading-state">
            <Icon icon="mdi:loading" class="spinning" />
            <span>加载中...</span>
          </div>
          <div v-else-if="collapsedAvailableWidgets.length === 0" class="empty-state">
            <Icon icon="mdi:package-variant" class="empty-icon" />
            <p>暂无可用组件</p>
          </div>
          <div v-else class="widgets-grid">
            <div v-for="widget in collapsedAvailableWidgets" :key="widget.id" class="widget-card">
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
        <h3 class="section-title">展开插件管理</h3>
        <p class="section-desc">
          启用插件后，可以在灵动岛展开窗口的编辑模式中，从右侧面板拖入插件到展开区域使用
        </p>

        <!-- 可用插件列表 -->
        <div class="available-plugins-section">
          <h4 class="subsection-title">可用插件 ({{ expandedAvailableWidgets.length }})</h4>
          
          <div v-if="loading" class="loading-state">
            <Icon icon="mdi:loading" class="spinning" />
            <span>加载中...</span>
          </div>
          
          <div v-else-if="expandedAvailableWidgets.length === 0" class="empty-state">
            <Icon icon="mdi:package-variant-closed" class="empty-icon" />
            <p>暂无可用的展开插件</p>
          </div>
          
          <div v-else class="plugins-grid">
            <div
              v-for="widget in expandedAvailableWidgets"
              :key="widget.id"
              class="plugin-card"
              :class="{ 'plugin-enabled': isPluginEnabled(widget.id) }"
            >
              <div class="plugin-card-header">
                <div class="plugin-info">
                  <span class="plugin-name">{{ widget.name }}</span>
                  <span class="widget-size-tag" :class="`tag-${widget.expandedSize || 'small'}`">
                    {{ widget.expandedSize === 'large' ? '大型' : '小型' }}
                  </span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    :checked="isPluginEnabled(widget.id)"
                    @change="togglePluginEnabled(widget.id)"
                  />
                  <span class="slider"></span>
                </label>
              </div>
              <p class="plugin-desc">{{ widget.description }}</p>
              <div class="plugin-footer">
                <span class="plugin-meta">{{ widget.author }}</span>
                <span class="plugin-version">v{{ widget.version }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, toRaw } from 'vue'
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

// 折叠组件可用列表（过滤出 category 为 collapsed 或 both 的组件）
const collapsedAvailableWidgets = computed(() => {
  return availableWidgets.value.filter(
    (w: any) => w.category === 'collapsed' || w.category === 'both'
  )
})

// 展开插件启用状态
const enabledExpandedPlugins = ref<string[]>([])
const expandedAvailableWidgets = ref<any[]>([])

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
 * 加载展开插件启用状态
 */
async function loadExpandedPluginsConfig(): Promise<void> {
  try {
    const config = await window.api.settings.getEnabledExpandedPlugins()
    const allWidgets = await window.api.dynamicIslandWidget.getAll()

    // 加载已启用的插件ID列表
    enabledExpandedPlugins.value = config.pluginIds || []

    // 加载所有可用的展开组件（category 为 expanded 或 both）
    expandedAvailableWidgets.value = allWidgets.filter(
      (w: any) => w.category === 'expanded' || w.category === 'both'
    )
  } catch (error) {
    console.error('[DynamicIslandSettings] Failed to load expanded plugins config:', error)
    toast.error('加载展开插件配置失败')
  }
}

/**
 * 切换插件启用状态
 */
async function togglePluginEnabled(pluginId: string): Promise<void> {
  try {
    const index = enabledExpandedPlugins.value.indexOf(pluginId)
    if (index > -1) {
      // 禁用插件
      enabledExpandedPlugins.value.splice(index, 1)
      toast.success('已禁用插件')
    } else {
      // 启用插件
      enabledExpandedPlugins.value.push(pluginId)
      toast.success('已启用插件')
    }
    await saveEnabledPluginsConfig()
  } catch (error) {
    console.error('[DynamicIslandSettings] Failed to toggle plugin:', error)
    toast.error('切换插件状态失败')
  }
}

/**
 * 检查插件是否已启用
 */
function isPluginEnabled(pluginId: string): boolean {
  return enabledExpandedPlugins.value.includes(pluginId)
}

/**
 * 保存已启用插件配置
 */
async function saveEnabledPluginsConfig(): Promise<void> {
  try {
    // 使用 toRaw 解除 Vue 响应式代理，确保传递给 IPC 的是纯数据
    const config = {
      pluginIds: toRaw(enabledExpandedPlugins.value)
    }
    const success = await window.api.settings.setEnabledExpandedPlugins(config)
    
    if (!success) {
      throw new Error('保存配置返回失败')
    }
    
    // 验证保存是否成功
    const savedConfig = await window.api.settings.getEnabledExpandedPlugins()
    if (JSON.stringify(savedConfig.pluginIds) !== JSON.stringify(config.pluginIds)) {
      throw new Error('保存的配置与预期不符')
    }
    
    console.log('[DynamicIslandSettings] Enabled plugins saved successfully:', config.pluginIds)
  } catch (error) {
    console.error('[DynamicIslandSettings] Failed to save enabled plugins:', error)
    throw error
  }
}

/**
 * 组件挂载
 */
onMounted(async () => {
  await loadAvailableWidgets()
  await loadWidgetConfig()
  await loadExpandedPluginsConfig()
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

/* 可用插件区域 */
.available-plugins-section {
  margin-top: 24px;
}

.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.plugin-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
}

.plugin-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.plugin-card.plugin-enabled {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
}

.plugin-card.plugin-enabled:hover {
  border-color: #667eea;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
}

.plugin-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.plugin-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.plugin-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.plugin-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 12px 0;
  line-height: 1.6;
  min-height: 40px;
}

.plugin-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.plugin-meta {
  font-size: 12px;
  color: #9ca3af;
}

.plugin-version {
  font-size: 12px;
  color: #9ca3af;
  font-family: 'Consolas', monospace;
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
