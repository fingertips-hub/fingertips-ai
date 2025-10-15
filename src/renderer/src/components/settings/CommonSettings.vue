<template>
  <div class="settings-page">
    <div class="settings-header">
      <h1 class="text-2xl font-bold text-gray-800">公共设置</h1>
      <p class="text-sm text-gray-500 mt-2">配置应用的基本设置和偏好</p>
    </div>

    <div class="settings-content">
      <!-- 通用设置组 -->
      <div class="settings-group">
        <h2 class="settings-group-title">通用设置</h2>

        <!-- 文件存储目录 -->
        <div class="settings-item">
          <div class="settings-item-info">
            <label class="settings-label">文件存储目录</label>
            <p class="settings-description">存储 Super Panel 配置、项目设置及插件的目录</p>
          </div>
          <div class="settings-item-control">
            <FilePathSelector
              v-model="settingsStore.settings.storageDirectory"
              @browse="handleSelectStorageDirectory"
            />
          </div>
        </div>

        <!-- 开机自启动 -->
        <div class="settings-item">
          <div class="settings-item-info">
            <label class="settings-label">开机自启动</label>
            <p class="settings-description">系统启动时自动运行 Fingertips AI</p>
          </div>
          <div class="settings-item-control">
            <Switch
              v-model="autoLaunchValue"
              :disabled="autoLaunchLoading"
              @update:model-value="handleAutoLaunchChange"
            />
          </div>
        </div>

        <!-- 召唤 Super Panel 快捷键 -->
        <div class="settings-item">
          <div class="settings-item-info">
            <label class="settings-label">召唤 Super Panel</label>
            <p class="settings-description">设置用于呼出 Super Panel 的全局快捷键</p>
          </div>
          <div class="settings-item-control">
            <HotkeyInput
              v-model="hotkeyValue"
              placeholder="点击输入快捷键..."
              :disabled="hotkeyLoading"
              @update:model-value="handleHotkeyChange"
            />
          </div>
        </div>
      </div>

      <!-- AI 设置组 -->
      <div class="settings-group">
        <h2 class="settings-group-title">AI 设置</h2>

        <!-- Base URL -->
        <div class="settings-item">
          <div class="settings-item-info">
            <label class="settings-label">Base URL</label>
            <p class="settings-description">AI 服务的基础 URL 地址</p>
          </div>
          <div class="settings-item-control">
            <input
              v-model="baseUrlValue"
              type="text"
              class="input-field"
              placeholder="例如: https://api.openai.com/v1"
              @blur="handleBaseUrlChange"
              @keyup.enter="handleBaseUrlChange"
            />
          </div>
        </div>

        <!-- API Key -->
        <div class="settings-item">
          <div class="settings-item-info">
            <label class="settings-label">API Key</label>
            <p class="settings-description">用于身份验证的 API 密钥</p>
          </div>
          <div class="settings-item-control">
            <div class="password-input-wrapper">
              <input
                v-model="apiKeyValue"
                :type="showApiKey ? 'text' : 'password'"
                class="input-field password-input"
                placeholder="请输入 API Key"
                @blur="handleApiKeyChange"
                @keyup.enter="handleApiKeyChange"
              />
              <button type="button" class="password-toggle" @click="showApiKey = !showApiKey">
                <svg
                  v-if="showApiKey"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast 提示 -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import Switch from '../common/Switch.vue'
import HotkeyInput from '../common/HotkeyInput.vue'
import FilePathSelector from '../common/FilePathSelector.vue'

const settingsStore = useSettingsStore()

// 本地状态 - 通用设置
const autoLaunchValue = ref(false)
const autoLaunchLoading = ref(false)
const hotkeyValue = ref('')
const hotkeyLoading = ref(false)

// 本地状态 - AI 设置
const baseUrlValue = ref('')
const apiKeyValue = ref('')
const showApiKey = ref(false)

// Toast 提示
const toast = ref({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error'
})

/**
 * 显示 Toast 提示
 */
function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

/**
 * 处理选择存储目录
 */
async function handleSelectStorageDirectory(): Promise<void> {
  const success = await settingsStore.selectStorageDirectory()
  if (success) {
    showToast('存储目录已更新')
  }
}

/**
 * 处理开机自启动变更
 */
async function handleAutoLaunchChange(value: boolean): Promise<void> {
  autoLaunchLoading.value = true
  try {
    const success = await settingsStore.updateAutoLaunch(value)
    if (success) {
      autoLaunchValue.value = value
      showToast(value ? '已开启开机自启动' : '已关闭开机自启动')
    } else {
      // 恢复原值
      autoLaunchValue.value = !value
      showToast('设置失败，请重试', 'error')
    }
  } catch (error) {
    console.error('Failed to update auto launch:', error)
    autoLaunchValue.value = !value
    showToast('设置失败，请重试', 'error')
  } finally {
    autoLaunchLoading.value = false
  }
}

/**
 * 处理快捷键变更
 */
async function handleHotkeyChange(value: string): Promise<void> {
  if (!value) return

  hotkeyLoading.value = true
  try {
    const success = await settingsStore.updateHotkey(value)
    if (success) {
      hotkeyValue.value = value
      showToast(`快捷键已更新为 ${value}`)
    } else {
      // 恢复原值
      hotkeyValue.value = settingsStore.settings.hotkey
      showToast('快捷键注册失败，可能与其他应用冲突', 'error')
    }
  } catch (error) {
    console.error('Failed to update hotkey:', error)
    hotkeyValue.value = settingsStore.settings.hotkey
    showToast('快捷键设置失败，请重试', 'error')
  } finally {
    hotkeyLoading.value = false
  }
}

/**
 * 处理 Base URL 变更
 */
function handleBaseUrlChange(): void {
  const trimmedValue = baseUrlValue.value.trim()
  if (trimmedValue !== settingsStore.settings.aiBaseUrl) {
    settingsStore.updateAIBaseUrl(trimmedValue)
    showToast('Base URL 已保存')
  }
}

/**
 * 处理 API Key 变更
 */
function handleApiKeyChange(): void {
  const trimmedValue = apiKeyValue.value.trim()
  if (trimmedValue !== settingsStore.settings.aiApiKey) {
    settingsStore.updateAIApiKey(trimmedValue)
    showToast('API Key 已保存')
  }
}

/**
 * 初始化
 */
onMounted(async () => {
  await settingsStore.initialize()
  // 初始化通用设置
  autoLaunchValue.value = settingsStore.settings.autoLaunch
  hotkeyValue.value = settingsStore.settings.hotkey
  // 初始化 AI 设置
  baseUrlValue.value = settingsStore.settings.aiBaseUrl
  apiKeyValue.value = settingsStore.settings.aiApiKey
})
</script>

<style scoped>
.settings-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.settings-header {
  padding: 24px 32px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.settings-content {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  background: #f9fafb;
}

/* 设置组 */
.settings-group {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
}

.settings-group-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

/* 设置项 */
.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  gap: 24px;
}

/* Switch 按钮右对齐 */
.settings-item-control:has(.inline-flex) {
  display: flex;
  justify-content: flex-end;
}

.settings-item:not(:last-child) {
  border-bottom: 1px solid #f3f4f6;
}

.settings-item-info {
  flex: 1;
  min-width: 0;
}

.settings-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.settings-description {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

.settings-item-control {
  flex-shrink: 0;
  min-width: 200px;
}

/* AI 设置控件宽度 */
.settings-group:last-of-type .settings-item-control {
  min-width: 400px;
}

/* 输入框 */
.input-field {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  color: #374151;
  transition: all 0.2s ease;
  outline: none;
}

.input-field:hover {
  border-color: #9ca3af;
}

.input-field:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-field::placeholder {
  color: #9ca3af;
}

/* 密码输入框 */
.password-input-wrapper {
  position: relative;
}

.password-input {
  padding-right: 40px;
}

.password-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  transition: color 0.2s ease;
  outline: none;
}

.password-toggle:hover {
  color: #374151;
}

/* Toast 提示 */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  animation: slideIn 0.3s ease;
  z-index: 1000;
}

.toast.success {
  background: #10b981;
  color: white;
}

.toast.error {
  background: #ef4444;
  color: white;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .settings-item-control {
    width: 100%;
    min-width: 0;
  }
}
</style>
