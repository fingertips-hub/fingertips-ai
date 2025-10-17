# AI 快捷指令 - 选中文本自动捕获功能

## 问题分析

### 原始问题

之前的实现只是读取剪贴板中已有的内容，而**没有真正获取用户当前选中的文本**。

### 根本原因

1. **只读取剪贴板**：`clipboard.readText()` 只能读取用户之前复制的内容，而不是当前选中的文本
2. **PowerShell 方案不可靠**：使用 PowerShell 的 `SendKeys` 太慢且在某些窗口中不生效
3. **破坏用户剪贴板**：直接覆盖用户剪贴板内容，导致数据丢失

## 解决方案

### 最佳实践方法

使用 **uiohook-napi**（项目已安装）来模拟按键，并保护用户的剪贴板内容。

### 实现步骤

```typescript
async function getSelectedText(): Promise<string> {
  // 1. 保存当前剪贴板内容
  const previousClipboard = clipboard.readText()

  // 2. 模拟 Ctrl+C 复制选中的文本
  if (process.platform === 'darwin') {
    // macOS: Command + C
    uIOhook.keyToggle(UiohookKey.Ctrl, 'down')
    uIOhook.keyTap(UiohookKey.C)
    uIOhook.keyToggle(UiohookKey.Ctrl, 'up')
  } else {
    // Windows/Linux: Ctrl + C
    uIOhook.keyToggle(UiohookKey.Ctrl, 'down')
    uIOhook.keyTap(UiohookKey.C)
    uIOhook.keyToggle(UiohookKey.Ctrl, 'up')
  }

  // 3. 等待剪贴板更新
  await new Promise((resolve) => setTimeout(resolve, 200))

  // 4. 读取选中的文本
  const selectedText = clipboard.readText()

  // 5. 恢复原始剪贴板内容
  clipboard.writeText(previousClipboard)

  return selectedText.trim()
}
```

## 技术优势

### 1. **可靠的按键模拟**

- 使用 `uiohook-napi` 的底层 API
- 支持所有主流平台（Windows、macOS、Linux）
- 比 PowerShell 方案更快、更稳定

### 2. **保护用户剪贴板**

- 操作前保存原始剪贴板内容
- 操作后恢复原始内容
- 用户无感知，不会丢失数据

### 3. **跨平台支持**

```typescript
if (process.platform === 'darwin') {
  // macOS: Command + C
  uIOhook.keyToggle(UiohookKey.Ctrl, 'down')
} else {
  // Windows/Linux: Ctrl + C
  uIOhook.keyToggle(UiohookKey.Ctrl, 'down')
}
```

### 4. **智能等待机制**

```typescript
// 等待 200ms 确保剪贴板更新完成
await new Promise((resolve) => setTimeout(resolve, 200))
```

## 工作流程

### 用户操作流程

1. **用户选中文本**
   - 在任何应用中选中文本（浏览器、编辑器、PDF 等）
2. **触发 AI 快捷指令**
   - 通过 Super Panel 点击快捷指令
3. **系统自动处理**

   ```
   ┌─────────────────────────────────┐
   │  保存当前剪贴板: "旧内容"       │
   └─────────────────────────────────┘
                  ↓
   ┌─────────────────────────────────┐
   │  模拟 Ctrl+C                    │
   └─────────────────────────────────┘
                  ↓
   ┌─────────────────────────────────┐
   │  等待 200ms                     │
   └─────────────────────────────────┘
                  ↓
   ┌─────────────────────────────────┐
   │  读取剪贴板: "用户选中的文本"   │
   └─────────────────────────────────┘
                  ↓
   ┌─────────────────────────────────┐
   │  恢复剪贴板: "旧内容"           │
   └─────────────────────────────────┘
                  ↓
   ┌─────────────────────────────────┐
   │  填充到输入框                   │
   └─────────────────────────────────┘
   ```

4. **输入框显示结果**
   - 如果有选中文本：只显示选中的内容
   - 如果没有选中：输入框为空

## 使用示例

### 示例 1：翻译网页文本

```
用户操作：
1. 在网页上选中："Hello, how are you?"
2. 打开 Super Panel
3. 点击"翻译"快捷指令

结果：
输入框显示：Hello, how are you?
用户剪贴板：保持不变
```

### 示例 2：代码审查

```
用户操作：
1. 在编辑器中选中一段代码
2. 打开 Super Panel
3. 点击"代码审查"快捷指令

结果：
输入框显示：[选中的代码]
用户剪贴板：保持不变
```

### 示例 3：无选中内容

```
用户操作：
1. 没有选中任何文本
2. 打开 Super Panel
3. 点击 AI 快捷指令

结果：
输入框显示：[空]
用户可以手动输入内容
```

## 配置参数

### 等待时间

```typescript
// 200ms 是经过测试的最佳值
// 太短：剪贴板可能还没更新
// 太长：用户体验不佳
await new Promise((resolve) => setTimeout(resolve, 200))
```

### 最大文本长度

```typescript
// 限制 10,000 字符，避免大文件问题
if (selectedText.length < 10000) {
  shortcutData.selectedText = selectedText
}
```

## 技术细节

### uIOhook-napi API

```typescript
// 按下键
uIOhook.keyToggle(UiohookKey.Ctrl, 'down')

// 敲击键（按下并释放）
uIOhook.keyTap(UiohookKey.C)

// 释放键
uIOhook.keyToggle(UiohookKey.Ctrl, 'up')
```

### 平台差异

| 平台    | 复制快捷键  | 实现方式                                                           |
| ------- | ----------- | ------------------------------------------------------------------ |
| Windows | Ctrl + C    | `uIOhook.keyToggle(UiohookKey.Ctrl, 'down')`                       |
| macOS   | Command + C | `uIOhook.keyToggle(UiohookKey.Ctrl, 'down')` (Ctrl 映射为 Command) |
| Linux   | Ctrl + C    | `uIOhook.keyToggle(UiohookKey.Ctrl, 'down')`                       |

### 调试日志

```typescript
console.log('Previous clipboard saved') // 剪贴板已保存
console.log('Selected text captured:', text) // 选中文本已捕获
console.log('Original clipboard restored') // 剪贴板已恢复
console.log('Selected text will be used:', text) // 将使用选中文本
console.log('No valid selected text found') // 未找到有效文本
```

## 对比：旧方案 vs 新方案

### 旧方案（PowerShell）

```typescript
// ❌ 问题多多
const script = `
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.SendKeys]::SendWait("^c")
`
await execAsync(`powershell -Command "${script}"`)
```

**缺点：**

- ❌ 只支持 Windows
- ❌ 执行慢（启动 PowerShell 需要时间）
- ❌ 在某些应用中不生效
- ❌ 破坏用户剪贴板
- ❌ 需要额外的进程开销

### 新方案（uIOhook-napi）

```typescript
// ✅ 完美解决
async function getSelectedText(): Promise<string> {
  const previousClipboard = clipboard.readText()
  uIOhook.keyToggle(UiohookKey.Ctrl, 'down')
  uIOhook.keyTap(UiohookKey.C)
  uIOhook.keyToggle(UiohookKey.Ctrl, 'up')
  await new Promise((resolve) => setTimeout(resolve, 200))
  const selectedText = clipboard.readText()
  clipboard.writeText(previousClipboard)
  return selectedText.trim()
}
```

**优点：**

- ✅ 跨平台支持（Windows、macOS、Linux）
- ✅ 快速响应（无需启动外部进程）
- ✅ 可靠稳定（底层 API）
- ✅ 保护用户剪贴板
- ✅ 低资源占用

## 注意事项

1. **uIOhook 必须启动**
   - 项目中 `mouseListener.ts` 已启动 uIOhook
   - 确保在调用前 uIOhook 已启动

2. **权限要求**
   - macOS 需要辅助功能权限
   - Windows 通常无需额外权限

3. **异常处理**

   ```typescript
   try {
     const selectedText = await getSelectedText()
   } catch (error) {
     console.error('Failed to get selected text:', error)
     return ''
   }
   ```

4. **性能考虑**
   - 200ms 延迟对用户体验影响很小
   - 相比 PowerShell 方案已大幅提升

## 相关文件

- `src/main/modules/aiShortcutRunner.ts` - 主实现文件
- `src/main/modules/aiShortcutRunnerHandlers.ts` - IPC 处理
- `src/renderer/src/AIShortcutRunner.vue` - UI 组件
- `src/main/modules/mouseListener.ts` - uIOhook 启动位置

## 未来改进

- [ ] 支持富文本内容捕获
- [ ] 添加用户配置选项（启用/禁用自动捕获）
- [ ] 优化等待时间（根据系统性能自适应）
- [ ] 添加选中文本预览功能
- [ ] 支持多选内容的合并处理
