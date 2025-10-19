<template>
  <div class="plugin-manager w-full h-full">
    <!-- 头部 -->
    <div class="header">
      <div>
        <h1 class="title">插件管理</h1>
        <p class="subtitle">管理和配置应用插件,扩展功能</p>
      </div>
      <button class="btn-reload" @click="handleReloadAll" :disabled="isLoading">
        <Icon icon="mdi:refresh" class="icon" :class="{ spinning: isLoading }" />
        刷新列表
      </button>
    </div>

    <!-- 搜索和筛选栏 -->
    <div class="filter-bar">
      <!-- 搜索框 -->
      <div class="search-box">
        <Icon icon="mdi:magnify" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索插件名称、描述或作者..."
          class="search-input"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="btn-clear">
          <Icon icon="mdi:close" />
        </button>
      </div>

      <!-- 关键词分类 -->
      <div class="keywords-filter">
        <button
          :class="['keyword-chip', { active: selectedKeyword === null }]"
          @click="selectedKeyword = null"
        >
          <Icon icon="mdi:apps" class="chip-icon" />
          <span>全部 ({{ plugins.length }})</span>
        </button>
        <button
          v-for="keyword in allKeywords"
          :key="keyword"
          :class="['keyword-chip', { active: selectedKeyword === keyword }]"
          @click="selectedKeyword = keyword"
        >
          <Icon icon="mdi:tag" class="chip-icon" />
          <span>{{ keyword }} ({{ getKeywordCount(keyword) }})</span>
        </button>
      </div>
    </div>

    <!-- 结果统计 -->
    <div v-if="!isLoading && !error" class="result-stats">
      <span class="stats-text">
        显示 <strong>{{ filteredPlugins.length }}</strong> 个插件
        <template v-if="searchQuery || selectedKeyword"> (已筛选) </template>
      </span>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading">
      <Icon icon="mdi:loading" class="loading-icon" />
      <span>加载中...</span>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="error" class="error">
      <Icon icon="mdi:alert-circle" class="error-icon" />
      <span>{{ error }}</span>
      <button class="btn-retry" @click="handleReloadAll">重试</button>
    </div>

    <!-- 插件列表 -->
    <div v-else-if="filteredPlugins.length > 0" class="plugin-list">
      <div v-for="plugin in filteredPlugins" :key="plugin.id" class="plugin-card">
        <!-- 插件图标 -->
        <div class="plugin-icon">
          <Icon v-if="plugin.icon" :icon="plugin.icon" class="icon-large" />
          <Icon v-else icon="mdi:puzzle" class="icon-large" />
        </div>

        <!-- 插件信息 -->
        <div class="plugin-info">
          <div class="plugin-header">
            <h3 class="plugin-name">{{ plugin.name }}</h3>
            <span class="plugin-version">v{{ plugin.version }}</span>
          </div>
          <p class="plugin-description">{{ plugin.description }}</p>

          <!-- 关键词标签 -->
          <div class="plugin-keywords">
            <span
              v-for="keyword in plugin.keywords"
              :key="keyword"
              class="keyword-tag"
              @click="selectedKeyword = keyword"
              :title="`点击筛选 ${keyword}`"
            >
              {{ keyword }}
            </span>
          </div>

          <div class="plugin-meta-row">
            <div v-if="plugin.author" class="plugin-meta">
              <Icon icon="mdi:account" class="meta-icon" />
              <span>{{ plugin.author }}</span>
            </div>
            <div class="plugin-permissions">
              <Icon icon="mdi:shield-check" class="meta-icon" />
              <span>权限: {{ plugin.permissions?.length || 0 }} 项</span>
            </div>
          </div>
        </div>

        <!-- 插件操作 -->
        <div class="plugin-actions">
          <!-- 启用/禁用开关 -->
          <div class="switch-container">
            <label class="switch">
              <input
                type="checkbox"
                :checked="plugin.enabled"
                @change="handleToggle(plugin.id, ($event.target as HTMLInputElement).checked)"
              />
              <span class="slider"></span>
            </label>
            <span class="switch-label">{{ plugin.enabled ? '已启用' : '已禁用' }}</span>
          </div>

          <!-- 重新加载按钮 -->
          <button class="btn-reload-single" @click="handleReload(plugin.id)" title="重新加载插件">
            <Icon icon="mdi:refresh" />
          </button>

          <!-- 主页链接 -->
          <a
            v-if="plugin.homepage"
            :href="plugin.homepage"
            target="_blank"
            class="btn-homepage"
            title="访问插件主页"
          >
            <Icon icon="mdi:open-in-new" />
          </a>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <Icon icon="mdi:puzzle-outline" class="empty-icon" />
      <p class="empty-text">
        {{ searchQuery || selectedKeyword ? '未找到匹配的插件' : '暂无插件' }}
      </p>
      <p v-if="!searchQuery && !selectedKeyword" class="empty-hint">
        将插件文件夹放入 <code>plugins/</code> 目录中,然后刷新列表
      </p>
      <p v-else class="empty-hint">尝试调整搜索条件或选择其他分类</p>
      <button v-if="searchQuery || selectedKeyword" @click="resetFilters" class="btn-reset-filter">
        清除筛选条件
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { usePluginStore } from '../../stores/plugin'
import { storeToRefs } from 'pinia'

const pluginStore = usePluginStore()
const { plugins, isLoading, error } = storeToRefs(pluginStore)

// 搜索和筛选状态
const searchQuery = ref('')
const selectedKeyword = ref<string | null>(null)

// 初始化加载
onMounted(() => {
  pluginStore.loadPlugins()
})

/**
 * 获取所有唯一的关键词
 */
const allKeywords = computed(() => {
  const keywordSet = new Set<string>()
  plugins.value.forEach((plugin) => {
    plugin.keywords?.forEach((keyword) => keywordSet.add(keyword))
  })
  return Array.from(keywordSet).sort()
})

/**
 * 获取指定关键词的插件数量
 */
function getKeywordCount(keyword: string): number {
  return plugins.value.filter((plugin) => plugin.keywords?.includes(keyword)).length
}

/**
 * 筛选后的插件列表
 */
const filteredPlugins = computed(() => {
  let result = plugins.value

  // 按关键词筛选
  if (selectedKeyword.value) {
    result = result.filter((plugin) => plugin.keywords?.includes(selectedKeyword.value!))
  }

  // 按搜索词筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter((plugin) => {
      return (
        plugin.name.toLowerCase().includes(query) ||
        plugin.description.toLowerCase().includes(query) ||
        plugin.author?.toLowerCase().includes(query) ||
        plugin.keywords?.some((keyword) => keyword.toLowerCase().includes(query))
      )
    })
  }

  return result
})

/**
 * 重置筛选条件
 */
function resetFilters(): void {
  searchQuery.value = ''
  selectedKeyword.value = null
}

/**
 * 切换插件状态
 */
async function handleToggle(pluginId: string, enabled: boolean): Promise<void> {
  const success = await pluginStore.togglePlugin(pluginId, enabled)
  if (!success && error.value) {
    alert(`操作失败: ${error.value}`)
  }
}

/**
 * 重新加载单个插件
 */
async function handleReload(pluginId: string): Promise<void> {
  const success = await pluginStore.reloadPlugin(pluginId)
  if (success) {
    alert('插件重新加载成功!')
  } else if (error.value) {
    alert(`重新加载失败: ${error.value}`)
  }
}

/**
 * 重新加载所有插件
 */
async function handleReloadAll(): Promise<void> {
  await pluginStore.loadPlugins()
  // 重新加载后重置筛选条件
  resetFilters()
}
</script>

<style scoped>
.plugin-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  overflow: hidden;
}

/* 头部 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-shrink: 0;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px 0;
}

.subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.btn-reload {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reload:hover:not(:disabled) {
  background: #2563eb;
}

.btn-reload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

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

/* 搜索和筛选栏 */
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 20px;
  color: #9ca3af;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 40px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  outline: none;
}

.search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-clear {
  position: absolute;
  right: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: #e5e7eb;
  color: #111827;
}

.keywords-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.keyword-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #f3f4f6;
  color: #6b7280;
  border: 2px solid transparent;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.keyword-chip:hover {
  background: #e5e7eb;
  color: #111827;
}

.keyword-chip.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.chip-icon {
  font-size: 16px;
}

/* 结果统计 */
.result-stats {
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
  flex-shrink: 0;
}

.stats-text {
  font-size: 13px;
  color: #6b7280;
}

.stats-text strong {
  color: #111827;
  font-weight: 600;
}

/* 加载状态 */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: #6b7280;
  flex: 1;
  min-height: 0;
}

.loading-icon {
  font-size: 24px;
  animation: spin 1s linear infinite;
}

/* 错误状态 */
.error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  flex-shrink: 0;
}

.error-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.btn-retry {
  margin-left: auto;
  padding: 6px 12px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry:hover {
  background: #b91c1c;
}

/* 插件列表 */
.plugin-list {
  display: grid;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding-right: 4px;
}

/* 滚动条样式 */
.plugin-list::-webkit-scrollbar {
  width: 8px;
}

.plugin-list::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 4px;
}

.plugin-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.plugin-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.plugin-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;
}

.plugin-card:hover {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.plugin-icon {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 12px;
}

.icon-large {
  font-size: 32px;
  color: #6b7280;
}

.plugin-info {
  flex: 1;
  min-width: 0;
}

.plugin-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.plugin-name {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.plugin-version {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
}

.plugin-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.plugin-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.keyword-tag {
  display: inline-block;
  padding: 3px 10px;
  background: #dbeafe;
  color: #1e40af;
  font-size: 12px;
  font-weight: 500;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.keyword-tag:hover {
  background: #bfdbfe;
  transform: translateY(-1px);
}

.plugin-meta-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.plugin-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
}

.plugin-permissions {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
}

.meta-icon {
  font-size: 16px;
}

.plugin-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

/* 开关 */
.switch-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
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
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #3b82f6;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.switch-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

/* 按钮 */
.btn-reload-single,
.btn-homepage {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: #6b7280;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-reload-single:hover,
.btn-homepage:hover {
  background: #e5e7eb;
  color: #111827;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 64px 24px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-icon {
  font-size: 64px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 18px;
  font-weight: 600;
  color: #6b7280;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 14px;
  color: #9ca3af;
  margin: 0 0 16px 0;
}

.empty-hint code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Courier New', monospace;
}

.btn-reset-filter {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.btn-reset-filter:hover {
  background: #2563eb;
}
</style>
