import { ElectronAPI } from '@electron-toolkit/preload'

// 文件信息接口
interface FileInfo {
  name: string
  path: string
  extension: string
}

// 自定义API类型定义
interface API {
  window: {
    moveWindow: (deltaX: number, deltaY: number) => void
  }
  launcher: {
    selectFile: () => Promise<string | null>
    extractIcon: (path: string) => Promise<string | null>
    launchApp: (path: string, type?: string, shellType?: 'cmd' | 'powershell') => Promise<boolean>
    getFileInfo: (path: string) => Promise<FileInfo | null>
    selectFolder: () => Promise<string | null>
    isFolder: (path: string) => Promise<boolean>
    getFolderInfo: (path: string) => Promise<FileInfo | null>
    scanInstalledApps: () => Promise<Array<{ name: string; path: string; category: string }>>
    fetchFavicon: (url: string) => Promise<string | null>
    getFilePath: (file: File) => string | null
  }
  superPanel: {
    setModalOpen: (isOpen: boolean) => void
    hide: () => void
    setPinned: (pinned: boolean) => void
    getCapturedText: () => Promise<string>
  }
  settings: {
    getDefaultStorageDirectory: () => Promise<string>
    getHotkey: () => Promise<string>
    selectFolder: (currentPath?: string) => Promise<string | null>
    getAutoLaunch: () => Promise<boolean>
    setAutoLaunch: (enabled: boolean) => Promise<boolean>
    registerHotkey: (hotkey: string) => Promise<boolean>
    unregisterHotkey: (hotkey: string) => Promise<boolean>
    getAIBaseUrl: () => Promise<string>
    setAIBaseUrl: (url: string) => Promise<boolean>
    getAIApiKey: () => Promise<string>
    setAIApiKey: (key: string) => Promise<boolean>
    getAIModels: () => Promise<string[]>
    setAIModels: (models: string[]) => Promise<boolean>
    getAIDefaultModel: () => Promise<string>
    setAIDefaultModel: (model: string) => Promise<boolean>
    getDynamicIslandEnabled: () => Promise<boolean>
    setDynamicIslandEnabled: (enabled: boolean) => Promise<boolean>
    getDynamicIslandWidgets: () => Promise<{
      left: string | null
      center: string | null
      right: string | null
    }>
    setDynamicIslandWidgets: (config: {
      left: string | null
      center: string | null
      right: string | null
    }) => Promise<boolean>
    getDynamicIslandExpandedWidgets: () => Promise<{
      widgets: Array<{
        widgetId: string
        row: number
        col: number
        rowSpan: number
        colSpan: number
        enabled: boolean
      }>
    }>
    setDynamicIslandExpandedWidgets: (config: {
      widgets: Array<{
        widgetId: string
        row: number
        col: number
        rowSpan: number
        colSpan: number
        enabled: boolean
      }>
    }) => Promise<boolean>
    getEnabledExpandedPlugins: () => Promise<{
      pluginIds: string[]
    }>
    setEnabledExpandedPlugins: (config: {
      pluginIds: string[]
    }) => Promise<boolean>
  }
  aiShortcutRunner: {
    open: (shortcutData: {
      id: string
      name: string
      icon: string
      prompt: string
      selectedText?: string
      autoExecute?: boolean
      model?: string
      temperature?: number
    }) => void
    captureSelectedText: () => Promise<string>
    close: () => void
    setPinned: (pinned: boolean) => void
    onInitData: (
      callback: (data: {
        name: string
        icon: string
        prompt: string
        selectedText?: string
        autoExecute?: boolean
        model?: string
        temperature?: number
      }) => void
    ) => void
    generate: (
      prompt: string,
      model?: string,
      temperature?: number
    ) => Promise<{
      success: boolean
      content?: string
      error?: string
    }>
    onGenerateProgress: (callback: (content: string) => void) => void
    removeGenerateProgressListener: () => void
  }
  aiShortcutHotkey: {
    register: (
      shortcutId: string,
      hotkey: string,
      name: string,
      icon: string,
      prompt: string,
      model?: string,
      temperature?: number
    ) => Promise<boolean>
    unregister: (shortcutId: string) => Promise<boolean>
    loadAll: (
      shortcuts: Array<{
        id: string
        name: string
        icon: string
        prompt: string
        hotkey?: string
        model?: string
        temperature?: number
      }>
    ) => Promise<number>
  }
  cmdGenerator: {
    generate: (
      description: string,
      shellType: 'cmd' | 'powershell'
    ) => Promise<{
      success: boolean
      command?: string
      error?: string
    }>
  }
  plugin: {
    getAll: () => Promise<{
      success: boolean
      data?: unknown[]
      error?: string
    }>
    getEnabled: () => Promise<{
      success: boolean
      data?: unknown[]
      error?: string
    }>
    toggleEnabled: (
      pluginId: string,
      enabled: boolean
    ) => Promise<{
      success: boolean
      error?: string
    }>
    getConfig: (pluginId: string) => Promise<{
      success: boolean
      data?: Record<string, unknown>
      error?: string
    }>
    setConfig: (
      pluginId: string,
      config: Record<string, unknown>
    ) => Promise<{
      success: boolean
      error?: string
    }>
    execute: (
      pluginId: string,
      params?: Record<string, unknown>
    ) => Promise<{
      success: boolean
      data?: unknown
      error?: string
    }>
    reload: (pluginId: string) => Promise<{
      success: boolean
      error?: string
    }>
    getDetails: (pluginId: string) => Promise<{
      success: boolean
      data?: {
        manifest: Record<string, unknown>
        enabled: boolean
        activated: boolean
      }
      error?: string
    }>
    installFromZip: (zipPath: string) => Promise<{
      success: boolean
      manifest?: Record<string, unknown>
      error?: string
      pluginId?: string
    }>
    uninstall: (pluginId: string) => Promise<{
      success: boolean
      error?: string
    }>
    update: (
      pluginId: string,
      zipPath: string
    ) => Promise<{
      success: boolean
      manifest?: Record<string, unknown>
      error?: string
      pluginId?: string
    }>
    rescan: () => Promise<{
      success: boolean
      data?: {
        newPlugins: string[]
        removedPlugins: string[]
        totalPlugins: number
      }
      error?: string
    }>
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  }
  dynamicIsland: {
    expand: () => void
    collapse: () => void
    show: () => void
    hide: () => void
    close: () => void
    setIgnoreMouseEvents: (ignore: boolean) => void
  }
  dynamicIslandWidget: {
    getAll: () => Promise<any[]>
    get: (widgetId: string) => Promise<any>
    getData: (widgetId: string) => Promise<any>
    reload: () => Promise<{ success: boolean }>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
