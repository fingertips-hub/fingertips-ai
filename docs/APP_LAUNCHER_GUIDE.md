# 应用启动器功能使用指南

## 📖 功能概述

应用启动器允许你在 Super Panel 中添加最多 15 个应用程序快捷方式,实现快速启动常用应用。

## 🎯 功能特性

### ✅ 已实现功能

1. **添加应用程序**
   - 支持 `.exe` 可执行文件
   - 支持 `.lnk` 快捷方式文件
   - 自动提取应用图标(48x48)
   - 自动获取应用名称

2. **两种添加方式**
   - 文件选择器:点击按钮选择文件
   - 拖拽上传:直接拖拽文件到指定区域

3. **应用管理**
   - 单击启动应用
   - 悬停显示删除按钮
   - 数据持久化(localStorage)
   - 应用启动时自动加载

4. **用户体验**
   - Modal 弹窗(带动画)
   - Toast 通知提示
   - 实时预览
   - 响应式设计

### ⏸️ 待实现功能

- 添加文件夹快捷方式
- 添加网页链接
- 添加 CMD 命令

## 🚀 使用方法

### 1. 打开 Super Panel

- 按住鼠标中键 300ms 以上
- Super Panel 会在鼠标位置显示

### 2. 添加应用程序

#### 方式一:文件选择器

1. 点击任意空白的 SuperPanelItem(显示加号图标)
2. 在弹出的 Modal 中点击"文件"按钮
3. 点击"点击选择应用程序"按钮
4. 在文件选择对话框中选择 `.exe` 或 `.lnk` 文件
5. 等待图标提取完成,查看预览信息
6. 点击"确认添加"按钮

#### 方式二:拖拽上传

1. 点击任意空白的 SuperPanelItem(显示加号图标)
2. 在弹出的 Modal 中点击"文件"按钮
3. 从文件资源管理器拖拽 `.exe` 或 `.lnk` 文件到拖拽区域
4. 等待图标提取完成,查看预览信息
5. 点击"确认添加"按钮

### 3. 启动应用程序

- 单击已添加的 SuperPanelItem
- 应用程序将在后台启动
- 会显示 Toast 通知提示启动状态

### 4. 删除应用程序

1. 将鼠标悬停在已添加的 SuperPanelItem 上
2. 点击右上角的红色删除按钮
3. 在确认对话框中点击"确定"

## 🏗️ 技术架构

### 组件结构

```
SuperPanel.vue (主容器)
└── MainPanel.vue (应用网格)
    └── SuperPanelItem.vue (单个应用项)
        └── AddItemModal.vue (添加Modal)
            ├── ItemTypeSelector.vue (类型选择器)
            └── AddFileView.vue (添加文件页面)
```

### 状态管理

使用 Pinia Store (`appLauncher.ts`) 管理应用列表:

- `items`: Map<number, LauncherItem | null> - 存储 15 个位置的应用
- `setItem(index, item)`: 添加/更新应用
- `removeItem(index)`: 删除应用
- `getItem(index)`: 获取应用
- 自动持久化到 localStorage

### Electron IPC API

#### Renderer → Main

- `launcher.selectFile()`: 打开文件选择对话框
- `launcher.extractIcon(path)`: 提取应用图标
- `launcher.launchApp(path)`: 启动应用程序
- `launcher.getFileInfo(path)`: 获取文件信息

#### 实现位置

- Preload: `src/preload/index.ts`
- Main Process: `src/main/index.ts`

### 数据结构

```typescript
interface LauncherItem {
  id: string // 唯一标识
  type: 'file' // 类型(当前仅支持 file)
  name: string // 显示名称
  path: string // 文件完整路径
  icon: string // 图标(base64 格式)
  createdAt: number // 创建时间戳
}
```

### 持久化

- 存储位置: `localStorage`
- 存储键: `fingertips-launcher-items`
- 格式: JSON 对象,key 为索引(0-14),value 为 LauncherItem
- 自动加载: 应用启动时自动从 localStorage 加载

## 🎨 UI/UX 设计

### 视觉反馈

1. **悬停效果**
   - 边框颜色变化
   - 背景色变化
   - 图标颜色变化

2. **动画效果**
   - Modal 打开/关闭动画(缩放 + 淡入淡出)
   - Toast 通知动画(滑入滑出)
   - 按钮悬停过渡

3. **状态提示**
   - 加载中状态(按钮禁用 + 文字提示)
   - 拖拽状态(边框高亮 + 背景色变化)
   - 成功/失败 Toast 通知

### 交互设计

1. **Modal 关闭方式**
   - 点击遮罩关闭
   - 点击右上角关闭按钮
   - 添加成功后自动关闭

2. **错误处理**
   - 文件类型不支持 → Toast 错误提示
   - 图标提取失败 → Toast 警告提示 + 使用默认图标
   - 启动失败 → Toast 错误提示

3. **确认操作**
   - 删除应用 → 浏览器原生 confirm 对话框

## 🐛 已知问题

暂无

## 🔮 未来优化

1. **功能增强**
   - 支持自定义应用名称
   - 支持自定义应用图标
   - 支持应用分组
   - 支持拖拽排序

2. **UI 优化**
   - 使用更美观的确认对话框(替代原生 confirm)
   - 添加更多动画效果
   - 支持主题切换

3. **性能优化**
   - 图标缓存机制
   - 懒加载优化

## 📚 相关文件

### 核心文件

- `src/renderer/src/components/super-panel/SuperPanelItem.vue` - 应用项组件
- `src/renderer/src/components/super-panel/AddItemModal.vue` - Modal 组件
- `src/renderer/src/components/super-panel/ItemTypeSelector.vue` - 类型选择器
- `src/renderer/src/components/super-panel/AddFileView.vue` - 添加文件页面
- `src/renderer/src/stores/appLauncher.ts` - Pinia Store
- `src/renderer/src/types/launcher.ts` - TypeScript 类型定义

### 工具文件

- `src/renderer/src/components/common/Toast.vue` - Toast 通知组件
- `src/renderer/src/composables/useToast.ts` - Toast Composable

### Electron 文件

- `src/preload/index.ts` - Preload API 定义
- `src/preload/index.d.ts` - Preload 类型定义
- `src/main/index.ts` - Main Process IPC Handlers

## 🤝 贡献

如有问题或建议,请提交 Issue 或 Pull Request。
