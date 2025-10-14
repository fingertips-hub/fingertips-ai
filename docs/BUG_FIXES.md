# Bug 修复记录

## [2025-01-12] - 拖拽功能修复 (使用 webUtils API)

### 🐛 问题: 拖拽快捷方式无法获取文件路径

**错误现象**:

- 拖拽 .lnk 文件到添加区域
- 控制台显示 `file.path: undefined`
- 无法加载应用程序

**根本原因**:

在 Electron 中启用 `contextIsolation: true` 后,渲染进程无法直接访问 `File` 对象的 `path` 属性。这是 Electron 的安全机制。

**调试日志**:

```
File object: File {name: '微信.lnk', ...}
file.path: undefined
File path is invalid: undefined
```

**解决方案**:

使用 Electron 提供的 `webUtils.getPathForFile()` API,这是官方推荐的方式。

#### 1. 在 preload 脚本中暴露 API

```typescript
// src/preload/index.ts
import { webUtils } from 'electron'

const api = {
  launcher: {
    // 从 File 对象获取路径
    getFilePath: (file: File) => {
      try {
        const path = webUtils.getPathForFile(file)
        console.log('Got file path from webUtils:', path)
        return path
      } catch (error) {
        console.error('Error getting file path:', error)
        return null
      }
    }
  }
}
```

#### 2. 在渲染进程中使用

```typescript
// src/renderer/src/components/super-panel/AddFileView.vue
async function handleDrop(event: DragEvent) {
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return

  const file = files[0]

  // 使用 webUtils API 获取文件路径
  const filePath = window.api.launcher.getFilePath(file)

  if (filePath) {
    await handleDroppedFile(filePath)
  }
}
```

**修改文件**:

1. `src/preload/index.ts` - 添加 `getFilePath` API
2. `src/preload/index.d.ts` - 添加类型定义
3. `src/renderer/src/components/super-panel/AddFileView.vue` - 使用新 API

**效果**:

- ✅ 拖拽功能正常工作
- ✅ 可以正确获取文件路径
- ✅ 符合 Electron 安全最佳实践

---

## [2025-01-12] - 拖拽和图标提取问题修复

### 🐛 问题 1: 拖拽快捷方式报错

**错误信息**:

```
Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'endsWith')
    at handleDrop (AddFileView.vue:194:17)
```

**根本原因**:

- 在某些情况下,`File` 对象的 `path` 属性可能是 `undefined`
- 直接调用 `filePath.endsWith()` 导致报错

**解决方案**:

1. **添加路径验证**:

```typescript
const file = files[0]

// Electron 中 File 对象有 path 属性
const filePath = (file as any).path

if (!filePath) {
  console.error('Cannot get file path from dropped file:', file)
  toast.error('无法获取文件路径')
  return
}
```

2. **添加日志输出**:

```typescript
console.log('Dropped file path:', filePath)
```

**修改文件**: `src/renderer/src/components/super-panel/AddFileView.vue`

---

### 🐛 问题 2: 部分程序图标显示不了

**现象**: 某些应用程序的图标无法正确提取和显示。

**可能原因**:

1. 文件路径无效或不是绝对路径
2. 文件不存在
3. 快捷方式指向的目标文件不存在
4. 图标文件损坏或无法访问

**解决方案**:

#### 1. 添加文件路径验证

```typescript
// 验证文件路径
if (!filePath || typeof filePath !== 'string') {
  console.error('Invalid file path:', filePath)
  return null
}

// 检查是否是绝对路径
if (!isAbsolute(filePath)) {
  console.error('File path is not absolute:', filePath)
  return null
}

// 检查文件是否存在
if (!existsSync(filePath)) {
  console.error('File does not exist:', filePath)
  return null
}
```

#### 2. 在 extractIconDirect 中也添加验证

```typescript
async function extractIconDirect(filePath: string): Promise<string | null> {
  try {
    // 验证文件路径
    if (!filePath || typeof filePath !== 'string') {
      console.error('Invalid file path in extractIconDirect:', filePath)
      return null
    }

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      console.error('File does not exist in extractIconDirect:', filePath)
      return null
    }

    // ... 提取图标
  } catch (error) {
    console.error('Error in extractIconDirect:', error)
    console.error('File path was:', filePath)
    return null
  }
}
```

#### 3. 改进错误日志

- 添加详细的错误信息
- 记录失败的文件路径
- 帮助调试和定位问题

**修改文件**: `src/main/utils/iconExtractor.ts`

---

### 📝 修改的文件

1. **src/renderer/src/components/super-panel/AddFileView.vue**
   - 修改 `handleDrop` 函数
   - 添加 `filePath` 验证
   - 添加错误提示和日志

2. **src/main/utils/iconExtractor.ts**
   - 导入 `isAbsolute` 和 `existsSync`
   - 在 `extractIcon` 中添加路径验证
   - 在 `extractIconDirect` 中添加路径验证
   - 改进错误日志输出

---

### 🔍 调试建议

#### 1. 查看控制台日志

打开开发者工具(F12),查看以下日志:

**拖拽文件时**:

```
Dropped file path: C:\Users\...\app.lnk
Extracting icon from .lnk file: C:\Users\...\app.lnk
Shortcut data: { target: '...', icon: '...' }
```

**图标提取失败时**:

```
File does not exist: C:\invalid\path.exe
Icon is empty for: C:\valid\path.exe
Error in extractIconDirect: [Error details]
```

#### 2. 检查文件路径

确保:

- 文件路径是绝对路径
- 文件确实存在
- 对于快捷方式,目标文件存在
- 文件没有被其他程序锁定

#### 3. 测试不同类型的文件

- ✅ 直接的 .exe 文件
- ✅ 桌面快捷方式 .lnk
- ✅ 开始菜单快捷方式
- ⚠️ 网络路径的快捷方式(可能失败)
- ⚠️ 损坏的快捷方式(会失败)

---

### 🎯 预期效果

#### 修复前

- ❌ 拖拽某些文件时报错
- ❌ 部分图标无法显示
- ❌ 错误信息不明确

#### 修复后

- ✅ 拖拽文件有完善的错误处理
- ✅ 图标提取有详细的验证
- ✅ 错误日志清晰明确
- ✅ 用户收到友好的错误提示

---

### 📊 错误处理流程

```
用户拖拽文件
    ↓
检查 dataTransfer.files
    ↓
获取 file.path
    ↓
验证 path 不为空 ❌ → 提示"无法获取文件路径"
    ↓
验证文件扩展名 ❌ → 提示"仅支持 .exe 和 .lnk 文件"
    ↓
调用 processFile(filePath)
    ↓
调用 extractIcon(filePath)
    ↓
验证路径有效性 ❌ → 返回 null
    ↓
验证文件存在 ❌ → 返回 null
    ↓
提取图标
    ↓
成功 ✅ → 返回 base64
失败 ❌ → 返回 null → 使用默认图标
```

---

### 💡 最佳实践

#### 1. 文件路径处理

```typescript
// ✅ 正确: 验证后使用
const filePath = (file as any).path
if (!filePath) {
  // 处理错误
  return
}

// ❌ 错误: 直接使用
const filePath = file.path
filePath.endsWith('.exe') // 可能报错
```

#### 2. 错误提示

```typescript
// ✅ 正确: 友好的用户提示
toast.error('无法获取文件路径')

// ❌ 错误: 技术性错误信息
toast.error('Cannot read properties of undefined')
```

#### 3. 日志记录

```typescript
// ✅ 正确: 详细的调试信息
console.error('File does not exist:', filePath)
console.error('Error in extractIconDirect:', error)
console.error('File path was:', filePath)

// ❌ 错误: 简单的错误信息
console.error('Error')
```

---

### 🧪 测试用例

#### 测试 1: 拖拽正常的 .exe 文件

- [ ] 拖拽一个 .exe 文件
- [ ] 验证图标正确显示
- [ ] 验证没有错误

#### 测试 2: 拖拽正常的 .lnk 文件

- [ ] 拖拽一个快捷方式
- [ ] 验证图标正确显示
- [ ] 验证没有错误

#### 测试 3: 拖拽不支持的文件

- [ ] 拖拽一个 .txt 文件
- [ ] 验证显示错误提示
- [ ] 验证提示内容正确

#### 测试 4: 拖拽损坏的快捷方式

- [ ] 拖拽一个指向不存在文件的快捷方式
- [ ] 验证显示警告(无法提取图标)
- [ ] 验证可以继续添加(使用默认图标)

---

## 总结

通过添加完善的验证和错误处理:

1. ✅ 修复了拖拽文件时的崩溃问题
2. ✅ 改进了图标提取的可靠性
3. ✅ 提供了清晰的错误日志
4. ✅ 给用户友好的错误提示

现在应用可以更稳定地处理各种文件和边界情况。
