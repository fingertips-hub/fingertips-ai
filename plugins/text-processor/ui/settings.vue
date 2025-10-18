<template>
  <div class="text-processor-settings bg-red-500">
    <!-- 头部 -->
    <div class="header">
      <div class="plugin-info">
        <div class="plugin-icon">📝</div>
        <div>
          <h2 class="plugin-title">{{ manifest.name }}</h2>
          <p class="plugin-version">v{{ manifest.version }}</p>
        </div>
      </div>
      <p class="plugin-description">{{ manifest.description }}</p>
    </div>

    <!-- 配置表单 -->
    <div class="settings-form">
      <!-- 语言设置 -->
      <div class="form-section">
        <h3 class="section-title">基础设置</h3>

        <div class="form-group">
          <label class="label">
            <span class="label-text">界面语言</span>
            <span class="label-hint">设置插件界面显示语言</span>
          </label>
          <select v-model="config.language" class="input-select">
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
        </div>

        <div class="form-group">
          <label class="label">
            <span class="label-text">默认操作</span>
            <span class="label-hint">快速执行时使用的默认操作</span>
          </label>
          <select v-model="config.defaultOperation" class="input-select">
            <option value="prompt">每次询问</option>
            <option value="uppercase">转大写</option>
            <option value="lowercase">转小写</option>
            <option value="capitalize">首字母大写</option>
            <option value="removeSpaces">去除空格</option>
            <option value="trim">去除首尾空格</option>
            <option value="urlEncode">URL编码</option>
            <option value="urlDecode">URL解码</option>
            <option value="base64Encode">Base64编码</option>
            <option value="base64Decode">Base64解码</option>
            <option value="reverse">反转文本</option>
            <option value="count">统计字符数</option>
          </select>
        </div>
      </div>

      <!-- 行为设置 -->
      <div class="form-section">
        <h3 class="section-title">行为设置</h3>

        <div class="form-group">
          <label class="checkbox-label">
            <input v-model="config.autoNotify" type="checkbox" class="checkbox" />
            <div>
              <span class="label-text">自动通知</span>
              <span class="label-hint">处理完成后显示系统通知</span>
            </div>
          </label>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input v-model="config.copyResult" type="checkbox" class="checkbox" />
            <div>
              <span class="label-text">自动复制结果</span>
              <span class="label-hint">处理完成后自动复制结果到剪贴板</span>
            </div>
          </label>
        </div>
      </div>

      <!-- 历史记录设置 -->
      <div class="form-section">
        <h3 class="section-title">历史记录</h3>

        <div class="form-group">
          <label class="checkbox-label">
            <input v-model="config.history.enabled" type="checkbox" class="checkbox" />
            <div>
              <span class="label-text">启用历史记录</span>
              <span class="label-hint">保存文本处理历史</span>
            </div>
          </label>
        </div>

        <div v-if="config.history.enabled" class="form-group">
          <label class="label">
            <span class="label-text">最大记录数</span>
            <span class="label-hint">最多保存的历史记录条数</span>
          </label>
          <input
            v-model.number="config.history.maxItems"
            type="number"
            min="1"
            max="100"
            class="input-text"
          />
        </div>

        <div v-if="config.history.enabled && historyCount > 0" class="history-info">
          <div class="info-card">
            <Icon icon="mdi:history" class="info-icon" />
            <div>
              <div class="info-text">当前历史记录: {{ historyCount }} 条</div>
              <button @click="clearHistory" class="btn-link">清除历史记录</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <button @click="saveConfig" class="btn-primary" :disabled="isSaving">
          <Icon v-if="!isSaving" icon="mdi:content-save" class="btn-icon" />
          <Icon v-else icon="mdi:loading" class="btn-icon spinning" />
          {{ isSaving ? '保存中...' : '保存配置' }}
        </button>

        <button @click="resetConfig" class="btn-secondary">
          <Icon icon="mdi:refresh" class="btn-icon" />
          重置为默认
        </button>

        <button @click="testPlugin" class="btn-secondary">
          <Icon icon="mdi:play" class="btn-icon" />
          测试插件
        </button>
      </div>

      <!-- 状态提示 -->
      <div v-if="statusMessage" class="status-message" :class="statusType">
        <Icon :icon="statusType === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'" />
        {{ statusMessage }}
      </div>
    </div>

    <!-- 使用说明 -->
    <div class="help-section">
      <h3 class="section-title">使用说明</h3>
      <div class="help-content">
        <ol class="help-list">
          <li>复制要处理的文本到剪贴板</li>
          <li>在插件管理器中点击"文本处理工具"执行按钮</li>
          <li>选择要执行的文本处理操作</li>
          <li>查看处理结果（可自动复制到剪贴板）</li>
        </ol>

        <div class="help-tip">
          <Icon icon="mdi:lightbulb" class="tip-icon" />
          <span>提示: 设置默认操作后，可以跳过操作选择步骤，直接执行默认操作，提升效率。</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'

// 插件清单（由父组件注入）
const manifest = {
  id: 'text-processor',
  name: '文本处理工具',
  version: '1.0.0',
  description: '一个功能强大的文本处理插件'
}

// 状态
const config = ref({
  language: 'zh-CN',
  autoNotify: true,
  copyResult: true,
  defaultOperation: 'uppercase',
  history: {
    enabled: true,
    maxItems: 10
  }
})

const isSaving = ref(false)
const statusMessage = ref('')
const statusType = ref('success')
const historyCount = ref(0)

// 加载配置
onMounted(async () => {
  try {
    const result = await window.api.plugin.getConfig(manifest.id)
    if (result.success && result.data) {
      config.value = { ...config.value, ...result.data }
    }

    // 加载历史记录数量
    const historyResult = await window.api.plugin.invoke(`${manifest.id}:getHistory`)
    if (historyResult.success && historyResult.data) {
      historyCount.value = historyResult.data.length
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
})

// 保存配置
async function saveConfig() {
  isSaving.value = true
  statusMessage.value = ''

  try {
    const result = await window.api.plugin.setConfig(manifest.id, config.value)

    if (result.success) {
      showStatus('配置已保存', 'success')
    } else {
      showStatus('保存失败: ' + (result.error || '未知错误'), 'error')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    showStatus('保存失败: ' + error.message, 'error')
  } finally {
    isSaving.value = false
  }
}

// 重置配置
async function resetConfig() {
  if (confirm('确定要重置为默认配置吗？')) {
    config.value = {
      language: 'zh-CN',
      autoNotify: true,
      copyResult: true,
      defaultOperation: 'uppercase',
      history: {
        enabled: true,
        maxItems: 10
      }
    }
    await saveConfig()
  }
}

// 测试插件
async function testPlugin() {
  try {
    statusMessage.value = '正在测试插件...'
    statusType.value = 'info'

    const result = await window.api.plugin.execute(manifest.id, {
      text: 'Hello World',
      operation: 'uppercase'
    })

    if (result.success) {
      showStatus('测试成功! 结果: ' + result.data.result, 'success')
    } else {
      showStatus('测试失败: ' + (result.error || '未知错误'), 'error')
    }
  } catch (error) {
    console.error('测试失败:', error)
    showStatus('测试失败: ' + error.message, 'error')
  }
}

// 清除历史记录
async function clearHistory() {
  if (confirm('确定要清除所有历史记录吗？')) {
    try {
      const result = await window.api.plugin.invoke(`${manifest.id}:clearHistory`)
      if (result.success) {
        historyCount.value = 0
        showStatus('历史记录已清除', 'success')
      }
    } catch (error) {
      console.error('清除历史记录失败:', error)
      showStatus('清除失败: ' + error.message, 'error')
    }
  }
}

// 显示状态消息
function showStatus(message, type = 'success') {
  statusMessage.value = message
  statusType.value = type

  setTimeout(() => {
    statusMessage.value = ''
  }, 3000)
}
</script>

<style scoped>
.text-processor-settings {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  background: #f9fafb;
  min-height: 100vh;
}

/* 头部 */
.header {
  background: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.plugin-info {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.plugin-icon {
  font-size: 48px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 12px;
}

.plugin-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.plugin-version {
  font-size: 14px;
  color: #6b7280;
  margin: 4px 0 0 0;
}

.plugin-description {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
}

/* 设置表单 */
.settings-form {
  background: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: 32px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.label {
  display: block;
  margin-bottom: 8px;
}

.label-text {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}

.label-hint {
  display: block;
  font-size: 12px;
  color: #6b7280;
}

.input-select,
.input-text {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  background: white;
  transition: all 0.2s;
  outline: none;
}

.input-select:focus,
.input-text:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  padding: 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.checkbox-label:hover {
  background: #f9fafb;
}

.checkbox {
  width: 20px;
  height: 20px;
  margin-top: 2px;
  cursor: pointer;
  flex-shrink: 0;
}

.history-info {
  margin-top: 16px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f3f4f6;
  border-radius: 8px;
}

.info-icon {
  font-size: 24px;
  color: #6b7280;
  flex-shrink: 0;
}

.info-text {
  font-size: 14px;
  color: #374151;
  margin-bottom: 4px;
}

.btn-link {
  font-size: 13px;
  color: #3b82f6;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
}

.btn-link:hover {
  color: #2563eb;
}

/* 操作按钮 */
.form-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-icon {
  font-size: 18px;
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

/* 状态消息 */
.status-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-top: 16px;
}

.status-message.success {
  background: #d1fae5;
  color: #065f46;
}

.status-message.error {
  background: #fee2e2;
  color: #991b1b;
}

.status-message.info {
  background: #dbeafe;
  color: #1e40af;
}

/* 帮助部分 */
.help-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.help-content {
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
}

.help-list {
  margin: 0 0 16px 0;
  padding-left: 24px;
}

.help-list li {
  margin-bottom: 8px;
}

.help-tip {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #fef3c7;
  border-radius: 8px;
  font-size: 13px;
  color: #92400e;
}

.tip-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
