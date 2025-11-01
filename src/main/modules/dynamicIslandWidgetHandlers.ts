import { ipcMain } from 'electron'
import { getWidgetManager } from './dynamicIslandWidgetManager'

/**
 * Dynamic Island Widget IPC Handlers
 * 灵动岛组件的 IPC 事件处理器
 */

/**
 * 注册组件 IPC 处理器
 */
export function setupWidgetHandlers(): void {
  // 获取所有组件列表
  ipcMain.handle('dynamic-island-widget:get-all', () => {
    const manager = getWidgetManager()
    return manager.getAllWidgets()
  })

  // 获取单个组件详情
  ipcMain.handle('dynamic-island-widget:get', (_event, widgetId: string) => {
    const manager = getWidgetManager()
    return manager.getWidget(widgetId)
  })

  // 获取组件的运行时数据
  ipcMain.handle('dynamic-island-widget:get-data', (_event, widgetId: string) => {
    const manager = getWidgetManager()
    return manager.getWidgetData(widgetId)
  })

  // 重新加载所有组件
  ipcMain.handle('dynamic-island-widget:reload', async () => {
    const manager = getWidgetManager()
    await manager.reload()
    return { success: true }
  })

  console.log('[WidgetHandlers] IPC handlers registered')
}

/**
 * 清理组件 IPC 处理器
 */
export function cleanupWidgetHandlers(): void {
  ipcMain.removeHandler('dynamic-island-widget:get-all')
  ipcMain.removeHandler('dynamic-island-widget:get')
  ipcMain.removeHandler('dynamic-island-widget:get-data')
  ipcMain.removeHandler('dynamic-island-widget:reload')

  console.log('[WidgetHandlers] IPC handlers cleaned up')
}
