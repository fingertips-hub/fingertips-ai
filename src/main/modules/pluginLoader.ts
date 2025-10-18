import { app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import type { PluginManifest, PluginLifecycle } from '../types/plugin'

/**
 * 插件加载器模块
 * 负责扫描、验证和加载插件
 */

/**
 * 获取插件目录路径
 */
export function getPluginsDirectory(): string {
  // 在开发环境中使用项目根目录的 plugins 文件夹
  // 在生产环境中使用应用数据目录的 plugins 文件夹
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'plugins')
  } else {
    return path.join(process.cwd(), 'plugins')
  }
}

/**
 * 确保插件目录存在
 */
export async function ensurePluginsDirectory(): Promise<void> {
  const pluginsDir = getPluginsDirectory()
  try {
    await fs.access(pluginsDir)
  } catch {
    await fs.mkdir(pluginsDir, { recursive: true })
    console.log('Created plugins directory:', pluginsDir)
  }
}

/**
 * 扫描插件目录
 */
export async function scanPlugins(): Promise<PluginManifest[]> {
  await ensurePluginsDirectory()
  const pluginsDir = getPluginsDirectory()

  try {
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true })
    const pluginDirs = entries.filter((entry) => entry.isDirectory())

    const manifests: PluginManifest[] = []

    for (const dir of pluginDirs) {
      const pluginPath = path.join(pluginsDir, dir.name)
      const manifestPath = path.join(pluginPath, 'manifest.json')

      try {
        // 读取 manifest.json
        const manifestContent = await fs.readFile(manifestPath, 'utf-8')
        const manifest = JSON.parse(manifestContent) as PluginManifest

        // 验证插件
        if (validateManifest(manifest, pluginPath)) {
          manifests.push(manifest)
          console.log(`Found plugin: ${manifest.name} (${manifest.id})`)
        } else {
          console.warn(`Invalid plugin manifest: ${pluginPath}`)
        }
      } catch (error) {
        console.error(`Failed to load plugin from ${pluginPath}:`, error)
      }
    }

    return manifests
  } catch (error) {
    console.error('Failed to scan plugins directory:', error)
    return []
  }
}

/**
 * 验证插件清单
 */
export function validateManifest(manifest: PluginManifest, pluginPath: string): boolean {
  // 检查必需字段
  if (!manifest.id || typeof manifest.id !== 'string') {
    console.error(`Plugin at ${pluginPath}: Missing or invalid 'id'`)
    return false
  }

  if (!manifest.name || typeof manifest.name !== 'string') {
    console.error(`Plugin ${manifest.id}: Missing or invalid 'name'`)
    return false
  }

  if (!manifest.version || typeof manifest.version !== 'string') {
    console.error(`Plugin ${manifest.id}: Missing or invalid 'version'`)
    return false
  }

  if (!manifest.description || typeof manifest.description !== 'string') {
    console.error(`Plugin ${manifest.id}: Missing or invalid 'description'`)
    return false
  }

  if (!Array.isArray(manifest.keywords) || manifest.keywords.length === 0) {
    console.error(`Plugin ${manifest.id}: Missing or invalid 'keywords' array (must be non-empty)`)
    return false
  }

  if (!manifest.keywords.every((k) => typeof k === 'string')) {
    console.error(`Plugin ${manifest.id}: Invalid 'keywords' - all items must be strings`)
    return false
  }

  if (!manifest.main || typeof manifest.main !== 'string') {
    console.error(`Plugin ${manifest.id}: Missing or invalid 'main' entry point`)
    return false
  }

  if (!manifest.fingertips || !manifest.fingertips.minVersion) {
    console.error(`Plugin ${manifest.id}: Missing 'fingertips.minVersion'`)
    return false
  }

  if (!Array.isArray(manifest.permissions)) {
    console.error(`Plugin ${manifest.id}: Missing or invalid 'permissions' array`)
    return false
  }

  // 验证版本兼容性
  if (!isVersionCompatible(manifest)) {
    console.error(`Plugin ${manifest.id}: Version incompatible with current app version`)
    return false
  }

  return true
}

/**
 * 验证版本兼容性
 */
function isVersionCompatible(manifest: PluginManifest): boolean {
  const appVersion = app.getVersion()
  const minVersion = manifest.fingertips.minVersion
  const maxVersion = manifest.fingertips.maxVersion

  // 简单的版本比较（实际应用中应使用 semver 库）
  if (compareVersion(appVersion, minVersion) < 0) {
    return false
  }

  if (maxVersion && compareVersion(appVersion, maxVersion) > 0) {
    return false
  }

  return true
}

/**
 * 简单的版本比较函数
 * 返回: -1 (v1 < v2), 0 (v1 == v2), 1 (v1 > v2)
 */
function compareVersion(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0

    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }

  return 0
}

/**
 * 加载插件模块
 */
export async function loadPluginModule(manifest: PluginManifest): Promise<PluginLifecycle | null> {
  const pluginsDir = getPluginsDirectory()
  const pluginPath = path.join(pluginsDir, manifest.id)
  const mainPath = path.join(pluginPath, manifest.main)

  try {
    // 检查主入口文件是否存在
    await fs.access(mainPath)

    // 动态加载插件模块
    // 清除 require 缓存以支持插件热重载
    delete require.cache[require.resolve(mainPath)]

    const pluginModule = require(mainPath)

    // 验证插件模块是否实现了必要的接口
    if (!pluginModule || typeof pluginModule !== 'object') {
      console.error(`Plugin ${manifest.id}: Invalid module export`)
      return null
    }

    if (typeof pluginModule.activate !== 'function') {
      console.error(`Plugin ${manifest.id}: Missing 'activate' function`)
      return null
    }

    return pluginModule as PluginLifecycle
  } catch (error) {
    console.error(`Failed to load plugin module ${manifest.id}:`, error)
    return null
  }
}

/**
 * 卸载插件模块
 */
export function unloadPluginModule(manifest: PluginManifest): void {
  const pluginsDir = getPluginsDirectory()
  const pluginPath = path.join(pluginsDir, manifest.id)
  const mainPath = path.join(pluginPath, manifest.main)

  try {
    // 清除 require 缓存
    delete require.cache[require.resolve(mainPath)]
    console.log(`Unloaded plugin module: ${manifest.id}`)
  } catch (error) {
    console.error(`Failed to unload plugin module ${manifest.id}:`, error)
  }
}

/**
 * 获取插件目录路径
 */
export function getPluginDirectory(pluginId: string): string {
  return path.join(getPluginsDirectory(), pluginId)
}

/**
 * 读取插件文件
 */
export async function readPluginFile(pluginId: string, filePath: string): Promise<string | Buffer> {
  const pluginDir = getPluginDirectory(pluginId)
  const fullPath = path.join(pluginDir, filePath)

  // 安全检查：确保文件在插件目录内
  const normalizedPath = path.normalize(fullPath)
  const normalizedPluginDir = path.normalize(pluginDir)

  if (!normalizedPath.startsWith(normalizedPluginDir)) {
    throw new Error('Access denied: Path outside plugin directory')
  }

  return await fs.readFile(fullPath)
}

/**
 * 检查插件文件是否存在
 */
export async function pluginFileExists(pluginId: string, filePath: string): Promise<boolean> {
  const pluginDir = getPluginDirectory(pluginId)
  const fullPath = path.join(pluginDir, filePath)

  try {
    await fs.access(fullPath)
    return true
  } catch {
    return false
  }
}
