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
    fetchFavicon: (url: string) => Promise<string | null>
    getFilePath: (file: File) => string | null
  }
  superPanel: {
    setModalOpen: (isOpen: boolean) => void
    hide: () => void
    setPinned: (pinned: boolean) => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
