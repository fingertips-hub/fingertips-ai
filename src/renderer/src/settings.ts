import './assets/main.css'
import './icons' // 离线图标配置

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import Settings from './Settings.vue'
import CommonSettings from './components/settings/CommonSettings.vue'
import AISettings from './components/settings/AIShortcut.vue'
import PluginManager from './components/settings/PluginManager.vue'

// 创建路由器
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/common'
    },
    {
      path: '/common',
      name: 'common',
      component: CommonSettings
    },
    {
      path: '/ai',
      name: 'ai',
      component: AISettings
    },
    {
      path: '/plugins',
      name: 'plugins',
      component: PluginManager
    }
  ]
})

// 创建应用实例
const app = createApp(Settings)

// 使用插件
app.use(createPinia())
app.use(router)

// 挂载应用
app.mount('#app')
