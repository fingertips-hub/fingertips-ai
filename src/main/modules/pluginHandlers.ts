import { ipcMain } from 'electron'
import { pluginManager } from './pluginManager'
import { getPluginConfig, setPluginConfig } from './pluginStore'

/**
 * 插件 IPC 处理器
 * 处理渲染进程的插件相关请求
 */

/**
 * 注册所有插件相关的 IPC 处理器
 */
export function setupPluginHandlers(): void {
  console.log('Setting up plugin IPC handlers...')

  /**
   * 获取所有插件
   */
  ipcMain.handle('plugin:get-all', async () => {
    try {
      const plugins = pluginManager.getAllPlugins()
      return { success: true, data: plugins }
    } catch (error) {
      console.error('Failed to get all plugins:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  /**
   * 获取已启用的插件
   */
  ipcMain.handle('plugin:get-enabled', async () => {
    try {
      const plugins = pluginManager.getEnabledPlugins()
      return { success: true, data: plugins }
    } catch (error) {
      console.error('Failed to get enabled plugins:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  /**
   * 切换插件启用状态
   */
  ipcMain.handle('plugin:toggle-enabled', async (_event, pluginId: string, enabled: boolean) => {
    try {
      await pluginManager.togglePlugin(pluginId, enabled)
      return { success: true }
    } catch (error) {
      console.error(`Failed to toggle plugin ${pluginId}:`, error)
      return { success: false, error: (error as Error).message }
    }
  })

  /**
   * 获取插件配置
   */
  ipcMain.handle('plugin:get-config', async (_event, pluginId: string) => {
    try {
      const config = await getPluginConfig(pluginId)
      return { success: true, data: config }
    } catch (error) {
      console.error(`Failed to get plugin config for ${pluginId}:`, error)
      return { success: false, error: (error as Error).message }
    }
  })

  /**
   * 设置插件配置
   */
  ipcMain.handle('plugin:set-config', async (_event, pluginId: string, config: any) => {
    try {
      await setPluginConfig(pluginId, config)
      return { success: true }
    } catch (error) {
      console.error(`Failed to set plugin config for ${pluginId}:`, error)
      return { success: false, error: (error as Error).message }
    }
  })

  /**
   * 执行插件
   */
  ipcMain.handle('plugin:execute', async (_event, pluginId: string, params: any) => {
    try {
      const result = await pluginManager.executePlugin(pluginId, params)
      return { success: true, data: result }
    } catch (error) {
      console.error(`Failed to execute plugin ${pluginId}:`, error)
      return { success: false, error: (error as Error).message }
    }
  })

  /**
   * 重新加载插件
   */
  ipcMain.handle('plugin:reload', async (_event, pluginId: string) => {
    try {
      await pluginManager.reloadPlugin(pluginId)
      return { success: true }
    } catch (error) {
      console.error(`Failed to reload plugin ${pluginId}:`, error)
      return { success: false, error: (error as Error).message }
    }
  })

  /**
   * 获取插件详情
   */
  ipcMain.handle('plugin:get-details', async (_event, pluginId: string) => {
    try {
      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) {
        return { success: false, error: 'Plugin not found' }
      }

      return {
        success: true,
        data: {
          manifest: plugin.manifest,
          enabled: plugin.enabled,
          activated: plugin.activated
        }
      }
    } catch (error) {
      console.error(`Failed to get plugin details for ${pluginId}:`, error)
      return { success: false, error: (error as Error).message }
    }
  })

  console.log('Plugin IPC handlers setup complete')
}

/**
 * 清理插件 IPC 处理器
 */
export function cleanupPluginHandlers(): void {
  console.log('Cleaning up plugin IPC handlers...')

  // 移除所有插件相关的 IPC 处理器
  ipcMain.removeHandler('plugin:get-all')
  ipcMain.removeHandler('plugin:get-enabled')
  ipcMain.removeHandler('plugin:toggle-enabled')
  ipcMain.removeHandler('plugin:get-config')
  ipcMain.removeHandler('plugin:set-config')
  ipcMain.removeHandler('plugin:execute')
  ipcMain.removeHandler('plugin:reload')
  ipcMain.removeHandler('plugin:get-details')

  console.log('Plugin IPC handlers cleaned up')
}
