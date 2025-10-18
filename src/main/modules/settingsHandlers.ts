import { app, dialog, ipcMain, BrowserWindow } from 'electron'
import { getSettingsWindow } from './Settings'
import { parseTriggerConfig } from './mouseListener'
import { getHotkey, setHotkey, getSetting, setSetting } from './settingsStore'

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

  // 获取当前快捷键设置
  ipcMain.handle('settings:get-hotkey', async () => {
    return await getHotkey()
  })

  // 获取 AI Base URL
  ipcMain.handle('settings:get-ai-base-url', async () => {
    return await getSetting('aiBaseUrl')
  })

  // 设置 AI Base URL
  ipcMain.handle('settings:set-ai-base-url', async (_event, url: string) => {
    try {
      await setSetting('aiBaseUrl', url)
      return true
    } catch (error) {
      console.error('Failed to set AI Base URL:', error)
      return false
    }
  })

  // 获取 AI API Key
  ipcMain.handle('settings:get-ai-api-key', async () => {
    return await getSetting('aiApiKey')
  })

  // 设置 AI API Key
  ipcMain.handle('settings:set-ai-api-key', async (_event, key: string) => {
    try {
      await setSetting('aiApiKey', key)
      return true
    } catch (error) {
      console.error('Failed to set AI API Key:', error)
      return false
    }
  })

  // 获取 AI 模型列表
  ipcMain.handle('settings:get-ai-models', async () => {
    return await getSetting('aiModels')
  })

  // 设置 AI 模型列表
  ipcMain.handle('settings:set-ai-models', async (_event, models: string[]) => {
    try {
      await setSetting('aiModels', models)
      return true
    } catch (error) {
      console.error('Failed to set AI models:', error)
      return false
    }
  })

  // 获取默认 AI 模型
  ipcMain.handle('settings:get-ai-default-model', async () => {
    return await getSetting('aiDefaultModel')
  })

  // 设置默认 AI 模型
  ipcMain.handle('settings:set-ai-default-model', async (_event, model: string) => {
    try {
      await setSetting('aiDefaultModel', model)
      return true
    } catch (error) {
      console.error('Failed to set default AI model:', error)
      return false
    }
  })

  // 选择文件夹
  ipcMain.handle('settings:select-folder', async (_event, currentPath?: string) => {
    // 获取设置窗口作为父窗口，使对话框居中
    const settingsWindow = getSettingsWindow()
    const parentWindow = settingsWindow || BrowserWindow.getFocusedWindow()

    const options = {
      properties: ['openDirectory', 'createDirectory'] as Array<
        | 'openFile'
        | 'openDirectory'
        | 'multiSelections'
        | 'showHiddenFiles'
        | 'createDirectory'
        | 'promptToCreate'
        | 'noResolveAliases'
        | 'treatPackageAsDirectory'
        | 'dontAddToRecent'
      >,
      title: '选择存储目录',
      defaultPath: currentPath || app.getPath('userData') // 使用当前路径或默认路径
    }

    const result = parentWindow
      ? await dialog.showOpenDialog(parentWindow, options)
      : await dialog.showOpenDialog(options)

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
  ipcMain.handle('settings:set-auto-launch', (_event, enabled: boolean) => {
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
  ipcMain.handle('settings:register-hotkey', async (_event, trigger: string) => {
    try {
      // 如果已经注册了相同的触发器，直接返回成功
      if (currentTrigger === trigger) {
        return true
      }

      // 先清空旧触发器（通过重新解析空字符串）
      if (currentTrigger) {
        parseTriggerConfig('')
        currentTrigger = null
      }

      // 检查是否是鼠标动作
      if (trigger.includes('LongPress:')) {
        // 鼠标动作 - 通过 mouseListener 处理
        parseTriggerConfig(trigger)
        currentTrigger = trigger
        // 保存到持久化存储
        await setHotkey(trigger)
        console.log(`Successfully configured mouse trigger: ${trigger}`)
        return true
      } else {
        // 键盘快捷键 - 通过 mouseListener 的 uiohook 处理（更快响应）
        parseTriggerConfig(trigger)
        currentTrigger = trigger
        // 保存到持久化存储
        await setHotkey(trigger)
        console.log(`Successfully configured keyboard hotkey: ${trigger}`)
        return true
      }
    } catch (error) {
      console.error('Failed to register trigger:', error)
      return false
    }
  })

  // 注销触发器
  ipcMain.handle('settings:unregister-hotkey', (_event, trigger: string) => {
    try {
      if (currentTrigger === trigger) {
        // 清空触发器配置
        parseTriggerConfig('')
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
  // 清空所有触发器配置
  if (currentTrigger) {
    parseTriggerConfig('')
    currentTrigger = null
  }

  // 移除 IPC handlers
  ipcMain.removeHandler('settings:get-default-storage-directory')
  ipcMain.removeHandler('settings:get-hotkey')
  ipcMain.removeHandler('settings:select-folder')
  ipcMain.removeHandler('settings:get-auto-launch')
  ipcMain.removeHandler('settings:set-auto-launch')
  ipcMain.removeHandler('settings:register-hotkey')
  ipcMain.removeHandler('settings:unregister-hotkey')
  ipcMain.removeHandler('settings:get-ai-base-url')
  ipcMain.removeHandler('settings:set-ai-base-url')
  ipcMain.removeHandler('settings:get-ai-api-key')
  ipcMain.removeHandler('settings:set-ai-api-key')
}

/**
 * 初始化默认触发器
 * 从持久化存储中读取用户设置的快捷键
 */
export async function initializeDefaultHotkey(): Promise<void> {
  try {
    // 从存储中读取用户设置的触发器
    const savedHotkey = await getHotkey()
    console.log(`Loading saved trigger: ${savedHotkey}`)

    // 检查是否是鼠标动作
    if (savedHotkey.includes('LongPress:')) {
      // 鼠标动作 - 通过 mouseListener 处理
      parseTriggerConfig(savedHotkey)
      currentTrigger = savedHotkey
      console.log(`Successfully configured mouse trigger: ${savedHotkey}`)
    } else {
      // 键盘快捷键 - 通过 mouseListener 的 uiohook 处理（更快响应）
      parseTriggerConfig(savedHotkey)
      currentTrigger = savedHotkey
      console.log(`Successfully configured keyboard hotkey: ${savedHotkey}`)
    }
  } catch (error) {
    console.error('Failed to initialize trigger:', error)
    // 出错时使用默认触发器
    const defaultTrigger = 'LongPress:Middle'
    parseTriggerConfig(defaultTrigger)
    currentTrigger = defaultTrigger
  }
}

/**
 * 获取当前注册的触发器
 */
export function getCurrentHotkey(): string | null {
  return currentTrigger
}
