import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import ShortUniqueId from 'short-uuid'
import type { ActionPage, LauncherItem } from '../types/launcher'
import { useAppLauncherStore } from './appLauncher'

const STORAGE_KEY = 'fingertips-action-pages'
const MAX_ITEMS_PER_PAGE = 20
const DEFAULT_PAGE_TITLE = '默认'

// 创建 UUID 生成器
const uuid = ShortUniqueId()

/**
 * 动作页面 Store
 * 管理多个动作页面，每个页面包含 20 个 item 位置
 */
export const useActionPageStore = defineStore('actionPage', () => {
  // State: 所有页面
  const pages = ref<Map<string, ActionPage>>(new Map())
  // 当前激活的页面 ID
  const currentPageId = ref<string | null>(null)

  /**
   * 初始化 Store - 从 localStorage 加载数据
   */
  function initialize(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored) as Record<string, ActionPage>
        Object.values(data).forEach((page) => {
          pages.value.set(page.id, page)
        })

        // 设置当前页面为第一个页面
        const firstPage = Object.values(data)[0]
        if (firstPage) {
          currentPageId.value = firstPage.id
        }
      }

      // 如果没有任何页面，创建默认页面
      if (pages.value.size === 0) {
        createDefaultPage()
      }
    } catch (error) {
      console.error('Failed to load action pages from localStorage:', error)
      // 出错时也创建默认页面
      createDefaultPage()
    }
  }

  /**
   * 创建默认页面
   */
  function createDefaultPage(): void {
    const defaultPage: ActionPage = {
      id: uuid.new(),
      title: DEFAULT_PAGE_TITLE,
      items: {},
      createdAt: Date.now(),
      order: 0
    }
    pages.value.set(defaultPage.id, defaultPage)
    currentPageId.value = defaultPage.id
    saveToStorage()
  }

  /**
   * 保存数据到 localStorage
   */
  function saveToStorage(): void {
    try {
      const data: Record<string, ActionPage> = {}
      pages.value.forEach((page) => {
        data[page.id] = page
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save action pages to localStorage:', error)
    }
  }

  /**
   * 创建新页面
   * @param title 页面标题
   * @returns 新页面的 ID
   */
  function createPage(title: string): string {
    const newPage: ActionPage = {
      id: uuid.new(),
      title: title || '新页面',
      items: {},
      createdAt: Date.now(),
      order: pages.value.size
    }
    pages.value.set(newPage.id, newPage)
    saveToStorage()
    return newPage.id
  }

  /**
   * 删除页面
   * @param pageId 页面 ID
   */
  function deletePage(pageId: string): boolean {
    // 不允许删除最后一个页面
    if (pages.value.size <= 1) {
      console.warn('Cannot delete the last page')
      return false
    }

    const deleted = pages.value.delete(pageId)
    if (deleted) {
      // 如果删除的是当前页面，切换到第一个页面
      if (currentPageId.value === pageId) {
        const firstPage = Array.from(pages.value.values())[0]
        currentPageId.value = firstPage?.id || null
      }

      // 清理所有引用了该页面的 action-page 类型的 items
      cleanupActionPageReferences(pageId)

      saveToStorage()
    }
    return deleted
  }

  /**
   * 清理所有引用了指定页面的 action-page 类型的 items
   * @param pageId 被删除的页面 ID
   */
  function cleanupActionPageReferences(pageId: string): void {
    // 1. 清理 main 区域 (appLauncher) 的引用
    const appLauncherStore = useAppLauncherStore()
    for (let i = 0; i < 20; i++) {
      const item = appLauncherStore.getItem(i)
      if (item && item.type === 'action-page' && item.path === pageId) {
        appLauncherStore.removeItem(i)
      }
    }

    // 2. 清理所有 action pages 的引用
    pages.value.forEach((page) => {
      const itemsToDelete: number[] = []
      Object.entries(page.items).forEach(([indexStr, item]) => {
        if (item.type === 'action-page' && item.path === pageId) {
          itemsToDelete.push(parseInt(indexStr))
        }
      })
      // 删除找到的 items
      itemsToDelete.forEach((index) => {
        delete page.items[index]
      })
    })
  }

  /**
   * 更新页面标题
   * @param pageId 页面 ID
   * @param title 新标题
   */
  function updatePageTitle(pageId: string, title: string): void {
    const page = pages.value.get(pageId)
    if (page) {
      page.title = title
      saveToStorage()
    }
  }

  /**
   * 切换当前页面
   * @param pageId 页面 ID
   */
  function setCurrentPage(pageId: string): void {
    if (pages.value.has(pageId)) {
      currentPageId.value = pageId
    }
  }

  /**
   * 向页面添加或更新 item
   * @param pageId 页面 ID
   * @param index item 索引 (0-19)
   * @param item 启动器项目
   */
  function setItem(pageId: string, index: number, item: LauncherItem): void {
    if (index < 0 || index >= MAX_ITEMS_PER_PAGE) {
      console.error(`Invalid index: ${index}. Must be between 0 and ${MAX_ITEMS_PER_PAGE - 1}`)
      return
    }

    const page = pages.value.get(pageId)
    if (page) {
      page.items[index] = item
      saveToStorage()
    }
  }

  /**
   * 从页面删除 item
   * @param pageId 页面 ID
   * @param index item 索引 (0-19)
   */
  function removeItem(pageId: string, index: number): void {
    if (index < 0 || index >= MAX_ITEMS_PER_PAGE) {
      console.error(`Invalid index: ${index}. Must be between 0 and ${MAX_ITEMS_PER_PAGE - 1}`)
      return
    }

    const page = pages.value.get(pageId)
    if (page) {
      delete page.items[index]
      saveToStorage()
    }
  }

  /**
   * 获取页面的指定位置的 item
   * @param pageId 页面 ID
   * @param index item 索引 (0-19)
   */
  function getItem(pageId: string, index: number): LauncherItem | null {
    const page = pages.value.get(pageId)
    return page?.items[index] || null
  }

  /**
   * 获取当前页面
   */
  const currentPage = computed(() => {
    return currentPageId.value ? pages.value.get(currentPageId.value) : null
  })

  /**
   * 获取所有页面（按 order 排序）
   */
  const sortedPages = computed(() => {
    return Array.from(pages.value.values()).sort((a, b) => a.order - b.order)
  })

  /**
   * 获取当前页面的指定位置的 item
   * @param index item 索引 (0-19)
   */
  function getCurrentPageItem(index: number): LauncherItem | null {
    if (!currentPageId.value) return null
    return getItem(currentPageId.value, index)
  }

  /**
   * 向当前页面添加 item
   * @param index item 索引 (0-19)
   * @param item 启动器项目
   */
  function setCurrentPageItem(index: number, item: LauncherItem): void {
    if (currentPageId.value) {
      setItem(currentPageId.value, index, item)
    }
  }

  /**
   * 从当前页面删除 item
   * @param index item 索引 (0-19)
   */
  function removeCurrentPageItem(index: number): void {
    if (currentPageId.value) {
      removeItem(currentPageId.value, index)
    }
  }

  /**
   * 切换到上一个页面
   */
  function previousPage(): void {
    const pageList = sortedPages.value
    const currentIndex = pageList.findIndex((p) => p.id === currentPageId.value)
    if (currentIndex > 0) {
      setCurrentPage(pageList[currentIndex - 1].id)
    }
  }

  /**
   * 切换到下一个页面
   */
  function nextPage(): void {
    const pageList = sortedPages.value
    const currentIndex = pageList.findIndex((p) => p.id === currentPageId.value)
    if (currentIndex < pageList.length - 1) {
      setCurrentPage(pageList[currentIndex + 1].id)
    }
  }

  /**
   * 检查是否可以切换到上一页
   */
  const canGoPrevious = computed(() => {
    const pageList = sortedPages.value
    const currentIndex = pageList.findIndex((p) => p.id === currentPageId.value)
    return currentIndex > 0
  })

  /**
   * 检查是否可以切换到下一页
   */
  const canGoNext = computed(() => {
    const pageList = sortedPages.value
    const currentIndex = pageList.findIndex((p) => p.id === currentPageId.value)
    return currentIndex < pageList.length - 1
  })

  /**
   * 交换指定页面中两个位置的项目
   * @param pageId 页面 ID
   * @param fromIndex 源位置索引 (0-19)
   * @param toIndex 目标位置索引 (0-19)
   */
  function swapItems(pageId: string, fromIndex: number, toIndex: number): void {
    // 验证索引范围
    if (
      fromIndex < 0 ||
      fromIndex >= MAX_ITEMS_PER_PAGE ||
      toIndex < 0 ||
      toIndex >= MAX_ITEMS_PER_PAGE
    ) {
      console.error(`Invalid index: fromIndex=${fromIndex}, toIndex=${toIndex}`)
      return
    }

    // 如果是同一个位置，不需要交换
    if (fromIndex === toIndex) {
      return
    }

    const page = pages.value.get(pageId)
    if (!page) {
      console.error(`Page not found: ${pageId}`)
      return
    }

    // 获取两个位置的项目
    const fromItem = page.items[fromIndex] || null
    const toItem = page.items[toIndex] || null

    // 执行交换
    if (fromItem) {
      page.items[toIndex] = fromItem
    } else {
      delete page.items[toIndex]
    }

    if (toItem) {
      page.items[fromIndex] = toItem
    } else {
      delete page.items[fromIndex]
    }

    // 保存到 localStorage
    saveToStorage()
  }

  /**
   * 交换当前页面中两个位置的项目
   * @param fromIndex 源位置索引 (0-19)
   * @param toIndex 目标位置索引 (0-19)
   */
  function swapCurrentPageItems(fromIndex: number, toIndex: number): void {
    if (currentPageId.value) {
      swapItems(currentPageId.value, fromIndex, toIndex)
    }
  }

  return {
    // State
    pages,
    currentPageId,
    currentPage,
    sortedPages,
    canGoPrevious,
    canGoNext,

    // Actions
    initialize,
    createPage,
    deletePage,
    updatePageTitle,
    setCurrentPage,
    setItem,
    removeItem,
    getItem,
    getCurrentPageItem,
    setCurrentPageItem,
    removeCurrentPageItem,
    previousPage,
    nextPage,
    cleanupActionPageReferences,
    swapItems,
    swapCurrentPageItems
  }
})
