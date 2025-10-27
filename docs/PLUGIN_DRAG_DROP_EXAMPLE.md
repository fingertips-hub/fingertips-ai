# 插件拖拽安装示例

本文档展示如何在渲染进程中实现插件拖拽安装功能。

## HTML 示例

```html
<!DOCTYPE html>
<html>
  <head>
    <title>插件管理</title>
    <style>
      .drop-zone {
        width: 400px;
        height: 200px;
        border: 2px dashed #ccc;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 20px;
        transition: all 0.3s;
      }

      .drop-zone.drag-over {
        border-color: #4caf50;
        background-color: #f0f8f0;
      }

      .drop-zone-icon {
        font-size: 48px;
        margin-bottom: 10px;
      }

      .drop-zone-text {
        color: #666;
        font-size: 16px;
      }

      .plugin-list {
        margin: 20px;
      }

      .plugin-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 10px;
      }

      .plugin-actions button {
        margin-left: 10px;
        padding: 5px 10px;
      }

      .message {
        margin: 20px;
        padding: 10px;
        border-radius: 4px;
      }

      .message.success {
        background-color: #d4edda;
        color: #155724;
      }

      .message.error {
        background-color: #f8d7da;
        color: #721c24;
      }
    </style>
  </head>
  <body>
    <h1>插件管理</h1>

    <!-- 拖拽区域 -->
    <div class="drop-zone" id="dropZone">
      <div class="drop-zone-icon">📦</div>
      <div class="drop-zone-text">拖拽 ZIP 文件到此处安装插件</div>
      <div class="drop-zone-text" style="font-size: 12px; margin-top: 5px;">或点击选择文件</div>
    </div>

    <!-- 消息提示 -->
    <div id="message"></div>

    <!-- 插件列表 -->
    <div class="plugin-list" id="pluginList"></div>

    <script src="./plugin-manager.js"></script>
  </body>
</html>
```

## JavaScript 示例 (plugin-manager.js)

```javascript
// 获取 DOM 元素
const dropZone = document.getElementById('dropZone')
const messageDiv = document.getElementById('message')
const pluginListDiv = document.getElementById('pluginList')

// 防止默认的拖放行为
;['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, preventDefaults, false)
  document.body.addEventListener(eventName, preventDefaults, false)
})

function preventDefaults(e) {
  e.preventDefault()
  e.stopPropagation()
}

// 高亮显示拖拽区域
;['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, highlight, false)
})
;['dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, unhighlight, false)
})

function highlight(e) {
  dropZone.classList.add('drag-over')
}

function unhighlight(e) {
  dropZone.classList.remove('drag-over')
}

// 处理文件拖放
dropZone.addEventListener('drop', handleDrop, false)

function handleDrop(e) {
  const dt = e.dataTransfer
  const files = dt.files

  if (files.length > 0) {
    handleFiles(files)
  }
}

// 点击选择文件
dropZone.addEventListener('click', () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.zip'
  input.onchange = (e) => {
    handleFiles(e.target.files)
  }
  input.click()
})

// 处理文件
async function handleFiles(files) {
  for (let file of files) {
    if (file.name.endsWith('.zip')) {
      await installPlugin(file.path)
    } else {
      showMessage('error', '请选择 ZIP 文件')
    }
  }
}

// 安装插件
async function installPlugin(filePath) {
  try {
    showMessage('info', '正在安装插件...')

    const result = await window.electron.ipcRenderer.invoke('plugin:install-from-zip', filePath)

    if (result.success) {
      showMessage('success', `插件 "${result.manifest.name}" 安装成功！请重新加载应用。`)
      await loadPluginList()
    } else {
      showMessage('error', `安装失败: ${result.error}`)
    }
  } catch (error) {
    showMessage('error', `安装失败: ${error.message}`)
  }
}

// 卸载插件
async function uninstallPlugin(pluginId, pluginName) {
  if (!confirm(`确定要卸载插件 "${pluginName}" 吗？`)) {
    return
  }

  try {
    showMessage('info', '正在卸载插件...')

    const result = await window.electron.ipcRenderer.invoke('plugin:uninstall', pluginId)

    if (result.success) {
      showMessage('success', `插件 "${pluginName}" 卸载成功！请重新加载应用。`)
      await loadPluginList()
    } else {
      showMessage('error', `卸载失败: ${result.error}`)
    }
  } catch (error) {
    showMessage('error', `卸载失败: ${error.message}`)
  }
}

// 更新插件
async function updatePlugin(pluginId, pluginName) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.zip'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      showMessage('info', '正在更新插件...')

      const result = await window.electron.ipcRenderer.invoke('plugin:update', pluginId, file.path)

      if (result.success) {
        showMessage('success', `插件 "${pluginName}" 更新成功！请重新加载应用。`)
        await loadPluginList()
      } else {
        showMessage('error', `更新失败: ${result.error}`)
      }
    } catch (error) {
      showMessage('error', `更新失败: ${error.message}`)
    }
  }
  input.click()
}

// 显示消息
function showMessage(type, text) {
  messageDiv.className = `message ${type}`
  messageDiv.textContent = text
  messageDiv.style.display = 'block'

  if (type !== 'info') {
    setTimeout(() => {
      messageDiv.style.display = 'none'
    }, 5000)
  }
}

// 加载插件列表
async function loadPluginList() {
  try {
    const result = await window.electron.ipcRenderer.invoke('plugin:get-all')

    if (result.success) {
      renderPluginList(result.data)
    } else {
      showMessage('error', '加载插件列表失败')
    }
  } catch (error) {
    showMessage('error', `加载插件列表失败: ${error.message}`)
  }
}

// 渲染插件列表
function renderPluginList(plugins) {
  if (!plugins || plugins.length === 0) {
    pluginListDiv.innerHTML = '<p>暂无已安装的插件</p>'
    return
  }

  pluginListDiv.innerHTML = plugins
    .map((plugin) => {
      const manifest = plugin.manifest
      return `
        <div class="plugin-item">
          <div class="plugin-info">
            <h3>${manifest.name}</h3>
            <p>${manifest.description}</p>
            <p style="font-size: 12px; color: #666;">
              版本: ${manifest.version} | ID: ${manifest.id}
            </p>
            <p style="font-size: 12px; color: #666;">
              状态: ${plugin.enabled ? '已启用' : '已禁用'}
              ${plugin.activated ? '(运行中)' : ''}
            </p>
          </div>
          <div class="plugin-actions">
            <button onclick="togglePlugin('${manifest.id}', ${!plugin.enabled})">
              ${plugin.enabled ? '禁用' : '启用'}
            </button>
            <button onclick="updatePlugin('${manifest.id}', '${manifest.name}')">
              更新
            </button>
            <button onclick="uninstallPlugin('${manifest.id}', '${manifest.name}')">
              卸载
            </button>
          </div>
        </div>
      `
    })
    .join('')
}

// 切换插件启用状态
async function togglePlugin(pluginId, enabled) {
  try {
    const result = await window.electron.ipcRenderer.invoke(
      'plugin:toggle-enabled',
      pluginId,
      enabled
    )

    if (result.success) {
      showMessage('success', `插件${enabled ? '启用' : '禁用'}成功`)
      await loadPluginList()
    } else {
      showMessage('error', `操作失败: ${result.error}`)
    }
  } catch (error) {
    showMessage('error', `操作失败: ${error.message}`)
  }
}

// 初始化：加载插件列表
loadPluginList()
```

## Vue.js 示例

如果你使用 Vue.js，可以这样实现：

```vue
<template>
  <div class="plugin-manager">
    <h1>插件管理</h1>

    <!-- 拖拽区域 -->
    <div
      class="drop-zone"
      :class="{ 'drag-over': isDragging }"
      @dragenter.prevent="isDragging = true"
      @dragover.prevent
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="selectFile"
    >
      <div class="drop-zone-icon">📦</div>
      <div class="drop-zone-text">拖拽 ZIP 文件到此处安装插件</div>
      <div class="drop-zone-text small">或点击选择文件</div>
    </div>

    <!-- 消息提示 -->
    <div v-if="message" :class="['message', message.type]">
      {{ message.text }}
    </div>

    <!-- 插件列表 -->
    <div class="plugin-list">
      <div v-if="plugins.length === 0">暂无已安装的插件</div>
      <div v-for="plugin in plugins" :key="plugin.manifest.id" class="plugin-item">
        <div class="plugin-info">
          <h3>{{ plugin.manifest.name }}</h3>
          <p>{{ plugin.manifest.description }}</p>
          <p class="plugin-meta">
            版本: {{ plugin.manifest.version }} | ID: {{ plugin.manifest.id }}
          </p>
          <p class="plugin-meta">
            状态: {{ plugin.enabled ? '已启用' : '已禁用' }}
            {{ plugin.activated ? '(运行中)' : '' }}
          </p>
        </div>
        <div class="plugin-actions">
          <button @click="togglePlugin(plugin.manifest.id, !plugin.enabled)">
            {{ plugin.enabled ? '禁用' : '启用' }}
          </button>
          <button @click="updatePlugin(plugin.manifest.id, plugin.manifest.name)">更新</button>
          <button @click="uninstallPlugin(plugin.manifest.id, plugin.manifest.name)">卸载</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isDragging = ref(false)
const message = ref(null)
const plugins = ref([])

// 处理文件拖放
function handleDrop(e) {
  isDragging.value = false
  const files = e.dataTransfer.files

  if (files.length > 0 && files[0].name.endsWith('.zip')) {
    installPlugin(files[0].path)
  } else {
    showMessage('error', '请选择 ZIP 文件')
  }
}

// 选择文件
function selectFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.zip'
  input.onchange = (e) => {
    if (e.target.files[0]) {
      installPlugin(e.target.files[0].path)
    }
  }
  input.click()
}

// 安装插件
async function installPlugin(filePath) {
  try {
    showMessage('info', '正在安装插件...')

    const result = await window.electron.ipcRenderer.invoke('plugin:install-from-zip', filePath)

    if (result.success) {
      showMessage('success', `插件 "${result.manifest.name}" 安装成功！请重新加载应用。`)
      await loadPluginList()
    } else {
      showMessage('error', `安装失败: ${result.error}`)
    }
  } catch (error) {
    showMessage('error', `安装失败: ${error.message}`)
  }
}

// 卸载插件
async function uninstallPlugin(pluginId, pluginName) {
  if (!confirm(`确定要卸载插件 "${pluginName}" 吗？`)) {
    return
  }

  try {
    showMessage('info', '正在卸载插件...')

    const result = await window.electron.ipcRenderer.invoke('plugin:uninstall', pluginId)

    if (result.success) {
      showMessage('success', `插件 "${pluginName}" 卸载成功！请重新加载应用。`)
      await loadPluginList()
    } else {
      showMessage('error', `卸载失败: ${result.error}`)
    }
  } catch (error) {
    showMessage('error', `卸载失败: ${error.message}`)
  }
}

// 更新插件
async function updatePlugin(pluginId, pluginName) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.zip'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      showMessage('info', '正在更新插件...')

      const result = await window.electron.ipcRenderer.invoke('plugin:update', pluginId, file.path)

      if (result.success) {
        showMessage('success', `插件 "${pluginName}" 更新成功！请重新加载应用。`)
        await loadPluginList()
      } else {
        showMessage('error', `更新失败: ${result.error}`)
      }
    } catch (error) {
      showMessage('error', `更新失败: ${error.message}`)
    }
  }
  input.click()
}

// 切换插件启用状态
async function togglePlugin(pluginId, enabled) {
  try {
    const result = await window.electron.ipcRenderer.invoke(
      'plugin:toggle-enabled',
      pluginId,
      enabled
    )

    if (result.success) {
      showMessage('success', `插件${enabled ? '启用' : '禁用'}成功`)
      await loadPluginList()
    } else {
      showMessage('error', `操作失败: ${result.error}`)
    }
  } catch (error) {
    showMessage('error', `操作失败: ${error.message}`)
  }
}

// 显示消息
function showMessage(type, text) {
  message.value = { type, text }

  if (type !== 'info') {
    setTimeout(() => {
      message.value = null
    }, 5000)
  }
}

// 加载插件列表
async function loadPluginList() {
  try {
    const result = await window.electron.ipcRenderer.invoke('plugin:get-all')

    if (result.success) {
      plugins.value = result.data
    } else {
      showMessage('error', '加载插件列表失败')
    }
  } catch (error) {
    showMessage('error', `加载插件列表失败: ${error.message}`)
  }
}

// 初始化
onMounted(() => {
  loadPluginList()
})
</script>

<style scoped>
/* ... 与上面 HTML 示例中相同的样式 ... */
</style>
```

## Preload 脚本设置

确保在 preload 脚本中暴露 IPC 接口：

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
    // ... 其他方法
  }
})
```

## 类型定义

```typescript
// types.d.ts
interface Window {
  electron: {
    ipcRenderer: {
      invoke(channel: string, ...args: any[]): Promise<any>
    }
  }
}
```
