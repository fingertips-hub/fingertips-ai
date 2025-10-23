<template>
  <div class="update-progress-container">
    <!-- 头部 -->
    <div class="header">
      <div class="icon-container">
        <svg class="update-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
            fill="currentColor"
          />
          <path d="M12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="currentColor" />
        </svg>
      </div>
      <h1 class="title">软件更新</h1>
    </div>

    <!-- 版本信息 -->
    <div v-if="updateInfo" class="version-info">
      <div class="version-item">
        <span class="version-label">当前版本:</span>
        <span class="version-value">{{ updateInfo.currentVersion }}</span>
      </div>
      <div class="version-arrow">→</div>
      <div class="version-item">
        <span class="version-label">最新版本:</span>
        <span class="version-value highlight">{{ updateInfo.latestVersion }}</span>
      </div>
    </div>

    <!-- 状态信息 -->
    <div class="status-container">
      <div :class="['status-message', statusClass]">
        <div v-if="status === 'checking'" class="loading-spinner"></div>
        <div v-else-if="status === 'downloading'" class="loading-spinner"></div>
        <div v-else-if="status === 'downloaded'" class="success-icon">✓</div>
        <div v-else-if="status === 'error'" class="error-icon">✗</div>
        <div v-else-if="status === 'latest'" class="success-icon">✓</div>
        <span class="status-text">{{ statusMessage }}</span>
      </div>
    </div>

    <!-- 进度条 -->
    <div v-if="status === 'downloading' && progressInfo" class="progress-container">
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: progressInfo.percent + '%' }">
          <div class="progress-bar-shine"></div>
        </div>
      </div>
      <div class="progress-info">
        <span class="progress-percent">{{ progressInfo.percent }}%</span>
        <span class="progress-details">
          {{ formatBytes(progressInfo.transferred) }} / {{ formatBytes(progressInfo.total) }}
        </span>
      </div>
      <div class="progress-speed">
        <span>下载速度: {{ formatSpeed(progressInfo.bytesPerSecond) }}</span>
        <span v-if="estimatedTime">剩余时间: {{ estimatedTime }}</span>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="footer">
      <p v-if="status === 'downloading'" class="footer-text">正在后台下载更新，请勿关闭应用...</p>
      <p v-else-if="status === 'downloaded'" class="footer-text">
        应用将在 3 秒后自动重启并安装更新
      </p>
      <p v-else-if="status === 'error'" class="footer-text error">
        更新失败，您可以稍后手动检查更新
      </p>
      <p v-else-if="status === 'latest'" class="footer-text success">您使用的是最新版本</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 接口定义
interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  releaseDate?: string
  downloadSize?: number
}

interface ProgressInfo {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

interface StatusInfo {
  status: string
  message: string
}

// 响应式数据
const updateInfo = ref<UpdateInfo | null>(null)
const progressInfo = ref<ProgressInfo | null>(null)
const status = ref<string>('checking')
const statusMessage = ref<string>('正在检查更新...')

// 计算属性
const statusClass = computed(() => {
  switch (status.value) {
    case 'checking':
      return 'status-checking'
    case 'downloading':
      return 'status-downloading'
    case 'downloaded':
      return 'status-success'
    case 'error':
      return 'status-error'
    case 'latest':
      return 'status-success'
    default:
      return ''
  }
})

const estimatedTime = computed(() => {
  if (!progressInfo.value || progressInfo.value.bytesPerSecond === 0) {
    return null
  }

  const remaining = progressInfo.value.total - progressInfo.value.transferred
  const seconds = Math.ceil(remaining / progressInfo.value.bytesPerSecond)

  if (seconds < 60) {
    return `${seconds} 秒`
  } else if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)} 分钟`
  } else {
    return `${Math.ceil(seconds / 3600)} 小时`
  }
})

// 工具函数
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function formatSpeed(bytesPerSecond: number): string {
  return formatBytes(bytesPerSecond) + '/s'
}

// IPC 监听器
let updateInfoListener: ((event: any, info: UpdateInfo) => void) | null = null
let updateProgressListener: ((event: any, progress: ProgressInfo) => void) | null = null
let updateStatusListener: ((event: any, statusInfo: StatusInfo) => void) | null = null

// 生命周期钩子
onMounted(() => {
  console.log('[UpdateProgress] Component mounted')

  // 监听更新信息
  updateInfoListener = (_, info: UpdateInfo) => {
    console.log('[UpdateProgress] Received update info:', info)
    updateInfo.value = info
  }
  window.electron.ipcRenderer.on('update-info', updateInfoListener)

  // 监听下载进度
  updateProgressListener = (_, progress: ProgressInfo) => {
    console.log('[UpdateProgress] Received progress:', progress)
    progressInfo.value = progress
  }
  window.electron.ipcRenderer.on('update-progress', updateProgressListener)

  // 监听状态变化
  updateStatusListener = (_, statusInfo: StatusInfo) => {
    console.log('[UpdateProgress] Received status:', statusInfo)
    status.value = statusInfo.status
    statusMessage.value = statusInfo.message
  }
  window.electron.ipcRenderer.on('update-status', updateStatusListener)
})

onUnmounted(() => {
  // 清理监听器
  if (updateInfoListener) {
    window.electron.ipcRenderer.removeListener('update-info', updateInfoListener)
  }
  if (updateProgressListener) {
    window.electron.ipcRenderer.removeListener('update-progress', updateProgressListener)
  }
  if (updateStatusListener) {
    window.electron.ipcRenderer.removeListener('update-status', updateStatusListener)
  }
})
</script>

<style scoped>
.update-progress-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 头部 */
.header {
  text-align: center;
  margin-bottom: 2rem;
}

.icon-container {
  display: inline-block;
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  animation: pulse 2s ease-in-out infinite;
}

.update-icon {
  width: 36px;
  height: 36px;
  color: white;
}

.title {
  font-size: 1.75rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

/* 版本信息 */
.version-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.version-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.version-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.version-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
}

.version-value.highlight {
  color: #ffd700;
}

.version-arrow {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.6);
}

/* 状态信息 */
.status-container {
  width: 100%;
  max-width: 400px;
  margin-bottom: 1.5rem;
}

.status-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-text {
  font-size: 0.9375rem;
  color: white;
  font-weight: 500;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.success-icon,
.error-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: bold;
}

.success-icon {
  background: #10b981;
  color: white;
}

.error-icon {
  background: #ef4444;
  color: white;
}

/* 进度条 */
.progress-container {
  width: 100%;
  max-width: 400px;
  margin-bottom: 1.5rem;
}

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.progress-bar-shine {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shine 2s ease-in-out infinite;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.progress-percent {
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
}

.progress-details {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
}

.progress-speed {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);
}

/* 底部 */
.footer {
  text-align: center;
  margin-top: 1rem;
}

.footer-text {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.footer-text.error {
  color: #fca5a5;
}

.footer-text.success {
  color: #86efac;
}

/* 动画 */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

@keyframes shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
