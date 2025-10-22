# 🔧 打包后截图工具路径问题修复

## 🐛 问题描述

打包后使用截图插件，每次都打开截图框但没有截图，日志显示：
```
捕获的文本长度: 0
Plugin screenshot-viewer executed successfully
```

## 🔍 根本原因

### 问题：打包后文件路径不正确

**文件实际位置**（打包后）：
```
dist/win-unpacked/resources/app.asar.unpacked/resources/tools/ScreenCapture.exe
```

**代码中的路径**（错误）：
```javascript
// ❌ 原来的代码
path.join(process.resourcesPath, 'tools', 'ScreenCapture.exe')
// 实际尝试访问: dist/win-unpacked/resources/tools/ScreenCapture.exe
```

**结果**：找不到 `ScreenCapture.exe`，导致：
1. 截图工具无法启动
2. 没有错误提示（被静默处理）
3. 返回空字符串

### 为什么会这样？

electron-builder 配置中有：
```yaml
asarUnpack:
  - resources/**
```

这会把 `resources/` 目录解包到 `app.asar.unpacked/resources/`，而不是 `resources/` 根目录。

## ✅ 解决方案

### 修复 1：正确的路径逻辑

**文件**：`src/main/modules/pluginAPI.ts`

```javascript
/**
 * 获取 ScreenCapture.exe 工具路径
 * 在开发环境使用项目根目录的 resources，在生产环境使用 app.asar.unpacked
 */
function getScreenCaptureToolPath(): string {
  // 开发环境：使用项目根目录
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), 'resources', 'tools', 'ScreenCapture.exe')
  }
  // 生产环境：使用 app.asar.unpacked 目录
  return path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    'resources',
    'tools',
    'ScreenCapture.exe'
  )
}
```

### 修复 2：文件存在性检查

添加文件检查，提供明确的错误信息：

```javascript
// 检查文件是否存在
try {
  accessSync(screenshotToolPath, fsConstants.F_OK)
} catch (err) {
  const errorMsg = `截图工具不存在: ${screenshotToolPath}`
  console.error(errorMsg, err)
  reject(new Error(errorMsg))
  return
}
```

### 修复 3：详细的日志输出

```javascript
console.log('截图工具路径:', screenshotToolPath)

if (dataURL) {
  console.log('截图成功，数据大小:', Math.round(dataURL.length / 1024), 'KB')
} else {
  console.log('截图为空（用户可能取消了）')
}
```

## 📊 对比

| 场景 | 原路径 | 新路径 | 结果 |
|------|--------|--------|------|
| 开发环境 | `app.getAppPath()/resources/tools/` | `app.getAppPath()/resources/tools/` | ✅ 相同 |
| 生产环境 | `process.resourcesPath/tools/` ❌ | `process.resourcesPath/app.asar.unpacked/resources/tools/` ✅ | ✅ 修复 |

## 🧪 验证步骤

### 1. 重新编译和打包

```bash
npm run build
```

### 2. 运行打包后的应用

从 `dist/win-unpacked/` 目录运行

### 3. 测试截图功能

1. 打开应用
2. 启用"截图查看器"插件
3. 点击"执行"按钮
4. 进行截图

### 4. 检查控制台输出

**成功的日志**：
```
截图工具路径: D:\...\resources\app.asar.unpacked\resources\tools\ScreenCapture.exe
截图成功，数据大小: 245 KB
```

**失败的日志（旧版本）**：
```
截图工具不存在: D:\...\resources\tools\ScreenCapture.exe
```

## 🎯 修改的文件

- ✅ `src/main/modules/pluginAPI.ts` - 修复路径逻辑

## 💡 经验教训

### 1. 打包路径的差异

| 环境 | `app.getAppPath()` | `process.resourcesPath` |
|------|-------------------|-------------------------|
| 开发 | 项目根目录 | - |
| 生产 | `resources/app.asar` | `resources/` |

### 2. asarUnpack 的行为

```yaml
asarUnpack:
  - resources/**
```

- 将 `resources/` 解包到 `app.asar.unpacked/resources/`
- **不是**解包到 `resources/` 根目录
- 需要在代码中使用 `app.asar.unpacked` 路径

### 3. 最佳实践

```javascript
// ✅ 好的做法
function getToolPath() {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), 'resources', 'tool.exe')
  }
  return path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'tool.exe')
}

// ❌ 不好的做法
const toolPath = path.join(process.resourcesPath, 'tool.exe') // 打包后会失败
```

### 4. 文件检查的重要性

```javascript
// 总是检查文件是否存在
try {
  accessSync(filePath, fsConstants.F_OK)
} catch (err) {
  throw new Error(`文件不存在: ${filePath}`)
}
```

## 🔄 相关问题

这个问题也可能影响其他使用外部工具的功能：
- ✅ `iconExtractor.ts` - 已经使用正确的路径
- ✅ `pluginAPI.ts` - 本次修复

## 📝 测试清单

- [ ] 开发环境：`npm run dev` - 截图功能正常
- [ ] 生产环境：打包后运行 - 截图功能正常
- [ ] 控制台日志：显示正确的路径
- [ ] 错误处理：文件不存在时有明确提示
- [ ] 用户体验：截图成功后正确显示

## 🎉 预期结果

修复后，打包的应用应该：
1. ✅ 正确找到 `ScreenCapture.exe`
2. ✅ 成功启动截图工具
3. ✅ 截图后正确显示在查看器中
4. ✅ 控制台显示详细的日志
5. ✅ 错误时有明确的提示

---

**修复时间**：2024-10-22
**影响范围**：打包后的生产环境
**优先级**：🔴 高（核心功能）

