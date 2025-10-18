import { BrowserWindow, shell, clipboard } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { uIOhook, UiohookKey } from 'uiohook-napi'
import icon from '../../../resources/icon.png?asset'
import { getCachedSelectedText } from './superPanel'

// AI Shortcut Runner window instance
let aiShortcutRunnerWindow: BrowserWindow | null = null

// AI Shortcut Runner state
let isPinned = false // 标记窗口是否被固定

// 全局缓存的选中文本
let cachedSelectedText = ''

// 🔒 全局捕获锁：防止多个 captureSelectedText 同时运行
let isCapturing = false

// AI Shortcut Runner configuration
const AI_SHORTCUT_RUNNER_CONFIG = {
  width: 800,
  height: 700,
  minWidth: 600,
  minHeight: 500
}

/**
 * 快捷指令数据接口
 */
interface ShortcutData {
  id: string
  name: string
  icon: string
  prompt: string
  selectedText?: string // 用户选中的文本（可选）
  autoExecute?: boolean // 是否自动执行（用于快捷键触发）
}

/**
 * 捕获当前选中的文本（通过模拟 Ctrl+C 实现，保护剪贴板）
 * 使用 uiohook-napi 发送键盘事件，确保跨平台兼容性
 * 捕获的文本会被缓存，供 AI Shortcut Runner 使用
 */
/**
 * 强制释放所有修饰键
 * 这是一个关键的安全措施，确保键盘状态不会被锁定
 */
function forceReleaseAllModifiers(): void {
  try {
    console.log('[captureSelectedText] 强制释放所有修饰键...')
    const modifiers = [
      UiohookKey.Alt,
      UiohookKey.Shift,
      UiohookKey.ShiftRight,
      UiohookKey.Ctrl,
      UiohookKey.CtrlRight,
      UiohookKey.Meta,
      UiohookKey.MetaRight
    ]

    for (const key of modifiers) {
      try {
        uIOhook.keyToggle(key, 'up')
      } catch {
        // 忽略单个按键释放失败
      }
    }
    console.log('[captureSelectedText] 所有修饰键已释放')
  } catch (error) {
    console.error('[captureSelectedText] 释放修饰键时出错:', error)
  }
}

export async function captureSelectedText(): Promise<string> {
  // 🔒 检查是否已经在捕获中，如果是，直接返回空字符串
  if (isCapturing) {
    console.warn('[captureSelectedText] 已有捕获操作正在进行，跳过本次调用')
    return ''
  }

  // 设置捕获标志
  isCapturing = true
  let ctrlKeyPressed = false
  const ctrlKey = process.platform === 'darwin' ? UiohookKey.Meta : UiohookKey.Ctrl

  try {
    console.log('[captureSelectedText] 开始捕获...')
    const previousClipboard = clipboard.readText()
    console.log('[captureSelectedText] 已保存剪贴板')

    // 剪贴板哨兵：用于确保检测到新的复制内容
    const sentinel = `__FT_SENTINEL__${Date.now()}_${Math.random().toString(36).slice(2)}`
    clipboard.writeText(sentinel)

    // 第一步：释放所有修饰键
    forceReleaseAllModifiers()

    // 🚀🚀 极速优化：进一步减少初始延迟 20ms → 10ms
    await new Promise((resolve) => setTimeout(resolve, 10))

    // 第二步：发送 Ctrl+C（macOS 使用 Cmd+C）
    console.log('[captureSelectedText] 准备发送复制指令...')

    try {
      // 🚀🚀 极速优化：进一步减少按键间隔 5ms → 3ms
      // 按下 Ctrl
      uIOhook.keyToggle(ctrlKey, 'down')
      ctrlKeyPressed = true
      await new Promise((resolve) => setTimeout(resolve, 3))

      // 按下 C
      uIOhook.keyToggle(UiohookKey.C, 'down')
      await new Promise((resolve) => setTimeout(resolve, 3))

      // 释放 C
      uIOhook.keyToggle(UiohookKey.C, 'up')
      await new Promise((resolve) => setTimeout(resolve, 3))

      // 释放 Ctrl
      uIOhook.keyToggle(ctrlKey, 'up')
      ctrlKeyPressed = false
      await new Promise((resolve) => setTimeout(resolve, 3))

      console.log('[captureSelectedText] 已通过 uiohook 发送复制指令')
    } catch (err) {
      console.error('[captureSelectedText] uiohook 发送失败:', err)
      // ⚠️ 关键：如果发送失败，立即在 finally 块中释放所有按键
      throw err
    }

    // 🚀🚀 极速优化：进一步减少轮询时间和间隔
    // 第三步：轮询等待剪贴板变化，最多 300ms，每 20ms 检查一次
    // 先立即检查一次（0ms），然后才开始轮询
    const startedAt = Date.now()
    let selectedText = ''

    // 🎯 关键优化：立即检查一次剪贴板（不等待）
    let current = ''
    try {
      if (process.platform === 'linux') {
        current = (clipboard.readText('selection') || clipboard.readText() || '').trim()
      } else {
        current = (clipboard.readText() || '').trim()
      }
    } catch {
      current = (clipboard.readText() || '').trim()
    }

    if (current && current !== previousClipboard && !current.startsWith('__FT_SENTINEL__')) {
      selectedText = current
    } else {
      // 如果第一次检查没有结果，开始轮询
      while (Date.now() - startedAt < 300) {
        try {
          if (process.platform === 'linux') {
            current = (clipboard.readText('selection') || clipboard.readText() || '').trim()
          } else {
            current = (clipboard.readText() || '').trim()
          }
        } catch {
          current = (clipboard.readText() || '').trim()
        }
        if (current && current !== previousClipboard && !current.startsWith('__FT_SENTINEL__')) {
          selectedText = current
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
    }

    if (!selectedText) {
      console.log('[captureSelectedText] 剪贴板内容未改变或为空，可能没有选中文本或复制被拦截')
    } else {
      console.log('[captureSelectedText] 捕获的文本:', selectedText.substring(0, 50))
    }

    // 第四步：恢复剪贴板
    clipboard.writeText(previousClipboard)
    console.log('[captureSelectedText] 已恢复剪贴板')

    // 缓存捕获的文本（可能为空，调用方据此判断）
    cachedSelectedText = selectedText

    return selectedText
  } catch (error) {
    console.error('[captureSelectedText] 错误:', error)
    cachedSelectedText = ''
    return ''
  } finally {
    // 🔑 关键安全措施：无论成功还是失败，都要确保释放所有修饰键
    // 这样可以防止键盘状态被锁定
    if (ctrlKeyPressed) {
      try {
        console.log('[captureSelectedText] Finally: 释放 Ctrl 键')
        uIOhook.keyToggle(ctrlKey, 'up')
      } catch (err) {
        console.error('[captureSelectedText] Finally: 释放 Ctrl 键失败:', err)
      }
    }

    // 额外的安全措施：强制释放所有修饰键
    forceReleaseAllModifiers()

    // 🚀🚀 极速优化：进一步减少最后延迟 20ms → 10ms
    await new Promise((resolve) => setTimeout(resolve, 10))
    console.log('[captureSelectedText] 捕获流程结束，键盘状态已清理')

    // 🔓 最后释放捕获锁
    isCapturing = false
    console.log('[captureSelectedText] 捕获锁已释放')
  }
}

/**
 * 获取缓存的选中文本（由 captureSelectedText 捕获）
 */
export function getGlobalCachedSelectedText(): string {
  const text = cachedSelectedText
  // 返回后清空缓存
  cachedSelectedText = ''
  return text
}

/**
 * Create AI Shortcut Runner window
 */
export async function createAIShortcutRunnerWindow(
  shortcutData: ShortcutData
): Promise<BrowserWindow> {
  // 优先使用传入的 selectedText，然后尝试从缓存获取
  if (!shortcutData.selectedText) {
    // 先从 mouseListener 获取（鼠标长按触发）
    let cachedText = getCachedSelectedText()

    // 如果没有，再从全局缓存获取（键盘快捷键触发）
    if (!cachedText) {
      cachedText = getGlobalCachedSelectedText()
    }

    if (cachedText && cachedText.length < 10000) {
      shortcutData.selectedText = cachedText
      console.log('[AIShortcutRunner] 使用缓存的选中文本，长度:', cachedText.length)
    } else {
      console.log('[AIShortcutRunner] 无缓存文本可用')
    }
  }

  // If window already exists, focus and update data
  if (aiShortcutRunnerWindow && !aiShortcutRunnerWindow.isDestroyed()) {
    aiShortcutRunnerWindow.focus()
    // Send new data to existing window
    aiShortcutRunnerWindow.webContents.send('ai-shortcut-runner:init-data', shortcutData)
    return aiShortcutRunnerWindow
  }

  const window = new BrowserWindow({
    width: AI_SHORTCUT_RUNNER_CONFIG.width,
    height: AI_SHORTCUT_RUNNER_CONFIG.height,
    minWidth: AI_SHORTCUT_RUNNER_CONFIG.minWidth,
    minHeight: AI_SHORTCUT_RUNNER_CONFIG.minHeight,
    show: false,
    frame: false, // 隐藏默认标题栏
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the page
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/ai-shortcut-runner.html')
  } else {
    window.loadFile(join(__dirname, '../renderer/ai-shortcut-runner.html'))
  }

  // Show window when ready
  window.once('ready-to-show', () => {
    window.show()
    // Send initial data to renderer after window is ready
    window.webContents.send('ai-shortcut-runner:init-data', shortcutData)
  })

  // Clean up reference when window is closed
  window.on('closed', () => {
    aiShortcutRunnerWindow = null
  })

  // Development only: open devtools
  if (is.dev) {
    window.webContents.openDevTools({ mode: 'detach' })
  }

  aiShortcutRunnerWindow = window
  return window
}

/**
 * Get AI Shortcut Runner window instance
 */
export function getAIShortcutRunnerWindow(): BrowserWindow | null {
  return aiShortcutRunnerWindow
}

/**
 * Close AI Shortcut Runner window
 */
export function closeAIShortcutRunnerWindow(): void {
  if (aiShortcutRunnerWindow && !aiShortcutRunnerWindow.isDestroyed()) {
    aiShortcutRunnerWindow.close()
    aiShortcutRunnerWindow = null
  }
}

/**
 * Check if AI Shortcut Runner is visible
 */
export function isAIShortcutRunnerVisible(): boolean {
  return (
    aiShortcutRunnerWindow !== null &&
    !aiShortcutRunnerWindow.isDestroyed() &&
    aiShortcutRunnerWindow.isVisible()
  )
}

/**
 * Set pinned state
 */
export function setAIShortcutRunnerPinned(pinned: boolean): void {
  isPinned = pinned
  if (aiShortcutRunnerWindow && !aiShortcutRunnerWindow.isDestroyed()) {
    aiShortcutRunnerWindow.setAlwaysOnTop(pinned)
  }
  console.log('AI Shortcut Runner pinned state changed:', isPinned)
}

/**
 * Check if window is pinned
 */
export function isAIShortcutRunnerPinned(): boolean {
  return isPinned
}
