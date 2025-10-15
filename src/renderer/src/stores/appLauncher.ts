import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LauncherItem } from '../types/launcher'

const STORAGE_KEY = 'fingertips-launcher-items'
const MAX_ITEMS = 20

/**
 * 应用启动器 Store
 */
export const useAppLauncherStore = defineStore('appLauncher', () => {
  // State: 使用Map存储项目,key为索引(0-19)
  const items = ref<Map<number, LauncherItem | null>>(new Map())

  /**
   * 初始化Store - 从localStorage加载数据
   */
  function initialize() {
    // 初始化Map,所有位置默认为null
    for (let i = 0; i < MAX_ITEMS; i++) {
      items.value.set(i, null)
    }

    // 从localStorage加载数据
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored) as Record<string, LauncherItem>
        Object.entries(data).forEach(([index, item]) => {
          const idx = parseInt(index)
          if (idx >= 0 && idx < MAX_ITEMS) {
            items.value.set(idx, item)
          }
        })
      }
    } catch (error) {
      console.error('Failed to load launcher items from localStorage:', error)
    }
  }

  /**
   * 保存数据到localStorage
   */
  function saveToStorage() {
    try {
      const data: Record<string, LauncherItem> = {}
      items.value.forEach((item, index) => {
        if (item) {
          data[index.toString()] = item
        }
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save launcher items to localStorage:', error)
    }
  }

  /**
   * 添加或更新项目
   * @param index 索引位置(0-19)
   * @param item 启动器项目
   */
  function setItem(index: number, item: LauncherItem) {
    if (index < 0 || index >= MAX_ITEMS) {
      console.error(`Invalid index: ${index}. Must be between 0 and ${MAX_ITEMS - 1}`)
      return
    }
    items.value.set(index, item)
    saveToStorage()
  }

  /**
   * 删除项目
   * @param index 索引位置(0-19)
   */
  function removeItem(index: number) {
    if (index < 0 || index >= MAX_ITEMS) {
      console.error(`Invalid index: ${index}. Must be between 0 and ${MAX_ITEMS - 1}`)
      return
    }
    items.value.set(index, null)
    saveToStorage()
  }

  /**
   * 获取指定位置的项目
   * @param index 索引位置(0-19)
   */
  function getItem(index: number): LauncherItem | null {
    return items.value.get(index) ?? null
  }

  /**
   * 清空所有项目
   */
  function clearAll() {
    items.value.forEach((_, index) => {
      items.value.set(index, null)
    })
    saveToStorage()
  }

  /**
   * 获取已使用的项目数量
   */
  const usedCount = computed(() => {
    let count = 0
    items.value.forEach((item) => {
      if (item) count++
    })
    return count
  })

  /**
   * 获取可用的项目数量
   */
  const availableCount = computed(() => MAX_ITEMS - usedCount.value)

  /**
   * 检查指定位置是否为空
   */
  function isSlotEmpty(index: number): boolean {
    return items.value.get(index) === null
  }

  /**
   * 交换两个位置的项目
   * @param fromIndex 源位置索引 (0-19)
   * @param toIndex 目标位置索引 (0-19)
   */
  function swapItems(fromIndex: number, toIndex: number): void {
    // 验证索引范围
    if (fromIndex < 0 || fromIndex >= MAX_ITEMS || toIndex < 0 || toIndex >= MAX_ITEMS) {
      console.error(`Invalid index: fromIndex=${fromIndex}, toIndex=${toIndex}`)
      return
    }

    // 如果是同一个位置，不需要交换
    if (fromIndex === toIndex) {
      return
    }

    // 获取两个位置的项目
    const fromItem = items.value.get(fromIndex)
    const toItem = items.value.get(toIndex)

    // 执行交换
    items.value.set(fromIndex, toItem ?? null)
    items.value.set(toIndex, fromItem ?? null)

    // 保存到 localStorage
    saveToStorage()
  }

  return {
    items,
    initialize,
    setItem,
    removeItem,
    getItem,
    clearAll,
    usedCount,
    availableCount,
    isSlotEmpty,
    swapItems
  }
})
