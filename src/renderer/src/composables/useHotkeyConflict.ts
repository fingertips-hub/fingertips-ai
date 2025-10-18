import { computed } from 'vue'
import { useAIShortcutStore } from '../stores/aiShortcut'
import { useSettingsStore } from '../stores/settings'

/**
 * 快捷键项接口
 */
export interface HotkeyItem {
  hotkey: string
  name: string
  id?: string
}

/**
 * 快捷键冲突检测 Composable
 * 收集应用中所有已注册的快捷键，用于冲突检测
 */
export function useHotkeyConflict() {
  const aiShortcutStore = useAIShortcutStore()
  const settingsStore = useSettingsStore()

  /**
   * 收集所有现有的快捷键（用于冲突检测）
   * 包括：
   * 1. Super Panel 的快捷键
   * 2. 所有 AI Shortcut 的快捷键
   */
  const existingHotkeys = computed<HotkeyItem[]>(() => {
    const hotkeys: HotkeyItem[] = []

    // 1. 添加 Super Panel 的快捷键
    if (settingsStore.settings.hotkey) {
      hotkeys.push({
        hotkey: settingsStore.settings.hotkey,
        name: 'Super Panel',
        id: 'super-panel'
      })
    }

    // 2. 添加所有 AI Shortcut 的快捷键
    aiShortcutStore.shortcuts.forEach((shortcut) => {
      if (shortcut.hotkey) {
        hotkeys.push({
          hotkey: shortcut.hotkey,
          name: shortcut.name,
          id: shortcut.id
        })
      }
    })

    return hotkeys
  })

  /**
   * 检查指定快捷键是否冲突
   * @param hotkey 要检查的快捷键
   * @param currentId 当前编辑的项的 ID（用于排除自身）
   * @returns 冲突的快捷键信息，如果没有冲突则返回 null
   */
  const checkHotkeyConflict = (hotkey: string, currentId?: string): HotkeyItem | null => {
    if (!hotkey) {
      return null
    }

    const conflict = existingHotkeys.value.find((item) => {
      // 排除当前编辑的快捷键（通过 ID）
      if (currentId && item.id === currentId) {
        return false
      }
      // 比较快捷键（忽略大小写）
      return item.hotkey.toLowerCase() === hotkey.toLowerCase()
    })

    return conflict || null
  }

  return {
    existingHotkeys,
    checkHotkeyConflict
  }
}
