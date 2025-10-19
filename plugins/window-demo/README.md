# 窗口示例插件

展示如何使用 Window API 创建和管理自定义窗口的示例插件。

## 功能特性

- 🪟 **创建自定义窗口** - 演示如何使用 Window API 创建窗口
- ⚙️ **配置界面** - 完整的 HTML 配置窗口示例
- 📊 **演示窗口** - 简单的信息展示窗口
- 🔄 **窗口管理** - 查看、聚焦、关闭窗口
- 💾 **配置持久化** - 通过 Config API 保存配置
- 📨 **IPC 通信** - 窗口与主进程的双向通信

## 安装

1. 将 `window-demo` 文件夹复制到 `plugins/` 目录
2. 启动 Fingertips AI
3. 打开 设置 → 插件
4. 找到"窗口示例插件"并启用

## 使用方法

1. 在插件管理器中点击"窗口示例插件"的执行按钮
2. 选择要打开的窗口类型:
   - **配置窗口**: 完整的配置界面，展示表单、验证、保存等功能
   - **演示窗口**: 简单的展示窗口，展示数据传递
   - **查看窗口**: 列出所有已创建的窗口，并可批量关闭

## 技术要点

### 1. 窗口创建

```javascript
const window = await context.api.window.create({
  title: '窗口标题',
  width: 600,
  height: 500,
  center: true,
  html: 'ui/config.html',
  data: {
    // 传递给窗口的数据
    pluginId: context.manifest.id,
    config: await context.config.getAll()
  }
})
```

### 2. 数据传递

主进程传递数据：

```javascript
data: {
  message: '这是一个消息',
  timestamp: Date.now()
}
```

窗口接收数据：

```javascript
if (window.pluginData) {
  console.log(window.pluginData.message)
  console.log(window.pluginData.timestamp)
}
```

### 3. IPC 通信

主进程注册处理器：

```javascript
context.ipc.handle('saveConfig', async (event, config) => {
  await context.config.setAll(config)
  return { success: true }
})
```

窗口调用：

```javascript
const result = await window.api.plugin.invoke('window-demo:saveConfig', config)
```

### 4. 窗口管理

```javascript
// 检查窗口是否存在
if (window && window.isVisible()) {
  window.focus() // 聚焦已存在的窗口
  return
}

// 关闭所有窗口
context.api.window.closeAll()

// 获取所有窗口
const windows = context.api.window.getAll()
```

## 目录结构

```
window-demo/
├── manifest.json    # 插件配置
├── index.js         # 主进程逻辑
├── ui/
│   ├── config.html  # 配置窗口
│   └── demo.html    # 演示窗口
└── README.md        # 说明文档
```

## 权限说明

- `window` - 创建和管理窗口
- `notification` - 显示系统通知
- `dialog` - 显示对话框选择窗口类型

## 学习要点

通过这个示例插件，你可以学习到：

1. ✅ 如何创建自定义窗口
2. ✅ 如何传递数据到窗口
3. ✅ 如何在窗口中使用 IPC 通信
4. ✅ 如何管理窗口生命周期
5. ✅ 如何设计美观的窗口界面
6. ✅ 如何处理窗口关闭和清理
7. ✅ 如何避免重复创建窗口
8. ✅ 如何在窗口中访问插件配置

## 最佳实践

1. **窗口单例**: 避免重复创建，使用 `isVisible()` 检查
2. **数据传递**: 通过 `data` 参数传递初始数据
3. **IPC 通信**: 使用带前缀的 channel 避免冲突
4. **自动清理**: 在 `deactivate()` 中关闭所有窗口
5. **错误处理**: 捕获并友好地展示错误信息
6. **用户体验**: 提供关闭按钮和保存后自动关闭选项

## 相关文档

- [插件开发者指南](../../docs/PLUGIN_DEVELOPER_GUIDE.md)
- [Window API 文档](../../docs/PLUGIN_DEVELOPER_GUIDE.md#7-window-api)

## 许可证

MIT

## 作者

Fingertips AI Team
