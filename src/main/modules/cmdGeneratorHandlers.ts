import { ipcMain, IpcMainInvokeEvent } from 'electron'
import OpenAI from 'openai'
import { getSettings } from './settingsStore'

/**
 * 生成命令的响应接口
 */
interface GenerateCommandResponse {
  success: boolean
  command?: string
  error?: string
}

/**
 * 构建 AI Prompt
 */
function buildPrompt(description: string, shellType: 'cmd' | 'powershell'): string {
  const shellName = shellType === 'cmd' ? 'CMD (命令提示符)' : 'PowerShell'

  return `你是一个 Windows ${shellName} 命令专家。请根据用户的描述生成一个简洁、准确、可直接执行的 ${shellName} 命令。

要求：
1. 只返回纯文本命令，不要使用 Markdown 格式
2. 不要包含代码块标记（如 \`\`\`cmd 或 \`\`\`powershell）
3. 不要包含任何解释、注释或额外文字
4. 命令必须是可以直接在 Windows ${shellName} 中执行的
5. 如果需要多个命令，使用 ${shellType === 'cmd' ? '& 或 &&' : '; 或 &&'} 连接
6. 确保命令的语法正确且安全

用户描述：${description}`
}

/**
 * 清理 Markdown 代码块标记
 */
function cleanMarkdownCodeBlock(text: string): string {
  // 移除开头和结尾的代码块标记
  let cleaned = text.trim()

  // 移除开头的 ```cmd、```powershell、```bash 等
  cleaned = cleaned.replace(/^```(?:cmd|powershell|bash|shell|bat)?\s*\n?/i, '')

  // 移除结尾的 ```
  cleaned = cleaned.replace(/\n?```\s*$/i, '')

  // 移除单个反引号包裹的命令
  if (cleaned.startsWith('`') && cleaned.endsWith('`') && !cleaned.includes('\n')) {
    cleaned = cleaned.slice(1, -1)
  }

  return cleaned.trim()
}

/**
 * 注册命令生成器 IPC handlers
 */
export function registerCmdGeneratorHandlers(): void {
  /**
   * 生成命令
   */
  ipcMain.handle(
    'cmd-generator:generate',
    async (
      _event: IpcMainInvokeEvent,
      description: string,
      shellType: 'cmd' | 'powershell'
    ): Promise<GenerateCommandResponse> => {
      console.log(`Generating ${shellType} command for description:`, description)

      try {
        // 验证输入
        if (!description || description.trim() === '') {
          throw new Error('请输入命令描述')
        }

        // 获取设置
        const settings = await getSettings()

        // 验证 Base URL
        if (!settings.aiBaseUrl || settings.aiBaseUrl.trim() === '') {
          throw new Error('请先在设置中配置 AI Base URL')
        }

        // 验证 API Key
        if (!settings.aiApiKey || settings.aiApiKey.trim() === '') {
          throw new Error('请先在设置中配置 API Key')
        }

        // 初始化 OpenAI 客户端
        const client = new OpenAI({
          apiKey: settings.aiApiKey,
          baseURL: settings.aiBaseUrl
        })

        // 使用默认模型
        const useModel = settings.aiDefaultModel || 'gpt-4o'

        // 构建 prompt
        const prompt = buildPrompt(description.trim(), shellType)

        console.log(`Creating OpenAI completion with model: ${useModel}`)

        // 生成响应（非流式，因为命令通常较短）
        const completion = await client.chat.completions.create({
          model: useModel,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // 使用较低的温度以获得更确定性的输出
          max_tokens: 500 // 命令通常不会太长
        })

        // 提取生成的命令
        let generatedCommand = completion.choices[0]?.message?.content?.trim() || ''

        if (!generatedCommand) {
          throw new Error('AI 未能生成有效的命令')
        }

        // 清理可能存在的 Markdown 代码块标记
        generatedCommand = cleanMarkdownCodeBlock(generatedCommand)

        console.log('Command generated successfully:', generatedCommand.substring(0, 100))

        return {
          success: true,
          command: generatedCommand
        }
      } catch (error: unknown) {
        console.error('Failed to generate command:', error)

        let errorMessage = '生成命令失败，请重试'

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

  console.log('CMD Generator handlers registered')
}

/**
 * 清理命令生成器 IPC handlers
 */
export function cleanupCmdGeneratorHandlers(): void {
  ipcMain.removeHandler('cmd-generator:generate')
  console.log('CMD Generator handlers cleaned up')
}
