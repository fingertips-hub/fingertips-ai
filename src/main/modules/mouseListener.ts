import { uIOhook, UiohookMouseEvent, UiohookKeyboardEvent } from 'uiohook-napi'
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

// 当前触发配置
let currentTrigger: string | null = null // 例如: "LongPress:Middle", "Ctrl+LongPress:Right", "Alt+Space"
let currentTriggerButton: number | null = null // 鼠标按键编号
let currentTriggerModifiers: Set<string> = new Set() // 所需的修饰键

// 修饰键状态追踪
let activeModifiers: Set<string> = new Set()

/**
 * 鼠标按键映射
 */
const MOUSE_BUTTON_MAP: Record<string, number> = {
  Left: 1,
  Middle: 3,
  Right: 2,
  Back: 4,
  Forward: 5
}

/**
 * 键码到修饰键名称的映射
 */
const KEY_CODE_TO_MODIFIER: Record<number, string> = {
  29: 'Ctrl', // Left Control
  3613: 'Ctrl', // Right Control
  56: 'Alt', // Left Alt
  3640: 'Alt', // Right Alt (AltGr)
  42: 'Shift', // Left Shift
  54: 'Shift', // Right Shift
  3675: 'Meta', // Left Win/Command
  3676: 'Meta' // Right Win/Command
}

/**
 * 解析触发器配置
 * @param trigger 触发器字符串，例如 "LongPress:Middle", "Ctrl+LongPress:Right", "Alt+Space"
 */
export function parseTriggerConfig(trigger: string): void {
  currentTrigger = trigger
  currentTriggerButton = null
  currentTriggerModifiers.clear()

  if (!trigger) {
    console.log('No trigger configured')
    return
  }

  console.log('Parsing trigger config:', trigger)

  // 检查是否是鼠标长按动作
  if (trigger.includes('LongPress:')) {
    const parts = trigger.split('+')
    const longPressPart = parts.find((p) => p.startsWith('LongPress:'))

    if (longPressPart) {
      const buttonName = longPressPart.split(':')[1]
      currentTriggerButton = MOUSE_BUTTON_MAP[buttonName]

      // 提取修饰键
      parts
        .filter((p) => !p.startsWith('LongPress:'))
        .forEach((mod) => {
          currentTriggerModifiers.add(mod)
        })

      console.log(
        `Configured mouse trigger: button=${currentTriggerButton}, modifiers=${Array.from(currentTriggerModifiers).join('+')}`
      )
    }
  }
  // 键盘快捷键将由 globalShortcut 处理，这里不处理
}

/**
 * 计算两点之间的距离
 */
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

/**
 * 检查修饰键是否匹配
 */
function checkModifiersMatch(): boolean {
  if (currentTriggerModifiers.size === 0) {
    // 不需要修饰键，检查是否有任何修饰键被按下
    return activeModifiers.size === 0
  }

  // 需要特定修饰键，检查是否完全匹配
  if (activeModifiers.size !== currentTriggerModifiers.size) {
    return false
  }

  for (const mod of currentTriggerModifiers) {
    if (!activeModifiers.has(mod)) {
      return false
    }
  }

  return true
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
 * Handle button press
 */
function handleButtonDown(button: number, x: number, y: number): void {
  // 检查是否是配置的触发按键
  if (button !== currentTriggerButton) {
    return
  }

  // 检查修饰键是否匹配
  if (!checkModifiersMatch()) {
    console.log(
      `Modifiers don't match. Active: ${Array.from(activeModifiers).join('+')}, Required: ${Array.from(currentTriggerModifiers).join('+')}`
    )
    return
  }

  // 记录按下时间和位置
  middleButtonPressTime = Date.now()
  middleButtonPressPosition = { x, y }
  hasShownPanel = false

  console.log(`Trigger button pressed at (${x}, ${y})`)

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
 * Handle button release
 */
function handleButtonUp(button: number): void {
  // 只处理配置的触发按键
  if (button === currentTriggerButton) {
    cancelLongPress()
  }

  // 左键释放时检查是否点击在面板外
  if (button === 1) {
    // 获取当前鼠标位置需要在 mouseup 事件中
    // 这里我们在 mouseup 事件处理器中处理
  }
}

/**
 * Handle mouse movement during button press
 */
function handleMouseMove(x: number, y: number): void {
  // 只在目标键按下且未显示面板时检测移动
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
 * Setup global mouse listener for button long press and outside clicks
 */
export function setupGlobalMouseListener(): void {
  if (isListening) {
    console.warn('Mouse listener is already running')
    return
  }

  // Keyboard events for modifier tracking
  uIOhook.on('keydown', (event: UiohookKeyboardEvent) => {
    const modifierName = KEY_CODE_TO_MODIFIER[event.keycode]
    if (modifierName) {
      activeModifiers.add(modifierName)
      // console.log(`Modifier pressed: ${modifierName}, active: ${Array.from(activeModifiers).join('+')}`)
    }
  })

  uIOhook.on('keyup', (event: UiohookKeyboardEvent) => {
    const modifierName = KEY_CODE_TO_MODIFIER[event.keycode]
    if (modifierName) {
      activeModifiers.delete(modifierName)
      // console.log(`Modifier released: ${modifierName}, active: ${Array.from(activeModifiers).join('+')}`)
    }
  })

  // Mouse button down event
  uIOhook.on('mousedown', (event: UiohookMouseEvent) => {
    handleButtonDown(event.button, event.x, event.y)
  })

  // Mouse button up event
  uIOhook.on('mouseup', (event: UiohookMouseEvent) => {
    handleButtonUp(event.button)

    // Left button (button 1) - hide Super Panel when clicking outside
    if (event.button === 1) {
      handleLeftButtonClick(event.x, event.y)
    }
  })

  // Mouse move event - 检测按键按下期间的鼠标移动
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
    activeModifiers.clear()
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

/**
 * Get current trigger configuration
 */
export function getCurrentTrigger(): string | null {
  return currentTrigger
}
