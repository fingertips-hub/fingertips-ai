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

  // 计算居中位置
  const x = Math.floor((screenWidth - COLLAPSED_CONFIG.width) / 2)
  const y = TOP_MARGIN

  const window = new BrowserWindow({
    width: COLLAPSED_CONFIG.width,
    height: COLLAPSED_CONFIG.height,
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
 */
export function expandDynamicIsland(): void {
  if (!dynamicIslandWindow || dynamicIslandWindow.isDestroyed()) {
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  // 计算展开后的宽度（屏幕宽度的 90%）
  const expandedWidth = Math.floor(screenWidth * EXPANDED_CONFIG.widthPercent)
  const expandedHeight = EXPANDED_CONFIG.height

  // 计算展开后的居中位置
  const targetX = Math.floor((screenWidth - expandedWidth) / 2)
  const targetY = TOP_MARGIN

  // 获取当前位置和尺寸
  const currentBounds = dynamicIslandWindow.getBounds()
  const startX = currentBounds.x
  const startY = currentBounds.y
  const startWidth = currentBounds.width
  const startHeight = currentBounds.height

  // 使用平滑动画
  const startTime = Date.now()
  const duration = ANIMATION_DURATION

  // 缓动函数：cubic-bezier(0.32, 0.72, 0, 1)
  const easeOutExpo = (t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
  }

  const animate = (): void => {
    if (!dynamicIslandWindow || dynamicIslandWindow.isDestroyed()) {
      return
    }

    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeOutExpo(progress)

    // 插值计算当前位置和尺寸
    const currentX = Math.floor(startX + (targetX - startX) * easedProgress)
    const currentY = Math.floor(startY + (targetY - startY) * easedProgress)
    const currentWidth = Math.floor(startWidth + (expandedWidth - startWidth) * easedProgress)
    const currentHeight = Math.floor(startHeight + (expandedHeight - startHeight) * easedProgress)

    // 应用新的位置和尺寸
    dynamicIslandWindow.setBounds({
      x: currentX,
      y: currentY,
      width: currentWidth,
      height: currentHeight
    })

    // 继续动画或设置最终精确尺寸
    if (progress < 1) {
      setTimeout(animate, 16) // 约 60fps
    } else {
      // 动画结束，明确设置精确的最终尺寸
      if (!dynamicIslandWindow.isDestroyed()) {
        dynamicIslandWindow.setBounds({
          x: targetX,
          y: targetY,
          width: expandedWidth,
          height: expandedHeight
        })
        console.log(`[DynamicIsland] Expanded to final size: ${expandedWidth}x${expandedHeight}`)
      }
    }
  }

  animate()
}

/**
 * 折叠灵动岛
 */
export function collapseDynamicIsland(): void {
  if (!dynamicIslandWindow || dynamicIslandWindow.isDestroyed()) {
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  // 计算折叠后的居中位置
  const targetX = Math.floor((screenWidth - COLLAPSED_CONFIG.width) / 2)
  const targetY = TOP_MARGIN
  const targetWidth = COLLAPSED_CONFIG.width
  const targetHeight = COLLAPSED_CONFIG.height

  // 获取当前位置和尺寸
  const currentBounds = dynamicIslandWindow.getBounds()
  const startX = currentBounds.x
  const startY = currentBounds.y
  const startWidth = currentBounds.width
  const startHeight = currentBounds.height

  // 使用平滑动画
  const startTime = Date.now()
  const duration = ANIMATION_DURATION

  // 缓动函数：cubic-bezier(0.32, 0.72, 0, 1)
  const easeOutExpo = (t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
  }

  const animate = (): void => {
    if (!dynamicIslandWindow || dynamicIslandWindow.isDestroyed()) {
      return
    }

    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeOutExpo(progress)

    // 插值计算当前位置和尺寸
    const currentX = Math.floor(startX + (targetX - startX) * easedProgress)
    const currentY = Math.floor(startY + (targetY - startY) * easedProgress)
    const currentWidth = Math.floor(startWidth + (targetWidth - startWidth) * easedProgress)
    const currentHeight = Math.floor(startHeight + (targetHeight - startHeight) * easedProgress)

    // 应用新的位置和尺寸
    dynamicIslandWindow.setBounds({
      x: currentX,
      y: currentY,
      width: currentWidth,
      height: currentHeight
    })

    // 继续动画或设置最终精确尺寸
    if (progress < 1) {
      setTimeout(animate, 16) // 约 60fps
    } else {
      // 动画结束，明确设置精确的最终尺寸
      if (!dynamicIslandWindow.isDestroyed()) {
        dynamicIslandWindow.setBounds({
          x: targetX,
          y: targetY,
          width: targetWidth,
          height: targetHeight
        })
        console.log(`[DynamicIsland] Collapsed to final size: ${targetWidth}x${targetHeight}`)
      }
    }
  }

  animate()
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
