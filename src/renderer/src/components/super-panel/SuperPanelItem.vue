<template>
  <div
    class="w-full h-full flex flex-col items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-all group relative"
    :class="{
      'opacity-50': isDragging,
      'ring-2 ring-blue-400 ring-offset-1': isDropTarget,
      'cursor-move': item && !modalVisible
    }"
    :draggable="!!item && !modalVisible"
    @click="handleClick"
    @contextmenu.prevent="handleContextMenu"
    @dragstart="handleDragStart"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
    @dragend="handleDragEnd"
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
        <!-- 如果是AI快捷命令类型，显示 emoji 图标 -->
        <div
          v-else-if="item.type === 'ai-shortcut'"
          class="w-full h-full rounded flex items-center justify-center bg-blue-50 text-xl"
        >
          {{ item.icon }}
        </div>
        <!-- 如果是插件类型，显示 iconify 图标 -->
        <div
          v-else-if="item.type === 'plugin'"
          class="w-full h-full rounded flex items-center justify-center bg-purple-50"
        >
          <Icon :icon="item.icon" class="text-xl text-purple-600" />
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
        :mode="isEditMode ? 'edit' : 'add'"
        :initial-data="
          isEditMode && item?.type === 'file'
            ? { fileInfo: { name: item.name, path: item.path, extension: '' }, icon: item.icon }
            : undefined
        "
        @back="handleBack"
        @confirm="handleFileConfirm"
      />

      <!-- 添加文件夹视图 -->
      <AddFolderView
        v-else-if="currentView === 'add-folder'"
        :mode="isEditMode ? 'edit' : 'add'"
        :initial-data="
          isEditMode && item?.type === 'folder'
            ? { folderInfo: { name: item.name, path: item.path, extension: '' }, icon: item.icon }
            : undefined
        "
        @back="handleBack"
        @confirm="handleFolderConfirm"
      />

      <!-- 添加网页视图 -->
      <AddWebView
        v-else-if="currentView === 'add-web'"
        :mode="isEditMode ? 'edit' : 'add'"
        :initial-data="
          isEditMode && item?.type === 'web'
            ? { url: item.path, name: item.name, icon: item.icon }
            : undefined
        "
        @back="handleBack"
        @confirm="handleWebConfirm"
      />

      <!-- 添加CMD命令视图 -->
      <AddCmdView
        v-else-if="currentView === 'add-cmd'"
        :mode="isEditMode ? 'edit' : 'add'"
        :initial-data="
          isEditMode && item?.type === 'cmd'
            ? {
                command: item.path,
                name: item.name,
                icon: item.icon,
                shellType: item.shellType || 'cmd'
              }
            : undefined
        "
        @back="handleBack"
        @confirm="handleCmdConfirm"
      />

      <!-- 添加动作页视图 -->
      <AddActionPageView
        v-else-if="currentView === 'add-action-page'"
        :mode="isEditMode ? 'edit' : 'add'"
        :initial-data="
          isEditMode && item?.type === 'action-page'
            ? { pageId: item.path, pageName: item.name }
            : undefined
        "
        @back="handleBack"
        @confirm="handleActionPageConfirm"
      />

      <!-- 添加AI快捷命令视图 -->
      <AddAIShortcutView
        v-else-if="currentView === 'add-ai-shortcut'"
        :mode="isEditMode ? 'edit' : 'add'"
        :initial-data="
          isEditMode && item?.type === 'ai-shortcut'
            ? { shortcutId: item.path, shortcutName: item.name, shortcutIcon: item.icon }
            : undefined
        "
        @back="handleBack"
        @confirm="handleAIShortcutConfirm"
      />

      <!-- 添加插件视图 -->
      <AddPluginView
        v-else-if="currentView === 'add-plugin'"
        :mode="isEditMode ? 'edit' : 'add'"
        :initial-data="
          isEditMode && item?.type === 'plugin'
            ? { pluginId: item.path, pluginName: item.name, pluginIcon: item.icon }
            : undefined
        "
        @back="handleBack"
        @confirm="handlePluginConfirm"
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
import AddAIShortcutView from './AddAIShortcutView.vue'
import AddPluginView from './AddPluginView.vue'
import type { LauncherItemType, FileInfo } from '../../types/launcher'
import { useAIShortcutStore } from '../../stores/aiShortcut'
import { usePluginStore } from '../../stores/plugin'

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
const aiShortcutStore = useAIShortcutStore()
const pluginStore = usePluginStore()
const toast = useToast()
const contextMenu = useContextMenu()

// 状态
const modalVisible = ref(false)
const currentView = ref<
  | 'selector'
  | 'add-file'
  | 'add-folder'
  | 'add-web'
  | 'add-cmd'
  | 'add-action-page'
  | 'add-ai-shortcut'
  | 'add-plugin'
>('selector')
const isEditMode = ref(false) // 是否为编辑模式

// 拖拽相关状态
const isDragging = ref(false) // 当前 item 是否正在被拖拽
const isDropTarget = ref(false) // 当前 item 是否为拖拽目标（用于显示高亮）

// 拖拽数据传输类型标识
const DRAG_TYPE = 'application/x-superpanel-item'

/**
 * 重置所有拖拽相关状态
 * 用于确保状态清理的完整性
 */
function resetDragStates(): void {
  isDragging.value = false
  isDropTarget.value = false
}

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

// 获取显示名称（对于 action-page 和 plugin 类型，实时从 store 获取最新名称）
const displayName = computed(() => {
  if (!item.value) return ''

  // 如果是插件类型，从 pluginStore 实时获取插件名称
  if (item.value.type === 'plugin') {
    const plugin = pluginStore.plugins.find((p) => p.id === item.value!.path)
    return plugin ? plugin.name : item.value.name
  }

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
      label: '编辑',
      icon: 'mdi:pencil',
      action: handleEdit
    },
    {
      type: 'divider'
    },
    {
      type: 'item',
      label: '删除',
      icon: 'mdi:delete',
      danger: true,
      action: handleDelete
    }
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
    } else if (item.value.type === 'ai-shortcut') {
      // 如果是AI快捷命令类型，执行AI命令
      await executeAIShortcut()
    } else if (item.value.type === 'plugin') {
      // 如果是插件类型，执行插件
      await executePlugin()
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
 * 执行AI快捷命令
 */
async function executeAIShortcut(): Promise<void> {
  if (!item.value || item.value.type !== 'ai-shortcut') return

  const shortcutId = item.value.path // path 字段存储的是快捷命令ID
  const shortcut = aiShortcutStore.shortcuts.find((s) => s.id === shortcutId)

  if (shortcut) {
    // 打开AI快捷指令运行窗口
    console.log('=== 打开AI快捷指令运行窗口 ===')
    console.log('命令名称:', shortcut.name)
    console.log('命令图标:', shortcut.icon)
    console.log('提示词:', shortcut.prompt)
    console.log('===========================')

    // 🎉 简化流程：选中文本已在 Super Panel 显示时捕获并缓存
    // 现在直接打开 AI Runner，主进程会自动使用缓存的文本
    console.log('[SuperPanelItem] 打开 AI Runner（将使用缓存的选中文本）')

    // 调用 API 打开运行窗口（selectedText 将由主进程从缓存获取）
    window.api.aiShortcutRunner.open({
      id: shortcut.id,
      name: shortcut.name,
      icon: shortcut.icon,
      prompt: shortcut.prompt,
      autoExecute: true // 自动执行
    })

    // 然后隐藏 Super Panel
    setTimeout(() => {
      toast.clearAll()
      window.api.superPanel.hide()
    }, 50)
  } else {
    toast.error('AI命令不存在，可能已被删除')
    // 如果命令不存在，删除这个无效的 item
    handleDelete()
  }
}

/**
 * 执行插件
 *
 * 🚀 性能优化：
 * 1. 移除不必要的 loadPlugins() 调用，直接使用缓存的插件列表
 * 2. 减少人为延迟，提升响应速度
 * 3. 优化执行流程，并行处理非依赖操作
 */
async function executePlugin(): Promise<void> {
  if (!item.value || item.value.type !== 'plugin') return

  const pluginId = item.value.path // path 字段存储的是插件ID

  // ⚡ 性能优化：直接从缓存的插件列表中查找，避免每次都重新加载
  // 注意：如果需要同步插件管理器的状态变化，应该通过事件监听机制，而不是每次都重新加载
  const plugin = pluginStore.plugins.find((p) => p.id === pluginId)

  // ✅ 第一步：状态检查，避免无效执行
  // 如果插件不存在，显示错误并返回，不隐藏 SuperPanel
  if (!plugin) {
    console.error('插件不存在，可能已被卸载')
    toast.error('插件不存在，可能已被卸载')
    return
  }

  // 如果插件未启用，显示警告并返回，不隐藏 SuperPanel
  if (!plugin.activated) {
    console.warn('插件未启用，请先在设置中启用该插件')
    toast.warning('插件未启用，请先在设置中启用该插件')
    return
  }

  // ✅ 第二步：状态检查通过，准备执行
  const pluginName = plugin.name || item.value.name

  console.log('=== 执行插件 ===')
  console.log('插件名称:', pluginName)
  console.log('插件ID:', pluginId)
  console.log('插件状态: 已启用 ✓')
  console.log('================')

  // ⚡ 性能优化：并行获取捕获文本和准备隐藏面板
  // 获取捕获的选中文本（必须在隐藏 SuperPanel 之前获取）
  let capturedText = ''
  try {
    capturedText = await window.api.superPanel.getCapturedText()
    console.log('[SuperPanelItem] 捕获的文本长度:', capturedText.length)
  } catch (err) {
    console.error('[SuperPanelItem] 获取捕获文本失败:', err)
    capturedText = ''
  }

  // ✅ 第三步：立即隐藏 SuperPanel 并执行插件
  // 插件可能会显示对话框或窗口，需要立即隐藏 SuperPanel 避免焦点冲突
  toast.clearAll()
  window.api.superPanel.hide()

  // ⚡ 性能优化：减少延迟，使用微任务队列确保 UI 更新后再执行插件
  // 使用 requestAnimationFrame 确保 UI 渲染完成，比 setTimeout 更精确
  requestAnimationFrame(() => {
    // 使用 setTimeout(0) 将任务放到下一个宏任务队列，确保面板隐藏完成
    setTimeout(async () => {
      try {
        // 构建插件参数，将选中文本作为 text 参数传递
        const params = capturedText ? { text: capturedText } : undefined

        // 调用主进程的执行 API
        await pluginStore.executePlugin(pluginId, params)
        console.log(`插件「${pluginName}」执行完成`)
      } catch (error) {
        console.error('执行插件失败:', error)
        const errorMessage = (error as Error).message

        // 显示详细错误信息
        toast.error(`执行插件失败: ${errorMessage}`)
      }
    }, 0)
  })
}

/**
 * 启动应用/打开文件
 */
async function launchApp(): Promise<void> {
  if (!item.value) return

  try {
    let pathToExecute = item.value.path

    // 如果是 CMD 类型且包含 [TEXT] 占位符，需要替换为选中的文本
    if (item.value.type === 'cmd' && pathToExecute.includes('[TEXT]')) {
      // 获取捕获的选中文本
      let capturedText = ''
      try {
        capturedText = await window.api.superPanel.getCapturedText()
      } catch (err) {
        console.error('[SuperPanelItem] 获取捕获文本失败:', err)
      }

      // 如果没有选中文本，提示用户
      if (!capturedText.trim()) {
        toast.warning('命令需要选中文本，请先选中文本后再执行')
        return
      }

      // 替换所有 [TEXT] 占位符
      pathToExecute = pathToExecute.replace(/\[TEXT\]/g, capturedText)
      console.log('[SuperPanelItem] 占位符替换完成:', pathToExecute)
    }

    const success = await window.api.launcher.launchApp(
      pathToExecute,
      item.value.type,
      item.value.shellType
    )
    if (success) {
      // 500ms后先清除 Toast,然后关闭 SuperPanel
      setTimeout(() => {
        // 先清除所有 Toast
        toast.clearAll()
        // 等待 Toast 动画完成后再关闭 SuperPanel
        setTimeout(() => {
          window.api.superPanel.hide()
        }, 100) // Toast 动画时间
      }, 50)
    } else {
      toast.error('打开失败')
    }
  } catch (error) {
    console.error('Error opening file:', error)
    toast.error('打开失败')
  }
}

/**
 * 打开Modal（添加模式）
 */
function openModal(): void {
  isEditMode.value = false
  currentView.value = 'selector'
  modalVisible.value = true
}

/**
 * 处理编辑
 */
function handleEdit(): void {
  if (!item.value) return

  isEditMode.value = true

  // 根据类型打开对应的编辑视图
  switch (item.value.type) {
    case 'file':
      currentView.value = 'add-file'
      break
    case 'folder':
      currentView.value = 'add-folder'
      break
    case 'web':
      currentView.value = 'add-web'
      break
    case 'cmd':
      currentView.value = 'add-cmd'
      break
    case 'action-page':
      currentView.value = 'add-action-page'
      break
    case 'ai-shortcut':
      currentView.value = 'add-ai-shortcut'
      break
    case 'plugin':
      currentView.value = 'add-plugin'
      break
  }

  modalVisible.value = true
}

/**
 * 关闭Modal
 */
function handleModalClose(): void {
  modalVisible.value = false
  currentView.value = 'selector'
  isEditMode.value = false
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
  } else if (type === 'ai-shortcut') {
    currentView.value = 'add-ai-shortcut'
  } else if (type === 'plugin') {
    currentView.value = 'add-plugin'
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

  // 编辑模式：保留原有 id 和 createdAt
  // 添加模式：生成新的 id 和 createdAt
  const newItem = {
    id: isEditMode.value && item.value ? item.value.id : generateUuid.new(),
    type: 'file' as const,
    name: fileInfo.name,
    path: fileInfo.path,
    icon: icon,
    createdAt: isEditMode.value && item.value ? item.value.createdAt : Date.now()
  }

  // 根据区域保存到不同的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  // 关闭Modal
  handleModalClose()

  toast.success(isEditMode.value ? '保存成功' : '添加成功')
}

/**
 * 处理文件夹确认
 */
function handleFolderConfirm(data: { folderInfo: FileInfo; icon: string }): void {
  const { folderInfo, icon } = data

  // 编辑模式：保留原有 id 和 createdAt
  // 添加模式：生成新的 id 和 createdAt
  const newItem = {
    id: isEditMode.value && item.value ? item.value.id : generateUuid.new(),
    type: 'folder' as const,
    name: folderInfo.name,
    path: folderInfo.path,
    icon: icon,
    createdAt: isEditMode.value && item.value ? item.value.createdAt : Date.now()
  }

  // 根据区域保存到不同的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  // 关闭Modal
  handleModalClose()

  toast.success(isEditMode.value ? '保存成功' : '添加成功')
}

/**
 * 处理网页确认
 */
function handleWebConfirm(data: { url: string; name: string; icon: string }): void {
  const { url, name, icon } = data

  // 编辑模式：保留原有 id 和 createdAt
  // 添加模式：生成新的 id 和 createdAt
  const newItem = {
    id: isEditMode.value && item.value ? item.value.id : generateUuid.new(),
    type: 'web' as const,
    name: name,
    path: url,
    icon: icon,
    createdAt: isEditMode.value && item.value ? item.value.createdAt : Date.now()
  }

  // 根据区域保存到不同的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  // 关闭Modal
  handleModalClose()

  toast.success(isEditMode.value ? '保存成功' : '添加成功')
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

  // 编辑模式：保留原有 id 和 createdAt
  // 添加模式：生成新的 id 和 createdAt
  const newItem = {
    id: isEditMode.value && item.value ? item.value.id : generateUuid.new(),
    type: 'cmd' as const,
    name: name,
    path: command, // 将命令存储在 path 字段中
    icon: icon,
    shellType: shellType, // 存储 shell 类型
    createdAt: isEditMode.value && item.value ? item.value.createdAt : Date.now()
  }

  // 根据区域保存到不同的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  // 关闭Modal
  handleModalClose()

  toast.success(isEditMode.value ? '保存成功' : '添加成功')
}

/**
 * 处理动作页确认
 */
function handleActionPageConfirm(data: { pageId: string; pageName: string }): void {
  const { pageId, pageName } = data

  // 编辑模式：保留原有 id 和 createdAt
  // 添加模式：生成新的 id 和 createdAt
  const newItem = {
    id: isEditMode.value && item.value ? item.value.id : generateUuid.new(),
    type: 'action-page' as const,
    name: pageName, // 存储当前名称（实际显示时会从 store 实时获取）
    path: pageId, // 将页面ID存储在 path 字段中
    icon: 'mdi:page-layout-header-footer', // 使用固定图标
    createdAt: isEditMode.value && item.value ? item.value.createdAt : Date.now()
  }

  // 根据区域保存到不同的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  // 关闭Modal
  handleModalClose()

  toast.success(isEditMode.value ? '保存成功' : '添加成功')
}

/**
 * 处理AI快捷命令确认
 */
function handleAIShortcutConfirm(data: {
  shortcutId: string
  shortcutName: string
  shortcutIcon: string
}): void {
  const { shortcutId, shortcutName, shortcutIcon } = data

  // 编辑模式：保留原有 id 和 createdAt
  // 添加模式：生成新的 id 和 createdAt
  const newItem = {
    id: isEditMode.value && item.value ? item.value.id : generateUuid.new(),
    type: 'ai-shortcut' as const,
    name: shortcutName,
    path: shortcutId, // 将快捷命令ID存储在 path 字段中
    icon: shortcutIcon, // 存储 emoji 图标
    createdAt: isEditMode.value && item.value ? item.value.createdAt : Date.now()
  }

  // 根据区域保存到不同的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  // 关闭Modal
  handleModalClose()

  toast.success(isEditMode.value ? '保存成功' : '添加成功')
}

/**
 * 处理插件确认
 */
function handlePluginConfirm(data: {
  pluginId: string
  pluginName: string
  pluginIcon: string
}): void {
  const { pluginId, pluginName, pluginIcon } = data

  // 编辑模式：保留原有 id 和 createdAt
  // 添加模式：生成新的 id 和 createdAt
  const newItem = {
    id: isEditMode.value && item.value ? item.value.id : generateUuid.new(),
    type: 'plugin' as const,
    name: pluginName,
    path: pluginId, // 将插件ID存储在 path 字段中
    icon: pluginIcon, // 存储 iconify 图标
    createdAt: isEditMode.value && item.value ? item.value.createdAt : Date.now()
  }

  // 根据区域保存到不同的 store
  if (props.area === 'main') {
    appLauncherStore.setItem(props.index, newItem)
  } else {
    actionPageStore.setCurrentPageItem(props.index, newItem)
  }

  // 关闭Modal
  handleModalClose()

  toast.success(isEditMode.value ? '保存成功' : '添加成功')
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

// ==================== 拖拽相关功能 ====================

/**
 * 处理拖拽开始事件
 * @param event 拖拽事件
 */
function handleDragStart(event: DragEvent): void {
  // 只有当存在 item 且未打开 Modal 时才允许拖拽
  if (!item.value || modalVisible.value || !event.dataTransfer) return

  // 设置拖拽状态
  isDragging.value = true

  // 设置拖拽数据
  const dragData = {
    index: props.index,
    area: props.area
  }

  // 设置拖拽数据和效果
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(dragData))

  // 设置拖拽时的视觉效果（可选）
  if (event.dataTransfer.setDragImage && event.target instanceof HTMLElement) {
    // 使用当前元素作为拖拽图像
    event.dataTransfer.setDragImage(
      event.target,
      event.target.offsetWidth / 2,
      event.target.offsetHeight / 2
    )
  }
}

/**
 * 处理拖拽悬停事件
 * @param event 拖拽事件
 */
function handleDragOver(event: DragEvent): void {
  if (!event.dataTransfer) return

  // 检查是否是有效的拖拽类型
  const types = event.dataTransfer.types
  if (!types.includes(DRAG_TYPE)) {
    return
  }

  // 获取拖拽数据
  const dragDataStr = event.dataTransfer.getData(DRAG_TYPE)
  let dragData: { index: number; area: string } | null = null

  try {
    dragData = dragDataStr ? JSON.parse(dragDataStr) : null
  } catch {
    // Safari 在 dragover 事件中可能无法访问数据，这是正常的
    // 我们仍然允许 drop，因为实际验证会在 drop 事件中进行
  }

  // 如果能解析到数据，验证是否同一区域
  if (dragData && dragData.area !== props.area) {
    // 不同区域不允许拖拽
    event.dataTransfer.dropEffect = 'none'
    return
  }

  // 如果是相同的 item，不显示 drop target 效果
  if (dragData && dragData.index === props.index) {
    isDropTarget.value = false
    event.dataTransfer.dropEffect = 'none'
    return
  }

  // 允许放置
  event.dataTransfer.dropEffect = 'move'
  isDropTarget.value = true
}

/**
 * 处理拖拽离开事件
 */
function handleDragLeave(): void {
  isDropTarget.value = false
}

/**
 * 处理放置事件
 * @param event 拖拽事件
 */
function handleDrop(event: DragEvent): void {
  // 立即重置拖拽状态（第一层防护）
  resetDragStates()

  if (!event.dataTransfer) return

  try {
    // 获取拖拽数据
    const dragDataStr = event.dataTransfer.getData(DRAG_TYPE)
    if (!dragDataStr) {
      console.warn('No drag data found')
      return
    }

    const dragData = JSON.parse(dragDataStr) as { index: number; area: string }

    // 验证：必须在同一区域内拖拽
    if (dragData.area !== props.area) {
      console.warn('Cannot drag items between different areas')
      return
    }

    // 验证：不能拖到自己
    if (dragData.index === props.index) {
      return
    }

    // 执行交换
    const fromIndex = dragData.index
    const toIndex = props.index

    if (props.area === 'main') {
      appLauncherStore.swapItems(fromIndex, toIndex)
    } else {
      actionPageStore.swapCurrentPageItems(fromIndex, toIndex)
    }

    // 显示成功提示（可选，避免过于频繁的提示）
    // toast.success('位置已交换')
  } catch (error) {
    console.error('Error handling drop:', error)
    toast.error('操作失败')
  } finally {
    // 添加延迟兜底清理（第四层防护）
    // 防止在某些极端情况下状态没有被正确重置
    setTimeout(() => {
      resetDragStates()
    }, 100)
  }
}

/**
 * 处理拖拽结束事件（第三层防护）
 */
function handleDragEnd(): void {
  // 使用统一的重置函数
  resetDragStates()
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

/**
 * 监听 item 数据变化，自动重置拖拽状态（第二层防护 - 关键！）
 *
 * 当 item 数据发生变化时（通常是因为拖拽交换），
 * 立即重置当前组件的拖拽状态，避免状态残留。
 *
 * 这是解决"拖拽后变灰"问题的核心机制：
 * - 交换发生时，组件实例不变，但显示的数据变了
 * - 此时必须清理旧的拖拽状态，否则会出现视觉残留
 */
watch(
  item,
  () => {
    // 当 item 变化时，重置所有拖拽相关状态
    // 这确保了数据交换后，组件状态与新数据保持一致
    resetDragStates()
  },
  { deep: true }
)

// 组件挂载时初始化 store (仅第一个组件执行)
onMounted(async () => {
  if (props.index === 0) {
    if (props.area === 'main') {
      appLauncherStore.initialize()
      // 初始化 AI 快捷指令 Store
      aiShortcutStore.initialize()
      // 加载插件列表（用于显示插件名称和执行插件）
      await pluginStore.loadPlugins()
    } else {
      actionPageStore.initialize()
    }
  }
})
</script>
