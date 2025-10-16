import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'

// Settings window instance
let settingsWindow: BrowserWindow | null = null

// Settings window configuration
const SETTINGS_WINDOW_CONFIG = {
  width: 1000,
  height: 700,
  minWidth: 700,
  minHeight: 500
}

/**
 * Create Settings window
 */
export function createSettingsWindow(): BrowserWindow {
  // If window already exists, focus it and return
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return settingsWindow
  }

  const window = new BrowserWindow({
    width: SETTINGS_WINDOW_CONFIG.width,
    height: SETTINGS_WINDOW_CONFIG.height,
    minWidth: SETTINGS_WINDOW_CONFIG.minWidth,
    minHeight: SETTINGS_WINDOW_CONFIG.minHeight,
    show: false,
    frame: true,
    transparent: false,
    autoHideMenuBar: true,
    resizable: true,
    center: true,
    title: '设置',
    backgroundColor: '#ffffff',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  window.webContents.openDevTools({ mode: 'detach' })

  // Show window when ready
  window.on('ready-to-show', () => {
    window.show()
  })

  // Handle external links
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Clean up reference when window is closed
  window.on('closed', () => {
    settingsWindow = null
  })

  // Open DevTools in development mode
  if (is.dev) {
    window.webContents.openDevTools({ mode: 'detach' })
  }

  // Load the settings page
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/settings.html')
  } else {
    window.loadFile(join(__dirname, '../renderer/settings.html'))
  }

  settingsWindow = window
  return window
}

/**
 * Show Settings window (create if not exists)
 */
export function showSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) {
      settingsWindow.restore()
    }
    settingsWindow.focus()
  } else {
    createSettingsWindow()
  }
}

/**
 * Hide Settings window
 */
export function hideSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.hide()
  }
}

/**
 * Close Settings window
 */
export function closeSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close()
  }
}

/**
 * Get Settings window instance
 */
export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}

/**
 * Check if Settings window is open
 */
export function isSettingsWindowOpen(): boolean {
  return settingsWindow !== null && !settingsWindow.isDestroyed()
}
