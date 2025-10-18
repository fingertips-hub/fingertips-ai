# AI Shortcut Prompt 模板功能

## 概述

实现了 AI Shortcut 的 prompt 模板功能，支持通过占位符 `[TEXT]` 来动态替换用户输入或选中的文本，提供灵活的 AI 提示词组合方式。

## 功能特性

### ✅ 核心功能

1. **Prompt 模板保存**
   - 保存快捷指令配置的 prompt 模板
   - 在初始化时接收并显示模板信息

2. **[TEXT] 占位符支持**
   - 支持在 prompt 中使用 `[TEXT]` 占位符（不区分大小写）
   - 运行时将占位符替换为用户输入或选中的文本

3. **智能组合策略**
   - 有占位符：替换 `[TEXT]` 为用户输入
   - 无占位符：拼接 prompt 和用户输入
   - 纯模板：用户无输入时直接使用模板

4. **UI 提示**
   - 显示当前使用的 prompt 模板
   - 动态占位符提示
   - 智能按钮状态管理

## 使用场景

### 场景 1: 使用占位符模板

**快捷指令配置：**

```
名称: 翻译成英文
Prompt: 请将以下文本翻译成英文：[TEXT]
```

**使用时：**

- 用户选中文本："你好，世界"
- 输入框显示："你好，世界"
- 实际发送给 AI：`请将以下文本翻译成英文：你好，世界`

### 场景 2: 不使用占位符（追加模式）

**快捷指令配置：**

```
名称: 代码审查
Prompt: 你是一个专业的代码审查专家，请仔细审查以下代码并提供改进建议：
```

**使用时：**

- 用户粘贴代码：`function test() { ... }`
- 实际发送给 AI：

```
你是一个专业的代码审查专家，请仔细审查以下代码并提供改进建议：

function test() { ... }
```

### 场景 3: 纯模板（无用户输入）

**快捷指令配置：**

```
名称: 每日建议
Prompt: 给我一些提高工作效率的建议
```

**使用时：**

- 用户不输入任何内容
- 直接点击生成
- 实际发送给 AI：`给我一些提高工作效率的建议`

### 场景 4: 多个占位符

**快捷指令配置：**

```
名称: 格式化
Prompt: 将 [TEXT] 格式化为更易读的形式，确保 [TEXT] 的内容清晰
```

**使用时：**

- 用户输入："这是一段很长的没有标点的文本"
- 实际发送给 AI：

```
将 这是一段很长的没有标点的文本 格式化为更易读的形式，确保 这是一段很长的没有标点的文本 的内容清晰
```

## 实现细节

### 1. Prompt 组合逻辑

```typescript
const buildFinalPrompt = (): string => {
  const userInput = inputText.value.trim()
  const template = promptTemplate.value.trim()

  // 没有模板，直接返回用户输入
  if (!template) {
    return userInput
  }

  // 检查是否包含 [TEXT] 占位符（不区分大小写）
  const textPlaceholderRegex = /\[TEXT\]/gi

  if (textPlaceholderRegex.test(template)) {
    // 包含占位符：替换
    if (userInput) {
      return template.replace(textPlaceholderRegex, userInput)
    } else {
      // 没有用户输入，移除占位符
      return template.replace(textPlaceholderRegex, '').trim()
    }
  } else {
    // 不包含占位符：拼接
    if (userInput) {
      return `${template}\n\n${userInput}`
    } else {
      // 只使用模板
      return template
    }
  }
}
```

### 2. UI 提示逻辑

```typescript
// 动态占位符文本
const getInputPlaceholder = (): string => {
  if (!promptTemplate.value) {
    return '在此输入提示词...'
  }

  if (/\[TEXT\]/gi.test(promptTemplate.value)) {
    return '输入要替换 [TEXT] 的内容...'
  }

  return '输入补充内容（可选）...'
}

// 按钮状态检查
const canGenerate = (): boolean => {
  const hasUserInput = inputText.value.trim().length > 0
  const hasTemplate = promptTemplate.value.trim().length > 0

  // 有用户输入或有模板就可以生成
  return hasUserInput || hasTemplate
}
```

### 3. UI 组件更新

**Prompt 模板显示区域：**

```vue
<div
  v-if="promptTemplate"
  class="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-2 py-1"
>
  <span class="font-semibold">指令模板：</span>
  <span class="font-mono">{{ promptTemplate }}</span>
</div>
```

**动态占位符：**

```vue
<textarea
  v-model="inputText"
  :placeholder="getInputPlaceholder()"
  @keydown.ctrl.enter="handleGenerate"
></textarea>
```

**智能按钮状态：**

```vue
<button :disabled="isGenerating || !canGenerate()" @click="handleGenerate">
  生成
</button>
```

## 测试用例

### 测试 1: 占位符替换

```
配置: "总结以下内容：[TEXT]"
输入: "这是一段需要总结的文本"
期望: "总结以下内容：这是一段需要总结的文本"
```

### 测试 2: 无占位符拼接

```
配置: "你是一个写作助手"
输入: "帮我写一篇文章"
期望: "你是一个写作助手\n\n帮我写一篇文章"
```

### 测试 3: 纯模板

```
配置: "给我讲个笑话"
输入: ""
期望: "给我讲个笑话"
```

### 测试 4: 无模板

```
配置: ""
输入: "直接提问：什么是 AI？"
期望: "直接提问：什么是 AI？"
```

### 测试 5: 多个占位符

```
配置: "[TEXT] 的优点是什么？[TEXT] 的缺点又是什么？"
输入: "人工智能"
期望: "人工智能 的优点是什么？人工智能 的缺点又是什么？"
```

### 测试 6: 大小写不敏感

```
配置: "翻译 [text] 为英文，[TEXT] 是中文，[Text] 需要翻译"
输入: "你好"
期望: "翻译 你好 为英文，你好 是中文，你好 需要翻译"
```

## 用户体验改进

### 1. 清晰的视觉提示

- **蓝色提示框**：显示当前使用的 prompt 模板
- **动态占位符**：根据模板内容变化
- **灰色文本**：模板显示为只读信息

### 2. 智能的交互逻辑

- **自动判断**：系统自动决定如何组合 prompt
- **可选输入**：没有 `[TEXT]` 时，用户输入可选
- **即时生成**：有模板时，无需用户输入即可生成

### 3. 灵活的使用方式

- **占位符模式**：精确控制文本位置
- **追加模式**：灵活扩展 prompt
- **模板模式**：固定的 AI 指令

## 最佳实践建议

### 推荐的 Prompt 模板设计

#### 1. 文本处理类

```
翻译: 将以下文本翻译成英文：[TEXT]
润色: 优化以下文本的表达：[TEXT]
总结: 用简洁的语言总结以下内容：[TEXT]
```

#### 2. 代码相关类

```
代码审查: 你是一个资深开发者，请审查以下代码并提供改进建议：
解释代码: 详细解释以下代码的功能和原理：[TEXT]
重构建议: 分析以下代码并给出重构建议：
```

#### 3. 创作辅助类

```
续写: 基于以下内容继续创作：[TEXT]
扩展: 将以下要点扩展为完整段落：[TEXT]
创意: 根据以下主题提供创意想法：
```

#### 4. 问答类

```
解答: 请详细回答以下问题：[TEXT]
建议: 针对以下情况给出专业建议：[TEXT]
分析: 深入分析以下问题：
```

### 设计原则

1. **明确性**：清楚说明 AI 需要做什么
2. **灵活性**：考虑是否需要用户输入
3. **简洁性**：避免过长的模板
4. **可测试**：易于验证效果

## 技术栈

- **Vue 3**: Composition API
- **TypeScript**: 类型安全
- **正则表达式**: 占位符匹配
- **Reactive**: 响应式状态管理

## 相关文件

- `src/renderer/src/AIShortcutRunner.vue` - 主要实现
- `src/main/modules/aiShortcutRunnerHandlers.ts` - IPC 处理
- `docs/AI_SHORTCUT_GENERATOR_IMPLEMENTATION.md` - 生成器实现文档

## 未来优化方向

### 功能增强

- [ ] 支持更多占位符（如 `[DATE]`, `[TIME]` 等）
- [ ] 支持占位符参数（如 `[TEXT:200]` 限制长度）
- [ ] 支持条件逻辑（如 `[IF TEXT]...`）
- [ ] 模板预览功能

### 用户体验

- [ ] 模板示例库
- [ ] 可视化模板编辑器
- [ ] 模板导入/导出
- [ ] 模板分享功能

### 开发者功能

- [ ] 模板变量系统
- [ ] 模板调试工具
- [ ] 性能优化
- [ ] 单元测试覆盖

## 总结

Prompt 模板功能为 AI Shortcut 提供了强大而灵活的能力，通过占位符机制和智能组合策略，用户可以创建各种实用的 AI 快捷指令，大大提升工作效率。
