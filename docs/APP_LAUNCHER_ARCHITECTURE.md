# 应用启动器架构文档

## 📐 整体架构

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      SuperPanel.vue                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   MainPanel.vue                       │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │  │
│  │  │Item 0│ │Item 1│ │Item 2│ │Item 3│ │Item 4│  ...  │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │  │
│  │  │Item 5│ │Item 6│ │Item 7│ │Item 8│ │Item 9│  ...  │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │  │
│  │  │Item10│ │Item11│ │Item12│ │Item13│ │Item14│       │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Toast Container                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

                            ↓ Click Item

┌─────────────────────────────────────────────────────────────┐
│                    AddItemModal.vue                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              ItemTypeSelector.vue                     │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │  │
│  │  │  文件   │  │ 文件夹  │  │  网页   │  │   CMD   │  │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

                            ↓ Select "文件"

┌─────────────────────────────────────────────────────────────┐
│                    AddItemModal.vue                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                AddFileView.vue                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  [← 返回]  添加应用程序                         │  │  │
│  │  ├─────────────────────────────────────────────────┤  │  │
│  │  │  选择文件: [点击选择应用程序]                   │  │  │
│  │  ├─────────────────────────────────────────────────┤  │  │
│  │  │  拖拽文件: [拖拽区域]                           │  │  │
│  │  ├─────────────────────────────────────────────────┤  │  │
│  │  │  预览: [图标] 应用名称 - 路径                   │  │  │
│  │  ├─────────────────────────────────────────────────┤  │  │
│  │  │  [确认添加]                                     │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🧩 组件设计

### 1. SuperPanelItem.vue

**职责**: 单个应用启动器项

**状态**:

- `modalVisible`: Modal 显示状态
- `currentView`: 当前视图('selector' | 'add-file')
- `item`: 当前位置的应用项(computed from store)

**Props**:

- `index: number` - 当前项的索引(0-14)

**主要方法**:

- `handleClick()`: 处理点击事件(启动应用或打开 Modal)
- `launchApp()`: 启动应用程序
- `handleTypeSelect()`: 处理类型选择
- `handleFileConfirm()`: 处理文件确认
- `handleDelete()`: 删除应用

**UI 状态**:

- 有应用: 显示图标 + 名称 + 悬停删除按钮
- 无应用: 显示加号图标 + "添加"文字

### 2. AddItemModal.vue

**职责**: Modal 容器组件

**Props**:

- `visible: boolean` - 显示状态
- `closeOnMask: boolean` - 点击遮罩是否关闭(默认 true)

**Emits**:

- `close`: 关闭事件
- `update:visible`: 更新显示状态(v-model)

**特性**:

- 使用 Teleport 挂载到 body
- 半透明遮罩 + 背景模糊
- 缩放 + 淡入淡出动画
- 右上角关闭按钮

### 3. ItemTypeSelector.vue

**职责**: 类型选择器(4 个按钮)

**Emits**:

- `select: [type: LauncherItemType]` - 选择类型事件

**数据**:

- `items`: 类型列表(文件、文件夹、网页、CMD)
  - 每个类型包含: type, label, description, icon, disabled

**UI**:

- 4 个按钮垂直排列
- 悬停效果(边框 + 背景色变化)
- 禁用状态显示"即将推出"标签

### 4. AddFileView.vue

**职责**: 添加文件页面

**Emits**:

- `back`: 返回事件
- `confirm: [data: { fileInfo, icon }]` - 确认事件

**状态**:

- `loading`: 加载状态
- `isDragging`: 拖拽状态
- `fileInfo`: 文件信息
- `iconData`: 图标数据(base64)

**主要方法**:

- `handleSelectFile()`: 打开文件选择对话框
- `handleDrop()`: 处理文件拖放
- `processFile()`: 处理文件(提取信息和图标)
- `handleConfirm()`: 确认添加

**UI 区域**:

1. 顶部: 返回按钮 + 标题
2. 文件选择器按钮
3. 拖拽区域
4. 预览区域(图标 + 名称 + 路径)
5. 底部确认按钮

### 5. Toast.vue

**职责**: Toast 通知组件

**Props**:

- `message: string` - 消息内容
- `type: 'success' | 'error' | 'warning' | 'info'` - 类型
- `duration: number` - 显示时长(默认 3000ms)
- `visible: boolean` - 显示状态

**特性**:

- 使用 Teleport 挂载到 body
- 固定在顶部居中
- 根据类型显示不同颜色和图标
- 自动消失

## 📦 状态管理

### Pinia Store: appLauncher

**State**:

```typescript
{
  items: Map<number, LauncherItem | null> // 15个位置的应用
}
```

**Actions**:

- `initialize()`: 初始化(从 localStorage 加载)
- `setItem(index, item)`: 添加/更新应用
- `removeItem(index)`: 删除应用
- `getItem(index)`: 获取应用
- `clearAll()`: 清空所有应用
- `saveToStorage()`: 保存到 localStorage(私有方法)

**Getters**:

- `usedCount`: 已使用的项目数量
- `availableCount`: 可用的项目数量

**Methods**:

- `isSlotEmpty(index)`: 检查指定位置是否为空

### 持久化机制

**存储键**: `fingertips-launcher-items`

**存储格式**:

```json
{
  "0": {
    "id": "1234567890-0",
    "type": "file",
    "name": "Chrome",
    "path": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "icon": "data:image/png;base64,...",
    "createdAt": 1234567890
  },
  "5": {
    "id": "1234567891-5",
    "type": "file",
    "name": "VSCode",
    "path": "C:\\Users\\...\\Code.exe",
    "icon": "data:image/png;base64,...",
    "createdAt": 1234567891
  }
}
```

**加载时机**: 第一个 SuperPanelItem 组件挂载时(index === 0)

**保存时机**: 每次调用 `setItem()` 或 `removeItem()` 后自动保存

## 🔌 Electron IPC 通信

### API 定义

#### 1. launcher.selectFile()

**功能**: 打开文件选择对话框

**Main Process**:

```typescript
ipcMain.handle('launcher:select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: '应用程序', extensions: ['exe', 'lnk'] }]
  })
  return result.filePaths[0] || null
})
```

**返回**: `string | null` - 文件路径或 null

#### 2. launcher.extractIcon(path)

**功能**: 提取应用图标

**Main Process**:

```typescript
ipcMain.handle('launcher:extract-icon', async (_event, filePath: string) => {
  const iconImage = await app.getFileIcon(filePath, { size: 'normal' })
  return iconImage.toDataURL()
})
```

**参数**: `path: string` - 文件路径
**返回**: `string | null` - base64 图标或 null

#### 3. launcher.launchApp(path)

**功能**: 启动应用程序

**Main Process**:

```typescript
ipcMain.handle('launcher:launch-app', async (_event, filePath: string) => {
  await shell.openPath(filePath)
  return true
})
```

**参数**: `path: string` - 文件路径
**返回**: `boolean` - 是否成功

#### 4. launcher.getFileInfo(path)

**功能**: 获取文件信息

**Main Process**:

```typescript
ipcMain.handle('launcher:get-file-info', async (_event, filePath: string) => {
  const name = basename(filePath, extname(filePath))
  const extension = extname(filePath)
  return { name, path: filePath, extension }
})
```

**参数**: `path: string` - 文件路径
**返回**: `FileInfo | null` - 文件信息或 null

## 🎨 样式设计

### 设计原则

1. **一致性**: 所有组件使用统一的颜色、间距、圆角
2. **反馈性**: 所有交互都有视觉反馈(悬停、点击、加载)
3. **流畅性**: 使用过渡动画提升用户体验
4. **可访问性**: 合理的对比度、清晰的文字

### 颜色方案

- **主色**: 蓝色(#3B82F6)
- **成功**: 绿色(#10B981)
- **错误**: 红色(#EF4444)
- **警告**: 黄色(#F59E0B)
- **中性**: 灰色系(#F3F4F6, #E5E7EB, #9CA3AF, #6B7280)

### 动画时长

- **快速**: 150ms (按钮悬停)
- **标准**: 300ms (Modal、Toast)
- **慢速**: 500ms (页面切换)

## 🔄 数据流

### 添加应用流程

```
用户点击空白 Item
    ↓
SuperPanelItem.handleClick()
    ↓
打开 Modal (modalVisible = true)
    ↓
显示 ItemTypeSelector
    ↓
用户点击"文件"
    ↓
SuperPanelItem.handleTypeSelect('file')
    ↓
切换视图 (currentView = 'add-file')
    ↓
显示 AddFileView
    ↓
用户选择/拖拽文件
    ↓
AddFileView.processFile()
    ├─ window.api.launcher.getFileInfo() → 获取文件信息
    └─ window.api.launcher.extractIcon() → 提取图标
    ↓
显示预览
    ↓
用户点击"确认添加"
    ↓
AddFileView.handleConfirm()
    ↓
emit('confirm', { fileInfo, icon })
    ↓
SuperPanelItem.handleFileConfirm()
    ↓
store.setItem(index, newItem)
    ↓
自动保存到 localStorage
    ↓
关闭 Modal
    ↓
显示成功 Toast
```

### 启动应用流程

```
用户点击已添加的 Item
    ↓
SuperPanelItem.handleClick()
    ↓
检测到 item.value 存在
    ↓
SuperPanelItem.launchApp()
    ↓
window.api.launcher.launchApp(item.value.path)
    ↓
Main Process: shell.openPath(filePath)
    ↓
应用启动
    ↓
显示成功 Toast
```

## 🧪 测试建议

### 单元测试

1. **Store 测试**
   - 测试 `setItem()`, `removeItem()`, `getItem()`
   - 测试 localStorage 持久化
   - 测试边界条件(索引越界)

2. **组件测试**
   - 测试 SuperPanelItem 的点击行为
   - 测试 Modal 的打开/关闭
   - 测试文件拖拽功能

### 集成测试

1. **完整流程测试**
   - 添加应用 → 保存 → 重启应用 → 验证加载
   - 启动应用 → 验证应用启动
   - 删除应用 → 验证删除

2. **错误处理测试**
   - 无效文件类型
   - 图标提取失败
   - 应用启动失败

## 📝 代码规范

### TypeScript

- 所有函数必须有类型注解
- 使用 interface 定义数据结构
- 避免使用 `any` 类型

### Vue

- 使用 Composition API
- Props 和 Emits 必须有类型定义
- 使用 `<script setup lang="ts">`

### 命名规范

- 组件: PascalCase (e.g., `SuperPanelItem.vue`)
- 文件: camelCase (e.g., `appLauncher.ts`)
- 函数: camelCase (e.g., `handleClick()`)
- 常量: UPPER_SNAKE_CASE (e.g., `MAX_ITEMS`)

## 🚀 性能优化

### 已实现

1. **懒加载**: Modal 内容仅在打开时渲染
2. **事件委托**: 使用 `@click.stop` 防止事件冒泡
3. **Computed**: 使用 computed 缓存计算结果

### 待优化

1. **图标缓存**: 避免重复提取相同应用的图标
2. **虚拟滚动**: 如果应用数量增加,使用虚拟滚动
3. **防抖节流**: 拖拽事件使用节流优化

## 📚 参考资料

- [Electron 官方文档](https://www.electronjs.org/docs)
- [Vue 3 官方文档](https://vuejs.org/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Tailwind CSS 官方文档](https://tailwindcss.com/)
