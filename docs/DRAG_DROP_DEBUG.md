# 拖拽功能调试指南

## 🐛 问题描述

拖拽快捷方式(.lnk)文件到添加区域时,无法正确加载对应的应用程序。

## 🔍 调试步骤

### 1. 打开开发者工具

Super Panel 窗口会自动打开开发者工具(detached 模式)。

### 2. 执行拖拽操作

1. 打开 Super Panel
2. 点击加号 → 选择"文件"
3. 拖拽一个快捷方式(.lnk)文件到拖拽区域
4. 查看控制台输出

### 3. 查看调试日志

控制台会输出详细的调试信息:

```
=== Drop Event Debug Info ===
Event: DragEvent {...}
dataTransfer: DataTransfer {...}
dataTransfer.files: FileList {...}
files.length: 1
File object: File {...}
File name: Chrome.lnk
File type:
File size: 1234
File lastModified: 1234567890
Checking path properties:
  file.path: C:\Users\...\Chrome.lnk
  file.webkitRelativePath:
  Object.keys(file): []
  Object.getOwnPropertyNames(file): []
Final file path: C:\Users\...\Chrome.lnk
Using file path: C:\Users\...\Chrome.lnk
Processing dropped file: C:\Users\...\Chrome.lnk
```

## 📊 可能的问题和解决方案

### 问题 1: file.path 是 undefined

**症状**:

```
file.path: undefined
Final file path: undefined
File path is invalid: undefined
```

**原因**:

- Electron 的 `sandbox` 模式启用
- `nodeIntegration` 被禁用
- 安全策略阻止访问文件路径

**解决方案**:
检查 `src/main/modules/superPanel.ts` 中的 `webPreferences`:

```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  sandbox: false,  // 必须是 false
  nodeIntegration: false,
  contextIsolation: true
}
```

### 问题 2: file.path 是空字符串

**症状**:

```
file.path: ""
Final file path: ""
```

**原因**: 文件路径获取失败

**解决方案**: 使用文件选择器代替拖拽

### 问题 3: 文件路径正确但处理失败

**症状**:

```
file.path: C:\Users\...\Chrome.lnk
Processing dropped file: C:\Users\...\Chrome.lnk
Error processing dropped file: ...
```

**原因**:

- 文件不存在
- 快捷方式损坏
- 图标提取失败

**解决方案**: 查看后续的错误日志,定位具体问题

### 问题 4: dataTransfer.files 是空的

**症状**:

```
dataTransfer.files: FileList {length: 0}
files.length: 0
```

**原因**:

- 拖拽的不是文件
- 拖拽事件被阻止
- 浏览器安全策略

**解决方案**:

- 确保拖拽的是文件而不是文本或链接
- 检查 `@dragover.prevent` 和 `@drop.prevent` 是否正确

## 🛠️ 调试技巧

### 1. 检查 File 对象的所有属性

```javascript
console.log('Object.keys(file):', Object.keys(file))
console.log('Object.getOwnPropertyNames(file):', Object.getOwnPropertyNames(file))

// 遍历所有属性
for (let key in file) {
  console.log(`file.${key}:`, file[key])
}
```

### 2. 检查 Electron 版本

在控制台执行:

```javascript
console.log('Electron version:', process.versions.electron)
console.log('Chrome version:', process.versions.chrome)
console.log('Node version:', process.versions.node)
```

### 3. 测试不同类型的文件

- .exe 文件
- .lnk 快捷方式
- 桌面快捷方式
- 开始菜单快捷方式

### 4. 检查文件路径格式

```javascript
console.log('File path:', filePath)
console.log('Is absolute:', path.isAbsolute(filePath))
console.log('File exists:', fs.existsSync(filePath))
```

## 🔧 临时解决方案

如果拖拽功能无法正常工作,可以使用文件选择器:

1. 点击"点击选择应用程序"按钮
2. 在文件选择对话框中选择文件
3. 这种方式更可靠

## 📝 已知问题

### Electron 中的 File.path

在 Electron 中,`File` 对象有一个非标准的 `path` 属性,包含文件的绝对路径。但这个属性:

1. **不是标准 Web API** - 只在 Electron 中可用
2. **需要 sandbox: false** - 沙箱模式下不可用
3. **可能被安全策略阻止** - 某些配置下无法访问

### 替代方案

如果 `file.path` 不可用,可以考虑:

1. **使用 Electron 的 dialog API** - 更可靠
2. **使用 webContents.send** - 从主进程发送文件路径
3. **使用自定义协议** - 注册自定义 URL scheme

## 🎯 预期行为

### 正常流程

```
用户拖拽文件
    ↓
触发 drop 事件
    ↓
获取 dataTransfer.files[0]
    ↓
读取 file.path 属性
    ↓
验证文件路径
    ↓
调用 processFile(filePath)
    ↓
获取文件信息
    ↓
提取图标
    ↓
显示预览
    ↓
成功 ✅
```

### 错误流程

```
用户拖拽文件
    ↓
触发 drop 事件
    ↓
获取 dataTransfer.files[0]
    ↓
file.path 是 undefined ❌
    ↓
显示错误提示
    ↓
建议使用文件选择器
```

## 📚 相关资源

- [Electron File Object](https://www.electronjs.org/docs/latest/api/file-object)
- [HTML5 Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)

## 🔄 下一步

根据控制台的调试日志,我们可以:

1. **确认 file.path 是否可用**
2. **检查文件路径格式**
3. **定位具体的失败点**
4. **实施针对性的修复**

---

**请拖拽一个文件,然后将控制台的完整日志发送给我,我会根据日志进行进一步的分析和修复。**
