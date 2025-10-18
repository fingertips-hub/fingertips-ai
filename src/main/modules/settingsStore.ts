/**
 * 应用设置接口
 */
export interface AppSettings {
  // 通用设置
  storageDirectory: string
  autoLaunch: boolean
  hotkey: string // 触发器：可以是快捷键或鼠标动作

  // AI 设置
  aiBaseUrl: string
  aiApiKey: string
  aiModels: string[] // 可用的 AI 模型列表
  aiDefaultModel: string // 默认使用的模型
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: AppSettings = {
  storageDirectory: '',
  autoLaunch: false,
  hotkey: 'LongPress:Middle', // 默认：长按中键

  aiBaseUrl: 'https://api.openai.com/v1',
  aiApiKey: '',
  aiModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'], // 默认模型列表
  aiDefaultModel: 'gpt-4o' // 默认模型
}

// 动态导入 electron-store（因为它是纯 ES Module）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any = null
let storeReady = false

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function initStore() {
  if (!store) {
    const ElectronStore = (await import('electron-store')).default
    store = new ElectronStore<AppSettings>({
      name: 'settings',
      defaults: DEFAULT_SETTINGS
    })
    storeReady = true
  }
  return store
}

// 立即初始化
initStore().catch(console.error)

/**
 * 确保 store 已初始化
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function ensureStore() {
  if (!storeReady) {
    await initStore()
  }
  return store
}

/**
 * 获取 store 实例（异步）
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function getStore() {
  return ensureStore()
}

/**
 * 获取所有设置
 */
export async function getSettings(): Promise<AppSettings> {
  const s = await ensureStore()
  return s.store
}

/**
 * 获取单个设置项
 */
export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  const s = await ensureStore()
  return s.get(key)
}

/**
 * 设置单个设置项
 */
export async function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  const s = await ensureStore()
  s.set(key, value)
}

/**
 * 获取触发器（快捷键或鼠标动作）
 */
export async function getHotkey(): Promise<string> {
  const s = await ensureStore()
  return s.get('hotkey', DEFAULT_SETTINGS.hotkey)
}

/**
 * 设置触发器（快捷键或鼠标动作）
 */
export async function setHotkey(hotkey: string): Promise<void> {
  const s = await ensureStore()
  s.set('hotkey', hotkey)
}

/**
 * 重置所有设置为默认值
 */
export async function resetSettings(): Promise<void> {
  const s = await ensureStore()
  s.clear()
}
