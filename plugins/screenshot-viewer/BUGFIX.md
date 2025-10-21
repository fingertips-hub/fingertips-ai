# 截图加载问题修复说明

## 🐛 问题描述

网页无法加载截图，窗口显示"正在加载截图..."但一直没有显示图片。

## 🔍 根本原因分析

### 问题 1：时序不确定性

```javascript
// ❌ 原来的代码
setTimeout(() => {
  window.send('screenshot-data', dataURL)
}, 500)
```

- 使用固定的 500ms 延迟不可靠
- 窗口加载速度受多种因素影响（系统性能、资源大小等）
- 可能在 IPC 监听器注册之前就发送了数据

### 问题 2：IPC 监听器注册时机

```javascript
// ❌ 原来的代码
if (window.electron && window.electron.ipcRenderer) {
  window.electron.ipcRenderer.on('screenshot-data', (_event, dataURL) => {
    // ...
  })
}
```

- 脚本直接执行时，`window.electron` 可能还未被 preload 注入
- 没有等待 DOM 加载完成
- 监听器可能注册失败，导致无法接收数据

### 问题 3：缺少错误处理

- 没有超时处理
- 没有失败提示
- 难以调试和排查问题

### 问题 4：Sandbox 模式导致 Electron API 不可用 ⚠️

**最关键的问题！**

```javascript
// ❌ 插件窗口配置
webPreferences: {
  sandbox: true,  // 导致 preload 脚本注入失败
  preload: path.join(__dirname, '../preload/index.js')
}

// ✅ 主窗口配置
webPreferences: {
  sandbox: false,  // 正确配置
  preload: join(__dirname, '../preload/index.js')
}
```

**问题说明：**

- 插件窗口使用了 `sandbox: true`
- Sandbox 模式下，preload 脚本的某些功能受限
- 导致 `window.electron` 对象无法正确注入
- 最终导致 "Electron API 不可用" 错误

## ✅ 解决方案

### 方案 1：修复 Sandbox 配置（必需）

**最关键的修复！**

修改 `src/main/modules/pluginWindowManager.ts`：

```javascript
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: false, // ✅ 改为 false，与主窗口保持一致
  webSecurity: true,
  allowRunningInsecureContent: false,
  preload: path.join(__dirname, '../preload/index.js')
}
```

**为什么要修改？**

- 主窗口使用 `sandbox: false` 且工作正常
- Sandbox 模式下 preload 脚本注入存在兼容性问题
- 保持与主窗口配置一致，确保稳定性

### 方案 2：采用请求-响应模式（Pull Model）

**核心思想**：让窗口主动请求数据，而不是被动等待推送。

#### 1. 主进程注册 IPC 处理器

```javascript
// index.js
activate(context) {
  const { ipc } = context

  // 注册处理器：窗口准备好后来请求数据
  ipc.handle('request-screenshot', async () => {
    const dataURL = module.exports.pendingScreenshot
    module.exports.pendingScreenshot = null
    return { success: true, dataURL }
  })
}
```

#### 2. 保存截图数据

```javascript
// execute() 方法中
// 保存截图数据，等待窗口请求
module.exports.pendingScreenshot = dataURL

// 创建窗口（不需要延迟发送）
const window = await api.window.create({
  title: '截图查看器',
  html: 'ui/viewer.html'
})
```

#### 3. 窗口加载完成后请求数据（带等待机制）

```javascript
// viewer.html

// 等待 Electron API 准备就绪（防御性编程）
async function waitForElectronAPI(timeout = 5000) {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (window.electron && window.electron.ipcRenderer) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  return false
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    // 等待 API 准备就绪
    const apiReady = await waitForElectronAPI()
    if (!apiReady) {
      throw new Error('Electron API 不可用（超时）')
    }

    // 主动请求截图数据
    const response = await window.electron.ipcRenderer.invoke(
      'plugin:screenshot-viewer:request-screenshot'
    )

    if (response && response.success && response.dataURL) {
      displayScreenshot(response.dataURL)
    }
  } catch (error) {
    // 显示错误信息
    console.error('加载截图失败:', error)
  }
})
```

## 🎯 修复优势

### 1. ✅ 可靠的时序控制

- 窗口完全加载后才请求数据
- 使用 `DOMContentLoaded` 事件确保 DOM 已准备好
- 不依赖任意的延迟时间

### 2. ✅ 清晰的数据流

```
[截图完成] → [保存数据] → [创建窗口]
     ↓
[窗口加载] → [请求数据] → [显示截图]
```

### 3. ✅ 完善的错误处理

- 检查 API 可用性
- 验证响应数据
- 显示友好的错误信息
- 完整的日志输出

### 4. ✅ 更好的调试体验

- 每个步骤都有 `console.log` 输出
- 可以追踪数据流转过程
- 错误信息清晰明确

## 📊 对比

| 特性       | 原实现（Push） | 新实现（Pull） |
| ---------- | -------------- | -------------- |
| 时序控制   | ❌ 不可靠      | ✅ 可靠        |
| 错误处理   | ❌ 缺失        | ✅ 完善        |
| 调试难度   | ⚠️ 困难        | ✅ 简单        |
| 代码复杂度 | ✅ 简单        | ⚠️ 稍复杂      |
| 可维护性   | ❌ 低          | ✅ 高          |

## 🧪 测试验证

### 控制台输出示例（成功）

```
截图查看器插件已激活
开始截图...
截图成功，准备显示...
查看器窗口已创建: screenshot-viewer-window-1
截图查看器页面已加载
收到截图数据响应: { success: true, dataURL: "data:image/png..." }
```

### 控制台输出示例（失败）

```
截图查看器页面已加载
加载截图失败: Error: 未获取到截图数据
```

## 🔧 IPC Channel 说明

完整的 channel 命名规则：

```
plugin:{plugin-id}:{channel-name}
```

示例：

- 插件 ID：`screenshot-viewer`
- Channel 名称：`request-screenshot`
- 完整 channel：`plugin:screenshot-viewer:request-screenshot`

这个前缀由 `pluginAPI.ts` 自动添加，用于避免不同插件间的命名冲突。

## 💡 最佳实践

1. **使用事件监听**：用 `DOMContentLoaded` 确保 DOM 准备好
2. **主动请求**：让接收方控制数据获取时机
3. **错误优先**：先检查错误情况，再处理正常流程
4. **详细日志**：关键步骤都输出日志，便于排查问题
5. **用户友好**：显示清晰的加载状态和错误信息
