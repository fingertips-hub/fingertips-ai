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
    setPinned: (pinned: boolean) => ipcRenderer.send('super-panel:set-pinned', pinned)
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
    unregisterHotkey: (hotkey: string) => ipcRenderer.invoke('settings:unregister-hotkey', hotkey)
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
      }) => void
    ) => {
      ipcRenderer.on('ai-shortcut-runner:init-data', (_event, data) => callback(data))
    }
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
