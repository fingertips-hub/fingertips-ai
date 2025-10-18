# 插件系统开发方案 - 最佳实践

## 📋 目录

1. [系统架构设计](#系统架构设计)
2. [技术选型与理由](#技术选型与理由)
3. [插件开发规范](#插件开发规范)
4. [开发任务清单](#开发任务清单)
5. [API 设计](#api-设计)
6. [安全与隔离](#安全与隔离)
7. [开发优先级](#开发优先级)
8. [测试策略](#测试策略)

---

## 🏗️ 系统架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                       渲染进程 (Renderer)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Settings Page - Plugin Manager              │   │
│  │  - 插件列表展示                                        │   │
│  │  - 插件启用/禁用                                       │   │
│  │  - 插件配置界面                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        SuperPanel - ItemTypeSelector                  │   │
│  │  - 显示已启用的插件                                    │   │
│  │  - 选择插件执行                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Plugin Execution Context (可选)               │   │
│  │  - 插件自定义窗口/面板                                 │   │
│  │  - 动态加载 Vue 组件                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│                       Preload (Bridge)                        │
│  - 暴露安全的 Plugin API                                      │
│  - 权限控制                                                   │
│  - 类型安全                                                   │
└─────────────────────────────────────────────────────────────┘
                           ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│                       主进程 (Main)                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Plugin Manager (核心)                      │   │
│  │  - 插件扫描与加载                                      │   │
│  │  - 插件生命周期管理                                    │   │
│  │  - 插件依赖解析                                        │   │
│  │  - 插件沙箱环境                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Plugin Store (配置存储)                     │   │
│  │  - 插件配置持久化                                      │   │
│  │  - 插件启用状态                                        │   │
│  │  - 插件元数据缓存                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Plugin API Provider                        │   │
│  │  - Settings API (读取AI配置等)                        │   │
│  │  - File System API (受限)                             │   │
│  │  - Dialog API                                         │   │
│  │  - Notification API                                   │   │
│  │  - Clipboard API                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    plugins/ (插件目录)                         │
│  ├── example-plugin/                                         │
│  │   ├── package.json           (插件元信息)                 │
│  │   ├── manifest.json          (插件清单)                   │
│  │   ├── index.js               (主进程入口)                 │
│  │   ├── renderer.js            (渲染进程入口,可选)           │
│  │   ├── ui/                                                 │
│  │   │   ├── settings.vue       (配置界面组件)               │
│  │   │   └── panel.vue          (功能面板组件,可选)          │
│  │   ├── assets/                (静态资源)                   │
│  │   └── config.schema.json     (配置模式验证)               │
│  └── ...                                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 技术选型与理由

### 1. **插件格式**: JavaScript/TypeScript 模块

**理由**:

- 与现有技术栈一致
- 动态加载简单
- 支持 ES Module 和 CommonJS
- TypeScript 提供类型安全

### 2. **插件加载**: 主进程动态 `require/import`

**理由**:

- 安全控制（主进程权限更高）
- 可以在加载前验证插件
- 便于管理插件生命周期

### 3. **配置存储**: electron-store

**理由**:

- 已在项目中使用
- 持久化可靠
- 支持复杂数据结构

### 4. **UI 组件**: Vue 3 动态组件

**理由**:

- 项目使用 Vue 3
- 支持动态导入和挂载
- 可以与现有组件共享状态

### 5. **通信机制**: IPC (Main ↔ Renderer)

**理由**:

- Electron 标准做法
- 类型安全（通过 preload）
- 权限可控

---

## 📐 插件开发规范

### 1. 插件目录结构

```
plugins/
└── my-plugin/
    ├── package.json              # 必需：npm 包信息
    ├── manifest.json             # 必需：插件元信息
    ├── index.js                  # 必需：主进程入口
    ├── renderer.js               # 可选：渲染进程入口
    ├── ui/                       # 可选：UI 组件
    │   ├── settings.vue          # 插件配置界面
    │   └── panel.vue             # 插件功能面板
    ├── assets/                   # 可选：静态资源
    │   ├── icon.png
    │   └── styles.css
    ├── config.schema.json        # 可选：配置验证模式
    └── README.md                 # 可选：插件说明
```

### 2. manifest.json 规范

```json
{
  "id": "my-plugin", // 必需：唯一标识符（kebab-case）
  "name": "我的插件", // 必需：显示名称
  "version": "1.0.0", // 必需：语义化版本
  "description": "这是一个示例插件", // 必需：插件描述
  "author": "作者名", // 可选：作者
  "icon": "assets/icon.png", // 可选：插件图标（相对路径）
  "homepage": "https://...", // 可选：插件主页

  "fingertips": {
    "minVersion": "1.0.0", // 必需：最小支持版本
    "maxVersion": "2.0.0" // 可选：最大支持版本
  },

  "main": "index.js", // 必需：主进程入口
  "renderer": "renderer.js", // 可选：渲染进程入口

  "permissions": [
    // 必需：权限声明
    "settings:read", // 读取设置
    "settings:write", // 写入设置
    "ai:config", // 访问 AI 配置
    "fs:read", // 文件系统读取（受限）
    "fs:write", // 文件系统写入（受限）
    "dialog", // 对话框
    "notification", // 通知
    "clipboard" // 剪贴板
  ],

  "ui": {
    "hasSettings": true, // 是否有配置界面
    "hasPanel": false, // 是否有功能面板
    "settingsComponent": "ui/settings.vue", // 配置组件路径
    "panelComponent": "ui/panel.vue" // 面板组件路径
  },

  "config": {
    "schema": "config.schema.json", // 配置验证模式
    "defaults": {
      // 默认配置
      "option1": "value1",
      "option2": 42
    }
  },

  "lifecycle": {
    "onLoad": true, // 是否在应用启动时加载
    "onActivate": false // 是否在用户激活时加载
  }
}
```

### 3. 主进程入口 (index.js)

```javascript
/**
 * 插件主进程入口
 * @param {PluginContext} context - 插件上下文
 */
module.exports = {
  /**
   * 插件激活时调用
   * @param {PluginContext} context
   */
  activate(context) {
    console.log('Plugin activated:', context.manifest.name)

    // 注册 IPC 处理器
    context.ipc.handle('my-plugin:action', async (event, data) => {
      // 处理来自渲染进程的请求
      return { success: true, data: 'result' }
    })

    // 访问 API
    const aiConfig = await context.api.settings.getAIConfig()
    console.log('AI Config:', aiConfig)

    // 读取插件配置
    const config = await context.config.get('option1')

    // 监听配置变化
    context.config.onChange('option1', (newValue, oldValue) => {
      console.log('Config changed:', oldValue, '->', newValue)
    })

    // 返回清理函数
    return () => {
      console.log('Plugin deactivated')
    }
  },

  /**
   * 插件停用时调用
   */
  deactivate() {
    // 清理资源
    console.log('Plugin deactivated')
  },

  /**
   * 执行插件功能
   * @param {Object} params - 执行参数
   */
  async execute(params) {
    // 当用户从 SuperPanel 选择此插件时调用
    console.log('Plugin executed with params:', params)

    // 执行具体功能
    const result = await doSomething(params)

    return {
      success: true,
      data: result
    }
  }
}
```

### 4. 渲染进程入口 (renderer.js，可选)

```javascript
/**
 * 插件渲染进程入口
 * @param {RendererContext} context
 */
module.exports = {
  /**
   * 渲染进程中激活插件
   */
  activate(context) {
    console.log('Plugin renderer activated')

    // 调用主进程 API
    context.ipc.invoke('my-plugin:action', { foo: 'bar' }).then((result) => console.log(result))

    // 访问渲染进程 API
    context.api.notification.show({
      title: '插件已加载',
      message: '我的插件已成功加载'
    })

    return () => {
      console.log('Plugin renderer deactivated')
    }
  }
}
```

### 5. 配置界面组件 (ui/settings.vue)

```vue
<template>
  <div class="plugin-settings">
    <h3>{{ manifest.name }} 设置</h3>

    <div class="setting-item">
      <label>选项 1</label>
      <input v-model="config.option1" @change="saveConfig" />
    </div>

    <div class="setting-item">
      <label>选项 2</label>
      <input type="number" v-model.number="config.option2" @change="saveConfig" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 插件 API 通过 inject 提供
const manifest = inject('pluginManifest')
const config = ref({})

onMounted(async () => {
  // 加载配置
  config.value = await window.api.plugin.getConfig(manifest.id)
})

async function saveConfig() {
  await window.api.plugin.setConfig(manifest.id, config.value)
}
</script>
```

### 6. 配置验证模式 (config.schema.json)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "option1": {
      "type": "string",
      "description": "选项 1 的描述",
      "default": "value1"
    },
    "option2": {
      "type": "number",
      "description": "选项 2 的描述",
      "minimum": 0,
      "maximum": 100,
      "default": 42
    }
  },
  "required": ["option1"]
}
```

---

## 📝 开发任务清单

### 阶段 1: 基础架构 (核心功能)

#### 任务 1.1: 类型定义与接口设计

- **文件**: `src/main/types/plugin.ts`
- **内容**:
  - 定义 `PluginManifest` 接口
  - 定义 `PluginContext` 接口
  - 定义 `PluginAPI` 接口
  - 定义 `PluginPermission` 枚举
  - 定义 `PluginLifecycle` 接口
  - 定义 `PluginConfig` 接口
- **验收标准**: 所有类型定义完整，无 TypeScript 错误

#### 任务 1.2: 插件配置存储

- **文件**: `src/main/modules/pluginStore.ts`
- **功能**:
  - 使用 electron-store 存储插件配置
  - 插件启用/禁用状态
  - 插件用户配置
  - 插件元数据缓存
- **API**:
  - `getPluginConfig(pluginId: string): Promise<any>`
  - `setPluginConfig(pluginId: string, config: any): Promise<void>`
  - `isPluginEnabled(pluginId: string): Promise<boolean>`
  - `setPluginEnabled(pluginId: string, enabled: boolean): Promise<void>`
  - `getEnabledPlugins(): Promise<string[]>`
- **验收标准**: 所有存储操作正常，支持配置的增删改查

#### 任务 1.3: 插件加载器

- **文件**: `src/main/modules/pluginLoader.ts`
- **功能**:
  - 扫描 `plugins/` 目录
  - 解析 `manifest.json`
  - 验证插件格式
  - 验证版本兼容性
  - 动态加载插件模块
  - 错误处理与日志
- **API**:
  - `scanPlugins(): Promise<PluginManifest[]>`
  - `validatePlugin(manifest: PluginManifest): boolean`
  - `loadPlugin(pluginId: string): Promise<Plugin>`
  - `unloadPlugin(pluginId: string): Promise<void>`
- **验收标准**:
  - 能正确扫描并加载符合规范的插件
  - 能识别并拒绝不符合规范的插件
  - 有完善的错误提示

#### 任务 1.4: 插件管理器

- **文件**: `src/main/modules/pluginManager.ts`
- **功能**:
  - 插件生命周期管理（activate/deactivate）
  - 插件依赖解析
  - 权限验证
  - API 提供
  - 事件系统
- **API**:
  - `initialize(): Promise<void>`
  - `getAllPlugins(): PluginManifest[]`
  - `getEnabledPlugins(): Plugin[]`
  - `activatePlugin(pluginId: string): Promise<void>`
  - `deactivatePlugin(pluginId: string): Promise<void>`
  - `executePlugin(pluginId: string, params: any): Promise<any>`
  - `reloadPlugin(pluginId: string): Promise<void>`
- **验收标准**: 插件生命周期管理正常，权限控制有效

#### 任务 1.5: 插件 API 提供者

- **文件**: `src/main/modules/pluginAPI.ts`
- **功能**: 为插件提供受限的 API 访问
- **提供的 API**:
  - **Settings API**:
    - `getAIConfig()`: 获取 AI 配置
    - `getSettings()`: 获取应用设置
    - `getSetting(key)`: 获取单个设置
  - **Dialog API**:
    - `showOpenDialog(options)`: 打开文件选择对话框
    - `showSaveDialog(options)`: 保存文件对话框
    - `showMessageBox(options)`: 消息框
  - **Notification API**:
    - `show(options)`: 显示通知
  - **Clipboard API**:
    - `readText()`: 读取剪贴板文本
    - `writeText(text)`: 写入剪贴板文本
  - **File System API** (受限):
    - `readFile(path, options)`: 读取文件（仅限插件目录和用户选择的文件）
    - `writeFile(path, data, options)`: 写入文件
    - `exists(path)`: 检查文件是否存在
  - **Config API**:
    - `get(key)`: 获取插件配置
    - `set(key, value)`: 设置插件配置
    - `onChange(key, callback)`: 监听配置变化
- **验收标准**:
  - 所有 API 功能正常
  - 权限控制有效（未授权操作被拦截）
  - 文件系统访问受限于安全路径

### 阶段 2: IPC 通信与 Preload 桥接

#### 任务 2.1: IPC 处理器

- **文件**: `src/main/modules/pluginHandlers.ts`
- **功能**:
  - 注册所有插件相关的 IPC 通道
  - 处理渲染进程的插件请求
- **IPC 通道**:
  - `plugin:get-all`: 获取所有插件
  - `plugin:get-enabled`: 获取已启用插件
  - `plugin:toggle-enabled`: 切换插件启用状态
  - `plugin:get-config`: 获取插件配置
  - `plugin:set-config`: 设置插件配置
  - `plugin:execute`: 执行插件
  - `plugin:reload`: 重新加载插件
- **验收标准**: 所有 IPC 通道正常工作，错误处理完善

#### 任务 2.2: Preload 桥接

- **文件**: `src/preload/index.ts` (扩展)
- **功能**:
  - 在 `window.api` 中添加 `plugin` 命名空间
  - 提供类型安全的插件 API
- **API**:
  ```typescript
  window.api.plugin = {
    getAll: () => Promise<PluginManifest[]>
    getEnabled: () => Promise<PluginManifest[]>
    toggleEnabled: (pluginId: string, enabled: boolean) => Promise<void>
    getConfig: (pluginId: string) => Promise<any>
    setConfig: (pluginId: string, config: any) => Promise<void>
    execute: (pluginId: string, params: any) => Promise<any>
    reload: (pluginId: string) => Promise<void>
  }
  ```
- **验收标准**: API 在渲染进程中可用，类型提示正确

#### 任务 2.3: 类型声明

- **文件**: `src/preload/index.d.ts` (扩展)
- **内容**: 添加插件相关的类型声明
- **验收标准**: TypeScript 类型检查通过，IDE 自动完成正常

### 阶段 3: 渲染进程集成

#### 任务 3.1: 插件 Store

- **文件**: `src/renderer/src/stores/plugin.ts`
- **功能**:
  - 管理插件列表状态
  - 管理插件配置状态
  - 提供插件操作方法
- **State**:
  - `plugins`: 所有插件列表
  - `enabledPlugins`: 已启用插件列表
  - `currentPluginConfig`: 当前编辑的插件配置
- **Actions**:
  - `loadPlugins()`: 加载插件列表
  - `loadEnabledPlugins()`: 加载已启用插件
  - `togglePlugin(pluginId, enabled)`: 切换插件状态
  - `loadPluginConfig(pluginId)`: 加载插件配置
  - `savePluginConfig(pluginId, config)`: 保存插件配置
  - `executePlugin(pluginId, params)`: 执行插件
- **验收标准**: Store 状态管理正常，与主进程同步正确

#### 任务 3.2: 插件管理页面组件

- **文件**: `src/renderer/src/components/settings/PluginManager.vue`
- **功能**:
  - 显示所有已安装插件列表
  - 插件信息展示（名称、版本、描述、作者）
  - 插件启用/禁用开关
  - 插件配置按钮
  - 插件重新加载按钮
- **UI 设计**:
  - 卡片式布局
  - 插件图标显示
  - 启用状态指示器
  - 配置按钮（如果插件有配置界面）
- **验收标准**: UI 美观，操作流畅，状态实时更新

#### 任务 3.3: 插件配置对话框

- **文件**: `src/renderer/src/components/settings/plugin/PluginConfigDialog.vue`
- **功能**:
  - 动态加载插件的配置组件
  - 提供插件配置的上下文（通过 provide/inject）
  - 保存配置
  - 取消配置
- **验收标准**: 能正确加载和显示插件配置组件，配置保存正常

#### 任务 3.4: 插件动态组件加载器

- **文件**: `src/renderer/src/composables/usePluginComponent.ts`
- **功能**:
  - 动态加载插件 Vue 组件
  - 组件缓存
  - 错误处理
- **API**:
  ```typescript
  const { component, loading, error } = usePluginComponent(pluginId, componentType)
  ```
- **验收标准**: 组件能正确加载和卸载，错误处理完善

#### 任务 3.5: Settings 路由集成

- **文件**: `src/renderer/src/settings.ts` (扩展)
- **功能**: 添加插件管理路由
- **修改**:
  ```typescript
  {
    path: '/plugins',
    name: 'plugins',
    component: PluginManager
  }
  ```
- **验收标准**: 路由导航正常

#### 任务 3.6: Settings 菜单集成

- **文件**: `src/renderer/src/Settings.vue` (扩展)
- **功能**: 在侧边栏添加"插件"菜单项
- **修改**: 在 `menuItems` 数组中添加：
  ```typescript
  {
    path: '/plugins',
    label: '插件',
    icon: 'mdi:puzzle'
  }
  ```
- **验收标准**: 菜单项正确显示，点击可导航

### 阶段 4: SuperPanel 集成

#### 任务 4.1: ItemTypeSelector 集成

- **文件**: `src/renderer/src/components/super-panel/ItemTypeSelector.vue` (修改)
- **功能**: 启用插件选项，点击后显示已启用插件列表
- **修改**: 将 `plugin` 类型的 `disabled` 改为 `false`
- **验收标准**: 插件选项可点击

#### 任务 4.2: 插件选择器组件

- **文件**: `src/renderer/src/components/super-panel/PluginSelector.vue`
- **功能**:
  - 显示所有已启用的插件
  - 插件搜索过滤
  - 选择插件后触发 `select` 事件
- **UI 设计**: 类似于 AI 快捷指令选择器
- **验收标准**: 能正确显示和选择插件

#### 任务 4.3: 插件执行流程

- **文件**: `src/renderer/src/components/super-panel/AddPluginView.vue`
- **功能**:
  - 显示插件选择器
  - 执行选中的插件
  - 显示插件执行结果
  - 如果插件有自定义面板，加载并显示
- **验收标准**: 插件执行流程完整，用户体验流畅

#### 任务 4.4: LauncherItem 类型扩展

- **文件**: `src/renderer/src/types/launcher.ts` (确认)
- **功能**: 确保 `plugin` 类型已定义
- **扩展**: 为 `LauncherItem` 添加 `pluginId` 字段（可选，仅当 type 为 'plugin' 时）
- **验收标准**: 类型定义完整，支持插件项存储

### 阶段 5: 插件执行窗口（可选）

#### 任务 5.1: 插件执行窗口

- **文件**: `src/main/modules/pluginWindow.ts`
- **功能**:
  - 创建独立的插件执行窗口
  - 窗口生命周期管理
  - 插件上下文注入
- **API**:
  - `createPluginWindow(pluginId: string, options: any): BrowserWindow`
  - `showPluginWindow(pluginId: string): void`
  - `closePluginWindow(pluginId: string): void`
- **验收标准**: 插件窗口正常创建和销毁

#### 任务 5.2: 插件窗口 HTML 模板

- **文件**: `src/renderer/plugin-window.html`
- **功能**: 插件执行窗口的 HTML 入口
- **验收标准**: 窗口正确加载和渲染

### 阶段 6: 示例插件与文档

#### 任务 6.1: 示例插件 1 - Hello World

- **目录**: `plugins/hello-world/`
- **功能**: 最简单的插件，显示通知
- **目的**: 演示基本插件结构
- **验收标准**: 能成功加载和执行

#### 任务 6.2: 示例插件 2 - AI 配置查看器

- **目录**: `plugins/ai-config-viewer/`
- **功能**: 读取并展示 AI 配置，有配置界面
- **目的**: 演示 API 使用和配置管理
- **验收标准**: 能读取 AI 配置，配置界面正常

#### 任务 6.3: 示例插件 3 - 自定义面板

- **目录**: `plugins/custom-panel/`
- **功能**: 有自定义 Vue 面板的插件
- **目的**: 演示 UI 扩展能力
- **验收标准**: 自定义面板正确加载和显示

#### 任务 6.4: 插件开发文档

- **文件**: `docs/PLUGIN_DEVELOPMENT_GUIDE.md`
- **内容**:
  - 插件开发快速入门
  - API 参考文档
  - 最佳实践
  - 常见问题
  - 示例代码
- **验收标准**: 文档清晰易懂，覆盖所有关键点

#### 任务 6.5: 插件开发脚手架

- **文件**: `scripts/create-plugin.js`
- **功能**: 快速生成插件项目模板
- **使用**: `npm run create-plugin my-plugin`
- **验收标准**: 能生成完整的插件模板

### 阶段 7: 安全与优化

#### 任务 7.1: 权限系统

- **文件**: `src/main/modules/pluginPermissions.ts`
- **功能**:
  - 权限检查
  - 权限请求（运行时）
  - 权限拒绝处理
- **验收标准**: 权限系统有效，未授权操作被阻止

#### 任务 7.2: 插件沙箱

- **文件**: `src/main/modules/pluginSandbox.ts`
- **功能**:
  - 隔离插件执行环境
  - 限制访问范围
  - 资源限制（内存、CPU）
- **验收标准**: 插件无法访问不应该访问的资源

#### 任务 7.3: 错误处理与日志

- **文件**: `src/main/modules/pluginLogger.ts`
- **功能**:
  - 插件日志系统
  - 错误捕获与报告
  - 调试支持
- **验收标准**: 所有插件操作有日志，错误能被捕获

#### 任务 7.4: 性能优化

- **优化点**:
  - 插件懒加载
  - 组件缓存
  - 减少 IPC 通信
- **验收标准**: 插件加载快速，不影响主应用性能

---

## 🔌 API 设计

### 主进程 API (PluginContext.api)

```typescript
interface PluginAPI {
  // 设置 API
  settings: {
    getAIConfig(): Promise<{
      baseUrl: string
      apiKey: string
      models: string[]
      defaultModel: string
    }>
    getSettings(): Promise<AppSettings>
    getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]>
  }

  // 对话框 API
  dialog: {
    showOpenDialog(options: OpenDialogOptions): Promise<string[] | undefined>
    showSaveDialog(options: SaveDialogOptions): Promise<string | undefined>
    showMessageBox(options: MessageBoxOptions): Promise<number>
  }

  // 通知 API
  notification: {
    show(options: { title: string; body: string; icon?: string }): void
  }

  // 剪贴板 API
  clipboard: {
    readText(): string
    writeText(text: string): void
    readImage(): NativeImage | undefined
  }

  // 文件系统 API（受限）
  fs: {
    readFile(path: string, options?: { encoding?: string }): Promise<string | Buffer>
    writeFile(path: string, data: string | Buffer, options?: { encoding?: string }): Promise<void>
    exists(path: string): Promise<boolean>
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>
    readdir(path: string): Promise<string[]>
  }

  // 配置 API
  config: {
    get(key: string): Promise<any>
    set(key: string, value: any): Promise<void>
    getAll(): Promise<Record<string, any>>
    setAll(config: Record<string, any>): Promise<void>
    onChange(key: string, callback: (newValue: any, oldValue: any) => void): void
  }

  // IPC API
  ipc: {
    handle(channel: string, handler: (event: any, ...args: any[]) => any): void
    send(channel: string, ...args: any[]): void
    on(channel: string, listener: (event: any, ...args: any[]) => void): void
  }
}
```

### 渲染进程 API (window.api.plugin)

```typescript
interface PluginRendererAPI {
  // 插件管理
  getAll(): Promise<PluginManifest[]>
  getEnabled(): Promise<PluginManifest[]>
  toggleEnabled(pluginId: string, enabled: boolean): Promise<void>

  // 配置管理
  getConfig(pluginId: string): Promise<any>
  setConfig(pluginId: string, config: any): Promise<void>

  // 执行
  execute(pluginId: string, params: any): Promise<any>

  // 重载
  reload(pluginId: string): Promise<void>

  // 渲染进程通知 API
  notification: {
    show(options: { title: string; message: string }): void
  }

  // 渲染进程剪贴板 API
  clipboard: {
    readText(): Promise<string>
    writeText(text: string): Promise<void>
  }
}
```

---

## 🔒 安全与隔离

### 安全原则

1. **最小权限原则**: 插件只能访问它声明的权限
2. **路径限制**: 文件系统访问仅限于：
   - 插件自己的目录
   - 用户通过对话框选择的文件/目录
   - 应用的 userData 目录（子目录）
3. **IPC 隔离**: 插件不能直接访问主进程，所有通信通过受控的 IPC 通道
4. **配置验证**: 所有插件配置需通过 JSON Schema 验证
5. **错误隔离**: 插件错误不影响主应用运行

### 权限系统

```typescript
enum PluginPermission {
  SETTINGS_READ = 'settings:read', // 读取应用设置
  SETTINGS_WRITE = 'settings:write', // 写入应用设置
  AI_CONFIG = 'ai:config', // 访问 AI 配置
  FS_READ = 'fs:read', // 文件系统读取（受限路径）
  FS_WRITE = 'fs:write', // 文件系统写入（受限路径）
  DIALOG = 'dialog', // 打开系统对话框
  NOTIFICATION = 'notification', // 显示系统通知
  CLIPBOARD = 'clipboard', // 访问剪贴板
  NETWORK = 'network', // 网络请求（未来）
  SHELL = 'shell' // 执行 Shell 命令（未来，高风险）
}
```

### 沙箱机制

1. **Node.js VM**: 使用 `vm.createContext` 创建隔离环境
2. **代理对象**: 通过 Proxy 控制 API 访问
3. **超时控制**: 限制插件执行时间
4. **资源监控**: 监控内存和 CPU 使用

---

## 📊 开发优先级

### P0 (必须完成，核心功能)

1. ✅ 类型定义与接口设计
2. ✅ 插件配置存储
3. ✅ 插件加载器
4. ✅ 插件管理器
5. ✅ 插件 API 提供者（基础 API）
6. ✅ IPC 处理器
7. ✅ Preload 桥接
8. ✅ 插件 Store
9. ✅ 插件管理页面组件
10. ✅ Settings 路由和菜单集成
11. ✅ ItemTypeSelector 集成
12. ✅ 示例插件 1 - Hello World
13. ✅ 插件开发文档

### P1 (重要，增强功能)

1. ✅ 插件配置对话框
2. ✅ 插件动态组件加载器
3. ✅ 插件选择器组件
4. ✅ 插件执行流程
5. ✅ 示例插件 2 - AI 配置查看器
6. ✅ 权限系统
7. ✅ 错误处理与日志

### P2 (可选，进阶功能)

1. 插件执行窗口
2. 示例插件 3 - 自定义面板
3. 插件沙箱
4. 插件开发脚手架
5. 性能优化
6. 插件市场（未来）

---

## 🧪 测试策略

### 单元测试

- 插件加载器测试
- 插件验证测试
- 权限检查测试
- API 功能测试

### 集成测试

- 插件生命周期测试
- IPC 通信测试
- 配置存储测试

### E2E 测试

- 插件安装流程
- 插件启用/禁用
- 插件执行流程
- 插件配置修改

### 示例插件测试

- 每个示例插件都应该能成功运行
- 验证所有 API 功能正常

---

## 📦 目录结构

```
fingertips-ai/
├── plugins/                          # 插件目录（新增）
│   ├── hello-world/                 # 示例插件 1
│   ├── ai-config-viewer/            # 示例插件 2
│   └── custom-panel/                # 示例插件 3
├── src/
│   ├── main/
│   │   ├── modules/
│   │   │   ├── pluginStore.ts      # 插件配置存储（新增）
│   │   │   ├── pluginLoader.ts     # 插件加载器（新增）
│   │   │   ├── pluginManager.ts    # 插件管理器（新增）
│   │   │   ├── pluginAPI.ts        # 插件 API 提供者（新增）
│   │   │   ├── pluginHandlers.ts   # IPC 处理器（新增）
│   │   │   ├── pluginPermissions.ts # 权限系统（新增）
│   │   │   ├── pluginSandbox.ts    # 沙箱（新增）
│   │   │   ├── pluginLogger.ts     # 日志（新增）
│   │   │   └── pluginWindow.ts     # 插件窗口（新增，可选）
│   │   └── types/
│   │       └── plugin.ts            # 插件类型定义（新增）
│   ├── preload/
│   │   ├── index.ts                 # 扩展 plugin API
│   │   └── index.d.ts               # 扩展类型声明
│   └── renderer/
│       ├── plugin-window.html       # 插件窗口（新增，可选）
│       └── src/
│           ├── stores/
│           │   └── plugin.ts        # 插件 Store（新增）
│           ├── components/
│           │   └── settings/
│           │       ├── PluginManager.vue  # 插件管理页面（新增）
│           │       └── plugin/
│           │           └── PluginConfigDialog.vue  # 配置对话框（新增）
│           │   └── super-panel/
│           │       ├── ItemTypeSelector.vue  # 修改
│           │       ├── PluginSelector.vue    # 插件选择器（新增）
│           │       └── AddPluginView.vue     # 插件添加视图（新增）
│           ├── composables/
│           │   └── usePluginComponent.ts  # 动态组件加载（新增）
│           ├── Settings.vue         # 修改（添加菜单）
│           └── settings.ts          # 修改（添加路由）
├── docs/
│   ├── PLUGIN_SYSTEM_DEVELOPMENT_PLAN.md  # 本文档
│   └── PLUGIN_DEVELOPMENT_GUIDE.md        # 插件开发指南（新增）
└── scripts/
    └── create-plugin.js             # 插件脚手架（新增）
```

---

## 🚀 开发流程

### 第一步: 阅读本文档

- 理解整体架构
- 明确开发目标
- 了解技术规范

### 第二步: 按阶段开发

- 严格按照阶段顺序开发（阶段 1 → 2 → 3 → 4 → 5 → 6 → 7）
- 每完成一个任务，进行验收测试
- 确保前一阶段完成后再进入下一阶段

### 第三步: 持续测试

- 开发过程中随时测试
- 编写单元测试
- 使用示例插件验证功能

### 第四步: 文档完善

- 及时更新 API 文档
- 记录重要决策
- 编写使用说明

### 第五步: 代码审查与优化

- 代码质量检查
- 性能优化
- 安全审查

---

## 🎯 关键决策与优化建议

### 1. 插件格式选择

**决策**: 使用 JavaScript/TypeScript 模块格式
**理由**:

- 与现有技术栈一致
- 学习成本低
- 灵活性高
- 支持 TypeScript 类型检查

### 2. 配置存储方案

**决策**: 使用 electron-store
**理由**:

- 项目已使用，无需额外依赖
- 可靠的持久化
- 支持复杂数据结构
- 自动处理文件读写

### 3. UI 组件加载方式

**决策**: Vue 3 动态组件 + 运行时编译
**优化**:

- 考虑使用构建时编译（如果插件体积大）
- 实现组件缓存机制
- 支持异步组件

### 4. 权限模型

**决策**: 声明式权限 + 运行时检查
**优化**:

- 首次使用时请求权限（更好的用户体验）
- 提供权限管理界面
- 记录权限使用日志

### 5. 插件沙箱

**建议**:

- 初期可以不实现完整沙箱（简化开发）
- 使用权限系统作为第一道防线
- 后期可引入 Node.js VM 或 Worker 线程

### 6. 插件更新机制

**未来优化**:

- 支持插件在线更新
- 版本管理
- 自动检测更新

### 7. 插件市场

**未来扩展**:

- 建立插件仓库
- 插件审核机制
- 用户评价系统

---

## ✅ 验收标准总结

### 功能验收

- ✅ 能扫描并加载符合规范的插件
- ✅ 插件能在设置页面正常显示和配置
- ✅ 插件能从 SuperPanel 正常选择和执行
- ✅ 插件 API 功能正常，权限控制有效
- ✅ 插件配置能正确保存和加载
- ✅ 插件错误不影响主应用

### 性能验收

- ✅ 插件加载时间 < 500ms（小型插件）
- ✅ 插件执行不阻塞主线程
- ✅ 内存占用合理（每个插件 < 50MB）

### 安全验收

- ✅ 未授权的文件系统访问被阻止
- ✅ 插件只能访问声明的权限
- ✅ 插件配置通过 Schema 验证

### 用户体验验收

- ✅ 插件管理界面美观易用
- ✅ 插件错误有友好提示
- ✅ 插件加载状态有视觉反馈
- ✅ 插件配置界面直观

### 开发体验验收

- ✅ 插件开发文档完整清晰
- ✅ 示例插件运行正常
- ✅ API 类型提示完善
- ✅ 错误信息有帮助性

---

## 📚 参考资料

### Electron 插件系统案例

- VSCode Extension API
- Atom Packages
- Obsidian Plugins

### 相关技术文档

- [Electron IPC 通信](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Vue 3 动态组件](https://vuejs.org/guide/essentials/component-basics.html#dynamic-components)
- [JSON Schema](https://json-schema.org/)
- [Node.js VM](https://nodejs.org/api/vm.html)

---

## 📝 变更日志

### Version 1.0.0 (2025-10-18)

- 初始版本
- 完整的插件系统设计方案
- 详细的开发任务清单
- API 设计文档
- 安全与隔离策略

---

## 🤝 贡献指南

如果你在开发过程中发现本方案的不足或有更好的想法，请及时更新本文档。

**更新流程**:

1. 记录问题或改进点
2. 讨论解决方案
3. 更新文档
4. 同步到团队

---

## ❓ FAQ

### Q1: 插件可以访问网络吗？

A: 目前的方案中，插件运行在 Node.js 环境，理论上可以访问网络。但建议：

- 在 manifest.json 中声明 `network` 权限
- 通过代理控制网络访问
- 记录网络请求日志

### Q2: 插件可以创建新窗口吗？

A: 可以，但需要：

- 声明相应权限
- 通过插件 API 创建窗口（而不是直接使用 Electron API）
- 窗口受到管理器控制

### Q3: 插件之间可以通信吗？

A: 目前方案中未实现，但可以通过以下方式扩展：

- 事件总线
- 共享状态（通过 pluginManager）
- IPC 转发

### Q4: 如何调试插件？

A:

- 使用 `pluginLogger` 记录日志
- 在开发环境中打开 DevTools
- 使用 `console.log`（会显示在主进程或渲染进程控制台）

### Q5: 插件可以修改主应用的设置吗？

A: 可以，但需要：

- 声明 `settings:write` 权限
- 通过 API 修改（而不是直接访问 store）
- 用户应该知道插件会修改设置

---

## 🎉 总结

这是一个**完整、安全、可扩展**的插件系统设计方案。它：

- ✅ **架构清晰**: 主进程、渲染进程、插件三者分离
- ✅ **安全可控**: 权限系统、路径限制、IPC 隔离
- ✅ **易于开发**: 规范明确、API 丰富、示例完善
- ✅ **用户友好**: UI 美观、操作流畅、错误提示友好
- ✅ **性能优良**: 懒加载、缓存、异步执行
- ✅ **可扩展**: 支持未来功能扩展（沙箱、市场等）

按照本方案执行，可以实现一个**生产级别的插件系统**，为 Fingertips AI 提供强大的扩展能力！

---

**文档版本**: 1.0.0  
**创建日期**: 2025-10-18  
**最后更新**: 2025-10-18  
**维护者**: Development Team
