import './assets/main.css'
import './icons' // 离线图标配置

import { createApp } from 'vue'
import { createPinia } from 'pinia'
// @ts-ignore - Vue component import
import AIShortcutRunner from './AIShortcutRunner.vue'

const pinia = createPinia()
const app = createApp(AIShortcutRunner)

app.use(pinia)
app.mount('#app')
