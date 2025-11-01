import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { app } from 'electron'

/**
 * 灵动岛组件 Manifest 结构
 */
export interface WidgetManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  type: 'simple' | 'advanced' // simple: 仅 manifest.json, advanced: 包含 HTML/JS
  category: 'collapsed' | 'expanded' | 'both' // 组件类别：折叠、展开、两者都支持
  config?: {
    format?: string
    updateInterval?: number
    [key: string]: any
  }
  template?: {
    type: 'text' | 'html'
    content: string
  }
  styles?: {
    fontSize?: string
    fontWeight?: string
    color?: string
    [key: string]: any
  }
  // advanced 类型专用
  entry?: string // HTML 文件入口（用于折叠状态）
  // 展开状态专用配置
  expandedSize?: 'small' | 'large' // 展开状态组件尺寸
  expandedEntry?: string // 展开状态的 HTML 文件入口
  expandedTemplate?: {
    // 展开状态的简单模板
    type: 'text' | 'html'
    content: string
  }
  expandedStyles?: {
    // 展开状态的样式
    [key: string]: any
  }
}

/**
 * 加载的组件信息
 */
export interface LoadedWidget {
  manifest: WidgetManifest
  dirPath: string
  htmlContent?: string // advanced 类型的折叠状态 HTML 内容
  expandedHtmlContent?: string // advanced 类型的展开状态 HTML 内容
}

/**
 * 灵动岛组件管理器
 */
class DynamicIslandWidgetManager {
  private widgets: Map<string, LoadedWidget> = new Map()
  private widgetsDir: string

  constructor() {
    // 组件目录在应用根目录
    this.widgetsDir = path.join(app.getAppPath(), 'dynamic-island-widgets')
  }

  /**
   * 初始化：扫描并加载所有组件
   */
  async initialize(): Promise<void> {
    console.log('[WidgetManager] Initializing...')
    console.log('[WidgetManager] Widgets directory:', this.widgetsDir)

    // 确保组件目录存在
    if (!fs.existsSync(this.widgetsDir)) {
      console.warn('[WidgetManager] Widgets directory not found, creating...')
      fs.mkdirSync(this.widgetsDir, { recursive: true })
      return
    }

    await this.scanWidgets()
    console.log(`[WidgetManager] Loaded ${this.widgets.size} widgets`)
  }

  /**
   * 扫描组件目录
   */
  private async scanWidgets(): Promise<void> {
    try {
      const entries = fs.readdirSync(this.widgetsDir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.loadWidget(entry.name)
        }
      }
    } catch (error) {
      console.error('[WidgetManager] Error scanning widgets:', error)
    }
  }

  /**
   * 加载单个组件
   */
  private async loadWidget(widgetDirName: string): Promise<void> {
    const widgetPath = path.join(this.widgetsDir, widgetDirName)
    const manifestPath = path.join(widgetPath, 'manifest.json')

    try {
      // 检查 manifest.json 是否存在
      if (!fs.existsSync(manifestPath)) {
        console.warn(`[WidgetManager] No manifest.json found in ${widgetDirName}`)
        return
      }

      // 读取并解析 manifest
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8')
      const manifest: WidgetManifest = JSON.parse(manifestContent)

      // 验证必需字段
      if (!manifest.id || !manifest.name || !manifest.type) {
        console.warn(`[WidgetManager] Invalid manifest in ${widgetDirName}`)
        return
      }

      const loadedWidget: LoadedWidget = {
        manifest,
        dirPath: widgetPath
      }

      // 如果是 advanced 类型，加载 HTML 内容
      if (manifest.type === 'advanced') {
        // 加载折叠状态的 HTML（如果有）
        if (manifest.entry) {
          const htmlPath = path.join(widgetPath, manifest.entry)
          if (fs.existsSync(htmlPath)) {
            loadedWidget.htmlContent = fs.readFileSync(htmlPath, 'utf-8')
          } else {
            console.warn(`[WidgetManager] Entry file not found: ${manifest.entry}`)
          }
        }

        // 加载展开状态的 HTML（如果有）
        if (manifest.expandedEntry) {
          const expandedHtmlPath = path.join(widgetPath, manifest.expandedEntry)
          if (fs.existsSync(expandedHtmlPath)) {
            loadedWidget.expandedHtmlContent = fs.readFileSync(expandedHtmlPath, 'utf-8')
          } else {
            console.warn(`[WidgetManager] Expanded entry file not found: ${manifest.expandedEntry}`)
          }
        }
      }

      this.widgets.set(manifest.id, loadedWidget)
      console.log(`[WidgetManager] Loaded widget: ${manifest.name} (${manifest.id})`)
    } catch (error) {
      console.error(`[WidgetManager] Error loading widget ${widgetDirName}:`, error)
    }
  }

  /**
   * 获取所有组件列表
   */
  getAllWidgets(): WidgetManifest[] {
    return Array.from(this.widgets.values()).map((widget) => widget.manifest)
  }

  /**
   * 根据 ID 获取组件
   */
  getWidget(id: string): LoadedWidget | undefined {
    return this.widgets.get(id)
  }

  /**
   * 重新加载所有组件
   */
  async reload(): Promise<void> {
    this.widgets.clear()
    await this.scanWidgets()
    console.log(`[WidgetManager] Reloaded ${this.widgets.size} widgets`)
  }

  /**
   * 获取组件的运行时数据
   * 用于 simple 类型组件的数据生成
   */
  getWidgetData(widgetId: string): any {
    const widget = this.widgets.get(widgetId)
    if (!widget || widget.manifest.type !== 'simple') {
      return null
    }

    const manifest = widget.manifest

    // 根据组件 ID 返回相应数据
    switch (widgetId) {
      case 'built-in-clock':
        return this.getClockData(manifest.config?.format || 'HH:mm:ss')
      case 'built-in-date':
        return this.getDateData(manifest.config?.format || 'YYYY-MM-DD')
      case 'built-in-system-monitor':
        return this.getSystemMonitorData()
      default:
        return null
    }
  }

  /**
   * 获取时钟数据
   */
  private getClockData(format: string): { time: string } {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')

    let timeString = format.replace('HH', hours).replace('mm', minutes).replace('ss', seconds)

    return { time: timeString }
  }

  /**
   * 获取日期数据
   */
  private getDateData(format: string): { date: string } {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    let dateString = format.replace('YYYY', String(year)).replace('MM', month).replace('DD', day)

    return { date: dateString }
  }

  /**
   * 获取系统监控数据
   */
  private getSystemMonitorData(): { cpu: string; memory: string; network: string } {
    // CPU 使用率（通过 CPU 负载计算）
    const cpuUsage = this.getCpuUsage()

    // 内存使用率
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const usedMemory = totalMemory - freeMemory
    const memoryUsage = Math.round((usedMemory / totalMemory) * 100)

    // 网络状态（简化版：根据网络接口判断）
    const networkStatus = this.getNetworkStatus()

    return {
      cpu: String(cpuUsage),
      memory: String(memoryUsage),
      network: networkStatus
    }
  }

  /**
   * 获取 CPU 使用率
   * 基于系统负载平均值计算（简化实现）
   */
  private getCpuUsage(): number {
    const cpus = os.cpus()
    const cpuCount = cpus.length

    // 计算所有 CPU 核心的平均使用率
    let totalIdle = 0
    let totalTick = 0

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times]
      }
      totalIdle += cpu.times.idle
    })

    const idle = totalIdle / cpuCount
    const total = totalTick / cpuCount
    const usage = 100 - Math.floor((idle / total) * 100)

    return Math.max(0, Math.min(100, usage))
  }

  /**
   * 获取网络状态
   */
  private getNetworkStatus(): string {
    const networkInterfaces = os.networkInterfaces()
    let hasActiveConnection = false

    // 检查是否有活动的非本地网络接口
    for (const name in networkInterfaces) {
      const interfaces = networkInterfaces[name]
      if (!interfaces) continue

      for (const iface of interfaces) {
        // 跳过内部（本地回环）和非 IPv4 接口
        if (iface.internal || iface.family !== 'IPv4') continue

        // 有外部 IPv4 地址说明网络连接正常
        if (iface.address && iface.address !== '127.0.0.1') {
          hasActiveConnection = true
          break
        }
      }

      if (hasActiveConnection) break
    }

    return hasActiveConnection ? '已连接' : '未连接'
  }
}

// 单例模式
let widgetManagerInstance: DynamicIslandWidgetManager | null = null

export function getWidgetManager(): DynamicIslandWidgetManager {
  if (!widgetManagerInstance) {
    widgetManagerInstance = new DynamicIslandWidgetManager()
  }
  return widgetManagerInstance
}

export async function initializeWidgetManager(): Promise<void> {
  const manager = getWidgetManager()
  await manager.initialize()
}
