import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import {
  createAIShortcutRunnerWindow,
  closeAIShortcutRunnerWindow,
  setAIShortcutRunnerPinned,
  captureSelectedText
} from './aiShortcutRunner'
import { registerShortcutHotkey, unregisterShortcutHotkey } from './aiShortcutHotkeyManager'
import OpenAI from 'openai'
import { getSettings } from './settingsStore'

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
    async (
      _event: IpcMainEvent,
      shortcutData: ShortcutData & { model?: string; temperature?: number }
    ) => {
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

  // Register shortcut hotkey
  ipcMain.handle(
    'ai-shortcut-hotkey:register',
    async (
      _event,
      shortcutId: string,
      hotkey: string,
      name: string,
      icon: string,
      prompt: string,
      model?: string,
      temperature?: number
    ) => {
      console.log(`Registering hotkey for shortcut: ${name} (${hotkey})`)
      return registerShortcutHotkey(shortcutId, hotkey, name, icon, prompt, model, temperature)
    }
  )

  // Unregister shortcut hotkey
  ipcMain.handle('ai-shortcut-hotkey:unregister', async (_event, shortcutId: string) => {
    console.log(`Unregistering hotkey for shortcut: ${shortcutId}`)
    unregisterShortcutHotkey(shortcutId)
    return true
  })

  // Load all shortcuts hotkeys (called during initialization)
  ipcMain.handle(
    'ai-shortcut-hotkey:load-all',
    async (
      _event,
      shortcuts: Array<{
        id: string
        name: string
        icon: string
        prompt: string
        hotkey?: string
        model?: string
        temperature?: number
      }>
    ) => {
      console.log(`Loading ${shortcuts.length} shortcut hotkeys...`)
      let registeredCount = 0

      for (const shortcut of shortcuts) {
        if (shortcut.hotkey) {
          const success = registerShortcutHotkey(
            shortcut.id,
            shortcut.hotkey,
            shortcut.name,
            shortcut.icon,
            shortcut.prompt,
            shortcut.model,
            shortcut.temperature
          )
          if (success) {
            registeredCount++
          }
        }
      }

      console.log(`Successfully registered ${registeredCount} shortcut hotkeys`)
      return registeredCount
    }
  )

  // Generate AI response
  ipcMain.handle(
    'ai-shortcut-runner:generate',
    async (_event: IpcMainInvokeEvent, prompt: string, model?: string, temperature?: number) => {
      console.log('Generating AI response for prompt:', prompt)
      console.log('Model:', model, 'Temperature:', temperature)

      try {
        // Get settings
        const settings = await getSettings()

        // Validate base URL
        if (!settings.aiBaseUrl || settings.aiBaseUrl.trim() === '') {
          throw new Error('请先在设置中配置 AI Base URL')
        }

        // Validate API Key
        if (!settings.aiApiKey || settings.aiApiKey.trim() === '') {
          throw new Error('请先在设置中配置 API Key')
        }

        // Initialize OpenAI client
        const client = new OpenAI({
          apiKey: settings.aiApiKey,
          baseURL: settings.aiBaseUrl
        })

        // 确定使用的模型和温度参数
        const useModel = model || settings.aiDefaultModel || 'gpt-4o'
        const useTemperature = temperature !== undefined ? temperature : 1.0

        // Generate response using streaming
        console.log(
          `Creating OpenAI stream with model: ${useModel}, temperature: ${useTemperature}`
        )
        const stream = await client.chat.completions.create({
          model: useModel,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: useTemperature,
          stream: true
        })

        // Collect the response
        let fullResponse = ''
        let chunkCount = 0
        console.log('Starting to process stream chunks...')

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            fullResponse += content
            chunkCount++

            // Send progress updates to renderer
            if (_event.sender && !_event.sender.isDestroyed()) {
              _event.sender.send('ai-shortcut-runner:generate-progress', content)
              // 每 10 个 chunk 记录一次日志
              if (chunkCount % 10 === 0) {
                console.log(`Sent ${chunkCount} chunks, total length: ${fullResponse.length}`)
              }
            } else {
              console.warn('Event sender is destroyed, cannot send progress')
              break
            }
          }
        }

        console.log(
          `AI generation completed successfully. Total chunks: ${chunkCount}, Total length: ${fullResponse.length}`
        )
        return {
          success: true,
          content: fullResponse
        }
      } catch (error: unknown) {
        console.error('Failed to generate AI response:', error)

        let errorMessage = '生成失败，请重试'

        if (error instanceof OpenAI.APIError) {
          console.error(`OpenAI API Error - Status: ${error.status}, Message: ${error.message}`)
          if (error.status === 401) {
            errorMessage = 'API Key 无效或未授权'
          } else if (error.status === 429) {
            errorMessage = 'API 请求频率超限，请稍后重试'
          } else if (error.status === 500) {
            errorMessage = 'OpenAI 服务器错误，请稍后重试'
          } else {
            errorMessage = `API 错误: ${error.message}`
          }
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        return {
          success: false,
          error: errorMessage
        }
      }
    }
  )

  console.log('AI Shortcut Runner handlers registered')
}
