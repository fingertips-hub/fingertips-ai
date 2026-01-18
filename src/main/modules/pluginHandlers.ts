import { ipcMain, shell } from 'electron'
import { pluginManager } from './pluginManager'
import { getPluginConfig, setPluginConfig } from './pluginStore'
import {
  installPluginFromZip,
  uninstallPlugin,
  updatePlugin,
  getPluginsDirectory,
  ensurePluginsDirectory
} from './pluginLoader'

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
  ipcMain.handle(
    'plugin:set-config',
    async (_event, pluginId: string, config: Record<string, unknown>) => {
      try {
        await setPluginConfig(pluginId, config)
        return { success: true }
      } catch (error) {
        console.error(`Failed to set plugin config for ${pluginId}:`, error)
        return { success: false, error: (error as Error).message }
      }
    }
  )

  /**
   * 执行插件
   */
  ipcMain.handle('plugin:execute', async (_event, pluginId: string, params: unknown) => {
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

  /**
   * 从 ZIP 文件安装插件
   */
  ipcMain.handle('plugin:install-from-zip', async (_event, zipPath: string) => {
    try {
      console.log(`Installing plugin from ZIP: ${zipPath}`)
      const result = await installPluginFromZip(zipPath)

      if (result.success && result.manifest) {
        console.log(`Plugin ${result.manifest.name} installed successfully`)

        // 安装成功后，立即重新扫描并加载新插件（热重载）
        try {
          const rescanResult = await pluginManager.rescanPlugins()
          console.log('Plugins rescanned after installation:', rescanResult)

          if (rescanResult.newPlugins.length > 0) {
            console.log(`New plugin loaded: ${rescanResult.newPlugins.join(', ')}`)
          }
        } catch (rescanError) {
          console.error('Failed to rescan plugins after installation:', rescanError)
          // 不影响安装结果，只是需要手动刷新
        }
      }

      return result
    } catch (error) {
      console.error('Failed to install plugin from ZIP:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '安装插件时发生未知错误'
      }
    }
  })

  /**
   * 获取插件目录路径
   */
  ipcMain.handle('plugin:get-directory', async () => {
    try {
      await ensurePluginsDirectory()
      return { success: true, data: { directory: getPluginsDirectory() } }
    } catch (error) {
      console.error('Failed to get plugins directory:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  /**
   * 打开插件目录
   */
  ipcMain.handle('plugin:open-directory', async () => {
    try {
      await ensurePluginsDirectory()
      const dir = getPluginsDirectory()
      await shell.openPath(dir)
      return { success: true }
    } catch (error) {
      console.error('Failed to open plugins directory:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  /**
   * 卸载插件
   */
  ipcMain.handle('plugin:uninstall', async (_event, pluginId: string) => {
    try {
      console.log(`Uninstalling plugin: ${pluginId}`)

      // 先停用插件
      const plugin = pluginManager.getPlugin(pluginId)
      if (plugin && plugin.enabled) {
        await pluginManager.togglePlugin(pluginId, false)
      }

      // 卸载插件
      const result = await uninstallPlugin(pluginId)

      if (result.success) {
        console.log(`Plugin ${pluginId} uninstalled successfully`)

        // 卸载成功后，立即重新扫描（移除已卸载的插件）
        try {
          const rescanResult = await pluginManager.rescanPlugins()
          console.log('Plugins rescanned after uninstallation:', rescanResult)

          if (rescanResult.removedPlugins.length > 0) {
            console.log(`Plugins removed: ${rescanResult.removedPlugins.join(', ')}`)
          }
        } catch (rescanError) {
          console.error('Failed to rescan plugins after uninstallation:', rescanError)
        }
      }

      return result
    } catch (error) {
      console.error(`Failed to uninstall plugin ${pluginId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '卸载插件时发生未知错误'
      }
    }
  })

  /**
   * 更新插件
   */
  ipcMain.handle('plugin:update', async (_event, pluginId: string, zipPath: string) => {
    try {
      console.log(`Updating plugin ${pluginId} from ZIP: ${zipPath}`)

      // 先停用插件
      const plugin = pluginManager.getPlugin(pluginId)
      const wasEnabled = plugin?.enabled || false

      if (plugin && plugin.enabled) {
        await pluginManager.togglePlugin(pluginId, false)
      }

      // 更新插件
      const result = await updatePlugin(pluginId, zipPath)

      if (result.success) {
        console.log(`Plugin ${pluginId} updated successfully`)

        // 更新成功后，立即重新扫描并加载新版本
        try {
          const rescanResult = await pluginManager.rescanPlugins()
          console.log('Plugins rescanned after update:', rescanResult)

          // 如果之前是启用状态，重新启用
          if (wasEnabled && result.pluginId) {
            try {
              await pluginManager.togglePlugin(result.pluginId, true)
              console.log(`Plugin ${result.pluginId} re-enabled after update`)
            } catch (error) {
              console.error(`Failed to re-enable plugin after update:`, error)
            }
          }
        } catch (rescanError) {
          console.error('Failed to rescan plugins after update:', rescanError)
        }
      }

      return result
    } catch (error) {
      console.error(`Failed to update plugin ${pluginId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新插件时发生未知错误'
      }
    }
  })

  /**
   * 重新扫描插件目录（热重载）
   */
  ipcMain.handle('plugin:rescan', async () => {
    try {
      console.log('Manually rescanning plugins...')
      const result = await pluginManager.rescanPlugins()

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('Failed to rescan plugins:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '重新扫描插件时发生未知错误'
      }
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
  ipcMain.removeHandler('plugin:install-from-zip')
  ipcMain.removeHandler('plugin:uninstall')
  ipcMain.removeHandler('plugin:update')
  ipcMain.removeHandler('plugin:rescan')
  ipcMain.removeHandler('plugin:get-directory')
  ipcMain.removeHandler('plugin:open-directory')

  console.log('Plugin IPC handlers cleaned up')
}
