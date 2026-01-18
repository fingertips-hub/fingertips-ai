<template>
  <div class="plugin-manager w-full h-full">
    <!-- 头部 -->
    <div class="header">
      <div>
        <h1 class="title">插件管理</h1>
        <p class="subtitle">管理和配置应用插件,扩展功能</p>
      </div>
      <div class="header-actions">
        <button class="btn-primary" @click="showInstallDialog = true">
          <Icon icon="mdi:plus" class="icon" />
          添加插件
        </button>
        <button class="btn-reload" :disabled="isLoading" @click="handleReloadAll">
          <Icon icon="mdi:refresh" class="icon" :class="{ spinning: isLoading }" />
          刷新列表
        </button>
      </div>
    </div>

    <!-- 安装插件对话框 -->
    <transition name="dialog-fade">
      <div v-if="showInstallDialog" class="dialog-overlay" @click="closeInstallDialog">
        <div class="dialog-container" @click.stop>
          <div class="dialog-header">
            <h2 class="dialog-title">安装插件</h2>
            <button class="dialog-close" @click="closeInstallDialog">
              <Icon icon="mdi:close" />
            </button>
          </div>

          <div class="dialog-body">
            <!-- 对话框内的消息提示 -->
            <transition name="slide-down">
              <div
                v-if="dialogMessage"
                :class="['dialog-message', `message-${dialogMessage.type}`]"
              >
                <Icon
                  :icon="
                    dialogMessage.type === 'success'
                      ? 'mdi:check-circle'
                      : dialogMessage.type === 'error'
                        ? 'mdi:alert-circle'
                        : dialogMessage.type === 'warning'
                          ? 'mdi:alert'
                          : 'mdi:information'
                  "
                  class="message-icon"
                />
                <span class="message-text">{{ dialogMessage.text }}</span>
                <button class="message-close" @click="dialogMessage = null">
                  <Icon icon="mdi:close" />
                </button>
              </div>
            </transition>

            <!-- 拖拽区域 -->
            <div
              class="drop-zone-dialog"
              :class="{ 'drag-over': isDragging, installing: isInstalling }"
              @dragenter.prevent="handleDragEnter"
              @dragover.prevent
              @dragleave.prevent="handleDragLeave"
              @drop.prevent="handleDrop"
              @click="selectZipFile"
            >
              <Icon
                :icon="isInstalling ? 'mdi:loading' : 'mdi:package-variant-closed'"
                class="drop-icon"
                :class="{ spinning: isInstalling }"
              />
              <div class="drop-text">
                <span v-if="isInstalling">正在安装插件...</span>
                <span v-else>拖拽 ZIP 文件到此处，或点击选择文件</span>
              </div>
              <div v-if="!isInstalling" class="drop-hint">支持 .zip 格式，最大 100MB</div>
            </div>

            <!-- 安装说明 -->
            <div class="install-tips">
              <div class="tip-item">
                <Icon icon="mdi:information" class="tip-icon" />
                <span>插件必须包含有效的 manifest.json 文件</span>
              </div>
              <div class="tip-item">
                <Icon icon="mdi:check-circle" class="tip-icon tip-icon-success" />
                <span>安装后会自动加载，无需重启应用即可使用</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 消息提示 -->
    <transition name="slide-down">
      <div v-if="message" :class="['message-box', `message-${message.type}`]">
        <Icon
          :icon="
            message.type === 'success'
              ? 'mdi:check-circle'
              : message.type === 'error'
                ? 'mdi:alert-circle'
                : 'mdi:information'
          "
          class="message-icon"
        />
        <span class="message-text">{{ message.text }}</span>
        <button class="message-close" @click="message = null">
          <Icon icon="mdi:close" />
        </button>
      </div>
    </transition>

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
          class="keyword-chip"
          :class="{ active: selectedKeyword === null }"
          @click="selectedKeyword = null"
        >
          <Icon icon="mdi:apps" class="chip-icon" />
          <span>全部 ({{ plugins.length }})</span>
        </button>
        <button
          v-for="keyword in visibleKeywords"
          :key="keyword"
          class="keyword-chip"
          :class="{ active: selectedKeyword === keyword }"
          @click="selectedKeyword = keyword"
        >
          <Icon icon="mdi:tag" class="chip-icon" />
          <span>{{ keyword }} ({{ getKeywordCount(keyword) }})</span>
        </button>
        <button
          v-if="hiddenKeywordsCount > 0"
          class="keyword-chip keyword-chip-expand"
          @click="showAllKeywords = !showAllKeywords"
        >
          <Icon :icon="showAllKeywords ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="chip-icon" />
          <span>{{ showAllKeywords ? '收起' : `更多 (${hiddenKeywordsCount})` }}</span>
        </button>
      </div>
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

          <div class="action-buttons">
            <!-- 重新加载按钮 -->
            <button class="btn-action" @click="handleReload(plugin.id)" title="重新加载插件">
              <Icon icon="mdi:refresh" />
            </button>

            <!-- 更新按钮 -->
            <button
              class="btn-action"
              @click="handleUpdatePlugin(plugin.id, plugin.name)"
              title="更新插件"
            >
              <Icon icon="mdi:upload" />
            </button>

            <!-- 卸载按钮 -->
            <button
              class="btn-action btn-danger"
              @click="handleUninstall(plugin.id, plugin.name)"
              title="卸载插件"
            >
              <Icon icon="mdi:delete" />
            </button>

            <!-- 主页链接 -->
            <a
              v-if="plugin.homepage"
              :href="plugin.homepage"
              target="_blank"
              class="btn-action"
              title="访问插件主页"
            >
              <Icon icon="mdi:open-in-new" />
            </a>
          </div>
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
        将插件文件夹放入 <code>{{ pluginsDirectory || 'plugins/' }}</code> 目录中,然后刷新列表
      </p>
      <button
        v-if="!searchQuery && !selectedKeyword"
        class="btn-reset-filter"
        @click="openPluginsDirectory"
      >
        打开插件目录
      </button>
      <p v-else class="empty-hint">尝试调整搜索条件或选择其他分类</p>
      <button v-if="searchQuery || selectedKeyword" @click="resetFilters" class="btn-reset-filter">
        清除筛选条件
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { usePluginStore } from '../../stores/plugin'
import { storeToRefs } from 'pinia'

const pluginStore = usePluginStore()
const { plugins, isLoading, error } = storeToRefs(pluginStore)

// 搜索和筛选状态
const searchQuery = ref('')
const selectedKeyword = ref<string | null>(null)
const showAllKeywords = ref(false)
const MAX_VISIBLE_KEYWORDS = 8 // 默认显示的标签数量

// 拖拽和安装状态
const isDragging = ref(false)
const isInstalling = ref(false)
const dragCounter = ref(0)
const showInstallDialog = ref(false)

// 插件目录
const pluginsDirectory = ref<string>('')

// 消息提示
interface Message {
  type: 'success' | 'error' | 'info' | 'warning'
  text: string
}
const message = ref<Message | null>(null)
const dialogMessage = ref<Message | null>(null)

// 键盘事件处理
const handleKeyDown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && showInstallDialog.value) {
    closeInstallDialog()
  }
}

// 初始化加载
onMounted(() => {
  pluginStore.loadPlugins()
  loadPluginsDirectory()
  // 添加键盘事件监听（ESC 关闭对话框）
  window.addEventListener('keydown', handleKeyDown)
})

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

/**
 * 获取所有唯一的关键词（按插件数量排序）
 */
const allKeywords = computed(() => {
  const keywordSet = new Set<string>()
  plugins.value.forEach((plugin) => {
    plugin.keywords?.forEach((keyword) => keywordSet.add(keyword))
  })
  // 按插件数量降序排列，热门标签优先
  return Array.from(keywordSet).sort((a, b) => {
    const countA = getKeywordCount(a)
    const countB = getKeywordCount(b)
    if (countA !== countB) {
      return countB - countA // 数量多的在前
    }
    return a.localeCompare(b) // 数量相同则按字母排序
  })
})

/**
 * 可见的关键词列表（支持折叠）
 */
const visibleKeywords = computed(() => {
  if (showAllKeywords.value || allKeywords.value.length <= MAX_VISIBLE_KEYWORDS) {
    return allKeywords.value
  }
  return allKeywords.value.slice(0, MAX_VISIBLE_KEYWORDS)
})

/**
 * 剩余隐藏的关键词数量
 */
const hiddenKeywordsCount = computed(() => {
  return Math.max(0, allKeywords.value.length - MAX_VISIBLE_KEYWORDS)
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

async function loadPluginsDirectory(): Promise<void> {
  try {
    const result = await window.api.plugin.getDirectory()
    if (result.success && result.data?.directory) {
      pluginsDirectory.value = result.data.directory
    }
  } catch {
    // ignore
  }
}

async function openPluginsDirectory(): Promise<void> {
  try {
    const result = await window.api.plugin.openDirectory()
    if (!result.success) {
      showMessage('error', `打开插件目录失败: ${result.error || '未知错误'}`)
    }
  } catch (error) {
    showMessage('error', `打开插件目录失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
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
 * 重新加载所有插件（重新扫描并加载新插件）
 */
async function handleReloadAll(): Promise<void> {
  try {
    isLoading.value = true
    showMessage('info', '正在重新扫描插件...', 0)

    // 调用重新扫描 API
    const rescanResult = await window.api.plugin.rescan()

    if (rescanResult.success && rescanResult.data) {
      const { newPlugins, removedPlugins, totalPlugins } = rescanResult.data

      // 静默加载插件列表（已有 loading 状态管理）
      await pluginStore.loadPlugins(true)

      // 重新加载后重置筛选条件
      resetFilters()

      // 根据扫描结果显示不同的消息
      if (newPlugins.length > 0 || removedPlugins.length > 0) {
        const messages: string[] = []
        if (newPlugins.length > 0) {
          messages.push(`新增 ${newPlugins.length} 个插件`)
        }
        if (removedPlugins.length > 0) {
          messages.push(`移除 ${removedPlugins.length} 个插件`)
        }
        showMessage('success', `${messages.join('，')}，当前共 ${totalPlugins} 个插件`)
      } else {
        showMessage('success', `插件列表刷新成功，共 ${totalPlugins} 个插件`)
      }
    } else {
      showMessage('error', `刷新失败: ${rescanResult.error || '未知错误'}`)
    }
  } catch (error) {
    console.error('Failed to reload plugins:', error)
    showMessage('error', `刷新失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    isLoading.value = false
  }
}

/**
 * 显示消息（主界面）
 */
function showMessage(type: Message['type'], text: string, duration = 5000): void {
  message.value = { type, text }

  if (duration > 0) {
    setTimeout(() => {
      if (message.value?.text === text) {
        message.value = null
      }
    }, duration)
  }
}

/**
 * 显示对话框内的消息
 */
function showDialogMessage(type: Message['type'], text: string, duration = 5000): void {
  dialogMessage.value = { type, text }

  if (duration > 0) {
    setTimeout(() => {
      if (dialogMessage.value?.text === text) {
        dialogMessage.value = null
      }
    }, duration)
  }
}

/**
 * 处理拖拽进入
 */
function handleDragEnter(): void {
  dragCounter.value++
  if (dragCounter.value === 1) {
    isDragging.value = true
  }
}

/**
 * 处理拖拽离开
 */
function handleDragLeave(): void {
  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragging.value = false
  }
}

/**
 * 处理文件拖放
 */
async function handleDrop(e: DragEvent): Promise<void> {
  isDragging.value = false
  dragCounter.value = 0

  if (isInstalling.value) return

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  const file = files[0]
  if (!file.name.endsWith('.zip')) {
    showDialogMessage('error', '请选择 ZIP 格式的插件文件')
    return
  }

  // 使用 Electron 官方 API 获取文件路径
  const filePath = window.api.launcher.getFilePath(file)
  if (!filePath) {
    showDialogMessage('error', '无法获取文件路径，请重试')
    return
  }

  await installPlugin(filePath)
}

/**
 * 选择 ZIP 文件
 */
function selectZipFile(): void {
  if (isInstalling.value) return

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.zip'
  input.onchange = async (e) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      // 使用 Electron 官方 API 获取文件路径
      const filePath = window.api.launcher.getFilePath(file)
      if (!filePath) {
        showDialogMessage('error', '无法获取文件路径，请重试')
        return
      }
      await installPlugin(filePath)
    }
  }
  input.click()
}

/**
 * 安装插件
 */
async function installPlugin(filePath: string): Promise<void> {
  try {
    isInstalling.value = true
    // 在对话框内显示进度提示
    showDialogMessage('info', '正在安装插件，请稍候...', 0)

    const result = await window.api.plugin.installFromZip(filePath)

    if (result.success && result.manifest) {
      // 静默加载插件列表（避免滚动位置丢失）
      await pluginStore.loadPlugins(true)
      // 关闭对话框
      showInstallDialog.value = false
      // 清除对话框消息
      dialogMessage.value = null
      // 在主界面显示成功消息
      showMessage('success', `插件 "${result.manifest.name}" 安装成功！已自动加载，可立即使用。`)
    } else {
      // 在对话框内显示错误
      showDialogMessage('error', `安装失败: ${result.error || '未知错误'}`)
    }
  } catch (error) {
    console.error('Failed to install plugin:', error)
    // 在对话框内显示错误
    showDialogMessage('error', `安装失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    isInstalling.value = false
  }
}

/**
 * 关闭安装对话框
 */
function closeInstallDialog(): void {
  if (!isInstalling.value) {
    showInstallDialog.value = false
    isDragging.value = false
    dragCounter.value = 0
    // 清除对话框消息
    dialogMessage.value = null
  }
}

/**
 * 卸载插件
 */
async function handleUninstall(pluginId: string, pluginName: string): Promise<void> {
  // 确认对话框
  const confirmed = confirm(`确定要卸载插件 "${pluginName}" 吗？\n\n卸载后将立即生效。`)

  if (!confirmed) return

  try {
    showMessage('info', '正在卸载插件...', 0)

    const result = await window.api.plugin.uninstall(pluginId)

    if (result.success) {
      showMessage('success', `插件 "${pluginName}" 卸载成功！已自动移除。`)
      // 静默加载插件列表（避免滚动位置丢失）
      await pluginStore.loadPlugins(true)
    } else {
      showMessage('error', `卸载失败: ${result.error}`)
    }
  } catch (error) {
    console.error('Failed to uninstall plugin:', error)
    showMessage('error', `卸载失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 更新插件
 */
async function handleUpdatePlugin(pluginId: string, pluginName: string): Promise<void> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.zip'
  input.onchange = async (e) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    // 使用 Electron 官方 API 获取文件路径
    const filePath = window.api.launcher.getFilePath(file)
    if (!filePath) {
      showMessage('error', '无法获取文件路径，请重试')
      return
    }

    try {
      showMessage('info', '正在更新插件，请稍候...', 0)

      const result = await window.api.plugin.update(pluginId, filePath)

      if (result.success) {
        showMessage('success', `插件 "${pluginName}" 更新成功！已自动加载新版本。`)
        // 静默加载插件列表（避免滚动位置丢失）
        await pluginStore.loadPlugins(true)
      } else {
        showMessage('error', `更新失败: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to update plugin:', error)
      showMessage('error', `更新失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }
  input.click()
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
  gap: 5px;
  padding: 4px 10px;
  background: #f3f4f6;
  color: #6b7280;
  border: 2px solid transparent;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
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

.keyword-chip-expand {
  background: #e0e7ff;
  color: #4f46e5;
  font-weight: 600;
}

.keyword-chip-expand:hover {
  background: #c7d2fe;
  color: #4338ca;
}

.chip-icon {
  font-size: 14px;
  flex-shrink: 0;
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

/* 头部操作按钮组 */
.header-actions {
  display: flex;
  gap: 12px;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgb(59 130 246 / 0.3);
}

.btn-primary:active {
  transform: translateY(0);
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
  backdrop-filter: blur(4px);
}

.dialog-container {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 560px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow:
    0 20px 25px -5px rgb(0 0 0 / 0.1),
    0 8px 10px -6px rgb(0 0 0 / 0.1);
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.dialog-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 20px;
}

.dialog-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
}

/* 对话框内的消息提示 */
.dialog-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  animation: slideDown 0.3s ease-out;
}

/* 对话框内的拖拽区域 */
.drop-zone-dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 20px;
}

.drop-zone-dialog:hover:not(.installing) {
  border-color: #3b82f6;
  background: #eff6ff;
}

.drop-zone-dialog.drag-over {
  border-color: #3b82f6;
  background: #dbeafe;
  transform: scale(1.02);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.drop-zone-dialog.installing {
  cursor: not-allowed;
  opacity: 0.7;
}

.drop-icon {
  font-size: 56px;
  color: #3b82f6;
  margin-bottom: 16px;
}

.drop-text {
  font-size: 16px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 8px;
  text-align: center;
}

.drop-hint {
  font-size: 13px;
  color: #6b7280;
  text-align: center;
}

/* 安装提示 */
.install-tips {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

.tip-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
  color: #3b82f6;
}

.tip-icon-success {
  color: #10b981;
}

/* 对话框动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-fade-enter-active .dialog-container,
.dialog-fade-leave-active .dialog-container {
  transition: all 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .dialog-container,
.dialog-fade-leave-to .dialog-container {
  transform: scale(0.95) translateY(-20px);
  opacity: 0;
}

/* 消息提示 */
.message-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

.message-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.message-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.message-info {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.message-warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.message-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.message-text {
  flex: 1;
}

.message-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 18px;
  color: currentColor;
  opacity: 0.7;
}

.message-close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

/* 消息动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-action {
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

.btn-action:hover {
  background: #e5e7eb;
  color: #111827;
}

.btn-action.btn-danger {
  color: #dc2626;
}

.btn-action.btn-danger:hover {
  background: #fee2e2;
  color: #991b1b;
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
