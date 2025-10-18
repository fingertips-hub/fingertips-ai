import { dialog, clipboard, Notification, nativeImage, ipcMain } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import type { PluginAPI, PluginManifest, PluginPermission, PluginConfig } from '../types/plugin'
import { getSettings, getSetting } from './settingsStore'
import { getPluginConfig, setPluginConfig, setPluginConfigValue } from './pluginStore'
import { getPluginDirectory } from './pluginLoader'
import { app } from 'electron'

/**
 * 插件 API 提供者
 * 为插件提供受限的 API 访问
 */

/**
 * 检查插件是否有指定权限
 */
function hasPermission(manifest: PluginManifest, permission: PluginPermission): boolean {
  return manifest.permissions.includes(permission)
}

/**
 * 权限检查装饰器
 */
function requirePermission(permission: PluginPermission) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (this: any, ...args: any[]) {
      const manifest = this.manifest as PluginManifest

      if (!hasPermission(manifest, permission)) {
        throw new Error(
          `Plugin ${manifest.id} does not have permission: ${permission}. Please declare it in manifest.json`
        )
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * 创建插件 API
 */
export function createPluginAPI(manifest: PluginManifest): PluginAPI {
  const pluginDir = getPluginDirectory(manifest.id)

  /**
   * Settings API
   */
  const settingsAPI = {
    async getAIConfig() {
      if (!hasPermission(manifest, 'ai:config' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: ai:config`)
      }

      const settings = await getSettings()
      return {
        baseUrl: settings.aiBaseUrl || '',
        apiKey: settings.aiApiKey || '',
        models: settings.aiModels || [],
        defaultModel: settings.aiDefaultModel || ''
      }
    },

    async getSettings() {
      if (!hasPermission(manifest, 'settings:read' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: settings:read`)
      }

      return await getSettings()
    },

    async getSetting(key: string) {
      if (!hasPermission(manifest, 'settings:read' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: settings:read`)
      }

      return await getSetting(key as any)
    }
  }

  /**
   * Dialog API
   */
  const dialogAPI = {
    async showOpenDialog(options: any) {
      if (!hasPermission(manifest, 'dialog' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: dialog`)
      }

      const result = await dialog.showOpenDialog(options)
      return result.canceled ? undefined : result.filePaths
    },

    async showSaveDialog(options: any) {
      if (!hasPermission(manifest, 'dialog' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: dialog`)
      }

      const result = await dialog.showSaveDialog(options)
      return result.canceled ? undefined : result.filePath
    },

    async showMessageBox(options: any) {
      if (!hasPermission(manifest, 'dialog' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: dialog`)
      }

      const result = await dialog.showMessageBox(options)
      return result.response
    }
  }

  /**
   * Notification API
   */
  const notificationAPI = {
    show(options: { title: string; body: string; icon?: string }) {
      if (!hasPermission(manifest, 'notification' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: notification`)
      }

      const notification = new Notification({
        title: options.title,
        body: options.body,
        icon: options.icon
      })

      notification.show()
    }
  }

  /**
   * Clipboard API
   */
  const clipboardAPI = {
    readText() {
      if (!hasPermission(manifest, 'clipboard' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: clipboard`)
      }

      return clipboard.readText()
    },

    writeText(text: string) {
      if (!hasPermission(manifest, 'clipboard' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: clipboard`)
      }

      clipboard.writeText(text)
    },

    readImage() {
      if (!hasPermission(manifest, 'clipboard' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: clipboard`)
      }

      return clipboard.readImage()
    }
  }

  /**
   * File System API (受限)
   */
  const fsAPI = {
    async readFile(filePath: string, options?: { encoding?: string }) {
      if (!hasPermission(manifest, 'fs:read' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: fs:read`)
      }

      // 安全检查：只允许读取插件目录内的文件或用户数据目录
      const normalizedPath = path.normalize(path.resolve(filePath))
      const normalizedPluginDir = path.normalize(pluginDir)
      const normalizedUserDataDir = path.normalize(app.getPath('userData'))

      if (
        !normalizedPath.startsWith(normalizedPluginDir) &&
        !normalizedPath.startsWith(normalizedUserDataDir)
      ) {
        throw new Error(
          'Access denied: Can only read files in plugin directory or user data directory'
        )
      }

      if (options?.encoding) {
        return await fs.readFile(filePath, { encoding: options.encoding as BufferEncoding })
      } else {
        return await fs.readFile(filePath)
      }
    },

    async writeFile(filePath: string, data: string | Buffer, options?: { encoding?: string }) {
      if (!hasPermission(manifest, 'fs:write' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: fs:write`)
      }

      // 安全检查：只允许写入插件目录内的文件或用户数据目录
      const normalizedPath = path.normalize(path.resolve(filePath))
      const normalizedPluginDir = path.normalize(pluginDir)
      const normalizedUserDataDir = path.normalize(app.getPath('userData'))

      if (
        !normalizedPath.startsWith(normalizedPluginDir) &&
        !normalizedPath.startsWith(normalizedUserDataDir)
      ) {
        throw new Error(
          'Access denied: Can only write files in plugin directory or user data directory'
        )
      }

      if (options?.encoding) {
        await fs.writeFile(filePath, data, { encoding: options.encoding as BufferEncoding })
      } else {
        await fs.writeFile(filePath, data)
      }
    },

    async exists(filePath: string) {
      if (!hasPermission(manifest, 'fs:read' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: fs:read`)
      }

      try {
        await fs.access(filePath)
        return true
      } catch {
        return false
      }
    },

    async mkdir(dirPath: string, options?: { recursive?: boolean }) {
      if (!hasPermission(manifest, 'fs:write' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: fs:write`)
      }

      // 安全检查
      const normalizedPath = path.normalize(path.resolve(dirPath))
      const normalizedPluginDir = path.normalize(pluginDir)
      const normalizedUserDataDir = path.normalize(app.getPath('userData'))

      if (
        !normalizedPath.startsWith(normalizedPluginDir) &&
        !normalizedPath.startsWith(normalizedUserDataDir)
      ) {
        throw new Error(
          'Access denied: Can only create directories in plugin directory or user data directory'
        )
      }

      await fs.mkdir(dirPath, { recursive: options?.recursive })
    },

    async readdir(dirPath: string) {
      if (!hasPermission(manifest, 'fs:read' as PluginPermission)) {
        throw new Error(`Plugin ${manifest.id} does not have permission: fs:read`)
      }

      // 安全检查
      const normalizedPath = path.normalize(path.resolve(dirPath))
      const normalizedPluginDir = path.normalize(pluginDir)
      const normalizedUserDataDir = path.normalize(app.getPath('userData'))

      if (
        !normalizedPath.startsWith(normalizedPluginDir) &&
        !normalizedPath.startsWith(normalizedUserDataDir)
      ) {
        throw new Error(
          'Access denied: Can only read directories in plugin directory or user data directory'
        )
      }

      return await fs.readdir(dirPath)
    }
  }

  /**
   * IPC API
   */
  const ipcAPI = {
    handle(channel: string, handler: (event: any, ...args: any[]) => any) {
      // 确保 channel 以插件 ID 为前缀，避免命名冲突
      const prefixedChannel = `plugin:${manifest.id}:${channel}`
      ipcMain.handle(prefixedChannel, handler)
    },

    send(channel: string, ...args: any[]) {
      // 确保 channel 以插件 ID 为前缀
      const prefixedChannel = `plugin:${manifest.id}:${channel}`
      // 注意：这里需要知道目标窗口，实际实现可能需要传入 window 参数
      // 暂时先这样定义，后续可以改进
    },

    on(channel: string, listener: (event: any, ...args: any[]) => void) {
      // 确保 channel 以插件 ID 为前缀
      const prefixedChannel = `plugin:${manifest.id}:${channel}`
      ipcMain.on(prefixedChannel, listener)
    }
  }

  return {
    settings: settingsAPI,
    dialog: dialogAPI,
    notification: notificationAPI,
    clipboard: clipboardAPI,
    fs: fsAPI,
    ipc: ipcAPI
  }
}

/**
 * 创建插件配置 API
 */
export function createPluginConfigAPI(manifest: PluginManifest): PluginConfig {
  // 配置变化监听器
  const changeListeners: Map<string, Array<(newValue: any, oldValue: any) => void>> = new Map()

  return {
    async get(key: string) {
      const config = await getPluginConfig(manifest.id)
      return config[key]
    },

    async set(key: string, value: any) {
      const oldValue = await this.get(key)
      await setPluginConfigValue(manifest.id, key, value)

      // 触发变化监听器
      const listeners = changeListeners.get(key)
      if (listeners) {
        listeners.forEach((listener) => listener(value, oldValue))
      }
    },

    async getAll() {
      return await getPluginConfig(manifest.id)
    },

    async setAll(config: Record<string, any>) {
      await setPluginConfig(manifest.id, config)
    },

    onChange(key: string, callback: (newValue: any, oldValue: any) => void) {
      if (!changeListeners.has(key)) {
        changeListeners.set(key, [])
      }
      changeListeners.get(key)!.push(callback)
    }
  }
}
