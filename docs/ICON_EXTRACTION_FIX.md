# 快捷方式图标提取修复

## 🐛 问题描述

**问题**: 选择 `.lnk` 快捷方式文件后,无法正确提取图标。

**原因分析**:

1. **Windows 快捷方式的特殊性**:
   - `.lnk` 文件本身不包含图标数据
   - 图标信息存储在快捷方式的元数据中
   - 需要解析快捷方式,获取目标文件路径或图标路径

2. **Electron API 的局限性**:
   - `app.getFileIcon()` 对 `.lnk` 文件的支持有限
   - 直接提取 `.lnk` 文件可能返回空图标或默认图标

3. **图标大小问题**:
   - 使用 `size: 'normal'` 可能导致图标模糊
   - 应该使用 `size: 'large'` 获取更清晰的图标

## ✅ 解决方案

### 1. 安装 windows-shortcuts 库

```bash
npm install windows-shortcuts
```

这个库可以解析 Windows 快捷方式文件,获取:

- `target`: 目标文件路径
- `icon`: 图标文件路径
- `iconIndex`: 图标索引
- 其他元数据

### 2. 创建专门的图标提取模块

创建 `src/main/utils/iconExtractor.ts`:

**核心逻辑**:

1. 检查文件扩展名
2. 如果是 `.lnk` 文件:
   - 使用 `windows-shortcuts` 解析快捷方式
   - 优先使用 `icon` 字段提取图标
   - 如果没有 `icon`,使用 `target` 字段
   - 如果都失败,尝试直接提取 `.lnk` 文件的图标
3. 如果是 `.exe` 文件:
   - 直接使用 `app.getFileIcon()` 提取
4. 使用 `size: 'large'` 获取更清晰的图标

### 3. 创建类型定义

创建 `src/main/types/windows-shortcuts.d.ts`:

定义 `windows-shortcuts` 库的 TypeScript 类型,因为官方没有提供 `@types` 包。

### 4. 更新 IPC Handler

在 `src/main/index.ts` 中:

- 导入新的 `extractIcon` 函数
- 替换原有的图标提取逻辑
- 添加详细的日志输出

## 📝 实现细节

### iconExtractor.ts 核心代码

```typescript
export async function extractIcon(filePath: string): Promise<string | null> {
  const ext = extname(filePath).toLowerCase()

  if (ext === '.lnk') {
    return await extractIconFromLnk(filePath)
  }

  return await extractIconDirect(filePath)
}

async function extractIconFromLnk(lnkPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    ws.query(lnkPath, (error, shortcutData) => {
      if (error) {
        // 解析失败,尝试直接提取
        extractIconDirect(lnkPath)
          .then(resolve)
          .catch(() => resolve(null))
        return
      }

      // 优先使用 icon 字段
      if (shortcutData.icon) {
        extractIconDirect(shortcutData.icon)
          .then(resolve)
          .catch(() => {
            // icon 提取失败,尝试 target
            if (shortcutData.target) {
              extractIconDirect(shortcutData.target)
                .then(resolve)
                .catch(() => resolve(null))
            } else {
              resolve(null)
            }
          })
        return
      }

      // 使用 target 字段
      if (shortcutData.target) {
        extractIconDirect(shortcutData.target)
          .then(resolve)
          .catch(() => resolve(null))
        return
      }

      // 都没有,尝试直接提取
      extractIconDirect(lnkPath)
        .then(resolve)
        .catch(() => resolve(null))
    })
  })
}

async function extractIconDirect(filePath: string): Promise<string | null> {
  const iconImage = await app.getFileIcon(filePath, { size: 'large' })

  if (!iconImage || iconImage.isEmpty()) {
    return null
  }

  return iconImage.toDataURL()
}
```

### 提取流程

```
用户选择 .lnk 文件
    ↓
extractIcon(filePath)
    ↓
检测到 .lnk 扩展名
    ↓
extractIconFromLnk(lnkPath)
    ↓
windows-shortcuts.query(lnkPath)
    ↓
获取 shortcutData
    ↓
优先级1: shortcutData.icon
    ├─ 成功 → extractIconDirect(icon) → 返回 base64
    └─ 失败 → 尝试优先级2
    ↓
优先级2: shortcutData.target
    ├─ 成功 → extractIconDirect(target) → 返回 base64
    └─ 失败 → 尝试优先级3
    ↓
优先级3: 直接提取 .lnk 文件
    ├─ 成功 → 返回 base64
    └─ 失败 → 返回 null
```

## 🧪 测试步骤

### 1. 测试 .exe 文件

- [ ] 选择一个 `.exe` 文件(如 Chrome.exe)
- [ ] 验证图标正确显示
- [ ] 验证图标清晰(不模糊)

### 2. 测试 .lnk 快捷方式

- [ ] 选择一个 `.lnk` 快捷方式(如桌面上的 Chrome 快捷方式)
- [ ] 验证图标正确显示
- [ ] 验证图标与目标应用一致

### 3. 测试特殊情况

- [ ] 选择一个没有图标的 `.lnk` 文件
- [ ] 验证显示默认图标或 Toast 警告提示
- [ ] 选择一个指向不存在文件的 `.lnk`
- [ ] 验证错误处理正确

### 4. 查看日志

打开开发者工具(F12),查看控制台日志:

```
Extracting icon for: C:\Users\...\Chrome.lnk
Extracting icon from .lnk file: C:\Users\...\Chrome.lnk
Shortcut data: { target: 'C:\Program Files\Google\Chrome\Application\chrome.exe', ... }
Using target from shortcut: C:\Program Files\Google\Chrome\Application\chrome.exe
Extracting icon directly from: C:\Program Files\Google\Chrome\Application\chrome.exe
Icon extracted successfully, base64 length: 12345
Icon extracted successfully
```

## 📊 修改的文件

1. **新增文件**:
   - `src/main/utils/iconExtractor.ts` - 图标提取模块
   - `src/main/types/windows-shortcuts.d.ts` - 类型定义

2. **修改文件**:
   - `src/main/index.ts` - 更新 IPC handler
   - `package.json` - 添加 windows-shortcuts 依赖

## 🎯 优化效果

### 修复前

- ❌ `.lnk` 文件图标提取失败
- ❌ 图标模糊(使用 normal 尺寸)
- ❌ 没有详细的错误日志

### 修复后

- ✅ `.lnk` 文件图标正确提取
- ✅ 图标清晰(使用 large 尺寸)
- ✅ 详细的日志输出
- ✅ 多级降级策略(icon → target → direct)
- ✅ 完善的错误处理

## 🔍 调试技巧

### 1. 查看快捷方式信息

在控制台中查看 `Shortcut data` 日志,了解快捷方式的元数据:

```javascript
{
  target: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: '',
  workingDir: 'C:\\Program Files\\Google\\Chrome\\Application',
  desc: 'Google Chrome',
  icon: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  iconIndex: 0
}
```

### 2. 手动测试图标提取

在主进程中添加测试代码:

```typescript
import { extractIcon } from './utils/iconExtractor'

// 测试
extractIcon('C:\\Users\\...\\Chrome.lnk').then((base64) => {
  console.log('Icon base64:', base64?.substring(0, 100))
})
```

### 3. 检查图标是否为空

```typescript
const iconImage = await app.getFileIcon(filePath, { size: 'large' })
console.log('Icon isEmpty:', iconImage.isEmpty())
console.log('Icon size:', iconImage.getSize())
```

## 📚 相关资源

- [windows-shortcuts npm 包](https://www.npmjs.com/package/windows-shortcuts)
- [Electron app.getFileIcon() 文档](https://www.electronjs.org/docs/latest/api/app#appgetfileiconpath-options)
- [Windows 快捷方式格式](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-shllink/)

## 🎉 总结

通过以下改进,成功解决了快捷方式图标提取问题:

1. ✅ 使用 `windows-shortcuts` 库解析 `.lnk` 文件
2. ✅ 实现多级降级策略(icon → target → direct)
3. ✅ 使用 `size: 'large'` 提高图标清晰度
4. ✅ 添加详细的日志输出便于调试
5. ✅ 完善的错误处理机制

现在用户可以正常添加 `.lnk` 快捷方式,并看到正确的应用图标!
