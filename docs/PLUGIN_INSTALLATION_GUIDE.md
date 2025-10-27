# 插件安装指南

## 功能概述

Fingertips AI 现在支持通过拖拽 ZIP 压缩包的方式来安装插件，提供了完整的插件管理功能。

## 功能特性

### 1. 安装插件

- 支持从 ZIP 文件安装插件
- 自动解压和验证插件包
- 检查插件版本兼容性
- 防止重复安装

### 2. 更新插件

- 卸载旧版本并安装新版本
- 自动验证插件 ID 匹配

### 3. 卸载插件

- 完全删除插件文件
- 自动停用正在运行的插件

## API 使用

### 从渲染进程调用

```typescript
// 安装插件
const result = await window.electron.ipcRenderer.invoke(
  'plugin:install-from-zip',
  '/path/to/plugin.zip'
)
if (result.success) {
  console.log(`插件安装成功: ${result.manifest.name}`)
  console.log(`插件 ID: ${result.pluginId}`)
} else {
  console.error(`安装失败: ${result.error}`)
}

// 卸载插件
const uninstallResult = await window.electron.ipcRenderer.invoke('plugin:uninstall', 'plugin-id')
if (uninstallResult.success) {
  console.log('插件卸载成功')
}

// 更新插件
const updateResult = await window.electron.ipcRenderer.invoke(
  'plugin:update',
  'plugin-id',
  '/path/to/new-version.zip'
)
if (updateResult.success) {
  console.log('插件更新成功')
}
```

### 从主进程调用

```typescript
import { installPluginFromZip, uninstallPlugin, updatePlugin } from './modules/pluginLoader'

// 安装插件
const result = await installPluginFromZip('/path/to/plugin.zip')
if (result.success) {
  console.log('安装成功:', result.manifest)
}

// 卸载插件
const uninstallResult = await uninstallPlugin('plugin-id')

// 更新插件
const updateResult = await updatePlugin('plugin-id', '/path/to/new-version.zip')
```

## 插件包格式要求

### 目录结构

插件 ZIP 包应包含以下结构：

```
plugin-name.zip
├── manifest.json          # 必需：插件清单
├── index.js              # 必需：主入口文件
├── icon.png              # 可选：插件图标
└── ui/                   # 可选：UI 文件
    ├── config.html
    └── panel.html
```

或者带有根目录：

```
plugin-name.zip
└── plugin-name/
    ├── manifest.json
    ├── index.js
    └── ...
```

### manifest.json 示例

```json
{
  "id": "my-awesome-plugin",
  "name": "我的优秀插件",
  "version": "1.0.0",
  "description": "这是一个很棒的插件",
  "keywords": ["工具", "实用"],
  "author": "Your Name",
  "icon": "icon.png",
  "fingertips": {
    "minVersion": "1.0.0"
  },
  "main": "index.js",
  "permissions": ["notification", "clipboard"]
}
```

## 安全检查

系统会对安装的插件进行以下安全检查：

### 1. 文件大小限制

- 最大文件大小：100MB
- 超过限制将拒绝安装

### 2. 路径遍历防护

- 检查 ZIP 包中的文件路径
- 拒绝包含 `..` 或绝对路径的文件
- 防止路径遍历攻击

### 3. 可执行文件警告

- 检测以下文件类型：`.exe`, `.bat`, `.cmd`, `.com`, `.scr`, `.vbs`, `.ps1`
- 发出警告但不阻止安装（某些插件可能需要可执行文件）

### 4. 清单验证

- 验证必需字段：`id`, `name`, `version`, `description`, `keywords`, `main`
- 验证权限声明
- 验证版本兼容性
- 验证主入口文件存在

### 5. 重复安装检查

- 检查插件 ID 是否已存在
- 提示使用更新功能而非重复安装

## 错误处理

所有 API 返回统一的结果格式：

```typescript
interface PluginInstallResult {
  success: boolean // 是否成功
  manifest?: PluginManifest // 插件清单（成功时）
  error?: string // 错误信息（失败时）
  pluginId?: string // 插件 ID
}
```

### 常见错误

| 错误信息                     | 原因           | 解决方案                   |
| ---------------------------- | -------------- | -------------------------- |
| ZIP 文件不存在               | 文件路径错误   | 检查文件路径               |
| ZIP 文件过大                 | 文件超过 100MB | 减小文件大小               |
| 插件包中未找到 manifest.json | 缺少清单文件   | 添加 manifest.json         |
| 插件清单验证失败             | 清单格式错误   | 检查必填字段               |
| 主入口文件不存在             | 缺少主入口     | 添加 main 指定的文件       |
| 插件已存在                   | ID 重复        | 使用更新功能或卸载旧版本   |
| 版本不兼容                   | 版本要求不满足 | 检查 fingertips.minVersion |

## 实现细节

### 安装流程

1. **验证文件**：检查 ZIP 文件存在性和大小
2. **解压到临时目录**：使用临时目录避免污染
3. **安全检查**：验证文件路径和类型
4. **验证插件包**：检查清单和必需文件
5. **检查重复**：确保不会覆盖已存在的插件
6. **移动文件**：将插件移动到正式目录
7. **清理临时文件**：删除临时目录

### 事务性操作

- 所有操作都具有事务性
- 失败时自动清理临时文件
- 不会留下部分安装的插件

### 临时目录

- 使用系统临时目录：`os.tmpdir()`
- 临时目录命名：`fingertips-plugin-{timestamp}`
- 安装成功或失败后自动清理

## 最佳实践

### 插件开发者

1. **清单文件完整性**
   - 填写所有必需字段
   - 提供准确的版本兼容性信息
   - 使用有意义的关键词

2. **文件组织**
   - 保持文件结构清晰
   - 避免不必要的大文件
   - 压缩前测试插件

3. **版本管理**
   - 使用语义化版本号
   - 在更新日志中记录变更
   - 保持向后兼容性

### 应用开发者

1. **用户体验**
   - 提供拖拽安装界面
   - 显示安装进度
   - 提供清晰的错误提示

2. **安全性**
   - 验证插件来源
   - 警告用户潜在风险
   - 限制插件权限

3. **性能**
   - 异步处理安装操作
   - 避免阻塞主进程
   - 合理设置文件大小限制

## 注意事项

1. **重新加载应用**
   - 安装、更新或卸载插件后，需要重新加载应用才能完全生效
   - 考虑在 UI 中添加"重新加载"按钮

2. **权限管理**
   - 插件只能访问声明的权限
   - 未声明的权限调用会被拒绝

3. **配置保留**
   - 更新插件时，当前实现会删除旧配置
   - 如需保留配置，请在更新前备份

4. **跨平台兼容性**
   - 插件应在所有平台上测试
   - 注意文件路径分隔符的差异

## 未来改进

以下功能可能在未来版本中添加：

- [ ] 插件市场集成
- [ ] 自动更新检查
- [ ] 配置迁移（更新时保留配置）
- [ ] 插件签名验证
- [ ] 沙箱运行环境
- [ ] 依赖管理
- [ ] 热重载支持
