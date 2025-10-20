import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'
import { calculateWindowPosition } from '../utils/windowPosition'
import { getCapturedTextOnPress, clearCapturedText } from './mouseListener'

// Super Panel window instance
let superPanelWindow: BrowserWindow | null = null

// Super Panel state
let isModalOpen = false // 标记 Modal 是否打开
let isPinned = false // 标记面板是否被固定
let isWindowReady = false // 标记窗口是否已经准备好显示

// Super Panel configuration
const SUPER_PANEL_CONFIG = {
  width: 460,
  height: 690
}

/**
 * Create Super Panel window
 * 🚀 优化版本：添加性能优化配置
 */
export function createSuperPanelWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: SUPER_PANEL_CONFIG.width,
    height: SUPER_PANEL_CONFIG.height,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    resizable: false,
    skipTaskbar: true, // Don't show in taskbar
    focusable: true, // Ensure window can receive focus
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    // 🚀 性能优化：初始设置不透明度为0，避免首次显示闪烁
    opacity: 0,
    // 移除 backgroundColor 以支持透明背景
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      // 🚀 性能优化：禁用拼写检查器以提升性能
      spellcheck: false
    }
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 🔧 只在开发环境且需要时打开 DevTools（注释掉以提升性能）
  // if (is.dev) {
  //   window.webContents.openDevTools({ mode: 'detach' })
  // }

  // 🚀 性能优化：监听 ready-to-show 事件，确保窗口内容准备好
  window.once('ready-to-show', () => {
    console.log('[SuperPanel] Window is ready to show')
    isWindowReady = true
  })

  // Event listeners for debugging
  window.on('show', () => {
    console.log('Super Panel show event triggered')
  })

  window.on('hide', () => {
    console.log('Super Panel hide event triggered')
  })

  window.on('focus', () => {
    console.log('Super Panel focus event triggered')
  })

  window.on('blur', () => {
    console.log('Super Panel blur event triggered')
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/super-panel.html')
  } else {
    window.loadFile(join(__dirname, '../renderer/super-panel.html'))
  }

  superPanelWindow = window
  return window
}

/**
 * Show Super Panel at mouse position
 * 🚀 优化版本：减少延迟，提升响应速度
 */
export function showSuperPanelAtMouse(): void {
  if (!superPanelWindow || superPanelWindow.isDestroyed()) return

  console.log('[SuperPanel] showSuperPanelAtMouse called')

  // Get current mouse position
  const cursorPoint = screen.getCursorScreenPoint()

  // Calculate window position
  const { x, y } = calculateWindowPosition(
    cursorPoint.x,
    cursorPoint.y,
    SUPER_PANEL_CONFIG.width,
    SUPER_PANEL_CONFIG.height
  )

  // 🚀 性能优化：先设置位置，再显示，避免窗口在错误位置闪现
  superPanelWindow.setPosition(x, y)
  superPanelWindow.setAlwaysOnTop(true, 'screen-saver')

  // 🚀 性能优化：如果窗口已预渲染，立即显示并淡入
  if (isWindowReady) {
    superPanelWindow.setOpacity(1)
    superPanelWindow.show()
  } else {
    // 首次显示，先显示窗口再淡入
    superPanelWindow.show()
    // 快速淡入效果
    setTimeout(() => {
      if (superPanelWindow && !superPanelWindow.isDestroyed()) {
        superPanelWindow.setOpacity(1)
      }
    }, 10)
  }

  superPanelWindow.moveTop()

  // 通知渲染进程重置 pin 状态
  superPanelWindow.webContents.send('super-panel:reset-pinned')

  console.log('[SuperPanel] Super Panel shown at position:', { x, y })
}

/**
 * 🚀 预渲染窗口：延迟预渲染，在应用启动后调用
 * 这样不会影响应用启动速度，但能减少首次显示延迟
 */
export function preRenderSuperPanelWindow(): void {
  if (!superPanelWindow || superPanelWindow.isDestroyed()) return

  console.log('[SuperPanel] Starting delayed pre-rendering...')

  // 等待窗口准备好
  if (!isWindowReady) {
    superPanelWindow.once('ready-to-show', () => {
      console.log('[SuperPanel] Window ready, will pre-render in 2 seconds...')
      isWindowReady = true

      // 🚀 延迟2秒后预渲染，避免影响应用启动
      setTimeout(() => {
        if (superPanelWindow && !superPanelWindow.isDestroyed()) {
          console.log('[SuperPanel] Executing pre-rendering...')
          // 在屏幕外位置显示窗口（使用安全的正数坐标）
          const primaryDisplay = screen.getPrimaryDisplay()
          const { width, height } = primaryDisplay.bounds
          superPanelWindow.setPosition(width + 100, height + 100)
          superPanelWindow.setOpacity(0) // 完全透明
          superPanelWindow.showInactive() // 不抢焦点

          // 100ms后隐藏，确保渲染完成
          setTimeout(() => {
            if (superPanelWindow && !superPanelWindow.isDestroyed()) {
              superPanelWindow.hide()
              superPanelWindow.setOpacity(1) // 恢复不透明度
              console.log('[SuperPanel] Pre-rendering completed successfully')
            }
          }, 100)
        }
      }, 2000) // 2秒延迟，让应用先完全启动
    })
  } else {
    // 如果已经准备好，直接预渲染
    console.log('[SuperPanel] Window already ready, pre-rendering now...')
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.bounds
    superPanelWindow.setPosition(width + 100, height + 100)
    superPanelWindow.setOpacity(0)
    superPanelWindow.showInactive()

    setTimeout(() => {
      if (superPanelWindow && !superPanelWindow.isDestroyed()) {
        superPanelWindow.hide()
        superPanelWindow.setOpacity(1)
        console.log('[SuperPanel] Pre-rendering completed successfully')
      }
    }, 100)
  }
}

/**
 * 获取捕获的选中文本（从鼠标监听器）
 */
export function getCachedSelectedText(): string {
  return getCapturedTextOnPress()
}

/**
 * Hide Super Panel
 */
export function hideSuperPanel(): void {
  if (superPanelWindow && !superPanelWindow.isDestroyed() && superPanelWindow.isVisible()) {
    console.log('Hiding Super Panel')
    // 🚀 性能优化：隐藏时重置透明度为0，为下次显示做准备
    superPanelWindow.setOpacity(0)
    superPanelWindow.hide()
    // 重置固定状态,下次打开时恢复默认行为
    isPinned = false
    console.log('Pinned state reset to false')
    // 清空捕获的文本缓存，准备下次使用
    clearCapturedText()
    console.log('Captured text cache cleared')
  }
}

/**
 * Check if mouse click is outside Super Panel window
 */
export function isClickOutsideSuperPanel(x: number, y: number): boolean {
  if (!superPanelWindow || superPanelWindow.isDestroyed() || !superPanelWindow.isVisible()) {
    return false
  }

  const bounds = superPanelWindow.getBounds()
  return x < bounds.x || x > bounds.x + bounds.width || y < bounds.y || y > bounds.y + bounds.height
}

/**
 * Get Super Panel window instance
 */
export function getSuperPanelWindow(): BrowserWindow | null {
  return superPanelWindow
}

/**
 * Check if Super Panel is visible
 */
export function isSuperPanelVisible(): boolean {
  return (
    superPanelWindow !== null && !superPanelWindow.isDestroyed() && superPanelWindow.isVisible()
  )
}

/**
 * Set modal open state
 */
export function setModalOpen(open: boolean): void {
  isModalOpen = open
  console.log('Modal open state changed:', isModalOpen)
}

/**
 * Check if modal is open
 */
export function isModalOpenState(): boolean {
  return isModalOpen
}

/**
 * Set pinned state
 */
export function setPinned(pinned: boolean): void {
  isPinned = pinned
  console.log('Pinned state changed:', isPinned)
}

/**
 * Check if panel is pinned
 */
export function isPinnedState(): boolean {
  return isPinned
}
