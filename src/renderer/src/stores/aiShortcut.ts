import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'fingertips-ai-shortcuts'

/**
 * 快捷指令分类接口
 */
export interface ShortcutCategory {
  id: string // 唯一ID
  name: string // 分类名称
  icon?: string // 分类图标（emoji）
  order: number // 排序
  createdAt: number // 创建时间
}

/**
 * AI 快捷指令接口
 */
export interface AIShortcut {
  id: string // 唯一ID
  categoryId: string // 所属分类
  name: string // 指令名称
  icon: string // emoji 图标
  prompt: string // 提示词内容
  hotkey?: string // 全局快捷键（可选）
  model?: string // AI 模型（可选，默认使用全局配置）
  temperature?: number // 温度参数 0-2.0（可选，默认 1.0）
  createdAt: number // 创建时间
  updatedAt: number // 更新时间
  order: number // 排序
}

/**
 * 存储数据结构
 */
interface StorageData {
  categories: ShortcutCategory[]
  shortcuts: AIShortcut[]
}

/**
 * 默认分类
 */
const DEFAULT_CATEGORIES: ShortcutCategory[] = [
  {
    id: 'all',
    name: '全部',
    icon: '📁',
    order: 0,
    createdAt: Date.now()
  },
  {
    id: 'default',
    name: '默认分类',
    icon: '📝',
    order: 1,
    createdAt: Date.now()
  }
]

/**
 * AI 快捷指令 Store
 * 管理快捷指令和分类
 */
export const useAIShortcutStore = defineStore('aiShortcut', () => {
  // State
  const categories = ref<ShortcutCategory[]>([...DEFAULT_CATEGORIES])
  const shortcuts = ref<AIShortcut[]>([])
  const selectedCategoryId = ref<string>('all')
  const isLoading = ref(false)

  /**
   * 初始化 Store - 从 localStorage 加载数据
   */
  function initialize(): void {
    isLoading.value = true
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored) as StorageData
        // 合并默认分类和存储的分类
        const allCategory = DEFAULT_CATEGORIES[0]
        const storedCategories = data.categories || []
        // 确保"全部"分类始终存在且在第一位
        if (!storedCategories.find((c) => c.id === 'all')) {
          categories.value = [allCategory, ...storedCategories]
        } else {
          categories.value = storedCategories
        }
        shortcuts.value = data.shortcuts || []
      }
    } catch (error) {
      console.error('Failed to load AI shortcuts from localStorage:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 保存数据到 localStorage
   */
  function saveToStorage(): void {
    try {
      const data: StorageData = {
        categories: categories.value,
        shortcuts: shortcuts.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save AI shortcuts to localStorage:', error)
    }
  }

  /**
   * 生成唯一 ID
   */
  function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // ==================== 分类管理 ====================

  /**
   * 添加分类
   */
  function addCategory(name: string, icon?: string): ShortcutCategory {
    const newCategory: ShortcutCategory = {
      id: generateId(),
      name,
      icon: icon || '📁',
      order: categories.value.length,
      createdAt: Date.now()
    }
    categories.value.push(newCategory)
    saveToStorage()
    return newCategory
  }

  /**
   * 更新分类
   */
  function updateCategory(id: string, updates: Partial<ShortcutCategory>): boolean {
    const index = categories.value.findIndex((c) => c.id === id)
    if (index === -1) return false

    // 不允许修改"全部"分类
    if (id === 'all') return false

    categories.value[index] = {
      ...categories.value[index],
      ...updates,
      id // 保持ID不变
    }
    saveToStorage()
    return true
  }

  /**
   * 删除分类
   */
  function deleteCategory(id: string): boolean {
    // 不允许删除"全部"分类
    if (id === 'all') return false

    const index = categories.value.findIndex((c) => c.id === id)
    if (index === -1) return false

    // 删除该分类下的所有指令
    shortcuts.value = shortcuts.value.filter((s) => s.categoryId !== id)

    // 删除分类
    categories.value.splice(index, 1)
    saveToStorage()

    // 如果删除的是当前选中的分类，切换到"全部"
    if (selectedCategoryId.value === id) {
      selectedCategoryId.value = 'all'
    }

    return true
  }

  /**
   * 选择分类
   */
  function selectCategory(id: string): void {
    if (categories.value.find((c) => c.id === id)) {
      selectedCategoryId.value = id
    }
  }

  /**
   * 获取当前选中的分类
   */
  const currentCategory = computed(() => {
    return categories.value.find((c) => c.id === selectedCategoryId.value)
  })

  // ==================== 快捷指令管理 ====================

  /**
   * 添加快捷指令
   */
  function addShortcut(
    name: string,
    icon: string,
    prompt: string,
    categoryId?: string,
    hotkey?: string,
    model?: string,
    temperature?: number
  ): AIShortcut {
    // 如果没有指定分类或分类为"all"，使用默认分类
    let targetCategoryId = categoryId || selectedCategoryId.value
    if (targetCategoryId === 'all') {
      targetCategoryId = 'default'
    }

    const newShortcut: AIShortcut = {
      id: generateId(),
      categoryId: targetCategoryId,
      name,
      icon,
      prompt,
      hotkey,
      model,
      temperature,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      order: shortcuts.value.filter((s) => s.categoryId === targetCategoryId).length
    }
    shortcuts.value.push(newShortcut)
    saveToStorage()
    return newShortcut
  }

  /**
   * 更新快捷指令
   */
  function updateShortcut(id: string, updates: Partial<AIShortcut>): boolean {
    const index = shortcuts.value.findIndex((s) => s.id === id)
    if (index === -1) return false

    shortcuts.value[index] = {
      ...shortcuts.value[index],
      ...updates,
      id, // 保持ID不变
      updatedAt: Date.now()
    }
    saveToStorage()
    return true
  }

  /**
   * 删除快捷指令
   */
  function deleteShortcut(id: string): boolean {
    const index = shortcuts.value.findIndex((s) => s.id === id)
    if (index === -1) return false

    shortcuts.value.splice(index, 1)
    saveToStorage()
    return true
  }

  /**
   * 获取指定分类的快捷指令
   */
  function getShortcutsByCategory(categoryId: string): AIShortcut[] {
    if (categoryId === 'all') {
      return shortcuts.value.sort((a, b) => a.order - b.order)
    }
    return shortcuts.value
      .filter((s) => s.categoryId === categoryId)
      .sort((a, b) => a.order - b.order)
  }

  /**
   * 获取当前选中分类的快捷指令
   */
  const currentShortcuts = computed(() => {
    return getShortcutsByCategory(selectedCategoryId.value)
  })

  /**
   * 获取指定分类的快捷指令数量
   */
  function getCategoryShortcutCount(categoryId: string): number {
    if (categoryId === 'all') {
      return shortcuts.value.length
    }
    return shortcuts.value.filter((s) => s.categoryId === categoryId).length
  }

  /**
   * 清空所有数据
   */
  function clearAll(): void {
    categories.value = [...DEFAULT_CATEGORIES]
    shortcuts.value = []
    selectedCategoryId.value = 'all'
    saveToStorage()
  }

  return {
    // State
    categories,
    shortcuts,
    selectedCategoryId,
    isLoading,

    // Computed
    currentCategory,
    currentShortcuts,

    // Actions
    initialize,
    selectCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    addShortcut,
    updateShortcut,
    deleteShortcut,
    getShortcutsByCategory,
    getCategoryShortcutCount,
    clearAll
  }
})
