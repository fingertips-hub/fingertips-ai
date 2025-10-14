import { ipcMain, dialog, shell } from 'electron'
import { basename, extname } from 'path'
import { getSuperPanelWindow, hideSuperPanel, setModalOpen, setPinned } from './superPanel'
import { extractIcon } from '../utils/iconExtractor'

/**
 * 设置 Super Panel 相关的 IPC Handlers
 * 包括窗口控制、应用启动器等功能
 */
export function setupSuperPanelHandlers(): void {
  // =============================================================================
  // 窗口控制 IPC Handlers
  // =============================================================================

  /**
   * 移动窗口位置
   */
  ipcMain.on('move-window', (_event, deltaX: number, deltaY: number) => {
    const window = getSuperPanelWindow()
    if (window && !window.isDestroyed()) {
      const [currentX, currentY] = window.getPosition()
      window.setPosition(currentX + deltaX, currentY + deltaY)
    }
  })

  /**
   * 隐藏 Super Panel
   */
  ipcMain.on('hide-super-panel', () => {
    hideSuperPanel()
  })

  /**
   * 设置 Modal 打开状态
   */
  ipcMain.on('super-panel:set-modal-open', (_event, isOpen: boolean) => {
    setModalOpen(isOpen)
  })

  /**
   * 设置面板固定状态
   */
  ipcMain.on('super-panel:set-pinned', (_event, pinned: boolean) => {
    setPinned(pinned)
  })

  // =============================================================================
  // 应用启动器 IPC Handlers
  // =============================================================================

  /**
   * 选择文件
   * 打开文件选择对话框,支持多种文件类型
   */
  ipcMain.handle('launcher:select-file', async () => {
    try {
      const superPanelWin = getSuperPanelWindow()
      const result = await dialog.showOpenDialog(superPanelWin!, {
        properties: ['openFile'],
        filters: [
          { name: '所有文件', extensions: ['*'] },
          { name: '应用程序', extensions: ['exe', 'lnk'] },
          { name: '文档', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] },
          { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'] },
          { name: '视频', extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv'] },
          { name: '音频', extensions: ['mp3', 'wav', 'flac', 'aac', 'm4a'] }
        ],
        title: '选择文件'
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      return result.filePaths[0]
    } catch (error) {
      console.error('Error selecting file:', error)
      return null
    }
  })

  /**
   * 提取文件图标
   * 从文件中提取图标并返回 base64 格式
   */
  ipcMain.handle('launcher:extract-icon', async (_event, filePath: string) => {
    try {
      console.log('Extracting icon for:', filePath)
      const base64 = await extractIcon(filePath)
      if (base64) {
        console.log('Icon extracted successfully')
      } else {
        console.log('Icon extraction failed, returning null')
      }
      return base64
    } catch (error) {
      console.error('Error extracting icon:', error)
      return null
    }
  })

  /**
   * 启动应用/打开文件/网页/CMD命令/PowerShell命令
   * 使用系统默认程序打开文件或在浏览器中打开网页，或执行命令
   */
  ipcMain.handle(
    'launcher:launch-app',
    async (_event, pathOrUrl: string, type?: string, shellType?: 'cmd' | 'powershell') => {
      try {
        // CMD 或 PowerShell 命令
        if (type === 'cmd') {
          const { exec } = await import('child_process')

          if (shellType === 'powershell') {
            // PowerShell 命令
            console.log('Executing PowerShell command:', pathOrUrl)
            // 使用 PowerShell 执行命令，-NoExit 保持窗口打开
            exec(`start powershell -NoExit -Command "${pathOrUrl}"`, (error) => {
              if (error) {
                console.error('Failed to execute PowerShell command:', error)
              } else {
                console.log('PowerShell command executed successfully')
              }
            })
          } else {
            // CMD 命令（默认）
            console.log('Executing CMD command:', pathOrUrl)
            // 使用 cmd /k 执行命令，并在新窗口中打开
            exec(`start cmd /k "${pathOrUrl}"`, (error) => {
              if (error) {
                console.error('Failed to execute CMD command:', error)
              } else {
                console.log('CMD command executed successfully')
              }
            })
          }
          return true
        }
        // 检测是否为网页链接
        else if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
          console.log('Opening URL in default browser:', pathOrUrl)
          await shell.openExternal(pathOrUrl)
          console.log('URL opened successfully')
          return true
        } else {
          // 文件或文件夹路径
          console.log('Opening file/folder with default application:', pathOrUrl)
          const result = await shell.openPath(pathOrUrl)

          // shell.openPath 返回空字符串表示成功,返回错误信息表示失败
          if (result) {
            console.error('Failed to open file/folder:', result)
            return false
          }

          console.log('File/folder opened successfully')
          return true
        }
      } catch (error) {
        console.error('Error opening path/URL:', error)
        return false
      }
    }
  )

  /**
   * 获取文件信息
   * 返回文件名、路径和扩展名
   */
  ipcMain.handle('launcher:get-file-info', async (_event, filePath: string) => {
    try {
      const name = basename(filePath, extname(filePath))
      const extension = extname(filePath)
      return {
        name,
        path: filePath,
        extension
      }
    } catch (error) {
      console.error('Error getting file info:', error)
      return null
    }
  })

  /**
   * 选择文件夹
   * 打开文件夹选择对话框
   */
  ipcMain.handle('launcher:select-folder', async () => {
    try {
      const superPanelWin = getSuperPanelWindow()
      const result = await dialog.showOpenDialog(superPanelWin!, {
        properties: ['openDirectory'],
        title: '选择文件夹'
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      return result.filePaths[0]
    } catch (error) {
      console.error('Error selecting folder:', error)
      return null
    }
  })

  /**
   * 检查路径是否为文件夹
   */
  ipcMain.handle('launcher:is-folder', async (_event, folderPath: string) => {
    try {
      const fs = await import('fs/promises')
      const stats = await fs.stat(folderPath)
      return stats.isDirectory()
    } catch (error) {
      console.error('Error checking if path is folder:', error)
      return false
    }
  })

  /**
   * 获取文件夹信息
   * 返回文件夹名、路径
   */
  ipcMain.handle('launcher:get-folder-info', async (_event, folderPath: string) => {
    try {
      const name = basename(folderPath)
      return {
        name,
        path: folderPath,
        extension: '' // 文件夹没有扩展名
      }
    } catch (error) {
      console.error('Error getting folder info:', error)
      return null
    }
  })

  /**
   * 获取网站 favicon
   * 在主进程中获取，避免 CORS 问题
   */
  ipcMain.handle('launcher:fetch-favicon', async (_event, url: string) => {
    try {
      const urlObj = new URL(url)
      const domain = urlObj.hostname
      const origin = urlObj.origin

      // 定义多个 favicon 来源，按优先级排列
      const faviconSources = [
        `${origin}/favicon.ico`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
      ]

      // 尝试每个来源
      for (const faviconUrl of faviconSources) {
        try {
          console.log('Trying to fetch favicon from:', faviconUrl)

          const response = await fetch(faviconUrl, {
            method: 'GET',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            signal: AbortSignal.timeout(5000) // 5秒超时
          })

          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            // 转换为 base64
            const base64 = `data:${response.headers.get('content-type') || 'image/x-icon'};base64,${buffer.toString('base64')}`

            console.log('Favicon fetched successfully from:', faviconUrl)
            return base64
          }
        } catch (error) {
          console.log('Failed to fetch from:', faviconUrl, error)
          continue
        }
      }

      console.log('All favicon sources failed')
      return null
    } catch (error) {
      console.error('Error fetching favicon:', error)
      return null
    }
  })

  console.log('Super Panel IPC handlers registered')
}

/**
 * 清理 Super Panel 相关的 IPC Handlers
 * 在应用退出前调用
 */
export function cleanupSuperPanelHandlers(): void {
  // 移除所有 IPC handlers
  ipcMain.removeHandler('launcher:select-file')
  ipcMain.removeHandler('launcher:extract-icon')
  ipcMain.removeHandler('launcher:launch-app')
  ipcMain.removeHandler('launcher:get-file-info')
  ipcMain.removeHandler('launcher:select-folder')
  ipcMain.removeHandler('launcher:is-folder')
  ipcMain.removeHandler('launcher:get-folder-info')
  ipcMain.removeHandler('launcher:fetch-favicon')

  console.log('Super Panel IPC handlers cleaned up')
}
