import { ipcMain, IpcMainEvent } from 'electron'
import {
  createAIShortcutRunnerWindow,
  closeAIShortcutRunnerWindow,
  setAIShortcutRunnerPinned,
  captureSelectedText
} from './aiShortcutRunner'

/**
 * 快捷指令数据接口
 */
interface ShortcutData {
  id: string
  name: string
  icon: string
  prompt: string
  selectedText?: string // 用户选中的文本（可选）
}

/**
 * Register AI Shortcut Runner IPC handlers
 */
export function registerAIShortcutRunnerHandlers(): void {
  // 提供一个获取选中文本的 IPC（保护剪贴板）
  ipcMain.handle('ai-shortcut-runner:capture-selected-text', async () => {
    return await captureSelectedText()
  })

  // Open AI Shortcut Runner window
  ipcMain.on(
    'ai-shortcut-runner:open',
    async (_event: IpcMainEvent, shortcutData: ShortcutData) => {
      console.log('Opening AI Shortcut Runner with data:', shortcutData)
      await createAIShortcutRunnerWindow(shortcutData)
    }
  )

  // Close AI Shortcut Runner window
  ipcMain.on('ai-shortcut-runner:close', () => {
    console.log('Closing AI Shortcut Runner')
    closeAIShortcutRunnerWindow()
  })

  // Set pinned state
  ipcMain.on('ai-shortcut-runner:set-pinned', (_event: IpcMainEvent, pinned: boolean) => {
    console.log('Setting AI Shortcut Runner pinned state:', pinned)
    setAIShortcutRunnerPinned(pinned)
  })

  console.log('AI Shortcut Runner handlers registered')
}
