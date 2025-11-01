<template>
  <div class="dynamic-island-container">
    <div
      ref="islandRef"
      class="dynamic-island"
      :class="{ expanded: isExpanded }"
      @click="handleExpand"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <!-- 折叠状态内容 -->
      <transition name="fade">
        <div v-if="!isExpanded" class="collapsed-content">
          <!-- 左侧组件 -->
          <div v-if="leftWidget" class="widget-slot widget-left" v-html="leftWidget"></div>

          <!-- 中间组件 -->
          <div v-if="centerWidget" class="widget-slot widget-center" v-html="centerWidget"></div>

          <!-- 右侧组件 -->
          <div v-if="rightWidget" class="widget-slot widget-right" v-html="rightWidget"></div>

          <!-- 默认占位 -->
          <div v-if="!leftWidget && !centerWidget && !rightWidget" class="widget-placeholder">
            <div class="status-indicator"></div>
            <span class="status-text">Fingertips AI</span>
          </div>
        </div>
      </transition>

      <!-- 展开状态内容 -->
      <transition name="fade">
        <div v-if="isExpanded" class="expanded-content">
          <!-- 标题栏 -->
          <div class="expanded-header">
            <div class="expanded-title-group">
              <h3 class="expanded-title">Dynamic Island</h3>
            </div>
            <div class="expanded-actions">
              <button v-if="!isEditMode" class="edit-btn" title="编辑" @click.stop="toggleEditMode">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button v-if="isEditMode" class="done-btn" title="完成" @click.stop="toggleEditMode">
                完成
              </button>
              <button class="collapse-btn" title="收起" @click.stop="handleCollapse">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- 组件网格区域 -->
          <div class="expanded-body">
            <div
              class="widget-grid"
              :class="{ 'edit-mode': isEditMode }"
              @dragover.prevent="handleGridDragOver"
              @drop.prevent="handleGridDrop"
            >
              <!-- 渲染所有展开组件 -->
              <div
                v-for="(widget, index) in expandedWidgets"
                :key="widget.widgetId"
                class="widget-card"
                :class="[
                  `size-${widget.manifest?.expandedSize || 'small'}`,
                  {
                    disabled: !widget.enabled,
                    dragging: widget.isDragging
                  }
                ]"
                :style="getWidgetCardStyle(widget, index)"
                :draggable="isEditMode"
                @dragstart="handleDragStart($event, widget)"
                @dragend="handleDragEnd"
              >
                <!-- 删除按钮（编辑模式） -->
                <button
                  v-if="isEditMode"
                  class="widget-delete-btn"
                  @click.stop="handleDeleteWidget(widget)"
                >
                  ×
                </button>

                <!-- 组件内容 -->
                <div v-if="widget.enabled" class="widget-content" v-html="widget.content"></div>

                <!-- 禁用状态遮罩 -->
                <div v-if="!widget.enabled" class="widget-disabled-overlay">
                  <span>已禁用</span>
                </div>
              </div>

              <!-- 独立占位符：使用绝对定位，基于网格坐标显示 -->
              <div
                v-if="draggedWidget && dragOverIndex >= 0"
                class="drop-placeholder-absolute"
                :class="{ 'placeholder-large': draggedWidget.manifest?.expandedSize === 'large' }"
                :style="getPlaceholderStyle()"
              ></div>

              <!-- 空状态 -->
              <div v-if="expandedWidgets.length === 0" class="empty-state">
                <div class="empty-icon">📦</div>
                <div class="empty-text">暂无组件</div>
                <div class="empty-hint">前往设置添加展开组件</div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 状态
const isExpanded = ref(false)
const islandRef = ref<HTMLElement | null>(null)
const isAnimating = ref(false)
const isEditMode = ref(false)

// 折叠状态组件
const leftWidget = ref<string>('')
const centerWidget = ref<string>('')
const rightWidget = ref<string>('')

// 展开状态组件
interface ExpandedWidgetItem {
  widgetId: string
  row: number
  col: number
  rowSpan: number
  colSpan: number
  enabled: boolean
  content?: string
  manifest?: any
  isDragging?: boolean
}

const expandedWidgets = ref<ExpandedWidgetItem[]>([])
const draggedWidget = ref<ExpandedWidgetItem | null>(null)
const dragOverIndex = ref<number>(-1) // 拖拽悬停的目标索引

// 动画时长（与主进程保持一致）
const ANIMATION_DURATION = 350

/**
 * 处理展开
 */
function handleExpand(): void {
  if (!isExpanded.value && !isAnimating.value) {
    isAnimating.value = true

    // 先通知主进程开始窗口动画
    if (window.api?.dynamicIsland?.expand) {
      window.api.dynamicIsland.expand()
    }

    // 稍微延迟后再切换状态，让内容动画和窗口动画同步
    setTimeout(() => {
      isExpanded.value = true
      // 加载展开组件
      loadExpandedWidgets()

      // 动画完成后重置标志
      setTimeout(() => {
        isAnimating.value = false
      }, ANIMATION_DURATION)
    }, 50) // 50ms 延迟，确保窗口动画已经开始
  }
}

/**
 * 处理折叠
 */
function handleCollapse(): void {
  if (isExpanded.value && !isAnimating.value) {
    isAnimating.value = true

    // 先切换状态，触发内容淡出
    isExpanded.value = false

    // 延迟一点再通知主进程开始窗口动画，让内容先开始淡出
    setTimeout(() => {
      if (window.api?.dynamicIsland?.collapse) {
        window.api.dynamicIsland.collapse()
      }

      // 动画完成后重置标志
      setTimeout(() => {
        isAnimating.value = false
      }, ANIMATION_DURATION)
    }, 100) // 100ms 延迟，让内容先淡出一部分
  }
}

/**
 * 鼠标进入灵动岛 - 禁用穿透以接收点击事件
 */
function handleMouseEnter(): void {
  if (window.api?.dynamicIsland?.setIgnoreMouseEvents) {
    window.api.dynamicIsland.setIgnoreMouseEvents(false)
  }
}

/**
 * 鼠标离开灵动岛 - 启用穿透让下方可点击
 */
function handleMouseLeave(): void {
  if (window.api?.dynamicIsland?.setIgnoreMouseEvents) {
    window.api.dynamicIsland.setIgnoreMouseEvents(true)
  }
}

/**
 * 加载组件
 */
async function loadWidgets(): Promise<void> {
  try {
    // 获取组件配置
    const config = await window.api.settings.getDynamicIslandWidgets()

    // 加载各位置的组件（无论是否为null都要更新，以支持清空操作）
    leftWidget.value = config.left ? await renderWidget(config.left) : ''
    centerWidget.value = config.center ? await renderWidget(config.center) : ''
    rightWidget.value = config.right ? await renderWidget(config.right) : ''
  } catch (error) {
    console.error('[DynamicIsland] Failed to load widgets:', error)
  }
}

/**
 * 加载展开组件
 */
async function loadExpandedWidgets(): Promise<void> {
  try {
    const config = await window.api.settings.getDynamicIslandExpandedWidgets()
    const widgets = config.widgets || []

    // 加载并渲染每个组件
    const loadedWidgets = await Promise.all(
      widgets.map(async (item, index) => {
        const widget = await window.api.dynamicIslandWidget.get(item.widgetId)
        if (!widget || !widget.manifest) {
          return null
        }

        // 渲染展开状态的内容
        let content = ''
        if (widget.manifest.type === 'advanced' && widget.expandedHtmlContent) {
          // advanced 类型使用 iframe 渲染完整 HTML
          content = `<iframe srcdoc="${widget.expandedHtmlContent.replace(/"/g, '&quot;')}" frameborder="0" style="width: 100%; height: 100%; border: none;"></iframe>`
        } else if (widget.manifest.type === 'simple' && widget.manifest.expandedTemplate) {
          const data = await window.api.dynamicIslandWidget.getData(item.widgetId)
          content = widget.manifest.expandedTemplate.content
          if (data) {
            Object.keys(data).forEach((key) => {
              content = content.replace(new RegExp(`{{${key}}}`, 'g'), data[key])
            })
          }
        }

        // 如果没有 row/col，使用数组索引自动分配（假设每行 5 列）
        const defaultColumns = 5
        const row = item.row !== undefined ? item.row : Math.floor(index / defaultColumns)
        const col = item.col !== undefined ? item.col : index % defaultColumns

        return {
          ...item,
          row,
          col,
          content,
          manifest: widget.manifest,
          isDragging: false // 初始化拖拽状态
        }
      })
    )

    expandedWidgets.value = loadedWidgets.filter((w) => w !== null) as ExpandedWidgetItem[]
  } catch (error) {
    console.error('[DynamicIsland] Failed to load expanded widgets:', error)
  }
}

/**
 * 切换编辑模式
 */
function toggleEditMode(): void {
  isEditMode.value = !isEditMode.value
}

/**
 * 获取组件卡片样式
 */
function getWidgetCardStyle(widget: ExpandedWidgetItem, _index: number): Record<string, string> {
  const manifest = widget.manifest
  if (!manifest) return {}

  // 如果有明确的 row/col，使用 grid-area 精确定位
  // 否则使用自动流式布局
  if (widget.row !== undefined && widget.col !== undefined) {
    const isLarge = manifest.expandedSize === 'large'
    const rowSpan = isLarge ? 2 : 1

    // grid-area: row-start / col-start / row-end / col-end
    return {
      gridArea: `${widget.row + 1} / ${widget.col + 1} / ${widget.row + 1 + rowSpan} / ${widget.col + 2}`
    }
  } else {
    // 降级到自动流式布局
    const isLarge = manifest.expandedSize === 'large'
    return {
      gridColumn: `span 1`,
      gridRow: isLarge ? `span 2` : `span 1`
    }
  }
}

/**
 * 计算占位符的绝对位置样式（基于网格坐标）
 */
function getPlaceholderStyle(): Record<string, string> {
  if (dragOverIndex.value < 0) return { display: 'none' }

  // 获取网格参数
  const gridElement = document.querySelector('.widget-grid') as HTMLElement
  if (!gridElement) return { display: 'none' }

  const cards = Array.from(
    gridElement.querySelectorAll('.widget-card:not(.dragging)')
  ) as HTMLElement[]
  if (cards.length === 0) {
    // 没有卡片时，占位符显示在第一个位置
    return {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      minHeight: '160px'
    }
  }

  // 计算网格列数和卡片尺寸
  const firstCard = cards[0]
  const cardRect = firstCard.getBoundingClientRect()
  const gridRect = gridElement.getBoundingClientRect()
  const gap = parseInt(window.getComputedStyle(gridElement).gap) || 12

  const cardWidth = cardRect.width
  const gridWidth = gridRect.width

  // 使用固定的行高（与 CSS 中的 grid-auto-rows 保持一致）
  const baseRowHeight = 160

  // 通过实际卡片位置计算网格列数（与 handleGridDragOver 保持一致）
  let columns = 1
  if (cards.length >= 2) {
    const firstCardTop = cards[0].getBoundingClientRect().top
    const secondCardTop = cards[1].getBoundingClientRect().top

    // 如果第二个卡片在同一行，说明至少有 2 列
    if (Math.abs(firstCardTop - secondCardTop) < 10) {
      const columnWidth = cardWidth + gap
      columns = Math.max(1, Math.floor((gridWidth + gap) / columnWidth))
    } else {
      columns = 1
    }
  } else {
    const columnWidth = cardWidth + gap
    columns = Math.max(1, Math.floor((gridWidth + gap) / columnWidth))
  }

  // 计算目标位置的行列
  const targetRow = Math.floor(dragOverIndex.value / columns)
  const targetCol = dragOverIndex.value % columns

  // 计算绝对位置（使用固定行高，避免受大型组件影响）
  const top = targetRow * (baseRowHeight + gap)
  const left = targetCol * (cardWidth + gap)

  const isLarge = draggedWidget.value?.manifest?.expandedSize === 'large'
  const height = isLarge ? baseRowHeight * 2 + gap : baseRowHeight

  return {
    position: 'absolute',
    top: `${top}px`,
    left: `${left}px`,
    width: `${cardWidth}px`,
    height: `${height}px`,
    pointerEvents: 'none',
    zIndex: '1000'
  }
}

/**
 * 拖拽开始
 */
function handleDragStart(event: DragEvent, widget: ExpandedWidgetItem): void {
  draggedWidget.value = widget
  widget.isDragging = true
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

/**
 * 拖拽结束
 */
function handleDragEnd(): void {
  if (draggedWidget.value) {
    draggedWidget.value.isDragging = false
    draggedWidget.value = null
  }
  dragOverIndex.value = -1 // 清除悬停状态
}

/**
 * 网格拖拽悬停 - 基于网格坐标系统计算插入位置
 */
function handleGridDragOver(event: DragEvent): void {
  if (!draggedWidget.value) return

  const gridElement = event.currentTarget as HTMLElement
  const rect = gridElement.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  // 获取所有组件卡片
  const allCards = Array.from(gridElement.querySelectorAll('.widget-card')) as HTMLElement[]

  if (allCards.length === 0) {
    dragOverIndex.value = 0
    return
  }

  if (allCards.length === 1) {
    dragOverIndex.value = 0
    return
  }

  // 获取网格参数
  const gridStyles = window.getComputedStyle(gridElement)
  const gap = parseInt(gridStyles.gap) || 12

  // 过滤掉被拖拽的卡片
  const cards = allCards.filter((card) => !card.classList.contains('dragging'))

  if (cards.length === 0) {
    dragOverIndex.value = 0
    return
  }

  // 获取第一个卡片的尺寸
  const firstCard = cards[0]
  const cardWidth = firstCard.getBoundingClientRect().width

  // 使用固定的行高（与 CSS 中的 grid-auto-rows 保持一致）
  const baseRowHeight = 165

  // 通过实际卡片位置计算网格列数（而不是手动计算）
  let columns = 1
  if (cards.length >= 2) {
    const firstCardTop = cards[0].getBoundingClientRect().top
    const secondCardTop = cards[1].getBoundingClientRect().top

    // 如果第二个卡片在同一行，说明至少有 2 列
    if (Math.abs(firstCardTop - secondCardTop) < 10) {
      // 计算每列的宽度（包含间隙）
      const columnWidth = cardWidth + gap
      // 通过网格宽度计算最大列数
      columns = Math.max(1, Math.floor((rect.width + gap) / columnWidth))
    } else {
      // 第二个卡片在下一行，说明只有 1 列
      columns = 1
    }
  } else {
    // 只有一个卡片时，通过网格宽度估算
    const columnWidth = cardWidth + gap
    columns = Math.max(1, Math.floor((rect.width + gap) / columnWidth))
  }

  // 计算鼠标所在的网格行列（使用固定行高）
  const gridCol = Math.floor(mouseX / (cardWidth + gap))
  const gridRow = Math.floor(mouseY / (baseRowHeight + gap))

  // 限制列在有效范围内，行可以无限扩展
  const targetCol = Math.max(0, Math.min(gridCol, columns - 1))
  const targetRow = Math.max(0, gridRow)

  // 计算目标插入位置（基于网格坐标）
  const targetIndex = targetRow * columns + targetCol

  // 不限制 targetIndex，允许拖到任意网格位置
  dragOverIndex.value = targetIndex
}

/**
 * 网格放置 - 更新组件的网格位置（row, col）
 */
async function handleGridDrop(_event: DragEvent): Promise<void> {
  if (!draggedWidget.value) return

  const targetIndex = dragOverIndex.value
  if (targetIndex === -1) return

  // 获取网格参数（复用 handleGridDragOver 的逻辑）
  const gridElement = document.querySelector('.widget-grid') as HTMLElement
  if (!gridElement) return

  const cards = Array.from(
    gridElement.querySelectorAll('.widget-card:not(.dragging)')
  ) as HTMLElement[]
  const firstCard = cards[0]
  if (!firstCard) return

  const cardWidth = firstCard.getBoundingClientRect().width
  const gridRect = gridElement.getBoundingClientRect()
  const gap = parseInt(window.getComputedStyle(gridElement).gap) || 12
  const gridWidth = gridRect.width

  // 计算列数
  let columns = 1
  if (cards.length >= 2) {
    const firstCardTop = cards[0].getBoundingClientRect().top
    const secondCardTop = cards[1].getBoundingClientRect().top

    if (Math.abs(firstCardTop - secondCardTop) < 10) {
      const columnWidth = cardWidth + gap
      columns = Math.max(1, Math.floor((gridWidth + gap) / columnWidth))
    }
  } else {
    const columnWidth = cardWidth + gap
    columns = Math.max(1, Math.floor((gridWidth + gap) / columnWidth))
  }

  // 将 targetIndex 转换为 row, col
  const targetRow = Math.floor(targetIndex / columns)
  const targetCol = targetIndex % columns

  // 更新拖拽组件的 row, col
  draggedWidget.value.row = targetRow
  draggedWidget.value.col = targetCol

  // 触发响应式更新
  expandedWidgets.value = [...expandedWidgets.value]

  dragOverIndex.value = -1
  await saveExpandedWidgets()
}

/**
 * 删除组件
 */
async function handleDeleteWidget(widget: ExpandedWidgetItem): Promise<void> {
  const index = expandedWidgets.value.indexOf(widget)
  if (index > -1) {
    expandedWidgets.value.splice(index, 1)
    await saveExpandedWidgets()
  }
}

/**
 * 保存展开组件配置
 */
async function saveExpandedWidgets(): Promise<void> {
  try {
    const config = {
      widgets: expandedWidgets.value.map((w) => ({
        widgetId: w.widgetId,
        row: w.row,
        col: w.col,
        rowSpan: w.rowSpan,
        colSpan: w.colSpan,
        enabled: w.enabled
      }))
    }
    await window.api.settings.setDynamicIslandExpandedWidgets(config)
  } catch (error) {
    console.error('[DynamicIsland] Failed to save expanded widgets:', error)
  }
}

/**
 * 渲染单个组件
 */
async function renderWidget(widgetId: string): Promise<string> {
  try {
    const widget = await window.api.dynamicIslandWidget.get(widgetId)
    if (!widget || !widget.manifest) {
      return ''
    }

    const manifest = widget.manifest

    // simple 类型：使用模板渲染
    if (manifest.type === 'simple' && manifest.template) {
      const data = await window.api.dynamicIslandWidget.getData(widgetId)
      let content = manifest.template.content

      // 替换模板变量
      if (data) {
        Object.keys(data).forEach((key) => {
          content = content.replace(new RegExp(`{{${key}}}`, 'g'), data[key])
        })
      }

      // 应用样式
      let style = ''
      if (manifest.styles) {
        const styleEntries = Object.entries(manifest.styles).map(
          ([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`
        )
        style = styleEntries.join('; ')
      }

      return `<span style="${style}">${content}</span>`
    }

    // advanced 类型：直接使用 HTML
    if (manifest.type === 'advanced' && widget.htmlContent) {
      return widget.htmlContent
    }

    return ''
  } catch (error) {
    console.error(`[DynamicIsland] Failed to render widget ${widgetId}:`, error)
    return ''
  }
}

/**
 * 定时更新组件
 */
let updateInterval: number | null = null

function startWidgetUpdate(): void {
  // 每秒更新一次（可以根据组件的 updateInterval 优化）
  updateInterval = window.setInterval(() => {
    loadWidgets()
  }, 1000)
}

function stopWidgetUpdate(): void {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
}

/**
 * 组件挂载
 */
onMounted(() => {
  loadWidgets()
  loadExpandedWidgets()
  startWidgetUpdate()
})

/**
 * 组件卸载
 */
onUnmounted(() => {
  stopWidgetUpdate()
})
</script>

<style scoped>
/* 容器 - 完全穿透鼠标事件 */
.dynamic-island-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 0;
  background: transparent;
  -webkit-app-region: no-drag;
  pointer-events: none; /* 容器本身不接收鼠标事件 */
}

/* 灵动岛主体 - 内容区域可接收鼠标事件 */
.dynamic-island {
  /* 使用绝对定位填充整个窗口，而不是相对于视口的 100% */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.66);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-radius: 16px;
  transition: border-radius 350ms cubic-bezier(0.32, 0.72, 0, 1);
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto; /* 内容区域接收鼠标事件 */
}

/* 展开状态 */
.dynamic-island.expanded {
  border-radius: 18px;
  cursor: default;
  align-items: stretch;
  justify-content: stretch;
  background: rgba(255, 255, 255, 0.56); /* 展开时更透明 */
  backdrop-filter: blur(40px); /* 增强模糊以补偿透明度 */
  -webkit-backdrop-filter: blur(40px);
}

/* 折叠状态内容 */
.collapsed-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
}

/* 组件插槽 */
.widget-slot {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.widget-left {
  justify-content: flex-start;
}

.widget-center {
  justify-content: center;
  flex: 1;
}

.widget-right {
  justify-content: flex-end;
}

/* 默认占位 */
.widget-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

.status-text {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  letter-spacing: 0.3px;
}

/* 展开状态内容 */
.expanded-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

/* 标题栏 */
.expanded-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.expanded-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.expanded-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  margin: 0;
  line-height: 1.4;
}

.expanded-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-btn,
.done-btn,
.collapse-btn {
  height: 24px;
  padding: 0 10px;
  border-radius: 5px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 500;
}

.edit-btn,
.collapse-btn {
  width: 24px;
  padding: 0;
  background: transparent;
  color: rgba(0, 0, 0, 0.85);
}

.done-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.edit-btn:hover,
.collapse-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 1);
}

.done-btn:hover {
  opacity: 0.9;
}

/* 内容区域 */
.expanded-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

/* 组件网格 */
.widget-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  grid-template-rows: repeat(auto-fill, minmax(160px, auto));
  grid-auto-rows: 160px; /* 自动创建的行高度 */
  grid-auto-flow: row; /* 按行流式布局，不自动填充空白 */
  gap: 12px;
  width: 100%;
  min-height: 200px;
  position: relative; /* 为绝对定位占位符提供定位上下文 */
}

.widget-grid.edit-mode .widget-card {
  cursor: move;
  border-color: rgba(102, 126, 234, 0.3);
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.widget-grid.edit-mode .widget-card:hover {
  border-color: rgba(102, 126, 234, 0.5);
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

/* 组件卡片 */
.widget-card {
  position: relative;
  background: rgba(255, 255, 255, 1); /* 不透明白色，确保内容清晰 */
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 160px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); /* 增加阴影以突出卡片层次 */
}

.widget-card.size-large {
  min-height: 332px; /* 2行高度: 160*2 + 12(gap) */
}

.widget-card:hover {
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.widget-card.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

/* 拖拽插入占位符 */
/* 绝对定位占位符 - 用于支持任意位置放置 */
.drop-placeholder-absolute {
  border: 2px dashed #667eea;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  animation: pulse 1.5s ease-in-out infinite;
}

.drop-placeholder-absolute.placeholder-large {
  /* 大型组件的高度由 JS 动态计算 */
}

.drop-placeholder-absolute::before {
  content: '放置到此处';
  font-size: 14px;
  font-weight: 500;
  color: #667eea;
  opacity: 0.7;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(102, 126, 234, 0);
  }
}

.widget-card.disabled {
  background: rgba(245, 245, 245, 1); /* 不透明的浅灰背景 */
  border-color: rgba(0, 0, 0, 0.06);
}

/* 组件内容 */
.widget-content {
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: hidden;
}

/* 编辑模式下禁用内容的鼠标事件，允许拖拽 */
.edit-mode .widget-card .widget-content {
  pointer-events: none;
}

/* 编辑模式下添加视觉提示遮罩 */
.edit-mode .widget-card .widget-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(102, 126, 234, 0.03);
  pointer-events: none;
  z-index: 1;
}

/* 拖拽时的视觉提示 */
.edit-mode .widget-card::after {
  content: '⋮⋮';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  color: rgba(102, 126, 234, 0.3);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.edit-mode .widget-card:hover::after {
  opacity: 1;
}

.widget-content iframe,
.widget-content :deep(iframe) {
  width: 100%;
  height: 100%;
  border: none;
}

/* 删除按钮 */
.widget-delete-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
  padding: 0;
  pointer-events: auto; /* 确保删除按钮始终可点击 */
}

.widget-delete-btn:hover {
  background: #ef4444;
  transform: scale(1.1);
}

/* 禁用遮罩 */
.widget-disabled-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 600;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 18px;
  color: rgba(0, 0, 0, 0.35);
  gap: 12px;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  font-weight: 500;
}

.empty-hint {
  font-size: 12px;
  opacity: 0.7;
}

/* 淡入淡出动画 - 延长时间以配合窗口动画 */
.fade-enter-active {
  transition: opacity 250ms ease-out 100ms; /* 延迟 100ms 开始淡入 */
}

.fade-leave-active {
  transition: opacity 200ms ease-in;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

/* 自定义滚动条 */
.expanded-body::-webkit-scrollbar {
  width: 6px;
}

.expanded-body::-webkit-scrollbar-track {
  background: transparent;
}

.expanded-body::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 3px;
}

.expanded-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.18);
}

/* 辅助类 */
.w-5 {
  width: 1.25rem;
}

.h-5 {
  height: 1.25rem;
}
</style>
