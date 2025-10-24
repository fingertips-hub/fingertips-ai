# 🔧 反引号快捷键支持修复

## 问题描述

用户在设置面板中可以成功设置快捷键为 `Ctrl+\``（反引号），但按这个快捷键不起作用。

## 根本原因

后端的快捷键映射表中**缺少反引号键的支持**：

1. `KEY_NAME_TO_CODE` 映射表中没有 `` ` `` 的 keycode
2. `KEYCODE_TO_UIOHOOK_KEY` 映射表中没有反引号的 UiohookKey

导致：

- 前端可以录制并保存 `Ctrl+\`` 快捷键
- 后端的 `parseTriggerConfig` 函数无法解析反引号
- `currentTriggerKey` 为 `undefined`
- 快捷键检测失效

## 解决方案

### 扩展按键支持

添加了**完整的键盘按键支持**，不仅修复了反引号问题，还支持了所有常用按键：

#### 1. 字母键（A-Z）

```typescript
const KEY_NAME_TO_CODE: Record<string, number> = {
  A: 30,
  B: 48,
  C: 46,
  D: 32,
  E: 18,
  F: 33,
  G: 34,
  H: 35,
  I: 23,
  J: 36,
  K: 37,
  L: 38,
  M: 50,
  N: 49,
  O: 24,
  P: 25,
  Q: 16,
  R: 19,
  S: 31,
  T: 20,
  U: 22,
  V: 47,
  W: 17,
  X: 45,
  Y: 21,
  Z: 44
  // ...
}
```

#### 2. 数字键（0-9）

```typescript
const KEY_NAME_TO_CODE: Record<string, number> = {
  '0': 11,
  '1': 2,
  '2': 3,
  '3': 4,
  '4': 5,
  '5': 6,
  '6': 7,
  '7': 8,
  '8': 9,
  '9': 10
  // ...
}
```

#### 3. 特殊字符键

```typescript
const KEY_NAME_TO_CODE: Record<string, number> = {
  '`': 41, // 反引号（关键修复）
  '-': 12, // 减号/下划线
  '=': 13, // 等号/加号
  '[': 26, // 左方括号
  ']': 27, // 右方括号
  '\\': 43, // 反斜杠
  ';': 39, // 分号
  "'": 40, // 单引号
  ',': 51, // 逗号
  '.': 52, // 句号
  '/': 53 // 斜杠
  // ...
}
```

#### 4. 功能键

```typescript
const KEY_NAME_TO_CODE: Record<string, number> = {
  Space: 57,
  Enter: 28,
  Esc: 1,
  Backspace: 14,
  Tab: 15
  // ...
}
```

#### 5. 事件抑制映射

所有按键都添加了对应的 UiohookKey 映射，确保事件抑制机制正常工作：

```typescript
const KEYCODE_TO_UIOHOOK_KEY: Record<number, number> = {
  41: UiohookKey.Backquote // 反引号
  // ... 其他所有按键
}
```

## 技术细节

### 反引号键的 Keycode

- **按键名称**：Backquote / Grave
- **Keycode**：41
- **UiohookKey**：`UiohookKey.Backquote`
- **在键盘上的位置**：通常在数字键 1 的左边，Esc 的下方

### 前后端数据流

#### 前端录制（HotkeyInput.vue）

```typescript
function handleKeyDown(event: KeyboardEvent): void {
  const key = event.key // "`"
  const code = event.code // "Backquote"

  // 处理逻辑
  if (key.length === 1) {
    keyName = key.toUpperCase() // "`"
  }

  // 构建快捷键
  const hotkey = parts.join('+') // "Ctrl+`"
  emit('update:modelValue', hotkey)
}
```

#### 后端解析（mouseListener.ts）

```typescript
export function parseTriggerConfig(trigger: string): void {
  // trigger = "Ctrl+`"
  const parts = trigger.split('+')
  const keyPart = parts[parts.length - 1] // "`"

  // 🔑 现在可以正确查找到 keycode
  currentTriggerKey = KEY_NAME_TO_CODE[keyPart] // 41

  // 提取修饰键
  parts.slice(0, -1).forEach((mod) => {
    currentTriggerModifiers.add(mod) // "Ctrl"
  })
}
```

#### 事件监听（setupGlobalMouseListener）

```typescript
uIOhook.on('keydown', (event: UiohookKeyboardEvent) => {
  // 检测快捷键
  if (currentTriggerKey !== null && event.keycode === currentTriggerKey) {
    if (checkModifiersMatch()) {
      // ✅ 成功匹配 Ctrl+`
      // 抑制事件
      suppressHotkeyEvent(event.keycode) // 41
      // 显示 Super Panel
      showSuperPanelAtMouse()
    }
  }
})
```

#### 事件抑制

```typescript
function suppressHotkeyEvent(keycode: number): void {
  // keycode = 41
  const triggerKey = KEYCODE_TO_UIOHOOK_KEY[keycode] // UiohookKey.Backquote

  // 释放反引号键
  uIOhook.keyToggle(triggerKey, 'up')

  // 释放修饰键（Ctrl）
  // ...
}
```

## 测试验证

### 测试步骤

1. **设置快捷键**：
   - 打开设置面板
   - 设置 Super Panel 快捷键为 `Ctrl+\``
   - 保存设置

2. **测试触发**：
   - 在任意应用中按 `Ctrl+\``
   - 预期：Super Panel 正常显示

3. **测试抑制**：
   - 在 VSCode 或其他编辑器中按 `Ctrl+\``
   - 预期：
     - ✅ Super Panel 正常显示
     - ✅ 编辑器不会触发其默认的 `Ctrl+\`` 功能
     - ✅ 不会输入反引号字符

### 日志参考

**正常触发流程**：

```
[MouseListener] Keyboard trigger detected: Ctrl+`
[Suppress] Suppressing hotkey event for keycode: 41
[Suppress] Released trigger key: 41
[Suppress] Released modifier: Ctrl
[Suppress] ✓ Hotkey event suppressed successfully
[MouseListener] 显示 Super Panel
```

## 扩展支持的其他按键

除了反引号，此次修复还添加了以下按键的支持：

### 原本只支持 6 个键：

- Q, W, E, R, T, Space

### 现在支持 60+ 个键：

- **26 个字母键**：A-Z
- **10 个数字键**：0-9
- **11 个特殊字符键**：`` ` ``, `-`, `=`, `[`, `]`, `\`, `;`, `'`, `,`, `.`, `/`
- **5 个功能键**：Space, Enter, Esc, Backspace, Tab
- **4 个修饰键**：Ctrl, Alt, Shift, Meta

### 未来可扩展的按键：

- 功能键：F1-F12
- 方向键：Up, Down, Left, Right
- 编辑键：Insert, Delete, Home, End, PageUp, PageDown
- 小键盘：Numpad0-9, NumpadAdd, NumpadSubtract 等

## 相关问题

这个修复同时解决了以下相关问题：

1. **反引号快捷键不起作用**：已修复 ✅
2. **数字键快捷键支持**：已添加 ✅
3. **特殊字符键快捷键支持**：已添加 ✅
4. **全字母键快捷键支持**：已添加 ✅

## 最佳实践

### 推荐的快捷键组合

**常用且不易冲突**：

- `` Ctrl+` `` - 很少被其他应用占用
- `Alt+Q` - 适合快速访问
- `Ctrl+Shift+Space` - 功能强大且不冲突
- `Alt+;` - 右手单手操作方便

**避免使用**：

- `Ctrl+C`, `Ctrl+V` - 复制粘贴，系统级
- `Ctrl+Z`, `Ctrl+Y` - 撤销重做，系统级
- `Alt+F4` - 关闭窗口，系统级
- `Win+L` - 锁定屏幕，系统级

### 调试方法

如果新的快捷键不起作用：

1. **检查 keycode 映射**：
   - 在 `KEY_NAME_TO_CODE` 中添加按键名称和 keycode
   - 按键名称要与前端录制时的格式一致

2. **检查事件抑制映射**：
   - 在 `KEYCODE_TO_UIOHOOK_KEY` 中添加 keycode 和 UiohookKey
   - 确保 UiohookKey 枚举中存在对应的值

3. **查看日志**：
   - 打开控制台
   - 按快捷键
   - 查看是否有 "Keyboard trigger detected" 日志

## 版本历史

- **v1.1.0** - 2024-10-24
  - 修复反引号快捷键不起作用的问题
  - 添加全字母键支持（A-Z）
  - 添加数字键支持（0-9）
  - 添加 11 个特殊字符键支持
  - 添加常用功能键支持

## 参考资料

- [键盘扫描码对照表](https://www.win.tue.nl/~aeb/linux/kbd/scancodes-1.html)
- [uiohook-napi UiohookKey 枚举](https://github.com/SnosMe/uiohook-napi)
- [JavaScript KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)
