# Main Process 架构说明

## 📁 项目结构

```
src/main/
├── index.ts                    # 主入口文件 (应用生命周期管理)
├── modules/                    # 功能模块
│   ├── tray.ts                # 系统托盘模块
│   ├── superPanel.ts          # Super Panel 窗口管理模块
│   └── mouseListener.ts       # 全局鼠标监听模块
└── utils/                      # 工具函数
    └── windowPosition.ts      # 窗口位置计算工具
```

---

## 📦 模块说明

### 1. **index.ts** - 主入口文件

**职责**:

- 应用生命周期管理 (`app.whenReady`, `app.quit` 等)
- 模块初始化和协调
- IPC 通信处理
- 全局事件监听

**主要功能**:

```typescript
// 应用启动时
app.whenReady().then(() => {
  createTray() // 创建系统托盘
  createSuperPanelWindow() // 创建 Super Panel 窗口
  setupGlobalMouseListener() // 设置全局鼠标监听
})

// 应用退出时
app.on('before-quit', () => {
  stopGlobalMouseListener() // 清理鼠标监听
})
```

**代码行数**: ~120 行 (重构前: ~328 行)

---

### 2. **modules/tray.ts** - 系统托盘模块

**职责**:

- 创建和管理系统托盘图标
- 托盘菜单管理
- 托盘事件处理

**导出函数**:

```typescript
export function createTray(): void
export function getTray(): Tray | null
export function destroyTray(): void
```

**使用示例**:

```typescript
import { createTray } from './modules/tray'

// 创建托盘
createTray()
```

**特性**:

- ✅ 自动调整图标大小 (16x16)
- ✅ 支持退出菜单
- ✅ 显示应用名称提示

---

### 3. **modules/superPanel.ts** - Super Panel 窗口管理

**职责**:

- Super Panel 窗口的创建和配置
- 窗口显示/隐藏逻辑
- 窗口位置计算和边界检测
- 窗口事件监听

**导出函数**:

```typescript
export function createSuperPanelWindow(): BrowserWindow
export function showSuperPanelAtMouse(): void
export function hideSuperPanel(): void
export function isClickOutsideSuperPanel(x: number, y: number): boolean
export function getSuperPanelWindow(): BrowserWindow | null
export function isSuperPanelVisible(): boolean
```

**使用示例**:

```typescript
import { createSuperPanelWindow, showSuperPanelAtMouse } from './modules/superPanel'

// 创建窗口
const window = createSuperPanelWindow()

// 在鼠标位置显示
showSuperPanelAtMouse()
```

**窗口配置**:

- 尺寸: 460x700
- 无边框 (`frame: false`)
- 始终置顶 (`alwaysOnTop: true`)
- 不显示在任务栏 (`skipTaskbar: true`)
- 深色背景 (`backgroundColor: '#1b1b1f'`)

**特性**:

- ✅ 智能位置计算 (以鼠标为中心)
- ✅ 屏幕边界检测
- ✅ 多显示器支持
- ✅ 防止白色闪烁
- ✅ 调试日志

---

### 4. **modules/mouseListener.ts** - 全局鼠标监听

**职责**:

- 监听全局鼠标事件 (使用 uiohook-napi)
- 检测中键长按
- 检测点击 Super Panel 外部区域
- 触发相应的窗口操作

**导出函数**:

```typescript
export function setupGlobalMouseListener(): void
export function stopGlobalMouseListener(): void
export function isMouseListenerRunning(): boolean
export function getLongPressThreshold(): number
```

**使用示例**:

```typescript
import { setupGlobalMouseListener, stopGlobalMouseListener } from './modules/mouseListener'

// 启动监听
setupGlobalMouseListener()

// 停止监听
stopGlobalMouseListener()
```

**监听事件**:

1. **中键长按** (button 3)
   - 按下时记录时间
   - 松开时计算按压时长
   - 如果 >= 260ms,显示 Super Panel

2. **左键点击** (button 1)
   - 检测点击位置
   - 如果在 Super Panel 外部,隐藏窗口

**配置**:

- 长按阈值: 260ms
- 显示延迟: 50ms

**特性**:

- ✅ 防止重复启动
- ✅ 安全的停止机制
- ✅ 状态查询
- ✅ 调试日志

---

### 5. **utils/windowPosition.ts** - 窗口位置计算

**职责**:

- 计算窗口在鼠标位置的居中坐标
- 处理屏幕边界情况
- 支持多显示器

**导出函数**:

```typescript
export function calculateWindowPosition(
  mouseX: number,
  mouseY: number,
  windowWidth: number,
  windowHeight: number
): { x: number; y: number }
```

**使用示例**:

```typescript
import { calculateWindowPosition } from '../utils/windowPosition'

const { x, y } = calculateWindowPosition(
  cursorPoint.x,
  cursorPoint.y,
  460, // 窗口宽度
  700 // 窗口高度
)
```

**算法**:

1. 获取鼠标所在的显示器
2. 计算以鼠标为中心的窗口位置
3. 检查水平边界,调整 x 坐标
4. 检查垂直边界,调整 y 坐标
5. 返回最终坐标 (四舍五入)

**特性**:

- ✅ 完全显示在屏幕内
- ✅ 多显示器支持
- ✅ 边界智能调整

---

## 🔄 模块间依赖关系

```
index.ts
  ├─> modules/tray.ts
  ├─> modules/superPanel.ts
  │     └─> utils/windowPosition.ts
  └─> modules/mouseListener.ts
        └─> modules/superPanel.ts
```

**依赖说明**:

- `index.ts` 依赖所有模块,负责协调
- `mouseListener.ts` 依赖 `superPanel.ts` 来显示/隐藏窗口
- `superPanel.ts` 依赖 `windowPosition.ts` 来计算位置
- `tray.ts` 独立,无依赖

---

## 🎯 重构优势

### 代码质量

| 指标               | 重构前 | 重构后 | 改进  |
| ------------------ | ------ | ------ | ----- |
| **主文件行数**     | 328 行 | 121 行 | ↓ 63% |
| **单文件最大行数** | 328 行 | 150 行 | ↓ 54% |
| **模块数量**       | 1 个   | 5 个   | +400% |
| **函数平均行数**   | ~30 行 | ~20 行 | ↓ 33% |

### 可维护性

- ✅ **职责清晰**: 每个模块只负责一个功能
- ✅ **易于测试**: 模块可以独立测试
- ✅ **易于扩展**: 添加新功能只需新增模块
- ✅ **易于理解**: 代码结构一目了然

### 可复用性

- ✅ **工具函数独立**: `windowPosition.ts` 可在其他地方使用
- ✅ **模块导出清晰**: 明确的 API 接口
- ✅ **低耦合**: 模块间依赖最小化

---

## 📝 开发指南

### 添加新功能

**示例: 添加快捷键支持**

1. 创建新模块 `src/main/modules/shortcuts.ts`
2. 实现快捷键注册和处理逻辑
3. 在 `index.ts` 中导入并初始化

```typescript
// src/main/modules/shortcuts.ts
import { globalShortcut } from 'electron'
import { showSuperPanelAtMouse } from './superPanel'

export function registerShortcuts(): void {
  globalShortcut.register('CommandOrControl+Space', () => {
    showSuperPanelAtMouse()
  })
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
```

```typescript
// src/main/index.ts
import { registerShortcuts, unregisterShortcuts } from './modules/shortcuts'

app.whenReady().then(() => {
  // ...
  registerShortcuts()
})

app.on('before-quit', () => {
  unregisterShortcuts()
})
```

### 修改现有功能

**示例: 修改长按阈值**

只需修改 `src/main/modules/mouseListener.ts`:

```typescript
// 修改这一行
const LONG_PRESS_THRESHOLD = 300 // 从 260ms 改为 300ms
```

### 调试技巧

1. **查看日志**: 每个模块都有 `console.log` 输出
2. **检查状态**: 使用导出的查询函数
   ```typescript
   import { isMouseListenerRunning } from './modules/mouseListener'
   console.log('Listener running:', isMouseListenerRunning())
   ```
3. **单独测试**: 可以单独导入模块进行测试

---

## 🚀 未来优化方向

1. **配置文件**: 将硬编码的配置提取到配置文件
2. **类型定义**: 添加更详细的 TypeScript 类型
3. **错误处理**: 统一的错误处理机制
4. **日志系统**: 使用专业的日志库 (如 winston)
5. **单元测试**: 为每个模块添加单元测试

---

## 📚 相关文档

- [Electron 官方文档](https://www.electronjs.org/docs)
- [uiohook-napi 文档](https://github.com/SnosMe/uiohook-napi)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs)
