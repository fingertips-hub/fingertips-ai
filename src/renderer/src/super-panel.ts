import './assets/main.css'
import './icons' // 离线图标配置

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import SuperPanel from './SuperPanel.vue'

createApp(SuperPanel).use(createPinia()).mount('#app')
