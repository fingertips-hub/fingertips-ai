import { uIOhook, UiohookMouseEvent } from 'uiohook-napi'
import {
  showSuperPanelAtMouse,
  hideSuperPanel,
  isClickOutsideSuperPanel,
  isModalOpenState,
  isPinnedState
} from './superPanel'

// Mouse listener state
let middleButtonPressTime: number | null = null
let middleButtonPressPosition: { x: number; y: number } | null = null
let longPressTimer: NodeJS.Timeout | null = null
let isListening = false
let hasShownPanel = false // 标记是否已经显示了面板

// Configuration
const LONG_PRESS_THRESHOLD = 300 // milliseconds - 长按阈值
const MAX_MOVEMENT_THRESHOLD = 6 // pixels - 最大允许移动距离(像素)

/**
 * 计算两点之间的距离
 */
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

/**
 * 取消长按检测
 */
function cancelLongPress(): void {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  middleButtonPressTime = null
  middleButtonPressPosition = null
  hasShownPanel = false
}

/**
 * Handle middle button press
 */
function handleMiddleButtonDown(x: number, y: number): void {
  // 记录按下时间和位置
  middleButtonPressTime = Date.now()
  middleButtonPressPosition = { x, y }
  hasShownPanel = false

  // 设置定时器,达到阈值后显示面板
  longPressTimer = setTimeout(() => {
    // 检查是否仍在按下状态
    if (middleButtonPressTime !== null && middleButtonPressPosition !== null) {
      console.log('Long press threshold reached, showing Super Panel')
      showSuperPanelAtMouse()
      hasShownPanel = true
    }
  }, LONG_PRESS_THRESHOLD)
}

/**
 * Handle middle button release
 */
function handleMiddleButtonUp(): void {
  // 清理状态
  cancelLongPress()
}

/**
 * Handle mouse movement during middle button press
 */
function handleMouseMove(x: number, y: number): void {
  // 只在中键按下且未显示面板时检测移动
  if (middleButtonPressPosition !== null && !hasShownPanel) {
    const distance = calculateDistance(
      middleButtonPressPosition.x,
      middleButtonPressPosition.y,
      x,
      y
    )

    // 如果移动距离超过阈值,取消长按
    if (distance > MAX_MOVEMENT_THRESHOLD) {
      console.log(`Mouse moved ${distance.toFixed(2)}px, canceling long press`)
      cancelLongPress()
    }
  }
}

/**
 * Handle left button click to hide Super Panel when clicking outside
 */
function handleLeftButtonClick(x: number, y: number): void {
  // 如果 Modal 打开,不处理点击外部关闭
  if (isModalOpenState()) {
    console.log('Modal is open, ignoring outside click')
    return
  }

  // 如果面板被固定,不处理点击外部关闭
  if (isPinnedState()) {
    console.log('Panel is pinned, ignoring outside click')
    return
  }

  if (isClickOutsideSuperPanel(x, y)) {
    console.log('Click outside Super Panel detected, hiding...')
    hideSuperPanel()
  }
}

/**
 * Setup global mouse listener for middle button long press and outside clicks
 */
export function setupGlobalMouseListener(): void {
  if (isListening) {
    console.warn('Mouse listener is already running')
    return
  }

  // Mouse button down event
  uIOhook.on('mousedown', (event: UiohookMouseEvent) => {
    // Middle button (button 3)
    if (event.button === 3) {
      handleMiddleButtonDown(event.x, event.y)
    }
  })

  // Mouse button up event
  uIOhook.on('mouseup', (event: UiohookMouseEvent) => {
    // Middle button (button 3)
    if (event.button === 3) {
      handleMiddleButtonUp()
    }

    // Left button (button 1) - hide Super Panel when clicking outside
    if (event.button === 1) {
      handleLeftButtonClick(event.x, event.y)
    }
  })

  // Mouse move event - 检测中键按下期间的鼠标移动
  uIOhook.on('mousemove', (event: UiohookMouseEvent) => {
    handleMouseMove(event.x, event.y)
  })

  // Start the hook
  uIOhook.start()
  isListening = true
  console.log('Global mouse listener started')
}

/**
 * Stop global mouse listener
 */
export function stopGlobalMouseListener(): void {
  if (!isListening) {
    return
  }

  try {
    uIOhook.stop()
    isListening = false
    console.log('Global mouse listener stopped')
  } catch (error) {
    console.error('Error stopping uIOhook:', error)
  }
}

/**
 * Check if mouse listener is running
 */
export function isMouseListenerRunning(): boolean {
  return isListening
}

/**
 * Get current long press threshold
 */
export function getLongPressThreshold(): number {
  return LONG_PRESS_THRESHOLD
}
