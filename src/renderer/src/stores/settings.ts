import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'fingertips-settings'

/**
 * 应用设置接口（localStorage 缓存的设置）
 */
export interface AppSettings {
  // 通用设置
  storageDirectory: string // 文件存储目录
  autoLaunch: boolean // 开机自启动
  hotkey: string // 召唤 Super Panel 的快捷键
  dynamicIslandEnabled: boolean // 启用灵动岛

  // AI 设置（只用于 UI 展示，不存储到 localStorage）
  aiBaseUrl: string // AI Base URL
  aiApiKey: string // AI API Key
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: AppSettings = {
  // 通用设置
  storageDirectory: '', // 将在初始化时从主进程获取默认路径
  autoLaunch: false,
  hotkey: 'LongPress:Middle', // 默认快捷键：长按中键
  dynamicIslandEnabled: false, // 默认不启用灵动岛

  // AI 设置（只是占位符）
  aiBaseUrl: '',
  aiApiKey: ''
}

/**
 * 设置 Store
 * 管理应用的所有配置项
 */
export const useSettingsStore = defineStore('settings', () => {
  // State
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const isLoading = ref(false)

  /**
   * 初始化 Store
   * - 通用设置从 localStorage 加载
   * - AI 设置从主进程（electron-store）加载
   */
  async function initialize(): Promise<void> {
    isLoading.value = true
    try {
      // 1. 从 localStorage 加载通用设置
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored) as Partial<AppSettings>
        // 只加载通用设置，排除 AI 设置
        if (data.storageDirectory !== undefined)
          settings.value.storageDirectory = data.storageDirectory
        if (data.autoLaunch !== undefined) settings.value.autoLaunch = data.autoLaunch
        if (data.hotkey !== undefined) settings.value.hotkey = data.hotkey
        if (data.dynamicIslandEnabled !== undefined)
          settings.value.dynamicIslandEnabled = data.dynamicIslandEnabled
      } else {
        // 首次运行，获取默认存储目录
        if (window.api?.settings?.getDefaultStorageDirectory) {
          const defaultDir = await window.api.settings.getDefaultStorageDirectory()
          settings.value.storageDirectory = defaultDir
        }
        // 获取开机自启动状态
        if (window.api?.settings?.getAutoLaunch) {
          const autoLaunch = await window.api.settings.getAutoLaunch()
          settings.value.autoLaunch = autoLaunch
        }
        saveToStorage()
      }

      // 2. 从主进程同步快捷键设置（主进程是权威数据源）
      if (window.api?.settings?.getHotkey) {
        const savedHotkey = await window.api.settings.getHotkey()
        if (savedHotkey && savedHotkey !== settings.value.hotkey) {
          settings.value.hotkey = savedHotkey
          saveToStorage()
          console.log('Synced hotkey from main process:', savedHotkey)
        }
      }

      // 3. 从主进程加载 AI 设置（不使用 localStorage）
      if (window.api?.settings?.getAIBaseUrl) {
        const savedBaseUrl = await window.api.settings.getAIBaseUrl()
        settings.value.aiBaseUrl = savedBaseUrl || ''
        console.log('Loaded AI Base URL from main process:', savedBaseUrl || '(empty)')
      }

      if (window.api?.settings?.getAIApiKey) {
        const savedApiKey = await window.api.settings.getAIApiKey()
        settings.value.aiApiKey = savedApiKey || ''
        console.log('Loaded AI API Key from main process:', savedApiKey ? '***' : '(empty)')
      }
    } catch (error) {
      console.error('Failed to initialize settings:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 保存通用设置到 localStorage
   * 注意：AI 设置不保存到 localStorage，只存储在主进程的 electron-store
   */
  function saveToStorage(): void {
    try {
      const dataToSave = {
        storageDirectory: settings.value.storageDirectory,
        autoLaunch: settings.value.autoLaunch,
        hotkey: settings.value.hotkey,
        dynamicIslandEnabled: settings.value.dynamicIslandEnabled
        // 不包含 aiBaseUrl 和 aiApiKey
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error)
    }
  }

  /**
   * 更新文件存储目录
   */
  async function updateStorageDirectory(directory: string): Promise<void> {
    settings.value.storageDirectory = directory
    saveToStorage()
  }

  /**
   * 选择文件存储目录
   */
  async function selectStorageDirectory(): Promise<boolean> {
    try {
      if (!window.api?.settings?.selectFolder) {
        console.error('selectFolder API not available')
        return false
      }
      // 传递当前路径作为默认路径
      const result = await window.api.settings.selectFolder(settings.value.storageDirectory)
      if (result) {
        settings.value.storageDirectory = result
        saveToStorage()
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to select storage directory:', error)
      return false
    }
  }

  /**
   * 更新开机自启动状态
   */
  async function updateAutoLaunch(enabled: boolean): Promise<boolean> {
    try {
      if (!window.api?.settings?.setAutoLaunch) {
        console.error('setAutoLaunch API not available')
        return false
      }
      const success = await window.api.settings.setAutoLaunch(enabled)
      if (success) {
        settings.value.autoLaunch = enabled
        saveToStorage()
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to update auto launch:', error)
      return false
    }
  }

  /**
   * 更新快捷键
   */
  async function updateHotkey(hotkey: string): Promise<boolean> {
    try {
      if (!window.api?.settings?.registerHotkey) {
        console.error('registerHotkey API not available')
        return false
      }

      // 先注销旧快捷键
      if (settings.value.hotkey && window.api.settings.unregisterHotkey) {
        await window.api.settings.unregisterHotkey(settings.value.hotkey)
      }

      // 注册新快捷键
      const success = await window.api.settings.registerHotkey(hotkey)
      if (success) {
        settings.value.hotkey = hotkey
        saveToStorage()
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to update hotkey:', error)
      return false
    }
  }

  /**
   * 更新 AI Base URL
   * 直接保存到主进程的 electron-store，不使用 localStorage
   */
  async function updateAIBaseUrl(url: string): Promise<boolean> {
    try {
      if (!window.api?.settings?.setAIBaseUrl) {
        console.error('setAIBaseUrl API not available')
        return false
      }

      const success = await window.api.settings.setAIBaseUrl(url)
      if (success) {
        // 更新本地展示值（仅用于 UI 展示）
        settings.value.aiBaseUrl = url
        console.log('AI Base URL updated successfully in electron-store')
        return true
      } else {
        console.error('Failed to update AI Base URL in main process')
        return false
      }
    } catch (error) {
      console.error('Failed to update AI Base URL:', error)
      return false
    }
  }

  /**
   * 更新 AI API Key
   * 直接保存到主进程的 electron-store，不使用 localStorage
   */
  async function updateAIApiKey(key: string): Promise<boolean> {
    try {
      if (!window.api?.settings?.setAIApiKey) {
        console.error('setAIApiKey API not available')
        return false
      }

      const success = await window.api.settings.setAIApiKey(key)
      if (success) {
        // 更新本地展示值（仅用于 UI 展示）
        settings.value.aiApiKey = key
        console.log('AI API Key updated successfully in electron-store')
        return true
      } else {
        console.error('Failed to update AI API Key in main process')
        return false
      }
    } catch (error) {
      console.error('Failed to update AI API Key:', error)
      return false
    }
  }

  /**
   * 更新灵动岛启用状态
   */
  async function updateDynamicIslandEnabled(enabled: boolean): Promise<boolean> {
    try {
      if (!window.api?.settings?.setDynamicIslandEnabled) {
        console.error('setDynamicIslandEnabled API not available')
        return false
      }

      const success = await window.api.settings.setDynamicIslandEnabled(enabled)
      if (success) {
        settings.value.dynamicIslandEnabled = enabled
        saveToStorage()

        // 根据状态显示或隐藏灵动岛
        if (enabled) {
          window.api?.dynamicIsland?.show()
        } else {
          window.api?.dynamicIsland?.hide()
        }

        return true
      }
      return false
    } catch (error) {
      console.error('Failed to update dynamic island enabled:', error)
      return false
    }
  }

  /**
   * 重置所有设置为默认值
   */
  async function resetToDefaults(): Promise<void> {
    settings.value = { ...DEFAULT_SETTINGS }
    // 获取默认存储目录
    if (window.api?.settings?.getDefaultStorageDirectory) {
      const defaultDir = await window.api.settings.getDefaultStorageDirectory()
      settings.value.storageDirectory = defaultDir
    }
    saveToStorage()
  }

  return {
    // State
    settings,
    isLoading,

    // Actions
    initialize,
    updateStorageDirectory,
    selectStorageDirectory,
    updateAutoLaunch,
    updateHotkey,
    updateAIBaseUrl,
    updateAIApiKey,
    updateDynamicIslandEnabled,
    resetToDefaults
  }
})
