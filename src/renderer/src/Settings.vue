<template>
  <div class="settings-container">
    <!-- 左侧菜单栏 -->
    <aside class="settings-sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">设置</h2>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          active-class="nav-item-active"
        >
          <Icon :icon="item.icon" class="nav-icon" />
          <span class="nav-text">{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <!-- 右侧内容区 -->
    <main class="settings-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

// 菜单项配置
const menuItems = [
  {
    path: '/common',
    label: '公共',
    icon: 'mdi:cog'
  },
  {
    path: '/dynamic-island',
    label: '灵动岛',
    icon: 'mdi:island'
  },
  {
    path: '/ai',
    label: 'AI快捷指令',
    icon: 'mdi:lightning-bolt'
  },
  {
    path: '/plugins',
    label: '插件',
    icon: 'mdi:puzzle'
  }
]
</script>

<style scoped>
.settings-container {
  display: flex;
  height: 100vh;
  width: 100%;
  background: #f9fafb;
}

/* 左侧菜单栏 */
.settings-sidebar {
  width: 220px;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.sidebar-nav {
  padding: 12px 8px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 8px;
  color: #6b7280;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  outline: none;
}

.nav-item:focus {
  outline: none;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #111827;
}

.nav-item-active {
  background: #eff6ff;
  color: #2563eb;
}

.nav-icon {
  margin-right: 12px;
  flex-shrink: 0;
  font-size: 20px;
}

.nav-text {
  flex: 1;
}

/* 右侧内容区 */
.settings-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
