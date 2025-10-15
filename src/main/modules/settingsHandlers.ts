import { app, dialog, ipcMain, globalShortcut, BrowserWindow } from 'electron'
import { showSuperPanelAtMouse } from './superPanel'
import { getSettingsWindow } from './Settings'
import { parseTriggerConfig } from './mouseListener'

// 存储当前注册的触发器（快捷键或鼠标动作）
let currentTrigger: string | null = null

/**
 * 设置 IPC handlers
 */
export function setupSettingsHandlers(): void {
  // 获取默认存储目录
  ipcMain.handle('settings:get-default-storage-directory', () => {
    return app.getPath('userData')
  })

  // 选择文件夹
  ipcMain.handle('settings:select-folder', async (event, currentPath?: string) => {
    // 获取设置窗口作为父窗口，使对话框居中
    const settingsWindow = getSettingsWindow()

    const result = await dialog.showOpenDialog(
      settingsWindow || BrowserWindow.getFocusedWindow() || undefined,
      {
        properties: ['openDirectory', 'createDirectory'],
        title: '选择存储目录',
        defaultPath: currentPath || app.getPath('userData') // 使用当前路径或默认路径
      }
    )

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  // 获取开机自启动状态
  ipcMain.handle('settings:get-auto-launch', () => {
    const loginItemSettings = app.getLoginItemSettings()
    return loginItemSettings.openAtLogin
  })

  // 设置开机自启动
  ipcMain.handle('settings:set-auto-launch', (event, enabled: boolean) => {
    try {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: false
      })
      return true
    } catch (error) {
      console.error('Failed to set auto launch:', error)
      return false
    }
  })

  // 注册触发器（键盘快捷键或鼠标动作）
  ipcMain.handle('settings:register-hotkey', (event, trigger: string) => {
    try {
      // 如果已经注册了相同的触发器，直接返回成功
      if (currentTrigger === trigger) {
        return true
      }

      // 先注销旧触发器
      if (currentTrigger) {
        // 如果旧触发器是键盘快捷键，注销它
        if (!currentTrigger.includes('LongPress:')) {
          globalShortcut.unregister(currentTrigger)
        }
        currentTrigger = null
      }

      // 检查是否是鼠标动作
      if (trigger.includes('LongPress:')) {
        // 鼠标动作 - 通过 mouseListener 处理
        parseTriggerConfig(trigger)
        currentTrigger = trigger
        console.log(`Successfully configured mouse trigger: ${trigger}`)
        return true
      } else {
        // 键盘快捷键 - 通过 globalShortcut 处理
        const success = globalShortcut.register(trigger, () => {
          console.log(`Hotkey ${trigger} pressed, showing Super Panel...`)
          showSuperPanelAtMouse()
        })

        if (success) {
          currentTrigger = trigger
          console.log(`Successfully registered keyboard hotkey: ${trigger}`)
          return true
        } else {
          console.error(`Failed to register keyboard hotkey: ${trigger}`)
          return false
        }
      }
    } catch (error) {
      console.error('Failed to register trigger:', error)
      return false
    }
  })

  // 注销触发器
  ipcMain.handle('settings:unregister-hotkey', (event, trigger: string) => {
    try {
      if (currentTrigger === trigger) {
        // 如果是键盘快捷键，注销它
        if (!trigger.includes('LongPress:')) {
          globalShortcut.unregister(trigger)
        } else {
          // 鼠标动作，清空配置
          parseTriggerConfig('')
        }
        currentTrigger = null
        console.log(`Successfully unregistered trigger: ${trigger}`)
      }
      return true
    } catch (error) {
      console.error('Failed to unregister trigger:', error)
      return false
    }
  })
}

/**
 * 清理 Settings IPC handlers
 */
export function cleanupSettingsHandlers(): void {
  // 注销所有触发器
  if (currentTrigger) {
    if (!currentTrigger.includes('LongPress:')) {
      globalShortcut.unregister(currentTrigger)
    } else {
      parseTriggerConfig('')
    }
    currentTrigger = null
  }

  // 移除 IPC handlers
  ipcMain.removeHandler('settings:get-default-storage-directory')
  ipcMain.removeHandler('settings:select-folder')
  ipcMain.removeHandler('settings:get-auto-launch')
  ipcMain.removeHandler('settings:set-auto-launch')
  ipcMain.removeHandler('settings:register-hotkey')
  ipcMain.removeHandler('settings:unregister-hotkey')
}

/**
 * 初始化默认触发器
 */
export function initializeDefaultHotkey(): void {
  // 注册默认触发器：长按中键
  const defaultTrigger = 'LongPress:Middle'
  try {
    parseTriggerConfig(defaultTrigger)
    currentTrigger = defaultTrigger
    console.log(`Successfully configured default trigger: ${defaultTrigger}`)
  } catch (error) {
    console.error('Failed to initialize default trigger:', error)
  }
}

/**
 * 获取当前注册的触发器
 */
export function getCurrentHotkey(): string | null {
  return currentTrigger
}
