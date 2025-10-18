# 插件选中文本传递优化

## 问题描述

在之前的实现中，当用户从 Super Panel 执行插件时，插件需要从剪切板读取文本内容。虽然 Super Panel 在显示前已经通过 `captureSelectedText()` 捕获了选中文本，但这个文本并没有直接传递给插件，导致：

1. **间接传递**：选中文本 → 剪切板 → 插件
2. **性能损耗**：插件需要额外调用 `clipboard.readText()`
3. **逻辑不清晰**：实际上是使用划词内容，但代码看起来像是读取剪切板

## 优化方案

### 核心思路

**直接传递选中文本给插件**，而不是让插件再从剪切板读取：

```
优化前：选中文本 → Super Panel 捕获 → 剪切板 → 插件读取
优化后：选中文本 → Super Panel 捕获 → 直接传递给插件
```

### 实现步骤

#### 1. 添加获取捕获文本的 IPC 接口（主进程）

**文件**：`src/main/modules/superPanelHandlers.ts`

```typescript
import {
  getSuperPanelWindow,
  hideSuperPanel,
  setModalOpen,
  setPinned,
  getCachedSelectedText // ✅ 新增导入
} from './superPanel'

// 在 setupSuperPanelHandlers 函数中添加
ipcMain.handle('super-panel:get-captured-text', () => {
  return getCachedSelectedText()
})
```

**作用**：提供一个 IPC 接口，让渲染进程可以获取已捕获的选中文本。

#### 2. 在 Preload 中暴露 API

**文件**：`src/preload/index.d.ts`

```typescript
superPanel: {
  setModalOpen: (isOpen: boolean) => void
  hide: () => void
  setPinned: (pinned: boolean) => void
  getCapturedText: () => Promise<string> // ✅ 新增 API
}
```

**文件**：`src/preload/index.ts`

```typescript
superPanel: {
  // ... 其他方法
  // 获取捕获的选中文本
  getCapturedText: () => ipcRenderer.invoke('super-panel:get-captured-text')
}
```

**作用**：暴露安全的 API 给渲染进程使用。

#### 3. 在 SuperPanelItem 中使用（渲染进程）

**文件**：`src/renderer/src/components/super-panel/SuperPanelItem.vue`

```typescript
setTimeout(async () => {
  try {
    // 🎯 优化：获取捕获的选中文本，直接传递给插件
    const capturedText = await window.api.superPanel.getCapturedText()
    console.log('[SuperPanelItem] 捕获的文本长度:', capturedText.length)

    // 构建插件参数，将选中文本作为 text 参数传递
    const params = capturedText ? { text: capturedText } : undefined

    // 调用主进程的执行 API
    await pluginStore.executePlugin(pluginId, params)
    console.log(`插件「${pluginName}」执行完成`)
  } catch (error) {
    console.error('执行插件失败:', error)
  }
}, 100)
```

**关键点**：

- 调用 `window.api.superPanel.getCapturedText()` 获取捕获的文本
- 如果有文本，将其作为 `{ text: capturedText }` 参数传递
- 如果没有文本，传递 `undefined`（插件会回退到读取剪切板）

## 优势

### 1. **性能提升**

- ✅ **减少 IPC 调用**：插件不需要再调用剪切板 API
- ✅ **更快响应**：直接使用已缓存的文本

### 2. **逻辑清晰**

- ✅ **语义明确**：代码明确表示"传递选中文本"
- ✅ **流程清晰**：Super Panel → 插件，一步到位

### 3. **兼容性保持**

插件代码已经支持这种用法：

```javascript
// plugins/text-processor/index.js
async function execute(params) {
  // 1. 优先使用传递的文本
  let inputText = params?.text

  // 2. 如果没有传递，才从剪切板读取（保持向后兼容）
  if (!inputText) {
    inputText = pluginContext.api.clipboard.readText()
  }

  // 3. 后续处理...
}
```

**向后兼容**：

- ✅ 新插件可以接收 `params.text`（推荐）
- ✅ 旧插件仍然可以读取剪切板（兼容）

## 使用场景

### 场景 1：有选中文本

```
用户操作：选中文本 "Hello World" → 按快捷键 → 点击插件
执行流程：
  1. Super Panel 捕获 "Hello World"
  2. 传递给插件：{ text: "Hello World" }
  3. 插件接收并处理
```

### 场景 2：无选中文本

```
用户操作：未选中文本 → 按快捷键 → 点击插件
执行流程：
  1. Super Panel 捕获为空
  2. 传递给插件：undefined
  3. 插件回退到读取剪切板
```

### 场景 3：插件主动传参

```javascript
// 也可以主动调用插件并传递自定义文本
await pluginStore.executePlugin('text-processor', {
  text: '自定义文本',
  operation: 'uppercase'
})
```

## 数据流图

### 优化前

```
用户选中文本
    ↓
Super Panel 捕获 (captureSelectedText)
    ↓
写入剪切板 (Ctrl+C 模拟)
    ↓
Super Panel 显示
    ↓
用户点击插件
    ↓
插件执行 (execute)
    ↓
从剪切板读取 (clipboard.readText)  ← 额外的步骤
    ↓
处理文本
```

### 优化后

```
用户选中文本
    ↓
Super Panel 捕获 (captureSelectedText)
    ↓
写入剪切板 (Ctrl+C 模拟)
    ↓
Super Panel 显示
    ↓
用户点击插件
    ↓
获取缓存文本 (getCapturedText)
    ↓
直接传递给插件 (params.text)  ← 直接使用
    ↓
处理文本
```

## 测试建议

### 1. 功能测试

- [ ] **有选中文本**：选中文本 → 呼出 Super Panel → 执行插件 → 验证处理正确
- [ ] **无选中文本**：不选中 → 呼出 Super Panel → 执行插件 → 验证回退到剪切板
- [ ] **长文本**：选中大段文本 → 验证传递完整
- [ ] **特殊字符**：选中包含 Emoji、多语言的文本 → 验证正常传递

### 2. 性能测试

使用 console 输出测量：

```javascript
console.time('pluginExecution')
await pluginStore.executePlugin(pluginId, params)
console.timeEnd('pluginExecution')
```

**预期**：执行时间略有减少（节省剪切板读取时间）

### 3. 兼容性测试

- [ ] 测试现有插件（hello-world）是否正常工作
- [ ] 测试新插件（text-processor）是否接收到文本
- [ ] 测试无参数调用是否回退到剪切板

## 相关文档

- `PLUGIN_DEVELOPER_GUIDE.md` - 插件开发指南
- `SUPER_PANEL_PERFORMANCE_OPTIMIZATION.md` - Super Panel 性能优化
- `AI_SHORTCUT_TEXT_CAPTURE_ULTIMATE_SOLUTION.md` - 文本捕获机制

## 总结

这次优化实现了：

1. ✅ **直接传递**：选中文本直接传递给插件，无需二次读取
2. ✅ **性能提升**：减少不必要的 IPC 调用
3. ✅ **逻辑清晰**：代码语义明确，易于理解
4. ✅ **向后兼容**：旧插件仍然可以正常工作

这是一次**语义清晰、性能优化、向后兼容**的最佳实践改进！

---

**优化日期**: 2025-10-18  
**优化人员**: Fingertips AI Team  
**版本**: V1.0
