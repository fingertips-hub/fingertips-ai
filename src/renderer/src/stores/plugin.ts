import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 插件清单接口
 */
export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  keywords: string[] // 关键词标签（必选）
  author?: string
  icon?: string
  homepage?: string
  permissions: string[]
  ui?: {
    hasSettings?: boolean
    hasPanel?: boolean
    settingsComponent?: string
    panelComponent?: string
  }
  enabled?: boolean
  activated?: boolean
}

/**
 * 插件 Store
 * 管理插件列表、配置和操作
 */
export const usePluginStore = defineStore('plugin', () => {
  // State
  const plugins = ref<PluginManifest[]>([])
  const enabledPlugins = ref<PluginManifest[]>([])
  const currentPluginConfig = ref<any>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 加载所有插件
   * @param silent 静默加载（不显示 loading 状态）
   */
  async function loadPlugins(silent = false): Promise<void> {
    if (!silent) {
      isLoading.value = true
    }
    error.value = null

    try {
      if (!window.api?.plugin?.getAll) {
        throw new Error('Plugin API not available')
      }

      const result = await window.api.plugin.getAll()

      if (result.success && result.data) {
        plugins.value = result.data as PluginManifest[]
        console.log(`Loaded ${plugins.value.length} plugin(s)`)
      } else {
        throw new Error(result.error || 'Failed to load plugins')
      }
    } catch (err) {
      console.error('Failed to load plugins:', err)
      error.value = (err as Error).message
      plugins.value = []
    } finally {
      if (!silent) {
        isLoading.value = false
      }
    }
  }

  /**
   * 加载已启用的插件
   * @param silent 静默加载（不显示 loading 状态）
   */
  async function loadEnabledPlugins(silent = false): Promise<void> {
    if (!silent) {
      isLoading.value = true
    }
    error.value = null

    try {
      if (!window.api?.plugin?.getEnabled) {
        throw new Error('Plugin API not available')
      }

      const result = await window.api.plugin.getEnabled()

      if (result.success && result.data) {
        enabledPlugins.value = result.data as PluginManifest[]
        console.log(`Loaded ${enabledPlugins.value.length} enabled plugin(s)`)
      } else {
        throw new Error(result.error || 'Failed to load enabled plugins')
      }
    } catch (err) {
      console.error('Failed to load enabled plugins:', err)
      error.value = (err as Error).message
      enabledPlugins.value = []
    } finally {
      if (!silent) {
        isLoading.value = false
      }
    }
  }

  /**
   * 切换插件状态
   */
  async function togglePlugin(pluginId: string, enabled: boolean): Promise<boolean> {
    try {
      if (!window.api?.plugin?.toggleEnabled) {
        throw new Error('Plugin API not available')
      }

      const result = await window.api.plugin.toggleEnabled(pluginId, enabled)

      if (result.success) {
        // 更新本地状态
        const plugin = plugins.value.find((p) => p.id === pluginId)
        if (plugin) {
          plugin.enabled = enabled
          plugin.activated = enabled
        }

        // 静默加载启用的插件列表（不触发 loading 状态，避免滚动位置丢失）
        await loadEnabledPlugins(true)

        console.log(`Plugin ${pluginId} ${enabled ? 'enabled' : 'disabled'}`)
        return true
      } else {
        throw new Error(result.error || 'Failed to toggle plugin')
      }
    } catch (err) {
      console.error(`Failed to toggle plugin ${pluginId}:`, err)
      error.value = (err as Error).message
      return false
    }
  }

  /**
   * 加载插件配置
   */
  async function loadPluginConfig(pluginId: string): Promise<any> {
    try {
      if (!window.api?.plugin?.getConfig) {
        throw new Error('Plugin API not available')
      }

      const result = await window.api.plugin.getConfig(pluginId)

      if (result.success) {
        currentPluginConfig.value = result.data
        return result.data
      } else {
        throw new Error(result.error || 'Failed to load plugin config')
      }
    } catch (err) {
      console.error(`Failed to load plugin config for ${pluginId}:`, err)
      error.value = (err as Error).message
      return null
    }
  }

  /**
   * 保存插件配置
   */
  async function savePluginConfig(pluginId: string, config: any): Promise<boolean> {
    try {
      if (!window.api?.plugin?.setConfig) {
        throw new Error('Plugin API not available')
      }

      const result = await window.api.plugin.setConfig(pluginId, config)

      if (result.success) {
        currentPluginConfig.value = config
        console.log(`Plugin config saved for ${pluginId}`)
        return true
      } else {
        throw new Error(result.error || 'Failed to save plugin config')
      }
    } catch (err) {
      console.error(`Failed to save plugin config for ${pluginId}:`, err)
      error.value = (err as Error).message
      return false
    }
  }

  /**
   * 执行插件
   */
  async function executePlugin(pluginId: string, params?: any): Promise<any> {
    try {
      if (!window.api?.plugin?.execute) {
        throw new Error('Plugin API not available')
      }

      const result = await window.api.plugin.execute(pluginId, params)

      if (result.success) {
        console.log(`Plugin ${pluginId} executed successfully`)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to execute plugin')
      }
    } catch (err) {
      console.error(`Failed to execute plugin ${pluginId}:`, err)
      error.value = (err as Error).message
      throw err
    }
  }

  /**
   * 重新加载插件
   */
  async function reloadPlugin(pluginId: string): Promise<boolean> {
    try {
      if (!window.api?.plugin?.reload) {
        throw new Error('Plugin API not available')
      }

      const result = await window.api.plugin.reload(pluginId)

      if (result.success) {
        // 静默加载插件列表（不触发 loading 状态，避免滚动位置丢失）
        await loadPlugins(true)
        console.log(`Plugin ${pluginId} reloaded`)
        return true
      } else {
        throw new Error(result.error || 'Failed to reload plugin')
      }
    } catch (err) {
      console.error(`Failed to reload plugin ${pluginId}:`, err)
      error.value = (err as Error).message
      return false
    }
  }

  /**
   * 获取插件详情
   */
  async function getPluginDetails(pluginId: string): Promise<any> {
    try {
      if (!window.api?.plugin?.getDetails) {
        throw new Error('Plugin API not available')
      }

      const result = await window.api.plugin.getDetails(pluginId)

      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error || 'Failed to get plugin details')
      }
    } catch (err) {
      console.error(`Failed to get plugin details for ${pluginId}:`, err)
      error.value = (err as Error).message
      return null
    }
  }

  /**
   * 清除错误
   */
  function clearError(): void {
    error.value = null
  }

  return {
    // State
    plugins,
    enabledPlugins,
    currentPluginConfig,
    isLoading,
    error,

    // Actions
    loadPlugins,
    loadEnabledPlugins,
    togglePlugin,
    loadPluginConfig,
    savePluginConfig,
    executePlugin,
    reloadPlugin,
    getPluginDetails,
    clearError
  }
})
