import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'
import { calculateWindowPosition } from '../utils/windowPosition'

// Super Panel window instance
let superPanelWindow: BrowserWindow | null = null

// Super Panel state
let isModalOpen = false // 标记 Modal 是否打开
let isPinned = false // 标记面板是否被固定

// Super Panel configuration
const SUPER_PANEL_CONFIG = {
  width: 460,
  height: 690
}

/**
 * Create Super Panel window
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
    // 移除 backgroundColor 以支持透明背景
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  window.webContents.openDevTools({ mode: 'detach' })

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
 */
export function showSuperPanelAtMouse(): void {
  if (!superPanelWindow || superPanelWindow.isDestroyed()) return

  console.log('showSuperPanelAtMouse called')

  // Get current mouse position
  const cursorPoint = screen.getCursorScreenPoint()

  // Calculate window position
  const { x, y } = calculateWindowPosition(
    cursorPoint.x,
    cursorPoint.y,
    SUPER_PANEL_CONFIG.width,
    SUPER_PANEL_CONFIG.height
  )

  // Set position and show
  superPanelWindow.setPosition(x, y)
  superPanelWindow.setAlwaysOnTop(true, 'screen-saver')
  superPanelWindow.show()
  superPanelWindow.moveTop()

  // 通知渲染进程重置 pin 状态
  superPanelWindow.webContents.send('super-panel:reset-pinned')

  console.log('Super Panel shown at position:', { x, y })
}

/**
 * Hide Super Panel
 */
export function hideSuperPanel(): void {
  if (superPanelWindow && !superPanelWindow.isDestroyed() && superPanelWindow.isVisible()) {
    console.log('Hiding Super Panel')
    superPanelWindow.hide()
    // 重置固定状态,下次打开时恢复默认行为
    isPinned = false
    console.log('Pinned state reset to false')
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
