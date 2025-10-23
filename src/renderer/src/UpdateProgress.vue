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
let updateInfoListener: ((event: unknown, info: UpdateInfo) => void) | null = null
let updateProgressListener: ((event: unknown, progress: ProgressInfo) => void) | null = null
let updateStatusListener: ((event: unknown, statusInfo: StatusInfo) => void) | null = null

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
  /* 🔧 修复内容裁切：改用 flex-start，让内容从顶部开始排列 */
  justify-content: flex-start;
  /* 🔧 优化 padding：上 1.5rem, 左右 2rem, 下 2.5rem（增加底部间距） */
  padding: 1.5rem 2rem 2.5rem 2rem;
  /* 🎨 专业商务风格：柔和的浅灰色渐变，稳重可靠 */
  background: linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  /* 修复滚动条问题：确保 padding 包含在高度内 */
  box-sizing: border-box;
  /* 🔧 改用 auto 允许必要时滚动，但隐藏滚动条 */
  overflow-y: auto;
  overflow-x: hidden;
}

/* 🔧 隐藏滚动条但保持滚动功能 */
.update-progress-container::-webkit-scrollbar {
  display: none;
}

.update-progress-container {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

/* 头部 */
.header {
  /* 🔧 使用 flex 布局确保所有子元素居中 */
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.5rem;
  margin-top: 1rem;
  flex-shrink: 0;
}

.icon-container {
  /* 🔧 修复图标居中：使用 inline-flex 而不是两个冲突的 display */
  display: inline-flex;
  width: 64px;
  height: 64px;
  /* 🎨 现代设计：纯白色背景 + 精致阴影 */
  background: white;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.1),
    0 0 0 4px rgba(255, 255, 255, 0.2);
}

.update-icon {
  width: 36px;
  height: 36px;
  /* 🎨 渐变色图标，呼应背景 */
  color: #667eea;
}

.title {
  font-size: 1.625rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  letter-spacing: 0.5px;
}

/* 版本信息 */
.version-info {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  /* 🎨 现代设计：纯白色背景 + 玻璃质感 */
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  padding: 1rem 1.5rem;
  border-radius: 16px;
  margin-bottom: 1.5rem;
  /* 🎨 精致阴影：层次感 */
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

.version-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.version-label {
  font-size: 0.6875rem;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
}

.version-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
}

.version-value.highlight {
  /* 🎨 品牌色高亮：渐变文字效果 */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
}

.version-arrow {
  font-size: 1.5rem;
  color: #d1d5db;
  font-weight: 300;
}

/* 状态信息 */
.status-container {
  width: 100%;
  max-width: 400px;
  margin-bottom: 1.25rem;
  flex-shrink: 0;
}

.status-message {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.25rem;
  /* 🎨 现代设计：白色背景 + 柔和阴影 */
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.status-text {
  font-size: 0.9375rem;
  color: #374151;
  font-weight: 600;
}

.loading-spinner {
  width: 22px;
  height: 22px;
  border: 3px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.success-icon,
.error-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.success-icon {
  /* 🎨 现代渐变：绿色系 */
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.error-icon {
  /* 🎨 现代渐变：红色系 */
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

/* 进度条 */
.progress-container {
  width: 100%;
  max-width: 400px;
  margin-bottom: 1.25rem;
  flex-shrink: 0;
}

.progress-bar-bg {
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 100px;
  overflow: hidden;
  margin-bottom: 0.875rem;
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.08),
    0 1px 2px rgba(255, 255, 255, 0.5);
}

.progress-bar-fill {
  height: 100%;
  /* 🎨 主题蓝渐变：专业稳重的蓝色系 */
  background: linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%);
  border-radius: 100px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
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
  margin-bottom: 0.625rem;
}

.progress-percent {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-details {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.progress-speed {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

/* 底部 */
.footer {
  text-align: center;
  /* 🔧 使用固定的 margin 而不是 auto，确保布局稳定 */
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.footer-text {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
  font-weight: 500;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.footer-text.error {
  /* 🎨 错误提示：亮红色 */
  color: #fca5a5;
  font-weight: 600;
}

.footer-text.success {
  /* 🎨 成功提示：亮绿色 */
  color: #86efac;
  font-weight: 600;
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
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.1),
      0 0 0 4px rgba(255, 255, 255, 0.2);
  }
  50% {
    transform: scale(1.08);
    box-shadow:
      0 6px 28px rgba(0, 0, 0, 0.15),
      0 0 0 6px rgba(255, 255, 255, 0.3);
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
