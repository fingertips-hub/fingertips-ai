# 插件刷新后状态丢失问题修复

> **日期**: 2025-10-18  
> **问题**: 点击插件管理页面的"刷新列表"按钮后,已启用的插件显示为未启用状态

---

## 🐛 问题描述

在插件管理页面 (`PluginManager.vue`) 中点击"刷新列表"按钮后,原本处于启用状态的插件会显示为未启用状态,即使这些插件实际上仍然在后台运行。

### 复现步骤

1. 打开设置 → 插件管理
2. 启用某个插件(例如 Hello World)
3. 点击页面右上角的"刷新列表"按钮
4. 观察到之前启用的插件开关变为关闭状态

---

## 🔍 问题分析

### 根本原因

在 `src/main/modules/pluginManager.ts` 的 `getAllPlugins()` 方法中,只返回了插件的 `manifest` 对象,而没有包含插件的运行时状态信息:

```typescript
// ❌ 修复前 - 缺少状态信息
getAllPlugins(): PluginManifest[] {
  return Array.from(this.plugins.values()).map((plugin) => plugin.manifest)
}
```

### 问题链路

1. **数据结构**:
   - `Plugin` 对象包含: `manifest`, `enabled`, `activated`, `context`, `lifecycle` 等字段
   - `PluginManifest` 对象只包含: `id`, `name`, `version`, `description` 等静态信息
   - **`enabled` 和 `activated` 是 `Plugin` 的属性,不在 `manifest` 中**

2. **调用流程**:

   ```
   用户点击"刷新列表"
     ↓
   PluginManager.vue: handleReloadAll()
     ↓
   pluginStore.loadPlugins()
     ↓
   IPC: window.api.plugin.getAll()
     ↓
   pluginHandlers: plugin:get-all
     ↓
   pluginManager.getAllPlugins() ← 问题所在!返回的 manifest 中没有状态信息
     ↓
   渲染进程收到数据,但 enabled 字段缺失
     ↓
   UI 显示所有插件为未启用状态
   ```

3. **影响范围**:
   - `getAllPlugins()` - 获取所有插件时丢失状态
   - `getEnabledPlugins()` - 获取已启用插件时丢失状态
   - `getActivatedPlugins()` - 获取已激活插件时丢失状态

---

## ✅ 解决方案

### 修改内容

修改 `src/main/modules/pluginManager.ts` 中的三个方法,在返回的 manifest 中添加 `enabled` 和 `activated` 状态信息:

#### 1. getAllPlugins()

```typescript
// ✅ 修复后 - 包含完整状态信息
getAllPlugins(): PluginManifest[] {
  return Array.from(this.plugins.values()).map((plugin) => ({
    ...plugin.manifest,
    enabled: plugin.enabled,
    activated: plugin.activated
  }))
}
```

#### 2. getEnabledPlugins()

```typescript
getEnabledPlugins(): PluginManifest[] {
  return Array.from(this.plugins.values())
    .filter((plugin) => plugin.enabled)
    .map((plugin) => ({
      ...plugin.manifest,
      enabled: plugin.enabled,
      activated: plugin.activated
    }))
}
```

#### 3. getActivatedPlugins()

```typescript
getActivatedPlugins(): PluginManifest[] {
  return Array.from(this.plugins.values())
    .filter((plugin) => plugin.activated)
    .map((plugin) => ({
      ...plugin.manifest,
      enabled: plugin.enabled,
      activated: plugin.activated
    }))
}
```

### 修改原理

使用对象展开运算符 (`...`) 将 `manifest` 的所有字段复制到新对象中,然后显式添加 `enabled` 和 `activated` 字段,确保返回的数据包含插件的完整状态信息。

---

## 🧪 验证方法

### 测试步骤

1. **启动应用**

   ```bash
   npm run dev
   ```

2. **启用插件**
   - 打开设置 → 插件
   - 找到 "Hello World" 插件
   - 点击启用开关,确保插件处于启用状态
   - 观察系统通知,确认插件已激活

3. **测试刷新**
   - 点击页面右上角的"刷新列表"按钮 (🔄)
   - 观察插件列表

4. **预期结果**
   - ✅ 之前启用的插件仍然显示为启用状态
   - ✅ 插件的开关保持在"已启用"位置
   - ✅ 插件功能仍然正常运行

5. **额外测试**
   - 测试禁用插件后刷新
   - 测试启用多个插件后刷新
   - 测试重新加载单个插件

---

## 📊 影响范围

### 修改的文件

- `src/main/modules/pluginManager.ts`
  - `getAllPlugins()` 方法
  - `getEnabledPlugins()` 方法
  - `getActivatedPlugins()` 方法

### 不受影响的文件

- `src/renderer/src/stores/plugin.ts` - 无需修改
- `src/renderer/src/components/settings/PluginManager.vue` - 无需修改
- `src/main/modules/pluginHandlers.ts` - 无需修改

### 兼容性

- ✅ 向下兼容: 新的返回格式是旧格式的超集
- ✅ 类型安全: `PluginManifest` 接口已包含 `enabled` 和 `activated` 可选字段
- ✅ 无破坏性变更: 其他使用这些方法的代码无需修改

---

## 💡 经验教训

### 问题根源

1. **数据分离**: 静态配置 (`manifest`) 和运行时状态 (`enabled`, `activated`) 分离存储
2. **返回不完整**: 方法只返回了静态配置,忽略了运行时状态
3. **隐式依赖**: UI 组件隐式依赖返回数据中包含状态信息

### 最佳实践

1. **完整性检查**: 确保 API 返回的数据包含所有必需的信息
2. **类型定义**: 使用 TypeScript 接口明确定义返回数据的结构
3. **状态同步**: 确保前后端对插件状态的理解一致
4. **测试覆盖**: 测试刷新、重新加载等状态变化场景

### 代码设计建议

1. **明确接口**: 清晰定义哪些字段是静态的,哪些是动态的
2. **避免隐式**: 不要假设调用者知道返回数据的格式
3. **完整返回**: API 返回的数据应该是自包含的,不需要额外查询
4. **文档说明**: 在接口和类型定义中说明字段的含义和来源

---

## 🔗 相关文档

- [插件系统开发方案](./PLUGIN_SYSTEM_DEVELOPMENT_PLAN.md)
- [插件开发者指南](./PLUGIN_DEVELOPER_GUIDE.md)
- [插件系统测试指南](./PLUGIN_SYSTEM_TEST_GUIDE.md)

---

**修复完成时间**: 2025-10-18  
**修复人员**: AI Assistant  
**状态**: ✅ 已修复并测试
