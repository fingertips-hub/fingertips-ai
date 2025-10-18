# Super Panel 插件集成功能

## 概述

为 Super Panel（超级面板）添加了插件快捷方式支持，用户可以将已启用的插件添加到 Super Panel 中，通过点击快速执行插件功能。

## 功能特点

### 1. **插件选择器**

- 显示所有已启用的插件
- 支持按关键词（keywords）分类筛选
- 实时显示每个分类下的插件数量
- 友好的空状态提示

### 2. **视觉设计**

- 插件在 Super Panel 中显示为紫色主题（区别于其他类型）
- 支持 iconify 图标显示
- 展示插件版本、描述和关键词标签
- 统一的卡片式布局

### 3. **智能执行**

- 点击插件图标即可快速执行
- 自动检查插件是否启用
- 执行成功后自动隐藏 Super Panel
- 完善的错误处理和用户提示

### 4. **编辑支持**

- 支持右键菜单编辑插件快捷方式
- 可以更换绑定的插件
- 支持删除插件快捷方式

## 实现细节

### 新增文件

#### `src/renderer/src/components/super-panel/AddPluginView.vue`

插件选择器组件，提供以下功能：

- 加载已启用的插件列表
- 关键词分类筛选
- 插件选择和确认

**核心代码：**

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { usePluginStore, type PluginManifest } from '../../stores/plugin'

// 组件挂载时加载已启用的插件
onMounted(async () => {
  await pluginStore.loadEnabledPlugins()
})

// 获取已启用的插件
const enabledPlugins = computed(() => {
  return pluginStore.enabledPlugins.filter((p) => p.enabled)
})

// 获取所有唯一的关键词
const allKeywords = computed(() => {
  const keywordSet = new Set<string>()
  enabledPlugins.value.forEach((plugin) => {
    plugin.keywords?.forEach((keyword) => keywordSet.add(keyword))
  })
  return Array.from(keywordSet).sort()
})

// 筛选后的插件列表
const filteredPlugins = computed(() => {
  if (selectedKeyword.value === null) {
    return enabledPlugins.value
  }
  return enabledPlugins.value.filter((plugin) => plugin.keywords?.includes(selectedKeyword.value!))
})
</script>
```

### 修改的文件

#### 1. `src/renderer/src/components/super-panel/ItemTypeSelector.vue`

启用插件选项：

```typescript
{
  type: 'plugin',
  label: '插件',
  description: '添加已启用的插件快捷方式',
  icon: 'mdi:puzzle',
  disabled: false // 已实现
}
```

#### 2. `src/renderer/src/components/super-panel/SuperPanelItem.vue`

主要修改：

##### 导入和初始化

```typescript
import AddPluginView from './AddPluginView.vue'
import { usePluginStore } from '../../stores/plugin'

const pluginStore = usePluginStore()
```

##### 视图类型扩展

```typescript
const currentView = ref<
  | 'selector'
  | 'add-file'
  | 'add-folder'
  | 'add-web'
  | 'add-cmd'
  | 'add-action-page'
  | 'add-ai-shortcut'
  | 'add-plugin' // 新增
>('selector')
```

##### 插件图标显示

```vue
<!-- 如果是插件类型，显示 iconify 图标 -->
<div
  v-else-if="item.type === 'plugin'"
  class="w-full h-full rounded flex items-center justify-center bg-purple-50"
>
  <Icon :icon="item.icon" class="text-xl text-purple-600" />
</div>
```

##### 显示名称处理

```typescript
const displayName = computed(() => {
  if (!item.value) return ''

  // 如果是插件类型，从 pluginStore 实时获取插件名称
  if (item.value.type === 'plugin') {
    const plugin = pluginStore.plugins.find((p) => p.id === item.value!.path)
    return plugin ? plugin.name : item.value.name
  }
  // ... 其他类型处理
})
```

##### 点击事件处理

```typescript
async function handleClick(): Promise<void> {
  if (item.value) {
    // ... 其他类型处理
    else if (item.value.type === 'plugin') {
      // 如果是插件类型，执行插件
      await executePlugin()
    }
    // ...
  }
}
```

##### 插件执行逻辑

```typescript
async function executePlugin(): Promise<void> {
  if (!item.value || item.value.type !== 'plugin') return

  const pluginId = item.value.path // path 字段存储的是插件ID
  const plugin = pluginStore.plugins.find((p) => p.id === pluginId)

  if (plugin) {
    if (!plugin.enabled) {
      toast.error('插件未启用，请先在设置中启用该插件')
      return
    }

    try {
      await pluginStore.executePlugin(pluginId)
      toast.success(`已执行插件「${plugin.name}」`)

      // 隐藏 Super Panel
      setTimeout(() => {
        toast.clearAll()
        window.api.superPanel.hide()
      }, 50)
    } catch (error) {
      console.error('执行插件失败:', error)
      toast.error(`执行插件失败: ${(error as Error).message}`)
    }
  } else {
    toast.error('插件不存在，可能已被删除')
    handleDelete()
  }
}
```

##### 插件确认处理

```typescript
function handlePluginConfirm(data: {
  pluginId: string
  pluginName: string
  pluginIcon: string
}): void {
  const { pluginId, pluginName, pluginIcon } = data

  const newItem = {
    id: isEditMode.value && item.value ? item.value.id : generateUuid.new(),
    type: 'plugin' as const,
    name: pluginName,
    path: pluginId, // 将插件ID存储在 path 字段中
    icon: pluginIcon, // 存储 iconify 图标
    createdAt: isEditMode.value && item.value ? item.value.createdAt : Date.now()
  }

  // 根据区域保存到不同的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  handleModalClose()
  toast.success(isEditMode.value ? '保存成功' : '添加成功')
}
```

## 数据存储结构

插件类型的 LauncherItem 存储格式：

```typescript
{
  id: string,          // 唯一标识（short-uuid）
  type: 'plugin',      // 类型标识
  name: string,        // 插件名称（用于显示）
  path: string,        // 插件ID（用于执行）
  icon: string,        // iconify 图标字符串
  createdAt: number    // 创建时间戳
}
```

**注意：**

- `path` 字段存储的是插件的 ID，而不是文件路径
- `icon` 字段存储的是 iconify 图标名称（如 `mdi:puzzle`）
- 显示名称会实时从 `pluginStore` 获取，确保与插件设置同步

## 用户体验优化

### 1. **智能筛选**

- 按关键词分类，方便查找
- 显示每个分类的插件数量
- "全部"选项显示所有插件

### 2. **视觉反馈**

- hover 效果提供即时反馈
- 紫色主题区分插件类型
- 关键词标签直观展示插件特性

### 3. **错误处理**

- 插件未启用时提示用户
- 插件不存在时自动清理
- 执行失败时显示详细错误信息

### 4. **空状态引导**

- 无插件时提示用户前往设置
- 筛选无结果时提示调整条件
- 友好的图标和文案

## 使用流程

### 添加插件到 Super Panel

1. **打开 Super Panel**
   - 按快捷键唤起 Super Panel

2. **选择空位置**
   - 点击任意空白位置

3. **选择插件类型**
   - 在类型选择器中点击"插件"

4. **选择具体插件**
   - 浏览已启用的插件列表
   - 可选：点击关键词标签筛选
   - 点击要添加的插件

5. **完成添加**
   - 插件图标出现在 Super Panel 中

### 执行插件

1. **打开 Super Panel**
   - 按快捷键唤起 Super Panel

2. **点击插件图标**
   - 系统自动执行插件功能
   - 显示执行成功提示
   - Super Panel 自动隐藏

### 编辑/删除插件

1. **右键点击插件图标**
   - 打开上下文菜单

2. **选择操作**
   - "编辑"：更换绑定的插件
   - "删除"：移除插件快捷方式

## 与插件系统的集成

### 依赖关系

- 依赖 `usePluginStore` 获取插件数据
- 使用 `loadEnabledPlugins()` 加载已启用插件
- 调用 `executePlugin()` 执行插件功能

### 状态同步

- 显示名称实时从 store 获取
- 自动检测插件是否存在
- 自动检测插件是否启用

### 关键词集成

- 完全复用插件管理器的关键词系统
- 动态提取所有唯一关键词
- 支持关键词筛选功能

## 设计原则

### 1. **一致性**

- 遵循 Super Panel 现有的设计模式
- 与其他类型（文件、网页、AI命令等）保持一致的交互
- 使用统一的代码结构和命名规范

### 2. **可扩展性**

- 采用组件化设计，易于维护
- 预留扩展空间，支持未来功能
- 模块化的数据存储结构

### 3. **用户友好**

- 清晰的视觉层次
- 即时的操作反馈
- 友好的错误提示

### 4. **性能优化**

- 使用 computed 进行响应式计算
- 按需加载插件数据
- 高效的筛选算法

## 测试要点

### 功能测试

- [ ] 可以成功添加插件到 Super Panel
- [ ] 点击插件图标可以执行插件
- [ ] 关键词筛选功能正常
- [ ] 编辑功能可以更换插件
- [ ] 删除功能正常工作
- [ ] 显示名称与插件设置同步

### 边界测试

- [ ] 无已启用插件时显示正确
- [ ] 插件被禁用后提示正确
- [ ] 插件被删除后自动清理
- [ ] 筛选无结果时显示正确
- [ ] 执行失败时错误处理正确

### UI/UX 测试

- [ ] 图标显示正确
- [ ] 紫色主题显示正常
- [ ] hover 效果流畅
- [ ] 空状态提示清晰
- [ ] Toast 提示及时准确

### 集成测试

- [ ] 与插件管理器数据同步
- [ ] 与 Super Panel 其他功能协同正常
- [ ] 拖拽功能正常
- [ ] 右键菜单功能正常

## 未来优化方向

1. **插件参数支持**
   - 支持在添加时配置插件参数
   - 保存用户的自定义配置

2. **插件搜索**
   - 添加搜索框快速定位插件
   - 支持模糊搜索

3. **最近使用**
   - 记录插件使用频率
   - 优先显示常用插件

4. **批量操作**
   - 支持批量添加多个插件
   - 支持插件组管理

5. **快捷键支持**
   - 为插件快捷方式设置独立快捷键
   - 支持快捷键快速执行

## 相关文件

### 新增

- `src/renderer/src/components/super-panel/AddPluginView.vue`

### 修改

- `src/renderer/src/components/super-panel/ItemTypeSelector.vue`
- `src/renderer/src/components/super-panel/SuperPanelItem.vue`

### 依赖

- `src/renderer/src/stores/plugin.ts`
- `src/renderer/src/types/launcher.ts`

## 参考资料

- [插件管理器关键词功能](./PLUGIN_KEYWORDS_FEATURE.md)
- [插件开发指南](./PLUGIN_DEVELOPER_GUIDE.md)
- [Super Panel 架构文档](./APP_LAUNCHER_ARCHITECTURE.md)
