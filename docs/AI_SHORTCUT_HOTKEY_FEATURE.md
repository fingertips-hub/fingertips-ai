# AI 快捷指令全局快捷键功能

## 📋 功能概述

为 AI 快捷指令添加了全局快捷键支持，用户可以为每个快捷指令设置一个独立的全局快捷键，按下快捷键时：

1. 自动捕获用户当前选中的文本
2. 打开 AI 快捷指令运行器窗口
3. 将捕获的文本填充到输入框
4. 自动开始执行（生成 AI 结果）

## 🎯 设计目标

- **无缝体验**：快捷键触发后自动完成捕获、填充、执行的全流程
- **复用机制**：复用 Super Panel 的快捷键组件和文本捕获逻辑
- **高性能**：使用 `uiohook-napi` 实现全局监听，响应速度快
- **可维护**：清晰的架构设计，模块化实现

## 🏗️ 架构设计

### 核心模块

```
┌─────────────────────────────────────────────────────────────┐
│                     渲染进程 (Renderer)                        │
├─────────────────────────────────────────────────────────────┤
│ ShortcutDialog.vue                                          │
│ ├─ HotkeyInput 组件（复用）                                   │
│ └─ 快捷键输入与存储                                            │
│                                                              │
│ AIShortcut.vue                                              │
│ ├─ 初始化时加载所有快捷键到主进程                               │
│ ├─ 添加/编辑时注册快捷键                                       │
│ └─ 删除时注销快捷键                                            │
│                                                              │
│ AIShortcutRunner.vue                                        │
│ └─ 支持 autoExecute 标记，自动执行                            │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ IPC
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     主进程 (Main)                             │
├─────────────────────────────────────────────────────────────┤
│ aiShortcutHotkeyManager.ts                                  │
│ ├─ 管理所有快捷指令的快捷键映射                                 │
│ ├─ 检测快捷键是否触发                                          │
│ └─ 触发快捷指令执行（捕获文本 + 打开窗口）                       │
│                                                              │
│ mouseListener.ts                                            │
│ ├─ 全局键盘监听（uiohook-napi）                               │
│ ├─ 优先检测 AI 快捷指令快捷键                                  │
│ └─ 再检测 Super Panel 快捷键                                 │
│                                                              │
│ aiShortcutRunnerHandlers.ts                                 │
│ ├─ 注册快捷键 IPC 处理器                                       │
│ ├─ 注销快捷键 IPC 处理器                                       │
│ └─ 加载所有快捷键 IPC 处理器                                   │
└─────────────────────────────────────────────────────────────┘
```

## 📝 实现细节

### 1. 数据模型更新

**AIShortcut 接口** (`src/renderer/src/stores/aiShortcut.ts`)

```typescript
export interface AIShortcut {
  id: string
  categoryId: string
  name: string
  icon: string
  prompt: string
  hotkey?: string // 新增：全局快捷键（可选）
  createdAt: number
  updatedAt: number
  order: number
}
```

### 2. UI 组件

**ShortcutDialog.vue**

添加了快捷键输入区域：

```vue
<div>
  <label class="block text-sm font-medium text-gray-700 mb-2">
    全局快捷键
    <span class="text-xs text-gray-400 font-normal ml-1">(可选)</span>
  </label>
  <HotkeyInput
    v-model="formData.hotkey"
    placeholder="点击设置快捷键..."
    :disabled="mode === 'view'"
  />
  <p class="text-xs text-gray-500 mt-1">设置后可通过快捷键快速执行此指令</p>
</div>
```

**特性**：

- 复用 `HotkeyInput` 组件（与 Super Panel 快捷键相同）
- 支持键盘快捷键（如 `Ctrl+Alt+T`）
- 查看模式下为只读状态

### 3. 快捷键管理器

**aiShortcutHotkeyManager.ts**

核心功能：

```typescript
// 注册快捷键
export function registerShortcutHotkey(
  shortcutId: string,
  hotkey: string,
  name: string,
  icon: string,
  prompt: string
): boolean

// 注销快捷键
export function unregisterShortcutHotkey(shortcutId: string): void

// 检测快捷键触发
export function checkShortcutHotkeyTriggered(
  keycode: number,
  modifiers: Set<string>
): ShortcutHotkeyInfo | null

// 触发快捷指令执行
export async function triggerShortcut(info: ShortcutHotkeyInfo): Promise<void>
```

**设计亮点**：

1. **双向映射**：
   - `shortcutHotkeys`: shortcutId → ShortcutHotkeyInfo
   - `hotkeyToShortcutId`: hotkey → shortcutId
   - 快速查询和防止重复注册

2. **键码映射**：
   - 扩展了 `KEY_NAME_TO_CODE` 映射表
   - 支持字母、数字、功能键、特殊键

3. **修饰键同步**：
   - 通过 `updateActiveModifiers` 与 `mouseListener` 同步
   - 准确检测组合键状态

### 4. 全局监听集成

**mouseListener.ts**

在 keydown 事件处理中添加了优先级检测：

```typescript
uIOhook.on('keydown', (event: UiohookKeyboardEvent) => {
  // 1. 处理修饰键
  const modifierName = KEY_CODE_TO_MODIFIER[event.keycode]
  if (modifierName) {
    activeModifiers.add(modifierName)
    updateActiveModifiers(activeModifiers) // 同步到快捷键管理器
    return
  }

  // 2. 优先检测 AI 快捷指令的快捷键
  const shortcutInfo = checkShortcutHotkeyTriggered(event.keycode, activeModifiers)
  if (shortcutInfo) {
    triggerShortcut(shortcutInfo)
    return // 阻止后续 Super Panel 快捷键检测
  }

  // 3. 检测 Super Panel 快捷键
  // ...
})
```

### 5. 自动执行机制

**AIShortcutRunner.vue**

添加了 autoExecute 支持：

```typescript
window.api.aiShortcutRunner.onInitData((data) => {
  shortcutName.value = data.name
  shortcutIcon.value = data.icon

  // 设置输入文本
  if (data.selectedText && data.selectedText.trim()) {
    inputText.value = data.selectedText
  } else {
    inputText.value = ''
  }

  // 自动执行
  if (data.autoExecute && inputText.value.trim()) {
    setTimeout(() => {
      handleGenerate()
    }, 100)
  }
})
```

### 6. IPC 通信

**新增 IPC 处理器** (`aiShortcutRunnerHandlers.ts`)

```typescript
// 注册快捷键
ipcMain.handle(
  'ai-shortcut-hotkey:register',
  async (
    _event,
    shortcutId: string,
    hotkey: string,
    name: string,
    icon: string,
    prompt: string
  ) => {
    return registerShortcutHotkey(shortcutId, hotkey, name, icon, prompt)
  }
)

// 注销快捷键
ipcMain.handle('ai-shortcut-hotkey:unregister', async (_event, shortcutId: string) => {
  unregisterShortcutHotkey(shortcutId)
  return true
})

// 批量加载快捷键（初始化时使用）
ipcMain.handle('ai-shortcut-hotkey:load-all', async (_event, shortcuts) => {
  let registeredCount = 0
  for (const shortcut of shortcuts) {
    if (shortcut.hotkey) {
      const success = registerShortcutHotkey(
        shortcut.id,
        shortcut.hotkey,
        shortcut.name,
        shortcut.icon,
        shortcut.prompt
      )
      if (success) registeredCount++
    }
  }
  return registeredCount
})
```

**Preload API** (`preload/index.ts`)

```typescript
aiShortcutHotkey: {
  register: (shortcutId, hotkey, name, icon, prompt) =>
    ipcRenderer.invoke('ai-shortcut-hotkey:register', shortcutId, hotkey, name, icon, prompt),
  unregister: (shortcutId) =>
    ipcRenderer.invoke('ai-shortcut-hotkey:unregister', shortcutId),
  loadAll: (shortcuts) =>
    ipcRenderer.invoke('ai-shortcut-hotkey:load-all', shortcuts)
}
```

## 🔄 完整执行流程

### 初始化流程

```
1. Settings 窗口打开
   ↓
2. AIShortcut.vue onMounted
   ↓
3. store.initialize() - 从 localStorage 加载快捷指令
   ↓
4. window.api.aiShortcutHotkey.loadAll(shortcuts)
   ↓
5. 主进程注册所有快捷键到 aiShortcutHotkeyManager
   ↓
6. mouseListener 监听全局键盘事件
```

### 添加快捷指令流程

```
1. 用户在 ShortcutDialog 中输入快捷键
   ↓
2. 点击"添加"按钮
   ↓
3. store.addShortcut() - 添加到 localStorage
   ↓
4. window.api.aiShortcutHotkey.register() - 注册到主进程
   ↓
5. aiShortcutHotkeyManager 存储快捷键映射
```

### 编辑快捷指令流程

```
1. 用户修改快捷键
   ↓
2. 点击"保存"按钮
   ↓
3. window.api.aiShortcutHotkey.unregister(shortcutId) - 注销旧快捷键
   ↓
4. store.updateShortcut() - 更新 localStorage
   ↓
5. window.api.aiShortcutHotkey.register() - 注册新快捷键
```

### 删除快捷指令流程

```
1. 用户点击删除按钮
   ↓
2. window.api.aiShortcutHotkey.unregister(shortcutId) - 注销快捷键
   ↓
3. store.deleteShortcut() - 从 localStorage 删除
```

### 快捷键触发流程

```
1. 用户在任意应用中选中文本
   ↓
2. 按下快捷键（如 Ctrl+Alt+T）
   ↓
3. mouseListener 捕获 keydown 事件
   ↓
4. checkShortcutHotkeyTriggered() - 检测匹配的快捷指令
   ↓
5. triggerShortcut() - 执行快捷指令
   ├─ captureSelectedText() - 捕获选中文本
   └─ createAIShortcutRunnerWindow() - 打开运行器窗口
       ├─ selectedText: 捕获的文本
       └─ autoExecute: true
   ↓
6. AIShortcutRunner.vue 接收数据
   ├─ 设置 inputText = selectedText
   └─ 自动执行 handleGenerate()
   ↓
7. 生成 AI 结果并显示
```

## 🎨 用户体验

### 设置快捷键

1. 打开设置 → AI 快捷指令
2. 点击"添加快捷指令"或编辑现有指令
3. 在"全局快捷键"输入框中点击
4. 按下想要设置的快捷键组合（如 `Ctrl+Alt+T`）
5. 保存

### 使用快捷键

1. 在任意应用中选中文本（可选）
2. 按下设置的快捷键
3. AI 快捷指令运行器自动打开
4. 选中的文本自动填充到输入框
5. 自动开始生成 AI 结果

## ⚡ 性能优化

1. **快速响应**：使用 `uiohook-napi` 全局监听，响应时间 < 100ms
2. **内存优化**：使用 Map 数据结构，O(1) 查询性能
3. **优先级机制**：AI 快捷指令优先于 Super Panel，避免冲突
4. **异步处理**：文本捕获和窗口打开异步进行，不阻塞 UI

## 🔧 技术栈

- **全局监听**：uiohook-napi
- **状态管理**：Pinia (localStorage 持久化)
- **进程通信**：Electron IPC
- **UI 组件**：Vue 3 + TypeScript
- **文本捕获**：剪贴板 API + 键盘模拟

## 📦 文件清单

### 新增文件

- `src/main/modules/aiShortcutHotkeyManager.ts` - 快捷键管理器

### 修改文件

**主进程**：

- `src/main/modules/mouseListener.ts` - 集成快捷键检测
- `src/main/modules/aiShortcutRunner.ts` - 添加 autoExecute 支持
- `src/main/modules/aiShortcutRunnerHandlers.ts` - 添加 IPC 处理器

**预加载**：

- `src/preload/index.ts` - 添加 API
- `src/preload/index.d.ts` - 添加类型定义

**渲染进程**：

- `src/renderer/src/stores/aiShortcut.ts` - 添加 hotkey 字段
- `src/renderer/src/components/settings/ai-shortcut/ShortcutDialog.vue` - 添加快捷键输入
- `src/renderer/src/components/settings/AIShortcut.vue` - 快捷键注册/注销逻辑
- `src/renderer/src/AIShortcutRunner.vue` - 自动执行支持

## ✨ 支持的快捷键类型

1. **组合键**：需要至少一个修饰键 + 主键
   - 例如：`Ctrl+Alt+T`、`Ctrl+Shift+F`、`Alt+Q`

2. **功能键**：F1-F12 可以单独使用
   - 例如：`F1`、`F2`、`F12`
   - 也支持组合：`Ctrl+F1`、`Shift+F12`

3. **修饰键**：支持 Ctrl、Alt、Shift、Meta（Win/Cmd）

## 🐛 已知限制

1. **不支持鼠标动作**：目前只支持键盘快捷键，不支持鼠标长按等动作
2. **快捷键冲突检测**：不会检测与系统或其他应用的快捷键冲突
3. **单一快捷键**：每个快捷指令只能设置一个快捷键
4. **普通键限制**：字母、数字键不能单独使用，必须配合修饰键

## 🚀 未来改进

1. **快捷键冲突检测**：检测并提示与 Super Panel 或其他快捷指令的冲突
2. **快捷键可视化**：在快捷指令卡片上显示快捷键标识
3. **快捷键帮助**：提供快捷键列表和说明
4. **自定义触发行为**：支持配置是否自动执行、是否捕获文本等

## 📚 相关文档

- [AI Shortcut Runner Implementation](./AI_SHORTCUT_RUNNER_IMPLEMENTATION.md)
- [Super Panel Architecture](./REFACTORING_SUPER_PANEL_HANDLERS.md)
- [Mouse Listener Design](../src/main/README.md)

---

**实现日期**: 2025-10-18  
**版本**: v1.0.0
