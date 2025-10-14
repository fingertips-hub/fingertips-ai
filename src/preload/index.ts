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
