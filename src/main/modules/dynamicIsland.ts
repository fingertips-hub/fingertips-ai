import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'

/**
 * Dynamic Island Window Manager
 * 灵动岛窗口管理器 - 类似iPhone的Dynamic Island交互设计
 */

// 灵动岛窗口实例
let dynamicIslandWindow: BrowserWindow | null = null

// 窗口配置
const COLLAPSED_CONFIG = {
  width: 400, // 更宽的胶囊形状
  height: 30, // 更扁平的高度
  borderRadius: 16
}

const EXPANDED_CONFIG = {
  widthPercent: 0.9, // 屏幕宽度的 90%
  height: 400,
  borderRadius: 20
}

const TOP_MARGIN = 12 // 距离屏幕顶部的间距
const ANIMATION_DURATION = 350 // 动画时长（毫秒）

/**
 * 创建灵动岛窗口
 */
export function createDynamicIslandWindow(): BrowserWindow {
  // 如果窗口已存在，直接返回
  if (dynamicIslandWindow && !dynamicIslandWindow.isDestroyed()) {
    return dynamicIslandWindow
  }

  // 获取主屏幕尺寸
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  // 窗口始终使用展开状态的大小，通过 CSS 控制视觉上的折叠/展开
  // 这样可以避免 Electron 窗口尺寸动画的 bug，动画更流畅
  const expandedWidth = Math.floor(screenWidth * EXPANDED_CONFIG.widthPercent)
  const expandedHeight = EXPANDED_CONFIG.height

  // 计算居中位置
  const x = Math.floor((screenWidth - expandedWidth) / 2)
  const y = TOP_MARGIN

  const window = new BrowserWindow({
    width: expandedWidth,
    height: expandedHeight,
    x: x,
    y: y,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    backgroundColor: '#00000000',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // 始终启用鼠标穿透，内容区域通过 CSS pointer-events 控制交互
  // forward: true 表示鼠标事件会转发到下方窗口，除非被 CSS pointer-events: auto 的元素捕获
  window.setIgnoreMouseEvents(true, { forward: true })

  // 隐藏菜单栏
  window.setMenuBarVisibility(false)
  window.setMenu(null)

  // 窗口就绪时显示
  window.on('ready-to-show', () => {
    window.show()
  })

  // 清理引用
  window.on('closed', () => {
    dynamicIslandWindow = null
  })

  // 加载页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/dynamic-island.html')
  } else {
    window.loadFile(join(__dirname, '../renderer/dynamic-island.html'))
  }

  // 开发环境打开 DevTools
  if (is.dev) {
    window.webContents.openDevTools({ mode: 'detach' })
  }

  dynamicIslandWindow = window
  return window
}

/**
 * 显示灵动岛窗口
 */
export function showDynamicIslandWindow(): void {
  if (dynamicIslandWindow && !dynamicIslandWindow.isDestroyed()) {
    if (!dynamicIslandWindow.isVisible()) {
      dynamicIslandWindow.show()
    }
  } else {
    createDynamicIslandWindow()
  }
}

/**
 * 隐藏灵动岛窗口
 */
export function hideDynamicIslandWindow(): void {
  if (dynamicIslandWindow && !dynamicIslandWindow.isDestroyed()) {
    dynamicIslandWindow.hide()
  }
}

/**
 * 关闭灵动岛窗口
 */
export function closeDynamicIslandWindow(): void {
  if (dynamicIslandWindow && !dynamicIslandWindow.isDestroyed()) {
    dynamicIslandWindow.close()
  }
  dynamicIslandWindow = null
}

/**
 * 获取灵动岛窗口实例
 */
export function getDynamicIslandWindow(): BrowserWindow | null {
  return dynamicIslandWindow
}

/**
 * 检查灵动岛窗口是否打开
 */
export function isDynamicIslandWindowOpen(): boolean {
  return dynamicIslandWindow !== null && !dynamicIslandWindow.isDestroyed()
}

/**
 * 展开灵动岛
 * 注意：窗口尺寸始终保持展开大小，展开/折叠动画由渲染层的 CSS 控制
 * 这个函数现在只是一个空操作，保留是为了保持 API 兼容性
 */
export function expandDynamicIsland(): void {
  // 窗口尺寸不变，所有动画都在渲染层通过 CSS 完成
  // 这样可以避免 Electron 窗口尺寸动画的 bug，动画更流畅
  if (!dynamicIslandWindow || dynamicIslandWindow.isDestroyed()) {
    return
  }
  console.log('[DynamicIsland] Expand triggered (CSS animation in renderer)')
}

/**
 * 折叠灵动岛
 * 注意：窗口尺寸始终保持展开大小，展开/折叠动画由渲染层的 CSS 控制
 * 这个函数现在只是一个空操作，保留是为了保持 API 兼容性
 */
export function collapseDynamicIsland(): void {
  // 窗口尺寸不变，所有动画都在渲染层通过 CSS 完成
  // 这样可以避免 Electron 窗口尺寸动画的 bug，动画更流畅
  if (!dynamicIslandWindow || dynamicIslandWindow.isDestroyed()) {
    return
  }
  console.log('[DynamicIsland] Collapse triggered (CSS animation in renderer)')
}

/**
 * 设置鼠标事件穿透
 */
export function setDynamicIslandIgnoreMouseEvents(ignore: boolean): void {
  if (!dynamicIslandWindow || dynamicIslandWindow.isDestroyed()) {
    return
  }

  if (ignore) {
    // 启用穿透，允许点击下方内容
    dynamicIslandWindow.setIgnoreMouseEvents(true, { forward: true })
  } else {
    // 禁用穿透，让窗口接收鼠标事件
    dynamicIslandWindow.setIgnoreMouseEvents(false)
  }
}

/**
 * 导出配置常量（供其他模块使用）
 */
export const DYNAMIC_ISLAND_CONFIG = {
  COLLAPSED: COLLAPSED_CONFIG,
  EXPANDED: EXPANDED_CONFIG,
  TOP_MARGIN,
  ANIMATION_DURATION
}
