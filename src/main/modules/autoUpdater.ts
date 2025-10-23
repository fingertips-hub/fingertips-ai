import { autoUpdater } from 'electron-updater'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { showUpdateWindow, updateProgress, updateStatus, closeUpdateWindow } from './updateWindow'

// =============================================================================
// 自动更新配置 - Auto Update Configuration
// =============================================================================

/**
 * 配置自动更新器
 * Configure auto updater
 */
export function configureAutoUpdater(): void {
  // 开发环境下不检查更新
  if (is.dev) {
    console.log('[AutoUpdater] Development mode - auto update disabled')
    return
  }

  // 配置更新源
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'fingertips-hub',
    repo: 'fingertips-ai'
  })

  // 配置更新选项
  autoUpdater.autoDownload = true // 自动下载更新
  autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装
  autoUpdater.allowDowngrade = false // 不允许降级
  autoUpdater.allowPrerelease = false // 不包含预发布版本

  // 设置日志
  autoUpdater.logger = {
    info: (msg) => console.log('[AutoUpdater]', msg),
    warn: (msg) => console.warn('[AutoUpdater]', msg),
    error: (msg) => console.error('[AutoUpdater]', msg),
    debug: (msg) => console.debug('[AutoUpdater]', msg)
  }

  console.log('[AutoUpdater] Configured successfully')
  console.log('[AutoUpdater] Current version:', app.getVersion())
}

/**
 * 设置自动更新事件监听器
 * Setup auto update event listeners
 */
export function setupAutoUpdateListeners(): void {
  if (is.dev) {
    return
  }

  // 检查更新时触发
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates...')
    updateStatus('checking', '正在检查更新...')
  })

  // 发现可用更新
  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version)
    console.log('[AutoUpdater] Release date:', info.releaseDate)
    console.log('[AutoUpdater] Download size:', (info.files[0]?.size || 0) / 1024 / 1024, 'MB')

    // 显示更新窗口
    showUpdateWindow({
      currentVersion: app.getVersion(),
      latestVersion: info.version,
      releaseDate: info.releaseDate,
      downloadSize: info.files[0]?.size || 0
    })

    updateStatus('downloading', `发现新版本 ${info.version}，正在下载...`)
  })

  // 没有可用更新
  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] No update available. Current version:', info.version)
    updateStatus('latest', '当前已是最新版本')

    // 如果窗口打开了，3秒后自动关闭
    setTimeout(() => {
      closeUpdateWindow()
    }, 3000)
  })

  // 下载进度更新
  autoUpdater.on('download-progress', (progressInfo) => {
    const percent = Math.round(progressInfo.percent)
    const transferred = (progressInfo.transferred / 1024 / 1024).toFixed(2)
    const total = (progressInfo.total / 1024 / 1024).toFixed(2)
    const speed = (progressInfo.bytesPerSecond / 1024 / 1024).toFixed(2)

    console.log(
      `[AutoUpdater] Download progress: ${percent}% (${transferred}MB/${total}MB) @ ${speed}MB/s`
    )

    // 更新进度信息
    updateProgress({
      percent: percent,
      transferred: progressInfo.transferred,
      total: progressInfo.total,
      bytesPerSecond: progressInfo.bytesPerSecond
    })

    updateStatus('downloading', `正在下载更新: ${percent}%`)
  })

  // 下载完成
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version)
    console.log('[AutoUpdater] Release notes:', info.releaseNotes)

    updateStatus('downloaded', '更新下载完成，准备安装...')

    // 3秒后自动退出并安装
    setTimeout(() => {
      console.log('[AutoUpdater] Quitting and installing update...')
      autoUpdater.quitAndInstall(false, true)
    }, 3000)
  })

  // 更新错误
  autoUpdater.on('error', (error) => {
    console.error('[AutoUpdater] Update error:', error)

    let errorMessage = '更新失败，请稍后重试'

    if (error.message.includes('net::')) {
      errorMessage = '网络连接失败，请检查网络后重试'
    } else if (error.message.includes('ENOENT')) {
      errorMessage = '更新文件不存在'
    } else if (error.message.includes('ERR_UPDATER_INVALID_RELEASE_FEED')) {
      errorMessage = '无法获取更新信息，请检查版本配置'
    }

    updateStatus('error', errorMessage)

    // 10秒后关闭错误窗口
    setTimeout(() => {
      closeUpdateWindow()
    }, 10000)
  })

  console.log('[AutoUpdater] Event listeners setup complete')
}

/**
 * 检查更新
 * Check for updates
 */
export async function checkForUpdates(): Promise<void> {
  if (is.dev) {
    console.log('[AutoUpdater] Skipping update check in development mode')
    return
  }

  try {
    console.log('[AutoUpdater] Starting update check...')
    await autoUpdater.checkForUpdates()
  } catch (error) {
    console.error('[AutoUpdater] Failed to check for updates:', error)
  }
}

/**
 * 启动时自动检查更新（延迟2秒）
 * Auto check for updates on startup (delayed by 2 seconds)
 */
export function autoCheckForUpdatesOnStartup(): void {
  if (is.dev) {
    return
  }

  // 延迟2秒后检查更新，避免影响应用启动速度
  setTimeout(() => {
    console.log('[AutoUpdater] Auto-checking for updates on startup...')
    checkForUpdates()
  }, 2000)
}

/**
 * 手动触发更新检查
 * Manually trigger update check
 */
export function manualCheckForUpdates(): void {
  console.log('[AutoUpdater] Manual update check triggered')
  checkForUpdates()
}

/**
 * 初始化自动更新系统
 * Initialize auto update system
 */
export function initializeAutoUpdater(): void {
  configureAutoUpdater()
  setupAutoUpdateListeners()
  autoCheckForUpdatesOnStartup()
}
