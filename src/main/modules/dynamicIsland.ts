import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'
import { isAnyMouseButtonPressed } from './mouseListener'

/**
 * Dynamic Island Window Manager
 * 灵动岛窗口管理器 - 类似iPhone的Dynamic Island交互设计
 */

// 灵动岛窗口实例
let dynamicIslandWindow: BrowserWindow | null = null

// 鼠标位置检测定时器
let mousePositionTimer: NodeJS.Timeout | null = null

// 当前是否启用了 forward 模式（用于避免重复设置）
let isForwardEnabled = false

// 当前是否处于交互模式（渲染进程显式禁用了穿透）
// 当处于交互模式时，主进程的轮询检测不应该改变穿透状态
let isInteractionMode = false

// 鼠标检测轮询间隔（毫秒）
const MOUSE_CHECK_INTERVAL = 50

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

  // 默认启用鼠标穿透，不使用 forward 模式
  // 这样可以避免 Electron Bug #35030：forward: true 会导致其他有边框窗口在移动时闪烁
  // 通过主进程轮询检测鼠标位置，按需启用 forward 模式
  window.setIgnoreMouseEvents(true)
  isForwardEnabled = false

  // 隐藏菜单栏
  window.setMenuBarVisibility(false)
  window.setMenu(null)

  // 窗口就绪时显示
  window.on('ready-to-show', () => {
    window.show()
  })

  // 清理引用和定时器
  window.on('closed', () => {
    stopMousePositionDetection()
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
      // 启动鼠标位置检测
      startMousePositionDetection()
    }
  } else {
    createDynamicIslandWindow()
    // 启动鼠标位置检测
    startMousePositionDetection()
  }
}

/**
 * 隐藏灵动岛窗口
 */
export function hideDynamicIslandWindow(): void {
  if (dynamicIslandWindow && !dynamicIslandWindow.isDestroyed()) {
    dynamicIslandWindow.hide()
    // 停止鼠标位置检测
    stopMousePositionDetection()
  }
}

/**
 * 关闭灵动岛窗口
 */
export function closeDynamicIslandWindow(): void {
  // 停止鼠标位置检测
  stopMousePositionDetection()
  
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
 * @param ignore 是否忽略鼠标事件
 * @param options.forward 是否启用 forward 模式（仅在 ignore=true 时有效）
 */
export function setDynamicIslandIgnoreMouseEvents(
  ignore: boolean,
  options?: { forward?: boolean }
): void {
  if (!dynamicIslandWindow || dynamicIslandWindow.isDestroyed()) {
    return
  }

  if (ignore) {
    // 退出交互模式
    isInteractionMode = false
    
    if (options?.forward) {
      // 启用穿透 + forward 模式（允许检测鼠标移动）
      dynamicIslandWindow.setIgnoreMouseEvents(true, { forward: true })
      isForwardEnabled = true
    } else {
      // 启用穿透，完全忽略鼠标事件（避免闪烁问题）
      dynamicIslandWindow.setIgnoreMouseEvents(true)
      isForwardEnabled = false
    }
  } else {
    // 禁用穿透，让窗口接收鼠标事件
    // 进入交互模式，主进程轮询不应该干扰
    isInteractionMode = true
    dynamicIslandWindow.setIgnoreMouseEvents(false)
    isForwardEnabled = false
  }
}

/**
 * 启动鼠标位置检测
 * 通过轮询检测鼠标是否在灵动岛窗口区域内，按需启用 forward 模式
 * 这样可以避免 Electron Bug #35030：forward: true 会导致其他有边框窗口闪烁
 */
function startMousePositionDetection(): void {
  // 避免重复启动
  if (mousePositionTimer) {
    return
  }

  mousePositionTimer = setInterval(() => {
    if (!dynamicIslandWindow || dynamicIslandWindow.isDestroyed()) {
      stopMousePositionDetection()
      return
    }

    // 获取鼠标位置和窗口边界
    const cursorPoint = screen.getCursorScreenPoint()
    const windowBounds = dynamicIslandWindow.getBounds()

    // 检测鼠标是否在窗口区域内
    const isMouseInWindow =
      cursorPoint.x >= windowBounds.x &&
      cursorPoint.x <= windowBounds.x + windowBounds.width &&
      cursorPoint.y >= windowBounds.y &&
      cursorPoint.y <= windowBounds.y + windowBounds.height

    // 如果处于交互模式，不要改变穿透状态
    if (isInteractionMode) {
      return
    }

    // 当任意鼠标按键处于按下状态时（例如拖拽其他窗口），强制禁用 forward 模式
    // 这是规避 Electron Bug #35030 的关键：forward: true 会导致其他有边框窗口在拖拽时闪烁
    if (isAnyMouseButtonPressed()) {
      if (isForwardEnabled) {
        dynamicIslandWindow.setIgnoreMouseEvents(true)
        isForwardEnabled = false
      }
      return
    }

    // 根据鼠标位置切换 forward 模式
    if (isMouseInWindow && !isForwardEnabled) {
      // 鼠标进入窗口区域，启用 forward 模式以检测精确的鼠标事件
      dynamicIslandWindow.setIgnoreMouseEvents(true, { forward: true })
      isForwardEnabled = true
      
      // 通知渲染进程检查鼠标位置
      // 这是为了解决 mouseenter 事件可能不触发的问题（当 forward 模式刚启用时）
      dynamicIslandWindow.webContents.send('dynamic-island:mouse-entered-window')
    } else if (!isMouseInWindow && isForwardEnabled) {
      // 鼠标离开窗口区域，禁用 forward 模式以避免闪烁
      dynamicIslandWindow.setIgnoreMouseEvents(true)
      isForwardEnabled = false
    }
  }, MOUSE_CHECK_INTERVAL)
}

/**
 * 停止鼠标位置检测
 */
function stopMousePositionDetection(): void {
  if (mousePositionTimer) {
    clearInterval(mousePositionTimer)
    mousePositionTimer = null
  }
  isForwardEnabled = false
  isInteractionMode = false
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
