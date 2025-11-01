import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import * as path from 'path'
import { promises as fs } from 'fs'
import type { PluginWindowOptions, PluginWindowInstance, PluginManifest } from '../types/plugin'
import { getPluginDirectory } from './pluginLoader'

/**
 * 插件窗口管理器
 * 负责管理插件创建的窗口
 */

class PluginWindowManager {
  // 存储所有插件窗口 Map<windowId, { window, pluginId, manifest }>
  private windows: Map<
    string,
    {
      window: BrowserWindow
      pluginId: string
      manifest: PluginManifest
      data?: Record<string, any>
    }
  > = new Map()

  // 窗口 ID 计数器
  private windowIdCounter = 0

  /**
   * 创建插件窗口
   */
  createWindow(
    manifest: PluginManifest,
    options: PluginWindowOptions
  ): Promise<PluginWindowInstance> {
    return new Promise((resolve, reject) => {
      try {
        // 生成窗口 ID
        const windowId = `${manifest.id}-window-${++this.windowIdCounter}`

        // 构建 BrowserWindow 配置
        const windowOptions: BrowserWindowConstructorOptions = {
          title: options.title || manifest.name,
          width: options.width || 800,
          height: options.height || 600,
          minWidth: options.minWidth,
          minHeight: options.minHeight,
          maxWidth: options.maxWidth,
          maxHeight: options.maxHeight,
          resizable: options.resizable !== false,
          frame: options.frame !== false,
          center: options.center !== false,
          alwaysOnTop: options.alwaysOnTop || false,
          modal: options.modal || false,
          show: false, // 先隐藏，加载完成后再显示
          backgroundColor: '#ffffff',
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false, // 与主窗口保持一致，避免 preload 注入问题
            webSecurity: true,
            allowRunningInsecureContent: false,
            // 使用应用的 preload 脚本
            preload: path.join(__dirname, '../preload/index.js')
          }
        }

        // 创建窗口
        const window = new BrowserWindow(windowOptions)

        // 隐藏菜单栏
        window.setMenuBarVisibility(false)
        window.setMenu(null)

        // 存储窗口信息
        this.windows.set(windowId, {
          window,
          pluginId: manifest.id,
          manifest,
          data: options.data
        })

        // 加载内容
        if (options.html) {
          // ✅ 最佳方案：读取 HTML 并注入脚本，但优化性能
          // 使用 base64 data URL 比 encodeURIComponent 更快，且避免特殊字符问题
          const pluginDir = getPluginDirectory(manifest.id)
          const htmlPath = path.join(pluginDir, options.html)

          console.log(`Loading plugin window: ${htmlPath}`)

          // 读取并修改 HTML 文件
          fs.readFile(htmlPath, 'utf-8')
            .then((htmlContent) => {
              // 在 <head> 标签后立即注入数据脚本（确保最早执行）
              const injectionScript = `
<script>
  // 插件窗口数据注入（在任何其他脚本之前）
  window.pluginData = ${JSON.stringify(options.data || {})};
  window.pluginId = "${manifest.id}";
  window.windowId = "${windowId}";
  console.log('[PluginWindow] Data injected at page load:', { 
    pluginId: window.pluginId, 
    pluginData: window.pluginData 
  });
</script>
`
              // 在 <head> 之后插入（如果没有 head 标签，在 html 之后插入）
              let modifiedHtml = htmlContent
              if (htmlContent.includes('</head>')) {
                modifiedHtml = htmlContent.replace('</head>', `${injectionScript}</head>`)
              } else if (htmlContent.includes('<head>')) {
                modifiedHtml = htmlContent.replace('<head>', `<head>${injectionScript}`)
              } else if (htmlContent.includes('<html>')) {
                modifiedHtml = htmlContent.replace('<html>', `<html>${injectionScript}`)
              } else {
                modifiedHtml = injectionScript + htmlContent
              }

              // 🚀 性能优化：使用 base64 编码代替 URL 编码，速度更快
              // base64 编码比 encodeURIComponent 快约 30-50%
              const base64Html = Buffer.from(modifiedHtml, 'utf-8').toString('base64')
              const dataUrl = `data:text/html;base64,${base64Html}`

              return window.loadURL(dataUrl)
            })
            .catch((error) => {
              console.error(`Failed to load plugin window HTML:`, error)
              this.closeWindow(windowId)
              reject(new Error(`Failed to load HTML file: ${error.message}`))
            })
        } else if (options.url) {
          // 加载远程 URL (需要 network 权限)
          console.log(`Loading plugin window URL: ${options.url}`)
          window.loadURL(options.url).catch((error) => {
            console.error(`Failed to load plugin window URL:`, error)
            this.closeWindow(windowId)
            reject(new Error(`Failed to load URL: ${error.message}`))
          })
        } else {
          // 没有指定内容，加载一个默认的空白页
          const emptyHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <title>${manifest.name}</title>
                <style>
                  body {
                    margin: 0;
                    padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    background: #f5f5f5;
                  }
                  .message {
                    text-align: center;
                    color: #666;
                  }
                </style>
              </head>
              <body>
                <div class="message">
                  <h1>${manifest.name}</h1>
                  <p>插件窗口已创建</p>
                  <p id="data"></p>
                  <script>
                    if (window.pluginData) {
                      document.getElementById('data').textContent = 
                        'Data: ' + JSON.stringify(window.pluginData);
                    }
                  </script>
                </div>
              </body>
            </html>
          `
          window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(emptyHtml)}`)
        }

        // 窗口加载完成后显示
        window.webContents.once('did-finish-load', () => {
          window.show()
          console.log(`Plugin window created: ${windowId}`)
        })

        // 窗口关闭时清理
        window.on('closed', () => {
          this.windows.delete(windowId)
          console.log(`Plugin window closed: ${windowId}`)
        })

        // 创建窗口实例
        const windowInstance: PluginWindowInstance = {
          id: windowId,
          close: () => this.closeWindow(windowId),
          focus: () => this.focusWindow(windowId),
          hide: () => this.hideWindow(windowId),
          show: () => this.showWindow(windowId),
          minimize: () => this.minimizeWindow(windowId),
          maximize: () => this.maximizeWindow(windowId),
          isVisible: () => this.isWindowVisible(windowId),
          send: (channel: string, ...args: any[]) => this.sendToWindow(windowId, channel, ...args)
        }

        resolve(windowInstance)
      } catch (error) {
        console.error('Failed to create plugin window:', error)
        reject(error)
      }
    })
  }

  /**
   * 获取窗口实例
   */
  getWindow(windowId: string): PluginWindowInstance | undefined {
    const windowInfo = this.windows.get(windowId)
    if (!windowInfo) {
      return undefined
    }

    return {
      id: windowId,
      close: () => this.closeWindow(windowId),
      focus: () => this.focusWindow(windowId),
      hide: () => this.hideWindow(windowId),
      show: () => this.showWindow(windowId),
      minimize: () => this.minimizeWindow(windowId),
      maximize: () => this.maximizeWindow(windowId),
      isVisible: () => this.isWindowVisible(windowId),
      send: (channel: string, ...args: any[]) => this.sendToWindow(windowId, channel, ...args)
    }
  }

  /**
   * 获取插件的所有窗口
   */
  getPluginWindows(pluginId: string): PluginWindowInstance[] {
    const instances: PluginWindowInstance[] = []

    for (const [windowId, info] of this.windows.entries()) {
      if (info.pluginId === pluginId) {
        instances.push(this.getWindow(windowId)!)
      }
    }

    return instances
  }

  /**
   * 关闭窗口
   */
  closeWindow(windowId: string): void {
    const windowInfo = this.windows.get(windowId)
    if (windowInfo && !windowInfo.window.isDestroyed()) {
      windowInfo.window.close()
    }
    this.windows.delete(windowId)
  }

  /**
   * 聚焦窗口
   */
  focusWindow(windowId: string): void {
    const windowInfo = this.windows.get(windowId)
    if (windowInfo && !windowInfo.window.isDestroyed()) {
      windowInfo.window.focus()
    }
  }

  /**
   * 隐藏窗口
   */
  hideWindow(windowId: string): void {
    const windowInfo = this.windows.get(windowId)
    if (windowInfo && !windowInfo.window.isDestroyed()) {
      windowInfo.window.hide()
    }
  }

  /**
   * 显示窗口
   */
  showWindow(windowId: string): void {
    const windowInfo = this.windows.get(windowId)
    if (windowInfo && !windowInfo.window.isDestroyed()) {
      windowInfo.window.show()
    }
  }

  /**
   * 最小化窗口
   */
  minimizeWindow(windowId: string): void {
    const windowInfo = this.windows.get(windowId)
    if (windowInfo && !windowInfo.window.isDestroyed()) {
      windowInfo.window.minimize()
    }
  }

  /**
   * 最大化窗口
   */
  maximizeWindow(windowId: string): void {
    const windowInfo = this.windows.get(windowId)
    if (windowInfo && !windowInfo.window.isDestroyed()) {
      if (windowInfo.window.isMaximized()) {
        windowInfo.window.unmaximize()
      } else {
        windowInfo.window.maximize()
      }
    }
  }

  /**
   * 检查窗口是否可见
   */
  isWindowVisible(windowId: string): boolean {
    const windowInfo = this.windows.get(windowId)
    if (windowInfo && !windowInfo.window.isDestroyed()) {
      return windowInfo.window.isVisible()
    }
    return false
  }

  /**
   * 向窗口发送消息
   */
  sendToWindow(windowId: string, channel: string, ...args: any[]): void {
    const windowInfo = this.windows.get(windowId)
    if (windowInfo && !windowInfo.window.isDestroyed()) {
      windowInfo.window.webContents.send(channel, ...args)
    }
  }

  /**
   * 关闭插件的所有窗口
   */
  closePluginWindows(pluginId: string): void {
    const windowIds: string[] = []

    // 收集该插件的所有窗口 ID
    for (const [windowId, info] of this.windows.entries()) {
      if (info.pluginId === pluginId) {
        windowIds.push(windowId)
      }
    }

    // 关闭窗口
    windowIds.forEach((windowId) => this.closeWindow(windowId))
    console.log(`Closed ${windowIds.length} window(s) for plugin: ${pluginId}`)
  }

  /**
   * 关闭所有窗口
   */
  closeAllWindows(): void {
    const windowIds = Array.from(this.windows.keys())
    windowIds.forEach((windowId) => this.closeWindow(windowId))
    console.log(`Closed ${windowIds.length} plugin window(s)`)
  }

  /**
   * 清理所有资源
   */
  cleanup(): void {
    this.closeAllWindows()
    this.windows.clear()
    console.log('Plugin window manager cleaned up')
  }
}

// 导出单例
export const pluginWindowManager = new PluginWindowManager()

// 导出类型
export type { PluginWindowManager }
