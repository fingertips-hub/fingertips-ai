/**
 * 启动器项目类型
 */
export type LauncherItemType =
  | 'file'
  | 'folder'
  | 'web'
  | 'cmd'
  | 'ai-shortcut'
  | 'action-page'
  | 'plugin'

/**
 * 启动器项目接口
 */
export interface LauncherItem {
  id: string // 唯一标识
  type: LauncherItemType // 类型
  name: string // 显示名称
  path: string // 文件路径或URL
  icon: string // 图标(base64格式)
  createdAt: number // 创建时间戳
  shellType?: 'cmd' | 'powershell' // Shell类型（仅当type为'cmd'时使用）
}

/**
 * 应用启动器状态接口
 */
export interface AppLauncherState {
  items: Map<number, LauncherItem | null> // 使用Map存储,key为索引(0-19),value为项目或null
  maxItems: number // 最大数量(20个)
}

/**
 * 文件信息接口
 */
export interface FileInfo {
  name: string // 文件名(不含扩展名)
  path: string // 完整路径
  extension: string // 文件扩展名
}

/**
 * 视图状态枚举
 */
export enum ViewState {
  TYPE_SELECTOR = 'type-selector', // 类型选择器(4个按钮)
  ADD_FILE = 'add-file', // 添加文件视图
  ADD_FOLDER = 'add-folder', // 添加文件夹视图(暂未实现)
  ADD_WEB = 'add-web', // 添加网页视图(暂未实现)
  ADD_CMD = 'add-cmd' // 添加CMD命令视图(暂未实现)
}

/**
 * 动作页面接口
 */
export interface ActionPage {
  id: string // 唯一标识（使用 short-uuid）
  title: string // 页面标题
  items: Record<number, LauncherItem> // 存储该页面的 items，key 为索引(0-19)
  createdAt: number // 创建时间戳
  order: number // 排序顺序
}

/**
 * 动作页面状态接口
 */
export interface ActionPageState {
  pages: Map<string, ActionPage> // 所有页面，key 为页面 ID
  currentPageId: string | null // 当前激活的页面 ID
  maxItemsPerPage: number // 每页最大 item 数量(20个)
}
