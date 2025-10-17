import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'fingertips-settings'

/**
 * 应用设置接口
 */
export interface AppSettings {
  // 通用设置
  storageDirectory: string // 文件存储目录
  autoLaunch: boolean // 开机自启动
  hotkey: string // 召唤 Super Panel 的快捷键

  // AI 设置
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

  // AI 设置
  aiBaseUrl: 'https://api.openai.com/v1',
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
   * 初始化 Store - 从 localStorage 加载数据
   */
  async function initialize(): Promise<void> {
    isLoading.value = true
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored) as AppSettings
        // 合并默认值和存储值，确保新增字段有默认值
        settings.value = { ...DEFAULT_SETTINGS, ...data }
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

      // 从主进程同步快捷键设置（主进程是真实的数据源）
      if (window.api?.settings?.getHotkey) {
        const savedHotkey = await window.api.settings.getHotkey()
        if (savedHotkey && savedHotkey !== settings.value.hotkey) {
          settings.value.hotkey = savedHotkey
          saveToStorage()
          console.log('Synced hotkey from main process:', savedHotkey)
        }
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 保存数据到 localStorage
   */
  function saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
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
   */
  function updateAIBaseUrl(url: string): void {
    settings.value.aiBaseUrl = url
    saveToStorage()
  }

  /**
   * 更新 AI API Key
   */
  function updateAIApiKey(key: string): void {
    settings.value.aiApiKey = key
    saveToStorage()
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
    resetToDefaults
  }
})
