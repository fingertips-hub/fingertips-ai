import { app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import AdmZip from 'adm-zip'
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
        const validation = validateManifest(manifest, pluginPath)
        if (validation.valid) {
          manifests.push(manifest)
          console.log(`Found plugin: ${manifest.name} (${manifest.id})`)
        } else {
          console.warn(`Invalid plugin manifest: ${pluginPath}`)
          console.warn(validation.errors.join('\n'))
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
export function validateManifest(
  manifest: PluginManifest,
  pluginPath: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 检查必需字段
  if (!manifest.id || typeof manifest.id !== 'string') {
    errors.push(`Plugin at ${pluginPath}: Missing or invalid 'id'`)
  }

  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push(`Plugin ${manifest.id || '(unknown)'}: Missing or invalid 'name'`)
  }

  if (!manifest.version || typeof manifest.version !== 'string') {
    errors.push(`Plugin ${manifest.id || '(unknown)'}: Missing or invalid 'version'`)
  }

  if (!manifest.description || typeof manifest.description !== 'string') {
    errors.push(`Plugin ${manifest.id || '(unknown)'}: Missing or invalid 'description'`)
  }

  if (!Array.isArray(manifest.keywords) || manifest.keywords.length === 0) {
    errors.push(
      `Plugin ${manifest.id || '(unknown)'}: Missing or invalid 'keywords' array (must be non-empty)`
    )
  } else if (!manifest.keywords.every((k) => typeof k === 'string')) {
    errors.push(`Plugin ${manifest.id || '(unknown)'}: Invalid 'keywords' - all items must be strings`)
  }

  if (!manifest.main || typeof manifest.main !== 'string') {
    errors.push(`Plugin ${manifest.id || '(unknown)'}: Missing or invalid 'main' entry point`)
  }

  if (!manifest.fingertips || !manifest.fingertips.minVersion) {
    errors.push(`Plugin ${manifest.id || '(unknown)'}: Missing 'fingertips.minVersion'`)
  }

  if (!Array.isArray(manifest.permissions)) {
    errors.push(`Plugin ${manifest.id || '(unknown)'}: Missing or invalid 'permissions' array`)
  }

  // 验证版本兼容性
  const versionCompatibility = checkVersionCompatibility(manifest)
  if (!versionCompatibility.compatible) {
    errors.push(versionCompatibility.reason)
  }

  const valid = errors.length === 0
  if (!valid) {
    for (const err of errors) {
      console.error(err)
    }
  }

  return { valid, errors }
}

/**
 * 验证版本兼容性
 */
function checkVersionCompatibility(manifest: PluginManifest): { compatible: boolean; reason: string } {
  const appVersion = app.getVersion()

  const minVersion = manifest.fingertips?.minVersion
  const maxVersion = manifest.fingertips?.maxVersion

  if (!minVersion) {
    return {
      compatible: false,
      reason: `Plugin ${manifest.id || '(unknown)'}: Missing 'fingertips.minVersion'`
    }
  }

  // 简单的版本比较（实际应用中应使用 semver 库）
  if (compareVersion(appVersion, minVersion) < 0) {
    return {
      compatible: false,
      reason: `Plugin ${manifest.id || '(unknown)'}: Version incompatible (app=${appVersion}, min=${minVersion})`
    }
  }

  if (maxVersion && compareVersion(appVersion, maxVersion) > 0) {
    return {
      compatible: false,
      reason: `Plugin ${manifest.id || '(unknown)'}: Version incompatible (app=${appVersion}, max=${maxVersion})`
    }
  }

  return { compatible: true, reason: '' }
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

    // 动态加载插件模块（使用 import 而不是 require）
    // 注意：这里仍使用 require 是因为 ESM dynamic import 在某些场景下有缓存问题
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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

/**
 * 插件安装结果接口
 */
export interface PluginInstallResult {
  success: boolean
  manifest?: PluginManifest
  error?: string
  pluginId?: string
}

/**
 * 从 ZIP 文件安装插件
 * @param zipPath ZIP 文件的绝对路径
 * @returns 安装结果
 */
export async function installPluginFromZip(zipPath: string): Promise<PluginInstallResult> {
  let tempDir: string | null = null

  try {
    // 1. 验证 ZIP 文件存在
    try {
      await fs.access(zipPath)
    } catch {
      return { success: false, error: 'ZIP 文件不存在' }
    }

    // 2. 验证文件大小（限制为 100MB）
    const stats = await fs.stat(zipPath)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (stats.size > maxSize) {
      return { success: false, error: `ZIP 文件过大（最大 ${maxSize / 1024 / 1024}MB）` }
    }

    // 3. 解压到临时目录
    tempDir = await extractZipToTemp(zipPath)
    console.log(`Extracted plugin to temp directory: ${tempDir}`)

    // 4. 验证插件包结构
    const manifest = await validatePluginPackage(tempDir)
    console.log(`Validated plugin: ${manifest.name} (${manifest.id})`)

    // 5. 检查插件是否已存在
    const pluginsDir = getPluginsDirectory()
    const targetPluginDir = path.join(pluginsDir, manifest.id)

    try {
      await fs.access(targetPluginDir)
      // 插件已存在，询问是否覆盖（这里直接返回错误，由调用者决定）
      return {
        success: false,
        error: `插件 "${manifest.name}" (${manifest.id}) 已存在。请先卸载旧版本或使用更新功能。`,
        pluginId: manifest.id
      }
    } catch {
      // 插件不存在，继续安装
    }

    // 6. 移动插件到正式目录
    await movePluginToDirectory(tempDir, manifest.id)
    console.log(`Installed plugin to: ${targetPluginDir}`)

    // 7. 清理临时目录
    await cleanupTempDirectory(tempDir)
    tempDir = null

    return {
      success: true,
      manifest,
      pluginId: manifest.id
    }
  } catch (error) {
    console.error('Failed to install plugin from ZIP:', error)

    // 清理临时目录
    if (tempDir) {
      await cleanupTempDirectory(tempDir).catch((err) => {
        console.error('Failed to cleanup temp directory:', err)
      })
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '安装插件时发生未知错误'
    }
  }
}

/**
 * 解压 ZIP 到临时目录
 */
async function extractZipToTemp(zipPath: string): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `fingertips-plugin-${Date.now()}`)
  await fs.mkdir(tempDir, { recursive: true })

  try {
    const zip = new AdmZip(zipPath)

    // 安全检查：验证 ZIP 中的文件路径，防止路径遍历攻击
    const entries = zip.getEntries()
    for (const entry of entries) {
      const entryPath = path.normalize(entry.entryName)

      // 检查是否包含路径遍历
      if (entryPath.includes('..') || path.isAbsolute(entryPath)) {
        throw new Error(`不安全的文件路径: ${entry.entryName}`)
      }

      // 检查是否有可疑的文件类型（可选）
      const ext = path.extname(entryPath).toLowerCase()
      const dangerousExts = ['.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.ps1']
      if (dangerousExts.includes(ext)) {
        console.warn(`警告: ZIP 包含可执行文件 ${entryPath}`)
        // 注意：这里只是警告，不阻止安装，因为插件可能需要可执行文件
      }
    }

    // 解压所有文件
    zip.extractAllTo(tempDir, true)

    return tempDir
  } catch (error) {
    // 解压失败时清理临时目录
    await cleanupTempDirectory(tempDir).catch(() => {})
    throw new Error(`解压 ZIP 文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 验证插件包结构
 * 返回插件清单
 */
async function validatePluginPackage(extractedPath: string): Promise<PluginManifest> {
  // 检查是否有 manifest.json
  let manifestPath = path.join(extractedPath, 'manifest.json')
  let pluginRoot = extractedPath

  try {
    await fs.access(manifestPath)
  } catch {
    // 可能插件在子目录中（如 plugin-name/manifest.json）
    // 查找第一层子目录
    const entries = await fs.readdir(extractedPath, { withFileTypes: true })
    const subDirs = entries.filter((entry) => entry.isDirectory())

    if (subDirs.length === 1) {
      // 只有一个子目录，可能是插件根目录
      const subDirPath = path.join(extractedPath, subDirs[0].name)
      const subManifestPath = path.join(subDirPath, 'manifest.json')

      try {
        await fs.access(subManifestPath)
        manifestPath = subManifestPath
        pluginRoot = subDirPath
      } catch {
        throw new Error('插件包中未找到 manifest.json 文件')
      }
    } else {
      throw new Error('插件包中未找到 manifest.json 文件')
    }
  }

  // 读取和解析 manifest.json
  try {
    const manifestContent = await fs.readFile(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestContent) as PluginManifest

    // 验证插件清单
    const validation = validateManifest(manifest, pluginRoot)
    if (!validation.valid) {
      throw new Error(`插件清单验证失败: ${validation.errors.join('；')}`)
    }

    // 验证主入口文件是否存在
    const mainPath = path.join(pluginRoot, manifest.main)
    try {
      await fs.access(mainPath)
    } catch {
      throw new Error(`主入口文件不存在: ${manifest.main}`)
    }

    // 如果清单中指定了图标，验证图标文件是否存在
    if (manifest.icon) {
      const iconPath = path.join(pluginRoot, manifest.icon)
      try {
        await fs.access(iconPath)
      } catch {
        console.warn(`插件图标文件不存在: ${manifest.icon}`)
        // 图标不是必需的，只是警告
      }
    }

    return manifest
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('manifest.json 格式错误，无法解析 JSON')
    }
    throw error
  }
}

/**
 * 移动插件到正式插件目录
 */
async function movePluginToDirectory(tempPath: string, pluginId: string): Promise<void> {
  const pluginsDir = getPluginsDirectory()
  await ensurePluginsDirectory()

  const targetPath = path.join(pluginsDir, pluginId)

  // 检查临时目录结构
  // 如果临时目录中有单个子目录（插件名），则移动子目录内容
  const entries = await fs.readdir(tempPath, { withFileTypes: true })
  const subDirs = entries.filter((entry) => entry.isDirectory())

  let sourceDir = tempPath

  // 如果只有一个子目录，并且子目录中有 manifest.json，则使用子目录
  if (subDirs.length === 1 && entries.length === 1) {
    const subDirPath = path.join(tempPath, subDirs[0].name)
    const manifestPath = path.join(subDirPath, 'manifest.json')

    try {
      await fs.access(manifestPath)
      sourceDir = subDirPath
    } catch {
      // 使用原目录
    }
  }

  // 移动或复制目录
  try {
    await fs.rename(sourceDir, targetPath)
  } catch {
    // rename 可能失败（跨分区），使用复制方式
    console.log('Rename failed, copying directory instead...')
    await copyDirectory(sourceDir, targetPath)
  }
}

/**
 * 递归复制目录
 */
async function copyDirectory(source: string, target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true })

  const entries = await fs.readdir(source, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const targetPath = path.join(target, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath)
    } else {
      await fs.copyFile(sourcePath, targetPath)
    }
  }
}

/**
 * 清理临时目录
 */
async function cleanupTempDirectory(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true })
    console.log(`Cleaned up temp directory: ${tempDir}`)
  } catch (error) {
    console.error(`Failed to cleanup temp directory ${tempDir}:`, error)
    // 不抛出错误，因为临时目录清理失败不应影响主流程
  }
}

/**
 * 卸载插件
 * @param pluginId 插件 ID
 * @returns 是否成功卸载
 */
export async function uninstallPlugin(
  pluginId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const pluginDir = getPluginDirectory(pluginId)

    // 检查插件是否存在
    try {
      await fs.access(pluginDir)
    } catch {
      return { success: false, error: '插件不存在' }
    }

    // 删除插件目录
    await fs.rm(pluginDir, { recursive: true, force: true })
    console.log(`Uninstalled plugin: ${pluginId}`)

    return { success: true }
  } catch (error) {
    console.error(`Failed to uninstall plugin ${pluginId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '卸载插件时发生未知错误'
    }
  }
}

/**
 * 更新插件（先卸载再安装）
 * @param pluginId 要更新的插件 ID
 * @param zipPath 新版本插件的 ZIP 文件路径
 * @returns 安装结果
 */
export async function updatePlugin(
  pluginId: string,
  zipPath: string
): Promise<PluginInstallResult> {
  try {
    // 1. 备份旧插件的配置（如果需要）
    // 这里简化处理，直接卸载旧版本

    // 2. 卸载旧版本
    const uninstallResult = await uninstallPlugin(pluginId)
    if (!uninstallResult.success) {
      return {
        success: false,
        error: `卸载旧版本失败: ${uninstallResult.error}`
      }
    }

    // 3. 安装新版本
    const installResult = await installPluginFromZip(zipPath)

    // 4. 验证新插件的 ID 是否匹配
    if (installResult.success && installResult.pluginId !== pluginId) {
      // ID 不匹配，这可能不是同一个插件
      console.warn(`Plugin ID mismatch: expected ${pluginId}, got ${installResult.pluginId}`)
    }

    return installResult
  } catch (error) {
    console.error(`Failed to update plugin ${pluginId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新插件时发生未知错误'
    }
  }
}
