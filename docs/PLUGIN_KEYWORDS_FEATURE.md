# 插件关键词分类与搜索功能

## 概述

为插件系统添加了基于关键词（keywords）的分类和搜索功能，提升插件管理的用户体验。

## 主要变更

### 1. 将 `keywords` 设为必选字段

**修改文件：**

- `src/main/types/plugin.ts`
- `src/renderer/src/stores/plugin.ts`
- `src/main/modules/pluginLoader.ts`
- `plugins/hello-world/manifest.json`

**具体变更：**

#### 类型定义更新

```typescript
export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  keywords: string[] // 关键词标签（必选）
  // ... 其他字段
}
```

#### 验证逻辑

在 `pluginLoader.ts` 的 `validateManifest` 函数中添加：

```typescript
if (!Array.isArray(manifest.keywords) || manifest.keywords.length === 0) {
  console.error(`Plugin ${manifest.id}: Missing or invalid 'keywords' array (must be non-empty)`)
  return false
}

if (!manifest.keywords.every((k) => typeof k === 'string')) {
  console.error(`Plugin ${manifest.id}: Invalid 'keywords' - all items must be strings`)
  return false
}
```

### 2. 插件管理器 UI 增强

**修改文件：** `src/renderer/src/components/settings/PluginManager.vue`

**新增功能：**

#### 搜索功能

- **搜索框**：支持模糊搜索插件名称、描述、作者和关键词
- **清除按钮**：快速清除搜索条件
- **实时筛选**：输入时立即显示搜索结果

```vue
<div class="search-box">
  <Icon icon="mdi:magnify" class="search-icon" />
  <input
    v-model="searchQuery"
    type="text"
    placeholder="搜索插件名称、描述或作者..."
    class="search-input"
  />
  <button v-if="searchQuery" @click="searchQuery = ''" class="btn-clear">
    <Icon icon="mdi:close" />
  </button>
</div>
```

#### 关键词分类

- **"全部"选项**：显示所有插件（带计数）
- **关键词标签**：动态生成所有唯一关键词
- **智能计数**：每个关键词显示对应插件数量
- **点击筛选**：点击关键词标签即可筛选

```vue
<div class="keywords-filter">
  <button
    :class="['keyword-chip', { active: selectedKeyword === null }]"
    @click="selectedKeyword = null"
  >
    <Icon icon="mdi:apps" class="chip-icon" />
    <span>全部 ({{ plugins.length }})</span>
  </button>
  <button
    v-for="keyword in allKeywords"
    :key="keyword"
    :class="['keyword-chip', { active: selectedKeyword === keyword }]"
    @click="selectedKeyword = keyword"
  >
    <Icon icon="mdi:tag" class="chip-icon" />
    <span>{{ keyword }} ({{ getKeywordCount(keyword) }})</span>
  </button>
</div>
```

#### 插件卡片增强

- **关键词标签显示**：每个插件卡片显示其关键词
- **可点击标签**：点击标签可快速筛选该关键词下的插件

```vue
<div class="plugin-keywords">
  <span
    v-for="keyword in plugin.keywords"
    :key="keyword"
    class="keyword-tag"
    @click="selectedKeyword = keyword"
    :title="`点击筛选 ${keyword}`"
  >
    {{ keyword }}
  </span>
</div>
```

#### 结果统计

- 实时显示当前筛选结果的插件数量
- 区分筛选和非筛选状态

```vue
<div class="result-stats">
  <span class="stats-text">
    显示 <strong>{{ filteredPlugins.length }}</strong> 个插件
    <template v-if="searchQuery || selectedKeyword">
      (已筛选)
    </template>
  </span>
</div>
```

#### 空状态优化

- 区分"无插件"和"未找到匹配插件"
- 提供清除筛选按钮
- 友好的提示信息

### 3. 核心实现逻辑

#### 获取所有唯一关键词

```typescript
const allKeywords = computed(() => {
  const keywordSet = new Set<string>()
  plugins.value.forEach((plugin) => {
    plugin.keywords?.forEach((keyword) => keywordSet.add(keyword))
  })
  return Array.from(keywordSet).sort()
})
```

#### 关键词计数

```typescript
function getKeywordCount(keyword: string): number {
  return plugins.value.filter((plugin) => plugin.keywords?.includes(keyword)).length
}
```

#### 组合筛选逻辑

```typescript
const filteredPlugins = computed(() => {
  let result = plugins.value

  // 按关键词筛选
  if (selectedKeyword.value) {
    result = result.filter((plugin) => plugin.keywords?.includes(selectedKeyword.value!))
  }

  // 按搜索词筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter((plugin) => {
      return (
        plugin.name.toLowerCase().includes(query) ||
        plugin.description.toLowerCase().includes(query) ||
        plugin.author?.toLowerCase().includes(query) ||
        plugin.keywords?.some((keyword) => keyword.toLowerCase().includes(query))
      )
    })
  }

  return result
})
```

## 设计原则

### 1. 用户体验优先

- **即时反馈**：搜索和筛选立即生效，无需额外操作
- **清晰导航**：视觉上区分已选择和未选择状态
- **友好提示**：空状态和错误状态提供有用的指引

### 2. 视觉设计

- **一致的风格**：与应用整体设计语言保持一致
- **微动效**：hover 和点击有流畅的过渡效果
- **颜色语义**：使用蓝色系表示可交互元素和选中状态

### 3. 响应式布局

- 关键词标签使用 `flex-wrap` 自动换行
- 搜索框占据全宽，适应不同屏幕尺寸
- 插件卡片保持良好的响应式布局

### 4. 性能优化

- 使用 Vue 的 `computed` 响应式计算
- 关键词去重使用 `Set` 数据结构
- 筛选逻辑高效，支持大量插件

## 使用示例

### 插件 manifest.json 示例

```json
{
  "id": "example-plugin",
  "name": "Example Plugin",
  "version": "1.0.0",
  "description": "一个示例插件",
  "keywords": ["工具", "效率", "自动化"],
  "author": "Plugin Developer"
  // ... 其他字段
}
```

### 关键词最佳实践

1. **具体且有意义**：使用能准确描述插件功能的关键词
2. **保持简短**：关键词应简洁明了（1-4 个字）
3. **数量适中**：建议 2-5 个关键词
4. **避免重复**：不要使用过于相似的关键词
5. **通用分类**：考虑使用通用的分类词，便于用户查找

常用关键词示例：

- 功能类：工具、效率、自动化、AI、编辑器
- 用途类：开发、设计、写作、学习、娱乐
- 特性类：通知、快捷键、搜索、集成、同步

## 兼容性说明

### 向后兼容

- 旧版本插件（没有 keywords 字段）将无法加载
- 插件作者需要更新 manifest.json 添加 keywords 字段

### 迁移指南

1. 在插件的 `manifest.json` 中添加 `keywords` 字段
2. 提供至少一个关键词（字符串数组）
3. 重新加载插件

```json
{
  "id": "my-plugin",
  // ... 其他字段
  "keywords": ["工具", "效率"] // 添加这一行
}
```

## 未来优化方向

1. **关键词建议**：为插件作者提供推荐的关键词列表
2. **多选筛选**：支持同时选择多个关键词进行 AND/OR 筛选
3. **保存筛选**：记住用户的筛选偏好
4. **关键词分组**：将关键词按类别分组显示
5. **搜索历史**：记录和显示最近的搜索关键词
6. **高级筛选**：支持按作者、权限等其他维度筛选

## 测试要点

### 功能测试

- [ ] 搜索框能正确筛选插件
- [ ] 关键词标签能正确筛选插件
- [ ] 搜索和关键词筛选可以组合使用
- [ ] 计数显示正确
- [ ] 清除按钮工作正常
- [ ] 空状态显示正确

### UI/UX 测试

- [ ] 筛选响应迅速
- [ ] 视觉反馈清晰
- [ ] 在不同屏幕尺寸下布局正常
- [ ] 关键词标签换行正常
- [ ] hover 效果流畅

### 边界测试

- [ ] 没有插件时显示正常
- [ ] 搜索无结果时显示友好提示
- [ ] 关键词为空数组时验证失败
- [ ] 关键词包含非字符串时验证失败
- [ ] 大量关键词时 UI 正常

## 相关文件

- `src/main/types/plugin.ts` - 插件类型定义
- `src/renderer/src/stores/plugin.ts` - 插件 Store
- `src/main/modules/pluginLoader.ts` - 插件加载和验证
- `src/renderer/src/components/settings/PluginManager.vue` - 插件管理器 UI
- `plugins/hello-world/manifest.json` - 示例插件配置

## 参考资料

- [插件开发指南](./PLUGIN_DEVELOPER_GUIDE.md)
- [Vue 3 文档](https://vuejs.org/)
- [Iconify Vue](https://docs.iconify.design/icon-components/vue/)
