<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="plugin-selector-overlay" @click="handleOverlayClick">
        <Transition name="slide-up">
          <div v-if="visible" class="plugin-selector-modal" @click.stop>
            <!-- 标题栏 -->
            <div class="modal-header">
              <h3 class="modal-title">添加插件</h3>
              <button class="modal-close" @click="handleClose" title="关闭">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <!-- 插件列表 -->
            <div class="modal-body">
              <div v-if="plugins.length === 0" class="empty-state">
                <div class="empty-icon">✨</div>
                <div class="empty-text">暂无可用插件</div>
                <div class="empty-hint">所有已启用的插件都已添加</div>
              </div>

              <div v-else class="plugin-grid">
                <div
                  v-for="plugin in plugins"
                  :key="plugin.id"
                  class="plugin-card"
                  :class="{ 'plugin-large': plugin.expandedSize === 'large' }"
                  @click="handlePluginClick(plugin)"
                >
                  <div class="plugin-icon">🧩</div>
                  <div class="plugin-info">
                    <div class="plugin-name">{{ plugin.name }}</div>
                    <div class="plugin-description">{{ plugin.description || '暂无描述' }}</div>
                    <div class="plugin-size-badge" :class="[plugin.expandedSize]">
                      {{ plugin.expandedSize === 'large' ? '大型组件' : '小型组件' }}
                    </div>
                  </div>
                  <div class="plugin-add-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部提示 -->
            <div class="modal-footer">
              <div class="footer-hint">点击插件卡片即可添加到灵动岛</div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

interface Plugin {
  id: string
  name: string
  description: string
  expandedSize: 'small' | 'large'
  manifest: any
}

defineProps<{
  visible: boolean
  plugins: Plugin[]
}>()

const emit = defineEmits<{
  close: []
  select: [plugin: Plugin]
}>()

function handleClose(): void {
  emit('close')
}

function handleOverlayClick(): void {
  emit('close')
}

function handlePluginClick(plugin: Plugin): void {
  emit('select', plugin)
}
</script>

<style scoped>
/* 遮罩层 */
.plugin-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  pointer-events: auto; /* 关键：让遮罩层接收鼠标事件 */
}

/* 模态框 */
.plugin-selector-modal {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 720px;
  max-height: 96vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* 标题栏 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  letter-spacing: -0.01em;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.8);
}

/* 内容区域 */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(0, 0, 0, 0.35);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.6);
}

.empty-hint {
  font-size: 14px;
  opacity: 0.7;
}

/* 插件网格 */
.plugin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

/* 插件卡片 */
.plugin-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: white;
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.plugin-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.plugin-card:hover {
  border-color: #667eea;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
  transform: translateY(-4px);
}

.plugin-card:hover::before {
  opacity: 1;
}

.plugin-card:active {
  transform: translateY(-2px);
}

.plugin-icon {
  font-size: 32px;
  flex-shrink: 0;
  z-index: 1;
}

.plugin-info {
  flex: 1;
  min-width: 0;
  z-index: 1;
}

.plugin-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 6px;
  line-height: 1.4;
}

.plugin-description {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.plugin-size-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.plugin-size-badge.large {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.plugin-add-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.25s ease;
  z-index: 1;
}

.plugin-card:hover .plugin-add-icon {
  opacity: 1;
  transform: scale(1);
}

/* 底部提示 */
.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(249, 250, 251, 0.8);
}

.footer-hint {
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}

/* 滚动条样式 */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}
</style>
