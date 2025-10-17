# AI 快捷指令运行窗口实现文档

## 概述

本文档记录了 AI 快捷指令运行窗口的实现细节。该窗口是一个新的 BrowserWindow，用于执行 AI 快捷指令并显示生成结果。

## 功能特性

### 窗口布局

窗口由三个主要部分组成：

1. **输入区域（占界面 1/4）**
   - 可编辑的文本域
   - 显示和编辑提示词内容
   - 支持 Ctrl+Enter 快捷键触发生成

2. **操作按钮区域**
   - **生成按钮**：触发 AI 内容生成
   - **重试按钮**：重新生成结果
   - **复制按钮**：将生成的结果复制到剪贴板

3. **输出区域（占界面 3/4）**
   - 不可编辑的文本域
   - 显示 AI 生成的结果
   - 支持滚动查看长文本

### 交互特性

- **窗口标题栏**：显示快捷指令的图标和名称
- **ESC 键关闭**：按 ESC 键可快速关闭窗口
- **状态提示**：使用 Toast 通知用户操作结果
- **加载状态**：生成时显示加载动画

## 技术实现

### 文件结构

```
src/
├── main/
│   ├── modules/
│   │   ├── aiShortcutRunner.ts          # 窗口管理模块
│   │   └── aiShortcutRunnerHandlers.ts  # IPC 处理器
│   └── index.ts                         # 注册处理器
├── preload/
│   ├── index.ts                         # 添加 API 接口
│   └── index.d.ts                       # TypeScript 类型定义
└── renderer/
    ├── ai-shortcut-runner.html          # HTML 入口
    └── src/
        ├── ai-shortcut-runner.ts        # TypeScript 入口
        └── AIShortcutRunner.vue         # 主组件
```

### 主进程（Main Process）

#### aiShortcutRunner.ts

窗口管理模块，负责：

- 创建和配置 BrowserWindow
- 处理窗口的显示和隐藏
- 发送初始化数据到渲染进程
- 单例窗口模式（打开新快捷指令时复用窗口）

**窗口配置：**

```typescript
{
  width: 800,
  height: 700,
  minWidth: 600,
  minHeight: 500,
  frame: true,
  autoHideMenuBar: true,
  backgroundColor: '#ffffff'
}
```

#### aiShortcutRunnerHandlers.ts

IPC 处理器，处理以下事件：

- `ai-shortcut-runner:open`：打开窗口并传递快捷指令数据
- `ai-shortcut-runner:close`：关闭窗口

### 预加载脚本（Preload）

添加 `aiShortcutRunner` API 命名空间：

```typescript
aiShortcutRunner: {
  open: (shortcutData) => void      // 打开窗口
  close: () => void                  // 关闭窗口
  onInitData: (callback) => void    // 接收初始化数据
}
```

### 渲染进程（Renderer）

#### AIShortcutRunner.vue

主要功能实现：

1. **数据接收**
   - 通过 `onInitData` 监听主进程发送的快捷指令数据
   - 初始化输入框内容

2. **生成功能**
   - `handleGenerate()`：触发 AI 内容生成
   - 显示加载状态和动画
   - 更新输出区域内容

3. **重试功能**
   - `handleRetry()`：重新执行生成逻辑
   - 使用相同的输入内容

4. **复制功能**
   - `handleCopy()`：将结果复制到剪贴板
   - 显示复制成功提示
   - 2 秒后恢复按钮状态

5. **键盘快捷键**
   - ESC：关闭窗口
   - Ctrl+Enter：触发生成

### 集成点

#### SuperPanelItem.vue

修改 `executeAIShortcut()` 函数：

```typescript
async function executeAIShortcut(): Promise<void> {
  // ...
  window.api.aiShortcutRunner.open({
    id: shortcut.id,
    name: shortcut.name,
    icon: shortcut.icon,
    prompt: shortcut.prompt
  })
  // ...
}
```

当用户点击 Super Panel 中的 AI 快捷指令时，会打开运行窗口。

### 构建配置

#### electron.vite.config.ts

添加新的 HTML 入口：

```typescript
input: {
  index: resolve(__dirname, 'src/renderer/index.html'),
  'super-panel': resolve(__dirname, 'src/renderer/super-panel.html'),
  'ai-shortcut-runner': resolve(__dirname, 'src/renderer/ai-shortcut-runner.html')
}
```

## UI/UX 设计

### 布局比例

- 输入区域：25%（1/4）
- 操作按钮：固定高度
- 输出区域：自动填充剩余空间（约 3/4）

### 样式设计

- **配色方案**：
  - 背景：白色
  - 主色调：蓝色 (#3B82F6)
  - 边框：灰色 (#D1D5DB)
  - 文本：灰色系 (#374151, #6B7280, #9CA3AF)

### 图标使用

使用 Iconify 的 Material Design Icons (mdi)：

- `mdi:close`：关闭按钮
- `mdi:play`：生成按钮
- `mdi:loading`：加载动画
- `mdi:refresh`：重试按钮
- `mdi:content-copy`：复制按钮

### 响应式设计

- 最小宽度：600px
- 最小高度：500px
- 支持窗口大小调整
- 自适应内容布局

## 未来扩展

### AI API 集成

目前 `handleGenerate()` 使用模拟数据，后续可以集成实际的 AI API：

```typescript
// TODO: 实际实现
const response = await callAIAPI(inputText.value)
outputText.value = response.content
```

### 可能的功能增强

1. **历史记录**：保存执行历史和结果
2. **导出功能**：导出结果为 Markdown、TXT 等格式
3. **流式输出**：支持实时显示 AI 生成内容
4. **多轮对话**：支持连续对话模式
5. **自定义参数**：支持配置 AI 模型参数（温度、最大长度等）

## 测试建议

1. **基本功能测试**
   - 从 Super Panel 打开运行窗口
   - 输入文本并生成结果
   - 测试重试功能
   - 测试复制功能

2. **快捷键测试**
   - ESC 关闭窗口
   - Ctrl+Enter 触发生成

3. **边界情况测试**
   - 空输入
   - 超长文本
   - 快速连续点击生成按钮
   - 窗口大小调整

4. **多实例测试**
   - 连续打开多个不同的快捷指令
   - 验证窗口是否正确复用和更新数据

## 问题排查

### 常见问题

1. **窗口无法打开**
   - 检查 IPC 处理器是否正确注册
   - 检查 preload API 是否正确暴露

2. **数据未正确显示**
   - 检查 `onInitData` 监听器
   - 检查数据传递格式是否匹配

3. **样式问题**
   - 确保 Tailwind CSS 已正确加载
   - 检查 Iconify 图标库是否可用

## 总结

AI 快捷指令运行窗口提供了一个清晰、直观的界面来执行 AI 指令并查看结果。通过合理的布局设计和交互优化，为用户提供了良好的使用体验。后续可以根据实际需求集成 AI API 并添加更多功能。
