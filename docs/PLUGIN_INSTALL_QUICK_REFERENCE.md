# 插件安装功能快速参考

## 🚀 快速开始

### 安装插件（渲染进程）

```typescript
const result = await window.electron.ipcRenderer.invoke(
  'plugin:install-from-zip',
  '/path/to/plugin.zip'
)

if (result.success) {
  alert(`插件 ${result.manifest.name} 安装成功！请重新加载应用。`)
} else {
  alert(`安装失败: ${result.error}`)
}
```

### 卸载插件（渲染进程）

```typescript
const result = await window.electron.ipcRenderer.invoke('plugin:uninstall', 'plugin-id')

if (result.success) {
  alert('卸载成功！请重新加载应用。')
}
```

### 更新插件（渲染进程）

```typescript
const result = await window.electron.ipcRenderer.invoke(
  'plugin:update',
  'plugin-id',
  '/path/to/new-version.zip'
)

if (result.success) {
  alert('更新成功！请重新加载应用。')
}
```

## 📦 插件包结构

```
my-plugin.zip
└── my-plugin/           # 根目录（可选但推荐）
    ├── manifest.json    # ✅ 必需
    ├── index.js         # ✅ 必需（main 指定的文件）
    ├── icon.png         # 📌 可选
    ├── README.md        # 📌 可选
    └── ui/              # 📌 可选
        ├── config.html
        └── panel.html
```

## 📝 manifest.json 模板

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "version": "1.0.0",
  "description": "插件描述",
  "keywords": ["关键词1", "关键词2"],
  "author": "作者名",
  "icon": "icon.png",
  "fingertips": {
    "minVersion": "1.0.0"
  },
  "main": "index.js",
  "permissions": ["notification", "clipboard"]
}
```

## 🔌 IPC 通道

| 通道名                    | 参数                | 返回值                | 说明     |
| ------------------------- | ------------------- | --------------------- | -------- |
| `plugin:install-from-zip` | `zipPath: string`   | `PluginInstallResult` | 安装插件 |
| `plugin:uninstall`        | `pluginId: string`  | `{ success, error? }` | 卸载插件 |
| `plugin:update`           | `pluginId, zipPath` | `PluginInstallResult` | 更新插件 |

## 🛡️ 安全限制

| 检查项     | 限制                 | 说明                   |
| ---------- | -------------------- | ---------------------- |
| 文件大小   | 100MB                | 超过限制会被拒绝       |
| 路径遍历   | 禁止 `..` 和绝对路径 | 防止目录穿越攻击       |
| 可执行文件 | 警告但不阻止         | 检测 `.exe`, `.bat` 等 |
| 清单验证   | 必需字段检查         | 确保插件格式正确       |

## ⚠️ 常见错误

| 错误信息                     | 原因           | 解决方案           |
| ---------------------------- | -------------- | ------------------ |
| ZIP 文件不存在               | 路径错误       | 检查文件路径       |
| ZIP 文件过大                 | 超过 100MB     | 减小文件大小       |
| 插件包中未找到 manifest.json | 缺少清单       | 添加 manifest.json |
| 主入口文件不存在             | 缺少 main 文件 | 添加 index.js      |
| 插件已存在                   | ID 重复        | 先卸载或使用更新   |

## 🎯 返回值类型

```typescript
interface PluginInstallResult {
  success: boolean // 是否成功
  manifest?: PluginManifest // 插件清单（成功时）
  error?: string // 错误信息（失败时）
  pluginId?: string // 插件 ID
}
```

## 💡 最佳实践

### ✅ 推荐做法

1. **压缩前测试**

   ```bash
   # 确保插件在压缩前可以正常工作
   npm test
   ```

2. **使用根目录**

   ```
   ✅ my-plugin.zip/my-plugin/manifest.json
   ❌ my-plugin.zip/manifest.json
   ```

3. **提供完整信息**

   ```json
   {
     "keywords": ["工具", "效率"], // ✅ 有意义的关键词
     "description": "详细的描述" // ✅ 清晰的描述
   }
   ```

4. **版本号规范**
   ```json
   {
     "version": "1.0.0", // ✅ 语义化版本
     "fingertips": {
       "minVersion": "1.0.0",
       "maxVersion": "2.0.0" // 可选
     }
   }
   ```

### ❌ 避免的做法

1. **不要使用相对路径**

   ```json
   ❌ "main": "../index.js"
   ✅ "main": "index.js"
   ```

2. **不要包含不必要的文件**

   ```
   ❌ node_modules/
   ❌ .git/
   ❌ .DS_Store
   ```

3. **不要使用无意义的 ID**
   ```json
   ❌ "id": "plugin1"
   ✅ "id": "text-formatter"
   ```

## 🎨 拖拽区域 HTML 模板

```html
<div class="drop-zone" ondrop="handleDrop(event)" ondragover="event.preventDefault()">
  📦 拖拽 ZIP 文件到此处
</div>

<script>
  async function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]

    if (file && file.name.endsWith('.zip')) {
      const result = await window.electron.ipcRenderer.invoke('plugin:install-from-zip', file.path)

      if (result.success) {
        alert('安装成功！')
      } else {
        alert('安装失败: ' + result.error)
      }
    }
  }
</script>
```

## 📚 相关文档

- [完整安装指南](./PLUGIN_INSTALLATION_GUIDE.md)
- [拖拽示例代码](./PLUGIN_DRAG_DROP_EXAMPLE.md)
- [功能实现总结](./PLUGIN_ZIP_INSTALL_FEATURE.md)
- [插件开发指南](./PLUGIN_DEVELOPER_GUIDE.md)

## 🔧 调试技巧

### 查看控制台日志

```typescript
// 启用详细日志
console.log('Installing plugin from:', zipPath)

// 查看安装结果
console.log('Install result:', result)

// 检查插件目录
const pluginsDir = await window.electron.ipcRenderer.invoke('get-plugins-directory')
console.log('Plugins directory:', pluginsDir)
```

### 常见问题排查

1. **插件安装成功但不显示**
   - 检查是否重新加载了应用
   - 查看控制台是否有错误

2. **插件安装失败**
   - 检查 manifest.json 格式
   - 验证所有必需字段
   - 确认文件路径正确

3. **权限错误**
   - 确保插件声明了需要的权限
   - 检查 `permissions` 数组

## 📞 获取帮助

- 查看完整文档：`docs/PLUGIN_INSTALLATION_GUIDE.md`
- 查看示例代码：`docs/PLUGIN_DRAG_DROP_EXAMPLE.md`
- 提交问题：GitHub Issues
