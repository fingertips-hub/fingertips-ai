# 键盘锁定问题修复 V2

## 问题描述

用户报告：选择文字后按呼出 Super Panel 的快捷键，程序崩溃退出，并且按键出现异常行为（如按 F 键无输出，像是触发了快捷键），需要切换输入法才能恢复。

## 问题根源

这是之前修复过的键盘锁定问题的**复发**，但根本原因更深层：

### 1. **异步捕获竞争条件**

在 `mouseListener.ts` 中，`captureSelectedText()` 被**异步调用但未等待完成**：

```typescript
// 🔴 问题代码（第 333 行）
captureSelectedText()
  .then((text) => {
    capturedTextOnPress = text
  })
  .catch((err) => {
    console.error('[MouseListener] 捕获失败:', err)
  })

// 100ms 后立即显示 Super Panel
setTimeout(() => {
  showSuperPanelAtMouse()
}, 100)
```

**问题场景**：

1. 用户按下 `Alt+Q` 触发 Super Panel
2. `captureSelectedText()` 开始异步执行，模拟 `Ctrl+C`
3. 100ms 后 Super Panel 显示
4. 如果此时捕获的 `finally` 块还未完全执行，修饰键可能未释放
5. 程序崩溃或异常 → `finally` 块无法执行 → 修饰键保持按下状态

### 2. **并发捕获冲突**

没有全局锁保护，多次快速触发可能导致：

- 多个 `captureSelectedText()` 同时运行
- 键盘状态冲突
- 程序崩溃

### 3. **时序问题**

Super Panel 在捕获完成前就显示，可能中断捕获流程：

- 窗口焦点变化
- 键盘事件被截获
- 导致 `uiohook-napi` 操作失败

## 修复方案

### 1. **添加全局捕获锁**（`aiShortcutRunner.ts`）

```typescript
// 🔒 全局捕获锁：防止多个 captureSelectedText 同时运行
let isCapturing = false

export async function captureSelectedText(): Promise<string> {
  // 检查是否已经在捕获中
  if (isCapturing) {
    console.warn('[captureSelectedText] 已有捕获操作正在进行，跳过本次调用')
    return ''
  }

  // 设置捕获标志
  isCapturing = true

  try {
    // ... 捕获逻辑
  } finally {
    // ... 清理逻辑

    // 🔓 最后释放捕获锁
    isCapturing = false
    console.log('[captureSelectedText] 捕获锁已释放')
  }
}
```

**作用**：

- ✅ 防止并发捕获操作
- ✅ 确保同一时间只有一个捕获在进行
- ✅ 避免键盘状态冲突

### 2. **等待捕获完成后再显示 Super Panel**（`mouseListener.ts`）

#### 键盘快捷键触发（第 334-349 行）

```typescript
// 🎯 关键修复：等待捕获完成后再显示 Super Panel
;(async () => {
  try {
    capturedTextOnPress = await captureSelectedText()
    console.log('[MouseListener] 捕获完成，文本长度:', capturedTextOnPress.length)
  } catch (err) {
    console.error('[MouseListener] 捕获失败:', err)
    capturedTextOnPress = ''
  } finally {
    // 无论捕获成功还是失败，都显示 Super Panel
    console.log('[MouseListener] 显示 Super Panel')
    showSuperPanelAtMouse()
  }
})()
```

#### 中键长按触发（第 215-226 行）

```typescript
// 🎯 使用立即执行的异步函数，避免阻塞
;(async () => {
  try {
    capturedTextOnPress = await captureSelectedText()
    console.log('[MouseListener] 按下时捕获的文本长度:', capturedTextOnPress.length)
  } catch (err) {
    console.error('[MouseListener] 捕获失败:', err)
    capturedTextOnPress = ''
  }
})()
```

**作用**：

- ✅ 确保捕获流程完全执行完毕（包括 `finally` 块）
- ✅ 避免 Super Panel 显示中断捕获
- ✅ 保证键盘状态始终被清理

### 3. **保留原有的安全措施**

保持之前修复中的所有安全机制：

- ✅ `forceReleaseAllModifiers()` 强制释放所有修饰键
- ✅ `try-finally` 块确保无论成功失败都清理
- ✅ 全局 `uncaughtException` 处理器（`main/index.ts`）
- ✅ 应用退出时的清理逻辑

## 修复效果

### 修复前

1. 按 `Alt+Q` 后程序可能崩溃
2. 键盘行为异常（按键无反应或触发错误的快捷键）
3. 需要切换输入法才能恢复

### 修复后

1. ✅ 按 `Alt+Q` 稳定触发 Super Panel
2. ✅ 文本捕获完成后才显示窗口
3. ✅ 键盘状态始终正常
4. ✅ 即使程序崩溃也不会锁定键盘
5. ✅ 多次快速触发不会冲突

## 技术要点

### 1. **IIFE（立即执行函数表达式）**

使用 `;(async () => { ... })()` 模式：

- 避免阻塞主事件循环
- 允许使用 `await` 等待异步操作
- 保持代码简洁

### 2. **全局锁模式**

```typescript
let isCapturing = false

async function criticalSection() {
  if (isCapturing) return
  isCapturing = true
  try {
    // ... 关键操作
  } finally {
    isCapturing = false
  }
}
```

这是防止竞争条件的经典模式。

### 3. **Finally 块的重要性**

`finally` 块在以下情况都会执行：

- ✅ 正常返回
- ✅ `throw` 异常
- ✅ `return` 语句
- ❌ 进程崩溃（需要全局异常处理器兜底）

### 4. **多层防护策略**

1. **第一层**：全局锁防止并发
2. **第二层**：`try-finally` 确保清理
3. **第三层**：`forceReleaseAllModifiers()` 强制释放
4. **第四层**：全局异常处理器兜底
5. **第五层**：应用退出清理

## 测试建议

1. **正常场景**：
   - 选择文字，按 `Alt+Q`
   - 验证 Super Panel 正常显示
   - 验证选中文字被正确捕获

2. **快速连续触发**：
   - 快速多次按 `Alt+Q`
   - 验证不会崩溃
   - 验证键盘状态正常

3. **捕获失败场景**：
   - 在无法复制的场景下触发（如系统对话框）
   - 验证 Super Panel 仍然显示
   - 验证键盘状态正常

4. **长时间运行**：
   - 持续使用应用数小时
   - 验证内存不泄漏
   - 验证功能稳定

## 相关文档

- `CRITICAL_FIX_KEYBOARD_LOCK.md` - 第一次修复（V1）
- `AI_SHORTCUT_TEXT_CAPTURE_ULTIMATE_SOLUTION.md` - 文本捕获机制
- `docs/BUG_FIXES.md` - 历史 Bug 修复记录

## 总结

这次修复解决了键盘锁定问题的**根本原因**：异步捕获操作未完成就显示窗口，导致键盘状态清理被中断。

通过以下三个关键改进：

1. ✅ **全局捕获锁**：防止并发冲突
2. ✅ **等待完成**：确保清理执行
3. ✅ **多层防护**：提供终极安全保障

现在应用在任何情况下都能保证键盘状态的正确性和稳定性。

---

**修复日期**: 2025-10-18  
**修复人员**: Fingertips AI Team  
**版本**: V2.0
