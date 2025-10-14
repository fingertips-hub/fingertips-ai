import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import SuperPanel from './SuperPanel.vue'

createApp(SuperPanel).use(createPinia()).mount('#app')
