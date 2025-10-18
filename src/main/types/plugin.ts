import { IpcMainInvokeEvent } from 'electron'

/**
 * 插件权限枚举
 */
export enum PluginPermission {
  SETTINGS_READ = 'settings:read', // 读取应用设置
  SETTINGS_WRITE = 'settings:write', // 写入应用设置
  AI_CONFIG = 'ai:config', // 访问 AI 配置
  FS_READ = 'fs:read', // 文件系统读取（受限路径）
  FS_WRITE = 'fs:write', // 文件系统写入（受限路径）
  DIALOG = 'dialog', // 打开系统对话框
  NOTIFICATION = 'notification', // 显示系统通知
  CLIPBOARD = 'clipboard', // 访问剪贴板
  NETWORK = 'network', // 网络请求（未来）
  SHELL = 'shell' // 执行 Shell 命令（未来，高风险）
}

/**
 * 插件清单接口
 */
export interface PluginManifest {
  id: string // 唯一标识符（kebab-case）
  name: string // 显示名称
  version: string // 语义化版本
  description: string // 插件描述
  keywords: string[] // 关键词标签（必选）
  author?: string // 作者
  icon?: string // 插件图标（相对路径）
  homepage?: string // 插件主页

  fingertips: {
    minVersion: string // 最小支持版本
    maxVersion?: string // 最大支持版本
  }

  main: string // 主进程入口
  renderer?: string // 渲染进程入口

  permissions: PluginPermission[] // 权限声明

  ui?: {
    hasSettings?: boolean // 是否有配置界面
    hasPanel?: boolean // 是否有功能面板
    settingsComponent?: string // 配置组件路径
    panelComponent?: string // 面板组件路径
  }

  config?: {
    schema?: string // 配置验证模式
    defaults?: Record<string, any> // 默认配置
  }

  lifecycle?: {
    onLoad?: boolean // 是否在应用启动时加载
    onActivate?: boolean // 是否在用户激活时加载
  }
}

/**
 * 插件配置接口
 */
export interface PluginConfig {
  get(key: string): Promise<any>
  set(key: string, value: any): Promise<void>
  getAll(): Promise<Record<string, any>>
  setAll(config: Record<string, any>): Promise<void>
  onChange(key: string, callback: (newValue: any, oldValue: any) => void): void
}

/**
 * 插件 API - Settings
 */
export interface PluginAPISettings {
  getAIConfig(): Promise<{
    baseUrl: string
    apiKey: string
    models: string[]
    defaultModel: string
  }>
  getSettings(): Promise<any>
  getSetting(key: string): Promise<any>
}

/**
 * 插件 API - Dialog
 */
export interface PluginAPIDialog {
  showOpenDialog(options: any): Promise<string[] | undefined>
  showSaveDialog(options: any): Promise<string | undefined>
  showMessageBox(options: any): Promise<number>
}

/**
 * 插件 API - Notification
 */
export interface PluginAPINotification {
  show(options: { title: string; body: string; icon?: string }): void
}

/**
 * 插件 API - Clipboard
 */
export interface PluginAPIClipboard {
  readText(): string
  writeText(text: string): void
  readImage(): any
}

/**
 * 插件 API - File System (受限)
 */
export interface PluginAPIFileSystem {
  readFile(path: string, options?: { encoding?: string }): Promise<string | Buffer>
  writeFile(path: string, data: string | Buffer, options?: { encoding?: string }): Promise<void>
  exists(path: string): Promise<boolean>
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>
  readdir(path: string): Promise<string[]>
}

/**
 * 插件 API - IPC
 */
export interface PluginAPIIPC {
  handle(channel: string, handler: (event: IpcMainInvokeEvent, ...args: any[]) => any): void
  send(channel: string, ...args: any[]): void
  on(channel: string, listener: (event: any, ...args: any[]) => void): void
}

/**
 * 插件 API 接口
 */
export interface PluginAPI {
  settings: PluginAPISettings
  dialog: PluginAPIDialog
  notification: PluginAPINotification
  clipboard: PluginAPIClipboard
  fs: PluginAPIFileSystem
  ipc: PluginAPIIPC
}

/**
 * 插件上下文接口
 */
export interface PluginContext {
  manifest: PluginManifest // 插件清单
  pluginDir: string // 插件目录路径
  api: PluginAPI // API 访问
  config: PluginConfig // 配置管理
  ipc: PluginAPIIPC // IPC 通信
}

/**
 * 插件生命周期接口
 */
export interface PluginLifecycle {
  /**
   * 插件激活时调用
   */
  activate(context: PluginContext): Promise<(() => void) | void> | (() => void) | void

  /**
   * 插件停用时调用
   */
  deactivate?(): Promise<void> | void

  /**
   * 执行插件功能
   */
  execute?(params: any): Promise<any>
}

/**
 * 插件实例接口
 */
export interface Plugin {
  manifest: PluginManifest // 插件清单
  context: PluginContext // 插件上下文
  lifecycle: PluginLifecycle // 生命周期处理
  module: any // 插件模块
  deactivate?: () => void // 清理函数
  enabled: boolean // 是否启用
  activated: boolean // 是否已激活
}

/**
 * 插件存储接口
 */
export interface PluginStoreData {
  enabled: Record<string, boolean> // 插件启用状态
  configs: Record<string, Record<string, any>> // 插件配置
  metadata: Record<string, Partial<PluginManifest>> // 插件元数据缓存
}
