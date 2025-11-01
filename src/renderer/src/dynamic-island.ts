import { createApp } from 'vue'
import DynamicIsland from './DynamicIsland.vue'

// 创建 Vue 应用
const app = createApp(DynamicIsland)

// 挂载应用
app.mount('#app')

console.log('[DynamicIsland] Vue app mounted')
