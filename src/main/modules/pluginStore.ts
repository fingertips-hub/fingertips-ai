import type { PluginStoreData } from '../types/plugin'

/**
 * 插件配置存储模块
 * 使用 electron-store 存储插件配置、启用状态等
 */

// 动态导入 electron-store（因为它是纯 ES Module）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any = null
let storeReady = false

/**
 * 默认存储数据
 */
const DEFAULT_STORE_DATA: PluginStoreData = {
  enabled: {},
  configs: {},
  metadata: {}
}

/**
 * 初始化 store
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function initStore() {
  if (!store) {
    const ElectronStore = (await import('electron-store')).default
    store = new ElectronStore<PluginStoreData>({
      name: 'plugins',
      defaults: DEFAULT_STORE_DATA
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
 * 获取插件配置
 */
export async function getPluginConfig(pluginId: string): Promise<any> {
  const s = await ensureStore()
  const configs = s.get('configs', {})
  return configs[pluginId] || {}
}

/**
 * 设置插件配置
 */
export async function setPluginConfig(pluginId: string, config: any): Promise<void> {
  const s = await ensureStore()
  const configs = s.get('configs', {})
  configs[pluginId] = config
  s.set('configs', configs)
}

/**
 * 获取插件配置的单个值
 */
export async function getPluginConfigValue(pluginId: string, key: string): Promise<any> {
  const config = await getPluginConfig(pluginId)
  return config[key]
}

/**
 * 设置插件配置的单个值
 */
export async function setPluginConfigValue(
  pluginId: string,
  key: string,
  value: any
): Promise<void> {
  const config = await getPluginConfig(pluginId)
  config[key] = value
  await setPluginConfig(pluginId, config)
}

/**
 * 检查插件是否启用
 */
export async function isPluginEnabled(pluginId: string): Promise<boolean> {
  const s = await ensureStore()
  const enabled = s.get('enabled', {})
  return enabled[pluginId] ?? false
}

/**
 * 设置插件启用状态
 */
export async function setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
  const s = await ensureStore()
  const enabledMap = s.get('enabled', {})
  enabledMap[pluginId] = enabled
  s.set('enabled', enabledMap)
}

/**
 * 获取所有已启用的插件 ID
 */
export async function getEnabledPlugins(): Promise<string[]> {
  const s = await ensureStore()
  const enabled = s.get('enabled', {})
  return Object.keys(enabled).filter((id) => enabled[id])
}

/**
 * 获取插件元数据缓存
 */
export async function getPluginMetadata(pluginId: string): Promise<any> {
  const s = await ensureStore()
  const metadata = s.get('metadata', {})
  return metadata[pluginId] || null
}

/**
 * 设置插件元数据缓存
 */
export async function setPluginMetadata(pluginId: string, metadata: any): Promise<void> {
  const s = await ensureStore()
  const metadataMap = s.get('metadata', {})
  metadataMap[pluginId] = metadata
  s.set('metadata', metadataMap)
}

/**
 * 清除插件数据
 */
export async function clearPluginData(pluginId: string): Promise<void> {
  const s = await ensureStore()

  // 清除启用状态
  const enabled = s.get('enabled', {})
  delete enabled[pluginId]
  s.set('enabled', enabled)

  // 清除配置
  const configs = s.get('configs', {})
  delete configs[pluginId]
  s.set('configs', configs)

  // 清除元数据
  const metadata = s.get('metadata', {})
  delete metadata[pluginId]
  s.set('metadata', metadata)
}

/**
 * 重置所有插件数据
 */
export async function resetAllPluginData(): Promise<void> {
  const s = await ensureStore()
  s.clear()
}
