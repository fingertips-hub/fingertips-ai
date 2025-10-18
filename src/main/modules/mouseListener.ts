import { uIOhook, UiohookMouseEvent, UiohookKeyboardEvent } from 'uiohook-napi'
import {
  showSuperPanelAtMouse,
  hideSuperPanel,
  isClickOutsideSuperPanel,
  isModalOpenState,
  isPinnedState
} from './superPanel'
import { captureSelectedText } from './aiShortcutRunner'
import {
  checkShortcutHotkeyTriggered,
  triggerShortcut,
  updateActiveModifiers
} from './aiShortcutHotkeyManager'

// Mouse listener state
let middleButtonPressTime: number | null = null
let middleButtonPressPosition: { x: number; y: number } | null = null
let longPressTimer: NodeJS.Timeout | null = null
let isListening = false
let hasShownPanel = false // 标记是否已经显示了面板
let capturedTextOnPress = '' // 在按键时立即捕获的文本

// Configuration
const LONG_PRESS_THRESHOLD = 300 // milliseconds - 长按阈值
const MAX_MOVEMENT_THRESHOLD = 6 // pixels - 最大允许移动距离(像素)

// 当前触发配置
let currentTrigger: string | null = null // 例如: "LongPress:Middle", "Ctrl+LongPress:Right", "Alt+Q"
let currentTriggerButton: number | null = null // 鼠标按键编号
const currentTriggerModifiers: Set<string> = new Set() // 所需的修饰键
let currentTriggerKey: number | null = null // 键盘按键 keycode（用于键盘快捷键）

// 修饰键状态追踪
const activeModifiers: Set<string> = new Set()

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
 * 键盘按键名称到 keycode 的映射（常用键）
 */
const KEY_NAME_TO_CODE: Record<string, number> = {
  Q: 16,
  W: 17,
  E: 18,
  R: 19,
  T: 20,
  Space: 57
}

/**
 * 解析触发器配置
 * @param trigger 触发器字符串，例如 "LongPress:Middle", "Ctrl+LongPress:Right", "Alt+Space"
 */
export function parseTriggerConfig(trigger: string): void {
  currentTrigger = trigger
  currentTriggerButton = null
  currentTriggerKey = null
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
  } else {
    // 键盘快捷键（例如 "Alt+Q", "Ctrl+Space"）
    const parts = trigger.split('+')
    const keyPart = parts[parts.length - 1] // 最后一个是按键
    currentTriggerKey = KEY_NAME_TO_CODE[keyPart]

    // 提取修饰键
    parts.slice(0, -1).forEach((mod) => {
      currentTriggerModifiers.add(mod)
    })

    if (currentTriggerKey) {
      console.log(
        `Configured keyboard trigger: key=${keyPart}(${currentTriggerKey}), modifiers=${Array.from(currentTriggerModifiers).join('+')}`
      )
    } else {
      console.warn(`Unknown key: ${keyPart}`)
    }
  }
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
  // 不清空 capturedTextOnPress，让它保持到用户使用
}

/**
 * 获取按键时捕获的文本
 * 注意：不会立即清空缓存，而是在下次捕获时覆盖
 * 这样可以保证 Super Panel 显示期间，多次获取都能拿到同一份文本
 */
export function getCapturedTextOnPress(): string {
  return capturedTextOnPress
}

/**
 * 清空捕获的文本缓存
 * 在 Super Panel 隐藏或下次捕获时调用
 */
export function clearCapturedText(): void {
  capturedTextOnPress = ''
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

  console.log(`[MouseListener] Trigger button pressed at (${x}, ${y})`)

  // 🔑 关键优化：在按键的瞬间就立即尝试捕获选中文本
  // 这时选中状态通常还没有丢失（取决于鼠标位置）
  console.log('[MouseListener] 立即尝试捕获选中文本（在按下瞬间）...')

  // 🎯 使用立即执行的异步函数，避免阻塞
  ;(async () => {
    try {
      // 清空旧的缓存，准备捕获新内容
      capturedTextOnPress = ''
      capturedTextOnPress = await captureSelectedText()
      console.log('[MouseListener] 按下时捕获的文本长度:', capturedTextOnPress.length)
      if (capturedTextOnPress.length > 0) {
        console.log('[MouseListener] 捕获成功:', capturedTextOnPress.substring(0, 50))
      }
    } catch (err) {
      console.error('[MouseListener] 捕获失败:', err)
      capturedTextOnPress = ''
    }
  })()

  // 设置定时器,达到阈值后显示面板
  longPressTimer = setTimeout(() => {
    // 检查是否仍在按下状态
    if (middleButtonPressTime !== null && middleButtonPressPosition !== null) {
      console.log('[MouseListener] Long press threshold reached, showing Super Panel')
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

  // Keyboard events for modifier tracking and keyboard shortcuts
  uIOhook.on('keydown', (event: UiohookKeyboardEvent) => {
    const modifierName = KEY_CODE_TO_MODIFIER[event.keycode]
    if (modifierName) {
      activeModifiers.add(modifierName)
      // 更新 AI 快捷指令管理器中的修饰键状态
      updateActiveModifiers(activeModifiers)
      // console.log(`Modifier pressed: ${modifierName}, active: ${Array.from(activeModifiers).join('+')}`)
      return
    }

    // 🔑 优先检测 AI 快捷指令的快捷键
    const shortcutInfo = checkShortcutHotkeyTriggered(event.keycode, activeModifiers)
    if (shortcutInfo) {
      console.log(`[MouseListener] AI Shortcut hotkey detected: ${shortcutInfo.name}`)
      // 异步触发快捷指令（包括捕获文本和打开运行器）
      triggerShortcut(shortcutInfo).catch((err) => {
        console.error('[MouseListener] Failed to trigger shortcut:', err)
      })
      return // 不再检测 Super Panel 快捷键
    }

    // 🔑 检测 Super Panel 快捷键触发（例如 Alt+Q）
    if (currentTriggerKey !== null && event.keycode === currentTriggerKey) {
      if (checkModifiersMatch()) {
        console.log(`Keyboard trigger detected: ${currentTrigger}`)
        console.log('[MouseListener] 快速捕获选中文本并显示 Super Panel...')

        // 🚀 性能优化：快速捕获后立即显示
        ;(async () => {
          try {
            // 清空旧的缓存，准备捕获新内容
            capturedTextOnPress = ''
            capturedTextOnPress = await captureSelectedText()
            console.log('[MouseListener] 捕获完成，文本长度:', capturedTextOnPress.length)
            if (capturedTextOnPress.length > 0) {
              console.log('[MouseListener] 捕获成功:', capturedTextOnPress.substring(0, 50))
            }
          } catch (err) {
            console.error('[MouseListener] 捕获失败:', err)
            capturedTextOnPress = ''
          } finally {
            // 无论捕获成功还是失败，都立即显示 Super Panel
            console.log('[MouseListener] 显示 Super Panel')
            showSuperPanelAtMouse()
          }
        })()
      }
    }
  })

  uIOhook.on('keyup', (event: UiohookKeyboardEvent) => {
    const modifierName = KEY_CODE_TO_MODIFIER[event.keycode]
    if (modifierName) {
      activeModifiers.delete(modifierName)
      // 更新 AI 快捷指令管理器中的修饰键状态
      updateActiveModifiers(activeModifiers)
      // console.log(`Modifier released: ${modifierName}, active: ${Array.from(activeModifiers).join('+')}`)
    }
  })

  // Mouse button down event
  uIOhook.on('mousedown', (event: UiohookMouseEvent) => {
    handleButtonDown(event.button as number, event.x as number, event.y as number)
  })

  // Mouse button up event
  uIOhook.on('mouseup', (event: UiohookMouseEvent) => {
    handleButtonUp(event.button as number)

    // Left button (button 1) - hide Super Panel when clicking outside
    if (event.button === 1) {
      handleLeftButtonClick(event.x as number, event.y as number)
    }
  })

  // Mouse move event - 检测按键按下期间的鼠标移动
  uIOhook.on('mousemove', (event: UiohookMouseEvent) => {
    handleMouseMove(event.x as number, event.y as number)
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
