/**
 * 离线图标配置
 * 从本地 npm 包加载 Material Design Icons
 */
import { addCollection } from '@iconify/vue'
import mdiIcons from '@iconify-json/mdi/icons.json'

// 添加 MDI 图标集到离线缓存
addCollection(mdiIcons)

console.log('✅ Iconify 离线模式已启用，使用本地 MDI 图标包')
