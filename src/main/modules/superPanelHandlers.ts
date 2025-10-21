import { ipcMain, dialog, shell } from 'electron'
import { basename, extname } from 'path'
import {
  getSuperPanelWindow,
  hideSuperPanel,
  setModalOpen,
  setPinned,
  getCachedSelectedText
} from './superPanel'
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

  /**
   * 获取捕获的选中文本
   * 用于将划词内容传递给插件
   */
  ipcMain.handle('super-panel:get-captured-text', () => {
    return getCachedSelectedText()
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
   * 扫描已安装的应用（从开始菜单）
   * 返回应用快捷方式列表，包括微软应用商店应用
   */
  ipcMain.handle('launcher:scan-installed-apps', async () => {
    try {
      console.log('Scanning installed apps from Start Menu...')
      const fs = await import('fs/promises')
      const { join } = await import('path')
      const os = await import('os')

      // 常见的开始菜单位置
      const startMenuPaths = [
        // 所有用户的开始菜单（包括微软应用商店应用）
        'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs',
        // 当前用户的开始菜单
        join(os.homedir(), 'AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs')
      ]

      const apps: Array<{
        name: string
        path: string
        category: string
      }> = []

      // 递归扫描目录，查找 .lnk 文件
      async function scanDirectory(dirPath: string, category: string = '其他'): Promise<void> {
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true })

          for (const entry of entries) {
            const fullPath = join(dirPath, entry.name)

            if (entry.isDirectory()) {
              // 递归扫描子目录（使用目录名作为分类）
              await scanDirectory(fullPath, entry.name)
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.lnk')) {
              // 过滤掉卸载程序等不需要的快捷方式
              if (
                !entry.name.toLowerCase().includes('uninstall') &&
                !entry.name.toLowerCase().includes('卸载') &&
                !entry.name.toLowerCase().includes('readme')
              ) {
                apps.push({
                  name: basename(entry.name, '.lnk'),
                  path: fullPath,
                  category: category
                })
              }
            }
          }
        } catch {
          // 忽略无法访问的目录
          console.log(`Cannot access directory: ${dirPath}`)
        }
      }

      // 扫描所有开始菜单位置
      for (const startMenuPath of startMenuPaths) {
        try {
          await scanDirectory(startMenuPath, '全部应用')
        } catch {
          console.log(`Cannot scan: ${startMenuPath}`)
        }
      }

      // 添加常用系统工具
      console.log('Adding system utilities...')
      const systemTools = [
        { name: '记事本', exe: 'notepad.exe', path: 'C:\\Windows\\System32\\notepad.exe' },
        { name: '计算器', exe: 'calc.exe', path: 'C:\\Windows\\System32\\calc.exe' },
        { name: '画图', exe: 'mspaint.exe', path: 'C:\\Windows\\System32\\mspaint.exe' },
        {
          name: '写字板',
          exe: 'write.exe',
          path: 'C:\\Program Files\\Windows NT\\Accessories\\wordpad.exe'
        },
        {
          name: '截图工具',
          exe: 'SnippingTool.exe',
          path: 'C:\\Windows\\System32\\SnippingTool.exe'
        },
        {
          name: '截图和草图',
          exe: 'ScreenSketch.exe',
          path: 'C:\\Windows\\System32\\ScreenSketch.exe'
        },
        { name: '任务管理器', exe: 'taskmgr.exe', path: 'C:\\Windows\\System32\\taskmgr.exe' },
        { name: '控制面板', exe: 'control.exe', path: 'C:\\Windows\\System32\\control.exe' },
        {
          name: '注册表编辑器',
          exe: 'regedit.exe',
          path: 'C:\\Windows\\regedit.exe'
        },
        {
          name: '命令提示符',
          exe: 'cmd.exe',
          path: 'C:\\Windows\\System32\\cmd.exe'
        },
        {
          name: 'PowerShell',
          exe: 'powershell.exe',
          path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
        },
        {
          name: '资源监视器',
          exe: 'resmon.exe',
          path: 'C:\\Windows\\System32\\resmon.exe'
        },
        {
          name: '磁盘清理',
          exe: 'cleanmgr.exe',
          path: 'C:\\Windows\\System32\\cleanmgr.exe'
        },
        {
          name: '磁盘碎片整理',
          exe: 'dfrgui.exe',
          path: 'C:\\Windows\\System32\\dfrgui.exe'
        },
        {
          name: '系统信息',
          exe: 'msinfo32.exe',
          path: 'C:\\Windows\\System32\\msinfo32.exe'
        },
        {
          name: '设备管理器',
          exe: 'devmgmt.msc',
          path: 'C:\\Windows\\System32\\devmgmt.msc'
        },
        {
          name: '服务',
          exe: 'services.msc',
          path: 'C:\\Windows\\System32\\services.msc'
        },
        {
          name: '事件查看器',
          exe: 'eventvwr.msc',
          path: 'C:\\Windows\\System32\\eventvwr.msc'
        },
        {
          name: '远程桌面连接',
          exe: 'mstsc.exe',
          path: 'C:\\Windows\\System32\\mstsc.exe'
        },
        {
          name: '字符映射表',
          exe: 'charmap.exe',
          path: 'C:\\Windows\\System32\\charmap.exe'
        }
      ]

      // 检查系统工具是否存在并添加到列表
      const { existsSync } = await import('fs')
      for (const tool of systemTools) {
        if (existsSync(tool.path)) {
          // 检查是否已经在列表中（避免重复）
          const exists = apps.some((app) => app.path.toLowerCase() === tool.path.toLowerCase())
          if (!exists) {
            apps.push({
              name: tool.name,
              path: tool.path,
              category: '系统工具'
            })
          }
        }
      }

      // 按分类和名称排序（系统工具排在前面）
      apps.sort((a, b) => {
        // 系统工具优先
        if (a.category === '系统工具' && b.category !== '系统工具') return -1
        if (a.category !== '系统工具' && b.category === '系统工具') return 1
        // 同分类按名称排序
        return a.name.localeCompare(b.name, 'zh-CN')
      })

      console.log(`Found ${apps.length} installed apps (including system utilities)`)
      return apps
    } catch (error) {
      console.error('Error scanning installed apps:', error)
      return []
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
  ipcMain.removeHandler('launcher:scan-installed-apps')
  ipcMain.removeHandler('launcher:fetch-favicon')

  console.log('Super Panel IPC handlers cleaned up')
}
