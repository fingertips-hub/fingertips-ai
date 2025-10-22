# Fingertips AI 插件开发者指南

> **版本**: 1.0.0  
> **更新日期**: 2025-10-18  
> **面向对象**: 插件开发者

欢迎使用 Fingertips AI 插件系统!本文档将指导你从零开始开发一个功能完整的插件。

---

## 📋 目录

- [快速入门](#快速入门)
- [插件结构](#插件结构)
- [Manifest 配置详解](#manifest-配置详解)
- [插件生命周期](#插件生命周期)
- [插件上下文 (Context)](#插件上下文-context)
- [可用 API 详解](#可用-api-详解)
- [权限系统](#权限系统)
- [配置管理](#配置管理)
- [开发带窗口的插件](#开发带窗口的插件)
- [使用 Vue 3 开发插件界面](#使用-vue-3-开发插件界面)
- [调试技巧](#调试技巧)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)
- [发布清单](#发布清单)

---

## 🚀 快速入门

### 第一步: 创建插件目录

在 `plugins/` 目录下创建你的插件文件夹:

```bash
plugins/
└── my-first-plugin/
    ├── manifest.json    # 必需
    ├── index.js         # 必需
    └── README.md        # 推荐
```

### 第二步: 编写 manifest.json

```json
{
  "id": "my-first-plugin",
  "name": "我的第一个插件",
  "version": "1.0.0",
  "description": "这是一个示例插件",
  "author": "你的名字",

  "fingertips": {
    "minVersion": "1.0.0"
  },

  "main": "index.js",
  "permissions": ["notification"]
}
```

### 第三步: 编写 index.js

```javascript
module.exports = {
  // 插件激活时调用
  activate(context) {
    console.log('插件已激活:', context.manifest.name)

    // 显示通知
    context.api.notification.show({
      title: '插件激活',
      body: '我的第一个插件已成功启动!'
    })
  },

  // 插件停用时调用
  deactivate() {
    console.log('插件已停用')
  },

  // 执行插件功能
  async execute(params) {
    console.log('插件执行:', params)
    return { success: true }
  }
}
```

### 第四步: 测试插件

1. 启动应用: `npm run dev`
2. 打开设置 → 插件
3. 找到你的插件并启用
4. 观察通知和控制台输出

---

## 📁 插件结构

### 标准目录结构

```
my-plugin/
├── manifest.json              # 必需: 插件元信息
├── index.js                   # 必需: 主进程入口
├── renderer.js                # 可选: 渲染进程入口
├── package.json              # 可选: npm 包信息
├── README.md                 # 推荐: 插件说明
├── LICENSE                   # 推荐: 许可证
├── .gitignore               # 推荐: Git 忽略文件
│
├── ui/                       # 可选: UI 组件
│   ├── settings.vue         # 配置界面
│   └── panel.vue            # 功能面板
│
├── assets/                  # 可选: 静态资源
│   ├── icon.png            # 插件图标
│   ├── logo.svg            # 其他图片
│   └── styles.css          # 样式文件
│
├── lib/                     # 可选: 库文件
│   └── helper.js           # 辅助函数
│
├── locales/                 # 可选: 国际化
│   ├── en.json
│   └── zh-CN.json
│
└── config.schema.json       # 可选: 配置验证模式
```

### 文件说明

#### 必需文件

- **manifest.json**: 插件的"身份证",定义插件的基本信息和配置
- **index.js**: 主进程入口,实现插件的核心逻辑

#### 推荐文件

- **README.md**: 插件说明文档,帮助用户了解如何使用
- **LICENSE**: 开源许可证,明确使用条款

#### 可选文件

- **renderer.js**: 如果需要在渲染进程执行代码
- **ui/\*.vue**: 如果需要自定义 UI 组件
- **config.schema.json**: 配置的 JSON Schema 验证
- **package.json**: 如果插件有外部依赖

---

## 📋 Manifest 配置详解

`manifest.json` 是插件的配置文件,定义了插件的所有元信息。

### 完整示例

```json
{
  "id": "my-awesome-plugin",
  "name": "My Awesome Plugin",
  "version": "1.2.3",
  "description": "一个很棒的插件,提供XX功能",
  "author": "Your Name <your.email@example.com>",
  "icon": "assets/icon.png",
  "homepage": "https://github.com/username/my-awesome-plugin",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/my-awesome-plugin.git"
  },
  "bugs": {
    "url": "https://github.com/username/my-awesome-plugin/issues"
  },
  "keywords": ["utility", "productivity"],
  "license": "MIT",

  "fingertips": {
    "minVersion": "1.0.0",
    "maxVersion": "2.0.0"
  },

  "main": "index.js",
  "renderer": "renderer.js",

  "permissions": [
    "notification",
    "clipboard",
    "dialog",
    "ai:config",
    "settings:read",
    "fs:read",
    "fs:write"
  ],

  "ui": {
    "hasPanel": false,
    "panelComponent": "ui/panel.vue"
  },

  "config": {
    "schema": "config.schema.json",
    "defaults": {
      "apiKey": "",
      "language": "zh-CN",
      "enabled": true,
      "maxRetries": 3,
      "timeout": 5000
    }
  },

  "lifecycle": {
    "onLoad": true,
    "onActivate": false
  },

  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

### 字段详解

#### 基础信息字段

##### `id` (必需)

- **类型**: `string`
- **说明**: 插件的唯一标识符,全局唯一
- **规范**:
  - 使用 kebab-case 命名 (小写字母和连字符)
  - 只能包含字母、数字、连字符
  - 建议格式: `company-product-name`
- **示例**:
  ```json
  "id": "my-awesome-plugin"
  "id": "acme-translator"
  "id": "github-gist-sync"
  ```

##### `name` (必需)

- **类型**: `string`
- **说明**: 插件的显示名称,显示在插件列表中
- **规范**:
  - 建议不超过 50 个字符
  - 使用用户友好的名称
  - 支持中英文
- **示例**:
  ```json
  "name": "My Awesome Plugin"
  "name": "AI 翻译助手"
  "name": "GitHub Gist 同步"
  ```

##### `version` (必需)

- **类型**: `string`
- **说明**: 插件版本号
- **规范**: 遵循 [Semantic Versioning](https://semver.org/) (语义化版本)
  - 格式: `MAJOR.MINOR.PATCH`
  - MAJOR: 不兼容的 API 变更
  - MINOR: 向下兼容的功能新增
  - PATCH: 向下兼容的问题修正
- **示例**:
  ```json
  "version": "1.0.0"    // 初始版本
  "version": "1.2.3"    // 稳定版本
  "version": "2.0.0"    // 重大更新
  ```

##### `description` (必需)

- **类型**: `string`
- **说明**: 插件的简短描述
- **规范**:
  - 建议 50-200 个字符
  - 清晰描述插件的主要功能
  - 避免过度营销
- **示例**:
  ```json
  "description": "一个快速翻译工具,支持多种语言互译"
  "description": "将剪贴板内容同步到 GitHub Gist"
  ```

##### `author` (可选)

- **类型**: `string`
- **说明**: 插件作者信息
- **格式**:
  - 简单格式: `"Name"`
  - 带邮箱: `"Name <email@example.com>"`
  - 带网站: `"Name <email@example.com> (https://website.com)"`
- **示例**:
  ```json
  "author": "John Doe"
  "author": "John Doe <john@example.com>"
  "author": "John Doe <john@example.com> (https://johndoe.com)"
  ```

##### `icon` (可选)

- **类型**: `string`
- **说明**: 插件图标路径 (相对于插件根目录)
- **规范**:
  - 支持格式: PNG, SVG, JPG
  - 推荐尺寸: 64x64 或 128x128 像素
  - 推荐格式: PNG (带透明背景)
- **示例**:
  ```json
  "icon": "assets/icon.png"
  "icon": "logo.svg"
  ```
- **备用方案**: 如未指定,使用 Iconify 图标名称
  ```json
  "icon": "mdi:puzzle"
  "icon": "ph:lightning-bold"
  ```

##### `homepage` (可选)

- **类型**: `string`
- **说明**: 插件主页 URL
- **示例**:
  ```json
  "homepage": "https://github.com/username/my-plugin"
  ```

##### `repository` (可选)

- **类型**: `object`
- **说明**: 源代码仓库信息
- **示例**:
  ```json
  "repository": {
    "type": "git",
    "url": "https://github.com/username/my-plugin.git"
  }
  ```

##### `bugs` (可选)

- **类型**: `object | string`
- **说明**: 问题反馈地址
- **示例**:
  ```json
  "bugs": {
    "url": "https://github.com/username/my-plugin/issues",
    "email": "support@example.com"
  }
  ```
  或简化格式:
  ```json
  "bugs": "https://github.com/username/my-plugin/issues"
  ```

##### `keywords` (可选)

- **类型**: `string[]`
- **说明**: 插件关键词,用于搜索和分类
- **示例**:
  ```json
  "keywords": ["translator", "language", "AI"]
  "keywords": ["productivity", "clipboard", "sync"]
  ```

##### `license` (可选)

- **类型**: `string`
- **说明**: 开源许可证类型
- **常用值**: `MIT`, `Apache-2.0`, `GPL-3.0`, `BSD-3-Clause`
- **示例**:
  ```json
  "license": "MIT"
  ```

#### Fingertips 特定字段

##### `fingertips` (必需)

- **类型**: `object`
- **说明**: Fingertips AI 版本兼容性

###### `fingertips.minVersion` (必需)

- **类型**: `string`
- **说明**: 最低支持的应用版本
- **示例**:
  ```json
  "fingertips": {
    "minVersion": "1.0.0"
  }
  ```

###### `fingertips.maxVersion` (可选)

- **类型**: `string`
- **说明**: 最高支持的应用版本 (不建议设置,除非有兼容性问题)
- **示例**:
  ```json
  "fingertips": {
    "minVersion": "1.0.0",
    "maxVersion": "2.0.0"
  }
  ```

#### 入口文件字段

##### `main` (必需)

- **类型**: `string`
- **说明**: 主进程入口文件路径 (相对于插件根目录)
- **规范**:
  - 必须是 JavaScript 文件
  - 必须导出符合规范的对象
- **示例**:
  ```json
  "main": "index.js"
  "main": "dist/main.js"
  ```

##### `renderer` (可选)

- **类型**: `string`
- **说明**: 渲染进程入口文件路径
- **使用场景**: 当插件需要在渲染进程中运行代码时
- **示例**:
  ```json
  "renderer": "renderer.js"
  ```

#### 权限字段

##### `permissions` (必需)

- **类型**: `string[]`
- **说明**: 插件需要的权限列表
- **可用权限**:
  - `notification` - 显示系统通知
  - `clipboard` - 访问剪贴板
  - `dialog` - 显示系统对话框
  - `window` - 创建和管理窗口
  - `screenshot` - 调用系统截图工具
  - `ai:config` - 访问 AI 配置
  - `settings:read` - 读取应用设置
  - `settings:write` - 写入应用设置
  - `fs:read` - 读取文件 (受限路径)
  - `fs:write` - 写入文件 (受限路径)
  - `network` - 网络请求 (未来支持)
  - `shell` - 执行 Shell 命令 (未来支持,高风险)
- **示例**:
  ```json
  "permissions": [
    "notification",
    "clipboard",
    "ai:config"
  ]
  ```
- **注意**:
  - 只声明实际需要的权限 (最小权限原则)
  - 权限过多可能影响用户信任

#### UI 字段

##### `ui` (可选)

- **类型**: `object`
- **说明**: UI 组件配置

###### `ui.hasSettings`

- **类型**: `boolean`
- **说明**: 是否有配置界面（已废弃）
- **默认值**: `false`
- **⚠️ 注意**: 此字段已废弃。插件配置现在应该通过插件自己创建的独立窗口或对话框来管理，而不是集成到应用设置页面中。

###### `ui.hasPanel`

- **类型**: `boolean`
- **说明**: 是否有自定义面板
- **默认值**: `false`

###### `ui.settingsComponent`

- **类型**: `string`
- **说明**: 配置界面组件路径（已废弃）
- **⚠️ 注意**: 此字段已废弃。请通过 IPC 通信或创建独立窗口的方式来实现插件配置界面。

###### `ui.panelComponent`

- **类型**: `string`
- **说明**: 自定义面板组件路径
- **要求**: `hasPanel` 为 `true` 时必需

**示例**:

```json
"ui": {
  "hasPanel": false
}
```

#### 配置字段

##### `config` (可选)

- **类型**: `object`
- **说明**: 插件配置相关

###### `config.schema`

- **类型**: `string`
- **说明**: JSON Schema 文件路径,用于验证配置

###### `config.defaults`

- **类型**: `object`
- **说明**: 默认配置值
- **示例**:
  ```json
  "config": {
    "schema": "config.schema.json",
    "defaults": {
      "apiKey": "",
      "language": "zh-CN",
      "maxRetries": 3,
      "timeout": 5000,
      "features": {
        "autoSync": true,
        "notifications": true
      }
    }
  }
  ```

#### 生命周期字段

##### `lifecycle` (可选)

- **类型**: `object`
- **说明**: 插件生命周期配置

###### `lifecycle.onLoad`

- **类型**: `boolean`
- **说明**: 是否在应用启动时加载插件
- **默认值**: `false`
- **使用场景**:
  - 后台服务型插件
  - 需要常驻的插件

###### `lifecycle.onActivate`

- **类型**: `boolean`
- **说明**: 是否在用户首次激活时加载
- **默认值**: `true`

**示例**:

```json
"lifecycle": {
  "onLoad": true,
  "onActivate": false
}
```

#### 依赖字段

##### `dependencies` (可选)

- **类型**: `object`
- **说明**: 插件的 npm 依赖包
- **注意**:
  - 需要在插件目录运行 `npm install`
  - 依赖会增加插件大小
  - 建议使用轻量级的库
- **示例**:
  ```json
  "dependencies": {
    "axios": "^1.6.0",
    "lodash": "^4.17.21",
    "dayjs": "^1.11.10"
  }
  ```

---

## 🔄 插件生命周期

插件在运行过程中会经历不同的生命周期阶段。

### 生命周期流程图

```
应用启动
  ↓
扫描插件 (scan)
  ↓
加载插件 (load)
  ↓
验证插件 (validate)
  ↓
[用户启用插件]
  ↓
激活插件 (activate) ← 你的代码
  ↓
[运行中]
  ↓
[用户执行插件]
  ↓
执行插件 (execute) ← 你的代码
  ↓
[用户停用插件]
  ↓
停用插件 (deactivate) ← 你的代码
  ↓
应用退出
```

### 生命周期钩子

#### 1. activate(context)

**说明**: 插件被激活时调用

**调用时机**:

- 用户首次启用插件
- 应用启动时 (如果插件已启用)
- 插件重新加载后

**参数**:

- `context`: 插件上下文对象

**返回值**:

- `void` 或 `Function` (清理函数)
- 可以是异步函数 (返回 Promise)

**示例**:

```javascript
activate(context) {
  console.log('插件激活:', context.manifest.name)

  // 注册 IPC 处理器
  context.ipc.handle('my-action', async (event, data) => {
    // 处理请求
    return { success: true }
  })

  // 初始化定时器
  const timer = setInterval(() => {
    console.log('定时任务执行')
  }, 60000)

  // 返回清理函数
  return () => {
    clearInterval(timer)
    console.log('清理资源')
  }
}
```

#### 2. deactivate()

**说明**: 插件被停用时调用

**调用时机**:

- 用户手动停用插件
- 应用退出时
- 插件重新加载前

**参数**: 无

**返回值**:

- `void`
- 可以是异步函数

**示例**:

```javascript
deactivate() {
  console.log('插件停用')
  // 清理资源
  // 保存状态
  // 关闭连接
}
```

#### 3. execute(params)

**说明**: 执行插件功能

**调用时机**:

- 用户从插件列表执行插件
- 从 Super Panel 执行插件
- 其他插件调用此插件
- 快捷键触发 (未来支持)

**参数**:

- `params`: 执行参数 (object)
  - `params.text`: 用户选中的文本 (当从 Super Panel 触发时自动传入)
  - 其他自定义参数

**返回值**:

- 任意值
- 可以是异步函数

**示例**:

```javascript
async execute(params) {
  console.log('执行插件,参数:', params)

  try {
    // 🎯 优先使用传入的选中文本
    let inputText = params?.text

    // 如果没有传入选中文本，可以从剪贴板读取作为回退方案
    if (!inputText && context.api.clipboard) {
      inputText = context.api.clipboard.readText()
    }

    // 执行具体逻辑
    const result = await doSomething(inputText)

    // 显示结果
    context.api.notification.show({
      title: '执行成功',
      body: result.message
    })

    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

**关于选中文本 (划词内容)**:

当用户在 Super Panel 中执行插件时，系统会自动将用户选中的文本作为 `params.text` 传入。这样插件可以直接处理用户选中的内容，无需再次捕获或从剪贴板读取。

```javascript
async execute(params) {
  // ✅ 推荐: 优先使用 params.text
  if (params?.text) {
    console.log('用户选中的文本:', params.text)
    // 处理选中的文本
    const result = processText(params.text)
    return { success: true, data: result }
  }

  // 如果没有选中文本，可以提示用户或使用其他输入方式
  context.api.notification.show({
    title: '提示',
    body: '请先选中文本后再执行此操作'
  })

  return { success: false, error: '没有可处理的文本' }
}
```

### 完整示例

```javascript
module.exports = {
  // 激活插件
  activate(context) {
    console.log('=== 插件激活 ===')
    console.log('插件名称:', context.manifest.name)
    console.log('插件目录:', context.pluginDir)

    // 读取配置
    context.config.get('myOption').then((value) => {
      console.log('配置值:', value)
    })

    // 监听配置变化
    context.config.onChange('myOption', (newValue, oldValue) => {
      console.log('配置变化:', oldValue, '=>', newValue)
    })

    // 注册 IPC 处理器
    context.ipc.handle('my-plugin:ping', async () => {
      return { pong: true }
    })

    // 定时任务
    const interval = setInterval(() => {
      console.log('后台任务执行')
    }, 60000)

    // 返回清理函数
    return () => {
      clearInterval(interval)
      console.log('清理资源完成')
    }
  },

  // 停用插件
  deactivate() {
    console.log('=== 插件停用 ===')
  },

  // 执行插件
  async execute(params) {
    console.log('=== 执行插件 ===')
    console.log('参数:', params)

    // 获取 context (需要在 activate 中保存)
    const context = this._context

    // 显示通知
    context.api.notification.show({
      title: '插件执行',
      body: '功能已执行'
    })

    return { success: true, timestamp: Date.now() }
  },

  // 保存 context 的辅助方法
  _context: null
}

// 包装 activate 以保存 context
const original = module.exports.activate
module.exports.activate = function (context) {
  module.exports._context = context
  return original.call(this, context)
}
```

---

## 🎯 插件上下文 (Context)

插件上下文是插件与应用通信的桥梁,包含了所有可用的 API 和信息。

### Context 结构

```typescript
interface PluginContext {
  // 插件清单
  manifest: PluginManifest

  // 插件目录路径
  pluginDir: string

  // API 接口
  api: {
    settings: SettingsAPI // 设置 API
    dialog: DialogAPI // 对话框 API
    notification: NotificationAPI // 通知 API
    clipboard: ClipboardAPI // 剪贴板 API
    fs: FileSystemAPI // 文件系统 API (受限)
    ipc: IPCAPI // IPC 通信 API
    window: WindowAPI // 窗口管理 API
    screenshot: ScreenshotAPI // 截图 API
  }

  // 配置管理
  config: ConfigAPI

  // IPC 通信 (快捷方式)
  ipc: IPCAPI
}
```

### Context 属性

#### manifest

- **类型**: `PluginManifest`
- **说明**: 插件的 manifest.json 内容
- **示例**:
  ```javascript
  console.log('插件ID:', context.manifest.id)
  console.log('插件名称:', context.manifest.name)
  console.log('插件版本:', context.manifest.version)
  console.log('权限列表:', context.manifest.permissions)
  ```

#### pluginDir

- **类型**: `string`
- **说明**: 插件目录的绝对路径
- **用途**:
  - 读取插件内的文件
  - 构建资源路径
- **示例**:
  ```javascript
  const iconPath = path.join(context.pluginDir, 'assets/icon.png')
  const dataFile = path.join(context.pluginDir, 'data.json')
  ```

---

## 🔌 可用 API 详解

### 1. Settings API

访问应用设置和 AI 配置。

#### getAIConfig()

获取 AI 相关配置。

**权限要求**: `ai:config`

**返回值**: `Promise<AIConfig>`

```typescript
interface AIConfig {
  baseUrl: string // AI API 基础 URL
  apiKey: string // AI API 密钥
  models: string[] // 可用模型列表
  defaultModel: string // 默认模型
}
```

**示例**:

```javascript
const aiConfig = await context.api.settings.getAIConfig()
console.log('AI Base URL:', aiConfig.baseUrl)
console.log('API Key:', aiConfig.apiKey ? '已配置' : '未配置')
console.log('可用模型:', aiConfig.models)
console.log('默认模型:', aiConfig.defaultModel)
```

#### getSettings()

获取应用的所有设置。

**权限要求**: `settings:read`

**返回值**: `Promise<AppSettings>`

**示例**:

```javascript
const settings = await context.api.settings.getSettings()
console.log('存储目录:', settings.storageDirectory)
console.log('开机自启:', settings.autoLaunch)
console.log('快捷键:', settings.hotkey)
```

#### getSetting(key)

获取单个设置项。

**权限要求**: `settings:read`

**参数**:

- `key`: 设置键名

**返回值**: `Promise<any>`

**示例**:

```javascript
const hotkey = await context.api.settings.getSetting('hotkey')
console.log('快捷键:', hotkey)
```

### 2. Dialog API

显示系统对话框。

**权限要求**: `dialog`

#### showOpenDialog(options)

显示打开文件对话框。

**参数**:

```typescript
interface OpenDialogOptions {
  title?: string // 对话框标题
  defaultPath?: string // 默认路径
  buttonLabel?: string // 确认按钮文本
  filters?: FileFilter[] // 文件过滤器
  properties?: string[] // 特性选项
}

interface FileFilter {
  name: string // 过滤器名称
  extensions: string[] // 文件扩展名
}
```

**properties 可选值**:

- `openFile` - 允许选择文件
- `openDirectory` - 允许选择目录
- `multiSelections` - 允许多选
- `showHiddenFiles` - 显示隐藏文件

**返回值**: `Promise<string[] | undefined>`

- 返回选中的文件路径数组
- 如果用户取消,返回 `undefined`

**示例**:

```javascript
// 选择单个文件
const files = await context.api.dialog.showOpenDialog({
  title: '选择图片',
  filters: [
    { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  properties: ['openFile']
})

if (files && files.length > 0) {
  console.log('选中的文件:', files[0])
}

// 选择多个文件
const files = await context.api.dialog.showOpenDialog({
  title: '选择文件',
  properties: ['openFile', 'multiSelections']
})

// 选择目录
const dirs = await context.api.dialog.showOpenDialog({
  title: '选择文件夹',
  properties: ['openDirectory']
})
```

#### showSaveDialog(options)

显示保存文件对话框。

**参数**: 类似 `showOpenDialog`

**返回值**: `Promise<string | undefined>`

- 返回保存路径
- 如果用户取消,返回 `undefined`

**示例**:

```javascript
const savePath = await context.api.dialog.showSaveDialog({
  title: '保存文件',
  defaultPath: 'output.txt',
  filters: [
    { name: 'Text Files', extensions: ['txt'] },
    { name: 'All Files', extensions: ['*'] }
  ]
})

if (savePath) {
  // 保存文件到 savePath
  await context.api.fs.writeFile(savePath, data)
}
```

#### showMessageBox(options)

显示消息框。

**参数**:

```typescript
interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning'
  title?: string
  message: string
  detail?: string
  buttons?: string[]
  defaultId?: number
  cancelId?: number
}
```

**返回值**: `Promise<number>`

- 返回用户点击的按钮索引

**示例**:

```javascript
const result = await context.api.dialog.showMessageBox({
  type: 'question',
  title: '确认操作',
  message: '确定要删除这个文件吗?',
  detail: '此操作无法撤销',
  buttons: ['删除', '取消'],
  defaultId: 1,
  cancelId: 1
})

if (result === 0) {
  console.log('用户确认删除')
} else {
  console.log('用户取消操作')
}
```

### 3. Notification API

显示系统通知。

**权限要求**: `notification`

#### show(options)

显示通知。

**参数**:

```typescript
interface NotificationOptions {
  title: string // 通知标题
  body: string // 通知内容
  icon?: string // 图标路径 (可选)
}
```

**返回值**: `void`

**示例**:

```javascript
// 基本通知
context.api.notification.show({
  title: '任务完成',
  body: '文件已成功下载'
})

// 带图标的通知
const iconPath = path.join(context.pluginDir, 'assets/icon.png')
context.api.notification.show({
  title: '新消息',
  body: '您有一条新消息',
  icon: iconPath
})
```

### 4. Clipboard API

访问剪贴板。

**权限要求**: `clipboard`

#### readText()

读取剪贴板文本。

**返回值**: `string`

**示例**:

```javascript
const text = context.api.clipboard.readText()
console.log('剪贴板内容:', text)
```

**⚠️ 关于获取用户选中的文本**:

如果你的插件需要处理用户选中的文本（划词内容），**不应该**依赖 `clipboard.readText()` 方法，因为：

1. 这需要模拟 `Ctrl+C` 操作，会干扰用户的剪贴板
2. 在某些应用中可能无法正常工作
3. 会增加延迟和复杂度

**✅ 正确的做法**是在 `execute()` 方法中通过 `params.text` 参数接收选中的文本：

```javascript
async execute(params) {
  // ✅ 推荐：直接使用传入的选中文本
  const selectedText = params?.text

  if (!selectedText) {
    // 如果没有选中文本，可以从剪贴板读取作为回退方案
    const clipboardText = context.api.clipboard.readText()
    return processText(clipboardText)
  }

  return processText(selectedText)
}
```

当用户从 Super Panel 执行插件时，系统会自动将选中的文本作为 `params.text` 传入，这是**最可靠和高效**的方式。

#### writeText(text)

写入文本到剪贴板。

**参数**:

- `text`: 要写入的文本

**返回值**: `void`

**示例**:

```javascript
context.api.clipboard.writeText('Hello, World!')

// 复杂示例
const data = {
  title: '标题',
  content: '内容'
}
context.api.clipboard.writeText(JSON.stringify(data, null, 2))
```

#### readImage()

读取剪贴板图片。

**返回值**: `NativeImage | undefined`

**示例**:

```javascript
const image = context.api.clipboard.readImage()
if (image && !image.isEmpty()) {
  const buffer = image.toPNG()
  await context.api.fs.writeFile('clipboard.png', buffer)
}
```

### 5. File System API

文件系统操作 (受限路径)。

**权限要求**: `fs:read` (读取), `fs:write` (写入)

**路径限制**:

- 只能访问插件自己的目录
- 只能访问用户数据目录
- 只能访问用户通过对话框选择的文件

#### readFile(path, options)

读取文件。

**参数**:

- `path`: 文件路径
- `options`: 可选配置
  - `encoding`: 文件编码 (如 `'utf-8'`)

**返回值**: `Promise<string | Buffer>`

**示例**:

```javascript
// 读取文本文件
const dataPath = path.join(context.pluginDir, 'data.json')
const content = await context.api.fs.readFile(dataPath, { encoding: 'utf-8' })
const data = JSON.parse(content)

// 读取二进制文件
const buffer = await context.api.fs.readFile(imagePath)
```

#### writeFile(path, data, options)

写入文件。

**参数**:

- `path`: 文件路径
- `data`: 文件内容 (string 或 Buffer)
- `options`: 可选配置
  - `encoding`: 文件编码

**返回值**: `Promise<void>`

**示例**:

```javascript
// 写入文本
const dataPath = path.join(context.pluginDir, 'config.json')
const data = JSON.stringify({ key: 'value' }, null, 2)
await context.api.fs.writeFile(dataPath, data, { encoding: 'utf-8' })

// 写入二进制
await context.api.fs.writeFile(imagePath, buffer)
```

#### exists(path)

检查文件是否存在。

**返回值**: `Promise<boolean>`

**示例**:

```javascript
const configPath = path.join(context.pluginDir, 'config.json')
if (await context.api.fs.exists(configPath)) {
  // 文件存在
  const content = await context.api.fs.readFile(configPath, { encoding: 'utf-8' })
} else {
  // 创建默认配置
  await context.api.fs.writeFile(configPath, JSON.stringify(defaultConfig))
}
```

#### mkdir(path, options)

创建目录。

**参数**:

- `path`: 目录路径
- `options`: 可选配置
  - `recursive`: 是否递归创建父目录

**返回值**: `Promise<void>`

**示例**:

```javascript
const dataDir = path.join(context.pluginDir, 'data/cache')
await context.api.fs.mkdir(dataDir, { recursive: true })
```

#### readdir(path)

读取目录内容。

**返回值**: `Promise<string[]>`

**示例**:

```javascript
const files = await context.api.fs.readdir(context.pluginDir)
console.log('插件目录文件:', files)
```

### 6. IPC API

进程间通信。

#### handle(channel, handler)

注册 IPC 处理器 (主进程)。

**参数**:

- `channel`: 通道名称 (会自动添加插件 ID 前缀)
- `handler`: 处理函数

**示例**:

```javascript
// 主进程 (index.js)
activate(context) {
  context.ipc.handle('getData', async (event, params) => {
    const data = await fetchData(params)
    return { success: true, data }
  })
}

// 渲染进程调用
const result = await window.api.plugin.invoke('my-plugin:getData', { id: 123 })
```

#### send(channel, ...args)

发送 IPC 消息。

**参数**:

- `channel`: 通道名称
- `...args`: 消息参数

**示例**:

```javascript
context.ipc.send('update', { progress: 50 })
```

#### on(channel, listener)

监听 IPC 消息。

**参数**:

- `channel`: 通道名称
- `listener`: 监听函数

**示例**:

```javascript
context.ipc.on('request', (event, data) => {
  console.log('收到请求:', data)
})
```

### 7. Window API

创建和管理自定义窗口。

**权限要求**: `window`

#### create(options)

创建一个新窗口。

**参数**:

```typescript
interface PluginWindowOptions {
  title?: string // 窗口标题
  width?: number // 窗口宽度 (默认 800)
  height?: number // 窗口高度 (默认 600)
  minWidth?: number // 最小宽度
  minHeight?: number // 最小高度
  maxWidth?: number // 最大宽度
  maxHeight?: number // 最大高度
  resizable?: boolean // 是否可调整大小 (默认 true)
  frame?: boolean // 是否显示窗口框架 (默认 true)
  center?: boolean // 是否居中显示 (默认 true)
  alwaysOnTop?: boolean // 是否置顶 (默认 false)
  modal?: boolean // 是否模态窗口 (默认 false)
  html?: string // HTML 文件路径 (相对于插件目录)
  url?: string // 远程 URL (需要 network 权限)
  data?: Record<string, any> // 传递给窗口的数据
}
```

**返回值**: `Promise<PluginWindowInstance>`

**窗口实例方法**:

```typescript
interface PluginWindowInstance {
  id: string // 窗口 ID
  close(): void // 关闭窗口
  focus(): void // 聚焦窗口
  hide(): void // 隐藏窗口
  show(): void // 显示窗口
  minimize(): void // 最小化
  maximize(): void // 最大化
  isVisible(): boolean // 是否可见
  send(channel: string, ...args: any[]): void // 向窗口发送消息
}
```

**示例 1: 创建本地 HTML 窗口**:

```javascript
// index.js
async function openConfigWindow() {
  const window = await pluginContext.api.window.create({
    title: '插件配置',
    width: 600,
    height: 400,
    html: 'ui/config.html', // 相对于插件目录
    data: {
      pluginId: pluginContext.manifest.id,
      config: await pluginContext.config.getAll()
    }
  })

  console.log('窗口已创建:', window.id)

  // 可以控制窗口
  // window.focus()
  // window.close()

  return window
}
```

**ui/config.html**:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>插件配置</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        padding: 20px;
        margin: 0;
      }
      .form-group {
        margin-bottom: 16px;
      }
      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
      }
      input,
      select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-sizing: border-box;
      }
      button {
        padding: 10px 20px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background: #2563eb;
      }
    </style>
  </head>
  <body>
    <h2>插件配置</h2>

    <div class="form-group">
      <label>API 密钥</label>
      <input type="password" id="apiKey" placeholder="请输入 API 密钥" />
    </div>

    <div class="form-group">
      <label>语言</label>
      <select id="language">
        <option value="zh-CN">简体中文</option>
        <option value="en-US">English</option>
      </select>
    </div>

    <button onclick="saveConfig()">保存配置</button>

    <script>
      // 页面加载时自动填充数据
      window.addEventListener('DOMContentLoaded', () => {
        // 从 window.pluginData 获取传入的数据
        if (window.pluginData && window.pluginData.config) {
          const config = window.pluginData.config
          document.getElementById('apiKey').value = config.apiKey || ''
          document.getElementById('language').value = config.language || 'zh-CN'
        }
      })

      async function saveConfig() {
        const config = {
          apiKey: document.getElementById('apiKey').value,
          language: document.getElementById('language').value
        }

        // 通过 IPC 保存配置
        const pluginId = window.pluginData.pluginId
        const result = await window.api.plugin.invoke(`${pluginId}:saveConfig`, config)

        if (result.success) {
          alert('配置已保存')
          window.close()
        } else {
          alert('保存失败: ' + result.error)
        }
      }
    </script>
  </body>
</html>
```

**示例 2: 创建数据展示窗口**:

```javascript
async function showDataWindow(data) {
  const window = await pluginContext.api.window.create({
    title: '数据详情',
    width: 800,
    height: 600,
    html: 'ui/data-view.html',
    data: {
      items: data.items,
      timestamp: Date.now()
    }
  })

  // 5秒后自动关闭
  setTimeout(() => {
    if (window.isVisible()) {
      window.close()
    }
  }, 5000)
}
```

**示例 3: 创建无边框窗口**:

```javascript
const window = await pluginContext.api.window.create({
  title: '快捷面板',
  width: 300,
  height: 200,
  frame: false, // 无边框
  alwaysOnTop: true, // 置顶
  resizable: false, // 不可调整大小
  html: 'ui/quick-panel.html'
})
```

#### get(windowId)

获取已创建的窗口实例。

**参数**:

- `windowId`: 窗口 ID

**返回值**: `PluginWindowInstance | undefined`

**示例**:

```javascript
const window = pluginContext.api.window.get('my-plugin-window-1')
if (window) {
  window.focus()
}
```

#### getAll()

获取插件创建的所有窗口。

**返回值**: `PluginWindowInstance[]`

**示例**:

```javascript
const windows = pluginContext.api.window.getAll()
console.log(`插件共有 ${windows.length} 个窗口`)

windows.forEach((window) => {
  console.log(`窗口 ${window.id} 可见: ${window.isVisible()}`)
})
```

#### closeAll()

关闭插件创建的所有窗口。

**返回值**: `void`

**示例**:

```javascript
// 清理所有窗口
pluginContext.api.window.closeAll()
```

**窗口通信**:

插件可以通过 IPC 与窗口通信：

```javascript
// 主进程 (index.js)
activate(context) {
  // 注册配置保存处理器
  context.ipc.handle('saveConfig', async (event, config) => {
    await context.config.setAll(config)
    return { success: true }
  })

  // 创建窗口
  const window = await context.api.window.create({
    html: 'ui/config.html',
    data: { pluginId: context.manifest.id }
  })

  // 向窗口发送消息
  window.send('update-status', { status: 'ready' })
}
```

**注意事项**:

1. **安全性**: 窗口运行在沙盒环境中，不能直接访问 Node.js API
2. **路径限制**: HTML 文件必须在插件目录内，使用相对路径
3. **远程 URL**: 加载远程 URL 需要额外的 `network` 权限
4. **自动清理**: 插件停用时，所有窗口会自动关闭
5. **数据传递**: 使用 `data` 参数传递初始数据，在窗口中通过 `window.pluginData` 访问
6. **IPC 通信**: 使用插件的 IPC 处理器与窗口通信

### 8. Screenshot API

调用系统截图工具并获取截图结果。

**权限要求**: `screenshot`

#### capture()

调用系统截图工具,允许用户截图。

**返回值**: `Promise<string>`

- 如果用户完成截图,返回图片的 DataURL (base64 编码的 PNG 格式)
- 如果用户取消截图,返回空字符串 `""`

**DataURL 格式**: `data:image/png;base64,iVBORw0KG...`

**示例**:

```javascript
// 基础用法
async function takeScreenshot() {
  const dataURL = await context.api.screenshot.capture()

  if (dataURL) {
    console.log('截图成功!')
    // dataURL 可以直接用于 <img> 标签
    // 或保存为文件
  } else {
    console.log('用户取消了截图')
  }
}
```

**保存截图到文件**:

```javascript
async function saveScreenshot() {
  try {
    // 调用截图 API
    const dataURL = await context.api.screenshot.capture()

    if (!dataURL) {
      context.api.notification.show({
        title: '截图',
        body: '已取消截图'
      })
      return
    }

    // 转换 DataURL 为 Buffer
    const base64Data = dataURL.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `screenshot_${timestamp}.png`
    const filePath = path.join(context.pluginDir, filename)

    // 保存文件
    await context.api.fs.writeFile(filePath, buffer)

    // 显示成功通知
    context.api.notification.show({
      title: '截图成功',
      body: `截图已保存到: ${filename}`
    })

    return filePath
  } catch (error) {
    console.error('截图失败:', error)
    context.api.notification.show({
      title: '截图失败',
      body: error.message
    })
  }
}
```

**在插件窗口中显示截图**:

```javascript
// index.js
async function showScreenshotPreview() {
  // 创建预览窗口
  const window = await context.api.window.create({
    title: '截图预览',
    width: 800,
    height: 600,
    html: 'ui/preview.html'
  })

  // 执行截图
  context.api.notification.show({
    title: '截图',
    body: '请选择要截图的区域...'
  })

  const dataURL = await context.api.screenshot.capture()

  if (dataURL) {
    // 发送截图数据到窗口
    window.send('screenshot-data', { dataURL })
  } else {
    window.close()
  }
}
```

**ui/preview.html**:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>截图预览</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #f0f0f0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .preview {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        max-width: 90%;
      }
      img {
        max-width: 100%;
        height: auto;
        display: block;
      }
      .actions {
        margin-top: 20px;
        display: flex;
        gap: 10px;
      }
      button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      }
      .btn-primary {
        background: #3b82f6;
        color: white;
      }
      .btn-secondary {
        background: #e0e0e0;
        color: #666;
      }
    </style>
  </head>
  <body>
    <div class="preview">
      <img id="screenshot" alt="截图预览" />
      <div class="actions">
        <button class="btn-primary" onclick="saveImage()">保存</button>
        <button class="btn-secondary" onclick="window.close()">关闭</button>
      </div>
    </div>

    <script>
      let currentDataURL = ''

      // 监听截图数据
      window.api.on('screenshot-data', (data) => {
        currentDataURL = data.dataURL
        document.getElementById('screenshot').src = currentDataURL
      })

      // 保存图片
      async function saveImage() {
        // 触发下载
        const a = document.createElement('a')
        a.href = currentDataURL
        a.download = `screenshot_${Date.now()}.png`
        a.click()
      }
    </script>
  </body>
</html>
```

**错误处理**:

```javascript
try {
  const dataURL = await context.api.screenshot.capture()

  if (!dataURL) {
    console.log('用户取消了截图')
    return { success: false, cancelled: true }
  }

  // 处理截图数据
  return { success: true, dataURL }
} catch (error) {
  if (error.message.includes('permission')) {
    console.error('缺少截图权限,请在 manifest.json 中添加 screenshot 权限')
    context.api.notification.show({
      title: '权限不足',
      body: '此功能需要截图权限'
    })
  } else {
    console.error('截图失败:', error)
  }
  return { success: false, error: error.message }
}
```

**注意事项**:

1. **平台支持**: 目前仅支持 Windows 平台 (使用 ScreenCapture.exe)
2. **用户交互**: 截图过程需要用户选择区域,可能被取消
3. **数据格式**: 返回的是 PNG 格式的 DataURL,以 `data:image/png;base64,` 开头
4. **文件保存**: 如需保存文件,还需要 `fs:write` 权限
5. **异步操作**: `capture()` 是异步方法,必须使用 `await` 或 `.then()`
6. **内存占用**: DataURL 字符串可能很大,注意及时处理和释放

**完整示例插件**:

参考 `plugins/screenshot-viewer/` 插件,它展示了截图功能的完整用法。

### 9. Config API

插件配置管理。

#### get(key)

获取配置值。

**参数**:

- `key`: 配置键名

**返回值**: `Promise<any>`

**示例**:

```javascript
const apiKey = await context.config.get('apiKey')
const language = await context.config.get('language')
```

#### set(key, value)

设置配置值。

**参数**:

- `key`: 配置键名
- `value`: 配置值

**返回值**: `Promise<void>`

**示例**:

```javascript
await context.config.set('apiKey', 'new-api-key')
await context.config.set('language', 'en-US')
```

#### getAll()

获取所有配置。

**返回值**: `Promise<object>`

**示例**:

```javascript
const config = await context.config.getAll()
console.log('所有配置:', config)
```

#### setAll(config)

设置所有配置。

**参数**:

- `config`: 配置对象

**返回值**: `Promise<void>`

**示例**:

```javascript
await context.config.setAll({
  apiKey: 'xxx',
  language: 'zh-CN',
  enabled: true
})
```

#### onChange(key, callback)

监听配置变化。

**参数**:

- `key`: 配置键名
- `callback`: 回调函数 `(newValue, oldValue) => void`

**返回值**: `void`

**示例**:

```javascript
context.config.onChange('language', (newValue, oldValue) => {
  console.log(`语言变化: ${oldValue} => ${newValue}`)
  // 重新加载语言资源
  loadLanguage(newValue)
})
```

---

## 🔐 权限系统

插件系统采用声明式权限模型,确保安全性。

### 权限列表

| 权限             | 说明            | 风险等级 | 用途示例             |
| ---------------- | --------------- | -------- | -------------------- |
| `notification`   | 显示系统通知    | 低       | 任务完成提醒         |
| `clipboard`      | 访问剪贴板      | 中       | 剪贴板历史、文本处理 |
| `dialog`         | 显示系统对话框  | 低       | 文件选择、用户确认   |
| `window`         | 创建和管理窗口  | 中       | 自定义界面、配置面板 |
| `screenshot`     | 调用截图工具    | 中       | 截图功能、图片处理   |
| `ai:config`      | 访问 AI 配置    | 中       | AI 功能扩展          |
| `settings:read`  | 读取应用设置    | 低       | 读取配置信息         |
| `settings:write` | 写入应用设置    | 中       | 修改应用配置         |
| `fs:read`        | 读取文件 (受限) | 中       | 读取插件数据         |
| `fs:write`       | 写入文件 (受限) | 中       | 保存插件数据         |
| `network`        | 网络请求        | 高       | API 调用 (未来)      |
| `shell`          | 执行命令        | 高       | 系统操作 (未来)      |

### 权限使用原则

1. **最小权限原则**: 只申请必需的权限
2. **明确说明**: 在文档中说明权限用途
3. **用户信任**: 过多权限会降低用户信任度

### 权限错误处理

```javascript
try {
  // 尝试使用需要权限的 API
  const text = context.api.clipboard.readText()
} catch (error) {
  if (error.message.includes('permission')) {
    console.error('缺少权限:', error.message)
    // 提示用户
    context.api.notification.show({
      title: '权限不足',
      body: '此功能需要剪贴板权限,请在 manifest.json 中添加'
    })
  }
}
```

---

## ⚙️ 配置管理

插件可以有自己的配置项,存储用户设置和运行时数据。

**重要说明**: 插件配置界面应该由插件自己创建和管理（通过对话框或独立窗口），而不是集成到应用的设置页面中。这样可以让插件有更大的灵活性来设计自己的配置界面。详见 [开发带窗口的插件 - 方案 4](#方案-4-创建插件配置窗口) 部分。

### 定义默认配置

在 `manifest.json` 中定义:

```json
{
  "config": {
    "defaults": {
      "apiKey": "",
      "language": "zh-CN",
      "maxRetries": 3,
      "timeout": 5000,
      "features": {
        "autoSync": true,
        "notifications": true
      }
    }
  }
}
```

### 读取配置

```javascript
// 读取单个配置
const apiKey = await context.config.get('apiKey')

// 读取嵌套配置
const autoSync = await context.config.get('features.autoSync')

// 读取所有配置
const config = await context.config.getAll()
```

### 写入配置

```javascript
// 写入单个配置
await context.config.set('apiKey', 'new-key')

// 写入嵌套配置
await context.config.set('features.autoSync', false)

// 写入多个配置
await context.config.setAll({
  apiKey: 'new-key',
  language: 'en-US'
})
```

### 监听配置变化

```javascript
activate(context) {
  // 监听语言变化
  context.config.onChange('language', (newValue, oldValue) => {
    console.log(`语言变化: ${oldValue} => ${newValue}`)
    this.loadLanguage(newValue)
  })

  // 监听功能开关
  context.config.onChange('features.autoSync', (enabled) => {
    if (enabled) {
      this.startSync()
    } else {
      this.stopSync()
    }
  })
}
```

### 配置验证 (JSON Schema)

创建 `config.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "apiKey": {
      "type": "string",
      "description": "API 密钥",
      "minLength": 1
    },
    "language": {
      "type": "string",
      "enum": ["zh-CN", "en-US"],
      "description": "界面语言"
    },
    "maxRetries": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10,
      "description": "最大重试次数"
    },
    "timeout": {
      "type": "integer",
      "minimum": 1000,
      "maximum": 60000,
      "description": "超时时间(毫秒)"
    }
  },
  "required": ["apiKey"]
}
```

在 manifest.json 中引用:

```json
{
  "config": {
    "schema": "config.schema.json",
    "defaults": { ... }
  }
}
```

---

## 🪟 开发带窗口的插件

插件可以创建自定义窗口或面板来显示 UI。

### 方案 1: 使用系统对话框

最简单的方案,适合简单的交互。

```javascript
async execute(params) {
  // 显示信息框
  await context.api.dialog.showMessageBox({
    type: 'info',
    title: '插件信息',
    message: '这是一个简单的消息框',
    detail: '可以显示详细信息'
  })

  // 显示确认框
  const result = await context.api.dialog.showMessageBox({
    type: 'question',
    title: '确认操作',
    message: '确定要继续吗?',
    buttons: ['确定', '取消']
  })

  if (result === 0) {
    // 用户点击确定
  }
}
```

### 方案 2: 创建独立窗口

创建完全自定义的窗口。插件现在可以使用 Window API 创建自己的窗口。

**manifest.json**:

```json
{
  "permissions": ["window", "dialog"]
}
```

**index.js**:

```javascript
let pluginContext = null
let configWindow = null

module.exports = {
  activate(context) {
    pluginContext = context

    // 注册保存配置的处理器
    context.ipc.handle('saveConfig', async (event, config) => {
      await context.config.setAll(config)
      return { success: true }
    })
  },

  deactivate() {
    // 关闭窗口
    if (configWindow) {
      configWindow.close()
      configWindow = null
    }
    pluginContext = null
  },

  async execute(params) {
    // 检查配置
    const config = await pluginContext.config.getAll()

    if (!config.apiKey) {
      // 提示用户配置
      const choice = await pluginContext.api.dialog.showMessageBox({
        type: 'question',
        title: '需要配置',
        message: '请先配置 API 密钥',
        buttons: ['立即配置', '取消']
      })

      if (choice === 0) {
        await openConfigWindow()
      }

      return { success: false, error: '未配置' }
    }

    // 执行功能
    return { success: true }
  }
}

async function openConfigWindow() {
  // 如果窗口已存在，聚焦它
  if (configWindow && configWindow.isVisible()) {
    configWindow.focus()
    return
  }

  // 创建配置窗口
  configWindow = await pluginContext.api.window.create({
    title: '插件配置',
    width: 600,
    height: 400,
    resizable: false,
    html: 'ui/config.html',
    data: {
      pluginId: pluginContext.manifest.id,
      config: await pluginContext.config.getAll()
    }
  })

  console.log('配置窗口已打开')
}
```

**ui/config.html**:

完整的 HTML 配置界面（参考 Window API 示例）

### 方案 3: 使用通知展示信息

适合简单的结果展示。

```javascript
async execute(params) {
  try {
    const result = await doSomething(params)

    // 显示成功通知
    context.api.notification.show({
      title: '操作成功',
      body: `已处理 ${result.count} 个项目`
    })
  } catch (error) {
    // 显示错误通知
    context.api.notification.show({
      title: '操作失败',
      body: error.message
    })
  }
}
```

### 方案 4: 创建插件配置窗口

插件应该通过自己的独立窗口或对话框来管理配置，而不是集成到应用设置页面中。这样可以让插件有更大的灵活性和自主权。

#### 方案 4.1: 使用简单对话框

适合简单的配置场景。

**manifest.json**:

```json
{
  "permissions": ["dialog", "notification"]
}
```

**index.js**:

```javascript
let pluginContext = null

module.exports = {
  activate(context) {
    pluginContext = context

    // 注册配置处理器
    context.ipc.handle('openSettings', async () => {
      return await openSettingsDialog()
    })
  },

  deactivate() {
    pluginContext = null
  },

  async execute(params) {
    // 如果需要配置，先打开配置对话框
    const config = await pluginContext.config.getAll()

    if (!config.apiKey) {
      const result = await pluginContext.api.dialog.showMessageBox({
        type: 'question',
        title: '需要配置',
        message: '请先配置 API 密钥',
        detail: '您需要在插件配置中设置 API 密钥才能使用此功能',
        buttons: ['打开配置', '取消']
      })

      if (result === 0) {
        await openSettingsDialog()
      }

      return { success: false, error: '未配置' }
    }

    // 执行插件功能
    return { success: true }
  }
}

// 打开配置对话框
async function openSettingsDialog() {
  const config = await pluginContext.config.getAll()

  // 简单示例：使用系统对话框收集配置
  // 实际应用中，你可能需要创建一个 HTML 窗口或使用第三方 UI 库
  const result = await pluginContext.api.dialog.showMessageBox({
    type: 'info',
    title: '插件配置',
    message: '配置功能开发中...',
    detail: '未来版本将支持完整的配置窗口',
    buttons: ['确定']
  })

  return { success: true }
}
```

#### 方案 4.2: 使用 Window API 创建配置窗口（完整示例）

使用 Window API 创建一个功能完整的配置窗口。

**插件目录结构**:

```
my-plugin/
├── manifest.json
├── index.js
└── ui/
    └── config.html
```

**manifest.json**:

```json
{
  "id": "my-plugin",
  "name": "示例插件",
  "version": "1.0.0",
  "description": "带配置窗口的示例插件",
  "keywords": ["示例", "窗口"],
  "fingertips": {
    "minVersion": "1.0.0"
  },
  "main": "index.js",
  "permissions": ["window", "notification"],
  "config": {
    "defaults": {
      "apiKey": "",
      "language": "zh-CN",
      "enabled": true
    }
  }
}
```

**index.js**:

```javascript
let pluginContext = null
let configWindow = null

module.exports = {
  activate(context) {
    pluginContext = context
    console.log('插件已激活')

    // 注册保存配置的 IPC 处理器
    context.ipc.handle('saveConfig', async (event, newConfig) => {
      try {
        await context.config.setAll(newConfig)

        // 通知配置已保存
        context.api.notification.show({
          title: '配置已保存',
          body: '插件配置已成功更新'
        })

        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    // 注册获取配置的处理器
    context.ipc.handle('getConfig', async () => {
      const config = await context.config.getAll()
      return { success: true, data: config }
    })
  },

  deactivate() {
    // 清理：关闭配置窗口
    if (configWindow) {
      configWindow.close()
      configWindow = null
    }
    pluginContext = null
  },

  async execute(params) {
    // 获取配置
    const config = await pluginContext.config.getAll()

    // 检查必需配置
    if (!config.apiKey) {
      // 打开配置窗口
      await openConfigWindow()
      return { success: false, error: '需要配置 API 密钥' }
    }

    // 执行插件功能
    pluginContext.api.notification.show({
      title: '插件执行',
      body: '功能已执行'
    })

    return { success: true }
  }
}

// 打开配置窗口
async function openConfigWindow() {
  try {
    // 如果窗口已存在且可见，聚焦它
    if (configWindow && configWindow.isVisible()) {
      configWindow.focus()
      return
    }

    // 创建新的配置窗口
    configWindow = await pluginContext.api.window.create({
      title: `${pluginContext.manifest.name} - 配置`,
      width: 600,
      height: 500,
      minWidth: 500,
      minHeight: 400,
      center: true,
      resizable: true,
      html: 'ui/config.html',
      data: {
        pluginId: pluginContext.manifest.id,
        pluginName: pluginContext.manifest.name,
        config: await pluginContext.config.getAll()
      }
    })

    console.log('配置窗口已创建:', configWindow.id)
  } catch (error) {
    console.error('创建配置窗口失败:', error)
    pluginContext.api.notification.show({
      title: '错误',
      body: `无法打开配置窗口: ${error.message}`
    })
  }
}
```

**ui/config.html**:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>插件配置</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        background: #f5f5f5;
        padding: 20px;
        color: #333;
      }

      .container {
        max-width: 600px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .header {
        padding: 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .header h1 {
        font-size: 24px;
        margin-bottom: 8px;
      }

      .header p {
        opacity: 0.9;
        font-size: 14px;
      }

      .content {
        padding: 24px;
      }

      .form-group {
        margin-bottom: 20px;
      }

      .form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #555;
      }

      .form-group input,
      .form-group select {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.3s;
      }

      .form-group input:focus,
      .form-group select:focus {
        outline: none;
        border-color: #667eea;
      }

      .form-group .hint {
        font-size: 12px;
        color: #999;
        margin-top: 4px;
      }

      .checkbox-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .checkbox-group input[type='checkbox'] {
        width: auto;
        cursor: pointer;
      }

      .footer {
        padding: 16px 24px;
        background: #f9f9f9;
        border-top: 1px solid #e0e0e0;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      button {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      }

      .btn-primary {
        background: #667eea;
        color: white;
      }

      .btn-primary:hover {
        background: #5568d3;
        transform: translateY(-1px);
      }

      .btn-secondary {
        background: #e0e0e0;
        color: #666;
      }

      .btn-secondary:hover {
        background: #d0d0d0;
      }

      .status {
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: none;
      }

      .status.success {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
      }

      .status.error {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 id="pluginName">插件配置</h1>
        <p>配置插件参数和选项</p>
      </div>

      <div class="content">
        <div id="status" class="status"></div>

        <div class="form-group">
          <label for="apiKey">API 密钥 *</label>
          <input type="password" id="apiKey" placeholder="请输入您的 API 密钥" required />
          <div class="hint">用于访问外部服务的认证密钥</div>
        </div>

        <div class="form-group">
          <label for="language">界面语言</label>
          <select id="language">
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
        </div>

        <div class="form-group">
          <div class="checkbox-group">
            <input type="checkbox" id="enabled" />
            <label for="enabled" style="margin: 0">启用插件功能</label>
          </div>
          <div class="hint">取消选中将禁用插件的自动功能</div>
        </div>
      </div>

      <div class="footer">
        <button class="btn-secondary" onclick="resetConfig()">重置</button>
        <button class="btn-primary" onclick="saveConfig()">保存配置</button>
      </div>
    </div>

    <script>
      let pluginId = ''
      let originalConfig = {}

      // 页面加载时初始化
      window.addEventListener('DOMContentLoaded', async () => {
        try {
          // 获取传入的数据
          if (window.pluginData) {
            pluginId = window.pluginData.pluginId
            document.getElementById('pluginName').textContent =
              window.pluginData.pluginName || '插件配置'

            // 加载配置
            if (window.pluginData.config) {
              originalConfig = window.pluginData.config
              loadConfigToForm(originalConfig)
            }
          } else {
            // 如果没有预加载数据，通过 IPC 获取
            pluginId = window.pluginId || 'my-plugin'
            const result = await window.api.plugin.invoke(`${pluginId}:getConfig`)
            if (result.success) {
              originalConfig = result.data
              loadConfigToForm(originalConfig)
            }
          }
        } catch (error) {
          console.error('初始化配置失败:', error)
          showStatus('error', '加载配置失败: ' + error.message)
        }
      })

      // 将配置加载到表单
      function loadConfigToForm(config) {
        document.getElementById('apiKey').value = config.apiKey || ''
        document.getElementById('language').value = config.language || 'zh-CN'
        document.getElementById('enabled').checked = config.enabled !== false
      }

      // 从表单获取配置
      function getConfigFromForm() {
        return {
          apiKey: document.getElementById('apiKey').value,
          language: document.getElementById('language').value,
          enabled: document.getElementById('enabled').checked
        }
      }

      // 保存配置
      async function saveConfig() {
        try {
          const newConfig = getConfigFromForm()

          // 验证
          if (!newConfig.apiKey) {
            showStatus('error', 'API 密钥不能为空')
            return
          }

          // 通过 IPC 保存
          const result = await window.api.plugin.invoke(`${pluginId}:saveConfig`, newConfig)

          if (result.success) {
            showStatus('success', '配置已成功保存')
            originalConfig = newConfig

            // 2秒后关闭窗口
            setTimeout(() => {
              window.close()
            }, 2000)
          } else {
            showStatus('error', '保存失败: ' + result.error)
          }
        } catch (error) {
          console.error('保存配置失败:', error)
          showStatus('error', '保存失败: ' + error.message)
        }
      }

      // 重置配置
      function resetConfig() {
        loadConfigToForm(originalConfig)
        showStatus('success', '已恢复到之前保存的配置')
      }

      // 显示状态消息
      function showStatus(type, message) {
        const statusEl = document.getElementById('status')
        statusEl.className = `status ${type}`
        statusEl.textContent = message
        statusEl.style.display = 'block'

        // 3秒后自动隐藏
        setTimeout(() => {
          statusEl.style.display = 'none'
        }, 3000)
      }
    </script>
  </body>
</html>
```

#### 推荐做法

1. **简单配置**: 使用系统对话框（`dialog.showMessageBox`）
2. **复杂配置**: 使用 Window API 创建 HTML 配置界面
3. **配置入口**: 在 `execute()` 中检查配置，未配置时打开配置窗口
4. **数据传递**: 通过 `data` 参数传递初始配置，窗口中通过 `window.pluginData` 访问
5. **IPC 通信**: 使用 `context.ipc.handle()` 注册保存配置的处理器
6. **窗口管理**: 保存窗口实例引用，避免重复创建
7. **自动清理**: 在 `deactivate()` 中关闭窗口
8. **用户体验**: 保存成功后自动关闭窗口，或提供关闭按钮

---

## ⚡ 使用 Vue 3 开发插件界面

插件窗口可以使用 Vue 3 框架来开发现代化的用户界面，无需复杂的构建步骤。

### 为什么使用 Vue 3？

- ✅ **响应式数据** - 自动更新界面
- ✅ **组件化** - 代码组织清晰
- ✅ **开发简单** - 通过 CDN 引入即可，无需构建
- ✅ **功能强大** - 完整的 Vue 3 特性支持
- ✅ **生态丰富** - 可集成各种 UI 库和组件

### 快速开始

#### 1. 基础模板

在插件窗口的 HTML 中引入 Vue 3：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>插件配置</title>
  </head>
  <body>
    <div id="app">
      <h1>{{ title }}</h1>
      <p>{{ message }}</p>
      <button @click="counter++">点击: {{ counter }}</button>
    </div>

    <!-- 引入 Vue 3 -->
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>

    <script>
      const { createApp, ref } = Vue

      createApp({
        setup() {
          const title = ref('插件配置')
          const message = ref('欢迎使用 Vue 3')
          const counter = ref(0)

          return {
            title,
            message,
            counter
          }
        }
      }).mount('#app')
    </script>
  </body>
</html>
```

#### 2. 完整示例

**manifest.json**:

```json
{
  "id": "vue-demo",
  "name": "Vue 演示插件",
  "version": "1.0.0",
  "permissions": ["window", "notification"],
  "main": "index.js"
}
```

**index.js**:

```javascript
let pluginContext = null
let configWindow = null

module.exports = {
  activate(context) {
    pluginContext = context

    // 注册 IPC 处理器
    context.ipc.handle('saveConfig', async (event, config) => {
      await context.config.setAll(config)
      context.api.notification.show({
        title: '配置已保存',
        body: '设置已成功更新'
      })
      return { success: true }
    })

    context.ipc.handle('getConfig', async () => {
      const config = await context.config.getAll()
      return { success: true, data: config }
    })
  },

  deactivate() {
    if (configWindow) {
      configWindow.close()
      configWindow = null
    }
    pluginContext = null
  },

  async execute(params) {
    await openConfigWindow()
    return { success: true }
  }
}

async function openConfigWindow() {
  if (configWindow && configWindow.isVisible()) {
    configWindow.focus()
    return
  }

  configWindow = await pluginContext.api.window.create({
    title: 'Vue 配置',
    width: 800,
    height: 600,
    html: 'ui/config.html',
    data: {
      pluginId: pluginContext.manifest.id,
      config: await pluginContext.config.getAll()
    }
  })
}
```

**ui/config.html**:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>配置</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
      }

      #app {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 700px;
        margin: 0 auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }

      .form-group {
        margin-bottom: 20px;
      }

      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #333;
      }

      input,
      select {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #e0e0e0;
        border-radius: 6px;
        font-size: 14px;
      }

      input:focus,
      select:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      }

      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      .btn-secondary {
        background: #e0e0e0;
        color: #666;
        margin-right: 10px;
      }

      .alert {
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 20px;
      }

      .alert.success {
        background: #d4edda;
        color: #155724;
      }

      .alert.error {
        background: #f8d7da;
        color: #721c24;
      }

      .footer {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
      }
    </style>
  </head>
  <body>
    <div id="app">
      <h1>{{ pluginName }}</h1>

      <!-- 状态提示 -->
      <div v-if="statusMessage" :class="['alert', statusType]">{{ statusMessage }}</div>

      <!-- 配置表单 -->
      <div class="form-group">
        <label>主题</label>
        <select v-model="config.theme">
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="auto">自动</option>
        </select>
      </div>

      <div class="form-group">
        <label>语言</label>
        <select v-model="config.language">
          <option value="zh-CN">简体中文</option>
          <option value="en-US">English</option>
        </select>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" v-model="config.notifications" />
          启用通知
        </label>
      </div>

      <!-- 底部操作 -->
      <div class="footer">
        <div>
          <span v-if="configChanged" style="color: #ff9800">配置已修改</span>
          <span v-else style="color: #4caf50">配置已保存</span>
        </div>
        <div>
          <button class="btn-secondary" @click="resetConfig">重置</button>
          <button class="btn-primary" @click="saveConfig" :disabled="!configChanged">保存</button>
        </div>
      </div>
    </div>

    <!-- 引入 Vue 3 -->
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>

    <script>
      const { createApp, ref, reactive, computed, onMounted } = Vue

      createApp({
        setup() {
          // 状态
          const pluginId = ref('')
          const pluginName = ref('插件配置')
          const config = reactive({
            theme: 'light',
            language: 'zh-CN',
            notifications: true
          })
          const originalConfig = ref(null)
          const statusMessage = ref('')
          const statusType = ref('success')

          // 计算属性
          const configChanged = computed(() => {
            if (!originalConfig.value) return false
            return JSON.stringify(config) !== JSON.stringify(originalConfig.value)
          })

          // 生命周期
          onMounted(async () => {
            // 加载初始数据
            if (window.pluginData) {
              pluginId.value = window.pluginData.pluginId
              pluginName.value = window.pluginData.pluginName || '插件配置'

              if (window.pluginData.config) {
                Object.assign(config, window.pluginData.config)
                originalConfig.value = JSON.parse(JSON.stringify(config))
              }
            }
          })

          // 方法
          async function saveConfig() {
            try {
              const result = await window.api.plugin.invoke(
                `${pluginId.value}:saveConfig`,
                JSON.parse(JSON.stringify(config))
              )

              if (result.success) {
                originalConfig.value = JSON.parse(JSON.stringify(config))
                showStatus('success', '配置已保存！')
              } else {
                showStatus('error', '保存失败: ' + result.error)
              }
            } catch (error) {
              showStatus('error', '保存失败: ' + error.message)
            }
          }

          function resetConfig() {
            if (originalConfig.value) {
              Object.assign(config, originalConfig.value)
              showStatus('success', '已恢复配置')
            }
          }

          function showStatus(type, message) {
            statusType.value = type
            statusMessage.value = message
            setTimeout(() => {
              statusMessage.value = ''
            }, 3000)
          }

          return {
            pluginName,
            config,
            configChanged,
            statusMessage,
            statusType,
            saveConfig,
            resetConfig
          }
        }
      }).mount('#app')
    </script>
  </body>
</html>
```

### Vue 3 核心概念

#### 响应式数据

```javascript
// ref - 用于基本类型
const count = ref(0)
count.value++ // 需要 .value

// reactive - 用于对象
const state = reactive({
  name: 'Vue',
  age: 3
})
state.name = 'Vue 3' // 直接访问
```

#### 计算属性

```javascript
const doubled = computed(() => count.value * 2)
// doubled 会自动随 count 更新
```

#### 监听器

```javascript
// 监听单个数据
watch(count, (newValue, oldValue) => {
  console.log(`从 ${oldValue} 变为 ${newValue}`)
})

// 监听对象（深度监听）
watch(
  config,
  (newConfig) => {
    console.log('配置已更新:', newConfig)
  },
  { deep: true }
)
```

#### 模板语法

```html
<!-- 文本插值 -->
<div>{{ message }}</div>

<!-- 属性绑定 -->
<button :disabled="loading">按钮</button>

<!-- 事件监听 -->
<button @click="handleClick">点击</button>

<!-- 条件渲染 -->
<div v-if="show">显示</div>
<div v-else>隐藏</div>

<!-- 列表渲染 -->
<div v-for="item in items" :key="item.id">{{ item.name }}</div>

<!-- 双向绑定 -->
<input v-model="message" />
```

### 高级特性

#### 1. 组件定义

```javascript
createApp({
  components: {
    'my-button': {
      props: ['label'],
      template: '<button @click="$emit(\'click\')">{{ label }}</button>'
    }
  },
  setup() {
    // ...
  }
}).mount('#app')
```

使用：

```html
<my-button label="保存" @click="saveConfig"></my-button>
```

#### 2. 生命周期钩子

```javascript
import { onMounted, onUnmounted } from 'vue'

setup() {
  onMounted(() => {
    console.log('组件已挂载')
    // 初始化逻辑
  })

  onUnmounted(() => {
    console.log('组件即将卸载')
    // 清理逻辑
  })
}
```

#### 3. 与主进程通信

```javascript
// 发送请求
async function doAction() {
  try {
    const result = await window.api.plugin.invoke('pluginId:action', data)
    if (result.success) {
      // 处理成功
    }
  } catch (error) {
    // 处理错误
  }
}
```

#### 4. 集成 UI 库

可以引入其他 UI 组件库：

```html
<!-- Element Plus -->
<link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css" />
<script src="https://unpkg.com/element-plus"></script>

<!-- Ant Design Vue -->
<link rel="stylesheet" href="https://unpkg.com/ant-design-vue@3/dist/antd.min.css" />
<script src="https://unpkg.com/ant-design-vue@3/dist/antd.min.js"></script>
```

### 最佳实践

#### 1. 代码组织

```javascript
createApp({
  setup() {
    // 1. 状态定义
    const state = reactive({ ... })

    // 2. 计算属性
    const computed1 = computed(() => { ... })

    // 3. 监听器
    watch(state, () => { ... })

    // 4. 生命周期
    onMounted(() => { ... })

    // 5. 方法定义
    function method1() { ... }

    // 6. 返回暴露
    return { state, computed1, method1 }
  }
}).mount('#app')
```

#### 2. 错误处理

```javascript
async function saveConfig() {
  loading.value = true
  try {
    const result = await window.api.plugin.invoke('saveConfig', config)
    if (result.success) {
      showSuccess('保存成功')
    } else {
      showError('保存失败: ' + result.error)
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    showError('保存失败: ' + error.message)
  } finally {
    loading.value = false
  }
}
```

#### 3. 数据验证

```javascript
const formValid = computed(() => {
  return (
    config.apiKey.trim() !== '' &&
    config.language !== '' &&
    config.itemsPerPage >= 5 &&
    config.itemsPerPage <= 100
  )
})
```

```html
<button :disabled="!formValid" @click="saveConfig">保存</button>
```

#### 4. 本地化 Vue 文件

如果需要离线使用，下载 Vue.js 到插件目录：

```
vue-plugin/
├── lib/
│   └── vue.global.js
└── ui/
    └── config.html
```

```html
<script src="../lib/vue.global.js"></script>
```

### 示例插件

查看完整的示例插件：`plugins/vue-plugin-demo/`

该示例展示了：

- ✅ 完整的配置界面
- ✅ 数据仪表盘
- ✅ 标签页切换
- ✅ 表单验证
- ✅ IPC 通信
- ✅ 响应式数据
- ✅ 计算属性和监听器
- ✅ 动画效果

### 学习资源

- [Vue 3 官方文档](https://cn.vuejs.org/)
- [Vue 3 组合式 API](https://cn.vuejs.org/guide/extras/composition-api-faq.html)
- [Vue 3 响应式基础](https://cn.vuejs.org/guide/essentials/reactivity-fundamentals.html)

### 常见问题

**Q: 为什么使用 CDN 而不是构建工具？**

A: CDN 方式简单快速，适合大多数插件场景。如果需要更复杂的功能，可以自行设置构建流程。

**Q: 可以使用 TypeScript 吗？**

A: 在不引入构建工具的情况下不推荐，但可以使用 JSDoc 注释获得类型提示。

**Q: 可以使用单文件组件 (.vue) 吗？**

A: 需要构建步骤。可以设置 Vite/Webpack 构建，输出到插件目录。

**Q: 性能如何？**

A: Vue 3 性能优秀，CDN 版本已优化，浏览器会缓存，适合大多数场景。

---

## 🐛 调试技巧

### 1. 使用 console.log

最基本的调试方法。

```javascript
activate(context) {
  console.log('=== 插件激活 ===')
  console.log('插件信息:', context.manifest)
  console.log('插件目录:', context.pluginDir)

  // 调试配置
  context.config.getAll().then(config => {
    console.log('当前配置:', config)
  })
}
```

**查看日志**:

- 主进程: 应用的终端窗口
- 渲染进程: 开发者工具 Console (F12)

### 2. 使用开发者工具

打开开发者工具查看渲染进程的输出:

1. 启动应用
2. 按 `F12` 或 `Ctrl+Shift+I`
3. 切换到 Console 标签

### 3. 错误处理

```javascript
async execute(params) {
  try {
    const result = await riskyOperation(params)
    console.log('执行成功:', result)
    return { success: true, data: result }
  } catch (error) {
    console.error('执行失败:', error)
    console.error('错误堆栈:', error.stack)

    // 显示友好的错误信息
    context.api.notification.show({
      title: '操作失败',
      body: error.message
    })

    return { success: false, error: error.message }
  }
}
```

### 4. 检查权限

```javascript
activate(context) {
  // 检查是否有所需权限
  const requiredPermissions = ['clipboard', 'notification']
  const hasPermissions = requiredPermissions.every(perm =>
    context.manifest.permissions.includes(perm)
  )

  if (!hasPermissions) {
    console.warn('缺少必要权限')
  }
}
```

### 5. 测试配置

```javascript
activate(context) {
  // 测试配置读写
  context.config.set('testKey', 'testValue').then(() => {
    return context.config.get('testKey')
  }).then(value => {
    console.log('配置测试:', value === 'testValue' ? '通过' : '失败')
  })
}
```

### 6. 热重载

修改插件代码后:

1. 打开设置 → 插件
2. 点击插件的重新加载按钮 (🔄)
3. 观察控制台输出

### 7. 调试 IPC

```javascript
// 主进程
context.ipc.handle('test', async (event, data) => {
  console.log('[IPC] 收到请求:', data)
  const result = await process(data)
  console.log('[IPC] 返回结果:', result)
  return result
})

// 渲染进程
console.log('[IPC] 发送请求:', data)
const result = await window.api.plugin.invoke('my-plugin:test', data)
console.log('[IPC] 收到响应:', result)
```

---

## ✨ 最佳实践

### 1. 代码组织

```javascript
// 推荐: 模块化代码
const utils = require('./lib/utils')
const api = require('./lib/api')

let pluginContext = null

module.exports = {
  activate(context) {
    pluginContext = context
    utils.initialize(context)
    api.initialize(context)
  },

  deactivate() {
    utils.cleanup()
    api.cleanup()
  },

  async execute(params) {
    return await api.execute(params)
  }
}
```

### 2. 错误处理

```javascript
// 推荐: 完善的错误处理
async execute(params) {
  try {
    // 参数验证
    if (!params || !params.input) {
      throw new Error('缺少必需参数: input')
    }

    // 执行操作
    const result = await doSomething(params.input)

    // 返回结果
    return { success: true, data: result }
  } catch (error) {
    // 记录错误
    console.error('执行失败:', error)

    // 用户友好的错误信息
    let message = '操作失败'
    if (error.code === 'NETWORK_ERROR') {
      message = '网络连接失败,请检查网络设置'
    } else if (error.code === 'PERMISSION_DENIED') {
      message = '权限不足,请检查插件配置'
    }

    // 显示通知
    pluginContext.api.notification.show({
      title: '错误',
      body: message
    })

    // 返回错误信息
    return { success: false, error: message }
  }
}
```

### 3. 异步操作

```javascript
// 推荐: 正确使用 async/await
async activate(context) {
  console.log('开始初始化...')

  // 并行加载配置
  const [config, data] = await Promise.all([
    context.config.getAll(),
    loadExternalData()
  ])

  console.log('初始化完成')
}
```

### 4. 资源清理

```javascript
// 推荐: 清理资源
activate(context) {
  // 创建定时器
  const timer = setInterval(() => {
    // 定时任务
  }, 60000)

  // 创建事件监听
  const listener = (data) => {
    // 处理事件
  }
  context.ipc.on('event', listener)

  // 返回清理函数
  return () => {
    clearInterval(timer)
    // 移除监听器 (注意: 当前版本可能不支持,手动追踪)
    console.log('清理资源')
  }
}
```

### 5. 配置默认值

```javascript
// 推荐: 提供合理的默认值
async function getConfig(key, defaultValue) {
  const value = await pluginContext.config.get(key)
  return value !== undefined ? value : defaultValue
}

// 使用
const apiKey = await getConfig('apiKey', '')
const timeout = await getConfig('timeout', 5000)
const enabled = await getConfig('enabled', true)
```

### 6. 国际化

```javascript
// 推荐: 支持多语言
const messages = {
  'zh-CN': {
    success: '操作成功',
    error: '操作失败'
  },
  'en-US': {
    success: 'Success',
    error: 'Failed'
  }
}

async function getMessage(key) {
  const language = (await pluginContext.config.get('language')) || 'zh-CN'
  return messages[language][key] || key
}

// 使用
const message = await getMessage('success')
pluginContext.api.notification.show({
  title: await getMessage('title'),
  body: message
})
```

### 7. 版本检查

```javascript
// 推荐: 检查应用版本
activate(context) {
  const appVersion = '1.0.0' // 从某处获取
  const minVersion = context.manifest.fingertips.minVersion

  if (!isVersionCompatible(appVersion, minVersion)) {
    console.error('应用版本过低,需要', minVersion, '当前', appVersion)
  }
}

function isVersionCompatible(current, required) {
  const c = current.split('.').map(Number)
  const r = required.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    if (c[i] > r[i]) return true
    if (c[i] < r[i]) return false
  }
  return true
}
```

### 8. 插件配置管理

```javascript
// ✅ 推荐: 优雅的配置管理方式
let pluginContext = null

module.exports = {
  activate(context) {
    pluginContext = context

    // 注册打开配置的处理器
    context.ipc.handle('openSettings', async () => {
      return await openConfigDialog()
    })

    console.log('插件已激活')
  },

  deactivate() {
    pluginContext = null
  },

  async execute(params) {
    // 1. 检查必需的配置
    const config = await pluginContext.config.getAll()

    if (!config.apiKey) {
      // 2. 提示用户进行配置
      const choice = await pluginContext.api.dialog.showMessageBox({
        type: 'warning',
        title: '需要配置',
        message: '此插件需要配置 API 密钥才能使用',
        detail: '请点击"立即配置"按钮设置您的 API 密钥',
        buttons: ['立即配置', '取消']
      })

      if (choice === 0) {
        // 3. 打开配置对话框
        await openConfigDialog()

        // 4. 再次检查配置
        const newConfig = await pluginContext.config.getAll()
        if (!newConfig.apiKey) {
          return { success: false, error: '未完成配置' }
        }

        // 配置完成，继续执行
        return await executeWithConfig(newConfig, params)
      }

      return { success: false, error: '用户取消' }
    }

    // 配置已存在，直接执行
    return await executeWithConfig(config, params)
  }
}

// 打开配置对话框
async function openConfigDialog() {
  const currentConfig = await pluginContext.config.getAll()

  // 方式 1: 简单的系统对话框（临时方案）
  const result = await pluginContext.api.dialog.showMessageBox({
    type: 'info',
    title: '插件配置',
    message: '请在此输入配置信息',
    detail: `当前 API 密钥: ${currentConfig.apiKey || '未设置'}\n\n未来版本将支持图形化配置界面。`,
    buttons: ['确定']
  })

  // 方式 2: 如果支持独立窗口（未来）
  // await pluginContext.api.window.create({
  //   title: '插件配置',
  //   width: 600,
  //   height: 400,
  //   html: path.join(pluginContext.pluginDir, 'ui/settings.html')
  // })

  return { success: true }
}

// 使用配置执行功能
async function executeWithConfig(config, params) {
  try {
    // 使用配置中的参数
    const result = await callAPI(config.apiKey, params)

    pluginContext.api.notification.show({
      title: '执行成功',
      body: '操作已完成'
    })

    return { success: true, data: result }
  } catch (error) {
    pluginContext.api.notification.show({
      title: '执行失败',
      body: error.message
    })

    return { success: false, error: error.message }
  }
}

// API 调用示例
async function callAPI(apiKey, params) {
  // 实现实际的 API 调用逻辑
  return { message: 'Success' }
}
```

**配置管理要点**:

1. **优雅降级**: 未配置时给出友好提示，引导用户配置
2. **配置验证**: 在使用前验证配置的完整性和有效性
3. **配置入口**: 提供明确的配置入口（通过对话框或通知）
4. **配置持久化**: 使用 `context.config` API 保存配置
5. **配置更新**: 支持用户随时更新配置
6. **默认值**: 在 manifest.json 中提供合理的默认配置

### 9. 处理用户选中的文本

```javascript
// ✅ 推荐: 完整的文本处理插件示例
let pluginContext = null

module.exports = {
  activate(context) {
    pluginContext = context
    console.log('文本处理插件已激活')
  },

  deactivate() {
    pluginContext = null
    console.log('文本处理插件已停用')
  },

  async execute(params) {
    console.log('=== 执行文本处理 ===')
    console.log('参数:', params)

    try {
      // 1. 🎯 优先使用传入的选中文本（从 Super Panel 触发时）
      let inputText = params?.text

      // 2. 如果没有传入文本，尝试从剪贴板读取（作为回退方案）
      if (!inputText && pluginContext.manifest.permissions.includes('clipboard')) {
        inputText = pluginContext.api.clipboard.readText()
        console.log('从剪贴板读取文本')
      }

      // 3. 验证输入
      if (!inputText || !inputText.trim()) {
        pluginContext.api.notification.show({
          title: '提示',
          body: '没有可处理的文本，请先选中文本后再执行'
        })
        return { success: false, error: '没有输入文本' }
      }

      console.log('输入文本长度:', inputText.length)

      // 4. 处理文本
      const result = processText(inputText)

      // 5. 将结果写回剪贴板（可选）
      if (pluginContext.manifest.permissions.includes('clipboard')) {
        pluginContext.api.clipboard.writeText(result)
      }

      // 6. 显示成功通知
      pluginContext.api.notification.show({
        title: '处理完成',
        body: `已处理 ${inputText.length} 个字符`
      })

      return { success: true, data: result }
    } catch (error) {
      console.error('处理失败:', error)

      // 显示错误通知
      pluginContext.api.notification.show({
        title: '处理失败',
        body: error.message
      })

      return { success: false, error: error.message }
    }
  }
}

// 文本处理函数示例
function processText(text) {
  // 示例：转换为大写
  return text.toUpperCase()
}
```

**关键点**:

1. **优先使用 `params.text`**: 这是系统传入的选中文本，最可靠
2. **剪贴板作为回退**: 只在 `params.text` 不存在时使用
3. **检查权限**: 使用剪贴板前检查是否有相应权限
4. **用户友好提示**: 没有输入时给出明确的提示
5. **完整的错误处理**: 捕获并友好地展示错误信息

---

## ❓ 常见问题

### Q1: 插件如何访问外部 npm 包?

**A**: 在插件目录创建 `package.json` 并安装依赖:

```bash
cd plugins/my-plugin
npm init -y
npm install axios lodash
```

然后在代码中引入:

```javascript
const axios = require('axios')
const _ = require('lodash')

module.exports = {
  async execute(params) {
    const response = await axios.get('https://api.example.com/data')
    const processed = _.map(response.data, (item) => item.name)
    return { success: true, data: processed }
  }
}
```

### Q2: 如何在插件之间通信?

**A**: 通过 IPC 通道:

```javascript
// 插件 A: 注册处理器
context.ipc.handle('get-data', async () => {
  return { data: 'some data' }
})

// 插件 B: 调用插件 A
const result = await window.api.plugin.invoke('plugin-a:get-data')
```

### Q3: 插件可以修改应用设置吗?

**A**: 可以,但需要 `settings:write` 权限:

```javascript
// manifest.json
{
  "permissions": ["settings:write"]
}

// index.js
// 注意: 当前版本可能不支持写入,仅支持读取
```

### Q4: 如何存储大量数据?

**A**: 使用文件系统 API:

```javascript
const dataPath = path.join(context.pluginDir, 'data.json')

// 保存
const data = { items: [...] }
await context.api.fs.writeFile(
  dataPath,
  JSON.stringify(data),
  { encoding: 'utf-8' }
)

// 读取
const content = await context.api.fs.readFile(dataPath, { encoding: 'utf-8' })
const data = JSON.parse(content)
```

### Q5: 插件可以创建定时任务吗?

**A**: 可以,在 activate 中创建并在清理函数中清除:

```javascript
activate(context) {
  const timer = setInterval(async () => {
    // 执行定时任务
    await checkUpdates()
  }, 60000) // 每分钟执行一次

  return () => {
    clearInterval(timer)
  }
}
```

### Q6: 如何调试插件?

**A**: 使用 console.log 并查看:

- 主进程日志: 终端窗口
- 渲染进程日志: 开发者工具 (F12)

### Q7: 插件会影响应用性能吗?

**A**: 如果遵循最佳实践,影响很小:

- 使用异步操作
- 及时清理资源
- 避免阻塞主线程
- 合理使用定时器

### Q8: 如何发布插件?

**A**: 请参考 [发布清单](#发布清单)

### Q9: 如何获取用户选中的文本（划词内容）?

**A**: 有两种方式，推荐优先使用第一种：

**方式 1: 通过 `params.text` 参数（✅ 推荐）**

当用户从 Super Panel 执行插件时，系统会自动将选中的文本作为 `params.text` 传入：

```javascript
async execute(params) {
  const selectedText = params?.text

  if (selectedText) {
    console.log('用户选中的文本:', selectedText)
    // 处理选中的文本
    return processText(selectedText)
  }

  return { success: false, error: '没有选中的文本' }
}
```

**方式 2: 从剪贴板读取（仅作为回退方案）**

如果 `params.text` 不存在，可以尝试从剪贴板读取（需要 `clipboard` 权限）：

```javascript
async execute(params) {
  // 优先使用传入的选中文本
  let text = params?.text

  // 如果没有，从剪贴板读取
  if (!text) {
    text = context.api.clipboard.readText()
  }

  if (!text || !text.trim()) {
    return { success: false, error: '没有可处理的文本' }
  }

  return processText(text)
}
```

**⚠️ 注意**:

- 不要依赖模拟 `Ctrl+C` 来获取选中文本，这会干扰用户的剪贴板
- `params.text` 是系统自动传入的，无需插件做任何额外操作
- 从剪贴板读取只能获取已经复制的内容，不是实时选中的内容

---

## 📋 发布清单

在发布插件前,请确认以下事项:

### 代码质量

- [ ] 代码无语法错误
- [ ] 所有功能正常工作
- [ ] 错误处理完善
- [ ] 资源正确清理
- [ ] 没有内存泄漏

### 文档

- [ ] README.md 完整
  - 功能介绍
  - 安装方法
  - 使用说明
  - 配置说明
  - 截图/演示
- [ ] LICENSE 文件
- [ ] CHANGELOG.md (版本历史)

### 配置

- [ ] manifest.json 完整且正确
- [ ] 版本号符合语义化版本规范
- [ ] 权限列表最小化
- [ ] 默认配置合理

### 测试

- [ ] 在开发环境测试通过
- [ ] 在生产环境测试通过
- [ ] 启用/停用功能正常
- [ ] 热重载功能正常
- [ ] 配置读写正常

### 资源

- [ ] 图标清晰美观
- [ ] 文件大小合理 (< 5MB)
- [ ] 无不必要的文件
- [ ] 代码已压缩 (可选)

### 安全

- [ ] 无敏感信息泄露
- [ ] API 密钥加密存储
- [ ] 用户数据安全
- [ ] 网络请求使用 HTTPS

### 用户体验

- [ ] 操作流程流畅
- [ ] 错误提示友好
- [ ] 支持中英文 (可选)
- [ ] 有示例配置

---

## 📚 参考资源

### 官方文档

- [插件系统开发方案](./PLUGIN_SYSTEM_DEVELOPMENT_PLAN.md)
- [插件系统测试指南](./PLUGIN_SYSTEM_TEST_GUIDE.md)
- [快速开始指南](./PLUGIN_QUICK_START.md)
- [截图 API 使用指南](./SCREENSHOT_API_GUIDE.md)

### 示例插件

- [Hello World](../plugins/hello-world/) - 基础示例
- [Screenshot Viewer](../plugins/screenshot-viewer/) - 截图功能示例
- [Vue Plugin Demo](../plugins/vue-plugin-demo/) - Vue 3 界面开发示例
- [Window Demo](../plugins/window-demo/) - 窗口管理示例
- [Text Processor](../plugins/text-processor/) - 文本处理示例

### 外部资源

- [Electron 文档](https://www.electronjs.org/docs)
- [Node.js API](https://nodejs.org/api/)
- [Vue 3 文档](https://vuejs.org/)
- [JSON Schema](https://json-schema.org/)

---

## 💬 获取帮助

### 常见问题

先查看本文档的 [常见问题](#常见问题) 部分。

### 社区支持

- GitHub Issues: 报告 Bug 或功能请求
- GitHub Discussions: 技术讨论和问答
- Email: support@fingertips-ai.com

### 贡献

欢迎贡献代码和插件!

1. Fork 项目
2. 创建特性分支
3. 提交 Pull Request

---

## 📝 版本历史

### v1.0.0 (2025-10-18)

- ✅ 初始版本发布
- ✅ 完整的插件系统
- ✅ 9 个核心 API (Settings, Dialog, Notification, Clipboard, FileSystem, IPC, Window, Screenshot, Config)
- ✅ 权限系统
- ✅ 配置管理
- ✅ 示例插件
- ✅ 支持截图功能 (Screenshot API)
- ✅ 支持 Vue 3 开发插件界面

---

**祝你开发愉快!** 🚀

如有问题,请随时联系我们。
