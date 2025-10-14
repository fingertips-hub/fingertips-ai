import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// Import modules
import { createTray } from './modules/tray'
import { createSuperPanelWindow, showSuperPanelAtMouse } from './modules/superPanel'
import { setupGlobalMouseListener, stopGlobalMouseListener } from './modules/mouseListener'
import { setupSuperPanelHandlers, cleanupSuperPanelHandlers } from './modules/superPanelHandlers'

// =============================================================================
// 单实例锁定 - Single Instance Lock
// =============================================================================
// 确保应用程序只运行一个实例，避免多实例导致的缓存冲突
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // 如果获取锁失败，说明已经有实例在运行，退出当前实例
  console.log('Another instance is already running. Exiting...')
  app.quit()
} else {
  // 当第二个实例尝试启动时，聚焦到第一个实例
  app.on('second-instance', () => {
    console.log('Second instance detected, showing Super Panel...')
    // 显示 Super Panel 而不是主窗口
    showSuperPanelAtMouse()
  })
}

// =============================================================================
// 开发环境配置 - Development Environment Setup
// =============================================================================
if (is.dev) {
  // 在开发环境中使用独立的用户数据目录，避免与生产版本冲突
  const userDataPath = join(app.getPath('appData'), 'fingertips-ai-dev')
  app.setPath('userData', userDataPath)
  console.log('Development mode: Using userData path:', userDataPath)
}

// =============================================================================
// 命令行开关 - Command Line Switches
// =============================================================================
// 禁用 GPU 缓存相关的错误（如果缓存创建失败，使用内存缓存）
app.commandLine.appendSwitch('disk-cache-size', '1')
// 在开发环境中禁用硬件加速可以减少某些 GPU 相关的错误
if (is.dev) {
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
}

/**
 * Create main window (optional, currently not used)
 */
function createWindow(): void {
  // Get the primary display's workarea (screen size excluding taskbar)
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  // Window dimensions
  const windowWidth = 400
  const windowHeight = 880

  // Calculate position for top-right corner
  const x = screenWidth - windowWidth - 60
  const y = 60

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    show: false,
    frame: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    resizable: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Create system tray
  createTray()

  // Create Super Panel window (hidden by default)
  createSuperPanelWindow()

  // Setup global mouse listener
  setupGlobalMouseListener()

  // Setup Super Panel IPC handlers
  setupSuperPanelHandlers()

  // Optional: createWindow() for main window if needed
  // createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // IPC handler for showing Super Panel (optional, for future use)
  ipcMain.on('show-super-panel', () => {
    showSuperPanelAtMouse()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Cleanup before quit
app.on('before-quit', () => {
  // Stop the global mouse hook
  stopGlobalMouseListener()

  // Cleanup Super Panel IPC handlers
  cleanupSuperPanelHandlers()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
