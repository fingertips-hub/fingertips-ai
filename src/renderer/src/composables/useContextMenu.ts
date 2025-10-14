import { ref } from 'vue'
import type { ContextMenuItem } from '../components/common/ContextMenu.vue'

/**
 * 全局右键菜单状态管理
 * 确保同一时间只有一个右键菜单打开
 */

// 全局状态（所有组件共享）
const globalVisible = ref(false)
const globalX = ref(0)
const globalY = ref(0)
const globalMenuItems = ref<ContextMenuItem[]>([])
const globalOnClose = ref<(() => void) | null>(null)

/**
 * 右键菜单 Composable
 *
 * @returns 右键菜单状态和控制方法
 */
export function useContextMenu() {
  /**
   * 打开右键菜单
   *
   * @param x - 鼠标X坐标
   * @param y - 鼠标Y坐标
   * @param menuItems - 菜单项列表
   * @param onClose - 关闭回调（可选）
   */
  function openContextMenu(
    x: number,
    y: number,
    menuItems: ContextMenuItem[],
    onClose?: () => void
  ): void {
    // 先关闭之前的菜单
    closeContextMenu()

    // 打开新菜单
    globalX.value = x
    globalY.value = y
    globalMenuItems.value = menuItems
    globalOnClose.value = onClose || null
    globalVisible.value = true
  }

  /**
   * 关闭右键菜单
   */
  function closeContextMenu(): void {
    if (globalVisible.value && globalOnClose.value) {
      globalOnClose.value()
    }
    globalVisible.value = false
    globalOnClose.value = null
  }

  return {
    // 全局状态（只读）
    visible: globalVisible,
    x: globalX,
    y: globalY,
    menuItems: globalMenuItems,
    // 方法
    openContextMenu,
    closeContextMenu
  }
}
