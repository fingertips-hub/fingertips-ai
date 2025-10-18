# AI Shortcut Generator 实现文档

## 概述

本文档描述了 AI Shortcut Runner 中生成功能的实现，该功能使用 OpenAI API 来生成 AI 响应。

## 功能特性

- ✅ 使用 OpenAI Node.js 库（v6.4.0）调用 AI API
- ✅ 从应用设置中读取 Base URL 和 API Key
- ✅ 流式输出 AI 响应（实时显示生成内容）
- ✅ 完整的错误处理和用户友好的错误提示
- ✅ 配置验证（检查 Base URL 和 API Key 是否已配置）

## 架构设计

### 1. 主进程 (Main Process)

**文件**: `src/main/modules/aiShortcutRunnerHandlers.ts`

主要修改：

- 导入 OpenAI 库和 settingsStore
- 新增 IPC 处理器 `ai-shortcut-runner:generate`
- 实现流式响应处理

```typescript
import OpenAI from 'openai'
import { getSettings } from './settingsStore'

// Generate AI response
ipcMain.handle('ai-shortcut-runner:generate', async (_event, prompt) => {
  // 1. 获取设置
  const settings = await getSettings()

  // 2. 验证配置
  if (!settings.aiBaseUrl) throw new Error('请先在设置中配置 AI Base URL')
  if (!settings.aiApiKey) throw new Error('请先在设置中配置 API Key')

  // 3. 初始化 OpenAI 客户端
  const client = new OpenAI({
    apiKey: settings.aiApiKey,
    baseURL: settings.aiBaseUrl
  })

  // 4. 流式生成响应
  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    stream: true
  })

  // 5. 实时发送进度更新
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || ''
    _event.sender.send('ai-shortcut-runner:generate-progress', content)
  }
})
```

### 2. Preload 层

**文件**:

- `src/preload/index.ts` - API 实现
- `src/preload/index.d.ts` - TypeScript 类型定义

新增 API：

```typescript
aiShortcutRunner: {
  // 生成 AI 响应
  generate: (prompt: string) => Promise<{
    success: boolean
    content?: string
    error?: string
  }>

  // 监听生成进度（流式输出）
  onGenerateProgress: (callback: (content: string) => void) => void

  // 移除进度监听器
  removeGenerateProgressListener: () => void
}
```

### 3. 渲染进程 (Renderer Process)

**文件**: `src/renderer/src/AIShortcutRunner.vue`

主要修改：

#### 生命周期管理

```typescript
onMounted(() => {
  // 监听生成进度（流式更新）
  window.api.aiShortcutRunner.onGenerateProgress((content) => {
    outputText.value += content
  })
})

onUnmounted(() => {
  // 清理监听器
  window.api.aiShortcutRunner.removeGenerateProgressListener()
})
```

#### 生成逻辑

```typescript
const handleGenerate = async () => {
  isGenerating.value = true
  outputText.value = ''

  try {
    // 调用主进程 API
    const result = await window.api.aiShortcutRunner.generate(inputText.value)

    if (result.success) {
      // 流式更新会自动填充 outputText
      success('生成成功')
    } else {
      error(result.error || '生成失败，请重试')
    }
  } catch (err) {
    error('生成失败，请检查网络连接或重试')
  } finally {
    isGenerating.value = false
  }
}
```

## 错误处理

实现了完整的错误处理机制：

### 1. 配置验证错误

- 未配置 Base URL: "请先在设置中配置 AI Base URL"
- 未配置 API Key: "请先在设置中配置 API Key"

### 2. API 错误

- 401 未授权: "API Key 无效或未授权"
- 429 频率限制: "API 请求频率超限，请稍后重试"
- 500 服务器错误: "OpenAI 服务器错误，请稍后重试"
- 其他错误: "API 错误: {具体错误信息}"

### 3. 网络错误

- 通用错误: "生成失败，请检查网络连接或重试"

## OpenAI API 集成

### 使用的模型

默认使用 `gpt-4o` 模型

### API 调用方式

采用流式 (Streaming) 方式调用，优势：

- 实时显示生成内容，用户体验更好
- 减少等待时间
- 可以看到生成进度

### 配置灵活性

- Base URL: 支持自定义 API 端点（兼容 OpenAI 兼容接口）
- API Key: 用户自行配置
- 模型: 目前硬编码为 gpt-4o（后续可扩展为可配置）

## 设置集成

配置通过 `settingsStore` 管理：

```typescript
// 设置接口
interface AppSettings {
  aiBaseUrl: string // 默认: 'https://api.openai.com/v1'
  aiApiKey: string // 默认: ''
}
```

用户在 `CommonSettings.vue` 中配置：

- AI Base URL
- API Key（带密码输入框）

设置存储在 localStorage 和 electron-store 中。

## 测试建议

### 1. 配置测试

- [ ] 未配置 Base URL 时点击生成，应显示错误提示
- [ ] 未配置 API Key 时点击生成，应显示错误提示
- [ ] 配置正确后应能正常生成

### 2. 生成测试

- [ ] 输入简单提示词，验证能生成响应
- [ ] 验证流式输出（内容逐字显示）
- [ ] 长文本生成测试
- [ ] 多次连续生成测试

### 3. 错误测试

- [ ] 错误的 API Key，应显示 401 错误提示
- [ ] 网络断开时，应显示网络错误提示
- [ ] 快速连续点击生成按钮，应防止重复请求

### 4. UI 测试

- [ ] 生成中按钮应显示 loading 状态
- [ ] 生成中输出区域应显示加载提示
- [ ] 生成完成后应显示成功提示
- [ ] 错误时应显示错误 toast

## 后续优化方向

### 1. 功能扩展

- [ ] 支持选择不同的模型（GPT-3.5, GPT-4, 等）
- [ ] 支持自定义温度、max tokens 等参数
- [ ] 支持对话历史（多轮对话）
- [ ] 支持停止生成

### 2. 性能优化

- [ ] 添加请求缓存
- [ ] 支持并发请求管理
- [ ] 添加请求重试机制

### 3. 用户体验

- [ ] 显示 token 使用情况
- [ ] 显示生成速度
- [ ] 支持导出生成结果
- [ ] 支持历史记录

## 相关文件

### 主进程

- `src/main/modules/aiShortcutRunnerHandlers.ts` - IPC 处理器
- `src/main/modules/settingsStore.ts` - 设置存储

### Preload

- `src/preload/index.ts` - API 实现
- `src/preload/index.d.ts` - 类型定义

### 渲染进程

- `src/renderer/src/AIShortcutRunner.vue` - Runner 组件
- `src/renderer/src/components/settings/CommonSettings.vue` - 设置页面
- `src/renderer/src/stores/settings.ts` - 设置 Store

## 依赖

- `openai`: ^6.4.0 - OpenAI Node.js SDK
- `electron-store`: ^11.0.2 - 持久化存储

## 参考资料

- [OpenAI Node.js SDK](https://github.com/openai/openai-node)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Electron IPC](https://www.electronjs.org/docs/latest/api/ipc-main)
