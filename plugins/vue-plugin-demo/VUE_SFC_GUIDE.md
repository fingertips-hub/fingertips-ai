# Vue 单文件组件使用指南

本插件现在支持两种开发方式：**CDN 方式**和**单文件组件方式**。

## 📦 两种方式对比

### CDN 方式（默认）

**优点**：

- ✅ 无需构建步骤
- ✅ 开发简单快速
- ✅ 无需安装依赖

**缺点**：

- ❌ 无法使用 TypeScript
- ❌ 无法使用单文件组件
- ❌ IDE 支持有限
- ❌ 代码组织较差

**适合场景**：快速原型、简单插件

### 单文件组件方式（推荐）

**优点**：

- ✅ 更好的代码组织
- ✅ TypeScript 支持
- ✅ 完整的 IDE 支持
- ✅ 单文件组件 (.vue)
- ✅ Scoped CSS
- ✅ 更好的可维护性

**缺点**：

- ❌ 需要构建步骤
- ❌ 需要安装依赖

**适合场景**：复杂插件、团队开发、长期维护

## 🚀 快速开始（单文件组件方式）

### 1. 安装依赖

```bash
cd plugins/vue-plugin-demo
npm install
```

### 2. 构建项目

```bash
npm run build
```

构建后，会在 `ui/dist/` 目录生成以下文件：

- `config.js` - 配置页面
- `dashboard.js` - 仪表盘页面

### 3. 启用单文件组件模式

在 `index.js` 中修改：

```javascript
const USE_BUILT_VERSION = true // 改为 true
```

### 4. 重新加载插件

在插件管理中点击"重新加载"插件，然后打开插件窗口，现在就会使用单文件组件版本了！

## 🛠️ 开发工作流

### 开发循环

1. 编辑 `.vue` 文件（如 `ui/src/Config.vue`）
2. 运行 `npm run build` 重新构建
3. 在插件管理中重新加载插件
4. 打开插件窗口查看效果

### 开发服务器（可选）

如果想要更快的开发体验，可以使用 Vite 开发服务器：

```bash
npm run dev
```

这会启动一个开发服务器，但注意这只是用于预览，不能在插件中使用。

## 📂 文件结构

```
plugins/vue-plugin-demo/
├── package.json              # 依赖配置
├── vite.config.js           # Vite 构建配置
├── index.js                 # 插件主逻辑
├── ui/
│   ├── src/                 # 源代码
│   │   ├── Config.vue       # 配置页面组件
│   │   ├── Dashboard.vue    # 仪表盘组件
│   │   ├── config-main.js   # 配置页面入口
│   │   ├── dashboard-main.js # 仪表盘入口
│   │   ├── app.css          # 全局样式（配置页）
│   │   └── dashboard.css    # 全局样式（仪表盘）
│   ├── dist/                # 构建输出（git ignored）
│   │   ├── config.js        # 构建后的配置页
│   │   └── dashboard.js     # 构建后的仪表盘
│   ├── config-built.html    # 配置页面 HTML（构建版）
│   ├── dashboard-built.html # 仪表盘 HTML（构建版）
│   ├── config.html          # 配置页面 HTML（CDN 版）
│   └── dashboard.html       # 仪表盘 HTML（CDN 版）
└── README.md
```

## 💻 单文件组件示例

### Config.vue

```vue
<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <button @click="count++">点击: {{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('配置页面')
const count = ref(0)
</script>

<style scoped>
.container {
  padding: 20px;
}
</style>
```

### 入口文件 (config-main.js)

```javascript
import { createApp } from 'vue'
import Config from './Config.vue'
import './app.css'

createApp(Config).mount('#app')
```

### HTML 文件 (config-built.html)

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>配置</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./dist/config.js"></script>
  </body>
</html>
```

## 🔧 Vite 配置说明

`vite.config.js` 配置了多入口构建：

```javascript
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'ui/dist',
    rollupOptions: {
      input: {
        config: resolve(__dirname, 'ui/src/config-main.js'),
        dashboard: resolve(__dirname, 'ui/src/dashboard-main.js')
      }
    }
  }
})
```

这样可以为每个页面生成独立的 JS 文件。

## 🎯 最佳实践

### 1. 代码组织

将相关的逻辑组织在一起：

```vue
<script setup>
// 1. 导入
import { ref, computed, onMounted } from 'vue'

// 2. 状态
const state = ref({})

// 3. 计算属性
const computed1 = computed(() => {})

// 4. 方法
function method1() {}

// 5. 生命周期
onMounted(() => {})
</script>
```

### 2. 组件拆分

将大组件拆分成小组件：

```
ui/src/
├── Config.vue
├── components/
│   ├── ConfigForm.vue
│   └── ConfigStats.vue
```

### 3. 样式管理

使用 Scoped CSS 避免样式冲突：

```vue
<style scoped>
/* 只作用于当前组件 */
.my-class {
  color: red;
}
</style>
```

### 4. TypeScript 支持

如果需要 TypeScript，创建 `.vue` 文件时使用 `lang="ts"`：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const count = ref<number>(0)
</script>
```

## 🐛 常见问题

### Q: 构建后窗口显示空白？

A: 检查以下几点：

1. 确保运行了 `npm run build`
2. 检查 `ui/dist/` 目录是否有生成文件
3. 确保 `index.js` 中设置了 `USE_BUILT_VERSION = true`
4. 查看浏览器控制台的错误信息

### Q: 修改代码后没有生效？

A: 需要：

1. 运行 `npm run build` 重新构建
2. 在插件管理中重新加载插件
3. 关闭并重新打开插件窗口

### Q: 如何切回 CDN 方式？

A: 在 `index.js` 中设置：

```javascript
const USE_BUILT_VERSION = false
```

### Q: 构建文件太大怎么办？

A: Vite 默认已经做了优化，如果还需要：

1. 检查是否引入了不必要的依赖
2. 使用动态导入拆分代码
3. 移除未使用的代码

## 📚 相关资源

- [Vue 3 文档](https://cn.vuejs.org/)
- [Vite 文档](https://cn.vitejs.dev/)
- [Vue SFC 语法](https://cn.vuejs.org/api/sfc-spec.html)
- [Composition API](https://cn.vuejs.org/guide/extras/composition-api-faq.html)

## 🎉 总结

使用单文件组件方式开发插件的好处：

✅ **更好的开发体验** - IDE 支持、语法高亮、类型检查  
✅ **更好的代码组织** - 单文件组件、逻辑复用  
✅ **更好的可维护性** - 清晰的文件结构、易于重构  
✅ **生产就绪** - 代码优化、压缩、Tree-shaking

现在就开始使用单文件组件开发你的插件吧！ 🚀
