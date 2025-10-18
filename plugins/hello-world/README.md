# Hello World 插件

这是一个简单的 Hello World 示例插件,用于演示 Fingertips AI 插件系统的基本结构和功能。

## 功能

- ✅ 插件激活时显示通知
- ✅ 支持执行操作
- ✅ 使用插件配置
- ✅ 完整的生命周期管理

## 文件结构

```
hello-world/
├── manifest.json     # 插件清单文件
├── index.js         # 主进程入口文件
└── README.md        # 说明文档
```

## 使用方法

### 1. 安装插件

将此 `hello-world` 文件夹复制到应用的 `plugins/` 目录中。

### 2. 启用插件

1. 打开 Fingertips AI 应用
2. 进入 设置 → 插件
3. 找到 "Hello World" 插件
4. 点击启用开关

### 3. 测试插件

启用后,插件会自动激活并显示通知消息。

## 代码说明

### manifest.json

定义插件的元信息:

- `id`: 插件唯一标识符
- `name`: 插件显示名称
- `version`: 版本号
- `description`: 插件描述
- `permissions`: 需要的权限列表
- `main`: 主进程入口文件路径

### index.js

实现插件的核心功能:

- `activate(context)`: 插件激活时调用
- `deactivate()`: 插件停用时调用
- `execute(params)`: 执行插件功能

### 插件上下文 (context)

插件在激活时会收到一个上下文对象,包含:

- `context.manifest`: 插件清单信息
- `context.pluginDir`: 插件目录路径
- `context.api`: 插件 API 接口
- `context.config`: 插件配置管理

### 可用的 API

#### 通知 API

```javascript
context.api.notification.show({
  title: '标题',
  body: '内容'
})
```

#### 配置 API

```javascript
// 读取配置
const value = await context.config.get('key')

// 写入配置
await context.config.set('key', 'value')
```

## 扩展开发

基于此示例,你可以:

1. 添加更多权限 (如 `clipboard`, `dialog` 等)
2. 实现配置界面 (`ui/settings.vue`)
3. 添加自定义面板 (`ui/panel.vue`)
4. 使用更多插件 API 功能

## 许可证

MIT
