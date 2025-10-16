# AI Shortcut 启动器集成文档

## 概述

本文档描述了 AI Shortcut（AI快捷命令）与 Super Panel 启动器的集成实现。用户现在可以将 AI 快捷命令添加到启动器中，实现快速访问和执行。

## 实现日期

2025-10-16

## 功能特性

### 1. 添加 AI Shortcut 到启动器

- ✅ 在 Super Panel 中点击空白格子，选择"AI快捷命令"类型
- ✅ 从已创建的 AI Shortcuts 列表中选择一个命令
- ✅ 支持按分类筛选 AI Shortcuts
- ✅ 显示命令的图标（emoji）、名称和提示词预览

### 2. 显示和编辑

- ✅ 在启动器中以紫色背景显示 AI Shortcut 的 emoji 图标
- ✅ 右键菜单支持编辑和删除
- ✅ 编辑时可以选择不同的 AI Shortcut 进行替换

### 3. 执行 AI Shortcut

- ✅ 点击 AI Shortcut 图标时执行命令
- ✅ 目前以控制台输出的形式展示命令信息（便于调试）
- ⏳ 待实现：调用 AI API 执行实际的命令

### 4. 数据持久化

- ✅ AI Shortcut 启动器项目保存在 localStorage 中
- ✅ 使用 `LauncherItem` 数据结构，与其他类型保持一致
- ✅ `path` 字段存储 AI Shortcut 的 ID，用于关联到完整数据

## 技术实现

### 新增文件

#### 1. `AddAIShortcutView.vue`

AI Shortcut 选择器组件，负责：

- 显示所有可用的 AI Shortcuts
- 按分类筛选
- 显示快捷命令的预览信息
- 处理选择事件

**关键代码：**

```vue
<template>
  <div class="flex flex-col gap-3">
    <!-- 分类筛选 -->
    <div v-if="categories.length > 1" class="flex gap-2 flex-wrap px-1">
      <button @click="selectCategory(category.id)">
        {{ category.name }}
      </button>
    </div>

    <!-- AI Shortcuts 列表 -->
    <div class="flex flex-col gap-2">
      <button @click="handleSelectShortcut(shortcut)">
        {{ shortcut.icon }} {{ shortcut.name }}
      </button>
    </div>
  </div>
</template>
```

### 修改文件

#### 1. `SuperPanelItem.vue`

**新增功能：**

1. **导入和初始化：**

```typescript
import AddAIShortcutView from './AddAIShortcutView.vue'
import { useAIShortcutStore } from '../../stores/aiShortcut'

const aiShortcutStore = useAIShortcutStore()
```

2. **视图状态管理：**

```typescript
const currentView = ref<
  | 'selector'
  | 'add-file'
  | 'add-folder'
  | 'add-web'
  | 'add-cmd'
  | 'add-action-page'
  | 'add-ai-shortcut' // 新增
>('selector')
```

3. **图标显示：**

```vue
<!-- 如果是AI快捷命令类型，显示 emoji 图标 -->
<div
  v-else-if="item.type === 'ai-shortcut'"
  class="w-full h-full rounded flex items-center justify-center bg-purple-50 text-xl"
>
  {{ item.icon }}
</div>
```

4. **执行逻辑：**

```typescript
async function executeAIShortcut(): Promise<void> {
  if (!item.value || item.value.type !== 'ai-shortcut') return

  const shortcutId = item.value.path
  const shortcut = aiShortcutStore.shortcuts.find((s) => s.id === shortcutId)

  if (shortcut) {
    // TODO: 实现实际的AI命令执行逻辑
    console.log('=== 执行AI快捷命令 ===')
    console.log('命令名称:', shortcut.name)
    console.log('命令图标:', shortcut.icon)
    console.log('提示词:', shortcut.prompt)
    console.log('所属分类:', shortcut.categoryId)

    toast.success(`正在执行「${shortcut.name}」`)
    // 关闭面板...
  } else {
    toast.error('AI命令不存在，可能已被删除')
    handleDelete()
  }
}
```

5. **确认处理：**

```typescript
function handleAIShortcutConfirm(data: {
  shortcutId: string
  shortcutName: string
  shortcutIcon: string
}): void {
  const { shortcutId, shortcutName, shortcutIcon } = data

  const newItem = {
    id: isEditMode.value && item.value ? item.value.id : generateUuid.new(),
    type: 'ai-shortcut' as const,
    name: shortcutName,
    path: shortcutId, // 存储 shortcut ID
    icon: shortcutIcon, // 存储 emoji
    createdAt: isEditMode.value && item.value ? item.value.createdAt : Date.now()
  }

  // 保存到对应的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  handleModalClose()
  toast.success(isEditMode.value ? '保存成功' : '添加成功')
}
```

#### 2. `ItemTypeSelector.vue`

**启用 AI Shortcut 选项：**

```typescript
{
  type: 'ai-shortcut',
  label: 'AI快捷命令',
  description: '添加AI快捷命令',
  icon: 'mdi:robot',
  disabled: false  // 从 true 改为 false
}
```

## 数据结构

### LauncherItem for AI Shortcut

```typescript
interface LauncherItem {
  id: string // 唯一标识（使用 short-uuid）
  type: 'ai-shortcut' // 类型
  name: string // AI Shortcut 名称
  path: string // AI Shortcut ID（用于关联）
  icon: string // emoji 图标
  createdAt: number // 创建时间戳
}
```

### 数据映射关系

```
AIShortcut Store (aiShortcut.ts)
    ↓
LauncherItem (appLauncher.ts / actionPage.ts)
    ↓ (通过 path 字段存储的 ID)
执行时反查 AIShortcut 数据
```

## 使用流程

### 添加 AI Shortcut 到启动器

1. 在设置页面的"AI快捷命令"标签中创建 AI Shortcuts
2. 打开 Super Panel（使用快捷键）
3. 点击空白格子
4. 选择"AI快捷命令"类型
5. 从列表中选择要添加的 AI Shortcut
6. 确认添加

### 执行 AI Shortcut

1. 打开 Super Panel
2. 点击 AI Shortcut 图标
3. 系统显示成功提示并关闭面板
4. 查看控制台输出的命令信息（调试模式）

### 编辑 AI Shortcut

1. 右键点击 AI Shortcut 图标
2. 选择"编辑"
3. 选择新的 AI Shortcut
4. 确认保存

### 删除 AI Shortcut

1. 右键点击 AI Shortcut 图标
2. 选择"删除"
3. 确认删除

## 设计特点

### 1. 一致性

- 遵循现有的 `file`、`folder`、`web`、`cmd`、`action-page` 实现模式
- 使用相同的 Modal、视图切换和确认流程
- 数据结构与其他类型保持一致

### 2. 可扩展性

- `executeAIShortcut` 函数预留了实际执行逻辑的接口
- 可以轻松添加 AI API 调用
- 支持未来添加更多配置选项

### 3. 错误处理

- 检查 AI Shortcut 是否存在
- 如果关联的 Shortcut 被删除，自动清理无效项
- 提供友好的错误提示

### 4. 用户体验

- 紫色主题色区分 AI Shortcut 类型
- 分类筛选提高选择效率
- 显示提示词预览帮助用户识别
- emoji 图标增加视觉识别度

## 后续计划

### 短期（已完成）

- ✅ 基本的添加、显示、编辑、删除功能
- ✅ 控制台输出调试信息

### 中期（待实现）

- ⏳ 集成 AI API 执行实际命令
- ⏳ 添加执行进度显示
- ⏳ 支持命令执行历史

### 长期（规划中）

- 📋 支持快捷键直接执行特定 AI Shortcut
- 📋 支持命令参数输入
- 📋 支持命令结果展示面板
- 📋 支持命令链（多个命令组合执行）

## 测试建议

1. **基本功能测试：**
   - 添加 AI Shortcut 到 main 区域和 action 区域
   - 编辑现有的 AI Shortcut
   - 删除 AI Shortcut
   - 拖拽排序 AI Shortcut

2. **边界情况测试：**
   - 没有任何 AI Shortcuts 时的显示
   - 关联的 AI Shortcut 被删除后的处理
   - 不同分类的筛选

3. **集成测试：**
   - 与其他类型（file、folder、web等）混合使用
   - 跨区域拖拽（应该被禁止）
   - 数据持久化验证

## 代码质量

### 遵循的最佳实践

1. **TypeScript 类型安全：**
   - 所有函数都有明确的类型定义
   - 使用接口定义数据结构
   - 避免使用 `any` 类型

2. **组件设计：**
   - 单一职责原则
   - Props 和 Emits 明确定义
   - 合理的组件拆分

3. **代码复用：**
   - 复用现有的模式和工具函数
   - 使用 composables（useToast、useContextMenu）
   - 统一的样式系统

4. **错误处理：**
   - 边界条件检查
   - 友好的错误提示
   - 自动清理无效数据

5. **可维护性：**
   - 清晰的注释
   - 一致的命名规范
   - 逻辑分离明确

## 相关文件

- `src/renderer/src/components/super-panel/AddAIShortcutView.vue` - AI Shortcut 选择器
- `src/renderer/src/components/super-panel/SuperPanelItem.vue` - 启动器项目组件
- `src/renderer/src/components/super-panel/ItemTypeSelector.vue` - 类型选择器
- `src/renderer/src/stores/aiShortcut.ts` - AI Shortcut 数据管理
- `src/renderer/src/stores/appLauncher.ts` - 启动器数据管理
- `src/renderer/src/types/launcher.ts` - 类型定义

## 总结

本次实现成功地将 AI Shortcut 功能集成到 Super Panel 启动器中，遵循了现有的设计模式和最佳实践。用户现在可以方便地将常用的 AI 命令添加到启动器，实现快速访问。执行功能目前以控制台输出的形式实现，便于调试和后续集成 AI API。
