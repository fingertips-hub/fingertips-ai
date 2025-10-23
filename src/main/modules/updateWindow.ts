import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'

// =============================================================================
// 更新窗口管理 - Update Window Management
// =============================================================================

// Update window instance
let updateWindow: BrowserWindow | null = null

// Update window configuration
const UPDATE_WINDOW_CONFIG = {
  width: 500,
  height: 550,
  resizable: false,
  minimizable: false,
  maximizable: false,
  alwaysOnTop: true,
  center: true,
  frame: false
}

/**
 * 更新信息接口
 * Update info interface
 */
export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  releaseDate?: string
  downloadSize?: number
}

/**
 * 进度信息接口
 * Progress info interface
 */
export interface ProgressInfo {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

/**
 * 创建更新窗口
 * Create update window
 */
export function createUpdateWindow(): BrowserWindow {
  // 如果窗口已存在，先关闭
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.close()
  }

  const window = new BrowserWindow({
    width: UPDATE_WINDOW_CONFIG.width,
    height: UPDATE_WINDOW_CONFIG.height,
    resizable: UPDATE_WINDOW_CONFIG.resizable,
    minimizable: UPDATE_WINDOW_CONFIG.minimizable,
    maximizable: UPDATE_WINDOW_CONFIG.maximizable,
    alwaysOnTop: UPDATE_WINDOW_CONFIG.alwaysOnTop,
    center: UPDATE_WINDOW_CONFIG.center,
    show: false,
    frame: false,
    transparent: false,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // 窗口准备好后显示
  window.on('ready-to-show', () => {
    window.show()
  })

  // 清理引用
  window.on('closed', () => {
    updateWindow = null
  })

  // 加载更新进度页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/update-progress.html')
  } else {
    window.loadFile(join(__dirname, '../renderer/update-progress.html'))
  }

  updateWindow = window
  return window
}

/**
 * 显示更新窗口
 * Show update window
 */
export function showUpdateWindow(updateInfo: UpdateInfo): void {
  if (!updateWindow || updateWindow.isDestroyed()) {
    createUpdateWindow()
  }

  // 等待窗口准备好后发送更新信息
  if (updateWindow) {
    updateWindow.webContents.once('did-finish-load', () => {
      updateWindow?.webContents.send('update-info', updateInfo)
    })
  }
}

/**
 * 隐藏更新窗口
 * Hide update window
 */
export function hideUpdateWindow(): void {
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.hide()
  }
}

/**
 * 关闭更新窗口
 * Close update window
 */
export function closeUpdateWindow(): void {
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.close()
  }
  updateWindow = null
}

/**
 * 更新下载进度
 * Update download progress
 */
export function updateProgress(progressInfo: ProgressInfo): void {
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.webContents.send('update-progress', progressInfo)
  }
}

/**
 * 更新状态信息
 * Update status message
 */
export function updateStatus(status: string, message: string): void {
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.webContents.send('update-status', { status, message })
  }
}

/**
 * 获取更新窗口实例
 * Get update window instance
 */
export function getUpdateWindow(): BrowserWindow | null {
  return updateWindow
}

/**
 * 检查更新窗口是否打开
 * Check if update window is open
 */
export function isUpdateWindowOpen(): boolean {
  return updateWindow !== null && !updateWindow.isDestroyed()
}
