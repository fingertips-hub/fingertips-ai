# 文本处理工具插件

一个功能强大的文本处理插件，演示 Fingertips AI 插件系统的各种功能和最佳实践。

## 功能特性

### 文本处理操作

- ✅ 大小写转换（大写、小写、首字母大写）
- ✅ 空格处理（去除所有空格、去除首尾空格）
- ✅ 编码/解码（URL编码/解码、Base64编码/解码）
- ✅ 文本变换（反转文本）
- ✅ 文本统计（字符数、单词数）

### 插件功能

- 📋 剪贴板集成 - 自动读取和写入剪贴板
- 🔔 系统通知 - 操作完成提醒
- 💾 历史记录 - 保存处理历史，可查看和清除
- 🎨 配置界面 - 完整的可视化设置面板
- 🌐 国际化 - 支持中英文
- 📊 操作对话框 - 友好的操作选择界面

## 安装

1. 将 `text-processor` 文件夹复制到 `plugins/` 目录
2. 启动 Fingertips AI
3. 打开 设置 → 插件
4. 找到"文本处理工具"并启用

## 使用方法

### 方法 1: 使用剪贴板

1. 复制要处理的文本
2. 在插件管理器中点击"文本处理工具"的执行按钮
3. 选择要执行的操作
4. 查看结果（自动复制到剪贴板）

### 方法 2: 从 Super Panel 执行

1. 将插件添加到 Super Panel
2. 复制要处理的文本
3. 打开 Super Panel，点击插件图标
4. 选择操作并查看结果

## 配置选项

### 基础设置

- **界面语言**: 选择中文或英文界面
- **默认操作**: 设置快速执行时使用的默认操作

### 行为设置

- **自动通知**: 处理完成后显示系统通知
- **自动复制结果**: 自动将结果复制到剪贴板

### 历史记录

- **启用历史记录**: 保存文本处理历史
- **最大记录数**: 限制历史记录数量（1-100）

## 技术特性

本插件展示了以下最佳实践：

### 1. 完整的生命周期管理

```javascript
module.exports = {
  activate(context) {
    // 插件激活时的初始化
  },
  deactivate() {
    // 插件停用时的清理
  },
  execute(params) {
    // 插件功能执行
  }
}
```

### 2. 权限使用

- `notification` - 显示系统通知
- `clipboard` - 读写剪贴板
- `dialog` - 显示对话框
- `fs:read` / `fs:write` - 读写历史记录文件

### 3. 配置管理

- 默认配置定义
- 配置读写
- 配置变化监听

### 4. 国际化支持

- 支持中英文消息
- 根据配置动态切换语言

### 5. UI 组件

- Vue 3 单文件组件
- 响应式设计
- Iconify 图标集成

### 6. IPC 通信

```javascript
// 注册处理器
context.ipc.handle('getHistory', async () => {
  return { success: true, data: processHistory }
})

// 调用处理器
await window.api.plugin.invoke('text-processor:getHistory')
```

### 7. 文件系统操作

```javascript
// 保存历史记录
const historyPath = path.join(context.pluginDir, 'history.json')
await context.api.fs.writeFile(historyPath, JSON.stringify(data), { encoding: 'utf-8' })
```

### 8. 错误处理

- 完善的 try-catch
- 用户友好的错误消息
- 日志记录

## 开发说明

### 目录结构

```
text-processor/
├── manifest.json       # 插件配置
├── index.js           # 主进程入口
├── ui/
│   └── settings.vue   # 配置界面
├── history.json       # 历史记录（运行时生成）
└── README.md          # 说明文档
```

### 调试

1. 查看主进程日志（终端）
2. 查看渲染进程日志（F12 开发者工具）
3. 使用"测试插件"按钮快速测试

### 扩展

可以轻松添加新的文本处理操作：

```javascript
const TextOperations = {
  // 添加新操作
  myOperation: (text) => {
    // 处理逻辑
    return processedText
  }
}
```

然后在 `showOperationDialog()` 中添加到操作列表。

## 许可证

MIT

## 作者

Fingertips AI Team

## 反馈

如有问题或建议，请通过以下方式联系：

- GitHub Issues
- Email: support@fingertips-ai.com
