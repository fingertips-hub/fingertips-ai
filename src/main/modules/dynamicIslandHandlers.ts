import { ipcMain } from 'electron'
import {
  expandDynamicIsland,
  collapseDynamicIsland,
  showDynamicIslandWindow,
  hideDynamicIslandWindow,
  closeDynamicIslandWindow,
  setDynamicIslandIgnoreMouseEvents
} from './dynamicIsland'

/**
 * Dynamic Island IPC Handlers
 * 灵动岛的 IPC 事件处理器
 */

/**
 * 注册灵动岛 IPC 处理器
 */
export function setupDynamicIslandHandlers(): void {
  // 展开灵动岛
  ipcMain.on('dynamic-island:expand', () => {
    console.log('[DynamicIsland] Expanding...')
    expandDynamicIsland()
  })

  // 折叠灵动岛
  ipcMain.on('dynamic-island:collapse', () => {
    console.log('[DynamicIsland] Collapsing...')
    collapseDynamicIsland()
  })

  // 显示灵动岛
  ipcMain.on('dynamic-island:show', () => {
    console.log('[DynamicIsland] Showing...')
    showDynamicIslandWindow()
  })

  // 隐藏灵动岛
  ipcMain.on('dynamic-island:hide', () => {
    console.log('[DynamicIsland] Hiding...')
    hideDynamicIslandWindow()
  })

  // 关闭灵动岛
  ipcMain.on('dynamic-island:close', () => {
    console.log('[DynamicIsland] Closing...')
    closeDynamicIslandWindow()
  })

  // 设置鼠标事件穿透
  ipcMain.on('dynamic-island:set-ignore-mouse-events', (_event, ignore: boolean) => {
    setDynamicIslandIgnoreMouseEvents(ignore)
  })

  console.log('[DynamicIsland] IPC handlers registered')
}

/**
 * 清理灵动岛 IPC 处理器
 */
export function cleanupDynamicIslandHandlers(): void {
  ipcMain.removeAllListeners('dynamic-island:expand')
  ipcMain.removeAllListeners('dynamic-island:collapse')
  ipcMain.removeAllListeners('dynamic-island:show')
  ipcMain.removeAllListeners('dynamic-island:hide')
  ipcMain.removeAllListeners('dynamic-island:close')
  ipcMain.removeAllListeners('dynamic-island:set-ignore-mouse-events')

  console.log('[DynamicIsland] IPC handlers cleaned up')
}
