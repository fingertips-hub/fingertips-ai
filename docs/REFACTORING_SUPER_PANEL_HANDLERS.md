# Super Panel Handlers 重构说明

## 📋 重构概述

将 `src/main/index.ts` 中的 Super Panel 相关 IPC handlers 提取到独立模块 `src/main/modules/superPanelHandlers.ts`。

## 🎯 重构目标

1. **代码组织**: 将相关功能集中到一个模块中
2. **可维护性**: 降低主文件复杂度,提高代码可读性
3. **模块化**: 遵循单一职责原则
4. **可扩展性**: 便于后续添加新功能

## 📁 文件结构

### 重构前

```
src/main/
├── index.ts (267 行)
│   ├── 应用初始化
│   ├── 窗口创建
│   ├── Super Panel IPC handlers (约 120 行)
│   └── 应用生命周期管理
├── modules/
│   ├── tray.ts
│   ├── superPanel.ts
│   └── mouseListener.ts
└── utils/
    └── iconExtractor.ts
```

### 重构后

```
src/main/
├── index.ts (160 行, 减少 107 行)
│   ├── 应用初始化
│   ├── 窗口创建
│   ├── 调用 setupSuperPanelHandlers()
│   └── 应用生命周期管理
├── modules/
│   ├── tray.ts
│   ├── superPanel.ts
│   ├── mouseListener.ts
│   └── superPanelHandlers.ts (新增, 155 行)
│       ├── 窗口控制 IPC handlers
│       └── 应用启动器 IPC handlers
└── utils/
    └── iconExtractor.ts
```

## 🔧 新增模块: superPanelHandlers.ts

### 模块职责

处理所有 Super Panel 相关的 IPC 通信:

1. **窗口控制**
   - 移动窗口位置
   - 隐藏 Super Panel
   - 设置 Modal 状态

2. **应用启动器**
   - 选择文件
   - 提取图标
   - 启动应用/打开文件
   - 获取文件信息

### 导出函数

#### `setupSuperPanelHandlers()`

设置所有 Super Panel 相关的 IPC handlers。

**调用时机**: 在 `app.whenReady()` 中调用

**功能**:

- 注册所有 IPC handlers
- 打印日志确认注册成功

**示例**:

```typescript
app.whenReady().then(() => {
  // ... 其他初始化代码
  setupSuperPanelHandlers()
})
```

#### `cleanupSuperPanelHandlers()`

清理所有 Super Panel 相关的 IPC handlers。

**调用时机**: 在 `app.on('before-quit')` 中调用

**功能**:

- 移除所有 IPC handlers
- 防止内存泄漏
- 打印日志确认清理成功

**示例**:

```typescript
app.on('before-quit', () => {
  stopGlobalMouseListener()
  cleanupSuperPanelHandlers()
})
```

## 📝 IPC Handlers 列表

### 窗口控制

| Handler                      | 类型         | 功能                |
| ---------------------------- | ------------ | ------------------- |
| `move-window`                | `ipcMain.on` | 移动窗口位置        |
| `hide-super-panel`           | `ipcMain.on` | 隐藏 Super Panel    |
| `super-panel:set-modal-open` | `ipcMain.on` | 设置 Modal 打开状态 |

### 应用启动器

| Handler                  | 类型             | 功能               | 返回值             |
| ------------------------ | ---------------- | ------------------ | ------------------ |
| `launcher:select-file`   | `ipcMain.handle` | 打开文件选择对话框 | `string \| null`   |
| `launcher:extract-icon`  | `ipcMain.handle` | 提取文件图标       | `string \| null`   |
| `launcher:launch-app`    | `ipcMain.handle` | 启动应用/打开文件  | `boolean`          |
| `launcher:get-file-info` | `ipcMain.handle` | 获取文件信息       | `FileInfo \| null` |

## 🔄 重构步骤

### 1. 创建新模块

创建 `src/main/modules/superPanelHandlers.ts`:

```typescript
import { ipcMain, dialog, shell } from 'electron'
import { basename, extname } from 'path'
import { getSuperPanelWindow, hideSuperPanel, setModalOpen } from './superPanel'
import { extractIcon } from '../utils/iconExtractor'

export function setupSuperPanelHandlers(): void {
  // 注册所有 IPC handlers
}

export function cleanupSuperPanelHandlers(): void {
  // 清理所有 IPC handlers
}
```

### 2. 移动代码

将以下代码从 `index.ts` 移动到 `superPanelHandlers.ts`:

- ✅ `move-window` handler
- ✅ `hide-super-panel` handler
- ✅ `super-panel:set-modal-open` handler
- ✅ `launcher:select-file` handler
- ✅ `launcher:extract-icon` handler
- ✅ `launcher:launch-app` handler
- ✅ `launcher:get-file-info` handler

### 3. 更新导入

**index.ts**:

```typescript
// 移除
import { getSuperPanelWindow, hideSuperPanel, setModalOpen } from './modules/superPanel'
import { extractIcon } from './utils/iconExtractor'
import { basename, extname } from 'path'
import { dialog } from 'electron'

// 添加
import { setupSuperPanelHandlers, cleanupSuperPanelHandlers } from './modules/superPanelHandlers'
```

### 4. 调用新函数

**index.ts**:

```typescript
app.whenReady().then(() => {
  // ... 其他初始化代码

  // 添加这一行
  setupSuperPanelHandlers()
})

app.on('before-quit', () => {
  stopGlobalMouseListener()

  // 添加这一行
  cleanupSuperPanelHandlers()
})
```

### 5. 清理未使用的导入

移除 `index.ts` 中不再使用的导入。

## 📊 重构效果

### 代码行数对比

| 文件                    | 重构前 | 重构后 | 变化           |
| ----------------------- | ------ | ------ | -------------- |
| `index.ts`              | 267 行 | 160 行 | -107 行 (-40%) |
| `superPanelHandlers.ts` | 0 行   | 155 行 | +155 行        |
| **总计**                | 267 行 | 315 行 | +48 行         |

**说明**: 虽然总行数增加了,但代码组织更清晰,可维护性大幅提升。

### 代码复杂度

| 指标                | 重构前 | 重构后 |
| ------------------- | ------ | ------ |
| `index.ts` 职责数量 | 5 个   | 3 个   |
| 单文件最大行数      | 267 行 | 160 行 |
| 模块耦合度          | 高     | 低     |
| 代码可读性          | 中     | 高     |

### 可维护性提升

1. **职责分离**: `index.ts` 专注于应用初始化,`superPanelHandlers.ts` 专注于 IPC 通信
2. **易于定位**: Super Panel 相关问题直接查看 `superPanelHandlers.ts`
3. **易于扩展**: 添加新的 IPC handler 只需修改 `superPanelHandlers.ts`
4. **易于测试**: 可以单独测试 `superPanelHandlers.ts` 模块

## 🎯 最佳实践

### 1. 模块命名

- ✅ 使用描述性名称: `superPanelHandlers.ts`
- ✅ 与功能模块对应: `superPanel.ts` → `superPanelHandlers.ts`
- ❌ 避免通用名称: `handlers.ts`, `ipc.ts`

### 2. 函数命名

- ✅ 使用动词开头: `setupSuperPanelHandlers()`, `cleanupSuperPanelHandlers()`
- ✅ 明确功能: `setup` 表示初始化, `cleanup` 表示清理
- ❌ 避免模糊名称: `init()`, `destroy()`

### 3. 代码组织

- ✅ 按功能分组: 窗口控制、应用启动器
- ✅ 添加注释分隔: `// =============================================================================`
- ✅ 每个 handler 添加 JSDoc 注释

### 4. 错误处理

- ✅ 所有 handler 都有 try-catch
- ✅ 记录详细的错误日志
- ✅ 返回合理的默认值 (null, false)

## 🔍 代码示例

### 重构前 (index.ts)

```typescript
app.whenReady().then(() => {
  // ... 初始化代码

  // IPC handlers 直接写在这里 (约 120 行)
  ipcMain.on('move-window', (_event, deltaX, deltaY) => {
    // ...
  })

  ipcMain.handle('launcher:select-file', async () => {
    // ...
  })

  // ... 更多 handlers
})
```

### 重构后 (index.ts)

```typescript
app.whenReady().then(() => {
  // ... 初始化代码

  // 一行代码搞定
  setupSuperPanelHandlers()
})
```

### 新模块 (superPanelHandlers.ts)

```typescript
export function setupSuperPanelHandlers(): void {
  // =============================================================================
  // 窗口控制 IPC Handlers
  // =============================================================================

  /**
   * 移动窗口位置
   */
  ipcMain.on('move-window', (_event, deltaX: number, deltaY: number) => {
    // ...
  })

  // =============================================================================
  // 应用启动器 IPC Handlers
  // =============================================================================

  /**
   * 选择文件
   */
  ipcMain.handle('launcher:select-file', async () => {
    // ...
  })

  console.log('Super Panel IPC handlers registered')
}
```

## 🚀 未来优化方向

1. **进一步拆分**: 如果 `superPanelHandlers.ts` 继续增长,可以拆分为:
   - `windowHandlers.ts` - 窗口控制
   - `launcherHandlers.ts` - 应用启动器

2. **类型定义**: 创建 `types/ipc.ts` 统一管理 IPC 相关类型

3. **单元测试**: 为 `superPanelHandlers.ts` 添加单元测试

4. **文档生成**: 使用 TypeDoc 自动生成 API 文档

## 📚 相关文档

- [Electron IPC 文档](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [模块化设计原则](https://en.wikipedia.org/wiki/Modular_programming)
- [单一职责原则](https://en.wikipedia.org/wiki/Single-responsibility_principle)

---

**重构完成!** 🎉

现在 `index.ts` 更加简洁,Super Panel 相关的 IPC handlers 都集中在 `superPanelHandlers.ts` 中,代码组织更加清晰,可维护性大幅提升。
