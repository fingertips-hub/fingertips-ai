# AI 设置同步问题修复

## 问题描述

在 `CommonSettings.vue` 中设置完成 Base URL 和 API Key 后，`AIShortcutRunner.vue` 执行时仍然提示"请先设置 apikey"。

## 根本原因

**前端和主进程使用了两个独立的存储系统，且 AI 设置没有同步机制：**

1. **渲染进程**（`src/renderer/src/stores/settings.ts`）：
   - 使用 `localStorage` 存储 AI 设置
   - `updateAIBaseUrl()` 和 `updateAIApiKey()` 只保存到 `localStorage`

2. **主进程**（`src/main/modules/settingsStore.ts`）：
   - 使用 `electron-store` 存储 AI 设置
   - `getSettings()` 从 `electron-store` 读取

3. **AI Shortcut Runner** 在生成 AI 响应时：
   - 从主进程的 `electron-store` 读取设置（见 `aiShortcutRunnerHandlers.ts:121`）
   - 但前端只保存到了 `localStorage`，所以主进程读不到！

## 解决方案（V2 - 最终版本）

**AI 设置完全使用 electron-store，不再使用 localStorage 缓存，保持单一数据源。**

这样可以：

- ✅ 避免双存储带来的同步复杂度
- ✅ 减少维护成本
- ✅ 确保数据一致性

## 修改内容

### 1. 主进程 - 添加 AI 设置的 IPC Handlers

**文件：`src/main/modules/settingsHandlers.ts`**

- 导入 `getSetting` 和 `setSetting` 函数
- 添加 4 个新的 IPC handlers：
  - `settings:get-ai-base-url` - 获取 AI Base URL
  - `settings:set-ai-base-url` - 设置 AI Base URL
  - `settings:get-ai-api-key` - 获取 AI API Key
  - `settings:set-ai-api-key` - 设置 AI API Key
- 在 `cleanupSettingsHandlers()` 中移除这些 handlers

### 2. Preload - 暴露 AI 设置 API

**文件：`src/preload/index.ts`**

在 `settings` 对象中添加 4 个新的 API 方法：

```typescript
getAIBaseUrl: () => ipcRenderer.invoke('settings:get-ai-base-url') as Promise<string>
setAIBaseUrl: (url: string) =>
  ipcRenderer.invoke('settings:set-ai-base-url', url) as Promise<boolean>
getAIApiKey: () => ipcRenderer.invoke('settings:get-ai-api-key') as Promise<string>
setAIApiKey: (key: string) => ipcRenderer.invoke('settings:set-ai-api-key', key) as Promise<boolean>
```

**文件：`src/preload/index.d.ts`**

在 `settings` 接口中添加对应的类型定义：

```typescript
getAIBaseUrl: () => Promise<string>
setAIBaseUrl: (url: string) => Promise<boolean>
getAIApiKey: () => Promise<string>
setAIApiKey: (key: string) => Promise<boolean>
```

### 3. 渲染进程 - Settings Store 架构调整

**文件：`src/renderer/src/stores/settings.ts`**

#### 存储分离策略

```typescript
/**
 * localStorage：只存储通用设置
 * - storageDirectory
 * - autoLaunch
 * - hotkey
 *
 * electron-store（主进程）：存储 AI 设置
 * - aiBaseUrl
 * - aiApiKey
 */
```

#### 初始化逻辑

```typescript
// 1. 从 localStorage 加载通用设置（排除 AI 设置）
const stored = localStorage.getItem(STORAGE_KEY)
if (stored) {
  const data = JSON.parse(stored) as Partial<AppSettings>
  if (data.storageDirectory !== undefined) settings.value.storageDirectory = data.storageDirectory
  if (data.autoLaunch !== undefined) settings.value.autoLaunch = data.autoLaunch
  if (data.hotkey !== undefined) settings.value.hotkey = data.hotkey
}

// 2. 从主进程加载 AI 设置（不使用 localStorage）
const savedBaseUrl = await window.api.settings.getAIBaseUrl()
settings.value.aiBaseUrl = savedBaseUrl || ''

const savedApiKey = await window.api.settings.getAIApiKey()
settings.value.aiApiKey = savedApiKey || ''
```

#### 保存逻辑

```typescript
// saveToStorage() 只保存通用设置，不包含 AI 设置
function saveToStorage(): void {
  const dataToSave = {
    storageDirectory: settings.value.storageDirectory,
    autoLaunch: settings.value.autoLaunch,
    hotkey: settings.value.hotkey
    // 不包含 aiBaseUrl 和 aiApiKey
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
}

// updateAIBaseUrl/updateAIApiKey 直接写入主进程
async function updateAIBaseUrl(url: string): Promise<boolean> {
  const success = await window.api.settings.setAIBaseUrl(url)
  if (success) {
    settings.value.aiBaseUrl = url // 仅用于 UI 展示
  }
  return success
}
```

### 4. UI 组件 - 直接从主进程读取

**文件：`src/renderer/src/components/settings/CommonSettings.vue`**

#### 初始化时直接从主进程读取

```typescript
onMounted(async () => {
  await settingsStore.initialize()

  // 通用设置从 store 读取
  autoLaunchValue.value = settingsStore.settings.autoLaunch
  hotkeyValue.value = settingsStore.settings.hotkey

  // AI 设置直接从主进程读取（不依赖 store 缓存）
  if (window.api?.settings?.getAIBaseUrl) {
    baseUrlValue.value = (await window.api.settings.getAIBaseUrl()) || ''
  }
  if (window.api?.settings?.getAIApiKey) {
    apiKeyValue.value = (await window.api.settings.getAIApiKey()) || ''
  }
})
```

#### 更新时直接写入主进程

```typescript
async function handleBaseUrlChange(): Promise<void> {
  const trimmedValue = baseUrlValue.value.trim()
  const success = await settingsStore.updateAIBaseUrl(trimmedValue)
  if (success) {
    showToast('Base URL 已保存')
  } else {
    showToast('Base URL 保存失败，请重试', 'error')
  }
}
```

## 数据流向（V2 架构）

### 保存 AI 设置

```
用户在 CommonSettings.vue 修改设置
         ↓
调用 settingsStore.updateAIBaseUrl/updateAIApiKey
         ↓
通过 IPC 调用主进程 settings:set-ai-base-url/set-ai-api-key
         ↓
主进程保存到 electron-store（唯一数据源）
         ↓
返回成功，更新 settings.value（仅供 UI 展示）
         ↓
显示成功提示
```

### 读取 AI 设置

```
应用初始化/设置页面打开
         ↓
通过 IPC 调用主进程 settings:get-ai-base-url/get-ai-api-key
         ↓
主进程从 electron-store 读取
         ↓
返回值赋给 UI 输入框
         ↓
AI Shortcut Runner 执行时，主进程直接从 electron-store 读取 ✓
```

### 存储分离策略

```
┌─────────────────────────────────────────┐
│          Renderer Process               │
├─────────────────────────────────────────┤
│ localStorage (通用设置缓存):             │
│  ✓ storageDirectory                     │
│  ✓ autoLaunch                           │
│  ✓ hotkey                               │
│                                         │
│ settings.value (UI 展示状态):           │
│  ✓ 通用设置（localStorage 同步）         │
│  ✓ AI 设置（仅展示，不持久化）           │
└─────────────────────────────────────────┘
                  ↕ IPC
┌─────────────────────────────────────────┐
│          Main Process                   │
├─────────────────────────────────────────┤
│ electron-store (权威数据源):            │
│  ✓ storageDirectory                     │
│  ✓ autoLaunch                           │
│  ✓ hotkey                               │
│  ✓ aiBaseUrl      ← 唯一存储位置         │
│  ✓ aiApiKey       ← 唯一存储位置         │
└─────────────────────────────────────────┘
```

## 测试验证

1. 打开设置页面，配置 Base URL 和 API Key
2. 确认显示"已保存"提示
3. 关闭应用，重新打开
4. 检查设置是否保存（从主进程读取）
5. 运行 AI Shortcut，确认不再提示"请先设置 apikey"
6. 检查 localStorage，确认没有存储 AI 设置

## 最佳实践（V2）

### 1. 单一数据源原则

- **AI 设置**：`electron-store` 是唯一数据源，不使用 localStorage
- **通用设置**：localStorage 作为缓存，electron-store 作为后备
- 避免双存储导致的同步复杂度

### 2. 存储策略选择

| 设置类型         | 主存储         | 缓存           | 原因                     |
| ---------------- | -------------- | -------------- | ------------------------ |
| AI Base URL      | electron-store | ❌             | 敏感配置，需要主进程验证 |
| AI API Key       | electron-store | ❌             | 敏感信息，安全性要求高   |
| storageDirectory | localStorage   | electron-store | UI 频繁访问              |
| autoLaunch       | system API     | localStorage   | 需要系统 API             |
| hotkey           | electron-store | localStorage   | 需要主进程注册           |

### 3. 读写分离

- **写操作**：所有设置必须通过 IPC 写入主进程
- **读操作**：
  - AI 设置：每次从主进程读取
  - 通用设置：从 localStorage 读取，定期同步主进程

### 4. 错误处理

- IPC 调用必须有错误处理
- 失败时给用户明确的反馈
- 避免静默失败导致数据丢失

### 5. 性能考虑

- AI 设置读取频率低（仅在设置页面），IPC 开销可接受
- 通用设置使用 localStorage 缓存，避免频繁 IPC
- 启动时一次性加载所有设置

## 相关文件

- `src/main/modules/settingsHandlers.ts` - 主进程 IPC handlers
- `src/main/modules/settingsStore.ts` - 主进程设置存储
- `src/preload/index.ts` - Preload API 暴露
- `src/preload/index.d.ts` - Preload API 类型定义
- `src/renderer/src/stores/settings.ts` - 渲染进程设置 store
- `src/renderer/src/components/settings/CommonSettings.vue` - 设置 UI 组件
- `src/main/modules/aiShortcutRunnerHandlers.ts` - AI 快捷指令处理（读取设置）

## 架构优化历程

### V1：双存储 + 同步机制

- ❌ localStorage 和 electron-store 都存储 AI 设置
- ❌ 需要双向同步
- ❌ 维护复杂度高
- ❌ 容易出现数据不一致

### V2：单一数据源（最终方案）

- ✅ AI 设置只存储在 electron-store
- ✅ localStorage 只缓存通用设置
- ✅ 无需同步机制
- ✅ 架构简单，易于维护

## 总结

通过采用**单一数据源**架构，AI 设置完全使用 `electron-store`，避免了 localStorage 和 electron-store 之间的同步问题。这种方案：

1. **简化架构**：无需复杂的双向同步机制
2. **降低维护成本**：减少代码复杂度
3. **提高可靠性**：消除数据不一致的可能
4. **符合最佳实践**：敏感配置集中管理

这是 Electron 应用中处理敏感配置的推荐做法。
