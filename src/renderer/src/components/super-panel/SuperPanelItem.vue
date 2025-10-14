<template>
  <div
    class="w-full h-full flex flex-col items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-all group relative"
    @click="handleClick"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- 如果有应用,显示应用信息 -->
    <template v-if="item">
      <!-- 应用图标 -->
      <div class="w-8 h-8 mb-1">
        <!-- 如果是文件夹类型，显示 iconify 图标 -->
        <div
          v-if="item.type === 'folder'"
          class="w-full h-full bg-blue-50 rounded flex items-center justify-center"
        >
          <Icon icon="mdi:folder" class="text-xl text-blue-500" />
        </div>
        <!-- 如果是网页类型，显示 favicon 或 iconify 图标 -->
        <template v-else-if="item.type === 'web'">
          <!-- 如果是 base64 图片或 URL，显示图片 -->
          <img
            v-if="
              item.icon.startsWith('data:') ||
              item.icon.startsWith('http://') ||
              item.icon.startsWith('https://')
            "
            :src="item.icon"
            alt="Website Icon"
            class="w-full h-full rounded"
          />
          <!-- 否则显示 iconify 图标 -->
          <div
            v-else
            class="w-full h-full rounded flex items-center justify-center"
            :class="getWebIconBgColor(item.icon)"
          >
            <Icon :icon="item.icon" class="text-xl" :class="getWebIconColor(item.icon)" />
          </div>
        </template>
        <!-- 如果是CMD类型，显示 iconify 图标 -->
        <div
          v-else-if="item.type === 'cmd'"
          class="w-full h-full rounded flex items-center justify-center"
          :class="getCmdIconBgColor(item.icon)"
        >
          <Icon :icon="item.icon" class="text-xl" :class="getCmdIconColor(item.icon)" />
        </div>
        <!-- 如果是动作页类型，显示 iconify 图标 -->
        <div
          v-else-if="item.type === 'action-page'"
          class="w-full h-full rounded flex items-center justify-center bg-blue-50"
        >
          <Icon icon="mdi:page-layout-header-footer" class="text-xl text-blue-500" />
        </div>
        <!-- 如果有图标且不是文件夹或网页，显示图片 -->
        <img v-else-if="item.icon" :src="item.icon" alt="App Icon" class="w-full h-full" />
        <!-- 默认图标 -->
        <div v-else class="w-full h-full bg-gray-200 rounded flex items-center justify-center">
          <Icon icon="mdi:application" class="text-xl text-gray-400" />
        </div>
      </div>

      <!-- 应用名称 -->
      <div
        class="text-[10px] text-gray-700 text-center px-2 line-clamp-2 group-hover:text-blue-600"
      >
        {{ displayName }}
      </div>
    </template>

    <!-- 如果没有应用,显示加号按钮 -->
    <template v-else>
      <Icon icon="mdi:plus" class="text-3xl text-gray-400 group-hover:text-blue-500" />
    </template>

    <!-- Modal -->
    <AddItemModal v-model:visible="modalVisible" @close="handleModalClose">
      <!-- 类型选择器 -->
      <ItemTypeSelector v-if="currentView === 'selector'" @select="handleTypeSelect" />

      <!-- 添加文件视图 -->
      <AddFileView
        v-else-if="currentView === 'add-file'"
        @back="handleBack"
        @confirm="handleFileConfirm"
      />

      <!-- 添加文件夹视图 -->
      <AddFolderView
        v-else-if="currentView === 'add-folder'"
        @back="handleBack"
        @confirm="handleFolderConfirm"
      />

      <!-- 添加网页视图 -->
      <AddWebView
        v-else-if="currentView === 'add-web'"
        @back="handleBack"
        @confirm="handleWebConfirm"
      />

      <!-- 添加CMD命令视图 -->
      <AddCmdView
        v-else-if="currentView === 'add-cmd'"
        @back="handleBack"
        @confirm="handleCmdConfirm"
      />

      <!-- 添加动作页视图 -->
      <AddActionPageView
        v-else-if="currentView === 'add-action-page'"
        @back="handleBack"
        @confirm="handleActionPageConfirm"
      />
    </AddItemModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ShortUniqueId from 'short-uuid'
import { useAppLauncherStore } from '../../stores/appLauncher'
import { useActionPageStore } from '../../stores/actionPage'
import { useToast } from '../../composables/useToast'
import { useContextMenu } from '../../composables/useContextMenu'
import type { ContextMenuItem } from '../common/ContextMenu.vue'
import AddItemModal from './AddItemModal.vue'
import ItemTypeSelector from './ItemTypeSelector.vue'
import AddFileView from './AddFileView.vue'
import AddFolderView from './AddFolderView.vue'
import AddWebView from './AddWebView.vue'
import AddCmdView from './AddCmdView.vue'
import AddActionPageView from './AddActionPageView.vue'
import type { LauncherItemType, FileInfo } from '../../types/launcher'

// 创建 short-uuid 生成器
const generateUuid = ShortUniqueId()

interface Props {
  index: number // 当前项的索引(0-19)
  area?: 'main' | 'action' // 区域类型：main=常用功能区, action=动作页区域
}

const props = withDefaults(defineProps<Props>(), {
  area: 'main'
})

const appLauncherStore = useAppLauncherStore()
const actionPageStore = useActionPageStore()
const toast = useToast()
const contextMenu = useContextMenu()

// 状态
const modalVisible = ref(false)
const currentView = ref<
  'selector' | 'add-file' | 'add-folder' | 'add-web' | 'add-cmd' | 'add-action-page'
>('selector')

// 获取当前位置的项目
// 根据区域类型从不同的 store 获取
const item = computed(() => {
  if (props.area === 'main') {
    return appLauncherStore.getItem(props.index)
  } else {
    // action 区域从 actionPageStore 获取当前页面的 item
    return actionPageStore.getCurrentPageItem(props.index)
  }
})

// 获取显示名称（对于 action-page 类型，实时从 store 获取最新名称）
const displayName = computed(() => {
  if (!item.value) return ''

  // 如果是动作页类型，从 actionPageStore 实时获取页面名称
  if (item.value.type === 'action-page') {
    const pageId = item.value.path // path 字段存储的是页面ID
    const page = actionPageStore.pages.get(pageId)
    return page?.title || item.value.name
  }

  return item.value.name
})

/**
 * 右键菜单项配置
 */
const contextMenuItems = computed<ContextMenuItem[]>(() => {
  if (!item.value) return []

  return [
    {
      type: 'item',
      label: '删除',
      icon: 'mdi:delete',
      danger: true,
      action: handleDelete
    }
    // 未来可以在这里添加更多菜单项，例如：
    // {
    //   type: 'item',
    //   label: '编辑',
    //   icon: 'mdi:pencil',
    //   action: handleEdit
    // },
    // {
    //   type: 'divider'
    // },
    // {
    //   type: 'item',
    //   label: '移动到...',
    //   icon: 'mdi:arrow-right',
    //   action: handleMove
    // }
  ]
})

/**
 * 处理右键菜单
 */
function handleContextMenu(e: MouseEvent): void {
  // 只有当有 item 时才显示右键菜单
  if (!item.value) return

  // 使用全局右键菜单管理器打开菜单
  contextMenu.openContextMenu(e.clientX, e.clientY, contextMenuItems.value)
}

/**
 * 处理点击事件
 */
async function handleClick(): Promise<void> {
  if (item.value) {
    // 如果是动作页类型，切换到对应页面
    if (item.value.type === 'action-page') {
      switchToActionPage()
    } else {
      // 其他类型，启动应用
      await launchApp()
    }
  } else {
    // 如果没有应用,打开添加Modal
    openModal()
  }
}

/**
 * 切换到动作页
 */
function switchToActionPage(): void {
  if (!item.value || item.value.type !== 'action-page') return

  const pageId = item.value.path // path 字段存储的是页面ID
  const page = actionPageStore.pages.get(pageId)

  if (page) {
    actionPageStore.setCurrentPage(pageId)
    toast.success(`已切换到「${page.title}」`)
  } else {
    toast.error('动作页不存在，可能已被删除')
    // 如果页面不存在，删除这个无效的 item
    handleDelete()
  }
}

/**
 * 启动应用/打开文件
 */
async function launchApp(): Promise<void> {
  if (!item.value) return

  try {
    const success = await window.api.launcher.launchApp(
      item.value.path,
      item.value.type,
      item.value.shellType
    )
    if (success) {
      toast.success(`正在打开 ${item.value.name}`)

      // 500ms后先清除 Toast,然后关闭 SuperPanel
      setTimeout(() => {
        // 先清除所有 Toast
        toast.clearAll()
        // 等待 Toast 动画完成后再关闭 SuperPanel
        setTimeout(() => {
          window.api.superPanel.hide()
        }, 300) // Toast 动画时间
      }, 500)
    } else {
      toast.error('打开失败')
    }
  } catch (error) {
    console.error('Error opening file:', error)
    toast.error('打开失败')
  }
}

/**
 * 打开Modal
 */
function openModal(): void {
  currentView.value = 'selector'
  modalVisible.value = true
}

/**
 * 关闭Modal
 */
function handleModalClose(): void {
  modalVisible.value = false
  currentView.value = 'selector'
}

/**
 * 处理类型选择
 */
function handleTypeSelect(type: LauncherItemType): void {
  if (type === 'file') {
    currentView.value = 'add-file'
  } else if (type === 'folder') {
    currentView.value = 'add-folder'
  } else if (type === 'web') {
    currentView.value = 'add-web'
  } else if (type === 'cmd') {
    currentView.value = 'add-cmd'
  } else if (type === 'action-page') {
    currentView.value = 'add-action-page'
  }
}

/**
 * 返回类型选择器
 */
function handleBack(): void {
  currentView.value = 'selector'
}

/**
 * 处理文件确认
 */
function handleFileConfirm(data: { fileInfo: FileInfo; icon: string }): void {
  const { fileInfo, icon } = data

  // 创建启动器项目
  const newItem = {
    id: generateUuid.new(),
    type: 'file' as const,
    name: fileInfo.name,
    path: fileInfo.path,
    icon: icon,
    createdAt: Date.now()
  }

  // 根据区域保存到不同的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  // 关闭Modal
  handleModalClose()

  toast.success('添加成功')
}

/**
 * 处理文件夹确认
 */
function handleFolderConfirm(data: { folderInfo: FileInfo; icon: string }): void {
  const { folderInfo, icon } = data

  // 创建启动器项目
  const newItem = {
    id: generateUuid.new(),
    type: 'folder' as const,
    name: folderInfo.name,
    path: folderInfo.path,
    icon: icon,
    createdAt: Date.now()
  }

  // 根据区域保存到不同的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  // 关闭Modal
  handleModalClose()

  toast.success('添加成功')
}

/**
 * 处理网页确认
 */
function handleWebConfirm(data: { url: string; name: string; icon: string }): void {
  const { url, name, icon } = data

  // 创建启动器项目
  const newItem = {
    id: generateUuid.new(),
    type: 'web' as const,
    name: name,
    path: url,
    icon: icon,
    createdAt: Date.now()
  }

  // 根据区域保存到不同的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  // 关闭Modal
  handleModalClose()

  toast.success('添加成功')
}

/**
 * 处理CMD命令确认
 */
function handleCmdConfirm(data: {
  command: string
  name: string
  icon: string
  shellType: 'cmd' | 'powershell'
}): void {
  const { command, name, icon, shellType } = data

  // 创建启动器项目
  const newItem = {
    id: generateUuid.new(),
    type: 'cmd' as const,
    name: name,
    path: command, // 将命令存储在 path 字段中
    icon: icon,
    shellType: shellType, // 存储 shell 类型
    createdAt: Date.now()
  }

  // 根据区域保存到不同的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  // 关闭Modal
  handleModalClose()

  toast.success('添加成功')
}

/**
 * 处理动作页确认
 */
function handleActionPageConfirm(data: { pageId: string; pageName: string }): void {
  const { pageId, pageName } = data

  // 创建启动器项目
  const newItem = {
    id: generateUuid.new(),
    type: 'action-page' as const,
    name: pageName, // 存储当前名称（实际显示时会从 store 实时获取）
    path: pageId, // 将页面ID存储在 path 字段中
    icon: 'mdi:page-layout-header-footer', // 使用固定图标
    createdAt: Date.now()
  }

  // 根据区域保存到不同的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  // 关闭Modal
  handleModalClose()

  toast.success('添加成功')
}

/**
 * 删除应用
 */
async function handleDelete(): Promise<void> {
  if (!item.value) return

  if (confirm(`确定要删除 ${item.value.name} 吗?`)) {
    // 根据区域从不同的 store 删除
    if (props.area === 'main') {
      appLauncherStore.removeItem(props.index)
    } else {
      actionPageStore.removeCurrentPageItem(props.index)
    }
    toast.success('删除成功')
  }
}

/**
 * 获取网页图标背景颜色
 */
function getWebIconBgColor(icon: string): string {
  const iconColorMap: Record<string, string> = {
    'mdi:web': 'bg-blue-50',
    'mdi:google-chrome': 'bg-yellow-50',
    'mdi:microsoft-edge': 'bg-blue-50',
    'mdi:firefox': 'bg-orange-50',
    'mdi:earth': 'bg-green-50',
    'mdi:link-variant': 'bg-purple-50',
    'mdi:web-box': 'bg-indigo-50',
    'mdi:application-brackets': 'bg-cyan-50',
    'mdi:cloud': 'bg-sky-50',
    'mdi:star': 'bg-yellow-50',
    'mdi:bookmark': 'bg-pink-50',
    'mdi:heart': 'bg-red-50'
  }
  return iconColorMap[icon] || 'bg-blue-50'
}

/**
 * 获取网页图标颜色
 */
function getWebIconColor(icon: string): string {
  const iconColorMap: Record<string, string> = {
    'mdi:web': 'text-blue-500',
    'mdi:google-chrome': 'text-yellow-500',
    'mdi:microsoft-edge': 'text-blue-600',
    'mdi:firefox': 'text-orange-500',
    'mdi:earth': 'text-green-500',
    'mdi:link-variant': 'text-purple-500',
    'mdi:web-box': 'text-indigo-500',
    'mdi:application-brackets': 'text-cyan-500',
    'mdi:cloud': 'text-sky-500',
    'mdi:star': 'text-yellow-600',
    'mdi:bookmark': 'text-pink-500',
    'mdi:heart': 'text-red-500'
  }
  return iconColorMap[icon] || 'text-blue-500'
}

/**
 * 获取CMD图标背景颜色
 */
function getCmdIconBgColor(icon: string): string {
  const iconColorMap: Record<string, string> = {
    'mdi:console': 'bg-blue-50',
    'mdi:terminal': 'bg-green-50',
    'mdi:code-braces': 'bg-purple-50',
    'mdi:application-brackets': 'bg-orange-50',
    'mdi:script-text': 'bg-teal-50',
    'mdi:cog': 'bg-gray-100'
  }
  return iconColorMap[icon] || 'bg-blue-50'
}

/**
 * 获取CMD图标颜色
 */
function getCmdIconColor(icon: string): string {
  const iconColorMap: Record<string, string> = {
    'mdi:console': 'text-blue-500',
    'mdi:terminal': 'text-green-500',
    'mdi:code-braces': 'text-purple-500',
    'mdi:application-brackets': 'text-orange-500',
    'mdi:script-text': 'text-teal-500',
    'mdi:cog': 'text-gray-600'
  }
  return iconColorMap[icon] || 'text-blue-500'
}

// 监听 Modal 状态变化,通知主进程
watch(modalVisible, (newValue) => {
  window.api.superPanel.setModalOpen(newValue)
})

// 组件挂载时初始化 store (仅第一个组件执行)
onMounted(() => {
  if (props.index === 0) {
    if (props.area === 'main') {
      appLauncherStore.initialize()
    } else {
      actionPageStore.initialize()
    }
  }
})
</script>
