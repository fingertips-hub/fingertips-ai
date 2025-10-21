import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 窗口拖动相关API
  window: {
    // 移动窗口位置
    moveWindow: (deltaX: number, deltaY: number) => {
      ipcRenderer.send('move-window', deltaX, deltaY)
    }
  },
  // 应用启动器相关API
  launcher: {
    // 选择文件
    selectFile: () => ipcRenderer.invoke('launcher:select-file'),
    // 提取图标
    extractIcon: (path: string) => ipcRenderer.invoke('launcher:extract-icon', path),
    // 启动应用
    launchApp: (path: string, type?: string, shellType?: 'cmd' | 'powershell') =>
      ipcRenderer.invoke('launcher:launch-app', path, type, shellType),
    // 获取文件信息
    getFileInfo: (path: string) => ipcRenderer.invoke('launcher:get-file-info', path),
    // 选择文件夹
    selectFolder: () => ipcRenderer.invoke('launcher:select-folder'),
    // 检查路径是否为文件夹
    isFolder: (path: string) => ipcRenderer.invoke('launcher:is-folder', path),
    // 获取文件夹信息
    getFolderInfo: (path: string) => ipcRenderer.invoke('launcher:get-folder-info', path),
    // 扫描已安装的应用（从开始菜单）
    scanInstalledApps: () =>
      ipcRenderer.invoke('launcher:scan-installed-apps') as Promise<
        Array<{ name: string; path: string; category: string }>
      >,
    // 获取网站 favicon
    fetchFavicon: (url: string) => ipcRenderer.invoke('launcher:fetch-favicon', url),
    // 从 File 对象获取路径 (使用 webUtils.getPathForFile)
    getFilePath: (file: File) => {
      try {
        // Electron 提供的 webUtils.getPathForFile 可以从 File 对象获取路径
        const path = webUtils.getPathForFile(file)
        console.log('Got file path from webUtils:', path)
        return path
      } catch (error) {
        console.error('Error getting file path:', error)
        return null
      }
    }
  },
  // Super Panel 相关API
  superPanel: {
    // 设置 Modal 打开状态
    setModalOpen: (isOpen: boolean) => ipcRenderer.send('super-panel:set-modal-open', isOpen),
    // 隐藏 Super Panel
    hide: () => ipcRenderer.send('hide-super-panel'),
    // 设置面板固定状态
    setPinned: (pinned: boolean) => ipcRenderer.send('super-panel:set-pinned', pinned),
    // 获取捕获的选中文本
    getCapturedText: () => ipcRenderer.invoke('super-panel:get-captured-text')
  },
  // Settings 相关API
  settings: {
    // 获取默认存储目录
    getDefaultStorageDirectory: () => ipcRenderer.invoke('settings:get-default-storage-directory'),
    // 获取当前快捷键
    getHotkey: () => ipcRenderer.invoke('settings:get-hotkey'),
    // 选择文件夹
    selectFolder: (currentPath?: string) =>
      ipcRenderer.invoke('settings:select-folder', currentPath),
    // 获取开机自启动状态
    getAutoLaunch: () => ipcRenderer.invoke('settings:get-auto-launch'),
    // 设置开机自启动
    setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('settings:set-auto-launch', enabled),
    // 注册全局快捷键
    registerHotkey: (hotkey: string) => ipcRenderer.invoke('settings:register-hotkey', hotkey),
    // 注销全局快捷键
    unregisterHotkey: (hotkey: string) => ipcRenderer.invoke('settings:unregister-hotkey', hotkey),
    // 获取 AI Base URL
    getAIBaseUrl: () => ipcRenderer.invoke('settings:get-ai-base-url') as Promise<string>,
    // 设置 AI Base URL
    setAIBaseUrl: (url: string) =>
      ipcRenderer.invoke('settings:set-ai-base-url', url) as Promise<boolean>,
    // 获取 AI API Key
    getAIApiKey: () => ipcRenderer.invoke('settings:get-ai-api-key') as Promise<string>,
    // 设置 AI API Key
    setAIApiKey: (key: string) =>
      ipcRenderer.invoke('settings:set-ai-api-key', key) as Promise<boolean>,
    // 获取 AI 模型列表
    getAIModels: () => ipcRenderer.invoke('settings:get-ai-models') as Promise<string[]>,
    // 设置 AI 模型列表
    setAIModels: (models: string[]) =>
      ipcRenderer.invoke('settings:set-ai-models', models) as Promise<boolean>,
    // 获取默认 AI 模型
    getAIDefaultModel: () => ipcRenderer.invoke('settings:get-ai-default-model') as Promise<string>,
    // 设置默认 AI 模型
    setAIDefaultModel: (model: string) =>
      ipcRenderer.invoke('settings:set-ai-default-model', model) as Promise<boolean>
  },
  // AI Shortcut Runner 相关API
  aiShortcutRunner: {
    // 打开 AI 快捷指令运行窗口
    open: (shortcutData: {
      id: string
      name: string
      icon: string
      prompt: string
      selectedText?: string
      autoExecute?: boolean
      model?: string
      temperature?: number
    }) => ipcRenderer.send('ai-shortcut-runner:open', shortcutData),
    // 主进程安全捕获当前选中文本（保护剪贴板）
    captureSelectedText: () => ipcRenderer.invoke('ai-shortcut-runner:capture-selected-text'),
    // 关闭窗口
    close: () => ipcRenderer.send('ai-shortcut-runner:close'),
    // 设置窗口固定状态
    setPinned: (pinned: boolean) => ipcRenderer.send('ai-shortcut-runner:set-pinned', pinned),
    // 监听初始化数据
    onInitData: (
      callback: (data: {
        name: string
        icon: string
        prompt: string
        selectedText?: string
        autoExecute?: boolean
      }) => void
    ) => {
      // 先移除旧的监听器，避免重复注册
      ipcRenderer.removeAllListeners('ai-shortcut-runner:init-data')
      ipcRenderer.on('ai-shortcut-runner:init-data', (_event, data) => callback(data))
    },
    // 生成 AI 响应
    generate: (prompt: string, model?: string, temperature?: number) =>
      ipcRenderer.invoke('ai-shortcut-runner:generate', prompt, model, temperature) as Promise<{
        success: boolean
        content?: string
        error?: string
      }>,
    // 监听生成进度（支持重复调用，自动清理旧监听器）
    onGenerateProgress: (callback: (content: string) => void) => {
      // 先移除旧的监听器，避免重复注册
      const listenerCount = ipcRenderer.listenerCount('ai-shortcut-runner:generate-progress')
      console.log(`[Preload] Removing ${listenerCount} existing generate-progress listeners`)
      ipcRenderer.removeAllListeners('ai-shortcut-runner:generate-progress')

      ipcRenderer.on('ai-shortcut-runner:generate-progress', (_event, content) => {
        console.log('[Preload] Received generate-progress event, content length:', content.length)
        callback(content)
      })
      console.log('[Preload] Generate-progress listener registered')
    },
    // 移除生成进度监听器
    removeGenerateProgressListener: () => {
      ipcRenderer.removeAllListeners('ai-shortcut-runner:generate-progress')
    }
  },
  // AI Shortcut Hotkey 相关API
  aiShortcutHotkey: {
    // 注册快捷指令的快捷键
    register: (
      shortcutId: string,
      hotkey: string,
      name: string,
      icon: string,
      prompt: string,
      model?: string,
      temperature?: number
    ) =>
      ipcRenderer.invoke(
        'ai-shortcut-hotkey:register',
        shortcutId,
        hotkey,
        name,
        icon,
        prompt,
        model,
        temperature
      ),
    // 注销快捷指令的快捷键
    unregister: (shortcutId: string) =>
      ipcRenderer.invoke('ai-shortcut-hotkey:unregister', shortcutId),
    // 加载所有快捷指令的快捷键
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
    ) => ipcRenderer.invoke('ai-shortcut-hotkey:load-all', shortcuts)
  },
  // CMD Generator 相关API
  cmdGenerator: {
    // 生成命令
    generate: (description: string, shellType: 'cmd' | 'powershell') =>
      ipcRenderer.invoke('cmd-generator:generate', description, shellType)
  },
  // Plugin 相关API
  plugin: {
    // 获取所有插件
    getAll: () => ipcRenderer.invoke('plugin:get-all'),
    // 获取已启用的插件
    getEnabled: () => ipcRenderer.invoke('plugin:get-enabled'),
    // 切换插件启用状态
    toggleEnabled: (pluginId: string, enabled: boolean) =>
      ipcRenderer.invoke('plugin:toggle-enabled', pluginId, enabled),
    // 获取插件配置
    getConfig: (pluginId: string) => ipcRenderer.invoke('plugin:get-config', pluginId),
    // 设置插件配置
    setConfig: (pluginId: string, config: Record<string, unknown>) =>
      ipcRenderer.invoke('plugin:set-config', pluginId, config),
    // 执行插件
    execute: (pluginId: string, params?: Record<string, unknown>) =>
      ipcRenderer.invoke('plugin:execute', pluginId, params),
    // 重新加载插件
    reload: (pluginId: string) => ipcRenderer.invoke('plugin:reload', pluginId),
    // 获取插件详情
    getDetails: (pluginId: string) => ipcRenderer.invoke('plugin:get-details', pluginId)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
