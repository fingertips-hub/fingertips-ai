# Vue 插件开发示例

> 展示如何使用 Vue 3 单文件组件开发 Fingertips AI 插件界面

## 📋 概述

这是一个完整的示例，展示如何在 Fingertips AI 插件中使用 Vue 3 单文件组件（.vue）开发现代化的用户界面。通过这个示例，你将学会：

- ✅ 在插件窗口中集成 Vue 3
- ✅ 使用 Vue 单文件组件开发
- ✅ 使用 Vite 构建工具
- ✅ 使用 Vue 的响应式数据系统
- ✅ 实现组件化的界面
- ✅ 与主进程进行 IPC 通信
- ✅ 管理插件配置
- ✅ 构建复杂的交互界面

## 🎯 两种使用方式

本示例提供两种使用方式：

### 方式 1：CDN 方式（无需构建）

- **文件**: `config.html`, `dashboard.html`
- **优点**: 无需构建步骤，直接使用
- **适合**: 快速原型，简单插件

### 方式 2：单文件组件方式（推荐）

- **文件**: `config-built.html`, `dashboard-built.html`
- **优点**: 更好的代码组织，TypeScript 支持，IDE 支持
- **适合**: 复杂插件，团队开发

本文档主要介绍**方式 2**的使用。

## 🚀 快速开始

### 0. 安装依赖和构建

在插件目录下运行：

```bash
# 进入插件目录
cd plugins/vue-plugin-demo

# 安装依赖
npm install

# 构建项目
npm run build
```

构建完成后，会在 `ui/dist/` 目录生成构建后的文件。

### 1. 安装插件

将此目录复制到 `plugins/` 文件夹中：

```
plugins/
└── vue-plugin-demo/
    ├── manifest.json
    ├── index.js
    ├── package.json
    ├── vite.config.js
    ├── ui/
    │   ├── src/              # Vue 组件源码
    │   │   ├── Config.vue
    │   │   ├── Dashboard.vue
    │   │   ├── config-main.js
    │   │   └── dashboard-main.js
    │   ├── dist/             # 构建输出（需运行 npm run build）
    │   ├── config.html       # CDN 方式
    │   ├── dashboard.html    # CDN 方式
    │   ├── config-built.html # 构建方式
    │   └── dashboard-built.html  # 构建方式
    └── README.md
```

### 2. 启用插件

1. 打开 Fingertips AI
2. 进入设置 → 插件管理
3. 找到 "Vue 插件开发示例"
4. 启用插件

**注意**: 如果要使用单文件组件方式，需要先修改 `index.js` 中的 HTML 文件路径。

### 3. 运行插件

1. 使用快捷键或命令面板打开超级面板
2. 执行 "Vue 插件开发示例"
3. 选择要打开的界面：
   - **配置面板** - 完整的配置界面
   - **数据仪表盘** - 数据展示和交互

## 🎯 功能特性

### 配置面板 (config.html)

- **多标签页界面** - 基础设置、高级设置、关于
- **响应式表单** - 使用 Vue 的双向绑定
- **实时验证** - 配置修改检测
- **IPC 通信** - 与主进程交互
- **状态管理** - 成功/错误提示
- **API 测试** - 测试通知、剪贴板等功能

### 数据仪表盘 (dashboard.html)

- **统计卡片** - 展示关键指标
- **实时数据** - 模拟数据更新
- **数据表格** - 列表渲染和筛选
- **分页** - 处理大量数据
- **动画效果** - Vue Transition
- **进度条** - 可视化数据

## 🛠️ 开发工作流程

### 开发模式

在开发时，使用 Vite 的开发服务器（可选）：

```bash
npm run dev
```

或者直接编辑 `.vue` 文件，然后重新构建：

```bash
npm run build
```

### 热重载

修改 Vue 组件后：

1. 运行 `npm run build` 重新构建
2. 在插件管理中点击"重新加载"插件
3. 重新打开插件窗口

### 目录结构

```
ui/
├── src/                    # 源代码
│   ├── Config.vue         # 配置页面组件
│   ├── Dashboard.vue      # 仪表盘组件
│   ├── config-main.js     # 配置页面入口
│   ├── dashboard-main.js  # 仪表盘入口
│   ├── app.css           # 配置页面全局样式
│   └── dashboard.css     # 仪表盘全局样式
├── dist/                  # 构建输出
│   ├── config.js         # 配置页面构建结果
│   └── dashboard.js      # 仪表盘构建结果
├── config-built.html      # 配置页面 HTML（构建版）
├── dashboard-built.html   # 仪表盘 HTML（构建版）
├── config.html           # 配置页面 HTML（CDN 版）
└── dashboard.html        # 仪表盘 HTML（CDN 版）
```

## 💻 技术实现

### 1. Vue 单文件组件

使用 `.vue` 文件开发组件：

```vue
<template>
  <div class="my-component">
    <h1>{{ title }}</h1>
    <button @click="count++">点击: {{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('我的组件')
const count = ref(0)
</script>

<style scoped>
.my-component {
  padding: 20px;
}
</style>
```

### 2. 创建 Vue 应用

在入口文件中创建应用：

```javascript
// config-main.js
import { createApp } from 'vue'
import Config from './Config.vue'
import './app.css'

createApp(Config).mount('#app')
```

### 3. 使用组合式 API

在 `.vue` 文件中使用 `<script setup>`：

```vue
<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'

// 响应式数据
const config = reactive({
  theme: 'light',
  language: 'zh-CN'
})

const counter = ref(0)

// 计算属性
const doubled = computed(() => counter.value * 2)

// 监听变化
watch(counter, (newVal) => {
  console.log('Counter changed:', newVal)
})

// 生命周期
onMounted(() => {
  console.log('Vue app mounted')
})
</script>
```

### 4. IPC 通信

与主进程通信：

```javascript
// 在 index.js 中注册处理器
context.ipc.handle('saveConfig', async (event, config) => {
  await context.config.setAll(config)
  return { success: true }
})

// 在 HTML 中调用
async function saveConfig() {
  const result = await window.api.plugin.invoke('pluginId:saveConfig', config)
  if (result.success) {
    console.log('Config saved')
  }
}
```

### 4. 数据传递

从主进程向窗口传递数据：

```javascript
// 创建窗口时传递数据
const window = await context.api.window.create({
  html: 'ui/config.html',
  data: {
    pluginId: context.manifest.id,
    config: await context.config.getAll()
  }
})

// 在窗口中访问
if (window.pluginData) {
  const config = window.pluginData.config
}
```

## 📚 核心概念

### 响应式数据

Vue 3 提供两种响应式 API：

```javascript
// ref - 用于基本类型
const count = ref(0)
count.value++ // 访问和修改需要 .value

// reactive - 用于对象
const state = reactive({
  name: 'Vue',
  version: 3
})
state.name = 'Vue 3' // 直接访问和修改
```

### 计算属性

基于响应式数据派生新值：

```javascript
const doubled = computed(() => count.value * 2)
// doubled 会自动随 count 更新
```

### 监听器

响应数据变化：

```javascript
// 监听单个数据
watch(count, (newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`)
})

// 监听对象（深度监听）
watch(
  config,
  (newConfig) => {
    console.log('Config changed:', newConfig)
  },
  { deep: true }
)
```

### 模板语法

```html
<!-- 插值 -->
<div>{{ message }}</div>

<!-- 属性绑定 -->
<button :disabled="loading">Click</button>

<!-- 事件监听 -->
<button @click="handleClick">Click</button>

<!-- 条件渲染 -->
<div v-if="visible">Show me</div>
<div v-else>Hidden</div>

<!-- 列表渲染 -->
<div v-for="item in items" :key="item.id">{{ item.name }}</div>

<!-- 双向绑定 -->
<input v-model="message" />
```

## 🎨 最佳实践

### 1. 使用 CDN 引入 Vue

**优点**：

- 无需构建步骤
- 开发简单快速
- 适合插件场景

**缺点**：

- 需要网络连接（首次加载）
- 无法使用单文件组件
- 没有 TypeScript 支持

### 2. 本地 Vue 文件（可选）

如果需要离线使用，可以下载 Vue.js 到插件目录：

```
vue-plugin-demo/
├── lib/
│   └── vue.global.js
└── ui/
    └── config.html
```

```html
<!-- 引用本地文件 -->
<script src="../lib/vue.global.js"></script>
```

### 3. 组织代码结构

```javascript
// 推荐结构
createApp({
  setup() {
    // 1. 状态定义
    const state = reactive({...})

    // 2. 计算属性
    const computed1 = computed(() => {...})

    // 3. 监听器
    watch(state, () => {...})

    // 4. 生命周期
    onMounted(() => {...})

    // 5. 方法定义
    function method1() {...}

    // 6. 返回暴露
    return {
      state,
      computed1,
      method1
    }
  }
}).mount('#app')
```

### 4. IPC 通信模式

```javascript
// 主进程（index.js）
context.ipc.handle('action', async (event, data) => {
  // 处理逻辑
  return { success: true, data: result }
})

// 渲染进程（HTML）
async function doAction() {
  try {
    const result = await window.api.plugin.invoke('pluginId:action', data)
    if (result.success) {
      // 成功处理
    }
  } catch (error) {
    // 错误处理
  }
}
```

### 5. 错误处理

```javascript
async function saveConfig() {
  loading.value = true
  try {
    const result = await window.api.plugin.invoke('saveConfig', config)
    if (result.success) {
      showSuccess('配置已保存')
    } else {
      showError('保存失败: ' + result.error)
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    showError('保存失败: ' + error.message)
  } finally {
    loading.value = false
  }
}
```

## 🔧 开发提示

### 1. 开发调试

在窗口中打开开发者工具：

```javascript
// 在 pluginWindowManager.ts 中临时添加
window.webContents.openDevTools()
```

### 2. 热重载

修改 HTML 后：

1. 关闭插件窗口
2. 在插件管理中点击"重新加载"
3. 重新打开窗口

### 3. Vue DevTools

可以安装 Vue DevTools 浏览器扩展来调试 Vue 应用：

- Chrome: [Vue.js devtools](https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)

### 4. 使用其他 UI 库

可以结合其他 UI 库：

```html
<!-- Element Plus -->
<script src="https://unpkg.com/element-plus"></script>
<link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css" />

<!-- Ant Design Vue -->
<script src="https://unpkg.com/ant-design-vue@3/dist/antd.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/ant-design-vue@3/dist/antd.min.css" />
```

## 📖 进阶主题

### 1. 组件化

虽然不能使用 `.vue` 文件，但可以定义内联组件：

```javascript
createApp({
  components: {
    'my-button': {
      props: ['label'],
      template: '<button @click="$emit(\'click\')">{{ label }}</button>'
    }
  },
  setup() {
    // ...
  }
}).mount('#app')
```

### 2. 状态持久化

```javascript
// 保存状态
async function saveState() {
  await window.api.plugin.invoke('pluginId:saveConfig', {
    ...config,
    lastTab: activeTab.value
  })
}

// 恢复状态
onMounted(async () => {
  const saved = await window.api.plugin.invoke('pluginId:getConfig')
  if (saved.success) {
    Object.assign(config, saved.data)
    activeTab.value = saved.data.lastTab || 'basic'
  }
})
```

### 3. 集成图表库

```html
<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<script>
  onMounted(() => {
    const ctx = document.getElementById('myChart').getContext('2d')
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [
          {
            label: 'Views',
            data: [12, 19, 3]
          }
        ]
      }
    })
  })
</script>
```

## 🎓 学习资源

- [Vue 3 官方文档](https://cn.vuejs.org/)
- [Vue 3 组合式 API](https://cn.vuejs.org/guide/extras/composition-api-faq.html)
- [Fingertips AI 插件开发指南](../../docs/PLUGIN_DEVELOPER_GUIDE.md)

## 💡 常见问题

### Q: 为什么使用 CDN 而不是构建工具？

A: 插件系统设计为简单易用，使用 CDN：

- 无需配置构建工具
- 开发更快速
- 适合中小型插件
- 降低学习门槛

### Q: 可以使用 TypeScript 吗？

A: 在不引入构建工具的情况下不推荐，但可以：

- 使用 JSDoc 注释获得类型提示
- 或者设置独立的构建流程

### Q: 可以使用单文件组件 (.vue) 吗？

A: 需要构建步骤。可以：

1. 使用 Vite/Webpack 构建
2. 输出到插件目录
3. 在 HTML 中引用构建结果

### Q: 性能如何？

A: Vue 3 性能优秀：

- CDN 版本已压缩优化
- 浏览器会缓存
- 适合大多数插件场景

## 📝 总结

使用 Vue 3 开发插件界面的优势：

✅ **简单** - 无需构建，直接开发  
✅ **强大** - 完整的 Vue 3 特性  
✅ **灵活** - 响应式数据和组件化  
✅ **优雅** - 现代化的 API 设计  
✅ **高效** - 快速开发复杂界面

开始使用 Vue 3 为你的插件创建漂亮的界面吧！ 🚀
