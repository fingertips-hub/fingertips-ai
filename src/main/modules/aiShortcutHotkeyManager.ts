/**
 * AI 快捷指令快捷键管理器
 *
 * 功能：
 * 1. 管理所有 AI 快捷指令的全局快捷键
 * 2. 监听快捷键触发
 * 3. 捕获选中文本并打开对应的 AI 快捷指令运行器
 *
 * 设计：
 * - 复用现有的 uiohook-napi 全局键盘监听（mouseListener 中已启动）
 * - 使用快捷指令 ID 作为 key 存储快捷键映射
 * - 支持键盘快捷键和鼠标长按（与 Super Panel 共享机制）
 */

import { captureSelectedText, createAIShortcutRunnerWindow } from './aiShortcutRunner'

/**
 * 快捷指令快捷键映射
 * key: 快捷指令 ID
 * value: { hotkey: 快捷键字符串, name: 指令名称, icon: 图标, prompt: 提示词, model: 模型, temperature: 温度 }
 */
interface ShortcutHotkeyInfo {
  hotkey: string
  name: string
  icon: string
  prompt: string
  model?: string
  temperature?: number
}

const shortcutHotkeys = new Map<string, ShortcutHotkeyInfo>()

/**
 * 快捷键到快捷指令 ID 的反向映射
 * key: 快捷键字符串 (e.g., "Ctrl+Alt+T")
 * value: 快捷指令 ID
 */
const hotkeyToShortcutId = new Map<string, string>()

/**
 * 解析快捷键字符串为键码和修饰键
 *
 * @param hotkey 快捷键字符串，如 "Ctrl+Alt+T" 或 "LongPress:Middle"
 * @returns { modifiers: Set<string>, key: string | null } 或 null（如果是鼠标动作）
 */
function parseHotkey(hotkey: string): {
  modifiers: Set<string>
  key: string | null
  isMouseAction: boolean
} | null {
  if (!hotkey) return null

  // 检查是否是鼠标动作（由 Super Panel 的快捷键系统处理）
  if (hotkey.includes('LongPress:')) {
    return {
      modifiers: new Set(),
      key: null,
      isMouseAction: true
    }
  }

  const parts = hotkey.split('+')
  const modifiers = new Set<string>()
  let key: string | null = null

  for (const part of parts) {
    if (['Ctrl', 'Alt', 'Shift', 'Meta'].includes(part)) {
      modifiers.add(part)
    } else {
      key = part
    }
  }

  return {
    modifiers,
    key,
    isMouseAction: false
  }
}

/**
 * 键名到 keycode 的映射（扩展自 mouseListener.ts）
 */
const KEY_NAME_TO_CODE: Record<string, number> = {
  // 字母键
  A: 30,
  B: 48,
  C: 46,
  D: 32,
  E: 18,
  F: 33,
  G: 34,
  H: 35,
  I: 23,
  J: 36,
  K: 37,
  L: 38,
  M: 50,
  N: 49,
  O: 24,
  P: 25,
  Q: 16,
  R: 19,
  S: 31,
  T: 20,
  U: 22,
  V: 47,
  W: 17,
  X: 45,
  Y: 21,
  Z: 44,

  // 数字键
  '0': 11,
  '1': 2,
  '2': 3,
  '3': 4,
  '4': 5,
  '5': 6,
  '6': 7,
  '7': 8,
  '8': 9,
  '9': 10,

  // 功能键
  F1: 59,
  F2: 60,
  F3: 61,
  F4: 62,
  F5: 63,
  F6: 64,
  F7: 65,
  F8: 66,
  F9: 67,
  F10: 68,
  F11: 87,
  F12: 88,

  // 特殊键
  Space: 57,
  Enter: 28,
  Esc: 1,
  Backspace: 14,
  Tab: 15,
  Escape: 1
}

/**
 * 当前活动的修饰键（从 mouseListener 共享）
 * 注意：这是一个简化版本，实际应该从 mouseListener 获取
 */
let activeModifiers = new Set<string>()

/**
 * 更新活动修饰键状态（由 mouseListener 调用）
 */
export function updateActiveModifiers(modifiers: Set<string>): void {
  activeModifiers = new Set(modifiers)
}

/**
 * 检查修饰键是否匹配
 */
function checkModifiersMatch(required: Set<string>): boolean {
  if (required.size !== activeModifiers.size) return false

  for (const mod of required) {
    if (!activeModifiers.has(mod)) return false
  }

  return true
}

/**
 * 注册快捷指令的快捷键
 *
 * @param shortcutId 快捷指令 ID
 * @param hotkey 快捷键字符串
 * @param name 指令名称
 * @param icon 指令图标
 * @param prompt 指令提示词
 * @param model AI 模型（可选）
 * @param temperature 温度参数（可选）
 * @returns 是否注册成功
 */
export function registerShortcutHotkey(
  shortcutId: string,
  hotkey: string,
  name: string,
  icon: string,
  prompt: string,
  model?: string,
  temperature?: number
): boolean {
  try {
    // 检查是否已存在相同的快捷键
    if (hotkeyToShortcutId.has(hotkey)) {
      const existingId = hotkeyToShortcutId.get(hotkey)!
      if (existingId !== shortcutId) {
        console.warn(
          `[AIShortcutHotkeyManager] Hotkey ${hotkey} already registered for shortcut ${existingId}`
        )
        return false
      }
    }

    // 先注销旧的快捷键（如果存在）
    unregisterShortcutHotkey(shortcutId)

    // 解析快捷键
    const parsed = parseHotkey(hotkey)
    if (!parsed) {
      console.error(`[AIShortcutHotkeyManager] Invalid hotkey: ${hotkey}`)
      return false
    }

    // 鼠标动作由 Super Panel 的快捷键系统处理，这里不支持
    if (parsed.isMouseAction) {
      console.warn(
        `[AIShortcutHotkeyManager] Mouse actions are not supported for AI shortcuts: ${hotkey}`
      )
      return false
    }

    // 必须有键名
    if (!parsed.key) {
      console.error(`[AIShortcutHotkeyManager] Hotkey must have a key: ${hotkey}`)
      return false
    }

    // 存储映射
    shortcutHotkeys.set(shortcutId, { hotkey, name, icon, prompt, model, temperature })
    hotkeyToShortcutId.set(hotkey, shortcutId)

    console.log(
      `[AIShortcutHotkeyManager] Registered hotkey ${hotkey} for shortcut "${name}" (${shortcutId})`
    )
    return true
  } catch (error) {
    console.error(`[AIShortcutHotkeyManager] Failed to register hotkey:`, error)
    return false
  }
}

/**
 * 注销快捷指令的快捷键
 *
 * @param shortcutId 快捷指令 ID
 */
export function unregisterShortcutHotkey(shortcutId: string): void {
  const info = shortcutHotkeys.get(shortcutId)
  if (info) {
    hotkeyToShortcutId.delete(info.hotkey)
    shortcutHotkeys.delete(shortcutId)
    console.log(
      `[AIShortcutHotkeyManager] Unregistered hotkey ${info.hotkey} for shortcut ${shortcutId}`
    )
  }
}

/**
 * 检查快捷键是否触发了某个快捷指令
 *
 * 此函数由 mouseListener 的 keydown 事件调用
 *
 * @param keycode 键码
 * @param modifiers 修饰键集合
 * @returns 如果触发了快捷指令，返回快捷指令信息；否则返回 null
 */
export function checkShortcutHotkeyTriggered(
  keycode: number,
  _modifiers: Set<string>
): ShortcutHotkeyInfo | null {
  // 遍历所有注册的快捷键
  for (const [_shortcutId, info] of shortcutHotkeys.entries()) {
    const parsed = parseHotkey(info.hotkey)
    if (!parsed || parsed.isMouseAction || !parsed.key) continue

    // 检查修饰键是否匹配
    if (!checkModifiersMatch(parsed.modifiers)) continue

    // 检查键码是否匹配
    const requiredKeycode = KEY_NAME_TO_CODE[parsed.key]
    if (requiredKeycode && requiredKeycode === keycode) {
      console.log(
        `[AIShortcutHotkeyManager] Shortcut hotkey triggered: ${info.hotkey} -> "${info.name}"`
      )
      return info
    }
  }

  return null
}

/**
 * 触发快捷指令执行
 *
 * @param info 快捷指令信息
 */
export async function triggerShortcut(info: ShortcutHotkeyInfo): Promise<void> {
  try {
    console.log(`[AIShortcutHotkeyManager] Triggering shortcut: "${info.name}"`)

    // 1. 捕获选中的文本
    console.log('[AIShortcutHotkeyManager] Capturing selected text...')
    const selectedText = await captureSelectedText()

    if (selectedText) {
      console.log(`[AIShortcutHotkeyManager] Captured text length: ${selectedText.length}`)
    } else {
      console.log('[AIShortcutHotkeyManager] No text captured')
    }

    // 2. 打开 AI 快捷指令运行器
    // 注意：这里需要一个特殊的标记，告诉运行器自动执行
    await createAIShortcutRunnerWindow({
      id: '', // ID 可以为空，因为我们不需要加载已保存的数据
      name: info.name,
      icon: info.icon,
      prompt: info.prompt,
      selectedText: selectedText || '',
      autoExecute: true, // 新增：自动执行标记
      model: info.model,
      temperature: info.temperature
    })

    console.log(`[AIShortcutHotkeyManager] Shortcut "${info.name}" triggered successfully`)
  } catch (error) {
    console.error(`[AIShortcutHotkeyManager] Failed to trigger shortcut:`, error)
  }
}

/**
 * 获取所有已注册的快捷键
 */
export function getAllRegisteredHotkeys(): Map<string, ShortcutHotkeyInfo> {
  return new Map(shortcutHotkeys)
}

/**
 * 清空所有快捷键
 */
export function clearAllHotkeys(): void {
  shortcutHotkeys.clear()
  hotkeyToShortcutId.clear()
  console.log('[AIShortcutHotkeyManager] All hotkeys cleared')
}
