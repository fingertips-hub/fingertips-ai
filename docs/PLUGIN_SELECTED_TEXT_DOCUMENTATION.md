# 插件开发指南 - 获取选中文本说明文档

> **更新日期**: 2025-10-18  
> **相关文档**: `PLUGIN_DEVELOPER_GUIDE.md`

## 📋 更新概述

为插件开发者指南添加了关于如何获取用户选中文本（划词内容）的详细说明和最佳实践。

---

## 🎯 更新内容

### 1. 生命周期 `execute(params)` 说明

**位置**: 第 696-771 行

**更新内容**:

- 在 `execute(params)` 参数说明中添加了 `params.text` 字段
- 说明 `params.text` 包含用户选中的文本（当从 Super Panel 触发时自动传入）
- 添加了完整的示例代码，展示如何优先使用 `params.text`，并以剪贴板作为回退方案
- 添加了专门的"关于选中文本（划词内容）"说明部分

**关键点**:

```javascript
async execute(params) {
  // 🎯 优先使用传入的选中文本
  let inputText = params?.text

  // 如果没有传入选中文本，可以从剪贴板读取作为回退方案
  if (!inputText && context.api.clipboard) {
    inputText = context.api.clipboard.readText()
  }

  // ...
}
```

### 2. Clipboard API 说明

**位置**: 第 1175-1200 行

**更新内容**:

- 在 `clipboard.readText()` 方法说明后添加了重要警告
- 明确指出**不应该**依赖 `clipboard.readText()` 来获取选中文本
- 列出了依赖剪贴板的三个主要问题：
  1. 需要模拟 `Ctrl+C` 操作，会干扰用户的剪贴板
  2. 在某些应用中可能无法正常工作
  3. 会增加延迟和复杂度
- 提供了正确的做法：通过 `params.text` 接收选中文本

**关键提示**:

> ⚠️ 如果你的插件需要处理用户选中的文本（划词内容），**不应该**依赖 `clipboard.readText()` 方法

> ✅ **正确的做法**是在 `execute()` 方法中通过 `params.text` 参数接收选中的文本

### 3. 最佳实践部分

**位置**: 第 2182-2267 行

**更新内容**:

- 添加了"8. 处理用户选中的文本"最佳实践部分
- 提供了一个完整的文本处理插件示例
- 展示了完整的处理流程：
  1. 优先使用 `params.text`
  2. 剪贴板作为回退方案
  3. 验证输入
  4. 处理文本
  5. 将结果写回剪贴板（可选）
  6. 显示成功通知
- 总结了 5 个关键点

**示例结构**:

```javascript
async execute(params) {
  // 1. 优先使用传入的选中文本
  let inputText = params?.text

  // 2. 如果没有传入文本，尝试从剪贴板读取
  if (!inputText && pluginContext.manifest.permissions.includes('clipboard')) {
    inputText = pluginContext.api.clipboard.readText()
  }

  // 3. 验证输入
  if (!inputText || !inputText.trim()) {
    // 显示友好提示
    return { success: false, error: '没有输入文本' }
  }

  // 4. 处理文本
  const result = processText(inputText)

  // 5. 将结果写回剪贴板（可选）
  pluginContext.api.clipboard.writeText(result)

  // 6. 显示成功通知
  return { success: true, data: result }
}
```

### 4. 常见问题部分

**位置**: 第 2382-2431 行

**更新内容**:

- 添加了新的常见问题 Q9："如何获取用户选中的文本（划词内容）?"
- 详细说明了两种获取方式：
  - **方式 1**: 通过 `params.text` 参数（✅ 推荐）
  - **方式 2**: 从剪贴板读取（仅作为回退方案）
- 为每种方式提供了完整的代码示例
- 添加了重要的注意事项

**关键注意事项**:

- 不要依赖模拟 `Ctrl+C` 来获取选中文本，这会干扰用户的剪贴板
- `params.text` 是系统自动传入的，无需插件做任何额外操作
- 从剪贴板读取只能获取已经复制的内容，不是实时选中的内容

---

## 🔑 核心要点

### 系统工作原理

1. **用户选择文本**: 用户在任何应用中选中一段文本
2. **按快捷键**: 用户按下 Super Panel 快捷键（如 Alt+Q）
3. **系统捕获**: 主进程自动捕获用户选中的文本
4. **缓存存储**: 捕获的文本被缓存在主进程中
5. **用户选择插件**: 用户在 Super Panel 中点击一个插件
6. **传递参数**: 系统将缓存的文本作为 `params.text` 传递给插件的 `execute()` 方法
7. **插件处理**: 插件直接使用 `params.text` 进行处理

### 最佳实践

1. **优先使用 `params.text`**: 这是最可靠、高效的方式
2. **剪贴板作为回退**: 只在 `params.text` 不存在时使用
3. **检查权限**: 使用剪贴板前检查是否有 `clipboard` 权限
4. **用户友好提示**: 没有输入时给出明确的提示
5. **完整的错误处理**: 捕获并友好地展示错误信息
6. **不要模拟按键**: 不要尝试模拟 `Ctrl+C` 来获取选中文本

### 为什么不使用剪贴板?

1. **用户体验差**: 会覆盖用户的剪贴板内容
2. **不可靠**: 在某些应用中可能无法正常工作（如受保护的输入框）
3. **有延迟**: 需要模拟按键、等待剪贴板更新
4. **复杂度高**: 需要保存/恢复剪贴板内容
5. **有副作用**: 可能触发某些应用的剪贴板监听事件

---

## 📝 相关实现

### 主进程实现

**文件**: `src/main/modules/mouseListener.ts`

- `captureSelectedText()`: 捕获用户选中的文本
- `getCapturedTextOnPress()`: 获取缓存的选中文本
- `clearCapturedText()`: 清空缓存的选中文本

**文件**: `src/main/modules/superPanel.ts`

- `getCachedSelectedText()`: 导出函数，供 IPC 调用

**文件**: `src/main/modules/superPanelHandlers.ts`

- `ipcMain.handle('super-panel:get-captured-text')`: IPC 处理器

### 渲染进程实现

**文件**: `src/preload/index.d.ts` 和 `src/preload/index.ts`

- `window.api.superPanel.getCapturedText()`: 暴露给渲染进程的 API

**文件**: `src/renderer/src/components/super-panel/SuperPanelItem.vue`

- `executePlugin()`: 调用 `getCapturedText()` 并传递给插件

### 插件实现示例

**文件**: `plugins/text-processor/index.js`

```javascript
async function execute(params) {
  // 🎯 优先使用传递的文本
  let inputText = params?.text

  if (!inputText) {
    // 从剪贴板读取（作为回退）
    inputText = pluginContext.api.clipboard.readText()
  }

  if (!inputText || !inputText.trim()) {
    // 友好的错误提示
    return { success: false, error: '没有可处理的文本' }
  }

  // 处理文本
  return processText(inputText)
}
```

---

## 🎯 开发者指引

### 新插件开发

如果你正在开发一个需要处理用户选中文本的插件：

1. **在 `execute()` 方法中首先检查 `params.text`**

   ```javascript
   const selectedText = params?.text
   ```

2. **如果需要回退方案，添加剪贴板权限**

   ```json
   {
     "permissions": ["clipboard", "notification"]
   }
   ```

3. **实现回退逻辑**

   ```javascript
   if (!selectedText) {
     selectedText = context.api.clipboard.readText()
   }
   ```

4. **验证输入并给出友好提示**
   ```javascript
   if (!selectedText || !selectedText.trim()) {
     context.api.notification.show({
       title: '提示',
       body: '请先选中文本后再执行此操作'
     })
     return { success: false, error: '没有输入文本' }
   }
   ```

### 现有插件迁移

如果你的插件目前是通过剪贴板获取文本：

1. **更新 `execute()` 方法签名**，确保接收 `params` 参数
2. **添加 `params.text` 检查**，作为优先数据源
3. **保留剪贴板读取**，作为回退方案
4. **测试两种场景**：
   - 从 Super Panel 执行（应该使用 `params.text`）
   - 直接从插件列表执行（应该回退到剪贴板）

---

## ✅ 文档更新清单

- [x] 更新 `execute(params)` 生命周期说明
- [x] 在 Clipboard API 部分添加警告和最佳实践
- [x] 添加"处理用户选中的文本"最佳实践示例
- [x] 在常见问题部分添加 Q9
- [x] 格式化文档
- [x] 创建此更新说明文档

---

## 📚 相关文档

- [插件开发者指南](./PLUGIN_DEVELOPER_GUIDE.md)
- [插件选中文本优化](./PLUGIN_SELECTED_TEXT_OPTIMIZATION.md)
- [Super Panel 性能优化](./SUPER_PANEL_PERFORMANCE_OPTIMIZATION.md)

---

**更新完成！** 🎉

插件开发者现在可以通过更新后的指南了解如何正确、高效地获取用户选中的文本。
