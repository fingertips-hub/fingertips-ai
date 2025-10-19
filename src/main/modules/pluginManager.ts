import type { Plugin, PluginManifest, PluginContext } from '../types/plugin'
import {
  scanPlugins,
  loadPluginModule,
  unloadPluginModule,
  getPluginDirectory
} from './pluginLoader'
import { isPluginEnabled, setPluginEnabled, getEnabledPlugins } from './pluginStore'
import { createPluginAPI, createPluginConfigAPI } from './pluginAPI'
import { pluginWindowManager } from './pluginWindowManager'

/**
 * 插件管理器
 * 负责插件的生命周期管理、权限验证等
 */

class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private initialized: boolean = false

  /**
   * 初始化插件管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('PluginManager already initialized')
      return
    }

    console.log('Initializing Plugin Manager...')

    try {
      // 扫描所有插件
      const manifests = await scanPlugins()
      console.log(`Found ${manifests.length} plugin(s)`)

      // 加载所有插件（但不激活）
      for (const manifest of manifests) {
        await this.loadPlugin(manifest)
      }

      // 激活所有已启用的插件
      const enabledPluginIds = await getEnabledPlugins()
      for (const pluginId of enabledPluginIds) {
        const plugin = this.plugins.get(pluginId)
        if (plugin && !plugin.activated) {
          await this.activatePlugin(pluginId)
        }
      }

      this.initialized = true
      console.log('Plugin Manager initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Plugin Manager:', error)
      throw error
    }
  }

  /**
   * 加载插件
   */
  private async loadPlugin(manifest: PluginManifest): Promise<void> {
    try {
      // 检查插件是否已加载
      if (this.plugins.has(manifest.id)) {
        console.warn(`Plugin ${manifest.id} is already loaded`)
        return
      }

      // 加载插件模块
      const lifecycle = await loadPluginModule(manifest)
      if (!lifecycle) {
        console.error(`Failed to load plugin module: ${manifest.id}`)
        return
      }

      // 创建插件上下文
      const context: PluginContext = {
        manifest,
        pluginDir: getPluginDirectory(manifest.id),
        api: createPluginAPI(manifest),
        config: createPluginConfigAPI(manifest),
        ipc: createPluginAPI(manifest).ipc
      }

      // 创建插件实例
      const plugin: Plugin = {
        manifest,
        context,
        lifecycle,
        module: lifecycle,
        enabled: await isPluginEnabled(manifest.id),
        activated: false
      }

      this.plugins.set(manifest.id, plugin)
      console.log(`Loaded plugin: ${manifest.name} (${manifest.id})`)
    } catch (error) {
      console.error(`Failed to load plugin ${manifest.id}:`, error)
    }
  }

  /**
   * 激活插件
   */
  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }

    if (plugin.activated) {
      console.warn(`Plugin ${pluginId} is already activated`)
      return
    }

    try {
      console.log(`Activating plugin: ${plugin.manifest.name} (${pluginId})`)

      // 调用插件的 activate 方法
      const deactivate = await plugin.lifecycle.activate(plugin.context)

      // 保存清理函数
      if (typeof deactivate === 'function') {
        plugin.deactivate = deactivate
      }

      plugin.activated = true
      plugin.enabled = true

      // 更新启用状态
      await setPluginEnabled(pluginId, true)

      console.log(`Plugin activated: ${plugin.manifest.name}`)
    } catch (error) {
      console.error(`Failed to activate plugin ${pluginId}:`, error)
      throw error
    }
  }

  /**
   * 停用插件
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }

    if (!plugin.activated) {
      console.warn(`Plugin ${pluginId} is not activated`)
      return
    }

    try {
      console.log(`Deactivating plugin: ${plugin.manifest.name} (${pluginId})`)

      // 关闭插件创建的所有窗口
      pluginWindowManager.closePluginWindows(pluginId)

      // 调用插件的 deactivate 方法
      if (plugin.lifecycle.deactivate) {
        await plugin.lifecycle.deactivate()
      }

      // 调用清理函数
      if (plugin.deactivate) {
        plugin.deactivate()
      }

      plugin.activated = false
      plugin.enabled = false

      // 更新启用状态
      await setPluginEnabled(pluginId, false)

      console.log(`Plugin deactivated: ${plugin.manifest.name}`)
    } catch (error) {
      console.error(`Failed to deactivate plugin ${pluginId}:`, error)
      throw error
    }
  }

  /**
   * 执行插件
   */
  async executePlugin(pluginId: string, params?: any): Promise<any> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }

    if (!plugin.activated) {
      throw new Error(`Plugin ${pluginId} is not activated`)
    }

    if (!plugin.lifecycle.execute) {
      throw new Error(`Plugin ${pluginId} does not implement execute method`)
    }

    try {
      console.log(`Executing plugin: ${plugin.manifest.name} (${pluginId})`)
      const result = await plugin.lifecycle.execute(params)
      console.log(`Plugin execution completed: ${pluginId}`)
      return result
    } catch (error) {
      console.error(`Failed to execute plugin ${pluginId}:`, error)
      throw error
    }
  }

  /**
   * 重新加载插件
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }

    const wasActivated = plugin.activated

    try {
      console.log(`Reloading plugin: ${plugin.manifest.name} (${pluginId})`)

      // 先停用插件
      if (wasActivated) {
        await this.deactivatePlugin(pluginId)
      }

      // 卸载模块
      unloadPluginModule(plugin.manifest)

      // 移除插件实例
      this.plugins.delete(pluginId)

      // 重新扫描并加载插件
      const manifests = await scanPlugins()
      const manifest = manifests.find((m) => m.id === pluginId)

      if (!manifest) {
        throw new Error(`Plugin manifest not found after reload: ${pluginId}`)
      }

      await this.loadPlugin(manifest)

      // 如果之前是激活状态，重新激活
      if (wasActivated) {
        await this.activatePlugin(pluginId)
      }

      console.log(`Plugin reloaded: ${manifest.name}`)
    } catch (error) {
      console.error(`Failed to reload plugin ${pluginId}:`, error)
      throw error
    }
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map((plugin) => ({
      ...plugin.manifest,
      enabled: plugin.enabled,
      activated: plugin.activated
    }))
  }

  /**
   * 获取已启用的插件
   * 注意：只返回已激活的插件，因为只有激活的插件才能执行
   */
  getEnabledPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values())
      .filter((plugin) => plugin.enabled && plugin.activated)
      .map((plugin) => ({
        ...plugin.manifest,
        enabled: plugin.enabled,
        activated: plugin.activated
      }))
  }

  /**
   * 获取已激活的插件
   */
  getActivatedPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values())
      .filter((plugin) => plugin.activated)
      .map((plugin) => ({
        ...plugin.manifest,
        enabled: plugin.enabled,
        activated: plugin.activated
      }))
  }

  /**
   * 获取插件实例
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId)
  }

  /**
   * 切换插件启用状态
   */
  async togglePlugin(pluginId: string, enabled: boolean): Promise<void> {
    if (enabled) {
      await this.activatePlugin(pluginId)
    } else {
      await this.deactivatePlugin(pluginId)
    }
  }

  /**
   * 清理所有插件
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up Plugin Manager...')

    for (const [pluginId, plugin] of this.plugins.entries()) {
      if (plugin.activated) {
        try {
          await this.deactivatePlugin(pluginId)
        } catch (error) {
          console.error(`Failed to deactivate plugin ${pluginId} during cleanup:`, error)
        }
      }
    }

    // 清理所有插件窗口
    pluginWindowManager.cleanup()

    this.plugins.clear()
    this.initialized = false
    console.log('Plugin Manager cleaned up')
  }
}

// 导出单例
export const pluginManager = new PluginManager()

// 导出类型
export type { PluginManager }
