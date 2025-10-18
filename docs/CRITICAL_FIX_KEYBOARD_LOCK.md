# 🔴 关键修复：键盘锁定问题

## 问题描述

### 症状

启动插件后按呼出 Super Panel 的快捷键时：

1. 整个程序停止并退出
2. 电脑按键出现错误，所有按键行为异常
3. 必须切换输入法才能恢复正常

### 严重性

⚠️ **严重 (Critical)** - 影响系统级键盘输入，可能导致用户无法正常使用电脑

## 根本原因分析

### 问题定位

在 `src/main/modules/aiShortcutRunner.ts` 的 `captureSelectedText()` 函数中，使用 `uiohook-napi` 模拟键盘按键来捕获选中文本：

```typescript
// 🔴 问题代码
try {
  const ctrlKey = process.platform === 'darwin' ? UiohookKey.Meta : UiohookKey.Ctrl

  uIOhook.keyToggle(ctrlKey, 'down') // ← Ctrl 按下
  await new Promise((resolve) => setTimeout(resolve, 10))
  uIOhook.keyToggle(UiohookKey.C, 'down')
  await new Promise((resolve) => setTimeout(resolve, 10))
  uIOhook.keyToggle(UiohookKey.C, 'up')
  await new Promise((resolve) => setTimeout(resolve, 10))
  uIOhook.keyToggle(ctrlKey, 'up') // ← Ctrl 释放
} catch (err) {
  console.error('[captureSelectedText] uiohook 发送失败:', err)
  // ⚠️ 问题：这里只是返回，但 Ctrl 键可能仍然是按下状态！
  cachedSelectedText = ''
  return ''
}
```

### 问题机制

1. **键盘模拟异常**：
   - 如果在键盘模拟过程中（特别是在插件加载后）出现任何异常
   - Ctrl 键可能在 `keyToggle(ctrlKey, 'down')` 后但在 `keyToggle(ctrlKey, 'up')` 前失败
   - 导致 Ctrl 键保持在按下状态

2. **键盘状态锁定**：
   - 一旦 Ctrl 键被锁定为按下状态
   - 所有后续按键都会变成 Ctrl+按键组合
   - 例如：按 `A` 变成 `Ctrl+A`（全选），按 `C` 变成 `Ctrl+C`（复制）

3. **系统级影响**：
   - `uiohook-napi` 是系统级全局 hook
   - 键盘状态锁定会影响整个系统，不仅仅是应用程序
   - 程序崩溃时如果没有清理，键盘会一直保持异常状态

4. **恢复机制**：
   - 切换输入法会触发系统重新初始化键盘状态
   - 这就是为什么切换输入法可以临时解决问题

## 解决方案

### 修复策略

采用**多层防护机制**确保键盘状态在任何情况下都能被正确清理：

#### 1. 状态追踪机制

使用变量追踪 Ctrl 键的状态：

```typescript
let ctrlKeyPressed = false
const ctrlKey = process.platform === 'darwin' ? UiohookKey.Meta : UiohookKey.Ctrl

try {
  // 按下 Ctrl
  uIOhook.keyToggle(ctrlKey, 'down')
  ctrlKeyPressed = true  // ← 标记为已按下

  // ... 其他操作 ...

  // 释放 Ctrl
  uIOhook.keyToggle(ctrlKey, 'up')
  ctrlKeyPressed = false  // ← 标记为已释放
}
```

#### 2. Finally 块保证清理

无论成功还是失败，都在 finally 块中清理：

```typescript
finally {
  // 🔑 关键安全措施：无论成功还是失败，都要确保释放所有修饰键
  if (ctrlKeyPressed) {
    try {
      console.log('[captureSelectedText] Finally: 释放 Ctrl 键')
      uIOhook.keyToggle(ctrlKey, 'up')
    } catch (err) {
      console.error('[captureSelectedText] Finally: 释放 Ctrl 键失败:', err)
    }
  }

  // 额外的安全措施：强制释放所有修饰键
  forceReleaseAllModifiers()

  // 等待按键释放生效
  await new Promise((resolve) => setTimeout(resolve, 50))
  console.log('[captureSelectedText] 捕获流程结束，键盘状态已清理')
}
```

#### 3. 强制释放所有修饰键

创建专用函数强制释放所有可能的修饰键：

```typescript
function forceReleaseAllModifiers(): void {
  try {
    console.log('[captureSelectedText] 强制释放所有修饰键...')
    const modifiers = [
      UiohookKey.Alt,
      UiohookKey.Shift,
      UiohookKey.ShiftRight,
      UiohookKey.Ctrl,
      UiohookKey.CtrlRight,
      UiohookKey.Meta,
      UiohookKey.MetaRight
    ]

    for (const key of modifiers) {
      try {
        uIOhook.keyToggle(key, 'up')
      } catch {
        // 忽略单个按键释放失败
      }
    }
    console.log('[captureSelectedText] 所有修饰键已释放')
  } catch (error) {
    console.error('[captureSelectedText] 释放修饰键时出错:', error)
  }
}
```

#### 4. 程序退出时清理

确保程序退出前停止 uiohook：

```typescript
app.on('before-quit', () => {
  console.log('Application is about to quit, cleaning up...')

  // 🔑 关键：停止全局鼠标/键盘监听器
  try {
    console.log('[Cleanup] Stopping global mouse listener...')
    stopGlobalMouseListener()
    console.log('[Cleanup] ✓ Global mouse listener stopped successfully')
  } catch (error) {
    console.error('[Cleanup] ✗ Error stopping global mouse listener:', error)
  }

  // ... 其他清理 ...
})
```

#### 5. 全局异常处理

捕获未处理的异常，紧急清理：

```typescript
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error)

  // 立即停止 uiohook，防止键盘被锁定
  try {
    console.error('[Emergency] Stopping global mouse listener...')
    stopGlobalMouseListener()
    console.error('[Emergency] ✓ Global mouse listener stopped')
  } catch (err) {
    console.error('[Emergency] ✗ Failed to stop mouse listener:', err)
  }

  // 给一点时间让清理完成
  setTimeout(() => {
    process.exit(1)
  }, 100)
})
```

## 修改文件清单

### 修改的文件

1. **src/main/modules/aiShortcutRunner.ts**
   - 添加 `forceReleaseAllModifiers()` 函数
   - 重构 `captureSelectedText()` 函数
   - 添加状态追踪变量 `ctrlKeyPressed`
   - 添加 finally 块确保清理
   - 添加详细的日志记录

2. **src/main/index.ts**
   - 增强 `before-quit` 事件处理
   - 添加详细的清理日志
   - 添加 `uncaughtException` 全局异常处理
   - 添加 `unhandledRejection` 处理

## 防护机制总结

### 多层防护

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: 状态追踪                                    │
│ - ctrlKeyPressed 变量追踪按键状态                    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 2: Try-Catch-Finally                          │
│ - finally 块确保清理执行                             │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 3: 强制释放所有修饰键                          │
│ - forceReleaseAllModifiers() 兜底保护               │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 4: 程序退出清理                                │
│ - before-quit 事件处理                              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 5: 全局异常处理                                │
│ - uncaughtException 紧急清理                        │
└─────────────────────────────────────────────────────┘
```

### 关键改进点

1. ✅ **状态追踪** - 明确知道哪些按键需要释放
2. ✅ **异常安全** - finally 块保证清理代码必定执行
3. ✅ **多次清理** - 多个时机多次尝试清理，确保万无一失
4. ✅ **容错处理** - 每个清理步骤都有独立的 try-catch
5. ✅ **详细日志** - 完整的日志追踪，便于问题诊断
6. ✅ **紧急清理** - 全局异常处理提供最后的安全网

## 测试验证

### 测试场景

1. **正常流程测试**
   - 按快捷键呼出 Super Panel
   - 验证键盘功能正常

2. **异常情况测试**
   - 在文本捕获过程中强制终止程序
   - 验证键盘功能正常（不需要切换输入法）

3. **连续操作测试**
   - 连续多次触发快捷键
   - 验证键盘状态始终正常

4. **插件加载测试**
   - 启动插件后立即触发快捷键
   - 验证不会出现键盘锁定

## 预防措施

### 开发指南

在使用 `uiohook-napi` 进行键盘模拟时，务必遵循以下原则：

1. **状态追踪** - 记录所有按下的按键状态
2. **Finally 清理** - 在 finally 块中释放所有按键
3. **容错处理** - 每个 keyToggle 都要有错误处理
4. **超时保护** - 添加超时机制防止无限等待
5. **日志记录** - 记录详细的操作日志便于调试

### 代码模板

```typescript
async function safeKeyboardSimulation() {
  const pressedKeys: Set<number> = new Set()

  try {
    // 模拟按键操作
    const key = UiohookKey.Ctrl
    uIOhook.keyToggle(key, 'down')
    pressedKeys.add(key) // 记录已按下的键

    // ... 其他操作 ...

    uIOhook.keyToggle(key, 'up')
    pressedKeys.delete(key) // 记录已释放的键
  } catch (error) {
    console.error('键盘模拟失败:', error)
    throw error
  } finally {
    // 清理所有未释放的按键
    for (const key of pressedKeys) {
      try {
        uIOhook.keyToggle(key, 'up')
      } catch (err) {
        console.error('释放按键失败:', err)
      }
    }
    pressedKeys.clear()
  }
}
```

## 相关资源

- [uiohook-napi 文档](https://github.com/SnosMe/uiohook-napi)
- [Electron 进程管理](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Node.js 异常处理](https://nodejs.org/api/process.html#process_event_uncaughtexception)

---

**修复日期**: 2025-10-18  
**严重性**: Critical  
**状态**: ✅ 已修复
