# 🔓 系统锁定后快捷键失效问题修复

## 问题描述

### 症状

当用户按 `Win+L` 锁定 Windows 屏幕后再解锁，所有绑定的快捷键都不起作用。

### 影响范围

- 鼠标长按触发（如 `Ctrl+LongPress:Middle`）
- 键盘快捷键触发（如 `Alt+Q`）
- AI 快捷指令的快捷键

## 根本原因分析

### 技术细节

1. **uIOhook 在系统锁定后失效**：
   - `uiohook-napi` 使用 Windows 系统级钩子（类似 `SetWindowsHookEx`）
   - 当用户按 `Win+L` 锁定会话时，Windows 会挂起用户会话
   - 系统级钩子在会话挂起时会被系统移除或失效
   - **解锁后钩子不会自动恢复**

2. **状态追踪不准确**：
   - `isListening` 变量仍然保持为 `true`
   - `setupGlobalMouseListener()` 检查到已在监听状态，直接返回
   - 导致即使钩子失效，也无法重新启动监听器

3. **修饰键状态残留**：
   - 如果锁定时有修饰键按下，`activeModifiers` 集合不会清除
   - 可能导致状态不一致

4. **缺少系统事件监听**：
   - 原代码中没有监听系统的锁定/解锁事件
   - 无法在适当时机做相应处理

## 解决方案

### 1. 添加系统事件监听 (`src/main/index.ts`)

使用 Electron 的 `powerMonitor` API 监听以下系统事件：

- **`lock-screen`**：系统锁定时触发
  - 清除修饰键状态，避免按键状态残留
- **`unlock-screen`**：系统解锁时触发
  - 延迟 500ms 后重启 uIOhook 监听器
  - 给系统足够时间完全恢复

- **`resume`**：系统从睡眠/休眠恢复时触发
  - 延迟 1000ms 后重启 uIOhook 监听器
  - 确保系统完全唤醒后再启动钩子

### 2. 添加重启机制 (`src/main/modules/mouseListener.ts`)

新增以下功能函数：

#### `restartGlobalMouseListener()`

- 安全地停止现有监听器
- 重置所有状态（`isListening`、`activeModifiers`、长按状态等）
- 延迟 100ms 后重新启动
- 如果失败，1 秒后再次尝试（重试机制）

#### `clearModifierStates()`

- 清除修饰键状态
- 取消长按检测
- 用于系统锁定时清理状态

### 3. 健康检查机制

实现自动健康监测：

#### 事件追踪

- 在所有鼠标和键盘事件处理器中更新 `lastEventTime`
- 追踪最后一次收到系统事件的时间

#### 定期检查

- 每 30 秒检查一次 uIOhook 状态
- 如果超过 5 分钟没有收到任何事件，认为钩子可能失效
- 自动触发重启机制

#### 生命周期管理

- 在 `setupGlobalMouseListener()` 中启动健康检查
- 在 `stopGlobalMouseListener()` 中停止健康检查

### 4. 改进停止机制

在 `stopGlobalMouseListener()` 中：

- 停止健康检查
- 清除所有状态（修饰键、长按等）
- 确保完全清理

## 实现细节

### 关键代码修改

#### 主进程 (index.ts)

```typescript
import { powerMonitor } from 'electron'

// 在 app.whenReady() 中添加
powerMonitor.on('lock-screen', () => {
  clearModifierStates()
})

powerMonitor.on('unlock-screen', () => {
  setTimeout(() => {
    restartGlobalMouseListener()
  }, 500)
})

powerMonitor.on('resume', () => {
  setTimeout(() => {
    restartGlobalMouseListener()
  }, 1000)
})
```

#### 监听器模块 (mouseListener.ts)

```typescript
// 健康检查状态
let lastEventTime = Date.now()
let healthCheckInterval: NodeJS.Timeout | null = null

// 在所有事件处理器中更新时间
uIOhook.on('keydown', (event) => {
  lastEventTime = Date.now()
  // ... 其他处理
})

// 健康检查函数
function startHealthCheck(): void {
  healthCheckInterval = setInterval(() => {
    const timeSinceLastEvent = Date.now() - lastEventTime
    if (timeSinceLastEvent > 5 * 60 * 1000) {
      restartGlobalMouseListener()
    }
  }, 30000)
}
```

## 测试验证

### 测试步骤

1. **基本功能测试**：
   - 启动应用
   - 测试快捷键是否正常工作
   - 测试鼠标长按触发是否正常

2. **锁屏解锁测试**：
   - 按 `Win+L` 锁定屏幕
   - 输入密码解锁
   - 等待 1-2 秒
   - 测试快捷键是否恢复正常工作

3. **睡眠唤醒测试**：
   - 让电脑进入睡眠模式
   - 唤醒电脑
   - 等待 2-3 秒
   - 测试快捷键是否恢复正常工作

4. **长时间空闲测试**：
   - 保持应用运行
   - 6 分钟内不触碰鼠标和键盘
   - 健康检查应该不会触发重启（因为阈值是 5 分钟）
   - 然后测试快捷键是否仍然正常

### 预期结果

- ✅ 所有快捷键在锁屏解锁后应该自动恢复
- ✅ 控制台应该显示 "System unlocked, restarting mouse listener..."
- ✅ 控制台应该显示 "✓ Mouse listener restarted successfully"
- ✅ 不应该有任何错误信息

## 日志参考

### 正常锁屏解锁流程

```
===============================================
🔒 System locked, cleaning up mouse listener state...
===============================================
[Lock] ✓ Modifier states cleared
[MouseListener] Modifier states cleared

===============================================
🔓 System unlocked, restarting mouse listener...
===============================================
[MouseListener] Restarting global mouse listener...
[MouseListener] Stopped existing listener
[MouseListener] ✓ Global mouse listener restarted successfully
[Unlock] ✓ Mouse listener restarted successfully
[HealthCheck] Health check started
Global mouse listener started
```

### 系统恢复流程

```
===============================================
⚡ System resumed from suspend, restarting mouse listener...
===============================================
[MouseListener] Restarting global mouse listener...
[MouseListener] Stopped existing listener
[MouseListener] ✓ Global mouse listener restarted successfully
[Resume] ✓ Mouse listener restarted successfully
```

### 健康检查触发（异常情况）

```
===============================================
⚠️ Health Check: No events received for 301s
uIOhook may have stopped working, attempting restart...
===============================================
[MouseListener] Restarting global mouse listener...
[HealthCheck] ✓ Mouse listener restarted
```

## 相关问题

这个修复同时解决了以下相关问题：

1. **睡眠唤醒后快捷键失效**：通过 `resume` 事件监听解决
2. **修饰键状态残留**：通过锁定时清除状态解决
3. **长时间空闲后钩子失效**：通过健康检查机制解决

## 技术说明

### 为什么需要延迟重启？

- **解锁延迟 (500ms)**：系统解锁后需要时间恢复用户会话，立即启动钩子可能失败
- **唤醒延迟 (1000ms)**：从睡眠/休眠恢复需要更长时间，设备驱动可能还在初始化

### 为什么健康检查阈值设为 5 分钟？

- 避免误判：用户可能真的长时间不使用鼠标和键盘
- 保守策略：只在明显异常时才重启
- 系统事件监听是主要机制，健康检查是额外保险

### 为什么需要重试机制？

- 系统恢复时机不确定：某些情况下即使延迟后仍可能失败
- 提高可靠性：第二次尝试成功率更高
- 用户体验：避免因一次失败就永久失效

## 最佳实践

### 1. 分层防护

- **主动监听**：系统事件监听（lock/unlock/resume）
- **被动检测**：健康检查机制
- **容错处理**：重试机制

### 2. 状态管理

- 所有状态变量集中管理
- 停止时完全清理状态
- 重启时重置所有状态

### 3. 日志记录

- 关键操作都有日志输出
- 成功/失败都有明确标记（✓/✗）
- 便于问题排查和验证

### 4. 用户体验

- 自动恢复，无需手动干预
- 延迟设置合理，避免闪烁
- 静默处理，不打扰用户

## 版本历史

- **v1.0.0** - 2024-10-24
  - 初始实现
  - 添加系统事件监听
  - 添加重启机制
  - 添加健康检查

## 参考资料

- [Electron powerMonitor API](https://www.electronjs.org/docs/latest/api/power-monitor)
- [uiohook-napi Documentation](https://github.com/SnosMe/uiohook-napi)
- [Windows Session Lock Events](https://docs.microsoft.com/en-us/windows/win32/shutdown/system-shutdown)
