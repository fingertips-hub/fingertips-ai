# 截图 API 使用指南

## 概述

插件系统现已支持截图功能，允许插件调用系统截图工具并获取截图结果的 DataURL。

## 权限要求

要使用截图 API，插件必须在 `manifest.json` 中声明 `screenshot` 权限：

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "version": "1.0.0",
  "permissions": ["screenshot"],
  ...
}
```

## API 接口

### `api.screenshot.capture()`

调用系统截图工具，允许用户截图。

**返回值：** `Promise<string>`

- 如果用户完成截图，返回图片的 DataURL（base64 编码）
- 如果用户取消截图，返回空字符串 `""`

**示例：**

```javascript
export async function activate(context) {
  const { api } = context

  // 执行截图
  const dataURL = await api.screenshot.capture()

  if (dataURL) {
    console.log('截图成功！')
    // dataURL 格式: "data:image/png;base64,iVBORw0KG..."

    // 可以将 DataURL 保存到文件
    const base64Data = dataURL.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    await api.fs.writeFile('screenshot.png', buffer)

    // 或者在插件窗口中显示
    // <img src="${dataURL}" />
  } else {
    console.log('用户取消了截图')
  }
}
```

## 完整示例插件

### manifest.json

```json
{
  "id": "screenshot-plugin",
  "name": "截图插件",
  "version": "1.0.0",
  "description": "演示截图功能的示例插件",
  "keywords": ["screenshot", "image"],
  "author": "Your Name",
  "fingertips": {
    "minVersion": "1.0.0"
  },
  "main": "index.js",
  "permissions": ["screenshot", "fs:write", "notification"]
}
```

### index.js

```javascript
/**
 * 截图插件示例
 */

let deactivateFunc = null

export async function activate(context) {
  const { api, config } = context

  console.log('截图插件已激活')

  // 定义清理函数
  deactivateFunc = () => {
    console.log('截图插件已停用')
  }

  return deactivateFunc
}

export async function deactivate() {
  if (deactivateFunc) {
    deactivateFunc()
  }
}

/**
 * 执行截图功能
 */
export async function execute(params) {
  const { api } = params.context

  try {
    // 显示通知
    api.notification.show({
      title: '截图',
      body: '请选择要截图的区域...'
    })

    // 调用截图 API
    const dataURL = await api.screenshot.capture()

    if (dataURL) {
      // 截图成功
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `screenshot_${timestamp}.png`

      // 保存到用户数据目录
      const userDataPath = require('electron').app.getPath('userData')
      const filePath = require('path').join(userDataPath, filename)

      // 将 DataURL 转换为 Buffer
      const base64Data = dataURL.replace(/^data:image\/png;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')

      // 保存文件
      await api.fs.writeFile(filePath, buffer)

      // 显示成功通知
      api.notification.show({
        title: '截图成功',
        body: `截图已保存到：${filePath}`
      })

      return {
        success: true,
        filePath,
        dataURL
      }
    } else {
      // 用户取消截图
      api.notification.show({
        title: '截图',
        body: '已取消截图'
      })

      return {
        success: false,
        message: '用户取消了截图'
      }
    }
  } catch (error) {
    console.error('截图失败:', error)

    api.notification.show({
      title: '截图失败',
      body: error.message
    })

    return {
      success: false,
      error: error.message
    }
  }
}
```

## 高级用法

### 在插件窗口中显示截图

```javascript
// 创建一个窗口来显示截图
const window = await api.window.create({
  title: '截图预览',
  width: 800,
  height: 600,
  html: 'ui/preview.html'
})

// 截图
const dataURL = await api.screenshot.capture()

if (dataURL) {
  // 发送截图数据到窗口
  window.send('screenshot-data', dataURL)
}
```

### ui/preview.html

```html
<!DOCTYPE html>
<html>
  <head>
    <title>截图预览</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: #f0f0f0;
      }
      img {
        max-width: 100%;
        max-height: 100%;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
    </style>
  </head>
  <body>
    <img id="screenshot" alt="截图预览" />

    <script>
      // 监听截图数据
      window.electronAPI.on('screenshot-data', (dataURL) => {
        document.getElementById('screenshot').src = dataURL
      })
    </script>
  </body>
</html>
```

## 注意事项

1. **权限要求：** 使用截图功能需要在 manifest 中声明 `screenshot` 权限
2. **平台支持：** 目前仅支持 Windows 平台（使用 ScreenCapture.exe）
3. **异步操作：** `capture()` 是异步方法，返回 Promise
4. **用户交互：** 截图过程需要用户交互，可能被取消
5. **数据格式：** 返回的是 PNG 格式的 DataURL，以 `data:image/png;base64,` 开头
6. **文件保存：** 如需保存文件，需同时声明 `fs:write` 权限

## 相关权限

- `screenshot` - 截图功能（必需）
- `fs:write` - 保存截图文件（可选）
- `clipboard` - 如需额外操作剪贴板（可选）
- `notification` - 显示通知（可选）

## 错误处理

```javascript
try {
  const dataURL = await api.screenshot.capture()
  if (!dataURL) {
    console.log('用户取消了截图')
    return
  }
  // 处理截图数据
} catch (error) {
  if (error.message.includes('permission')) {
    console.error('没有截图权限，请在 manifest.json 中添加 screenshot 权限')
  } else {
    console.error('截图失败:', error)
  }
}
```
