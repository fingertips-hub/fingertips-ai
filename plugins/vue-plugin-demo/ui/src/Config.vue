<template>
  <div class="container">
    <div class="header">
      <h1>
        <span>{{ pluginName }}</span>
      </h1>
      <p>使用 Vue 3 开发的插件配置界面</p>
      <div class="vue-badge">
        <span>⚡</span>
        <span>Powered by Vue {{ vueVersion }}</span>
      </div>
    </div>

    <div class="content">
      <!-- 状态提示 -->
      <transition name="fade">
        <div v-if="statusMessage" :class="['alert', statusType]">
          <span>{{ statusIcon }}</span>
          <span>{{ statusMessage }}</span>
        </div>
      </transition>

      <!-- 标签页 -->
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 基础设置 -->
      <div v-show="activeTab === 'basic'">
        <div class="form-group">
          <label>主题</label>
          <select v-model="config.theme">
            <option value="light">浅色</option>
            <option value="dark">深色</option>
            <option value="auto">自动</option>
          </select>
          <div class="hint">选择界面主题</div>
        </div>

        <div class="form-group">
          <label>语言</label>
          <select v-model="config.language">
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
            <option value="ja-JP">日本語</option>
          </select>
          <div class="hint">选择界面语言</div>
        </div>

        <div class="form-group">
          <div class="checkbox-group" @click="config.notifications = !config.notifications">
            <input type="checkbox" v-model="config.notifications" @click.stop />
            <label>启用通知</label>
          </div>
        </div>

        <div class="form-group">
          <div class="checkbox-group" @click="config.autoSave = !config.autoSave">
            <input type="checkbox" v-model="config.autoSave" @click.stop />
            <label>自动保存</label>
          </div>
        </div>
      </div>

      <!-- 高级设置 -->
      <div v-show="activeTab === 'advanced'">
        <div class="form-group">
          <label>每页显示项数</label>
          <input type="number" v-model.number="config.itemsPerPage" min="5" max="100" />
          <div class="hint">设置列表每页显示的项目数量（5-100）</div>
        </div>

        <div class="card">
          <h3>📊 响应式数据演示</h3>
          <p style="color: #666; font-size: 14px; margin-bottom: 12px">
            计数器: <strong style="color: #667eea">{{ counter }}</strong>
          </p>
          <div class="button-group">
            <button class="btn-success" @click="counter++">增加</button>
            <button class="btn-secondary" @click="counter--">减少</button>
            <button class="btn-secondary" @click="counter = 0">重置</button>
          </div>
        </div>

        <div class="card">
          <h3>🧪 API 测试</h3>
          <p style="color: #666; font-size: 14px; margin-bottom: 12px">测试插件与主进程的通信</p>
          <div class="button-group">
            <button class="btn-info" @click="testNotification" :disabled="loading">
              <span v-if="loading" class="loading"></span>
              <span v-else>测试通知</span>
            </button>
            <button class="btn-info" @click="testClipboard" :disabled="loading">复制文本</button>
            <button class="btn-info" @click="openDashboard" :disabled="loading">打开仪表盘</button>
          </div>
        </div>
      </div>

      <!-- 关于 -->
      <div v-show="activeTab === 'about'">
        <div class="card">
          <h3>💡 关于此示例</h3>
          <p style="color: #666; font-size: 14px; line-height: 1.6">
            这是一个使用 Vue 3 单文件组件开发插件界面的完整示例。它展示了如何在插件窗口中使用 Vue
            的响应式数据、组件和生命周期钩子，并通过 Vite 构建。
          </p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ vueVersion }}</div>
            <div class="stat-label">Vue 版本</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ Object.keys(config).length }}</div>
            <div class="stat-label">配置项</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ tabs.length }}</div>
            <div class="stat-label">标签页</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ counter }}</div>
            <div class="stat-label">计数器</div>
          </div>
        </div>

        <div class="card" style="margin-top: 16px">
          <h3>🚀 技术栈</h3>
          <ul style="color: #666; font-size: 14px; line-height: 1.8; padding-left: 20px">
            <li>Vue 3 - 渐进式 JavaScript 框架</li>
            <li>单文件组件 - .vue 组件开发</li>
            <li>组合式 API - 灵活的组件逻辑</li>
            <li>响应式数据 - ref 和 reactive</li>
            <li>Vite - 快速的构建工具</li>
            <li>IPC 通信 - 与主进程交互</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">
        <div>Vue Plugin Demo v1.0.0</div>
        <div style="opacity: 0.6; margin-top: 4px">配置已{{ configChanged ? '修改' : '保存' }}</div>
      </div>
      <div class="footer-right">
        <button class="btn-secondary" @click="resetConfig" :disabled="loading">重置</button>
        <button class="btn-primary" @click="saveConfig" :disabled="loading || !configChanged">
          <span v-if="loading" class="loading"></span>
          <span v-else>保存配置</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { version } from 'vue'

// 状态管理
const pluginId = ref('')
const pluginName = ref('Vue 插件')
const config = reactive({
  theme: 'light',
  language: 'zh-CN',
  notifications: true,
  autoSave: true,
  itemsPerPage: 10
})
const originalConfig = ref(null)
const activeTab = ref('basic')
const counter = ref(0)
const loading = ref(false)
const statusMessage = ref('')
const statusType = ref('info')

// 标签页定义
const tabs = [
  { id: 'basic', label: '基础设置' },
  { id: 'advanced', label: '高级设置' },
  { id: 'about', label: '关于' }
]

// 计算属性
const vueVersion = computed(() => version)

const configChanged = computed(() => {
  if (!originalConfig.value) return false
  return JSON.stringify(config) !== JSON.stringify(originalConfig.value)
})

const statusIcon = computed(() => {
  switch (statusType.value) {
    case 'success':
      return '✓'
    case 'error':
      return '✗'
    default:
      return 'ℹ'
  }
})

// 监听配置变化
watch(
  config,
  (newConfig) => {
    console.log('配置已更新:', newConfig)
  },
  { deep: true }
)

// 生命周期
onMounted(async () => {
  console.log('Vue 应用已挂载')
  await loadInitialData()
})

// 方法
async function loadInitialData() {
  try {
    // 从传入的数据加载
    if (window.pluginData) {
      pluginId.value = window.pluginData.pluginId
      pluginName.value = window.pluginData.pluginName || 'Vue 插件'

      if (window.pluginData.config) {
        Object.assign(config, window.pluginData.config)
        originalConfig.value = JSON.parse(JSON.stringify(config))
      }
    } else {
      // 如果没有预加载数据，通过 IPC 获取
      pluginId.value = window.pluginId || 'vue-plugin-demo'
      const result = await window.api.plugin.invoke(`${pluginId.value}:getConfig`)
      if (result.success) {
        Object.assign(config, result.data)
        originalConfig.value = JSON.parse(JSON.stringify(config))
      }
    }

    showStatus('info', '配置已加载')
  } catch (error) {
    console.error('加载初始数据失败:', error)
    showStatus('error', '加载配置失败: ' + error.message)
  }
}

async function saveConfig() {
  if (!configChanged.value) return

  loading.value = true
  try {
    const result = await window.api.plugin.invoke(
      `${pluginId.value}:saveConfig`,
      JSON.parse(JSON.stringify(config))
    )

    if (result.success) {
      originalConfig.value = JSON.parse(JSON.stringify(config))
      showStatus('success', '配置已成功保存！')
    } else {
      showStatus('error', '保存失败: ' + result.error)
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    showStatus('error', '保存失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

function resetConfig() {
  if (originalConfig.value) {
    Object.assign(config, originalConfig.value)
    showStatus('info', '已恢复到之前保存的配置')
  }
}

async function testNotification() {
  loading.value = true
  try {
    const result = await window.api.plugin.invoke(`${pluginId.value}:testNotification`, {
      title: 'Vue 插件测试',
      body: `当前计数器值: ${counter.value}`
    })

    if (result.success) {
      showStatus('success', '测试通知已发送')
    } else {
      showStatus('error', '发送通知失败: ' + result.error)
    }
  } catch (error) {
    console.error('测试通知失败:', error)
    showStatus('error', '测试失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

async function testClipboard() {
  loading.value = true
  try {
    const text = `Vue 插件配置 - 主题: ${config.theme}, 语言: ${config.language}, 计数器: ${counter.value}`
    const result = await window.api.plugin.invoke(`${pluginId.value}:copyToClipboard`, text)

    if (result.success) {
      showStatus('success', '内容已复制到剪贴板')
    } else {
      showStatus('error', '复制失败: ' + result.error)
    }
  } catch (error) {
    console.error('复制失败:', error)
    showStatus('error', '复制失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

async function openDashboard() {
  loading.value = true
  try {
    const result = await window.api.plugin.invoke(`${pluginId.value}:openDashboard`)

    if (result.success) {
      showStatus('success', '仪表盘已打开')
    } else {
      showStatus('error', '打开失败: ' + result.error)
    }
  } catch (error) {
    console.error('打开仪表盘失败:', error)
    showStatus('error', '打开失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

function showStatus(type, message) {
  statusType.value = type
  statusMessage.value = message

  setTimeout(() => {
    statusMessage.value = ''
  }, 3000)
}
</script>

<style scoped>
.container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.header {
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
}

.header h1 {
  font-size: 28px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.header p {
  opacity: 0.9;
  font-size: 14px;
}

.vue-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 8px;
}

.content {
  padding: 32px;
}

.alert {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.alert.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.alert.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.alert.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e0e0e0;
}

.tab {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  bottom: -2px;
}

.tab:hover {
  color: #667eea;
}

.tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-group input[type='text'],
.form-group input[type='number'],
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group .hint {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.checkbox-group:hover {
  background: #f0f0f0;
}

.checkbox-group input[type='checkbox'] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.checkbox-group label {
  margin: 0 !important;
  cursor: pointer;
  user-select: none;
  font-weight: normal !important;
}

.card {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.card h3 {
  color: #333;
  margin-bottom: 12px;
  font-size: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.stat-card {
  background: white;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.footer {
  padding: 20px 32px;
  background: #f9f9f9;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.footer-left {
  font-size: 12px;
  color: #666;
}

.footer-right {
  display: flex;
  gap: 12px;
}

button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #e0e0e0;
  color: #666;
}

.btn-secondary:hover {
  background: #d0d0d0;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover {
  background: #138496;
}

.button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.loading {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
