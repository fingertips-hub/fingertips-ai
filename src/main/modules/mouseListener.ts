import { uIOhook, UiohookMouseEvent, UiohookKeyboardEvent, UiohookKey } from 'uiohook-napi'
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

// Health check state
let lastEventTime = Date.now() // 最后一次收到事件的时间
let healthCheckInterval: NodeJS.Timeout | null = null

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
  // 字母键
  Q: 16,
  W: 17,
  E: 18,
  R: 19,
  T: 20,
  Y: 21,
  U: 22,
  I: 23,
  O: 24,
  P: 25,
  A: 30,
  S: 31,
  D: 32,
  F: 33,
  G: 34,
  H: 35,
  J: 36,
  K: 37,
  L: 38,
  Z: 44,
  X: 45,
  C: 46,
  V: 47,
  B: 48,
  N: 49,
  M: 50,
  // 数字键
  '1': 2,
  '2': 3,
  '3': 4,
  '4': 5,
  '5': 6,
  '6': 7,
  '7': 8,
  '8': 9,
  '9': 10,
  '0': 11,
  // 特殊字符键
  '`': 41, // 反引号（Grave/Backquote）
  '-': 12, // 减号/下划线
  '=': 13, // 等号/加号
  '[': 26, // 左方括号/左大括号
  ']': 27, // 右方括号/右大括号
  '\\': 43, // 反斜杠/竖线
  ';': 39, // 分号/冒号
  "'": 40, // 单引号/双引号
  ',': 51, // 逗号/小于号
  '.': 52, // 句号/大于号
  '/': 53, // 斜杠/问号
  // 功能键
  Space: 57,
  Enter: 28,
  Esc: 1,
  Backspace: 14,
  Tab: 15
}

/**
 * keycode 到 UiohookKey 的映射（用于事件抑制）
 */
const KEYCODE_TO_UIOHOOK_KEY: Record<number, number> = {
  // 修饰键
  29: UiohookKey.Ctrl, // Left Control
  3613: UiohookKey.Ctrl, // Right Control (使用相同的 Ctrl 键)
  56: UiohookKey.Alt, // Left Alt
  3640: UiohookKey.Alt, // Right Alt (使用相同的 Alt 键)
  42: UiohookKey.Shift, // Left Shift
  54: UiohookKey.Shift, // Right Shift (使用相同的 Shift 键)
  3675: UiohookKey.Meta, // Left Win/Command
  3676: UiohookKey.Meta, // Right Win/Command (使用相同的 Meta 键)
  // 字母键
  16: UiohookKey.Q,
  17: UiohookKey.W,
  18: UiohookKey.E,
  19: UiohookKey.R,
  20: UiohookKey.T,
  21: UiohookKey.Y,
  22: UiohookKey.U,
  23: UiohookKey.I,
  24: UiohookKey.O,
  25: UiohookKey.P,
  30: UiohookKey.A,
  31: UiohookKey.S,
  32: UiohookKey.D,
  33: UiohookKey.F,
  34: UiohookKey.G,
  35: UiohookKey.H,
  36: UiohookKey.J,
  37: UiohookKey.K,
  38: UiohookKey.L,
  44: UiohookKey.Z,
  45: UiohookKey.X,
  46: UiohookKey.C,
  47: UiohookKey.V,
  48: UiohookKey.B,
  49: UiohookKey.N,
  50: UiohookKey.M,
  // 数字键（主键盘区）- 直接使用 keycode 值
  2: 2, // 1
  3: 3, // 2
  4: 4, // 3
  5: 5, // 4
  6: 6, // 5
  7: 7, // 6
  8: 8, // 7
  9: 9, // 8
  10: 10, // 9
  11: 11, // 0
  // 特殊字符键
  41: UiohookKey.Backquote, // 反引号
  12: UiohookKey.Minus, // 减号
  13: UiohookKey.Equal, // 等号
  26: UiohookKey.BracketLeft, // 左方括号
  27: UiohookKey.BracketRight, // 右方括号
  43: UiohookKey.Backslash, // 反斜杠
  39: UiohookKey.Semicolon, // 分号
  40: UiohookKey.Quote, // 单引号
  51: UiohookKey.Comma, // 逗号
  52: UiohookKey.Period, // 句号
  53: UiohookKey.Slash, // 斜杠
  // 功能键
  57: UiohookKey.Space,
  28: UiohookKey.Enter,
  1: UiohookKey.Escape,
  14: UiohookKey.Backspace,
  15: UiohookKey.Tab
}

/**
 * 抑制快捷键事件
 * 通过立即释放所有当前按下的按键，防止事件传播到底层应用
 *
 * 工作原理：
 * 1. 当检测到快捷键（如 Alt+Q）时，立即释放 Q 和 Alt 键
 * 2. 底层应用只会收到 keyup 事件，不会触发快捷键功能
 * 3. 用户自然释放按键时，keyup 监听器会更新 activeModifiers 状态
 *
 * @param keycode 触发键的 keycode
 */
function suppressHotkeyEvent(keycode: number): void {
  try {
    // 1. 先释放触发键本身（例如 Q 键）
    const triggerKey = KEYCODE_TO_UIOHOOK_KEY[keycode]
    if (triggerKey) {
      uIOhook.keyToggle(triggerKey, 'up')
    }

    // 2. 释放所有当前按下的修饰键（例如 Alt）
    // 这样底层应用只会收到 keyup，不会触发 Alt+Q 组合键
    activeModifiers.forEach((modifier) => {
      let keyToRelease: number | null = null

      switch (modifier) {
        case 'Ctrl':
          keyToRelease = UiohookKey.Ctrl
          break
        case 'Alt':
          keyToRelease = UiohookKey.Alt
          break
        case 'Shift':
          keyToRelease = UiohookKey.Shift
          break
        case 'Meta':
          keyToRelease = UiohookKey.Meta
          break
      }

      if (keyToRelease) {
        uIOhook.keyToggle(keyToRelease, 'up')
      }
    })
  } catch (error) {
    console.error('[Suppress] Failed to suppress hotkey event:', error)
  }
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
  // 🎯 使用立即执行的异步函数，避免阻塞
  ;(async () => {
    try {
      // 清空旧的缓存，准备捕获新内容
      capturedTextOnPress = ''
      capturedTextOnPress = await captureSelectedText()
      // 只在捕获成功时才输出日志
      if (capturedTextOnPress.length > 0) {
        console.log('[MouseListener] 已捕获文本:', capturedTextOnPress.substring(0, 50))
      }
    } catch {
      // 捕获失败时静默处理
      capturedTextOnPress = ''
    }
  })()

  // 设置定时器,达到阈值后立即显示面板
  longPressTimer = setTimeout(() => {
    // 检查是否仍在按下状态
    if (middleButtonPressTime !== null && middleButtonPressPosition !== null) {
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
    // 更新最后事件时间（健康检查）
    lastEventTime = Date.now()

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
      // 🚫 立即抑制快捷键事件，防止穿透到底层应用
      suppressHotkeyEvent(event.keycode)

      // 异步触发快捷指令（包括捕获文本和打开运行器）
      triggerShortcut(shortcutInfo).catch((err) => {
        console.error('[MouseListener] Failed to trigger shortcut:', err)
      })
      return // 不再检测 Super Panel 快捷键
    }

    // 🔑 检测 Super Panel 快捷键触发（例如 Alt+Q）
    if (currentTriggerKey !== null && event.keycode === currentTriggerKey) {
      if (checkModifiersMatch()) {
        // 🚀🚀 极速优化：快速捕获 + 最小延迟显示
        ;(async () => {
          try {
            // 1️⃣ 立即开始捕获选中文本（此时选中状态还在）
            capturedTextOnPress = ''
            const capturePromise = captureSelectedText()

            // 2️⃣ 延迟 25ms 显示面板（等待 Ctrl+C 完成）
            // 这是保证文本捕获成功的最小延迟
            // 25ms 对用户来说仍然是"即时"的（< 100ms 阈值）
            setTimeout(() => {
              showSuperPanelAtMouse()
            }, 25)

            // 3️⃣ 延迟 30ms 抑制事件（在显示面板后）
            setTimeout(() => {
              suppressHotkeyEvent(event.keycode)
            }, 30)

            // 4️⃣ 在后台等待捕获完成
            capturedTextOnPress = await capturePromise
            if (capturedTextOnPress.length > 0) {
              console.log('[MouseListener] 已捕获文本:', capturedTextOnPress.substring(0, 50))
            }
          } catch {
            capturedTextOnPress = ''
          }
        })()
      }
    }
  })

  uIOhook.on('keyup', (event: UiohookKeyboardEvent) => {
    // 更新最后事件时间（健康检查）
    lastEventTime = Date.now()

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
    // 更新最后事件时间（健康检查）
    lastEventTime = Date.now()
    handleButtonDown(event.button as number, event.x as number, event.y as number)
  })

  // Mouse button up event
  uIOhook.on('mouseup', (event: UiohookMouseEvent) => {
    // 更新最后事件时间（健康检查）
    lastEventTime = Date.now()
    handleButtonUp(event.button as number)

    // Left button (button 1) - hide Super Panel when clicking outside
    if (event.button === 1) {
      handleLeftButtonClick(event.x as number, event.y as number)
    }
  })

  // Mouse move event - 检测按键按下期间的鼠标移动
  uIOhook.on('mousemove', (event: UiohookMouseEvent) => {
    // 更新最后事件时间（健康检查）
    lastEventTime = Date.now()
    handleMouseMove(event.x as number, event.y as number)
  })

  // Start the hook
  uIOhook.start()
  isListening = true
  lastEventTime = Date.now()

  // 启动健康检查
  startHealthCheck()

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
    // 停止健康检查
    stopHealthCheck()

    uIOhook.stop()
    isListening = false
    activeModifiers.clear()
    cancelLongPress()
    console.log('Global mouse listener stopped')
  } catch (error) {
    console.error('Error stopping uIOhook:', error)
  }
}

/**
 * Restart global mouse listener
 * 用于系统解锁后恢复监听器
 */
export function restartGlobalMouseListener(): void {
  console.log('[MouseListener] Restarting global mouse listener...')

  // 先停止现有的监听器（如果存在）
  if (isListening) {
    try {
      uIOhook.stop()
      console.log('[MouseListener] Stopped existing listener')
    } catch (error) {
      console.error('[MouseListener] Error stopping existing listener:', error)
    }
  }

  // 重置所有状态
  isListening = false
  activeModifiers.clear()
  cancelLongPress()

  // 等待一小段时间，确保系统完全释放了钩子
  setTimeout(() => {
    try {
      // 重新启动监听器
      setupGlobalMouseListener()
      console.log('[MouseListener] ✓ Global mouse listener restarted successfully')
    } catch (error) {
      console.error('[MouseListener] ✗ Failed to restart listener:', error)
      // 如果重启失败，再尝试一次
      setTimeout(() => {
        try {
          setupGlobalMouseListener()
          console.log('[MouseListener] ✓ Global mouse listener restarted on retry')
        } catch (retryError) {
          console.error('[MouseListener] ✗ Failed to restart listener on retry:', retryError)
        }
      }, 1000)
    }
  }, 100)
}

/**
 * Clear modifier states
 * 用于系统锁定时清除修饰键状态
 */
export function clearModifierStates(): void {
  activeModifiers.clear()
  cancelLongPress()
  console.log('[MouseListener] Modifier states cleared')
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

/**
 * Start health check
 * 定期检查 uIOhook 是否还在正常工作
 * 如果长时间没有收到任何事件（可能表示钩子失效），自动重启
 */
function startHealthCheck(): void {
  // 先停止之前的健康检查（如果存在）
  stopHealthCheck()

  // 每 30 秒检查一次
  healthCheckInterval = setInterval(() => {
    if (!isListening) {
      // 如果监听器已停止，不需要健康检查
      return
    }

    const timeSinceLastEvent = Date.now() - lastEventTime

    // 如果超过 5 分钟没有收到任何事件
    // 注意：这个阈值设置得比较保守，避免误判
    // 因为用户可能真的 5 分钟没有移动鼠标或按键
    // 但如果用户刚解锁系统，这个检查可以作为额外的保险
    const HEALTH_CHECK_THRESHOLD = 5 * 60 * 1000 // 5 minutes

    if (timeSinceLastEvent > HEALTH_CHECK_THRESHOLD) {
      console.warn('===============================================')
      console.warn(
        `⚠️ Health Check: No events received for ${Math.floor(timeSinceLastEvent / 1000)}s`
      )
      console.warn('uIOhook may have stopped working, attempting restart...')
      console.warn('===============================================')

      // 尝试重启监听器
      try {
        restartGlobalMouseListener()
        console.log('[HealthCheck] ✓ Mouse listener restarted')
      } catch (error) {
        console.error('[HealthCheck] ✗ Failed to restart mouse listener:', error)
      }
    }
  }, 30000) // 每 30 秒检查一次

  console.log('[HealthCheck] Health check started')
}

/**
 * Stop health check
 */
function stopHealthCheck(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
    console.log('[HealthCheck] Health check stopped')
  }
}
